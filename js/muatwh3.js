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
        console.error("Elemen select-tanggal-stok-wh3 tidak ditemukan setelah retry.");
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


window.cetakSemuaVersi = function() {
    const win = window.open('', '_blank', 'width=900,height=800');
    
    // Ambil konten dari elemen di halaman
    const tabelAtas = document.getElementById('tabel-utama-container').innerHTML;
    const rows = document.querySelectorAll('#tabel-rak-body tr');
    
    // --- Draft (Versi 1) ---
    let htmlDraft = `<h3>DRAFT - AMBIL BLOK</h3><table border="1" style="width:100%; border-collapse:collapse;">
        <tr><th>KODE</th><th>AMBIL</th><th>DATA BLOK</th></tr>`;
    rows.forEach(row => {
        const ambilBlok = row.cells[7].innerText;
        if (ambilBlok !== '-') {
            htmlDraft += `<tr><td>${row.cells[0].innerText}</td><td>${ambilBlok}</td><td>${row.cells[8].innerText}</td></tr>`;
        }
    });
    htmlDraft += '</table>';

    // --- Penyiapan (Versi 2) ---
    let htmlPenyiapan = `<h3>PENYIAPAN - LOKASI RAK</h3><table border="1" style="width:100%; border-collapse:collapse;">
        <tr><th>KODE</th><th>LOKASI RAK</th></tr>`;
    rows.forEach(row => {
        htmlPenyiapan += `<tr><td>${row.cells[0].innerText}</td><td>${row.cells[3].innerText}</td></tr>`;
    });
    htmlPenyiapan += '</table>';

    // Gabungkan dengan Page Break untuk cetakan
    win.document.write(`
        <html><head><style>
            @media print {
                .page-break { page-break-after: always; }
                body { font-family: sans-serif; font-size: 11px; }
            }
            .content { margin-bottom: 20px; }
        </style></head><body>
            <div class="content">${tabelAtas} ${htmlDraft}</div>
            <div class="page-break"></div>
            <div class="content">${tabelAtas} ${htmlPenyiapan}</div>
            <div class="page-break"></div>
            <div class="content">${tabelAtas} ${htmlPenyiapan}</div>
            <script>window.print();</script>
        </body></html>
    `);
    win.document.close();
};