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
    await loadMasterBarang();
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

window.updateStatistikMuat = async function(tglId) {
    const url = `${DB_FIREBASE_URL}muat_wh3/${tglId}.json`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        let totalTujuan = 0;
        let totalNoDO = 0;

        if (data) {
            // Menghitung Total Tujuan (Key di bawah tglId, kecuali yang bukan tujuan)
            const semuaTujuan = Object.keys(data).filter(key => key !== 'timestamp'); 
            totalTujuan = semuaTujuan.length;

            // Menghitung Total No DO dari setiap tujuan
            semuaTujuan.forEach(tujuanKey => {
                if (data[tujuanKey].data) {
                    totalNoDO += Object.keys(data[tujuanKey].data).length;
                }
            });
        }

        // Update ke UI
        document.getElementById('txt-total-tujuan').innerText = totalTujuan;
        document.getElementById('txt-total-nodo').innerText = totalNoDO;

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
            // Jika formatnya { "-MUTASI": { ... } }
            if (parsed["-MUTASI"]) {
                dataTerproses = parsed; // Langsung gunakan karena sudah sesuai format
            }
        } catch (e) {
            console.error("Gagal proses data Mutasi:", e);
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

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Membaca sheet 'RAK'
        const worksheet = workbook.Sheets['RAK'];
        
        // FIX: Gunakan range: 2 agar pembacaan dimulai dari baris ke-3 (indeks 2)
        // Baris 1: Kosong/Judul Besar
        // Baris 2: Tanggal
        // Baris 3: Header (NO, Kode, Rak, dst) -> Indeks 2
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: 2 });

        // Filter: Sekarang kolom 'Rak' akan terbaca dengan benar
        const dataWh3 = jsonData.filter(row => 
            row['Rak'] && row['Rak'].toString().includes('WH-3')
        );

        // Transformasi ke format JSON
        const formattedData = {};
        dataWh3.forEach((item) => {
            const noDO = "-MUTASI";
            if (!formattedData[noDO]) {
                formattedData[noDO] = {
                    tujuan: "zMUTASI",
                    data: {}
                };
            }
            
            // Mengambil data berdasarkan header yang sudah terbaca benar
            formattedData[noDO].data[item['Kode']] = {
                kodeBarang: item['Kode'],
                qtyUtama: parseInt(item['Ambil'] || 0),
                gudang: item['Rak']
            };
        });

        // 1. Tampilkan ke Textarea agar bisa direview
        const ta = document.getElementById('ta-bosnet-input');
        ta.value = JSON.stringify(formattedData, null, 2);

        // 2. ISI OTOMATIS INPUT TUJUAN
        // Karena ini mutasi, kita set otomatis ke "MUTASI"
        const inputKodeTujuan = document.getElementById('input-kode-tujuan');
        const inputNamaTujuan = document.getElementById('input-nama-tujuan'); // Pastikan ID ini sesuai di HTML Anda

        if (inputKodeTujuan) {
            inputKodeTujuan.value = "zMUTASI";
        }
        
        if (inputNamaTujuan) {
            inputNamaTujuan.value = "MUTASI GUDANG WH-2"; // Atau teks lain yang Anda inginkan
        }

        // 3. Berikan notifikasi
        window.miuiAlert(`Berhasil memuat ${dataWh3.length} baris data WH-3.`);
    };
    reader.readAsArrayBuffer(file);
}

window.simpanKeFirebase = async function(parsedData, kodeTujuan) {
    // 1. Logika Tanggal
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
    
    // PENYESUAIAN: Jika MUTASI, ID-nya lebih spesifik agar tidak tertimpa
    const uniqueId = kodeClean === "MUTASI" ? `MUTASI_${tglId}` : `${kodeClean}_${tglId}`;
    
    // 2. URL Path
    const baseUrl = `${DB_FIREBASE_URL}muat_wh3/${tglId}/${uniqueId}`;

    try {
        // 3. Simpan Metadata
        await fetch(`${baseUrl}.json`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tujuan: kodeClean,
                tanggal_kirim: tglId,
                status: "DRAFT",
                tipe: kodeClean === "MUTASI" ? "MUTASI" : "BOSNET" // Menandai tipe data
            })
        });

        // 4. Simpan Data
        for (const noDO in parsedData) {
            if (parsedData.hasOwnProperty(noDO)) {
                // Untuk Mutasi, noDO sudah diset "-MUTASI" dari fungsi prosesFileMutasi
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
        if (typeof window.renderTabelGabungan === 'function') await window.renderTabelGabungan();
        if (typeof window.updateTanggalDropdownMuatWH3 === 'function') await window.updateTanggalDropdownMuatWH3();
        if (typeof window.updateStatistikMuat === 'function') await window.updateStatistikMuat(tglId);
        
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
};


let cacheMasterBarang = {};
async function loadMasterBarang() {
    const snap = await fetch(`${DB_FIREBASE_URL}master_barang.json`);
    cacheMasterBarang = await snap.json();
    console.log("Master Barang berhasil dimuat:", cacheMasterBarang);
}

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

window.renderTabelGabungan = async function() {
    const tglId = document.getElementById('select-tanggal-muat').value;
    const tbody = document.getElementById('tabel-matriks-body');
    const thead = document.getElementById('tabel-matriks-head');
    
    if (!tglId) {
        document.getElementById('txt-total-tujuan').innerText = '0';
        document.getElementById('txt-total-nodo').innerText = '0';
        tbody.innerHTML = '<tr><td colspan="10" class="text-center p-4">Pilih tanggal terlebih dahulu</td></tr>';
        return;
    }

    try {
        const response = await fetch(`${DB_FIREBASE_URL}muat_wh3/${tglId}.json`);
        const data = await response.json();

        if (!data) {
            document.getElementById('txt-total-tujuan').innerText = '0';
            document.getElementById('txt-total-nodo').innerText = '0';
            tbody.innerHTML = '<tr><td colspan="10" class="text-center p-4">Data tidak ditemukan</td></tr>';
            return;
        }

        // --- 1. DEFINISI FUNGSI PENGURUTAN ---
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

        // --- 2. PROSES DATA (DIPERBAIKI) ---
        let daftarBarangSet = new Set();
        let groupTujuan = {}; 
        let totalNoDO = 0;

        Object.keys(data).forEach(keyTujuan => {
            const itemTujuan = data[keyTujuan];
            if (!itemTujuan || !itemTujuan.data) return;

            const namaTujuan = itemTujuan.tujuan || keyTujuan;

            // Cek apakah data ini adalah tipe MUTASI
            if (itemTujuan.data.hasOwnProperty("-MUTASI")) {
                // STRUKTUR MUTASI
                const dataBarang = itemTujuan.data["-MUTASI"].data;
                groupTujuan[namaTujuan] = { label: "MUTASI", data: {} };
                
                Object.keys(dataBarang).forEach(kode => {
                    daftarBarangSet.add(kode);
                    groupTujuan[namaTujuan].data[kode] = parseInt(dataBarang[kode].qtyUtama || 0);
                });
                totalNoDO += 1;
            } else {
                // STRUKTUR BOSNET (Standar)
                const listNoDO = Object.keys(itemTujuan.data);
                totalNoDO += listNoDO.length;

                let labelNoDO = listNoDO.map(id => id.slice(-2)).join(",");

                if (!groupTujuan[namaTujuan]) {
                    groupTujuan[namaTujuan] = { label: labelNoDO, data: {} };
                }

                listNoDO.forEach(noDO => {
                    Object.keys(itemTujuan.data[noDO]).forEach(kode => {
                        daftarBarangSet.add(kode);
                        groupTujuan[namaTujuan].data[kode] = (groupTujuan[namaTujuan].data[kode] || 0) + 
                            parseInt(itemTujuan.data[noDO][kode].qtyUtama || 0);
                    });
                });
            }
        });
        
        const sortedBarang = Array.from(daftarBarangSet).sort((a, b) => {
            const scoreA1 = getSortScore(a), scoreB1 = getSortScore(b);
            if (scoreA1 !== scoreB1) return scoreA1 - scoreB1;
            const scoreA2 = getVarianScore(a), scoreB2 = getVarianScore(b);
            if (scoreA2 !== scoreB2) return scoreA2 - scoreB2;
            return getAngkaAkhir(a) - getAngkaAkhir(b);
        });

        document.getElementById('txt-total-tujuan').innerText = Object.keys(groupTujuan).length;
        document.getElementById('txt-total-nodo').innerText = totalNoDO;

        // --- 4. RENDER HEADER (Tetap sama) ---
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

            const masterInfo = cacheMasterBarang ? cacheMasterBarang[kode] : null;
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
        console.error("Error sinkronisasi:", e);
    }
};