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

function gantiModeWH2(mode) {
    // Fungsi ini hanya bertugas memperbarui UI judul saja, 
    // lalu memicu loadStokData untuk mengupdate isi tabel
    const title = document.getElementById('txt-table-title-wh2');
    if (title) {
        title.innerText = mode === "SEBELUM" ? "TABEL DATA WH-2 SEBELUM" : "TABEL DATA WH-2 SESUDAH";
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
    // Tidak perlu lagi memanggil getAgregatStokBlok()
    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value : null;

    if (!tanggal) return;

    // Tentukan mode secara paksa dari DOM
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

        // Render tabel tanpa mengirim dataBlokAgregat lagi
        // Data blok sekarang sudah ada di dalam allData[key] (sebagai item.blok)
        renderTabelwh3(allData[key], mode, key);
        
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
            // Menggunakan innerHTML agar tag <i> bisa terbaca sebagai ikon
            statusEl.innerHTML = "[ SEMUA STOK SESUAI: <i class='fas fa-check-circle'></i> ]";
            statusEl.className = "ml-4 text-[15px] font-black text-green-600 uppercase tracking-wider";
        } else {
            statusEl.innerText = "[ TERDAPAT SELISIH STOK: " + totalSelisih.toLocaleString() + " Karton]";
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
        const keterangan = item.keterangan || "-";
        
        let pak = item.pak_format || "-";
        if (pak === "0 | 0" || pak === "0") pak = "-";

        if (!((blok !== 0 || bosnet !== 0 || beceran !== 0 || utuhan !== 0) || pak !== "-")) return;

        // Logika Fisik (Sama untuk hitung total dan baris)
        let totalFisik = kode.includes("PR-PKT") ? (beceran + utuhan) : (blok + beceran + utuhan);
        const selisih = totalFisik - bosnet;
        
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
    const polaUtama = ["CRR", "CRR EA", "THR EA", "THR", "MRMR", "MRR", "MJR HJ", "MJR", "MOB4A", "MOR2A EA", "MOR2A EB", "MOR2A", "MP", "PDR", "MTR3A", "PR-PKT", "PR-CUP", "MRSR", "LTGR", "MTGR", "MEB", "MOL", "MRL", "MTL", "ISEL"];
    const daftarKelompok = ["CRR", "MRR", "MOR", "MJR", "MP", "PDR"]; // Kelompok untuk rekap

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

                // Akumulasi Rekap Kelompok
                const prefix = daftarKelompok.find(k => kode.toUpperCase().startsWith(k)) || "LAIN";
                if (!rekapKelompok[prefix]) rekapKelompok[prefix] = {};
                rekapKelompok[prefix][tgl] = (rekapKelompok[prefix][tgl] || 0) + selisih;
            }
        });
    });

    // --- RENDER HEADER ---
    thead.innerHTML = `
        <th class="py-3 px-3 text-center bg-slate-100 sticky top-0 left-0 z-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">NO</th>
        <th class="py-3 px-3 text-left bg-slate-100 sticky top-0 left-[48px] z-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">KODE</th>` + 
        dates.map(d => {
            const dd = d.substring(6,8), mm = d.substring(4,6), yy = d.substring(2,4);
            return `<th class="py-3 px-4 text-center bg-slate-100 sticky top-0 z-40 whitespace-nowrap">${dd}/${mm}/${yy}</th>`;
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
            <td class="py-2 px-3 text-center text-slate-600 sticky left-0 z-20 bg-white border-r">${no++}</td>
            <td class="py-2 px-3 font-bold text-slate-800 whitespace-nowrap sticky left-12 z-20 bg-white border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">${kode}</td>`;
        dates.forEach(tgl => {
            const val = dataMatriks[kode][tgl] || 0;
            const warna = val > 0 ? "text-blue-600" : (val < 0 ? "text-red-600" : "text-gray-300");
            rowHtml += `<td class="py-2 px-4 text-center font-bold ${warna} whitespace-nowrap">${val === 0 ? "-" : val}</td>`;
        });
        tbody.innerHTML += rowHtml + `</tr>`;
    });

    // --- RENDER TOTAL SELISIH GLOBAL ---
    // Baris ini akan menghitung total dari seluruh selisih per tanggal
    let totalGlobalRow = `<tr class="bg-orange-100 border-t-2 border-orange-500 font-black">
        <td class="py-2 px-3 text-right text-[20px] sticky left-0 z-20 bg-orange-100 text-red-600 border-r" colspan="2">TOTAL SELISIH :</td>`;
    dates.forEach(tgl => {
        const grandTotal = totalPerTgl[tgl] || 0;
        totalGlobalRow += `<td class="py-2 px-4 text-[20px] text-center ${grandTotal !== 0 ? 'text-red-600' : 'text-gray-400'}">${grandTotal === 0 ? "-" : grandTotal}</td>`;
    });
    tbody.innerHTML += totalGlobalRow + `</tr>`;

    // --- RENDER REKAP KELOMPOK (Tampilan disamakan) ---
    daftarKelompok.forEach(kel => {
        let kelRow = `<tr class="bg-gray-100 border-b hover:bg-gray-200 font-bold text-slate-700">
            <td class="py-2 px-3 text-right text-[14px] sticky left-0 z-20 bg-gray-100 border-r" colspan="2">SELISIH ${kel} :</td>`;
        dates.forEach(tgl => {
            const val = rekapKelompok[kel] ? (rekapKelompok[kel][tgl] || 0) : 0;
            const warna = val !== 0 ? "text-gray-800" : "text-gray-400";
            kelRow += `<td class="py-2 px-4 text-center ${warna}">${val === 0 ? "-" : val}</td>`;
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
    document.getElementById('inputBeceran').value = item.beceran || "";
    document.getElementById('inputRakBeceran').value = detail.beceran_rak || "";
    document.getElementById('inputRakUtuhan').value = detail.utuhan_rak || "";
    
    window.currentKode = kode;
    hitungKonversi();
    
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
    const inputBeceran = parseInt(document.getElementById('inputBeceran').value) || 0;
    
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
    // Jika PR-PKT, asumsikan input adalah angka total (bukan penjumlahan rak)
    // Jika Barang Biasa, hitung berdasarkan jumlah rak (pemisah '+')
    if (kode.includes("PR-PKT")) {
        const jumlahKarton = parseInt(rakUtuhanInput) || 0;
        hasil = (jumlahKarton * konversi) + inputBeceran;
    } else {
        // Logika hitung rak (fitur lama)
        const rakArray = rakUtuhanInput.split('+').filter(r => r.trim() !== "");
        hasil = (rakArray.length * konversi) + inputBeceran;
    }
    
    // 4. Update tampilan
    const displayElement = document.getElementById('displayQtyUtuhan');
    if (displayElement) {
        displayElement.innerText = hasil.toLocaleString();
    }
}

async function simpanRak() {
    const kode = window.currentKode;
    const dateInput = document.getElementById('select-tanggal-wh3');
    const tanggal = dateInput ? dateInput.value.replace(/-/g, '') : null;
    
    // 1. Ambil nilai dari input modal
    const beceranVal = parseInt(document.getElementById('inputBeceran').value) || 0;
    const rakBeceranVal = document.getElementById('inputRakBeceran').value.toUpperCase();
    const rakUtuhanVal = document.getElementById('inputRakUtuhan').value.toUpperCase();
    
    // 2. Kalkulasi Utuhan berdasarkan jenis kode
    const master = window.masterData ? window.masterData[kode] : null;
    const qtyPerRak = master ? parseInt(master.QTY) : 0; // Hapus default 95, paksa ke master
    
    let utuhanVal = 0;
    const isPaket = kode.includes("PR-PKT");

    if (isPaket) {
        // Paket: Input dianggap jumlah karton langsung
        const jumlahKarton = parseInt(rakUtuhanVal) || 0;
        utuhanVal = jumlahKarton * qtyPerRak;
    } else {
        // Barang Biasa: Gunakan sistem penjumlahan rak '+'
        const rakArray = rakUtuhanVal.split('+').filter(r => r.trim() !== "");
        utuhanVal = rakArray.length * qtyPerRak;
    }

    // 3. Kalkulasi Total & Selisih
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

        await fetch(`${baseUrl}/detail_rak.json`, {
            method: "PATCH",
            body: JSON.stringify({ 
                beceran_rak: rakBeceranVal, 
                utuhan_rak: rakUtuhanVal 
            })
        });

        console.log("Data berhasil disimpan dengan logika yang sesuai");
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
    
    const item = window.dataStokTerkini ? window.dataStokTerkini[kode] : null;
    if (!item) return;

    // Fungsi pemformatan rak
    const formatRakV2 = (str) => {
        if (!str) return "";
        return str.replace(/(\d+)([A-Za-z]+)(\d+)/g, "$1 C $3");
    };

    const detail = item.detail_rak || {};
    const rakBeceran = detail.beceran_rak ? formatRakV2(detail.beceran_rak) : "-";
    const qtyBeceran = item.beceran || "0";
    
    const rawUtuhan = detail.utuhan_rak || "";
    const utuhanFormatted = rawUtuhan ? rawUtuhan.split('+').map(part => formatRakV2(part.trim())).join(' + ') : "";
    const utuhanRak = utuhanFormatted ? ` + ${utuhanFormatted}` : "";
    
    // 2. Masukkan konten
    content.innerHTML = `<div class="text-gray-800 font-bold text-[15px]">
        ${kode} = ${item.bosnet} | Rak: ${rakBeceran} = ${qtyBeceran}${utuhanRak}
    </div>`;

    // 3. Tampilkan popup dengan animasi
    popup.classList.remove('hidden');
    
    // Hitung posisi setelah elemen muncul
    const rect = event.target.getBoundingClientRect();
    const popupWidth = popup.offsetWidth;

    popup.style.top = (rect.top + window.scrollY - popup.offsetHeight - 8) + "px";
    popup.style.left = (rect.left + window.scrollX - (popupWidth / 2) + 10) + "px";

    // Trigger animasi dengan delay kecil agar transisi CSS berjalan
    setTimeout(() => {
        popup.classList.add('show');
    }, 10);

    // 4. Event penutup popup
    document.onclick = (e) => {
        if (!popup.contains(e.target) && e.target !== event.target) {
            // Animasi tutup sebelum di-hidden
            popup.classList.remove('show');
            setTimeout(() => {
                popup.classList.add('hidden');
            }, 200); // Durasi disesuaikan dengan CSS transition
            document.onclick = null;
        }
    };
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