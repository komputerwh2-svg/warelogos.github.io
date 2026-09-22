// Tambahkan ini di setiap file JS (main.js, stokwh.js, dll) 
// agar status bar selalu ter-update
const statusBar = document.getElementById('print-status-bar');
if (!statusBar) {
    console.log("Status bar tidak ditemukan, mungkin Anda sedang di halaman lain?");
}

// --- 1. FUNGSI UTILITY FORMAT UKURAN ---
function formatUkuranData(data) {
    if (!data) return "0 B";
    const stringData = typeof data === 'string' ? data : JSON.stringify(data);
    const bytes = new TextEncoder().encode(stringData).length;
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

// --- 2. FUNGSI UTAMA STATUS BAR ARSITEKTUR ---
function updateArsitekturStatusBar(masterDataRaw, masterTime, cloudDataRaw, cloudTime, isCloudSyncing = true) {
    // A. Update Sisi Master Lokal
    const masterSizeEl = document.getElementById('master-size-info');
    if (masterSizeEl) {
        masterSizeEl.innerText = masterDataRaw ? formatUkuranData(masterDataRaw) : "0 B";
    }
    
    const masterTimeEl = document.getElementById('master-sync-time');
    if (masterTimeEl) {
        masterTimeEl.innerText = "Sync: " + (masterTime || "Belum ada");
    }
    
    // B. Update Sisi Cloud / Server
    const cloudSizeEl = document.getElementById('cloud-size-info');
    if (cloudSizeEl) {
        cloudSizeEl.innerText = cloudDataRaw ? formatUkuranData(cloudDataRaw) : "0 B";
    }
    
    const cloudTimeEl = document.getElementById('cloud-timestamp');
    if (cloudTimeEl) {
        cloudTimeEl.innerText = "Server: " + (cloudTime || "Realtime");
    }

    // C. Indikator Visual Status Cloud
    const cloudIcon = document.querySelector('.fa-cloud') || document.querySelector('.animate-pulse');
    if (cloudIcon) {
        const cloudStatusLabel = cloudIcon.nextElementSibling;
        if (cloudStatusLabel) {
            if (isCloudSyncing) {
                cloudStatusLabel.innerHTML = `Cloud: <strong class="text-white">Sync [Realtime]</strong>`;
            } else {
                cloudStatusLabel.innerHTML = `Cloud: <strong class="text-amber-400">Offline [Cached]</strong>`;
            }
        }
    }
}

// --- 3. FUNGSI TRIGGER OTOMATIS (PANGGIL INI SAAT HALAMAN/DATA DIMUAT) ---
function refreshArsitekturStatusBarOtomatis() {
    // Ambil data Master dari localStorage (sesuaikan key-nya, misal "master_barang")
    const masterKey = "master_barang";
    const dataMasterLokal = localStorage.getItem(masterKey);
    const waktuMasterLokal = localStorage.getItem(masterKey + "_timestamp") || "Baru saja";

    // Ambil data Cloud/Stok WH yang sedang aktif di localStorage
    const cloudKey = "stok_wh3"; // atau disesuaikan dengan modul aktif saat ini
    const dataCloudLokal = localStorage.getItem(cloudKey);
    const waktuCloudServer = localStorage.getItem(cloudKey + "_timestamp") || "Realtime Active";

    // Eksekusi fungsi update status bar
    updateArsitekturStatusBar(
        dataMasterLokal,
        waktuMasterLokal,
        dataCloudLokal,
        waktuCloudServer,
        true
    );
}

// Jalankan otomatis saat dokumen selesai dimuat atau saat navigasi modul berganti
document.addEventListener("DOMContentLoaded", () => {
    refreshArsitekturStatusBarOtomatis();
});

// ==========================================
// 4. BACKGROUND SYNC OTOMATIS & OFFLINE QUEUE
// ==========================================

// Inisialisasi antrean offline dari localStorage saat aplikasi dimuat
function getAntreanOffline() {
    try {
        const data = localStorage.getItem('wh_pending_uploads');
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Gagal membaca antrean offline:", e);
        return [];
    }
}

function simpanAntreanOfflineKeStorage(antrean) {
    try {
        localStorage.setItem('wh_pending_uploads', JSON.stringify(antrean));
    } catch (e) {
        console.error("Gagal menyimpan antrean offline ke storage:", e);
    }
}

// Fungsi pembantu untuk memasukkan request gagal/offline ke antrean
window.simpanKeAntreanOffline = function(url, method, payload, deskripsi) {
    // VALIDASI: Pastikan URL ada dan benar, cegah masuk jika null atau undefined
    if (!url || url === "null" || url.trim() === "") {
        console.warn(`[Offline Queue] Pengiriman dicegah karena URL tidak valid: ${url}`);
        return; 
    }

    const antrean = getAntreanOffline();
    
    antrean.push({
        id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        url: url,
        method: method || 'PUT', // Default method
        payload: payload,
        deskripsi: deskripsi || 'Aksi Offline',
        timestamp: new Date().toISOString()
    });

    simpanAntreanOfflineKeStorage(antrean);
    console.warn(`[Offline Queue] Berhasil menyimpan ke antrean: ${deskripsi}. Total antrean: ${antrean.length}`);
    
    // Perbarui indikator UI jika ada
    updateIndikatorOfflineUI();
};

// Fungsi utama untuk memproses sinkronisasi data yang tertunda saat online kembali
window.prosesBackgroundSync = async function() {
    if (!navigator.onLine) return;

    let antrean = getAntreanOffline();
    if (antrean.length === 0) {
        updateIndikatorOfflineUI();
        return;
    }

    console.log(`[Background Sync] Memulai sinkronisasi ${antrean.length} data tertunda ke Firebase...`);
    
    // Ambil item pertama dari antrean (FIFO: First In, First Out)
    const itemSync = antrean[0];

    // PENGAMAN TAMBAHAN: Jika di dalam queue ada antrean dengan URL null/rusak, langsung hapus (skip) dari antrean
    if (!itemSync.url || itemSync.url === "null") {
        console.warn(`[Background Sync] Ditemukan antrean rusak dengan URL null (${itemSync.deskripsi}). Menghapus dari antrean...`);
        antrean.shift();
        simpanAntreanOfflineKeStorage(antrean);
        setTimeout(prosesBackgroundSync, 100); // Lanjut cek item berikutnya
        return;
    }

    try {
        let opsiFetch = {
            method: itemSync.method,
            headers: { "Content-Type": "application/json" }
        };

        // Jika method membutuhkan body (PUT, PATCH, POST)
        if (itemSync.payload !== null && itemSync.payload !== undefined) {
            opsiFetch.body = JSON.stringify(itemSync.payload);
        }

        const response = await fetch(itemSync.url, opsiFetch);

        if (response.ok) {
            console.log(`[Background Sync] Sukses menyinkronkan: ${itemSync.deskripsi}`);
            
            // Hapus item yang sudah sukses dari antrean
            antrean.shift();
            simpanAntreanOfflineKeStorage(antrean);

            if (antrean.length === 0) {
                if (typeof miuiAlert === 'function') {
                    miuiAlert("Semua data offline berhasil disinkronkan ke server!");
                }
                // Refresh tampilan data lokal jika fungsi tersedia
                if (typeof loadStokDatawh3 === 'function') loadStokDatawh3();
                if (typeof loadStokData === 'function') loadStokData();
            } else {
                // Lanjutkan sinkronisasi item berikutnya secara rekursif
                setTimeout(prosesBackgroundSync, 500);
            }
        } else {
            console.warn(`[Background Sync] Gagal menyinkronkan ${itemSync.deskripsi}, server merespons HTTP ${response.status}.`);
            // Jika error parah seperti 405 Method Not Allowed atau 400, lebih baik kita skip dan hapus agar tidak tersangkut berulang-ulang
            if (response.status === 405 || response.status === 400 || response.status === 404) {
                 console.error(`[Background Sync] URL atau Data bermasalah. Menghapus item dari antrean untuk mencegah perulangan tak berujung.`);
                 antrean.shift();
                 simpanAntreanOfflineKeStorage(antrean);
                 setTimeout(prosesBackgroundSync, 500);
            }
        }
    } catch (err) {
        console.error(`[Background Sync] Kesalahan jaringan saat sinkronisasi ${itemSync.deskripsi}:`, err.message);
    }

    updateIndikatorOfflineUI();
};

// Indikator UI Opsional untuk menampilkan jumlah antrean offline yang belum terkirim
function updateIndikatorOfflineUI() {
    const antrean = getAntreanOffline();
    let badgeEl = document.getElementById('offline-queue-badge');
    
    if (!badgeEl && antrean.length > 0) {
        // Buat elemen indikator secara dinamis jika belum ada di HTML
        badgeEl = document.createElement('div');
        badgeEl.id = 'offline-queue-badge';
        badgeEl.style.cssText = "position: fixed; bottom: 20px; right: 20px; background: #e74c3c; color: white; padding: 10px 15px; border-radius: 8px; z-index: 9999; font-size: 12px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.2); cursor: pointer;";
        badgeEl.onclick = () => {
            if(typeof miuiAlert === 'function'){
               miuiAlert(`Ada ${antrean.length} perubahan data dalam antrean offline yang menunggu sinkronisasi.`);
            } else {
               alert(`Ada ${antrean.length} perubahan data dalam antrean offline yang menunggu sinkronisasi.`);
            }
        };
        document.body.appendChild(badgeEl);
    }

    if (badgeEl) {
        if (antrean.length > 0) {
            badgeEl.style.display = 'block';
            badgeEl.innerText = `🔄 Offline Queue: ${antrean.length} data`;
        } else {
            badgeEl.style.display = 'none';
        }
    }
}

// 5. LISTENER EVENT ONLINE & INTERVAL BERKALA
window.addEventListener('online', () => {
    console.log("[Network Status] Koneksi pulih (online event terdeteksi). Memulai background sync...");
    prosesBackgroundSync();
});

window.addEventListener('offline', () => {
    console.warn("[Network Status] Perangkat beralih ke mode offline.");
    updateIndikatorOfflineUI();
});

// Interval berkala (setiap 30 detik) untuk memeriksa koneksi dan memproses sisa antrean otomatis di latar belakang
setInterval(() => {
    if (navigator.onLine) {
        const antrean = getAntreanOffline();
        if (antrean.length > 0) {
            prosesBackgroundSync();
        }
    }
}, 30000);

// Cek antrean dan status saat halaman pertama kali dimuat
document.addEventListener('DOMContentLoaded', () => {
    updateIndikatorOfflineUI();
    if (navigator.onLine) {
        prosesBackgroundSync();
    }
});

// URL Database Firebase
const DB_FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

document.addEventListener('DOMContentLoaded', async () => {
    initApp();
});

async function initApp() {
    console.log("Aplikasi dimuat, menjalankan inisialisasi global...");
    
    // 1. Widget latensi & draggable otomatis aktif di latar belakang (dari script yang Anda miliki)
    // (Karena sudah ada event listener DOMContentLoaded untuk initAppLatensi, widget otomatis siap)

    // 2. Render UI secara instan dari cache lokal (jika ada) sebelum fetch jaringan
    muatDataDariCacheLokal();

    // 3. Inisialisasi Rekap & Dropdown lainnya
    if (typeof initDropdownsRekap === 'function') await initDropdownsRekap();
    if (typeof initDropdowns === 'function') await initDropdowns();
    if (typeof initDropdownsWH3 === 'function') await initDropdownsWH3();
    
    // 4. Lakukan background fetch/load data terbaru secara senyap setelah dropdown siap
    if (typeof loadDataRekap === 'function' && document.getElementById('select-tanggal-rekap')) {
        await loadDataRekap();
    }
    if (typeof loadStokData === 'function' && document.getElementById('select-tanggal-wh2')) {
        await loadStokData();
    }
    if (typeof loadStokDatawh3 === 'function' && document.getElementById('select-tanggal-wh3')) {
        loadStokDatawh3();
    }
    
    console.log("Semua sistem, cache, dan widget latensi berhasil diinisialisasi.");
}

function muatDataDariCacheLokal() {
    // Cek dan render instan untuk WH-2 dari cache
    const cachedWh2 = localStorage.getItem('cached_stok_wh2');
    const dateInputWh2 = document.getElementById('select-tanggal-wh2');
    if (cachedWh2 && dateInputWh2 && dateInputWh2.value) {
        try {
            const allData = JSON.parse(cachedWh2);
            window.currentStokData = allData;
            const formattedDate = dateInputWh2.value.replace(/-/g, '');
            const radioChecked = document.querySelector('input[name="rb-mode-wh2"]:checked');
            const mode = radioChecked ? radioChecked.value : "SEBELUM";
            const key = Object.keys(allData).find(k => k.includes(`stokwh2wms_${formattedDate}`));
            if (key && typeof renderTabel === 'function') {
                renderTabel(allData[key], mode, key);
                console.log("UI WH-2 dimuat instan dari cache lokal.");
            }
        } catch (e) {
            console.error("Gagal parsing cache WH-2:", e);
        }
    }

    // Cek dan render instan untuk WH-3 dari cache
    const cachedWh3 = localStorage.getItem('cached_stok_wh3');
    const dateInputWh3 = document.getElementById('select-tanggal-wh3');
    if (cachedWh3 && dateInputWh3 && dateInputWh3.value) {
        try {
            const allData = JSON.parse(cachedWh3);
            window.currentStokData = allData;
            const formattedDate = dateInputWh3.value.replace(/-/g, '');
            const radioChecked = document.querySelector('input[name="rb-mode-wh3"]:checked');
            const mode = radioChecked ? radioChecked.value : "STOK WH-3";
            const key = Object.keys(allData).find(k => k.includes(`stokwh3_${formattedDate}`));
            if (key && typeof renderTabelwh3 === 'function') {
                renderTabelwh3(allData[key], mode, key);
                console.log("UI WH-3 dimuat instan dari cache lokal.");
            }
        } catch (e) {
            console.error("Gagal parsing cache WH-3:", e);
        }
    }
}

// Fungsi ganti switch mode Stok WH (REKAP, WH-2, WH-3, LEBIH) dengan efek geser slider
window.gantiModulStokWH = function(mode) {
    const slider = document.getElementById('slider-content-stokwh');
    const btnFloatHP = document.getElementById('btnFloatingInputHP'); // Ambil elemen tombol floating HP
    
    // Atur visibilitas tombol floating HP: HANYA muncul di mode WH3
    if (btnFloatHP) {
        btnFloatHP.style.display = (mode === 'WH3') ? 'flex' : 'none';
    }
    
    if (mode === 'REKAP') {
        slider.style.transform = 'translateX(0%)';
        // Panggil inisialisasi REKAP yang baru kita buat
        if (typeof initDropdownsRekap === 'function') {
            initDropdownsRekap();
        }
        //gantiModeRekap(moderekap); // Pastikan mode rekap diatur sesuai
        window.renderTabelRekap();
        console.log("Inisialisasi mode REKAP dipanggil");
    } else if (mode === 'WH2') {
        slider.style.transform = 'translateX(-25%)';
        // Kirim parameter 'WH2'
        if (typeof initDropdowns === 'function') {
            initDropdowns();
        }
        console.log("Inisialisasi mode WH-2 dipanggil");
    } else if (mode === 'WH3') {
        slider.style.transform = 'translateX(-50%)';
        // Jika Anda punya fungsi khusus WH3
        if (typeof initDropdownsWH3 === 'function') {
            initDropdownsWH3();
        }
        console.log("Inisialisasi mode WH-3 dipanggil");
    } else if (mode === 'LEBIH') {
        slider.style.transform = 'translateX(-75%)';
        // TAMBAHKAN PEMANGGILAN INI:
        if (!isLebihInitialized) {
            initBarangLebih();
            isLebihInitialized = true;
        }
        window.bl_renderRiwayat();
        window.renderTabelBarangLebih();
        console.log("Inisialisasi mode LEBIH dipanggil");
    }
    console.log("Stok Warehouse mode berpindah ke:", mode);
};

// Fungsi untuk memformat tanggal ke (Hari, dd MMMM yyyy)
function updateDisplayTanggal(tanggalString, isDataKosong = false, elementId = 'display-tanggal-wh2') {
    const displayEl = document.getElementById(elementId);
    if (!displayEl) return;

    if (isDataKosong) {
        displayEl.innerText = "BELUM ADA DATA STOK";
        return;
    }

    if (!tanggalString) {
        displayEl.innerText = "PILIH TANGGAL STOK";
        return;
    }

    let date;
    // Logika parsing tetap sama
    if (tanggalString.includes('-')) {
        const [year, month, day] = tanggalString.split('-').map(Number);
        date = new Date(year, month - 1, day);
    } else if (tanggalString.includes('/')) {
        const [day, month, year] = tanggalString.split('/').map(Number);
        date = new Date(year, month - 1, day);
    } else if (tanggalString.length === 8 && !isNaN(tanggalString)) {
        const year = parseInt(tanggalString.substring(0, 4));
        const month = parseInt(tanggalString.substring(4, 6)) - 1;
        const day = parseInt(tanggalString.substring(6, 8));
        date = new Date(year, month, day);
    } else {
        displayEl.innerText = "TANGGAL TIDAK VALID";
        return;
    }

    if (isNaN(date.getTime())) {
        displayEl.innerText = "TANGGAL TIDAK VALID";
        return;
    }

    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    displayEl.innerText = date.toLocaleDateString('id-ID', options).toUpperCase();
}

// Fungsi untuk memformat tanggal ke (Hari, dd MMMM yyyy) untuk WH-3
function updateDisplayTanggalWH3(tanggalString, isDataKosong = false) {
    const displayEl = document.getElementById('display-tanggal-wh3');
    if (!displayEl) return;

    // Jika dipanggil dengan status data kosong
    if (isDataKosong) {
        displayEl.innerText = "BELUM ADA DATA STOK WH-3";
        return;
    }

    if (!tanggalString) {
        displayEl.innerText = "PILIH TANGGAL STOK WH-3";
        return;
    }

    let date;

    // 1. Cek format YYYY-MM-DD
    if (tanggalString.includes('-')) {
        const [year, month, day] = tanggalString.split('-').map(Number);
        date = new Date(year, month - 1, day);
    } 
    // 2. Cek format DD/MM/YYYY
    else if (tanggalString.includes('/')) {
        const [day, month, year] = tanggalString.split('/').map(Number);
        date = new Date(year, month - 1, day);
    }
    // 3. Cek format YYYYMMDD
    else if (tanggalString.length === 8 && !isNaN(tanggalString)) {
        const year = parseInt(tanggalString.substring(0, 4));
        const month = parseInt(tanggalString.substring(4, 6)) - 1;
        const day = parseInt(tanggalString.substring(6, 8));
        date = new Date(year, month, day);
    } 
    else {
        displayEl.innerText = "TANGGAL TIDAK VALID";
        return;
    }

    if (isNaN(date.getTime())) {
        displayEl.innerText = "TANGGAL TIDAK VALID";
        return;
    }

    const options = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    };
    
    const formattedDate = date.toLocaleDateString('id-ID', options);
    displayEl.innerText = formattedDate.toUpperCase();
}

// Status inisialisasi terpisah untuk REKAP
let isRekapInitialized = false;

// 1. Fungsi Utama: Ambil dan Update Tanggal (REKAP)
async function updateTanggalDropdownRekap() {
    // 1. Ambil mode aktif dari UI (misalnya dari tombol radio yang aktif)
    const modeAktif = document.querySelector('input[name="rb-mode-rekap"]:checked')?.value || 'WH2_SEBELUM';
    
    const selPeriode = document.getElementById('select-periode-rekap');
    const selTanggal = document.getElementById('select-tanggal-rekap');
    
    if (!selPeriode || !selTanggal) return;

    // 2. Tentukan URL dan Prefix berdasarkan mode
    let dbUrl, prefix;
    if (modeAktif === 'WH2_SEBELUM' || modeAktif === 'WH2_SESUDAH') {
        dbUrl = `${DB_FIREBASE_URL}stok_wh2.json`;
        prefix = 'stokwh2wms_';
    } else {
        dbUrl = `${DB_FIREBASE_URL}stok_wh3.json`;
        prefix = 'stokwh3_';
    }

    if (!selPeriode.value) {
        selTanggal.innerHTML = '<option value="">Pilih Tanggal</option>';
        return;
    }

    selTanggal.innerHTML = '<option value="">Memuat...</option>';

    try {
        const response = await fetch(dbUrl);
        const allData = await response.json();
        
        if (!allData) {
            handleDataKosongRekap(false);
            return;
        }

        const [targetTahun, targetBulan] = selPeriode.value.split('-').map(Number);
        let availableDates = [];

        Object.keys(allData).forEach(key => {
            if (key.includes(prefix)) {
                const rawDate = key.split('_')[1]; 
                const tahun = parseInt(rawDate.substring(0, 4));
                const bulan = parseInt(rawDate.substring(4, 6)) - 1;
                const hari = rawDate.substring(6, 8);

                if (tahun === targetTahun && bulan === targetBulan) {
                    availableDates.push({
                        val: rawDate, 
                        label: `${hari}/${rawDate.substring(4, 6)}/${tahun}`
                    });
                }
            }
        });

        availableDates.sort((a, b) => b.val.localeCompare(a.val));

        selTanggal.innerHTML = '<option value="">Pilih Tanggal</option>';
        availableDates.forEach(date => {
            selTanggal.add(new Option(date.label, date.val));
        });

        if (availableDates.length > 0) {
            selTanggal.value = availableDates[0].val;
            triggerUpdateTampilanRekap(selTanggal.value);
        } else {
            handleDataKosongRekap(false);
        }
    } catch (e) {
        console.error("Gagal sinkronisasi tanggal (REKAP):", e);
        selTanggal.innerHTML = '<option value="">Gagal Memuat</option>';
    }
}

// 2. Fungsi Pemicu Terpadu (REKAP)
async function triggerUpdateTampilanRekap(val) {
    // Update Display Tanggal khusus REKAP
    if (typeof window.updateDisplayTanggal === 'function') {
        window.updateDisplayTanggal(val, false, 'display-tanggal-rekap'); 
    }

    // Load Data khusus REKAP
    if (typeof window.loadDataRekap === 'function') {
        await window.loadDataRekap();
    }
}


let isDropdownInitialized = false;

// 1. Fungsi Utama: Ambil dan Update Tanggal
// Khusus untuk WH-2
async function updateTanggalDropdown() {
    const selPeriode = document.getElementById('select-periode-wh2');
    const selTanggal = document.getElementById('select-tanggal-wh2');
    
    if (!selPeriode || !selTanggal) return;

    if (!selPeriode.value) {
        selTanggal.innerHTML = '<option value="">Pilih Tanggal</option>';
        handleDataKosong(true); 
        return;
    }

    selTanggal.innerHTML = '<option value="">Memuat...</option>';

    try {
        const response = await fetch(`${DB_FIREBASE_URL}stok_wh2.json`);
        const allData = await response.json();
        
        if (!allData) {
            handleDataKosong(false);
            return;
        }

        const [targetTahun, targetBulan] = selPeriode.value.split('-').map(Number);
        let availableDates = [];

        Object.keys(allData).forEach(key => {
            if (key.includes('stokwh2wms_')) {
                const rawDate = key.split('_')[1]; 
                const tahun = parseInt(rawDate.substring(0, 4));
                const bulan = parseInt(rawDate.substring(4, 6)) - 1; 
                const hari = rawDate.substring(6, 8);

                if (tahun === targetTahun && bulan === targetBulan) {
                    availableDates.push({
                        val: rawDate, 
                        label: `${hari}/${rawDate.substring(4, 6)}/${tahun}`
                    });
                }
            }
        });

        availableDates.sort((a, b) => b.val.localeCompare(a.val));

        selTanggal.innerHTML = '<option value="">Pilih Tanggal</option>';
        availableDates.forEach(date => {
            selTanggal.add(new Option(date.label, date.val));
        });

        if (availableDates.length > 0) {
            selTanggal.value = availableDates[0].val;
            triggerUpdateTampilan(selTanggal.value);
        } else {
            handleDataKosong(false);
        }
    } catch (e) {
        console.error("Gagal sinkronisasi tanggal:", e);
        selTanggal.innerHTML = '<option value="">Gagal Memuat</option>';
    }
}

// 2. Fungsi Pemicu Terpadu
async function triggerUpdateTampilan(val) {
    // 1. Update Display Tanggal khusus untuk WH2
    if (typeof window.updateDisplayTanggal === 'function') {
        window.updateDisplayTanggal(val, false, 'display-tanggal-wh2'); 
    }

    // 2. Load Data khusus untuk WH2
    if (typeof window.loadStokData === 'function') {
        await window.loadStokData();
    }
}

let isDropdownInitializedWH3 = false;

// 1. Fungsi Utama: Ambil dan Update Tanggal WH-3
async function updateTanggalDropdownWH3() {
    const selPeriode = document.getElementById('select-periode-wh3');
    const selTanggal = document.getElementById('select-tanggal-wh3');
    
    if (!selPeriode || !selTanggal) return;

    if (!selPeriode.value) {
        selTanggal.innerHTML = '<option value="">Pilih Tanggal</option>';
        handleDataKosongWH3(true); // true = reset tampilan
        return;
    }

    selTanggal.innerHTML = '<option value="">Memuat...</option>';

    try {
        // Target endpoint: stok_wh3
        const response = await fetch(`${DB_FIREBASE_URL}stok_wh3.json`);
        const allData = await response.json();
        
        if (!allData) {
            handleDataKosongWH3(false);
            return;
        }

        const [targetTahun, targetBulan] = selPeriode.value.split('-').map(Number);
        let availableDates = [];

        Object.keys(allData).forEach(key => {
            // Filter key dengan awalan 'stokwh3_'
            if (key.includes('stokwh3_')) {
                const rawDate = key.split('_')[1]; 
                const tahun = parseInt(rawDate.substring(0, 4));
                const bulan = parseInt(rawDate.substring(4, 6)) - 1; 
                const hari = rawDate.substring(6, 8);

                if (tahun === targetTahun && bulan === targetBulan) {
                    availableDates.push({
                        val: rawDate, 
                        label: `${hari}/${rawDate.substring(4, 6)}/${tahun}`
                    });
                }
            }
        });

        availableDates.sort((a, b) => b.val.localeCompare(a.val));

        selTanggal.innerHTML = '<option value="">Pilih Tanggal</option>';
        availableDates.forEach(date => {
            selTanggal.add(new Option(date.label, date.val));
        });

        if (availableDates.length > 0) {
            selTanggal.value = availableDates[0].val;
            triggerUpdateTampilanWH3(selTanggal.value);
        } else {
            handleDataKosongWH3(false);
        }
    } catch (e) {
        console.error("Gagal sinkronisasi tanggal WH-3:", e);
        selTanggal.innerHTML = '<option value="">Gagal Memuat</option>';
    }
}

// 2. Fungsi Pemicu Terpadu untuk WH-3
async function triggerUpdateTampilanWH3(val) {
    if (typeof window.updateDisplayTanggalWH3 === 'function') {
        window.updateDisplayTanggalWH3(val, false); // false = data ditemukan
    }
    if (typeof window.loadStokDatawh3 === 'function') {
        await window.loadStokDatawh3();
    }
}

// 3. Helper untuk Data Kosong (Versi Dinamis)
function handleDataKosong(isReset, modul = 'WH2') {
    // 1. Tentukan ID elemen berdasarkan modul
    const idTanggal = (modul === 'REKAP') ? 'select-tanggal-rekap' : 
                      (modul === 'WH3') ? 'select-tanggal-wh3' : 'select-tanggal-wh2';
    const displayId = (modul === 'REKAP') ? 'display-tanggal-rekap' : 
                      (modul === 'WH3') ? 'display-tanggal-wh3' : 'display-tanggal-wh2';
    
    const selTanggal = document.getElementById(idTanggal);
    if (!selTanggal) return;

    // 2. Reset atau set status data kosong
    selTanggal.innerHTML = '<option value="">Data Kosong</option>';
    
    // 3. Update label display dengan ID yang dinamis
    if (typeof window.updateDisplayTanggal === 'function') {
        window.updateDisplayTanggal('', true, displayId); 
    }
    
    // 4. Update tabel (Tentukan fungsi tabel sesuai modul)
    if (modul === 'REKAP' && typeof window.tampilkanKosongRekap === 'function') {
        window.tampilkanKosongRekap('');
    } else if (modul === 'WH3' && typeof window.tampilkanKosongWH3 === 'function') {
        window.tampilkanKosongWH3('');
    } else if (typeof window.tampilkanKosong === 'function') {
        window.tampilkanKosong('');
    }
}

// 3. Helper untuk Data Kosong (WH-3)
function handleDataKosongWH3(isReset) {
    const selTanggal = document.getElementById('select-tanggal-wh3');
    if (selTanggal) {
        selTanggal.innerHTML = '<option value="">Data Kosong</option>';
    }
    
    // Update label display ke "BELUM ADA DATA STOK"
    if (typeof window.updateDisplayTanggalWH3 === 'function') {
        window.updateDisplayTanggalWH3('', true); // true = tampilkan status kosong
    }
    
    // Update tabel untuk menampilkan pesan kosong
    if (typeof window.tampilkanKosongwh3 === 'function') {
        window.tampilkanKosongwh3('');
    }
}


// 1. Fungsi Utama: Inisialisasi Dropdown REKAP
async function initDropdownsRekap() {
    console.log("Inisialisasi Dropdown REKAP...");
    
    const selPeriode = document.getElementById('select-periode-rekap');
    const selTanggal = document.getElementById('select-tanggal-rekap');
    
    if (!selPeriode || !selTanggal) return;

    // Isi Periode (12 Bulan terakhir)
    const now = new Date();
    selPeriode.innerHTML = '<option value="">Pilih Periode</option>';
    
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${d.getFullYear()}-${d.getMonth()}`;
        const label = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }).toUpperCase();
        selPeriode.add(new Option(label, value));
    }

    selPeriode.value = `${now.getFullYear()}-${now.getMonth()}`;

    // Event Listeners: saat ganti periode, update dropdown tanggal
    selPeriode.onchange = () => updateTanggalDropdownRekap();
    
    // Event Listeners: saat ganti tanggal, muat data tabel
    selTanggal.onchange = (e) => {
        if (e.target.value) {
            triggerUpdateTampilanRekap(e.target.value);
        } else {
            handleDataKosongRekap(false);
        }
    };

    // Eksekusi pertama kali
    await updateTanggalDropdownRekap();
}

async function initDropdowns() {
    console.log("Inisialisasi Dropdown WH2..."); 
    
    // 1. Identifikasi elemen WH2
    const selPeriode = document.getElementById('select-periode-wh2');
    const selTanggal = document.getElementById('select-tanggal-wh2');
    
    if (!selPeriode || !selTanggal) {
        // Ganti console.error menjadi console.log biasa agar tidak memunculkan teks merah
        console.log("Info: Dropdowns WH2 belum ada di halaman ini, dilewati.");
        return;
    }

    // 2. Isi Periode
    const now = new Date();
    selPeriode.innerHTML = '<option value="">Pilih Periode</option>';
    
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${d.getFullYear()}-${d.getMonth()}`;
        const label = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }).toUpperCase();
        selPeriode.add(new Option(label, value));
    }

    selPeriode.value = `${now.getFullYear()}-${now.getMonth()}`;

    // 3. Pasang Event Listeners (Khusus WH2)
    selPeriode.onchange = () => updateTanggalDropdown();
    
    selTanggal.onchange = (e) => {
        if (e.target.value) {
            triggerUpdateTampilan(e.target.value);
        } else {
            handleDataKosong(false);
        }
    };

    // 4. EKSEKUSI PERTAMA
    await updateTanggalDropdown();
}


// 2. Fungsi init yang memanggil fungsi di atas untuk WH-3
async function initDropdownsWH3() {
    // Anda bisa mengaktifkan baris di bawah jika ingin mencegah inisialisasi ganda
    // if (isDropdownInitializedWH3) return;
    
    const selPeriode = document.getElementById('select-periode-wh3');
    const selTanggal = document.getElementById('select-tanggal-wh3');
    
    if (!selPeriode || !selTanggal) return;

    const now = new Date();
    selPeriode.innerHTML = '<option value="">Pilih Periode</option>';
    
    // Membuat daftar 12 bulan terakhir
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${d.getFullYear()}-${d.getMonth()}`;
        const label = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }).toUpperCase();
        selPeriode.add(new Option(label, value));
    }

    selPeriode.value = `${now.getFullYear()}-${now.getMonth()}`;

    // Pasang Event Listeners (menggunakan fungsi spesifik WH-3)
    selPeriode.removeEventListener('change', updateTanggalDropdownWH3);
    selPeriode.addEventListener('change', updateTanggalDropdownWH3);
    
    selTanggal.removeEventListener('change', (e) => triggerUpdateTampilanWH3(e.target.value)); 
    selTanggal.addEventListener('change', (e) => {
        if (e.target.value) {
            triggerUpdateTampilanWH3(e.target.value);
        } else {
            handleDataKosongWH3(false);
        }
    });

    // EKSEKUSI PERTAMA
    isDropdownInitializedWH3 = true;
    await updateTanggalDropdownWH3();
}

// FUNGSI UNTUK MEMBUKA MODAL UPLOAD
function bukaModalUploadWH2() {
    document.getElementById('modal-upload-wh2').classList.remove('hidden');
}

function tutupModalUploadWH2() {
    document.getElementById('modal-upload-wh2').classList.add('hidden');
    resetFileInput();
}

function bukaModalUploadWH3() {
    document.getElementById('modal-upload-wh3').classList.remove('hidden');
}

function tutupModalUploadWH3() {
    document.getElementById('modal-upload-wh3').classList.add('hidden');
    resetFileInputwh3();
}

// Menangani daftar file yang dipilih
//untuk daftar wh2
const fileInputWh2 = document.getElementById('file-input-wh2');
if (fileInputWh2) {
    fileInputWh2.addEventListener('change', function(e) {
        const list = document.getElementById('file-list-wh2');
        if (!list) return; // Mengamankan jika list tidak ditemukan
        
        list.innerHTML = '';
        
        Array.from(this.files).forEach(file => {
            const div = document.createElement('div');
            div.className = "flex items-center gap-2 p-2 bg-slate-50 rounded border";
            div.innerHTML = `<i class="fa-solid fa-file-excel text-green-600"></i> <span>${file.name}</span>`;
            list.appendChild(div);
        });
    });
}

//untuk daftar wh3
const fileInputWh3 = document.getElementById('file-input-wh3');
if (fileInputWh3) {
    fileInputWh3.addEventListener('change', function(e) {
        const list = document.getElementById('file-list-wh3');
        if (!list) return; // Mengamankan jika list tidak ditemukan
        
        list.innerHTML = '';
        
        Array.from(this.files).forEach(file => {
            const div = document.createElement('div');
            div.className = "flex items-center gap-2 p-2 bg-slate-50 rounded border";
            div.innerHTML = `<i class="fa-solid fa-file-excel text-green-600"></i> <span>${file.name}</span>`;
            list.appendChild(div);
        });
    });
}

async function prosesUploadWH2() {
    console.log("Tombol upload ditekan!"); 
    const files = document.getElementById('file-input-wh2').files;
    
    if (files.length < 2) {
        miuiAlert("Harap pilih minimal 2 file (BOSNET dan WMS)!");
        return;
    }

    const getTanggalFromFilename = (filename) => {
        const match = filename.match(/Stock_(\d{8})/i);
        return match ? match[1] : null;
    };

    const fileWh2 = Array.from(files).find(f => f.name.toLowerCase().includes('wh2'));
    const fileWms = Array.from(files).find(f => f.name.toLowerCase().includes('wms'));

    if (!fileWh2 || !fileWms) {
        miuiAlert("Pastikan file memiliki nama 'wh2' dan 'wms'!");
        return;
    }

    const tglWh2 = getTanggalFromFilename(fileWh2.name);
    const tglWms = getTanggalFromFilename(fileWms.name);

    if (!tglWh2 || !tglWms || tglWh2 !== tglWms) {
        miuiAlert("Format nama file tidak valid atau tanggal tidak sama!");
        return;
    }

    // 1. Cek keberadaan data untuk konfirmasi update
    const uniqueId = `stokwh2wms_${tglWh2}`;
    const url = `${DB_FIREBASE_URL}stok_wh2/${uniqueId}.json`;
    
    try {
        // Cek status koneksi atau lakukan fetch dengan penanganan offline queue
        if (!navigator.onLine) {
            throw new Error("Offline");
        }

        const checkResponse = await fetch(url);
        const existingData = await checkResponse.json();
        const isUpdate = existingData !== null;

        // 2. Jika data ada, gunakan miuiConfirm
        if (isUpdate) {
            miuiConfirm(
                "Data untuk tanggal tersebut sudah ada. Apakah Anda ingin meng-UPDATE data tersebut?",
                () => {
                    // Jika "Ya", eksekusi upload
                    eksekusiUpload(fileWh2, fileWms, url, true);
                },
                () => {
                    // Jika "Batal"
                    console.log("Upload dibatalkan oleh pengguna.");
                }
            );
        } else {
            // Jika data baru, langsung eksekusi
            eksekusiUpload(fileWh2, fileWms, url, false);
        }

    } catch (error) {
        console.warn("Kendala jaringan atau offline terdeteksi, memasukkan ke antrean background queue...");
        
        // Membaca isi file secara asynchronous (misalnya dijadikan Base64 atau payload teks) agar bisa disimpan di localStorage
        const bacaFileSebagaiTeks = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsText(file);
            });
        };

        try {
            const dataWh2Content = await bacaFileSebagaiTeks(fileWh2);
            const dataWmsContent = await bacaFileSebagaiTeks(fileWms);

            const payloadData = {
                fileWh2Name: fileWh2.name,
                fileWh2Content: dataWh2Content,
                fileWmsName: fileWms.name,
                fileWmsContent: dataWmsContent,
                isUpdate: false // Default aman untuk offline
            };

            simpanKeAntreanOffline(url, 'PUT', payloadData, `Upload Stok WH2 Tanggal ${tglWh2}`);
            miuiAlert("Karingan terputus. Data berhasil dimasukkan ke antrean offline dan akan diunggah otomatis saat online kembali.");
        } catch (errBaca) {
            console.error("Gagal membaca file untuk antrean offline:", errBaca);
            miuiAlert("Gagal memproses file dan mengecek data server.");
        }
    }
}

async function prosesUploadWH3() {
    console.log("Tombol upload WH-3 / QA ditekan!"); 
    const files = document.getElementById('file-input-wh3').files;
    
    if (files.length === 0) {
        miuiAlert("Harap pilih minimal file WH-3 (BOSNET) dan/atau QA!");
        return;
    }

    const getTanggalFromFilename = (filename) => {
        const match = filename.match(/Stock_(\d{8})/i);
        return match ? match[1] : null;
    };

    // Cari file berdasarkan penanda nama 'wh3' dan 'qa' secara fleksibel
    const fileWh3 = Array.from(files).find(f => f.name.toLowerCase().includes('wh3'));
    const fileQa = Array.from(files).find(f => f.name.toLowerCase().includes('qa'));

    if (!fileWh3 && !fileQa) {
        miuiAlert("Pastikan nama file memiliki penanda 'wh3' atau 'qa'!");
        return;
    }

    const sampleFile = fileWh3 || fileQa;
    const tgl = getTanggalFromFilename(sampleFile.name);
    
    if (!tgl) {
        miuiAlert("Format nama file harus mengandung 'Stock_YYYYMMDD'!");
        return;
    }

    const uniqueId = `stokwh3_${tgl}`;
    const url = `${DB_FIREBASE_URL}stok_wh3/${uniqueId}.json`;
    
    try {
        if (!navigator.onLine) {
            throw new Error("Offline");
        }

        const checkResponse = await fetch(url);
        const existingData = checkResponse.ok ? await checkResponse.json() : null;
        const isUpdate = existingData !== null;

        if (isUpdate) {
            miuiConfirm(
                `Data audit tanggal ${tgl} sudah ada. Apakah Anda ingin meng-UPDATE data WH-3 & QA tersebut?`,
                () => eksekusiUploadWH3Gabungan(fileWh3, fileQa, url, true),
                () => console.log("Upload dibatalkan.")
            );
        } else {
            eksekusiUploadWH3Gabungan(fileWh3, fileQa, url, false);
        }

    } catch (error) {
        console.warn("Kendala jaringan / offline terdeteksi:", error.message);
        eksekusiUploadWH3Gabungan(fileWh3, fileQa, url, false);
    }
}

async function eksekusiUpload(fileWh2, fileWms, url, isUpdate) {
    try {
        console.log("Membaca file dengan deteksi header otomatis...");
        
        // Menggunakan fungsi dinamis untuk mencari baris header "KODE"
        const dataWh2 = await bacaExcelDinamis(fileWh2, "Produk");
        const dataWms = await bacaExcelDinamis(fileWms, "KODE");

        let stokGabungan = {};

        // 1. Proses WH2: Produk di index 1, K Akhir di index 9
        dataWh2.forEach(row => {
            const kode = row[1] ? String(row[1]).trim() : null;
            if (!kode) return;

            // Mengambil K Akhir (index 9) dan mengambil angka sebelum "/"
            const rawAkhir = row[9] ? String(row[9]) : "0";
            const kAkhir = parseInt(rawAkhir.split('/')[0]) || 0;

            stokGabungan[kode] = {
                stokwh2_sebelum: kAkhir,
                stokwh2_sesudah: kAkhir,
                stokwms_sebelum: 0,
                stokwms_sesudah: 0
            };
        });

        // 2. Proses WMS: Produk di index 0, TOTAL KRT di index 10
        dataWms.forEach(row => {
            const kode = row[0] ? String(row[0]).trim() : null;
            if (!kode) return;

            // Menggunakan index 10 untuk kolom K (TOTAL KRT), membersihkan format angka
            const rawKrt = row[10]; 
            const totalKrt = rawKrt ? parseFloat(String(rawKrt).replace(/[^0-9.]/g, '')) || 0 : 0;

            if (!stokGabungan[kode]) {
                // Jika produk baru ada di WMS, tambahkan
                stokGabungan[kode] = { 
                    stokwh2_sebelum: 0, 
                    stokwh2_sesudah: 0, 
                    stokwms_sebelum: totalKrt, 
                    stokwms_sesudah: totalKrt 
                };
            } else {
                // Jika sudah ada (dari WH2), update nilai WMS-nya
                stokGabungan[kode].stokwms_sebelum = totalKrt;
                stokGabungan[kode].stokwms_sesudah = totalKrt;
            }
        });

        // 3. FILTER: Hapus produk yang keduanya bernilai 0 (Stok habis/tidak ada data)
        Object.keys(stokGabungan).forEach(kode => {
            const item = stokGabungan[kode];
            if (item.stokwh2_sesudah === 0 && item.stokwms_sesudah === 0) {
                delete stokGabungan[kode];
            }
        });

        // Validasi jika setelah filter tidak ada data
        if (Object.keys(stokGabungan).length === 0) {
            miuiAlert("Tidak ada data stok wh-2 yang valid untuk ditampilkan!");
            return;
        }

        // Cek status koneksi sebelum fetch
        if (!navigator.onLine) {
            throw new Error("Koneksi internet terputus (Offline)");
        }

        // Upload ke Firebase
        const response = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(stokGabungan)
        });

        if (response.ok) {
            miuiAlert(isUpdate ? "Data WH-2 berhasil di-UPDATE!" : "Data WH-2 berhasil disimpan!");
            tutupModalUploadWH2();
            resetFileInput();
            isDropdownInitialized = false; 
            await initDropdowns(); 
        } else {
            throw new Error("Gagal menyimpan data WH-2 ke server (Response not OK).");
        }

    } catch (error) {
        console.warn("Gagal terhubung ke server atau offline, memasukkan payload WH-2 ke antrean background queue...", error.message);
        
        // Simpan data gabungan yang sudah diproses ke localStorage agar saat online bisa langsung dikirim via PUT
        simpanKeAntreanOffline(url, 'PUT', stokGabungan, `Upload Final Stok WH-2`);
        
        miuiAlert("Koneksi terputus saat pengiriman. Data telah dimasukkan ke antrean offline dan akan disinkronkan otomatis saat online.");
        
        // Tetap tutup modal dan bersihkan form agar UX tetap responsif
        tutupModalUploadWH2();
        resetFileInput();
    }
}

async function eksekusiUploadWH3Gabungan(fileWh3, fileQa, url, isUpdate) {
    try {
        console.log("Memproses file WH-3 dan QA secara bersamaan...");

        // 1. Ambil data Stok Blok terbaru dari Firebase
        const resBlok = await fetch(`${DB_FIREBASE_URL}stok_blok.json`);
        const dataBlokFirebase = resBlok.ok ? await resBlok.json() || {} : {};
        
        const agregatBlok = {};
        Object.values(dataBlokFirebase).forEach(blokItem => {
            Object.entries(blokItem).forEach(([kode, dataTanggal]) => {
                Object.values(dataTanggal).forEach(detail => {
                    const krt = parseInt(detail.krt) || 0;
                    agregatBlok[kode] = (agregatBlok[kode] || 0) + krt;
                });
            });
        });

        // 2. Tarik data lama dari Firebase agar data fisik & properti sebelumnya aman
        const responseLama = await fetch(url);
        const dataLama = responseLama.ok ? await responseLama.json() || {} : {};

        // Mulai dengan menyalin data lama yang sudah bersih sebelumnya
        let stokAudit = JSON.parse(JSON.stringify(dataLama));
        let jumlahBarisQaTerbaca = 0;

        // 3. Proses File WH-3 (Bosnet) jika ada
        if (fileWh3) {
            const dataBosnet = await bacaExcelDinamis(fileWh3, "Produk");
            dataBosnet.forEach((row) => {
                const kode = row[1] ? String(row[1]).trim().toUpperCase() : null; 
                if (!kode || kode === "PRODUK") return;

                const rawBosnetValue = row[9] ? String(row[9]).trim() : "0/0/0/0";
                const parts = rawBosnetValue.split('/').map(p => parseInt(p) || 0);

                const bosnet = parts[0] || 0;
                const ball = parts[1] || 0;
                const rtg = parts[2] || 0;

                const nama = row[2] || ""; 
                const formattedPak = `${ball > 0 ? ball : "-"} | ${rtg > 0 ? rtg : "-"}`;
                const dataLamaItem = stokAudit[kode] || {};

                const blok = agregatBlok[kode] || dataLamaItem.blok || 0;
                const beceran = dataLamaItem.beceran || 0;
                const utuhan = dataLamaItem.utuhan || 0;
                const qa = dataLamaItem.qa || 0;

                // FILTER SEPERTI VERSI LAMA: Skip jika semua komponen di baris ini benar-benar 0
                // Tapi pastikan juga jika item lama di database sudah punya stok fisik/QA, jangan dihapus sembarangan
                if (bosnet === 0 && ball === 0 && rtg === 0 && blok === 0 && beceran === 0 && utuhan === 0 && qa === 0) {
                    delete stokAudit[kode]; // Bersihkan jika memang kosong melompong
                    return;
                }

                let existingItem = stokAudit[kode] || {
                    kode: kode,
                    nama: nama,
                    bosnet: 0,
                    qa: 0,
                    pak_format: "-",
                    blok: 0,
                    beceran: 0,
                    utuhan: 0,
                    total: 0,
                    selisih: 0,
                    keterangan: dataLamaItem.keterangan || "BELUM DIHITUNG",
                    detail_rak: dataLamaItem.detail_rak || { beceran_rak: "", utuhan_rak: "" }
                };

                if (nama) existingItem.nama = nama;
                existingItem.bosnet = bosnet;
                existingItem.pak_format = formattedPak;
                existingItem.blok = blok;
                
                const totalFisik = blok + existingItem.beceran + existingItem.utuhan;
                existingItem.total = totalFisik;
                existingItem.selisih = totalFisik - (existingItem.bosnet + existingItem.qa);

                stokAudit[kode] = existingItem;
            });
        }

        // 4. Proses File QA jika ada
        if (fileQa) {
            const dataQaFile = await bacaExcelDinamis(fileQa, "Produk");
            dataQaFile.forEach((row) => {
                const kode = row[1] ? String(row[1]).trim().toUpperCase() : null; 
                if (!kode || kode === "PRODUK") return;

                // Hanya ambil dari kolom kuantitas (misal index 9, atau sesuaikan kolom qty QA Anda)
                const rawQaVal = row[9] ? String(row[9]).trim() : "0";
                const partsQa = rawQaVal.split('/').map(p => parseInt(p) || 0);
                const qtyVal = partsQa[0] || 0;

                if (qtyVal > 0) {
                    jumlahBarisQaTerbaca++;
                }

                const nama = row[2] || ""; 
                const dataLamaItem = stokAudit[kode] || {};

                const blok = agregatBlok[kode] || dataLamaItem.blok || 0;
                const beceran = dataLamaItem.beceran || 0;
                const utuhan = dataLamaItem.utuhan || 0;
                const bosnet = dataLamaItem.bosnet || 0;

                // Jika nilai QA dan komponen lainnya 0, hapus dari list agar bersih
                if (qtyVal === 0 && bosnet === 0 && blok === 0 && beceran === 0 && utuhan === 0) {
                    delete stokAudit[kode];
                    return;
                }

                let existingItem = stokAudit[kode] || {
                    kode: kode,
                    nama: nama,
                    bosnet: 0,
                    qa: 0,
                    pak_format: "-",
                    blok: 0,
                    beceran: 0,
                    utuhan: 0,
                    total: 0,
                    selisih: 0,
                    keterangan: dataLamaItem.keterangan || "BELUM DIHITUNG",
                    detail_rak: dataLamaItem.detail_rak || { beceran_rak: "", utuhan_rak: "" }
                };

                if (nama) existingItem.nama = nama;
                existingItem.qa = qtyVal;
                existingItem.blok = blok;

                const totalFisik = blok + existingItem.beceran + existingItem.utuhan;
                existingItem.total = totalFisik;
                existingItem.selisih = totalFisik - (existingItem.bosnet + existingItem.qa);

                stokAudit[kode] = existingItem;
            });
        }

        // Final safety cleanup: pastikan tidak ada data yang isinya 0 semua lolos ke database
        let stokAuditBersih = {};
        Object.entries(stokAudit).forEach(([kode, item]) => {
            const bsn = parseInt(item.bosnet) || 0;
            const qa = parseInt(item.qa) || 0;
            const blk = parseInt(item.blok) || 0;
            const bcr = parseInt(item.beceran) || 0;
            const uth = parseInt(item.utuhan) || 0;

            if (bsn > 0 || qa > 0 || blk > 0 || bcr > 0 || uth > 0) {
                stokAuditBersih[kode] = item;
            }
        });

        // 5. Upload hasil akhir yang sudah bersih ke Firebase via PUT
        const response = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(stokAuditBersih)
        });

        if (!response.ok) {
            throw new Error(`Gagal menyimpan data ke server (Status: ${response.status})`);
        }

        miuiAlert(`Data WH-3 & QA berhasil disimpan! (${jumlahBarisQaTerbaca} baris QA terbaca, data kosong dibersihkan).`);
        tutupModalUploadWH3();
        resetFileInputwh3();
        isDropdownInitializedWH3 = false; 
        await initDropdownsWH3(); 

    } catch (error) {
        console.warn("Gagal memproses file WH-3/QA:", error.message);
        miuiAlert("Gagal memproses file: " + error.message);
        tutupModalUploadWH3();
        resetFileInputwh3();
    }
}

function resetFileInput() {
    // 1. Reset elemen input file
    const fileInput = document.getElementById('file-input-wh2');
    if (fileInput) {
        fileInput.value = ""; 
    }

    // 2. Kosongkan tampilan list file di UI
    const fileList = document.getElementById('file-list-wh2');
    if (fileList) {
        fileList.innerHTML = ""; 
    }
    
    console.log("Input file dan tampilan list wh-2 telah di-reset.");
}

function resetFileInputwh3() {
    // 1. Reset elemen input file
    const fileInput = document.getElementById('file-input-wh3');
    if (fileInput) {
        fileInput.value = ""; 
    }

    // 2. Kosongkan tampilan list file di UI
    const fileList = document.getElementById('file-list-wh3');
    if (fileList) {
        fileList.innerHTML = ""; 
    }
    
    console.log("Input file dan tampilan list wh-3 telah di-reset.");
}

/**
 * Membaca Excel secara dinamis.
 * Mencari baris yang mengandung keyword header, lalu mengambil data di bawahnya.
 * @param {File} file - File dari input
 * @param {string} keyword - Kata kunci untuk mencari baris header (misal: "KODE")
 */
function bacaExcelDinamis(file, keyword = "KODE") {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(ws, { header: 1 });

            // PENCARIAN LEBIH TOLERAN:
            // .includes() mencari kata di dalam sel, trim() membersihkan spasi kiri-kanan
            let headerIndex = json.findIndex(row => 
                row.some(cell => cell && String(cell).toUpperCase().trim().includes(keyword.toUpperCase()))
            );
            
            if (headerIndex === -1) {
                console.error(`Gagal menemukan baris header yang mengandung "${keyword}". Baris ditemukan:`, json.slice(0, 5));
                resolve([]);
                return;
            }

            console.log("Header ditemukan pada baris indeks:", headerIndex);
            const dataBersih = json.slice(headerIndex + 1);
            resolve(dataBersih);
        };
        reader.readAsArrayBuffer(file);
    });
}

async function gantiModeRekap(moderekap) {
    console.log("Mode yang dipilih:", moderekap);

    const titlerekap = document.getElementById('txt-table-title-rekap');
    
    // 1. Definisikan pemetaan mode ke judul di sini
    const titleMap = {
        "WH2_SEBELUM": "TABEL DATA WH-2 SEBELUM",
        "WH2_SESUDAH": "TABEL DATA WH-2 SESUDAH",
        "STOK_WH3": "TABEL DATA STOK WH-3",
        "SELISIH_WH3": "TABEL DATA SELISIH WH-3",
        "BARANG_LEBIH": "TABEL DATA BARANG LEBIH"
    };

    // 2. Terapkan judul dengan akses yang aman
    if (titlerekap) {
        titlerekap.innerText = titleMap[moderekap] || "TABEL DATA REKAP";
    }   

    // Ganti nama fungsi di bawah ini agar sesuai dengan nama fungsi yang Anda miliki:
    loadDataRekap(); 

    renderTabelRekap(null, moderekap); // Pastikan parameter render sesuai
}

function gantiModeWH2(mode) {
    // Fungsi ini hanya bertugas memperbarui UI judul saja, 
    // lalu memicu loadStokData untuk mengupdate isi tabel
    const title = document.getElementById('txt-table-title-wh2');
    if (title) {
        title.innerText = mode === "WH2_SEBELUM" ? "TABEL DATA WH-2 SEBELUM" : "TABEL DATA WH-2 SESUDAH";
    }
    loadStokData(); 
}

async function gantiModeWH3(mode) {
    const contStok = document.getElementById('container-stok-wh3');
    const contRak = document.getElementById('container-rak-wh3');
    const contSelisih = document.getElementById('container-selisih-wh3'); // Tambahkan ini
    const title = document.getElementById('txt-table-title-wh3');
    
    if (!contStok || !contRak || !contSelisih || !title) {
        console.error("Salah satu elemen (container/title) tidak ditemukan!");
        return;
    }

    // Ambil data dari memori
    const allData = window.currentStokData;
    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value.replace(/-/g, '') : null;
    
    const key = allData ? Object.keys(allData).find(k => k.includes(`stokwh3_${tanggal}`)) : null;
    const dataTepat = key ? allData[key] : {};

    // 1. Reset Semua UI
    contStok.classList.add('hidden');
    contRak.classList.add('hidden');
    contSelisih.classList.add('hidden');

    // 2. Logika Navigasi
    if (mode === "STOK WH-3") {
        title.innerText = "TABEL DATA STOK WH-3";
        contStok.classList.remove('hidden');
        const dataBlok = await getAgregatStokBlok();
        renderTabelwh3(dataTepat, mode, key, dataBlok);
    } 
    else if (mode === "RAK WH-3") {
        title.innerText = "TABEL DATA RAK WH-3";
        contRak.classList.remove('hidden');
        renderRakWH3(dataTepat); 
        sinkronisasiBlokKeFirebase(dataTepat);
    }
    else if (mode === "SELISIH") {
        title.innerText = "TABEL RIWAYAT SELISIH";
        contSelisih.classList.remove('hidden');
        // Kirim seluruh allData agar bisa di-render riwayat per tanggal
        renderSelisihWH3(allData); 
    }
}

// Helper untuk pesan kosong
function tampilkanKosong(infoTambahan = '', modul = 'WH2') {
    // 1. Tentukan target ID berdasarkan modul
    const idPeriode = (modul === 'REKAP') ? 'select-periode-rekap' : 
                      (modul === 'WH3') ? 'select-periode-wh3' : 'select-periode-wh2';
    const idTbody = (modul === 'REKAP') ? 'tabel-body-rekap' : 
                    (modul === 'WH3') ? 'tabel-body-selisih-wh3' : 'tabel-body-wh2';
    
    // 2. Tentukan jumlah kolom (colspan) agar rapi
    const colspan = (modul === 'WH3') ? 10 : 6; // Sesuaikan dengan jumlah kolom tiap tabel

    const selPeriode = document.getElementById(idPeriode);
    const tbody = document.getElementById(idTbody);
    
    if (!tbody) return;

    let displayInfo = 'di periode ini';

    // 3. Ambil label periode
    if (selPeriode && selPeriode.options[selPeriode.selectedIndex]) {
        const labelPeriode = selPeriode.options[selPeriode.selectedIndex].text;
        displayInfo = `untuk periode ${labelPeriode}`;
    }

    if (infoTambahan) {
        displayInfo = `${infoTambahan} ${displayInfo.replace('di periode ini', '')}`;
    }

    // 4. Update Tampilan
    tbody.innerHTML = `
        <tr>
            <td colspan="${colspan}" class="text-center py-10 text-slate-800 font-bold">
                <i class="fa-solid fa-box-open mr-2 text-slate-400"></i>
                Belum ada data stok ${displayInfo}
            </td>
        </tr>`;
}

function tampilkanKosongwh3(infoTambahan = '') {
    const selPeriode = document.getElementById('select-periode-wh3');
    let displayInfo = 'di periode ini';

    // Jika ada elemen periode, ambil label dari option yang terpilih
    if (selPeriode && selPeriode.options[selPeriode.selectedIndex]) {
        const labelPeriode = selPeriode.options[selPeriode.selectedIndex].text;
        displayInfo = `untuk periode ${labelPeriode}`;
    }

    // Jika infoTambahan disediakan (misal: "di bulan ini"), gabungkan
    if (infoTambahan) {
        displayInfo = `${infoTambahan} ${displayInfo.replace('di periode ini', '')}`;
    }

    const tbody = document.getElementById('tabel-body-wh3');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-10 text-slate-800">
                Belum ada data stok ${displayInfo}
            </td>
        </tr>`;
}


async function loadDataRekap() {
    const inputTglrekap = document.getElementById('select-tanggal-rekap');
    const tanggalrekap = inputTglrekap ? inputTglrekap.value : null;
    if (!tanggalrekap) return; 

    const radioCheckedrekap = document.querySelector('input[name="rb-mode-rekap"]:checked');
    const moderekap = radioCheckedrekap ? radioCheckedrekap.value : "WH2_SEBELUM";

    // 1. Tentukan file source
    let sourceFile = moderekap.includes('WH3') ? 'stok_wh3.json' : 
                     (moderekap === 'BARANG_LEBIH' ? 'stok_lebih.json' : 'stok_wh2.json');
    let keyPrefix = moderekap.includes('WH3') ? 'stokwh3_' : 'stokwh2wms_';
    
    // Tentukan cache key
    const cacheKey = `cached_rekap_${sourceFile.replace('.json', '')}`;

    try {
        const responserekap = await fetch(`${DB_FIREBASE_URL}${sourceFile}`);
        const allDatarekap = await responserekap.json();

        if (allDatarekap) {
            // PANGGIL DI SINI UNTUK MONITORING UKURAN DOWNLOAD DI WIDGET
            if (typeof updateWidgetDownloadSize === 'function') {
                updateWidgetDownloadSize(allDatarekap);
            }
            
            // SIMPAN KE LOCALSTORAGE (Hanya untuk file yang ukurannya kecil, hindari stok_wh3.json agar tidak quota exceeded)
            if (!moderekap.includes('WH3')) {
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(allDatarekap));
                } catch (e) {
                    console.warn("localStorage penuh, abaikan cache localStorage.");
                }
            }
        }

        // A. Handling untuk Barang Lebih
        if (moderekap === 'BARANG_LEBIH') {
            await window.renderTabelBarangLebih();
            return;
        }

        // B. Handling untuk Selisih WH3 (Menampilkan Tabel Riwayat Selisih multi-tanggal di Rekap)
        if (moderekap === 'SELISIH_WH3') {
            await renderSelisihWH3Rekap(allDatarekap); // Panggil fungsi render riwayat khusus rekap
            return;
        }

        // C. Handling untuk Stok Harian (WH2/WH3)
        const formattedDaterekap = tanggalrekap.replace(/-/g, '');
        const keyrekap = Object.keys(allDatarekap || {}).find(k => k.includes(`${keyPrefix}${formattedDaterekap}`));
        
        if (keyrekap) {
            renderTabelRekap(allDatarekap[keyrekap], moderekap);
        } else {
            tampilkanKosongRekap(tanggalrekap);
        }
        
    } catch (error) {
        console.warn("Gagal memuat data dari server, mencoba memuat dari cache lokal...", error.message);
        
        // FALLBACK: Ambil dari localStorage (jika ada)
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            const allDatarekap = JSON.parse(cachedData);

            if (moderekap === 'BARANG_LEBIH') {
                await window.renderTabelBarangLebih();
                return;
            }

            if (moderekap === 'SELISIH_WH3') {
                await renderSelisihWH3Rekap(allDatarekap); // Fungsi khusus untuk rekap
                return;
            }

            const formattedDaterekap = tanggalrekap.replace(/-/g, '');
            const keyrekap = Object.keys(allDatarekap || {}).find(k => k.includes(`${keyPrefix}${formattedDaterekap}`));
            
            if (keyrekap) {
                renderTabelRekap(allDatarekap[keyrekap], moderekap);
                return;
            }
        }
        
        tampilkanKosongRekap(tanggalrekap);
    }
}

function tampilkanKosongRekap(tanggal) {
    const tbody = document.getElementById('tabel-body-rekap');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-slate-400">Data untuk tanggal ${tanggal} tidak ditemukan, silakan ubah ke periode tanggal sebelumnya.</td></tr>`;
    }
}


async function loadStokData() {
    const dateInput = document.getElementById('select-tanggal-wh2');
    const tanggal = dateInput ? dateInput.value : null;

    if (!tanggal) return;

    // 1. Tentukan mode secara paksa dari DOM
    // Mencari radio yang dicentang, jika tidak ada, default ke SEBELUM
    const radioChecked = document.querySelector('input[name="rb-mode-wh2"]:checked');
    const mode = radioChecked ? radioChecked.value : "SEBELUM";
    
    console.log("Memuat data mode:", mode, "untuk tanggal:", tanggal);

    const formattedDate = tanggal.replace(/-/g, '');
    const cacheKey = 'cached_stok_wh2';
    
    try {
        const response = await fetch(`${DB_FIREBASE_URL}stok_wh2.json`);
        const allData = await response.json();
        
        if (allData) {
            // PANGGIL DI SINI UNTUK MONITORING UKURAN DOWNLOAD DI WIDGET
        if (typeof updateWidgetDownloadSize === 'function') {
            updateWidgetDownloadSize(allData);
        }
            // SIMPAN KE LOCALSTORAGE (Caching Lokal WH-2)
            localStorage.setItem(cacheKey, JSON.stringify(allData));
        }
        
        window.currentStokData = allData;
        
        if (!allData) {
            tampilkanKosong(tanggal);
            return;
        }

        const key = Object.keys(allData).find(k => k.includes(`stokwh2wms_${formattedDate}`));
        
        if (!key) {
            tampilkanKosong(tanggal);
            return;
        }

        // 2. Render langsung dengan mode yang sudah didapat
        renderTabel(allData[key], mode, key);
        
    } catch (error) {
        console.error("Gagal load data dari server, mencoba memuat dari cache lokal...", error);
        
        // FALLBACK: Ambil dari localStorage jika offline/gagal fetch
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            const allData = JSON.parse(cachedData);
            window.currentStokData = allData;
            
            const key = Object.keys(allData).find(k => k.includes(`stokwh2wms_${formattedDate}`));
            if (key) {
                renderTabel(allData[key], mode, key);
                return;
            }
        }
        
        tampilkanKosong(tanggal);
    }
}

// ==========================================
// HELPER INDEXEDDB KHUSUS STOK WH-3
// ==========================================
function openStokWH3DB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("WarehouseStokWH3DB", 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("stok_wh3_store")) {
                db.createObjectStore("stok_wh3_store");
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function saveStokWH3ToIDB(dataStok) {
    try {
        const db = await openStokWH3DB();
        const tx = db.transaction("stok_wh3_store", "readwrite");
        const store = tx.objectStore("stok_wh3_store");
        store.put(dataStok, "stok_wh3_all_data");
        return tx.complete;
    } catch (e) {
        console.error("Gagal menyimpan stok WH-3 ke IndexedDB:", e);
    }
}

async function getStokWH3FromIDB() {
    try {
        const db = await openStokWH3DB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("stok_wh3_store", "readonly");
            const store = tx.objectStore("stok_wh3_store");
            const request = store.get("stok_wh3_all_data");
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Gagal membaca stok WH-3 dari IndexedDB:", e);
        return null;
    }
}

// ==========================================
// FUNGSI LOAD STOK WH-3 (Dioptimalkan agar hemat kuota)
// ==========================================
async function loadStokDatawh3() {
    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value : null;

    if (!tanggal) return;

    // Tentukan mode secara paksa dari DOM
    const radioChecked = document.querySelector('input[name="rb-mode-wh3"]:checked');
    const mode = radioChecked ? radioChecked.value : "STOK WH-3";
    
    const formattedDate = tanggal.replace(/-/g, '');
    
    // 1. FAST-LOAD LOKAL: Tampilkan data kilat dari IndexedDB agar tabel langsung muncul
    const localStok = await getStokWH3FromIDB();
    if (localStok) {
        window.currentStokData = localStok;
        const localKey = Object.keys(localStok).find(k => k.includes(`stokwh3_${formattedDate}`));
        if (localKey) {
            renderTabelwh3(localStok[localKey], mode, localKey);
            console.log("Data Stok WH-3 dimuat kilat dari IndexedDB lokal.");
        }
    }

    // Path referensi spesifik ke database Firebase Anda
    const dbRef = firebase.database().ref(`stok_wh3`);

    try {
        // MENGGUNAKAN .once('value') ATAU .get() AGAR HANYA MENGUNDUH SEKALI SAAT DIBUTUHKAN (HEMAT KUOTA)
        console.log("Mengambil data terbaru dari Firebase...");
        const snapshot = await dbRef.once('value');
        const allData = snapshot.val();
        
        if (allData) {
            // PANGGIL DI SINI UNTUK MONITORING UKURAN DOWNLOAD DI WIDGET
            if (typeof updateWidgetDownloadSize === 'function') {
                updateWidgetDownloadSize(allData);
            }
            // SIMPAN KE INDEXEDDB
            await saveStokWH3ToIDB(allData);
            window.currentStokData = allData;
            
            const key = Object.keys(allData).find(k => k.includes(`stokwh3_${formattedDate}`));
            
            if (!key) {
                tampilkanKosongwh3(tanggal);
                return;
            }

            // Render tabel otomatis dari data server terbaru
            renderTabelwh3(allData[key], mode, key);
            console.log("Data Stok WH-3 berhasil diperbarui dari Firebase.");
        } else {
            tampilkanKosongwh3(tanggal);
        }
    } catch (error) {
        console.error("Gagal mengambil data dari Firebase, menggunakan data lokal IndexedDB...", error);
        
        // FALLBACK: Jika offline atau gagal, gunakan data dari IndexedDB yang sudah ada
        if (localStok) {
            window.currentStokData = localStok;
            const key = Object.keys(localStok).find(k => k.includes(`stokwh3_${formattedDate}`));
            if (key) {
                renderTabelwh3(localStok[key], mode, key);
                console.log("Data Stok WH-3 dimuat dari IndexedDB (Fallback Mode).");
                return;
            }
        }
        
        tampilkanKosongwh3(tanggal);
    }
}



async function renderTabelRekap(dataStok, mode) {
    const tbody = document.getElementById('tabel-body-rekap');
    const thead = document.getElementById('thead-rekap');
    if (!tbody || !thead) return;

    tbody.innerHTML = '';
    
    // Konfigurasi kolom termasuk untuk SELISIH_WH3
    const config = {
        'WH2_SEBELUM': ['NO', 'KODE', 'BOSNET', 'WMS', 'SELISIH', 'KETERANGAN'],
        'WH2_SESUDAH': ['NO', 'KODE', 'BOSNET', 'WMS', 'SELISIH', 'KETERANGAN'],
        'STOK_WH3': ['NO', 'KODE', 'BLOK', 'BOSNET', 'PAK', 'BECERAN', 'UTUHAN', 'TOTAL', 'SELISIH', 'KETERANGAN', 'QA'],
    };

    if (!config[mode]) return; // Jika mode tidak terdaftar, hentikan proses

    thead.innerHTML = `<tr>${config[mode].map(h => `<th class="py-3 px-4 text-left border-b bg-slate-100 uppercase">${h}</th>`).join('')}</tr>`;

    if (!dataStok || Object.keys(dataStok).length === 0) {
        tbody.innerHTML = `<tr><td colspan="${config[mode].length}" class="text-center py-10">Sedang Memuat Data atau Data Tidak Ditemukan...</td></tr>`;
        return;
    }

    // Fungsi helper untuk mengubah angka 0 atau kosong menjadi tanda strip "-"
    const formatVal = (val) => {
        const num = parseInt(val) || 0;
        return num === 0 ? "-" : num;
    };

    // Jika mode adalah SELISIH_WH3, lakukan filtering terlebih dahulu agar hanya ambil data yang selisihnya !== 0
    let entriesToRender = Object.entries(dataStok);
    if (mode === 'SELISIH_WH3') {
        entriesToRender = entriesToRender.filter(([kode, item]) => {
            if (!item || typeof item !== 'object') return false;
            
            // Hitung ulang selisih secara dinamis (Fisik - (Bosnet + QA))
            const bosnet = parseInt(item.bosnet) || 0;
            const qa = parseInt(item.qa) || 0;
            const blok = parseInt(item.blok) || 0;
            const beceran = parseInt(item.beceran) || 0;
            const utuhan = parseInt(item.utuhan) || 0;
            const fisik = kode.includes("PR-PKT") ? (beceran + utuhan) : (blok + beceran + utuhan);
            
            let selisih = (item.selisih !== undefined && item.selisih !== null) ? (parseInt(item.selisih) || 0) : (fisik - (bosnet + qa));
            return selisih !== 0;
        });

        if (entriesToRender.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${config[mode].length}" class="text-center py-10">Tidak ada data selisih pada tanggal ini (Semua Sesuai).</td></tr>`;
            return;
        }
    }

    let i = 1;
    entriesToRender.forEach(([kode, item]) => {
        let row = `<tr><td class="py-2 px-3">${i++}</td><td><b>${kode}</b></td>`;

        if (mode.includes('WH2')) {
            let b = mode === 'WH2_SEBELUM' ? (item.stokwh2_sebelum || 0) : (item.stokwh2_sesudah || 0);
            let w = mode === 'WH2_SEBELUM' ? (item.stokwms_sebelum || 0) : (item.stokwms_sesudah || 0);
            let selisihWH2 = b - w;
            let badgeWH2 = selisihWH2 === 0 ? '<span style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">SESUAI</span>' : '<span style="background: #c0392b; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">SELISIH</span>';
            
            row += `<td>${formatVal(b)}</td><td>${formatVal(w)}</td><td>${formatVal(selisihWH2)}</td><td>${badgeWH2}</td>`;
        } else if (mode === 'STOK_WH3' || mode === 'SELISIH_WH3') {
            // Ambil rincian detail rak untuk tampilan multi-qty jika ada
            const detailRak = item.detail_rak || {};
            const bRak = detailRak.beceran_rak ? `<br><small style="color: gray;">(${detailRak.beceran_rak})</small>` : '';
            const uRak = detailRak.utuhan_rak ? `<br><small style="color: gray;">(${detailRak.utuhan_rak})</small>` : '';

            // --- HITUNG ULANG SELISIH & KETERANGAN AGAR SINKRON DENGAN QA ---
            const bosnet = parseInt(item.bosnet) || 0;
            const qa = parseInt(item.qa) || 0;
            const blok = parseInt(item.blok) || 0;
            const beceran = parseInt(item.beceran) || 0;
            const utuhan = parseInt(item.utuhan) || 0;
            const fisik = kode.includes("PR-PKT") ? (beceran + utuhan) : (blok + beceran + utuhan);
            
            let selisihVal = (item.selisih !== undefined && item.selisih !== null && item.selisih !== "") ? 
                             (parseInt(item.selisih) || 0) : 
                             (fisik - (bosnet + qa));

            // Tentukan keterangan otomatis jika belum sinkron
            let ket = item.keterangan || "";
            if (!ket || ket === "BELUM DIHITUNG") {
                if (selisihVal < 0) {
                    ket = `STOK KURANG ${Math.abs(selisihVal)} KRT`; // atau sesuaikan format teks keterangan Anda
                } else if (selisihVal > 0) {
                    ket = `STOK LEBIH ${selisihVal} KRT`;
                } else {
                    ket = "SESUAI";
                }
            }

            // Warna badge keterangan WH-3
            let badgeColor = "#4de128"; // Stabilo
            const upperKet = ket.toUpperCase();
            if (upperKet.includes("KURANG")) badgeColor = "#c0392b"; // Merah
            else if (upperKet.includes("LEBIH")) badgeColor = "#004b08"; // Hijau Tua

            // Jika di mode SELISIH_WH3, kita buat angka selisihnya lebih menonjol (warna merah)
            let selisihDisplay = mode === 'SELISIH_WH3' ? 
                `<span style="color: #c0392b; font-weight: bold;">${formatVal(selisihVal)}</span>` : 
                formatVal(selisihVal);

            row += `
                <td>${item.blok || '-'}</td>
                <td>${formatVal(item.bosnet)}</td>
                <td>${formatVal(item.pak)}</td>
                <td>${formatVal(item.beceran)} ${bRak}</td>
                <td>${formatVal(item.utuhan)} ${uRak}</td>
                <td><b>${formatVal(item.total)}</b></td>
                <td>${selisihDisplay}</td>
                <td><span style="background: ${badgeColor}; color: white; padding: 3px 6px; border-radius: 4px; font-size: 11px;">${ket}</span></td>
                <td><span style="color: red; font-weight: bold; font-size: 13px;">${formatVal(item.qa)}</span></td>
            `;
        }

        tbody.innerHTML += row + `</tr>`;
    });
}

async function renderSelisihWH3Rekap(allData) {
    // Menggunakan ID tabel khusus untuk menu Rekap
    const thead = document.getElementById('thead-rekap');
    const tbody = document.getElementById('tabel-body-rekap');
    if (!thead || !tbody) return;

    // Salin logika pemrosesan data riwayat yang sama persis seperti renderSelisihWH3 asli
    const polaUtama = ["CRR", "CRR EA", "THR EA", "THR", "MRMR", "MRR", "MJR HJ", "MJR", "MOB4A", "MOR2A EA", "MOR2A EB", "MOR2A", "MP", "PDR", "MTR3A", "PR-PKT", "PR-CUP", "MRSR", "LTGR", "MTGR", "MEB", "MEL", "MOL", "MRL", "MTL", "ISEL"];
    const daftarKelompok = ["CRR", "MRR", "MOR", "MJR", "MP", "PDR", "DIY"];
    const prefixDIY = ["MEB", "MEL", "MOL", "MRL", "MTL", "ISEL"];

    const getSortScore = (kode) => {
        kode = kode.toUpperCase();
        for (let i = 0; i < polaUtama.length; i++) {
            if (kode.includes(polaUtama[i])) {
                if (polaUtama[i] === "MOR2A" && (kode.includes("MOR2A EA") || kode.includes("MOR2A EB"))) continue;
                if (polaUtama[i] === "THR" && kode.includes("THR EA")) continue;
                if (polaUtama[i] === "MJR" && kode.includes("MJR HJ")) continue;
                if (polaUtama[i] === "CRR" && kode.includes("CRR EA")) continue;
                return i + 1;
            }
        }
        return 999;
    };
    const getVarianScore = (kode) => {
        kode = kode.toUpperCase();
        if (kode.includes("ZC")) return 1;
        if (kode.includes("SSL")) return 2;
        if (kode.includes("SLO")) return 3;
        if (kode.includes("TDS")) return 4;
        if (kode.includes("BAG")) return 5;
        if (kode.includes("WRG")) return 6;
        if (kode.includes("GTG")) return 7;
        if (kode.includes("DRC")) return 8;
        return 0;
    };
    const getAngkaAkhir = (kode) => {
        const match = kode.match(/\d+/g);
        return match ? parseInt(match.join('').slice(-4)) || 999 : 999;
    };

    const dates = Object.keys(allData || {})
        .filter(k => k.startsWith('stokwh3_'))
        .map(k => k.replace('stokwh3_', ''))
        .sort();

    let kodeSelisih = new Set();
    let dataMatriks = {};
    let totalPerTgl = {};
    let rekapKelompok = {};
    
    dates.forEach(tgl => {
        totalPerTgl[tgl] = 0;
        const dailyData = allData[`stokwh3_${tgl}`] || {};
        Object.entries(dailyData).forEach(([kode, item]) => {
            if (!item || typeof item !== 'object') return;

            const bosnet = parseInt(item.bosnet) || 0;
            const qa = parseInt(item.qa) || 0;
            const blok = parseInt(item.blok) || 0;
            const beceran = parseInt(item.beceran) || 0;
            const utuhan = parseInt(item.utuhan) || 0;
            
            const fisik = kode.includes("PR-PKT") ? (beceran + utuhan) : (blok + beceran + utuhan);
            
            let selisih = 0;
            if (item.selisih !== undefined && item.selisih !== null) {
                selisih = parseInt(item.selisih) || 0;
            } else {
                selisih = fisik - (bosnet + qa);
            }
            
            if (selisih !== 0) {
                kodeSelisih.add(kode);
                if (!dataMatriks[kode]) dataMatriks[kode] = {};
                dataMatriks[kode][tgl] = selisih;

                totalPerTgl[tgl] += selisih;

                const upperKode = kode.toUpperCase();
                let prefix = prefixDIY.some(p => upperKode.startsWith(p)) ? "DIY" : (daftarKelompok.find(k => k !== "DIY" && upperKode.startsWith(k)) || "LAIN");

                if (!rekapKelompok[prefix]) rekapKelompok[prefix] = {};
                rekapKelompok[prefix][tgl] = (rekapKelompok[prefix][tgl] || 0) + selisih;
            }
        });
    });

    if (dates.length === 0 || kodeSelisih.size === 0) {
        thead.innerHTML = `<tr><th class="py-3 px-4 text-left border-b bg-slate-100 uppercase">KETERANGAN</th></tr>`;
        tbody.innerHTML = `<tr><td class="text-center py-10">Data riwayat selisih WH-3 tidak ditemukan.</td></tr>`;
        return;
    }

    // --- RENDER HEADER ---
    thead.innerHTML = `
        <th class="py-3 px-3 text-center whitespace-nowrap bg-slate-200 border-r" style="position: sticky; left: 0px; top: 0px; z-index: 30; min-width: 45px; width: 45px;">NO</th>
        <th class="py-3 px-3 text-left whitespace-nowrap bg-slate-200 border-r" style="position: sticky; left: 45px; top: 0px; z-index: 30; min-width: 110px;">KODE</th>` + 
        dates.map(d => {
            const dd = d.substring(6,8), mm = d.substring(4,6), yy = d.substring(2,4);
            return `<th class="py-3 px-4 text-center bg-slate-100 whitespace-nowrap" style="position: sticky; top: 0px; z-index: 10;">${dd}/${mm}/${yy}</th>`;
        }).join('');

    // --- RENDER BODY ---
    tbody.innerHTML = "";
    let no = 1;

    Array.from(kodeSelisih).sort((a, b) => {
        const scoreA1 = getSortScore(a), scoreB1 = getSortScore(b);
        if (scoreA1 !== scoreB1) return scoreA1 - scoreB1;
        const scoreA2 = getVarianScore(a), scoreB2 = getVarianScore(b);
        if (scoreA2 !== scoreB2) return scoreA2 - scoreB2;
        return getAngkaAkhir(a) - getAngkaAkhir(b);
    }).forEach(kode => {
        let rowHtml = `<tr class="bg-white border-b hover:bg-gray-50">
            <td class="py-2 px-3 text-center text-slate-600 border-r bg-white" style="position: sticky; left: 0px; z-index: 20; min-width: 45px; width: 45px;">${no++}</td>
            <td class="py-2 px-3 font-bold text-slate-800 whitespace-nowrap border-r bg-white" style="position: sticky; left: 45px; z-index: 20; min-width: 110px;">${kode}</td>`;
        
        dates.forEach(tgl => {
            const val = dataMatriks[kode] && dataMatriks[kode][tgl] ? dataMatriks[kode][tgl] : 0;
            const warna = val > 0 ? "text-blue-600" : (val < 0 ? "text-red-600" : "text-gray-300");
            rowHtml += `<td class="py-2 px-4 text-center font-bold ${warna} whitespace-nowrap">${val === 0 ? "-" : val}</td>`;
        });
        tbody.innerHTML += rowHtml + `</tr>`;
    });

    // --- RENDER TOTAL SELISIH GLOBAL ---
    let totalGlobalRow = `<tr class="bg-orange-100 border-t-2 border-orange-500 font-black">
        <td class="sticky-col-total py-2 px-3 text-right text-[16px] text-red-600 border-r" colspan="2" style="left: 0px; position: sticky;">TOTAL SELISIH :</td>`;
    dates.forEach(tgl => {
        const grandTotal = totalPerTgl[tgl] || 0;
        totalGlobalRow += `<td class="py-2 px-4 text-[16px] text-center ${grandTotal !== 0 ? 'text-red-600' : 'text-gray-400'} whitespace-nowrap">${grandTotal === 0 ? "-" : grandTotal}</td>`;
    });
    tbody.innerHTML += totalGlobalRow + `</tr>`;

    // --- RENDER REKAP KELOMPOK ---
    daftarKelompok.forEach(kel => {
        let kelRow = `<tr class="bg-gray-100 border-b hover:bg-gray-200 font-bold text-slate-700">
            <td class="sticky-col-total py-2 px-3 text-right text-[14px] border-r" colspan="2" style="left: 0px; position: sticky;">SELISIH ${kel} :</td>`;
        dates.forEach(tgl => {
            const val = rekapKelompok[kel] ? (rekapKelompok[kel][tgl] || 0) : 0;
            const warna = val !== 0 ? "text-gray-800" : "text-gray-400";
            kelRow += `<td class="py-2 px-4 text-center ${warna} whitespace-nowrap">${val === 0 ? "-" : val}</td>`;
        });
        tbody.innerHTML += kelRow + `</tr>`;
    });
}


function renderTabel(dataStok, mode, key) {
    const tbody = document.getElementById('tabel-body-wh2');
    const headerAksi = document.getElementById('header-aksi');
    if (!tbody) return;

    if (headerAksi) {
        headerAksi.style.display = (mode === "SESUDAH") ? "" : "none";
    }

    tbody.innerHTML = "";
    let no = 1;
    let totalBosnet = 0; // Inisialisasi total Bosnet
    let totalWms = 0;    // Inisialisasi total WMS
    let totalSelisih = 0; // Inisialisasi total Selisih

    Object.entries(dataStok).forEach(([kode, item]) => {
        const stokBosnet = mode === "SEBELUM" ? item.stokwh2_sebelum : item.stokwh2_sesudah;
        const stokWms = mode === "SEBELUM" ? item.stokwms_sebelum : item.stokwms_sesudah;
        const selisih = stokBosnet - stokWms;
        
        // Akumulasi total
        totalBosnet += parseInt(stokBosnet) || 0;
        totalWms += parseInt(stokWms) || 0;
        totalSelisih += selisih;
        
        const displaySelisih = (selisih === 0) ? "-" : selisih;
        
        let keterangan = "";
        let warnaKeterangan = "";
        if (selisih === 0) {
            keterangan = "SESUAI"; warnaKeterangan = "text-green-600";
        } else if (selisih > 0) {
            keterangan = "QTY BOSNET LEBIH BESAR"; warnaKeterangan = "text-blue-600 font-bold";
        } else {
            keterangan = "QTY WMS LEBIH BESAR"; warnaKeterangan = "text-red-600 font-bold";
        }

        const aksiContent = (mode === "SESUDAH") 
            ? `<td class="py-2 px-3">
                <button onclick="bukaModalAdmin('${key}', '${kode}', ${stokBosnet}, ${stokWms})" 
                        class="bg-orange-500 text-white px-2 py-1 rounded text-[15px] hover:bg-orange-600">
                    Adjust Stok
                </button>
            </td>` 
            : '';

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 border-b border-gray-100">
                <td class="py-2 px-3">${no++}</td>
                <td class="py-2 px-3">${kode}</td>
                <td class="py-2 px-3">${stokBosnet}</td>
                <td class="py-2 px-3">${stokWms}</td>
                <td class="py-2 px-3">${displaySelisih}</td>
                <td class="py-2 px-3 ${warnaKeterangan}">${keterangan}</td>
                ${aksiContent}
            </tr>
        `;
    });

    // Baris Total
    const warnaTotal = totalSelisih === 0 ? "text-green-600" : "text-red-600 font-bold";
    const totalAksiCol = (mode === "SESUDAH") ? `<td class="py-3 px-3"></td>` : '';
    
    tbody.innerHTML += `
        <tr class="bg-slate-100 font-black border-t-2 border-slate-300">
            <td colspan="2" class="py-3 px-3 text-center uppercase">TOTAL SELISIH</td>
            <td class="py-3 px-3">${totalBosnet.toLocaleString()}</td>
            <td class="py-3 px-3">${totalWms.toLocaleString()}</td>
            <td class="py-3 px-3 ${warnaTotal}">${totalSelisih === 0 ? "-" : totalSelisih.toLocaleString()}</td>
            <td colspan="${mode === "SESUDAH" ? 1 : 2}" class="py-3 px-3 ${warnaTotal}">
                ${totalSelisih === 0 ? "SEMUA STOK SESUAI" : "DITEMUKAN SELISIH STOK"}
            </td>
            ${totalAksiCol}
        </tr>
    `;

    // Logika Status
    const statusEl = document.getElementById('status-tabel-wh2');
    if (statusEl) {
        if (totalSelisih === 0) {
            // Menggunakan innerHTML agar tag <i> bisa terbaca sebagai ikon
            statusEl.innerHTML = "[ SEMUA STOK SESUAI: <i class='fas fa-check-circle'></i> ]";
            statusEl.className = "ml-4 text-[15px] font-black text-green-600 uppercase tracking-wider";
        } else {
            statusEl.innerText = "[ TERDAPAT SELISIH STOK: " + totalSelisih.toLocaleString() + " Karton]";
            statusEl.className = "ml-4 text-[15px] font-black text-red-600 uppercase tracking-wider";
        }
    }
}


// ==========================================
// 1. FUNGSI AGREGAT STOK BLOK (Tetap LocalStorage)
// ==========================================
async function getAgregatStokBlok() {
    const cacheKey = 'wh_cache_agregat_stok_blok';
    const cacheTimeKey = 'wh_cache_agregat_stok_blok_time';

    try {
        if (!navigator.onLine) {
            console.warn("[Offline Mode] Menggunakan cache lokal untuk agregat stok blok.");
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) return JSON.parse(cachedData);
        }

        const response = await fetch(`${DB_FIREBASE_URL}stok_blok.json`);
        if (!response.ok) throw new Error("Gagal mengambil data stok blok dari server");

        const dataBlok = await response.json();
        const agregat = {};

        if (dataBlok) {
            Object.values(dataBlok).forEach(blokItem => {
                Object.entries(blokItem).forEach(([kode, dataTanggal]) => {
                    Object.values(dataTanggal).forEach(detail => {
                        const krt = parseInt(detail.krt) || 0;
                        if (!agregat[kode]) agregat[kode] = 0;
                        agregat[kode] += krt;
                    });
                });
            });
        }

        localStorage.setItem(cacheKey, JSON.stringify(agregat));
        localStorage.setItem(cacheTimeKey, Date.now().toString());

        return agregat;
    } catch (error) {
        console.warn("Gagal mengambil dari server, mencoba memuat cache lokal...", error.message);
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        return {};
    }
}

// ==========================================
// HELPER INDEXEDDB KHUSUS MASTER BARANG
// ==========================================
function openMasterDB_wh() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("WarehouseMasterDB", 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("master_store")) {
                db.createObjectStore("master_store");
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function saveMasterToIDB_wh(dataBarang) {
    try {
        const db = await openMasterDB_wh();
        const tx = db.transaction("master_store", "readwrite");
        const store = tx.objectStore("master_store");
        store.put(dataBarang, "master_barang_data");
        return tx.complete;
    } catch (e) {
        console.error("Gagal menyimpan master ke IndexedDB:", e);
    }
}

async function getMasterFromIDB_wh() {
    try {
        const db = await openMasterDB_wh();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("master_store", "readonly");
            const store = tx.objectStore("master_store");
            const request = store.get("master_barang_data");
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Gagal membaca master dari IndexedDB:", e);
        return null;
    }
}

// ==========================================
// 2. FUNGSI LOAD MASTER BARANG (Menggunakan IndexedDB)
// ==========================================
async function loadMasterBarang() {
    try {
        console.log("Mulai memuat master barang...");
        
        if (!navigator.onLine) {
            throw new Error("Offline mode");
        }

        const res = await fetch("https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/master_barang.json");
        
        if (!res.ok) throw new Error("Gagal mengambil data dari server");
        
        const dataFromServer = await res.json(); 
        
        if (dataFromServer) {
            window.masterData = dataFromServer;
            // Simpan ke IndexedDB (Aman dari batas kuota localStorage)
            await saveMasterToIDB_wh(dataFromServer);
            console.log("Master data berhasil dimuat dari server. Jumlah item:", Object.keys(window.masterData).length);
        } else {
            console.warn("Master data kosong atau tidak ditemukan.");
        }
    } catch (error) {
        console.warn("Gagal memuat master barang dari server, mencoba memuat dari IndexedDB lokal...", error.message);
        
        // Fallback membaca dari IndexedDB
        const localMaster = await getMasterFromIDB_wh();
        if (localMaster) {
            window.masterData = localMaster;
            console.log("Master data berhasil dimuat dari IndexedDB lokal. Jumlah item:", Object.keys(window.masterData).length);
        } else {
            window.masterData = {};
            console.error("Master data lokal tidak ditemukan di IndexedDB.");
        }
    }
}

async function renderTabelwh3(dataStok, mode, key) {
    const tbody = document.getElementById('tabel-body-wh3');
    if (!tbody) return;

    window.dataStokTerkini = dataStok;

    // Ambil master_barang langsung dari cache/IndexedDB lokal agar proses kilat tanpa fetch jaringan
    let masterBarang = {};
    const cacheKeyMaster = 'wh_cache_master_barang';
    const localMaster = localStorage.getItem(cacheKeyMaster);
    if (localMaster) {
        try {
            masterBarang = JSON.parse(localMaster);
        } catch (e) {
            masterBarang = {};
        }
    }

    let no = 1;
    let totalSelisih = 0; // Inisialisasi total selisih untuk header

    // --- FUNGSI SORTIR & KONFIGURASI ---
    const polaUtama = ["CRR", "CRR EA", "THR EA", "THR", "MRMR", "MRR", "MJR HJ", "MJR", "MOB4A", "MOR2A EA", "MOR2A EB", "MOR2A", "MP", "PDR", "MTR3A", "PR-PKT", "PR-CUP", "MRSR", "LTGR", "MTGR", "MEB", "MOL", "MRL", "MTL", "ISEL"];
    const getSortScore = (kode) => {
        kode = kode.toUpperCase();
        for (let i = 0; i < polaUtama.length; i++) {
            if (kode.includes(polaUtama[i])) {
                if (polaUtama[i] === "MOR2A" && (kode.includes("MOR2A EA") || kode.includes("MOR2A EB"))) continue;
                if (polaUtama[i] === "THR" && kode.includes("THR EA")) continue;
                if (polaUtama[i] === "MJR" && kode.includes("MJR HJ")) continue;
                if (polaUtama[i] === "CRR" && kode.includes("CRR EA")) continue;
                return i + 1;
            }
        }
        return 999;
    };
    
    const getVarianScore = (kode) => {
        kode = kode.toUpperCase();
        if (kode.includes("ZC")) return 1;
        if (kode.includes("SSL")) return 2;
        if (kode.includes("SLO")) return 3;
        if (kode.includes("TDS")) return 4;
        if (kode.includes("BAG")) return 5;
        if (kode.includes("WRG")) return 6;
        if (kode.includes("GTG")) return 7;
        if (kode.includes("DRC")) return 8;
        return 0;
    };
    const getAngkaAkhir = (kode) => {
        const match = kode.match(/\d+/g);
        if (!match) return 999;
        return parseInt(match.join('').slice(-4)) || 999;
    };

    const sortedEntries = Object.entries(dataStok).sort((a, b) => {
        const scoreA1 = getSortScore(a[0]), scoreB1 = getSortScore(b[0]);
        if (scoreA1 !== scoreB1) return scoreA1 - scoreB1;
        const scoreA2 = getVarianScore(a[0]), scoreB2 = getVarianScore(b[0]);
        if (scoreA2 !== scoreB2) return scoreA2 - scoreB2;
        return getAngkaAkhir(a[0]) - getAngkaAkhir(b[0]);
    });

    const f = (val) => (val === 0 || val === "0" ? "-" : val.toLocaleString());

    // --- 1. HITUNG TOTAL SELISIH (Untuk Header) ---
    sortedEntries.forEach(([kode, item]) => {
        const blok = parseInt(item.blok) || 0;
        const bosnet = parseInt(item.bosnet) || 0;
        const qa = parseInt(item.qa) || 0;
        const beceran = parseInt(item.beceran) || 0;
        const utuhan = parseInt(item.utuhan) || 0;
        
        let fisik = kode.includes("PR-PKT") ? (beceran + utuhan) : (blok + beceran + utuhan);
        totalSelisih += (fisik - (bosnet + qa));
    });

    // Update Elemen Status di Header (WH-3)
    const statusEl = document.getElementById('status-tabel-wh3');
    if (statusEl) {
        if (totalSelisih === 0) {
            statusEl.innerHTML = "[ SEMUA STOK SESUAI: <i class='fas fa-check-circle'></i> ]";
            statusEl.className = "ml-4 text-[15px] font-black text-green-600 uppercase tracking-wider";
        } else {
            statusEl.innerText = "[ TERDAPAT SELISIH: " + totalSelisih.toLocaleString() + " KARTON ]";
            statusEl.className = "ml-4 text-[15px] font-black text-red-600 uppercase tracking-wider";
        }
    }

    // --- 2. RENDER BARIS TABEL (Menggunakan Array Buffer untuk Performa Cepat) ---
    let rowsHTML = "";

    sortedEntries.forEach(([kode, item]) => {
        const blok = parseInt(item.blok) || 0;
        const bosnet = parseInt(item.bosnet) || 0;
        const qa = parseInt(item.qa) || 0;
        const beceran = parseInt(item.beceran) || 0;
        const utuhan = parseInt(item.utuhan) || 0;
        
        let pak = item.pak_format || "-";
        if (pak === "0 | 0" || pak === "0") pak = "-";

        if (!((blok !== 0 || bosnet !== 0 || qa !== 0 || beceran !== 0 || utuhan !== 0) || pak !== "-")) return;

        // Logika Fisik 
        let totalFisik = kode.includes("PR-PKT") ? (beceran + utuhan) : (blok + beceran + utuhan);
        const selisih = totalFisik - (bosnet + qa);
        
        // Tentukan Satuan otomatis (PKT untuk paket, KRT untuk barang biasa)
        const isPaket = kode.includes("PR-PKT");
        const satuan = isPaket ? "PKT" : "KRT";

        // BUAT KETERANGAN OTOMATIS SECARA DINAMIS BERDASARKAN SELISIH
        let keterangan = item.keterangan || "SESUAI";
        if (selisih > 0) {
            keterangan = `STOK LEBIH ${selisih} ${satuan}`;
        } else if (selisih < 0) {
            keterangan = `STOK KURANG ${Math.abs(selisih)} ${satuan}`;
        }
        
        let kelasWarnaSelisih = selisih > 0 ? "text-blue-600 font-bold" : (selisih < 0 ? "text-red-600 font-bold" : "text-green-600 font-bold");
        let warnaKet = selisih > 0 ? "text-blue-600 font-bold" : (selisih < 0 ? "text-red-600 font-bold" : "text-green-600 font-bold");

        // Ambil rincian detail rak untuk tampilan multi-qty (jika ada)
        const detailRak = item.detail_rak || {};
        const bRak = detailRak.beceran_rak ? `<br><small style="color: gray;">(${detailRak.beceran_rak})</small>` : '';
        const uRak = detailRak.utuhan_rak ? `<br><small style="color: gray;">(${detailRak.utuhan_rak})</small>` : '';

        rowsHTML += `
            <tr class="hover:bg-gray-50 border-b text-[15px]">
                <td class="py-2 px-2">${no++}</td>
                <td class="py-2 px-2 whitespace-nowrap font-bold text-orange-600 cursor-pointer hover:underline" onclick="bukaModalAdmin('EDIT_DB_WH3', '${kode}')" title="Klik untuk Edit Database Firebase">${kode}</td>
                <td class="py-2 px-2 font-bold text-emerald-600">${f(blok)}</td>
                <td class="py-2 px-2 font-bold text-slate-600">${f(bosnet)}</td>
                <td class="py-2 px-2">${pak}</td>
                <td class="py-2 px-2 whitespace-nowrap font-bold cursor-pointer hover:underline" onclick="bukaModalInputRak('${kode}')" title="Klik untuk Input Rak Beceran">${f(beceran)} ${bRak}</td>
                <td class="py-2 px-2 whitespace-nowrap font-bold cursor-pointer hover:underline" onclick="bukaModalLihatRak('${kode}', event)" title="Klik untuk Lihat Rak Utuhan">${f(utuhan)} ${uRak}</td>
                <td class="py-2 px-2 font-bold">${f(totalFisik)}</td>
                <td class="py-2 px-2 ${kelasWarnaSelisih}">${selisih === 0 ? "-" : selisih.toLocaleString()}</td>
                <td class="py-2 px-2 whitespace-nowrap ${warnaKet} font-bold cursor-pointer hover:underline" onclick="bukaModalEditKeterangan('${kode}', '${keterangan === "-" ? "" : keterangan}')" title="Klik untuk Edit Keterangan">${keterangan}</td>
                <td class="py-2 px-2 font-bold text-orange-700">${f(qa)}</td>
            </tr>
        `;
    });

    // Masukkan ke DOM sekali jalan agar render bebas lag / nge-freeze
    tbody.innerHTML = rowsHTML;
}

window.bukaModalEditDatabaseWH3 = function(kode) {
    console.log("Membuka modal database untuk kode:", kode);

    const dataStok = window.dataStokTerkini || {};
    const item = dataStok[kode];

    if (!item) {
        alert('Data item untuk kode ' + kode + ' tidak ditemukan di memori lokal!');
        console.error("Data item kosong untuk key:", kode, "Data stok terkini:", dataStok);
        return;
    }

    const dateInput = document.getElementById('select-tanggal-wh3') || document.querySelector('input[type="date"]');
    const tanggal = dateInput ? dateInput.value.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');

    let modalID = 'modal-edit-db-wh3';
    let modal = document.getElementById(modalID);
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalID;
        document.body.appendChild(modal);
    }

    modal.className = 'fixed inset-0 bg-black bg-opacity-40 hidden z-[9999] flex items-center justify-center p-3';

    modal.innerHTML = `
        <div class="bg-white rounded-[12px] w-full max-w-md overflow-hidden shadow-2xl">
            <!-- Header MIUI v5 -->
            <div class="w-full h-14 bg-gradient-to-b from-[#3c3c3c] to-[#2a2a2a] flex items-center justify-between px-4">
                <h3 class="text-white font-bold text-sm uppercase">EDIT DATABASE : ${kode}</h3>
                <button type="button" onclick="document.getElementById('${modalID}').style.display='none'" class="text-orange-400 font-bold text-lg">✕</button>
            </div>

            <!-- Konten Form -->
            <form id="form-edit-db-wh3" onsubmit="simpanEditDatabaseWH3(event, '${tanggal}', '${kode}')" class="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
                <div>
                    <label class="text-[12px] font-bold text-gray-800 uppercase">Nama Barang</label>
                    <input type="text" id="db-nama" value="${item.nama || ''}" class="w-full mt-1 border rounded px-2 py-1.5 text-[13px] text-gray-800 font-bold bg-gray-100" readonly>
                </div>

                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <label class="text-[12px] font-bold text-gray-800 uppercase">Blok</label>
                        <input type="number" id="db-blok" value="${item.blok || 0}" class="w-full mt-1 border rounded px-2 py-1.5 text-[13px] text-gray-800 font-bold">
                    </div>
                    <div>
                        <label class="text-[12px] font-bold text-gray-800 uppercase">Bosnet</label>
                        <input type="number" id="db-bosnet" value="${item.bosnet || 0}" oninput="hitungOtomatisModalEdit()" class="w-full mt-1 border rounded px-2 py-1.5 text-[13px] text-gray-800 font-bold">
                    </div>
                    <div>
                        <label class="text-[12px] font-bold text-gray-800 uppercase text-orange-600">QA</label>
                        <input type="number" id="db-qa" value="${item.qa || 0}" oninput="hitungOtomatisModalEdit()" class="w-full mt-1 border border-orange-300 rounded px-2 py-1.5 text-[13px] text-orange-600 font-bold bg-orange-50">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[12px] font-bold text-gray-800 uppercase">Beceran</label>
                        <input type="number" id="db-beceran" value="${item.beceran || 0}" class="w-full mt-1 border rounded px-2 py-1.5 text-[13px] text-gray-800 font-bold">
                    </div>
                    <div>
                        <label class="text-[12px] font-bold text-gray-800 uppercase">Utuhan</label>
                        <input type="number" id="db-utuhan" value="${item.utuhan || 0}" class="w-full mt-1 border rounded px-2 py-1.5 text-[13px] text-gray-800 font-bold">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[12px] font-bold text-gray-800 uppercase">Total (Fisik)</label>
                        <input type="number" id="db-total" value="${item.total || 0}" oninput="hitungOtomatisModalEdit()" class="w-full mt-1 border rounded px-2 py-1.5 text-[13px] text-gray-800 font-bold">
                    </div>
                    <div>
                        <label class="text-[12px] font-bold text-gray-800 uppercase">Selisih</label>
                        <input type="number" id="db-selisih" value="${item.selisih || 0}" class="w-full mt-1 border rounded px-2 py-1.5 text-[13px] text-gray-800 font-bold bg-gray-100" readonly>
                    </div>
                </div>

                <div>
                    <label class="text-[12px] font-bold text-gray-800 uppercase">Format Pak</label>
                    <input type="text" id="db-pak" value="${item.pak_format || '-|-'}" class="w-full mt-1 border rounded px-2 py-1.5 text-[13px] text-gray-800 font-bold">
                </div>

                <div>
                    <label class="text-[12px] font-bold text-gray-800 uppercase">Keterangan</label>
                    <input type="text" id="db-keterangan" value="${item.keterangan || 'SESUAI'}" class="w-full mt-1 border rounded px-2 py-1.5 text-[13px] text-gray-800 font-bold bg-gray-100" readonly>
                </div>
            </form>

            <!-- Footer Tombol Aksi -->
            <div class="px-4 py-3 bg-gray-50 flex gap-2">
                <button type="submit" form="form-edit-db-wh3" class="flex-1 py-3 bg-orange-500 text-white font-black text-sm rounded-lg hover:bg-orange-600 transition-all shadow-lg">SIMPAN DATA</button>
                <button type="button" onclick="konfirmasiHapusDatabaseWH3('${tanggal}', '${kode}')" class="flex-1 py-3 bg-rose-600 text-white font-black text-sm rounded-lg hover:bg-rose-700 transition-all shadow-lg">HAPUS DATA</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
};

// Fungsi pendukung untuk auto-kalkulasi langsung di dalam modal saat nilai Bosnet, QA, atau Total diubah
window.hitungOtomatisModalEdit = function() {
    const bosnet = parseFloat(document.getElementById('db-bosnet').value) || 0;
    const qa = parseFloat(document.getElementById('db-qa').value) || 0;
    const totalFisik = parseFloat(document.getElementById('db-total').value) || 0;

    // Rumus: Total Fisik dikurangi (Bosnet + QA)
    const selisih = totalFisik - (bosnet + qa);
    document.getElementById('db-selisih').value = selisih;

    const isPaket = document.getElementById('form-edit-db-wh3').innerHTML.includes("PR-PKT") || false; 
    // Menggunakan cek sederhana satuan
    let keterangan = "SESUAI";
    if (selisih > 0) {
        keterangan = `STOK LEBIH ${selisih} KRT`;
    } else if (selisih < 0) {
        keterangan = `STOK KURANG ${Math.abs(selisih)} KRT`;
    }
    document.getElementById('db-keterangan').value = keterangan;
};

window.simpanEditDatabaseWH3 = async function(event, tanggal, kode) {
    event.preventDefault();

    // 1. Ambil nilai input dari form, termasuk QA
    const blok = parseInt(document.getElementById('db-blok').value) || 0;
    const bosnet = parseInt(document.getElementById('db-bosnet').value) || 0;
    const qa = parseInt(document.getElementById('db-qa') ? document.getElementById('db-qa').value : 0) || 0;
    const beceran = parseInt(document.getElementById('db-beceran').value) || 0;
    const utuhan = parseInt(document.getElementById('db-utuhan').value) || 0;
    const totalFisik = parseInt(document.getElementById('db-total').value) || 0;

    // 2. Hitung ulang selisih berdasarkan rumus baru: Total Fisik - (Bosnet + QA)
    const totalPengurang = bosnet + qa;
    const selisih = totalFisik - totalPengurang;

    // 3. Tentukan satuan otomatis (PKT untuk paket, KRT untuk barang biasa)
    const isPaket = kode.includes("PR-PKT");
    const satuan = isPaket ? "PKT" : "KRT";

    // 4. Buat atau perbarui keterangan otomatis secara dinamis
    let keterangan = "SESUAI";
    if (selisih > 0) {
        keterangan = `STOK LEBIH ${selisih} ${satuan}`;
    } else if (selisih < 0) {
        keterangan = `STOK KURANG ${Math.abs(selisih)} ${satuan}`;
    } else {
        // Jika form modal menyediakan input keterangan manual dan pengguna mengisinya, bisa dipertahankan, atau biarkan SESUAI
        const manualKet = document.getElementById('db-keterangan') ? document.getElementById('db-keterangan').value.trim() : "";
        if (manualKet && manualKet !== "-") {
            keterangan = manualKet;
        }
    }

    // 5. Susun objek data yang akan dikirim ke Firebase
    const updatedData = {
        blok: blok,
        bosnet: bosnet,
        qa: qa,
        beceran: beceran,
        utuhan: utuhan,
        total: totalFisik,
        selisih: selisih,
        pak_format: document.getElementById('db-pak').value.trim(),
        keterangan: keterangan
    };

    const url = `https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_wh3/stokwh3_${tanggal}/${kode}.json`;

    try {
        if (!navigator.onLine) {
            throw new Error("Offline");
        }

        const response = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            miuiAlert("Data database berhasil diperbarui!");
            document.getElementById('modal-edit-db-wh3').style.display = 'none';
            if (typeof muatDataStokWH3 === 'function') {
                muatDataStokWH3();
            } else if (typeof loadStokDatawh3 === 'function') {
                loadStokDatawh3();
            } else {
                location.reload();
            }
        } else {
            throw new Error("Gagal memperbarui database dari server.");
        }
    } catch (err) {
        console.warn("Koneksi terputus/offline saat simpan edit database, memasukkan ke antrean background queue...", err.message);
        
        // Simpan ke antrean offline dengan method PATCH
        simpanKeAntreanOffline(url, 'PATCH', updatedData, `Edit Database WH-3 Produk ${kode} (${tanggal})`);
        
        miuiAlert("Koneksi terputus. Perubahan data berhasil dimasukkan ke antrean offline dan akan disinkronkan otomatis saat online.");
        
        // Tetap tutup modal agar UI tetap responsif bagi pengguna
        document.getElementById('modal-edit-db-wh3').style.display = 'none';
    }
};

// Fungsi untuk memicu konfirmasi dan hapus permanen
window.konfirmasiHapusDatabaseWH3 = function(tanggal, kode) {
    if (confirm(`PERINGATAN: Data produk [ ${kode} ] akan dihapus secara permanen dari database! Yakin ingin menghapusnya?`)) {
        eksekusiHapusDatabaseWH3(tanggal, kode);
    }
};

// Fungsi eksekusi penghapusan menggunakan Fetch API dan memuat ulang data tanpa reload halaman
async function eksekusiHapusDatabaseWH3(tanggal, kode) {
    console.log(`Mencoba menghapus data untuk tanggal: ${tanggal}, kode: ${kode}`);

    const url = `https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_wh3/stokwh3_${tanggal}/${kode}.json`;

    try {
        if (!navigator.onLine) {
            throw new Error("Offline");
        }

        const response = await fetch(url, {
            method: "DELETE"
        });

        if (response.ok) {
            console.log("Data berhasil dihapus dari Firebase.");
            miuiAlert("Data berhasil dihapus secara permanen!");

            // Tutup modal edit database
            const modal = document.getElementById('modal-edit-db-wh3');
            if (modal) {
                modal.style.display = 'none';
            }

            // Hapus data dari objek penampung lokal jika ada
            if (window.dataStokTerkini && window.dataStokTerkini[kode]) {
                delete window.dataStokTerkini[kode];
            }

            // Refresh tabel menggunakan fungsi pemuat data WH-3 yang benar tanpa reload halaman
            if (typeof window.loadStokDatawh3 === 'function') {
                await window.loadStokDatawh3();
            } else if (typeof triggerUpdateTampilanWH3 === 'function') {
                const tanggalAktif = document.getElementById('tanggal-input-wh3')?.value || tanggal; 
                await triggerUpdateTampilanWH3(tanggalAktif);
            } else if (typeof muatDataStokWH3 === 'function') {
                muatDataStokWH3();
            } else {
                console.warn("Fungsi pemuat data tidak ditemukan, tetapi data sudah terhapus di database.");
            }
        } else {
            throw new Error("Gagal menghapus data dari database server.");
        }
    } catch (err) {
        console.warn("Koneksi terputus/offline saat menghapus data, memasukkan ke antrean background queue...", err.message);
        
        // Simpan ke antrean offline dengan method DELETE (body kosong/null)
        simpanKeAntreanOffline(url, 'DELETE', null, `Hapus Database WH-3 Produk ${kode} (${tanggal})`);
        
        miuiAlert("Koneksi terputus. Permintaan hapus telah dimasukkan ke antrean offline dan akan diproses saat online.");

        // Tutup modal dan bersihkan cache lokal sementara
        const modal = document.getElementById('modal-edit-db-wh3');
        if (modal) {
            modal.style.display = 'none';
        }
        if (window.dataStokTerkini && window.dataStokTerkini[kode]) {
            delete window.dataStokTerkini[kode];
        }
    }
}

function renderRakWH3(dataStok) {
    const tbody = document.getElementById('tabel-body-rak-wh3');
    if (!tbody) return;
    
    tbody.innerHTML = "";
    let no = 1;

    if (!dataStok || typeof dataStok !== 'object') return;

    // --- FUNGSI FORMAT RAK ---
    const formatRakV2 = (str) => {
        if (!str) return "";
        return str.replace(/(\d+)([A-Za-z]+)(\d+)/g, "$1 C $3");
    };

    // --- SORTIR DATA (Agar sinkron dengan Tabel Stok & konsisten dengan v3.6.1) ---
    const polaUtama = ["CRR", "CRR EA", "THR EA", "THR", "MRMR", "MRR", "MJR HJ", "MJR", "MOB4A", "MOR2A EA", "MOR2A EB", "MOR2A", "MP", "PDR", "MTR3A", "PR-PKT", "PR-CUP", "MRSR", "LTGR", "MTGR", "MEB", "MOL", "MRL", "MTL", "ISEL"];
    
    const getSortScore = (kode) => {
        kode = kode.toUpperCase();
        for (let i = 0; i < polaUtama.length; i++) {
            if (kode.includes(polaUtama[i])) {
                if (polaUtama[i] === "MOR2A" && (kode.includes("MOR2A EA") || kode.includes("MOR2A EB"))) continue;
                if (polaUtama[i] === "THR" && kode.includes("THR EA")) continue;
                if (polaUtama[i] === "MJR" && kode.includes("MJR HJ")) continue;
                if (polaUtama[i] === "CRR" && kode.includes("CRR EA")) continue;
                return i + 1;
            }
        }
        return 999;
    };

    const getVarianScore = (kode) => {
        kode = kode.toUpperCase();
        if (kode.includes("ZC")) return 1;
        if (kode.includes("SSL")) return 2;
        if (kode.includes("SLO")) return 3;
        if (kode.includes("TDS")) return 4;
        if (kode.includes("BAG")) return 5;
        if (kode.includes("WRG")) return 6;
        if (kode.includes("GTG")) return 7;
        if (kode.includes("DRC")) return 8;
        return 0;
    };

    const getAngkaAkhir = (kode) => {
        const match = kode.match(/\d+/g);
        return match ? parseInt(match.join('').slice(-4)) || 999 : 999;
    };

    const sortedEntries = Object.entries(dataStok).sort((a, b) => {
        const scoreA1 = getSortScore(a[0]), scoreB1 = getSortScore(b[0]);
        if (scoreA1 !== scoreB1) return scoreA1 - scoreB1;
        const scoreA2 = getVarianScore(a[0]), scoreB2 = getVarianScore(b[0]);
        if (scoreA2 !== scoreB2) return scoreA2 - scoreB2;
        return getAngkaAkhir(a[0]) - getAngkaAkhir(b[0]);
    });

    const f = (val) => (!val || val === "0" || val === 0 ? "-" : val);

    // --- RENDER BARIS ---
    sortedEntries.forEach(([kode, item]) => {
        if (typeof item !== 'object') return;

        const dr = item.detail_rak || {};
        
        // Memproses format rak dengan formatRakV2
        const rakBeceran = dr.beceran_rak ? formatRakV2(dr.beceran_rak) : "-";
        
        const rawUtuhan = dr.utuhan_rak || "";
        const rakUtuhan = rawUtuhan ? rawUtuhan.split('+').map(part => formatRakV2(part.trim())).join(' + ') : "-";
        
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 border-b text-[15px]">
                <td class="py-3 px-3 text-slate-600">${no++}</td>
                <td class="py-3 px-3 font-bold text-slate-800">${kode}</td>
                <td class="py-3 px-3 font-bold text-slate-800">${f(item.beceran)}</td>
                <td class="py-3 px-3 text-slate-800 font-bold uppercase">${rakBeceran}</td>
                <td class="py-3 px-3 text-slate-800 font-bold">${f(item.utuhan)}</td>
                <td class="py-3 px-3 text-slate-800 font-bold uppercase">${rakUtuhan}</td>
            </tr>
        `;
    });
}

async function renderSelisihWH3(allData, tableIdPrefix = '') {
    // Jika dipanggil dari Rekap, kita bisa berikan prefix atau target ID khusus,
    // atau tentukan ID berdasarkan di mana fungsi ini dipanggil
    const theadId = tableIdPrefix ? `thead-${tableIdPrefix}` : 'thead-selisih-wh3';
    const tbodyId = tableIdPrefix ? `tabel-body-${tableIdPrefix}` : 'tabel-body-selisih-wh3';

    const thead = document.getElementById(theadId);
    const tbody = document.getElementById(tbodyId);
    if (!thead || !tbody) return;

    // --- FUNGSI SORTIR & KONFIGURASI ---
    const polaUtama = ["CRR", "CRR EA", "THR EA", "THR", "MRMR", "MRR", "MJR HJ", "MJR", "MOB4A", "MOR2A EA", "MOR2A EB", "MOR2A", "MP", "PDR", "MTR3A", "PR-PKT", "PR-CUP", "MRSR", "LTGR", "MTGR", "MEB", "MEL", "MOL", "MRL", "MTL", "ISEL"];
    const daftarKelompok = ["CRR", "MRR", "MOR", "MJR", "MP", "PDR", "DIY"]; // Kelompok untuk rekap selisih
    const prefixDIY = ["MEB", "MEL", "MOL", "MRL", "MTL", "ISEL"]; // Daftar prefix khusus yang masuk ke kelompok DIY

    const getSortScore = (kode) => {
        kode = kode.toUpperCase();
        for (let i = 0; i < polaUtama.length; i++) {
            if (kode.includes(polaUtama[i])) {
                if (polaUtama[i] === "MOR2A" && (kode.includes("MOR2A EA") || kode.includes("MOR2A EB"))) continue;
                if (polaUtama[i] === "THR" && kode.includes("THR EA")) continue;
                if (polaUtama[i] === "MJR" && kode.includes("MJR HJ")) continue;
                if (polaUtama[i] === "CRR" && kode.includes("CRR EA")) continue;
                return i + 1;
            }
        }
        return 999;
    };
    const getVarianScore = (kode) => {
        kode = kode.toUpperCase();
        if (kode.includes("ZC")) return 1;
        if (kode.includes("SSL")) return 2;
        if (kode.includes("SLO")) return 3;
        if (kode.includes("TDS")) return 4;
        if (kode.includes("BAG")) return 5;
        if (kode.includes("WRG")) return 6;
        if (kode.includes("GTG")) return 7;
        if (kode.includes("DRC")) return 8;
        return 0;
    };
    const getAngkaAkhir = (kode) => {
        const match = kode.match(/\d+/g);
        return match ? parseInt(match.join('').slice(-4)) || 999 : 999;
    };

    // --- PROSES DATA ---
    const dates = Object.keys(allData || {})
        .filter(k => k.startsWith('stokwh3_'))
        .map(k => k.replace('stokwh3_', ''))
        .sort();

    let kodeSelisih = new Set();
    let dataMatriks = {};
    let totalPerTgl = {};
    let rekapKelompok = {};
    
    dates.forEach(tgl => {
        totalPerTgl[tgl] = 0;
        const dailyData = allData[`stokwh3_${tgl}`] || {};
        Object.entries(dailyData).forEach(([kode, item]) => {
            if (!item || typeof item !== 'object') return;

            const bosnet = parseInt(item.bosnet) || 0;
            const qa = parseInt(item.qa) || 0; // Menambahkan variabel QA agar sinkron
            const blok = parseInt(item.blok) || 0;
            const beceran = parseInt(item.beceran) || 0;
            const utuhan = parseInt(item.utuhan) || 0;
            
            const fisik = kode.includes("PR-PKT") ? (beceran + utuhan) : (blok + beceran + utuhan);
            
            // Ambil dari RTDB jika ada, atau hitung dengan rumus (fisik - (bosnet + qa))
            let selisih = 0;
            if (item.selisih !== undefined && item.selisih !== null) {
                selisih = parseInt(item.selisih) || 0;
            } else {
                selisih = fisik - (bosnet + qa);
            }
            
            if (selisih !== 0) {
                kodeSelisih.add(kode);
                if (!dataMatriks[kode]) dataMatriks[kode] = {};
                dataMatriks[kode][tgl] = selisih;

                // Akumulasi Total
                totalPerTgl[tgl] += selisih;

                // Akumulasi Rekap Kelompok (Cek apakah masuk DIY atau kelompok standar lainnya)
                const upperKode = kode.toUpperCase();
                let prefix = "LAIN";
                
                if (prefixDIY.some(p => upperKode.startsWith(p))) {
                    prefix = "DIY";
                } else {
                    prefix = daftarKelompok.find(k => k !== "DIY" && upperKode.startsWith(k)) || "LAIN";
                }

                if (!rekapKelompok[prefix]) rekapKelompok[prefix] = {};
                rekapKelompok[prefix][tgl] = (rekapKelompok[prefix][tgl] || 0) + selisih;
            }
        });
    });

    // --- RENDER HEADER ---
    thead.innerHTML = `
        <th class="sticky-col py-3 px-3 text-center top-0 whitespace-nowrap" style="min-width: 45px;">NO</th>
        <th class="sticky-col-kode py-3 px-3 text-left top-0 whitespace-nowrap">KODE</th>` + 
        dates.map(d => {
            const dd = d.substring(6,8), mm = d.substring(4,6), yy = d.substring(2,4);
            return `<th class="py-3 px-4 text-center bg-slate-100 sticky top-0 z-20 whitespace-nowrap">${dd}/${mm}/${yy}</th>`;
        }).join('');

    // --- RENDER BODY ---
    tbody.innerHTML = "";
    let no = 1;

    Array.from(kodeSelisih).sort((a, b) => {
        const scoreA1 = getSortScore(a), scoreB1 = getSortScore(b);
        if (scoreA1 !== scoreB1) return scoreA1 - scoreB1;
        const scoreA2 = getVarianScore(a), scoreB2 = getVarianScore(b);
        if (scoreA2 !== scoreB2) return scoreA2 - scoreB2;
        return getAngkaAkhir(a) - getAngkaAkhir(b);
    }).forEach(kode => {
        let rowHtml = `<tr class="bg-white border-b hover:bg-gray-50">
            <td class="sticky-col py-2 px-3 text-center text-slate-600 border-r" style="min-width: 45px;">${no++}</td>
            <td class="sticky-col-kode py-2 px-3 font-bold text-slate-800 whitespace-nowrap border-r">${kode}</td>`;
        
        dates.forEach(tgl => {
            const val = dataMatriks[kode] && dataMatriks[kode][tgl] ? dataMatriks[kode][tgl] : 0;
            const warna = val > 0 ? "text-blue-600" : (val < 0 ? "text-red-600" : "text-gray-300");
            rowHtml += `<td class="py-2 px-4 text-center font-bold ${warna} whitespace-nowrap">${val === 0 ? "-" : val}</td>`;
        });
        tbody.innerHTML += rowHtml + `</tr>`;
    });

    // --- RENDER TOTAL SELISIH GLOBAL ---
    let totalGlobalRow = `<tr class="bg-orange-100 border-t-2 border-orange-500 font-black">
        <td class="sticky-col-total py-2 px-3 text-right text-[16px] text-red-600 border-r" colspan="2" style="left: 0px; position: sticky;">TOTAL SELISIH :</td>`;
    dates.forEach(tgl => {
        const grandTotal = totalPerTgl[tgl] || 0;
        totalGlobalRow += `<td class="py-2 px-4 text-[16px] text-center ${grandTotal !== 0 ? 'text-red-600' : 'text-gray-400'} whitespace-nowrap">${grandTotal === 0 ? "-" : grandTotal}</td>`;
    });
    tbody.innerHTML += totalGlobalRow + `</tr>`;

    // --- RENDER REKAP KELOMPOK ---
    daftarKelompok.forEach(kel => {
        let kelRow = `<tr class="bg-gray-100 border-b hover:bg-gray-200 font-bold text-slate-700">
            <td class="sticky-col-total py-2 px-3 text-right text-[14px] border-r" colspan="2" style="left: 0px; position: sticky;">SELISIH ${kel} :</td>`;
        dates.forEach(tgl => {
            const val = rekapKelompok[kel] ? (rekapKelompok[kel][tgl] || 0) : 0;
            const warna = val !== 0 ? "text-gray-800" : "text-gray-400";
            kelRow += `<td class="py-2 px-4 text-center ${warna} whitespace-nowrap">${val === 0 ? "-" : val}</td>`;
        });
        tbody.innerHTML += kelRow + `</tr>`;
    });
}

// Membuka modal dan mengisi data awal
async function bukaModalInputRak(kode) {
    // 1. Pastikan master data tersedia
    if (!window.masterData) {
        console.log("Data master belum siap, memuat ulang...");
        await loadMasterBarang();
    }

    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value.replace(/-/g, '') : null;
    
    // Akses data
    const dataHarian = window.currentStokData ? window.currentStokData[`stokwh3_${tanggal}`] : null;
    const item = dataHarian ? dataHarian[kode] : null;

    if (!item) {
        console.error("Data barang tidak ditemukan untuk kode:", kode);
        alert("Data barang tidak ditemukan.");
        return;
    }

    // 2. Set UI Modal
    document.getElementById('modalTitle').innerText = `Input Rak: ${kode} : ${item.selisih || 0} KRT/PKT`;
    
    const detail = item.detail_rak || {};
    
    // UBAH DISINI: Ambil dari beceran_qty_teks (format teks asli seperti "9 + 12"), 
    // fallback ke item.beceran jika teks aslinya belum ada
    const teksBeceran = detail.beceran_qty_teks !== undefined ? detail.beceran_qty_teks : (item.beceran || "");
    document.getElementById('inputBeceran').value = teksBeceran;
    
    document.getElementById('inputRakBeceran').value = detail.beceran_rak || "";
    document.getElementById('inputRakUtuhan').value = detail.utuhan_rak || "";
    
    window.currentKode = kode;
    hitungKonversi(); // Tetap jalankan kalkulasi agar preview otomatis membaca total angkanya
    
    // 3. Tampilkan Modal dengan Animasi
    const modal = document.getElementById('modalInputRak');
    const modalBox = modal.querySelector('.modal-fade'); // Pastikan elemen dalam modal punya class ini
    
    modal.classList.remove('hidden');
    
    // Trigger animasi dan auto-focus
    setTimeout(() => {
        if (modalBox) modalBox.classList.add('modal-show');
        
        // Auto-focus ke input pertama
        const inputPertama = document.getElementById('inputBeceran');
        inputPertama.focus();
        inputPertama.select(); // Highlight isi agar langsung bisa ditimpa
    }, 50);
}

// Daftarkan event listener untuk perpindahan kolom atau menggunakan tombol Enter
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const modal = document.getElementById('modalInputRak');
        // Pastikan modal benar-benar tampil (tidak punya class 'hidden')
        if (modal.classList.contains('hidden')) return;

        e.preventDefault(); 

        const activeElement = document.activeElement;
        
        // Alur urutan yang benar:
        // 1. Qty Beceran (inputBeceran)
        // 2. Rak Beceran (inputRakBeceran)
        // 3. Rak Utuhan (inputRakUtuhan)
        // 4. Simpan (simpanRak)

        switch (activeElement.id) {
            case 'inputBeceran':
                document.getElementById('inputRakBeceran').focus();
                break;
            case 'inputRakBeceran':
                document.getElementById('inputRakUtuhan').focus();
                break;
            case 'inputRakUtuhan':
                simpanRak();
                break;
            default:
                // Opsional: jika kursor tidak sengaja di luar, arahkan ke awal
                document.getElementById('inputBeceran').focus();
                break;
        }
    }
});

function hitungKonversi() {
    // 1. Pengecekan data master
    if (!window.masterData) {
        miuiAlert("Data master sedang dimuat, mohon tunggu sebentar...");
        return;
    }

    const kode = window.currentKode;
    
    // UBAH DISINI: Gunakan hitungTotalBeceran agar string "9+12" terbaca totalnya (21)
    const rawBeceran = document.getElementById('inputBeceran').value;
    const inputBeceran = hitungTotalBeceran(rawBeceran);
    
    // 2. Akses data master
    const master = window.masterData ? window.masterData[kode] : null;
    if (!master || typeof master.QTY === 'undefined' || master.QTY === null || master.QTY === "") {
        miuiAlert("Peringatan: Data QTY untuk kode " + kode + " tidak ditemukan di master_barang.");
        document.getElementById('displayQtyUtuhan').innerText = "0";
        return;
    }

    const konversi = parseInt(master.QTY);
    const rakUtuhanInput = document.getElementById('inputRakUtuhan').value;
    
    let hasil = 0;

    // 3. LOGIKA PEMISAH:
    if (kode.includes("PR-PKT")) {
        const jumlahKarton = parseInt(rakUtuhanInput) || 0;
        hasil = (jumlahKarton * konversi) + inputBeceran;
    } else {
        const rakArray = rakUtuhanInput.split('+').filter(r => r.trim() !== "");
        hasil = (rakArray.length * konversi) + inputBeceran;
    }
    
    // 4. Update tampilan
    const displayElement = document.getElementById('displayQtyUtuhan');
    if (displayElement) {
        displayElement.innerText = hasil.toLocaleString();
    }
}

function hitungTotalBeceran(inputStr) {
    if (!inputStr) return 0;
    const parts = String(inputStr).split('+');
    let total = 0;
    parts.forEach(part => {
        const angka = parseFloat(part.trim()) || 0;
        total += angka;
    });
    return total;
}

async function simpanRak() {
    const kode = window.currentKode;
    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value.replace(/-/g, '') : null;
    
    if (!tanggal) {
        miuiAlert("Tanggal aktif tidak ditemukan!");
        return;
    }
    
    // 1. Ambil input teks mentah untuk tampilan/multi-qty, lalu hitung totalnya untuk sistem
    const rawBeceranVal = document.getElementById('inputBeceran').value; 
    const beceranVal = hitungTotalBeceran(rawBeceranVal); // Hasil angka murni (misal: 21) untuk perhitungan sistem
    
    const rakBeceranVal = document.getElementById('inputRakBeceran').value.toUpperCase();
    const rakUtuhanVal = document.getElementById('inputRakUtuhan').value.toUpperCase();
    
    // 2. Kalkulasi Utuhan berdasarkan jenis kode
    const master = window.masterData ? window.masterData[kode] : null;
    const qtyPerRak = master ? parseInt(master.QTY) : 0; 
    
    let utuhanVal = 0;
    const isPaket = kode.includes("PR-PKT");

    if (isPaket) {
        const jumlahKarton = parseInt(rakUtuhanVal) || 0;
        utuhanVal = jumlahKarton * (qtyPerRak > 0 ? qtyPerRak : 1);
    } else {
        const rakArray = rakUtuhanVal.split('+').filter(r => r.trim() !== "");
        utuhanVal = rakArray.length * (qtyPerRak > 0 ? qtyPerRak : 1);
    }

    // 3. Ambil data item harian untuk mendapatkan nilai bosnet dan qa
    if (!window.currentStokData) window.currentStokData = {};
    const keyStok = `stokwh3_${tanggal}`;
    if (!window.currentStokData[keyStok]) {
        window.currentStokData[keyStok] = {};
    }

    const dataHarian = window.currentStokData[keyStok];
    const item = dataHarian[kode];
    
    if (!item) {
        console.error("Data tidak ditemukan");
        miuiAlert("Data produk tidak ditemukan pada tanggal tersebut.");
        return;
    }

    const bosnetVal = parseInt(item.bosnet) || 0;
    const qaVal = parseInt(item.qa) || 0; 
    const blokVal = parseInt(item.blok) || 0;

    // Kalkulasi Total Fisik
    const totalVal = blokVal + beceranVal + utuhanVal;
    
    // RUMUS: Total dikurangi (Bosnet + QA)
    const totalPengurang = bosnetVal + qaVal;
    const selisihVal = totalVal - totalPengurang;

    // 4. Logika Keterangan Otomatis
    const satuan = isPaket ? "PKT" : "KRT";
    let statusKeterangan = "SESUAI";
    
    if (selisihVal > 0) {
        statusKeterangan = `STOK LEBIH ${selisihVal} ${satuan}`;
    } else if (selisihVal < 0) {
        statusKeterangan = `STOK KURANG ${Math.abs(selisihVal)} ${satuan}`;
    }

    // Bentuk objek data item terbaru
    const itemTerbaru = {
        ...item,
        beceran: beceranVal,
        utuhan: utuhanVal,
        total: totalVal,
        selisih: selisihVal,
        keterangan: statusKeterangan,
        detail_rak: {
            beceran_rak: rakBeceranVal,
            utuhan_rak: rakUtuhanVal,
            beceran_qty_teks: rawBeceranVal
        }
    };

    // --- PEMBARUAN INSTAN (UI & MEMORI LOKAL) SEBELUM FETCH SERVER ---
    dataHarian[kode] = itemTerbaru;
    window.currentStokData[keyStok] = { ...dataHarian };

    // Tutup modal dan langsung render tabel agar responsif seketika
    tutupModalRak();

    if (typeof renderTabelwh3 === 'function') {
        const modeAktif = document.querySelector('input[name="rb-mode-wh3"]:checked')?.value || "STOK WH-3";
        renderTabelwh3(dataHarian, modeAktif, keyStok);
    }

    if (typeof saveStokWH3ToIDB === 'function') {
        await saveStokWH3ToIDB(window.currentStokData);
    }

    miuiAlert("Data rak berhasil disimpan!");

    const urlUtama = `https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_wh3/stokwh3_${tanggal}/${kode}.json`;
    const urlDetailRak = `https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_wh3/stokwh3_${tanggal}/${kode}/detail_rak.json`;

    // 5. Kirim ke Firebase di latar belakang (Background Sync / Async Fetch)
    try {
        if (!navigator.onLine) {
            throw new Error("Offline");
        }

        // Kirim pembaruan utama
        const responseUtama = await fetch(urlUtama, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                beceran: beceranVal, 
                utuhan: utuhanVal, 
                total: totalVal, 
                selisih: selisihVal,
                keterangan: statusKeterangan
            })
        });

        if (!responseUtama.ok) throw new Error("Gagal memperbarui data utama rak.");

        // Simpan teks multi-qty ke `detail_rak`
        const responseRak = await fetch(urlDetailRak, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                beceran_rak: rakBeceranVal, 
                utuhan_rak: rakUtuhanVal,
                beceran_qty_teks: rawBeceranVal 
            })
        });

        if (!responseRak.ok) throw new Error("Gagal memperbarui detail rak.");

        console.log("Data berhasil disinkronkan ke server Firebase.");

    } catch (error) {
        console.warn("Koneksi terputus/offline saat menyimpan rak, memasukkan ke antrean background queue...", error.message);
        
        const payloadData = {
            beceran: beceranVal, 
            utuhan: utuhanVal, 
            total: totalVal, 
            selisih: selisihVal,
            keterangan: statusKeterangan,
            detail_rak: { 
                beceran_rak: rakBeceranVal, 
                utuhan_rak: rakUtuhanVal,
                beceran_qty_teks: rawBeceranVal 
            }
        };

        simpanKeAntreanOffline(urlUtama, 'PATCH', payloadData, `Simpan Rak Produk ${kode} (${tanggal})`);
    }
}

function tutupModalRak() {
    document.getElementById('modalInputRak').classList.add('hidden');
}

function bukaModalLihatRak(kode, event) {
    const popup = document.getElementById('popupLihatRak');
    const content = document.getElementById('popupContent');
    
    // 1. Reset status popup (tutup dulu tanpa animasi)
    popup.classList.remove('show');
    popup.classList.add('hidden');
    
    const dataHarian = window.currentStokData ? window.currentStokData[`stokwh3_${document.getElementById('select-tanggal-wh3')?.value.replace(/-/g, '')}`] : null;
    const item = dataHarian ? dataHarian[kode] : (window.dataStokTerkini ? window.dataStokTerkini[kode] : null);
    
    if (!item) return;

    // Fungsi pemformatan rak
    const formatRakV2 = (str) => {
        if (!str) return "";
        return str.replace(/(\d+)([A-Za-z]+)(\d+)/g, "$1 C $3");
    };

    const detail = item.detail_rak || {};
    
    // Format rak beceran
    const rawRakBeceran = detail.beceran_rak || "";
    const rakBeceranFormatted = rawRakBeceran ? rawRakBeceran.split('+').map(part => formatRakV2(part.trim())).join(' + ') : "-";
    
    // AMBIL QTY & BERIKAN SPASI PADA TANDA TAMBAH (+)
    const rawQtyBeceran = detail.beceran_qty_teks || item.beceran || "0";
    const qtyBeceran = String(rawQtyBeceran).replace(/\s*\+\s*/g, ' + ');
    
    // Format rak utuhan
    const rawUtuhan = detail.utuhan_rak || "";
    const utuhanFormatted = rawUtuhan ? rawUtuhan.split('+').map(part => formatRakV2(part.trim())).join(' + ') : "";
    const utuhanRak = utuhanFormatted ? ` + ${utuhanFormatted}` : "";
    
    // 2. Masukkan konten dengan format rapi
    content.innerHTML = `<div class="text-gray-800 font-bold text-[15px]">
        ${kode} = ${item.bosnet} | Rak: ${rakBeceranFormatted} = ${qtyBeceran}${utuhanRak}
    </div>`;

    // 3. Tampilkan popup dengan animasi
    popup.classList.remove('hidden');
    
    const rect = event.target.getBoundingClientRect();
    const popupWidth = popup.offsetWidth;

    popup.style.top = (rect.top + window.scrollY - popup.offsetHeight - 8) + "px";
    popup.style.left = (rect.left + window.scrollX - (popupWidth / 2) + 10) + "px";

    setTimeout(() => {
        popup.classList.add('show');
    }, 10);

    // 4. Event penutup popup
    document.onclick = (e) => {
        if (!popup.contains(e.target) && e.target !== event.target) {
            popup.classList.remove('show');
            setTimeout(() => {
                popup.classList.add('hidden');
            }, 200);
            document.onclick = null;
        }
    };
}

// ==========================================
// LOGIKA MODAL INPUT FISIK HP (STOK WH-3)
// ==========================================

let activeTipeHP = '';

// Fungsi Membuka Modal HP
function bukaModalInputHP() {
    const modal = document.getElementById('modalInputHP');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('hp-kode-barang').value = '';
        document.getElementById('hp-qty-beceran').value = '';
        document.getElementById('hp-rak-beceran').value = '';
        document.getElementById('hp-rak-utuhan').value = '';
        
        activeTipeHP = '';
        const detailContainer = document.getElementById('form-detail-container');
        if (detailContainer) detailContainer.style.display = 'none';
        
        document.getElementById('subform-beceran').style.display = 'none';
        document.getElementById('subform-utuhan').style.display = 'none';
        
        resetTombolTipeHP();
    }
}

// Fungsi Menutup Modal HP
function tutupModalInputHP() {
    const modal = document.getElementById('modalInputHP');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('hp-saran-container').style.display = 'none';
    }
}

// Reset Tampilan Tombol Jenis Input
function resetTombolTipeHP() {
    const btnB = document.getElementById('btn-tipe-beceran');
    const btnU = document.getElementById('btn-tipe-utuhan');
    
    if (btnB && btnU) {
        btnB.style.background = '#fff';
        btnB.style.color = '#f97316';
        btnB.style.borderColor = '#f97316';

        btnU.style.background = '#fff';
        btnU.style.color = '#555';
        btnU.style.borderColor = '#ccc';
    }
}

// Pilih Mode Input (Beceran / Utuhan)
function pilihModeInputHP(tipe) {
    activeTipeHP = tipe;
    const btnB = document.getElementById('btn-tipe-beceran');
    const btnU = document.getElementById('btn-tipe-utuhan');
    const detailContainer = document.getElementById('form-detail-container');
    const subBeceran = document.getElementById('subform-beceran');
    const subUtuhan = document.getElementById('subform-utuhan');

    if (detailContainer) detailContainer.style.display = 'flex';

    if (tipe === 'BECERAN') {
        // Tombol Beceran Aktif
        btnB.style.background = '#f97316';
        btnB.style.color = '#fff';
        btnB.style.borderColor = '#f97316';

        // Tombol Utuhan Tidak Aktif
        btnU.style.background = '#fff';
        btnU.style.color = '#4b5563';
        btnU.style.borderColor = '#9ca3af';

        subBeceran.style.display = 'flex';
        subUtuhan.style.display = 'none';
    } else {
        // Tombol Utuhan Aktif
        btnU.style.background = '#f97316';
        btnU.style.color = '#fff';
        btnU.style.borderColor = '#f97316';

        // Tombol Beceran Tidak Aktif (Diperbaiki jadi abu-abu bersih)
        btnB.style.background = '#fff';
        btnB.style.color = '#4b5563';
        btnB.style.borderColor = '#9ca3af';

        subUtuhan.style.display = 'flex';
        subBeceran.style.display = 'none';
    }
}

// Live Search / Autocomplete Kode dengan Nama Barang dari Sumber Data Lokal WH-3
function filterSaranKodeHP(keyword) {
    const container = document.getElementById('hp-saran-container');
    if (!container) return;

    if (!keyword || keyword.trim() === '') {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    // Ambil data stok global yang aktif
    const dataStok = window.dataStokTerkini || {};
    const listKode = Object.keys(dataStok);

    const kw = keyword.toLowerCase().trim();

    // Fungsi helper untuk pencocokan karakter berurutan (Subsequence Match)
    const isSubsequence = (query, target) => {
        let i = 0, j = 0;
        while (i < query.length && j < target.length) {
            if (query[i] === target[j]) {
                i++;
            }
            j++;
        }
        return i === query.length;
    };

    // Filter berdasarkan keyword
    const filtered = listKode.filter(kode => {
        const item = dataStok[kode] || {};
        
        // --- 1. REVISI FILTER: Sembunyikan HANYA jika sudah tuntas/sama dengan Bosnet (misal status selesai atau nilai sisa tertentu) ---
        // Jika properti menandakan sudah terpenuhi/selesai (sesuaikan dengan struktur data Anda, misal item.sudahSama atau item.sisa === 0 dan bukan data baru)
        // Jika Anda ingin barang dengan nilai 0 (seperti data baru upload yang belum dihitung) TETAP MUNCUL, 
        // kita pastikan kondisi filter <= 0 dihapus, atau diganti pengecekan status tuntas.
        
        // Contoh pengecekan jika item memiliki flag tuntas/selesai:
        // if (item.isSelesai === true || item.tuntas === 1) { return false; }

        const namaBarang = (item.nama || '').toLowerCase();
        const k = kode.toLowerCase();

        // Cocokkan apakah kodenya memenuhi pola subsequence atau nama barang mengandung keyword
        return isSubsequence(kw, k) || k.includes(kw) || namaBarang.includes(kw);
    });

    if (filtered.length === 0) {
        container.style.display = 'none';
        return;
    }

    // --- LOGIKA URUT DATA (SORTING) ---
    const polaUtama = ["CRR", "CRR EA", "THR EA", "THR", "MRMR", "MRR", "MJR HJ", "MJR", "MOB4A", "MOR2A EA", "MOR2A EB", "MOR2A", "MP", "PDR", "MTR3A", "PR-PKT", "PR-CUP", "MRSR", "LTGR", "MTGR", "MEB", "MOL", "MRL", "MTL", "ISEL"];
    
    const getSortScore = (kode) => {
        kode = kode.toUpperCase();
        for (let i = 0; i < polaUtama.length; i++) {
            if (kode.includes(polaUtama[i])) {
                if (polaUtama[i] === "MOR2A" && (kode.includes("MOR2A EA") || kode.includes("MOR2A EB"))) continue;
                if (polaUtama[i] === "THR" && kode.includes("THR EA")) continue;
                if (polaUtama[i] === "MJR" && kode.includes("MJR HJ")) continue;
                if (polaUtama[i] === "CRR" && kode.includes("CRR EA")) continue;
                return i + 1;
            }
        }
        return 999;
    };
    
    const getVarianScore = (kode) => {
        kode = kode.toUpperCase();
        if (kode.includes("ZC")) return 1;
        if (kode.includes("SSL")) return 2;
        if (kode.includes("SLO")) return 3;
        if (kode.includes("TDS")) return 4;
        if (kode.includes("BAG")) return 5;
        if (kode.includes("WRG")) return 6;
        if (kode.includes("GTG")) return 7;
        if (kode.includes("DRC")) return 8;
        return 0;
    };

    const getAngkaAkhir = (kode) => {
        const match = kode.match(/\d+/g);
        if (!match) return 999;
        return parseInt(match.join('').slice(-4)) || 999;
    };

    // Urutkan hasil filter sesuai standar pola gudang WH-3
    filtered.sort((a, b) => {
        const scoreA1 = getSortScore(a), scoreB1 = getSortScore(b);
        if (scoreA1 !== scoreB1) return scoreA1 - scoreB1;
        const scoreA2 = getVarianScore(a), scoreB2 = getVarianScore(b);
        if (scoreA2 !== scoreB2) return scoreA2 - scoreB2;
        return getAngkaAkhir(a) - getAngkaAkhir(b);
    });
    // ----------------------------------

    let html = '';
    filtered.slice(0, 20).forEach(kode => { // Batasi maksimal 20 saran teratas
        const item = dataStok[kode] || {};
        const namaBarang = item.nama ? ` - ${item.nama}` : '';
        
        html += `<div onclick="pilihKodeHP('${kode}')" style="padding:10px 12px; border-bottom:1px solid #eee; cursor:pointer; font-size:13px; color:#333;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='white'"><b>${kode}</b>${namaBarang}</div>`;
    });

    container.innerHTML = html;
    container.style.display = 'block';

    // Paksa geser ke atas agar kotak saran & input kode terlihat jelas di atas keyboard
    const inputKode = document.getElementById('hp-kode-barang');
    if (inputKode) {
        inputKode.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }   
}

// Saat Salah Satub Saran Kode Dipilih
function pilihKodeHP(kode) {
    const inputKode = document.getElementById('hp-kode-barang');
    if (inputKode) {
        inputKode.value = kode;
    }
    
    const container = document.getElementById('hp-saran-container');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
    
    // Perbarui informasi di sebelah label KODE BARANG
    updateInfoKodeTerpilihHP();
}

async function simpanDataFisikHP() {
    const kodeInputEl = document.getElementById('hp-kode-barang');
    const kode = kodeInputEl ? kodeInputEl.value.trim().toUpperCase() : "";
    
    if (!kode) {
        miuiAlert('Silakan pilih atau ketik kode barang terlebih dahulu!');
        return;
    }

    if (!activeTipeHP) {
        miuiAlert('Silakan pilih jenis input (Beceran atau Utuhan)!');
        return;
    }

    // Pastikan master barang sudah dimuat ke memori
    if (!window.masterData || Object.keys(window.masterData).length === 0) {
        if (typeof loadMasterBarang === 'function') {
            await loadMasterBarang();
        }
    }

    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value.replace(/-/g, '') : null;
    if (!tanggal) {
        miuiAlert('Tanggal aktif tidak ditemukan!');
        return;
    }

    // Ambil data harian saat ini untuk item tersebut
    if (!window.currentStokData) window.currentStokData = {};
    const keyStok = `stokwh3_${tanggal}`;
    if (!window.currentStokData[keyStok]) {
        window.currentStokData[keyStok] = {};
    }

    const dataHarian = window.currentStokData[keyStok];
    
    // CEK APAKAH ITEM SUDAH ADA. JIKA BELUM, BUAT STRUKTUR DATA BARU
    let item = dataHarian[kode];
    let isNewItem = false;

    if (!item) {
        isNewItem = true;
        item = {
            kode: kode,
            nama: (window.masterData && window.masterData[kode]) ? window.masterData[kode].NAMA : "STOK BOSNET TIDAK ADA / BARANG SUDAH HABIS",
            bosnet: 0,
            qa: 0,
            blok: 0,
            beceran: 0,
            utuhan: 0,
            total: 0,
            selisih: 0,
            keterangan: "STOK LEBIH",
            detail_rak: {
                beceran_rak: "",
                utuhan_rak: "",
                beceran_qty_teks: ""
            }
        };
    }

    const detailLama = item.detail_rak || {};
    
    // Variabel penampung nilai baru yang akan dikirim
    let finalBeceranVal = item.beceran || 0;
    let finalRawBeceran = detailLama.beceran_qty_teks || (item.beceran ? String(item.beceran) : "");
    let finalRakBeceran = detailLama.beceran_rak || "";

    let finalUtuhanVal = item.utuhan || 0;
    let finalRakUtuhan = detailLama.utuhan_rak || "";

    // 1. JIKA INPUT BERUPA BECERAN
    if (activeTipeHP === 'BECERAN') {
        const inputQtyBeceranStr = document.getElementById('hp-qty-beceran').value.trim();
        const inputRakBeceranStr = document.getElementById('hp-rak-beceran').value.trim().toUpperCase();

        if (!inputQtyBeceranStr) {
            miuiAlert('Qty beceran harus diisi!');
            return;
        }

        const nilaiBaru = parseFloat(inputQtyBeceranStr) || 0;

        // Gabungkan Qty Angka Murni untuk sistem
        finalBeceranVal = (parseInt(item.beceran) || 0) + nilaiBaru;

        // Gabungkan Teks Qty Tampilan
        if (finalRawBeceran && finalRawBeceran !== "0") {
            finalRawBeceran = `${finalRawBeceran} + ${inputQtyBeceranStr}`;
        } else {
            finalRawBeceran = inputQtyBeceranStr;
        }

        // Gabungkan String Rak Beceran
        if (inputRakBeceranStr) {
            if (finalRakBeceran) {
                finalRakBeceran = `${finalRakBeceran} + ${inputRakBeceranStr}`;
            } else {
                finalRakBeceran = inputRakBeceranStr;
            }
        }
    } 
    // 2. JIKA INPUT BERUPA UTUHAN
    else {
        const inputRakUtuhanStr = document.getElementById('hp-rak-utuhan').value.trim().toUpperCase();

        if (!inputRakUtuhanStr) {
            miuiAlert('Rak utuhan harus diisi!');
            return;
        }

        // Gabungkan String Rak Utuhan
        if (inputRakUtuhanStr) {
            if (finalRakUtuhan) {
                finalRakUtuhan = `${finalRakUtuhan} + ${inputRakUtuhanStr}`;
            } else {
                finalRakUtuhan = inputRakUtuhanStr;
            }
        }

        // Kalkulasi ulang nilai utuhan berdasarkan master data QTY per rak/karton
        const master = window.masterData ? window.masterData[kode] : null;
        const qtyPerRak = master ? parseInt(master.QTY) : 0;
        const isPaket = kode.includes("PR-PKT");

        if (isPaket) {
            const jumlahKarton = parseInt(finalRakUtuhan) || 0;
            finalUtuhanVal = jumlahKarton * (qtyPerRak > 0 ? qtyPerRak : 1);
        } else {
            const rakArray = finalRakUtuhan.split('+').filter(r => r.trim() !== "");
            finalUtuhanVal = rakArray.length * (qtyPerRak > 0 ? qtyPerRak : 1);
        }
    }

    // 3. Kalkulasi Total Keseluruhan & Selisih
    const blokVal = parseInt(item.blok) || 0;
    const bosnetVal = parseInt(item.bosnet) || 0; 
    const qaVal = parseInt(item.qa) || 0; 
    const isPaket = kode.includes("PR-PKT");

    const totalVal = (isPaket ? 0 : blokVal) + finalBeceranVal + finalUtuhanVal;
    const totalPengurang = bosnetVal + qaVal;
    const selisihVal = totalVal - totalPengurang; 

    // 4. Logika Keterangan Otomatis
    const satuan = isPaket ? "PKT" : "KRT";
    let statusKeterangan = "SESUAI";

    if (selisihVal > 0) {
        statusKeterangan = `STOK LEBIH ${selisihVal} ${satuan}`;
    } else if (selisihVal < 0) {
        statusKeterangan = `STOK KURANG ${Math.abs(selisihVal)} ${satuan}`;
    }

    // Bentuk objek data item yang diperbarui secara menyeluruh
    const itemTerbaru = {
        kode: kode,
        nama: item.nama,
        bosnet: bosnetVal,
        qa: qaVal,
        blok: blokVal,
        beceran: finalBeceranVal,
        utuhan: finalUtuhanVal,
        total: totalVal,
        selisih: selisihVal,
        keterangan: statusKeterangan,
        detail_rak: {
            beceran_rak: finalRakBeceran,
            utuhan_rak: finalRakUtuhan,
            beceran_qty_teks: finalRawBeceran
        }
    };

    // Langsung perbarui state global agar UI tabel langsung mendeteksi perubahan
    dataHarian[kode] = itemTerbaru;
    window.currentStokData[keyStok] = { ...dataHarian };

    const baseUrl = `https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_wh3/stokwh3_${tanggal}/${kode}`;

    // 5. Kirim ke Server / Firebase atau Antrean Offline
    try {
        if (!navigator.onLine) {
            throw new Error("Offline");
        }

        if (isNewItem) {
            const response = await fetch(`${baseUrl}.json`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(itemTerbaru)
            });
            if (!response.ok) throw new Error("Gagal menyimpan data barang baru ke server.");
            miuiAlert(`Info: Barang baru [ ${kode} ] ditambahkan ke stok sebagai temuan/lebih!`);
        } else {
            const responseUtama = await fetch(`${baseUrl}.json`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    beceran: finalBeceranVal,
                    utuhan: finalUtuhanVal,
                    total: totalVal,
                    selisih: selisihVal,
                    keterangan: statusKeterangan
                })
            });
            if (!responseUtama.ok) throw new Error("Gagal memperbarui data fisik HP utama.");

            const responseRak = await fetch(`${baseUrl}/detail_rak.json`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    beceran_rak: finalRakBeceran,
                    utuhan_rak: finalRakUtuhan,
                    beceran_qty_teks: finalRawBeceran
                })
            });
            if (!responseRak.ok) throw new Error("Gagal memperbarui detail rak HP.");
        }

    } catch (error) {
        console.warn("Koneksi terputus/offline, masuk antrean offline...", error.message);
        const methodType = isNewItem ? 'PUT' : 'PATCH';
        simpanKeAntreanOffline(`${baseUrl}.json`, methodType, itemTerbaru, `Simpan Fisik HP Produk ${kode} (${tanggal})`);
        miuiAlert("Koneksi terputus. Data fisik HP berhasil dimasukkan ke antrean offline.");
    }

    // --- EKSEKUSI PEMBARUAN ANTARMUKA (UI) SECARA INSTAN ---
    const inputKodeVal = kode ? kode : "";
    const inputQtyVal = activeTipeHP === 'BECERAN' ? (document.getElementById('hp-qty-beceran')?.value || "0") : "0";
    const inputRakVal = activeTipeHP === 'BECERAN' 
        ? (document.getElementById('hp-rak-beceran')?.value || "") 
        : (document.getElementById('hp-rak-utuhan')?.value || "");

    if (typeof updatePanelRiwayatHP === 'function') {
        updatePanelRiwayatHP(activeTipeHP, inputKodeVal, inputRakVal, inputQtyVal);    
    }

    // Kosongkan form input
    ['hp-qty-beceran', 'hp-rak-beceran', 'hp-rak-utuhan', 'hp-kode-barang'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    if (typeof updateInfoKodeTerpilihHP === 'function') {
        updateInfoKodeTerpilihHP();
    }

    const modalTitleEl = document.getElementById('hp-modal-title');
    if (modalTitleEl) {
        modalTitleEl.innerText = "INPUT FISIK GUDANG (MOBILE)";
    }

    // SIMPAN JUGA KE INDEXEDDB LOKAL AGAR CACHE KILAT IKUT TERUPDATE
    if (typeof saveStokWH3ToIDB === 'function' && window.currentStokData) {
        await saveStokWH3ToIDB(window.currentStokData);
    }

    // --- PERBAIKAN DI SINI: Panggil ulang render dengan parameter yang lengkap ---
    if (typeof renderTabelwh3 === 'function') {
        const modeAktif = document.querySelector('input[name="rb-mode-wh3"]:checked')?.value || "STOK WH-3";
        renderTabelwh3(dataHarian, modeAktif, keyStok);
        console.log("Tabel WH-3 berhasil diperbarui secara instan setelah simpan.");
    }
}

// Simpan riwayat sementara dalam array memori sesi
window.riwayatInputHPList = window.riwayatInputHPList || [];

// Fungsi untuk memperbarui panel multi-riwayat terakhir di modal HP
function updatePanelRiwayatHP(tipe, kode, rak, qty) {
    const elContainer = document.getElementById('container-multi-riwayat');
    if (!elContainer) return;

    // Buat objek data riwayat baru
    let teksDetail = "";
    if (tipe === 'BECERAN') {
        teksDetail = `<span style="color:#f97316; font-weight:bold;">[BECERAN]</span> <b>${kode}</b> &bull; Rak: ${rak || '-'} &bull; Qty: ${qty || 0}`;
    } else {
        teksDetail = `<span style="color:#f97316; font-weight:bold;">[UTUHAN]</span> <b>${kode}</b> &bull; Rak: ${rak || '-'}`;
    }

    // Masukkan ke array riwayat
    window.riwayatInputHPList.push(teksDetail);

    // Batasi maksimal hanya menyimpan 3 riwayat terakhir
    if (window.riwayatInputHPList.length > 3) {
        window.riwayatInputHPList.shift(); // Buang yang paling lama (di atas) jika lebih dari 3
    }

    // Render ulang ke HTML
    // Karena array tersimpan berurutan [terlama, ..., terbaru], maka urutannya sudah pas: 
    // Indeks 0 (terlama) di atas, indeks terakhir (terbaru) di bawah.
    elContainer.innerHTML = window.riwayatInputHPList.map((item, index) => {
        // Berikan sedikit perbedaan opacity/pudar ekstra khusus untuk item paling atas (terlama)
        const styleExtra = index === 0 ? 'opacity: 0.5;' : 'opacity: 1;';
        return `<div style="padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.05); ${styleExtra}">${item}</div>`;
    }).join('');

    // Otomatis gulir ke baris riwayat terbaru (paling bawah)
    elContainer.scrollTop = elContainer.scrollHeight;
}

// Fungsi untuk mereset form input pada modal HP tanpa menutup modalnya
function resetFormFisikHP() {
    const kodeInputEl = document.getElementById('hp-kode-barang');
    const inputQtyBeceran = document.getElementById('hp-qty-beceran');
    const inputRakBeceran = document.getElementById('hp-rak-beceran');
    const inputRakUtuhan = document.getElementById('hp-rak-utuhan');

    if (kodeInputEl) kodeInputEl.value = '';
    if (inputQtyBeceran) inputQtyBeceran.value = '';
    if (inputRakBeceran) inputRakBeceran.value = '';
    if (inputRakUtuhan) inputRakUtuhan.value = '';

    // Kembalikan juga judul modal ke awal
    const modalTitleEl = document.getElementById('hp-modal-title');
    if (modalTitleEl) {
        modalTitleEl.innerText = "INPUT FISIK GUDANG (MOBILE)";
    }

    // Kembalikan fokus ke input kode barang agar bisa langsung scan/ketik ulang
    if (kodeInputEl) {
        kodeInputEl.focus();
    }

    console.log("Form input fisik HP berhasil di-reset.");
}

// Fungsi untuk memperbarui informasi/label di sebelah "KODE BARANG"
function updateInfoKodeTerpilihHP() {
    const elInfo = document.getElementById('label-info-kode-terpilih');
    if (!elInfo) return;

    const kodeInputEl = document.getElementById('hp-kode-barang');
    const kode = kodeInputEl ? kodeInputEl.value.trim().toUpperCase() : "";

    if (!kode) {
        elInfo.innerText = "";
        return;
    }

    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value.replace(/-/g, '') : null;
    const dataHarian = window.currentStokData && tanggal ? window.currentStokData[`stokwh3_${tanggal}`] : null;

    // Cek apakah kode ada di data harian
    const item = dataHarian ? dataHarian[kode] : null;

    if (!item) {
        // Jika kode diketik setengah-setengah/belum pas di data, tampilkan kodenya saja
        elInfo.innerText = `[ ${kode} ]`;
        return;
    }

    // Jika kode sudah lengkap dan valid, hitung selisih dan satuannya
    const blok = parseInt(item.blok) || 0;
    const bosnet = parseInt(item.bosnet) || 0;
    const beceran = parseInt(item.beceran) || 0;
    const utuhan = parseInt(item.utuhan) || 0;
    
    let totalFisik = kode.includes("PR-PKT") ? (beceran + utuhan) : (blok + beceran + utuhan);
    const selisih = totalFisik - bosnet;
    const satuan = kode.includes("PR-PKT") ? "PKT" : "KRT";

    // Tampilkan format sesuai permintaan: [ KODE : SELISIH SATUAN ]
    elInfo.innerText = `STOK TERKINI =>  ${kode} : ${selisih} ${satuan}`;
}

// Buka Modal Admin (Universal untuk WH-2 & WH-3)
function bukaModalAdmin(param1, kode, bosnet, wms) {
    // Cek apakah ini panggilan dari Edit Database WH-3
    if (param1 === 'EDIT_DB_WH3') {
        window.tempAdminAction = {
            type: 'EDIT_DB_WH3',
            kode: kode
        };
    } else {
        // Jika bukan, berarti ini dari WH-2 (Adjust Stok)
        window.tempAdminAction = {
            type: 'ADJUST_WH2',
            data: { key: param1, kode: kode, bosnet: bosnet, wms: wms }
        };
    }

    // Reset inputan & buka modal admin
    document.getElementById('admin-userid').value = '';
    document.getElementById('admin-pass').value = '';
    document.getElementById('modal-admin-stok').classList.remove('hidden');
    document.getElementById('admin-userid').focus();
}

function tutupModalAdmin() {
    document.getElementById('modal-admin-stok').classList.add('hidden');
    document.getElementById('admin-userid').value = '';
    document.getElementById('admin-pass').value = '';
    window.tempAdminAction = null;
}

// Cek Password Universal
function cekAdmin() {
    const pass = document.getElementById('admin-pass').value;
    
    // Ganti 'admin' dengan password yang Anda inginkan
    if (pass === "admin") {
        document.getElementById('modal-admin-stok').classList.add('hidden');
        document.getElementById('admin-userid').value = '';
        document.getElementById('admin-pass').value = '';

        // Eksekusi berdasarkan aksi yang disimpan sebelumnya
        if (window.tempAdminAction) {
            const action = window.tempAdminAction;
            window.tempAdminAction = null; // Reset

            if (action.type === 'EDIT_DB_WH3') {
                // Lanjut buka modal Edit Database Firebase WH-3 (Gaya MIUI v5)
                bukaModalEditDatabaseWH3(action.kode);
            } else if (action.type === 'ADJUST_WH2') {
                // Lanjut buka modal adjust stok WH-2 lama Anda
                bukaModalAdjust(action.data);
            }
        }
    } else {
        miuiAlert("Password Salah! Anda tidak dizinkan mengakses menu ini!");
        document.getElementById('admin-pass').value = '';
        document.getElementById('admin-userid').value = '';
    }
}

// Buka Modal Adjust
function bukaModalAdjust(data) {
    document.getElementById('modal-adjust-stok').classList.remove('hidden');
    document.getElementById('adj-kode').value = data.kode;
    document.getElementById('adj-kode-display').value = data.kode;
    document.getElementById('adj-bosnet').value = data.bosnet;
    document.getElementById('adj-wms').value = data.wms;
}

function tutupModalAdjust() {
    document.getElementById('modal-adjust-stok').classList.add('hidden');
}

async function simpanAdjustStok() {
    const tanggal = document.getElementById('select-tanggal-wh2').value;
    const kode = document.getElementById('adj-kode').value;
    
    const bosnet = parseInt(document.getElementById('adj-bosnet').value) || 0;
    const wms = parseInt(document.getElementById('adj-wms').value) || 0;

    // Pastikan object hanya berisi 2 field ini
    const updateData = {
        stokwh2_sesudah: bosnet,
        stokwms_sesudah: wms
    };

    const url = `${DB_FIREBASE_URL}stok_wh2/stokwh2wms_${tanggal}/${kode}.json`;

    try {
        if (!navigator.onLine) {
            throw new Error("Offline");
        }

        const response = await fetch(url, {
            method: "PATCH", // PATCH sangat aman untuk update parsial
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) throw new Error("Gagal menyimpan");

        miuiAlert("Stok berhasil diupdate!");
        tutupModalAdjust();
        
        // Pastikan setelah loadStokData, tabel dirender ulang dengan data yang benar
        await loadStokData(); 
    } catch (e) {
        console.warn("Koneksi terputus/offline saat simpan adjust stok, memasukkan ke antrean background queue...", e.message);
        
        // Simpan ke antrean offline dengan method PATCH
        simpanKeAntreanOffline(url, 'PATCH', updateData, `Adjust Stok WH-2 Produk ${kode} (${tanggal})`);
        
        miuiAlert("Koneksi terputus. Perubahan adjust stok berhasil dimasukkan ke antrean offline dan akan disinkronkan otomatis saat online.");
        
        tutupModalAdjust();
        
        // Refresh lokal jika fungsi tersedia agar UI tetap responsif
        if (typeof loadStokData === 'function') {
            await loadStokData();
        }
    }
}

// Fungsi untuk membuka modal
function bukaModalEditKeterangan(kode, ketLama) {
    window.currentKode = kode; // Menyimpan kode yang sedang diedit
    const inputKet = document.getElementById('inputKeterangan');
    inputKet.value = ketLama === "-" ? "" : ketLama; // Jika "-" kosongkan agar tidak ikut tersimpan
    document.getElementById('modalEditKet').classList.remove('hidden');
}

async function simpanKeteranganManual() {
    const kode = window.currentKode;
    const ketBaru = document.getElementById('inputKeterangan').value.toUpperCase();
    const finalKet = ketBaru || "OK";
    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value.replace(/-/g, '') : null;

    if (!tanggal) return;

    const url = `https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_wh3/stokwh3_${tanggal}/${kode}.json`;
    const updateData = { keterangan: finalKet };

    // 1. UPDATE STATE LOKAL SEBELUM RENDER (PENTING AGAR UI LANGSUNG BERUBAH)
    if (!window.currentStokData) window.currentStokData = {};
    if (!window.currentStokData[`stokwh3_${tanggal}`]) {
        window.currentStokData[`stokwh3_${tanggal}`] = {};
    }
    const dataHarian = window.currentStokData[`stokwh3_${tanggal}`];
    
    if (dataHarian[kode]) {
        dataHarian[kode].keterangan = finalKet; // Perbarui data di memori lokal
    }

    try {
        if (!navigator.onLine) {
            throw new Error("Offline");
        }

        // Hanya update field keterangan saja ke Firebase
        const response = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) throw new Error("Gagal menyimpan keterangan ke server.");

        console.log("Keterangan berhasil diupdate ke server dan lokal.");
        document.getElementById('modalEditKet').classList.add('hidden');
        
        // Refresh tampilan tabel / rekap
        if (typeof renderTabelStokWH3 === 'function') {
            renderTabelStokWH3();
        } else if (typeof loadStokDatawh3 === 'function') {
            loadStokDatawh3(); 
        } 

    } catch (error) {
        console.warn("Koneksi terputus/offline saat menyimpan keterangan, memasukkan ke antrean background queue...", error.message);
        
        // Simpan ke antrean offline dengan method PATCH
        simpanKeAntreanOffline(url, 'PATCH', updateData, `Edit Keterangan Produk ${kode} (${tanggal})`);
        
        miuiAlert("Koneksi terputus. Perubahan keterangan disimpan secara lokal & dimasukkan ke antrean offline.");
        
        document.getElementById('modalEditKet').classList.add('hidden');
        
        // Refresh tampilan tabel secara lokal
        if (typeof renderTabelStokWH3 === 'function') {
            renderTabelStokWH3();
        } else if (typeof loadStokDatawh3 === 'function') {
            loadStokDatawh3();
        }
    }
}

function exportTabelKeExcel() {
    // 1. Ambil tabel berdasarkan ID (Sesuaikan ID tabel Anda)
    const table = document.getElementById('tabel-stok-wh2'); // Pastikan ID tabel Anda benar
    
    if (!table) {
        miuiAlert("Tabel tidak ditemukan!");
        return;
    }

    // 2. Konversi tabel HTML ke WorkBook SheetJS
    const wb = XLSX.utils.table_to_book(table, { sheet: "Laporan Stok" });

    // 3. Buat nama file berdasarkan tanggal
    const tgl = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
    const fileName = `STOKWH2_${tgl}.xlsx`;

    // 4. Trigger download
    XLSX.writeFile(wb, fileName);
}

async function exportTabelKeExcelWH3() {
    // --- 1. AMBIL TANGGAL AKTIF DARI SELECTOR ---
    const selectTanggal = document.getElementById('select-tanggal-wh3');
    if (!selectTanggal || !selectTanggal.value) {
        miuiAlert("Silakan pilih tanggal terlebih dahulu!");
        return;
    }

    const tglKey = selectTanggal.value; 
    let tglFormatted = tglKey;
    let titleDateString = tglKey;
    let mmFile = "";
    let ddFile = "";
    let namaHariFile = "";

    if (tglKey.length === 8) {
        const thn = tglKey.substring(0, 4);
        const bln = tglKey.substring(4, 6);
        const tgl = tglKey.substring(6, 8);
        
        tglFormatted = `${tgl}-${bln}-${thn}`;
        mmFile = bln;
        ddFile = tgl;

        const dateObj = new Date(`${thn}-${bln}-${tgl}`);
        const hariList = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const namaHariPilih = !isNaN(dateObj.getTime()) ? hariList[dateObj.getDay()] : '';

        namaHariFile = namaHariPilih;
        titleDateString = `${tgl}/${bln}/${thn} ${namaHariPilih}`;
    }

    // --- 2. AMBIL DATA LANGSUNG DARI FIREBASE ---
    try {
        const dbRef = firebase.database().ref(`stok_wh3/stokwh3_${tglKey}`);
        const snapshot = await dbRef.once('value');
        const dailyData = snapshot.val();

        if (!dailyData || Object.keys(dailyData).length === 0) {
            miuiAlert("Data stok untuk tanggal tersebut kosong di database!");
            return;
        }

        // --- 3. POLA SORTIR & FILTER DATA ---
        const polaUtama = ["CRR", "CRR EA", "THR EA", "THR", "MRMR", "MRR", "MJR HJ", "MJR", "MOB4A", "MOR2A EA", "MOR2A EB", "MOR2A", "MP", "PDR", "MTR3A", "PR-PKT", "PR-CUP", "MRSR", "LTGR", "MTGR", "MEB", "MOL", "MRL", "MTL", "ISEL"];
        
        const getSortScore = (kode) => {
            kode = kode.toUpperCase();
            for (let i = 0; i < polaUtama.length; i++) {
                if (kode.includes(polaUtama[i])) {
                    if (polaUtama[i] === "MOR2A" && (kode.includes("MOR2A EA") || kode.includes("MOR2A EB"))) continue;
                    if (polaUtama[i] === "THR" && kode.includes("THR EA")) continue;
                    if (polaUtama[i] === "MJR" && kode.includes("MJR HJ")) continue;
                    if (polaUtama[i] === "CRR" && kode.includes("CRR EA")) continue;
                    return i + 1;
                }
            }
            return 999;
        };
        
        const getAngkaAkhir = (kode) => {
            const match = kode.match(/\d+/g);
            return match ? parseInt(match.join('').slice(-4)) || 999 : 999;
        };

        const filteredEntries = Object.entries(dailyData).filter(([kode, item]) => {
            return item && (
                (item.total !== undefined && item.total !== "" && item.total !== null) ||
                (item.bosnet !== undefined && item.bosnet !== "" && item.bosnet !== null) ||
                (item.utuhan !== undefined && item.utuhan !== "" && item.utuhan !== null) ||
                (item.beceran !== undefined && item.beceran !== "" && item.beceran !== null) ||
                (item.selisih !== undefined && item.selisih !== "" && item.selisih !== null && item.selisih !== 0) ||
                (item.qa !== undefined && item.qa !== "" && item.qa !== null) ||
                (item.blok !== undefined && item.blok !== "" && item.blok !== null)
            );
        });

        if (filteredEntries.length === 0) {
            miuiAlert("Belum ada data stok yang lengkap untuk diexport!");
            return;
        }

        const sortedEntries = filteredEntries.sort((a, b) => {
            const sA = getSortScore(a[0]), sB = getSortScore(b[0]);
            if (sA !== sB) return sA - sB;
            return getAngkaAkhir(a[0]) - getAngkaAkhir(b[0]);
        });

        // --- FORMAT NAMA FILE ---
        const now = new Date();
        const jam = String(now.getHours()).padStart(2, '0');
        const menit = String(now.getMinutes()).padStart(2, '0');
        const detik = String(now.getSeconds()).padStart(2, '0');
        const waktuSimpan = `${jam}.${menit}.${detik}`;

        const namaFile = `STOCK WHNB-2 ${mmFile}-${ddFile} ${namaHariFile} ${waktuSimpan}.xls`;

        // --- 4. BANGUN STRUKTUR HTML EXCEL (.XLS) ---
        let titleText = `WH-3 BOSNET ${titleDateString}`.toUpperCase();

        let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <style>
                table { border-collapse: collapse; width: 100%; font-family: 'Century Gothic', Arial, sans-serif; font-size: 10pt; }
                th, td { border: 0.5pt solid windowtext; padding: 3px 5px; text-align: center; vertical-align: middle; white-space: nowrap; mso-number-format:"\\@"; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .text-left { text-align: left; }
                .text-nama { text-align: left; font-size: 4pt; } 
                .text-rak { text-align: left; font-size: 8pt; } 
                .title { font-size: 12pt; font-weight: bold; text-align: left; border: none; padding-bottom: 8px; white-space: nowrap; text-transform: uppercase;}
                
                .text-merah { color: #FF0000; font-weight: bold; }
                .text-hijau { color: #008000; font-weight: bold; }
                .row-total { background-color: #e6e6e6; font-weight: bold; }

                .col-no { width: 35px; }
                .col-kode { width: 110px; }
                .col-blok { width: 45px; }
                .col-nama { width: 100px; }
                .col-bosnet { width: 65px; }
                .col-pak { width: 50px; }
                .col-qty-bcr { width: 65px; }
                .col-rak-bcr { width: 100px; }
                .col-rak-uth { width: 120px; }
                .col-qty-uth { width: 65px; }
                .col-total { width: 65px; }
                .col-selisih { width: 65px; }
                .col-qa { width: 50px; }
            </style>
        </head>
        <body>
            <table>
                <colgroup>
                    <col class="col-no"><col class="col-kode"><col class="col-blok"><col class="col-nama">
                    <col class="col-bosnet"><col class="col-pak"><col class="col-qty-bcr"><col class="col-rak-bcr">
                    <col class="col-rak-uth"><col class="col-qty-uth"><col class="col-total"><col class="col-selisih"><col class="col-qa">
                </colgroup>
                <tr>
                    <td colspan="13" class="title">${titleText}</td>
                </tr>
                <tr>
                    <th>NO</th><th>KODE</th><th>BLOK</th><th>NAMA</th><th>BOSNET</th><th>PAK</th>
                    <th>BECERAN</th><th>RAK BECER</th><th>RAK UTUHAN</th><th>UTUHAN</th>
                    <th>TOTAL</th><th>SELISIH</th><th>QA</th>
                </tr>
        `;

        const formatNilai = (val) => {
            if (val === undefined || val === null || val === 0 || val === "0" || val === "- | -") return "";
            return val;
        };

        // Variabel penampung total bawah
        let grandTotalBlok = 0;
        let grandTotalBosnet = 0;
        let grandTotalBeceran = 0;
        let grandTotalUtuhan = 0;
        let grandTotalStok = 0;
        let grandTotalSelisih = 0;
        let grandTotalQa = 0;

        sortedEntries.forEach(([kode, item], index) => {
            let no = index + 1;
            
            let blok = formatNilai(item.blok);
            let nama = item.nama !== undefined ? item.nama : "";
            let bosnet = formatNilai(item.bosnet);
            let pak = (item.pak_format !== undefined && item.pak_format !== "- | -") ? item.pak_format : "";
            let qtyBeceran = formatNilai(item.beceran);
            let rakBeceran = item.detail_rak && item.detail_rak.beceran_rak ? item.detail_rak.beceran_rak : "";
            let rakUtuhan = item.detail_rak && item.detail_rak.utuhan_rak ? item.detail_rak.utuhan_rak : "";
            let qtyUtuhan = formatNilai(item.utuhan);
            let qaVal = formatNilai(item.qa);
            
            // --- PARSING NILAI KE ANGKA UNTUK PERHITUNGAN & AKUMULASI ---
            let blokNum = Number(blok) || 0;
            let bVal = Number(qtyBeceran) || 0;
            let uVal = Number(qtyUtuhan) || 0;
            let qVal = Number(qaVal) || 0;
            let bosnetNum = Number(bosnet) || 0;

            // Akumulasi ke Grand Total
            grandTotalBlok += blokNum;
            grandTotalBosnet += bosnetNum;
            grandTotalBeceran += bVal;
            grandTotalUtuhan += uVal;
            grandTotalQa += qVal;

            // --- RUMUS 1: TOTAL = Blok + Beceran + Utuhan ---
            let sumTotal = blokNum + bVal + uVal;
            let totalStok = sumTotal > 0 ? sumTotal : (formatNilai(item.total) !== "" ? Number(item.total) : "");
            let totalNum = Number(totalStok) || 0;
            grandTotalStok += totalNum;

            // --- RUMUS 2: SELISIH = Total - (Bosnet + QA) ---
            let selisihDisplay = "";
            let selisihHtmlClass = "";

            if (totalNum > 0 || bosnetNum > 0 || qVal > 0) {
                let calculatedSelisih = totalNum - (bosnetNum + qVal);
                selisihDisplay = calculatedSelisih !== 0 ? calculatedSelisih : "";
                grandTotalSelisih += calculatedSelisih;
                
                if (calculatedSelisih < 0) {
                    selisihHtmlClass = "text-merah"; 
                } else if (calculatedSelisih > 0) {
                    selisihHtmlClass = "text-hijau"; 
                }
            } else if (item.selisih !== undefined && item.selisih !== "" && item.selisih !== 0) {
                selisihDisplay = item.selisih;
                let sVal = Number(item.selisih) || 0;
                grandTotalSelisih += sVal;
                if (sVal < 0) selisihHtmlClass = "text-merah";
                else if (sVal > 0) selisihHtmlClass = "text-hijau";
            }

            html += `
                <tr>
                    <td>${no}</td>
                    <td class="text-left">${kode}</td>
                    <td>${blok}</td>
                    <td class="text-nama">${nama}</td>
                    <td>${bosnet}</td>
                    <td>${pak}</td>
                    <td>${qtyBeceran}</td>
                    <td class="text-rak">${rakBeceran}</td>
                    <td class="text-rak">${rakUtuhan}</td>
                    <td>${qtyUtuhan}</td>
                    <td>${totalStok !== "" ? totalStok : ""}</td>
                    <td class="${selisihHtmlClass}">${selisihDisplay}</td>
                    <td>${qaVal}</td>
                </tr>
            `;
        });

        // --- TAMBAHKAN BARIS TOTAL DI BAGIAN BAWAH ---
        html += `
            <tr class="row-total">
                <td colspan="2" style="text-align: right; font-weight: bold;">TOTAL</td>
                <td>${grandTotalBlok !== 0 ? grandTotalBlok : ""}</td>
                <td></td>
                <td>${grandTotalBosnet !== 0 ? grandTotalBosnet : ""}</td>
                <td></td>
                <td>${grandTotalBeceran !== 0 ? grandTotalBeceran : ""}</td>
                <td></td>
                <td></td>
                <td>${grandTotalUtuhan !== 0 ? grandTotalUtuhan : ""}</td>
                <td>${grandTotalStok !== 0 ? grandTotalStok : ""}</td>
                <td class="${grandTotalSelisih < 0 ? 'text-merah' : (grandTotalSelisih > 0 ? 'text-hijau' : '')}">${grandTotalSelisih !== 0 ? grandTotalSelisih : ""}</td>
                <td>${grandTotalQa !== 0 ? grandTotalQa : ""}</td>
            </tr>
        `;

        html += `</table></body></html>`;

        // --- 5. PROSES DOWNLOAD FILE .XLS ---
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = namaFile;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Gagal mengambil data Firebase:", error);
        miuiAlert("Terjadi kesalahan saat mengambil data dari database!");
    }
}



let isLebihInitialized = false;

window.initBarangLebih = async function() {
    console.log("Inisialisasi Barang Lebih dimulai...");

    // 1. Isi Dropdown Tanggal
    const tglSelect = document.getElementById('bl_tx_tanggal');
    if (tglSelect) {
        tglSelect.innerHTML = "";
        for (let i = 0; i <= 10; i++) {
            let d = new Date();
            d.setDate(d.getDate() - i);
            let dd = String(d.getDate()).padStart(2, '0');
            let mm = String(d.getMonth() + 1).padStart(2, '0');
            let yyyy = d.getFullYear();
            let val = `${yyyy}-${mm}-${dd}`;
            let text = `${dd}/${mm}/${yyyy}`;
            let opt = document.createElement("option");
            opt.value = val;
            opt.textContent = text;
            tglSelect.appendChild(opt);
        }
    }

    // 2. Panggil fungsi data master (hanya sekali, mendukung cache lokal)
    await window.bl_loadDropdownBarang();

    // Reset form
    if (typeof bl_resetForm === 'function') {
        bl_resetForm();
    }
};

/**
 * Fungsi Load Dropdown Khusus Barang Lebih dengan Cache Lokal & Fallback Offline
 * Menggunakan ID: 'bl_tx_kode'
 */
window.bl_loadDropdownBarang = async function() {
    const select = document.getElementById('bl_tx_kode');
    if (!select) return;

    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
    const CACHE_KEY = "cache_master_barang_bl";

    // Helper untuk render data ke elemen select
    const renderDropdown = (dataBarang) => {
        window.dataMasterBarang = dataBarang;
        let listBarang = Object.keys(dataBarang).map(key => ({
            key: key,
            ...dataBarang[key]
        }));

        listBarang.sort((a, b) => {
            const inisialA = (a.INISIAL || "").toString();
            const inisialB = (b.INISIAL || "").toString();
            return inisialA.localeCompare(inisialB, undefined, { numeric: true, sensitivity: 'base' });
        });

        select.innerHTML = '<option value="">Pilih Barang...</option>';
        listBarang.forEach(item => {
            let opt = document.createElement("option");
            opt.value = item.KODE_BARANG || item.key;
            opt.textContent = `${item.KODE_BARANG || "-"} | ${item.NAMA_BARANG || item.key}`;
            select.appendChild(opt);
        });
    };

    try {
        select.innerHTML = '<option value="">Memuat data...</option>';
        const response = await fetch(`${FIREBASE_URL}master_barang.json`);
        const dataBarang = await response.json();

        if (!dataBarang) {
            select.innerHTML = '<option value="">Data Kosong</option>';
            return;
        }

        // PANGGIL DI SINI UNTUK MONITORING UKURAN DOWNLOAD DI WIDGET
        if (typeof updateWidgetDownloadSize === 'function') {
            updateWidgetDownloadSize(allData);
        }

        // Simpan ke Cache Lokal (localStorage) agar bisa diakses saat offline
        localStorage.setItem(CACHE_KEY, JSON.stringify(dataBarang));
        renderDropdown(dataBarang);

    } catch (e) {
        console.warn("Koneksi gagal, mencoba memuat dari cache lokal...", e);
        const cachedData = localStorage.getItem(CACHE_KEY);
        
        if (cachedData) {
            try {
                const dataBarang = JSON.parse(cachedData);
                renderDropdown(dataBarang);
                console.log("Berhasil memuat data master dari cache lokal.");
                return;
            } catch (parseErr) {
                console.error("Gagal parsing cache:", parseErr);
            }
        }

        select.innerHTML = '<option value="">Gagal Memuat (Offline)</option>';
    }
};

/**
 * Fungsi Populate Kode Barang untuk Transaksi KELUAR (Khusus Barang Lebih)
 * Membaca dari path: stok_lebih dengan dukungan cache lokal
 */
window.bl_populateKodeBarangOut = async function() {
    const dropdown = document.getElementById('bl_tx_kode'); 
    if (!dropdown) return;

    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
    const CACHE_KEY = "cache_stok_lebih_out";

    const renderStokOut = (stokData) => {
        dropdown.innerHTML = '<option value="">Pilih Barang...</option>';
        const master = window.dataMasterBarang || {};
        
        let listBarang = Object.entries(stokData).map(([kode, dataStok]) => {
            const totalQty = parseInt(dataStok.qty) || 0;
            const infoBarang = master[kode] || { INISIAL: kode };
            
            return {
                kode: kode,
                inisial: infoBarang.INISIAL || kode,
                totalQty: totalQty
            };
        }).filter(item => item.totalQty > 0);

        if (listBarang.length === 0) {
            dropdown.innerHTML = '<option value="">Stok Kosong</option>';
            return;
        }

        listBarang.sort((a, b) => a.inisial.localeCompare(b.inisial));
        
        listBarang.forEach(item => {
            let opt = document.createElement("option");
            opt.value = item.kode;
            opt.textContent = `${item.kode} (Qty: ${item.totalQty})`;
            dropdown.appendChild(opt);
        });
        
        setupAutofillExpired_bl();
    };

    try {
        const response = await fetch(`${FIREBASE_URL}stok_lebih.json`);
        const stokData = await response.json();

        if (stokData) {
            localStorage.setItem(CACHE_KEY, JSON.stringify(stokData));
            renderStokOut(stokData);
        } else {
            dropdown.innerHTML = '<option value="">Data tidak ditemukan</option>';
        }
    } catch (error) {
        console.warn("Gagal fetch stok_lebih, mencoba menggunakan cache...", error);
        const cachedStok = localStorage.getItem(CACHE_KEY);

        if (cachedStok) {
            try {
                const stokData = JSON.parse(cachedStok);
                renderStokOut(stokData);
                console.log("Berhasil memuat stok_lebih dari cache lokal.");
                return;
            } catch (parseErr) {
                console.error("Gagal parsing cache stok:", parseErr);
            }
        }

        dropdown.innerHTML = '<option value="">Error Load (Offline)</option>';
    }
};

// Fungsi untuk memuat data stok dan meng-autofill input expired dengan penanganan offline
async function setupAutofillExpired_bl() {
    const selectKode = document.getElementById('bl_tx_kode'); 
    const inputExpired = document.getElementById('bl_tx_expired'); 

    if (!selectKode || !inputExpired) return;

    selectKode.addEventListener('change', async () => {
        const selectedKode = selectKode.value;
        if (!selectedKode) return;

        const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
        const CACHE_DETAIL_KEY = `cache_detail_stok_${selectedKode}`;
        
        try {
            const response = await fetch(`${FIREBASE_URL}stok_lebih/${selectedKode}.json`);
            const data = await response.json();

            if (data && data.exp_baru) {
                localStorage.setItem(CACHE_DETAIL_KEY, JSON.stringify(data));
                inputExpired.value = data.exp_baru;
            } else {
                inputExpired.value = "-"; 
            }
        } catch (e) {
            console.warn("Gagal fetch detail expired, mencoba cache lokal...", e);
            const cachedDetail = localStorage.getItem(CACHE_DETAIL_KEY);
            if (cachedDetail) {
                try {
                    const data = JSON.parse(cachedDetail);
                    inputExpired.value = data.exp_baru || "-";
                    return;
                } catch (err) {
                    console.error("Gagal parse cache detail:", err);
                }
            }
            inputExpired.value = "-";
        }
    });
}

// --- Fungsi Switch UI (Hijau/Rose) Khusus Barang Lebih ---
window.toggleEngineTransaksi_bl = function(isOut) {
    const boxWorkspace = document.getElementById('box-workspace-bl-input');
    const titleSide = document.getElementById('bl_title_transaksi_side');
    const lblSwitch = document.getElementById('bl_lbl_status_switch');
    const btnSimpanbl = document.getElementById('bl_btn_simpan');
    
    // --- PEMBERSIHAN EVENT LISTENER ---
    const select = document.getElementById('bl_tx_kode');
    if (select) {
        const newSelect = select.cloneNode(true);
        select.parentNode.replaceChild(newSelect, select);
    }
    const freshSelect = document.getElementById('bl_tx_kode');
    freshSelect.innerHTML = '<option value="">Memuat data...</option>';

    // --- LOGIC UI & STYLE ---
    if (isOut) {
        // MODE KELUAR
        boxWorkspace.className = "col-span-7 bg-rose-200/60 rounded-xl border border-[#dcdcdc] shadow-sm overflow-hidden flex flex-col transition-colors duration-200";
        if(titleSide) {
            titleSide.innerText = "Input Barang Lebih Keluar";
            titleSide.className = "text-[15px] font-bold text-rose-700 uppercase";
        }
        if(lblSwitch) {
            lblSwitch.innerText = "KELUAR";
            lblSwitch.className = "text-[12px] font-bold text-rose-600 bg-rose-100/80 px-1.5 py-0.5 rounded uppercase tracking-wider";
        }
        btnSimpanbl.className = "flex-1 py-1.5 bg-gradient-to-b from-[#f43f5e] to-[#e11d48] text-white font-bold text-[15px] rounded-lg shadow-md border border-rose-600 tracking-wide text-center uppercase transition-colors";
        btnSimpanbl.innerText = "SIMPAN OUT";

        window.bl_populateKodeBarangOut();

    } else {
        // MODE MASUK
        boxWorkspace.className = "col-span-7 bg-emerald-200/60 rounded-xl border border-[#dcdcdc] shadow-sm overflow-hidden flex flex-col transition-colors duration-200";
        if(titleSide) {
            titleSide.innerText = "Input Barang Lebih Terbaru";
            titleSide.className = "text-[15px] font-bold text-emerald-700 uppercase";
        }
        if(lblSwitch) {
            lblSwitch.innerText = "MASUK";
            lblSwitch.className = "text-[12px] font-bold text-emerald-600 bg-emerald-100/80 px-1.5 py-0.5 rounded uppercase tracking-wider";
        }
        btnSimpanbl.className = "flex-1 py-1.5 bg-gradient-to-b from-[#10b981] to-[#059669] text-white font-bold text-[15px] rounded-lg shadow-md border border-emerald-600 tracking-wide text-center uppercase transition-colors";
        btnSimpanbl.innerText = "SIMPAN IN";

        if (typeof window.bl_loadDropdownBarang === 'function') {
            window.bl_loadDropdownBarang();
        }
    }
};

// --- FUNGSI RESET FORM KHUSUS BARANG LEBIH ---
window.bl_resetForm = function() {
    // Reset Tanggal ke hari ini
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bl_tx_tanggal').value = today;
    
    // Reset Dropdown Barang
    const selectKode = document.getElementById('bl_tx_kode');
    if (selectKode) selectKode.selectedIndex = 0;
    
    // Reset Input Qty dan Expired
    document.getElementById('bl_tx_qty').value = '';
    document.getElementById('bl_tx_expired').value = '';
    
    console.log("Form Barang Lebih telah di-reset.");
};

// --- Fungsi Pemformatan Expired (Auto JAN-27) ---
const elExpired = document.getElementById('bl_tx_expired');

if (elExpired) {
    elExpired.addEventListener('blur', function(e) {
        let val = e.target.value.trim();
        const months = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGT", "SEP", "OKT", "NOV", "DES"];
        
        // Regex untuk memisahkan MM dan YY
        const match = val.match(/^(\d{1,2})[-/](\d{2})$/);
        
        if (match) {
            const monthIndex = parseInt(match[1]) - 1;
            const year = match[2];
            
            if (monthIndex >= 0 && monthIndex < 12) {
                e.target.value = `${months[monthIndex]}-${year}`;
            }
        }
    });
} else {
    console.log("Elemen 'bl_tx_expired' belum dimuat di DOM.");
}

window.updateStokLebih_bl = async function(data) {
    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
    const path = `${FIREBASE_URL}stok_lebih/${data.kode}.json`;
    const CACHE_KEY = `cache_stok_lebih_detail_${data.kode}`;

    try {
        const response = await fetch(path);
        let currentData = await response.json() || { qty: 0, exp_baru: "-", exp_lama: "-" };

        let updatePayload = {
            last_updated: new Date().toISOString()
        };

        if (data.tipe === 'IN') {
            if (data.expired === currentData.exp_baru) {
                updatePayload.qty = (parseInt(currentData.qty) || 0) + parseInt(data.qty);
                updatePayload.exp_lama = currentData.exp_lama;
                updatePayload.exp_baru = currentData.exp_baru;
            } else {
                updatePayload.qty = parseInt(data.qty);
                updatePayload.exp_lama = currentData.exp_baru || "-";
                updatePayload.exp_baru = data.expired;
            }
        } else {
            updatePayload.qty = Math.max(0, (parseInt(currentData.qty) || 0) - parseInt(data.qty));
            updatePayload.exp_lama = currentData.exp_lama;
            updatePayload.exp_baru = currentData.exp_baru;
        }

        await fetch(path, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
        });
        
        // Simpan cache lokal setelah sukses update ke server
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ...currentData, ...updatePayload }));
        console.log("Stok berhasil diperbarui dengan logika rolling:", updatePayload);
    } catch (e) {
        console.warn("Gagal update stok online, menyimpan ke antrean offline...", e);
        
        // Fallback simpan lokal / mekanisme offline jika gagal
        const offlineQueueKey = "offline_queue_stok_lebih";
        let queue = JSON.parse(localStorage.getItem(offlineQueueKey) || "ju");
        // Jika struktur atau format antrean dibutuhkan, bisa disesuaikan dengan handler sync background aplikasi Anda
    }
};

/**
 * Fungsi Simpan Transaksi Barang Lebih
 * Menggunakan ID Unik: kode_tanggal_timestamp untuk sinkronisasi data yang presisi
 */
async function simpanTransaksi_bl() {
    const btnSimpan = document.getElementById('bl_btn_simpan');
    const isModeOut = btnSimpan.innerText.includes("OUT");
    
    const kode = document.getElementById('bl_tx_kode').value;
    const qtyInput = document.getElementById('bl_tx_qty').value;
    const expired = document.getElementById('bl_tx_expired').value;
    const tanggal = document.getElementById('bl_tx_tanggal').value;

    // Validasi dasar
    if (!kode || !qtyInput || parseInt(qtyInput) <= 0) {
        miuiAlert("Harap lengkapi kode barang dan jumlah (QTY)!", "error");
        return;
    }

    // Membuat ID Unik: kode_tanggal_timestamp
    const timestamp = new Date().getTime();
    const idUnik = `${kode}_${tanggal}_${timestamp}`;

    const data = {
        tanggal: tanggal,
        tipe: isModeOut ? 'OUT' : 'IN',
        kode: kode,
        qty: parseInt(qtyInput),
        expired: expired
    };

    try {
        const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
        
        // 1. Simpan ke Riwayat menggunakan PUT dengan ID Unik
        await fetch(`${FIREBASE_URL}log_barang_lebih/${idUnik}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        // 2. Update stok di folder stok_lebih
        await updateStokLebih_bl(data);
        
        // 3. Update UI
        await window.bl_renderRiwayat();
        await window.renderTabelBarangLebih();
        miuiAlert("Data transaksi berhasil disimpan!", "success");
        
        // Reset form & Refresh rekap
        if (typeof bl_resetForm === 'function') bl_resetForm();
        if (typeof bl_renderRekap === 'function') bl_renderRekap();
        
    } catch (e) {
        console.warn("Gagal menyimpan online, memasukkan ke antrean offline...", e);
        
        // Simpan transaksi ke LocalStorage (Offline Queue)
        const OFFLINE_TRANS_KEY = "offline_log_barang_lebih";
        let offlineList = JSON.parse(localStorage.getItem(OFFLINE_TRANS_KEY) || "[]");
        offlineList.push({ idUnik, data });
        localStorage.setItem(OFFLINE_TRANS_KEY, JSON.stringify(offlineList));

        miuiAlert("Koneksi terputus. Transaksi disimpan secara lokal dan akan disinkronkan saat online.", "warning");
        
        if (typeof bl_resetForm === 'function') bl_resetForm();
    }
}

// Nama fungsi menggunakan prefix bl_ agar unik dengan dukungan cache lokal
window.bl_renderRiwayat = async function() {
    const tableBody = document.getElementById('bl_table_riwayat'); 
    if (!tableBody) return;

    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
    const CACHE_KEY = "cache_log_barang_lebih";

    const renderRiwayatHTML = (data) => {
        const riwayatArray = Object.entries(data).map(([id, val]) => ({
            id: id,
            ...val
        }));

        riwayatArray.sort((a, b) => {
            const getTimestamp = (id) => {
                const parts = id.split('_');
                return parseInt(parts[parts.length - 1]);
            };
            return getTimestamp(b.id) - getTimestamp(a.id);
        });

        tableBody.innerHTML = riwayatArray.map(item => {
            const isOut = item.tipe?.trim().toUpperCase() === "OUT";
            let tglDisplay = item.tanggal || '-';
            if (tglDisplay.includes('-') && tglDisplay.split('-')[0].length === 4) {
                const parts = tglDisplay.split('-');
                tglDisplay = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            
            return `
                <tr class="hover:bg-slate-50 border-b border-slate-50 text-center">
                    <td class="py-1 px-2 text-slate-400 text-[12px] truncate">${tglDisplay}</td>
                    <td class="py-1 px-1">
                        <span class="${isOut ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'} text-[12px] px-1.5 rounded font-bold uppercase">
                            ${item.tipe || '-'}
                        </span>
                    </td>
                    <td class="py-1 px-1 font-bold text-slate-900 text-[12px]">${item.kode || '-'}</td>
                    <td class="py-1 px-1 text-[12px]">${item.qty || 0}</td>
                    <td class="py-1 px-1 text-slate-800 text-[12px]">${item.expired || '-'}</td>
                </tr>
            `;
        }).join('');
    };

    try {
        const response = await fetch(`${FIREBASE_URL}log_barang_lebih.json`);
        const data = await response.json();
        
        if (!data || Object.keys(data).length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-slate-400 text-[12px]">Belum ada transaksi</td></tr>`;
            return;
        }

        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        renderRiwayatHTML(data);
        
    } catch (e) {
        console.warn("Gagal memuat riwayat online, memuat dari cache lokal...", e);
        const cachedData = localStorage.getItem(CACHE_KEY);
        
        if (cachedData) {
            try {
                const data = JSON.parse(cachedData);
                renderRiwayatHTML(data);
                return;
            } catch (err) {
                console.error("Gagal parse cache riwayat:", err);
            }
        }

        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500 text-[12px]">Gagal memuat data (Offline)</td></tr>`;
    }
};

/**
 * Fungsi untuk mengambil data dari Firebase dan merender ke tabel dengan dukungan cache
 */
window.renderTabelBarangLebih = async function() {
    console.log("Memuat rekap barang lebih...");
    const tbody = document.getElementById('bl_table_rekap');
    if (!tbody) return;
    
    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
    const CACHE_KEY = "cache_rekap_stok_lebih";

    const renderRekapHTML = (data) => {
        tbody.innerHTML = ''; 
        const listBarang = Object.entries(data).map(([kode, val]) => ({
            kode,
            ...val
        })).filter(item => parseInt(item.qty) > 0);

        if (listBarang.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-slate-400 text-[15px]">Stok kosong</td></tr>`;
            return;
        }

        tbody.innerHTML = listBarang.map((item, index) => {
            return `
                <tr class="hover:bg-slate-50 border-b border-slate-50 text-[15px]">
                    <td class="py-2 px-2 text-center text-slate-500">${index + 1}</td>
                    <td class="py-2 px-2 font-bold text-slate-900">${item.kode}</td>
                    <td class="py-2 px-2 text-center font-bold text-blue-600">${item.qty}</td>
                    <td class="py-2 px-2 text-center text-slate-500">${item.exp_lama || '-'}</td>
                    <td class="py-2 px-2 text-center font-medium text-emerald-600">${item.exp_baru || '-'}</td>
                </tr>
            `;
        }).join('');
    };

    try {
        const response = await fetch(`${FIREBASE_URL}stok_lebih.json`);
        const data = await response.json();

        if (!data || Object.keys(data).length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-slate-400 text-[15px]">Belum ada data stok barang lebih</td></tr>`;
            return;
        }

        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        renderRekapHTML(data);
        console.log("Tabel barang lebih berhasil diperbarui.");

    } catch (e) {
        console.warn("Gagal memuat rekap online, menggunakan cache lokal...", e);
        const cachedData = localStorage.getItem(CACHE_KEY);

        if (cachedData) {
            try {
                const data = JSON.parse(cachedData);
                renderRekapHTML(data);
                return;
            } catch (err) {
                console.error("Gagal parse cache rekap:", err);
            }
        }

        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500 text-[15px]">Gagal memuat data (Offline)</td></tr>`;
    }
};

let videoStreamHP = null;
let targetScanField = null;
let scanIntervalHP = null;
let isProcessingScan = false;

window.bukaScannerQRHP = async function(jenis) {
    targetScanField = jenis;
    isProcessingScan = false;
    
    const modalScanner = document.getElementById('modalScannerQR');
    if (modalScanner) modalScanner.style.display = 'flex';

    if (!('BarcodeDetector' in window)) {
        alert("Maaf, pemindai tidak didukung di browser ini.");
        window.tutupScannerQRHP();
        return;
    }

    let container = document.getElementById('reader-qr-hp');
    if (!container) return;
    
    container.innerHTML = '<video id="live-scanner-video" autoplay playsinline style="width:100%; height:260px; object-fit:cover;"></video>';
    let videoElement = document.getElementById('live-scanner-video');

    try {
        videoStreamHP = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });
        videoElement.srcObject = videoStreamHP;

        // Tunggu video siap sampai memiliki dimensi asli
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                resolve();
            };
        });

        const barcodeDetector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });

        // Buat canvas tersembunyi untuk cropping area bidikan
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        // Interval diperlambat menjadi 900ms agar lebih stabil dan tenang saat digeser
        scanIntervalHP = setInterval(async () => {
            if (isProcessingScan) return;

            if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                try {
                    // Ambil dimensi video
                    const videoWidth = videoElement.videoWidth;
                    const videoHeight = videoElement.videoHeight;

                    // Definisikan area crop (fokus hanya ke bagian tengah kotak bidikan)
                    // Mengambil area kotak di tengah sebesar 50% dari lebar/tinggi video
                    const cropSize = Math.min(videoWidth, videoHeight) * 0.55;
                    const startX = (videoWidth - cropSize) / 2;
                    const startY = (videoHeight - cropSize) / 2;

                    canvas.width = cropSize;
                    canvas.height = cropSize;

                    // Gambar hanya bagian tengah video ke canvas
                    context.drawImage(videoElement, startX, startY, cropSize, cropSize, 0, 0, cropSize, cropSize);

                    // Deteksi barcode HANYA dari area canvas yang terpotong di tengah
                    const barcodes = await barcodeDetector.detect(canvas);
                    
                    if (barcodes.length > 0) {
                        const hasilScan = barcodes[0].rawValue.trim().toUpperCase();
                        
                        isProcessingScan = true;

                        if (targetScanField === 'beceran') {
                            const el = document.getElementById('hp-rak-beceran');
                            if (el) el.value = hasilScan;
                        } else if (targetScanField === 'utuhan') {
                            const el = document.getElementById('hp-rak-utuhan');
                            if (el) el.value = hasilScan;
                        }

                        setTimeout(() => {
                            window.tutupScannerQRHP();
                        }, 600);
                    }
                } catch (err) {
                    // Abaikan error per frame
                }
            }
        }, 900);

    } catch (err) {
        console.error("Gagal membuka kamera:", err);
        miuiAlert("Gagal membuka kamera perangkat. Pastikan izin kamera diaktifkan.");
        window.tutupScannerQRHP();
    }
};

window.tutupScannerQRHP = function() {
    if (scanIntervalHP) {
        clearInterval(scanIntervalHP);
        scanIntervalHP = null;
    }

    if (videoStreamHP) {
        videoStreamHP.getTracks().forEach(track => track.stop());
        videoStreamHP = null;
    }

    const modalScanner = document.getElementById('modalScannerQR');
    if (modalScanner) modalScanner.style.display = 'none';
};




// Pastikan fungsi ini dipanggil saat tombol buka modal diklik
function bukaModalTukarFisikWH3() {
    console.log("Membuka modal tukar fisik WH-3...");
    const modal = document.getElementById('modal-tukar-fisik-wh3');
    if (modal) {
        modal.classList.remove('hidden');
        
        // Panggil fungsi data panel
        if (typeof muatDataPanelTukarFisik === 'function') {
            muatDataPanelTukarFisik();
        }
        
        // PANGGIL RENDER TABEL RIWAYAT DI SINI
        if (typeof renderTabelRiwayatTukar === 'function') {
            renderTabelRiwayatTukar();
        } else {
            console.error("Fungsi renderTabelRiwayatTukar tidak ditemukan!");
        }
    } else {
        console.error("Elemen modal-tukar-fisik-wh3 tidak ditemukan di HTML!");
    }
}

// Fungsi Menutup Modal
function tutupModalTukarFisikWH3() {
    const modal = document.getElementById('modal-tukar-fisik-wh3');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Fungsi Memetakan Data ke Panel Stok Lebih (+) & Stok Kurang (-) Berdasarkan Tanggal Aktif (Terurut & Terintegrasi QA)
function muatDataPanelTukarFisik() {
    const containerPlus = document.getElementById('container-list-plus');
    const containerMinus = document.getElementById('container-list-minus');
    const selectAsalPlus = document.getElementById('select-asal-plus');
    const selectTujuanMinus = document.getElementById('select-tujuan-minus');

    if (!containerPlus || !containerMinus) return;

    containerPlus.innerHTML = '';
    containerMinus.innerHTML = '';
    if (selectAsalPlus) selectAsalPlus.innerHTML = '<option value="">-- Pilih Stok Lebih (+) --</option>';
    if (selectTujuanMinus) selectTujuanMinus.innerHTML = '<option value="">-- Pilih Target Kurang (-) --</option>';

    // Ambil tanggal aktif dari input tanggal WH-3 (format YYYY-MM-DD diubah ke YYYYMMDD)
    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggalAktif = dateInput ? dateInput.value.replace(/-/g, '') : null;

    if (!tanggalAktif) {
        console.warn("Tanggal aktif WH-3 tidak ditemukan.");
        return;
    }

    let countPlus = 0;
    let countMinus = 0;
    let totalQtyPlus = 0;   // Variabel akumulasi total Qty Plus
    let totalQtyMinus = 0;  // Variabel akumulasi total Qty Minus

    let optionsPlusHTML = '<option value="">-- Pilih Stok Lebih (+) --</option>';
    let optionsTujuanHTML = '<option value="">-- Pilih Target Kurang (-) --</option>';

    // --- LOGIKA SORTIR SESUAI TABEL UTAMA STOK WH-3 ---
    const polaUtama = ["CRR", "CRR EA", "THR EA", "THR", "MRMR", "MRR", "MJR HJ", "MJR", "MOB4A", "MOR2A EA", "MOR2A EB", "MOR2A", "MP", "PDR", "MTR3A", "PR-PKT", "PR-CUP", "MRSR", "LTGR", "MTGR", "MEB", "MOL", "MRL", "MTL", "ISEL"];
    
    const getSortScore = (kode) => {
        kode = kode.toUpperCase();
        for (let i = 0; i < polaUtama.length; i++) {
            if (kode.includes(polaUtama[i])) {
                if (polaUtama[i] === "MOR2A" && (kode.includes("MOR2A EA") || kode.includes("MOR2A EB"))) continue;
                if (polaUtama[i] === "THR" && kode.includes("THR EA")) continue;
                if (polaUtama[i] === "MJR" && kode.includes("MJR HJ")) continue;
                if (polaUtama[i] === "CRR" && kode.includes("CRR EA")) continue;
                return i + 1;
            }
        }
        return 999;
    };
    
    const getVarianScore = (kode) => {
        kode = kode.toUpperCase();
        if (kode.includes("ZC")) return 1;
        if (kode.includes("SSL")) return 2;
        if (kode.includes("SLO")) return 3;
        if (kode.includes("TDS")) return 4;
        if (kode.includes("BAG")) return 5;
        if (kode.includes("WRG")) return 6;
        if (kode.includes("GTG")) return 7;
        if (kode.includes("DRC")) return 8;
        return 0;
    };

    const getAngkaAkhir = (kode) => {
        const match = kode.match(/\d+/g);
        if (!match) return 999;
        return parseInt(match.join('').slice(-4)) || 999;
    };

    // Akses data stok terkini yang tersimpan di window atau dari variabel global
    if (typeof window.currentStokData !== 'undefined' && window.currentStokData !== null) {
        // Cari key yang sesuai dengan tanggal aktif (misal: stokwh3_20260822)
        const keyAktif = Object.keys(window.currentStokData).find(k => k.includes(`stokwh3_${tanggalAktif}`));
        
        if (keyAktif && window.currentStokData[keyAktif]) {
            const dailyData = window.currentStokData[keyAktif];

            // Urutkan entries data berdasarkan aturan sort score
            const sortedEntries = Object.entries(dailyData).sort((a, b) => {
                const scoreA1 = getSortScore(a[0]), scoreB1 = getSortScore(b[0]);
                if (scoreA1 !== scoreB1) return scoreA1 - scoreB1;
                const scoreA2 = getVarianScore(a[0]), scoreB2 = getVarianScore(b[0]);
                if (scoreA2 !== scoreB2) return scoreA2 - scoreB2;
                return getAngkaAkhir(a[0]) - getAngkaAkhir(b[0]);
            });

            sortedEntries.forEach(([kode, item]) => {
                if (!item || typeof item !== 'object') return;

                const bosnet = parseInt(item.bosnet) || 0;
                const qa = parseInt(item.qa) || 0;
                const blok = parseInt(item.blok) || 0;
                const beceran = parseInt(item.beceran) || 0;
                const utuhan = parseInt(item.utuhan) || 0;
                const namaBarang = item.nama || kode;
                
                // Hitung fisik sesuai aturan (PR-PKT vs Barang Biasa)
                const fisik = kode.includes("PR-PKT") ? (beceran + utuhan) : (blok + beceran + utuhan);
                
                // Ambil selisih bawaan atau hitung otomatis (Fisik - [Bosnet + QA])
                const selisih = (item.selisih !== undefined && item.selisih !== null) ? parseInt(item.selisih) || 0 : (fisik - (bosnet + qa));

                const isPaket = kode.includes("PR-PKT");
                const satuan = isPaket ? "PKT" : "KRT";

                // --- 1. STOK LEBIH (+) (Selisih > 0) ---
                if (selisih > 0) {
                    countPlus++;
                    totalQtyPlus += selisih; // Tambahkan ke total akumulasi Qty Plus
                    
                    // Render ke Panel Stok Lebih (+)
                    containerPlus.innerHTML += `
                        <div class="p-2.5 text-xs bg-emerald-50/50 rounded-lg border border-emerald-100 flex justify-between items-center">
                            <div>
                                <b class="text-slate-700">${kode}</b>
                                <div class="text-[10px] text-slate-500 truncate max-w-[180px]">${namaBarang}</div>
                                <div class="text-emerald-700 font-bold mt-0.5">+${selisih} ${satuan}</div>
                            </div>
                            <span class="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold">Fisik: +${selisih} ${satuan}</span>
                        </div>`;
                    
                    optionsPlusHTML += `<option value="${kode}">[+${selisih} ${satuan}] ${kode}</option>`;
                } 
                // --- 2. STOK KURANG (-) (Selisih < 0, mencakup efek QA otomatis & fisik murni) ---
                else if (selisih < 0) {
                    countMinus++;
                    totalQtyMinus += Math.abs(selisih); // Tambahkan nilai absolut ke total akumulasi Qty Minus
                    
                    // Buat Badge Dinamis menggantikan "Target (-)"
                    let badgeInfoHTML = '';
                    let infoDropdownText = '';

                    if (qa !== 0) {
                        badgeInfoHTML = `<span class="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-bold">QA: ${Math.abs(qa)} ${satuan}</span>`;
                        infoDropdownText = `(QA: ${qa} ${satuan})`;
                    } else {
                        badgeInfoHTML = `<span class="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-bold">Fisik: ${selisih} ${satuan}</span>`;
                        infoDropdownText = `(Fisik : ${selisih} ${satuan})`;
                    }

                    // Render ke Panel Stok Kurang (-) dengan badge info baru di sebelah kanan
                    containerMinus.innerHTML += `
                        <div class="p-2.5 text-xs bg-rose-50/50 rounded-lg border border-rose-100 flex justify-between items-center">
                            <div>
                                <b class="text-slate-700">${kode}</b>
                                <div class="text-[10px] text-slate-500 truncate max-w-[180px]">${namaBarang}</div>
                                <div class="text-rose-700 font-bold mt-0.5">${selisih} ${satuan}</div>
                            </div>
                            ${badgeInfoHTML}
                        </div>`;
                    
                    optionsTujuanHTML += `<option value="${kode}">[${selisih} ${satuan}] ${kode} ${infoDropdownText}</option>`;
                }
            });
        }
    }

    // Jika kosong
    if (countPlus === 0) {
        containerPlus.innerHTML = `<div class="text-center text-[10px] text-slate-400 py-3">Tidak ada stok lebih (+) pada tanggal ini.</div>`;
    }
    if (countMinus === 0) {
        containerMinus.innerHTML = `<div class="text-center text-[10px] text-slate-400 py-3">Tidak ada stok kurang (-) pada tanggal ini.</div>`;
    }

    // Update Badge Counter Panel Plus & Minus dengan menyertakan Total Qty
    const badgePlus = document.getElementById('badge-total-plus');
    const badgeMinus = document.getElementById('badge-total-minus');
    
    if (badgePlus) badgePlus.innerText = `${countPlus} Item / + ${totalQtyPlus} krt`;
    if (badgeMinus) badgeMinus.innerText = `${countMinus} Item / - ${totalQtyMinus} krt`;

    // Update Dropdown Form Eksekusi Pertukaran
    if (selectAsalPlus) selectAsalPlus.innerHTML = optionsPlusHTML;
    if (selectTujuanMinus) selectTujuanMinus.innerHTML = optionsTujuanHTML;
}

// Fungsi Helper untuk Mendapatkan Koneksi RTDB yang Pasti Berjalan
function getDbRef() {
    if (typeof firebase !== 'undefined') {
        try {
            return firebase.database("https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/");
        } catch (e) {
            if (typeof firebase.database === 'function') {
                return firebase.database();
            }
        }
    }
    
    if (typeof db !== 'undefined' && db && typeof db.ref === 'function') {
        return db;
    }
    
    if (typeof database !== 'undefined' && database && typeof database.ref === 'function') {
        return database;
    }

    throw new Error("Koneksi Firebase Realtime Database tidak ditemukan.");
}

// Fungsi Sinkronisasi Data Stok WH3 di RTDB berdasarkan Tanggal Aktif
function sinkronisasiDatabaseStokWH3(kodeAsal, kodeTujuan) {
    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggalAktif = dateInput ? dateInput.value.replace(/-/g, '') : null;

    if (!tanggalAktif) {
        console.warn("Tanggal aktif WH-3 tidak ditemukan untuk sinkronisasi.");
        return;
    }

    const dbConn = getDbRef();
    // Cari path node database sesuai tanggal aktif (misal: stokwh3_20260822)
    const nodePath = `stokwh3_${tanggalAktif}`;

    dbConn.ref(nodePath).once('value').then((snapshot) => {
        if (!snapshot.exists()) {
            console.warn("Data stok untuk tanggal aktif tidak ditemukan di RTDB.");
            return;
        }

        const dataHarian = snapshot.val();
        let updates = {};

        // Update Barang Asal (+) : Kurangi kolom beceran sebanyak 1 krt
        if (dataHarian[kodeAsal]) {
            let beceranAsal = parseInt(dataHarian[kodeAsal].beceran) || 0;
            let blokAsal = parseInt(dataHarian[kodeAsal].blok) || 0;
            let utuhanAsal = parseInt(dataHarian[kodeAsal].utuhan) || 0;
            let bosnetAsal = parseInt(dataHarian[kodeAsal].bosnet) || 0;
            let qaAsal = parseInt(dataHarian[kodeAsal].qa) || 0;

            // Kurangi beceran (pastikan tidak kurang dari 0)
            let beceranBaruAsal = Math.max(0, beceranAsal - 1);
            updates[`${nodePath}/${kodeAsal}/beceran`] = beceranBaruAsal;

            // Hitung ulang total dan selisih baru untuk barang asal
            let fisikBaruAsal = kodeAsal.includes("PR-PKT") ? (beceranBaruAsal + utuhanAsal) : (blokAsal + beceranBaruAsal + utuhanAsal);
            let totalBaruAsal = fisikBaruAsal; // Atau sesuaikan dengan rumus total di sistem Anda
            let selisihBaruAsal = fisikBaruAsal - (bosnetAsal + qaAsal);

            updates[`${nodePath}/${kodeAsal}/total`] = totalBaruAsal;
            updates[`${nodePath}/${kodeAsal}/selisih`] = selisihBaruAsal;
        }

        // Update Barang Tujuan (-) : Tambahkan kolom beceran sebanyak 1 krt
        if (dataHarian[kodeTujuan]) {
            let beceranTujuan = parseInt(dataHarian[kodeTujuan].beceran) || 0;
            let blokTujuan = parseInt(dataHarian[kodeTujuan].blok) || 0;
            let utuhanTujuan = parseInt(dataHarian[kodeTujuan].utuhan) || 0;
            let bosnetTujuan = parseInt(dataHarian[kodeTujuan].bosnet) || 0;
            let qaTujuan = parseInt(dataHarian[kodeTujuan].qa) || 0;

            // Tambah beceran
            let beceranBaruTujuan = beceranTujuan + 1;
            updates[`${nodePath}/${kodeTujuan}/beceran`] = beceranBaruTujuan;

            // Hitung ulang total dan selisih baru untuk barang tujuan
            let fisikBaruTujuan = kodeTujuan.includes("PR-PKT") ? (beceranBaruTujuan + utuhanTujuan) : (blokTujuan + beceranBaruTujuan + utuhanTujuan);
            let totalBaruTujuan = fisikBaruTujuan;
            let selisihBaruTujuan = fisikBaruTujuan - (bosnetTujuan + qaTujuan);

            updates[`${nodePath}/${kodeTujuan}/total`] = totalBaruTujuan;
            updates[`${nodePath}/${kodeTujuan}/selisih`] = selisihBaruTujuan;
        }

        // Kirim update batch ke Firebase RTDB
        if (Object.keys(updates).length > 0) {
            dbConn.ref().update(updates).then(() => {
                console.log("Sinkronisasi stok fisik berhasil diterapkan ke RTDB.");
                // Perbarui juga data di cache window jika ada
                if (typeof window.currentStokData !== 'undefined' && window.currentStokData[nodePath]) {
                    if (window.currentStokData[nodePath][kodeAsal]) {
                        window.currentStokData[nodePath][kodeAsal].beceran = Math.max(0, (parseInt(window.currentStokData[nodePath][kodeAsal].beceran) || 0) - 1);
                    }
                    if (window.currentStokData[nodePath][kodeTujuan]) {
                        window.currentStokData[nodePath][kodeTujuan].beceran = (parseInt(window.currentStokData[nodePath][kodeTujuan].beceran) || 0) + 1;
                    }
                }
            }).catch(err => {
                console.error("Gagal melakukan update database stok:", err);
            });
        }
    }).catch(err => {
        console.error("Gagal membaca database untuk sinkronisasi:", err);
    });
}

// Fungsi Utama Eksekusi Pertukaran Fisik
function eksekusiTukarFisik() {
    const asalPlus = document.getElementById('select-asal-plus').value.trim().toUpperCase();
    const tujuanMinus = document.getElementById('select-tujuan-minus').value.trim().toUpperCase();
    const keteranganRak = document.getElementById('input-keterangan-rak').value.trim();

    if (!asalPlus || !tujuanMinus) {
        if (typeof miuiAlert === 'function') miuiAlert("Silakan pilih Barang Asal (+) dan Target Tujuan (- / QA) terlebih dahulu!");
        else alert("Silakan pilih Barang Asal (+) dan Target Tujuan (- / QA) terlebih dahulu!");
        return;
    }

    if (!keteranganRak) {
        if (typeof miuiAlert === 'function') miuiAlert("Mohon isi keterangan / lokasi rak (Contoh: Rak 14.A.24)!");
        else alert("Mohon isi keterangan / lokasi rak (Contoh: Rak 14.A.24)!");
        return;
    }

    const waktuSekarang = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
    const timestamp = Date.now();
    
    const safeAsal = asalPlus.replace(/[^a-zA-Z0-9]/g, '_');
    const safeTujuan = tujuanMinus.replace(/[^a-zA-Z0-9]/g, '_');
    const customKey = `${safeAsal}ke${safeTujuan}_${timestamp}`;
    
    const dataBaru = {
        waktu: waktuSekarang,
        asal: `${asalPlus} = 1 krt`,
        tujuan: `${tujuanMinus} = 1 krt`,
        keterangan: keteranganRak,
        timestamp: timestamp
    };

    try {
        const dbConn = getDbRef();
        
        // 1. Simpan Riwayat Tukar ke RTDB (stok_tukar/riwayat)
        dbConn.ref('stok_tukar/riwayat/' + customKey).set(dataBaru).then(() => {
            
            // 2. Jalankan Sinkronisasi / Perubahan Data Stok Langsung di RTDB Tanggal Aktif
            if (typeof sinkronisasiDatabaseStokWH3 === 'function') {
                sinkronisasiDatabaseStokWH3(asalPlus, tujuanMinus);
            }

            if (typeof miuiAlert === 'function') miuiAlert("Pertukaran fisik berhasil diproses dan disinkronkan dengan database utama!");
            else alert("Pertukaran fisik berhasil diproses dan disinkronkan dengan database utama!");
            
            // Bersihkan input keterangan rak
            document.getElementById('input-keterangan-rak').value = '';
            
            // 3. UPDATE / REFRESH OTOMATIS PANEL ATAS DAN TABEL RIWAYAT
            if (typeof muatDataPanelTukarFisik === 'function') {
                muatDataPanelTukarFisik();
            }
            if (typeof renderTabelRiwayatTukar === 'function') {
                renderTabelRiwayatTukar();
            }
            // Refresh tabel utama stok WH-3 jika fungsi tersedia
            if (typeof muatDataStokWH3 === 'function') {
                muatDataStokWH3();
            }

        }).catch((error) => {
            if (typeof miuiAlert === 'function') miuiAlert("Gagal menyimpan riwayat pertukaran: " + error.message);
            else alert("Gagal menyimpan riwayat pertukaran: " + error.message);
        });
    } catch (e) {
        if (typeof miuiAlert === 'function') miuiAlert(e.message);
        else alert(e.message);
    }
}

async function renderTabelRiwayatTukar() {
    // Cari dulu apakah kerangka tabelnya sudah pernah dibuat sebelumnya di dalam modal
    let tbodyRiwayat = document.getElementById('tabel-riwayat-tukar-body');
    
    // Jika belum ada, buat kerangka tabelnya secara dinamis di dalam kontainer modal WH-3
    if (!tbodyRiwayat) {
        const containerModalBody = document.querySelector('#modal-tukar-fisik-wh3 .overflow-y-auto');
        if (containerModalBody) {
            const divBaru = document.createElement('div');
            divBaru.className = 'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-4';
            divBaru.innerHTML = `
                <div class="px-4 py-3 bg-slate-100 border-b border-gray-200 flex justify-between items-center">
                    <span class="text-xs font-black text-slate-700 uppercase tracking-wider">Riwayat Catatan Tukar Fisik Barang</span>
                    <span class="text-[10px] text-slate-500 font-medium">Sinkronisasi otomatis dengan database utama</span>
                </div>
                <div class="overflow-x-auto max-h-[200px]">
                    <table class="w-full text-left border-collapse text-xs">
                        <thead class="bg-slate-50 text-slate-600 sticky top-0 border-b border-gray-200">
                            <tr>
                                <th class="px-4 py-2">Waktu</th>
                                <th class="px-4 py-2">Asal (+)</th>
                                <th class="px-4 py-2 text-center">Proses Tukar</th>
                                <th class="px-4 py-2">Tujuan (-)</th>
                                <th class="px-4 py-2">Keterangan / Rak</th>
                            </tr>
                        </thead>
                        <tbody id="tabel-riwayat-tukar-body" class="divide-y divide-gray-100"></tbody>
                    </table>
                </div>`;
            containerModalBody.appendChild(divBaru);
            tbodyRiwayat = document.getElementById('tabel-riwayat-tukar-body');
        }
    }

    if (!tbodyRiwayat) {
        console.error("Gagal total menginisialisasi tbody riwayat.");
        return;
    }

    tbodyRiwayat.innerHTML = `<tr><td colspan="5" class="px-4 py-3 text-center text-slate-400 italic">Memuat riwayat dari database...</td></tr>`;

    try {
        const dbConn = getDbRef();
        const snapshot = await dbConn.ref('stok_tukar/riwayat').once('value');
        const dataRiwayatObj = snapshot.val();
        
        tbodyRiwayat.innerHTML = '';

        if (!dataRiwayatObj) {
            tbodyRiwayat.innerHTML = `<tr><td colspan="5" class="px-4 py-3 text-center text-slate-400 italic">Belum ada riwayat tukar fisik di database.</td></tr>`;
            return;
        }

        let riwayatList = Object.values(dataRiwayatObj);
        riwayatList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        riwayatList.forEach(item => {
            tbodyRiwayat.innerHTML += `
                <tr class="bg-white border-b hover:bg-gray-50">
                    <td class="px-4 py-2 text-slate-500 whitespace-nowrap">${item.waktu || '-'}</td>
                    <td class="px-4 py-2 font-bold text-slate-700 whitespace-nowrap">${item.asal || '-'}</td>
                    <td class="px-4 py-2 text-center text-blue-600 font-bold whitespace-nowrap">---></td>
                    <td class="px-4 py-2 font-bold text-slate-700 whitespace-nowrap">${item.tujuan || '-'}</td>
                    <td class="px-4 py-2 text-slate-500 italic">${item.keterangan || '-'}</td>
                </tr>`;
        });
    } catch (error) {
        console.error("Gagal memuat riwayat:", error);
        tbodyRiwayat.innerHTML = `<tr><td colspan="5" class="px-4 py-3 text-center text-red-400 italic">Gagal memuat: ${error.message}</td></tr>`;
    }
}