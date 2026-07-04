// Tambahkan ini di setiap file JS (main.js, stokwh.js, dll) 
// agar status bar selalu ter-update
const statusBar = document.getElementById('print-status-bar');
if (!statusBar) {
    console.log("Status bar tidak ditemukan, mungkin Anda sedang di halaman lain?");
}

// Fungsi ganti switch mode Stok WH (REKAP, WH-2, WH-3, LEBIH) dengan efek geser slider
window.gantiModulStokWH = function(mode) {
    const slider = document.getElementById('slider-content-stokwh');
    
    // Logika pergeseran slider untuk 4 kolom (masing-masing 25%)
    if (mode === 'REKAP') {
        slider.style.transform = 'translateX(0%)';
    } else if (mode === 'WH2') {
        slider.style.transform = 'translateX(-25%)';
        // Panggil hanya saat user pindah ke tab WH2
        // initDropdowns sudah memiliki proteksi 'isDropdownInitialized' 
        // sehingga ini hanya akan berjalan 1 kali saja.
        if (typeof initDropdowns === 'function') {
            initDropdowns();
        }
    } else if (mode === 'WH3') {
        slider.style.transform = 'translateX(-50%)';
        if (typeof initDropdowns === 'function') {
            initDropdownsWH3();
        }
    } else if (mode === 'LEBIH') {
        slider.style.transform = 'translateX(-75%)';
    }

    console.log("Stok Warehouse mode berpindah ke:", mode);
};

// Fungsi untuk memformat tanggal ke (Hari, dd MMMM yyyy)
function updateDisplayTanggal(tanggalString, isDataKosong = false) {
    const displayEl = document.getElementById('display-tanggal-wh2');
    if (!displayEl) return;

    // Jika dipanggil dengan status data kosong
    if (isDataKosong) {
        displayEl.innerText = "BELUM ADA DATA STOK";
        return;
    }

    if (!tanggalString) {
        displayEl.innerText = "PILIH TANGGAL STOK";
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

let isDropdownInitialized = false;

// 1. Fungsi Utama: Ambil dan Update Tanggal
async function updateTanggalDropdown() {
    const selPeriode = document.getElementById('select-periode-wh2');
    const selTanggal = document.getElementById('select-tanggal-wh2');
    
    if (!selPeriode || !selTanggal) return;

    if (!selPeriode.value) {
        selTanggal.innerHTML = '<option value="">Pilih Tanggal</option>';
        handleDataKosong(true); // true = reset tampilan ke default
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
    if (typeof window.updateDisplayTanggal === 'function') {
        window.updateDisplayTanggal(val, false); // false = data ditemukan
    }
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

// 3. Helper untuk Data Kosong
function handleDataKosong(isReset) {
    const selTanggal = document.getElementById('select-tanggal-wh2');
    selTanggal.innerHTML = '<option value="">Data Kosong</option>';
    
    // Update label display ke "BELUM ADA DATA STOK"
    if (typeof window.updateDisplayTanggal === 'function') {
        window.updateDisplayTanggal('', true); // true = tampilkan status kosong
    }
    // Update tabel
    if (typeof window.tampilkanKosong === 'function') {
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

// 2. Fungsi init yang memanggil fungsi di atas
async function initDropdowns() {
    //if (isDropdownInitialized) return;
    
    const selPeriode = document.getElementById('select-periode-wh2');
    const selTanggal = document.getElementById('select-tanggal-wh2');
    
    if (!selPeriode || !selTanggal) return;

    const now = new Date();
    selPeriode.innerHTML = '<option value="">Pilih Periode</option>';
    
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${d.getFullYear()}-${d.getMonth()}`;
        const label = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }).toUpperCase();
        selPeriode.add(new Option(label, value));
    }

    selPeriode.value = `${now.getFullYear()}-${now.getMonth()}`;

    // Pasang Event Listeners
    selPeriode.removeEventListener('change', updateTanggalDropdown);
    selPeriode.addEventListener('change', updateTanggalDropdown);
    
    selTanggal.removeEventListener('change', triggerUpdateTampilan); // Gunakan fungsi trigger
    selTanggal.addEventListener('change', (e) => {
        if (e.target.value) {
            triggerUpdateTampilan(e.target.value);
        } else {
            handleDataKosong(false);
        }
    });

    // EKSEKUSI PERTAMA
    isDropdownInitialized = true;
    await updateTanggalDropdown();
}

// 3. Panggil saat DOM benar-benar siap
document.addEventListener('DOMContentLoaded', initDropdowns);



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

// 3. Panggil saat DOM benar-benar siap
document.addEventListener('DOMContentLoaded', initDropdownsWH3);


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

const DB_FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

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
        console.log("Memproses data WH-3 dan melakukan merge stok fisik...");
        const dataBosnet = await bacaExcelDinamis(fileBosnet, "Produk");
        
        // 1. Tarik data yang ada di Firebase saat ini untuk menjaga data fisik
        const responseLama = await fetch(url);
        const dataLama = await responseLama.json() || {};

        let stokAudit = {};

        dataBosnet.forEach(row => {
            const kode = row[1] ? String(row[1]).trim().toUpperCase() : null; 
            if (!kode || kode === "PRODUK") return;

            const nama = row[2] || ""; 
            const bosnet = parseInt(row[9]) || 0; 
            const rawData = row[9] ? String(row[9]) : "0/0/0/0"; 
            if (rawData === "0/0/0/0") return;

            const parts = rawData.split('/').map(p => parseInt(p) || 0);
            const ball = parts[1] || 0;
            const rtg = parts[2] || 0;

            let formattedPak = "";
            if (ball > 0 && rtg > 0) formattedPak = `${ball} | ${rtg}`;
            else if (ball > 0) formattedPak = `${ball} (Ball)`;
            else if (rtg > 0) formattedPak = `${rtg} (Rtg)`;
            else formattedPak = "-";

            // 2. Logika Merge: Pertahankan data fisik jika sudah ada
            const dataLamaItem = dataLama[kode] || {};

            stokAudit[kode] = {
                kode: kode,
                nama: nama,
                bosnet: bosnet,
                pak_format: formattedPak,
                // Ambil nilai lama jika ada, jika tidak default 0
                blok: dataLamaItem.blok || 0,
                beceran: dataLamaItem.beceran || 0, 
                utuhan: dataLamaItem.utuhan || 0,  
                total: dataLamaItem.total || 0,
                selisih: dataLamaItem.selisih || 0,
                keterangan: dataLamaItem.keterangan || "BELUM DIHITUNG",
                // Tambahkan field untuk menyimpan detail rak (untuk RAK WH-3)
                detail_rak: dataLamaItem.detail_rak || { beceran_rak: "", utuhan_rak: "" }
            };
        });

        // 3. Upload kembali ke Firebase (Merge data Bosnet dengan data fisik yang dipertahankan)
        await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(stokAudit)
        });

        miuiAlert("Data WH-3 berhasil diperbarui & stok fisik dipertahankan");
        tutupModalUploadWH3();
        resetFileInputwh3();
        isDropdownInitializedWH3 = false;
        await initDropdownsWH3();

    } catch (error) {
        console.error("Error WH-3:", error);
        miuiAlert("Gagal memproses file WH-3: " + error.message);
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

function gantiModeWH2(mode) {
    // Fungsi ini hanya bertugas memperbarui UI judul saja, 
    // lalu memicu loadStokData untuk mengupdate isi tabel
    const title = document.getElementById('txt-table-title-wh2');
    if (title) {
        title.innerText = mode === "SEBELUM" ? "TABEL DATA WH-2 SEBELUM" : "TABEL DATA WH-2 SESUDAH";
    }   
    loadStokData(); 
}

// Perbaikan fungsi gantiModeWH3 agar mengambil data dari window.currentStokData
async function gantiModeWH3(mode) {
    const contStok = document.getElementById('container-stok-wh3');
    const contRak = document.getElementById('container-rak-wh3');
    const title = document.getElementById('txt-table-title-wh3'); // Perbaikan: Ambil elemen title
    
    if (!contStok || !contRak || !title) {
        console.error("Salah satu elemen (container/title) tidak ditemukan di DOM!");
        return;
    }

    // Ambil data yang sudah ada di memori
    const allData = window.currentStokData;
    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value.replace(/-/g, '') : null;
    
    // Cari data berdasarkan tanggal
    const key = allData ? Object.keys(allData).find(k => k.includes(`stokwh3_${tanggal}`)) : null;
    const dataTepat = key ? allData[key] : {};

    // Kontrol UI: Reset class
    contStok.classList.add('hidden');
    contRak.classList.add('hidden');

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
}

// Helper untuk pesan kosong
function tampilkanKosong(infoTambahan = '') {
    const selPeriode = document.getElementById('select-periode-wh2');
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

    const tbody = document.getElementById('tabel-body-wh2');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-10 text-slate-800">
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

async function loadStokDatawh3() {
    const dataBlokAgregat = await getAgregatStokBlok();
    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value : null;

    if (!tanggal) return;

    // 1. Tentukan mode secara paksa dari DOM
    // Mencari radio yang dicentang, jika tidak ada, default ke SEBELUM
    const radioChecked = document.querySelector('input[name="rb-mode-wh3"]:checked');
    const mode = radioChecked ? radioChecked.value : "STOK WH-3";
    
    console.log("Memuat data mode:", mode, "untuk tanggal:", tanggal);

    const formattedDate = tanggal.replace(/-/g, '');
    
    try {
        const response = await fetch(`${DB_FIREBASE_URL}stok_wh3.json`);
        const allData = await response.json();
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

        // 2. Render langsung dengan mode yang sudah didapat
        renderTabelwh3(allData[key], mode, key, dataBlokAgregat);
        
    } catch (error) {
        console.error("Gagal load data:", error);
    }
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
            statusEl.innerText = "[ SEMUA STOK SESUAI ]";
            statusEl.className = "ml-4 text-[15px] font-black text-green-600 uppercase tracking-wider";
        } else {
            statusEl.innerText = "[ TERDAPAT SELISIH STOK ]";
            statusEl.className = "ml-4 text-[15px] font-black text-red-600 uppercase tracking-wider";
        }
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

async function sinkronisasiBlokKeFirebase(tanggal) {
    const dataAgregat = await getAgregatStokBlok(); // Mengambil data hasil agregasi
    const baseUrl = `${DB_FIREBASE_URL}stok_wh3/stokwh3_${tanggal}`;

    // Update setiap kode dengan nilai blok yang benar
    for (const [kode, totalBlok] of Object.entries(dataAgregat)) {
        await fetch(`${baseUrl}/${kode}.json`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blok: totalBlok }) // Mengisi nilai blok yang benar
        });
    }
    console.log("Data blok telah disinkronkan ke Firebase.");
}

// Pastikan ini dipanggil saat aplikasi dimuat agar data QTY tersedia
async function loadMasterBarang() {
    const res = await fetch("https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/master_barang.json");
    window.masterData = await res.json(); 
    console.log("Master data dimuat:", window.masterData);
}

async function renderTabelwh3(dataStok, mode, key, dataBlokAgregat) {
    const tbody = document.getElementById('tabel-body-wh3');
    if (!tbody) return;

    const response = await fetch("https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/master_barang.json");
    const masterBarang = await response.json() || {};

    tbody.innerHTML = "";
    let no = 1;

    // 1. Array Pola (Meniru GetSortScoreWH3)
    const polaUtama = [
        "CRR", "CRR EA", "THR EA", "THR", "MRMR", "MRR", "MJR HJ", "MJR", "MOB4A", 
        "MOR2A EA", "MOR2A EB", "MOR2A", "MP", "PDR", "MTR3A", 
        "PR-PKT", "PR-CUP", "MRSR", "LTGR", "MTGR", 
        "MEB", "MOL", "MRL", "MTL", "ISEL"
    ];

    // Fungsi pembantu logika VBA
    const getSortScore = (kode) => {
        kode = kode.toUpperCase();
        // Cek Pola Utama
        for (let i = 0; i < polaUtama.length; i++) {
            if (kode.includes(polaUtama[i])) {
                // Proteksi logika nyelip (seperti di VBA)
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
        if (!match) return 999;
        const gabung = match.join('');
        return parseInt(gabung.slice(-4)) || 999;
    };

    // Proses Sorting 3 Lapis
    const sortedEntries = Object.entries(dataStok).sort((a, b) => {
        const kodeA = a[0];
        const kodeB = b[0];

        // Lapis 1: Grup Utama
        const scoreA1 = getSortScore(kodeA);
        const scoreB1 = getSortScore(kodeB);
        if (scoreA1 !== scoreB1) return scoreA1 - scoreB1;

        // Lapis 2: Varian
        const scoreA2 = getVarianScore(kodeA);
        const scoreB2 = getVarianScore(kodeB);
        if (scoreA2 !== scoreB2) return scoreA2 - scoreB2;

        // Lapis 3: Angka Akhir
        return getAngkaAkhir(kodeA) - getAngkaAkhir(kodeB);
    });

    // Render tabel (seperti sebelumnya)
    const f = (val) => (val === 0 || val === "0" ? "-" : val.toLocaleString());

    sortedEntries.forEach(([kode, item]) => {
        // ... (sisanya tetap sama dengan logika render Anda)
        const blok = dataBlokAgregat[kode] || 0;
        const bosnet = parseInt(item.bosnet) || 0;
        const beceran = parseInt(item.beceran) || 0;
        const utuhan = parseInt(item.utuhan) || 0;
        const keterangan = item.keterangan || "-";
        
        let pak = item.pak_format || "-";
        if (pak === "0 | 0" || pak === "0") pak = "-";

        const adaStok = (blok !== 0 || bosnet !== 0 || beceran !== 0 || utuhan !== 0);
        const adaPak = (pak !== "-");
        
        if (!adaStok && !adaPak) return;

        const totalFisik = blok + beceran + utuhan;
        const selisih = totalFisik - bosnet;
        const warnaSelisih = selisih !== 0 ? "font-black text-red-600" : "";

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 border-b text-[12px]">
                <td class="py-2 px-2">${no++}</td>
                <td class="py-2 px-2 font-bold">${kode}</td>
                <td class="py-2 px-2">${f(blok)}</td>
                <td class="py-2 px-2">${f(bosnet)}</td>
                <td class="py-2 px-2">${pak}</td>
                <td class="py-2 px-2">${f(beceran)}</td>
                <td class="py-2 px-2">${f(utuhan)}</td>
                <td class="py-2 px-2 font-bold">${f(totalFisik)}</td>
                <td class="py-2 px-2 ${warnaSelisih}">${selisih === 0 ? "-" : selisih.toLocaleString()}</td>
                <td class="py-2 px-2 text-xs text-gray-600 font-medium">${keterangan}</td>
            </tr>
        `;
    });
}

// 1. Fungsi render untuk menampilkan data ke tabel
function renderRakWH3(dataStok) {
    const tbody = document.getElementById('tabel-body-rak-wh3');
    if (!tbody) return;
    
    tbody.innerHTML = "";
    let no = 1;

    if (!dataStok || typeof dataStok !== 'object') return;

    Object.entries(dataStok).forEach(([kode, item]) => {
        if (typeof item !== 'object') return;

        const dr = item.detail_rak || { beceran_qty: "", beceran_rak: "", utuhan_rak: "" };
        
        tbody.innerHTML += `
            <tr class="text-[12px] border-b data-kode="${kode}">
                <td class="p-2 text-gray-800">${no++}</td>
                <td class="p-2 text-gray-800 font-bold">${kode}</td>
                <td class="p-2 text-gray-800">
                    <input type="number" value="${dr.beceran_qty || ''}" 
                           onblur="syncRakKeStok('${kode}', 'beceran_qty', this.value)" 
                           class="w-full border p-1 rounded">
                </td>
                <td class="p-2 text-gray-800 uppercase">
                    <input type="text" value="${dr.beceran_rak || ''}" 
                           oninput="this.value = this.value.toUpperCase()" 
                           onblur="syncRakKeStok('${kode}', 'beceran_rak', this.value)" 
                           class="w-full border p-1 rounded">
                </td>
                <td class="p-2 text-gray-800 uppercase">
                    <input type="text" value="${dr.utuhan_rak || ''}" 
                           oninput="this.value = this.value.toUpperCase()" 
                           onblur="syncRakKeStok('${kode}', 'utuhan_rak', this.value)" 
                           class="w-full border p-1 rounded">
                </td>
                <td class="p-2 font-bold selisih-cell ${item.selisih !== 0 ? 'text-red-600' : 'text-gray-800'}">
                    ${item.selisih ?? 0}
                </td>
            </tr>
        `;
    });
}

// 2. Fungsi sinkronisasi utama
// 1. Fungsi Update Data ke Firebase (Tanpa render ulang)
async function syncRakKeStok(kode, field, value) {
    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value.replace(/-/g, '') : null;
    if (!tanggal) return;

    // Update state lokal
    const item = window.currentStokData[`stokwh3_${tanggal}`][kode];
    item.detail_rak[field] = value;

    // Kalkulasi lokal
    if (field === 'utuhan_rak') {
        const master = window.masterData ? window.masterData[kode] : null;
        const qtyPerRak = master ? parseInt(master.QTY) : 95;
        const rakArray = value.split('+').filter(rak => rak.trim() !== "");
        item.utuhan = rakArray.length * qtyPerRak;
    } else if (field === 'beceran_qty') {
        item.beceran = parseInt(value) || 0;
    }
    
    item.total = (parseInt(item.blok) || 0) + (parseInt(item.beceran) || 0) + (parseInt(item.utuhan) || 0);
    item.selisih = item.total - (parseInt(item.bosnet) || 0);

    // Update UI Selisih saja (Tanpa Render Ulang Tabel)
    updateSelisihDOM(kode, item.selisih);

    // Kirim ke Firebase (Async, biarkan berjalan di latar belakang)
    const baseUrl = `https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_wh3/stokwh3_${tanggal}/${kode}`;
    fetch(`${baseUrl}/detail_rak.json`, { method: "PATCH", body: JSON.stringify({ [field]: value }) });
    fetch(`${baseUrl}.json`, { method: "PATCH", body: JSON.stringify({ beceran: item.beceran, utuhan: item.utuhan, total: item.total, selisih: item.selisih }) });
}

// 2. Fungsi Pembantu untuk Update Angka Selisih Saja
function updateSelisihDOM(kode, nilaiSelisih) {
    // Kita cari elemen selisih spesifik berdasarkan ID atau atribut data
    const row = document.querySelector(`tr[data-kode="${kode}"]`);
    if (row) {
        const selisihCell = row.querySelector('.selisih-cell');
        if (selisihCell) {
            selisihCell.innerText = nilaiSelisih;
            selisihCell.className = `p-2 font-bold ${nilaiSelisih !== 0 ? 'text-red-600' : 'text-gray-800'} selisih-cell`;
        }
    }
}

// Fungsi untuk update ke Firebase
async function updateRak(kode, field, value) {
    // Ambil tanggal dari input user untuk menentukan path yang benar
    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value.replace(/-/g, '') : null;
    
    if (!tanggal) {
        console.error("Tanggal tidak terpilih!");
        return;
    }

    // Path yang benar: stok_wh3 / stokwh3_YYYYMMDD / kode / detail_rak
    const url = `https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_wh3/stokwh3_${tanggal}/${kode}/detail_rak.json`;
    
    try {
        const response = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [field]: value })
        });
        
        if (response.ok) {
            console.log(`Berhasil update ${kode} pada tanggal ${tanggal} untuk ${field}: ${value}`);
        }
    } catch (error) {
        console.error("Gagal mengupdate ke Firebase:", error);
    }
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

// Cek Password (Ganti 'adminwh2' dengan password Anda)
function cekAdmin() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === "adminwh2") {
        document.getElementById('modal-admin-stok').classList.add('hidden');
        document.getElementById('admin-pass').value = '';
        bukaModalAdjust(window.tempAdjustData);
    } else {
        miuiAlert("Password Salah! Anda tidak dizinkan mengakses menu ini!");
        document.getElementById('admin-pass').value = ''; // Reset input agar tidak bisa ditebak
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

function exportTabelKeExcelWH3() {
    const table = document.getElementById('tabel-stok-wh3');
    if (!table) {
        miuiAlert("Tabel tidak ditemukan!");
        return;
    }
    const wb = XLSX.utils.table_to_book(table, { sheet: "Laporan Stok WH3" });
    const tgl = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
    XLSX.writeFile(wb, `STOKWH3_${tgl}.xlsx`);
}