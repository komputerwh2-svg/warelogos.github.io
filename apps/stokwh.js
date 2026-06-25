

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
        const response = await fetch(`${DB_FIREBASE_URL}stok_wh.json`);
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

// 4. Event Listeners
document.getElementById('select-periode-wh2').addEventListener('change', updateTanggalDropdown);

document.getElementById('select-tanggal-wh2').addEventListener('change', (e) => {
    if (e.target.value) {
        triggerUpdateTampilan(e.target.value);
    } else {
        handleDataKosong(false);
    }
});

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
    
    selTanggal.removeEventListener('change', window.loadStokData);
    selTanggal.addEventListener('change', window.loadStokData);

    // EKSEKUSI PERTAMA
    isDropdownInitialized = true;
    await updateTanggalDropdown();
}

// 3. Panggil saat DOM benar-benar siap
document.addEventListener('DOMContentLoaded', initDropdowns);



function bukaModalUploadWH2() {
    document.getElementById('modal-upload-wh2').classList.remove('hidden');
}

function tutupModalUploadWH2() {
    document.getElementById('modal-upload-wh2').classList.add('hidden');
    resetFileInput();
}

// Menangani daftar file yang dipilih
document.getElementById('file-input-wh2').addEventListener('change', function(e) {
    const list = document.getElementById('file-list-wh2');
    list.innerHTML = '';
    
    Array.from(this.files).forEach(file => {
        const div = document.createElement('div');
        div.className = "flex items-center gap-2 p-2 bg-slate-50 rounded border";
        div.innerHTML = `<i class="fa-solid fa-file-excel text-green-600"></i> <span>${file.name}</span>`;
        list.appendChild(div);
    });
});

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
    const url = `${DB_FIREBASE_URL}stok_wh/${uniqueId}.json`;
    
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

// Fungsi terpisah untuk memproses file dan upload ke Firebase
async function eksekusiUpload(fileWh2, fileWms, url, isUpdate) {
    try {
        console.log("Membaca file Excel...");
        const dataWh2 = await bacaExcel(fileWh2, 13);
        const dataWms = await bacaExcel(fileWms, 12);

        let stokGabungan = {};

        dataWh2.forEach(row => {
            const kode = row[1]; 
            const rawAkhir = String(row[9] || '0'); 
            const kAkhir = parseInt(rawAkhir.split('/')[0]) || 0;

            if (kode && kAkhir > 0) {
                stokGabungan[kode] = {
                    stokwh2_sebelum: kAkhir,
                    stokwh2_sesudah: kAkhir,
                    stokwms_sebelum: 0,
                    stokwms_sesudah: 0
                };
            }
        });

        dataWms.forEach(row => {
            const kode = row[0]; 
            const wmsQty = parseFloat(row[10]) || 0;

            if (kode && stokGabungan[kode]) {
                stokGabungan[kode].stokwms_sebelum = wmsQty;
                stokGabungan[kode].stokwms_sesudah = wmsQty;
            }
        });

        if (Object.keys(stokGabungan).length === 0) {
            miuiAlert("Data tidak ditemukan!");
            return;
        }

        const response = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(stokGabungan)
        });

        if (response.ok) {
            const message = isUpdate ? "Data berhasil di-UPDATE ke Firebase!" : "Data berhasil disimpan ke Firebase!";
            miuiAlert(message);
            tutupModalUploadWH2();
            resetFileInput();

            // LAKUKAN INI:
            // 1. Reset flag agar dropdown bisa memuat ulang daftar tanggal dari Firebase
            isDropdownInitialized = false; 
            
            // 2. Panggil ulang inisialisasi dropdown untuk mengambil daftar tanggal terbaru
            // Dan di dalam initDropdowns nanti, ia akan otomatis memanggil loadStokData()
            await initDropdowns(); 
        } else {
            miuiAlert("Gagal menyimpan ke server.");
        }

    } catch (error) {
        console.error("Terjadi error detail:", error);
        miuiAlert("Terjadi kesalahan: " + error.message);
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
    
    console.log("Input file dan tampilan list telah di-reset.");
}

// Helper tetap di luar fungsi utama
function bacaExcel(file, headerRow) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            resolve(XLSX.utils.sheet_to_json(ws, { header: 1, range: headerRow }));
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
        const response = await fetch(`${DB_FIREBASE_URL}stok_wh.json`);
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
                        class="bg-orange-500 text-white px-2 py-1 rounded text-[10px] hover:bg-orange-600">
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
                ${totalSelisih === 0 ? "SEMUA SESUAI" : "SELISIH DITEMUKAN"}
            </td>
            ${totalAksiCol}
        </tr>
    `;
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
        miuiAlertlert("Password Salah! Anda tidak dizinkan mengakses menu ini!");
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
        const response = await fetch(`${DB_FIREBASE_URL}stok_wh/stokwh2wms_${tanggal}/${kode}.json`, {
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