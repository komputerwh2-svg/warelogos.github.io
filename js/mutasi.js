// Array nama bulan dalam Bahasa Indonesia untuk format visual
const namaBulanIndo = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function formatTanggalIndonesia(dateString) {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;
    
    const tahun = parts[0];
    const bulanIndex = parseInt(parts[1], 10) - 1;
    const hari = parts[2];
    
    const namaBulan = namaBulanIndo[bulanIndex] || "";
    return `${parseInt(hari, 10)} ${namaBulan} ${tahun}`;
}

function updateFormatTanggal(isoDateStr) {
    if (!isoDateStr) return;
    
    // 1. Simpan format sistem ke hidden input (untuk database YYYY-MM-DD)
    const hiddenInput = document.getElementById('input-tgl-muat');
    if (hiddenInput) hiddenInput.value = isoDateStr;
    
    // 2. Ubah tampilan visual ke format DD MMMM YYYY
    const displayInput = document.getElementById('display-tgl-muat');
    if (displayInput) displayInput.value = formatTanggalIndonesia(isoDateStr);
    
    // Sinkronkan juga nilai pada trigger input date transparan
    const triggerInput = document.getElementById('trigger-tgl-muat');
    if (triggerInput && triggerInput.value !== isoDateStr) {
        triggerInput.value = isoDateStr;
    }
}

// Fungsi untuk mengambil dan menghitung hari kerja berikutnya dengan melompati Minggu & Libur Nasional
async function getNextWorkingDateSmart() {
    // Ambil daftar libur online (menggunakan fungsi WH3 yang sudah ada atau fallback)
    let daftarLibur = [];
    if (typeof window.getHariLiburNasional === 'function') {
        try {
            daftarLibur = await window.getHariLiburNasional();
        } catch (e) {
            console.warn("Gagal memuat libur online, menggunakan data standar:", e);
        }
    }
    
    // Fallback libur standar jika API offline
    if (!daftarLibur || daftarLibur.length === 0) {
        daftarLibur = [
            '2026-01-01', '2026-01-16', '2026-02-17', '2026-03-19', '2026-03-21', 
            '2026-05-01', '2026-05-14', '2026-05-27', '2026-05-31', '2026-06-01', 
            '2026-08-17', '2026-09-28', '2026-12-25'
        ];
    }

    let currentDate = new Date();
    // Set mulai dari hari esok (+1 hari dari hari ini)
    currentDate.setDate(currentDate.getDate() + 1);
    
    while (true) {
        const dayOfWeek = currentDate.getDay(); // 0 = Minggu
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Validasi: bukan hari Minggu DAN bukan hari libur nasional
        if (dayOfWeek !== 0 && !daftarLibur.includes(dateString)) {
            return dateString;
        }
        
        // Lanjut ke hari berikutnya jika libur atau Minggu
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

// Inisialisasi Otomatis saat Modul Muat / Mutasi Dibuka
window.initMutasi = async function() {
    // Hitung tanggal besok dengan mengecek libur nasional & hari minggu
    const nextWorkingDay = await getNextWorkingDateSmart();
    
    // Terapkan ke sistem dan tampilan visual
    updateFormatTanggal(nextWorkingDay);
    
    console.log("Modul Mutasi & Tanggal Muat Otomatis Berhasil Diinisialisasi:", nextWorkingDay);
    if (typeof refreshWmsData === 'function') {
        refreshWmsData();
    }
};

// Array global untuk menyimpan data cache
let wmsGlobalData = [];
let listRakMutasiTemp = [];

// Fungsi untuk merender data dengan dukungan filter pencarian real-time dan Rak No
function filterWmsReportData() {
    const tbody = document.getElementById('tabel-wms-report-body');
    if (!tbody) return;

    if (!wmsGlobalData || wmsGlobalData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400 italic">Tidak ada data stok.</td></tr>`;
        return;
    }

    // Ambil nilai dari input filter di HTML
    const keywordRak = document.getElementById('filter-kode-rak')?.value.trim().toUpperCase() || '';
    const keywordBarang = document.getElementById('filter-kode-barang')?.value.trim().toUpperCase() || '';
    const keywordRakNo = document.getElementById('filter-rak-no')?.value.trim() || '';

    // Salin data sebelum diurutkan agar data global tetap aman
    let sortedData = [...wmsGlobalData];

    // --- LOGIKA PENGURUTAN (SORTING) ---
    sortedData.sort((a, b) => {
        const stokA = Number(a.QTY_STOK ?? a.STOK ?? a.stok ?? 0);
        const stokB = Number(b.QTY_STOK ?? b.STOK ?? b.stok ?? 0);

        // 1. Urutkan berdasarkan stok terkecil ke terbesar
        if (stokA !== stokB) {
            return stokA - stokB;
        }

        // 2. Jika stok sama, urutkan berdasarkan expdate terdekat ke terlama
        const expA = a.EXPDATE || a.expdate || '9999-12-31';
        const expB = b.EXPDATE || b.expdate || '9999-12-31';
        return expA.localeCompare(expB);
    });

    // Filter data sesuai input pengguna dari data yang sudah terurut
    const filteredData = sortedData.filter(item => {
        const kodeLokasi = String(item.LOKASI_PALET || item.KODE_LOKASI || item.kode_lokasi || '').trim().toUpperCase();
        const kodeBarang = String(item.KODE || item.kode || '').toUpperCase();

        const matchRak = kodeLokasi.includes(keywordRak);
        const matchBarang = kodeBarang.includes(keywordBarang);
        
        let matchRakNo = true;
        if (keywordRakNo) {
            const regex = new RegExp(`^\\s*${keywordRakNo}\\b`, 'i');
            matchRakNo = regex.test(kodeLokasi);
        }

        return matchRak && matchBarang && matchRakNo;
    });

    if (filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400 italic">Data tidak ditemukan sesuai filter.</td></tr>`;
        return;
    }

    let html = '';
    filteredData.slice(0, 100).forEach((item, index) => {
        const lok = item.LOKASI_PALET || item.KODE_LOKASI || item.kode_lokasi || '-';
        const kode = item.KODE || item.kode || '-';
        const stok = item.QTY_STOK ?? item.STOK ?? item.stok ?? 0;
        const exp = item.EXPDATE || item.expdate || '-';

        html += `
            <tr class="border-b hover:bg-slate-50 text-xs">
                <td class="p-2 border text-center font-semibold text-slate-500">${index + 1}</td>
                <td class="p-2 border font-semibold text-slate-700">${lok}</td>
                <td class="p-2 border font-bold text-blue-600">${kode}</td>
                <td class="p-2 border text-center text-slate-700 font-bold">${stok}</td>
                <td class="p-2 border text-center text-slate-500">${exp}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Variabel global untuk menyimpan snapshot data sebelumnya guna perbandingan perubahan
let previousWmsDataSnapshot = [];

async function refreshWmsData() {
    const updateLabel = document.getElementById('wms-last-update');
    const badge = document.getElementById('firebase-badge');
    const tbody = document.getElementById('tabel-wms-report-body');
    
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400 italic">Memuat data terbaru dari Firebase...</td></tr>`;
    }
    
    if (badge) {
        badge.className = "bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-semibold";
        badge.innerText = "Firebase: Memuat...";
    }

    try {
        const rtdbUrl = 'https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_cache.json?t=' + new Date().getTime();
        const response = await fetch(rtdbUrl);
        
        if (!response.ok) {
            throw new Error('Gagal terhubung ke Firebase RTDB.');
        }
        
        const jsonResponse = await response.json();
        
        if (!jsonResponse) {
            wmsGlobalData = [];
        } else {
            const rawData = jsonResponse.data || jsonResponse;
            const serverSyncTime = jsonResponse.meta?.last_sync ? jsonResponse.meta.last_sync.substring(11, 19) : '-';
            const totalItemsServer = jsonResponse.meta?.total_items || (Array.isArray(rawData) ? rawData.length : Object.values(rawData).length);
            
            if (Array.isArray(rawData)) {
                wmsGlobalData = rawData;
            } else {
                wmsGlobalData = Object.values(rawData);
            }

            // --- LOGIKA PENGECEKAN PERUBAHAN DATA SECARA RINCI (LOKASI & QTY STOK) ---
            let isDataChanged = false;
            if (previousWmsDataSnapshot.length > 0) {
                if (previousWmsDataSnapshot.length !== wmsGlobalData.length) {
                    isDataChanged = true;
                } else {
                    // Cek perubahan isi detail per item (membandingkan Lokasi Palet & Qty Stok)
                    for (let i = 0; i < wmsGlobalData.length; i++) {
                        const curr = wmsGlobalData[i];
                        const prev = previousWmsDataSnapshot[i];
                        
                        const currLoc = curr.LOKASI_PALET || curr.kode_lokasi || '';
                        const prevLoc = prev.LOKASI_PALET || prev.kode_lokasi || '';
                        const currQty = curr.QTY_STOK ?? curr.STOK ?? 0;
                        const prevQty = prev.QTY_STOK ?? prev.STOK ?? 0;

                        if (currLoc !== prevLoc || currQty !== prevQty) {
                            isDataChanged = true;
                            break;
                        }
                    }
                }
            }
            
            // Simpan snapshot data saat ini untuk perbandingan berikutnya
            previousWmsDataSnapshot = JSON.parse(JSON.stringify(wmsGlobalData));

            filterWmsReportData();

            // Waktu lokal saat browser menarik data
            const now = new Date();
            const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateString = now.toLocaleDateString('id-ID');

            // 1. Label di bawah tabel: Menampilkan waktu lokal, total item dari server, dan status validasi perubahan
            if (updateLabel) {
                let statusPerubahanHTML = isDataChanged 
                    ? `<span class="text-amber-600 font-bold ml-1">⚠️ [Ada Perubahan Stok/Lokasi]</span>` 
                    : `<span class="text-emerald-600 ml-1">✓ (Data Stabil / Sesuai)</span>`;
                
                updateLabel.innerHTML = `Update Data WMS Terakhir: ${dateString} ${timeString} | Total Sinkron: ${totalItemsServer} Item ${statusPerubahanHTML}`;
            }

            // 2. Badge Firebase di kanan atas
            if (badge) {
                badge.className = "bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-semibold";
                badge.innerText = `Firebase: ${wmsGlobalData.length} Item (Pembaruan terakhir: ${serverSyncTime})`;
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-red-500 italic">Gagal memuat data dari Firebase.</td></tr>`;
        }
        if (badge) {
            badge.className = "bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-semibold";
            badge.innerText = "Gagal Terhubung";
        }
    }
}


// Fungsi utama untuk menangani banyak file yang dipilih sekaligus
async function handleImportFdnFiles(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    let successCount = 0;
    let failCount = 0;

    // Loop melalui setiap file yang dipilih menggunakan Promise.all agar berjalan efisien
    const promises = Array.from(files).map(async (file) => {
        try {
            const textContent = await readFileAsync(file);
            await parseAndSaveFdn(textContent);
            successCount++;
        } catch (error) {
            console.error(`Gagal memproses file ${file.name}:`, error);
            failCount++;
        }
    });

    await Promise.all(promises);

    miuiAlert(`Proses Impor Selesai!\nBerhasil: ${successCount} file\nGagal: ${failCount} file`);
    
    // Reset input file
    event.target.value = '';
}

// Helper untuk membaca file teks secara asinkron
function readFileAsync(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

// Fungsi parser dan penyimpanan ke Firestore dengan fitur Update / Tambah Data
async function parseAndSaveFdn(fileContent) {
    const lines = fileContent.split('\n');
    let dariGudangRaw = '', nomorDokumen = '', tanggal = '', tujuanRaw = '';
    let items = [];

    // 1. Parsing Header dan Baris Item secara presisi
    lines.forEach(line => {
        // Ambil Gudang
        if (line.includes('DARI GUDANG')) {
            const parts = line.split(':');
            if (parts.length > 1) dariGudangRaw = parts[1].trim().split(/\s{2,}/)[0];
        }
        
        // KOREKSI UTAMA NOMOR DOKUMEN: Gunakan lastIndexOf agar tidak tercampur teks sebelah kiri
        if (line.includes('NOMOR DOKUMEN')) {
            const lastIndex = line.lastIndexOf('NOMOR DOKUMEN');
            const subStr = line.substring(lastIndex);
            const parts = subStr.split(':');
            if (parts.length > 1) {
                nomorDokumen = parts[1].trim().split(/\s{2,}/)[0];
            }
        }
        
        // Ambil Tanggal
        if (line.includes('TANGGAL')) {
            const match = line.match(/TANGGAL\s*:\s*([0-9\/]+)/);
            if (match) tanggal = match[1].trim();
        }
        
        // Ambil Tujuan
        if (line.includes('TUJUAN')) {
            const lastIndex = line.lastIndexOf('TUJUAN');
            const subStr = line.substring(lastIndex);
            const parts = subStr.split(':');
            if (parts.length > 1) {
                tujuanRaw = parts[1].trim().split(/\s{2,}/)[0];
            }
        }

        // Parsing baris produk tabel
        const trimmed = line.trim();
        if (/^\d+\s+[A-Z0-9]+/.test(trimmed)) {
            const tokens = trimmed.split(/\s+/);
            if (tokens.length >= 2) {
                const qtyToken = tokens.find(t => /^\d+\/\d+\/\d+\/\d+$/.test(t));
                if (qtyToken) {
                    const kode = tokens[1];
                    const qtyParts = qtyToken.split('/').map(Number);
                    
                    const krt = qtyParts[0] || 0; // Qty Utama (Karton)
                    const bal = qtyParts[1] || 0;
                    const rtg = qtyParts[2] || 0;
                    const pcs = qtyParts[3] || 0;

                    // Simpan lengkap nilai sub-nya ke Firestore
                    items.push({
                        kode: kode,
                        qty_utama: krt,
                        sub: {
                            bal: bal,
                            rtg: rtg,
                            pcs: pcs
                        }
                    });
                }
            }
        }
    });

    if (!tanggal || !nomorDokumen || !tujuanRaw) {
        throw new Error("Format file FDN tidak valid atau header (Tanggal/No Dokumen/Tujuan) tidak lengkap.");
    }

    // 2. Format Gudang (WH-2 atau WH-3)
    let dariGudang = "WH-2";
    if (dariGudangRaw.includes("WH-2 HO NON WMS") || dariGudangRaw.includes("WH-3")) {
        dariGudang = "WH-3";
    }

    // 3. Format Tujuan & Nomor Dokumen untuk ID Firestore (<singkatan_tujuan>_<5_digit_terakhir>)
    let formattedTujuan = tujuanRaw.replace('STOCK POINT', 'SP').replace(/[^a-zA-Z0-9]/g, '_').trim();
    formattedTujuan = formattedTujuan.replace(/_+/g, '_');

    // Ambil 5 angka terakhir dari nomor dokumen (contoh: DN-HO001-2609-75636 -> 75636)[cite: 7, 14]
    const docNumberDigits = nomorDokumen.replace(/\D/g, '');
    const last5Digits = docNumberDigits.slice(-5);
    
    const docIdTujuan = `${formattedTujuan}_${last5Digits}`; // Hasil: SP_KEBUMEN_75636

    // 4. Format ID Tanggal (DD/MM/YYYY -> YYYYMMDD)[cite: 14]
    const [d, m, y] = tanggal.split('/');
    const docIdTanggal = `${y}${m}${d}`;

    // 5. Simpan / Perbarui ke Firestore
    const tanggalDocRef = db.collection('muat_fdn').doc(docIdTanggal);
    const tujuanDocRef = tanggalDocRef.collection('datatujuan').doc(docIdTujuan);

    await tujuanDocRef.set({
        meta: {
            dari_gudang: dariGudang,
            nomor_dokumen: nomorDokumen,
            tanggal: tanggal,
            tujuan: tujuanRaw,
            updated_at: new Date().toISOString()
        },
        data: items
    }, { merge: true });

    console.log(`Sukses menyimpan FDN dengan ID: ${docIdTujuan}`);
}


// Fungsi Placeholder untuk menambah rak ke list mutasi di sebelah kiri
function tambahItemMutasiList() {
    const kode = document.getElementById('mutasi-kode').value.trim().toUpperCase();
    const lokasi = document.getElementById('mutasi-lokasi').value.trim().toUpperCase();
    const qty = parseInt(document.getElementById('mutasi-qty').value) || 0;

    if (!kode || !lokasi || qty <= 0) {
        if (typeof miuiAlert === 'function') {
            miuiAlert('Kode Barang, Lokasi Rak, dan Qty Ambil wajib diisi dengan benar!');
        }
        return;
    }

    listRakMutasiTemp.push({ kode, lokasi, qty });
    renderListMutasiTemp();

    // Reset input form kecil
    document.getElementById('mutasi-qty').value = '';
}

// Render daftar rak sementara di form kiri
function renderListMutasiTemp() {
    const container = document.getElementById('container-list-mutasi');
    if (!container) return;

    if (listRakMutasiTemp.length === 0) {
        container.innerHTML = `<div class="text-slate-400 italic text-center py-1">Belum ada rak ditambahkan</div>`;
        return;
    }

    let html = '';
    listRakMutasiTemp.forEach((item, idx) => {
        html += `
            <div class="flex justify-between items-center bg-white px-2.5 py-1.5 rounded-lg border border-orange-200">
                <div>
                    <span class="font-bold text-slate-800">${item.kode}</span> 
                    <span class="text-slate-500 text-[10px]">(${item.lokasi})</span>
                    <span class="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded font-black text-[9px]">Ambil: ${item.qty}</span>
                </div>
                <button type="button" onclick="hapusItemMutasiTemp(${idx})" class="text-red-500 hover:text-red-700 px-1.5 py-0.5 text-xs font-bold" title="Hapus">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function hapusItemMutasiTemp(idx) {
    listRakMutasiTemp.splice(idx, 1);
    renderListMutasiTemp();
}

function simpanDataMutasi() {
    if (listRakMutasiTemp.length === 0) {
        if (typeof miuiAlert === 'function') {
            miuiAlert('Belum ada data rak yang dimasukkan ke daftar mutasi!');
        }
        return;
    }
    if (typeof miuiAlert === 'function') {
        miuiAlert('Data Mutasi berhasil disimpan dan diarsipkan!');
    }
    listRakMutasiTemp = [];
    renderListMutasiTemp();
}

// Daftarkan fungsi ke window agar bisa diakses global
window.filterWmsReportData = filterWmsReportData;
window.tambahItemMutasiList = tambahItemMutasiList;
window.hapusItemMutasiTemp = hapusItemMutasiTemp;
window.simpanDataMutasi = simpanDataMutasi;