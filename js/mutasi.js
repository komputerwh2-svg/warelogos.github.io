// Variabel global untuk menyimpan data FDN yang valid
let globalDataFdn = [];

window.loadDataBulanDanTanggal = async function() {
    const selectBulan = document.getElementById('select-periode-bulan');
    const selectTgl = document.getElementById('input-tgl-muat');
    const db = window.db;

    if (!selectBulan || !selectTgl || !db) return;

    selectBulan.innerHTML = '<option value="">Memuat Bulan...</option>';
    selectTgl.innerHTML = '<option value="">Pilih Tanggal...</option>';

    try {
        console.log("Membaca data tanggal dari field meta.tanggal di collectionGroup datatujuan");
        const snapshot = await db.collectionGroup('datatujuan').get();
        
        console.log("Jumlah dokumen di collectionGroup datatujuan:", snapshot.size);

        globalDataFdn = [];
        let bulanSet = new Set();
        let tanggalSet = new Set();
        const namaBulan = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];

        snapshot.forEach(doc => {
            const data = doc.data();
            // Ambil dari field meta.tanggal (contoh format: "26/09/2026")
            const tglStr = data && data.meta ? data.meta.tanggal : null;

            if (tglStr && typeof tglStr === 'string' && tglStr.includes('/')) {
                // Pisahkan format "DD/MM/YYYY" menjadi komponen hari, bulan, tahun
                const parts = tglStr.split('/');
                if (parts.length === 3) {
                    let hari = parts[0]; // "26"
                    let angkaBulan = parts[1]; // "09"
                    let tahun = parts[2]; // "2026"

                    // Buat ID unik YYYYMMDD untuk sorting dan value (contoh: "20260926")
                    let tglId = `${tahun}${angkaBulan}${hari}`;

                    if (!tanggalSet.has(tglId)) {
                        tanggalSet.add(tglId);

                        let bulanIndex = parseInt(angkaBulan, 10) - 1;
                        if (bulanIndex >= 0 && bulanIndex < 12) {
                            let namaBulanStr = `${namaBulan[bulanIndex]} ${tahun}`; // "September 2026"
                            let bulanKey = `${tahun}-${angkaBulan}`; // "2026-09"
                            let formattedDate = `${hari}-${angkaBulan}-${tahun}`; // "26-09-2026"

                            bulanSet.add(JSON.stringify({ key: bulanKey, name: namaBulanStr }));

                            globalDataFdn.push({
                                raw: tglId,           // "20260926"
                                bulanKey: bulanKey,   // "2026-09"
                                formatted: formattedDate // "26-09-2026"
                            });
                        }
                    }
                }
            }
        });

        console.log("Total tanggal unik dari meta.tanggal ditemukan:", globalDataFdn.length);

        if (globalDataFdn.length === 0) {
            selectBulan.innerHTML = '<option value="">Tidak ada data bulan</option>';
            selectTgl.innerHTML = '<option value="">Pilih Tanggal</option>';
            return;
        }

        // Urutkan data dari yang terbaru (Descending)
        globalDataFdn.sort((a, b) => b.raw.localeCompare(a.raw));

        let listBulan = Array.from(bulanSet).map(item => JSON.parse(item));
        listBulan.sort((a, b) => b.key.localeCompare(a.key));

        // Render Dropdown Bulan
        selectBulan.innerHTML = '<option value="">Pilih Bulan...</option>';
        listBulan.forEach(b => {
            let opt = document.createElement('option');
            opt.value = b.key;
            opt.textContent = b.name;
            selectBulan.appendChild(opt);
        });

        // Set default ke bulan aktif saat ini jika ada, atau ambil yang teratas
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
        const currentBulanKey = `${currentYear}-${currentMonth}`;

        const foundCurrentMonth = listBulan.find(b => b.key === currentBulanKey);
        if (foundCurrentMonth) {
            selectBulan.value = currentBulanKey;
        } else if (listBulan.length > 0) {
            selectBulan.value = listBulan[0].key;
        }

        // Panggil filter tanggal berdasarkan bulan yang terpilih
        window.filterTanggalByBulan();

    } catch (error) {
        console.error("Gagal memuat data dari meta.tanggal:", error);
        selectBulan.innerHTML = '<option value="">Error Memuat Data</option>';
    }
};

// 1. Perbarui fungsi onTanggalMuatChange agar memanggil renderDaftarFdnToPreview
window.onTanggalMuatChange = async function(tglId) {
    if (!tglId) return;
    console.log("Tanggal Muat dipilih:", tglId);
    
    // 1. Render preview FDN
    if (typeof renderDaftarFdnToPreview === 'function') {
        await renderDaftarFdnToPreview(tglId);
    }
    
    // 2. Render atau muat data ambilrak dari Firestore sesuai tanggal terpilih
    if (typeof loadDataAmbilRak === 'function') {
        loadDataAmbilRak();
    }

    // 3. Isi dropdown kode barang berdasarkan FDN tanggal aktif
    if (typeof populateMutasiKodeDropdown === 'function') {
        await populateMutasiKodeDropdown(tglId);
    }
    
    // 3. Jika ada fungsi lain untuk render tabel gabungan
    if (typeof window.renderTabelGabungan === 'function') {
        await window.renderTabelGabungan(tglId);
    }
};

// 2. Pastikan saat filter tanggal diubah, nilai value-nya adalah 'YYYYMMDD' (tglId)
window.filterTanggalByBulan = function() {
    const selectBulan = document.getElementById('select-periode-bulan');
    const selectTgl = document.getElementById('input-tgl-muat');
    
    if (!selectBulan || !selectTgl) return;

    const selectedBulanKey = selectBulan.value; // Contoh: "2026-09"
    selectTgl.innerHTML = '<option value="">Pilih Tanggal...</option>';

    if (!selectedBulanKey) return;

    const filteredDates = globalDataFdn.filter(item => item.bulanKey === selectedBulanKey);

    if (filteredDates.length === 0) {
        selectTgl.innerHTML = '<option value="">Tidak ada tanggal</option>';
        return;
    }

    filteredDates.forEach(item => {
        let opt = document.createElement('option');
        opt.value = item.raw; // item.raw ini berisi "20260926" (dateId)
        opt.textContent = item.formatted; // Tampilan "26-09-2026"
        selectTgl.appendChild(opt);
    });

    // Otomatis pilih tanggal pertama dan trigger perubahannya
    if (filteredDates.length > 0) {
        selectTgl.value = filteredDates[0].raw;
        if (typeof window.onTanggalMuatChange === 'function') {
            window.onTanggalMuatChange(selectTgl.value);
        }
    }
};

// Event Listener
document.addEventListener('DOMContentLoaded', () => {
    const selectBulan = document.getElementById('select-periode-bulan');
    if (selectBulan) {
        selectBulan.addEventListener('change', window.filterTanggalByBulan);
    }
    const selectTgl = document.getElementById('input-tgl-muat');
    if (selectTgl) {
        selectTgl.addEventListener('change', function() {
            window.onTanggalMuatChange(this.value);
        });
    }
});

// Inisialisasi Otomatis saat Modul Mutasi Dibuka
window.initMutasi = async function() {
    try {
        if (typeof window.loadDataBulanDanTanggal === 'function') {
            await window.loadDataBulanDanTanggal();
        }

        console.log("Modul Mutasi berhasil diinisialisasi menggunakan meta.tanggal.");
        
        if (typeof window.refreshWmsData === 'function') {
            refreshWmsData();
        }
    } catch (error) {
        console.error("Gagal menginisialisasi Modul Mutasi:", error);
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

        // Tambahkan event onclick pada baris tabel untuk mengisi form di kiri secara otomatis
        html += `
            <tr class="border-b hover:bg-orange-50 cursor-pointer transition text-xs" onclick="pilihRakWms('${lok}', ${stok})">
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

    // Jika ada file yang berhasil diimpor, muat ulang data dropdown dan arahkan ke tanggal terbaru
    if (latestImportedDateId) {
        // 1. Muat ulang data bulan dan tanggal agar tanggal baru dari FDN masuk ke opsi dropdown
        if (typeof window.loadDataBulanDanTanggal === 'function') {
            await window.loadDataBulanDanTanggal();
        }

        // 2. Sesuaikan ID elemen select tanggal yang benar: 'input-tgl-muat'
        const selectTgl = document.getElementById('input-tgl-muat');
        if (selectTgl) {
            selectTgl.value = latestImportedDateId; // Nilainya format YYYYMMDD (contoh: 20261008)
        }

        // 3. Panggil fungsi onTanggalMuatChange agar preview FDN dan data rak ikut ter-render otomatis
        if (typeof window.onTanggalMuatChange === 'function') {
            await window.onTanggalMuatChange(latestImportedDateId);
        } else {
            // Fallback jika onTanggalMuatChange belum terpanggil
            await renderDaftarFdnToPreview(latestImportedDateId);
        }
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
    
    // 6. PERBAIKAN: Ambil elemen dropdown tanggal yang benar ('input-tgl-muat')
    const selectTgl = document.getElementById('input-tgl-muat');
    const selectBulan = document.getElementById('select-periode-bulan');

    // Format docIdTanggal (YYYYMMDD) menjadi format tampilan atau sesuaikan dengan nilai option
    // Jika list global/bulan belum memuat tanggal ini, muat ulang daftar bulan & tanggal terlebih dahulu
    if (typeof window.loadDataBulanDanTanggal === 'function') {
        await window.loadDataBulanDanTanggal();
    }

    // Set dropdown tanggal ke tanggal FDN yang baru di-import (docIdTanggal)
    if (selectTgl) {
        selectTgl.value = docIdTanggal;
        // Picu event change atau jalankan fungsi muat data tanggal tersebut secara langsung
        if (typeof window.onTanggalMuatChange === 'function') {
            await window.onTanggalMuatChange(docIdTanggal);
        }
    }

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

            // Tentukan styling baris: WH-3 diberi warna oranye, WH-2 tetap standar
            const rowClass = item.dari_gudang === 'WH-3'
                ? 'bg-orange-50 hover:bg-orange-100/60 border-b border-orange-100 text-orange-900 font-medium'
                : 'border-b border-slate-100 hover:bg-slate-50 text-slate-700';

            const gudangColClass = item.dari_gudang === 'WH-3'
                ? 'p-2 text-center font-bold text-orange-600'
                : 'p-2 text-center font-bold text-slate-700';

            rowsHtml += `
                <tr class="${rowClass}">
                    <td class="p-2 text-center font-medium text-slate-500">${index + 1}</td>
                    <td class="p-2 font-mono font-bold text-orange-600 uppercase">${item.kode}</td>
                    <td class="p-2 font-mono">${jumlahStr}</td>
                    <td class="p-2 font-mono font-semibold">${shortDoc}</td>
                    <td class="${gudangColClass}">${item.dari_gudang}</td>
                </tr>
            `;
        });

        itemListContainer.innerHTML = rowsHtml;

    // Hitung total keseluruhan qty_utama dari semua item yang tergabung
        let totalMuatKeseluruhan = 0;
        allItemsCombined.forEach(item => {
            totalMuatKeseluruhan += Number(item.qty_utama || 0);
        });

        // Tampilkan nilai Total Muat lengkap dengan satuan Karton di footer modal
        document.getElementById('modal-total-muat-val').innerText = `${totalMuatKeseluruhan} Karton`;

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


// 1. Fungsi untuk mengisi dropdown kode berdasarkan data FDN tanggal aktif (dengan Filter Sisa Kekurangan)
async function populateMutasiKodeDropdown(dateId) {
    const selectKode = document.getElementById('mutasi-kode');
    if (!selectKode) return;

    // Kosongkan opsi dropdown kecuali yang pertama
    selectKode.innerHTML = '<option value="">Pilih Kode...</option>';

    try {
        const tanggalRef = db.collection('muat_fdn').doc(dateId);
        
        // 1. Ambil data FDN (tujuan) untuk mengetahui total kebutuhan
        const tujuanSnapshot = await tanggalRef.collection('datatujuan').get();
        const itemMap = new Map(); // Menampung total kebutuhan berdasarkan kode

        tujuanSnapshot.forEach(doc => {
            const docData = doc.data();
            const items = docData.data || [];

            items.forEach(item => {
                const kode = item.kode.toUpperCase();
                const qtyUtama = Number(item.qty_utama || 0);
                const dariGudang = docData.meta?.dari_gudang || 'WH-2';

                if (itemMap.has(kode)) {
                    const existing = itemMap.get(kode);
                    existing.totalQty += qtyUtama;
                    if (dariGudang === 'WH-3') {
                        existing.isWh3 = true;
                    }
                } else {
                    itemMap.set(kode, {
                        kode: kode,
                        totalQty: qtyUtama,
                        isWh3: (dariGudang === 'WH-3')
                    });
                }
            });
        });

        // 2. Ambil data yang sudah di-input ke koleksi 'ambilrak' untuk menghitung yang sudah diambil
        const ambilRakSnapshot = await tanggalRef.collection('ambilrak').get();
        const rekapAmbil = {};

        ambilRakSnapshot.forEach(doc => {
            const data = doc.data();
            const kode = (data.kode || '').toUpperCase();
            const ambil = Number(data.qtyAmbil || 0);
            rekapAmbil[kode] = (rekapAmbil[kode] || 0) + ambil;
        });

        // 3. Filter dan hitung sisa kekurangan untuk setiap item
        let aggregatedItems = [];
        itemMap.forEach((value, kode) => {
            const totalKebutuhan = value.totalQty;
            const sudahDiambil = rekapAmbil[kode] || 0;
            const kekurangan = totalKebutuhan - sudahDiambil;

            // Jika masih ada kekurangan (belum terpenuhi), masukkan ke daftar dropdown
            if (kekurangan > 0) {
                aggregatedItems.push({
                    kode: kode,
                    totalQty: totalKebutuhan,
                    sudahDiambil: sudahDiambil,
                    kekurangan: kekurangan,
                    isWh3: value.isWh3
                });
            }
        });

        // Pengurutan: Prioritaskan WH-3 terlebih dahulu, kemudian urutkan abjad kode barang
        aggregatedItems.sort((a, b) => {
            if (a.isWh3 && !b.isWh3) return -1;
            if (!a.isWh3 && b.isWh3) return 1;
            return a.kode.localeCompare(b.kode);
        });

        // 4. Masukkan ke dalam elemen <select> dropdown
        aggregatedItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item.kode;
            
            const labelGudang = item.isWh3 ? ' [WH-3]' : '';
            
            // Format label: Jika sudah ada yang diambil sebagian, tampilkan info kekurangan
            if (item.sudahDiambil > 0) {
                option.textContent = `${item.kode} - (${item.totalQty} Krt)${labelGudang} - (Kurang ${item.kekurangan} krt)`;
                option.className = "text-orange-600 font-bold";
            } else {
                option.textContent = `${item.kode} - (${item.totalQty} Krt)${labelGudang}`;
                option.className = "text-slate-800 font-bold";
            }

            // Simpan data penting ke dataset agar bisa dibaca validator qty ambil
            option.dataset.totalQty = item.totalQty;
            option.dataset.sudahDiambil = item.sudahDiambil;
            option.dataset.kekurangan = item.kekurangan;
            option.dataset.isWh3 = item.isWh3;
            
            selectKode.appendChild(option);
        });

        // 5. Otomatis pilih item teratas yang belum terpenuhi
        if (selectKode.options.length > 1) {
            selectKode.selectedIndex = 1; 
            const changeEvent = new Event('change', { bubbles: true });
            selectKode.dispatchEvent(changeEvent);
        } else {
            // Jika semua sudah terpenuhi / habis
            selectKode.value = "";
        }

        console.log("Dropdown kode mutasi diperbarui berdasarkan sisa kekurangan qty.");

    } catch (error) {
        console.error("Gagal memuat data untuk dropdown mutasi:", error);
    }
}

// 2. Event listener ketika pilihan dropdown Kode berubah
document.getElementById('mutasi-kode').addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const selectedKode = this.value;
    const inputWmsBarang = document.getElementById('filter-kode-barang');

    if (!selectedKode) {
        if (inputWmsBarang) {
            inputWmsBarang.value = "";
            if (typeof filterWmsReportData === 'function') {
                filterWmsReportData();
            }
        }
        hitungSisaBelumDiinput();
        return;
    }

    // Otomatis isi kolom pencarian di WMS Report dan jalankan filternya
    if (inputWmsBarang) {
        inputWmsBarang.value = selectedKode;
        if (typeof filterWmsReportData === 'function') {
            filterWmsReportData();
        }
    }

    // Panggil fungsi hitung sisa (otomatis menampilkan full total kebutuhan FDN karena tabel bawah masih kosong)
    hitungSisaBelumDiinput();
});

// Fungsi untuk menangani klik pada baris tabel WMS Report
function pilihRakWms(lokasi, stok) {
    const inputLokasi = document.getElementById('mutasi-lokasi');
    const inputStok = document.getElementById('mutasi-stok-gudang');
    const inputQtyAmbil = document.getElementById('mutasi-qty');
    const selectKodeBarangRak = document.getElementById('mutasi-kode');

    const lokasiBaru = (lokasi || '').trim().toUpperCase();
    const kodeBarangAktif = selectKodeBarangRak && selectKodeBarangRak.selectedOptions.length > 0 
        ? selectKodeBarangRak.selectedOptions[0].value.trim().toUpperCase() 
        : '';

    // 1. Cek duplikasi terlebih dahulu sebelum memasukkan nilai (Kecuali WH-3)
    if (lokasiBaru && lokasiBaru !== 'WH-3' && kodeBarangAktif) {
        const barisListRak = document.querySelectorAll('#container-list-mutasi tr');
        let sudahAda = false;

        barisListRak.forEach(row => {
            const cols = row.querySelectorAll('td');
            if (cols.length >= 3) {
                const textKode = (cols[1]?.textContent || '').trim().toUpperCase();
                const textLokasi = (cols[2]?.textContent || '').trim().toUpperCase();

                if (textKode === kodeBarangAktif && textLokasi === lokasiBaru) {
                    sudahAda = true;
                }
            }
        });

        // Jika sudah ada, tampilkan miuiAlert dan batalkan pengisian otomatis
        if (sudahAda) {
            const pesanPeringatan = `Rak [${lokasiBaru}] untuk barang [${kodeBarangAktif}] sudah pernah diinput! Silakan pilih rak lainnya.`;
            if (typeof miuiAlert === 'function') {
                miuiAlert(pesanPeringatan);
            } else {
                alert(pesanPeringatan);
            }
            return; // Berhenti di sini, form tidak terisi data duplikat
        }
    }

    // 2. Jika aman (belum ada / WH-3), isi input Rak / Lokasi di form sebelah kiri
    if (inputLokasi) {
        inputLokasi.value = lokasiBaru;
    }

    // 3. Isi input QTY Stok di form sebelah kiri
    if (inputStok) {
        inputStok.value = stok;
    }

    // 4. Otomatis arahkan fokus kursor ke input QTY Ambil agar operator bisa langsung mengetik
    if (inputQtyAmbil) {
        inputQtyAmbil.focus();
        inputQtyAmbil.select(); // Opsional: langsung pilih teks di dalam qty ambil
    }

    console.log("Rak dipilih:", lokasiBaru, "Stok:", stok);
}

// Fungsi untuk mengisi otomatis kolom Rak / Lokasi dengan teks "WH-3" dan memfokuskan ke QTY Stok
function isiRakWh3() {
    const inputLokasi = document.getElementById('mutasi-lokasi');
    if (inputLokasi) {
        inputLokasi.value = 'WH-3';
        
        // Berikan fokus ke QTY Stok terlebih dahulu untuk pengisian manual
        const inputStok = document.getElementById('mutasi-stok-gudang');
        if (inputStok) {
            inputStok.removeAttribute('readonly'); // Pastikan bisa diisi jika diperlukan untuk item manual WH-3
            inputStok.focus();
            inputStok.select();
        }
    }
}


async function prosesAmbilRakOtomatis() {
    //console.log("Debug: Tombol Ambil Rak Otomatis (Mode Inkremental/Sinkronisasi) diklik!");

    const tanggalMuat = document.getElementById('input-tgl-muat')?.value;
    if (!tanggalMuat) {
        if (typeof miuiAlert === 'function') miuiAlert("Tanggal aktif belum dipilih!");
        else alert("Tanggal aktif belum dipilih!");
        return;
    }

    const firestoreDateId = tanggalMuat.replace(/-/g, '');
    const tanggalRef = db.collection('muat_fdn').doc(firestoreDateId);

    try {
        const selectKode = document.getElementById('mutasi-kode');
        if (!selectKode || selectKode.options.length <= 1) {
            if (typeof miuiAlert === 'function') miuiAlert("Tidak ada data FDN / kode barang yang tersedia untuk diproses!");
            else alert("Tidak ada data FDN / kode barang yang tersedia untuk diproses!");
            return;
        }

        // 1. Ambil data yang sudah terlanjur diabsen/diambil sebelumnya di Firestore (tabel kiri)
        // Agar kita tahu item apa saja dan berapa qty yang sudah terambil
        const existingAmbilSnapshot = await tanggalRef.collection('ambilrak').get();
        const terambilMap = {}; // Format: { "KODE_BARANG": totalQtySudahDiambil }
        
        existingAmbilSnapshot.forEach(doc => {
            const data = doc.data();
            const kd = String(data.kode || '').trim().toUpperCase();
            const qty = Number(data.qtyAmbil || 0);
            if (kd) {
                terambilMap[kd] = (terambilMap[kd] || 0) + qty;
            }
        });

        // 2. Ambil seluruh data WMS terbaru dari Firebase RTDB
        let rawData = [];
        try {
            if (typeof firebase !== 'undefined' && firebase.database) {
                const snapshot = await firebase.database().ref('stok_cache/data').once('value');
                const val = snapshot.val();
                if (val) {
                    rawData = Array.isArray(val) ? val : Object.values(val);
                }
            }
        } catch (err) {
            console.warn("Gagal ambil langsung dari RTDB, mencoba variabel global...", err);
        }

        if (rawData.length === 0) {
            let sourceData = typeof globalWmsData !== 'undefined' ? globalWmsData : 
                             (typeof wmsDataCache !== 'undefined' ? wmsDataCache : 
                             (typeof stokCache !== 'undefined' ? stokCache : null));
            if (sourceData) {
                rawData = Array.isArray(sourceData) ? sourceData : Object.values(sourceData);
            }
        }

        if (!rawData || rawData.length === 0) {
            if (typeof miuiAlert === 'function') miuiAlert("Data WMS di Firebase / memori kosong!");
            else alert("Data WMS di Firebase / memori kosong!");
            return;
        }

        if (confirm("Jalankan sinkronisasi FDN otomatis? (Hanya memproses FDN baru atau kekurangan qty yang belum terambil)")) {
            
            // Loop untuk SEMUA opsi di dropdown
            for (let i = 0; i < selectKode.options.length; i++) {
                const opt = selectKode.options[i];
                const fullOptText = (opt.value || opt.text || '').trim().toUpperCase();
                
                if (!fullOptText || fullOptText.includes('PILIH') || fullOptText === '') continue;
                
                const kodeBarang = fullOptText.split(' - ')[0].split('(')[0].trim();
                
                // Total kebutuhan total berdasarkan FDN saat ini
                let totalKebutuhanFdn = Number(opt.dataset.kekurangan || opt.getAttribute('data-kekurangan') || opt.dataset.qty || 0);
                if (totalKebutuhanFdn <= 0) {
                    const matchKrt = fullOptText.match(/\(([^)]+)\)/);
                    if (matchKrt) {
                        const angkaKrt = parseInt(matchKrt[1].replace(/[^0-9]/g, ''));
                        if (!isNaN(angkaKrt)) totalKebutuhanFdn = angkaKrt;
                    }
                }
                if (totalKebutuhanFdn <= 0) totalKebutuhanFdn = 1;

                // HITUNG DELTA: Berapa sisa kekurangan yang BELUM diambil sebelumnya?
                const sudahDiambil = terambilMap[kodeBarang] || 0;
                let sisaKebutuhanItem = totalKebutuhanFdn - sudahDiambil;

                // Jika sisa kebutuhan <= 0, artinya FDN item ini sudah terpenuhi sebelumnya, lewati!
                if (sisaKebutuhanItem <= 0) {
                    console.log(`Debug [Item ${i}]: ${kodeBarang} sudah terpenuhi (Butuh: ${totalKebutuhanFdn}, Sudah Ambil: ${sudahDiambil}), dilewati.`);
                    continue;
                }

                console.log(`Debug [Item ${i}]: ${kodeBarang} ada penambahan/kurang (Butuh: ${totalKebutuhanFdn}, Sudah: ${sudahDiambil}, Sisa yg harus dicari: ${sisaKebutuhanItem})`);

                const isWh3Item = opt.dataset.isWh3 === 'true' || opt.getAttribute('data-is-wh3') === 'true';

                if (isWh3Item) {
                    const docIdKodeQty = `${kodeBarang}_${sisaKebutuhanItem}_${Date.now()}_${i}_wh3`;
                    await tanggalRef.collection('ambilrak').doc(docIdKodeQty).set({
                        kode: kodeBarang,
                        lokasi: 'WH-3',
                        qtyStok: sisaKebutuhanItem,
                        qtyAmbil: sisaKebutuhanItem,
                        qtySisa: 0,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    continue; 
                }

                // Pencarian WMS untuk menutupi sisa kekurangan
                let stokWmsList = rawData.filter(item => {
                    if (!item) return false;
                    const kodeItem = String(item.KODE || item.kode || item.KODE_BARANG || '').trim().toUpperCase();
                    return kodeItem === kodeBarang || kodeItem.includes(kodeBarang) || kodeBarang.includes(kodeItem);
                });

                if (stokWmsList.length === 0) continue;

                let normalizedStok = stokWmsList.map(item => {
                    return {
                        kode: kodeBarang,
                        lokasi: String(item.LOKASI_PALET || item.lokasi || item.LOKASI || '').trim(),
                        stok: Number(item.QTY_STOK || item.stok || item.QTY || 0),
                        expdate: String(item.EXPDATE || item.expdate || item.TANGGAL_EXP || '2099-12-31').trim()
                    };
                }).filter(item => item.stok > 0 && item.lokasi);

                // Alokasi WH-3 jika ada di stok fisik
                const indexWh3 = normalizedStok.findIndex(item => item.lokasi.toUpperCase().includes('WH-3') || item.lokasi.toUpperCase() === 'WH3');
                if (indexWh3 !== -1) {
                    const dataWh3 = normalizedStok[indexWh3];
                    const qtyStokGudang = dataWh3.stok;
                    const qtyAmbil = Math.min(sisaKebutuhanItem, qtyStokGudang);
                    const qtySisa = qtyStokGudang - qtyAmbil;

                    const docIdKodeQty = `${kodeBarang}_${qtyAmbil}_${Date.now()}_${i}_wh3`;
                    await tanggalRef.collection('ambilrak').doc(docIdKodeQty).set({
                        kode: kodeBarang,
                        lokasi: dataWh3.lokasi,
                        qtyStok: qtyStokGudang,
                        qtyAmbil: qtyAmbil,
                        qtySisa: qtySisa,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    sisaKebutuhanItem -= qtyAmbil;
                    if (qtySisa <= 0) {
                        normalizedStok.splice(indexWh3, 1);
                    } else {
                        normalizedStok[indexWh3].stok = qtySisa;
                    }
                }

                // Alokasi ke rak WMS regular untuk menutupi sisa delta kebutuhan
                if (sisaKebutuhanItem > 0 && normalizedStok.length > 0) {
                    let sisaRakWms = normalizedStok.filter(item => {
                        const locUp = item.lokasi.toUpperCase();
                        return !locUp.includes('WH-3') && locUp !== 'WH3';
                    });

                    sisaRakWms.sort((a, b) => {
                        if (a.stok !== b.stok) return a.stok - b.stok;
                        const dateA = new Date(a.expdate);
                        const dateB = new Date(b.expdate);
                        return dateA - dateB;
                    });

                    for (const wms of sisaRakWms) {
                        if (sisaKebutuhanItem <= 0) break;

                        const qtyStokGudang = wms.stok;
                        if (qtyStokGudang <= 0) continue;

                        const qtyAmbil = Math.min(sisaKebutuhanItem, qtyStokGudang);
                        const qtySisa = qtyStokGudang - qtyAmbil;
                        
                        const docIdKodeQty = `${kodeBarang}_${qtyAmbil}_${Date.now()}_${i}_${Math.floor(Math.random()*10000)}`;

                        await tanggalRef.collection('ambilrak').doc(docIdKodeQty).set({
                            kode: kodeBarang,
                            lokasi: wms.lokasi,
                            qtyStok: qtyStokGudang,
                            qtyAmbil: qtyAmbil,
                            qtySisa: qtySisa,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp()
                        });

                        sisaKebutuhanItem -= qtyAmbil;
                    }
                }
            }

            if (typeof miuiAlert === 'function') {
                miuiAlert("Simpan Data Berhasil!");
            } else {
                alert("Simpan Data Berhasil!");
            }

            if (typeof loadDataAmbilRak === 'function') loadDataAmbilRak(firestoreDateId);
            if (typeof updateSummaryMutasi === 'function') updateSummaryMutasi();
            if (typeof populateMutasiKodeDropdown === 'function') await populateMutasiKodeDropdown(firestoreDateId);
        }

    } catch (error) {
        console.error("Gagal menjalankan sinkronisasi FDN otomatis:", error);
        if (typeof miuiAlert === 'function') miuiAlert("Terjadi kesalahan saat sinkronisasi FDN.");
    }
}

// Pengaman real-time pada input QTY Ambil (Batas: Stok Gudang & Sisa Kekurangan Dropdown)
const inputQtyAmbil = document.getElementById('mutasi-qty');
const inputStokGudang = document.getElementById('mutasi-stok-gudang');
const selectKodeBarang = document.getElementById('mutasi-kode');

if (inputQtyAmbil && inputStokGudang) {
    inputQtyAmbil.addEventListener('input', function() {
        const qtyAmbil = Number(this.value);
        const qtyStok = Number(inputStokGudang.value || 0);
        
        // Ambil sisa kekurangan dari dataset option dropdown yang sedang dipilih
        let qtyKekurangan = qtyStok; // Default jika belum pilih
        if (selectKodeBarang && selectKodeBarang.selectedOptions.length > 0) {
            const selectedOpt = selectKodeBarang.selectedOptions[0];
            const kekuranganAttr = selectedOpt.dataset.kekurangan;
            if (kekuranganAttr !== undefined) {
                qtyKekurangan = Number(kekuranganAttr);
            }
        }
        
        // Tentukan batas maksimal yang paling ketat (antara Stok Gudang atau Sisa Kekurangan)
        let batasMaksimal = Math.min(qtyStok, qtyKekurangan);
        let pesanPeringatan = `QTY Ambil tidak boleh melebihi batas (Stok: ${qtyStok}, Kekurangan: ${qtyKekurangan})!`;

        // Cek jika QTY Ambil melampaui batas maksimal
        if (qtyAmbil > batasMaksimal) {
            if (typeof miuiAlert === 'function') {
                miuiAlert(pesanPeringatan);
            } else {
                alert(pesanPeringatan);
            }
            this.value = batasMaksimal; // Kembalikan ke nilai batas aman
        }
    });
}

// Pengaman real-time pada input Lokasi Rak (Cek duplikasi rak per kode barang, kecuali WH-3)
const inputLokasiRak = document.getElementById('mutasi-lokasi');
const selectKodeBarangRak = document.getElementById('mutasi-kode');

if (inputLokasiRak) {
    // Fungsi pengecekan saat input kehilangan fokus (blur) atau ditekan Enter
    function validasiRakDuplikat() {
        const lokasiDipilih = inputLokasiRak.value.trim().toUpperCase();
        
        // Jika kosong atau WH-3, lewati pengaman (WH-3 boleh dipakai berkali-kali)
        if (!lokasiDipilih || lokasiDipilih === 'WH-3') return true;

        // Ambil kode barang yang sedang dipilih
        let kodeBarangAktif = '';
        if (selectKodeBarangRak && selectKodeBarangRak.selectedOptions.length > 0) {
            kodeBarangAktif = selectKodeBarangRak.selectedOptions[0].value.trim().toUpperCase();
        }

        if (!kodeBarangAktif) {
            if (typeof miuiAlert === 'function') {
                miuiAlert("Silakan pilih Kode Barang terlebih dahulu!");
            } else {
                alert("Silakan pilih Kode Barang terlebih dahulu!");
            }
            inputLokasiRak.value = '';
            return false;
        }

        // Cek secara instan dari tabel list rak yang sudah diinput di sebelah kiri (container-list-mutasi)
        const barisListRak = document.querySelectorAll('#container-list-mutasi tr');
        let sudahAda = false;

        barisListRak.forEach(row => {
            const cols = row.querySelectorAll('td');
            // Pastikan baris tersebut valid (bukan baris "Belum ada rak ditambahkan")
            if (cols.length >= 3) {
                const textKode = (cols[1]?.textContent || '').trim().toUpperCase();
                const textLokasi = (cols[2]?.textContent || '').trim().toUpperCase();

                if (textKode === kodeBarangAktif && textLokasi === lokasiDipilih) {
                    sudahAda = true;
                }
            }
        });

        if (sudahAda) {
            const pesanPeringatan = `Rak [${lokasiDipilih}] untuk barang [${kodeBarangAktif}] sudah pernah diinput! Silakan pilih rak lainnya.`;
            if (typeof miuiAlert === 'function') {
                miuiAlert(pesanPeringatan);
            } else {
                alert(pesanPeringatan);
            }
            inputLokasiRak.value = ''; // Kosongkan kembali
            inputLokasiRak.focus();
            return false;
        }

        return true;
    }

    // Jalankan validasi saat input selesai diketik (blur)
    inputLokasiRak.addEventListener('blur', function() {
        this.value = this.value.trim().toUpperCase();
        validasiRakDuplikat();
    });

    // Jalankan juga saat tombol Enter ditekan pada kolom lokasi rak
    inputLokasiRak.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.value = this.value.trim().toUpperCase();
            
            // Jika lolos validasi duplikat, pindah fokus ke input QTY Stok
            if (validasiRakDuplikat()) {
                const inputStokGudang = document.getElementById('mutasi-stok-gudang');
                if (inputStokGudang) {
                    inputStokGudang.focus();
                    inputStokGudang.select();
                }
            }
        }
    });
}

// Fungsi untuk menghitung QTY Belum Diinput berdasarkan Total Muat (tot-keseluruhan) dikurangi total QTY Ambil di tabel
function hitungSisaBelumDiinput() {
    const inputTotKeseluruhan = document.getElementById('tot-keseluruhan');
    const inputSummaryKurang = document.getElementById('summary-kurang');
    
    if (!inputTotKeseluruhan || !inputSummaryKurang) return;

    // 1. Ambil nilai Total Muat dari input id="tot-keseluruhan"
    const totalMuat = Number(inputTotKeseluruhan.value || 0);

    // 2. Hitung total keseluruhan QTY Ambil dari semua baris di tabel bawah
    let totalSudahDiambil = 0;
    const rows = document.querySelectorAll('#container-list-mutasi tr');
    rows.forEach(row => {
        // Kolom QTY Ambil berada di indeks ke-3 (sesuaikan dengan struktur baris tabel Anda)
        const tdAmbil = row.cells[3]; 
        if (tdAmbil) {
            totalSudahDiambil += Number(tdAmbil.textContent || 0);
        }
    });

    // 3. Hitung sisa: Total Muat - Total Keseluruhan QTY Ambil
    const sisaBelumDiinput = totalMuat - totalSudahDiambil;

    // 4. Tampilkan ke input QTY Belum Diinput
    inputSummaryKurang.value = sisaBelumDiinput;
}

// fungsi tombol enter
document.addEventListener("DOMContentLoaded", function() {
    const inputLokasi = document.getElementById('mutasi-lokasi');
    const inputStok = document.getElementById('mutasi-stok-gudang');
    const inputAmbil = document.getElementById('mutasi-qty');
    const selectKode = document.getElementById('mutasi-kode');

    // 1. Dari Dropdown Kode Barang (jika ditekan Enter, pindah ke Lokasi)
    if (selectKode) {
        selectKode.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (inputLokasi) {
                    inputLokasi.focus();
                    inputLokasi.select();
                }
            }
        });
        selectKode.addEventListener('change', function() {
            if (inputLokasi) {
                inputLokasi.focus();
                inputLokasi.select();
            }
        });
    }

    // 2. Dari Rak / Lokasi (Enter -> Pindah ke QTY Stok & otomatis huruf kapital)
    if (inputLokasi) {
        inputLokasi.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.value = this.value.trim().toUpperCase(); // Otomatis kapital
                if (inputStok) {
                    inputStok.focus();
                    inputStok.select();
                }
            }
        });
    }

    // 3. Dari QTY Stok (Enter -> Pindah ke QTY Ambil)
    if (inputStok) {
        inputStok.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (inputAmbil) {
                    inputAmbil.focus();
                    inputAmbil.select();
                }
            }
        });
    }

    // 4. Dari QTY Ambil (Enter -> Jalankan Tambah Rak)
    if (inputAmbil) {
        inputAmbil.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (typeof tambahItemMutasiList === 'function') {
                    tambahItemMutasiList();
                }
            }
        });
    }
});


// Fungsi untuk menyimpan data Ambil Rak ke Firestore dengan tambahan field qtySisa
async function tambahItemMutasiList() {
    // 1. Ambil nilai dari form input di sebelah kiri
    const tanggalMuat = document.getElementById('input-tgl-muat')?.value; // Format: YYYY-MM-DD
    const selectKode = document.getElementById('mutasi-kode');
    const kodeBarang = selectKode ? selectKode.value : '';
    const lokasiRak = document.getElementById('mutasi-lokasi')?.value.trim().toUpperCase();
    const qtyStok = Number(document.getElementById('mutasi-stok-gudang')?.value || 0);
    const qtyAmbil = Number(document.getElementById('mutasi-qty')?.value || 0);

    // Validasi input
    if (!tanggalMuat) {
        miuiAlert("Pilih tanggal muat terlebih dahulu!");
        return;
    }
    if (!kodeBarang) {
        miuiAlert("Pilih kode barang terlebih dahulu!");
        return;
    }
    if (!lokasiRak) {
        miuiAlert("Masukkan lokasi rak atau pilih dari WMS Report!");
        return;
    }
    if (qtyAmbil <= 0) {
        miuiAlert("Masukkan QTY Ambil dengan benar!");
        return;
    }

    // Hitung sisa stok (stok gudang dikurangi qty yang diambil)
    const qtySisa = qtyStok - qtyAmbil;

    // Konversi format tanggal ke ID dokumen tanggal (contoh: 20261002)
    const firestoreDateId = tanggalMuat.replace(/-/g, '');

    // Buat ID dokumen berformat kode_qty yang unik (contoh: CRR4A01_5)
    const docIdKodeQty = `${kodeBarang}_${qtyAmbil}_${Date.now()}`;

    // Data payload lengkap yang akan disimpan ke Firestore
    const dataPayload = {
        kode: kodeBarang,
        lokasi: lokasiRak,
        qtyStok: qtyStok,
        qtyAmbil: qtyAmbil,
        qtySisa: qtySisa, // Field baru untuk sisa stok
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        // 2. Simpan ke Firestore: muat_fdn -> tanggal -> ambilrak -> dokumen_id (kode_qty)
        await db.collection('muat_fdn')
                .doc(firestoreDateId)
                .collection('ambilrak')
                .doc(docIdKodeQty)
                .set(dataPayload);

        console.log("Berhasil menyimpan data ambilrak ke Firestore!");

        // 3. Reset form input kecil agar siap untuk input berikutnya
        document.getElementById('mutasi-lokasi').value = '';
        document.getElementById('mutasi-stok-gudang').value = '';
        document.getElementById('mutasi-qty').value = '';
        document.getElementById('mutasi-lokasi').focus();

        // 4. Perbarui dropdown secara otomatis agar sisa kuantitas/kode yang habis langsung ter-refresh
        if (typeof populateMutasiKodeDropdown === 'function') {
            await populateMutasiKodeDropdown(firestoreDateId);
        }

    } catch (error) {
        console.error("Gagal menyimpan data ke Firestore: ", error);
        miuiAlert("Terjadi kesalahan saat menyimpan data ke database.");
    }
}

// Fungsi untuk memuat dan merender data ambilrak dari Firestore ke tabel (Digrup & Urutan Kronologis)
function loadDataAmbilRak() {
    const tanggalMuat = document.getElementById('input-tgl-muat')?.value;
    if (!tanggalMuat) return;

    const firestoreDateId = tanggalMuat.replace(/-/g, '');
    const tbody = document.getElementById('container-list-mutasi');
    const badgeTotalAmbil = document.getElementById('total-ambil-badge');
    const inputSummaryKurang = document.getElementById('summary-kurang'); // Opsional pengingat
    
    if (!tbody) return;

    // Ubah urutan ke 'asc' agar data pertama input berada di nomor 1 dan berurutan ke bawah
    db.collection('muat_fdn')
      .doc(firestoreDateId)
      .collection('ambilrak')
      .orderBy('timestamp', 'asc')
      .onSnapshot((snapshot) => {
          tbody.innerHTML = '';

          if (snapshot.empty) {
              tbody.innerHTML = `
                  <tr>
                      <td colspan="6" class="p-4 text-center text-slate-400 italic">Belum ada rak ditambahkan</td>
                  </tr>
              `;
              if (badgeTotalAmbil) badgeTotalAmbil.textContent = '0';
              return;
          }

          let akumulasiTotalAmbil = 0;
          let rawDataArray = [];

          // Tampung semua data terlebih dahulu
          snapshot.forEach((doc) => {
              const data = doc.data();
              rawDataArray.push({
                  id: doc.id,
                  kode: data.kode || '-',
                  rak: data.lokasi || '-',
                  ambil: Number(data.qtyAmbil || 0),
                  stok: data.qtyStok || 0,
                  sisa: data.qtySisa !== undefined ? data.qtySisa : (Number(data.qtyStok || 0) - Number(data.qtyAmbil || 0)),
                  rawDocData: data
              });
          });

          // Kelompokkan data berdasarkan kode barang yang sama
          const groupedData = {};
          rawDataArray.forEach((item) => {
              akumulasiTotalAmbil += item.ambil; // Akumulasi total
              if (!groupedData[item.kode]) {
                  groupedData[item.kode] = [];
              }
              groupedData[item.kode].push(item);
          });

          let nomorUrut = 1;

          // Render data yang sudah dikelompokkan ke dalam tabel
          Object.keys(groupedData).forEach((kode) => {
              const itemsInGroup = groupedData[kode];

              itemsInGroup.forEach((item, subIndex) => {
                  const tr = document.createElement('tr');
                  tr.className = "border-b hover:bg-orange-50 cursor-pointer transition text-slate-700";
                  tr.title = "Klik untuk Edit atau Hapus";
                  tr.onclick = function() {
                      bukaModalEditHapus(firestoreDateId, item.id, item.rawDocData);
                  };

                  if (subIndex === 0) {
                      // Baris pertama dalam grup: Tampilkan nomor urut dan kode barang dengan rowspan
                      tr.innerHTML = `
                          <td class="p-1.5 border border-orange-200 text-center font-semibold text-slate-500 w-10 align-top" rowspan="${itemsInGroup.length}">${nomorUrut}</td>
                          <td class="p-1.5 border border-orange-200 font-bold text-slate-800 truncate align-top" rowspan="${itemsInGroup.length}">${item.kode}</td>
                          <td class="p-1.5 border border-orange-200 font-semibold text-orange-700 w-24 truncate">${item.rak}</td>
                          <td class="p-1.5 border border-orange-200 text-center font-black text-orange-600 w-14">${item.ambil}</td>
                          <td class="p-1.5 border border-orange-200 text-center text-slate-600 w-14">${item.stok}</td>
                          <td class="p-1.5 border border-orange-200 text-center text-slate-600 w-14">${item.sisa}</td>
                      `;
                      nomorUrut++;
                  } else {
                      // Baris lanjutan dalam grup: Kolom No dan Kode dikosongkan agar tergabung rapi
                      tr.innerHTML = `
                          <td class="p-1.5 border border-orange-200 font-semibold text-orange-700 w-24 truncate">${item.rak}</td>
                          <td class="p-1.5 border border-orange-200 text-center font-black text-orange-600 w-14">${item.ambil}</td>
                          <td class="p-1.5 border border-orange-200 text-center text-slate-600 w-14">${item.stok}</td>
                          <td class="p-1.5 border border-orange-200 text-center text-slate-600 w-14">${item.sisa}</td>
                      `;
                  }
                  tbody.appendChild(tr);
              });
          });

          // Tampilkan total akumulasi ambil ke badge/footer
          if (badgeTotalAmbil) {
              badgeTotalAmbil.textContent = akumulasiTotalAmbil;
          }

          // Perbarui summary kurang jika ada
          const totalMuat = Number(document.getElementById('tot-keseluruhan')?.value || 0);
          if (inputSummaryKurang) {
              inputSummaryKurang.value = totalMuat - akumulasiTotalAmbil;
          }

          // <--- OTOMATIS SCROLL KE BAWAH (FOKUS KE DATA TERBARU) --->
          const containerTabel = tbody.closest('.overflow-y-auto') || tbody.parentElement;
          if (containerTabel) {
              containerTabel.scrollTop = containerTabel.scrollHeight;
          }

      }, (error) => {
          console.error("Gagal memuat data ambilrak: ", error);
      });
}

// Fungsi untuk membuka modal dan mengisi form dengan data yang diklik
async function bukaModalEditHapus(dateId, docId, data) {
    document.getElementById('edit-date-id').value = dateId;
    document.getElementById('edit-doc-id').value = docId;
    document.getElementById('edit-kode').value = data.kode || '';
    document.getElementById('edit-lokasi').value = data.lokasi || '';
    document.getElementById('edit-qty-stok').value = data.qtyStok || 0;
    document.getElementById('edit-qty-ambil').value = data.qtyAmbil || 0;
    document.getElementById('edit-qty-sisa').value = data.qtySisa !== undefined ? data.qtySisa : ((data.qtyStok || 0) - (data.qtyAmbil || 0));

    // Ambil informasi sisa kekurangan terbaru berdasarkan FDN untuk validasi di modal
    try {
        const tanggalRef = db.collection('muat_fdn').doc(dateId);
        const tujuanSnapshot = await tanggalRef.collection('datatujuan').get();
        let totalKebutuhan = 0;

        tujuanSnapshot.forEach(doc => {
            const docData = doc.data();
            const items = docData.data || [];
            items.forEach(item => {
                if ((item.kode || '').toUpperCase() === (data.kode || '').toUpperCase()) {
                    totalKebutuhan += Number(item.qty_utama || 0);
                }
            });
        });

        // Ambil data ambilrak lain selain dokumen ini untuk menghitung total yang sudah diambil
        const ambilRakSnapshot = await tanggalRef.collection('ambilrak').get();
        let sudahDiambilLainnya = 0;
        ambilRakSnapshot.forEach(doc => {
            if (doc.id !== docId) {
                const d = doc.data();
                if ((d.kode || '').toUpperCase() === (data.kode || '').toUpperCase()) {
                    sudahDiambilLainnya += Number(d.qtyAmbil || 0);
                }
            }
        });

        const sisaKekuranganMaks = totalKebutuhan - sudahDiambilLainnya;
        // Simpan batas maksimal kekurangan ke dataset elemen modal edit qty ambil untuk pengaman
        const inputEditAmbil = document.getElementById('edit-qty-ambil');
        if (inputEditAmbil) {
            inputEditAmbil.dataset.maxKekurangan = sisaKekuranganMaks > 0 ? sisaKekuranganMaks : 0;
        }
    } catch (e) {
        console.error("Gagal menghitung batas kekurangan di modal:", e);
    }

    // Tampilkan modal
    const modal = document.getElementById('modal-edit-rak');
    if (modal) modal.classList.remove('hidden');
}

// Fungsi untuk menutup modal
function tutupModalEditRak() {
    const modal = document.getElementById('modal-edit-rak');
    if (modal) modal.classList.add('hidden');
}

// Fungsi hitung otomatis nilai sisa di dalam modal saat input stok/ambil diubah + Pengaman Batas
function hitungOtomatisSisaEdit() {
    const inputAmbil = document.getElementById('edit-qty-ambil');
    const inputStok = document.getElementById('edit-qty-stok');
    
    const stok = Number(inputStok.value || 0);
    let ambil = Number(inputAmbil.value || 0);
    
    // Ambil batas maksimal kekurangan dari dataset
    const maxKekurangan = inputAmbil.dataset.maxKekurangan !== undefined ? Number(inputAmbil.dataset.maxKekurangan) : stok;
    
    // Tentukan batas paling ketat antara stok gudang dan sisa kekurangan FDN
    const batasMaksimum = Math.min(stok, maxKekurangan);

    if (ambil > batasMaksimum) {
        if (typeof miuiAlert === 'function') {
            miuiAlert(`QTY Ambil tidak boleh melebihi batas (Stok: ${stok}, Maks. Kekurangan: ${maxKekurangan})!`);
        } else {
            alert(`QTY Ambil melebihi batas yang diizinkan!`);
        }
        ambil = batasMaksimum;
        inputAmbil.value = ambil;
    }

    const sisa = stok - ambil;
    document.getElementById('edit-qty-sisa').value = sisa;
}

// Fungsi untuk menyimpan perubahan data ke Firestore dan Sinkronisasi Ulang
async function simpanPerubahanItem() {
    const dateId = document.getElementById('edit-date-id').value;
    const docId = document.getElementById('edit-doc-id').value;
    const lokasiBaru = document.getElementById('edit-lokasi').value.trim();
    const qtyStokBaru = Number(document.getElementById('edit-qty-stok').value || 0);
    const qtyAmbilBaru = Number(document.getElementById('edit-qty-ambil').value || 0);
    const qtySisaBaru = Number(document.getElementById('edit-qty-sisa').value || 0);

    if (!lokasiBaru) {
        miuiAlert("Lokasi rak tidak boleh kosong!");
        return;
    }
    if (qtyAmbilBaru <= 0) {
        miuiAlert("QTY Ambil harus lebih besar dari 0!");
        return;
    }

    try {
        // Update data dokumen di Firestore
        await db.collection('muat_fdn')
                .doc(dateId)
                .collection('ambilrak')
                .doc(docId)
                .update({
                    lokasi: lokasiBaru,
                    qtyStok: qtyStokBaru,
                    qtyAmbil: qtyAmbilBaru,
                    qtySisa: qtySisaBaru
                });

        console.log("Data berhasil diperbarui!");
        tutupModalEditRak();

        // Sinkronisasi otomatis dropdown kode di layar utama setelah perubahan
        if (typeof populateMutasiKodeDropdown === 'function') {
            await populateMutasiKodeDropdown(dateId);
        }
    } catch (error) {
        console.error("Gagal memperbarui data: ", error);
        miuiAlert("Terjadi kesalahan saat memperbarui data ke database.");
    }
}

// Fungsi untuk menghapus item dari modal dan Sinkronisasi Ulang
async function hapusItemDariModal() {
    if (confirm("Apakah Anda yakin ingin menghapus item rak ini dari daftar?")) {
        const dateId = document.getElementById('edit-date-id').value;
        const docId = document.getElementById('edit-doc-id').value;

        try {
            await db.collection('muat_fdn')
                    .doc(dateId)
                    .collection('ambilrak')
                    .doc(docId)
                    .delete();

            console.log("Item berhasil dihapus!");
            tutupModalEditRak();

            // Sinkronisasi otomatis dropdown kode di layar utama setelah penghapusan
            if (typeof populateMutasiKodeDropdown === 'function') {
                await populateMutasiKodeDropdown(dateId);
            }
        } catch (error) {
            console.error("Gagal menghapus item: ", error);
            miuiAlert("Terjadi kesalahan saat menghapus data.");
        }
    }
}

// Daftarkan fungsi ke window agar bisa diakses global
window.filterWmsReportData = filterWmsReportData;
window.tambahItemMutasiList = tambahItemMutasiList;


// 1. Fungsi untuk membuka Modal Popup MIUI v5 saat tombol Cetak / Arsip diklik
window.bukaModalCetakArsip = function() {
    const tglMuat = document.getElementById('input-tgl-muat')?.value;
    if (!tglMuat) {
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert("Pilih tanggal muat terlebih dahulu!");
        } else {
            alert("Pilih tanggal muat terlebih dahulu!");
        }
        return;
    }

    let modalEl = document.getElementById('miui-modal-cetak-arsip');
    if (!modalEl) {
        const modalHtml = `
        <div id="miui-modal-cetak-arsip" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; justify-content: center; align-items: center; font-family: 'Century Gothic', Arial, sans-serif;">
            <div style="background: #ffffff; width: 320px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; animation: miuiScaleUp 0.2s ease-in-out;">
                <!-- Header MIUI v5 -->
                <div style="background-color: #ff9800; color: #1e293b; padding: 12px 16px; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">
                    🖨️ Pengaturan Cetak Arsip Mutasi
                </div>
                <!-- Body Content -->
                <div style="padding: 16px;">
                    <label for="input-jumlah-copy-v2" style="display: block; font-size: 11px; font-weight: bold; color: #334155; margin-bottom: 6px; text-transform: uppercase;">
                        Masukkan Jumlah Salinan Cetak Rak:
                    </label>
                    <input type="number" id="input-jumlah-copy-v2" value="2" min="2" max="5" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; color: #060606; font-weight: bold; box-sizing: border-box; outline: none; text-align: center;" />
                    <div style="font-size: 10px; color: #64748b; margin-top: 6px;">
                        Sistem akan mencetak 1x Rekap Mutasi (Versi 1) dan Detail Rak (Versi 2) sesuai jumlah copy yang diatur.
                    </div>
                </div>
                <!-- Footer Buttons -->
                <div style="background-color: #f8fafc; padding: 10px 16px; display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid #e2e8f0;">
                    <button type="button" onclick="tutupModalCetakArsip()" style="background-color: #e2e8f0; color: #334155; border: none; padding: 6px 12px; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer; text-transform: uppercase;">
                        Batal
                    </button>
                    <button type="button" onclick="eksekusiCetakArsipDariModal()" style="background-color: #ff9800; color: #1e293b; border: none; padding: 6px 14px; border-radius: 4px; font-size: 10px; font-weight: 900; cursor: pointer; text-transform: uppercase; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                        Cetak Sekarang
                    </button>
                </div>
            </div>
        </div>
        <style>
            @keyframes miuiScaleUp {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
        </style>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('miui-modal-cetak-arsip');
    }

    modalEl.style.display = 'flex';
    document.getElementById('input-jumlah-copy-v2').value = '2';    
    document.getElementById('input-jumlah-copy-v2').focus();
};

window.tutupModalCetakArsip = function() {
    const modalEl = document.getElementById('miui-modal-cetak-arsip');
    if (modalEl) {
        modalEl.style.display = 'none';
    }
};

window.eksekusiCetakArsipDariModal = function() {
    const jmlInput = document.getElementById('input-jumlah-copy-v2');
    let jumlahCopy = parseInt(jmlInput?.value || 1);
    if (isNaN(jumlahCopy) || jumlahCopy < 1) {
        jumlahCopy = 1;
    }

    tutupModalCetakArsip();
    
    // Panggil fungsi utama cetakArsipMutasi dengan membawa parameter jumlah copy Versi 2
    window.cetakArsipMutasi(jumlahCopy);
};


// 2. Fungsi Utama Cetak Arsip Mutasi dengan Loop Versi 2
window.cetakArsipMutasi = async function(jumlahCopyV2 = 1) {
    const tglMuat = document.getElementById('input-tgl-muat')?.value;
    
    if (!tglMuat) {
        if (typeof window.miuiAlert === 'function') window.miuiAlert("Pilih tanggal muat terlebih dahulu!");
        else alert("Pilih tanggal muat terlebih dahulu!");
        return;
    }

    const totalStep = 1 + jumlahCopyV2;
    let currentStep = 0;

    if (typeof window.showCetakProgress === 'function') {
        window.showCetakProgress(`Menyiapkan Dokumen Cetak (0/${totalStep})...`);
    } else {
        console.warn("Fungsi showCetakProgress belum terdaftar di window!");
    }

    try {
        // Cetak Versi 1 (Rekap Mutasi)
        currentStep++;
        if (window.showCetakProgress) {
            window.showCetakProgress(`Mengirim Dokumen Versi 1 - Rekap Mutasi (${currentStep}/${totalStep})...`);
        }
        await cetakLaporanVersi1(tglMuat);
        await new Promise(resolve => setTimeout(resolve, 600));

        // Cetak Versi 2 - Berulang sebanyak jumlah copy yang diinputkan
        for (let i = 1; i <= jumlahCopyV2; i++) {
            currentStep++;
            if (window.showCetakProgress) {
                window.showCetakProgress(`Mengirim Dokumen Detail Rak - Copy ${i} dari ${jumlahCopyV2} (${currentStep}/${totalStep})...`);
            }
            await cetakLaporanVersi2(tglMuat);
            await new Promise(resolve => setTimeout(resolve, 600));
        }

        // Sembunyikan modal progress setelah selesai
        if (typeof window.hideCetakProgress === 'function') {
            window.hideCetakProgress();
        }

        const pesanSukses = `Berhasil mengirim 1 Rekap Mutasi & ${jumlahCopyV2} Detail Rak ke antrean cetak!`;
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert(pesanSukses);
        } else {
            alert(pesanSukses);
        }

    } catch (error) {
        console.error("Gagal memproses cetak:", error);
        if (typeof window.hideCetakProgress === 'function') window.hideCetakProgress();
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert("Terjadi kesalahan saat mengirim dokumen cetak.");
        } else {
            alert("Terjadi kesalahan saat mengirim dokumen cetak.");
        }
    }
};

// Fungsi Cetak Versi 1: Akumulasi Item Barang & FDN (Lengkap & Bersih)
window.cetakLaporanVersi1 = async function(tglMuat) {
    if (!tglMuat) {
        tglMuat = document.getElementById('input-tgl-muat')?.value;
    }
    if (!tglMuat) {
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert("Pilih tanggal muat terlebih dahulu!");
        } else {
            alert("Pilih tanggal muat terlebih dahulu!");
        }
        return;
    }
    const firestoreDateId = tglMuat.replace(/-/g, '');

    try {
        // 1. Ambil data akumulasi barang dari 'ambilrak'
        const snapshotAmbil = await db.collection('muat_fdn').doc(firestoreDateId).collection('ambilrak').get();
        const dataMap = {};

        snapshotAmbil.forEach(doc => {
            const d = doc.data();
            const kode = String(d.kode || '').trim().toUpperCase();
            if (!kode) return;

            if (!dataMap[kode]) {
                dataMap[kode] = { total: 0, wh2: 0, wh3: 0 };
            }
            const qty = Number(d.qtyAmbil || 0);
            dataMap[kode].total += qty;
            
            const lok = String(d.lokasi || '').toUpperCase();
            if (lok.includes('WH-3') || lok === 'WH3') {
                dataMap[kode].wh3 += qty;
            } else {
                dataMap[kode].wh2 += qty;
            }
        });

        // 2. Ambil data FDN & Tujuan dari subkoleksi 'datatujuan' dan kelompokkan berdasarkan Tujuan
        const tujuanMap = {}; 
        
        try {
            const snapshotDatatujuan = await db.collection('muat_fdn').doc(firestoreDateId).collection('datatujuan').get();
            snapshotDatatujuan.forEach(doc => {
                const d = doc.data();
                const rawNoFdn = String(d.meta?.nomor_dokumen || d.nomor_dokumen || '').trim();
                let tujuan = String(d.meta?.tujuan || d.tujuan || '').trim().toUpperCase();

                // Ganti "STOCK POINT" menjadi "SP" secara konsisten
                tujuan = tujuan.replace(/STOCK POINT/g, 'SP');

                if (rawNoFdn && tujuan) {
                    if (!tujuanMap[tujuan]) {
                        tujuanMap[tujuan] = [];
                    }
                    if (!tujuanMap[tujuan].includes(rawNoFdn)) {
                        tujuanMap[tujuan].push(rawNoFdn);
                    }
                }
            });
        } catch (e) {
            console.log("Gagal mengambil data dari datatujuan:", e);
        }

        let listCombinedRows = [];
        const sortedKeys = Object.keys(dataMap).sort((a, b) => {
            const itemA = dataMap[a];
            const itemB = dataMap[b];
            const isWh3A = itemA.wh3 > 0 && itemA.wh2 === 0 ? 1 : 0;
            const isWh3B = itemB.wh3 > 0 && itemB.wh2 === 0 ? 1 : 0;
            if (isWh3A !== isWh3B) return isWh3B - isWh3A;
            return a.localeCompare(b);
        });

        let tujuanKeys = Object.keys(tujuanMap);
        let maxRows = Math.max(sortedKeys.length, tujuanKeys.length);

        for (let i = 0; i < maxRows; i++) {
            const kode = sortedKeys[i] || '';
            const tujuan = tujuanKeys[i] || '';
            let formattedFdn = '';

            if (tujuan && tujuanMap[tujuan]) {
                const fdnList = tujuanMap[tujuan];
                formattedFdn = fdnList.map((rawFdn, idx) => {
                    if (idx === 0) {
                        return rawFdn.length >= 5 ? rawFdn.slice(-5) : rawFdn;
                    } else {
                        return rawFdn.length >= 3 ? rawFdn.slice(-3) : rawFdn;
                    }
                }).join('/');
            }

            listCombinedRows.push({
                kode: kode,
                item: kode ? dataMap[kode] : null,
                noFdn: formattedFdn,
                tujuan: tujuan
            });
        }

        let totalSeluruh = 0, totalWh2 = 0, totalWh3 = 0;
        let rowsUtamaHtml = '';

        listCombinedRows.forEach(row => {
            const item = row.item;
            if (item) {
                totalSeluruh += item.total;
                totalWh2 += item.wh2;
                totalWh3 += item.wh3;
            }

            rowsUtamaHtml += `
                <tr>
                    <td class="text-left font-bold" style="text-align: left; padding-left: 5px; width: 75px; font-weight: bold;">${row.kode}</td>
                    <td>${item ? item.total : ''}</td>
                    <td></td>
                    <td>${item && item.wh2 > 0 ? item.wh2 : ''}</td>
                    <td>${item && item.wh3 > 0 ? item.wh3 : ''}</td>
                    <td class="text-left" style="text-align: left;">${row.noFdn}</td>
                    <td class="text-left" style="text-align: left;">${row.tujuan}</td>
                </tr>
            `;
        });

        // Baris Total Qty di bawah tabel
        rowsUtamaHtml += `
            <tr class="font-bold" style="background-color: #f9f9f9; font-weight: bold;">
                <td class="text-left" style="text-align: left; padding-left: 5px;">TOTAL QTY</td>
                <td>${totalSeluruh}</td>
                <td></td>
                <td>${totalWh2}</td>
                <td>${totalWh3}</td>
                <td></td>
                <td></td>
            </tr>
        `;

        // Format Sub-Header Waktu Lengkap (Contoh: Kamis, 08 Oktober 2026 - 11.48.25)
        const now = new Date();
        const daftarHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const hari = daftarHari[now.getDay()];
        
        const tgl = String(now.getDate()).padStart(2, '0');
        const blnIndex = now.getMonth();
        const thn = now.getFullYear();
        
        const namaBulan = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        const bulan = namaBulan[blnIndex];

        const jam = String(now.getHours()).padStart(2, '0');
        const menit = String(now.getMinutes()).padStart(2, '0');
        const detik = String(now.getSeconds()).padStart(2, '0');
        
        const formatWaktuLengkap = `${hari}, ${tgl} ${bulan} ${thn} - ${jam}.${menit}.${detik}`;

        const finalHtml = `
        <html>
        <head>
            <style>
                @font-face {
                    font-family: 'Edo';
                    src: local('Edo'), url('EDO.ttf') format('truetype');
                }
                @font-face {
                    font-family: 'Century Gothic';
                    src: local('Century Gothic'), url('CenturyGothic.ttf') format('truetype');
                }

                @page { size: 215mm 330mm portrait; margin: 20mm 1mm 1mm 1mm; }
                body { 
                    font-family: 'Century Gothic', Arial, sans-serif; 
                    font-size: 10pt; 
                    margin: 0; 
                    padding: 0; 
                    color: #000; 
                }
                .header-title { 
                    font-family: 'Edo', Arial, sans-serif; 
                    font-weight: normal; 
                    font-size: 13pt; 
                    text-align: center; 
                    margin-bottom: 2px; 
                    letter-spacing: 1px;
                }
                .sub-header { 
                    font-family: 'Century Gothic', Arial, sans-serif; 
                    margin-bottom: 8px; 
                    font-size: 10pt; 
                    text-align: left;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 10px; 
                    font-family: 'Century Gothic', Arial, sans-serif;
                    font-size: 10pt;
                    table-layout: fixed;
                }
                th, td { 
                    border: 1px solid #000; 
                    padding: 3px 5px; 
                    text-align: center; 
                    vertical-align: middle; 
                }
                th { 
                    background-color: #f2f2f2; 
                    font-size: 10pt; 
                }
                .text-left { text-align: left; }
                .font-bold { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header-title">MUTASI GUDANG WH-2</div>
            <div class="sub-header">${formatWaktuLengkap}</div>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 22%;">KODE</th>
                        <th style="width: 8%;">TOTAL</th>
                        <th style="width: 5%;">V</th>
                        <th style="width: 10%;">WH-2</th>
                        <th style="width: 10%;">WH-3</th>
                        <th style="width: 20%;">NO. FDN</th>
                        <th style="width: 25%;">TUJUAN</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsUtamaHtml}
                </tbody>
            </table>
        </body>
        </html>`;

        // 3. Kirim ke Print Server (Firebase Realtime Database)
        const judulTugas = "Cetak Dokumen v1";
        const safeKeyName = `Cetak_Dokumen_v1_${tgl}-${String(blnIndex + 1).padStart(2, '0')}-${thn}_${jam}-${menit}-${detik}`;

        await fetch(`https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/print_jobs/${safeKeyName}.json`, {
            method: 'PUT',
            body: JSON.stringify({ 
                judul: judulTugas,
                waktu_teks: formatWaktuLengkap,
                html: finalHtml, 
                status: 'PENDING',
                timestamp: Date.now() 
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (e) {
        console.error("Gagal mencetak laporan versi 1:", e);
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert("Gagal cetak v1: " + e.message);
        } else {
            alert("Gagal cetak v1: " + e.message);
        }
        throw e; // Lemparkan kembali error agar fungsi pemanggil (cetakArsipMutasi) tahu jika ada kendala
    }
};


// Fungsi Cetak Versi 2: Detail Ambil Rak & FDN (Dengan grouping kode barang di tengah)
window.cetakLaporanVersi2 = async function(tglMuat) {
    if (!tglMuat) {
        tglMuat = document.getElementById('input-tgl-muat')?.value;
    }
    if (!tglMuat) {
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert("Pilih tanggal muat terlebih dahulu!");
        } else {
            alert("Pilih tanggal muat terlebih dahulu!");
        }
        return;
    }
    const firestoreDateId = tglMuat.replace(/-/g, '');

    try {
        // 1. Ambil data dari subkoleksi 'ambilrak'
        const snapshotAmbil = await db.collection('muat_fdn').doc(firestoreDateId).collection('ambilrak').get();
        let listAmbil = [];
        snapshotAmbil.forEach(doc => {
            listAmbil.push(doc.data());
        });

        // Urutkan data: WH-3 terlebih dahulu di atas, lalu urut abjad kode barang
        listAmbil.sort((a, b) => {
            const lokA = String(a.lokasi || '').toUpperCase();
            const lokB = String(b.lokasi || '').toUpperCase();
            
            const isWh3A = lokA.includes('WH-3') || lokA === 'WH3' ? 1 : 0;
            const isWh3B = lokB.includes('WH-3') || lokB === 'WH3' ? 1 : 0;
            
            if (isWh3A !== isWh3B) {
                return isWh3B - isWh3A; // WH-3 di atas
            }
            return String(a.kode || '').localeCompare(String(b.kode || ''));
        });

        // 2. Ambil data FDN & Tujuan dari subkoleksi 'datatujuan' dan kelompokkan per Tujuan
        const tujuanMap = {}; 
        try {
            const snapshotDatatujuan = await db.collection('muat_fdn').doc(firestoreDateId).collection('datatujuan').get();
            snapshotDatatujuan.forEach(doc => {
                const d = doc.data();
                const rawNoFdn = String(d.meta?.nomor_dokumen || d.nomor_dokumen || '').trim();
                let tujuan = String(d.meta?.tujuan || d.tujuan || '').trim().toUpperCase();

                // Ganti "STOCK POINT" menjadi "SP" secara konsisten
                tujuan = tujuan.replace(/STOCK POINT/g, 'SP');

                if (rawNoFdn && tujuan) {
                    if (!tujuanMap[tujuan]) {
                        tujuanMap[tujuan] = [];
                    }
                    if (!tujuanMap[tujuan].includes(rawNoFdn)) {
                        tujuanMap[tujuan].push(rawNoFdn);
                    }
                }
            });
        } catch (e) {
            console.log("Gagal mengambil data dari datatujuan:", e);
        }

        let fdnRowsData = [];
        Object.keys(tujuanMap).forEach(tujuan => {
            const fdnList = tujuanMap[tujuan];
            const formattedFdn = fdnList.map((rawFdn, idx) => {
                if (idx === 0) {
                    return rawFdn.length >= 5 ? rawFdn.slice(-5) : rawFdn;
                } else {
                    return rawFdn.length >= 3 ? rawFdn.slice(-3) : rawFdn;
                }
            }).join('/');

            fdnRowsData.push({
                noFdn: formattedFdn,
                tujuan: tujuan
            });
        });

        // Grouping data ambil berdasarkan KODE untuk menentukan rowspan dan posisi tengah
        const groupedAmbil = [];
        let mapGroup = {};

        listAmbil.forEach(item => {
            const kode = String(item.kode || '').trim();
            if (!mapGroup[kode]) {
                mapGroup[kode] = {
                    kode: kode,
                    items: []
                };
                groupedAmbil.push(mapGroup[kode]);
            }
            mapGroup[kode].items.push(item);
        });

        let rowsBodyHtml = '';
        let noUrutItem = 1;
        let maxRows = Math.max(listAmbil.length, fdnRowsData.length);
        
        // Flatten kembali dengan struktur grup untuk merender sel di tengah
        let flattenedRows = [];
        groupedAmbil.forEach(group => {
            group.items.forEach((subItem, idx) => {
                flattenedRows.push({
                    ...subItem,
                    isFirstOfGroup: (idx === 0),
                    groupSpan: group.items.length,
                    groupIndex: noUrutItem,
                    isGrouped: true
                });
            });
            noUrutItem++;
        });

        // Jika fdnRowsData lebih panjang, padukan dengan baris kosong
        let finalMaxRows = Math.max(flattenedRows.length, fdnRowsData.length);

        for (let i = 0; i < finalMaxRows; i++) {
            const ambilRow = flattenedRows[i] || {};
            const itemFdn = fdnRowsData[i] || {};

            const formatVal = (val) => {
                if (val === undefined || val === null || val === '' || Number(val) === 0) {
                    return '-';
                }
                return val;
            };

            let kodeHtml = '';
            let noHtml = '';

            if (ambilRow.kode) {
                if (ambilRow.isFirstOfGroup) {
                    // Gunakan rowspan agar kolom NO dan KODE menyatu di tengah secara vertikal
                    noHtml = `<td rowspan="${ambilRow.groupSpan}" style="vertical-align: middle; text-align: center;">${ambilRow.groupIndex}</td>`;
                    kodeHtml = `<td rowspan="${ambilRow.groupSpan}" class="text-left font-bold" style="vertical-align: middle; text-align: left; padding-left: 5px; font-weight: bold;">${ambilRow.kode}</td>`;
                }
            } else {
                noHtml = `<td></td>`;
                kodeHtml = `<td></td>`;
            }

            rowsBodyHtml += `
                <tr>
                    ${noHtml}
                    ${kodeHtml}
                    <td>${ambilRow.lokasi || ''}</td>
                    <td>${formatVal(ambilRow.qtyAmbil)}</td>
                    <td>${formatVal(ambilRow.qtyStok)}</td>
                    <td>${formatVal(ambilRow.qtySisa)}</td>
                    <td>${itemFdn.noFdn ? (i + 1) : ''}</td>
                    <td class="text-left" style="text-align: left;">${itemFdn.noFdn || ''}</td>
                    <td class="text-left" style="text-align: left;">${itemFdn.tujuan || ''}</td>
                </tr>
            `;
        }

        // Format Sub-Header Waktu Lengkap
        const now = new Date();
        const daftarHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const hari = daftarHari[now.getDay()];
        
        const tgl = String(now.getDate()).padStart(2, '0');
        const blnIndex = now.getMonth();
        const thn = now.getFullYear();
        
        const namaBulan = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        const bulan = namaBulan[blnIndex];

        const jam = String(now.getHours()).padStart(2, '0');
        const menit = String(now.getMinutes()).padStart(2, '0');
        const detik = String(now.getSeconds()).padStart(2, '0');
        
        const formatWaktuLengkap = `${hari}, ${tgl} ${bulan} ${thn} - ${jam}.${menit}.${detik}`;

        const finalHtml = `
        <html>
        <head>
            <style>
                @font-face {
                    font-family: 'Edo';
                    src: local('Edo'), url('EDO.ttf') format('truetype');
                }
                @font-face {
                    font-family: 'Century Gothic';
                    src: local('Century Gothic'), url('CenturyGothic.ttf') format('truetype');
                }

                @page { size: 215mm 330mm portrait; margin: 20mm 1mm 1mm 1mm; }
                body { 
                    font-family: 'Century Gothic', Arial, sans-serif; 
                    font-size: 10pt; 
                    margin: 0; 
                    padding: 0; 
                    color: #000; 
                }
                .header-title { 
                    font-family: 'Edo', Arial, sans-serif; 
                    font-weight: normal; 
                    font-size: 13pt; 
                    text-align: center; 
                    margin-bottom: 2px; 
                    letter-spacing: 1px;
                }
                .sub-header { 
                    font-family: 'Century Gothic', Arial, sans-serif; 
                    margin-bottom: 8px; 
                    font-size: 10pt; 
                    text-align: left;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 10px; 
                    font-family: 'Century Gothic', Arial, sans-serif;
                    font-size: 10pt;
                    table-layout: fixed;
                }
                th, td { 
                    border: 1px solid #000; 
                    padding: 3px 5px; 
                    text-align: center; 
                    vertical-align: middle; 
                }
                th { 
                    background-color: #f2f2f2; 
                    font-size: 10pt; 
                }
                .text-left { text-align: left; }
                .font-bold { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header-title">MUTASI GUDANG WH-2</div>
            <div class="sub-header">${formatWaktuLengkap}</div>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 4%;">NO</th>
                        <th style="width: 23%;">KODE</th>
                        <th style="width: 9%;">RAK</th>
                        <th style="width: 7%;">AMBIL</th>
                        <th style="width: 7%;">STOK</th>
                        <th style="width: 7%;">SISA</th>
                        <th style="width: 4%;">NO</th>
                        <th style="width: 18%;">NO. FDN</th>
                        <th style="width: 21%;">TUJUAN KIRIM</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsBodyHtml}
                </tbody>
            </table>
        </body>
        </html>`;

        // 3. Kirim ke Print Server (Firebase Realtime Database)
        const judulTugas = "Cetak Dokumen v2 (Detail Rak)";
        const safeKeyName = `Cetak_Dokumen_v2_${tgl}-${String(blnIndex + 1).padStart(2, '0')}-${thn}_${jam}-${menit}-${detik}`;

        await fetch(`https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/print_jobs/${safeKeyName}.json`, {
            method: 'PUT',
            body: JSON.stringify({ 
                judul: judulTugas,
                waktu_teks: formatWaktuLengkap,
                html: finalHtml, 
                status: 'PENDING',
                timestamp: Date.now() 
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error("Gagal mencetak laporan versi 2:", error);
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert("Gagal cetak v2: " + error.message);
        } else {
            alert("Gagal cetak v2: " + error.message);
        }
        throw error;
    }
};

// Helper Format Tanggal & Waktu
function formatTanggalIndo(tglStr) {
    if (!tglStr) return '';
    const date = new Date(tglStr);
    return date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function getCurrentTime() {
    const now = new Date();
    return now.toTimeString().split(' ')[0].substring(0, 5);
}