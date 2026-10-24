// --- INISIALISASI MODUL RECALL ---
window.initRecall = function() {
    switchRecallSlide('cari');
};

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
                    <button onclick="event.stopPropagation(); bukaDetailRecallBarcode('${item.BARCODE}')" class="bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1 rounded text-[10px] font-black uppercase shadow transition">
                        Detail
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
window.bukaDetailRecallBarcode = function(barcodeTarget) {
    // Pindah slide ke Detail Masuk / Keluar (-50%)
    window.switchRecallSlide('detail');
    
    // Perbarui radio button tab di header agar sinkron secara visual
    const radioDetail = document.querySelector('input[name="rb-recall-slide"][value="detail"]');
    if (radioDetail) radioDetail.checked = true;

    // Ambil seluruh data detail dari Firebase RTDB node 'recall_cache/detail' (Tanpa terpengaruh filter tanggal di Slide 1)
    firebase.database().ref('recall_cache/detail').once('value')
        .then(snapshot => {
            const allDetail = snapshot.val();
            if (!allDetail) {
                miuiAlert("Data detail belum tersedia.");
                return;
            }

            const detailArray = Array.isArray(allDetail) ? allDetail : Object.values(allDetail);
            const targetClean = String(barcodeTarget || '').trim().toUpperCase();

            // Filter HANYA berdasarkan BARCODE yang diklik (mencakup semua tanggal & semua jenis transaksi PIN/DO)
            let filteredDetail = detailArray.filter(item => {
                const itemBarcode = String(item.BARCODE || '').trim().toUpperCase();
                return itemBarcode === targetClean;
            });

            // --- URUTKAN DATA: PIN dulu, lalu DO, lalu urutkan berdasarkan Tanggal Transaksi ---
            filteredDetail.sort((a, b) => {
                const kodeA = String(a.KODE_TRANS || '').toUpperCase();
                const kodeB = String(b.KODE_TRANS || '').toUpperCase();

                // Kategori: PIN (0) di atas, DO (1) di bawah
                const isPinA = kodeA.startsWith('PIN') ? 0 : 1;
                const isPinB = kodeB.startsWith('PIN') ? 0 : 1;

                if (isPinA !== isPinB) {
                    return isPinA - isPinB;
                }

                // Jika kategori sama, urutkan berdasarkan Tanggal Transaksi (DD/MM/YYYY) dari terlama ke terbaru
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
    detailList.forEach((item) => {
        html += `
            <tr class="hover:bg-orange-50/50 transition">
                <td class="p-2.5 border-b border-slate-200 font-bold text-slate-800">${item.KODE_TRANS || '-'}</td>
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