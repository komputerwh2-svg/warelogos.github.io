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

// Helper: ambil nomor part dari item/groupKey (default 1)
function ekstrakNomorPartLangsir(valObj, groupKey = '') {
    const direct = Number(valObj?.uploadSession || valObj?.upload_session || 0);
    if (direct > 0) return direct;

    const matchP = String(groupKey).match(/_P(\d+)$/i);
    if (matchP) return Number(matchP[1]);

    const matchS = String(groupKey).match(/_S(\d+)$/i);
    if (matchS) return Number(matchS[1]);

    return 1;
}

// Helper: tentukan target ID arsip (arsip aktif atau tanggal hari ini)
function getTargetIdLangsirAktif() {
    if (window.currentActiveArsipId) return window.currentActiveArsipId;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `langsir_${yyyy}_${mm}_${dd}`;
}

// Helper: hitung nomor Part berikutnya (P_1 untuk awal, P_2 untuk import/susulan berikutnya, dst.)
async function tentukanPartBerikutnyaLangsir(targetIdLangsir) {
    let maxPart = 0;

    // Cek part yang sudah ada di layar / cache saat ini
    Object.entries(langsirCacheData || {}).forEach(([gKey, grp]) => {
        const p = ekstrakNomorPartLangsir(grp, gKey);
        if (p > maxPart) maxPart = p;
    });

    // Cek part yang sudah tersimpan di RTDB pada tanggal target
    if (targetIdLangsir && typeof firebase !== 'undefined' && firebase.database) {
        try {
            const snap = await firebase.database().ref(`data_langsir/${targetIdLangsir}`).once('value');
            if (snap.exists()) {
                if (maxPart < 1) maxPart = 1;
                const val = snap.val() || {};
                Object.values(val).forEach(it => {
                    const p = Number(it?.upload_session || 1);
                    if (p > maxPart) maxPart = p;
                });
            }
        } catch (e) {
            console.warn('Gagal memeriksa part arsip di RTDB:', e);
        }
    }

    return maxPart > 0 ? maxPart + 1 : 1;
}

// Fungsi Membaca File Excel (Satuan atau Multiple) - Langkah 1: Pisah per Part (P_1, P_2, dst.)
window.handleFileImportLangsir = async function(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    let maxPart = 0;

    // 1. Cek part tertinggi yang sudah ada di cache/layar saat ini
    Object.keys(langsirCacheData || {}).forEach(key => {
        const grp = langsirCacheData[key];
        const matchP = String(key).match(/_P(\d+)$/i);
        const matchS = String(key).match(/_S(\d+)$/i);
        const partDiGrp = Number(grp?.uploadSession || grp?.upload_session || 0);
        const partDiKey = matchP ? Number(matchP[1]) : (matchS ? Number(matchS[1]) : 0);
        const p = Math.max(partDiGrp, partDiKey);
        if (p > maxPart) maxPart = p;
    });

    // Jika di cache sudah ada kartu (misal hasil buka arsip P_1), minimal mulai dari part 1
    if (Object.keys(langsirCacheData || {}).length > 0 && maxPart < 1) {
        maxPart = 1;
    }

    // 2. Cek part tertinggi yang sudah tersimpan di RTDB untuk tanggal aktif / hari ini
    let targetIdLangsir = window.currentActiveArsipId;
    if (!targetIdLangsir) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        targetIdLangsir = `langsir_${yyyy}_${mm}_${dd}`;
    }

    if (typeof firebase !== 'undefined' && firebase.database && targetIdLangsir) {
        try {
            const snap = await firebase.database().ref(`data_langsir/${targetIdLangsir}`).once('value');
            if (snap.exists()) {
                if (maxPart < 1) maxPart = 1;
                const val = snap.val() || {};
                Object.values(val).forEach(it => {
                    const p = Number(it?.upload_session || 1);
                    if (p > maxPart) maxPart = p;
                });
            }
        } catch (err) {
            console.warn('Gagal cek part di RTDB:', err);
        }
    }

    const partBaru = maxPart + 1;
    let loadedCount = 0;
    let adaItemValid = false;

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
                adaItemValid = true;

                // Pakai kunci unik per kode & part agar tidak menimpa data lama
                const groupKey = `${kodeBarang}_P${partBaru}`;

                if (!langsirCacheData[groupKey]) {
                    langsirCacheData[groupKey] = {
                        kodeBarang: kodeBarang,
                        namaRasa: namaRasa,
                        uploadSession: partBaru,
                        items: []
                    };
                }

                langsirCacheData[groupKey].items.push({
                    KODE_LOKASI: kodeLokasi,
                    KODE: kodeBarang,
                    NAMA_BARANG: namaRasa,
                    STOK: stok,
                    EXPDATE: expdate,
                    BARCODE: barcode,
                    KODE_PALLET: kodePallet,
                    upload_session: partBaru
                });
            });

            loadedCount++;
        } catch (err) {
            console.error(`Gagal membaca file ${file.name}:`, err);
        }
    }

    event.target.value = '';

    if (loadedCount > 0 && adaItemValid) {
        if (typeof miuiAlert === 'function') {
            miuiAlert(`Berhasil mengimpor ${loadedCount} data rak WMS sebagai Part ${partBaru} (P_${partBaru})!`);
        }
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

// Render Kartu Preview (Grid 3 Kolom - Sorted Qty & Expdate, MIUI Custom Scroll, Tombol Hapus per Kartu & Support Badge Part P_1, P_2, dst.)
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
    keys.forEach(groupKey => {
        const group = langsirCacheData[groupKey];
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

        // Tentukan nomor part/sesi berdasarkan uploadSession / upload_session atau suffix _P1 / _S1 (default: 1 -> P_1)
        const matchKey = String(groupKey).match(/_(?:P|S)(\d+)$/i);
        const rawSession = Number(
            group.uploadSession ??
            group.upload_session ??
            items[0]?.upload_session ??
            items[0]?.uploadSession ??
            (matchKey ? matchKey[1] : 1)
        );
        const sessionNum = rawSession > 0 ? rawSession : 1;

        const kodeTampil = group.kodeBarang || String(groupKey).replace(/_(?:P|S)\d+$/i, '');
        const badgePartHtml = `<span class="bg-amber-700 text-amber-100 text-[10px] font-black px-1.5 py-0.5 rounded shadow-xs ml-2 uppercase tracking-wide border border-amber-600">P_${sessionNum}</span>`;

        html += `
            <div class="bg-white rounded-2xl shadow-sm border border-orange-200 flex flex-col overflow-hidden">
                <!-- Header Kartu dengan Tombol Hapus Khusus Kartu Ini -->
                <div class="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-white flex justify-between items-center">
                    <div>
                        <div class="flex items-center">
                            <h3 class="font-bold text-sm tracking-wide">${kodeTampil}</h3>
                            ${badgePartHtml}
                        </div>
                        <p class="text-[11px] text-orange-100 max-w-[150px] truncate">${group.namaRasa}</p>
                    </div>

                    <div class="flex items-center space-x-2">
                        <span class="bg-black/20 text-white text-[11px] font-black px-2.5 py-1 rounded-full backdrop-blur-sm tracking-wide shadow-inner">
                            TOTAL [${formattedTotalKrt} KRT] / ${totalLokasi} RAK
                        </span>

                        <!-- Tombol Hapus Seluruh Data pada Kartu Ini -->
                        <button onclick="hapusKartuLangsir('${groupKey}')" class="w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center transition shadow-sm" title="Hapus seluruh data kartu ${kodeTampil} P_${sessionNum} ini">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                </div>

                <!-- Daftar Baris Data dengan miui-custom-scroll dan ID unik agar posisi scroll terkunci -->
                <div id="scroll_container_${groupKey}" class="p-3 flex-1 overflow-y-auto max-h-[300px] divide-y divide-slate-100 miui-custom-scroll">
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
                            ${formatTampilExpdate(item.EXPDATE)}
                        </div>
                    </div>
                    
                    <!-- Tombol Hapus Baris Satuan -->
                    <button onclick="hapusItemLangsir('${groupKey}', ${index})" class="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl flex items-center justify-center transition shadow-sm flex-shrink-0" title="Hapus baris ini">
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

// Helper untuk mengubah tanggal (bisa format teks biasa atau nomor serial Excel seperti 47037)
function formatTampilExpdate(tgl) {
    if (!tgl) return '-';
    let tglStr = String(tgl).trim();

    // Jika berupa angka serial Excel (misal: 47037)
    if (!isNaN(tglStr) && !tglStr.includes('/') && !tglStr.includes('-')) {
        const excelEpoch = new Date(1899, 11, 30);
        const dateObj = new Date(excelEpoch.getTime() + (Number(tglStr) * 86400000));
        if (!isNaN(dateObj.getTime())) {
            let day = String(dateObj.getDate()).padStart(2, '0');
            let month = String(dateObj.getMonth() + 1).padStart(2, '0');
            let year = dateObj.getFullYear();
            return `${day}-${month}-${year}`;
        }
    }
    
    // Jika sudah format teks, kembalikan apa adanya
    return tglStr;
}

// Fungsi Hapus Seluruh Kartu Berdasarkan Kode Rasa yang Dipilih
window.hapusKartuLangsir = function(kodeRasa) {
    if (langsirCacheData[kodeRasa]) {
        delete langsirCacheData[kodeRasa];
        renderPreviewLangsir();
    }
};

window.hapusItemLangsir = function(kodeRasa, index) {
    if (langsirCacheData[kodeRasa] && langsirCacheData[kodeRasa].items) {
        // 1. Ambil posisi scroll saat ini
        const containerKartu = document.getElementById(`scroll_container_${kodeRasa}`);
        const currentScrollTop = containerKartu ? containerKartu.scrollTop : 0;

        // 2. Hapus item dari data cache
        langsirCacheData[kodeRasa].items.splice(index, 1);
        if (langsirCacheData[kodeRasa].items.length === 0) {
            delete langsirCacheData[kodeRasa];
        }

        // 3. Render ulang tampilan preview
        renderPreviewLangsir();

        // 4. Langsung kembalikan posisi scroll seketika tanpa jeda (0ms / sinkronus di microtask berikutnya)
        requestAnimationFrame(() => {
            const restoredContainer = document.getElementById(`scroll_container_${kodeRasa}`);
            if (restoredContainer) {
                restoredContainer.scrollTop = currentScrollTop;
            }
        });
    }
};

window.setModeTombolSimpanLangsir = function(isUpdateMode = false) {
    window.isModeUpdateLangsir = Boolean(isUpdateMode);

    // Cari tombol hijau "SIMPAN DATA" / "UPDATE DATA" di header subpageLangsir
    const subpage = document.getElementById('subpageLangsir') || document;
    const btn = subpage.querySelector('button[onclick*="simpanDataLangsirRTDB"]');
    if (!btn) return;

    if (isUpdateMode) {
        btn.innerHTML = `<i class="fa-solid fa-rotate"></i> <span>UPDATE DATA</span>`;
        btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700', 'bg-green-600', 'hover:bg-green-700');
        btn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        btn.title = "Simpan data lanjutan (P_2 / upload_session 2 dst.) ke arsip yang sedang dibuka";
    } else {
        btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> <span>SIMPAN DATA</span>`;
        btn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        btn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
        btn.title = "Simpan data langsir baru (upload_session 1)";
    }
};

window.simpanDataLangsirRTDB = async function() {
    const keys = Object.keys(langsirCacheData);
    if (keys.length === 0) {
        if (typeof miuiAlert === 'function') miuiAlert("Tidak ada data langsir yang dapat disimpan!");
        return;
    }

    const isUpdateMode = Boolean(window.isModeUpdateLangsir && window.currentActiveArsipId);

    // Tentukan target ID arsip
    let targetIdLangsir = window.currentActiveArsipId;
    if (!targetIdLangsir) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        targetIdLangsir = `langsir_${yyyy}_${mm}_${dd}`;
    }

    try {
        const dbRef = firebase.database().ref(`data_langsir/${targetIdLangsir}`);
        const snapshot = await dbRef.once('value');
        const sudahAdaDiDb = snapshot.exists();
        const existingData = sudahAdaDiDb ? snapshot.val() : {};

        // Mode SIMPAN DATA (awal / upload_session: 1)
        if (!isUpdateMode) {
            if (sudahAdaDiDb) {
                if (typeof miuiAlert === 'function') {
                    miuiAlert(`Arsip ${targetIdLangsir} sudah ada. Buka dari Arsip Langsir untuk menambah data lanjutan (UPDATE DATA).`);
                }
                return;
            }

            const payloadAwal = {};
            keys.forEach((groupKey, gIdx) => {
                const groupData = langsirCacheData[groupKey];
                if (!groupData || !Array.isArray(groupData.items)) return;

                const namaBarangGroup = groupData.namaRasa || groupData.kodeBarang || groupKey;

                groupData.items.forEach((item, idx) => {
                    const kodeBrg = String(item.KODE || groupData.kodeBarang || 'PRODUK').trim().toUpperCase();
                    const cleanRak = String(item.KODE_LOKASI || 'NORAK')
                        .trim()
                        .replace(/[\s\/\\#$\[\]\.]/g, '_')
                        .toUpperCase();

                    const nodeKey = `${kodeBrg}_${cleanRak}_S1_${gIdx}_${idx}`;
                    payloadAwal[nodeKey] = {
                        KODE_LOKASI: item.KODE_LOKASI,
                        KODE: kodeBrg,
                        NAMA_BARANG: item.NAMA_BARANG || namaBarangGroup,
                        STOK: Number(item.STOK || 0),
                        EXPDATE: item.EXPDATE,
                        BARCODE: item.BARCODE,
                        KODE_PALLET: item.KODE_PALLET,
                        upload_session: 1
                    };
                });
            });

            await dbRef.set(payloadAwal);

            if (typeof miuiAlert === 'function') {
                miuiAlert(`Data pertama (upload_session: 1 / P_1) berhasil disimpan pada ${targetIdLangsir}!`);
            }

            window.currentActiveArsipId = targetIdLangsir;
            langsirCacheData = {};
            window.setModeTombolSimpanLangsir(true);

            if (typeof window.pilihArsipLangsir === 'function') {
                await window.pilihArsipLangsir(targetIdLangsir);
            }
            return;
        }

        // Mode UPDATE DATA (setelah load riwayat: hanya simpan data lanjutan P_2 / upload_session 2 dst.)
        let maxSessionDiDb = 1;
        Object.values(existingData).forEach(item => {
            const s = Number(item?.upload_session || 1);
            if (s > maxSessionDiDb) maxSessionDiDb = s;
        });

        let payloadUpdate = { ...existingData };
        let jumlahLanjutanDisimpan = 0;
        let partLanjutanTertinggi = maxSessionDiDb;

        keys.forEach((groupKey, gIdx) => {
            const groupData = langsirCacheData[groupKey];
            if (!groupData || !Array.isArray(groupData.items) || groupData.items.length === 0) return;

            const matchKey = String(groupKey).match(/_(?:P|S)(\d+)$/i);
            let partNum = Number(
                groupData.uploadSession ??
                groupData.upload_session ??
                groupData.items[0]?.upload_session ??
                (matchKey ? matchKey[1] : 0)
            );

            // Jika belum ada nomor part eksplisit, tetapkan sebagai sesi lanjutan berikutnya (minimal 2 / P_2)
            if (!partNum || partNum <= 0) {
                partNum = maxSessionDiDb + 1;
            }

            // Lewati data yang sudah ada di DB (upload_session <= maxSessionDiDb) agar tidak diduplikasi
            if (partNum <= maxSessionDiDb) {
                return;
            }

            if (partNum > partLanjutanTertinggi) {
                partLanjutanTertinggi = partNum;
            }

            const namaBarangGroup = groupData.namaRasa || groupData.kodeBarang || groupKey;

            groupData.items.forEach((item, idx) => {
                const kodeBrg = String(item.KODE || groupData.kodeBarang || 'PRODUK').trim().toUpperCase();
                const cleanRak = String(item.KODE_LOKASI || 'NORAK')
                    .trim()
                    .replace(/[\s\/\\#$\[\]\.]/g, '_')
                    .toUpperCase();

                const nodeKey = `${kodeBrg}_${cleanRak}_S${partNum}_${gIdx}_${idx}`;
                payloadUpdate[nodeKey] = {
                    KODE_LOKASI: item.KODE_LOKASI,
                    KODE: kodeBrg,
                    NAMA_BARANG: item.NAMA_BARANG || namaBarangGroup,
                    STOK: Number(item.STOK || 0),
                    EXPDATE: item.EXPDATE,
                    BARCODE: item.BARCODE,
                    KODE_PALLET: item.KODE_PALLET,
                    upload_session: partNum
                };
                jumlahLanjutanDisimpan++;
            });
        });

        if (jumlahLanjutanDisimpan === 0) {
            if (typeof miuiAlert === 'function') {
                miuiAlert("Tidak ada data lanjutan baru (P_2 dst.) untuk di-update.");
            }
            return;
        }

        await dbRef.set(payloadUpdate);

        if (typeof miuiAlert === 'function') {
            miuiAlert(`Data lanjutan (upload_session: ${partLanjutanTertinggi} / P_${partLanjutanTertinggi}) berhasil di-update pada ${targetIdLangsir}!`);
        }

        langsirCacheData = {};
        if (typeof window.pilihArsipLangsir === 'function') {
            await window.pilihArsipLangsir(targetIdLangsir);
        }

    } catch (err) {
        console.error("Gagal menyimpan/update ke RTDB:", err);
        if (typeof miuiAlert === 'function') miuiAlert("Gagal menyimpan atau meng-update data langsir ke server.");
    }
};


// Toggle Popover Arsip Langsir
window.togglePopoverArsipLangsir = function(event) {
    event.stopPropagation();
    const popover = document.getElementById('popoverArsipLangsir');
    if (!popover) return;

    if (popover.classList.contains('hidden')) {
        popover.classList.remove('hidden');
        popover.classList.add('flex');

        // Kosongkan filter tanggal saat pertama kali dibuka agar seluruh riwayat arsip langsung terlihat
        const dateInput = document.getElementById('filterArsipLangsirTgl');
        if (dateInput) {
            dateInput.value = '';
        }
        loadArsipLangsirList();
    } else {
        tutupPopoverArsipLangsir();
    }
};

window.tutupPopoverArsipLangsir = function() {
    const popover = document.getElementById('popoverArsipLangsir');
    if (popover) {
        popover.classList.remove('flex');
        popover.classList.add('hidden');
    }
};

// Tutup popover jika klik di luar area
document.addEventListener('click', function(e) {
    const popover = document.getElementById('popoverArsipLangsir');
    if (popover && !popover.contains(e.target) && !e.target.closest('button[onclick*="togglePopoverArsipLangsir"]')) {
        tutupPopoverArsipLangsir();
    }
});

// Memuat Daftar Arsip dari RTDB dengan Format Nama LANGSIR dd/mm/yyyy & Filter Tanggal
window.loadArsipLangsirList = function() {
    const container = document.getElementById('containerListArsipLangsir');
    if (!container) return;

    container.innerHTML = `<div class="text-center py-6 text-slate-400 italic text-xs">Mengambil data arsip...</div>`;

    const inputFilterTgl = document.getElementById('filterArsipLangsirTgl');
    const selectedDate = inputFilterTgl ? inputFilterTgl.value : ''; // Format: YYYY-MM-DD dari input date

    firebase.database().ref('data_langsir').once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                container.innerHTML = `<div class="text-center py-10 text-slate-400 italic text-xs">Belum ada arsip tersimpan.</div>`;
                return;
            }

            const dataArsip = snapshot.val();
            let keys = Object.keys(dataArsip).sort().reverse(); // Urutkan terbaru di atas

            // Jika user memilih tanggal pada filter, saring kuncinya
            if (selectedDate) {
                // selectedDate format: "YYYY-MM-DD", ID arsip format: "langsir_YYYY_MM_DD"
                const targetIdPart = `langsir_${selectedDate.replace(/-/g, '_')}`;
                keys = keys.filter(id => id === targetIdPart);
            }

            if (keys.length === 0) {
                container.innerHTML = `<div class="text-center py-10 text-slate-400 italic text-xs">Tidak ada arsip pada tanggal tersebut.</div>`;
                return;
            }

            let html = '';
            keys.forEach(idLangsir => {
                let formattedTitle = idLangsir;
                const parts = idLangsir.split('_'); // ['langsir', '2026', '10', '26']
                if (parts.length === 4) {
                    formattedTitle = `LANGSIR ${parts[3]}/${parts[2]}/${parts[1]}`;
                }

                const itemsObj = dataArsip[idLangsir];
                const itemKeys = Object.keys(itemsObj);
                
                let totalKartonArsip = 0;
                itemKeys.forEach(k => {
                    totalKartonArsip += Number(itemsObj[k].STOK || 0);
                });

                html += `
                    <div onclick="pilihArsipLangsir('${idLangsir}')" class="bg-white border border-orange-200 rounded-xl p-2.5 shadow-xs hover:shadow-md hover:border-orange-400 cursor-pointer transition flex flex-col space-y-1.5 group">
                        <div class="flex justify-between items-center">
                            <span class="font-black text-slate-800 text-[11px] uppercase flex items-center gap-1.5 group-hover:text-orange-600 transition">
                                <i class="fa-solid fa-file-lines text-orange-500"></i> ${formattedTitle}
                            </span>
                            <span class="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                ${itemKeys.length} RAK / ${totalKartonArsip.toLocaleString('id-ID')} Krt
                            </span>
                        </div>
                        <div class="flex justify-between items-center pt-1 border-t border-slate-100">
                            <span class="text-[10px] text-slate-400 italic">Klik untuk muat ke preview</span>
                            <button onclick="event.stopPropagation(); cetakArsipLangsir('${idLangsir}')" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] flex items-center gap-1 shadow-sm transition-all">
                                <i class="fa-solid fa-print"></i> Cetak
                            </button>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        })
        .catch(err => {
            console.error("Gagal memuat arsip langsir:", err);
            container.innerHTML = `<div class="text-center py-6 text-red-500 text-xs">Gagal memuat arsip.</div>`;
        });
};

// Fungsi Opsional untuk Reset Filter Tanggal Arsip
window.resetFilterArsipLangsir = function() {
    const inputFilterTgl = document.getElementById('filterArsipLangsirTgl');
    if (inputFilterTgl) {
        inputFilterTgl.value = '';
    }
    window.loadArsipLangsirList();
};

window.pilihArsipLangsir = async function(idArsip) {
    if (!idArsip) return;

    try {
        const snapshot = await firebase.database().ref(`data_langsir/${idArsip}`).once('value');
        if (!snapshot.exists()) {
            if (typeof miuiAlert === 'function') miuiAlert("Data arsip tidak ditemukan!");
            return;
        }

        const dataItems = snapshot.val();
        let tempLangsirData = {};

        Object.keys(dataItems).forEach(key => {
            const item = dataItems[key];
            const kodeBarangBase = String(item.KODE || 'PRODUK').trim().toUpperCase();

            // Ambil nomor sesi/part dari item (default ke 1 -> P_1)
            const rawSession = Number(item.upload_session || 1);
            const sessionNum = rawSession > 0 ? rawSession : 1;

            // Kunci grup per kode & part (P_1, P_2, dst.) agar kartu tidak saling menimpa
            const groupKey = `${kodeBarangBase}_P${sessionNum}`;

            // Ambil nama barang asli (bersih tanpa teks tambahan)
            const namaBarangAsli = item.NAMA_BARANG || item.NAMA_RASA || item.NAMA || item.KODE || 'PRODUK';

            if (!tempLangsirData[groupKey]) {
                tempLangsirData[groupKey] = {
                    namaRasa: namaBarangAsli,
                    kodeBarang: kodeBarangBase,
                    uploadSession: sessionNum,
                    items: []
                };
            }

            tempLangsirData[groupKey].items.push({
                KODE_LOKASI: item.KODE_LOKASI,
                KODE: kodeBarangBase,
                NAMA_BARANG: namaBarangAsli,
                STOK: Number(item.STOK || 0),
                EXPDATE: item.EXPDATE,
                BARCODE: item.BARCODE,
                KODE_PALLET: item.KODE_PALLET,
                upload_session: sessionNum
            });
        });

        window.currentLangsirData = tempLangsirData;
        window.currentActiveArsipId = idArsip;
        if (typeof langsirCacheData !== 'undefined') {
            langsirCacheData = tempLangsirData;
        }

        // Ubah tombol simpan menjadi UPDATE DATA karena arsip sudah dimuat dari riwayat
        if (typeof window.setModeTombolSimpanLangsir === 'function') {
            window.setModeTombolSimpanLangsir(true);
        }

        // Header tanggal
        const badgeContainer = document.getElementById('badgeTanggalAktifContainer');
        if (badgeContainer) {
            badgeContainer.classList.remove('hidden');
            badgeContainer.classList.add('flex');
        }

        const labelEl = document.getElementById('label-tanggal-langsir');
        if (labelEl) {
            const parts = idArsip.split('_');
            if (parts.length === 4) {
                labelEl.innerText = `${parts[3]}/${parts[2]}/${parts[1]}`;
            } else {
                labelEl.innerText = idArsip;
            }
        }

        // Render ke tampilan
        if (typeof renderLangsir === 'function') {
            renderLangsir(tempLangsirData);
        } else if (typeof renderPreviewLangsir === 'function') {
            renderPreviewLangsir(tempLangsirData);
        }

        const modalArsip = document.getElementById('modalArsipLangsir');
        if (modalArsip) modalArsip.classList.add('hidden');

        const popoverArsip = document.getElementById('popoverArsipLangsir');
        if (popoverArsip) {
            popoverArsip.classList.remove('flex');
            popoverArsip.classList.add('hidden');
        }

    } catch (err) {
        console.error("Gagal memuat arsip langsir:", err);
        if (typeof miuiAlert === 'function') miuiAlert("Gagal memuat data arsip.");
    }
};


// Stack riwayat penghapusan untuk fitur Batal Hapus (Undo)
let riwayatHapusKartuLangsir = []; // Menyimpan snapshot kartu { groupKey, groupData }
let riwayatHapusRakLangsir = [];   // Menyimpan snapshot rak { groupKey, index, item, groupMeta }

function updateBadgeBatalHapusLangsir() {
    const jmlKartu = riwayatHapusKartuLangsir.length;
    const jmlRak = riwayatHapusRakLangsir.length;
    const total = jmlKartu + jmlRak;

    const badgeTotal = document.getElementById('badgeCountBatalHapusLangsir');
    if (badgeTotal) {
        badgeTotal.innerText = String(total);
        if (total > 0) {
            badgeTotal.classList.remove('hidden');
        } else {
            badgeTotal.classList.add('hidden');
        }
    }

    const elCountKartu = document.getElementById('countUndoKartuLangsir');
    if (elCountKartu) elCountKartu.innerText = String(jmlKartu);

    const elCountRak = document.getElementById('countUndoRakLangsir');
    if (elCountRak) elCountRak.innerText = String(jmlRak);

    const btnKartu = document.getElementById('btnUndoKartuLangsir');
    if (btnKartu) btnKartu.disabled = jmlKartu === 0;

    const btnRak = document.getElementById('btnUndoRakLangsir');
    if (btnRak) btnRak.disabled = jmlRak === 0;
}

window.togglePopoverBatalHapusLangsir = function(event) {
    if (event) event.stopPropagation();
    const popover = document.getElementById('popoverBatalHapusLangsir');
    if (!popover) return;

    updateBadgeBatalHapusLangsir();

    if (popover.classList.contains('hidden')) {
        popover.classList.remove('hidden');
        popover.classList.add('flex');
    } else {
        tutupPopoverBatalHapusLangsir();
    }
};

window.tutupPopoverBatalHapusLangsir = function() {
    const popover = document.getElementById('popoverBatalHapusLangsir');
    if (popover) {
        popover.classList.remove('flex');
        popover.classList.add('hidden');
    }
};

document.addEventListener('click', function(e) {
    const popover = document.getElementById('popoverBatalHapusLangsir');
    if (popover && !popover.contains(e.target) && !e.target.closest('#btnBatalHapusLangsir')) {
        tutupPopoverBatalHapusLangsir();
    }
});

// Fungsi Hapus Seluruh Kartu Berdasarkan GroupKey / Kode Barang (tercatat untuk Batal Hapus Kode Barang)
window.hapusKartuLangsir = function(groupKey) {
    if (langsirCacheData[groupKey]) {
        const snapshotGroup = {
            ...langsirCacheData[groupKey],
            items: Array.isArray(langsirCacheData[groupKey].items)
                ? langsirCacheData[groupKey].items.map(it => ({ ...it }))
                : []
        };

        riwayatHapusKartuLangsir.push({
            groupKey: groupKey,
            groupData: snapshotGroup
        });

        delete langsirCacheData[groupKey];
        updateBadgeBatalHapusLangsir();
        renderPreviewLangsir();
    }
};

// Fungsi Hapus Baris Rak Satuan (tercatat untuk Batal Hapus Rak)
window.hapusItemLangsir = function(groupKey, index) {
    if (langsirCacheData[groupKey] && Array.isArray(langsirCacheData[groupKey].items)) {
        const containerKartu = document.getElementById(`scroll_container_${groupKey}`);
        const currentScrollTop = containerKartu ? containerKartu.scrollTop : 0;

        const removedItem = langsirCacheData[groupKey].items[index];
        if (!removedItem) return;

        const groupMeta = {
            kodeBarang: langsirCacheData[groupKey].kodeBarang,
            namaRasa: langsirCacheData[groupKey].namaRasa,
            uploadSession: langsirCacheData[groupKey].uploadSession
        };

        riwayatHapusRakLangsir.push({
            groupKey: groupKey,
            index: index,
            item: { ...removedItem },
            groupMeta: groupMeta
        });

        langsirCacheData[groupKey].items.splice(index, 1);
        if (langsirCacheData[groupKey].items.length === 0) {
            delete langsirCacheData[groupKey];
        }

        updateBadgeBatalHapusLangsir();
        renderPreviewLangsir();

        requestAnimationFrame(() => {
            const restoredContainer = document.getElementById(`scroll_container_${groupKey}`);
            if (restoredContainer) {
                restoredContainer.scrollTop = currentScrollTop;
            }
        });
    }
};

// Mengembalikan seluruh data Kode Barang yang terakhir dihapus
window.batalHapusKodeBarangLangsir = function() {
    if (riwayatHapusKartuLangsir.length === 0) {
        if (typeof miuiAlert === 'function') miuiAlert("Tidak ada riwayat hapus kode barang untuk dibatalkan.");
        tutupPopoverBatalHapusLangsir();
        return;
    }

    const lastRemoved = riwayatHapusKartuLangsir.pop();
    const { groupKey, groupData } = lastRemoved;

    if (!langsirCacheData[groupKey]) {
        langsirCacheData[groupKey] = {
            ...groupData,
            items: Array.isArray(groupData.items) ? groupData.items.map(it => ({ ...it })) : []
        };
    } else {
        const existingItems = langsirCacheData[groupKey].items || [];
        const restoredItems = Array.isArray(groupData.items) ? groupData.items : [];
        langsirCacheData[groupKey].items = [...existingItems, ...restoredItems];
    }

    tutupPopoverBatalHapusLangsir();
    updateBadgeBatalHapusLangsir();
    renderPreviewLangsir();

    if (typeof miuiAlert === 'function') {
        const kodeLabel = groupData.kodeBarang || groupKey;
        miuiAlert(`Batal hapus berhasil: data kode barang ${kodeLabel} dikembalikan.`);
    }
};

// Mengembalikan baris Rak yang terakhir dihapus
window.batalHapusRakLangsir = function() {
    if (riwayatHapusRakLangsir.length === 0) {
        if (typeof miuiAlert === 'function') miuiAlert("Tidak ada riwayat hapus rak untuk dibatalkan.");
        tutupPopoverBatalHapusLangsir();
        return;
    }

    const lastRemovedRak = riwayatHapusRakLangsir.pop();
    const { groupKey, index, item, groupMeta } = lastRemovedRak;

    if (!langsirCacheData[groupKey]) {
        const matchKey = String(groupKey).match(/_(?:P|S)(\d+)$/i);
        const fallbackKode = groupMeta?.kodeBarang || String(groupKey).replace(/_(?:P|S)\d+$/i, '');
        const fallbackSession = groupMeta?.uploadSession || (matchKey ? Number(matchKey[1]) : 1);

        langsirCacheData[groupKey] = {
            kodeBarang: fallbackKode,
            namaRasa: groupMeta?.namaRasa || item.NAMA_BARANG || fallbackKode,
            uploadSession: fallbackSession,
            items: []
        };
    }

    const targetItems = langsirCacheData[groupKey].items;
    const insertPos = Math.max(0, Math.min(Number(index ?? targetItems.length), targetItems.length));
    targetItems.splice(insertPos, 0, { ...item });

    tutupPopoverBatalHapusLangsir();
    updateBadgeBatalHapusLangsir();
    renderPreviewLangsir();

    if (typeof miuiAlert === 'function') {
        const rakLabel = item.KODE_LOKASI || '-';
        miuiAlert(`Batal hapus berhasil: rak ${rakLabel} (${item.STOK || 0} Krt) dikembalikan.`);
    }
};

// 2. Membuka Popover Ubah Tanggal
window.bukaPopoverUbahTanggalLangsir = function() {
    const oldId = window.currentActiveArsipId;
    if (!oldId) {
        if (typeof miuiAlert === 'function') miuiAlert("Belum ada arsip langsir yang dipilih/dimuat!");
        return;
    }

    // Set tanggal default pada input date sesuai arsip aktif saat ini
    let defaultDateStr = new Date().toISOString().split('T')[0];
    const parts = oldId.split('_'); // ['langsir', 'YYYY', 'MM', 'DD']
    if (parts.length === 4) {
        defaultDateStr = `${parts[1]}-${parts[2]}-${parts[3]}`;
    }

    const inputTgl = document.getElementById('input-tanggal-baru-langsir');
    if (inputTgl) inputTgl.value = defaultDateStr;

    const modal = document.getElementById('modal-popover-ubah-langsir');
    if (modal) modal.classList.remove('hidden');
};

// 3. Menutup Popover Ubah Tanggal
window.tutupPopoverUbahTanggalLangsir = function() {
    const modal = document.getElementById('modal-popover-ubah-langsir');
    if (modal) modal.classList.add('hidden');
};

// 4. Eksekusi Simpan Perubahan Tanggal (Memindahkan data di Firebase RTDB ke ID & Tanggal Baru)
window.simpanPerubahanTanggalLangsir = async function() {
    const oldId = window.currentActiveArsipId;
    if (!oldId) {
        if (typeof miuiAlert === 'function') miuiAlert("Belum ada arsip aktif!");
        return;
    }

    const inputVal = document.getElementById('input-tanggal-baru-langsir')?.value;
    if (!inputVal) {
        if (typeof miuiAlert === 'function') miuiAlert("Silakan pilih tanggal baru terlebih dahulu.");
        return;
    }

    const cleanDate = inputVal.trim(); // Format: YYYY-MM-DD
    const newId = `langsir_${cleanDate.replace(/-/g, '_')}`;

    if (newId === oldId) {
        if (typeof miuiAlert === 'function') miuiAlert("Tanggal baru sama dengan tanggal arsip saat ini.");
        return;
    }

    try {
        const dbRef = firebase.database().ref();
        
        // Ambil data dari path lama di Firebase
        const oldSnapshot = await dbRef.child(`data_langsir/${oldId}`).once('value');
        if (!oldSnapshot.exists()) {
            if (typeof miuiAlert === 'function') miuiAlert("Data arsip lama tidak ditemukan!");
            return;
        }

        const arsipData = oldSnapshot.val();

        // Simpan data ke path/tanggal baru
        await dbRef.child(`data_langsir/${newId}`).set(arsipData);

        // Hapus data dari path/tanggal lama
        await dbRef.child(`data_langsir/${oldId}`).remove();

        // Perbarui state aktif ke ID baru
        window.currentActiveArsipId = newId;

        // Update tampilan label tanggal di badge header
        const labelEl = document.getElementById('label-tanggal-langsir');
        if (labelEl) {
            const dateParts = cleanDate.split('-'); // [YYYY, MM, DD]
            if (dateParts.length === 3) {
                labelEl.innerText = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
            }
        }

        // Tutup popover
        tutupPopoverUbahTanggalLangsir();

        if (typeof miuiAlert === 'function') {
            miuiAlert(`Tanggal arsip berhasil diubah ke ${cleanDate}!`);
        }

        // Refresh daftar arsip jika popover riwayat arsip terbuka
        if (typeof window.loadArsipLangsirList === 'function') {
            window.loadArsipLangsirList();
        }

    } catch (err) {
        console.error("Gagal mengubah tanggal arsip:", err);
        if (typeof miuiAlert === 'function') miuiAlert("Terjadi kesalahan saat mengubah tanggal arsip.");
    }
};

// Fungsi untuk menghapus arsip langsir yang sedang aktif dari Firebase RTDB menggunakan miuiConfirm
window.hapusArsipLangsirAktif = function() {
    const oldId = window.currentActiveArsipId;
    if (!oldId) {
        if (typeof miuiAlert === 'function') miuiAlert("Tidak ada data arsip langsir yang sedang aktif!");
        return;
    }

    const pesanKonfirmasi = `Apakah Anda yakin ingin menghapus permanen data langsir arsip [ ${oldId} ] ini?`;

    // Cek apakah miuiConfirm tersedia, gunakan callback untuk eksekusi
    if (typeof miuiConfirm === 'function') {
        miuiConfirm(pesanKonfirmasi, async () => {
            await eksekusiHapusArsip(oldId);
        });
    } else {
        // Fallback jika miuiConfirm tidak ada
        if (confirm(pesanKonfirmasi)) {
            eksekusiHapusArsip(oldId);
        }
    }
};

// Fungsi helper untuk proses hapus ke Firebase & reset tampilan
async function eksekusiHapusArsip(oldId) {
    try {
        const dbRef = firebase.database().ref();

        // Hapus data dari path Firebase
        await dbRef.child(`data_langsir/${oldId}`).remove();

        // Tutup popover
        tutupPopoverUbahTanggalLangsir();

        // Sembunyikan kembali badge tanggal aktif di header
        const badgeContainer = document.getElementById('badgeTanggalAktifContainer');
        if (badgeContainer) {
            badgeContainer.classList.remove('flex');
            badgeContainer.classList.add('hidden');
        }

        // Reset state global & tampilan utama
        window.currentActiveArsipId = null;
        window.currentLangsirData = {};
        if (typeof langsirCacheData !== 'undefined') {
            langsirCacheData = {};
        }

        // Render ulang tampilan agar kembali ke kondisi kosong ("Belum ada data langsir diimpor")
        if (typeof renderPreviewLangsir === 'function') {
            renderPreviewLangsir({});
        } else if (typeof renderLangsir === 'function') {
            renderLangsir({});
        }

        if (typeof miuiAlert === 'function') {
            miuiAlert(`Data arsip ${oldId} berhasil dihapus!`);
        }

        // Refresh daftar arsip di popover riwayat jika terbuka
        if (typeof window.loadArsipLangsirList === 'function') {
            window.loadArsipLangsirList();
        }

    } catch (err) {
        console.error("Gagal menghapus arsip langsir:", err);
        if (typeof miuiAlert === 'function') miuiAlert("Terjadi kesalahan saat menghapus data arsip.");
    }
}

// 2. Fungsi Cetak Arsip Langsung
window.cetakArsipLangsir = async function(tanggalArsip) {
    if (tanggalArsip) {
        // Muat data dulu ke variabel global, lalu cetak
        await window.pilihArsipLangsir(tanggalArsip);
    }
    
    if (typeof cetakDataLangsir === 'function') {
        cetakDataLangsir();
    } else {
        window.print();
    }
};

window.cetakDataLangsir = function() {
    const dataLangsir = window.currentLangsirData || langsirCacheData; 
    
    let formattedTitleDate = "LANGSIR";
    const activeId = window.currentActiveArsipId || "";
    const parts = activeId.split('_'); 
    if (parts.length === 4) {
        formattedTitleDate = `${parts[3]}/${parts[2]}/${parts[1]}`;
    } else {
        const labelText = document.getElementById('label-tanggal-langsir')?.innerText;
        if (labelText) formattedTitleDate = labelText;
    }

    if (!dataLangsir || Object.keys(dataLangsir).length === 0) {
        if (typeof miuiAlert === 'function') miuiAlert("Tidak ada data langsir untuk dicetak!");
        return;
    }

    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' };
    const tanggalCetakStr = now.toLocaleDateString('id-ID', options);
    const jamCetakStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const infoWaktuCetak = `Dicetak pada: ${tanggalCetakStr}, ${jamCetakStr}`;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
        miuiAlert("Mohon izinkan pop-up (pop-up blocker) di browser Anda untuk mencetak.");
        return;
    }

    let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cetak Langsir ${formattedTitleDate}</title>
            <style>
                @page {
                    size: 215mm 330mm portrait;
                    margin: 5mm 3mm;
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
                    width: 209mm;
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
                    margin-bottom: 6px;
                }
                .top-info-bar {
                    display: flex;
                    justify-content: flex-end;
                    font-size: 9px;
                    color: #000;
                    font-style: italic;
                    margin-bottom: 1px;
                }
                .header-title {
                    text-align: center;
                    font-size: 22px;
                    font-weight: 900;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                }
                .header-line {
                    border-bottom: 2.5px solid #000;
                    margin-top: 3px;
                }
                .grid-container {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                    flex: 1;
                    align-content: start;
                }
                .card {
                    border: none;
                    padding: 2px;
                    background: transparent;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                }
                .card-header {
                    background: #fff;
                    color: #000;
                    border: 2px solid #000;
                    padding: 4px 6px;
                    font-weight: 900;
                    border-radius: 3px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 4px;
                    font-size: 15px; 
                }
                .card-items {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .card-row {
                    display: grid;
                    grid-template-columns: 20px 1fr 18px 32px;
                    align-items: center;
                    background: #fff;
                    padding: 2.5px 4px;
                    border-radius: 2px;
                    border: 1.2px solid #000;
                    font-size: 15px; 
                }
                .row-no {
                    color: #000;
                    font-weight: bold;
                    font-size: 12px;
                    text-align: right;
                    padding-right: 3px;
                }
                .row-lokasi {
                    font-weight: bold;
                }
                .row-checkbox {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .checkbox-box {
                    width: 9.5px;
                    height: 9.5px;
                    border: 1.5px solid #000;
                    border-radius: 2px;
                    background: #fff;
                }
                .row-qty {
                    text-align: right;
                    font-weight: normal;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
    `;

    // Urutkan entries berdasarkan kunci agar kode barang & partnya berdampingan
    const entries = Object.entries(dataLangsir).sort((a, b) => a[0].localeCompare(b[0]));
    const kartuPerHalaman = 12; // 4 kolom x 3 baris per halaman

    for (let i = 0; i < entries.length; i += kartuPerHalaman) {
        const chunk = entries.slice(i, i + kartuPerHalaman);
        
        htmlContent += `
        <div class="page">
            <div class="header-container">
                <div class="top-info-bar">${infoWaktuCetak}</div>
                <div class="header-title">LANGSIR ${formattedTitleDate}</div>
                <div class="header-line"></div>
            </div>
            <div class="grid-container">
        `;

        chunk.forEach(([key, val]) => {
            const itemsList = Array.isArray(val) ? val : (val.items || []);
            
            // --- URUTKAN BERDASARKAN RAK (KODE_LOKASI) ---
            itemsList.sort((a, b) => {
                const rakA = String(a.KODE_LOKASI || a.sub || '').trim();
                const rakB = String(b.KODE_LOKASI || b.sub || '').trim();
                return rakA.localeCompare(rakB, undefined, { numeric: true, sensitivity: 'base' });
            });

            let totalKrtRak = 0;
            itemsList.forEach(it => {
                totalKrtRak += Number(it.STOK || it.val || 0);
            });

            // --- FORMAT LABEL KODE & PART (P_2, P_3, dst) ---
            let displayCode = key;
            const sessionNum = Number(val.uploadSession || 0);
            
            if (key.includes('_S')) {
                const partsKey = key.split('_S');
                const baseName = partsKey[0];
                const sNum = partsKey[1];
                displayCode = `${baseName} P_${sNum}`;
            } else if (sessionNum > 1) {
                displayCode = `${key} P_${sessionNum}`;
            }

            htmlContent += `
                <div class="card">
                    <div class="card-header">
                        <span>${displayCode}</span>
                        <span>= ${totalKrtRak}</span>
                    </div>
                    <div class="card-items">
            `;

            itemsList.forEach((row, index) => {
                const lokasi = row.KODE_LOKASI || row.sub || '-';
                const stok = row.STOK !== undefined ? row.STOK : (row.val || 0);
                
                htmlContent += `
                    <div class="card-row">
                        <span class="row-no">${index + 1}.</span>
                        <span class="row-lokasi">${lokasi}</span>
                        <div class="row-checkbox">
                            <div class="checkbox-box"></div>
                        </div>
                        <span class="row-qty">${stok}</span>
                    </div>
                `;
            });

            htmlContent += `
                    </div>
                </div>
            `;
        });

        htmlContent += `
            </div>
        </div>
        `;
    }

    htmlContent += `
        <script>
            window.onload = function() {
                window.print();
                setTimeout(function() {
                    window.close();
                }, 500);
            }
        </script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
};