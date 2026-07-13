// js/muatwh3.js

// --- DEKLARASI DI PALING ATAS ---
const DB_FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

console.log("Modul Muat WH-3 dimuat.");

// Fungsi getDB yang lebih aman
window.getDB = function() {
    // Cek apakah firebase sudah terinisialisasi
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        return firebase.database();
    }
    console.error("Firebase App belum diinisialisasi di halaman utama!");
    return null;
};

// Fungsi Inisialisasi utama
window.initMuatWH3 = async function() {
    console.log("Inisialisasi modul Muat WH-3...");
    window.generatePeriodeDropdown(); 
    await updateTanggalDropdownMuatWH3();
};

// Panggil langsung tanpa menunggu DOMContentLoaded
window.initMuatWH3();


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
async function updateTanggalDropdownMuatWH3() {
    const selPeriode = document.getElementById('select-periode-muat');
    const selTanggal = document.getElementById('select-tanggal-muat');
    
    if (!selPeriode || !selTanggal) return;

    const [targetTahun, targetBulan] = selPeriode.value.split('-').map(Number);
    selTanggal.innerHTML = '<option value="">Memuat...</option>';

    try {
        const response = await fetch(`${DB_FIREBASE_URL}muat_wh3.json`);
        const allData = await response.json();
        
        if (!allData) {
            selTanggal.innerHTML = '<option value="">Data Tidak Ada</option>';
            return;
        }

        let availableDates = [];

        // Filter tanggal sesuai target tahun dan bulan
        Object.keys(allData).forEach(rawDate => {
            const tahun = parseInt(rawDate.substring(0, 4));
            const bulan = parseInt(rawDate.substring(4, 6));
            const hari = rawDate.substring(6, 8);

            if (tahun === targetTahun && bulan === targetBulan) {
                availableDates.push({
                    val: rawDate, 
                    label: `${hari}/${bulan}/${tahun}`
                });
            }
        });

        availableDates.sort((a, b) => b.val.localeCompare(a.val));

        selTanggal.innerHTML = '<option value="">Pilih Tanggal</option>';
        availableDates.forEach(date => {
            selTanggal.add(new Option(date.label, date.val));
        });

        // Jika ada data, pilih yang terbaru
        if (availableDates.length > 0) {
            selTanggal.value = availableDates[0].val;
            window.renderTabelGabungan();
        } else {
            selTanggal.innerHTML = '<option value="">Data Tidak Ada</option>';
            document.getElementById('tabel-matriks-body').innerHTML = '';
        }
    } catch (e) {
        console.error("Gagal sinkronisasi tanggal:", e);
        selTanggal.innerHTML = '<option value="">Gagal</option>';
    }
}

window.prosesDataBosnet = function() {
    const rawText = document.getElementById('ta-bosnet-input').value;
    const kodeTujuan = document.getElementById('input-kode-tujuan').value.toUpperCase();
    
    // Kita panggil fungsi dengan target "WHNB-2"
    const dataTerproses = window.parseDataBosnet(rawText, "WHNB-2");
    
    if (Object.keys(dataTerproses).length > 0) {
        window.simpanKeFirebase(dataTerproses, kodeTujuan);
    } else {
        window.miuiAlert("Tidak ada data untuk gudang WHNB-2. Silakan periksa kembali data.");
    }
};

window.parseDataBosnet = function(rawText, targetGudang) {
    const lines = rawText.split('\n');
    let hasil = {}; 

    lines.forEach(line => {
        // PERBAIKAN: Hanya proses jika baris mengandung "WHNB-2"
        // Ini akan mengabaikan WH-2, WHNB-1, dll secara otomatis
        if (!line.includes("WHNB-2")) return; 

        // Regex untuk menangkap: noDO (46327), kodeBarang (CRR4A22), qty (5/0/0/0)
        // Pola disesuaikan dengan data yang Anda berikan
        const match = line.match(/DO-HO\d+-\d+-(\d+)\s*([A-Z0-9]+).*?(\d+\/\d+\/\d+\/\d+)/);

        if (match) {
            const [full, noDO, kodeBarang, rawQty] = match;
            const qtyParts = rawQty.split('/').map(Number);
            
            if (!hasil[noDO]) {
                hasil[noDO] = {};
            }
            
            hasil[noDO][kodeBarang] = {
                gudang: "WHNB-2", // Menandakan data ini khusus dari WHNB-2
                kodeBarang: kodeBarang,
                qtyUtama: qtyParts[0],
                qtyDetail: qtyParts.slice(1) // [0, 0, 0]
            };
        }
    });

    return hasil;
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

// Fungsi untuk menggabungkan data sebelum render ke tabel
window.renderDataGabungan = function(dataFirebase) {
    let gabungan = {};

    // Iterasi setiap noDO
    Object.keys(dataFirebase).forEach(noDO => {
        const barangList = dataFirebase[noDO];

        Object.keys(barangList).forEach(kodeBarang => {
            const item = barangList[kodeBarang];

            // Jika kodeBarang belum ada di 'gabungan', buat entry baru
            if (!gabungan[kodeBarang]) {
                gabungan[kodeBarang] = {
                    kodeBarang: kodeBarang,
                    noDOs: [noDO.slice(-2)], // Simpan 2 digit terakhir DO
                    qtyUtama: 0,
                    qtyDetail: [0, 0, 0]
                };
            } else {
                // Jika sudah ada, tambahkan noDO (jika belum ada) dan jumlahkan qty
                if (!gabungan[kodeBarang].noDOs.includes(noDO.slice(-2))) {
                    gabungan[kodeBarang].noDOs.push(noDO.slice(-2));
                }
            }

            // Jumlahkan Qty
            gabungan[kodeBarang].qtyUtama += parseInt(item.qtyUtama);
            item.qtyDetail.forEach((val, i) => {
                gabungan[kodeBarang].qtyDetail[i] += parseInt(val);
            });
        });
    });

    // Tampilkan 'gabungan' ke tabel
    renderKeTabel(gabungan);
};

// Fungsi pembantu untuk membuat string noDO gabungan
function formatNoDOGabung(noDOs) {
    // noDOs adalah array, misal ['61', '60']
    // Kita ambil DO utuh yang pertama, lalu tambahkan 2 digit sisanya
    return noDOs.join(','); 
}

window.simpanKeFirebase = async function(parsedData, kodeTujuan) {
    // 1. Logika Tanggal (Besok, skip hari libur/Minggu)
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
    const tglId = targetDate.toISOString().split('T')[0].replace(/-/g, '');
    const kodeClean = (kodeTujuan || "UNKNOWN").toUpperCase();
    const uniqueId = `${kodeClean}_${tglId}`;
    
    // 2. URL Path untuk Metadata dan Data
    const baseUrl = `${DB_FIREBASE_URL}muat_wh3/${tglId}/${uniqueId}`;

    try {
        // 3. Simpan Metadata (PATCH)
        await fetch(`${baseUrl}.json`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tujuan: kodeClean,
                tanggal_kirim: tglId,
                status: "DRAFT"
            })
        });

        // 4. Simpan Data (Looping PATCH per noDO)
        // Kita menggunakan fetch ke path /data/${noDO}.json untuk update spesifik
        for (const noDO in parsedData) {
            if (parsedData.hasOwnProperty(noDO)) {
                await fetch(`${baseUrl}/data/${noDO}.json`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(parsedData[noDO])
                });
            }
        }
        
        console.log("Data berhasil disimpan via PATCH:", uniqueId);
        window.miuiAlert("Data Berhasil Disimpan!");
        
        // 5. Reset dan Refresh UI
        if (typeof window.resetFormulir === 'function') window.resetFormulir();
        if (typeof window.renderTabelGabungan === 'function') {
            await window.renderTabelGabungan();
        }
        
    } catch (error) {
        console.error("Gagal mengirim data:", error);
        window.miuiAlert("Error: Gagal menyimpan data ke server.");
    }
};

// Fungsi untuk membersihkan form
window.resetFormulir = function() {
    document.getElementById('input-kode-tujuan').value = "";
    document.getElementById('input-nama-tujuan').value = "";
    document.getElementById('ta-bosnet-input').value = "";
    document.getElementById('txt-total-baris').innerText = "0";
    document.getElementById('txt-status-muat').innerText = "IDLE";
    document.getElementById('txt-status-muat').className = "text-xl font-black text-emerald-600";
};

window.renderTabelGabungan = async function() {
    const tglId = document.getElementById('select-tanggal-muat').value;
    const kodeTujuan = document.getElementById('input-kode-tujuan').value.toUpperCase();
    const tbody = document.getElementById('tabel-matriks-body');

    // Proteksi
    if (!tglId || !tbody) return; 

    // URL path yang akan di-fetch
    let fetchUrl = kodeTujuan 
        ? `${DB_FIREBASE_URL}muat_wh3/${tglId}/${kodeTujuan}_${tglId}/data.json` 
        : `${DB_FIREBASE_URL}muat_wh3/${tglId}.json`;

    try {
        const response = await fetch(fetchUrl);
        const data = await response.json();

        if (!data) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4">Data tidak ditemukan</td></tr>';
            return;
        }

        let gabungan = {};

        // Fungsi bantu untuk memproses objek data
        const prosesData = (objData) => {
            if (!objData) return;
            Object.keys(objData).forEach(noDO => {
                if (!objData[noDO]) return;
                Object.keys(objData[noDO]).forEach(kodeBarang => {
                    const item = objData[noDO][kodeBarang];
                    const suffixDO = noDO.slice(-2);

                    if (!gabungan[kodeBarang]) {
                        gabungan[kodeBarang] = { kodeBarang, noDOs: new Set(), totalQty: 0 };
                    }
                    gabungan[kodeBarang].noDOs.add(suffixDO);
                    gabungan[kodeBarang].totalQty += parseInt(item.qtyUtama || 0);
                });
            });
        };

        // Jika kodeTujuan ada, struktur data langsung berisi data barang
        // Jika tidak, struktur data berisi kumpulan tujuan (tujuan -> data)
        if (kodeTujuan) {
            prosesData(data);
        } else {
            Object.values(data).forEach(tujuan => {
                if (tujuan.data) prosesData(tujuan.data);
            });
        }

        // Render ke tabel
        tbody.innerHTML = '';
        Object.values(gabungan).forEach(item => {
            const genap = Math.floor(item.totalQty / 24);
            const sisa = item.totalQty % 24;

            tbody.innerHTML += `
                <tr class="hover:bg-orange-50 border-b border-slate-100">
                    <td class="p-2 font-black text-orange-600">${item.kodeBarang}</td>
                    <td class="p-2 text-slate-600 text-[10px]">${Array.from(item.noDOs).join(', ')}</td>
                    <td class="p-2 font-bold text-center text-slate-800">${item.totalQty}</td>
                    <td class="p-2 text-center">
                        <span class="font-black text-emerald-600 text-xs">${genap}</span> | 
                        <span class="font-black text-rose-600 text-xs">${sisa}</span>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Gagal mengambil data:", e);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4">Error memuat data</td></tr>';
    }
};