// Tambahkan ini di setiap file JS (main.js, stokwh.js, dll) 
// agar status bar selalu ter-update
const statusBar = document.getElementById('print-status-bar');
if (!statusBar) {
    console.log("Status bar tidak ditemukan, mungkin Anda sedang di halaman lain?");
}

// URL Database Firebase
const DB_FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

// Fungsi untuk memperbarui status bar
document.addEventListener('DOMContentLoaded', async () => {
    initApp();
});

async function initApp() {
    console.log("Aplikasi dimuat, menginisialisasi dropdown...");
    
    // 1. Inisialisasi Rekap (Default saat buka aplikasi)
    await initDropdownsRekap();
    
    // 2. Inisialisasi lainnya
    await initDropdowns();
    await initDropdownsWH3();
    
    console.log("Semua dropdown berhasil diinisialisasi.");
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
        gantiModeRekap(moderekap); // Pastikan mode rekap diatur sesuai
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
        console.error("Error pengecekan:", error);
        miuiAlert("Gagal mengecek data server.");
    }
}

async function prosesUploadWH3() {
    console.log("Tombol upload WH-3 ditekan!"); 
    const fileInput = document.getElementById('file-input-wh3');
    const files = fileInput.files;
    
    if (files.length === 0) {
        miuiAlert("Harap pilih file Excel (Bosnet)!");
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
        miuiAlert("Format nama file harus mengandung 'Stock_YYYYMMDD'!");
        return;
    }

    // URL Firebase untuk WH-3
    const uniqueId = `stokwh3_${tgl}`;
    const url = `${DB_FIREBASE_URL}stok_wh3/${uniqueId}.json`;
    
    try {
        const checkResponse = await fetch(url);
        const existingData = await checkResponse.json();
        const isUpdate = existingData !== null;

        if (isUpdate) {
            miuiConfirm(
                "Data audit untuk tanggal tersebut sudah ada. Apakah Anda ingin meng-UPDATE data?",
                () => eksekusiUploadWH3(fileBosnet, url, true),
                () => console.log("Upload wh3 dibatalkan.")
            );
        } else {
            eksekusiUploadWH3(fileBosnet, url, false);
        }

    } catch (error) {
        console.error("Error pengecekan:", error);
        miuiAlert("Gagal mengecek data server.");
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
            miuiAlert("Gagal menyimpan data WH-2 ke server.");
        }

    } catch (error) {
        console.error("Terjadi error detail:", error);
        miuiAlert("Terjadi kesalahan saat memproses data WH-2: " + error.message);
    }
}

async function eksekusiUploadWH3(fileBosnet, url, isUpdate) {
    try {
        console.log("Memproses data WH-3 dan mengambil stok blok terkini...");
        const dataBosnet = await bacaExcelDinamis(fileBosnet, "Produk");
        
        // 1. Ambil data Stok Blok terbaru dari Firebase
        const resBlok = await fetch(`https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_blok.json`);
        const dataBlokFirebase = await resBlok.json() || {};
        
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
        const responseLama = await fetch(url);
        const dataLama = await responseLama.json() || {};

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

        // 4. Upload ke Firebase
        await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(stokAudit)
        });

        miuiAlert("Data WH-3 berhasil disimpan!");
        tutupModalUploadWH3();
        resetFileInputwh3();
        isDropdownInitializedWH3 = false; 
        await initDropdownsWH3(); 
    } catch (error) {
        console.error("Error:", error);
        miuiAlert("Gagal memproses file: " + error.message);
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

    try {
        const responserekap = await fetch(`${DB_FIREBASE_URL}${sourceFile}`);
        const allDatarekap = await responserekap.json();

        // A. Handling untuk Barang Lebih
        if (moderekap === 'BARANG_LEBIH') {
            await window.renderTabelBarangLebih(); // Panggil fungsi khusus
            return; // PENTING: Berhenti di sini agar tidak memanggil renderTabelRekap
        }

        // B. Handling untuk Selisih WH3
        if (moderekap === 'SELISIH_WH3') {
            await renderSelisihWH3(allDatarekap); // Panggil fungsi khusus
            return; // PENTING: Berhenti di sini
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
        console.error("Gagal memuat data:", error);
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
    
    try {
        const response = await fetch(`${DB_FIREBASE_URL}stok_wh2.json`);
        const allData = await response.json();
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
        console.error("Gagal load data:", error);
    }
}

// Variabel penyimpan referensi listener agar tidak menumpuk
let wh3DataListener = null;

function loadStokDatawh3() {
    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value : null;

    if (!tanggal) return;

    // Tentukan mode secara paksa dari DOM
    const radioChecked = document.querySelector('input[name="rb-mode-wh3"]:checked');
    const mode = radioChecked ? radioChecked.value : "STOK WH-3";
    
    const formattedDate = tanggal.replace(/-/g, '');
    
    // Path referensi spesifik ke database Firebase Anda
    const dbRef = firebase.database().ref(`stok_wh3`);

    // Hapus listener sebelumnya jika ada (agar tidak terjadi duplikasi event saat ganti tanggal)
    if (wh3DataListener) {
        dbRef.off('value', wh3DataListener);
    }

    // Pasang onValue: Hanya berjalan otomatis saat Firebase mendeteksi adanya data masuk/berubah
    wh3DataListener = dbRef.on('value', (snapshot) => {
        const allData = snapshot.val();
        window.currentStokData = allData;
        
        if (!allData) {
            tampilkanKosongwh3(tanggal);
            return;
        }

        const key = Object.keys(allData).find(k => k.includes(`stokwh3_${formattedDate}`));
        
        if (!key) {
            tampilkanKosongwh3(tanggal);
            return;
        }

        // Render tabel otomatis seketika saat ada perubahan data di server
        renderTabelwh3(allData[key], mode, key);
        console.log("Data diperbarui secara real-time dari Firebase.");
    }, (error) => {
        console.error("Gagal mendengarkan perubahan data:", error);
    });
}



async function renderTabelRekap(dataStok, mode) {
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
    Object.entries(dataStok).forEach(([kode, item]) => {
        let row = `<tr><td class="py-2 px-3">${i++}</td><td>${kode}</td>`;

        if (mode.includes('WH2')) {
            let b = mode === 'WH2_SEBELUM' ? (item.stokwh2_sebelum || 0) : (item.stokwh2_sesudah || 0);
            let w = mode === 'WH2_SEBELUM' ? (item.stokwms_sebelum || 0) : (item.stokwms_sesudah || 0);
            row += `<td>${b}</td><td>${w}</td><td>${b - w}</td><td>${(b - w) === 0 ? 'SESUAI' : 'SELISIH'}</td>`;
        } else if (mode === 'STOK_WH3') {
            row += `<td>${item.blok||'-'}</td><td>${item.bosnet||0}</td><td>${item.pak||0}</td><td>${item.beceran||0}</td><td>${item.utuhan||0}</td><td>${item.total||0}</td><td>${item.selisih||0}</td><td>${item.keterangan||'-'}</td>`;
        }

        tbody.innerHTML += row + `</tr>`;
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

function tampilkanKosongRekap(tanggal) {
    const tbody = document.getElementById('tabel-body-rekap');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-slate-400">Data untuk tanggal ${tanggal} tidak ditemukan.</td></tr>`;
    }
}


async function getAgregatStokBlok() {
    try {
        const response = await fetch(`${DB_FIREBASE_URL}stok_blok.json`);
        const dataBlok = await response.json();
        const agregat = {};

        if (!dataBlok) return agregat;

        // Loop melalui setiap blok
        Object.values(dataBlok).forEach(blokItem => {
            // Loop melalui setiap kode di dalam blok
            Object.entries(blokItem).forEach(([kode, dataTanggal]) => {
                // Iterasi setiap entry tanggal di bawah kode tersebut
                Object.values(dataTanggal).forEach(detail => {
                    const krt = parseInt(detail.krt) || 0;
                    if (!agregat[kode]) agregat[kode] = 0;
                    agregat[kode] += krt;
                });
            });
        });
        return agregat;
    } catch (error) {
        console.error("Gagal agregasi stok blok:", error);
        return {};
    }
}

// Pastikan ini dipanggil saat aplikasi dimuat agar data QTY tersedia
async function loadMasterBarang() {
    try {
        console.log("Mulai memuat master barang...");
        const res = await fetch("https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/master_barang.json");
        
        if (!res.ok) throw new Error("Gagal mengambil data dari server");
        
        window.masterData = await res.json(); 
        
        if (window.masterData) {
            console.log("Master data berhasil dimuat. Jumlah item:", Object.keys(window.masterData).length);
        } else {
            console.warn("Master data kosong atau tidak ditemukan.");
        }
    } catch (error) {
        console.error("Error memuat master barang:", error);
    }
}

async function renderTabelwh3(dataStok, mode, key) {
    const tbody = document.getElementById('tabel-body-wh3');
    if (!tbody) return;

    window.dataStokTerkini = dataStok;

    // Fetch master_barang
    const response = await fetch("https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/master_barang.json");
    const masterBarang = await response.json() || {};

    tbody.innerHTML = "";
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
    
    // ... (getVarianScore dan getAngkaAkhir tetap sama) ...
    const getVarianScore = (kode) => {
        kode = kode.toUpperCase();
        if (kode.includes("ZC")) return 1;
        if (kode.includes("SSL")) return 2;
        if (kode.includes("SLO")) return 3;
        if (kode.includes("TDS")) return 4;
        if (kode.includes("BAG")) return 5;
        if (kode.includes("WRG")) return 6;
        if (kode.includes("GTG")) return 7;
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
        const beceran = parseInt(item.beceran) || 0;
        const utuhan = parseInt(item.utuhan) || 0;
        
        // PERBAIKAN: Sertakan beceran + utuhan untuk PR-PKT
        let fisik = kode.includes("PR-PKT") ? (beceran + utuhan) : (blok + beceran + utuhan);
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
        let totalFisik = kode.includes("PR-PKT") ? (beceran + utuhan) : (blok + beceran + utuhan);
        const selisih = totalFisik - bosnet;
        
        // Tentukan Satuan otomatis (PKT untuk paket, KRT untuk barang biasa)
        const isPaket = kode.includes("PR-PKT");
        const satuan = isPaket ? "PKT" : "KRT";

        // BUAT KETERANGAN OTOMATIS SECARA DINAMIS BERDASARKAN SELISIH
        let keterangan = "SESUAI";
        if (selisih > 0) {
            keterangan = `STOK LEBIH ${selisih} ${satuan}`;
        } else if (selisih < 0) {
            keterangan = `STOK KURANG ${Math.abs(selisih)} ${satuan}`;
        }
        
        let kelasWarnaSelisih = selisih > 0 ? "text-blue-600 font-bold" : (selisih < 0 ? "text-red-600 font-bold" : "text-green-600 font-bold");
        let warnaKet = selisih > 0 ? "text-blue-600 font-bold" : (selisih < 0 ? "text-red-600 font-bold" : "text-green-600 font-bold");

        const btnInputRak = `<button onclick="bukaModalInputRak('${kode}')" class="mr-2 text-blue-500 hover:text-blue-700">✏️</button>`;
        const btnLihatRak = `<button onclick="bukaModalLihatRak('${kode}', event)" class="mr-2 text-green-500 hover:text-green-700">👁️</button>`;
        const btnEditKet = `<button onclick="bukaModalEditKeterangan('${kode}', '${keterangan === "-" ? "" : keterangan}')" class="mr-2 text-yellow-600 hover:text-yellow-800">📝</button>`;

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 border-b text-[15px]">
                <td class="py-2 px-2">${no++}</td>
                <td class="py-2 px-2 font-bold">${kode}</td>
                <td class="py-2 px-2">${f(blok)}</td>
                <td class="py-2 px-2">${f(bosnet)}</td>
                <td class="py-2 px-2">${pak}</td>
                <td class="py-2 px-2 whitespace-nowrap">${btnInputRak}<span>${f(beceran)}</span></td>
                <td class="py-2 px-2 whitespace-nowrap">${btnLihatRak}<span>${f(utuhan)}</span></td>
                <td class="py-2 px-2 font-bold">${f(totalFisik)}</td>
                <td class="py-2 px-2 ${kelasWarnaSelisih}">${selisih === 0 ? "-" : selisih.toLocaleString()}</td>
                <td class="py-2 px-2 whitespace-nowrap">${btnEditKet}<span class="${warnaKet} font-medium">${keterangan}</span></td>
            </tr>
        `;
    });
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

    // --- SORTIR DATA (Agar sinkron dengan Tabel Stok) ---
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

    const sortedEntries = Object.entries(dataStok).sort((a, b) => {
        const sA = getSortScore(a[0]), sB = getSortScore(b[0]);
        if (sA !== sB) return sA - sB;
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

async function renderSelisihWH3(allData) {
    const thead = document.getElementById('thead-selisih-wh3');
    const tbody = document.getElementById('tabel-body-selisih-wh3');
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
        return 0;
    };
    const getAngkaAkhir = (kode) => {
        const match = kode.match(/\d+/g);
        return match ? parseInt(match.join('').slice(-4)) || 999 : 999;
    };

    // --- PROSES DATA ---
    const dates = Object.keys(allData)
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
            const fisik = kode.includes("PR-PKT") ? (beceran + utuhan) : (blok + beceran + utuhan);
            const selisih = fisik - bosnet;
            
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
            const val = dataMatriks[kode][tgl] || 0;
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
        utuhanVal = jumlahKarton * qtyPerRak;
    } else {
        const rakArray = rakUtuhanVal.split('+').filter(r => r.trim() !== "");
        utuhanVal = rakArray.length * qtyPerRak;
    }

    // 3. Kalkulasi Total & Selisih menggunakan angka murni `beceranVal`
    const dataHarian = window.currentStokData[`stokwh3_${tanggal}`];
    const item = dataHarian ? dataHarian[kode] : null;
    
    if (!item) {
        console.error("Data tidak ditemukan");
        return;
    }

    const totalVal = (parseInt(item.blok) || 0) + beceranVal + utuhanVal;
    const selisihVal = totalVal - (parseInt(item.bosnet) || 0);

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
        tutupModalRak();
        loadStokDatawh3();
    } catch (error) {
        console.error("Gagal menyimpan:", error);
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

// Live Search / Autocomplete Kode dari Data Stok WH-3 yang tampil di tabel
function filterSaranKodeHP(keyword) {
    const container = document.getElementById('hp-saran-container');
    if (!container) return;

    if (!keyword || keyword.trim() === '') {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    // Ambil daftar kode unik secara otomatis dari baris tabel Stok WH-3 yang sedang aktif dilayar
    const listKodeSet = new Set();
    const rows = document.querySelectorAll('tr'); // Atau sesuaikan selector tabel WH-3 Anda
    rows.forEach(row => {
        const kodeCell = row.cells ? row.cells[1] : null; // Asumsi kolom Kode ada di kolom ke-2 (index 1)
        if (kodeCell && kodeCell.innerText.trim() !== '') {
            listKodeSet.add(kodeCell.innerText.trim());
        }
    });

    const listKode = Array.from(listKodeSet);
    const filtered = listKode.filter(item => item.toLowerCase().includes(keyword.toLowerCase()));

    if (filtered.length === 0) {
        container.style.display = 'none';
        return;
    }

    let html = '';
    filtered.slice(0, 10).forEach(kode => { // Batasi maksimal 10 saran agar tidak terlalu panjang
        html += `<div onclick="pilihKodeHP('${kode}')" style="padding:10px 12px; border-bottom:1px solid #eee; cursor:pointer; font-size:13px; color:#333;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='white'">${kode}</div>`;
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
    document.getElementById('hp-kode-barang').value = kode;
    document.getElementById('hp-saran-container').style.display = 'none';
    updateJudulModalHP();
}

// Fungsi Simpan Data Fisik dari HP
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

    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value.replace(/-/g, '') : null;
    if (!tanggal) {
        miuiAlert('Tanggal aktif tidak ditemukan!');
        return;
    }

    // Ambil data harian saat ini untuk item tersebut
    const dataHarian = window.currentStokData ? window.currentStokData[`stokwh3_${tanggal}`] : null;
    const item = dataHarian ? dataHarian[kode] : null;

    if (!item) {
        miuiAlert(`Data barang ${kode} tidak ditemukan pada tanggal ini!`);
        return;
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
            finalUtuhanVal = jumlahKarton * qtyPerRak;
        } else {
            const rakArray = finalRakUtuhan.split('+').filter(r => r.trim() !== "");
            finalUtuhanVal = rakArray.length * qtyPerRak;
        }
    }

    // 3. Kalkulasi Total Keseluruhan & Selisih
    const blokVal = parseInt(item.blok) || 0;
    const bosnetVal = parseInt(item.bosnet) || 0;
    const isPaket = kode.includes("PR-PKT");

    const totalVal = (isPaket ? 0 : blokVal) + finalBeceranVal + finalUtuhanVal;
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

    // 5. Kirim Pembaruan ke Firebase
    try {
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

        console.log("Data fisik HP berhasil disimpan:", { kode, finalBeceranVal, finalRakBeceran });
        
        // Tampilkan notifikasi sukses TANPA menutup modal
        //miuiAlert('Data berhasil disimpan! Silakan input data berikutnya.');

        // KOSONGKAN FORM INPUT (Reset input field agar siap untuk input berikutnya)
        const inputQtyBeceran = document.getElementById('hp-qty-beceran');
        const inputRakBeceran = document.getElementById('hp-rak-beceran');
        const inputRakUtuhan = document.getElementById('hp-rak-utuhan');

        if (inputQtyBeceran) inputQtyBeceran.value = '';
        if (inputRakBeceran) inputRakBeceran.value = '';
        if (inputRakUtuhan) inputRakUtuhan.value = '';
        if (kodeInputEl) kodeInputEl.value = '';

        // ---> TAMBAHKAN INI: RESET JUDUL KEMBALI KE SEMULA <---
        const modalTitleEl = document.getElementById('hp-modal-title');
        if (modalTitleEl) {
            modalTitleEl.innerText = "INPUT FISIK GUDANG (MOBILE)";
        }

    } catch (error) {
        console.error("Gagal menyimpan data fisik HP:", error);
        miuiAlert('Terjadi kesalahan saat menyimpan ke database.');
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

    console.log("Form input fisik HP berhasil di-reset.");
}

function updateJudulModalHP() {
    const modalTitleEl = document.getElementById('hp-modal-title'); 
    if (!modalTitleEl) return;

    const kodeInputEl = document.getElementById('hp-kode-barang');
    const kode = kodeInputEl ? kodeInputEl.value.trim().toUpperCase() : "";

    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value.replace(/-/g, '') : null;
    const dataHarian = window.currentStokData && tanggal ? window.currentStokData[`stokwh3_${tanggal}`] : null;

    // Cek apakah kode yang dimasukkan benar-benar ada/valid di data harian
    const item = dataHarian ? dataHarian[kode] : null;

    // Jika kode kosong atau belum ada persis di data harian (masih ketikan setengah-setengah), 
    // jangan tampilkan "Data tidak ditemukan", kembalikan saja ke judul default.
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

    modalTitleEl.innerText = `INPUT: ${kode} : ${selisih} ${satuan}`;
}

// Buka Modal Admin
function bukaModalAdmin(key, kode, bosnet, wms) {
    // Simpan data langsung dari parameter tombol
    window.tempAdjustData = { 
        key: key, 
        kode: kode, 
        bosnet: bosnet, 
        wms: wms 
    };

    // Buka modal admin
    document.getElementById('modal-admin-stok').classList.remove('hidden');
}

function tutupModalAdmin() {
    document.getElementById('modal-admin-stok').classList.add('hidden');
    document.getElementById('admin-pass').value = '';
}

// Cek Password (Ganti 'admin' dengan password Anda)
function cekAdmin() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === "admin") {
        document.getElementById('modal-admin-stok').classList.add('hidden');
        document.getElementById('admin-userid').value = '';
        document.getElementById('admin-pass').value = '';
        bukaModalAdjust(window.tempAdjustData);
    } else {
        miuiAlert("Password Salah! Anda tidak dizinkan mengakses menu ini!");
        document.getElementById('admin-pass').value = '';
        document.getElementById('admin-userid').value = ''; // Reset input agar tidak bisa ditebak
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

// Simpan ke Firebase
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

    try {
        const response = await fetch(`${DB_FIREBASE_URL}stok_wh2/stokwh2wms_${tanggal}/${kode}.json`, {
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
        console.error("Error:", e);
        miuiAlert("Gagal update stok");
    }
}

// Fungsi untuk membuka modal
function bukaModalEditKeterangan(kode, ketLama) {
    window.currentKode = kode; // Menyimpan kode yang sedang diedit
    const inputKet = document.getElementById('inputKeterangan');
    inputKet.value = ketLama === "-" ? "" : ketLama; // Jika "-" kosongkan agar tidak ikut tersimpan
    document.getElementById('modalEditKet').classList.remove('hidden');
}

// Fungsi untuk menyimpan perubahan ke Firebase
async function simpanKeteranganManual() {
    const kode = window.currentKode;
    const ketBaru = document.getElementById('inputKeterangan').value.toUpperCase();
    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value.replace(/-/g, '') : null;

    if (!tanggal) return;

    const url = `https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_wh3/stokwh3_${tanggal}/${kode}.json`;

    try {
        // Hanya update field keterangan saja
        await fetch(url, {
            method: "PATCH",
            body: JSON.stringify({ keterangan: ketBaru || "OK" })
        });

        console.log("Keterangan berhasil diupdate");
        document.getElementById('modalEditKet').classList.add('hidden');
        
        // Refresh tampilan tabel
        loadStokDatawh3(); 
    } catch (error) {
        console.error("Gagal menyimpan keterangan:", error);
        alert("Gagal menyimpan keterangan!");
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

        // Konversi ke objek Date untuk mendapatkan nama hari berdasarkan tanggal yang dipilih
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

        // --- 3. POLA SORTIR DATA ---
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

    // 2. Panggil fungsi data
    await window.bl_loadDropdownBarang();
    window.bl_loadDropdownBarang(); // Panggil di sini agar data sudah tersedia

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
            opt.value = item.KODE_BARANG || item.key;
            // Tampilan: KODE_BARANG - NAMA_BARANG (bisa disesuaikan jika ingin format lain)
            opt.textContent = `${item.KODE_BARANG || "-"} | ${item.NAMA_BARANG || item.key}`;
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
        // Panggil langsung ke stok_lebih.json
        const response = await fetch(`${FIREBASE_URL}stok_lebih.json`);
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
                opt.textContent = `${item.kode} (Qty: ${item.totalQty})`;
                dropdown.appendChild(opt);
            });
            // Panggil setup autofill expired setelah dropdown terisi
            setupAutofillExpired_bl();
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

    selectKode.addEventListener('change', async () => {
        const selectedKode = selectKode.value;
        if (!selectedKode) return;

        const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
        
        try {
            // Ambil data stok barang yang dipilih
            const response = await fetch(`${FIREBASE_URL}stok_lebih/${selectedKode}.json`);
            const data = await response.json();

            if (data && data.exp_baru) {
                // Isi otomatis input expired dengan data dari Firebase
                inputExpired.value = data.exp_baru;
            } else {
                inputExpired.value = "-"; // Default jika tidak ada data
            }
        } catch (e) {
            console.error("Gagal mengambil data untuk autofill:", e);
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

        // Tambahkan ini: Load data untuk KELUAR
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

        // Tambahkan ini: Load data untuk MASUK
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

    try {
        const response = await fetch(path);
        let currentData = await response.json() || { qty: 0, exp_baru: "-", exp_lama: "-" };

        let updatePayload = {
            last_updated: new Date().toISOString()
        };

        if (data.tipe === 'IN') {
            // LOGIKA ROLLING EXPIRY
            if (data.expired === currentData.exp_baru) {
                // Kasus 1: Expired sama, cukup tambah Qty
                updatePayload.qty = (parseInt(currentData.qty) || 0) + parseInt(data.qty);
                updatePayload.exp_lama = currentData.exp_lama;
                updatePayload.exp_baru = currentData.exp_baru;
            } else {
                // Kasus 2: Expired berbeda (Rolling), pindahkan exp_baru ke exp_lama
                updatePayload.qty = parseInt(data.qty); // Qty jadi qty baru
                updatePayload.exp_lama = currentData.exp_baru || "-";
                updatePayload.exp_baru = data.expired;
            }
        } else {
            // Mode OUT: Kurangi qty seperti biasa
            updatePayload.qty = Math.max(0, (parseInt(currentData.qty) || 0) - parseInt(data.qty));
            updatePayload.exp_lama = currentData.exp_lama;
            updatePayload.exp_baru = currentData.exp_baru;
        }

        // Gunakan PATCH agar field yang tidak diupdate tidak hilang
        await fetch(path, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
        });
        
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
        console.error("Gagal menyimpan transaksi:", e);
        miuiAlert("Terjadi kesalahan sistem saat menyimpan.", "error");
    }
}

// Nama fungsi menggunakan prefix bl_ agar unik
window.bl_renderRiwayat = async function() {
    const tableBody = document.getElementById('bl_table_riwayat'); 
    if (!tableBody) return;

    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
    
    try {
        const response = await fetch(`${FIREBASE_URL}log_barang_lebih.json`);
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
                return parseInt(parts[parts.length - 1]);
            };
            return getTimestamp(b.id) - getTimestamp(a.id); // Terbaru ke terlama
        });

        // 3. Render ke tabel
        tableBody.innerHTML = riwayatArray.map(item => {
            const isOut = item.tipe?.trim().toUpperCase() === "OUT";
            
            // Logika format tanggal ke dd-mm-yyyy
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

        // 5. Render ke tabel
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

        console.log("Tabel barang lebih berhasil diperbarui.");

    } catch (e) {
        console.error("Gagal memuat rekap barang lebih:", e);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500 text-[15px]">Gagal memuat data</td></tr>`;
    }
};

let html5QrCodeHP = null;
let targetScanField = null; // 'beceran' atau 'utuhan'

function bukaScannerQRHP(jenis) {
    console.log("Membuka scanner QR untuk:", jenis);
    // Cek apakah library Html5Qrcode sudah benar-benar termuat
    if (typeof Html5Qrcode === 'undefined') {
        miuiAlert("Pustaka QR Scanner (html5-qrcode) belum/gagal dimuat. Periksa koneksi internet Anda.");
        return;
    }

    targetScanField = jenis;
    document.getElementById('modalScannerQR').style.display = 'flex';

    if (!html5QrCodeHP) {
        html5QrCodeHP = new Html5Qrcode("reader-qr-hp");
    }

    html5QrCodeHP.start(
        { facingMode: "environment" }, 
        {
            fps: 10,
            qrbox: { width: 220, height: 220 }
        },
        (decodedText, decodedResult) => {
            const hasilScan = decodedText.trim().toUpperCase();
            if (targetScanField === 'beceran') {
                document.getElementById('hp-rak-beceran').value = hasilScan;
            } else if (targetScanField === 'utuhan') {
                document.getElementById('hp-rak-utuhan').value = hasilScan;
            }
            tutupScannerQRHP();
        },
        (errorMessage) => {
            // Error scanning diabaikan
        }
    ).catch(err => {
        miuiAlert("Gagal membuka kamera scanner: " + err);
        tutupScannerQRHP();
    });
}

function tutupScannerQRHP() {
    if (html5QrCodeHP) {
        html5QrCodeHP.stop().then(() => {
            document.getElementById('modalScannerQR').style.display = 'none';
        }).catch(err => {
            document.getElementById('modalScannerQR').style.display = 'none';
        });
    } else {
        document.getElementById('modalScannerQR').style.display = 'none';
    }
}