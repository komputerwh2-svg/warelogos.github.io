// ==========================================
// MODUL CEKLIST RAK (RAK BECERAN & SEMUA RAK)
// ==========================================

window.currentRakMode = 'beceran'; // 'beceran' atau 'utuhan'
window.rakBeceranCacheData = {};
window.rakUtuhanCacheData = {};

window.initRak = function() {
    console.log("Modul Ceklist Rak Diinisialisasi");
    window.switchTabRak('beceran');
};

// Fungsi slider tab utama
window.switchTabRak = function(mode) {
    window.currentRakMode = mode;
    
    const btnBeceran = document.getElementById('tabBtnRakBeceran');
    const btnUtuhan = document.getElementById('tabBtnRakUtuhan');
    const panelBeceran = document.getElementById('panelRakBeceran');
    const panelUtuhan = document.getElementById('panelRakUtuhan');
    const labelImport = document.getElementById('labelBtnImportRak');
    const wrapperFilter = document.getElementById('wrapperFilterRakUtuhan');

    if (mode === 'beceran') {
        btnBeceran?.classList.remove('bg-zinc-800', 'text-zinc-400', 'border-transparent');
        btnBeceran?.classList.add('bg-orange-600', 'text-white', 'border-orange-500', 'shadow');
        
        btnUtuhan?.classList.remove('bg-orange-600', 'text-white', 'border-orange-500', 'shadow');
        btnUtuhan?.classList.add('bg-zinc-800', 'text-zinc-400', 'border-transparent');

        if (panelBeceran) panelBeceran.classList.remove('hidden');
        if (panelUtuhan) panelUtuhan.classList.add('hidden');

        if (labelImport) labelImport.innerText = "IMPORT BECERAN";
        if (wrapperFilter) wrapperFilter.classList.add('hidden');

        if (typeof window.renderPreviewRakBeceran === 'function') {
            window.renderPreviewRakBeceran();
        }
    } else {
        btnUtuhan?.classList.remove('bg-zinc-800', 'text-zinc-400', 'border-transparent');
        btnUtuhan?.classList.add('bg-orange-600', 'text-white', 'border-orange-500', 'shadow');
        
        btnBeceran?.classList.remove('bg-orange-600', 'text-white', 'border-orange-500', 'shadow');
        btnBeceran?.classList.add('bg-zinc-800', 'text-zinc-400', 'border-transparent');

        if (panelUtuhan) panelUtuhan.classList.remove('hidden');
        if (panelBeceran) panelBeceran.classList.add('hidden');

        if (labelImport) labelImport.innerText = "IMPORT UTUHAN";
        if (wrapperFilter) wrapperFilter.classList.remove('hidden');

        if (typeof window.renderPreviewRakUtuhan === 'function') {
            window.renderPreviewRakUtuhan();
        }
    }
};

// ==========================================
// 1. LOAD MASTER BARANG LOKAL
// ==========================================
window.loadMasterBarangRak = async function() {
    if (window.masterData && Object.keys(window.masterData).length > 0) return;

    try {
        const localMaster = typeof getMasterFromIDB_wh === 'function' ? await getMasterFromIDB_wh() : null;
        if (localMaster && Object.keys(localMaster).length > 0) {
            window.masterData = localMaster;
            return;
        }

        const res = await fetch("https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/master_barang.json");
        if (!res.ok) throw new Error("Gagal mengambil master dari server");
        
        const dataFromServer = await res.json();
        if (dataFromServer) {
            window.masterData = dataFromServer;
            if (typeof saveMasterToIDB_wh === 'function') {
                await saveMasterToIDB_wh(dataFromServer);
            }
        }
    } catch (err) {
        console.warn("Gagal memuat master barang:", err.message);
        window.masterData = {};
    }
};

// ==========================================
// HELPER: NORMALISASI TANGGAL EXCEL (MUTLAK FORMAT DD/MM/YYYY)
// ==========================================
function formatExcelDate(serial) {
    if (!serial) return '-';

    // 1. Jika berupa angka serial Excel (contoh: 46821 yang sebelumnya salah terbaca)
    if (typeof serial === 'number' || (!isNaN(serial) && !String(serial).includes('/'))) {
        const num = Number(serial);
        if (num < 1) return String(serial);
        const utc_days = Math.floor(num - 25569);
        const utc_value = utc_days * 86400 * 1000;
        const dateInfo = new Date(utc_value);
        if (isNaN(dateInfo.getTime())) return String(serial);

        // JavaScript getUTCDate() mengambil tanggal, getUTCMonth() mengambil bulan (0-11)
        const day = String(dateInfo.getUTCDate()).padStart(2, '0');
        const month = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
        const year = dateInfo.getUTCFullYear();
        return `${day}/${month}/${year}`;
    }

    // 2. Jika berupa string teks tanggal dari Excel
    let cleanStr = String(serial).trim();
    cleanStr = cleanStr.replace(/[\.-]/g, '/');
    
    const parts = cleanStr.split('/');
    if (parts.length !== 3) return cleanStr;

    let p1 = parts[0].trim(); // Bagian 1
    let p2 = parts[1].trim(); // Bagian 2
    let p3 = parts[2].trim(); // Tahun

    if (p3.length === 2) {
        p3 = '20' + p3;
    }

    // Karena format file Excel gudang menggunakan standar DD/MM/YYYY, 
    // kita kunci secara mutlak: p1 = Hari (DD), p2 = Bulan (MM), p3 = Tahun (YYYY)
    const finalDay = String(p1).padStart(2, '0');
    const finalMonth = String(p2).padStart(2, '0');
    const finalYear = p3;

    return `${finalDay}/${finalMonth}/${finalYear}`;
}

// ==========================================
// 2. HANDLER UTAMA & PROSES IMPORT FILE EXCEL
// ==========================================
window.handleMainImportRak = function() {
    const fileInput = document.getElementById('inputExcelRak');
    if (!fileInput) return;
    fileInput.setAttribute('multiple', 'multiple');
    fileInput.click();
};

window.handleFileImportRak = async function(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    await window.loadMasterBarangRak();
    let allParsedRows = [];
    let loadedCount = 0;

    for (let file of files) {
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            jsonRows.forEach(row => {
                const lokasi = String(row.KODE_LOKASI || row.LOKASI || row.KODE_LO || '').trim();
                const kodeBarang = String(row.KODE || row.KODE_BARANG || row.ITEM || '').trim().toUpperCase();
                const stokExcel = Number(row.STOK || row.QTY || row.JML || 0);

                if (!lokasi || !kodeBarang) return;

                const masterItem = window.masterData ? window.masterData[kodeBarang] : null;
                const qtyUtuhanMaster = masterItem ? Number(masterItem.QTY || 0) : stokExcel;

                if (window.currentRakMode === 'beceran') {
                    if (stokExcel !== qtyUtuhanMaster) {
                        allParsedRows.push({
                            KODE_LOKASI: lokasi,
                            KODE_BARANG: kodeBarang,
                            QTY: stokExcel,
                            EXPDATE: formatExcelDate(row.EXPDATE || row.TANGGAL_EXPIRED || row.EXP || '')
                        });
                    }
                } else {
                    allParsedRows.push({
                        KODE_LOKASI: lokasi,
                        KODE_BARANG: kodeBarang,
                        QTY: stokExcel,
                        EXPDATE: formatExcelDate(row.EXPDATE || row.TANGGAL_EXPIRED || row.EXP || '')
                    });
                }
            });
            loadedCount++;
        } catch (e) {
            console.error(`Gagal membaca file ${file.name}:`, e);
        }
    }

    const groupedResult = processGroupGrupRak(allParsedRows);

    if (window.currentRakMode === 'beceran') {
        window.rakBeceranCacheData = groupedResult;
        if (typeof window.renderPreviewRakBeceran === 'function') window.renderPreviewRakBeceran();
    } else {
        window.rakUtuhanCacheData = groupedResult;
        if (typeof window.renderPreviewRakUtuhan === 'function') window.renderPreviewRakUtuhan();
    }

    if (typeof miuiAlert === 'function') {
        miuiAlert(`Berhasil memproses ${loadedCount} file Excel untuk Rak ${window.currentRakMode.toUpperCase()}!`);
    }

    event.target.value = '';
};

// ==========================================
// 3. PENGELOMPOKKAN & PENGURUTAN (BECERAN VS UTUHAN)
// ==========================================
function processGroupGrupRak(rows) {
    let grouped = {};

    rows.forEach(item => {
        const lokasiStr = String(item.KODE_LOKASI || '').trim();
        const match = lokasiStr.match(/^(\d+)\s+([ABCD])\s+(.+)$/i);
        
        let nomorRak = 'Lainnya';
        let grupHuruf = 'A';

        if (match) {
            nomorRak = match[1]; 
            grupHuruf = match[2].toUpperCase(); 
        } else {
            if (lokasiStr.includes(' A ')) grupHuruf = 'A';
            else if (lokasiStr.includes(' B ')) grupHuruf = 'B';
            else if (lokasiStr.includes(' C ')) grupHuruf = 'C';
            else if (lokasiStr.includes(' D ')) grupHuruf = 'D';

            const numMatch = lokasiStr.match(/\d+/);
            if (numMatch) nomorRak = numMatch[0];
        }

        // Beceran digabung per nomor rak saja, Utuhan dipisah per grup A, B, C, D
        let compositeKey = window.currentRakMode === 'beceran' 
            ? `RAK_${nomorRak}` 
            : `RAK_${nomorRak}_GRUP_${grupHuruf}`;

        if (!grouped[compositeKey]) {
            grouped[compositeKey] = {
                nomorRak: nomorRak,
                grupHuruf: grupHuruf,
                items: []
            };
        }

        grouped[compositeKey].items.push(item);
    });

    Object.keys(grouped).forEach(key => {
        grouped[key].items.sort((a, b) => {
            return a.KODE_LOKASI.localeCompare(b.KODE_LOKASI, undefined, { numeric: true, sensitivity: 'base' });
        });
    });

    return grouped;
}

// ==========================================
// 4. RENDER PREVIEW RAK BECERAN
// ==========================================
window.renderPreviewRakBeceran = function() {
    const container = document.getElementById('panelRakBeceran');
    if (!container) return;

    const cacheData = window.rakBeceranCacheData || {};
    const keys = Object.keys(cacheData).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    if (keys.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-dashed border-slate-200">
                <div class="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center text-2xl mb-3 shadow-inner">
                    <i class="fa-solid fa-box-open"></i>
                </div>
                <p class="text-slate-600 font-bold text-sm">Belum ada data Rak Beceran diimpor.</p>
                <p class="text-slate-400 text-xs mt-1">Klik tombol <span class="text-orange-600 font-semibold">"IMPORT BECERAN"</span> di atas untuk mulai memuat file Excel.</p>
            </div>
        `;
        return;
    }

    let html = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">`;

    keys.forEach(groupKey => {
        const group = cacheData[groupKey];
        const items = group.items || [];
        let totalQty = items.reduce((sum, it) => sum + Number(it.QTY || 0), 0);

        html += `
            <div class="bg-white rounded-2xl shadow-sm border border-orange-200 flex flex-col overflow-hidden">
                <div class="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-white flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-sm tracking-wide">RAK ${group.nomorRak} (BECERAN)</h3>
                        <p class="text-[11px] text-orange-100">${items.length} Lokasi Rak</p>
                    </div>
                    <span class="bg-black/20 text-white text-[11px] font-black px-2.5 py-1 rounded-full backdrop-blur-sm">
                        ${totalQty} Krt
                    </span>
                </div>
                <div class="p-3 flex-1 overflow-y-auto max-h-[300px] divide-y divide-slate-100 miui-custom-scroll">
        `;

        items.forEach((item) => {
            html += `
                <div class="py-2 px-1 flex items-center justify-between text-xs hover:bg-slate-50 transition rounded-xl">
                    <div class="grid grid-cols-3 gap-2 flex-1 mr-2">
                        <!-- 1. Kode Lokasi/Rak -->
                        <div class="bg-slate-100 border border-slate-200 rounded-lg py-1.5 px-2 text-center font-black text-slate-800 truncate">
                            ${item.KODE_LOKASI}
                        </div>
                        <!-- 2. Kode Barang (Pengganti Expdate) -->
                        <div class="bg-blue-50 border border-blue-200 rounded-lg py-1.5 px-2 text-center font-bold text-blue-700 truncate">
                            ${item.KODE_BARANG || '-'}
                        </div>
                        <!-- 3. Qty / Karton -->
                        <div class="bg-orange-50 border border-orange-200 rounded-lg py-1.5 px-2 text-center font-bold text-orange-600 truncate">
                            ${item.QTY} Krt
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
};

// ==========================================
// 5. RENDER PREVIEW RAK UTUHAN (GRID KONSISTEN 4 KOLOM A-B-C-D PER NOMOR RAK)
// ==========================================
window.renderPreviewRakUtuhan = function() {
    const container = document.getElementById('panelRakUtuhan');
    if (!container) return;

    const cacheData = window.rakUtuhanCacheData || {};
    const keys = Object.keys(cacheData);

    if (keys.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-dashed border-slate-200">
                <div class="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center text-2xl mb-3 shadow-inner">
                    <i class="fa-solid fa-boxes-stacked"></i>
                </div>
                <p class="text-slate-600 font-bold text-sm">Belum ada data Semua Rak diimpor.</p>
                <p class="text-slate-400 text-xs mt-1">Klik tombol <span class="text-orange-600 font-semibold">"IMPORT UTUHAN"</span> di atas untuk mulai memuat file Excel.</p>
            </div>
        `;
        return;
    }

    // 1. Kelompokkan data berdasarkan Nomor Rak terlebih dahulu
    let rakMatrix = {};
    keys.forEach(groupKey => {
        const group = cacheData[groupKey];
        const nomor = String(group.nomorRak);
        const huruf = String(group.grupHuruf || 'A').toUpperCase();

        if (!rakMatrix[nomor]) {
            rakMatrix[nomor] = {};
        }
        rakMatrix[nomor][huruf] = group;
    });

    const sortedNomorRak = Object.keys(rakMatrix).sort((a, b) => Number(a) - Number(b));

    let html = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">`;

    // 2. Iterasi setiap nomor rak dan paksa 4 slot kolom (A, B, C, D) per baris
    sortedNomorRak.forEach(nomor => {
        const grupList = ['A', 'B', 'C', 'D'];

        grupList.forEach(huruf => {
            const group = rakMatrix[nomor][huruf];

            if (group && group.items && group.items.length > 0) {
                const items = group.items;
                let totalQty = items.reduce((sum, it) => sum + Number(it.QTY || 0), 0);

                html += `
                    <div class="bg-white rounded-2xl shadow-sm border border-orange-200 flex flex-col overflow-hidden">
                        <div class="bg-gradient-to-r from-zinc-800 to-zinc-900 px-4 py-3 text-white flex justify-between items-center">
                            <div>
                                <h3 class="font-bold text-sm tracking-wide">RAK ${nomor} - GRUP ${huruf}</h3>
                                <p class="text-[11px] text-zinc-400">${items.length} Lokasi Rak</p>
                            </div>
                            <span class="bg-white/10 text-white text-[11px] font-black px-2.5 py-1 rounded-full">
                                ${totalQty} Krt
                            </span>
                        </div>
                        <div class="p-3 flex-1 overflow-y-auto max-h-[300px] divide-y divide-slate-100 miui-custom-scroll">
                `;

                items.forEach((item) => {
                    html += `
                        <div class="py-2 px-1 flex items-center justify-between text-xs hover:bg-slate-50 transition rounded-xl">
                            <div class="grid grid-cols-3 gap-2 flex-1 mr-2">
                                <!-- 1. Kode Lokasi / Rak -->
                                <div class="bg-slate-100 border border-slate-200 rounded-lg py-1.5 px-2 text-center font-black text-slate-800 truncate">
                                    ${item.KODE_LOKASI}
                                </div>
                                <!-- 2. Kode Barang -->
                                <div class="bg-blue-50 border border-blue-200 rounded-lg py-1.5 px-2 text-center font-bold text-blue-700 truncate">
                                    ${item.KODE_BARANG || '-'}
                                </div>
                                <!-- 3. Qty / Karton -->
                                <div class="bg-orange-50 border border-orange-200 rounded-lg py-1.5 px-2 text-center font-bold text-orange-600 truncate">
                                    ${item.QTY} Krt
                                </div>
                            </div>
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            } else {
                // Placeholder kosong transparan jika grup tertentu tidak ada, agar kolom rak lain tidak bergeser
                html += `<div class="hidden lg:block invisible pointer-events-none"></div>`;
            }
        });
    });

    html += `</div>`;
    container.innerHTML = html;
};

// ==========================================
// 6. SIMPAN KE RTDB
// ==========================================
window.simpanDataRakRTDB = async function() {
    const mode = window.currentRakMode;
    const cacheData = mode === 'beceran' ? window.rakBeceranCacheData : window.rakUtuhanCacheData;

    if (!cacheData || Object.keys(cacheData).length === 0) {
        if (typeof miuiAlert === 'function') miuiAlert("Tidak ada data Rak yang untuk disimpan!");
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
    const dbPath = `data_rak/${mode}/${todayStr}_${mode}`;

    try {
        let payload = {};
        Object.keys(cacheData).forEach(groupKey => {
            cacheData[groupKey].items.forEach(item => {
                const uniqueId = `${item.KODE_LOKASI}_${item.KODE_BARANG}`.replace(/[^a-zA-Z0-9]/g, '_');
                payload[uniqueId] = {
                    kode_lokasi: item.KODE_LOKASI,
                    kode_barang: item.KODE_BARANG,
                    qty: item.QTY,
                    expdate: item.EXPDATE
                };
            });
        });

        const rtdbUrl = `https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/${dbPath}.json`;
        const response = await fetch(rtdbUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Gagal menyimpan ke server RTDB");

        if (typeof miuiAlert === 'function') {
            miuiAlert(`Data Ceklist Rak ${mode.toUpperCase()} berhasil disimpan ke RTDB!`);
        }
    } catch (err) {
        console.error("Gagal simpan RTDB:", err);
        if (typeof miuiAlert === 'function') miuiAlert("Terjadi kesalahan saat menyimpan data ke server.");
    }
};


// ==========================================
// MODUL POPOVER ARSIP CEKLIST RAK
// ==========================================

// 1. Toggle Popover Arsip Rak
window.togglePopoverArsipRak = function(event) {
    event.stopPropagation();
    const popover = document.getElementById('popoverArsipRak');
    if (!popover) return;

    if (popover.classList.contains('hidden')) {
        popover.classList.remove('hidden');
        popover.classList.add('flex');

        // Kosongkan input filter tanggal agar seluruh arsip langsung tampil
        const dateInput = document.getElementById('filterArsipRakTgl');
        if (dateInput) {
            dateInput.value = '';
        }
        
        // Muat seluruh daftar arsip yang tersedia
        window.loadArsipRakList();
    } else {
        window.tutupPopoverArsipRak();
    }
};

window.tutupPopoverArsipRak = function() {
    const popover = document.getElementById('popoverArsipRak');
    if (popover) {
        popover.classList.remove('flex');
        popover.classList.add('hidden');
    }
};

// Tutup popover jika pengguna mengklik di luar area popover
document.addEventListener('click', function(e) {
    const popover = document.getElementById('popoverArsipRak');
    if (popover && !popover.contains(e.target) && !e.target.closest('button[onclick*="togglePopoverArsipRak"]')) {
        window.tutupPopoverArsipRak();
    }
});

// 2. Memuat Daftar Arsip dari RTDB (Menyesuaikan Tab/Mode Aktif: Beceran vs Utuhan)
window.loadArsipRakList = function() {
    const container = document.getElementById('containerListArsipRak');
    if (!container) return;

    container.innerHTML = `<div class="text-center py-6 text-slate-400 italic text-xs">Memuat arsip...</div>`;
    
    const mode = window.currentRakMode; // 'beceran' atau 'utuhan'
    const inputFilterTgl = document.getElementById('filterArsipRakTgl');
    const selectedDate = inputFilterTgl ? inputFilterTgl.value : ''; // Format: YYYY-MM-DD

    firebase.database().ref(`data_rak/${mode}`).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                container.innerHTML = `<div class="text-center py-8 text-slate-400 italic text-xs">Belum ada arsip Rak ${mode.toUpperCase()} tersimpan.</div>`;
                return;
            }

            const dataArsip = snapshot.val();
            let keys = Object.keys(dataArsip).sort().reverse(); // Urutkan terbaru di atas

            if (selectedDate) {
                // Format path di RTDB: YYYY_MM_DD_beceran atau YYYY_MM_DD_utuhan
                const targetKeyPart = `${selectedDate.replace(/-/g, '_')}_${mode}`;
                keys = keys.filter(id => id === targetKeyPart);
            }

            if (keys.length === 0) {
                container.innerHTML = `<div class="text-center py-8 text-slate-400 italic text-xs">Tidak ada arsip pada tanggal tersebut.</div>`;
                return;
            }

            let html = '';
            keys.forEach(idArsip => {
                // idArsip contoh: "2026_11_02_beceran"
                const parts = idArsip.replace(`_${mode}`, '').split('_'); // ['2026', '11', '02']
                let formattedTitle = `${mode.toUpperCase()} ${parts[2]}/${parts[1]}/${parts[0]}`;

                const itemsObj = dataArsip[idArsip];
                const itemKeys = Object.keys(itemsObj);
                
                let totalKartonArsip = 0;
                itemKeys.forEach(k => {
                    totalKartonArsip += Number(itemsObj[k].qty || 0);
                });

                html += `
                    <div onclick="pilihArsipRak('${idArsip}')" class="bg-slate-50 border border-orange-200 rounded-xl p-2.5 shadow-2xs hover:bg-orange-50/60 hover:border-orange-400 cursor-pointer transition flex flex-col space-y-1.5 group">
                        <div class="flex justify-between items-center">
                            <span class="font-black text-slate-800 text-[11px] uppercase flex items-center gap-1.5 group-hover:text-orange-600 transition">
                                <i class="fa-solid fa-file-lines text-orange-500"></i> ${formattedTitle}
                            </span>
                            <span class="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                ${itemKeys.length} Item / ${totalKartonArsip.toLocaleString('id-ID')} Krt
                            </span>
                        </div>
                        <div class="flex justify-between items-center pt-1 border-t border-slate-200/60">
                            <span class="text-[10px] text-slate-400 italic">Klik untuk lihat data rak</span>
                            <button onclick="event.stopPropagation(); cetakArsipRak('${idArsip}')" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-xs transition">
                                <i class="fa-solid fa-print"></i> Cetak
                            </button>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        })
        .catch(err => {
            console.error("Gagal memuat arsip rak:", err);
            container.innerHTML = `<div class="text-center py-6 text-red-500 text-xs">Gagal memuat arsip dari server.</div>`;
        });
};

window.resetFilterArsipRak = function() {
    const inputFilterTgl = document.getElementById('filterArsipRakTgl');
    if (inputFilterTgl) inputFilterTgl.value = '';
    window.loadArsipRakList();
};

// 3. Memilih Arsip & Memuatnya Kembali ke Tampilan Kartu Preview Sesuai Mode Aktif
window.pilihArsipRak = async function(idArsip) {
    const mode = window.currentRakMode; // 'beceran' atau 'utuhan'
    try {
        const snapshot = await firebase.database().ref(`data_rak/${mode}/${idArsip}`).once('value');
        if (!snapshot.exists()) {
            if (typeof miuiAlert === 'function') miuiAlert("Data arsip tidak ditemukan!");
            return;
        }

        const dataItems = snapshot.val();
        let rawRows = [];

        Object.keys(dataItems).forEach(k => {
            const it = dataItems[k];
            rawRows.push({
                KODE_LOKASI: it.kode_lokasi,
                KODE_BARANG: it.kode_barang,
                QTY: it.qty,
                EXPDATE: it.expdate
            });
        });

        // Proses ulang pengelompokan sesuai fungsi standar mode aktif
        const groupedResult = processGroupGrupRak(rawRows);

        if (mode === 'beceran') {
            window.rakBeceranCacheData = groupedResult;
            if (typeof window.renderPreviewRakBeceran === 'function') window.renderPreviewRakBeceran();
        } else {
            window.rakUtuhanCacheData = groupedResult;
            if (typeof window.renderPreviewRakUtuhan === 'function') window.renderPreviewRakUtuhan();
        }

        window.tutupPopoverArsipRak();
        if (typeof miuiAlert === 'function') {
            miuiAlert(`Arsip Rak ${mode.toUpperCase()} (${idArsip}) berhasil dimuat!`);
        }
    } catch (err) {
        console.error("Gagal memuat arsip rak:", err);
        if (typeof miuiAlert === 'function') miuiAlert("Terjadi kesalahan saat memuat arsip.");
    }
};

// 4. Cetak Arsip Rak Langsung
window.cetakArsipRak = async function(idArsip) {
    await window.pilihArsipRak(idArsip);
    window.print();
};


// ==========================================
// FUNGSI CETAK LAPORAN CEKLIST RAK (DENGAN FORMAT TANGGAL PADA JUDUL)
// ==========================================
window.cetakDataRak = function() {
    const mode = window.currentRakMode; // 'beceran' atau 'utuhan'
    const cacheData = mode === 'beceran' ? window.rakBeceranCacheData : window.rakUtuhanCacheData;

    if (!cacheData || Object.keys(cacheData).length === 0) {
        if (typeof miuiAlert === 'function') miuiAlert("Tidak ada data Ceklist Rak untuk dicetak!");
        return;
    }

    // Ambil string tanggal dari arsip yang aktif (jika ada variabel global window.currentArsipId atau dari data)
    // Contoh format ID arsip: 'beceran_2026-04-13' atau '04/11/2026' atau kita fallback ke tanggal hari ini
    let tanggalArsipFormatted = "";
    const activeId = window.currentArsipId || "";
    
    // Cek apakah ID mengandung pola tanggal (YYYY-MM-DD atau DD-MM-YYYY)
    const matchDate = activeId.match(/(\d{4}[-/]\d{2}[-/]\d{2})|(\d{2}[-/]\d{2}[-/]\d{4})/);
    if (matchDate) {
        let rawDateStr = matchDate[0].replace(/[\/]/g, '-');
        let parts = rawDateStr.split('-');
        if (parts[0].length === 4) {
            // Format YYYY-MM-DD -> DD/MM/YYYY
            tanggalArsipFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
            // Format DD-MM-YYYY -> DD/MM/YYYY
            tanggalArsipFormatted = `${parts[0]}/${parts[1]}/${parts[2]}`;
        }
    } else {
        // Fallback jika tidak ada di ID, gunakan tanggal hari ini atau dari cache
        const nowDefault = new Date();
        const dd = String(nowDefault.getDate()).padStart(2, '0');
        const mm = String(nowDefault.getMonth() + 1).padStart(2, '0');
        const yyyy = nowDefault.getFullYear();
        tanggalArsipFormatted = `${dd}/${mm}/${yyyy}`;
    }

    const now = new Date();
    const tanggalCetakStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });
    const jamCetakStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const infoWaktuCetak = `Dicetak pada: ${tanggalCetakStr}, ${jamCetakStr}`;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
        if (typeof miuiAlert === 'function') miuiAlert("Mohon izinkan pop-up (pop-up blocker) di browser Anda untuk mencetak.");
        return;
    }

    let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cetak Ceklist Rak ${mode.toUpperCase()}</title>
            <style>
                @page {
                    size: 215mm 330mm portrait;
                    margin: 7mm 10mm 5mm 10mm;
                }
                body {
                    font-family: Arial, sans-serif;
                    background: #fff;
                    color: #000;
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .page {
                    width: 203mm;
                    height: 320mm;
                    max-height: 320mm;
                    margin: 0 auto;
                    padding: 2mm;
                    box-sizing: border-box;
                    page-break-after: always;
                    break-after: page;
                    display: flex;
                    flex-direction: column;
                }
                .header-container {
                    margin-bottom: 4px;
                }
                .top-info-bar {
                    display: flex;
                    justify-content: flex-end;
                    font-size: 8.5px;
                    font-style: italic;
                    margin-bottom: 1px;
                }
                .header-title {
                    text-align: center;
                    font-size: 16px;
                    font-weight: 900;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                    margin-bottom: 2px;
                }
                .header-line {
                    border-bottom: 2px solid #000;
                    margin-top: 2px;
                }
                
                /* Layout 2 Kolom Tabel Beceran: Gap 70px */
                .beceran-table-container {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 70px; 
                    flex: 1;
                    align-content: start;
                    padding: 0 2mm;
                }
                .beceran-sub-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                }
                .beceran-sub-table th {
                    border-top: 1.5px solid #000;
                    border-bottom: 1.5px solid #000;
                    padding: 4px 5px;
                    text-align: left;
                    font-weight: bold;
                    background: #f4f7f9;
                }
                .beceran-sub-table td {
                    border-bottom: 1px solid #edeef0;
                    padding: 2.8px 5px;
                }
                .td-no {
                    text-align: center;
                    width: 25px;
                    font-weight: bold;
                    color: #555;
                }
                .td-lokasi {
                    font-weight: bold;
                    width: 62px;
                }
                .td-kode {
                    font-weight: bold;
                }
                .td-checkbox {
                    text-align: center;
                    width: 25px;
                }
                .checkbox-box {
                    width: 10px;
                    height: 10px;
                    border: 1px solid #000;
                    display: inline-block;
                    background: #fff;
                }
                .td-qty {
                    text-align: center;
                    font-weight: bold;
                    width: 38px;
                }
                .row-spacer td {
                    border-bottom: 2.5px solid #64748b !important;
                    background: #f8fafc;
                    height: 10px;
                    padding: 0 !important;
                }

                /* Layout Grid 2x2 Per Lembar untuk Utuhan */
                .grid-container-utuhan {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    grid-template-rows: repeat(2, 1fr);
                    gap: 70px; 
                    flex: 1;
                    padding: 4px 0;
                }
                .card {
                    background: #fff;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                }
                .card-header {
                    border-bottom: 1.5px solid #000;
                    padding: 4px 6px 6px 6px;
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 4px;
                    font-size: 13px;
                }
                .card-items {
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                }
                /* Layout Grid 2x2 Per Lembar untuk Utuhan: Spasi dan Lebar Kolom Diperlebar */
                .card-row {
                    display: grid;
                    grid-template-columns: 28px 68px 1fr 38px 25px; /* Kolom nomor dan lokasi diperlebar agar tidak mepet */
                    align-items: center;
                    background: #fff;
                    padding: 3.5px 4px; /* Padding baris ditambah agar lebih lega */
                    border-bottom: 1px solid #929393;
                    font-size: 13px;
                }
            </style>
        </head>
        <body>
    `;

    if (mode === 'utuhan') {
        // ==========================================
        // KONDISI 1: CETAK UTUHAN (1 LEMBAR PER 1 NOMOR RAK, GRID 2x2)
        // ==========================================
        let rakMatrix = {};
        Object.keys(cacheData).forEach(groupKey => {
            const group = cacheData[groupKey];
            const nomor = String(group.nomorRak);
            const huruf = String(group.grupHuruf || 'A').toUpperCase();

            if (!rakMatrix[nomor]) rakMatrix[nomor] = {};
            rakMatrix[nomor][huruf] = group;
        });

        const sortedNomorRak = Object.keys(rakMatrix).sort((a, b) => Number(a) - Number(b));

        sortedNomorRak.forEach(nomor => {
            htmlContent += `
            <div class="page">
                <div class="header-container">
                    <div class="top-info-bar">${infoWaktuCetak}</div>
                    <div class="header-title">CEKLIST RAK UTUHAN - ${tanggalArsipFormatted} - RAK ${nomor}</div>
                    <div class="header-line"></div>
                </div>
                <div class="grid-container-utuhan">
            `;

            const grupList = ['A', 'B', 'C', 'D'];
            grupList.forEach(huruf => {
                const group = rakMatrix[nomor][huruf];

                if (group && group.items && group.items.length > 0) {
                    const itemsList = group.items;
                    let totalKrtRak = itemsList.reduce((sum, it) => sum + Number(it.QTY || 0), 0);

                    htmlContent += `
                        <div class="card">
                            <div class="card-header">
                                <span>RAK ${nomor} — GRUP ${huruf}</span>
                                <span>= ${totalKrtRak} Krt</span>
                            </div>
                            <div class="card-items">
                    `;

                    itemsList.forEach((row, index) => {
                        htmlContent += `
                            <div class="card-row">
                                <span style="font-weight:bold; text-align:left; padding-right:2px; color:#555;">${index + 1}.</span>
                                <span style="font-weight:bold;">${row.KODE_LOKASI}</span>
                                <span style="font-weight:bold; color:#111;">${row.KODE_BARANG}</span>
                                <span style="text-align:center; font-weight:bold;">${row.QTY}</span>
                                <div style="display:flex; justify-content:center;"><div style="width:10px; height:10px; border:1px solid #000; background:#fff;"></div></div>
                            </div>
                        `;
                    });

                    htmlContent += `
                            </div>
                        </div>
                    `;
                } else {
                    htmlContent += `<div></div>`;
                }
            });

            htmlContent += `
                </div>
            </div>
            `;
        });

    } else {
        // ==========================================
        // KONDISI 2: CETAK BECERAN (RAK UTUH TANPA TERPOTONG)
        // ==========================================
        const entries = Object.entries(cacheData).sort((a, b) => Number(a[1].nomorRak) - Number(b[1].nomorRak));
        
        let rakGroups = [];
        entries.forEach(([key, val]) => {
            rakGroups.push({
                rakNum: val.nomorRak,
                items: val.items || []
            });
        });

        let leftColumnRaks = [];
        let rightColumnRaks = [];
        let leftCount = 0;
        let targetPerColumn = 55; 

        rakGroups.forEach(group => {
            const groupRows = group.items.length + (leftColumnRaks.length > 0 ? 1 : 0);
            if (leftCount + groupRows <= targetPerColumn || leftColumnRaks.length === 0) {
                leftColumnRaks.push(group);
                leftCount += groupRows;
            } else {
                rightColumnRaks.push(group);
            }
        });

        let leftProcessedRows = [];
        let counterNo = 1;
        let lastRakLeft = null;
        leftColumnRaks.forEach(group => {
            group.items.forEach(item => {
                if (lastRakLeft !== null && lastRakLeft !== group.rakNum) {
                    leftProcessedRows.push({ isSpacer: true });
                }
                lastRakLeft = group.rakNum;
                leftProcessedRows.push({
                    isSpacer: false,
                    no: counterNo++,
                    KODE_LOKASI: item.KODE_LOKASI,
                    KODE_BARANG: item.KODE_BARANG,
                    QTY: item.QTY
                });
            });
        });

        let rightProcessedRows = [];
        let lastRakRight = null;
        rightColumnRaks.forEach(group => {
            group.items.forEach(item => {
                if (lastRakRight !== null && lastRakRight !== group.rakNum) {
                    rightProcessedRows.push({ isSpacer: true });
                }
                lastRakRight = group.rakNum;
                rightProcessedRows.push({
                    isSpacer: false,
                    no: counterNo++,
                    KODE_LOKASI: item.KODE_LOKASI,
                    KODE_BARANG: item.KODE_BARANG,
                    QTY: item.QTY
                });
            });
        });

        htmlContent += `
        <div class="page">
            <div class="header-container">
                <div class="top-info-bar">${infoWaktuCetak}</div>
                <div class="header-title">STOK BECERAN - ${tanggalArsipFormatted}</div>
                <div class="header-line"></div>
            </div>
            <div class="beceran-table-container">
                <div>
                    <table class="beceran-sub-table">
                        <thead>
                            <tr>
                                <th class="td-no">No</th>
                                <th class="td-lokasi">Lokasi</th>
                                <th class="td-kode">Kode Barang</th>
                                <th class="td-qty">Qty</th>
                                <th class="td-checkbox">✓</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        leftProcessedRows.forEach((row) => {
            if (row.isSpacer) {
                htmlContent += `<tr class="row-spacer"><td colspan="5"></td></tr>`;
            } else {
                htmlContent += `
                    <tr>
                        <td class="td-no">${row.no}</td>
                        <td class="td-lokasi">${row.KODE_LOKASI}</td>
                        <td class="td-kode">${row.KODE_BARANG}</td>
                        <td class="td-qty">${row.QTY}</td>
                        <td class="td-checkbox"><div class="checkbox-box"></div></td>
                    </tr>
                `;
            }
        });

        htmlContent += `
                        </tbody>
                    </table>
                </div>
                <div>
                    <table class="beceran-sub-table">
                        <thead>
                            <tr>
                                <th class="td-no">No</th>
                                <th class="td-lokasi">Lokasi</th>
                                <th class="td-kode">Kode Barang</th>
                                <th class="td-qty">Qty</th>
                                <th class="td-checkbox">✓</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        rightProcessedRows.forEach((row) => {
            if (row.isSpacer) {
                htmlContent += `<tr class="row-spacer"><td colspan="5"></td></tr>`;
            } else {
                htmlContent += `
                    <tr>
                        <td class="td-no">${row.no}</td>
                        <td class="td-lokasi">${row.KODE_LOKASI}</td>
                        <td class="td-kode">${row.KODE_BARANG}</td>
                        <td class="td-qty">${row.QTY}</td>
                        <td class="td-checkbox"><div class="checkbox-box"></div></td>
                    </tr>
                `;
            }
        });

        htmlContent += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;
    }

    htmlContent += `
        <script>
            window.onload = function() {
                window.print();
                setTimeout(() => window.close(), 500);
            }
        </script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
};

window.cetakArsipRak = async function(idArsip) {
    window.currentArsipId = idArsip; // Simpan ID arsip yang dipilih untuk referensi tanggal
    await window.pilihArsipRak(idArsip);
    window.cetakDataRak();
};