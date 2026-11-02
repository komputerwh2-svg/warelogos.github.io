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
                        <div class="bg-slate-100 border border-slate-200 rounded-lg py-1.5 px-2 text-center font-black text-slate-800 truncate">
                            ${item.KODE_LOKASI}
                        </div>
                        <div class="bg-orange-50 border border-orange-200 rounded-lg py-1.5 px-2 text-center font-bold text-orange-600 truncate">
                            ${item.QTY} Krt
                        </div>
                        <div class="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-center font-medium text-slate-600 truncate">
                            ${item.EXPDATE || '-'}
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
                                <div class="bg-slate-100 border border-slate-200 rounded-lg py-1.5 px-2 text-center font-black text-slate-800 truncate">
                                    ${item.KODE_LOKASI}
                                </div>
                                <div class="bg-orange-50 border border-orange-200 rounded-lg py-1.5 px-2 text-center font-bold text-orange-600 truncate">
                                    ${item.QTY} Krt
                                </div>
                                <div class="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-center font-medium text-slate-600 truncate">
                                    ${item.EXPDATE || '-'}
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