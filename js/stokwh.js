// Tambahkan ini di setiap file JS (main.js, stokwh.js, dll) 
// agar status bar selalu ter-update
const statusBar = document.getElementById('print-status-bar');
if (!statusBar) {
    console.log("Status bar tidak ditemukan, mungkin Anda sedang di halaman lain?");
}

// URL Database Firebase
const DB_FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

// Fungsi untuk memperbarui status bar dan inisialisasi awal
document.addEventListener('DOMContentLoaded', async () => {
    initApp();
    setupNetworkListeners();
});

async function initApp() {
    console.log("Aplikasi dimuat, menginisialisasi penyimpanan lokal dan dropdown...");
    
    // 1. Sinkronisasi atau muat data dari Local Storage terlebih dahulu
    loadFromLocalStorage();
    
    // 2. Inisialisasi Rekap (Default saat buka aplikasi)
    await initDropdownsRekap();
    
    // 3. Inisialisasi lainnya
    await initDropdowns();
    await initDropdownsWH3();
    
    // 4. Jalankan sinkronisasi latar belakang jika online
    if (navigator.onLine) {
        syncBackgroundData();
    }
    
    console.log("Semua komponen berhasil diinisialisasi.");
}

function setupNetworkListeners() {
    window.addEventListener('online', () => {
        console.log("Koneksi pulih, menjalankan sinkronisasi latar belakang...");
        syncBackgroundData();
    });
    window.addEventListener('offline', () => {
        console.log("Koneksi terputus, beralih ke mode offline (Local Storage).");
    });
}

// Fungsi ganti switch mode Stok WH (REKAP, WH-2, WH-3, LEBIH) dengan efek geser slider
window.gantiModulStokWH = function(mode) {
    const slider = document.getElementById('slider-content-stokwh');
    const btnFloatHP = document.getElementById('btnFloatingInputHP'); // Ambil elemen tombol floating HP
    
    // Simpan mode aktif ke localStorage agar persisten
    localStorage.setItem('active_stok_wh_mode', mode);

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
        if (typeof gantiModeRekap === 'function' && typeof moderekap !== 'undefined') {
            gantiModeRekap(moderekap); // Pastikan mode rekap diatur sesuai
        }
        if (typeof window.renderTabelRekap === 'function') {
            window.renderTabelRekap();
        }
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
        if (typeof isLebihInitialized !== 'undefined' && !isLebihInitialized) {
            if (typeof initBarangLebih === 'function') initBarangLebih();
            isLebihInitialized = true;
        }
        if (typeof window.bl_renderRiwayat === 'function') window.bl_renderRiwayat();
        if (typeof window.renderTabelBarangLebih === 'function') window.renderTabelBarangLebih();
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
window.updateTanggalDropdownRekap = async function() {
    // 1. Ambil mode aktif dari UI (misalnya dari tombol radio yang aktif)
    const modeAktif = document.querySelector('input[name="rb-mode-rekap"]:checked')?.value || 'WH2_SEBELUM';
    
    const selPeriode = document.getElementById('select-periode-rekap');
    const selTanggal = document.getElementById('select-tanggal-rekap');
    
    if (!selPeriode || !selTanggal) return;

    // 2. Tentukan URL dan Prefix berdasarkan mode
    let dbUrl, prefix, storageKey;
    if (modeAktif === 'WH2_SEBELUM' || modeAktif === 'WH2_SESUDAH') {
        dbUrl = `${DB_FIREBASE_URL}stok_wh2.json`;
        prefix = 'stokwh2wms_';
        storageKey = 'cache_stok_wh2';
    } else {
        dbUrl = `${DB_FIREBASE_URL}stok_wh3.json`;
        prefix = 'stokwh3_';
        storageKey = 'cache_stok_wh3';
    }

    if (!selPeriode.value) {
        selTanggal.innerHTML = '<option value="">Pilih Tanggal</option>';
        return;
    }

    selTanggal.innerHTML = '<option value="">Memuat...</option>';

    let allData = null;

    try {
        // Coba ambil dari Firebase jika online
        if (navigator.onLine) {
            const response = await fetch(dbUrl);
            allData = await response.json();
            if (allData) {
                // Simpan ke localStorage sebagai cache offline
                localStorage.setItem(storageKey, JSON.stringify(allData));
            }
        }
        
        // Jika offline atau fetch gagal, fallback ke localStorage
        if (!allData) {
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                allData = JSON.parse(cached);
                console.log("Menggunakan data cache lokal untuk Rekap.");
            }
        }

        if (!allData) {
            if (typeof handleDataKosongRekap === 'function') handleDataKosongRekap(false);
            selTanggal.innerHTML = '<option value="">Tidak Ada Data</option>';
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
            if (typeof triggerUpdateTampilanRekap === 'function') {
                triggerUpdateTampilanRekap(selTanggal.value);
            }
        } else {
            if (typeof handleDataKosongRekap === 'function') handleDataKosongRekap(false);
        }
    } catch (e) {
        console.error("Gagal sinkronisasi tanggal (REKAP):", e);
        // Fallback terakhir ke localStorage saat terjadi error jaringan
        const cached = localStorage.getItem(storageKey);
        if (cached) {
            // Proses ulang dengan cache jika terjadi error
            // (dapat disesuaikan jika ingin memisahkan fungsi parsing)
        } else {
            selTanggal.innerHTML = '<option value="">Gagal Memuat</option>';
        }
    }
};

// 2. Fungsi Pemicu Terpadu (REKAP)
window.triggerUpdateTampilanRekap = async function(val) {
    // Update Display Tanggal khusus REKAP
    if (typeof window.updateDisplayTanggal === 'function') {
        window.updateDisplayTanggal(val, false, 'display-tanggal-rekap'); 
    }

    // Load Data khusus REKAP
    if (typeof window.loadDataRekap === 'function') {
        await window.loadDataRekap();
    }
};


let isDropdownInitialized = false;

// 1. Fungsi Utama: Ambil dan Update Tanggal
// Khusus untuk WH-2
window.updateTanggalDropdown = async function() {
    const selPeriode = document.getElementById('select-periode-wh2');
    const selTanggal = document.getElementById('select-tanggal-wh2');
    
    if (!selPeriode || !selTanggal) return;

    if (!selPeriode.value) {
        selTanggal.innerHTML = '<option value="">Pilih Tanggal</option>';
        if (typeof handleDataKosong === 'function') handleDataKosong(true); 
        return;
    }

    selTanggal.innerHTML = '<option value="">Memuat...</option>';

    let allData = null;
    const storageKey = 'cache_stok_wh2';

    try {
        // Coba ambil dari Firebase jika online
        if (navigator.onLine) {
            const response = await fetch(`${DB_FIREBASE_URL}stok_wh2.json`);
            allData = await response.json();
            if (allData) {
                localStorage.setItem(storageKey, JSON.stringify(allData));
            }
        }

        // Jika offline atau fetch gagal, gunakan cache localStorage
        if (!allData) {
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                allData = JSON.parse(cached);
                console.log("Menggunakan data cache lokal untuk WH-2.");
            }
        }
        
        if (!allData) {
            if (typeof handleDataKosong === 'function') handleDataKosong(false);
            selTanggal.innerHTML = '<option value="">Tidak Ada Data</option>';
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
            if (typeof triggerUpdateTampilan === 'function') {
                triggerUpdateTampilan(selTanggal.value);
            }
        } else {
            if (typeof handleDataKosong === 'function') handleDataKosong(false);
        }
    } catch (e) {
        console.error("Gagal sinkronisasi tanggal WH-2:", e);
        const cached = localStorage.getItem(storageKey);
        if (cached) {
            // Fallback ke cache jika terjadi error jaringan mendadak
            const allDataFallback = JSON.parse(cached);
            // Proses parsing cache bisa disesuaikan jika diperlukan
        } else {
            selTanggal.innerHTML = '<option value="">Gagal Memuat</option>';
        }
    }
};

// 2. Fungsi Pemicu Terpadu
window.triggerUpdateTampilan = async function(val) {
    // 1. Update Display Tanggal khusus untuk WH2
    if (typeof window.updateDisplayTanggal === 'function') {
        window.updateDisplayTanggal(val, false, 'display-tanggal-wh2'); 
    }

    // 2. Load Data khusus untuk WH2
    if (typeof window.loadStokData === 'function') {
        await window.loadStokData();
    }
};

let isDropdownInitializedWH3 = false;

// 1. Fungsi Utama: Ambil dan Update Tanggal WH-3
window.updateTanggalDropdownWH3 = async function() {
    const selPeriode = document.getElementById('select-periode-wh3');
    const selTanggal = document.getElementById('select-tanggal-wh3');
    
    if (!selPeriode || !selTanggal) return;

    if (!selPeriode.value) {
        selTanggal.innerHTML = '<option value="">Pilih Tanggal</option>';
        if (typeof handleDataKosongWH3 === 'function') handleDataKosongWH3(true); // true = reset tampilan
        return;
    }

    selTanggal.innerHTML = '<option value="">Memuat...</option>';

    let allData = null;
    const storageKey = 'cache_stok_wh3';

    try {
        // Target endpoint: stok_wh3. Cek koneksi online terlebih dahulu
        if (navigator.onLine) {
            const response = await fetch(`${DB_FIREBASE_URL}stok_wh3.json`);
            allData = await response.json();
            if (allData) {
                localStorage.setItem(storageKey, JSON.stringify(allData));
            }
        }

        // Jika offline atau fetch gagal, fallback ke cache localStorage
        if (!allData) {
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                allData = JSON.parse(cached);
                console.log("Menggunakan data cache lokal untuk WH-3.");
            }
        }
        
        if (!allData) {
            if (typeof handleDataKosongWH3 === 'function') handleDataKosongWH3(false);
            selTanggal.innerHTML = '<option value="">Tidak Ada Data</option>';
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
            if (typeof triggerUpdateTampilanWH3 === 'function') {
                triggerUpdateTampilanWH3(selTanggal.value);
            }
        } else {
            if (typeof handleDataKosongWH3 === 'function') handleDataKosongWH3(false);
        }
    } catch (e) {
        console.error("Gagal sinkronisasi tanggal WH-3:", e);
        const cached = localStorage.getItem(storageKey);
        if (!cached) {
            selTanggal.innerHTML = '<option value="">Gagal Memuat</option>';
        }
    }
};

// 2. Fungsi Pemicu Terpadu untuk WH-3
window.triggerUpdateTampilanWH3 = async function(val) {
    if (typeof window.updateDisplayTanggalWH3 === 'function') {
        window.updateDisplayTanggalWH3(val, false); // false = data ditemukan
    }
    if (typeof window.loadStokDatawh3 === 'function') {
        await window.loadStokDatawh3();
    }
};

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
window.initDropdownsRekap = async function() {
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
    selPeriode.onchange = () => {
        if (typeof updateTanggalDropdownRekap === 'function') updateTanggalDropdownRekap();
    };
    
    // Event Listeners: saat ganti tanggal, muat data tabel
    selTanggal.onchange = (e) => {
        if (e.target.value) {
            if (typeof triggerUpdateTampilanRekap === 'function') triggerUpdateTampilanRekap(e.target.value);
        } else {
            if (typeof handleDataKosongRekap === 'function') handleDataKosongRekap(false);
        }
    };

    // Eksekusi pertama kali
    if (typeof updateTanggalDropdownRekap === 'function') {
        await updateTanggalDropdownRekap();
    }
};

window.initDropdowns = async function() {
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
    selPeriode.onchange = () => {
        if (typeof updateTanggalDropdown === 'function') updateTanggalDropdown();
    };
    
    selTanggal.onchange = (e) => {
        if (e.target.value) {
            if (typeof triggerUpdateTampilan === 'function') triggerUpdateTampilan(e.target.value);
        } else {
            if (typeof handleDataKosong === 'function') handleDataKosong(false);
        }
    };

    // 4. EKSEKUSI PERTAMA
    if (typeof updateTanggalDropdown === 'function') {
        await updateTanggalDropdown();
    }
};


// 2. Fungsi init yang memanggil fungsi di atas untuk WH-3
window.initDropdownsWH3 = async function() {
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
    
    // Catatan: anonymous function pada removeEventListener tidak akan menghapus listener sebelumnya secara efektif, 
    // namun struktur ini sudah aman jika dijalankan sekali saat inisialisasi halaman.
    selTanggal.addEventListener('change', (e) => {
        if (e.target.value) {
            if (typeof triggerUpdateTampilanWH3 === 'function') {
                triggerUpdateTampilanWH3(e.target.value);
            }
        } else {
            if (typeof handleDataKosongWH3 === 'function') {
                handleDataKosongWH3(false);
            }
        }
    });

    // EKSEKUSI PERTAMA
    isDropdownInitializedWH3 = true;
    if (typeof updateTanggalDropdownWH3 === 'function') {
        await updateTanggalDropdownWH3();
    }
};

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

window.prosesUploadWH2 = async function() {
    console.log("Tombol upload ditekan!"); 
    const fileInput = document.getElementById('file-input-wh2');
    if (!fileInput) return;
    const files = fileInput.files;
    
    if (files.length < 2) {
        if (typeof miuiAlert === 'function') miuiAlert("Harap pilih minimal 2 file (BOSNET dan WMS)!");
        return;
    }

    const getTanggalFromFilename = (filename) => {
        const match = filename.match(/Stock_(\d{8})/i);
        return match ? match[1] : null;
    };

    const fileWh2 = Array.from(files).find(f => f.name.toLowerCase().includes('wh2'));
    const fileWms = Array.from(files).find(f => f.name.toLowerCase().includes('wms'));

    if (!fileWh2 || !fileWms) {
        if (typeof miuiAlert === 'function') miuiAlert("Pastikan file memiliki nama 'wh2' dan 'wms'!");
        return;
    }

    const tglWh2 = getTanggalFromFilename(fileWh2.name);
    const tglWms = getTanggalFromFilename(fileWms.name);

    if (!tglWh2 || !tglWms || tglWh2 !== tglWms) {
        if (typeof miuiAlert === 'function') miuiAlert("Format nama file tidak valid atau tanggal tidak sama!");
        return;
    }

    // 1. Cek keberadaan data untuk konfirmasi update (Utamakan online, fallback ke local storage jika offline)
    const uniqueId = `stokwh2wms_${tglWh2}`;
    const url = `${DB_FIREBASE_URL}stok_wh2/${uniqueId}.json`;
    const storageKey = 'cache_stok_wh2';
    
    let existingData = null;
    let isServerReachable = false;

    try {
        if (navigator.onLine) {
            const checkResponse = await fetch(url);
            if (checkResponse.ok) {
                existingData = await checkResponse.json();
                isServerReachable = true;
            }
        }
        
        // Jika offline atau gagal fetch server, cek dari cache local storage
        if (!isServerReachable) {
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                const parsedCache = JSON.parse(cached);
                existingData = parsedCache[uniqueId] || null;
            }
        }

        const isUpdate = existingData !== null;

        // 2. Jika data ada, gunakan miuiConfirm
        if (isUpdate) {
            if (typeof miuiConfirm === 'function') {
                miuiConfirm(
                    "Data untuk tanggal tersebut sudah ada. Apakah Anda ingin meng-UPDATE data tersebut?",
                    () => {
                        // Jika "Ya", eksekusi upload
                        if (typeof eksekusiUpload === 'function') eksekusiUpload(fileWh2, fileWms, url, true);
                    },
                    () => {
                        console.log("Upload dibatalkan oleh pengguna.");
                    }
                );
            }
        } else {
            // Jika data baru, langsung eksekusi
            if (typeof eksekusiUpload === 'function') eksekusiUpload(fileWh2, fileWms, url, false);
        }

    } catch (error) {
        console.error("Error pengecekan:", error);
        if (typeof miuiAlert === 'function') miuiAlert("Gagal mengecek data server (Mode Offline aktif).");
    }
};

window.prosesUploadWH3 = async function() {
    console.log("Tombol upload WH-3 ditekan!"); 
    const fileInput = document.getElementById('file-input-wh3');
    if (!fileInput) return;
    const files = fileInput.files;
    
    if (files.length === 0) {
        if (typeof miuiAlert === 'function') miuiAlert("Harap pilih file Excel (Bosnet)!");
        return;
    }

    const fileBosnet = files[0];
    
    // Ambil tanggal dari nama file, contoh: "Stock_20260627"
    const getTanggalFromFilename = (filename) => {
        const match = filename.match(/Stock_(\d{8})/i);
        return match ? match[1] : null;
    };

    const tgl = getTanggalFromFilename(fileBosnet.name);
    if (!tgl) {
        if (typeof miuiAlert === 'function') miuiAlert("Format nama file harus mengandung 'Stock_YYYYMMDD'!");
        return;
    }

    // URL Firebase untuk WH-3
    const uniqueId = `stokwh3_${tgl}`;
    const url = `${DB_FIREBASE_URL}stok_wh3/${uniqueId}.json`;
    const storageKey = 'cache_stok_wh3';
    
    let existingData = null;
    let isServerReachable = false;

    try {
        if (navigator.onLine) {
            const checkResponse = await fetch(url);
            if (checkResponse.ok) {
                existingData = await checkResponse.json();
                isServerReachable = true;
            }
        }

        // Jika offline atau gagal fetch server, periksa dari cache local storage
        if (!isServerReachable) {
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                const parsedCache = JSON.parse(cached);
                existingData = parsedCache[uniqueId] || null;
            }
        }

        const isUpdate = existingData !== null;

        if (isUpdate) {
            if (typeof miuiConfirm === 'function') {
                miuiConfirm(
                    "Data audit untuk tanggal tersebut sudah ada. Apakah Anda ingin meng-UPDATE data?",
                    () => {
                        if (typeof eksekusiUploadWH3 === 'function') eksekusiUploadWH3(fileBosnet, url, true);
                    },
                    () => console.log("Upload wh3 dibatalkan.")
                );
            }
        } else {
            if (typeof eksekusiUploadWH3 === 'function') eksekusiUploadWH3(fileBosnet, url, false);
        }

    } catch (error) {
        console.error("Error pengecekan:", error);
        if (typeof miuiAlert === 'function') miuiAlert("Gagal mengecek data server (Mode Offline aktif).");
    }
};

window.eksekusiUpload = async function(fileWh2, fileWms, url, isUpdate) {
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
            if (typeof miuiAlert === 'function') miuiAlert("Tidak ada data stok wh-2 yang valid untuk ditampilkan!");
            return;
        }

        // Simpan ke Cache Lokal (LocalStorage) terlebih dahulu agar langsung tersedia secara offline
        const storageKey = 'cache_stok_wh2';
        const uniqueIdMatch = url.match(/(stokwh2wms_\d+)/);
        const uniqueId = uniqueIdMatch ? uniqueIdMatch[1] : null;

        let cachedData = JSON.parse(localStorage.getItem(storageKey) || '{}');
        if (uniqueId) {
            cachedData[uniqueId] = stokGabungan;
            localStorage.setItem(storageKey, JSON.stringify(cachedData));
        }

        let isSuccess = false;

        // Coba Upload ke Firebase jika online
        if (navigator.onLine) {
            const response = await fetch(url, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(stokGabungan)
            });

            if (response.ok) {
                isSuccess = true;
            }
        } else {
            console.log("Koneksi offline: Data WH-2 disimpan ke cache lokal dan akan disinkronkan nanti.");
            isSuccess = true; // Dianggap sukses secara lokal
        }

        if (isSuccess) {
            if (typeof miuiAlert === 'function') {
                miuiAlert(isUpdate ? "Data WH-2 berhasil di-UPDATE!" : "Data WH-2 berhasil disimpan!");
            }
            if (typeof tutupModalUploadWH2 === 'function') tutupModalUploadWH2();
            if (typeof resetFileInput === 'function') resetFileInput();
            isDropdownInitialized = false; 
            if (typeof initDropdowns === 'function') await initDropdowns(); 
        } else {
            if (typeof miuiAlert === 'function') miuiAlert("Gagal menyimpan data WH-2 ke server.");
        }

    } catch (error) {
        console.error("Terjadi error detail:", error);
        if (typeof miuiAlert === 'function') miuiAlert("Terjadi kesalahan saat memproses data WH-2: " + error.message);
    }
};

window.eksekusiUploadWH3 = async function(fileBosnet, url, isUpdate) {
    try {
        console.log("Memproses data WH-3 dan mengambil stok blok terkini...");
        const dataBosnet = await bacaExcelDinamis(fileBosnet, "Produk");
        
        let dataBlokFirebase = {};
        let dataLama = {};
        const storageKeyBlok = 'cache_stok_blok';
        const storageKeyWH3 = 'cache_stok_wh3';

        // 1. Ambil data Stok Blok terbaru (Utamakan online, fallback ke cache localStorage)
        let isBlokLoaded = false;
        if (navigator.onLine) {
            try {
                const resBlok = await fetch(`https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_blok.json`);
                if (resBlok.ok) {
                    dataBlokFirebase = await resBlok.json() || {};
                    localStorage.setItem(storageKeyBlok, JSON.stringify(dataBlokFirebase));
                    isBlokLoaded = true;
                }
            } catch (err) {
                console.warn("Gagal fetch stok_blok online, mencoba cache...", err);
            }
        }

        if (!isBlokLoaded) {
            const cachedBlok = localStorage.getItem(storageKeyBlok);
            if (cachedBlok) {
                dataBlokFirebase = JSON.parse(cachedBlok);
            }
        }
        
        // Buat mapping agregat blok sementara
        const agregatBlok = {};
        Object.values(dataBlokFirebase).forEach(blokItem => {
            Object.entries(blokItem).forEach(([kode, dataTanggal]) => {
                Object.values(dataTanggal).forEach(detail => {
                    const krt = parseInt(detail.krt) || 0;
                    agregatBlok[kode] = (agregatBlok[kode] || 0) + krt;
                });
            });
        });

        // 2. Tarik data lama untuk mempertahankan fisik (beceran/utuhan)
        let isDataLamaLoaded = false;
        if (navigator.onLine) {
            try {
                const responseLama = await fetch(url);
                if (responseLama.ok) {
                    dataLama = await responseLama.json() || {};
                    isDataLamaLoaded = true;
                }
            } catch (err) {
                console.warn("Gagal fetch data lama WH3 online, mencoba cache...", err);
            }
        }

        if (!isDataLamaLoaded) {
            const cachedWH3 = localStorage.getItem(storageKeyWH3);
            if (cachedWH3) {
                const parsedWH3 = JSON.parse(cachedWH3);
                const uniqueIdMatch = url.match(/(stokwh3_\d+)/);
                const uniqueId = uniqueIdMatch ? uniqueIdMatch[1] : null;
                if (uniqueId && parsedWH3[uniqueId]) {
                    dataLama = parsedWH3[uniqueId];
                }
            }
        }

        let stokAudit = {};

        dataBosnet.forEach(row => {
            const kode = row[1] ? String(row[1]).trim().toUpperCase() : null; 
            if (!kode || kode === "PRODUK") return;

            const rawBosnetValue = row[9] ? String(row[9]).trim() : "0/0/0/0";
            const parts = rawBosnetValue.split('/').map(p => parseInt(p) || 0);

            const bosnet = parts[0] || 0;
            const ball = parts[1] || 0;
            const rtg = parts[2] || 0;

            // FILTER YANG DIPERBAIKI:
            // Baris hanya akan di-skip jika semua komponen stok bernilai 0
            if (bosnet === 0 && ball === 0 && rtg === 0) return;

            const nama = row[2] || ""; 
            const formattedPak = `${ball > 0 ? ball : "-"} | ${rtg > 0 ? rtg : "-"}`;
            const dataLamaItem = dataLama[kode] || {};

            const blok = agregatBlok[kode] || 0;
            const beceran = dataLamaItem.beceran || 0;
            const utuhan = dataLamaItem.utuhan || 0;
            const totalFisik = blok + beceran + utuhan;

            stokAudit[kode] = {
                kode: kode,
                nama: nama,
                bosnet: bosnet,
                pak_format: formattedPak,
                blok: blok,
                beceran: beceran, 
                utuhan: utuhan,  
                total: totalFisik,
                selisih: totalFisik - bosnet,
                keterangan: dataLamaItem.keterangan || "BELUM DIHITUNG",
                detail_rak: dataLamaItem.detail_rak || { beceran_rak: "", utuhan_rak: "" }
            };
        });

        // Simpan ke Cache Lokal (LocalStorage) terlebih dahulu
        const uniqueIdMatch = url.match(/(stokwh3_\d+)/);
        const uniqueId = uniqueIdMatch ? uniqueIdMatch[1] : null;

        let cachedWH3Data = JSON.parse(localStorage.getItem(storageKeyWH3) || '{}');
        if (uniqueId) {
            cachedWH3Data[uniqueId] = stokAudit;
            localStorage.setItem(storageKeyWH3, JSON.stringify(cachedWH3Data));
        }

        let isSuccess = false;

        // 3. Upload ke Firebase jika online
        if (navigator.onLine) {
            const response = await fetch(url, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(stokAudit)
            });
            if (response.ok) {
                isSuccess = true;
            }
        } else {
            console.log("Koneksi offline: Data WH-3 disimpan ke cache lokal.");
            isSuccess = true;
        }

        if (isSuccess) {
            if (typeof miuiAlert === 'function') miuiAlert("Data WH-3 berhasil disimpan!");
            if (typeof tutupModalUploadWH3 === 'function') tutupModalUploadWH3();
            if (typeof resetFileInputwh3 === 'function') resetFileInputwh3();
            isDropdownInitializedWH3 = false; 
            if (typeof initDropdownsWH3 === 'function') await initDropdownsWH3(); 
        } else {
            if (typeof miuiAlert === 'function') miuiAlert("Gagal menyimpan data WH-3 ke server.");
        }
    } catch (error) {
        console.error("Error:", error);
        if (typeof miuiAlert === 'function') miuiAlert("Gagal memproses file: " + error.message);
    }
};

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
window.bacaExcelDinamis = function(file, keyword = "KODE") {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
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
            } catch (err) {
                console.error("Error saat membaca file Excel:", err);
                resolve([]);
            }
        };
        reader.onerror = (err) => {
            console.error("FileReader error:", err);
            resolve([]);
        };
        reader.readAsArrayBuffer(file);
    });
};

window.gantiModeRekap = async function(moderekap) {
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

    // Pemanggilan fungsi dengan pengecekan aman
    if (typeof loadDataRekap === 'function') {
        await loadDataRekap(); 
    }

    if (typeof renderTabelRekap === 'function') {
        renderTabelRekap(null, moderekap);
    }
};

window.gantiModeWH2 = async function(mode) {
    // Fungsi ini hanya bertugas memperbarui UI judul saja, 
    // lalu memicu loadStokData untuk mengupdate isi tabel
    const title = document.getElementById('txt-table-title-wh2');
    if (title) {
        title.innerText = mode === "WH2_SEBELUM" ? "TABEL DATA WH-2 SEBELUM" : "TABEL DATA WH-2 SESUDAH";
    }
    if (typeof loadStokData === 'function') {
        await loadStokData(); 
    }
};

window.gantiModeWH3 = async function(mode) {
    const contStok = document.getElementById('container-stok-wh3');
    const contRak = document.getElementById('container-rak-wh3');
    const contSelisih = document.getElementById('container-selisih-wh3');
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
        const dataBlok = typeof getAgregatStokBlok === 'function' ? await getAgregatStokBlok() : {};
        if (typeof renderTabelwh3 === 'function') {
            renderTabelwh3(dataTepat, mode, key, dataBlok);
        }
    } 
    else if (mode === "RAK WH-3") {
        title.innerText = "TABEL DATA RAK WH-3";
        contRak.classList.remove('hidden');
        if (typeof renderRakWH3 === 'function') {
            renderRakWH3(dataTepat); 
        }
        if (typeof sinkronisasiBlokKeFirebase === 'function') {
            sinkronisasiBlokKeFirebase(dataTepat);
        }
    }
    else if (mode === "SELISIH") {
        title.innerText = "TABEL RIWAYAT SELISIH";
        contSelisih.classList.remove('hidden');
        if (typeof renderSelisihWH3 === 'function') {
            renderSelisihWH3(allData); 
        }
    }
};

// Helper untuk pesan kosong
window.tampilkanKosong = function(infoTambahan = '', modul = 'WH2') {
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
};

window.tampilkanKosongwh3 = function(infoTambahan = '') {
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
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-10 text-slate-800">
                Belum ada data stok ${displayInfo}
            </td>
        </tr>`;
};


window.loadDataRekap = async function() {
    const inputTglrekap = document.getElementById('select-tanggal-rekap');
    const tanggalrekap = inputTglrekap ? inputTglrekap.value : null;
    if (!tanggalrekap) return; 

    const radioCheckedrekap = document.querySelector('input[name="rb-mode-rekap"]:checked');
    const moderekap = radioCheckedrekap ? radioCheckedrekap.value : "WH2_SEBELUM";

    // 1. Tentukan file source & cache key
    let sourceFile = moderekap.includes('WH3') ? 'stok_wh3.json' : 
                       (moderekap === 'BARANG_LEBIH' ? 'stok_lebih.json' : 'stok_wh2.json');
    let keyPrefix = moderekap.includes('WH3') ? 'stokwh3_' : 'stokwh2wms_';
    
    // Tentukan storage key localStorage berdasarkan sourceFile
    let storageKey = 'cache_stok_wh2';
    if (moderekap.includes('WH3')) storageKey = 'cache_stok_wh3';
    else if (moderekap === 'BARANG_LEBIH') storageKey = 'cache_stok_lebih';

    let allDatarekap = {};
    let isDataLoaded = false;

    try {
        // Coba ambil dari online (Firebase) jika online
        if (navigator.onLine) {
            try {
                const responserekap = await fetch(`${DB_FIREBASE_URL}${sourceFile}`);
                if (responserekap.ok) {
                    allDatarekap = await responserekap.json() || {};
                    localStorage.setItem(storageKey, JSON.stringify(allDatarekap));
                    isDataLoaded = true;
                }
            } catch (err) {
                console.warn("Gagal fetch rekap online, beralih ke cache...", err);
            }
        }

        // Jika offline atau gagal fetch online, ambil dari localStorage cache
        if (!isDataLoaded) {
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                allDatarekap = JSON.parse(cached);
                isDataLoaded = true;
            }
        }

        // A. Handling untuk Barang Lebih
        if (moderekap === 'BARANG_LEBIH') {
            if (typeof window.renderTabelBarangLebih === 'function') {
                await window.renderTabelBarangLebih();
            }
            return; 
        }

        // B. Handling untuk Selisih WH3
        if (moderekap === 'SELISIH_WH3') {
            if (typeof renderSelisihWH3 === 'function') {
                await renderSelisihWH3(allDatarekap);
            }
            return; 
        }

        // C. Handling untuk Stok Harian (WH2/WH3)
        const formattedDaterekap = tanggalrekap.replace(/-/g, '');
        const keyrekap = Object.keys(allDatarekap || {}).find(k => k.includes(`${keyPrefix}${formattedDaterekap}`));
        
        if (keyrekap) {
            if (typeof renderTabelRekap === 'function') {
                renderTabelRekap(allDatarekap[keyrekap], moderekap);
            }
        } else {
            if (typeof tampilkanKosongRekap === 'function') {
                tampilkanKosongRekap(tanggalrekap);
            }
        }
    } catch (error) {
        console.error("Gagal memuat data rekap:", error);
        if (typeof tampilkanKosongRekap === 'function') {
            tampilkanKosongRekap(tanggalrekap);
        }
    }
};


window.loadStokData = async function() {
    const dateInput = document.getElementById('select-tanggal-wh2');
    const tanggal = dateInput ? dateInput.value : null;

    if (!tanggal) return;

    // 1. Tentukan mode secara paksa dari DOM
    // Mencari radio yang dicentang, jika tidak ada, default ke SEBELUM
    const radioChecked = document.querySelector('input[name="rb-mode-wh2"]:checked');
    const mode = radioChecked ? radioChecked.value : "SEBELUM";
    
    console.log("Memuat data mode:", mode, "untuk tanggal:", tanggal);

    const formattedDate = tanggal.replace(/-/g, '');
    const storageKey = 'cache_stok_wh2';
    
    let allData = {};
    let isDataLoaded = false;

    try {
        // Coba ambil dari Firebase jika online
        if (navigator.onLine) {
            try {
                const response = await fetch(`${DB_FIREBASE_URL}stok_wh2.json`);
                if (response.ok) {
                    allData = await response.json() || {};
                    localStorage.setItem(storageKey, JSON.stringify(allData));
                    isDataLoaded = true;
                }
            } catch (err) {
                console.warn("Gagal fetch stok_wh2 online, beralih ke cache...", err);
            }
        }

        // Jika offline atau gagal fetch online, gunakan cache localStorage
        if (!isDataLoaded) {
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                allData = JSON.parse(cached);
                isDataLoaded = true;
            }
        }

        window.currentStokData = allData;
        
        if (!allData || Object.keys(allData).length === 0) {
            if (typeof tampilkanKosong === 'function') {
                tampilkanKosong(tanggal, 'WH2');
            }
            return;
        }

        const key = Object.keys(allData).find(k => k.includes(`stokwh2wms_${formattedDate}`));
        
        if (!key) {
            if (typeof tampilkanKosong === 'function') {
                tampilkanKosong(tanggal, 'WH2');
            }
            return;
        }

        // 2. Render langsung dengan mode yang sudah didapat
        if (typeof renderTabel === 'function') {
            renderTabel(allData[key], mode, key);
        }
        
    } catch (error) {
        console.error("Gagal load data stok WH2:", error);
        if (typeof tampilkanKosong === 'function') {
            tampilkanKosong(tanggal, 'WH2');
        }
    }
};

// Variabel penyimpan referensi listener agar tidak menumpuk
let wh3DataListener = null;

window.loadStokDatawh3 = function() {
    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value : null;

    if (!tanggal) return;

    // Tentukan mode secara paksa dari DOM
    const radioChecked = document.querySelector('input[name="rb-mode-wh3"]:checked');
    const mode = radioChecked ? radioChecked.value : "STOK WH-3";
    
    const formattedDate = tanggal.replace(/-/g, '');
    const storageKey = 'cache_stok_wh3';
    
    // Cek ketersediaan objek firebase database
    if (typeof firebase === 'undefined' || !firebase.database) {
        console.warn("Firebase Realtime Database belum tersedia, mencoba memuat dari cache lokal...");
        loadStokDatawh3FromCache(tanggal, formattedDate, mode, storageKey);
        return;
    }

    // Path referensi spesifik ke database Firebase Anda
    const dbRef = firebase.database().ref(`stok_wh3`);

    // Hapus listener sebelumnya jika ada (agar tidak terjadi duplikasi event saat ganti tanggal)
    if (wh3DataListener) {
        dbRef.off('value', wh3DataListener);
    }

    // Pasang onValue: Hanya berjalan otomatis saat Firebase mendeteksi adanya data masuk/berubah
    wh3DataListener = dbRef.on('value', (snapshot) => {
        const allData = snapshot.val() || {};
        window.currentStokData = allData;
        
        // Simpan ke cache lokal sebagai cadangan
        try {
            localStorage.setItem(storageKey, JSON.stringify(allData));
        } catch (e) {
            console.warn("Gagal menyimpan cache stok_wh3:", e);
        }
        
        if (!allData || Object.keys(allData).length === 0) {
            if (typeof tampilkanKosongwh3 === 'function') {
                tampilkanKosongwh3(tanggal);
            }
            return;
        }

        const key = Object.keys(allData).find(k => k.includes(`stokwh3_${formattedDate}`));
        
        if (!key) {
            if (typeof tampilkanKosongwh3 === 'function') {
                tampilkanKosongwh3(tanggal);
            }
            return;
        }

        // Render tabel otomatis seketika saat ada perubahan data di server
        if (typeof renderTabelwh3 === 'function') {
            renderTabelwh3(allData[key], mode, key);
        }
        console.log("Data Stok WH-3 diperbarui secara real-time dari Firebase.");
    }, (error) => {
        console.error("Gagal mendengarkan perubahan data, beralih ke cache lokal:", error);
        loadStokDatawh3FromCache(tanggal, formattedDate, mode, storageKey);
    });
};

// Helper internal untuk fallback cache lokal WH-3
function loadStokDatawh3FromCache(tanggal, formattedDate, mode, storageKey) {
    try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
            const allData = JSON.parse(cached);
            window.currentStokData = allData;
            
            const key = Object.keys(allData || {}).find(k => k.includes(`stokwh3_${formattedDate}`));
            if (key && typeof renderTabelwh3 === 'function') {
                renderTabelwh3(allData[key], mode, key);
                return;
            }
        }
    } catch (err) {
        console.error("Gagal membaca cache lokal WH-3:", err);
    }

    if (typeof tampilkanKosongwh3 === 'function') {
        tampilkanKosongwh3(tanggal);
    }
}



window.renderTabelRekap = async function(dataStok, mode) {
    const tbody = document.getElementById('tabel-body-rekap');
    const thead = document.getElementById('thead-rekap');
    if (!tbody || !thead) return;

    tbody.innerHTML = '';
    
    // Konfigurasi hanya untuk data stok harian
    const config = {
        'WH2_SEBELUM': ['NO', 'KODE', 'BOSNET', 'WMS', 'SELISIH', 'KETERANGAN'],
        'WH2_SESUDAH': ['NO', 'KODE', 'BOSNET', 'WMS', 'SELISIH', 'KETERANGAN'],
        'STOK_WH3': ['NO', 'KODE', 'BLOK', 'BOSNET', 'PAK', 'BECERAN', 'UTUHAN', 'TOTAL', 'SELISIH', 'KETERANGAN']
    };

    if (!config[mode]) return; // Jika mode bukan stok harian, hentikan proses

    thead.innerHTML = `<tr>${config[mode].map(h => `<th class="py-3 px-4 text-left border-b bg-slate-100 uppercase">${h}</th>`).join('')}</tr>`;

    if (!dataStok || Object.keys(dataStok).length === 0) {
        tbody.innerHTML = `<tr><td colspan="${config[mode].length}" class="text-center py-10">Data tidak ditemukan.</td></tr>`;
        return;
    }

    let i = 1;
    let rowsHtml = '';
    
    Object.entries(dataStok).forEach(([kode, item]) => {
        let safeKode = kode ? String(kode).replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        let row = `<tr><td class="py-2 px-3">${i++}</td><td>${safeKode}</td>`;

        if (mode.includes('WH2')) {
            let b = mode === 'WH2_SEBELUM' ? (item.stokwh2_sebelum || 0) : (item.stokwh2_sesudah || 0);
            let w = mode === 'WH2_SEBELUM' ? (item.stokwms_sebelum || 0) : (item.stokwms_sesudah || 0);
            let ket = (b - w) === 0 ? 'SESUAI' : 'SELISIH';
            row += `<td>${b}</td><td>${w}</td><td>${b - w}</td><td>${ket}</td>`;
        } else if (mode === 'STOK_WH3') {
            let blokVal = item.blok || '-';
            let bosnetVal = item.bosnet || 0;
            let pakVal = item.pak_format || item.pak || '-';
            let beceranVal = item.beceran || 0;
            let utuhanVal = item.utuhan || 0;
            let totalVal = item.total || 0;
            let selisihVal = item.selisih || 0;
            let ketVal = item.keterangan || '-';
            
            row += `<td>${blokVal}</td><td>${bosnetVal}</td><td>${pakVal}</td><td>${beceranVal}</td><td>${utuhanVal}</td><td>${totalVal}</td><td>${selisihVal}</td><td>${ketVal}</td>`;
        }

        rowsHtml += row + `</tr>`;
    });

    tbody.innerHTML = rowsHtml;
};

window.renderTabel = function(dataStok, mode, key) {
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
    let rowsHtml = "";

    Object.entries(dataStok).forEach(([kode, item]) => {
        const stokBosnet = mode === "SEBELUM" ? item.stokwh2_sebelum : item.stokwh2_sesudah;
        const stokWms = mode === "SEBELUM" ? item.stokwms_sebelum : item.stokwms_sesudah;
        const selisih = (parseInt(stokBosnet) || 0) - (parseInt(stokWms) || 0);
        
        // Akumulasi total
        totalBosnet += parseInt(stokBosnet) || 0;
        totalWms += parseInt(stokWms) || 0;
        totalSelisih += selisih;
        
        const displaySelisih = (selisih === 0) ? "-" : selisih;
        let safeKode = kode ? String(kode).replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        
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
                <button onclick="bukaModalAdmin('${key}', '${safeKode}', ${stokBosnet}, ${stokWms})" 
                        class="bg-orange-500 text-white px-2 py-1 rounded text-[15px] hover:bg-orange-600">
                    Adjust Stok
                </button>
            </td>` 
            : '';

        rowsHtml += `
            <tr class="hover:bg-gray-50 border-b border-gray-100">
                <td class="py-2 px-3">${no++}</td>
                <td class="py-2 px-3">${safeKode}</td>
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
    
    rowsHtml += `
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

    tbody.innerHTML = rowsHtml;

    // Logika Status
    const statusEl = document.getElementById('status-tabel-wh2');
    if (statusEl) {
        if (totalSelisih === 0) {
            statusEl.innerHTML = "[ SEMUA STOK SESUAI: <i class='fas fa-check-circle'></i> ]";
            statusEl.className = "ml-4 text-[15px] font-black text-green-600 uppercase tracking-wider";
        } else {
            statusEl.innerText = "[ TERDAPAT SELISIH STOK: " + totalSelisih.toLocaleString() + " Karton]";
            statusEl.className = "ml-4 text-[15px] font-black text-red-600 uppercase tracking-wider";
        }
    }
};

window.tampilkanKosongRekap = function(tanggal) {
    const tbody = document.getElementById('tabel-body-rekap');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-slate-400">Data untuk tanggal ${tanggal} tidak ditemukan.</td></tr>`;
    }
};


window.getAgregatStokBlok = async function() {
    const storageKey = 'cache_stok_blok';
    let dataBlok = {};
    let isDataLoaded = false;

    try {
        if (navigator.onLine) {
            try {
                const response = await fetch(`${DB_FIREBASE_URL}stok_blok.json`);
                if (response.ok) {
                    dataBlok = await response.json() || {};
                    localStorage.setItem(storageKey, JSON.stringify(dataBlok));
                    isDataLoaded = true;
                }
            } catch (err) {
                console.warn("Gagal fetch stok_blok online, beralih ke cache...", err);
            }
        }

        if (!isDataLoaded) {
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                dataBlok = JSON.parse(cached);
                isDataLoaded = true;
            }
        }

        const agregat = {};
        if (!dataBlok || typeof dataBlok !== 'object') return agregat;

        // Loop melalui setiap blok
        Object.values(dataBlok).forEach(blokItem => {
            if (!blokItem || typeof blokItem !== 'object') return;
            // Loop melalui setiap kode di dalam blok
            Object.entries(blokItem).forEach(([kode, dataTanggal]) => {
                if (!dataTanggal || typeof dataTanggal !== 'object') return;
                // Iterasi setiap entry tanggal di bawah kode tersebut
                Object.values(dataTanggal).forEach(detail => {
                    if (!detail) return;
                    const krt = parseInt(detail.krt) || 0;
                    if (!agregat[kode]) agregat[kode] = 0;
                    agregat[kode] += krt;
                });
            });
        });
        
        return agregat;
    } catch (error) {
        console.error("Gagal agregasi stok blok:", error);
        // Coba fallback terakhir ke cache jika terjadi error tak terduga
        try {
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                const dataBlokFallback = JSON.parse(cached);
                const agregatFallback = {};
                Object.values(dataBlokFallback).forEach(blokItem => {
                    if (!blokItem) return;
                    Object.entries(blokItem).forEach(([kode, dataTanggal]) => {
                        if (!dataTanggal) return;
                        Object.values(dataTanggal).forEach(detail => {
                            if (!detail) return;
                            const krt = parseInt(detail.krt) || 0;
                            if (!agregatFallback[kode]) agregatFallback[kode] = 0;
                            agregatFallback[kode] += krt;
                        });
                    });
                });
                return agregatFallback;
            }
        } catch (e) {
            console.error("Gagal membaca fallback cache stok blok:", e);
        }
        return {};
    }
};

// Pastikan ini dipanggil saat aplikasi dimuat agar data QTY tersedia
window.loadMasterBarang = async function() {
    const storageKey = 'cache_master_barang';
    let isDataLoaded = false;

    try {
        console.log("Mulai memuat master barang...");
        
        if (navigator.onLine) {
            try {
                const res = await fetch("https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/master_barang.json");
                if (res.ok) {
                    window.masterData = await res.json() || {};
                    localStorage.setItem(storageKey, JSON.stringify(window.masterData));
                    isDataLoaded = true;
                }
            } catch (err) {
                console.warn("Gagal fetch master_barang online, beralih ke cache...", err);
            }
        }

        if (!isDataLoaded) {
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                window.masterData = JSON.parse(cached);
                isDataLoaded = true;
            }
        }
        
        if (window.masterData && typeof window.masterData === 'object') {
            console.log("Master data berhasil dimuat. Jumlah item:", Object.keys(window.masterData).length);
        } else {
            console.warn("Master data kosong atau tidak ditemukan.");
            window.masterData = {};
        }
    } catch (error) {
        console.error("Error memuat master barang:", error);
        try {
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                window.masterData = JSON.parse(cached);
                console.log("Master data berhasil dimuat dari cache darurat.");
                return;
            }
        } catch (e) {
            console.error("Gagal membaca cache darurat master barang:", e);
        }
        window.masterData = {};
    }
};

window.renderTabelwh3 = async function(dataStok, mode, key) {
    const tbody = document.getElementById('tabel-body-wh3');
    if (!tbody) return;

    window.dataStokTerkini = dataStok;

    // Menggunakan window.masterData atau ambil dari cache/online jika belum ada
    let masterBarang = window.masterData || {};
    if (!masterBarang || Object.keys(masterBarang).length === 0) {
        try {
            const cached = localStorage.getItem('cache_master_barang');
            if (cached) {
                masterBarang = JSON.parse(cached);
                window.masterData = masterBarang;
            } else if (navigator.onLine) {
                const response = await fetch("https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/master_barang.json");
                if (response.ok) {
                    masterBarang = await response.json() || {};
                    window.masterData = masterBarang;
                    localStorage.setItem('cache_master_barang', JSON.stringify(masterBarang));
                }
            }
        } catch (e) {
            console.warn("Gagal memuat master barang di renderTabelwh3:", e);
        }
    }

    tbody.innerHTML = "";
    let no = 1;
    let totalSelisih = 0; // Inisialisasi total selisih untuk header
    let rowsHtml = "";

    // --- FUNGSI SORTIR & KONFIGURASI ---
    const polaUtama = ["CRR", "CRR EA", "THR EA", "THR", "MRMR", "MRR", "MJR HJ", "MJR", "MOB4A", "MOR2A EA", "MOR2A EB", "MOR2A", "MP", "PDR", "MTR3A", "PR-PKT", "PR-CUP", "MRSR", "LTGR", "MTGR", "MEB", "MOL", "MRL", "MTL", "ISEL"];
    const getSortScore = (kode) => {
        kode = (kode || "").toUpperCase();
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
        kode = (kode || "").toUpperCase();
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
        const match = (kode || "").match(/\d+/g);
        if (!match) return 999;
        return parseInt(match.join('').slice(-4)) || 999;
    };

    const sortedEntries = Object.entries(dataStok || {}).sort((a, b) => {
        const scoreA1 = getSortScore(a[0]), scoreB1 = getSortScore(b[0]);
        if (scoreA1 !== scoreB1) return scoreA1 - scoreB1;
        const scoreA2 = getVarianScore(a[0]), scoreB2 = getVarianScore(b[0]);
        if (scoreA2 !== scoreB2) return scoreA2 - scoreB2;
        return getAngkaAkhir(a[0]) - getAngkaAkhir(b[0]);
    });

    const f = (val) => (val === 0 || val === "0" ? "-" : (typeof val === 'number' ? val.toLocaleString() : val));

    // --- 1. HITUNG TOTAL SELISIH (Untuk Header) ---
    sortedEntries.forEach(([kode, item]) => {
        const blok = parseInt(item.blok) || 0;
        const bosnet = parseInt(item.bosnet) || 0;
        const beceran = parseInt(item.beceran) || 0;
        const utuhan = parseInt(item.utuhan) || 0;
        
        let fisik = (kode && kode.includes("PR-PKT")) ? (beceran + utuhan) : (blok + beceran + utuhan);
        totalSelisih += (fisik - bosnet);
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

    // --- 2. RENDER BARIS TABEL ---
    sortedEntries.forEach(([kode, item]) => {
        const blok = parseInt(item.blok) || 0;
        const bosnet = parseInt(item.bosnet) || 0;
        const beceran = parseInt(item.beceran) || 0;
        const utuhan = parseInt(item.utuhan) || 0;
        
        let pak = item.pak_format || "-";
        if (pak === "0 | 0" || pak === "0") pak = "-";

        if (!((blok !== 0 || bosnet !== 0 || beceran !== 0 || utuhan !== 0) || pak !== "-")) return;

        // Logika Fisik 
        let totalFisik = (kode && kode.includes("PR-PKT")) ? (beceran + utuhan) : (blok + beceran + utuhan);
        const selisih = totalFisik - bosnet;
        
        // Tentukan Satuan otomatis (PKT untuk paket, KRT untuk barang biasa)
        const isPaket = kode && kode.includes("PR-PKT");
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

        let safeKode = kode ? String(kode).replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';

        rowsHtml += `
            <tr class="hover:bg-gray-50 border-b text-[15px]">
                <td class="py-2 px-2">${no++}</td>
                <td class="py-2 px-2 whitespace-nowrap font-bold text-orange-600 cursor-pointer hover:underline" onclick="bukaModalAdmin('EDIT_DB_WH3', '${safeKode}')" title="Klik untuk Edit Database Firebase">${safeKode}</td>
                <td class="py-2 px-2">${f(blok)}</td>
                <td class="py-2 px-2">${f(bosnet)}</td>
                <td class="py-2 px-2">${pak}</td>
                <td class="py-2 px-2 whitespace-nowrap font-bold text-blue-600 cursor-pointer hover:underline" onclick="bukaModalInputRak('${safeKode}')" title="Klik untuk Input Rak Beceran">${f(beceran)}</td>
                <td class="py-2 px-2 whitespace-nowrap font-bold text-green-600 cursor-pointer hover:underline" onclick="bukaModalLihatRak('${safeKode}', event)" title="Klik untuk Lihat Rak Utuhan">${f(utuhan)}</td>
                <td class="py-2 px-2 font-bold">${f(totalFisik)}</td>
                <td class="py-2 px-2 ${kelasWarnaSelisih}">${selisih === 0 ? "-" : selisih.toLocaleString()}</td>
                <td class="py-2 px-2 whitespace-nowrap ${warnaKet} font-bold cursor-pointer hover:underline" onclick="bukaModalEditKeterangan('${safeKode}', '${keterangan === "-" ? "" : keterangan}')" title="Klik untuk Edit Keterangan">${keterangan}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
};

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

    let safeKode = kode ? String(kode).replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';

    modal.innerHTML = `
        <div class="bg-white rounded-[12px] w-full max-w-md overflow-hidden shadow-2xl">
            <!-- Header MIUI v5 -->
            <div class="w-full h-14 bg-gradient-to-b from-[#3c3c3c] to-[#2a2a2a] flex items-center justify-between px-4">
                <h3 class="text-white font-bold text-sm uppercase">EDIT DATABASE : ${safeKode}</h3>
                <button type="button" onclick="document.getElementById('${modalID}').style.display='none'" class="text-orange-400 font-bold text-lg">✕</button>
            </div>

            <!-- Konten Form -->
            <form id="form-edit-db-wh3" onsubmit="simpanEditDatabaseWH3(event, '${tanggal}', '${safeKode}')" class="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
                <div>
                    <label class="text-[12px] font-bold text-gray-800 uppercase">Nama Barang</label>
                    <input type="text" id="db-nama" value="${item.nama || ''}" class="w-full mt-1 border rounded px-2 py-1.5 text-[13px] text-gray-800 font-bold bg-gray-100" readonly>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[12px] font-bold text-gray-800 uppercase">Blok</label>
                        <input type="number" id="db-blok" value="${item.blok || 0}" class="w-full mt-1 border rounded px-2 py-1.5 text-[13px] text-gray-800 font-bold">
                    </div>
                    <div>
                        <label class="text-[12px] font-bold text-gray-800 uppercase">Bosnet</label>
                        <input type="number" id="db-bosnet" value="${item.bosnet || 0}" class="w-full mt-1 border rounded px-2 py-1.5 text-[13px] text-gray-800 font-bold">
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
                        <label class="text-[12px] font-bold text-gray-800 uppercase">Total</label>
                        <input type="number" id="db-total" value="${item.total || 0}" class="w-full mt-1 border rounded px-2 py-1.5 text-[13px] text-gray-800 font-bold">
                    </div>
                    <div>
                        <label class="text-[12px] font-bold text-gray-800 uppercase">Selisih</label>
                        <input type="number" id="db-selisih" value="${item.selisih || 0}" class="w-full mt-1 border rounded px-2 py-1.5 text-[13px] text-gray-800 font-bold">
                    </div>
                </div>

                <div>
                    <label class="text-[12px] font-bold text-gray-800 uppercase">Format Pak</label>
                    <input type="text" id="db-pak" value="${item.pak_format || '-|-'}" class="w-full mt-1 border rounded px-2 py-1.5 text-[13px] text-gray-800 font-bold">
                </div>

                <div>
                    <label class="text-[12px] font-bold text-gray-800 uppercase">Keterangan</label>
                    <input type="text" id="db-keterangan" value="${item.keterangan || 'SESUAI'}" class="w-full mt-1 border rounded px-2 py-1.5 text-[13px] text-gray-800 font-bold">
                </div>
            </form>

            <!-- Footer Tombol Aksi (Simpan & Hapus Data Rose) -->
            <div class="px-4 py-3 bg-gray-50 flex gap-2">
                <button type="submit" form="form-edit-db-wh3" class="flex-1 py-3 bg-orange-500 text-white font-black text-sm rounded-lg hover:bg-orange-600 transition-all shadow-lg">SIMPAN DATA</button>
                <button type="button" onclick="konfirmasiHapusDatabaseWH3('${tanggal}', '${safeKode}')" class="flex-1 py-3 bg-rose-600 text-white font-black text-sm rounded-lg hover:bg-rose-700 transition-all shadow-lg">HAPUS DATA</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
};

window.simpanEditDatabaseWH3 = async function(event, tanggal, kode) {
    event.preventDefault();

    const updatedData = {
        blok: parseInt(document.getElementById('db-blok').value) || 0,
        bosnet: parseInt(document.getElementById('db-bosnet').value) || 0,
        beceran: parseInt(document.getElementById('db-beceran').value) || 0,
        utuhan: parseInt(document.getElementById('db-utuhan').value) || 0,
        total: parseInt(document.getElementById('db-total').value) || 0,
        selisih: parseInt(document.getElementById('db-selisih').value) || 0,
        pak_format: document.getElementById('db-pak').value.trim(),
        keterangan: document.getElementById('db-keterangan').value.trim()
    };

    const baseUrl = `https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_wh3/stokwh3_${tanggal}/${kode}`;
    const storageKey = `cache_stok_wh3_${tanggal}`;

    try {
        const response = await fetch(`${baseUrl}.json`, {
            method: "PATCH",
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            // Update juga cache lokal jika ada agar sinkron seketika tanpa harus reload penuh
            try {
                const cached = localStorage.getItem(storageKey);
                if (cached) {
                    const parsedCache = JSON.parse(cached);
                    if (parsedCache && parsedCache[kode]) {
                        parsedCache[kode] = { ...parsedCache[kode], ...updatedData };
                        localStorage.setItem(storageKey, JSON.stringify(parsedCache));
                    }
                }
            } catch (cacheErr) {
                console.warn("Gagal memperbarui cache lokal stok WH3:", cacheErr);
            }

            if (typeof miuiAlert === 'function') {
                miuiAlert("Data database berhasil diperbarui!");
            } else {
                alert("Data database berhasil diperbarui!");
            }

            const modalEl = document.getElementById('modal-edit-db-wh3');
            if (modalEl) modalEl.style.display = 'none';

            if (typeof muatDataStokWH3 === 'function') {
                muatDataStokWH3();
            } else {
                location.reload();
            }
        } else {
            if (typeof miuiAlert === 'function') {
                miuiAlert("Gagal memperbarui database.");
            } else {
                alert("Gagal memperbarui database.");
            }
        }
    } catch (err) {
        console.error("Error updating database:", err);
        // Fallback simpan ke antrean offline / local update jika offline (jika diperlukan)
        try {
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                const parsedCache = JSON.parse(cached);
                if (parsedCache) {
                    if (!parsedCache[kode]) parsedCache[kode] = {};
                    parsedCache[kode] = { ...parsedCache[kode], ...updatedData };
                    localStorage.setItem(storageKey, JSON.stringify(parsedCache));
                    
                    if (typeof miuiAlert === 'function') {
                        miuiAlert("Koneksi offline: Perubahan disimpan ke cache lokal.");
                    } else {
                        alert("Koneksi offline: Perubahan disimpan ke cache lokal.");
                    }

                    const modalEl = document.getElementById('modal-edit-db-wh3');
                    if (modalEl) modalEl.style.display = 'none';

                    if (typeof muatDataStokWH3 === 'function') {
                        muatDataStokWH3();
                    }
                    return;
                }
            }
        } catch (offlineErr) {
            console.error("Gagal fallback cache offline:", offlineErr);
        }

        if (typeof miuiAlert === 'function') {
            miuiAlert("Terjadi kesalahan koneksi saat menyimpan.");
        } else {
            alert("Terjadi kesalahan koneksi saat menyimpan.");
        }
    }
};

// Fungsi untuk memicu konfirmasi dan hapus permanen
window.konfirmasiHapusDatabaseWH3 = function(tanggal, kode) {
    if (confirm(`PERINGATAN: Data produk [ ${kode} ] akan dihapus secara permanen dari database! Yakin ingin menghapusnya?`)) {
        eksekusiHapusDatabaseWH3(tanggal, kode);
    }
};

// Fungsi eksekusi penghapusan menggunakan Fetch API dan memuat ulang data tanpa reload halaman
window.eksekusiHapusDatabaseWH3 = async function(tanggal, kode) {
    console.log(`Mencoba menghapus data untuk tanggal: ${tanggal}, kode: ${kode}`);

    const baseUrl = `https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_wh3/stokwh3_${tanggal}/${kode}`;
    const storageKey = `cache_stok_wh3_${tanggal}`;

    try {
        const response = await fetch(`${baseUrl}.json`, {
            method: "DELETE"
        });

        if (response.ok) {
            console.log("Data berhasil dihapus dari Firebase.");
            
            // Perbarui juga cache lokal agar data yang terhapus langsung hilang dari sinkronisasi offline
            try {
                const cached = localStorage.getItem(storageKey);
                if (cached) {
                    const parsedCache = JSON.parse(cached);
                    if (parsedCache && parsedCache[kode]) {
                        delete parsedCache[kode];
                        localStorage.setItem(storageKey, JSON.stringify(parsedCache));
                    }
                }
            } catch (cacheErr) {
                console.warn("Gagal memperbarui cache lokal setelah penghapusan:", cacheErr);
            }

            if (typeof miuiAlert === 'function') {
                miuiAlert("Data berhasil dihapus secara permanen!");
            } else {
                alert("Data berhasil dihapus secara permanen!");
            }

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
                console.warn("Fungsi pemuat data tidak ditemukan, merefresh halaman...");
                location.reload();
            }
        } else {
            if (typeof miuiAlert === 'function') {
                miuiAlert("Gagal menghapus data dari database.");
            } else {
                alert("Gagal menghapus data dari database.");
            }
        }
    } catch (err) {
        console.error("Error deleting from database:", err);
        // Tangani cadangan offline jika pengguna sedang tidak ada koneksi internet saat menghapus
        try {
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                const parsedCache = JSON.parse(cached);
                if (parsedCache && parsedCache[kode]) {
                    delete parsedCache[kode];
                    localStorage.setItem(storageKey, JSON.stringify(parsedCache));
                    
                    if (typeof miuiAlert === 'function') {
                        miuiAlert("Koneksi offline: Data dihapus dari cache lokal.");
                    } else {
                        alert("Koneksi offline: Data dihapus dari cache lokal.");
                    }

                    const modal = document.getElementById('modal-edit-db-wh3');
                    if (modal) modal.style.display = 'none';

                    if (window.dataStokTerkini && window.dataStokTerkini[kode]) {
                        delete window.dataStokTerkini[kode];
                    }

                    if (typeof muatDataStokWH3 === 'function') {
                        muatDataStokWH3();
                    } else {
                        location.reload();
                    }
                    return;
                }
            }
        } catch (offlineErr) {
            console.error("Gagal fallback hapus cache offline:", offlineErr);
        }

        if (typeof miuiAlert === 'function') {
            miuiAlert("Terjadi kesalahan koneksi saat menghapus.");
        } else {
            alert("Terjadi kesalahan koneksi saat menghapus.");
        }
    }
};

window.renderRakWH3 = function(dataStok) {
    const tbody = document.getElementById('tabel-body-rak-wh3');
    if (!tbody) return;
    
    tbody.innerHTML = "";
    let no = 1;
    let rowsHtml = "";

    if (!dataStok || typeof dataStok !== 'object') return;

    // --- FUNGSI FORMAT RAK ---
    const formatRakV2 = (str) => {
        if (!str) return "";
        return String(str).replace(/(\d+)([A-Za-z]+)(\d+)/g, "$1 C $3");
    };

    // --- SORTIR DATA (Agar sinkron dengan Tabel Stok) ---
    const polaUtama = ["CRR", "CRR EA", "THR EA", "THR", "MRMR", "MRR", "MJR HJ", "MJR", "MOB4A", "MOR2A EA", "MOR2A EB", "MOR2A", "MP", "PDR", "MTR3A", "PR-PKT", "PR-CUP", "MRSR", "LTGR", "MTGR", "MEB", "MOL", "MRL", "MTL", "ISEL"];
    const getSortScore = (kode) => {
        kode = (kode || "").toUpperCase();
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
        kode = (kode || "").toUpperCase();
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
        const match = (kode || "").match(/\d+/g);
        return match ? parseInt(match.join('').slice(-4)) || 999 : 999;
    };

    const sortedEntries = Object.entries(dataStok).sort((a, b) => {
        const sA = getSortScore(a[0]), sB = getSortScore(b[0]);
        if (sA !== sB) return sA - sB;
        const vA = getVarianScore(a[0]), vB = getVarianScore(b[0]);
        if (vA !== vB) return vA - vB;
        return getAngkaAkhir(a[0]) - getAngkaAkhir(b[0]);
    });

    const f = (val) => (!val || val === "0" || val === 0 ? "-" : (typeof val === 'number' ? val.toLocaleString() : val));

    // --- RENDER BARIS ---
    sortedEntries.forEach(([kode, item]) => {
        if (!item || typeof item !== 'object') return;

        const dr = item.detail_rak || {};
        
        // Memproses format rak dengan formatRakV2
        const rakBeceran = dr.beceran_rak ? formatRakV2(dr.beceran_rak) : "-";
        
        const rawUtuhan = dr.utuhan_rak || "";
        const rakUtuhan = rawUtuhan ? String(rawUtuhan).split('+').map(part => formatRakV2(part.trim())).join(' + ') : "-";
        
        let safeKode = kode ? String(kode).replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';

        rowsHtml += `
            <tr class="hover:bg-gray-50 border-b text-[15px]">
                <td class="py-3 px-3 text-slate-600">${no++}</td>
                <td class="py-3 px-3 font-bold text-slate-800">${safeKode}</td>
                <td class="py-3 px-3 font-bold text-slate-800">${f(item.beceran)}</td>
                <td class="py-3 px-3 text-slate-800 font-bold uppercase">${rakBeceran}</td>
                <td class="py-3 px-3 text-slate-800 font-bold">${f(item.utuhan)}</td>
                <td class="py-3 px-3 text-slate-800 font-bold uppercase">${rakUtuhan}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
};

window.renderSelisihWH3 = async function(allData) {
    const thead = document.getElementById('thead-selisih-wh3');
    const tbody = document.getElementById('tabel-body-selisih-wh3');
    if (!thead || !tbody) return;

    // --- FUNGSI SORTIR & KONFIGURASI ---
    const polaUtama = ["CRR", "CRR EA", "THR EA", "THR", "MRMR", "MRR", "MJR HJ", "MJR", "MOB4A", "MOR2A EA", "MOR2A EB", "MOR2A", "MP", "PDR", "MTR3A", "PR-PKT", "PR-CUP", "MRSR", "LTGR", "MTGR", "MEB", "MEL", "MOL", "MRL", "MTL", "ISEL"];
    const daftarKelompok = ["CRR", "MRR", "MOR", "MJR", "MP", "PDR", "DIY"]; // Kelompok untuk rekap selisih
    const prefixDIY = ["MEB", "MEL", "MOL", "MRL", "MTL", "ISEL"]; // Daftar prefix khusus yang masuk ke kelompok DIY

    const getSortScore = (kode) => {
        kode = (kode || "").toUpperCase();
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
        kode = (kode || "").toUpperCase();
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
        const match = (kode || "").match(/\d+/g);
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
            const bosnet = parseInt(item.bosnet) || 0;
            const blok = parseInt(item.blok) || 0;
            const beceran = parseInt(item.beceran) || 0;
            const utuhan = parseInt(item.utuhan) || 0;
            const fisik = (kode && kode.includes("PR-PKT")) ? (beceran + utuhan) : (blok + beceran + utuhan);
            const selisih = fisik - bosnet;
            
            if (selisih !== 0) {
                kodeSelisih.add(kode);
                if (!dataMatriks[kode]) dataMatriks[kode] = {};
                dataMatriks[kode][tgl] = selisih;

                // Akumulasi Total
                totalPerTgl[tgl] += selisih;

                // Akumulasi Rekap Kelompok (Cek apakah masuk DIY atau kelompok standar lainnya)
                const upperKode = (kode || "").toUpperCase();
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
    let tbodyHtml = "";
    let no = 1;

    Array.from(kodeSelisih).sort((a, b) => {
        const scoreA1 = getSortScore(a), scoreB1 = getSortScore(b);
        if (scoreA1 !== scoreB1) return scoreA1 - scoreB1;
        const scoreA2 = getVarianScore(a), scoreB2 = getVarianScore(b);
        if (scoreA2 !== scoreB2) return scoreA2 - scoreB2;
        return getAngkaAkhir(a) - getAngkaAkhir(b);
    }).forEach(kode => {
        let safeKode = kode ? String(kode).replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        let rowHtml = `<tr class="bg-white border-b hover:bg-gray-50">
            <td class="sticky-col py-2 px-3 text-center text-slate-600 border-r" style="min-width: 45px;">${no++}</td>
            <td class="sticky-col-kode py-2 px-3 font-bold text-slate-800 whitespace-nowrap border-r">${safeKode}</td>`;
        
        dates.forEach(tgl => {
            const val = dataMatriks[kode][tgl] || 0;
            const warna = val > 0 ? "text-blue-600" : (val < 0 ? "text-red-600" : "text-gray-300");
            rowHtml += `<td class="py-2 px-4 text-center font-bold ${warna} whitespace-nowrap">${val === 0 ? "-" : val.toLocaleString()}</td>`;
        });
        tbodyHtml += rowHtml + `</tr>`;
    });

    // --- RENDER TOTAL SELISIH GLOBAL ---
    let totalGlobalRow = `<tr class="bg-orange-100 border-t-2 border-orange-500 font-black">
        <td class="sticky-col-total py-2 px-3 text-right text-[16px] text-red-600 border-r" colspan="2" style="left: 0px; position: sticky;">TOTAL SELISIH :</td>`;
    dates.forEach(tgl => {
        const grandTotal = totalPerTgl[tgl] || 0;
        totalGlobalRow += `<td class="py-2 px-4 text-[16px] text-center ${grandTotal !== 0 ? 'text-red-600' : 'text-gray-400'} whitespace-nowrap">${grandTotal === 0 ? "-" : grandTotal.toLocaleString()}</td>`;
    });
    tbodyHtml += totalGlobalRow + `</tr>`;

    // --- RENDER REKAP KELOMPOK ---
    daftarKelompok.forEach(kel => {
        let kelRow = `<tr class="bg-gray-100 border-b hover:bg-gray-200 font-bold text-slate-700">
            <td class="sticky-col-total py-2 px-3 text-right text-[14px] border-r" colspan="2" style="left: 0px; position: sticky;">SELISIH ${kel} :</td>`;
        dates.forEach(tgl => {
            const val = rekapKelompok[kel] ? (rekapKelompok[kel][tgl] || 0) : 0;
            const warna = val !== 0 ? "text-gray-800" : "text-gray-400";
            kelRow += `<td class="py-2 px-4 text-center ${warna} whitespace-nowrap">${val === 0 ? "-" : val.toLocaleString()}</td>`;
        });
        tbodyHtml += kelRow + `</tr>`;
    });

    tbody.innerHTML = tbodyHtml;
};

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
    const safeKode = kode ? String(kode).replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
    const safeSelisih = (item.selisih !== undefined && item.selisih !== null) ? item.selisih : 0;
    document.getElementById('modalTitle').innerText = `Input Rak: ${safeKode} : ${safeSelisih} KRT/PKT`;
    
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
        if (!modal || modal.classList.contains('hidden')) return;

        e.preventDefault(); 

        const activeElement = document.activeElement;
        
        // Alur urutan yang benar:
        // 1. Qty Beceran (inputBeceran)
        // 2. Rak Beceran (inputRakBeceran)
        // 3. Rak Utuhan (inputRakUtuhan)
        // 4. Simpan (simpanRak)

        switch (activeElement && activeElement.id) {
            case 'inputBeceran':
                const elRakBeceran = document.getElementById('inputRakBeceran');
                if (elRakBeceran) elRakBeceran.focus();
                break;
            case 'inputRakBeceran':
                const elRakUtuhan = document.getElementById('inputRakUtuhan');
                if (elRakUtuhan) elRakUtuhan.focus();
                break;
            case 'inputRakUtuhan':
                if (typeof simpanRak === 'function') {
                    simpanRak();
                }
                break;
            default:
                // Opsional: jika kursor tidak sengaja di luar, arahkan ke awal
                const elBeceran = document.getElementById('inputBeceran');
                if (elBeceran) {
                    elBeceran.focus();
                }
                break;
        }
    }
});

function hitungKonversi() {
    // 1. Pengecekan data master
    if (!window.masterData) {
        if (typeof miuiAlert === 'function') {
            miuiAlert("Data master sedang dimuat, mohon tunggu sebentar...");
        } else {
            console.log("Data master sedang dimuat, mohon tunggu sebentar...");
        }
        return;
    }

    const kode = window.currentKode;
    
    // UBAH DISINI: Gunakan hitungTotalBeceran agar string "9+12" terbaca totalnya (21)
    const rawBeceranEl = document.getElementById('inputBeceran');
    const rawBeceran = rawBeceranEl ? rawBeceranEl.value : "";
    const inputBeceran = hitungTotalBeceran(rawBeceran);
    
    // 2. Akses data master
    const master = window.masterData ? window.masterData[kode] : null;
    if (!master || typeof master.QTY === 'undefined' || master.QTY === null || master.QTY === "") {
        const msg = "Peringatan: Data QTY untuk kode " + kode + " tidak ditemukan di master_barang.";
        if (typeof miuiAlert === 'function') {
            miuiAlert(msg);
        } else {
            console.warn(msg);
        }
        const displayQty = document.getElementById('displayQtyUtuhan');
        if (displayQty) displayQty.innerText = "0";
        return;
    }

    const konversi = parseInt(master.QTY) || 1;
    const rakUtuhanInputEl = document.getElementById('inputRakUtuhan');
    const rakUtuhanInput = rakUtuhanInputEl ? rakUtuhanInputEl.value : "";
    
    let hasil = 0;

    // 3. LOGIKA PEMISAH:
    if (kode && kode.includes("PR-PKT")) {
        const jumlahKarton = parseInt(rakUtuhanInput) || 0;
        hasil = (jumlahKarton * konversi) + inputBeceran;
    } else {
        const rakArray = String(rakUtuhanInput).split('+').filter(r => r.trim() !== "");
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
    
    // 1. Ambil input teks mentah untuk tampilan/multi-qty, lalu hitung totalnya untuk sistem
    const rawBeceranEl = document.getElementById('inputBeceran');
    const rawBeceranVal = rawBeceranEl ? rawBeceranEl.value : ""; 
    const beceranVal = hitungTotalBeceran(rawBeceranVal); // Hasil angka murni (misal: 21) untuk perhitungan sistem
    
    const rakBeceranEl = document.getElementById('inputRakBeceran');
    const rakBeceranVal = rakBeceranEl ? rakBeceranEl.value.toUpperCase() : "";
    
    const rakUtuhanEl = document.getElementById('inputRakUtuhan');
    const rakUtuhanVal = rakUtuhanEl ? rakUtuhanEl.value.toUpperCase() : "";
    
    // 2. Kalkulasi Utuhan berdasarkan jenis kode
    const master = window.masterData ? window.masterData[kode] : null;
    const qtyPerRak = master ? (parseInt(master.QTY) || 1) : 1; 
    
    let utuhanVal = 0;
    const isPaket = kode && kode.includes("PR-PKT");

    if (isPaket) {
        const jumlahKarton = parseInt(rakUtuhanVal) || 0;
        utuhanVal = jumlahKarton * qtyPerRak;
    } else {
        const rakArray = String(rakUtuhanVal).split('+').filter(r => r.trim() !== "");
        utuhanVal = rakArray.length * qtyPerRak;
    }

    // 3. Kalkulasi Total & Selisih menggunakan angka murni `beceranVal`
    const dataHarian = window.currentStokData ? window.currentStokData[`stokwh3_${tanggal}`] : null;
    const item = dataHarian ? dataHarian[kode] : null;
    
    if (!item) {
        console.error("Data tidak ditemukan");
        if (typeof miuiAlert === 'function') {
            miuiAlert("Data harian tidak ditemukan untuk tanggal tersebut.");
        }
        return;
    }

    const totalVal = (parseInt(item.blok) || 0) + beceranVal + utuhanVal;
    const bosnetVal = parseInt(item.bosnet) || 0;
    const selisihVal = totalVal - bosnetVal;

    // 4. Logika Keterangan Otomatis
    const satuan = isPaket ? "PKT" : "KRT";
    let statusKeterangan = "SESUAI";
    
    if (selisihVal > 0) {
        statusKeterangan = `STOK LEBIH ${selisihVal} ${satuan}`;
    } else if (selisihVal < 0) {
        statusKeterangan = `STOK KURANG ${Math.abs(selisihVal)} ${satuan}`;
    }

    const baseUrl = `https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_wh3/stokwh3_${tanggal}/${kode}`;

    // 5. Kirim ke Firebase
    try {
        // Sistem di balik layar murni membaca angka dari field `beceran`
        await fetch(`${baseUrl}.json`, {
            method: "PATCH",
            body: JSON.stringify({ 
                beceran: beceranVal, 
                utuhan: utuhanVal, 
                total: totalVal, 
                selisih: selisihVal,
                keterangan: statusKeterangan
            })
        });

        // Simpan teks multi-qty ke `detail_rak` khusus untuk tampilan antarmuka
        await fetch(`${baseUrl}/detail_rak.json`, {
            method: "PATCH",
            body: JSON.stringify({ 
                beceran_rak: rakBeceranVal, 
                utuhan_rak: rakUtuhanVal,
                beceran_qty_teks: rawBeceranVal 
            })
        });

        console.log("Data berhasil disimpan dengan pemisahan sistem dan tampilan");
        
        if (typeof tutupModalRak === 'function') {
            tutupModalRak();
        }
        if (typeof loadStokDatawh3 === 'function') {
            loadStokDatawh3();
        }
    } catch (error) {
        console.error("Gagal menyimpan:", error);
        if (typeof miuiAlert === 'function') {
            miuiAlert("Gagal menyimpan data ke database.");
        }
    }
}

function tutupModalRak() {
    document.getElementById('modalInputRak').classList.add('hidden');
}

function bukaModalLihatRak(kode, event) {
    const popup = document.getElementById('popupLihatRak');
    const content = document.getElementById('popupContent');
    
    if (!popup || !content) return;

    // 1. Reset status popup (tutup dulu tanpa animasi)
    popup.classList.remove('show');
    popup.classList.add('hidden');
    
    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggalStr = dateInput && dateInput.value ? dateInput.value.replace(/-/g, '') : "";
    
    const dataHarian = window.currentStokData ? window.currentStokData[`stokwh3_${tanggalStr}`] : null;
    const item = dataHarian ? dataHarian[kode] : (window.dataStokTerkini ? window.dataStokTerkini[kode] : null);
    
    if (!item) return;

    // Fungsi pemformatan rak
    const formatRakV2 = (str) => {
        if (!str) return "";
        return String(str).replace(/(\d+)([A-Za-z]+)(\d+)/g, "$1 C $3");
    };

    const detail = item.detail_rak || {};
    
    // Format rak beceran
    const rawRakBeceran = detail.beceran_rak || "";
    const rakBeceranFormatted = rawRakBeceran ? String(rawRakBeceran).split('+').map(part => formatRakV2(part.trim())).join(' + ') : "-";
    
    // AMBIL QTY & BERIKAN SPASI PADA TANDA TAMBAH (+)
    const rawQtyBeceran = detail.beceran_qty_teks !== undefined ? detail.beceran_qty_teks : (item.beceran !== undefined ? item.beceran : "0");
    const qtyBeceran = String(rawQtyBeceran).replace(/\s*\+\s*/g, ' + ');
    
    // Format rak utuhan
    const rawUtuhan = detail.utuhan_rak || "";
    const utuhanFormatted = rawUtuhan ? String(rawUtuhan).split('+').map(part => formatRakV2(part.trim())).join(' + ') : "";
    const utuhanRak = utuhanFormatted ? ` + ${utuhanFormatted}` : "";
    
    const safeKode = kode ? String(kode).replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
    const safeBosnet = (item.bosnet !== undefined && item.bosnet !== null) ? item.bosnet : 0;

    // 2. Masukkan konten dengan format rapi
    content.innerHTML = `<div class="text-gray-800 font-bold text-[15px]">
        ${safeKode} = ${safeBosnet} | Rak: ${rakBeceranFormatted} = ${qtyBeceran}${utuhanRak}
    </div>`;

    // 3. Tampilkan popup dengan animasi
    popup.classList.remove('hidden');
    
    if (event && event.target) {
        const rect = event.target.getBoundingClientRect();
        const popupWidth = popup.offsetWidth || 200;

        popup.style.top = (rect.top + window.scrollY - popup.offsetHeight - 8) + "px";
        popup.style.left = (rect.left + window.scrollX - (popupWidth / 2) + 10) + "px";
    }

    setTimeout(() => {
        popup.classList.add('show');
    }, 10);

    // 4. Event penutup popup
    document.onclick = (e) => {
        if (!popup.contains(e.target) && (!event || e.target !== event.target)) {
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
        
        const kodeBarangEl = document.getElementById('hp-kode-barang');
        if (kodeBarangEl) kodeBarangEl.value = '';
        
        const qtyBeceranEl = document.getElementById('hp-qty-beceran');
        if (qtyBeceranEl) qtyBeceranEl.value = '';
        
        const rakBeceranEl = document.getElementById('hp-rak-beceran');
        if (rakBeceranEl) rakBeceranEl.value = '';
        
        const rakUtuhanEl = document.getElementById('hp-rak-utuhan');
        if (rakUtuhanEl) rakUtuhanEl.value = '';
        
        activeTipeHP = '';
        const detailContainer = document.getElementById('form-detail-container');
        if (detailContainer) detailContainer.style.display = 'none';
        
        const subformBeceran = document.getElementById('subform-beceran');
        if (subformBeceran) subformBeceran.style.display = 'none';
        
        const subformUtuhan = document.getElementById('subform-utuhan');
        if (subformUtuhan) subformUtuhan.style.display = 'none';
        
        resetTombolTipeHP();
    }
}

// Fungsi Menutup Modal HP
function tutupModalInputHP() {
    const modal = document.getElementById('modalInputHP');
    if (modal) {
        modal.style.display = 'none';
        const saranContainer = document.getElementById('hp-saran-container');
        if (saranContainer) saranContainer.style.display = 'none';
    }
}

// Reset Tampilan Tombol Jenis Input
function resetTombolTipeHP() {
    const btnB = document.getElementById('btn-tipe-beceran');
    const btnU = document.getElementById('btn-tipe-utuhan');
    
    if (btnB) {
        btnB.style.background = '#fff';
        btnB.style.color = '#f97316';
        btnB.style.borderColor = '#f97316';
    }

    if (btnU) {
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

    // Filter berdasarkan keyword ketikan user (bisa mencocokkan kode atau nama barang)
    const filtered = listKode.filter(kode => {
        const item = dataStok[kode] || {};
        const namaBarang = (item.nama || '').toLowerCase();
        const k = String(kode).toLowerCase();
        const kw = String(keyword).toLowerCase();
        return k.includes(kw) || namaBarang.includes(kw);
    });

    if (filtered.length === 0) {
        container.style.display = 'none';
        return;
    }

    // --- LOGIKA URUT DATA (SORTING) ---
    const polaUtama = ["CRR", "CRR EA", "THR EA", "THR", "MRMR", "MRR", "MJR HJ", "MJR", "MOB4A", "MOR2A EA", "MOR2A EB", "MOR2A", "MP", "PDR", "MTR3A", "PR-PKT", "PR-CUP", "MRSR", "LTGR", "MTGR", "MEB", "MOL", "MRL", "MTL", "ISEL"];
    
    const getSortScore = (kode) => {
        const kodeStr = String(kode).toUpperCase();
        for (let i = 0; i < polaUtama.length; i++) {
            if (kodeStr.includes(polaUtama[i])) {
                if (polaUtama[i] === "MOR2A" && (kodeStr.includes("MOR2A EA") || kodeStr.includes("MOR2A EB"))) continue;
                if (polaUtama[i] === "THR" && kodeStr.includes("THR EA")) continue;
                if (polaUtama[i] === "MJR" && kodeStr.includes("MJR HJ")) continue;
                if (polaUtama[i] === "CRR" && kodeStr.includes("CRR EA")) continue;
                return i + 1;
            }
        }
        return 999;
    };
    
    const getVarianScore = (kode) => {
        const kodeStr = String(kode).toUpperCase();
        if (kodeStr.includes("ZC")) return 1;
        if (kodeStr.includes("SSL")) return 2;
        if (kodeStr.includes("SLO")) return 3;
        if (kodeStr.includes("TDS")) return 4;
        if (kodeStr.includes("BAG")) return 5;
        if (kodeStr.includes("WRG")) return 6;
        if (kodeStr.includes("GTG")) return 7;
        if (kodeStr.includes("DRC")) return 8;
        return 0;
    };

    const getAngkaAkhir = (kode) => {
        const match = String(kode).match(/\d+/g);
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
        const safeKode = kode ? String(kode).replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        const safeNama = namaBarang ? String(namaBarang).replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        
        html += `<div onclick="pilihKodeHP('${safeKode}')" style="padding:10px 12px; border-bottom:1px solid #eee; cursor:pointer; font-size:13px; color:#333;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='white'"><b>${safeKode}</b>${safeNama}</div>`;
    });

    container.innerHTML = html;
    container.style.display = 'block';

    // Paksa geser ke atas agar kotak saran & input kode terlihat jelas di atas keyboard
    const inputKode = document.getElementById('hp-kode-barang');
    if (inputKode) {
        inputKode.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }   
}

// Saat Salah Satu Saran Kode Dipilih
function pilihKodeHP(kode) {
    const inputKode = document.getElementById('hp-kode-barang');
    if (inputKode) {
        inputKode.value = kode;
    }
    
    const container = document.getElementById('hp-saran-container');
    if (container) {
        container.style.display = 'none';
    }
    
    if (typeof updateJudulModalHP === 'function') {
        updateJudulModalHP();
    }
}

// Fungsi Simpan Data Fisik dari HP (Support Auto-Create Data Baru)
async function simpanDataFisikHP() {
    const kodeInputEl = document.getElementById('hp-kode-barang');
    const kode = kodeInputEl ? kodeInputEl.value.trim().toUpperCase() : "";
    
    if (!kode) {
        if (typeof miuiAlert === 'function') miuiAlert('Silakan pilih atau ketik kode barang terlebih dahulu!');
        return;
    }

    if (!activeTipeHP) {
        if (typeof miuiAlert === 'function') miuiAlert('Silakan pilih jenis input (Beceran atau Utuhan)!');
        return;
    }

    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput && dateInput.value ? String(dateInput.value).replace(/-/g, '') : null;
    if (!tanggal) {
        if (typeof miuiAlert === 'function') miuiAlert('Tanggal aktif tidak ditemukan!');
        return;
    }

    // Ambil data harian saat ini untuk item tersebut
    if (!window.currentStokData) window.currentStokData = {};
    if (!window.currentStokData[`stokwh3_${tanggal}`]) {
        window.currentStokData[`stokwh3_${tanggal}`] = {};
    }

    const dataHarian = window.currentStokData[`stokwh3_${tanggal}`];
    
    // CEK APAKAH ITEM SUDAH ADA. JIKA BELUM, BUAT STRUKTUR DATA BARU (DEFAULT BOSNET 0)
    let item = dataHarian[kode];
    let isNewItem = false;

    if (!item) {
        isNewItem = true;
        item = {
            kode: kode,
            nama: (window.masterData && window.masterData[kode] && window.masterData[kode].NAMA) ? window.masterData[kode].NAMA : "STOK BOSNET TIDAK ADA / BARANG SUDAH HABIS",
            bosnet: 0,
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
    let finalBeceranVal = parseInt(item.beceran) || 0;
    let finalRawBeceran = detailLama.beceran_qty_teks || (item.beceran ? String(item.beceran) : "");
    let finalRakBeceran = detailLama.beceran_rak || "";

    let finalUtuhanVal = parseInt(item.utuhan) || 0;
    let finalRakUtuhan = detailLama.utuhan_rak || "";

    // 1. JIKA INPUT BERUPA BECERAN
    if (activeTipeHP === 'BECERAN') {
        const qtyBeceranEl = document.getElementById('hp-qty-beceran');
        const rakBeceranEl = document.getElementById('hp-rak-beceran');

        const inputQtyBeceranStr = qtyBeceranEl ? qtyBeceranEl.value.trim() : "";
        const inputRakBeceranStr = rakBeceranEl ? rakBeceranEl.value.trim().toUpperCase() : "";

        if (!inputQtyBeceranStr) {
            if (typeof miuiAlert === 'function') miuiAlert('Qty beceran harus diisi!');
            return;
        }

        const nilaiBaru = parseFloat(inputQtyBeceranStr) || 0;

        // Gabungkan Qty Angka Murni untuk sistem
        finalBeceranVal = (parseInt(item.beceran) || 0) + nilaiBaru;

        // Gabungkan Teks Qty Tampilan (misal: "1" + "1" jadi "1 + 1")
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
        const rakUtuhanEl = document.getElementById('hp-rak-utuhan');
        const inputRakUtuhanStr = rakUtuhanEl ? rakUtuhanEl.value.trim().toUpperCase() : "";

        if (!inputRakUtuhanStr) {
            if (typeof miuiAlert === 'function') miuiAlert('Rak utuhan harus diisi!');
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
        const qtyPerRak = master && master.QTY ? parseInt(master.QTY) : 0;
        const isPaket = kode.includes("PR-PKT");

        if (isPaket) {
            const jumlahKarton = parseInt(finalRakUtuhan) || 0;
            finalUtuhanVal = jumlahKarton * (qtyPerRak > 0 ? qtyPerRak : 1);
        } else {
            const rakArray = finalRakUtuhan.split('+').filter(r => r.trim() !== "");
            finalUtuhanVal = rakArray.length * (qtyPerRak > 0 ? qtyPerRak : 1);
        }
    }

    // 3. Kalkulasi Total Keseluruhan & Selisih (Bosnet dianggap 0 jika barang baru)
    const blokVal = parseInt(item.blok) || 0;
    const bosnetVal = parseInt(item.bosnet) || 0; // Bernilai 0 untuk data baru
    const isPaket = kode.includes("PR-PKT");

    const totalVal = (isPaket ? 0 : blokVal) + finalBeceranVal + finalUtuhanVal;
    const selisihVal = totalVal - bosnetVal; // Karena bosnet 0, selisih otomatis bernilai positif sebesar total fisik

    // 4. Logika Keterangan Otomatis
    const satuan = isPaket ? "PKT" : "KRT";
    let statusKeterangan = "SESUAI";

    if (selisihVal > 0) {
        statusKeterangan = `STOK LEBIH ${selisihVal} ${satuan}`;
    } else if (selisihVal < 0) {
        statusKeterangan = `STOK KURANG ${Math.abs(selisihVal)} ${satuan}`;
    }

    const safeKode = kode ? String(kode).replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
    const baseUrl = `https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_wh3/stokwh3_${tanggal}/${safeKode}`;

    // 5. Kirim Pembaruan / Data Baru ke Firebase
    try {
        // Jika item baru, kita inisialisasi data utamanya dulu secara lengkap
        if (isNewItem) {
            await fetch(`${baseUrl}.json`, {
                method: "PUT", // Gunakan PUT untuk membuat data baru secara utuh
                body: JSON.stringify({
                    kode: kode,
                    nama: item.nama,
                    bosnet: 0,
                    blok: 0,
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
                })
            });

            // Munculkan informasi khusus hanya untuk barang baru / temuan
            if (typeof miuiAlert === 'function') {
                miuiAlert(`Info: Barang baru [ ${kode} ] ditambahkan ke stok sebagai temuan/lebih!`);
            }

        } else {
            // Jika sudah ada, gunakan PATCH seperti biasa
            await fetch(`${baseUrl}.json`, {
                method: "PATCH",
                body: JSON.stringify({
                    beceran: finalBeceranVal,
                    utuhan: finalUtuhanVal,
                    total: totalVal,
                    selisih: selisihVal,
                    keterangan: statusKeterangan
                })
            });

            await fetch(`${baseUrl}/detail_rak.json`, {
                method: "PATCH",
                body: JSON.stringify({
                    beceran_rak: finalRakBeceran,
                    utuhan_rak: finalRakUtuhan,
                    beceran_qty_teks: finalRawBeceran
                })
            });
        }

        // AMBIL LANGSUNG NILAI MURNI DARI ELEMEN INPUT SAAT ITU JUGA
        const inputKodeVal = kode ? kode : "";
        const inputQtyVal = activeTipeHP === 'BECERAN' ? (document.getElementById('hp-qty-beceran') ? document.getElementById('hp-qty-beceran').value : "0") : "0";
        const inputRakVal = activeTipeHP === 'BECERAN' 
            ? (document.getElementById('hp-rak-beceran') ? document.getElementById('hp-rak-beceran').value : "") 
            : (document.getElementById('hp-rak-utuhan') ? document.getElementById('hp-rak-utuhan').value : "");

        // Update panel riwayat terakhir di modal HP
        updatePanelRiwayatHP(activeTipeHP, inputKodeVal, inputRakVal, inputQtyVal);    

        // Update juga state data lokal agar UI langsung sinkron tanpa perlu refresh ulang
        item.beceran = finalBeceranVal;
        item.utuhan = finalUtuhanVal;
        item.total = totalVal;
        item.selisih = selisihVal;
        item.keterangan = statusKeterangan;
        item.detail_rak = {
            beceran_rak: finalRakBeceran,
            utuhan_rak: finalRakUtuhan,
            beceran_qty_teks: finalRawBeceran
        };
        dataHarian[kode] = item;

        // KOSONGKAN FORM INPUT (Reset input field agar siap untuk input berikutnya)
        const inputQtyBeceran = document.getElementById('hp-qty-beceran');
        const inputRakBeceran = document.getElementById('hp-rak-beceran');
        const inputRakUtuhan = document.getElementById('hp-rak-utuhan');

        if (inputQtyBeceran) inputQtyBeceran.value = '';
        if (inputRakBeceran) inputRakBeceran.value = '';
        if (inputRakUtuhan) inputRakUtuhan.value = '';
        if (kodeInputEl) kodeInputEl.value = '';

        // RESET JUDUL KEMBALI KE SEMULA
        const modalTitleEl = document.getElementById('hp-modal-title');
        if (modalTitleEl) {
            modalTitleEl.innerText = "INPUT FISIK GUDANG (MOBILE)";
        }

        // Refresh tampilan tabel / rekap jika fungsi render tersedia di sistem Anda
        if (typeof renderTabelStokWH3 === 'function') {
            renderTabelStokWH3();
        }

    } catch (error) {
        console.error("Gagal menyimpan data fisik HP:", error);
        if (typeof miuiAlert === 'function') miuiAlert('Terjadi kesalahan saat menyimpan ke database.');
    }
}

// Fungsi untuk memperbarui panel riwayat terakhir di modal HP
function updatePanelRiwayatHP(tipe, kode, rak, qty) {
    const elRiwayat = document.getElementById('teks-riwayat-terakhir');
    if (!elRiwayat) return;

    const safeKode = kode ? String(kode).replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
    const safeRak = rak ? String(rak).replace(/</g, "&lt;").replace(/>/g, "&gt;") : '-';
    const safeQty = qty !== undefined && qty !== null ? String(qty) : '0';

    if (tipe === 'BECERAN') {
        elRiwayat.innerHTML = `<span style="color:#f97316;">[BECERAN]</span> ${safeKode} &bull; Rak: ${safeRak} &bull; Qty: ${safeQty}`;
    } else {
        elRiwayat.innerHTML = `<span style="color:#f97316;">[UTUHAN]</span> ${safeKode} &bull; Rak: ${safeRak}`;
    }
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
}

function updateJudulModalHP() {
    const modalTitleEl = document.getElementById('hp-modal-title'); 
    if (!modalTitleEl) return;

    const kodeInputEl = document.getElementById('hp-kode-barang');
    const kode = kodeInputEl ? kodeInputEl.value.trim().toUpperCase() : "";

    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput && dateInput.value ? String(dateInput.value).replace(/-/g, '') : null;
    const dataHarian = window.currentStokData && tanggal ? window.currentStokData[`stokwh3_${tanggal}`] : null;

    // Cek apakah kode yang dimasukkan benar-benar ada/valid di data harian
    const item = dataHarian ? dataHarian[kode] : null;

    // Jika kode kosong atau belum ada persis di data harian, jangan tampilkan error
    if (!kode || !item) {
        modalTitleEl.innerText = "INPUT FISIK GUDANG (MOBILE)";
        return;
    }

    // Jika kode sudah lengkap dan valid, hitung selisih dan tampilkan di judul
    const blok = parseInt(item.blok) || 0;
    const bosnet = parseInt(item.bosnet) || 0;
    const beceran = parseInt(item.beceran) || 0;
    const utuhan = parseInt(item.utuhan) || 0;
    
    let totalFisik = kode.includes("PR-PKT") ? (beceran + utuhan) : (blok + beceran + utuhan);
    const selisih = totalFisik - bosnet;
    const satuan = kode.includes("PR-PKT") ? "PKT" : "KRT";

    const safeKode = kode ? String(kode).replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
    modalTitleEl.innerText = `INPUT: ${safeKode} : ${selisih} ${satuan}`;
}

// Buka Modal Admin (Universal untuk WH-2 & WH-3)
function bukaModalAdmin(param1, kode, bosnet, wms) {
    // Cek apakah ini panggilan dari Edit Database WH-3
    if (param1 === 'EDIT_DB_WH3') {
        window.tempAdminAction = {
            type: 'EDIT_DB_WH3',
            kode: kode ? String(kode).trim() : ''
        };
    } else {
        // Jika bukan, berarti ini dari WH-2 (Adjust Stok)
        window.tempAdminAction = {
            type: 'ADJUST_WH2',
            data: { key: param1, kode: kode, bosnet: bosnet, wms: wms }
        };
    }

    // Reset inputan & buka modal admin dengan aman
    const userIdEl = document.getElementById('admin-userid');
    const passEl = document.getElementById('admin-pass');
    const modalAdminEl = document.getElementById('modal-admin-stok');

    if (userIdEl) userIdEl.value = '';
    if (passEl) passEl.value = '';
    if (modalAdminEl) modalAdminEl.classList.remove('hidden');
    if (userIdEl) userIdEl.focus();
}

function tutupModalAdmin() {
    const modalAdminEl = document.getElementById('modal-admin-stok');
    const userIdEl = document.getElementById('admin-userid');
    const passEl = document.getElementById('admin-pass');

    if (modalAdminEl) modalAdminEl.classList.add('hidden');
    if (userIdEl) userIdEl.value = '';
    if (passEl) passEl.value = '';
    window.tempAdminAction = null;
}

// Cek Password Universal
function cekAdmin() {
    const passEl = document.getElementById('admin-pass');
    const pass = passEl ? passEl.value : '';
    
    // Ganti 'admin' dengan password yang Anda inginkan
    if (pass === "admin") {
        const modalAdminEl = document.getElementById('modal-admin-stok');
        const userIdEl = document.getElementById('admin-userid');

        if (modalAdminEl) modalAdminEl.classList.add('hidden');
        if (userIdEl) userIdEl.value = '';
        if (passEl) passEl.value = '';

        // Eksekusi berdasarkan aksi yang disimpan sebelumnya
        if (window.tempAdminAction) {
            const action = window.tempAdminAction;
            window.tempAdminAction = null; // Reset

            if (action.type === 'EDIT_DB_WH3') {
                if (typeof bukaModalEditDatabaseWH3 === 'function') {
                    bukaModalEditDatabaseWH3(action.kode);
                }
            } else if (action.type === 'ADJUST_WH2') {
                if (typeof bukaModalAdjust === 'function') {
                    bukaModalAdjust(action.data);
                }
            }
        }
    } else {
        if (typeof miuiAlert === 'function') {
            miuiAlert("Password Salah! Anda tidak dizinkan mengakses menu ini!");
        } else {
            alert("Password Salah! Anda tidak dizinkan mengakses menu ini!");
        }

        if (passEl) passEl.value = '';
        const userIdEl = document.getElementById('admin-userid');
        if (userIdEl) userIdEl.value = '';
    }
}

// Buka Modal Adjust
function bukaModalAdjust(data) {
    const modalAdjust = document.getElementById('modal-adjust-stok');
    const adjKode = document.getElementById('adj-kode');
    const adjKodeDisplay = document.getElementById('adj-kode-display');
    const adjBosnet = document.getElementById('adj-bosnet');
    const adjWms = document.getElementById('adj-wms');

    if (modalAdjust) modalAdjust.classList.remove('hidden');

    const safeKode = (data && data.kode !== undefined && data.kode !== null) ? String(data.kode) : '';
    const safeBosnet = (data && data.bosnet !== undefined && data.bosnet !== null) ? data.bosnet : 0;
    const safeWms = (data && data.wms !== undefined && data.wms !== null) ? data.wms : 0;

    if (adjKode) adjKode.value = safeKode;
    if (adjKodeDisplay) adjKodeDisplay.value = safeKode;
    if (adjBosnet) adjBosnet.value = safeBosnet;
    if (adjWms) adjWms.value = safeWms;
}

function tutupModalAdjust() {
    const modalAdjust = document.getElementById('modal-adjust-stok');
    if (modalAdjust) {
        modalAdjust.classList.add('hidden');
    }
}

// Simpan ke Firebase
async function simpanAdjustStok() {
    const dateInput = document.getElementById('select-tanggal-wh2');
    const tanggalEl = document.getElementById('adj-tanggal'); // Alternatif jika ada input tanggal di modal
    const tanggalVal = dateInput && dateInput.value ? dateInput.value : (tanggalEl && tanggalEl.value ? tanggalEl.value : '');
    const tanggal = String(tanggalVal).replace(/-/g, '');

    const kodeEl = document.getElementById('adj-kode');
    const kode = kodeEl ? String(kodeEl.value).trim().toUpperCase() : '';

    const bosnetEl = document.getElementById('adj-bosnet');
    const wmsEl = document.getElementById('adj-wms');

    const bosnet = bosnetEl ? (parseInt(bosnetEl.value) || 0) : 0;
    const wms = wmsEl ? (parseInt(wmsEl.value) || 0) : 0;

    if (!tanggal) {
        if (typeof miuiAlert === 'function') miuiAlert('Tanggal aktif WH-2 tidak ditemukan!');
        return;
    }

    if (!kode) {
        if (typeof miuiAlert === 'function') miuiAlert('Kode barang tidak valid!');
        return;
    }

    // Pastikan object hanya berisi 2 field ini
    const updateData = {
        stokwh2_sesudah: bosnet,
        stokwms_sesudah: wms
    };

    const dbBaseUrl = (typeof DB_FIREBASE_URL !== 'undefined' && DB_FIREBASE_URL) 
        ? DB_FIREBASE_URL 
        : 'https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/';

    const safeKode = kode.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    try {
        const response = await fetch(`${dbBaseUrl}stok_wh2/stokwh2wms_${tanggal}/${safeKode}.json`, {
            method: "PATCH", // PATCH sangat aman untuk update parsial
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) throw new Error("Gagal menyimpan ke database");

        if (typeof miuiAlert === 'function') {
            miuiAlert("Stok berhasil diupdate!");
        } else {
            alert("Stok berhasil diupdate!");
        }

        if (typeof tutupModalAdjust === 'function') {
            tutupModalAdjust();
        }
        
        // Pastikan setelah loadStokData, tabel dirender ulang dengan data yang benar
        if (typeof loadStokData === 'function') {
            await loadStokData(); 
        }
    } catch (e) {
        console.error("Error menyimpan adjust stok WH-2:", e);
        if (typeof miuiAlert === 'function') {
            miuiAlert("Gagal update stok");
        } else {
            alert("Gagal update stok");
        }
    }
}

// Fungsi untuk membuka modal
function bukaModalEditKeterangan(kode, ketLama) {
    window.currentKode = kode ? String(kode).trim().toUpperCase() : ""; // Menyimpan kode yang sedang diedit dengan aman
    
    const inputKet = document.getElementById('inputKeterangan');
    const modalEditKet = document.getElementById('modalEditKet');

    if (inputKet) {
        inputKet.value = (ketLama === "-" || !ketLama) ? "" : ketLama; // Jika "-" kosongkan agar tidak ikut tersimpan
    }

    if (modalEditKet) {
        modalEditKet.classList.remove('hidden');
    }

    if (inputKet) {
        inputKet.focus();
    }
}

// Fungsi untuk menyimpan perubahan ke Firebase
async function simpanKeteranganManual() {
    const kode = window.currentKode;
    if (!kode) {
        if (typeof miuiAlert === 'function') {
            miuiAlert('Kode barang tidak valid atau tidak ditemukan!');
        } else {
            alert('Kode barang tidak valid atau tidak ditemukan!');
        }
        return;
    }

    const inputKet = document.getElementById('inputKeterangan');
    const ketBaru = inputKet ? inputKet.value.trim().toUpperCase() : "";

    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggalVal = dateInput && dateInput.value ? dateInput.value : '';
    const tanggal = tanggalVal ? String(tanggalVal).replace(/-/g, '') : null;

    if (!tanggal) {
        if (typeof miuiAlert === 'function') {
            miuiAlert('Tanggal aktif WH-3 tidak ditemukan!');
        } else {
            alert('Tanggal aktif WH-3 tidak ditemukan!');
        }
        return;
    }

    const safeKode = kode.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const url = `https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_wh3/stokwh3_${tanggal}/${safeKode}.json`;

    try {
        // Hanya update field keterangan saja
        const response = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keterangan: ketBaru || "OK" })
        });

        if (!response.ok) throw new Error("Gagal memperbarui keterangan ke database");

        console.log("Keterangan berhasil diupdate");
        
        const modalEditKet = document.getElementById('modalEditKet');
        if (modalEditKet) {
            modalEditKet.classList.add('hidden');
        }

        if (inputKet) {
            inputKet.value = '';
        }

        window.currentKode = null;
        
        // Refresh tampilan tabel
        if (typeof loadStokDatawh3 === 'function') {
            await loadStokDatawh3(); 
        }
    } catch (error) {
        console.error("Gagal menyimpan keterangan:", error);
        if (typeof miuiAlert === 'function') {
            miuiAlert("Gagal menyimpan keterangan!");
        } else {
            alert("Gagal menyimpan keterangan!");
        }
    }
}

function exportTabelKeExcel() {
    // 1. Ambil tabel berdasarkan ID (Sesuaikan ID tabel Anda)
    const table = document.getElementById('tabel-stok-wh2'); // Pastikan ID tabel Anda benar
    
    if (!table) {
        if (typeof miuiAlert === 'function') {
            miuiAlert("Tabel tidak ditemukan!");
        } else {
            alert("Tabel tidak ditemukan!");
        }
        return;
    }

    // Pastikan library XLSX (SheetJS) sudah dimuat sebelumnya
    if (typeof XLSX === 'undefined') {
        if (typeof miuiAlert === 'function') {
            miuiAlert("Library SheetJS (XLSX) belum dimuat!");
        } else {
            alert("Library SheetJS (XLSX) belum dimuat!");
        }
        return;
    }

    try {
        // 2. Konversi tabel HTML ke WorkBook SheetJS
        const wb = XLSX.utils.table_to_book(table, { sheet: "Laporan Stok" });

        // 3. Buat nama file berdasarkan tanggal saat ini
        const now = new Date();
        const tgl = String(now.getDate()).padStart(2, '0') + '-' + 
                    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                    now.getFullYear();
        const fileName = `STOKWH2_${tgl}.xlsx`;

        // 4. Trigger download
        XLSX.writeFile(wb, fileName);
    } catch (error) {
        console.error("Gagal melakukan export tabel ke Excel:", error);
        if (typeof miuiAlert === 'function') {
            miuiAlert("Terjadi kesalahan saat mengexport data ke Excel.");
        } else {
            alert("Terjadi kesalahan saat mengexport data ke Excel.");
        }
    }
}

async function exportTabelKeExcelWH3() {
    // --- 1. AMBIL TANGGAL AKTIF DARI SELECTOR ---
    const selectTanggal = document.getElementById('select-tanggal-wh3');
    if (!selectTanggal || !selectTanggal.value) {
        if (typeof miuiAlert === 'function') {
            miuiAlert("Silakan pilih tanggal terlebih dahulu!");
        } else {
            alert("Silakan pilih tanggal terlebih dahulu!");
        }
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

        // Konversi ke objek Date untuk mendapatkan nama hari berdasarkan tanggal yang dipilih
        const dateObj = new Date(`${thn}-${bln}-${tgl}`);
        const hariList = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const namaHariPilih = !isNaN(dateObj.getTime()) ? hariList[dateObj.getDay()] : '';

        namaHariFile = namaHariPilih;
        titleDateString = `${tgl}/${bln}/${thn} ${namaHariPilih}`;
    }

    // --- 2. AMBIL DATA LANGSUNG DARI FIREBASE ---
    try {
        if (typeof firebase === 'undefined' || !firebase.database) {
            throw new Error("Firebase SDK belum dimuat atau tidak tersedia.");
        }

        const dbRef = firebase.database().ref(`stok_wh3/stokwh3_${tglKey}`);
        const snapshot = await dbRef.once('value');
        const dailyData = snapshot.val();

        if (!dailyData || Object.keys(dailyData).length === 0) {
            if (typeof miuiAlert === 'function') {
                miuiAlert("Data stok untuk tanggal tersebut kosong di database!");
            } else {
                alert("Data stok untuk tanggal tersebut kosong di database!");
            }
            return;
        }

        // --- 3. POLA SORTIR DATA ---
        const polaUtama = ["CRR", "CRR EA", "THR EA", "THR", "MRMR", "MRR", "MJR HJ", "MJR", "MOB4A", "MOR2A EA", "MOR2A EB", "MOR2A", "MP", "PDR", "MTR3A", "PR-PKT", "PR-CUP", "MRSR", "LTGR", "MTGR", "MEB", "MOL", "MRL", "MTL", "ISEL"];
        
        const getSortScore = (kode) => {
            const cleanKode = kode ? String(kode).toUpperCase() : "";
            for (let i = 0; i < polaUtama.length; i++) {
                if (cleanKode.includes(polaUtama[i])) {
                    if (polaUtama[i] === "MOR2A" && (cleanKode.includes("MOR2A EA") || cleanKode.includes("MOR2A EB"))) continue;
                    if (polaUtama[i] === "THR" && cleanKode.includes("THR EA")) continue;
                    if (polaUtama[i] === "MJR" && cleanKode.includes("MJR HJ")) continue;
                    if (polaUtama[i] === "CRR" && cleanKode.includes("CRR EA")) continue;
                    return i + 1;
                }
            }
            return 999;
        };
        
        const getAngkaAkhir = (kode) => {
            const match = kode ? String(kode).match(/\d+/g) : null;
            return match ? parseInt(match.join('').slice(-4)) || 999 : 999;
        };

        const sortedEntries = Object.entries(dailyData).sort((a, b) => {
            const sA = getSortScore(a[0]), sB = getSortScore(b[0]);
            if (sA !== sB) return sA - sB;
            return getAngkaAkhir(a[0]) - getAngkaAkhir(b[0]);
        });

        // --- FORMAT NAMA FILE (BERDASARKAN TANGGAL DATA + JAM SIMPAN SAAT INI) ---
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
                .text-nama { text-align: left; font-size: 4pt; } /* Ukuran font khusus nama barang */
                .text-rak { text-align: left; font-size: 8pt; } /* Ukuran font khusus rak */
                .title { font-size: 12pt; font-weight: bold; text-align: left; border: none; padding-bottom: 8px; white-space: nowrap; text-transform: uppercase;}
                
                /* Kelas Warna untuk Selisih */
                .text-merah { color: #FF0000; font-weight: bold; }
                .text-hijau { color: #008000; font-weight: bold; }

                /* Lebar Kolom Presisi Excel */
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
            </style>
        </head>
        <body>
            <table>
                <colgroup>
                    <col class="col-no">
                    <col class="col-kode">
                    <col class="col-blok">
                    <col class="col-nama">
                    <col class="col-bosnet">
                    <col class="col-pak">
                    <col class="col-qty-bcr">
                    <col class="col-rak-bcr">
                    <col class="col-rak-uth">
                    <col class="col-qty-uth">
                    <col class="col-total">
                    <col class="col-selisih">
                </colgroup>
                <tr>
                    <td colspan="12" class="title">${titleText}</td>
                </tr>
                <tr>
                    <th>NO</th>
                    <th>KODE</th>
                    <th>BLOK</th>
                    <th>NAMA</th>
                    <th>BOSNET</th>
                    <th>PAK</th>
                    <th>BECERAN</th>
                    <th>RAK BECER</th>
                    <th>RAK UTUHAN</th>
                    <th>UTUHAN</th>
                    <th>TOTAL</th>
                    <th>SELISIH</th>
                </tr>
        `;

        // --- 5. PETAKAN DATA DAN BERSIHKAN NILAI NOL MENJADI KOSONG ---
        const formatNilai = (val) => {
            if (val === undefined || val === null || val === 0 || val === "0" || val === "- | -") return "";
            return val;
        };

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
            let totalStok = formatNilai(item.total);
            
            // Logika Warna Kolom Selisih
            let selisihVal = Number(item.selisih);
            let selisihHtmlClass = "";
            let selisihDisplay = "";

            if (!isNaN(selisihVal) && item.selisih !== undefined && item.selisih !== "" && item.selisih !== 0) {
                selisihDisplay = item.selisih;
                if (selisihVal < 0) {
                    selisihHtmlClass = "text-merah"; // Merah jika minus
                } else if (selisihVal > 0) {
                    selisihHtmlClass = "text-hijau"; // Hijau jika plus
                }
            }

            const safeKode = kode ? String(kode).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
            const safeNama = nama ? String(nama).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";

            html += `
                <tr>
                    <td>${no}</td>
                    <td class="text-left">${safeKode}</td>
                    <td>${blok}</td>
                    <td class="text-nama">${safeNama}</td>
                    <td>${bosnet}</td>
                    <td>${pak}</td>
                    <td>${qtyBeceran}</td>
                    <td class="text-rak">${rakBeceran}</td>
                    <td class="text-rak">${rakUtuhan}</td>
                    <td>${qtyUtuhan}</td>
                    <td>${totalStok}</td>
                    <td class="${selisihHtmlClass}">${selisihDisplay}</td>
                </tr>
            `;
        });

        html += `
            </table>
        </body>
        </html>
        `;

        // --- 6. PROSES DOWNLOAD FILE .XLS ---
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
        if (typeof miuiAlert === 'function') {
            miuiAlert("Terjadi kesalahan saat mengambil data dari database!");
        } else {
            alert("Terjadi kesalahan saat mengambil data dari database!");
        }
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

    // 2. Panggil fungsi data secara aman (Cegah double call yang tidak perlu)
    if (typeof window.bl_loadDropdownBarang === 'function') {
        await window.bl_loadDropdownBarang();
    } else {
        console.warn("Fungsi bl_loadDropdownBarang belum didefinisikan.");
    }

    // Tandai bahwa inisialisasi sudah berjalan
    isLebihInitialized = true;

    // Reset form
    if (typeof bl_resetForm === 'function') {
        bl_resetForm();
    }
};

/**
 * Fungsi Load Dropdown Khusus Barang Lebih
 * Menggunakan ID: 'bl_tx_kode'
 */
window.bl_loadDropdownBarang = async function() {
    const select = document.getElementById('bl_tx_kode');
    if (!select) return;

    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

    try {
        select.innerHTML = '<option value="">Memuat data...</option>';
        const response = await fetch(`${FIREBASE_URL}master_barang.json`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const dataBarang = await response.json();

        if (!dataBarang) {
            select.innerHTML = '<option value="">Data Kosong</option>';
            return;
        }

        // SIMPAN DATA KE MEMORI GLOBAL untuk akses lain jika dibutuhkan
        window.dataMasterBarang = dataBarang;

        // 1. Konversi ke Array
        let listBarang = Object.keys(dataBarang).map(key => ({
            key: key,
            ...dataBarang[key]
        }));

        // 3. SORTING (Berdasarkan Inisial)
        listBarang.sort((a, b) => {
            const inisialA = (a.INISIAL || "").toString();
            const inisialB = (b.INISIAL || "").toString();
            return inisialA.localeCompare(inisialB, undefined, { numeric: true, sensitivity: 'base' });
        });

        // 4. RENDERING
        select.innerHTML = '<option value="">Pilih Barang...</option>';
        listBarang.forEach(item => {
            let opt = document.createElement("option");
            const kodeBarang = item.KODE_BARANG || "-";
            const namaBarang = item.NAMA_BARANG || item.key;

            opt.value = kodeBarang !== "-" ? kodeBarang : item.key;
            
            // Sanitasi teks untuk mencegah XSS jika data dari database mengandung karakter HTML khusus
            const safeKode = String(kodeBarang).replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeNama = String(namaBarang).replace(/</g, "&lt;").replace(/>/g, "&gt;");

            opt.textContent = `${safeKode} | ${safeNama}`;
            select.appendChild(opt);
        });

    } catch (e) {
        console.error("Gagal load dropdown barang lebih:", e);
        select.innerHTML = '<option value="">Gagal Memuat</option>';
    }
};

/**
 * Fungsi Populate Kode Barang untuk Transaksi KELUAR (Khusus Barang Lebih)
 * Membaca dari path: stok_lebih
 */
window.bl_populateKodeBarangOut = async function() {
    const dropdown = document.getElementById('bl_tx_kode'); 
    if (!dropdown) return;

    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

    try {
        dropdown.innerHTML = '<option value="">Memuat data...</option>';

        // Panggil langsung ke stok_lebih.json
        const response = await fetch(`${FIREBASE_URL}stok_lebih.json`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const stokData = await response.json();

        dropdown.innerHTML = '<option value="">Pilih Barang...</option>';

        if (stokData) {
            const master = window.dataMasterBarang || {};
            
            // Ubah objek menjadi array
            let listBarang = Object.entries(stokData).map(([kode, dataStok]) => {
                const totalQty = parseInt(dataStok.qty) || 0;
                const infoBarang = master[kode] || { INISIAL: kode };
                
                return {
                    kode: kode,
                    inisial: infoBarang.INISIAL || kode,
                    totalQty: totalQty
                };
            }).filter(item => item.totalQty > 0);

            // Jika tidak ada barang dengan qty > 0
            if (listBarang.length === 0) {
                dropdown.innerHTML = '<option value="">Stok Kosong</option>';
                return;
            }

            // Urutkan & Render
            listBarang.sort((a, b) => a.inisial.localeCompare(b.inisial));
            
            listBarang.forEach(item => {
                let opt = document.createElement("option");
                opt.value = item.kode;
                
                const safeKode = String(item.kode).replace(/</g, "&lt;").replace(/>/g, "&gt;");
                opt.textContent = `${safeKode} (Qty: ${item.totalQty})`;
                dropdown.appendChild(opt);
            });

            // Panggil setup autofill expired setelah dropdown terisi dengan aman
            if (typeof setupAutofillExpired_bl === 'function') {
                setupAutofillExpired_bl();
            }
        } else {
            dropdown.innerHTML = '<option value="">Data tidak ditemukan</option>';
        }
    } catch (error) {
        console.error("Gagal memuat barang:", error);
        dropdown.innerHTML = '<option value="">Error Load</option>';
    }
};

// Fungsi untuk memuat data stok dan meng-autofill input expired
async function setupAutofillExpired_bl() {
    const selectKode = document.getElementById('bl_tx_kode'); // ID dropdown kode barang Anda
    const inputExpired = document.getElementById('bl_tx_expired'); // ID input expired

    if (!selectKode || !inputExpired) return;

    // Hapus event listener lama jika sudah pernah terpasang untuk mencegah duplikasi eksekusi
    if (selectKode._hasAutofillListener) {
        return;
    }
    selectKode._hasAutofillListener = true;

    selectKode.addEventListener('change', async () => {
        const selectedKode = selectKode.value ? String(selectKode.value).trim() : "";
        if (!selectedKode) {
            inputExpired.value = "";
            return;
        }

        const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
        const safeKode = selectedKode.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        try {
            // Ambil data stok barang yang dipilih dengan aman
            const response = await fetch(`${FIREBASE_URL}stok_lebih/${safeKode}.json`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.exp_baru) {
                // Isi otomatis input expired dengan data dari Firebase
                inputExpired.value = data.exp_baru;
            } else {
                inputExpired.value = "-"; // Default jika tidak ada data
            }
        } catch (e) {
            console.error("Gagal mengambil data untuk autofill:", e);
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
    if (freshSelect) {
        freshSelect.innerHTML = '<option value="">Memuat data...</option>';
    }

    // --- LOGIC UI & STYLE ---
    if (isOut) {
        // MODE KELUAR
        if (boxWorkspace) boxWorkspace.className = "col-span-7 bg-rose-200/60 rounded-xl border border-[#dcdcdc] shadow-sm overflow-hidden flex flex-col transition-colors duration-200";
        if(titleSide) {
            titleSide.innerText = "Input Barang Lebih Keluar";
            titleSide.className = "text-[15px] font-bold text-rose-700 uppercase";
        }
        if(lblSwitch) {
            lblSwitch.innerText = "KELUAR";
            lblSwitch.className = "text-[12px] font-bold text-rose-600 bg-rose-100/80 px-1.5 py-0.5 rounded uppercase tracking-wider";
        }
        if (btnSimpanbl) {
            btnSimpanbl.className = "flex-1 py-1.5 bg-gradient-to-b from-[#f43f5e] to-[#e11d48] text-white font-bold text-[15px] rounded-lg shadow-md border border-rose-600 tracking-wide text-center uppercase transition-colors";
            btnSimpanbl.innerText = "SIMPAN OUT";
        }

        // Tambahkan ini: Load data untuk KELUAR
        if (typeof window.bl_populateKodeBarangOut === 'function') {
            window.bl_populateKodeBarangOut();
        }

    } else {
        // MODE MASUK
        if (boxWorkspace) boxWorkspace.className = "col-span-7 bg-emerald-200/60 rounded-xl border border-[#dcdcdc] shadow-sm overflow-hidden flex flex-col transition-colors duration-200";
        if(titleSide) {
            titleSide.innerText = "Input Barang Lebih Terbaru";
            titleSide.className = "text-[15px] font-bold text-emerald-700 uppercase";
        }
        if(lblSwitch) {
            lblSwitch.innerText = "MASUK";
            lblSwitch.className = "text-[12px] font-bold text-emerald-600 bg-emerald-100/80 px-1.5 py-0.5 rounded uppercase tracking-wider";
        }
        if (btnSimpanbl) {
            btnSimpanbl.className = "flex-1 py-1.5 bg-gradient-to-b from-[#10b981] to-[#059669] text-white font-bold text-[15px] rounded-lg shadow-md border border-emerald-600 tracking-wide text-center uppercase transition-colors";
            btnSimpanbl.innerText = "SIMPAN IN";
        }

        // Tambahkan ini: Load data untuk MASUK
        if (typeof window.bl_loadDropdownBarang === 'function') {
            window.bl_loadDropdownBarang();
        }
    }
};

// --- FUNGSI RESET FORM KHUSUS BARANG LEBIH ---
window.bl_resetForm = function() {
    // Reset Tanggal ke hari ini
    const tglEl = document.getElementById('bl_tx_tanggal');
    if (tglEl) {
        const today = new Date().toISOString().split('T')[0];
        tglEl.value = today;
    }
    
    // Reset Dropdown Barang
    const selectKode = document.getElementById('bl_tx_kode');
    if (selectKode) selectKode.selectedIndex = 0;
    
    // Reset Input Qty dan Expired
    const qtyEl = document.getElementById('bl_tx_qty');
    const expEl = document.getElementById('bl_tx_expired');
    if (qtyEl) qtyEl.value = '';
    if (expEl) expEl.value = '';
    
    console.log("Form Barang Lebih telah di-reset.");
};

// --- Fungsi Pemformatan Expired (Auto JAN-27) ---
const elExpired = document.getElementById('bl_tx_expired');

if (elExpired) {
    elExpired.addEventListener('blur', function(e) {
        let val = e.target.value ? e.target.value.trim() : "";
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
    if (!data || !data.kode) {
        console.error("Data update stok lebih tidak valid:", data);
        return;
    }

    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
    const safeKode = String(data.kode).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const path = `${FIREBASE_URL}stok_lebih/${safeKode}.json`;

    try {
        const response = await fetch(path);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        let currentData = await response.json() || { qty: 0, exp_baru: "-", exp_lama: "-" };

        let updatePayload = {
            last_updated: new Date().toISOString()
        };

        const inputQty = parseInt(data.qty) || 0;

        if (data.tipe === 'IN') {
            // LOGIKA ROLLING EXPIRY
            if (data.expired === currentData.exp_baru) {
                // Kasus 1: Expired sama, cukup tambah Qty
                updatePayload.qty = (parseInt(currentData.qty) || 0) + inputQty;
                updatePayload.exp_lama = currentData.exp_lama;
                updatePayload.exp_baru = currentData.exp_baru;
            } else {
                // Kasus 2: Expired berbeda (Rolling), pindahkan exp_baru ke exp_lama
                updatePayload.qty = inputQty; // Qty jadi qty baru
                updatePayload.exp_lama = currentData.exp_baru || "-";
                updatePayload.exp_baru = data.expired || "-";
            }
        } else {
            // Mode OUT: Kurangi qty seperti biasa
            updatePayload.qty = Math.max(0, (parseInt(currentData.qty) || 0) - inputQty);
            updatePayload.exp_lama = currentData.exp_lama;
            updatePayload.exp_baru = currentData.exp_baru;
        }

        // Gunakan PATCH agar field yang tidak diupdate tidak hilang
        const patchResponse = await fetch(path, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
        });

        if (!patchResponse.ok) {
            throw new Error("Gagal menyimpan update stok lebih ke Firebase");
        }
        
        console.log("Stok berhasil diperbarui dengan logika rolling:", updatePayload);
    } catch (e) {
        console.error("Gagal update stok lebih:", e);
    }
};

/**
 * Fungsi Simpan Transaksi Barang Lebih
 * Menggunakan ID Unik: kode_tanggal_timestamp untuk sinkronisasi data yang presisi
 */
async function simpanTransaksi_bl() {
    const btnSimpan = document.getElementById('bl_btn_simpan');
    if (!btnSimpan) return;
    
    const isModeOut = btnSimpan.innerText.includes("OUT");
    
    const kodeEl = document.getElementById('bl_tx_kode');
    const qtyInputEl = document.getElementById('bl_tx_qty');
    const expiredEl = document.getElementById('bl_tx_expired');
    const tanggalEl = document.getElementById('bl_tx_tanggal');

    const kode = kodeEl ? kodeEl.value.trim() : "";
    const qtyInput = qtyInputEl ? qtyInputEl.value.trim() : "";
    const expired = expiredEl ? expiredEl.value.trim() : "";
    const tanggal = tanggalEl ? tanggalEl.value.trim() : "";

    // Validasi dasar
    if (!kode || !qtyInput || parseInt(qtyInput) <= 0) {
        if (typeof miuiAlert === 'function') {
            miuiAlert("Harap lengkapi kode barang dan jumlah (QTY)!", "error");
        } else {
            alert("Harap lengkapi kode barang dan jumlah (QTY)!");
        }
        return;
    }

    // Membuat ID Unik: kode_tanggal_timestamp
    const timestamp = new Date().getTime();
    const safeKode = kode.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const idUnik = `${safeKode}_${tanggal}_${timestamp}`;

    const data = {
        tanggal: tanggal,
        tipe: isModeOut ? 'OUT' : 'IN',
        kode: safeKode,
        qty: parseInt(qtyInput),
        expired: expired || "-"
    };

    try {
        const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
        
        // 1. Simpan ke Riwayat menggunakan PUT dengan ID Unik
        const responseLog = await fetch(`${FIREBASE_URL}log_barang_lebih/${idUnik}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!responseLog.ok) {
            throw new Error("Gagal menyimpan log transaksi ke Firebase");
        }

        // 2. Update stok di folder stok_lebih
        await updateStokLebih_bl(data);
        
        // 3. Update UI
        if (typeof window.bl_renderRiwayat === 'function') await window.bl_renderRiwayat();
        if (typeof window.renderTabelBarangLebih === 'function') await window.renderTabelBarangLebih();
        
        if (typeof miuiAlert === 'function') {
            miuiAlert("Data transaksi berhasil disimpan!", "success");
        }
        
        // Reset form & Refresh rekap
        if (typeof bl_resetForm === 'function') bl_resetForm();
        if (typeof bl_renderRekap === 'function') bl_renderRekap();
        
    } catch (e) {
        console.error("Gagal menyimpan transaksi:", e);
        if (typeof miuiAlert === 'function') {
            miuiAlert("Terjadi kesalahan sistem saat menyimpan.", "error");
        } else {
            alert("Terjadi kesalahan sistem saat menyimpan.");
        }
    }
}

// Nama fungsi menggunakan prefix bl_ agar unik
window.bl_renderRiwayat = async function() {
    const tableBody = document.getElementById('bl_table_riwayat'); 
    if (!tableBody) return;

    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
    
    try {
        const response = await fetch(`${FIREBASE_URL}log_barang_lebih.json`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data || Object.keys(data).length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-slate-400 text-[12px]">Belum ada transaksi</td></tr>`;
            return;
        }

        // 1. Konversi ke array
        const riwayatArray = Object.entries(data).map(([id, val]) => ({
            id: id,
            ...val
        }));

        // 2. Sort menggunakan timestamp (angka terakhir setelah underscore terakhir di ID)
        riwayatArray.sort((a, b) => {
            const getTimestamp = (id) => {
                const parts = id.split('_');
                return parseInt(parts[parts.length - 1]) || 0;
            };
            return getTimestamp(b.id) - getTimestamp(a.id); // Terbaru ke terlama
        });

        // 3. Render ke tabel dengan pencegahan XSS sederhana pada data teks
        tableBody.innerHTML = riwayatArray.map(item => {
            const isOut = item.tipe?.trim().toUpperCase() === "OUT";
            
            // Logika format tanggal ke dd-mm-yyyy
            let tglDisplay = item.tanggal ? String(item.tanggal) : '-';
            if (tglDisplay.includes('-') && tglDisplay.split('-')[0].length === 4) {
                const parts = tglDisplay.split('-');
                tglDisplay = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            
            const safeKode = String(item.kode || '-').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeTipe = String(item.tipe || '-').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeExpired = String(item.expired || '-').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeQty = parseInt(item.qty) || 0;

            return `
                <tr class="hover:bg-slate-50 border-b border-slate-50 text-center">
                    <td class="py-1 px-2 text-slate-400 text-[12px] truncate">${tglDisplay}</td>
                    <td class="py-1 px-1">
                        <span class="${isOut ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'} text-[12px] px-1.5 rounded font-bold uppercase">
                            ${safeTipe}
                        </span>
                    </td>
                    <td class="py-1 px-1 font-bold text-slate-900 text-[12px]">${safeKode}</td>
                    <td class="py-1 px-1 text-[12px]">${safeQty}</td>
                    <td class="py-1 px-1 text-slate-800 text-[12px]">${safeExpired}</td>
                </tr>
            `;
        }).join('');
        
    } catch (e) {
        console.error("Gagal memuat riwayat:", e);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500 text-[12px]">Gagal memuat data</td></tr>`;
    }
};

/**
 * Fungsi untuk mengambil data dari Firebase dan merender ke tabel
 * Nama fungsi: renderTabelBarangLebih
 */
window.renderTabelBarangLebih = async function() {
    console.log("Memuat rekap barang lebih...");
    const tbody = document.getElementById('bl_table_rekap');
    if (!tbody) return;
    
    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

    try {
        // 1. Ambil data dari Firebase
        const response = await fetch(`${FIREBASE_URL}stok_lebih.json`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // 2. Bersihkan tabel
        tbody.innerHTML = ''; 

        // 3. Validasi jika data kosong
        if (!data || Object.keys(data).length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-slate-400 text-[15px]">Belum ada data stok barang lebih</td></tr>`;
            return;
        }

        // 4. Proses dan filter data (qty > 0)
        const listBarang = Object.entries(data).map(([kode, val]) => ({
            kode,
            ...val
        })).filter(item => parseInt(item.qty) > 0);

        if (listBarang.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-slate-400 text-[15px]">Stok kosong</td></tr>`;
            return;
        }

        // 5. Render ke tabel dengan pengamanan string
        tbody.innerHTML = listBarang.map((item, index) => {
            const safeKode = String(item.kode || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeQty = parseInt(item.qty) || 0;
            const safeExpLama = String(item.exp_lama || '-').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeExpBaru = String(item.exp_baru || '-').replace(/</g, "&lt;").replace(/>/g, "&gt;");

            return `
                <tr class="hover:bg-slate-50 border-b border-slate-50 text-[15px]">
                    <td class="py-2 px-2 text-center text-slate-500">${index + 1}</td>
                    <td class="py-2 px-2 font-bold text-slate-900">${safeKode}</td>
                    <td class="py-2 px-2 text-center font-bold text-blue-600">${safeQty}</td>
                    <td class="py-2 px-2 text-center text-slate-500">${safeExpLama}</td>
                    <td class="py-2 px-2 text-center font-medium text-emerald-600">${safeExpBaru}</td>
                </tr>
            `;
        }).join('');

        console.log("Tabel barang lebih berhasil diperbarui.");

    } catch (e) {
        console.error("Gagal memuat rekap barang lebih:", e);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500 text-[15px]">Gagal memuat data</td></tr>`;
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

// Fungsi Memetakan Data ke 3 Panel (Plus, Minus, & QA) Berdasarkan Tanggal Aktif
function muatDataPanelTukarFisik() {
    const containerPlus = document.getElementById('container-list-plus');
    const containerMinus = document.getElementById('container-list-minus');
    const selectAsalPlus = document.getElementById('select-asal-plus');
    const selectTujuanMinus = document.getElementById('select-tujuan-minus');

    containerPlus.innerHTML = '';
    containerMinus.innerHTML = '';
    selectAsalPlus.innerHTML = '<option value="">-- Pilih Stok Lebih (+) --</option>';
    selectTujuanMinus.innerHTML = '<option value="">-- Pilih Target Kurang (-) --</option>';

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

    // Akses data stok terkini yang tersimpan di window atau dari variabel global
    if (typeof window.currentStokData !== 'undefined' && window.currentStokData !== null) {
        // Cari key yang sesuai dengan tanggal aktif (misal: stokwh3_20260822)
        const keyAktif = Object.keys(window.currentStokData).find(k => k.includes(`stokwh3_${tanggalAktif}`));
        
        if (keyAktif && window.currentStokData[keyAktif]) {
            const dailyData = window.currentStokData[keyAktif];

            Object.entries(dailyData).forEach(([kode, item]) => {
                const bosnet = parseInt(item.bosnet) || 0;
                const blok = parseInt(item.blok) || 0;
                const beceran = parseInt(item.beceran) || 0;
                const utuhan = parseInt(item.utuhan) || 0;
                
                // Hitung fisik sesuai aturan (PR-PKT vs Barang Biasa)
                const fisik = kode.includes("PR-PKT") ? (beceran + utuhan) : (blok + beceran + utuhan);
                const selisih = fisik - bosnet;

                const isPaket = kode.includes("PR-PKT");
                const satuan = isPaket ? "PKT" : "KRT";

                if (selisih > 0) {
                    countPlus++;
                    totalQtyPlus += selisih; // Tambahkan ke total akumulasi Qty Plus
                    
                    // Render ke Panel Stok Lebih (+)
                    containerPlus.innerHTML += `
                        <div class="p-2.5 text-xs bg-emerald-50/50 rounded-lg border border-emerald-100 flex justify-between items-center">
                            <div>
                                <b class="text-slate-700">${kode}</b>
                                <div class="text-emerald-700 font-bold mt-0.5">+${selisih} ${satuan}</div>
                            </div>
                            <span class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Sumber (+)</span>
                        </div>`;
                    
                    // Masukkan ke Dropdown Asal (+)
                    selectAsalPlus.innerHTML += `<option value="${kode}">${kode} (+${selisih} ${satuan})</option>`;
                } 
                else if (selisih < 0) {
                    countMinus++;
                    totalQtyMinus += Math.abs(selisih); // Tambahkan nilai absolut ke total akumulasi Qty Minus
                    
                    // Render ke Panel Stok Kurang (-)
                    containerMinus.innerHTML += `
                        <div class="p-2.5 text-xs bg-rose-50/50 rounded-lg border border-rose-100 flex justify-between items-center">
                            <div>
                                <b class="text-slate-700">${kode}</b>
                                <div class="text-rose-700 font-bold mt-0.5">${selisih} ${satuan}</div>
                            </div>
                            <span class="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold">Target (-)</span>
                        </div>`;
                    
                    // Masukkan ke Dropdown Tujuan (-)
                    selectTujuanMinus.innerHTML += `<option value="${kode}">${kode} (${selisih} ${satuan})</option>`;
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
    document.getElementById('badge-total-plus').innerText = `${countPlus} Item / + ${totalQtyPlus} krt`;
    document.getElementById('badge-total-minus').innerText = `${countMinus} Item / - ${totalQtyMinus} krt`;

    // Muat data Panel QA Manual serta masukkan ke opsi pilihan tujuan
    muatDataQaManual();
}

// Fungsi Helper untuk Mendapatkan Koneksi RTDB yang Pasti Berjalan
function getDbRef() {
    // Jika menggunakan Firebase Namespaced (v8 / compat) dengan URL spesifik
    if (typeof firebase !== 'undefined') {
        try {
            // Coba ambil instance berdasarkan URL RTDB Anda
            return firebase.database("https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/");
        } catch (e) {
            // Fallback ke default database jika sudah terinisialisasi
            if (typeof firebase.database === 'function') {
                return firebase.database();
            }
        }
    }
    
    // Jika variabel db global sudah berupa objek database reference ber-method .ref()
    if (typeof db !== 'undefined' && db && typeof db.ref === 'function') {
        return db;
    }
    
    if (typeof database !== 'undefined' && database && typeof database.ref === 'function') {
        return database;
    }

    throw new Error("Koneksi Firebase Realtime Database tidak ditemukan.");
}

// Fungsi Menampilkan / Mengelola Input Manual Stok QA
function muatDataQaManual() {
    const containerQa = document.getElementById('container-list-qa');
    const selectTujuanMinus = document.getElementById('select-tujuan-minus');
    
    if (!containerQa) return;

    containerQa.innerHTML = `
        <div class="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <div class="text-[10px] font-bold text-amber-900 mb-1">Tambah Stok QA Manual (Sistem Bonset):</div>
            <div class="flex gap-1.5">
                <input type="text" id="input-kode-qa" placeholder="Kode Barang" class="w-1/2 text-xs text-slate-700 bg-white border border-amber-300 rounded px-2 py-1 uppercase">
                <input type="number" id="input-qty-qa" placeholder="Qty (-)" class="w-1/4 text-xs text-slate-700 bg-white border border-amber-300 rounded px-2 py-1" value="-1">
                <button onclick="tambahDataQaManual()" class="w-1/4 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded px-2 py-1">Tambah</button>
            </div>
        </div>
        <div id="list-item-qa" class="space-y-2"></div>
    `;

    const listItemQa = document.getElementById('list-item-qa');

    try {
        const dbConn = getDbRef();
        dbConn.ref('stok_tukar/qa_manual').once('value').then((snapshot) => {
            const dataQaObj = snapshot.val() || {};
            const keys = Object.keys(dataQaObj);
            listItemQa.innerHTML = '';
            
            let totalQtyQa = 0; 
            let countItem = 0;

            if (keys.length === 0) {
                listItemQa.innerHTML = `<div class="text-center text-[10px] text-slate-400 py-2">Belum ada data QA manual.</div>`;
            } else {
                keys.forEach((key) => {
                    const item = dataQaObj[key];
                    countItem++;
                    const qtyVal = parseInt(item.qty) || 0;
                    totalQtyQa += Math.abs(qtyVal);

                    listItemQa.innerHTML += `
                        <div class="p-2 text-xs bg-amber-50/50 rounded-lg border border-amber-100 flex justify-between items-center">
                            <div>
                                <b class="text-slate-700">${item.kode}</b>
                                <div class="text-amber-700 font-bold mt-0.5">QA (${item.qty})</div>
                            </div>
                            <button onclick="hapusDataQaManual('${key}')" class="text-red-500 hover:text-red-700 text-[10px] font-bold px-1.5 py-0.5">Hapus</button>
                        </div>`;
                    
                    if (selectTujuanMinus) {
                        selectTujuanMinus.innerHTML += `<option value="${item.kode}">[QA] ${item.kode} (${item.qty})</option>`;
                    }
                });
            }

            const badgeQa = document.getElementById('badge-total-qa');
            if (badgeQa) {
                badgeQa.innerText = `${countItem} Item / -${totalQtyQa} krt`;
            }
        }).catch((err) => {
            console.error("Gagal membaca database QA:", err);
        });
    } catch (e) {
        console.error("Error getDbRef:", e.message);
    }
}

// Fungsi Tambah QA Manual ke RTDB dengan Key Kustom (Kode_Timestamp)
function tambahDataQaManual() {
    const kode = document.getElementById('input-kode-qa').value.trim().toUpperCase();
    const qty = document.getElementById('input-qty-qa').value;
    
    if (!kode) {
        if (typeof miuiAlert === 'function') miuiAlert("Masukkan kode barang QA terlebih dahulu!");
        else alert("Masukkan kode barang QA terlebih dahulu!");
        return;
    }

    const timestamp = Date.now();
    // Membuat key custom yang mudah dibaca: KODE_TIMESTAMP (spasi/karakter khusus diganti underscore)
    const safeKode = kode.replace(/[^a-zA-Z0-9]/g, '_');
    const customKey = `${safeKode}_${timestamp}`;

    try {
        const dbConn = getDbRef();
        dbConn.ref('stok_tukar/qa_manual/' + customKey).set({
            kode: kode,
            qty: parseInt(qty) || -1,
            timestamp: timestamp
        }).then(() => {
            // Bersihkan input setelah berhasil
            const inputKode = document.getElementById('input-kode-qa');
            if (inputKode) inputKode.value = '';

            if (typeof muatDataPanelTukarFisik === 'function') {
                muatDataPanelTukarFisik();
            } else {
                muatDataQaManual();
            }
        }).catch((error) => {
            if (typeof miuiAlert === 'function') miuiAlert("Gagal menyimpan data QA: " + error.message);
            else alert("Gagal menyimpan data QA: " + error.message);
        });
    } catch (e) {
       miuiAlert(e.message);
    }
}

// Fungsi Hapus QA Manual dari RTDB berdasarkan Key Kustom
function hapusDataQaManual(firebaseKey) {
    if (confirm("Yakin ingin menghapus data QA manual ini?")) {
        try {
            const dbConn = getDbRef();
            dbConn.ref('stok_tukar/qa_manual/' + firebaseKey).remove().then(() => {
                if (typeof muatDataPanelTukarFisik === 'function') {
                    muatDataPanelTukarFisik();
                } else {
                    muatDataQaManual();
                }
            }).catch((error) => {
                if (typeof miuiAlert === 'function') miuiAlert("Gagal menghapus data: " + error.message);
                else alert("Gagal menghapus data: " + error.message);
            });
        } catch (e) {
            miuiAlert(e.message);
        }
    }
}

async function sinkronisasiDatabaseStokWH3(kodeAsal, kodeTujuan) {
    try {
        const dbConn = getDbRef();
        
        let tanggalAktif = "20260824"; 
        const dateInput = document.getElementById('select-tanggal-wh3');
        if (dateInput && dateInput.value) {
            let cleanVal = dateInput.value.replace(/[^0-9]/g, '');
            if (cleanVal.length === 8) {
                tanggalAktif = cleanVal;
            }
        }

        const namaNodeTanggal = `stokwh3_${tanggalAktif}`;
        const refStokTanggal = dbConn.ref(`stok_wh3/${namaNodeTanggal}`);

        const snapshot = await refStokTanggal.once('value');
        const dataStok = snapshot.val();

        if (!dataStok) {
            console.error(`Node stok_wh3/${namaNodeTanggal} tidak ditemukan di database!`);
            return;
        }

        // 1. Kurangi Qty Beceran Barang Asal (+) karena fisik diambil untuk pertukaran
        if (dataStok[kodeAsal]) {
            let beceranAsal = Number(dataStok[kodeAsal].beceran || 0);
            beceranAsal = Math.max(0, beceranAsal - 1);
            await refStokTanggal.child(`${kodeAsal}/beceran`).set(beceranAsal);
            console.log(`Beceran barang asal (+) ${kodeAsal} dikurangi menjadi: ${beceranAsal}`);
        }

        // 2. Tambah Bosnet Barang Tujuan (- / QA) di Tabel Utama
        if (dataStok[kodeTujuan]) {
            let bosnetTujuan = Number(dataStok[kodeTujuan].bosnet || 0);
            bosnetTujuan += 1;
            await refStokTanggal.child(`${kodeTujuan}/bosnet`).set(bosnetTujuan);
            console.log(`Bosnet barang tujuan (-) ${kodeTujuan} ditambah menjadi: ${bosnetTujuan}`);
        } else {
            const dataBaruTujuan = {
                bosnet: 1,
                beceran: 0,
                blok: 0,
                kode: kodeTujuan,
                nama: kodeTujuan,
                detail_rak: {
                    keterangan: "HASIL TUKAR FISIK",
                    kode: kodeTujuan
                }
            };
            await refStokTanggal.child(kodeTujuan).set(dataBaruTujuan);
            console.log(`Barang tujuan ${kodeTujuan} belum ada, dibuat baru dengan bosnet: 1`);
        }

        // 3. Hapus data dari stok_tukar/qa_manual jika kode tersebut ada di dalamnya
        const refQaManual = dbConn.ref('stok_tukar/qa_manual');
        const snapQa = await refQaManual.once('value');
        const dataQa = snapQa.val();
        
        if (dataQa) {
            Object.keys(dataQa).forEach(async (key) => {
                let item = dataQa[key];
                if (key.startsWith(kodeAsal) || key.startsWith(kodeTujuan) || item.kode === kodeAsal || item.kode === kodeTujuan) {
                    await dbConn.ref(`stok_tukar/qa_manual/${key}`).remove();
                    console.log(`Berhasil membersihkan data QA manual untuk: ${key}`);
                }
            });
        }

        // Refresh tampilan panel dan tabel
        if (typeof muatDataStokWH3 === 'function') muatDataStokWH3();
        if (typeof muatDataPanelTukarFisik === 'function') muatDataPanelTukarFisik();

    } catch (error) {
        console.error("Error saat sinkronisasi database stok WH-3:", error);
    }
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
        if (typeof miuiAlert === 'function') miuiAlert("Mohon isi keterangan / lokasi rak (Contoh: Ambil Rak 14 A 24)!");
        else alert("Mohon isi keterangan / lokasi rak (Contoh: Ambil Rak 14 A 24)!");
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
        // 1. Simpan Riwayat Tukar ke RTDB
        dbConn.ref('stok_tukar/riwayat/' + customKey).set(dataBaru).then(() => {
            // 2. Jalankan Sinkronisasi Stok RTDB Tanggal Aktif
            if (typeof sinkronisasiDatabaseStokWH3 === 'function') {
                sinkronisasiDatabaseStokWH3(asalPlus, tujuanMinus);
            }

            if (typeof miuiAlert === 'function') miuiAlert("Pertukaran fisik berhasil diproses dan disinkronkan dengan database utama!");
            else alert("Pertukaran fisik berhasil diproses dan disinkronkan dengan database utama!");
            
            // Bersihkan input keterangan
            document.getElementById('input-keterangan-rak').value = '';
            
            // 3. UPDATE / REFRESH OTOMATIS PANEL ATAS DAN TABEL RIWAYAT
            if (typeof muatDataPanelTukarFisik === 'function') {
                muatDataPanelTukarFisik();
            }
            if (typeof renderTabelRiwayatTukar === 'function') {
                renderTabelRiwayatTukar();
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