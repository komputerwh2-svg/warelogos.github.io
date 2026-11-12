// ==========================================
// STOMO JS - MODUL STOK OPNAME MOBILE TERPADU
// ==========================================

// Array global untuk menyimpan data cache WMS Report di StOMo
let stomoWmsGlobalData = [];
let previousStomoWmsSnapshot = [];

// Inisialisasi Otomatis saat Modul StOMo Dibuka
window.initStomoModule = async function() {
    try {
        console.log("Menginisialisasi Modul StOMo & WMS Reader...");

        // Tarik data WMS Report terbaru untuk panel kanan
        if (typeof window.refreshWmsData === 'function') {
            await window.refreshWmsData();
        }
    } catch (error) {
        console.error("Gagal menginisialisasi Modul StOMo:", error);
    }
};

// ==========================================
// 1. WMS REPORT LIVE READER (DITIRU DARI MUTASI)
// ==========================================

// Fungsi untuk merender data WMS di panel kanan StOMo dengan dukungan filter pencarian real-time & Rak No
function filterWmsStomoData() {
    const tbody = document.getElementById('stomo-tabel-wms-body');
    if (!tbody) return;

    if (!stomoWmsGlobalData || stomoWmsGlobalData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 italic">Tidak ada data stok WMS.</td></tr>`;
        return;
    }

    // Ambil nilai dari input filter di panel kanan StOMo
    const keywordRak = document.getElementById('stomo-filter-kode-rak')?.value.trim().toUpperCase() || '';
    const keywordBarang = document.getElementById('stomo-filter-kode-barang')?.value.trim().toUpperCase() || '';
    const keywordRakNo = document.getElementById('stomo-filter-rak-no')?.value.trim() || '';

    // Salin data sebelum diurutkan agar data global tetap aman
    let sortedData = [...stomoWmsGlobalData];

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
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 italic">Data WMS tidak ditemukan sesuai filter.</td></tr>`;
        return;
    }

    let html = '';
    filteredData.slice(0, 100).forEach((item, index) => {
        const lok = item.LOKASI_PALET || item.KODE_LOKASI || item.kode_lokasi || '-';
        const kode = item.KODE || item.kode || '-';
        const stok = item.QTY_STOK ?? item.STOK ?? item.stok ?? 0;
        const exp = item.EXPDATE || item.expdate || '-';

        // Tambahkan event onclick pada baris tabel untuk cross-check instan ke pencarian laporan StOMo di kiri
        html += `
            <tr class="border-b hover:bg-orange-50 cursor-pointer transition text-[11px]" onclick="pilihBarangWmsStomo('${kode}')">
                <td class="p-1.5 border-r border-orange-200 text-center font-semibold text-slate-500">${index + 1}</td>
                <td class="p-1.5 border-r border-orange-200 font-semibold text-orange-700">${lok}</td>
                <td class="p-1.5 border-r border-orange-200 font-bold text-orange-600">${kode}</td>
                <td class="p-1.5 border-r border-orange-200 text-center text-slate-700 font-bold">${stok}</td>
                <td class="p-1.5 text-center text-slate-500">${exp}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Fungsi untuk menyegarkan data WMS Report khusus modul StOMo dari Firebase RTDB
async function refreshWmsData() {
    const updateLabel = document.getElementById('stomo-wms-last-update');
    const badge = document.getElementById('stomo-firebase-badge');
    const tbody = document.getElementById('stomo-tabel-wms-body');
    
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 italic">Memuat data WMS dari Firebase...</td></tr>`;
    }
    
    if (badge) {
        badge.className = "bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold";
        badge.innerText = "Memuat...";
    }

    try {
        const rtdbUrl = 'https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_cache.json?t=' + new Date().getTime();
        const response = await fetch(rtdbUrl);
        
        if (!response.ok) {
            throw new Error('Gagal terhubung ke Firebase RTDB.');
        }
        
        const jsonResponse = await response.json();
        
        if (!jsonResponse) {
            stomoWmsGlobalData = [];
        } else {
            const rawData = jsonResponse.data || jsonResponse;
            const serverSyncTime = jsonResponse.meta?.last_sync ? jsonResponse.meta.last_sync.substring(11, 19) : '-';
            const totalItemsServer = jsonResponse.meta?.total_items || (Array.isArray(rawData) ? rawData.length : Object.values(rawData).length);
            
            if (Array.isArray(rawData)) {
                stomoWmsGlobalData = rawData;
            } else {
                stomoWmsGlobalData = Object.values(rawData);
            }

            filterWmsStomoData();

            const now = new Date();
            const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateString = now.toLocaleDateString('id-ID');

            if (updateLabel) {
                updateLabel.className = "bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold";
                updateLabel.innerText = `Update Terakhir: ${dateString} ${timeString} (Waktu Server: ${serverSyncTime})`;
            }

            if (badge) {
                badge.className = "bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold";
                badge.innerText = `Total: ${stomoWmsGlobalData.length} Item`;
            }
        }
        
    } catch (error) {
        console.error('Error memuat WMS StOMo:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500 italic">Gagal terhubung ke server.</td></tr>`;
        }
        if (badge) {
            badge.className = "bg-red-100 text-red-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold";
            badge.innerText = "Error";
        }
    }
}

// Interaksi cepat: Saat baris WMS diklik, otomatis saring laporan StOMo di panel kiri
function pilihBarangWmsStomo(kodeBarang) {
    const inputCariStomo = document.getElementById('stomo-cari-barang');
    if (inputCariStomo) {
        inputCariStomo.value = kodeBarang;
        if (typeof filterTabelStomo === 'function') {
            filterTabelStomo();
        }
    }
}


// ==========================================
// FUNGSI TOGGLE POPOVER ARSIP STOMO
// ==========================================
window.togglePopoverArsipStomo = function(event) {
    if (event) event.stopPropagation();
    
    const popover = document.getElementById('popover-arsip-stomo');
    if (!popover) return;

    // Toggle visibilitas popover
    if (popover.classList.contains('hidden')) {
        popover.classList.remove('hidden');
        // Panggil fungsi pemuat daftar arsip saat popover dibuka
        muatDaftarArsipStomo();
    } else {
        popover.classList.add('hidden');
    }
};

// Tutup popover jika diklik di luar area
document.addEventListener('click', function(event) {
    const popover = document.getElementById('popover-arsip-stomo');
    const btnArsip = event.target.closest('button');
    
    if (popover && !popover.contains(event.target) && (!btnArsip || !btnArsip.innerText.includes('Arsip StOMo'))) {
        popover.classList.add('hidden');
    }
});

// ==========================================
// FUNGSI MEMUAT & MENAMPILKAN DAFTAR ARSIP DI POPOVER
// ==========================================
window.muatDaftarArsipStomo = async function() {
    const targetContainer = document.getElementById('container-list-arsip-stomo');
    if (!targetContainer) return;

    targetContainer.innerHTML = `
        <div class="text-slate-400 italic text-[11px] text-center py-6">
            <i class="fa-solid fa-spinner fa-spin mr-1"></i> Memuat riwayat arsip...
        </div>
    `;

    try {
        const snapshot = await firebase.database().ref('stok_opname').once('value');
        if (!snapshot.exists()) {
            targetContainer.innerHTML = `<div class="text-slate-400 italic text-[11px] text-center py-6">Node 'stok_opname' kosong di database.</div>`;
            return;
        }

        const allData = snapshot.val();
        let groupedByDate = {};
        let totalDitemukan = 0;

        Object.keys(allData).forEach(key => {
            let itemArsip = allData[key];
            if (!itemArsip) return;

            // 1. Wajib memiliki node 'hasil_so'
            let hasHasilSo = itemArsip.hasil_so && Object.keys(itemArsip.hasil_so).length > 0;
            if (!hasHasilSo) return;

            // 2. Filter khusus gudang: WH-2, WH-3, dan WH-3 BLOK
            let upperKey = key.toUpperCase();
            let isWH2 = upperKey.includes('WH-2') || upperKey.includes('WHNB-2');
            let isWH3Blok = upperKey.includes('WH-3_BLOK') || upperKey.includes('WH-3 BLOK');
            let isWH3Induk = (upperKey.includes('WH-3') && !upperKey.includes('BLOK'));

            if (!isWH2 && !isWH3Induk && !isWH3Blok) return;

            // 3. Ekstraksi dan Konversi Tanggal ke Format dd/mm/yyyy
            let parts = key.split('_');
            let rawTgl = '';
            if (parts.length >= 3) {
                let y = parts[parts.length-3];
                let m = parts[parts.length-2];
                let d = parts[parts.length-1];
                // Jika formatnya YYYY_MM_DD
                if (y.length === 4) {
                    rawTgl = `${d}/${m}/${y}`;
                } else {
                    rawTgl = parts.slice(-3).join('/');
                }
            } else {
                rawTgl = 'LAINNYA';
            }

            if (!groupedByDate[rawTgl]) {
                groupedByDate[rawTgl] = [];
            }

            groupedByDate[rawTgl].push({
                key: key,
                namaGudang: isWH2 ? 'WH-2' : (isWH3Blok ? 'WH-3 BLOK' : 'WH-3'),
                raw: itemArsip
            });

            totalDitemukan++;
        });

        if (totalDitemukan === 0) {
            targetContainer.innerHTML = `<div class="text-slate-400 italic text-[11px] text-center py-6">Tidak ada arsip hasil_so untuk WH-2, WH-3, atau WH-3 BLOK.</div>`;
            return;
        }

        // Render HTML
        let html = '<div class="space-y-3">';
        let sortedDates = Object.keys(groupedByDate).sort().reverse();

        sortedDates.forEach(tgl => {
            let listArsipTgl = groupedByDate[tgl];
            
            html += `
                <div class="border border-orange-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <!-- Header Tanggal format dd/mm/yyyy -->
                    <div class="bg-orange-50 px-3 py-2 border-b border-orange-100 flex justify-between items-center">
                        <span class="text-[11px] font-black text-orange-800 flex items-center gap-1.5">
                            <i class="fa-regular fa-calendar text-[10px] text-orange-500"></i> ${tgl}
                        </span>
                        <span class="bg-orange-500 text-white font-bold text-[9px] px-2 py-0.5 rounded-full shadow-xs">
                            ${listArsipTgl.length} Arsip
                        </span>
                    </div>
                    <div class="p-2 space-y-2 bg-white">
            `;

            listArsipTgl.forEach(arsip => {
                let jumlahItemSO = Object.keys(arsip.raw.hasil_so || {}).length;

                html += `
                    <div class="bg-white border border-slate-200 p-2.5 rounded-lg hover:border-orange-400 hover:shadow-sm transition-all flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block flex-shrink-0"></span>
                            <div class="font-black text-slate-800 text-xs">
                                ${arsip.namaGudang} <span class="text-orange-600 font-extrabold ml-1">[${jumlahItemSO} Item]</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5 flex-shrink-0">
                            <button onclick="bukaArsipStomo('${arsip.key}')" class="bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xs flex items-center gap-1 transition-transform active:scale-95">
                                <i class="fa-solid fa-folder-open"></i> BUKA
                            </button>
                            <button onclick="hapusArsipStomo('${arsip.key}')" class="bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg shadow-xs flex items-center gap-1 transition-transform active:scale-95" title="Hapus Arsip">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `;
            });

            html += `</div></div>`;
        });

        html += '</div>';
        targetContainer.innerHTML = html;

    } catch (error) {
        console.error("Gagal menarik arsip:", error);
        targetContainer.innerHTML = `<div class="text-rose-500 text-[11px] text-center py-6">Error: ${error.message}</div>`;
    }
};

// ==========================================
// FUNGSI MENGHAPUS ARSIP STOMO DARI RTDB
// ==========================================
window.hapusArsipStomo = async function(archiveKey) {
    if (!archiveKey) return;
    
    if (!confirm(`Apakah Anda yakin ingin menghapus arsip "${archiveKey}" secara permanen dari database?`)) {
        return;
    }

    try {
        // Hapus data dari Firebase Realtime Database
        await firebase.database().ref(`stok_opname/${archiveKey}`).remove();
        
        // Refresh daftar arsip di popover
        muatDaftarArsipStomo();
        
        // Jika arsip yang dihapus sedang aktif di tabel kiri, reset tabel
        if (window.currentStomoArchiveKey === archiveKey) {
            window.currentStomoArchiveKey = null;
            const containerLaporan = document.getElementById('container-tabel-laporan');
            if (containerLaporan) {
                containerLaporan.innerHTML = `<div class="p-8 text-center text-slate-400 italic text-xs">Arsip aktif telah dihapus. Silakan pilih arsip lain.</div>`;
            }
        }
    } catch (error) {
        console.error("Gagal menghapus arsip:", error);
        alert(`Gagal menghapus arsip: ${error.message}`);
    }
};

// ==========================================
// FUNGSI MEMBUKA & MERENDER LAPORAN ARSIP KE TABEL UTAMA
// (Dengan Sumber Master Data Khusus per Gudang)
// ==========================================
window.bukaArsipStomo = async function(archiveKey) {
    if (!archiveKey) return;
    window.currentStomoArchiveKey = archiveKey;

    // Tutup popover otomatis
    const popover = document.getElementById('popover-arsip-stomo');
    if (popover) popover.classList.add('hidden');

    const theadTable = document.getElementById('thead-stomo-laporan');
    const tbodyTable = document.getElementById('tbody-stomo-laporan');
    if (!tbodyTable) return;

    tbodyTable.innerHTML = `
        <tr>
            <td colspan="6" class="p-8 text-center text-slate-400 italic">
                <i class="fa-solid fa-spinner fa-spin mr-2"></i> Menarik data master & hasil opname dari Firebase RTDB...
            </td>
        </tr>
    `;

    try {
        // 1. Ambil data arsip utama (hasil_so)
        const snapArsip = await firebase.database().ref(`stok_opname/${archiveKey}`).once('value');
        if (!snapArsip.exists()) {
            tbodyTable.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-rose-500 italic">Data arsip tidak ditemukan di server.</td></tr>`;
            return;
        }

        const dataArsip = snapArsip.val();
        let hasilSoObj = dataArsip.hasil_so || {};
        let semuaSO = Object.values(hasilSoObj).filter(item => item && typeof item === 'object');

        let upperKey = archiveKey.toUpperCase();
        let isWH3Blok = upperKey.includes('WH-3_BLOK') || upperKey.includes('WH-3 BLOK');
        let isWH3Induk = (upperKey.includes('WH-3') && !upperKey.includes('BLOK'));

        // Ekstraksi tanggal dari key (misal: WH-3_2026_11_11 -> 2026_11_11)
        let partsKey = archiveKey.split('_');
        let tanggalSuffix = partsKey.slice(-3).join('_'); // Format YYYY_MM_DD

        // 2. AMBIL MASTER DATA BERDASARKAN ATURAN GUDANG
        let masterData = {};
        if (isWH3Blok) {
            // WH-3 BLOK ambil dari node 'stok_blok'
            const snapStokBlok = await firebase.database().ref('stok_blok').once('value');
            if (snapStokBlok.exists()) {
                masterData = snapStokBlok.val();
            }
        } else if (isWH3Induk) {
            // WH-3 ambil dari arsip stok_opname 'WHNB-2_<tanggal>'
            let keyWhnb2 = `WHNB-2_${tanggalSuffix}`;
            const snapWhnb2 = await firebase.database().ref(`stok_opname/${keyWhnb2}`).once('value');
            if (snapWhnb2.exists()) {
                let dataWhnb2 = snapWhnb2.val();
                masterData = dataWhnb2.master_data || dataWhnb2.hasil_so || {};
            } else {
                // Fallback jika key WHNB-2 spesifik tidak ada, cek di dalam arsip itu sendiri
                masterData = dataArsip.master_data || {};
            }
        } else {
            // Gudang lainnya (misal WH-2)
            masterData = dataArsip.master_data || {};
        }

        // 3. Petakan Master Barang & Stok Bosnet
        let masterMap = {};
        let masterArray = Array.isArray(masterData) ? masterData : Object.values(masterData);

        masterArray.forEach(m => {
            if (!m || typeof m !== 'object') return;
            let kode = String(m.KODE || m.Kode || m.KODE_BARANG || m.kode_barang || '').trim().toUpperCase();
            if (kode && kode !== 'KODE' && kode !== 'NAMA' && kode !== 'BLOK') {
                masterMap[kode] = m;
            }
        });

        // Jika masterData berupa objek bersarang (seperti struktur stok_blok)
        if (Object.keys(masterMap).length === 0 && typeof masterData === 'object') {
            Object.keys(masterData).forEach(subKey => {
                let isiSub = masterData[subKey];
                if (isiSub && typeof isiSub === 'object') {
                    Object.keys(isiSub).forEach(innerKey => {
                        let item = isiSub[innerKey];
                        let kode = String(innerKey || item.KODE || item.Kode || '').trim().toUpperCase();
                        if (kode && kode !== 'KODE' && kode !== 'NAMA' && kode !== 'BLOK') {
                            masterMap[kode] = item;
                        }
                    });
                }
            });
        }

        // 4. Ekstraksi Kolom Rak & Petugas Unik dari Hasil SO
        let kolomRakMap = {}; 
        let rekapSoData = {}; 

        semuaSO.forEach(so => {
            let kode = String(so.kode_barang || '').trim().toUpperCase();
            let rak = String(so.lokasi_rak || 'UMUM').trim().toUpperCase();
            let petugas = String(so.nama_petugas || so.user_id || 'UMUM').trim().toUpperCase();
            
            if (!kode) return;

            if (!kolomRakMap[rak]) kolomRakMap[rak] = new Set();
            if (petugas && petugas !== 'UMUM') kolomRakMap[rak].add(petugas);

            if (!rekapSoData[kode]) rekapSoData[kode] = {};
            if (!rekapSoData[kode][rak]) {
                rekapSoData[kode][rak] = { krt: 0, ball: 0, rtg: 0, pcs: 0 };
            }

            rekapSoData[kode][rak].krt += parseInt(so.qty_krt || 0, 10);
            rekapSoData[kode][rak].ball += parseInt(so.qty_ball || 0, 10);
            rekapSoData[kode][rak].rtg += parseInt(so.qty_rtg || 0, 10);
            rekapSoData[kode][rak].pcs += parseInt(so.qty_pcs || 0, 10);
        });

        let daftarRakUnik = Object.keys(kolomRakMap).sort();

        let semuaKodeBarang = new Set();
        Object.keys(masterMap).forEach(k => semuaKodeBarang.add(k));
        Object.keys(rekapSoData).forEach(k => semuaKodeBarang.add(k));
        let listKode = [...semuaKodeBarang].sort();

        const parseQty = (val) => {
            if (!val || typeof val !== 'string') return { krt: 0, ball: 0, rtg: 0, pcs: 0 };
            let p = val.split('/');
            return {
                krt: parseInt(p[0], 10) || 0,
                ball: parseInt(p[1], 10) || 0,
                rtg: parseInt(p[2], 10) || 0,
                pcs: parseInt(p[3], 10) || 0
            };
        };

        // 5. Render Header Tabel (Thead)
        let theadHtml = `
            <tr>
                <th class="p-2 border border-orange-300 text-center w-10 sticky left-0 bg-slate-200 z-30">NO</th>
                <th class="p-2 border border-orange-300 sticky left-10 bg-slate-200 z-30 min-w-[200px]">KODE & NAMA BARANG</th>
                <th class="p-2 border border-orange-300 text-center text-sky-700 min-w-[100px]">STOK BOSNET</th>
        `;

        daftarRakUnik.forEach(rak => {
            let petugasList = [...kolomRakMap[rak]].sort().join(' & ') || 'PETUGAS';
            theadHtml += `
                <th class="p-2 border border-orange-300 text-center bg-sky-50 text-sky-800 min-w-[130px]">
                    <div class="text-[9px] text-slate-500 font-bold">${petugasList}</div>
                    <div>[${rak}]</div>
                </th>
            `;
        });

        theadHtml += `
                <th class="p-2 border border-orange-300 text-center bg-orange-100 text-orange-800 min-w-[100px]">TOTAL FISIK</th>
                <th class="p-2 border border-orange-300 text-center min-w-[100px]">SELISIH</th>
                <th class="p-2 border border-orange-300 text-center min-w-[100px]">STATUS</th>
            </tr>
        `;
        if (theadTable) theadTable.innerHTML = theadHtml;

        // 6. Render Body Tabel & Statistik
        let tbodyHtml = '';
        let statTotal = listKode.length;
        let statSesuai = 0, statLebih = 0, statKurang = 0;

        listKode.forEach((kode, index) => {
            let no = index + 1;
            let mItem = masterMap[kode] || {};
            let namaBarang = mItem.NAMA || mItem.Nama || mItem.BARANG || mItem.nama || '-';
            
            // Ambil stok bosnet dari master data
            let kAkhirStr = mItem.K_AKHIR || mItem.k_akhir || '';
            if (!kAkhirStr) {
                let krt = mItem.krt || mItem.KRT || 0;
                let ball = mItem.ball || mItem.BALL || 0;
                let rtg = mItem.rtg || mItem.RTG || 0;
                let pcs = mItem.pcs || mItem.PCS || 0;
                kAkhirStr = `${krt}/${ball}/${rtg}/${pcs}`;
            }
            if (!kAkhirStr.includes('/')) kAkhirStr = `${kAkhirStr}/0/0/0`;
            let bosnetObj = parseQty(kAkhirStr);

            let totalFisikKrt = 0, totalFisikBall = 0, totalFisikRtg = 0, totalFisikPcs = 0;
            let adaInput = false;
            let rakCellsHtml = '';

            daftarRakUnik.forEach(rak => {
                let rData = rekapSoData[kode] && rekapSoData[kode][rak];
                if (rData) {
                    adaInput = true;
                    totalFisikKrt += rData.krt;
                    totalFisikBall += rData.ball;
                    totalFisikRtg += rData.rtg;
                    totalFisikPcs += rData.pcs;
                    let fisikStr = `${rData.krt}/${rData.ball}/${rData.rtg}/${rData.pcs}`;
                    rakCellsHtml += `<td class="p-2 border border-slate-200 text-center font-mono text-emerald-700 bg-sky-50/20">${fisikStr}</td>`;
                } else {
                    rakCellsHtml += `<td class="p-2 border border-slate-200 text-center text-slate-300 italic">-</td>`;
                }
            });

            let selisihKrt = totalFisikKrt - bosnetObj.krt;
            let selisihBall = totalFisikBall - bosnetObj.ball;
            let selisihRtg = totalFisikRtg - bosnetObj.rtg;
            let selisihPcs = totalFisikPcs - bosnetObj.pcs;

            let fisikStrFormat = `${totalFisikKrt}/${totalFisikBall}/${totalFisikRtg}/${totalFisikPcs}`;
            let selisihStrFormat = `${selisihKrt > 0 ? '+' + selisihKrt : selisihKrt}/${selisihBall > 0 ? '+' + selisihBall : selisihBall}/${selisihRtg > 0 ? '+' + selisihRtg : selisihRtg}/${selisihPcs > 0 ? '+' + selisihPcs : selisihPcs}`;

            let badgeStatus = '';
            if (!adaInput) {
                badgeStatus = `<span class="text-slate-400 italic text-[10px]">BELUM CEK</span>`;
            } else if (selisihKrt === 0 && selisihBall === 0 && selisihRtg === 0 && selisihPcs === 0) {
                statSesuai++;
                badgeStatus = `<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-300 text-[9px]"><i class="fa-solid fa-check mr-0.5"></i> SESUAI</span>`;
            } else if (selisihKrt > 0 || selisihBall > 0 || selisihRtg > 0 || selisihPcs > 0) {
                statLebih++;
                badgeStatus = `<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold border border-amber-300 text-[9px]">SELISIH LEBIH</span>`;
            } else {
                statKurang++;
                badgeStatus = `<span class="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold border border-rose-300 text-[9px]">SELISIH KURANG</span>`;
            }

            tbodyHtml += `
                <tr class="hover:bg-orange-50/50 transition-colors cursor-pointer">
                    <td class="p-2 border border-slate-200 text-center font-bold text-slate-500 sticky left-0 bg-white z-20">${no}</td>
                    <td class="p-2 border border-slate-200 sticky left-10 bg-white z-20">
                        <div class="font-black text-slate-900">${kode}</div>
                        <div class="text-[10px] text-slate-500 uppercase truncate max-w-xs">${namaBarang}</div>
                    </td>
                    <td class="p-2 border border-slate-200 text-center font-mono font-bold text-sky-700">${kAkhirStr}</td>
                    ${rakCellsHtml}
                    <td class="p-2 border border-slate-200 text-center font-mono font-bold text-orange-700 bg-orange-50/40">${adaInput ? fisikStrFormat : '-'}</td>
                    <td class="p-2 border border-slate-200 text-center font-mono font-bold text-purple-700 bg-purple-50/40">${adaInput ? selisihStrFormat : '-'}</td>
                    <td class="p-2 border border-slate-200 text-center">${badgeStatus}</td>
                </tr>
            `;
        });

        tbodyTable.innerHTML = tbodyHtml;

        // Update Footer Statistik
        document.getElementById('stomo-stat-total').innerText = statTotal;
        document.getElementById('stomo-stat-sesuai').innerText = statSesuai;
        document.getElementById('stomo-stat-lebih').innerText = statLebih;
        document.getElementById('stomo-stat-kurang').innerText = statKurang;

        // Format Judul
        let gudangLabel = isWH3Blok ? 'WH-3 BLOK' : (isWH3Induk ? 'WH-3' : partsKey[0]);
        let formatTgl = partsKey.slice(-3).join('-');
        if (partsKey.length >= 3) {
            let y = partsKey[partsKey.length - 3];
            let m = partsKey[partsKey.length - 2];
            let d = partsKey[partsKey.length - 1];
            if (y.length === 4) formatTgl = `${d}-${m}-${y}`;
        }

        const elJudul = document.getElementById('judul-laporan-gudang') || document.querySelector('.font-black.uppercase.text-slate-800');
        if (elJudul) {
            elJudul.innerHTML = `LAPORAN HASIL STOK OPNAME GUDANG : <span class="text-orange-600">${gudangLabel}</span> [ ${formatTgl} ]`;
        }

    } catch (err) {
        console.error("Gagal memuat laporan arsip:", err);
        tbodyTable.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-rose-500 italic">Gagal memuat data: ${err.message}</td></tr>`;
    }
};