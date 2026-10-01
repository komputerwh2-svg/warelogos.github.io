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

// Fungsi untuk memformat tanggal visual dan memuat data FDN dari Firestore
async function updateFormatTanggal(dateString) {
    if (!dateString) return;

    // 1. Simpan nilai mentah ke input hidden (format: YYYY-MM-DD)
    document.getElementById('input-tgl-muat').value = dateString;

    // 2. Ubah format untuk tampilan visual menggunakan fungsi Indonesia (contoh: 1 Oktober 2026)
    const formattedVisual = formatTanggalIndonesia(dateString);
    document.getElementById('display-tgl-muat').value = formattedVisual;

    // 3. Konversi format YYYY-MM-DD menjadi YYYYMMDD untuk ID Firestore (contoh: 20261001)
    const firestoreDateId = dateString.replace(/-/g, '');

    // 4. Muat daftar FDN ke kotak preview sebelah kanan
    await renderDaftarFdnToPreview(firestoreDateId);
}

// Inisialisasi Otomatis saat Modul Muat / Mutasi Dibuka (Menampilkan Tanggal Hari Ini)
window.initMutasi = async function() {
    // Ambil tanggal hari ini dalam format YYYY-MM-DD
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;
    
    // Terapkan ke sistem dan tampilan visual
    await updateFormatTanggal(todayString);
    
    // Sinkronkan juga nilai pada elemen input date asli jika ada
    const triggerInput = document.getElementById('trigger-tgl-muat');
    if (triggerInput) {
        triggerInput.value = todayString;
    }

    console.log("Modul Mutasi diinisialisasi dengan tanggal hari ini:", todayString);
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
                <td class="p-2 border font-semibold text-orange-700">${lok}</td>
                <td class="p-2 border font-bold text-orange-600">${kode}</td>
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
                badge.className = "bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-semibold";
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
    let latestImportedDateId = null; // Menyimpan ID tanggal (YYYYMMDD) dari file terakhir yang diimpor

    // Loop melalui setiap file yang dipilih menggunakan Promise.all agar berjalan efisien
    const promises = Array.from(files).map(async (file) => {
        try {
            const textContent = await readFileAsync(file);
            // Tangkap nilai tanggal (YYYYMMDD) yang dikembalikan oleh parseAndSaveFdn
            const parsedDateId = await parseAndSaveFdn(textContent);
            if (parsedDateId) {
                latestImportedDateId = parsedDateId;
            }
            successCount++;
        } catch (error) {
            console.error(`Gagal memproses file ${file.name}:`, error);
            failCount++;
        }
    });

    await Promise.all(promises);

    miuiAlert(`Proses Impor Selesai!\nBerhasil: ${successCount} file\nGagal: ${failCount} file`);

    // Jika ada file yang berhasil diimpor, otomatis sesuaikan tanggal di UI dan render preview-nya
    if (latestImportedDateId) {
        // Ubah format dari YYYYMMDD menjadi YYYY-MM-DD agar cocok dengan input type="date"
        const formattedDateInput = `${latestImportedDateId.substring(0, 4)}-${latestImportedDateId.substring(4, 6)}-${latestImportedDateId.substring(6, 8)}`;
        
        const inputTanggalElem = document.getElementById('input-tanggal-muat');
        if (inputTanggalElem) {
            inputTanggalElem.value = formattedDateInput;
        }

        // Render ulang preview daftar FDN sesuai tanggal file yang baru diimpor
        await renderDaftarFdnToPreview(latestImportedDateId);
    }
    
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

// Fungsi parser dan penyimpanan ke Firestore dengan fitur Update / Tambah Data (Uppercase Otomatis)
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
        
        // Ambil Tujuan (Dipaksa UPPERCASE agar seragam)
        if (line.includes('TUJUAN')) {
            const lastIndex = line.lastIndexOf('TUJUAN');
            const subStr = line.substring(lastIndex);
            const parts = subStr.split(':');
            if (parts.length > 1) {
                tujuanRaw = parts[1].trim().split(/\s{2,}/)[0].toUpperCase();
            }
        }

        // Parsing baris produk tabel
        const trimmed = line.trim();
        if (/^\d+\s+[A-Za-z0-9]+/.test(trimmed)) {
            const tokens = trimmed.split(/\s+/);
            if (tokens.length >= 2) {
                const qtyToken = tokens.find(t => /^\d+\/\d+\/\d+\/\d+$/.test(t));
                if (qtyToken) {
                    // PAKSA KODE PRODUK MENJADI HURUF KAPITAL (UPPERCASE) DISINI
                    const kode = tokens[1].trim().toUpperCase();
                    
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

    // Ambil 5 angka terakhir dari nomor dokumen
    const docNumberDigits = nomorDokumen.replace(/\D/g, '');
    const last5Digits = docNumberDigits.slice(-5);
    
    const docIdTujuan = `${formattedTujuan}_${last5Digits}`;

    // 4. Format ID Tanggal (DD/MM/YYYY -> YYYYMMDD)
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
    
    const inputTanggalElem = document.getElementById('input-tanggal-muat');
    const targetDateId = inputTanggalElem ? inputTanggalElem.value : docIdTanggal;
    
    await renderDaftarFdnToPreview(targetDateId);

    // KEMBALIKAN NILAI TANGGAL AGAR DITANGKAP OLEH handleImportFdnFiles
    return docIdTanggal;
}

// Fungsi untuk mengambil data dari sub-koleksi datatujuan dan menampilkannya ke #fdn-preview-text
async function renderDaftarFdnToPreview(dateId) {
    const previewContainer = document.getElementById('fdn-preview-text');
    if (!previewContainer) return;

    previewContainer.innerHTML = '<div class="text-slate-500 italic p-1">Memuat data FDN...</div>';

    // Elemen statistik
    const inputTotFdn = document.getElementById('tot-fdn');
    const inputTotTujuan = document.getElementById('tot-tujuan');
    const inputTotKeseluruhan = document.getElementById('tot-keseluruhan');

    try {
        const tujuanSnapshot = await db.collection('muat_fdn').doc(dateId).collection('datatujuan').get();

        if (tujuanSnapshot.empty) {
            previewContainer.innerHTML = '<div class="text-slate-900 shadow-sm">Belum ada data FDN diimport ditanggal ini...</div>';
            if (inputTotFdn) inputTotFdn.value = '0';
            if (inputTotTujuan) inputTotTujuan.value = '0';
            if (inputTotKeseluruhan) inputTotKeseluruhan.value = '0';
            return;
        }

        let totalFdnCount = 0;
        let totalQtyKeseluruhan = 0;
        const uniqueTujuanSet = new Set();
        const groupedByTujuan = {};

        tujuanSnapshot.forEach(doc => {
            const data = doc.data();
            const meta = data.meta || {};
            let tujuan = meta.tujuan || 'TANPA TUJUAN';
            
            // Singkat "STOCK POINT" menjadi "SP"
            tujuan = tujuan.replace('STOCK POINT', 'SP');
            uniqueTujuanSet.add(tujuan);

            const nomorDokumen = meta.nomor_dokumen || doc.id;
            const docIdFirestore = doc.id; // Simpan ID dokumen Firestore (misal: SP_CILACAP_75642)
            const gudang = meta.dari_gudang || 'WH-2';
            
            // Hitung item & total qty_utama
            const items = data.data || [];
            const itemCount = items.length;
            
            items.forEach(item => {
                totalQtyKeseluruhan += Number(item.qty_utama || 0);
            });

            totalFdnCount++;

            if (!groupedByTujuan[tujuan]) {
                groupedByTujuan[tujuan] = {
                    tujuan: tujuan,
                    dokumenList: [],
                    docIdList: [], // Menyimpan ID dokumen Firestore untuk modal
                    gudangSet: new Set(),
                    itemCounts: []
                };
            }
            groupedByTujuan[tujuan].dokumenList.push(nomorDokumen);
            groupedByTujuan[tujuan].docIdList.push(docIdFirestore);
            groupedByTujuan[tujuan].gudangSet.add(gudang);
            groupedByTujuan[tujuan].itemCounts.push(itemCount);
        });

        // Update nilai ke 3 kotak statistik di bawah
        if (inputTotFdn) inputTotFdn.value = totalFdnCount;
        if (inputTotTujuan) inputTotTujuan.value = uniqueTujuanSet.size;
        if (inputTotKeseluruhan) inputTotKeseluruhan.value = totalQtyKeseluruhan;

        let htmlContent = '<div class="space-y-1">';
        let nomorUrut = 1;

        // Render hasil grouping ke dalam HTML preview dengan format ringkas & interaktif
        for (const key in groupedByTujuan) {
            const group = groupedByTujuan[key];
            
            // Ambil 5 digit terakhir dari setiap nomor dokumen
            const suffixes = group.dokumenList.map(doc => {
                const digits = doc.replace(/\D/g, '');
                return digits.length >= 5 ? digits.slice(-5) : doc;
            });
            
            const formattedDoc = suffixes.join(' & ');
            const primaryDocId = group.docIdList[0]; // Ambil ID utama untuk modal

            // Format Gudang (misal: WH-2 atau WH-2 & WH-3)
            const gudangArr = Array.from(group.gudangSet);
            const gudangStr = gudangArr.length > 1 ? gudangArr.join(' & ') : (gudangArr[0] || 'WH-2');

            // Format rincian item (Contoh: 10 + 1 item)
            const itemCountStr = group.itemCounts.join(' + ');

            htmlContent += `
                <div onclick="openFdnDetailModalByTujuan('${dateId}', '${group.tujuan}')" 
                     class="flex justify-between items-center bg-orange-50 hover:bg-orange-100 cursor-pointer p-1 rounded border border-slate-200 transition shadow-xs">
                    <div>
                        <span class="font-bold text-slate-800">${nomorUrut}.</span> 
                        <span class="font-semibold text-orange-700">${formattedDoc}</span> 
                        <span class="text-slate-600">→ ${group.tujuan} (${gudangStr})</span>
                    </div>
                    <span class="bg-orange-100 text-orange-800 text-[9px] px-1.5 py-0.5 rounded font-bold">
                        (${itemCountStr} item)
                    </span>
                </div>
            `;
            nomorUrut++;
        }

        htmlContent += '</div>';
        previewContainer.innerHTML = htmlContent;

    } catch (error) {
        console.error("Gagal memuat preview FDN:", error);
        previewContainer.innerHTML = '<div class="text-red-500 p-1">Terjadi kesalahan saat memuat data.</div>';
    }
}

// Variabel global sementara untuk menyimpan konteks modal aktif
let activeModalContext = {
    dateId: '',
    matchedDocs: [] // Berisi array ID dokumen Firestore dan nomor dokumennya
};

// Modifikasi sedikit pada fungsi openFdnDetailModalByTujuan saat menyimpan data matchedDocs:
async function openFdnDetailModalByTujuan(dateId, tujuanKey) {
    const modal = document.getElementById('fdn-modal-detail');
    const itemListContainer = document.getElementById('modal-item-list');
    
    // Sembunyikan dulu dropdown pilihan hapus saat modal baru dibuka
    document.getElementById('container-pilih-hapus').classList.add('hidden');
    document.getElementById('btn-hapus-fdn').classList.remove('hidden');

    itemListContainer.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-500 italic">Memuat seluruh data item FDN...</td></tr>';
    modal.classList.remove('hidden');

    try {
        const snapshot = await db.collection('muat_fdn').doc(dateId).collection('datatujuan').get();

        if (snapshot.empty) {
            alert("Data FDN tidak ditemukan di database!");
            closeFdnModal();
            return;
        }

        let matchedDocs = [];
        let allItemsCombined = [];
        let docNumbers = [];
        let tanggalVal = '-';
        let tujuanVal = '-';
        let gudangSet = new Set();

        snapshot.forEach(doc => {
            const data = doc.data();
            const meta = data.meta || {};
            let currentTujuan = meta.tujuan || 'TANPA TUJUAN';
            currentTujuan = currentTujuan.replace('STOCK POINT', 'SP');

            if (currentTujuan === tujuanKey) {
                const noDok = meta.nomor_dokumen || doc.id;
                matchedDocs.push({
                    firestoreId: doc.id,
                    nomorDokumen: noDok
                });
                docNumbers.push(noDok);
                
                if (tanggalVal === '-') tanggalVal = meta.tanggal || '-';
                if (tujuanVal === '-') tujuanVal = currentTujuan;
                
                const gudangAsal = meta.dari_gudang || 'WH-2';
                gudangSet.add(gudangAsal);

                const items = data.data || [];
                items.forEach(item => {
                    allItemsCombined.push({
                        ...item,
                        nomor_dokumen: noDok,
                        dari_gudang: gudangAsal
                    });
                });
            }
        });

        // Simpan ke konteks global modal
        activeModalContext = {
            dateId: dateId,
            matchedDocs: matchedDocs
        };

        if (matchedDocs.length === 0) {
            alert("Data tujuan tidak ditemukan.");
            closeFdnModal();
            return;
        }

        // Format tampilan nomor dokumen gabungan di header
        let formattedDocNo = '';
        if (docNumbers.length === 1) {
            formattedDocNo = docNumbers[0];
        } else {
            const firstDoc = docNumbers[0];
            const lastDashIdx = firstDoc.lastIndexOf('-');
            const prefix = lastDashIdx !== -1 ? firstDoc.substring(0, lastDashIdx + 1) : '';
            const suffixes = docNumbers.map(doc => {
                const idx = doc.lastIndexOf('-');
                return idx !== -1 ? doc.substring(idx + 1) : doc;
            });
            formattedDocNo = prefix + suffixes.join(' & ');
        }

        const gudangArr = Array.from(gudangSet);
        const gudangStr = gudangArr.length > 1 ? gudangArr.join(' & ') : (gudangArr[0] || 'WH-2');

        document.getElementById('modal-doc-no').innerText = formattedDocNo;
        document.getElementById('modal-tanggal').innerText = tanggalVal;
        document.getElementById('modal-tujuan').innerText = tujuanVal;
        document.getElementById('modal-gudang').innerText = gudangStr;

        // Render baris tabel 5 kolom
        let rowsHtml = '';
        allItemsCombined.forEach((item, index) => {
            const sub = item.sub || {};
            const bal = sub.bal !== undefined ? sub.bal : 0;
            const rtg = sub.rtg !== undefined ? sub.rtg : 0;
            const pcs = sub.pcs !== undefined ? sub.pcs : 0;
            const jumlahStr = `${item.qty_utama || 0} / ${bal} / ${rtg} / ${pcs}`;

            const docStr = item.nomor_dokumen;
            const digits = docStr.replace(/\D/g, '');
            const shortDoc = digits.length >= 5 ? digits.slice(-5) : docStr;

            rowsHtml += `
                <tr class="border-b border-slate-100 hover:bg-slate-50">
                    <td class="p-2 text-center font-medium text-slate-500">${index + 1}</td>
                    <td class="p-2 font-mono font-bold text-orange-600 uppercase">${item.kode}</td>
                    <td class="p-2 font-mono">${jumlahStr}</td>
                    <td class="p-2 font-mono font-semibold text-slate-700">${shortDoc}</td>
                    <td class="p-2 text-center font-bold text-slate-800">${item.dari_gudang}</td>
                </tr>
            `;
        });

        itemListContainer.innerHTML = rowsHtml;

    } catch (error) {
        console.error("Gagal memuat detail gabungan FDN:", error);
        itemListContainer.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-500">Gagal memuat data dari server.</td></tr>';
    }
}

// Fungsi ketika tombol utama "Hapus FDN Ini" diklik
function handleTombolHapusClick() {
    const docs = activeModalContext.matchedDocs;
    
    if (docs.length === 1) {
        // Jika hanya ada 1 FDN, langsung konfirmasi hapus dokumen tersebut
        hapusFdnDocument(activeModalContext.dateId, docs[0].firestoreId);
    } else if (docs.length > 1) {
        // Jika ada lebih dari 1 FDN, tampilkan dropdown pilihan dan sembunyikan tombol utama
        const selectElem = document.getElementById('select-fdn-to-delete');
        selectElem.innerHTML = '';
        
        // Tambahkan opsi "Semua FDN" dan opsi satuan per nomor dokumen
        let optionsHtml = `<option value="ALL">-- Hapus Semua (${docs.length} FDN) --</option>`;
        docs.forEach(d => {
            optionsHtml += `<option value="${d.firestoreId}">Hapus FDN: ${d.nomorDokumen}</option>`;
        });
        selectElem.innerHTML = optionsHtml;

        document.getElementById('btn-hapus-fdn').classList.add('hidden');
        document.getElementById('container-pilih-hapus').classList.remove('hidden');
    }
}

// Fungsi untuk membatalkan pemilihan hapus
function batalPilihHapus() {
    document.getElementById('container-pilih-hapus').classList.add('hidden');
    document.getElementById('btn-hapus-fdn').classList.remove('hidden');
}

// Fungsi untuk mengeksekusi penghapusan berdasarkan pilihan di dropdown
async function eksekusiHapusPilihan() {
    const selectElem = document.getElementById('select-fdn-to-delete');
    const selectedVal = selectElem.value;
    const dateId = activeModalContext.dateId;

    if (selectedVal === "ALL") {
        const allFirestoreIds = activeModalContext.matchedDocs.map(d => d.firestoreId);
        await hapusGroupFdnDocuments(dateId, allFirestoreIds);
    } else {
        // Hapus spesifik satu dokumen FDN yang dipilih
        if (!confirm(`Apakah Anda yakin ingin menghapus FDN yang dipilih ini?`)) return;
        try {
            await db.collection('muat_fdn').doc(dateId).collection('datatujuan').doc(selectedVal).delete();
            miuiAlert("Data FDN berhasil dihapus.");
            closeFdnModal();
            renderDaftarFdnToPreview(dateId);
        } catch (error) {
            console.error("Gagal menghapus FDN satuan:", error);
            miuiAlert("Terjadi kesalahan saat menghapus data.");
        }
    }
}

// Fungsi untuk menutup modal
function closeFdnModal() {
    const modal = document.getElementById('fdn-modal-detail');
    if (modal) modal.classList.add('hidden');
}

// Fungsi helper hapus dokumen satuan
async function hapusFdnDocument(dateId, docId) {
    if (!confirm(`Apakah Anda yakin ingin menghapus FDN ini dari sistem?`)) return;
    try {
        await db.collection('muat_fdn').doc(dateId).collection('datatujuan').doc(docId).delete();
        miuiAlert("Data FDN berhasil dihapus.");
        closeFdnModal();
        renderDaftarFdnToPreview(dateId);
    } catch (error) {
        console.error("Gagal menghapus FDN:", error);
        miuiAlert("Terjadi kesalahan saat menghapus data.");
    }
}

// Fungsi helper hapus sekumpulan dokumen FDN
async function hapusGroupFdnDocuments(dateId, docIdArray) {
    if (!confirm(`Apakah Anda yakin ingin menghapus seluruh (${docIdArray.length}) FDN pada tujuan ini?`)) return;
    try {
        const batch = db.batch();
        docIdArray.forEach(docId => {
            const docRef = db.collection('muat_fdn').doc(dateId).collection('datatujuan').doc(docId);
            batch.delete(docRef);
        });
        await batch.commit();
        miuiAlert("Semua data FDN pada tujuan ini berhasil dihapus.");
        closeFdnModal();
        renderDaftarFdnToPreview(dateId);
    } catch (error) {
        console.error("Gagal menghapus sekumpulan FDN:", error);
        miuiAlert("Terjadi kesalahan saat menghapus data.");
    }
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