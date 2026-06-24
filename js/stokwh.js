// Tambahkan ini agar saat halaman siap, tanggal diisi hari ini dan data dimuat
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('select-tanggal-wh2');
    
    // Set tanggal hari ini jika kosong
    if (dateInput && !dateInput.value) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }

    // Listener untuk perubahan tanggal
    if (dateInput) {
        dateInput.addEventListener('change', () => {
            loadStokData();
        });
    }

    // PENTING: Inisialisasi data sekali saja di sini
    loadStokData(); 
});

// Fungsi ganti switch mode Stok WH (REKAP, WH-2, WH-3, LEBIH) dengan efek geser slider
window.gantiModulStokWH = function(mode) {
    const slider = document.getElementById('slider-content-stokwh');
    
    // Logika pergeseran slider untuk 4 kolom (masing-masing 25%)
    if (mode === 'REKAP') {
        slider.style.transform = 'translateX(0%)';
    } else if (mode === 'WH2') {
        slider.style.transform = 'translateX(-25%)';
        loadStokData();
    } else if (mode === 'WH3') {
        slider.style.transform = 'translateX(-50%)';
    } else if (mode === 'LEBIH') {
        slider.style.transform = 'translateX(-75%)';
    }

    console.log("Stok Warehouse mode berpindah ke:", mode);
};

// Fungsi untuk memformat tanggal ke (Hari, dd mmmm yyyy)
function updateDisplayTanggal(tanggalString) {
    if (!tanggalString) return;

    // Memecah string YYYY-MM-DD dengan aman
    const [year, month, day] = tanggalString.split('-').map(Number);
    // Menggunakan constructor tanggal lokal (menghindari timezone shift)
    const date = new Date(year, month - 1, day); 

    const options = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    };
    
    const formattedDate = date.toLocaleDateString('id-ID', options);
    const displayEl = document.getElementById('display-tanggal-wh2');
    if (displayEl) {
        displayEl.innerText = formattedDate.toUpperCase();
    }
}

let isDropdownInitialized = false;

function initDropdowns() {
    const selPeriode = document.getElementById('select-periode-wh2');
    const selTanggal = document.getElementById('select-tanggal-wh2');
    
    if (!selPeriode || !selTanggal) return;
    if (isDropdownInitialized) return;

    const now = new Date();
    
    // 1. Inisialisasi Dropdown Periode
    selPeriode.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${d.getFullYear()}-${d.getMonth()}`;
        const label = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }).toUpperCase();
        selPeriode.add(new Option(label, value));
    }

    // 2. Fungsi untuk mengisi tanggal berdasarkan periode yang dipilih
    function updateTanggalDropdown() {
        const [tahun, bulan] = selPeriode.value.split('-').map(Number);
        const hariDalamBulan = new Date(tahun, bulan + 1, 0).getDate();
        
        selTanggal.innerHTML = '';
        
        for (let i = 1; i <= hariDalamBulan; i++) {
            const d = new Date(tahun, bulan, i);
            
            // Cek apakah hari ini adalah hari Minggu (0 = Minggu)
            if (d.getDay() !== 0) {
                const val = `${tahun}-${String(bulan + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const label = `${String(i).padStart(2, '0')}/${String(bulan + 1).padStart(2, '0')}/${tahun}`;
                selTanggal.add(new Option(label, val));
            }
        }

        // Jika hari ini adalah Minggu, saat membuka periode tersebut 
        // kita perlu menentukan hari aktif terdekat (biasanya hari Senin)
        if (selTanggal.options.length > 0) {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            
            // Jika tanggal hari ini ada di opsi, pilih hari ini. Jika tidak, pilih opsi pertama
            if (tahun === today.getFullYear() && bulan === today.getMonth() && today.getDay() !== 0) {
                selTanggal.value = todayStr;
            } else {
                selTanggal.selectedIndex = 0;
            }
        }
        
        updateDisplayTanggal(selTanggal.value);
        loadStokData(); 
    }

    // --- PERBAIKAN EVENT LISTENER ---
    
    // Saat periode berubah, update list tanggal, lalu otomatis load data
    selPeriode.addEventListener('change', updateTanggalDropdown);

    // Saat tanggal berubah, update display dan LOAD DATA (Penting!)
    selTanggal.addEventListener('change', (e) => {
        updateDisplayTanggal(e.target.value);
        loadStokData(); // Tambahkan ini agar saat tanggal dipilih, data di-fetch ulang
    });

    // Jalankan pertama kali
    updateTanggalDropdown();
    isDropdownInitialized = true;
    console.log("Dropdown periode & tanggal diinisialisasi.");
}

// Panggil inisialisasi
initDropdowns();


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
            loadStokData();
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

// Helper untuk pesan kosong
function tampilkanKosong(tanggal) {
    let displayTanggal = 'yang dipilih';

    // Jika tanggal tersedia (format YYYY-MM-DD), ubah ke dd/mm/yyyy
    if (tanggal && tanggal.includes('-')) {
        const parts = tanggal.split('-'); // ["2026", "06", "24"]
        if (parts.length === 3) {
            displayTanggal = `${parts[2]}/${parts[1]}/${parts[0]}`; // "24/06/2026"
        }
    }

    const tbody = document.getElementById('tabel-body-wh2');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-slate-800">Belum ada data stok tanggal ${displayTanggal}</td></tr>`;
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
                 <button onclick="bukaModalAdjustment('${key}', '${kode}')" class="bg-orange-500 text-white px-2 py-1 rounded text-[10px] hover:bg-orange-600">
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