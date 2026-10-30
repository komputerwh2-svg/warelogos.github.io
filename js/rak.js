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

// Fungsi slider tab utama (wajib terikat ke window agar onclick di HTML terbaca)
window.switchTabRak = function(mode) {
    window.currentRakMode = mode;
    
    const btnBeceran = document.getElementById('tabBtnRakBeceran');
    const btnUtuhan = document.getElementById('tabBtnRakUtuhan');
    const panelBeceran = document.getElementById('panelRakBeceran');
    const panelUtuhan = document.getElementById('panelRakUtuhan');

    const labelImport = document.getElementById('labelBtnImportRak');
    const wrapperFilter = document.getElementById('wrapperFilterRakUtuhan');
    const btnArsipText = document.getElementById('spanArsipRakText'); // Jika ada span arsip

    if (mode === 'beceran') {
        // Styling Tab Aktif Beceran
        btnBeceran?.classList.remove('bg-zinc-800', 'text-zinc-400', 'border-transparent');
        btnBeceran?.classList.add('bg-orange-600', 'text-white', 'border-orange-500', 'shadow');
        
        btnUtuhan?.classList.remove('bg-orange-600', 'text-white', 'border-orange-500', 'shadow');
        btnUtuhan?.classList.add('bg-zinc-800', 'text-zinc-400', 'border-transparent');

        // Panel
        if (panelBeceran) panelBeceran.classList.remove('hidden');
        if (panelUtuhan) panelUtuhan.classList.add('hidden');

        // Sinkronisasi Tombol Kanan
        if (labelImport) labelImport.innerText = "IMPORT BECERAN";
        if (wrapperFilter) wrapperFilter.classList.add('hidden'); // Sembunyikan filter rak utuhan

        if (typeof window.renderPreviewRakBeceran === 'function') {
            window.renderPreviewRakBeceran();
        }

    } else {
        // Styling Tab Aktif Utuhan / Semua Rak
        btnUtuhan?.classList.remove('bg-zinc-800', 'text-zinc-400', 'border-transparent');
        btnUtuhan?.classList.add('bg-orange-600', 'text-white', 'border-orange-500', 'shadow');
        
        btnBeceran?.classList.remove('bg-orange-600', 'text-white', 'border-orange-500', 'shadow');
        btnBeceran?.classList.add('bg-zinc-800', 'text-zinc-400', 'border-transparent');

        // Panel
        if (panelUtuhan) panelUtuhan.classList.remove('hidden');
        if (panelBeceran) panelBeceran.classList.add('hidden');

        // Sinkronisasi Tombol Kanan
        if (labelImport) labelImport.innerText = "IMPORT UTUHAN";
        if (wrapperFilter) wrapperFilter.classList.remove('hidden'); // Tampilkan filter rak utuhan

        if (typeof window.renderPreviewRakUtuhan === 'function') {
            window.renderPreviewRakUtuhan();
        }
    }
};

// Handler ketika tombol Import diklik (menyesuaikan mode aktif)
window.handleMainImportRak = function() {
    const fileInput = document.getElementById('inputExcelRak');
    if (!fileInput) return;

    if (window.currentRakMode === 'beceran') {
        fileInput.setAttribute('multiple', 'multiple');
    } else {
        fileInput.setAttribute('multiple', 'multiple'); // Atau sesuaikan kebutuhan utuhan
    }
    fileInput.click();
};

// Handler pembacaan file Excel (Placeholder untuk diisi fungsi parser XLSX nanti)
window.handleFileImportRak = function(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    console.log(`Mengimpor ${files.length} file untuk mode: ${window.currentRakMode}`);
    // Nanti kita sambungkan dengan pembacaan SheetJS (XLSX) sesuai struktur kolom gudang
    
    if (typeof miuiAlert === 'function') {
        miuiAlert(`Berhasil memilih ${files.length} file untuk Rak ${window.currentRakMode.toUpperCase()}`);
    }
    
    // Reset value input file
    event.target.value = '';
};


// ==========================================
// 1. LOAD MASTER BARANG LOKAL (IndexedDB / Fallback)
// ==========================================
window.loadMasterBarangRak = async function() {
    if (window.masterData && Object.keys(window.masterData).length > 0) return;

    try {
        // Coba baca dari IndexedDB lokal terlebih dahulu agar hemat kuota
        const localMaster = typeof getMasterFromIDB_wh === 'function' ? await getMasterFromIDB_wh() : null;
        if (localMaster && Object.keys(localMaster).length > 0) {
            window.masterData = localMaster;
            console.log("Master barang berhasil dimuat dari IDB lokal. Total:", Object.keys(window.masterData).length);
            return;
        }

        // Jika kosong, ambil dari server Firebase
        const res = await fetch("https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/master_barang.json");
        if (!res.ok) throw new Error("Gagal mengambil master dari server");
        
        const dataFromServer = await res.json();
        if (dataFromServer) {
            window.masterData = dataFromServer;
            if (typeof saveMasterToIDB_wh === 'function') {
                await saveMasterToIDB_wh(dataFromServer);
            }
            console.log("Master barang berhasil dimuat dari server.");
        }
    } catch (err) {
        console.warn("Gagal memuat master barang:", err.message);
        window.masterData = {};
    }
};

// ==========================================
// 2. PROSES IMPORT FILE EXCEL RAK
// ==========================================
window.handleFileImportRak = async function(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Pastikan master barang sudah siap untuk perbandingan beceran
    await window.loadMasterBarangRak();

    let allParsedRows = [];

    for (let file of files) {
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            jsonRows.forEach(row => {
                // Sesuaikan dengan kolom excel Anda (KODE_LOKASI / KODE_LO, KODE, STOK)
                const lokasi = String(row.KODE_LOKASI || row.KODE_LO || '').trim();
                const kodeBarang = String(row.KODE || row.KODE_BARANG || '').trim().toUpperCase();
                const stokExcel = Number(row.STOK || row.QTY || 0);

                if (!lokasi || !kodeBarang) return;

                // Ambil qty utuhan dari master barang
                const masterItem = window.masterData[kodeBarang];
                const qtyUtuhanMaster = masterItem ? Number(masterItem.QTY || 0) : stokExcel;

                if (window.currentRakMode === 'beceran') {
                    // Logika Beceran: Ambil jika stok excel BERBEDA / LEBIH KECIL dari utuhan master
                    // Atau jika Anda punya aturan khusus qty beceran, sesuaikan di sini
                    if (stokExcel !== qtyUtuhanMaster) {
                        allParsedRows.push({
                            KODE_LOKASI: lokasi,
                            KODE_BARANG: kodeBarang,
                            QTY: stokExcel,
                            EXPDATE: row.EXPDATE || '-'
                        });
                    }
                } else {
                    // Logika Semua Rak / Utuhan: Ambil semuanya
                    allParsedRows.push({
                        KODE_LOKASI: lokasi,
                        KODE_BARANG: kodeBarang,
                        QTY: stokExcel,
                        EXPDATE: row.EXPDATE || '-'
                    });
                }
            });
        } catch (e) {
            console.error(`Gagal membaca file ${file.name}:`, e);
        }
    }

    // Simpan ke cache global sesuai mode aktif
    if (window.currentRakMode === 'beceran') {
        window.rakBeceranCacheData = processGroupGrupRak(allParsedRows);
        window.renderPreviewRakBeceran();
    } else {
        window.rakUtuhanCacheData = processGroupGrupRak(allParsedRows);
        window.renderPreviewRakUtuhan();
    }

    if (typeof miuiAlert === 'function') {
        miuiAlert(`Berhasil memproses ${files.length} file Excel untuk Rak ${window.currentRakMode.toUpperCase()}!`);
    }

    event.target.value = ''; // Reset input file
};

// ==========================================
// 3. FUNGSI PENGELOMPOKKAN KE 4 GRUP (A, B, C, D)
// ==========================================
function processGroupGrupRak(rows) {
    let grouped = {};

    rows.forEach(item => {
        // Ekstrak nomor rak dan huruf grup dari KODE_LOKASI (Contoh: "4 A 05" -> Rak 4, Grup A)
        const match = item.KODE_LOKASI.match(/^(\d+)\s+([ABCD])\s+(.+)$/i);
        
        let nomorRak = 'Lainnya';
        let grupHuruf = 'A';

        if (match) {
            nomorRak = match[1]; // misal "4"
            grupHuruf = match[2].toUpperCase(); // misal "A"
        } else {
            // Fallback pencarian sederhana jika format spasi berbeda
            if (item.KODE_LOKASI.includes(' A ')) grupHuruf = 'A';
            else if (item.KODE_LOKASI.includes(' B ')) grupHuruf = 'B';
            else if (item.KODE_LOKASI.includes(' C ')) grupHuruf = 'C';
            else if (item.KODE_LOKASI.includes(' D ')) grupHuruf = 'D';

            const numMatch = item.KODE_LOKASI.match(/\d+/);
            if (numMatch) nomorRak = numMatch[0];
        }

        const compositeKey = `RAK_${nomorRak}_GRUP_${grupHuruf}`;

        if (!grouped[compositeKey]) {
            grouped[compositeKey] = {
                nomorRak: nomorRak,
                grupHuruf: grupHuruf,
                items: []
            };
        }

        grouped[compositeKey].items.push(item);
    });

    // Urutkan item di dalam setiap grup berdasarkan lokasi rak secara natural
    Object.keys(grouped).forEach(key => {
        grouped[key].items.sort((a, b) => {
            return a.KODE_LOKASI.localeCompare(b.KODE_LOKASI, undefined, { numeric: true, sensitivity: 'base' });
        });
    });

    return grouped;
}


window.simpanDataRakRTDB = async function() {
    const mode = window.currentRakMode; // 'beceran' atau 'utuhan'
    const cacheData = mode === 'beceran' ? window.rakBeceranCacheData : window.rakUtuhanCacheData;

    if (!cacheData || Object.keys(cacheData).length === 0) {
        if (typeof miuiAlert === 'function') miuiAlert("Tidak ada data Rak yang untuk disimpan!");
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
    const dbPath = `data_rak/${mode}/${todayStr}_${mode}`;

    try {
        // Format data simpan dengan key id kode_qty atau struktur rak
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