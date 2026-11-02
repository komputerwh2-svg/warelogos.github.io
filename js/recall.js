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

// Variabel global untuk menyimpan cache hasil pencarian terakhir
let recallLastFilterCache = {
    rekap: [],
    detail: []
};

// Variabel penyimpan master data hasil pencarian rekap terakhir sebelum difilter
let masterRecallRekapList = [];

// --- FUNGSI PENCARIAN REKAP KARTU STOK (SLIDE 1) DENGAN CACHE REKAP & DETAIL LENGKAP + LANGSIR RTDB ---
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

    // Ambil data rekap dan detail secara bersamaan dari Firebase RTDB
    Promise.all([
        firebase.database().ref('recall_cache/rekap').once('value'),
        firebase.database().ref('recall_cache/detail').once('value')
    ])
    .then(async ([snapshotRekap, snapshotDetail]) => {
        const allRekap = snapshotRekap.val();
        const allDetail = snapshotDetail.val();
        
        if (btnCari) {
            btnCari.disabled = false;
            btnCari.innerHTML = originalHtml;
        }

        if (!allRekap) {
            miuiAlert("Data cache Recall belum tersedia. Jalankan skrip sinkronisasi terlebih dahulu.");
            return;
        }

        const dataRekapArray = Array.isArray(allRekap) ? allRekap : Object.values(allRekap);
        const dataDetailArray = allDetail ? (Array.isArray(allDetail) ? allDetail : Object.values(allDetail)) : [];

        // 1. Filter Rekap berdasarkan KODE barang atau BARCODE
        let hasilFilterRekap = dataRekapArray.filter(item => {
            const matchKode = item.KODE && String(item.KODE).toUpperCase().includes(kodeCari);
            const matchBarcode = item.BARCODE && String(item.BARCODE).toUpperCase() === kodeCari;
            return matchKode || matchBarcode;
        });

        // Filter berdasarkan Rentang Tanggal Produksi dari KODE_PALLET
        if (tglMulai || tglSelesai) {
            const dateMulai = tglMulai ? new Date(tglMulai) : null;
            const dateSelesai = tglSelesai ? new Date(tglSelesai) : null;

            hasilFilterRekap = hasilFilterRekap.filter(item => {
                if (!item.KODE_PALLET) return false;
                
                const palletParts = String(item.KODE_PALLET).split(';');
                if (palletParts.length >= 4) {
                    const tglPalletStr = palletParts[3].trim(); // Format "DD/MM/YYYY"
                    const partsTgl = tglPalletStr.split('/');
                    if (partsTgl.length === 3) {
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

        if (hasilFilterRekap.length === 0) {
            miuiAlert("Kode barang di rentang tanggal yang dipilih tidak ditemukan.");
        }

        // 2. Kumpulkan Rincian Detail + Lacak Otomatis Koreksi FDN & Langsir RTDB untuk SEMUA Item Rekap yang Lolos Filter
        let collectedDetails = [];

        for (const itemRekap of hasilFilterRekap) {
            const barcodeTarget = String(itemRekap.BARCODE || '').trim().toUpperCase();
            
            // Ambil mutasi dasar (PIN & DO)
            let matchedDetails = dataDetailArray.filter(d => 
                String(d.BARCODE || '').trim().toUpperCase() === barcodeTarget
            );

            // Cek apakah ada selisih koreksi
            const korMinus = Number(itemRekap.KOR_MINUS || itemRekap.KOR_NEGATIF || itemRekap['KOR(-)'] || 0);
            const korPlus = Number(itemRekap.KOR_PLUS || itemRekap.KOR_POSITIF || itemRekap['KOR(+)'] || 0);

            if (korMinus > 0 || korPlus > 0) {
                // A. Panggil pelacak FDN
                const fdnResults = await fetchMuatFdnForCorrection(itemRekap);
                
                // B. Panggil pelacak dari RTDB data_langsir
                const langsirResults = typeof fetchLangsirForCorrection === 'function' 
                    ? await fetchLangsirForCorrection(itemRekap) 
                    : [];

                if ((fdnResults && fdnResults.length > 0) || (langsirResults && langsirResults.length > 0)) {
                    if (fdnResults && fdnResults.length > 0) {
                        matchedDetails = matchedDetails.concat(fdnResults);
                    }
                    if (langsirResults && langsirResults.length > 0) {
                        matchedDetails = matchedDetails.concat(langsirResults);
                    }
                } else {
                    if (korMinus > 0) {
                        matchedDetails.push({
                            KODE_TRANS: 'KOR(-)',
                            TANGGAL: '-',
                            KODE_PALLET: itemRekap.KODE_PALLET || '-',
                            IN: 0,
                            OUT: korMinus,
                            BARCODE: barcodeTarget,
                            NAMA_CUSTOMER: 'Tidak ditemukan data FDN & Langsir (Koreksi Manual)',
                            KOTA_SHIPPING: 'MANUAL'
                        });
                    }
                    if (korPlus > 0) {
                        matchedDetails.push({
                            KODE_TRANS: 'KOR(+)',
                            TANGGAL: '-',
                            KODE_PALLET: itemRekap.KODE_PALLET || '-',
                            IN: korPlus,
                            OUT: 0,
                            BARCODE: barcodeTarget,
                            NAMA_CUSTOMER: 'Tidak ditemukan data FDN & Langsir (Koreksi Manual)',
                            KOTA_SHIPPING: 'MANUAL'
                        });
                    }
                }
            }

            collectedDetails = collectedDetails.concat(matchedDetails);
        }

        // Urutkan rincian detail: PIN dulu, lalu DO / Koreksi / Langsir
        collectedDetails.sort((a, b) => {
            const kodeA = String(a.KODE_TRANS || '').toUpperCase();
            const kodeB = String(b.KODE_TRANS || '').toUpperCase();
            const isPinA = kodeA.startsWith('PIN') ? 0 : 1;
            const isPinB = kodeB.startsWith('PIN') ? 0 : 1;
            if (isPinA !== isPinB) return isPinA - isPinB;
            const tglA = parseTanggalCustom(a.TANGGAL);
            const tglB = parseTanggalCustom(b.TANGGAL);
            return tglA - tglB;
        });

        // --- SIMPAN KE CACHE & MASTER LOKAL DI DALAM SCOPE INI ---
        recallLastFilterCache.rekap = hasilFilterRekap;
        recallLastFilterCache.detail = collectedDetails;
        masterRecallRekapList = hasilFilterRekap; // <-- Mengatasi error hasilFilterRekap is not defined

        // Populate dropdown & Render tabel
        populateDropdownRekapFilters(masterRecallRekapList);
        renderTabelRecallCari(masterRecallRekapList);

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

        // Ambil nilai barcode dan kode palet secara aman
        const barcodeVal = String(item.BARCODE || '').trim();
        const paletVal = String(item.KODE_PALLET || '').trim();

        html += `
            <tr class="hover:bg-orange-50/50 transition">
                <!-- Klik pada Barcode membuka rincian detail berdasarkan barcode tersebut -->
                <td class="p-2.5 border-b border-slate-200 font-bold text-slate-800 cursor-pointer hover:text-orange-600 hover:underline" onclick="bukaDetailRecallBarcode('${barcodeVal}')" title="Klik untuk lihat semua detail barcode ini">
                    ${barcodeVal || '-'}
                </td>
                <!-- Klik pada Kode Palet langsung membuka detail DAN otomatis memilih dropdown palet tersebut -->
                <td class="p-2.5 border-b border-slate-200 text-slate-600 font-mono text-[11px] cursor-pointer hover:text-orange-600 hover:underline" onclick="bukaDetailRecallBarcode('${barcodeVal}', '${paletVal}')" title="Klik untuk langsung filter palet ini di detail">
                    ${paletVal || '-'}
                </td>
                <td class="p-2.5 border-b border-slate-200 text-center font-bold text-emerald-600">${item.IN || 0}</td>
                <td class="p-2.5 border-b border-slate-200 text-center font-bold text-rose-600">${item.OUT || 0}</td>
                <td class="p-2.5 border-b border-slate-200 text-center text-slate-600">${item.KOR_PLUS || 0}</td>
                <td class="p-2.5 border-b border-slate-200 text-center text-slate-600">${item.KOR_MINUS || 0}</td>
                <td class="p-2.5 border-b border-slate-200 text-center font-black text-slate-900">${stokVal}</td>
                <td class="p-2.5 border-b border-slate-200 text-center font-bold text-slate-700">${item.EXPDATE || '-'}</td>
                <td class="p-2.5 border-b border-slate-200 text-center">
                    <!-- Tombol DETAIL ikut membawa parameter palet spesifik agar langsung ter-filter di slide 2 -->
                    <button onclick="bukaDetailRecallBarcode('${barcodeVal}', '${paletVal}')" class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-1 px-3 rounded text-xs transition shadow-sm">
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

// --- FUNGSI ISI DROPDOWN REKAP ---
function populateDropdownRekapFilters(dataArray) {
    const selectBarcode = document.getElementById('filterRekapBarcode');
    const selectRak = document.getElementById('filterRekapRak');

    let setBarcode = new Set();
    let setRak = new Set();

    (dataArray || []).forEach(item => {
        if (item.BARCODE) setBarcode.add(String(item.BARCODE).trim());
        if (item.KODE_PALLET) {
            let cleanRak = typeof getCleanLokasiPalet === 'function' ? getCleanLokasiPalet(item.KODE_PALLET) : item.KODE_PALLET;
            if (cleanRak) setRak.add(cleanRak);
        }
    });

    if (selectBarcode) {
        selectBarcode.innerHTML = '<option value="">-- Semua Barcode --</option>';
        Array.from(setBarcode).sort().forEach(bc => {
            selectBarcode.innerHTML += `<option value="${bc}">${bc}</option>`;
        });
    }

    if (selectRak) {
        selectRak.innerHTML = '<option value="">-- Semua Rak --</option>';
        Array.from(setRak).sort().forEach(rak => {
            selectRak.innerHTML += `<option value="${rak}">${rak}</option>`;
        });
    }
}

// --- FUNGSI FILTER LOKAL TABEL REKAP (SLIDE 1) ---
window.filterTabelRekapLokal = function() {
    const selectedBarcode = document.getElementById('filterRekapBarcode')?.value.trim() || "";
    const selectedRak = document.getElementById('filterRekapRak')?.value.trim().toUpperCase() || "";

    let filtered = (masterRecallRekapList || []).filter(item => {
        // Normalisasi barcode item dan pilihan dropdown menjadi string bersih
        const itemBarcode = String(item.BARCODE || '').trim();
        let matchBarcode = !selectedBarcode || itemBarcode === selectedBarcode;
        
        // Normalisasi kode rak item dan pilihan dropdown
        let cleanRak = typeof getCleanLokasiPalet === 'function' 
            ? getCleanLokasiPalet(item.KODE_PALLET).trim().toUpperCase() 
            : String(item.KODE_PALLET || '').trim().toUpperCase();
            
        let matchRak = !selectedRak || cleanRak === selectedRak;

        return matchBarcode && matchRak;
    });

    // Render ulang tabel rekap dengan data hasil filter lokal
    renderTabelRecallCari(filtered);
};



// --- FUNGSI KETIKA TOMBOL DETAIL DIKLIK (MEMBACA DARI CACHE LOKAL & AUTO-SET DROPDOWN PALLET) ---
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

    // Ambil data langsung dari memori lokal browser (cached detail)
    const detailArray = recallLastFilterCache.detail || [];

    if (detailArray.length === 0) {
        if (tbodyDetail) {
            tbodyDetail.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-slate-400 font-semibold text-rose-500">Data cache kosong. Silakan lakukan pencarian kode barang terlebih dahulu di Slide 1.</td></tr>`;
        }
        return;
    }

    const targetClean = String(barcodeTarget || '').trim().toUpperCase();
    const palletTargetClean = String(kodePalletTarget || '').trim();

    // 1. Saring rincian transaksi berdasarkan BARCODE terlebih dahulu untuk ditampilkan di detail
    let filteredDetail = detailArray.filter(item => {
        const itemBarcode = String(item.BARCODE || '').trim().toUpperCase();
        return itemBarcode === targetClean;
    });

    // 2. Urutkan data: PIN dulu, lalu DO/Koreksi, urut berdasarkan Tanggal
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

    // 3. POPULATE DROPDOWN FILTER & RENDER TABEL DETAIL AWAL
    if (typeof window.tampilkanDetailTransaksi === 'function') {
        window.tampilkanDetailTransaksi(filteredDetail);
    } else {
        renderTabelRecallDetail(filteredDetail, barcodeTarget);
    }

    // 4. JIKA KODE PALLET SPESIFIK DIKLIK, SET OTOMATIS DROPDOWN FILTER DETAIL & FILTER TABELNYA
    if (palletTargetClean) {
        setTimeout(() => {
            const selectPaletDetail = document.getElementById('filterDetailPalet');
            if (selectPaletDetail) {
                selectPaletDetail.value = palletTargetClean;
                
                // Panggil fungsi filter tabel detail agar langsung merender baris sesuai palet yang diklik
                if (typeof window.filterTabelDetail === 'function') {
                    window.filterTabelDetail();
                }
            }
        }, 50); // Delay kecil memastikan elemen dropdown sudah selesai dirender oleh DOM
    }
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

// --- RENDER TABEL DETAIL (SLIDE 2) DENGAN KODE PALLET UTUH & BARIS TOTAL ---
function renderTabelRecallDetail(dataArray, barcodeTarget = "") {
    const tbody = document.getElementById('tabelBodyRecallDetail'); 
    if (!tbody) return;

    if (!dataArray || dataArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-10 text-slate-400 font-semibold">Tidak ada rincian transaksi yang ditemukan.</td></tr>';
        return;
    }

    let html = '';
    let totalInSum = 0;
    let totalOutSum = 0;

    dataArray.forEach(item => {
        // Menggunakan string kode palet lengkap secara utuh untuk ditampilkan pada kolom tabel
        const kodePaletUtuh = item.KODE_PALLET || '-';
        
        const valIn = Number(item.IN || 0);
        const valOut = Number(item.OUT || 0);

        // Akumulasi total
        totalInSum += valIn;
        totalOutSum += valOut;

        html += `
            <tr class="hover:bg-orange-50 border-b border-slate-100 text-xs">
                <td class="p-2.5 font-bold text-slate-800">${item.KODE_TRANS || '-'}</td>
                <td class="p-2.5 text-center text-slate-600">${item.TANGGAL || '-'}</td>
                <td class="p-2.5 font-mono text-emerald-700 font-bold">${kodePaletUtuh}</td>
                <td class="p-2.5 text-center font-bold text-slate-700">${valIn}</td>
                <td class="p-2.5 text-center font-bold text-slate-700">${valOut}</td>
                <td class="p-2.5 font-mono text-slate-600">${item.BARCODE || '-'}</td>
                <td class="p-2.5 text-slate-700">${item.NAMA_CUSTOMER || '-'}</td>
                <td class="p-2.5 text-slate-600">${item.KOTA_SHIPPING || '-'}</td>
            </tr>
        `;
    });

    // Tambahkan Baris TOTAL di bagian paling bawah tabel
    html += `
        <tr class="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-xs">
            <td colspan="3" class="p-3 text-right uppercase tracking-wider">TOTAL KESELURUHAN:</td>
            <td class="p-3 text-center text-emerald-700">${totalInSum}</td>
            <td class="p-3 text-center text-rose-700">${totalOutSum}</td>
            <td colspan="3" class="p-3"></td>
        </tr>
    `;

    tbody.innerHTML = html;
}

function getCleanLokasiPalet(rawPalet) {
    if (!rawPalet) return "-";
    let parts = rawPalet.split(';');
    if (parts.length >= 5) {
        return parts[parts.length - 1].trim(); // Menghasilkan "7 B 02" untuk dibaca di dropdown
    }
    return rawPalet.trim();
}

let currentDetailDataList = [];

window.tampilkanDetailTransaksi = function(dataDetailArray) {
    // --- 1. DEDUPLIKASI DATA (Mencegah baris ganda/berulang yang sama persis) ---
    const uniqueMap = new Map();
    (dataDetailArray || []).forEach(item => {
        // Buat kunci unik berdasarkan nomor transaksi, kode palet, nilai IN, dan OUT
        const uniqueKey = `${item.KODE_TRANS}_${item.KODE_PALLET}_${item.IN}_${item.OUT}_${item.BARCODE}`;
        if (!uniqueMap.has(uniqueKey)) {
            uniqueMap.set(uniqueKey, item);
        }
    });
    
    // Simpan data yang sudah bersih dari duplikat
    currentDetailDataList = Array.from(uniqueMap.values());
    
    const selectTgl = document.getElementById('filterDetailTanggal');
    const selectPalet = document.getElementById('filterDetailPalet');
    
    let setTanggal = new Set();
    let setPalet = new Set();

    currentDetailDataList.forEach(item => {
        if (item.TANGGAL) setTanggal.add(item.TANGGAL);
        if (item.KODE_PALLET) {
            setPalet.add(item.KODE_PALLET.trim());
        }
    });

    if (selectTgl) {
        selectTgl.innerHTML = '<option value="">-- Semua Tanggal --</option>';
        Array.from(setTanggal).sort().forEach(tgl => {
            selectTgl.innerHTML += `<option value="${tgl}">${tgl}</option>`;
        });
    }

    if (selectPalet) {
        selectPalet.innerHTML = '<option value="">-- Semua Lokasi Rak --</option>';
        Array.from(setPalet).sort().forEach(paletUtuh => {
            let cleanRak = getCleanLokasiPalet(paletUtuh);
            selectPalet.innerHTML += `<option value="${paletUtuh}">${cleanRak}</option>`;
        });
    }

    renderTabelRecallDetail(currentDetailDataList);
};

window.filterTabelDetail = function() {
    const selectedTgl = document.getElementById('filterDetailTanggal')?.value || "";
    const selectedPalet = document.getElementById('filterDetailPalet')?.value || "";

    let filtered = currentDetailDataList.filter(item => {
        let matchTgl = !selectedTgl || item.TANGGAL === selectedTgl;
        
        // Cocokkan secara presisi berdasarkan string KODE_PALLET utuh yang dipilih dari dropdown
        let matchPalet = !selectedPalet || String(item.KODE_PALLET || '').trim() === selectedPalet;

        return matchTgl && matchPalet;
    });

    renderTabelRecallDetail(filtered);
};


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

// --- FUNGSI EXPORT INSTAN DARI CACHE MEMORI ---
window.exportRecallExcel = function() {
    if (!recallLastFilterCache.rekap || recallLastFilterCache.rekap.length === 0) {
        if (typeof miuiAlert === 'function') miuiAlert("Belum ada data rekap yang dicari/tersedia untuk di-export!");
        else alert("Belum ada data rekap yang tersedia untuk di-export!");
        return;
    }

    // 1. Susun XML untuk Sheet REKAP dari cache rekap
    let sheet1XmlRows = '';
    recallLastFilterCache.rekap.forEach(item => {
        const barcode = item.BARCODE || '-';
        const kodePalet = item.KODE_PALLET || '-';
        const inQty = Number(item.IN || 0);
        const outQty = Number(item.OUT || 0);
        const korPlus = Number(item.KOR_PLUS || item.KOR_POSITIF || item['KOR(+)'] || 0);
        const korMinus = Number(item.KOR_MINUS || item.KOR_NEGATIF || item['KOR(-)'] || 0);
        const stok = Number(item.STOK || 0);
        const expdate = item.EXPDATE || '-';

        sheet1XmlRows += `
        <Row>
            <Cell><Data ss:Type="String">${escapeXml(barcode)}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXml(kodePalet)}</Data></Cell>
            <Cell><Data ss:Type="Number">${inQty}</Data></Cell>
            <Cell><Data ss:Type="Number">${outQty}</Data></Cell>
            <Cell><Data ss:Type="Number">${korPlus}</Data></Cell>
            <Cell><Data ss:Type="Number">${korMinus}</Data></Cell>
            <Cell><Data ss:Type="Number">${stok}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXml(expdate)}</Data></Cell>
        </Row>`;
    });

    // 2. Susun XML untuk Sheet DETAIL dari cache detail
    let sheet2XmlRows = '';
    if (recallLastFilterCache.detail && recallLastFilterCache.detail.length > 0) {
        recallLastFilterCache.detail.forEach(d => {
            const kodeTrans = d.KODE_TRANS || '-';
            const tanggal = d.TANGGAL || '-';
            const kodePalet = d.KODE_PALLET || '-';
            const inQty = Number(d.IN || 0);
            const outQty = Number(d.OUT || 0);
            const barcode = d.BARCODE || '-';
            const customer = d.NAMA_CUSTOMER || d.CUSTOMER || '-';
            const kota = d.KOTA_SHIPPING || d.SHIPPING || d.KOTA_TUJUAN || '-';

            sheet2XmlRows += `
        <Row>
            <Cell><Data ss:Type="String">${escapeXml(kodeTrans)}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXml(tanggal)}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXml(kodePalet)}</Data></Cell>
            <Cell><Data ss:Type="Number">${inQty}</Data></Cell>
            <Cell><Data ss:Type="Number">${outQty}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXml(barcode)}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXml(customer)}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXml(kota)}</Data></Cell>
        </Row>`;
        });
    } else {
        sheet2XmlRows = `<Row><Cell><Data ss:Type="String">Belum ada rincian detail yang dibuka/dimuat di layar.</Data></Cell></Row>`;
    }

    // Nama file & Generate SpreadsheetML
    const kodeBrgInput = document.getElementById('recallInputKode')?.value.trim().toUpperCase() || 'ALL';
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const jam = String(now.getHours()).padStart(2, '0');
    const menit = String(now.getMinutes()).padStart(2, '0');
    const namaFileExcel = `Laporan_Recall_${kodeBrgInput}_${yyyy}${mm}${dd}_${jam}${menit}.xls`;

    const excelXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
         xmlns:o="urn:schemas-microsoft-com:office:office"
         xmlns:x="urn:schemas-microsoft-com:office:excel"
         xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
         xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Header">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:Bold="1" ss:Size="10" ss:FontName="Arial"/>
      <Interior ss:Color="#F2F2F2" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
    </Style>
    <Style ss:ID="Default">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
      <Font ss:Size="10" ss:FontName="Arial"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="REKAP">
    <Table>
      <Row ss:StyleID="Header">
        <Cell><Data ss:Type="String">BARCODE</Data></Cell>
        <Cell><Data ss:Type="String">KODE PALET</Data></Cell>
        <Cell><Data ss:Type="String">IN</Data></Cell>
        <Cell><Data ss:Type="String">OUT</Data></Cell>
        <Cell><Data ss:Type="String">KOR(+)</Data></Cell>
        <Cell><Data ss:Type="String">KOR(-)</Data></Cell>
        <Cell><Data ss:Type="String">STOK</Data></Cell>
        <Cell><Data ss:Type="String">EXPDATE</Data></Cell>
      </Row>
      ${sheet1XmlRows}
    </Table>
  </Worksheet>
  <Worksheet ss:Name="DETAIL">
    <Table>
      <Row ss:StyleID="Header">
        <Cell><Data ss:Type="String">KODE TRANS / DO</Data></Cell>
        <Cell><Data ss:Type="String">TANGGAL</Data></Cell>
        <Cell><Data ss:Type="String">KODE PALET</Data></Cell>
        <Cell><Data ss:Type="String">IN</Data></Cell>
        <Cell><Data ss:Type="String">OUT</Data></Cell>
        <Cell><Data ss:Type="String">BARCODE</Data></Cell>
        <Cell><Data ss:Type="String">NAMA CUSTOMER</Data></Cell>
        <Cell><Data ss:Type="String">KOTA TUJUAN</Data></Cell>
      </Row>
      ${sheet2XmlRows}
    </Table>
  </Worksheet>
</Workbook>`;

    // Download file
    const blob = new Blob([excelXml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = namaFileExcel;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (typeof miuiAlert === 'function') {
        miuiAlert("File Excel Multi-Sheet berhasil diunduh secara instan dari cache!");
    }
};

function escapeXml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}