// --- INISIALISASI MODUL RECALL ---
window.initRecall = function() {
    switchRecallSlide('cari');
    initRecallDefaultTanggal(); // Panggil fungsi inisialisasi tanggal hari ini di sini
};

// --- INISIALISASI DEFAULT TANGGAL HARI INI ---
function initRecallDefaultTanggal() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayFormatted = `${yyyy}-${mm}-${dd}`; // Format YYYY-MM-DD untuk input date HTML

    const inputMulai = document.getElementById('recallInputTglMulai');
    const inputSelesai = document.getElementById('recallInputTglSelesai');

    if (inputMulai && !inputMulai.value) {
        inputMulai.value = todayFormatted;
    }
    if (inputSelesai && !inputSelesai.value) {
        inputSelesai.value = todayFormatted;
    }
}

// Panggil fungsi ini di dalam fungsi init / saat modul Recall pertama kali dibuka
document.addEventListener('DOMContentLoaded', () => {
    initRecallDefaultTanggal();
});

// --- BUKA & TUTUP SUBPAGE RECALL ---
window.bukaSubPageRecall = function() {
    const subpage = document.getElementById('subpageRecall');
    if (subpage) {
        subpage.classList.remove('translate-x-full');
        if (typeof window.initRecall === 'function') {
            window.initRecall();
        }
    }
};

window.tutupSubPageRecall = function() {
    const subpage = document.getElementById('subpageRecall');
    if (subpage) subpage.classList.add('translate-x-full');
};

// Alias untuk kompatibilitas tombol di HTML
window.bukaSubpageRecall = window.bukaSubPageRecall;
window.tutupSubpageRecall = window.tutupSubPageRecall;

// --- SWITCH SLIDE MENGGUNAKAN EFEK SLIDER ---
window.switchRecallSlide = function(mode) {
    const slider = document.getElementById('slider-content-recall');
    if (!slider) return;

    const lowerMode = String(mode).toLowerCase();
    if (lowerMode === 'cari' || lowerMode === 'cair') {
        slider.style.transform = 'translateX(0%)';
    } else if (lowerMode === 'detail') {
        slider.style.transform = 'translateX(-50%)';
    }
};

// --- FUNGSI PENCARIAN REKAP KARTU STOK (SLIDE 1) ---
window.jalankanPencarianRecall = function() {
    const kodeCari = document.getElementById('recallInputKode').value.trim().toUpperCase();
    const tglMulai = document.getElementById('recallInputTglMulai').value; // Format: YYYY-MM-DD
    const tglSelesai = document.getElementById('recallInputTglSelesai').value; // Format: YYYY-MM-DD

    if (!kodeCari) {
        miuiAlert("Masukkan kode barang terlebih dahulu!");
        return;
    }

    const btnCari = document.querySelector("button[onclick*='jalankanPencarianRecall']") || event.target;
    let originalHtml = "";
    
    if (btnCari) {
        originalHtml = btnCari.innerHTML;
        btnCari.disabled = true;
        btnCari.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg> Mencari data...`;
    }

    // Ambil data rekap dari Firebase RTDB node 'recall_cache/rekap'
    firebase.database().ref('recall_cache/rekap').once('value')
        .then(snapshot => {
            const allRekap = snapshot.val();
            
            if (btnCari) {
                btnCari.disabled = false;
                btnCari.innerHTML = originalHtml;
            }

            if (!allRekap) {
                miuiAlert("Data cache Recall belum tersedia. Jalankan skrip sinkronisasi terlebih dahulu.");
                return;
            }

            const dataArray = Array.isArray(allRekap) ? allRekap : Object.values(allRekap);

            // Filter berdasarkan KODE barang atau BARCODE
            let hasilFilter = dataArray.filter(item => {
                const matchKode = item.KODE && String(item.KODE).toUpperCase().includes(kodeCari);
                const matchBarcode = item.BARCODE && String(item.BARCODE).toUpperCase() === kodeCari;
                return matchKode || matchBarcode;
            });

            // Filter berdasarkan Rentang Tanggal Produksi dari KODE_PALLET
            if (tglMulai || tglSelesai) {
                const dateMulai = tglMulai ? new Date(tglMulai) : null;
                const dateSelesai = tglSelesai ? new Date(tglSelesai) : null;

                hasilFilter = hasilFilter.filter(item => {
                    if (!item.KODE_PALLET) return false;
                    
                    // Contoh KODE_PALLET: "JP-202401001;01;MRR4A10;02/01/2024;3 A 30"
                    const palletParts = String(item.KODE_PALLET).split(';');
                    if (palletParts.length >= 4) {
                        const tglPalletStr = palletParts[3].trim(); // Format "DD/MM/YYYY"
                        const partsTgl = tglPalletStr.split('/');
                        if (partsTgl.length === 3) {
                            // Konversi ke format Date standar (YYYY-MM-DD)
                            const datePallet = new Date(`${partsTgl[2]}-${partsTgl[1]}-${partsTgl[0]}`);

                            if (isNaN(datePallet)) return false;

                            if (dateMulai && datePallet < dateMulai) return false;
                            if (dateSelesai && datePallet > dateSelesai) return false;

                            return true;
                        }
                    }
                    return false;
                });
            }

            // Jika hasil pencarian kosong, tampilkan miuiAlert
            if (hasilFilter.length === 0) {
                miuiAlert("Kode barang di rentang tanggal yang dipilih tidak ditemukan.");
            }

            renderTabelRecallCari(hasilFilter);
        })
        .catch(error => {
            if (btnCari) {
                btnCari.disabled = false;
                btnCari.innerHTML = originalHtml;
            }
            console.error("Error pencarian recall:", error);
            miuiAlert("Gagal mengambil data dari Firebase!");
        });
};

// --- RENDER TABEL REKAP (SLIDE 1) & HITUNG TOTAL STOK ---
function renderTabelRecallCari(dataList) {
    const tbody = document.getElementById('tabelBodyRecallCari');
    const infoBaris = document.getElementById('recallInfoBaris');
    const totalStokBadge = document.getElementById('recallTotalStok');

    if (!dataList || dataList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-10 text-slate-400 italic">Tidak ada data rekap ditemukan untuk kode tersebut.</td></tr>`;
        if (infoBaris) infoBaris.innerText = "Menampilkan 0 data";
        if (totalStokBadge) totalStokBadge.innerText = "0 Karton";
        return;
    }

    let html = "";
    let akumulasiStok = 0;

    dataList.forEach((item) => {
        const stokVal = Number(item.STOK || 0);
        akumulasiStok += stokVal;

        html += `
            <tr class="hover:bg-orange-50/50 transition cursor-pointer" onclick="bukaDetailRecallBarcode('${item.BARCODE}')">
                <td class="p-2.5 border-b border-slate-200 font-bold text-slate-800">${item.BARCODE || '-'}</td>
                <td class="p-2.5 border-b border-slate-200 text-slate-600 font-mono text-[11px]">${item.KODE_PALLET || '-'}</td>
                <td class="p-2.5 border-b border-slate-200 text-center font-bold text-emerald-600">${item.IN || 0}</td>
                <td class="p-2.5 border-b border-slate-200 text-center font-bold text-rose-600">${item.OUT || 0}</td>
                <td class="p-2.5 border-b border-slate-200 text-center text-slate-600">${item.KOR_PLUS || 0}</td>
                <td class="p-2.5 border-b border-slate-200 text-center text-slate-600">${item.KOR_MINUS || 0}</td>
                <td class="p-2.5 border-b border-slate-200 text-center font-black text-slate-900">${stokVal}</td>
                <td class="p-2.5 border-b border-slate-200 text-center font-bold text-slate-700">${item.EXPDATE || '-'}</td>
                <td class="p-2.5 border-b border-slate-200 text-center">
                    <button onclick="bukaDetailRecallBarcode('${item.BARCODE}', '${item.KODE_PALLET}')" class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-1 px-3 rounded text-xs transition">
                        DETAIL
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    if (infoBaris) infoBaris.innerText = `Menampilkan ${dataList.length} data`;
    if (totalStokBadge) totalStokBadge.innerText = `${akumulasiStok} Karton`;
}

// --- FUNGSI KETIKA TOMBOL DETAIL DIKLIK (PINDAH KE SLIDE 2 & FILTER BARCODE) ---
window.bukaDetailRecallBarcode = function(barcodeTarget, kodePalletTarget = null) {
    // Pindah slide ke Detail Masuk / Keluar (-50%)
    window.switchRecallSlide('detail');
    
    // Perbarui radio button tab di header agar sinkron secara visual
    const radioDetail = document.querySelector('input[name="rb-recall-slide"][value="detail"]');
    if (radioDetail) radioDetail.checked = true;

    // --- RESET TABEL DETAIL SEGERA AGAR DATA LAMA TIDAK NYANGKUT ---
    const tbodyDetail = document.getElementById('tabelBodyRecallDetail');
    if (tbodyDetail) {
        tbodyDetail.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-slate-400 font-semibold animate-pulse"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Memuat rincian transaksi untuk Barcode ${barcodeTarget}...</td></tr>`;
    }

    // Ambil data detail DAN rekap secara bersamaan dari Firebase RTDB
    Promise.all([
        firebase.database().ref('recall_cache/detail').once('value'),
        firebase.database().ref('recall_cache/rekap').once('value')
    ])
    .then(async ([snapshotDetail, snapshotRekap]) => {
        const allDetail = snapshotDetail.val();
        const allRekap = snapshotRekap.val();

        const detailArray = allDetail ? (Array.isArray(allDetail) ? allDetail : Object.values(allDetail)) : [];
        const rekapArray = allRekap ? (Array.isArray(allRekap) ? allRekap : Object.values(allRekap)) : [];

        const targetClean = String(barcodeTarget || '').trim().toUpperCase();
        const palletTargetClean = String(kodePalletTarget || '').trim();

        // 1. Filter rincian transaksi berdasarkan BARCODE
        let filteredDetail = detailArray.filter(item => {
            const itemBarcode = String(item.BARCODE || '').trim().toUpperCase();
            return itemBarcode === targetClean;
        });

        // 2. Cari baris rekap yang spesifik sesuai Barcode & Kode Palet yang diklik
        let matchingRekap = null;
        if (palletTargetClean) {
            matchingRekap = rekapArray.find(r => 
                String(r.BARCODE || '').trim().toUpperCase() === targetClean &&
                String(r.KODE_PALLET || '').trim() === palletTargetClean
            );
        }
        if (!matchingRekap) {
            // Fallback cari berdasarkan barcode saja jika pallet tidak ditemukan
            matchingRekap = rekapArray.find(r => String(r.BARCODE || '').trim().toUpperCase() === targetClean);
        }

        // 3. Jika data rekap ditemukan dan memiliki selisih koreksi
        if (matchingRekap) {
            // Cek berbagai variasi nama key koreksi dari backend/cache
            const korMinus = Number(matchingRekap.KOR_MINUS || matchingRekap.KOR_NEGATIF || matchingRekap['KOR(-)'] || 0);
            const korPlus = Number(matchingRekap.KOR_PLUS || matchingRekap.KOR_POSITIF || matchingRekap['KOR(+)'] || 0);

            if (korMinus > 0 || korPlus > 0) {
                // Coba cari ke muat_fdn terlebih dahulu
                const fdnResults = await fetchMuatFdnForCorrection(matchingRekap);
                
                if (fdnResults && fdnResults.length > 0) {
                    filteredDetail = filteredDetail.concat(fdnResults);
                } else {
                    // Jika tidak ketemu di FDN, tambahkan baris manual sebagai keterangan peringatan
                    if (korMinus > 0) {
                        filteredDetail.push({
                            KODE_TRANS: 'KOR(-)',
                            TANGGAL: '-',
                            KODE_PALLET: matchingRekap.KODE_PALLET || '-',
                            IN: 0,
                            OUT: korMinus,
                            BARCODE: barcodeTarget,
                            NAMA_CUSTOMER: 'Tidak ditemukan data FDN untuk rak tersebut (Cari manual / data langsiran)',
                            KOTA_SHIPPING: 'MANUAL / LANGSIRAN'
                        });
                    }
                    if (korPlus > 0) {
                        filteredDetail.push({
                            KODE_TRANS: 'KOR(+)',
                            TANGGAL: '-',
                            KODE_PALLET: matchingRekap.KODE_PALLET || '-',
                            IN: korPlus,
                            OUT: 0,
                            BARCODE: barcodeTarget,
                            NAMA_CUSTOMER: 'Tidak ditemukan data FDN untuk rak tersebut (Cari manual / data langsiran)',
                            KOTA_SHIPPING: 'MANUAL / LANGSIRAN'
                        });
                    }
                }
            }
        }

        // --- 4. URUTKAN DATA: PIN dulu, lalu DO/Koreksi, urut berdasarkan Tanggal ---
        filteredDetail.sort((a, b) => {
            const kodeA = String(a.KODE_TRANS || '').toUpperCase();
            const kodeB = String(b.KODE_TRANS || '').toUpperCase();

            const isPinA = kodeA.startsWith('PIN') ? 0 : 1;
            const isPinB = kodeB.startsWith('PIN') ? 0 : 1;

            if (isPinA !== isPinB) {
                return isPinA - isPinB;
            }

            const tglA = parseTanggalCustom(a.TANGGAL);
            const tglB = parseTanggalCustom(b.TANGGAL);

            return tglA - tglB;
        });

        renderTabelRecallDetail(filteredDetail, barcodeTarget);
    })
    .catch(error => {
        console.error("Gagal memuat detail recall:", error);
        miuiAlert("Gagal memuat data detail.");
    });
};

// Helper untuk mengubah string tanggal "DD/MM/YYYY" ke timestamp angka
function parseTanggalCustom(tglStr) {
    if (!tglStr) return 0;
    const cleanStr = String(tglStr).trim().split(' ')[0]; // Ambil tanggalnya saja
    const parts = cleanStr.split('/');
    if (parts.length === 3) {
        const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    }
    return 0;
}

// --- RENDER TABEL DETAIL (SLIDE 2) ---
function renderTabelRecallDetail(detailList, barcode) {
    const tbodyDetail = document.getElementById('tabelBodyRecallDetail');
    
    if (!tbodyDetail) return;

    if (!detailList || detailList.length === 0) {
        tbodyDetail.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-slate-400 italic">Tidak ada rincian transaksi untuk Barcode: ${barcode}</td></tr>`;
        return;
    }

    let html = "";
    // Di dalam renderTabelRecallDetail:
    detailList.forEach((item) => {
        let isKoreksiFdn = String(item.KODE_TRANS || '').startsWith('KOR-FDN');
        let trClass = isKoreksiFdn ? "bg-orange-50/80 hover:bg-orange-100/70 cursor-pointer font-semibold transition" : "hover:bg-orange-50/50 transition";
        
        // --- AMBIL KODE BARANG & LOKASI RAK SECARA PRESISI DARI KODE_PALLET ---
        let kodeBrgTarget = item.KODEBRG || item.KODE || '';
        let rakTarget = '';

        if (item.KODE_PALLET) {
            const pParts = String(item.KODE_PALLET).split(';');
            if (pParts.length >= 3 && !kodeBrgTarget) {
                kodeBrgTarget = pParts[2].trim(); // Ambil CRR4A04 dari elemen ke-3
            }
            if (pParts.length >= 5) {
                rakTarget = pParts[4].trim(); // Ambil lokasi rak (misal 10 C 11)
            }
        }

        let onclickAttr = isKoreksiFdn ? `onclick="bukaModalKoreksiFdn('${item.KODEBRG || item.KODE || 'CRR4A01'}', '${item.TANGGAL}', '${rakTarget}')"` : '';

        html += `
            <tr class="${trClass}" ${onclickAttr}>
                <td class="p-2.5 border-b border-slate-200 font-bold text-slate-800">
                    ${item.KODE_TRANS || '-'} ${isKoreksiFdn ? '<span class="text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded ml-1">Klik Detail</span>' : ''}
                </td>
                <td class="p-2.5 border-b border-slate-200 text-center text-slate-600">${item.TANGGAL || '-'}</td>
                <td class="p-2.5 border-b border-slate-200 text-slate-700 font-mono text-xs">${item.KODE_PALLET || '-'}</td>
                <td class="p-2.5 border-b border-slate-200 text-center font-bold text-emerald-600">${item.IN || 0}</td>
                <td class="p-2.5 border-b border-slate-200 text-center font-bold text-rose-600">${item.OUT || 0}</td>
                <td class="p-2.5 border-b border-slate-200 font-bold text-slate-700">${item.BARCODE || '-'}</td>
                <td class="p-2.5 border-b border-slate-200 font-bold text-slate-800">${item.NAMA_CUSTOMER || item.CUSTOMER || '-'}</td>
                <td class="p-2.5 border-b border-slate-200 text-slate-600">${item.KOTA_SHIPPING || item.SHIPPING || '-'}</td>
            </tr>
        `;
    });

    tbodyDetail.innerHTML = html;
}

// --- FUNGSI TAMBAHAN: MELACAK KOR(-) DI MUAT_FDN ---
async function fetchMuatFdnForCorrection(itemRekap) {
    if (!itemRekap || !itemRekap.KODE_PALLET || !itemRekap.KOR_MINUS || Number(itemRekap.KOR_MINUS) <= 0) {
        return [];
    }

    const palletParts = String(itemRekap.KODE_PALLET).split(';');
    if (palletParts.length < 5) return [];

    const kodeBrg = palletParts[2].trim(); // Contoh: "CRR4A01"
    const tglProdStr = palletParts[3].trim(); // Contoh: "19/10/2026"
    const lokasiRak = palletParts[4].trim(); // Contoh: "9 C 08"
    const targetQty = Number(itemRekap.KOR_MINUS); // Contoh: 2

    // Parse tanggal produksi (DD/MM/YYYY) ke object Date
    const partsTgl = tglProdStr.split('/');
    if (partsTgl.length !== 3) return [];
    
    let startDate = new Date(`${partsTgl[2]}-${partsTgl[1]}-${partsTgl[0]}`);
    let endDate = new Date(); // Hari ini

    if (isNaN(startDate.getTime())) return [];

    let matchedResults = [];
    let currentDate = new Date(startDate);

    // Loop per hari dari tanggal produksi sampai hari ini untuk mencocokkan node muat_fdn/{yyyymmdd}/ambilrak
    while (currentDate <= endDate) {
        const yyyy = currentDate.getFullYear();
        const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dd = String(currentDate.getDate()).padStart(2, '0');
        const dateKey = `${yyyy}${mm}${dd}`; // Format YYYYMMDD

        try {
            const snapshot = await firebase.database().ref(`muat_fdn/${dateKey}/ambilrak`).once('value');
            const dataAmbilRak = snapshot.val();

            if (dataAmbilRak) {
                const listAmbil = Array.isArray(dataAmbilRak) ? dataAmbilRak : Object.values(dataAmbilRak);
                
                listAmbil.forEach(entry => {
                    if (!entry) return;
                    const entryKode = String(entry.kode || '').trim().toUpperCase();
                    const entryLokasi = String(entry.lokasi || '').trim().toUpperCase();
                    const entryQty = Number(entry.qtyAmbil || 0);

                    // Cocokkan kode barang, lokasi rak, dan qty ambil dengan KOR(-)
                    if (entryKode.includes(kodeBrg.toUpperCase()) && 
                        entryLokasi === lokasiRak.toUpperCase() && 
                        entryQty === targetQty) {
                        
                        matchedResults.push({
                            KODE_TRANS: `KOR-FDN (${dateKey})`,
                            TANGGAL: `${dd}/${mm}/${yyyy}`,
                            KODE_PALLET: itemRekap.KODE_PALLET,
                            KODEBRG: kodeBrg, // Simpan KODEBRG spesifik item ini (misal: "CRR4A04")
                            IN: 0,
                            OUT: entryQty,
                            BARCODE: itemRekap.BARCODE || '-',
                            NAMA_CUSTOMER: `Koreksi Rak (${entryLokasi})`,
                            KOTA_SHIPPING: 'MUAT FDN'
                        });
                    }
                });
            }
        } catch (err) {
            console.error(`Gagal mengambil muat_fdn untuk tanggal ${dateKey}:`, err);
        }

        // Lanjut ke hari berikutnya
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return matchedResults;
}

// --- FUNGSI MODAL KOREKSI FDN ---
window.tutupModalKoreksi = function() {
    const modal = document.getElementById('modalInfoKoreksi');
    if (modal) modal.classList.add('hidden');
};

// --- FUNGSI MODAL KOREKSI FDN (DENGAN HIGHLIGHT RAK TARGET) ---
window.bukaModalKoreksiFdn = async function(kodeBrg, tanggalMuatStr, rakHighlight = '') {
    const modal = document.getElementById('modalInfoKoreksi');
    if (!modal) return;

    // --- RESET JUDUL & TABEL MODAL TERLEBIH DAHULU ---
    document.getElementById('modalInfoKodeBrg').innerText = `Kode Barang: ${kodeBrg}`;
    document.getElementById('modalInfoTanggalMuat').innerText = `Tanggal Muat: ${tanggalMuatStr}`;
    
    const tbodyRak = document.getElementById('modalTabelRakBody');
    const tbodyDn = document.getElementById('modalTabelDnBody');

    tbodyRak.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-slate-400 italic">Memuat data rak...</td></tr>`;
    tbodyDn.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-slate-400 italic">Memuat data DN...</td></tr>`;

    modal.classList.remove('hidden');

    // Konversi tanggal "DD/MM/YYYY" ke "YYYYMMDD"
    const parts = tanggalMuatStr.split('/');
    if (parts.length !== 3) return;
    const dateKey = `${parts[2]}${parts[1]}${parts[0]}`;

    try {
        const snapshot = await firebase.database().ref(`muat_fdn/${dateKey}`).once('value');
        const fdnData = snapshot.val();

        if (!fdnData) {
            tbodyRak.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-slate-400 italic">Data rak tidak ditemukan.</td></tr>`;
            tbodyDn.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-slate-400 italic">Data DN tidak ditemukan.</td></tr>`;
            return;
        }

        // 1. Ambil data Pengambilan Rak dari node 'ambilrak'
        let rakResults = [];
        if (fdnData.ambilrak) {
            const listAmbil = Array.isArray(fdnData.ambilrak) ? fdnData.ambilrak : Object.values(fdnData.ambilrak);
            listAmbil.forEach(item => {
                if (item && String(item.kode || '').trim().toUpperCase() === kodeBrg.toUpperCase()) {
                    rakResults.push({
                        lokasi: item.lokasi || '-',
                        qtyAmbil: item.qtyAmbil || 0,
                        wms: 'WH-2'
                    });
                }
            });
        }

        if (rakResults.length > 0) {
            let rakHtml = "";
            const cleanHighlight = String(rakHighlight || '').trim().toUpperCase();

            rakResults.forEach(r => {
                const isMatch = cleanHighlight && String(r.lokasi).trim().toUpperCase() === cleanHighlight;
                
                // Baris yang disorot beri bg orange tipis, baris biasa beri teks jelas (text-slate-800)
                const rowStyle = isMatch 
                    ? 'bg-orange-100/80 border-l-4 border-l-orange-500 font-bold text-orange-950' 
                    : 'border-b border-slate-200 hover:bg-slate-50 text-slate-800 font-medium';

                rakHtml += `
                    <tr class="${rowStyle}">
                        <td class="p-2.5 font-bold ${isMatch ? 'text-orange-950' : 'text-slate-800'}">
                            ${r.lokasi} 
                            ${isMatch ? '<span class="ml-2 text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded-full font-normal">✓</span>' : ''}
                        </td>
                        <td class="p-2.5 text-center font-bold ${isMatch ? 'text-orange-700' : 'text-slate-800'}">${r.qtyAmbil} Krt</td>
                        <td class="p-2.5 text-center font-semibold ${isMatch ? 'text-orange-900' : 'text-slate-700'}">${r.wms}</td>
                    </tr>
                `;
            });
            tbodyRak.innerHTML = rakHtml;
        } else {
            tbodyRak.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-slate-400 italic">Tidak ada rincian rak untuk kode ini.</td></tr>`;
        }

        // 2. Ambil data Alokasi DN dari node 'datatujuan'
        let dnResults = [];
        if (fdnData.datatujuan) {
            const tujuanObj = fdnData.datatujuan;
            Object.keys(tujuanObj).forEach(keyTujuan => {
                const tujuanNode = tujuanObj[keyTujuan];
                if (tujuanNode && tujuanNode.data) {
                    const listDataItems = Array.isArray(tujuanNode.data) ? tujuanNode.data : Object.values(tujuanNode.data);
                    
                    listDataItems.forEach(it => {
                        if (it && String(it.kode || '').trim().toUpperCase() === kodeBrg.toUpperCase()) {
                            let noDn = keyTujuan.split('_').pop() || '-';
                            let namaTujuan = keyTujuan.replace(`_${noDn}`, '').replace(/_/g, ' ') || '-';

                            dnResults.push({
                                noDn: noDn,
                                tujuan: namaTujuan,
                                qty: it.qty_utama || it.qty || 0
                            });
                        }
                    });
                }
            });
        }

        if (dnResults.length > 0) {
            let dnHtml = "";
            dnResults.forEach(d => {
                dnHtml += `
                    <tr class="border-b border-slate-100 hover:bg-slate-50">
                        <td class="p-2.5 font-bold text-orange-600">${d.noDn}</td>
                        <td class="p-2.5 font-medium text-slate-800">${d.tujuan}</td>
                        <td class="p-2.5 text-center font-bold text-slate-700">${d.qty} Krt</td>
                    </tr>
                `;
            });
            tbodyDn.innerHTML = dnHtml;
        } else {
            tbodyDn.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-slate-400 italic">Tidak ada data DN terkait untuk kode ini.</td></tr>`;
        }

    } catch (err) {
        console.error("Gagal memuat rincian FDN untuk modal:", err);
        miuiAlert("Gagal memuat rincian data FDN.");
    }
};

// --- FUNGSI RESET PENCARIAN ---
window.resetPencarianRecall = function() {
    document.getElementById('recallInputKode').value = '';
    document.getElementById('recallInputTglMulai').value = '';
    document.getElementById('recallInputTglSelesai').value = '';
    document.getElementById('recallTotalStok').innerText = '0 Karton';
    
    const tbody = document.getElementById('tabelBodyRecallCari');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-10 text-slate-400 italic">Silakan masukkan kode barang dan rentang tanggal untuk mencari data.</td></tr>`;
    }
};

// --- EXPORT DETAIL RECALL KE EXCEL ---
window.exportDetailRecallExcel = function() {
    miuiAlert("Fitur Export Excel Detail Recall siap disesuaikan dengan kebutuhan laporan.");
};