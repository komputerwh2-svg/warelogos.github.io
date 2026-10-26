// --- MODUL SUB-PAGE LANGSIR ---

window.initLangsir = function() {
    // Jalankan inisialisasi atau render awal jika diperlukan saat subpage dibuka
    if (typeof renderPreviewLangsir === 'function') {
        renderPreviewLangsir();
    }
};

let langsirCacheData = {}; // Format: { "KODE_RASA": { namaRasa, items: [...] } }

window.openSubpageLangsir = function() {
    const subpage = document.getElementById('subpageLangsir');
    if (subpage) {
        subpage.classList.remove('translate-x-full');
        subpage.classList.add('translate-x-0');
    }
    renderPreviewLangsir();
};

window.tutupSubPageLangsir = function() {
    const subpage = document.getElementById('subpageLangsir');
    if (subpage) {
        subpage.classList.remove('translate-x-0');
        subpage.classList.add('translate-x-full');
    }
};

// Fungsi Membaca File Excel (Satuan atau Multiple)
window.handleFileImportLangsir = async function(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    let loadedCount = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const data = await readFileAsArrayBufferLangsir(file);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            jsonData.forEach(row => {
                const kodeLokasi = String(row.KODE_LOKASI || row.LOKASI || '').trim();
                const kodeBarang = String(row.KODE || row.KODE_BARANG || '').trim().toUpperCase();
                const namaRasa   = String(row.NAMA || row.NAMA_BARANG || 'PRODUK').trim();
                const stok       = Number(row.STOK || row.IN || 0);
                const expdate    = String(row.EXPDATE || '').trim();
                const barcode    = String(row.BARCODE || '').trim();
                const kodePallet = String(row.KODE_PALLET || '').trim();

                if (!kodeBarang) return;

                if (!langsirCacheData[kodeBarang]) {
                    langsirCacheData[kodeBarang] = {
                        namaRasa: namaRasa,
                        items: []
                    };
                }

                langsirCacheData[kodeBarang].items.push({
                    KODE_LOKASI: kodeLokasi,
                    KODE: kodeBarang,
                    STOK: stok,
                    EXPDATE: expdate,
                    BARCODE: barcode,
                    KODE_PALLET: kodePallet
                });
            });

            loadedCount++;
        } catch (err) {
            console.error(`Gagal membaca file ${file.name}:`, err);
        }
    }

    event.target.value = '';

    if (loadedCount > 0) {
        if (typeof miuiAlert === 'function') miuiAlert(`Berhasil mengimpor ${loadedCount} berkas laporan WMS!`);
        renderPreviewLangsir();
    } else {
        if (typeof miuiAlert === 'function') miuiAlert("Tidak ada data valid yang berhasil dibaca.");
    }
};

function readFileAsArrayBufferLangsir(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsArrayBuffer(file);
    });
}

// Render Kartu Preview (Grid 3 Kolom - Sorted Qty & Expdate, MIUI Custom Scroll)
window.renderPreviewLangsir = function() {
    const container = document.getElementById('containerKartuLangsir');
    if (!container) return;

    const keys = Object.keys(langsirCacheData);

    if (keys.length === 0) {
        container.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-dashed border-slate-200">
                <div class="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center text-2xl mb-3 shadow-inner">
                    <i class="fa-solid fa-box-open"></i>
                </div>
                <p class="text-slate-600 font-bold text-sm">Belum ada data langsir diimpor.</p>
                <p class="text-slate-400 text-xs mt-1">Klik tombol <span class="text-orange-600 font-semibold">"Import Data Langsir"</span> di atas untuk mulai memuat laporan Excel WMS.</p>
            </div>
        `;
        return;
    }

    let html = '';
    keys.forEach(kodeRasa => {
        const group = langsirCacheData[kodeRasa];
        let items = group.items;
        if (!items || items.length === 0) return;

        // --- SORTING: Qty Terkecil ke Terbesar, lalu Expdate Terlama ke Terbaru ---
        items.sort((a, b) => {
            const qtyA = Number(a.STOK || 0);
            const qtyB = Number(b.STOK || 0);

            if (qtyA !== qtyB) {
                return qtyA - qtyB; // Qty kecil ke besar
            }

            // Jika Qty sama, urutkan berdasarkan Expdate (terlama ke terbaru)
            const dateA = parseTanggalCustomLangsir(a.EXPDATE);
            const dateB = parseTanggalCustomLangsir(b.EXPDATE);
            return dateA - dateB;
        });

        let totalKarton = items.reduce((sum, item) => sum + Number(item.STOK || 0), 0);
        let totalLokasi = items.length;
        let formattedTotalKrt = totalKarton.toLocaleString('id-ID');

        html += `
            <div class="bg-white rounded-2xl shadow-sm border border-orange-200 flex flex-col overflow-hidden">
                <!-- Header Kartu -->
                <div class="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-white flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-sm">${kodeRasa}</h3>
                        <p class="text-[11px] text-orange-100 truncate max-w-[170px]">${group.namaRasa}</p>
                    </div>
                    <span class="bg-black/20 text-white text-[11px] font-black px-2.5 py-1 rounded-full backdrop-blur-sm tracking-wide shadow-inner">
                        TOTAL [${formattedTotalKrt} KRT] / ${totalLokasi} RAK
                    </span>
                </div>

                <!-- Daftar Baris Data dengan miui-custom-scroll -->
                <div class="p-3 flex-1 overflow-y-auto max-h-[300px] divide-y divide-slate-100 miui-custom-scroll">
        `;

        items.forEach((item, index) => {
            html += `
                <div class="py-2 px-1 flex items-center justify-between text-xs hover:bg-slate-50 transition rounded-xl">
                    <!-- Grid 3 Kolom Badge Seragam -->
                    <div class="grid grid-cols-3 gap-2 flex-1 mr-2">
                        <!-- Badge Rak -->
                        <div class="bg-slate-100 border border-slate-200 rounded-lg py-1.5 px-2 text-center font-black text-slate-800 tracking-wide truncate shadow-2xs">
                            ${item.KODE_LOKASI || '-'}
                        </div>
                        
                        <!-- Badge Qty -->
                        <div class="bg-orange-50 border border-orange-200 rounded-lg py-1.5 px-2 text-center font-bold text-orange-600 truncate shadow-2xs">
                            ${item.STOK} Krt
                        </div>
                        
                        <!-- Badge Expdate -->
                        <div class="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-center font-medium text-slate-600 truncate shadow-2xs">
                            ${item.EXPDATE || '-'}
                        </div>
                    </div>
                    
                    <!-- Tombol Hapus Baris Satuan -->
                    <button onclick="hapusItemLangsir('${kodeRasa}', ${index})" class="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl flex items-center justify-center transition shadow-sm flex-shrink-0" title="Hapus baris ini">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
};

// Helper parsing tanggal format DD/MM/YYYY untuk keperluan sorting
function parseTanggalCustomLangsir(tglStr) {
    if (!tglStr || typeof tglStr !== 'string') return 8640000000000; // Letakkan di akhir jika kosong
    const parts = tglStr.trim().split('/');
    if (parts.length !== 3) return 8640000000000;
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    const dateObj = new Date(y, m, d);
    return isNaN(dateObj.getTime()) ? 8640000000000 : dateObj.getTime();
}

window.hapusItemLangsir = function(kodeRasa, index) {
    if (langsirCacheData[kodeRasa] && langsirCacheData[kodeRasa].items) {
        langsirCacheData[kodeRasa].items.splice(index, 1);
        if (langsirCacheData[kodeRasa].items.length === 0) {
            delete langsirCacheData[kodeRasa];
        }
        renderPreviewLangsir();
    }
};

// Simpan ke RTDB dengan format id: langsir_yyyy_mm_dd dan key: kodebarang_rak
window.simpanDataLangsirRTDB = function() {
    const keys = Object.keys(langsirCacheData);
    if (keys.length === 0) {
        if (typeof miuiAlert === 'function') miuiAlert("Tidak ada data langsir yang dapat disimpan!");
        return;
    }

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const idLangsir = `langsir_${yyyy}_${mm}_${dd}`;

    let payloadToSave = {};

    keys.forEach(kodeRasa => {
        langsirCacheData[kodeRasa].items.forEach(item => {
            const cleanRak = String(item.KODE_LOKASI || 'NORAK').replace(/[\s\/\\#$\[\]\.]/g, '_');
            const nodeKey = `${item.KODE}_${cleanRak}`.toUpperCase();

            payloadToSave[nodeKey] = {
                KODE_LOKASI: item.KODE_LOKASI,
                KODE: item.KODE,
                STOK: item.STOK,
                EXPDATE: item.EXPDATE,
                BARCODE: item.BARCODE,
                KODE_PALLET: item.KODE_PALLET
            };
        });
    });

    firebase.database().ref(`data_langsir/${idLangsir}`).set(payloadToSave)
        .then(() => {
            if (typeof miuiAlert === 'function') miuiAlert(`Data langsir berhasil disimpan dengan ID: ${idLangsir}!`);
        })
        .catch(err => {
            console.error("Gagal menyimpan ke RTDB:", err);
            if (typeof miuiAlert === 'function') miuiAlert("Gagal menyimpan data langsir ke server.");
        });
};

window.cetakDataLangsir = function() {
    const keys = Object.keys(langsirCacheData);
    if (keys.length === 0) {
        if (typeof miuiAlert === 'function') miuiAlert("Tidak ada data untuk dicetak!");
        return;
    }
    window.print();
};