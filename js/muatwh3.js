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
    
};

// Panggil inisialisasi secara aman
// Gunakan DOMContentLoaded agar elemen HTML sudah siap diakses
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.initMuatWH3 === 'function') {
        window.initMuatWH3();
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
        // Kembali ke posisi awal (slide 1)
        slider.style.transform = 'translateX(0%)';
        console.log("Mode: KONFIRMASI BOSNET");
    } else if (mode === 'RAK') {
        // Geser ke slide 2 (karena total 2 slide, maka -50%)
        slider.style.transform = 'translateX(-50%)';
        console.log("Mode: RAK & BLOK");
        
        // Panggil fungsi render tabel jika diperlukan
        if (typeof window.renderTabelRak === 'function') {
            window.renderTabelRak();
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

        const match = line.match(/DO-HO\d+-\d+-(\d+)\s*([A-Z0-9]+).*?(\d+\/\d+\/\d+\/\d+)/);

        if (match) {
            const [full, noDO, kodeBarang, rawQty] = match;
            const qtyParts = rawQty.split('/').map(Number);
            
            if (!hasil[noDO]) {
                hasil[noDO] = { tujuan: targetGudang, data: {} };
            }
            
            hasil[noDO].data[kodeBarang] = {
                gudang: targetGudang,
                kodeBarang: kodeBarang,
                qtyUtama: qtyParts[0],
                qtyDetail: qtyParts.slice(1)
            };
        }
    });

    return hasil;
};

// Fungsi untuk memicu klik input file
function bukaFileMutasi() {
    document.getElementById('input-file-mutasi').click();
}

// Fungsi untuk membaca dan memproses Excel
async function prosesFileMutasi(event) {
    const file = event.target.files[0];
    if (!file) return;

    // --- 1. EKSTRAKSI TANGGAL DARI NAMA FILE ---
    // Nama file contoh: "Form Mutasi 2026 07-16 Senin 15.31.20.xls"
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

    // --- 2. AMBIL DARI DROPDOWN (Nilai: "20260716") ---
    const dropdownVal = document.getElementById('select-tanggal-muat').value; 
    
    if (!dropdownVal) {
        window.miuiAlert("Pilih tanggal muat terlebih dahulu!");
        return;
    }

    const y = dropdownVal.substring(0, 4);
    const m = dropdownVal.substring(4, 6);
    const d = dropdownVal.substring(6, 8);
    
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() - 1); 
    
    const targetTgl = String(dateObj.getDate()).padStart(2, '0');
    const targetBln = String(dateObj.getMonth() + 1).padStart(2, '0');
    const targetThn = dateObj.getFullYear();
    const targetDateStr = `${targetTgl}-${targetBln}-${targetThn}`;

    // --- 3. VERIFIKASI ---
    if (formattedFileDate !== targetDateStr) {
        window.miuiAlert(`Peringatan: File yang Anda pilih adalah mutasi tanggal ${formattedFileDate}, sedangkan untuk tanggal muat ${d}/${m}/${y}, sistem memerlukan file tanggal ${targetDateStr}. Import dibatalkan!`);
        event.target.value = ''; 
        return;
    }

    // --- 4. PEMBENTUKAN NO DO ---
    // Menggunakan variabel yang sudah dideklarasikan di atas
    const noDOMutasi = `${parseInt(tgl)}${parseInt(bln)}${tahunFile.slice(-2)}`; // "160726"

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
    const tglId = document.getElementById('select-tanggal-muat').value;
    const tbody = document.getElementById('tabel-matriks-body');
    const thead = document.getElementById('tabel-matriks-head');
    const db = window.getFirestore(); // Menggunakan instance firestore yang sudah ada

    if (!tglId) {
        document.getElementById('txt-total-tujuan').innerText = '0';
        document.getElementById('txt-total-nodo').innerText = '0';
        tbody.innerHTML = '<tr><td colspan="10" class="text-center p-4">Pilih tanggal terlebih dahulu</td></tr>';
        return;
    }

    try {
        // --- 1. MENGAMBIL DATA DARI FIRESTORE ---
        // Path: muat_wh3/{tglId}/datatujuan/{folderId}
        const snapshot = await db.collection("muat_wh3").doc(tglId).collection("datatujuan").get();

        if (snapshot.empty) {
            document.getElementById('txt-total-tujuan').innerText = '0';
            document.getElementById('txt-total-nodo').innerText = '0';
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
            const isMutasi = itemTujuan.tujuan === "Z-MUTASI";

            const subSnapshot = await doc.ref.collection("data").get();
            const listNoDO = subSnapshot.docs.map(d => d.id);
            totalNoDO += listNoDO.length;

            if (!groupTujuan[namaTujuan]) {
                // Perbaikan: Hapus paksaan teks "MUTASI", gunakan listNoDO untuk semua tipe
                // Jika listNoDO hanya ada 1, tampilkan ID-nya. Jika lebih, tampilkan format ringkas.
                let labelNoDO = (listNoDO.length === 1) 
                    ? listNoDO[0] 
                    : (listNoDO[0] + "," + listNoDO.slice(1).map(id => id.slice(-2)).join(","));
                
                groupTujuan[namaTujuan] = { label: labelNoDO, data: {} };
            }

            subSnapshot.docs.forEach(doDoc => {
                const rawDoc = doDoc.data();
                
                // --- TAMBAHKAN INI UNTUK DEBUGGING ---
                console.log("DEBUG: Isi dokumen DO (" + doDoc.id + "):", rawDoc);
                // -------------------------------------

                // Kita coba deteksi apakah barang berada di field 'data' atau langsung di root
                const dataBarang = rawDoc.data || rawDoc; 

                Object.keys(dataBarang).forEach(kode => {
                    const barang = dataBarang[kode];
                    
                    // Cek apakah ini objek barang yang valid (punya qtyUtama)
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

        document.getElementById('txt-total-tujuan').innerText = Object.keys(groupTujuan).length;
        document.getElementById('txt-total-nodo').innerText = totalNoDO;

        // --- 4. RENDER HEADER (Sama) ---
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

        // --- 5. RENDER BODY (Sama) ---
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