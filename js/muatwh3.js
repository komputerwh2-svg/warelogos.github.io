// js/muatwh3.js
console.log("Modul Muat WH-3 dimuat.");

window.cacheMasterBarang = {};

window.loadMasterBarang = async function() {
    try {
        const db = window.getFirestore ? window.getFirestore() : window.db;
        
        // 1. Coba ambil dari Firestore terlebih dahulu (lebih cepat daripada RTDB)
        const docRef = db.collection("bank_data").doc("master_barang");
        const doc = await docRef.get();

        if (doc.exists) {
            window.cacheMasterBarang = doc.data();
            console.log("Master Barang dimuat dari Firestore.");
        } else {
            // 2. Jika tidak ada di Firestore, ambil dari RTDB (fallback)
            if (!window.rtdb) throw new Error("RTDB tidak tersedia");
            
            const snapshot = await window.rtdb.ref('master_barang').once('value');
            const data = snapshot.val();
            
            if (data) {
                window.cacheMasterBarang = data;
                // 3. Sinkronkan ke Firestore agar tidak perlu ambil dari RTDB lagi di masa depan
                await docRef.set(data, { merge: true });
                console.log("Master Barang dimuat dari RTDB dan disinkronkan ke Firestore.");
            }
        }
    } catch (error) {
        console.error("Gagal memuat master barang:", error);
        window.miuiAlert("Gagal memuat master barang: " + error.message);
    }
};

// Fungsi Inisialisasi utama
window.initMuatWH3 = async function() {
    console.log("Inisialisasi modul Muat WH-3...");
    
    // Pastikan menggunakan fungsi helper dari main.js
    const db = window.getFirestore ? window.getFirestore() : window.db;
    
    if (db) {
        console.log("Firestore siap digunakan.");
    } else {
        console.warn("Firestore belum siap, sistem mungkin hanya berjalan di RTDB mode.");
    }

    // Jalankan fungsi inisialisasi lainnya
    await loadMasterBarang();
    if (typeof window.generatePeriodeDropdown === 'function') {
        window.generatePeriodeDropdown(); 
    } 
    await updateTanggalDropdownMuatWH3();
    // Panggil langsung, dia akan menunggu jika HTML belum siap
    window.muatDropdownStok(); 
    
    await window.renderTabelGabungan();
};

// Panggil inisialisasi secara aman
// Gunakan DOMContentLoaded agar elemen HTML sudah siap diakses
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.initMuatWH3 === 'function') {
        window.initMuatWH3();
    }

    const btnProses = document.getElementById('btn-proses-otomatis');
    if (btnProses) {
        btnProses.addEventListener('click', () => {
            if (typeof window.prosesOtomatisStok === 'function') {
                window.prosesOtomatisStok();
            } else {
                console.error("Fungsi prosesOtomatisStok belum didefinisikan.");
            }
        });
    }
});


window.updateJamMuatWH3 = function() {
    const display = document.getElementById('display-waktu-wh3');
    if (!display) return;

    const hariList = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const bulanList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    const sekarang = new Date();
    const hari = hariList[sekarang.getDay()];
    const tgl = sekarang.getDate();
    const bln = bulanList[sekarang.getMonth()];
    const thn = sekarang.getFullYear();
    
    const jam = String(sekarang.getHours()).padStart(2, '0');
    const menit = String(sekarang.getMinutes()).padStart(2, '0');
    const detik = String(sekarang.getSeconds()).padStart(2, '0');

    display.innerText = `[ ${hari}, ${tgl} ${bln} ${thn} | ${jam}:${menit}:${detik} ]`;
};

// Jalankan fungsi setiap 1 detik
setInterval(window.updateJamMuatWH3, 1000);
// Jalankan sekali saat pertama kali dimuat
window.updateJamMuatWH3();

window.gantiModulMuatWH3 = function(mode) {
    const slider = document.getElementById('slider-content-muatwh3');
    
    if (!slider) return;

    if (mode === 'KONFIRMASI') {
        slider.style.transform = 'translateX(0%)';
        console.log("Mode: KONFIRMASI BOSNET");
    } else if (mode === 'RAK') {
        slider.style.transform = 'translateX(-50%)';
        console.log("Mode: RAK & BLOK");
        
        // Panggil fungsi yang benar dan pastikan bersifat asinkron
        if (typeof window.renderTabelRakGabungan === 'function') {
            window.renderTabelRakGabungan();
        } else {
            console.error("Fungsi renderTabelRakGabungan tidak ditemukan!");
        }
    }
};

window.getHariLiburNasional = async function() {
    // API publik gratis untuk daftar hari libur Indonesia (ID) tahun 2026
    const url = "https://date.nager.at/api/v3/PublicHolidays/2026/ID";

    try {
        const response = await fetch(url);
        const data = await response.json();
        // Mengembalikan array tanggal libur (format YYYY-MM-DD)
        return data.map(item => item.date);
    } catch (error) {
        console.error("Gagal ambil data libur:", error);
        return []; // Jika gagal, sistem tetap berjalan normal (hanya cek hari Minggu)
    }
};

// --- FUNGSI TAMBAHAN: Validasi hari kerja (Maju - untuk BOSNET) ---
window.getValidWorkingDate = async function(dateInput) {
    let liburNasional = await window.getHariLiburNasional();
    let checkDate = new Date(dateInput);
    
    // Loop sampai bukan Minggu (0) dan bukan tanggal libur
    while (checkDate.getDay() === 0 || liburNasional.includes(checkDate.toISOString().split('T')[0])) {
        checkDate.setDate(checkDate.getDate() + 1);
    }
    return checkDate;
};

// --- FUNGSI TAMBAHAN: Validasi hari kerja (Mundur - untuk Mutasi/Import) ---
window.getValidWorkingDateReverse = async function(dateInput) {
    let liburNasional = await window.getHariLiburNasional();
    let checkDate = new Date(dateInput);
    
    // Mundur sampai ketemu hari kerja (bukan Minggu dan bukan libur)
    while (checkDate.getDay() === 0 || liburNasional.includes(checkDate.toISOString().split('T')[0])) {
        checkDate.setDate(checkDate.getDate() - 1);
    }
    return checkDate;
};

// 1. Fungsi untuk generate 10 bulan terakhir
window.generatePeriodeDropdown = function() {
    const selPeriode = document.getElementById('select-periode-muat');
    if (!selPeriode) return;

    selPeriode.innerHTML = '';
    const sekarang = new Date();
    
    for (let i = 0; i < 10; i++) {
        // Membuat tanggal mundur per bulan
        const d = new Date(sekarang.getFullYear(), sekarang.getMonth() - i, 1);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        
        const option = new Option(label, value);
        selPeriode.add(option);
    }
    // Periode bulan sekarang (index 0) otomatis terpilih
};

// Fungsi pembantu format tanggal
window.formatTanggal = function(tglStr) {
    const y = tglStr.substring(0, 4);
    const m = tglStr.substring(4, 6);
    const d = tglStr.substring(6, 8);
    const date = new Date(y, m - 1, d);
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][date.getDay()];
    return `${hari}, ${d}/${m}/${y}`;
};

// Fungsi inisialisasi dropdown tanggal
window.updateTanggalDropdownMuatWH3 = async function() {
    const selPeriode = document.getElementById('select-periode-muat');
    const selTanggal = document.getElementById('select-tanggal-muat');
    const db = window.db; 
    
    if (!selPeriode || !selTanggal || !db) return;

    selTanggal.innerHTML = '<option value="">Memuat...</option>';

    try {
        // Berdasarkan struktur Query Builder: /muat_wh3/20260714/datatujuan/...
        // Kita tidak bisa membaca root 'muat_wh3' jika ia adalah dokumen.
        // Kita harus membaca dari koleksi yang menampung dokumen tanggal tersebut.
        
        // Kita coba ambil koleksi yang bernama 'datatujuan' menggunakan CollectionGroup
        // karena itu adalah koleksi pertama yang muncul di bawah dokumen tanggal.
        const snapshot = await db.collectionGroup('datatujuan').get();
        
        console.log("DEBUG: Menggunakan CollectionGroup('datatujuan'). Hasil:", snapshot.size);

        let availableDates = new Set(); // Menggunakan Set agar tanggal tidak duplikat
        const [targetTahun, targetBulan] = selPeriode.value.split('-').map(Number);

        snapshot.forEach(doc => {
            // Path doc adalah: muat_wh3/20260714/datatujuan/FOLDER_ID
            // Kita ambil ID dokumen tanggalnya dari path parent-nya
            const pathParts = doc.ref.path.split('/');
            // Pathnya: muat_wh3 (0) / 20260714 (1) / datatujuan (2) / FOLDER_ID (3)
            const tglId = pathParts[1]; 

            if (tglId && /^\d{8}$/.test(tglId)) {
                const docTahun = parseInt(tglId.substring(0, 4));
                const docBulan = parseInt(tglId.substring(4, 6));

                if (docTahun === targetTahun && docBulan === targetBulan) {
                    availableDates.add(tglId);
                }
            }
        });

        if (availableDates.size === 0) {
            selTanggal.innerHTML = '<option value="">Data Tidak Ada</option>';
            return;
        }

        // Urutkan dan masukkan ke dropdown
        const sortedDates = Array.from(availableDates).sort((a, b) => b.localeCompare(a));
        selTanggal.innerHTML = '<option value="">Pilih Tanggal</option>';
        
        sortedDates.forEach(tglId => {
            const hari = tglId.substring(6, 8);
            const bulan = tglId.substring(4, 6);
            const tahun = tglId.substring(0, 4);
            selTanggal.add(new Option(`${hari}/${bulan}/${tahun}`, tglId));
        });

        selTanggal.value = sortedDates[0];
        if (typeof window.renderTabelGabungan === 'function') await window.renderTabelGabungan();

    } catch (e) {
        console.error("Gagal sinkronisasi:", e);
        selTanggal.innerHTML = '<option value="">Error Akses</option>';
    }
};

window.updateStatistikMuat = async function(tglId) {
    if (!tglId) return;
    
    try {
        // Menggunakan window.rtdb (Firebase SDK) sebagai pengganti fetch
        const snapshot = await window.rtdb.ref(`muat_wh3/${tglId}`).once('value');
        const data = snapshot.val();
        
        let totalTujuan = 0;
        let totalNoDO = 0;

        if (data) {
            // Menghitung Total Tujuan (Key di bawah tglId, kecuali yang bukan tujuan)
            const semuaTujuan = Object.keys(data).filter(key => key !== 'timestamp'); 
            totalTujuan = semuaTujuan.length;

            // Menghitung Total No DO dari setiap tujuan
            semuaTujuan.forEach(tujuanKey => {
                // Memastikan data[tujuanKey] adalah objek dan memiliki properti data
                if (data[tujuanKey] && data[tujuanKey].data) {
                    totalNoDO += Object.keys(data[tujuanKey].data).length;
                }
            });
        }

        // Update ke UI
        const elTujuan = document.getElementById('txt-total-tujuan');
        const elNoDO = document.getElementById('txt-total-nodo');
        
        if (elTujuan) elTujuan.innerText = totalTujuan;
        if (elNoDO) elNoDO.innerText = totalNoDO;

    } catch (e) {
        console.error("Gagal update statistik:", e);
    }
};

window.prosesDataBosnet = function() {
    const rawText = document.getElementById('ta-bosnet-input').value.trim();
    const kodeTujuan = document.getElementById('input-kode-tujuan').value.toUpperCase();
    
    if (!rawText) {
        window.miuiAlert("Data masih kosong!");
        return;
    }

    let dataTerproses = {};

    // 1. Cek apakah ini format JSON (Mutasi) atau Text (Bosnet)
    if (rawText.startsWith('{') || rawText.startsWith('[')) {
        try {
            const parsed = JSON.parse(rawText);
            
            // PERBAIKAN: Mutasi sekarang tidak lagi menggunakan key "-MUTASI", 
            // melainkan key berupa nomor DO (seperti "13726").
            // Kita langsung ambil data tersebut karena struktur di dalamnya sudah disiapkan 
            // untuk langsung diproses oleh simpanKeFirebase.
            dataTerproses = parsed; 
        } catch (e) {
            console.error("Gagal proses data JSON:", e);
            window.miuiAlert("Format JSON tidak valid!");
            return;
        }
    } else {
        // 2. Jika bukan JSON, proses sebagai data Bosnet biasa
        dataTerproses = window.parseDataBosnet(rawText, "WHNB-2");
    }
    
    // 3. Simpan ke Firebase
    if (Object.keys(dataTerproses).length > 0) {
        window.simpanKeFirebase(dataTerproses, kodeTujuan);
    } else {
        window.miuiAlert("Tidak ada data yang valid untuk diproses.");
    }
};

window.parseDataBosnet = function(rawText, targetGudang) {
    const lines = rawText.split('\n');
    let hasil = {}; 

    lines.forEach(line => {
        if (!line.includes(targetGudang)) return; 

        // PERBAIKAN REGEX:
        // Menggunakan [A-Za-z0-9]+ agar menangkap huruf kecil maupun besar
        const match = line.match(/DO-HO\d+-\d+-(\d+)\s*([A-Za-z0-9]+).*?(\d+\/\d+\/\d+\/\d+)/);

        if (match) {
            const [full, noDO, kodeRaw, rawQty] = match;
            
            // PAKSA KAPITAL: Mengubah kode barang menjadi huruf besar semua
            const kodeBarang = kodeRaw.toUpperCase(); 
            
            const qtyParts = rawQty.split('/').map(Number);
            
            if (!hasil[noDO]) {
                hasil[noDO] = { tujuan: targetGudang, data: {} };
            }
            
            hasil[noDO].data[kodeBarang] = {
                gudang: targetGudang,
                kodeBarang: kodeBarang, // Disimpan dalam bentuk kapital
                qtyUtama: qtyParts[0],
                qtyDetail: qtyParts.slice(1)
            };
        }
    });

    return hasil;
};

// Fungsi untuk memicu klik pada input file yang benar
function bukaFileMutasi() {
    document.getElementById('input-file-mutasi').click();
}

// Fungsi untuk membaca dan memproses Excel
window.prosesFileMutasi = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // --- 1. EKSTRAKSI TANGGAL DARI NAMA FILE ---
    const fileName = file.name;
    const parts = fileName.split(" "); 
    const tahunFile = parts[2]; 
    const fileDateStr = parts[3]; // "07-16"
    
    if (!fileDateStr) {
        window.miuiAlert("Format nama file tidak valid!");
        return;
    }

    const [bln, tgl] = fileDateStr.split("-");
    const formattedFileDate = `${tgl}-${bln}-${tahunFile}`; // "16-07-2026"

    // --- 2. AMBIL DARI DROPDOWN ---
    const dropdownVal = document.getElementById('select-tanggal-muat').value; 
    
    if (!dropdownVal) {
        window.miuiAlert("Pilih tanggal muat terlebih dahulu!");
        return;
    }

    const y = dropdownVal.substring(0, 4);
    const m = dropdownVal.substring(4, 6);
    const d = dropdownVal.substring(6, 8);
    
    // --- 3. VERIFIKASI DENGAN HARI KERJA (LOGIKA BARU) ---
    // Kita mencari hari kerja terakhir sebelum tanggal muat yang dipilih
    const dateFromDropdown = new Date(y, m - 1, d);
    dateFromDropdown.setDate(dateFromDropdown.getDate() - 1); // Mulai cek dari hari sebelumnya
    
    // Menggunakan fungsi libur nasional yang baru kita buat
    const validExpectedDate = await window.getValidWorkingDateReverse(dateFromDropdown);
    
    const targetTgl = String(validExpectedDate.getDate()).padStart(2, '0');
    const targetBln = String(validExpectedDate.getMonth() + 1).padStart(2, '0');
    const targetThn = validExpectedDate.getFullYear();
    const targetDateStr = `${targetTgl}-${targetBln}-${targetThn}`;

    if (formattedFileDate !== targetDateStr) {
        window.miuiAlert(`Peringatan: File yang Anda pilih adalah mutasi tanggal ${formattedFileDate}, sedangkan untuk tanggal muat ${d}/${m}/${y}, sistem memerlukan file tanggal ${targetDateStr}. Import dibatalkan!`);
        event.target.value = ''; 
        return;
    }

    // --- 4. PEMBENTUKAN NO DO ---
    const noDOMutasi = `${parseInt(tgl)}${parseInt(bln)}${tahunFile.slice(-2)}`; 

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const worksheet = workbook.Sheets['RAK'];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: 2 });

        const dataWh3 = jsonData.filter(row => 
            row['Rak'] && row['Rak'].toString().includes('WH-3')
        );

        if (dataWh3.length === 0) {
            window.miuiAlert("Tidak ditemukan data WH-3 dalam file ini.");
            return;
        }

        const formattedData = {};
        formattedData[noDOMutasi] = {
            tujuan: "Z-MUTASI",
            data: {}
        };

        dataWh3.forEach((item) => {
            formattedData[noDOMutasi].data[item['Kode']] = {
                kodeBarang: item['Kode'],
                qtyUtama: parseInt(item['Ambil'] || 0),
                gudang: item['Rak']
            };
        });

        const ta = document.getElementById('ta-bosnet-input');
        ta.value = JSON.stringify(formattedData, null, 2);

        const inputKodeTujuan = document.getElementById('input-kode-tujuan');
        const inputNamaTujuan = document.getElementById('input-nama-tujuan');

        if (inputKodeTujuan) inputKodeTujuan.value = "Z-MUTASI";
        if (inputNamaTujuan) inputNamaTujuan.value = `MUTASI GUDANG WH-2 (${noDOMutasi})`;

        window.miuiAlert(`Berhasil memuat ${dataWh3.length} baris data Mutasi (${noDOMutasi}).`);
    };
    reader.readAsArrayBuffer(file);
}

window.simpanKeFirebase = async function(parsedData, kodeTujuan, namaLengkapTujuan) {
    const firestoreDB = window.db; 
    
    if (!firestoreDB) {
        window.miuiAlert("Error: Koneksi Database tidak ditemukan.");
        return;
    }
    
    const kodeClean = (kodeTujuan || "UNKNOWN").toUpperCase();
    
    // --- 1. LOGIKA PENENTUAN TANGGAL ---
    let tglId = "";
    const selectTanggal = document.getElementById('select-tanggal-muat');

    // Jika Mutasi, ambil dari dropdown. Jika Bosnet, pakai logika hari kerja berikutnya.
    if (kodeClean === "Z-MUTASI" && selectTanggal && selectTanggal.value) {
        tglId = selectTanggal.value; // Nilai format "20260716"
    } else {
        // Logika hari kerja berikutnya untuk BOSNET
        let liburNasional = [];
        try {
            liburNasional = await window.getHariLiburNasional();
        } catch (e) {
            console.warn("Gagal ambil hari libur, lanjut tanpa pengecekan libur.");
        }

        const getNextWorkingDay = (date) => {
            let nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            while (nextDate.getDay() === 0 || liburNasional.includes(nextDate.toISOString().split('T')[0])) {
                nextDate.setDate(nextDate.getDate() + 1);
            }
            return nextDate;
        };

        const targetDate = getNextWorkingDay(new Date());
        tglId = targetDate.toISOString().split('T')[0].replace(/-/g, '');
    }
    
    // folderId menggunakan nama kodeTujuan agar unik per tujuan di hari yang sama
    const folderId = `${kodeClean}_${tglId}`;
    
    try {
        // 3. Path disesuaikan dengan struktur: muat_wh3 > tglId > datatujuan > folderId
        const folderRef = firestoreDB.collection("muat_wh3").doc(tglId).collection("datatujuan").doc(folderId);
        
        await folderRef.set({
            tujuan: kodeClean,
            nama_tujuan: namaLengkapTujuan || kodeClean,
            tanggal_kirim: tglId,
            status: "DRAFT",
            tipe: kodeClean === "Z-MUTASI" ? "MUTASI" : "BOSNET",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 4. Simpan Data Transaksi (Batch)
        const batch = firestoreDB.batch();
        for (const noDO in parsedData) {
            if (parsedData.hasOwnProperty(noDO)) {
                const docRef = folderRef.collection("data").doc(noDO);
                batch.set(docRef, parsedData[noDO]); 
            }
        }
        await batch.commit();
        
        console.log("Data berhasil disimpan ke Firestore:", folderId);
        window.miuiAlert(`Data Berhasil Disimpan ke periode ${tglId}!`);
        
        // 5. Reset dan Refresh UI
        if (typeof window.resetFormulir === 'function') window.resetFormulir();
        if (typeof window.renderTabelGabungan === 'function') await window.renderTabelGabungan();
        if (typeof window.updateTanggalDropdownMuatWH3 === 'function') await window.updateTanggalDropdownMuatWH3();
        
    } catch (error) {
        console.error("Gagal mengirim data ke Firestore:", error);
        window.miuiAlert("Error: Gagal menyimpan ke server: " + error.message);
    }
};

// Fungsi untuk membersihkan form
window.resetFormulir = function() {
    document.getElementById('input-kode-tujuan').value = "";
    document.getElementById('input-nama-tujuan').value = "";
    document.getElementById('ta-bosnet-input').value = "";
};

window.renderTabelGabungan = async function() {
    const selectTgl = document.getElementById('select-tanggal-muat');
    const tbody = document.getElementById('tabel-matriks-body');
    const thead = document.getElementById('tabel-matriks-head');

    // Jika elemen-elemen utama ini tidak ada di halaman yang sedang dibuka, hentikan fungsi dengan aman
    if (!selectTgl || !tbody) {
        return; 
    }

    const tglId = selectTgl.value;
    const db = window.getFirestore(); // Menggunakan instance firestore yang sudah ada

    if (!tglId) {
        const elTotalTujuan = document.getElementById('txt-total-tujuan');
        const elTotalNodo = document.getElementById('txt-total-nodo');
        if (elTotalTujuan) elTotalTujuan.innerText = '0';
        if (elTotalNodo) elTotalNodo.innerText = '0';
        tbody.innerHTML = '<tr><td colspan="10" class="text-center p-4">Pilih tanggal terlebih dahulu</td></tr>';
        return;
    }

    try {
        // --- 1. MENGAMBIL DATA DARI FIRESTORE ---
        const snapshot = await db.collection("muat_wh3").doc(tglId).collection("datatujuan").get();

        if (snapshot.empty) {
            const elTotalTujuan = document.getElementById('txt-total-tujuan');
            const elTotalNodo = document.getElementById('txt-total-nodo');
            if (elTotalTujuan) elTotalTujuan.innerText = '0';
            if (elTotalNodo) elTotalNodo.innerText = '0';
            tbody.innerHTML = '<tr><td colspan="10" class="text-center p-4">Data tidak ditemukan</td></tr>';
            return;
        }

        // --- 2. DEFINISI FUNGSI PENGURUTAN (TETAP) ---
        const polaUtama = ["CRR", "CRR EA", "THR EA", "THR", "MRMR", "MRR", "MJR HJ", "MJR", "MOB4A", "MOR2A EA", "MOR2A EB", "MOR2A", "MP", "PDR", "MTR3A", "PR-PKT", "PR-CUP", "MRSR", "LTGR", "MTGR", "MEB", "MOL", "MRL", "MTL", "ISEL"];
        
        const getSortScore = (kode) => {
            let k = kode.toUpperCase();
            for (let i = 0; i < polaUtama.length; i++) {
                if (k.includes(polaUtama[i])) {
                    if (polaUtama[i] === "MOR2A" && (k.includes("MOR2A EA") || k.includes("MOR2A EB"))) continue;
                    if (polaUtama[i] === "THR" && k.includes("THR EA")) continue;
                    if (polaUtama[i] === "MJR" && k.includes("MJR HJ")) continue;
                    if (polaUtama[i] === "CRR" && k.includes("CRR EA")) continue;
                    return i + 1;
                }
            }
            return 999;
        };

        const getVarianScore = (kode) => {
            let k = kode.toUpperCase();
            if (k.includes("ZC")) return 1;
            if (k.includes("SSL")) return 2;
            if (k.includes("SLO")) return 3;
            if (k.includes("TDS")) return 4;
            if (k.includes("BAG")) return 5;
            if (k.includes("WRG")) return 6;
            if (k.includes("GTG")) return 7;
            return 0;
        };

        const getAngkaAkhir = (kode) => {
            const match = kode.match(/\d+/g);
            return match ? (parseInt(match.join('').slice(-4)) || 999) : 999;
        };

        // --- 3. PROSES DATA DARI FIRESTORE ---
        let daftarBarangSet = new Set();
        let groupTujuan = {}; 
        let totalNoDO = 0;

        for (const doc of snapshot.docs) {
            const itemTujuan = doc.data(); 
            const folderId = doc.id;
            const namaTujuan = itemTujuan.tujuan || folderId;

            const subSnapshot = await doc.ref.collection("data").get();
            const listNoDO = subSnapshot.docs.map(d => d.id);
            totalNoDO += listNoDO.length;

            if (!groupTujuan[namaTujuan]) {
                let labelNoDO = (listNoDO.length === 1) 
                    ? listNoDO[0] 
                    : (listNoDO[0] + "," + listNoDO.slice(1).map(id => id.slice(-2)).join(","));
                
                groupTujuan[namaTujuan] = { label: labelNoDO, data: {} };
            }

            subSnapshot.docs.forEach(doDoc => {
                const rawDoc = doDoc.data();
                const dataBarang = rawDoc.data || rawDoc; 

                Object.keys(dataBarang).forEach(kode => {
                    const barang = dataBarang[kode];
                    if (barang && typeof barang === 'object' && barang.qtyUtama !== undefined) {
                        daftarBarangSet.add(kode);
                        groupTujuan[namaTujuan].data[kode] = (groupTujuan[namaTujuan].data[kode] || 0) + parseInt(barang.qtyUtama || 0);
                    }
                });
            });
        }
        
        const sortedBarang = Array.from(daftarBarangSet).sort((a, b) => {
            const scoreA1 = getSortScore(a), scoreB1 = getSortScore(b);
            if (scoreA1 !== scoreB1) return scoreA1 - scoreB1;
            const scoreA2 = getVarianScore(a), scoreB2 = getVarianScore(b);
            if (scoreA2 !== scoreB2) return scoreA2 - scoreB2;
            return getAngkaAkhir(a) - getAngkaAkhir(b);
        });

        const elTotalTujuan = document.getElementById('txt-total-tujuan');
        const elTotalNodo = document.getElementById('txt-total-nodo');
        if (elTotalTujuan) elTotalTujuan.innerText = Object.keys(groupTujuan).length;
        if (elTotalNodo) elTotalNodo.innerText = totalNoDO;

        // --- 4. RENDER HEADER ---
        let row1 = `<th rowspan="2" class="p-3 border border-slate-500">KODE BARANG</th>`;
        let row2 = "";
        const listTujuanKeys = Object.keys(groupTujuan);
        
        listTujuanKeys.forEach(tujuan => {
            row1 += `<th class="p-2 text-center border border-slate-500 text-[10px]">${groupTujuan[tujuan].label}</th>`;
            row2 += `<th class="p-1 text-center text-[11px] text-slate-800 font-bold border border-slate-500">${tujuan}</th>`;
        });
        
        row1 += `<th rowspan="2" class="p-3 border border-slate-500 text-center">TOTAL</th>
                 <th rowspan="2" class="p-3 border border-slate-500 text-center">PLT | KRT</th>`;
        if (thead) thead.innerHTML = `<tr>${row1}</tr><tr>${row2}</tr>`;

        // --- 5. RENDER BODY ---
        tbody.innerHTML = '';
        sortedBarang.forEach(kode => {
            let rowTotal = 0;
            let cells = '';
            
            listTujuanKeys.forEach(tujuan => {
                const qty = groupTujuan[tujuan].data[kode] || 0;
                rowTotal += qty;
                cells += `<td class="p-3 text-center border border-slate-500">${qty > 0 ? qty : ''}</td>`;
            });

            const masterInfo = window.cacheMasterBarang ? window.cacheMasterBarang[kode] : null;
            const qtyPerPalet = (masterInfo && masterInfo.QTY) ? parseInt(masterInfo.QTY) : 1;
            const hasilPlt = Math.floor(rowTotal / qtyPerPalet);
            const sisaKrt = rowTotal % qtyPerPalet;

            tbody.innerHTML += `
                <tr class="hover:bg-orange-50">
                    <td class="p-3 font-black text-slate-800 border border-slate-500">${kode}</td>
                    ${cells}
                    <td class="p-3 font-black text-center text-slate-800 border border-slate-500">${rowTotal}</td>
                    <td class="p-3 text-center border border-slate-500">
                        <span class="font-black text-emerald-600">${hasilPlt}</span> 
                        <span class="text-slate-300">|</span> 
                        <span class="font-black text-rose-600">${sisaKrt}</span>
                    </td>
                </tr>
            `;
        });

    } catch (e) {
        console.error("Error sinkronisasi Firestore:", e);
        window.miuiAlert("Gagal memuat data dari Firestore: " + e.message);
    }
};

// Pastikan fungsi ini dipanggil saat tombol AMBIL RAK & BLOK diklik
window.handleAmbilRakBlok = async function() {
    const tglMuat = document.getElementById('select-tanggal-muat').value;
    console.log("Mode: RAK & BLOK. Mengambil data untuk:", tglMuat);

    // Pastikan fungsi ini memicu rendering tabel gabungan
    await window.renderTabelRakGabungan(); 
};

window.muatDropdownStok = async function(retryCount = 0) {
    const select = document.getElementById('select-tanggal-stok-wh3');
    
    // Jika belum ditemukan, coba lagi maksimal 5 kali (setiap 200ms)
    if (!select) {
        if (retryCount < 5) {
            setTimeout(() => window.muatDropdownStok(retryCount + 1), 200);
            return;
        }
        // Ganti console.error menjadi console.log biasa agar tidak memunculkan teks merah di Console
        console.log("Info: Elemen select-tanggal-stok-wh3 tidak ada di halaman ini, dilewati.");
        return;
    }

    const db = firebase.database();
    const ref = db.ref('stok_wh3');

    const snapshot = await ref.once('value');
    if (snapshot.exists()) {
        const data = snapshot.val();
        select.innerHTML = '<option value="">Pilih Stok WH-3</option>';

        Object.keys(data).sort().reverse().forEach(key => {
            const tglRaw = key.split('_')[1];
            if (tglRaw && tglRaw.length === 8) {
                const y = tglRaw.substring(0, 4);
                const m = tglRaw.substring(4, 6);
                const d = tglRaw.substring(6, 8);
                
                const option = document.createElement('option');
                option.value = tglRaw;
                option.textContent = `Stok WH-3 [ ${d}-${m}-${y} ]`;
                select.appendChild(option);
            }
        });
    }
};

window.renderTabelRakGabungan = async function() {
    console.log("Mulai menjalankan renderTabelRakGabungan...");
    const tglMuat = document.getElementById('select-tanggal-muat').value;
    const tglStok = document.getElementById('select-tanggal-stok-wh3').value;
    const tbody = document.getElementById('tabel-rak-body');
    const db = window.getFirestore();

    // 1. Ambil Data Muat
    const snapshotMuat = await db.collection("muat_wh3").doc(tglMuat).collection("datatujuan").get();
    let rekapMuat = {}; 
    
    if (snapshotMuat.empty) {
        console.warn("Snapshot kosong!");
        tbody.innerHTML = '<tr><td colspan="9" class="text-center p-4">Tidak ada data muat.</td></tr>';
        return;
    }

    for (const doc of snapshotMuat.docs) {
        const subSnapshot = await doc.ref.collection("data").get();
        subSnapshot.docs.forEach(doDoc => {
            const barang = doDoc.data().data || doDoc.data();
            Object.keys(barang).forEach(k => {
                if(barang[k].qtyUtama) {
                    rekapMuat[k] = (rekapMuat[k] || 0) + parseInt(barang[k].qtyUtama);
                }
            });
        });
    }

    // ... (Logika getSortScore, getVarianScore, getAngkaAkhir tetap sama) ...
    const polaUtama = ["CRR", "CRR EA", "THR EA", "THR", "MRMR", "MRR", "MJR HJ", "MJR", "MOB4A", "MOR2A EA", "MOR2A EB", "MOR2A", "MP", "PDR", "MTR3A", "PR-PKT", "PR-CUP", "MRSR", "LTGR", "MTGR", "MEB", "MOL", "MRL", "MTL", "ISEL"];
    const getSortScore = (kode) => {
        let k = kode.toUpperCase();
        for (let i = 0; i < polaUtama.length; i++) {
            if (k.includes(polaUtama[i])) {
                if (polaUtama[i] === "MOR2A" && (k.includes("MOR2A EA") || k.includes("MOR2A EB"))) continue;
                if (polaUtama[i] === "THR" && k.includes("THR EA")) continue;
                if (polaUtama[i] === "MJR" && k.includes("MJR HJ")) continue;
                if (polaUtama[i] === "CRR" && k.includes("CRR EA")) continue;
                return i + 1;
            }
        }
        return 999;
    };
    const getVarianScore = (kode) => {
        let k = kode.toUpperCase();
        if (k.includes("ZC")) return 1;
        if (k.includes("SSL")) return 2;
        if (k.includes("SLO")) return 3;
        if (k.includes("TDS")) return 4;
        if (k.includes("BAG")) return 5;
        if (k.includes("WRG")) return 6;
        if (k.includes("GTG")) return 7;
        return 0;
    };
    const getAngkaAkhir = (kode) => {
        const match = kode.match(/\d+/g);
        return match ? (parseInt(match.join('').slice(-4)) || 999) : 999;
    };

    // 2. Ambil Data Stok
    const snapshotStok = await firebase.database().ref('stok_wh3/stokwh3_' + tglStok).once('value');
    const dataStok = snapshotStok.val() || {};

    // 3. Render ke Tabel
    tbody.innerHTML = '';
    
    Object.keys(rekapMuat).sort((a, b) => {
        const scoreA1 = getSortScore(a), scoreB1 = getSortScore(b);
        if (scoreA1 !== scoreB1) return scoreA1 - scoreB1;
        const scoreA2 = getVarianScore(a), scoreB2 = getVarianScore(b);
        if (scoreA2 !== scoreB2) return scoreA2 - scoreB2;
        return getAngkaAkhir(a) - getAngkaAkhir(b);
    }).forEach(kode => {
        const total = rekapMuat[kode];
        const stok = dataStok[kode] || { totalStok: 0, rak: '-', blok: '-', exp: '-' };
        const kekurangan = total - stok.totalStok;

        const masterInfo = window.cacheMasterBarang ? window.cacheMasterBarang[kode] : null;
        const qtyPerPalet = (masterInfo && masterInfo.QTY) ? parseInt(masterInfo.QTY) : 1;
        
        const pltTotal = Math.floor(total / qtyPerPalet);
        const krtTotal = total % qtyPerPalet;
        
        const kekuranganPositif = kekurangan > 0 ? kekurangan : 0;
        const pltKurang = Math.floor(kekuranganPositif / qtyPerPalet);
        const krtKurang = kekuranganPositif % qtyPerPalet;

        tbody.innerHTML += `
            <tr class="border-b hover:bg-slate-50">
                <td class="p-3 font-bold text-slate-800">${kode}</td>
                <td class="p-3 text-center text-slate-800">${total}</td>
                <td class="p-3 text-center text-slate-800">
                    <span class="font-black text-emerald-600">${pltTotal}</span> | 
                    <span class="font-black text-rose-600">${krtTotal}</span>
                </td>
                <td class="p-3 text-left text-slate-800">-</td> <!-- Rak Ambil -->
                <td class="p-3 text-center text-slate-800">${stok.totalStok}</td>
                <td class="p-3 text-center font-bold ${kekurangan > 0 ? 'text-red-600' : 'text-emerald-600'}">${kekurangan}</td>
                <td class="p-3 text-center text-slate-800">
                    <span class="font-black text-emerald-600">${pltKurang}</span> | 
                    <span class="font-black text-rose-600">${krtKurang}</span>
                </td>
                <td class="p-3 text-left text-slate-800">-</td> <!-- Ambil Blok -->
                <td class="p-3 text-left text-[10px] text-slate-800">-</td> <!-- Exp Blok -->
            </tr>
        `;
    });

    // --- 4. LOAD DATA TERSIMPAN (SINKRON DENGAN FIRESTORE) ---
    if (tglMuat) {
        try {
            // Mengambil dari koleksi info_rak_blok sesuai tglMuat
            const docRef = db.collection("muat_wh3").doc(tglMuat).collection("info_rak_blok").doc("data_rekap");
            const docSnapshot = await docRef.get();

            if (docSnapshot.exists) {
                const dataTersimpan = docSnapshot.data().data_per_item || {};
                
                const rows = tbody.querySelectorAll('tr');
                rows.forEach(row => {
                    const kode = row.cells[0].innerText;
                    const data = dataTersimpan[kode];
                    
                    // Jika data tersedia, tampilkan; jika tidak, biarkan tanda '-' tetap ada
                    if (data) {
                        row.cells[3].innerText = data.rak_ambil || '-';
                        row.cells[4].innerText = data.total_stok || '-';
                        row.cells[5].innerText = data.sisa_stok || '-';
                        
                        // Update kelas warna sisa stok agar sinkron
                        const sisa = parseInt(data.sisa_stok) || 0;
                        row.cells[5].className = `p-3 text-center font-bold ${sisa < 0 ? 'text-red-600' : 'text-emerald-600'}`;
                        
                        // Update PLT | KRT
                        row.cells[6].innerHTML = data.plt_krt_sisa || '-';
                        
                        
                        // LOGIKA TAMPILAN AMBIL BLOK (Sinkron dengan format baru)
                        if (sisa < 0) {
                            // Jika minus, tampilkan dengan format AMBIL [ ... ] dan warna merah berkedip
                            row.cells[7].innerHTML = `<span class="text-red-600 font-black animate-pulse">${data.ambil_blok || '-'}</span>`;
                            row.cells[8].innerHTML = `<span class="text-gray-600 font-black">${data.exp_blok || '-'}</span>`;
                        } else {
                            // Jika tidak minus, tampilkan teks biasa
                            row.cells[7].innerText = data.ambil_blok || '-';
                            row.cells[8].innerText = data.exp_blok || '-';
                        }
                    }
                });
            }
        } catch (error) {
            miuiAlert("Gagal memuat data rak & blok: " + error.message);
            console.error("Gagal memuat data rak & blok:", error);
        }
    }
    window.updateJudulRingkasan(tglMuat);
};

window.prosesOtomatisStok = async function() {
    const btn = document.getElementById('btn-proses-otomatis');
    const tglStok = document.getElementById('select-tanggal-stok-wh3').value;
    
    if (!tglStok) {
        miuiAlert("Pilih tanggal stok terlebih dahulu!");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerText = "MEMPROSES...";
    }

    // 1. Ambil data stok & data stok_blok
    const [snapshotStok, responseBlok] = await Promise.all([
        firebase.database().ref('stok_wh3/stokwh3_' + tglStok).once('value'),
        fetch("https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_blok.json")
    ]);
    
    const dataStok = snapshotStok.val() || {};
    const dataBlok = await responseBlok.json() || {};

    const mapNamaBlok = (nama) => {
        const n = nama.toUpperCase();
        if (n.includes('RETUR')) return 'RT';
        if (n.includes('TEKOMAS')) return 'TK';
        if (n.includes('18CD')) return 'CD';
        if (n.includes('18E')) return 'E';
        if (n.includes('18F')) return 'F';
        if (n.includes('BLOK H')) return 'H';
        if (n.includes('PROMOSI')) return 'PR';
        return nama.replace('BLOK ', '');
    };

    // 2. Iterasi tabel
    const rows = document.querySelectorAll('#tabel-rak-body tr');
    
    rows.forEach(row => {
        const kode = row.cells[0].innerText;
        const itemStok = dataStok[kode];

        if (itemStok) {
            const master = window.cacheMasterBarang ? window.cacheMasterBarang[kode] : null;
            const konversi = (master && master.QTY) ? parseInt(master.QTY) : 1;
            
            // PERBAIKAN: Hitung total stok dari Beceran + Utuhan
            const qtyBeceran = parseInt(itemStok.beceran) || 0;
            const qtyUtuhan = parseInt(itemStok.utuhan) || 0;
            const totalStok = qtyBeceran + qtyUtuhan;

            // C. Format Rak Ambil
            const detail = itemStok.detail_rak || {};
            const formatRak = (str) => str ? str.replace(/(\d+)([A-Za-z]+)(\d+)/g, "$1 $2 $3") : "-";
            const rakBeceran = formatRak(detail.beceran_rak || "");
            const beceranDisplay = (rakBeceran !== "-") ? `${rakBeceran} = ${qtyBeceran}` : "";
            const utuhanFormatted = detail.utuhan_rak ? detail.utuhan_rak.split('+').map(part => formatRak(part.trim())).join(' + ') : "";
            const rakAmbil = `${beceranDisplay}${utuhanFormatted ? (beceranDisplay ? ' + ' : '') + utuhanFormatted : ''}`;

            // F. PROSES AMBIL BLOK & EXP BLOK (Sama seperti sebelumnya)
            let ambilBlokArr = [];
            let expBlokArr = [];

            Object.keys(dataBlok).forEach(namaBlok => {
                if (dataBlok[namaBlok][kode]) {
                    const expData = dataBlok[namaBlok][kode];
                    let blokPlt = 0;
                    let expDetail = [];
                    Object.keys(expData).forEach(exp => {
                        const item = expData[exp];
                        blokPlt += parseInt(item.plt) || 0;
                        expDetail.push(`${exp.split('-')[0].substring(0,3).toUpperCase()}-${exp.split('-')[1]}:${item.plt}`);
                    });
                    const shortBlok = mapNamaBlok(namaBlok);
                    ambilBlokArr.push(`${shortBlok}:${blokPlt}`);
                    expBlokArr.push(`${shortBlok}: [${expDetail.join(' + ')}]`);
                }
            });

            // E. Update Kekurangan & PLT/KRT
            const totalMuat = parseInt(row.cells[1].innerText) || 0;
            const kekurangan = totalStok - totalMuat;
            
            // Perbaikan Logika PLT | KRT agar akurat untuk angka negatif
            const absKekurangan = Math.abs(kekurangan);
            let pltSisa = Math.floor(absKekurangan / konversi);
            let krtSisa = absKekurangan % konversi;

            // Jika aslinya kekurangan (negatif), kita beri tanda negatif pada PLT 
            // atau pada KRT jika PLT-nya adalah 0
            if (kekurangan < 0) {
                if (pltSisa > 0) {
                    pltSisa = -pltSisa;
                } else {
                    krtSisa = -krtSisa;
                }
            }

            // D. Update tampilan baris tabel
            row.cells[3].innerText = rakAmbil;
            row.cells[4].innerText = totalStok;
            row.cells[5].innerText = kekurangan;
            row.cells[5].className = `p-3 text-center font-bold ${kekurangan < 0 ? 'text-red-600' : 'text-emerald-600'}`;
            
            // LOGIKA TAMPILAN AMBIL BLOK
            let infoBlok = ambilBlokArr.length > 0 ? ambilBlokArr.join(' | ') : 'KOSONG!';
            let infoExp = expBlokArr.length > 0 ? expBlokArr.join(' | ') : '-';
            let tampilanBlok = '-';

            if (kekurangan < 0) {
                // KONDISI 1: Stok Kurang (Negatif) - Tampilkan dengan highlight
                row.cells[7].innerHTML = `<span class="text-red-600 font-black animate-pulse">AMBIL [ ${infoBlok} ]</span>`;
                row.cells[8].innerHTML = `<span class="text-gray-600 font-black">${infoExp}</span>`;
            } else if (kekurangan < konversi) {
                // KONDISI 2: Stok cukup TAPI sisa kurang dari 1 palet - Tampilkan normal
                row.cells[7].innerText = ambilBlokArr.length > 0 ? `AMBIL [ ${infoBlok} ]` : '-';
                row.cells[8].innerText = infoExp;
            } else {
                // KONDISI 3: Stok cukup & sisa >= 1 palet - Sembunyikan
                row.cells[7].innerText = '-';
                row.cells[8].innerText = '-';
            }

            // Update UI PLT | KRT
            row.cells[6].innerHTML = `<span class="font-black ${kekurangan < 0 ? 'text-red-600' : 'text-emerald-600'}">${pltSisa}</span> | <span class="font-black text-rose-600">${Math.abs(krtSisa)}</span>`;
            window.miuiAlert(`Data Rak & Blok Berhasil Disimpan`);
        }
    });

    if (btn) {
        btn.disabled = false;
        btn.innerText = "PROSES RAK & BLOK";
    }
};


window.simpanDataRakBlok = async function() {
    const btn = document.getElementById('btn-simpan-rak-blok');
    const tglMuat = document.getElementById('select-tanggal-muat').value; // Menggunakan tanggal muat sebagai acuan utama
    const firestoreDB = window.db; 
    
    if (!tglMuat) {
        miuiAlert("Pilih tanggal muat terlebih dahulu!");
        return;
    }

    btn.disabled = true;
    btn.innerText = "MENYIMPAN...";

    // 1. Mengambil data dari tabel
    const rows = document.querySelectorAll('#tabel-rak-body tr');
    let dataUntukDisimpan = {};

    rows.forEach(row => {
        const kode = row.cells[0].innerText;
        dataUntukDisimpan[kode] = {
            rak_ambil: row.cells[3].innerText,
            total_stok: row.cells[4].innerText,
            sisa_stok: row.cells[5].innerText,
            plt_krt_sisa: row.cells[6].innerText,
            ambil_blok: row.cells[7].innerText,
            exp_blok: row.cells[8].innerText,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
    });

    try {
        // 2. Menyimpan ke Firestore
        // Struktur: muat_wh3 -> [tglMuat] -> info_rak_blok -> data
        const docRef = firestoreDB.collection("muat_wh3").doc(tglMuat).collection("info_rak_blok").doc("data_rekap");
        
        await docRef.set({
            data_per_item: dataUntukDisimpan,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });

        miuiAlert("Data Rak & Blok berhasil disimpan ke periode muat " + tglMuat);
    } catch (error) {
        console.error("Gagal menyimpan ke Firestore:", error);
        miuiAlert("Gagal menyimpan data: " + error.message);
    }

    btn.disabled = false;
    btn.innerText = "SIMPAN RAK WH-3 & BLOK";
};


window.bukaModalAmbil = function() {
    const modal = document.getElementById('modal-ambil-blok-custom');
    if (modal) {
        modal.classList.remove('hidden');
        // Panggil fungsi untuk mengisi data referensi saat modal dibuka
        window.isiDataReferensiModal();
        window.loadDataAlokasi();
        window.muatDropdownKodeDariStokBlok();
    }
};

window.tutupModalAmbil = function() {
    const modal = document.getElementById('modal-ambil-blok-custom');
    if (modal) {
        modal.classList.add('hidden');
    }
};


window.isiDataReferensiModal = function() {
    const panelRef = document.getElementById('panel-kebutuhan-referensi');
    const selectKode = document.getElementById('select-kode-ambil');
    
    panelRef.innerHTML = '';
    selectKode.innerHTML = '<option value="">-- Pilih Kode Barang --</option>';

    const rows = document.querySelectorAll('table tbody tr'); 
    
    rows.forEach(row => {
        const cellAmbil = Array.from(row.cells).find(cell => cell.innerText.includes('AMBIL ['));
        
        if (cellAmbil) {
            const kode = row.cells[0].innerText;
            const sisaStokRaw = row.cells[6].innerText.trim();
            const infoAmbil = cellAmbil.innerText;
            
            // --- MENGAMBIL INFO EXP ---
            // Sesuaikan row.cells[X] dengan indeks kolom data Expire Anda
            const infoExp = row.cells[8] ? row.cells[8].innerText.trim() : ""; 

            // --- LOGIKA PEMBULATAN PLT ---
            let pltBulat = 0;
            if (sisaStokRaw.includes('|')) {
                const parts = sisaStokRaw.split('|');
                const plt = parseInt(parts[0]);
                const krt = parseInt(parts[1]);
                pltBulat = krt > 0 ? (plt - 1) : plt;
            } else {
                pltBulat = parseInt(sisaStokRaw);
            }
            
            const totalAmbil = Math.abs(pltBulat);

            // --- TAMPILAN BARU ---
            // Menambahkan infoExp di samping infoAmbil dengan pemisah |
            panelRef.innerHTML += `
                <div class="mb-2 p-2 bg-white rounded border border-orange-100">
                    <span class="font-black text-orange-600">${kode}</span> 
                    <span class="text-[12px] text-slate-600 font-bold">| Perlu Ambil: ${totalAmbil} PLT</span>
                    <div class="text-[12px]">
                        <span class="text-emerald-600">${infoAmbil}</span> 
                        <span class="text-slate-700">|</span> 
                        <span class="text-orange-500">${infoExp ? `[${infoExp}]` : '-'}</span>
                    </div>
                </div>`;
            
            selectKode.innerHTML += `<option value="${kode}" data-butuh="${totalAmbil}">${kode}</option>`;
        }
    });
};


window.muatDropdownKodeDariStokBlok = async function() {
    const selectKode = document.getElementById('select-kode-ambil');
    if (!selectKode) return;
    
    // Kosongkan dan set default
    selectKode.innerHTML = '<option value="">-- Pilih Kode Barang --</option>';

    try {
        const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
        const response = await fetch(`${FIREBASE_URL}stok_blok.json`);
        const allData = await response.json();
        
        if (!allData) return;

        // Kumpulkan semua kode unik dari seluruh blok yang ada di database
        let setKodeUnik = new Set();
        Object.keys(allData).forEach(namaBlok => {
            const blokData = allData[namaBlok];
            if (blokData) {
                Object.keys(blokData).forEach(kode => {
                    setKodeUnik.add(kode);
                });
            }
        });

        // Urutkan kode secara alfabetis dan masukkan ke dalam dropdown
        Array.from(setKodeUnik).sort().forEach(kode => {
            const opt = document.createElement('option');
            opt.value = kode;
            opt.text = kode;
            selectKode.appendChild(opt);
        });

        console.log("Dropdown kode barang berhasil dimuat dari stok_blok sejumlah:", setKodeUnik.size);
    } catch (e) {
        console.error("Gagal memuat daftar kode barang dari stok_blok:", e);
    }
};

const selectKodeAmbil = document.getElementById('select-kode-ambil');

if (selectKodeAmbil) {
    selectKodeAmbil.addEventListener('change', async function() {
        const kodeDipilih = this.value;
        const selectBlok = document.getElementById('select-blok-ambil');
        
        // Reset dropdown blok jika ada
        if (selectBlok) {
            selectBlok.innerHTML = '<option value="">-- Pilih Blok Asal --</option>';
        }
        
        if (!kodeDipilih || !selectBlok) return;

        try {
            const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
            const response = await fetch(`${FIREBASE_URL}stok_blok.json`);
            const allData = await response.json();
            
            if (!allData) return;

            const master = window.dataMasterBarang || {};
            const inisialDicari = master[kodeDipilih]?.INISIAL || kodeDipilih;

            // Objek untuk menampung dan menggabungkan data per nama blok
            let groupBlok = {};

            // Iterasi melalui setiap blok di stok_blok.json
            Object.keys(allData).forEach(namaBlok => {
                const blokData = allData[namaBlok];
                
                Object.keys(blokData).forEach(kode => {
                    const infoBarang = master[kode] || { INISIAL: kode };
                    
                    // Cocokkan berdasarkan inisial atau kode barang yang dipilih
                    if (infoBarang.INISIAL === inisialDicari || kode === kodeDipilih) {
                        const expData = blokData[kode];
                        
                        // Loop setiap tanggal expired di dalam blok tersebut
                        Object.keys(expData).forEach(exp => {
                            const item = expData[exp];
                            const plt = parseInt(item.plt) || 0;
                            const krt = parseInt(item.krt) || 0;
                            
                            if (plt > 0 || krt > 0) {
                                // Jika nama blok belum ada di group, inisialisasi
                                if (!groupBlok[namaBlok]) {
                                    groupBlok[namaBlok] = {
                                        totalPlt: 0,
                                        arrExpDetail: []
                                    };
                                }

                                // Akumulasi total palet per blok
                                groupBlok[namaBlok].totalPlt += plt;
                                // Masukkan rincian exp dan jumlahnya
                                groupBlok[namaBlok].arrExpDetail.push(`${exp}:${plt}`);
                            }
                        });
                    }
                });
            });

            // Masukkan data yang sudah digabung ke dalam dropdown
            Object.keys(groupBlok).forEach(namaBlok => {
                const dataBlok = groupBlok[namaBlok];
                const gabunganExp = dataBlok.arrExpDetail.join(' + ');

                let opt = document.createElement('option');
                opt.value = namaBlok;
                
                // Format akhir: TEKOMAS : 15 PLT [28-JUN:2 + 28-JUL:13]
                opt.text = `${namaBlok} : ${dataBlok.totalPlt} PLT [${gabunganExp}]`;
                selectBlok.appendChild(opt);
            });

        } catch (e) {
            console.error("Gagal memuat rincian blok dari database:", e);
        }
    });
}

window.getDataStokByKode = function(kode) {
    // Cari baris berdasarkan kode
    const rows = document.querySelectorAll('table tbody tr');
    let dataStok = [];
    
    rows.forEach(row => {
        if (row.cells[0].innerText.trim() === kode) {
            // Ambil teks dari kolom EXP (Kolom ke-7 / index 7)
            const textExp = row.cells[7].innerText; 
            // Parsing string seperti "CD: [28-FEB:2 + 28-JUN:4]"
            // Di sini kita ubah jadi array objek untuk dihitung FEFO-nya
            // ... (logika parsing string exp Anda)
        }
    });
    return dataStok;
};

window.getNamaBlokPenuh = function(kodeSingkat) {
    const s = kodeSingkat.toUpperCase();
    const map = {
        'RT': 'RETUR',
        'TK': 'TEKOMAS',
        'CD': '18CD',
        'E':  'BLOK 18E',
        'F':  'BLOK 18F',
        'H':  'BLOK H',
        'PR': 'PROMOSI'
    };
    return map[s] || `BLOK ${s}`;
};

window.tambahAlokasi = async function() {
    const tglMuat = document.getElementById('select-tanggal-muat') ? document.getElementById('select-tanggal-muat').value : '';
    const kode = document.getElementById('select-kode-ambil').value;
    const selectBlokEl = document.getElementById('select-blok-ambil');
    const blok = selectBlokEl.value;
    const jumlah = parseInt(document.getElementById('input-plt-ambil').value);
    
    if (!tglMuat) {
        window.miuiAlert("Pilih tanggal muat terlebih dahulu!");
        return;
    }

    if (!kode || !blok || !jumlah) {
        window.miuiAlert("Lengkapi data kode, blok, dan jumlah!");
        return;
    }

    // --- AMBIL INFO EXP LANGSUNG DARI TEKS DROPDOWN BLOK ASAL ---
    let infoExp = "EXP tidak tersedia";
    const selectedOption = selectBlokEl.options[selectBlokEl.selectedIndex];
    if (selectedOption && selectedOption.text) {
        // Format teks dropdown: "TEKOMAS : 15 PLT [28-JUL:13 + 28-JUN:2]" atau sejenisnya
        let textOpt = selectedOption.text;
        let start = textOpt.indexOf('[');
        let end = textOpt.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
            infoExp = textOpt.substring(start + 1, end).trim();
        }
    }
    
    const listRingkasan = document.getElementById('list-ringkasan');
    
    // 1. Bersihkan placeholder "Belum ada data..." jika ada
    const placeholder = listRingkasan.querySelector('.italic');
    if (placeholder) {
        listRingkasan.innerHTML = '';
    }

    let blokContainer = document.getElementById(`blok-group-${blok}`);
    let headerEl = document.getElementById(`header-${blok}`);
    let totalHidden = document.getElementById(`total-blok-${blok}`);

    // 2. Jika blok baru, buat container
    if (!blokContainer) {
        blokContainer = document.createElement('div');
        blokContainer.id = `blok-group-${blok}`;
        blokContainer.className = "mb-4 border-b pb-2";
        
        // Header terpadu: Nama Penuh + Total awal
        const namaPenuh = window.getNamaBlokPenuh ? window.getNamaBlokPenuh(blok) : blok;
        blokContainer.innerHTML = `<div class="font-black text-orange-600 text-[11px] mb-1" id="header-${blok}">${namaPenuh} = 0 PLT</div>`;
        
        // Elemen hidden untuk menyimpan angka total murni
        totalHidden = document.createElement('div');
        totalHidden.id = `total-blok-${blok}`;
        totalHidden.style.display = 'none';
        totalHidden.setAttribute('data-total', 0);
        
        blokContainer.appendChild(totalHidden);
        listRingkasan.appendChild(blokContainer);
        headerEl = document.getElementById(`header-${blok}`);
    }

    // 3. Tambahkan item barang
    const itemDiv = document.createElement('div');
    itemDiv.className = "flex justify-between text-[10px] ml-2 text-slate-800 mb-1";
    itemDiv.innerHTML = `<span>${kode} = ${jumlah} PLT [${infoExp}]</span>`;
    
    // Langsung append saja ke container
    blokContainer.appendChild(itemDiv);

    // 4. Update Total (Baca dari data-total yang tersimpan)
    let totalLama = parseInt(totalHidden.getAttribute('data-total') || 0);
    let totalBaru = totalLama + jumlah;
    totalHidden.setAttribute('data-total', totalBaru);
    
    // Update teks header
    const namaPenuhHeader = window.getNamaBlokPenuh ? window.getNamaBlokPenuh(blok) : blok;
    headerEl.innerText = `${namaPenuhHeader} = ${totalBaru} PLT`;

    // 5. Update Grand Total
    if (window.updateGrandTotal) {
        window.updateGrandTotal(jumlah);
    }

    // --- 6. SIMPAN KE FIRESTORE BERDASARKAN TGL MUAT ---
    try {
        const db = window.getFirestore();
        if (db) {
            const docRef = db.collection("muat_wh3").doc(tglMuat).collection("info_rak_blok").doc("data_rekap");
            
            // Ambil data eksisting terlebih dahulu agar tidak menimpa data item lain
            const docSnap = await docRef.get();
            let dataPerItem = docSnap.exists ? (docSnap.data().data_per_item || {}) : {};

            // Jika item belum ada di data_per_item, inisialisasi struktur dasarnya
            if (!dataPerItem[kode]) {
                dataPerItem[kode] = {
                    rak_ambil: "-",
                    total_stok: 0,
                    sisa_stok: 0,
                    plt_krt_sisa: "0 | 0",
                    ambil_blok: "",
                    exp_blok: ""
                };
            }

            let ambilBlokLama = dataPerItem[kode].ambil_blok || "";
            let expBlokLama = dataPerItem[kode].exp_blok || "";

            let formatAmbilBaru = `AMBIL [ ${blok}:${jumlah} ]`;
            let formatExpBaru = `${blok}: [${infoExp}]`;

            if (!ambilBlokLama || ambilBlokLama === "-") {
                dataPerItem[kode].ambil_blok = formatAmbilBaru;
                dataPerItem[kode].exp_blok = formatExpBaru;
            } else {
                dataPerItem[kode].ambil_blok = `${ambilBlokLama}, ${blok}:${jumlah}`;
                dataPerItem[kode].exp_blok = `${expBlokLama} + ${blok}: [${infoExp}]`;
            }

            // Simpan kembali ke Firestore
            await docRef.set({
                data_per_item: dataPerItem,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            console.log("Alokasi blok berhasil disimpan ke Firestore untuk tglMuat:", tglMuat);
        }
    } catch (error) {
        console.error("Gagal menyimpan alokasi ke Firestore:", error);
        window.miuiAlert("Gagal menyimpan data alokasi ke database: " + error.message);
    }

    // 7. RESET FORM
    document.getElementById('input-plt-ambil').value = '';
    document.getElementById('select-blok-ambil').selectedIndex = 0;
    document.getElementById('select-kode-ambil').selectedIndex = 0; 
};

window.updateJudulRingkasan = function(tglMuat) {
    // Jika tidak ada input tglMuat, fungsi berhenti
    if (!tglMuat) return; 

    // Mengubah string tglMuat (format "20260720") menjadi objek Date
    // Langsung menggunakan tanggal tersebut tanpa logika +1 hari
    const year = tglMuat.substring(0, 4);
    const month = tglMuat.substring(4, 6) - 1; 
    const day = tglMuat.substring(6, 8);
    
    const dateObj = new Date(year, month, day);

    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const tanggalFormat = dateObj.toLocaleDateString('id-ID', options);

    // Update teks judul
    const judulEl = document.getElementById('judul-ringkasan');
    if (judulEl) {
        // Menampilkan tanggal sesuai dengan tglMuat yang dipilih
        judulEl.innerText = `Ambil ${tanggalFormat}:`;
    }
};

window.getExpDataDariTabel = function(kode, blok) {
    const rows = document.querySelectorAll('table tbody tr');
    let hasilExp = "EXP tidak tersedia";
    
    rows.forEach(row => {
        // Pastikan baris memiliki sel pertama dan kodenya cocok
        if (row.cells && row.cells[0] && row.cells[0].innerText.trim() === kode) {
            // Pastikan kolom ke-8 (indeks 8 / kolom EXP Blok) ada pada baris tersebut
            if (row.cells.length > 8 && row.cells[8]) {
                const cellExp = row.cells[8].innerText || "";
                
                const bagian = cellExp.split('|');
                
                bagian.forEach(item => {
                    // Jika item mengandung nama blok (misal "TK:")
                    if (item.toUpperCase().includes(blok.toUpperCase() + ':')) {
                        // Ambil isi di dalam kurung siku [...]
                        const start = item.indexOf('[');
                        const end = item.indexOf(']');
                        if (start !== -1 && end !== -1) {
                            hasilExp = item.substring(start + 1, end).trim();
                        }
                    }
                });
            }
        }
    });
    
    // Debugging untuk memastikan apa yang dibaca
    console.log("Mencari EXP untuk:", kode, blok, "Hasil:", hasilExp);
    return hasilExp;
};

window.updateGrandTotal = function(tambahan) {
    let el = document.getElementById('grand-total-plt');
    let current = parseInt(el.innerText) || 0;
    el.innerText = (current + tambahan) + " PLT";
};

window.simpanAmbil = async function() {
    const listRingkasan = document.getElementById('list-ringkasan');
    
    // Menggunakan tanggal muat dari elemen select sebagai acuan utama
    const inputTgl = document.getElementById('select-tanggal-muat');
    const tglMuat = inputTgl ? inputTgl.value : ""; 
    
    if (!tglMuat) {
        window.miuiAlert("Tanggal muat belum dipilih atau elemen tidak ditemukan!");
        return;
    }
    
    const docId = "muat_" + tglMuat; 
    
    if (listRingkasan.children.length === 0) {
        window.miuiAlert("Ringkasan alokasi masih kosong!");
        return;
    }

    let dataAlokasi = [];
    let grandTotalHitung = 0;

    const blokGroups = listRingkasan.querySelectorAll('[id^="blok-group-"]');
    
    blokGroups.forEach(group => {
        const blok = group.id.replace('blok-group-', '');
        const totalEl = document.getElementById(`total-blok-${blok}`);
        const total = totalEl ? parseInt(totalEl.getAttribute('data-total')) : 0;
        
        grandTotalHitung += total;
        
        const items = Array.from(group.querySelectorAll('span')).map(span => span.innerText);
        
        dataAlokasi.push({
            blok: blok,
            total_plt: total,
            detail_barang: items
        });
    });

    try {
        const db = firebase.firestore();
        await db.collection('muat_wh3')
                .doc(tglMuat) // Menggunakan tanggal muat dari elemen select
                .collection('alokasi_ambil')
                .doc(docId) 
                .set({
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    tanggal_muat: tglMuat,
                    data: dataAlokasi,
                    total_grand: grandTotalHitung.toString()
                });

        window.miuiAlert("Data berhasil disimpan untuk tanggal muat " + tglMuat + "! Total: " + grandTotalHitung);
    } catch (error) {
        console.error("Gagal simpan: ", error);
        window.miuiAlert("Gagal menyimpan data ke Firestore!");
    }
};

window.loadDataAlokasi = async function() {
    const listRingkasan = document.getElementById('list-ringkasan');
    
    // Ambil tanggal muat dari elemen select sebagai acuan utama
    const inputTgl = document.getElementById('select-tanggal-muat');
    const tglMuat = inputTgl ? inputTgl.value : ""; 
    
    if (!tglMuat) {
        listRingkasan.innerHTML = '<div class="text-[12px] text-slate-600 italic text-center">Pilih tanggal muat terlebih dahulu</div>';
        return;
    }

    const docId = "muat_" + tglMuat;
    
    listRingkasan.innerHTML = '<div class="text-[10px] text-slate-400 italic text-center">Memuat data alokasi...</div>';

    try {
        const db = firebase.firestore();
        const docRef = db.collection('muat_wh3').doc(tglMuat).collection('alokasi_ambil').doc(docId);
        const doc = await docRef.get();

        if (doc.exists) {
            const docData = doc.data();
            const data = docData.data; 
            const totalGrand = docData.total_grand || "0"; 
            
            listRingkasan.innerHTML = ''; 

            data.forEach(item => {
                const namaPenuh = window.getNamaBlokPenuh(item.blok);
                let blokContainer = document.getElementById(`blok-group-${item.blok}`);
                
                if (!blokContainer) {
                    blokContainer = document.createElement('div');
                    blokContainer.id = `blok-group-${item.blok}`;
                    blokContainer.className = "mb-4 border-b pb-2";
                    // Header terpadu (Nama Penuh + Total)
                    blokContainer.innerHTML = `<div class="font-black text-orange-600 text-[11px] mb-1">${namaPenuh} = ${item.total_plt} PLT</div>`;
                    listRingkasan.appendChild(blokContainer);
                }

                item.detail_barang.forEach(detail => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = "flex justify-between text-[10px] ml-2 text-slate-800 mb-1";
                    itemDiv.innerHTML = `<span>${detail}</span>`;
                    blokContainer.appendChild(itemDiv);
                });
            });

            const grandTotalEl = document.getElementById('grand-total-plt'); 
            if (grandTotalEl) {
                grandTotalEl.innerText = totalGrand + " PLT";
            }

        } else {
            listRingkasan.innerHTML = '<div class="text-[12px] text-slate-600 italic text-center">Belum ada data alokasi blok untuk tanggal ini</div>';
        }
    } catch (error) {
        console.error("Gagal memuat: ", error);
        listRingkasan.innerHTML = '<div class="text-[12px] text-red-500 italic text-center">Gagal memuat data</div>';
    }
    
    if (typeof window.updateJudulRingkasan === 'function') {
        window.updateJudulRingkasan();
    }
};

window.kirimWaGrup = async function() {
    const tglMuat = document.getElementById('select-tanggal-muat').value;
    const db = window.getFirestore();

    try {
        // 1. Ambil data dari Firestore sesuai path di screenshot
        const docRef = db.collection("muat_wh3").doc(tglMuat)
                         .collection("alokasi_ambil").doc("muat_" + tglMuat);
        const doc = await docRef.get();

        if (!doc.exists) {
            window.miuiAlert("Data alokasi tidak ditemukan di Firestore!");
            return;
        }

        const data = doc.data().data; // Array data di Firestore
        const judul = document.getElementById('judul-ringkasan').innerText;
        let lines = [`*${judul}*\n`];

        // 2. Loop array data untuk menyusun pesan
        data.forEach(item => {
            // Gunakan helper Anda untuk mendapatkan nama blok penuh
            const namaBlokLengkap = window.getNamaBlokPenuh(item.blok);
            
            // Susun header dengan nama blok yang sudah lengkap
            lines.push(`*${namaBlokLengkap} = ${item.total_plt} PLT*`);
            
            item.detail_barang.forEach(detail => {
                lines.push(detail);
            });
            lines.push(""); // Baris kosong antar blok
        });

        // 3. Tambahkan Grand Total
        const grandTotal = document.getElementById('grand-total-plt').innerText;
        lines.push(`*TOTAL AMBIL: ${grandTotal}*`);

        // 4. Kirim ke WhatsApp
        const pesan = lines.join('\n');
        const url = `https://wa.me/?text=${encodeURIComponent(pesan)}`;
        window.open(url, '_blank');

    } catch (error) {
        console.error("Error kirim WA:", error);
        window.miuiAlert("Gagal mengambil data untuk WA.");
    }
};


window.cetakSemuaVersi = async function() {
    const tglMuat = document.getElementById('select-tanggal-muat').value;
    
    if (!tglMuat) {
        window.miuiAlert("Pilih tanggal muat terlebih dahulu!");
        return;
    }

    // Panggil modal progress universal
    if (typeof window.showCetakProgress === 'function') {
        window.showCetakProgress("Menyiapkan Dokumen Cetak (0/3)...");
    } else {
        console.warn("Fungsi showCetakProgress belum terdaftar di window!");
    }

    try {
        // Cetak Versi 1
        if (window.showCetakProgress) window.showCetakProgress("Mengirim Dokumen Versi 1 (1/3)...");
        await window.cetakDokumenVersi1(tglMuat);
        await new Promise(resolve => setTimeout(resolve, 400));

        // Cetak Versi 2 - Copy 1
        if (window.showCetakProgress) window.showCetakProgress("Mengirim Dokumen Versi 2 - 1 (2/3)...");
        await window.cetakDokumenVersi2(tglMuat);
        await new Promise(resolve => setTimeout(resolve, 400));

        // Cetak Versi 2 - Copy 2
        if (window.showCetakProgress) window.showCetakProgress("Mengirim Dokumen Versi 2 - 2 (3/3)...");
        await window.cetakDokumenVersi2(tglMuat);

        // Sembunyikan modal setelah selesai
        if (window.hideCetakProgress) {
            window.hideCetakProgress();
        }

        window.miuiAlert("Berhasil mengirim 3 dokumen ke antrean cetak!");

    } catch (error) {
        console.error("Gagal memproses cetak:", error);
        if (window.hideCetakProgress) window.hideCetakProgress();
        window.miuiAlert("Terjadi kesalahan saat mengirim dokumen cetak.");
    }
};

window.cetakDokumenVersi1 = async function(tglMuat) {
    const judul = document.getElementById('judul-ringkasan').innerText;
    const theadContent = document.querySelector('table thead').innerHTML;
    const rows = document.querySelectorAll('table tbody tr');
    
    let rowsUtamaHtml = '';
    rows.forEach(row => {
        const selTotal = row.cells[row.cells.length - 2]?.innerText.trim();
        if (selTotal !== "" && selTotal !== "-" && !isNaN(selTotal)) {
            rowsUtamaHtml += `<tr>${row.innerHTML}</tr>`;
        }
    });

    // AMBIL DAN PROSES DATA DARI PANEL
    const panelRaw = document.getElementById('panel-kebutuhan-referensi').innerText;
    const lines = panelRaw.split('\n');
    
    // Header format ringkas
    let cleanData = 'AMBIL     | PLT | BLOK\n';
    cleanData += '------------------------------------------------\n';

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Perlu Ambil:')) {
            const parts = lines[i].split('|');
            const kode = parts[0].trim();
            const plt = parts[1].replace('Perlu Ambil:', '').replace('PLT', '').trim();
            
            // Ambil baris detail pertama di bawahnya yang berisi alokasi blok lengkap
            const detailLine = lines[i+1] || '';
            let cleanDetail = detailLine.replace('AMBIL', '').trim();
            
            // Potong string tepat sebelum bagian ekspedisi (yakni sebelum tanda ' | [')
            const expSplitIndex = cleanDetail.indexOf(' | [');
            if (expSplitIndex !== -1) {
                cleanDetail = cleanDetail.substring(0, expSplitIndex).trim();
            }

            cleanData += `${kode.padEnd(9)} | ${plt.padEnd(3)} | ${cleanDetail}\n`;
            i++; // Lewati baris ekspedisi di bawahnya
        }
    }

    // AMBIL DATA HASIL RINGKASAN & GRAND TOTAL DARI LAYAR
    const elListRingkasan = document.getElementById('list-ringkasan');
    const ringkasanHtml = elListRingkasan ? elListRingkasan.innerHTML : '';
    
    const elGrandTotal = document.getElementById('grand-total-plt');
    const grandTotalText = elGrandTotal ? elGrandTotal.innerText : '0 PLT';

    const finalHtml = `
    <html>
    <head>
        <style>
            @page { size: 215mm 330mm portrait; margin: 20mm 1mm 1mm 1mm; }
            body { font-family: 'Century Gothic', sans-serif; font-size: 8pt; margin: 0; padding: 0; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed; }
            th, td { border: 1px solid #000; padding: 2px 3px; text-align: center; font-family: 'Century Gothic', sans-serif; font-size: 8pt; }
            
            /* Kolom pertama (KODE BARANG) diset rata kiri dan diberi padding agar pas di dalam garis */
            table th:first-child, table td:first-child {
                text-align: left;
                padding-left: 5px;
                width: 75px;
            }

            .judul-tabel { font-weight: bold; font-size: 13pt; text-align: center; margin-bottom: 6px; }
            
            /* Layout 2 Kolom Berdampingan dengan pengaman min-width agar tidak saling menabrak */
            .container-bawah {
                display: flex;
                gap: 10px;
                margin-top: 8px;
                align-items: flex-start;
                width: 100%;
            }
            .kolom-kiri {
                flex: 1.1;
                min-width: 0;
            }
            .kolom-kanan {
                flex: 1;
                border-left: 1px dashed #000;
                padding-left: 10px;
                min-width: 0;
            }
            
            .section-title {
                font-weight: bold;
                font-size: 8.5pt;
                text-decoration: underline;
                margin-bottom: 4px;
            }

            /* Kolom kiri: Mengatur teks panjang agar turun ke bawah secara otomatis (wrapping) */
            .info-blok { 
                font-family: 'Courier New', monospace; 
                white-space: pre-wrap; 
                word-break: break-word;
                overflow-wrap: break-word;
                font-size: 9pt; 
                line-height: 1.2;
            }

            /* Kolom kanan: Format teks ringkasan dengan garis bawah pada nama blok & indentasi isi */
            .info-ringkasan {
                font-family: 'Courier New', monospace;
                white-space: pre-wrap;
                word-break: break-word;
                overflow-wrap: break-word;
                font-size: 9pt;
                line-height: 1.2;
            }

            .info-ringkasan [id^="blok-group-"] {
                margin-bottom: 6px;
            }

            .info-ringkasan .font-black {
                font-weight: bold;
                text-decoration: underline;
                display: block;
                margin-bottom: 2px;
            }

            .info-ringkasan div:not([id^="blok-group-"]) {
                padding-left: 10px;
            }
        </style>
    </head>
    <body>
        <div class="judul-tabel">MUAT WH-3 ${judul}</div>
        <table><thead>${theadContent}</thead><tbody>${rowsUtamaHtml}</tbody></table>
        
        <div class="container-bawah">
            <!-- Kolom Kiri: Alokasi Ambil Blok (Hanya Blok & Kuantitas) -->
            <div class="kolom-kiri">
                <div class="section-title">ALOKASI AMBIL BLOK:</div>
                <div class="info-blok">${cleanData}</div>
            </div>

            <!-- Kolom Kanan: Hasil Ringkasan Alokasi -->
            <div class="kolom-kanan">
                <div class="section-title">HASIL RINGKASAN ALOKASI:</div>
                <div class="info-ringkasan">${ringkasanHtml}</div>
                <div style="margin-top: 8px; font-weight: bold; font-size: 8pt; display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 3px; font-family: 'Courier New', monospace;">
                    <span>TOTAL AMBIL: ${grandTotalText}</span>
                </div>
            </div>
        </div>
    </body>
    </html>`;

    //const win = window.open("", "_blank");
    //win.document.write(finalHtml);
    //win.document.close();

    await fetch('https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/print_jobs.json', {
        method: 'POST',
        body: JSON.stringify({ html: finalHtml, timestamp: Date.now() }),
        headers: { 'Content-Type': 'application/json' }
    });
};

window.cetakDokumenVersi2 = async function(tglMuat) {
    // 1. Ambil Judul dan Tabel Utama dari Layar
    const elJudul = document.getElementById('judul-ringkasan');
    const judul = elJudul ? elJudul.innerText : "DATA MUAT"; 
    
    const theadContent = document.querySelector('table thead') ? document.querySelector('table thead').innerHTML : '';
    const rows = document.querySelectorAll('table tbody tr');
    
    let rowsUtamaHtml = '';
    rows.forEach(row => {
        const selTotal = row.cells[row.cells.length - 2]?.innerText.trim();
        if (selTotal !== "" && selTotal !== "-" && !isNaN(selTotal)) {
            rowsUtamaHtml += `<tr>${row.innerHTML}</tr>`;
        }
    });

    // 2. Definisi Logika Sorting (Sesuai renderTabelRakGabungan)
    const polaUtama = ["CRR", "CRR EA", "THR EA", "THR", "MRMR", "MRR", "MJR HJ", "MJR", "MOB4A", "MOR2A EA", "MOR2A EB", "MOR2A", "MP", "PDR", "MTR3A", "PR-PKT", "PR-CUP", "MRSR", "LTGR", "MTGR", "MEB", "MOL", "MRL", "MTL", "ISEL"];
    
    const getSortScore = (kode) => {
        let k = kode.toUpperCase();
        for (let i = 0; i < polaUtama.length; i++) {
            if (k.includes(polaUtama[i])) {
                if (polaUtama[i] === "MOR2A" && (k.includes("MOR2A EA") || k.includes("MOR2A EB"))) continue;
                if (polaUtama[i] === "THR" && k.includes("THR EA")) continue;
                if (polaUtama[i] === "MJR" && k.includes("MJR HJ")) continue;
                if (polaUtama[i] === "CRR" && k.includes("CRR EA")) continue;
                return i + 1;
            }
        }
        return 999;
    };
    
    const getVarianScore = (kode) => {
        let k = kode.toUpperCase();
        if (k.includes("ZC")) return 1;
        if (k.includes("SSL")) return 2;
        if (k.includes("SLO")) return 3;
        if (k.includes("TDS")) return 4;
        if (k.includes("BAG")) return 5;
        if (k.includes("WRG")) return 6;
        if (k.includes("GTG")) return 7;
        return 0;
    };
    
    const getAngkaAkhir = (kode) => {
        const match = kode.match(/\d+/g);
        return match ? (parseInt(match.join('').slice(-4)) || 999) : 999;
    };

    // 3. Ambil Data Langsung dari Firestore (info_rak_blok -> data_rekap -> data_per_item)
    let rowsRakHtml = '';
    try {
        const db = window.getFirestore();
        if (db && tglMuat) {
            const docRef = db.collection("muat_wh3").doc(tglMuat).collection("info_rak_blok").doc("data_rekap");
            const docSnap = await docRef.get();

            if (docSnap.exists) {
                const dataPerItem = docSnap.data().data_per_item || {};
                
                // Urutkan kode barang menggunakan fungsi sorting yang sama
                const sortedCodes = Object.keys(dataPerItem).sort((a, b) => {
                    const scoreA1 = getSortScore(a), scoreB1 = getSortScore(b);
                    if (scoreA1 !== scoreB1) return scoreA1 - scoreB1;
                    const scoreA2 = getVarianScore(a), scoreB2 = getVarianScore(b);
                    if (scoreA2 !== scoreB2) return scoreA2 - scoreB2;
                    return getAngkaAkhir(a) - getAngkaAkhir(b);
                });

                // Loop setiap kode barang yang sudah terurut
                sortedCodes.forEach(kode => {
                    const itemData = dataPerItem[kode];
                    const rakAmbil = itemData.rak_ambil || '-';

                    // Hanya tampilkan jika rak ambil tidak kosong / bukan strip
                    if (rakAmbil && rakAmbil !== "-" && rakAmbil !== "") {
                        rowsRakHtml += `
                            <tr>
                                <td style="text-align: left; padding-left: 6px; font-weight: bold; width: 120px;">${kode}</td>
                                <td style="text-align: left; padding-left: 6px;">${rakAmbil}</td>
                            </tr>
                        `;
                    }
                });
            }
        }
    } catch (error) {
        console.error("Gagal mengambil data rak dari Firestore:", error);
    }

    // Fallback jika data kosong
    if (!rowsRakHtml) {
        rowsRakHtml = '<tr><td colspan="2" style="text-align: center;">Data lokasi rak tidak tersedia</td></tr>';
    }

    // 4. Susun HTML Dokumen Cetak
    const finalHtml = `
    <html>
    <head>
        <style>
            @page { size: 215mm 330mm portrait; margin: 20mm 1mm 1mm 1mm; }
            body { font-family: 'Century Gothic', sans-serif; font-size: 8pt; margin: 0; padding: 0; }
            
            /* Tabel Utama di Atas */
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; table-layout: fixed; }
            th, td { border: 1px solid #000; padding: 2px 3px; text-align: center; font-family: 'Century Gothic', sans-serif; font-size: 8pt; }
            
            table th:first-child, table td:first-child {
                text-align: left;
                padding-left: 5px;
                width: 75px;
            }

            .judul-tabel { font-weight: bold; font-size: 13pt; text-align: center; margin-bottom: 6px; }
            
            /* Bagian Bawah: Tabel Lokasi Rak */
            .section-title {
                font-weight: bold;
                font-size: 10pt;
                text-decoration: underline;
                margin-bottom: 5px;
                margin-top: 10px;
            }

            .tabel-rak {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
            }
            .tabel-rak th, .tabel-rak td {
                border: 1px solid #000;
                padding: 3px 5px;
                font-family: 'Century Gothic', sans-serif;
                font-size: 10pt;
            }
            .tabel-rak th {
                background-color: #f2f2f2;
                font-family: 'Century Gothic', sans-serif;
                font-weight: bold;
                text-align: left;
            }
        </style>
    </head>
    <body>
        <div class="judul-tabel">MUAT WH-3 RAK ${judul}</div>
        
        <!-- Tabel Utama -->
        <table><thead>${theadContent}</thead><tbody>${rowsUtamaHtml}</tbody></table>
        
        <!-- Tabel Lokasi Rak di Bawah (Sudah Terurut) -->
        <div class="section-title">LOKASI RAK AMBIL:</div>
        <table class="tabel-rak">
            <thead>
                <tr>
                    <th style="width: 150px; padding-left: 6px;">KODE</th>
                    <th style="padding-left: 6px;">LOKASI RAK</th>
                </tr>
            </thead>
            <tbody>
                ${rowsRakHtml}
            </tbody>
        </table>
    </body>
    </html>`;

    //const win = window.open("", "_blank");
    //if (win) {
    //    win.document.write(finalHtml);
    //    win.document.close();
    //    win.focus();
    //} else {
    //    (typeof miuiAlert !== 'undefined') ? miuiAlert("Gagal membuka jendela cetak.") : alert("Gagal membuka jendela cetak.");
    //}

    await fetch('https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/print_jobs.json', {
        method: 'POST',
        body: JSON.stringify({ html: finalHtml, timestamp: Date.now() }),
        headers: { 'Content-Type': 'application/json' }
    });
};