// Fungsi Inisialisasi Modul Ceklist Muat
window.initCeklistMuat = function() {
    console.log("Modul Ceklist Muat Berhasil Diinisialisasi.");
    updateWaktuCeklist();
    // Update jam setiap detik
    setInterval(updateWaktuCeklist, 1000);
};

// Fungsi untuk menampilkan Hari, Tanggal, dan Jam
function updateWaktuCeklist() {
    const el = document.getElementById('display-waktu-ceklist');
    if (!el) return;

    const sekarang = new Date();
    
    // Format Hari, Tanggal (DD/MM/YYYY), dan Jam (HH:MM:SS)
    const optionsHari = { weekday: 'long', timeZone: 'Asia/Jakarta' };
    const hari = sekarang.toLocaleDateString('id-ID', optionsHari);
    
    const tgl = String(sekarang.getDate()).padStart(2, '0');
    const bln = String(sekarang.getMonth() + 1).padStart(2, '0');
    thn = sekarang.getFullYear();
    
    const jam = String(sekarang.getHours()).padStart(2, '0');
    const menit = String(sekarang.getMinutes()).padStart(2, '0');
    const detik = String(sekarang.getSeconds()).padStart(2, '0');

    el.innerText = `[ ${hari}, ${tgl}/${bln}/${thn} | ${jam}:${menit}:${detik} WIB ]`;
}

// Toggle Popover Arsip Ceklist sekaligus Memuat Data Realtime dari Firebase
window.togglePopoverArsipCeklist = function(event) {
    event.stopPropagation();
    const popover = document.getElementById('popover-arsip-ceklist');
    if (!popover) return;

    const isHidden = popover.classList.contains('hidden');
    popover.classList.toggle('hidden');

    // Hanya muat data dari Firebase jika popover baru dibuka
    if (isHidden) {
        renderRiwayatArsipCetak();
    }
};

// Tutup popover jika klik di luar
window.addEventListener('click', function(e) {
    const popover = document.getElementById('popover-arsip-ceklist');
    if (popover && !popover.classList.contains('hidden')) {
        // Mencegah penutupan jika klik di dalam area popover
        if (!popover.contains(e.target)) {
            popover.classList.add('hidden');
        }
    }
});

// Variabel cache global untuk menyimpan data arsip sementara agar pencarian real-time instan
window.cacheArsipCetakGlobal = { do: null, fdn: null };

// 1. Fungsi Builder Utama (Dipanggil sekali saat popover dibuka atau cache dibersihkan)
window.renderRiwayatArsipCetak = function() {
    const container = document.getElementById('container-list-arsip-ceklist');
    if (!container) return;

    if (!window.cacheArsipCetakGlobal.do || !window.cacheArsipCetakGlobal.fdn) {
        container.innerHTML = `<div class="text-slate-400 italic text-[10px] text-center py-4">Memuat data arsip...</div>`;

        const dbRefDO = firebase.database().ref('ceklist_muat/arsip_cetak/ceklist_do');
        const dbRefFDN = firebase.database().ref('ceklist_muat/arsip_cetak/ceklist_fdn');

        Promise.all([
            dbRefDO.once('value'),
            dbRefFDN.once('value')
        ]).then(([snapshotDO, snapshotFDN]) => {
            window.cacheArsipCetakGlobal.do = snapshotDO;
            window.cacheArsipCetakGlobal.fdn = snapshotFDN;
            buildArsipUIAndFilter();
        }).catch((err) => {
            console.error("Gagal membaca data arsip dari Firebase:", err);
            container.innerHTML = `<div class="text-red-400 italic text-[10px] text-center py-4">Gagal memuat riwayat arsip.</div>`;
        });
    } else {
        buildArsipUIAndFilter();
    }
};

// 2. Fungsi Builder & Real-time Filter UI
window.buildArsipUIAndFilter = function() {
    const container = document.getElementById('container-list-arsip-ceklist');
    if (!container) return;

    const snapshotDO = window.cacheArsipCetakGlobal.do;
    const snapshotFDN = window.cacheArsipCetakGlobal.fdn;

    const searchInput = document.getElementById('search-arsip-input');
    const searchText = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const dateInput = document.getElementById('filter-tanggal-arsip-input');
    const selectedDateValue = dateInput ? dateInput.value : '';

    let targetDateStr = '';
    let labelTanggalDisplay = 'Semua Tanggal 📅';

    if (selectedDateValue) {
        const [y, m, d] = selectedDateValue.split('-');
        targetDateStr = `${d}/${m}/${y}`;
        labelTanggalDisplay = `${targetDateStr} 📅`;
    }

    let rawGroups = {};
    let hasData = false;

    function getSortableDateKey(tglStr) {
        if (!tglStr || tglStr === 'N/A') return '00000000';
        const parts = tglStr.split('/');
        if (parts.length === 3) {
            return `${parts[2]}${parts[1]}${parts[0]}`;
        }
        return '00000000';
    }

    function addToRawGroup(tgl, customer, noBuktiList, itemHtml, totalKrtVal) {
        if (targetDateStr && tgl !== targetDateStr) return;

        if (searchText) {
            const matchCustomer = customer.toLowerCase().includes(searchText);
            const matchNoBukti = noBuktiList.some(nb => nb.toLowerCase().includes(searchText));
            if (!matchCustomer && !matchNoBukti) return;
        }

        const dateKey = tgl || 'TANGGAL LAINNYA';
        if (!rawGroups[dateKey]) {
            rawGroups[dateKey] = {
                sortKey: getSortableDateKey(tgl),
                items: [],
                totalMuatHarian: 0 // <-- 1. Inisialisasi total muat harian
            };
        }
        rawGroups[dateKey].items.push(itemHtml);
        rawGroups[dateKey].totalMuatHarian += Number(totalKrtVal || 0); // <-- 2. Akumulasi total KRT per tanggal
    }

    // A. Proses Arsip DO
    if (snapshotDO && snapshotDO.exists()) {
        snapshotDO.forEach((childSnap) => {
            const muatId = childSnap.key;
            const val = childSnap.val();
            const meta = val.meta || {};
            const tgl = meta.tgl || 'N/A';
            const customer = meta.namacustomer || muatId;
            const totalKeseluruhan = Number(val.total_muat_keseluruhan || 0);

            const listNoDO = Object.keys(val).filter(k => k !== 'meta' && k !== 'titipan' && k !== 'total_muat_keseluruhan' && k !== 'rekap');
            let badgeInfoItems = [];
            if (listNoDO.length > 0) badgeInfoItems.push(`No DO: ${listNoDO.join(', ')}`);

            const titipanObj = val.titipan || {};
            const kategoriTitipanKeys = Object.keys(titipanObj);
            if (kategoriTitipanKeys.length > 0) {
                badgeInfoItems.push(kategoriTitipanKeys.map(k => k.toUpperCase()).join(', '));
            }

            const badgeText = badgeInfoItems.length > 0 ? badgeInfoItems.join(' | ') : '-';
            
            // Hitung total seluruh item dari semua DO dalam arsip ini
            let totalItemDO = 0;
            listNoDO.forEach(noDoKey => {
                const itemDOObj = val[noDoKey]?.data || {};
                totalItemDO += Object.keys(itemDOObj).length;
            });

            const cardHtml = `
                <div onclick="previewArsipDetail('do', '${muatId}')" class="bg-orange-50/50 hover:bg-orange-100/70 border border-orange-200 rounded-lg p-2 transition cursor-pointer mb-1.5">
                    <div class="flex items-center justify-between font-bold text-slate-800 text-[11px] mb-1">
                        <span class="truncate text-orange-600 pr-2">[DO] ${customer}</span>
                        <span class="bg-orange-600 text-white px-1.5 py-0.5 rounded text-[9px] font-black shrink-0">${totalKeseluruhan} KRT</span>
                    </div>
                    <div class="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span class="truncate">${badgeText}</span>
                        <span class="text-[9px] font-bold text-slate-400 shrink-0">(${totalItemDO} Item)</span>
                    </div>
                </div>
            `;
            addToRawGroup(tgl, customer, listNoDO, cardHtml, totalKeseluruhan);
        });
    }

    // B. Proses Arsip FDN
    if (snapshotFDN && snapshotFDN.exists()) {
        snapshotFDN.forEach((childSnap) => {
            const muatId = childSnap.key;
            const val = childSnap.val();
            const meta = val.meta || {};
            const tgl = meta.tgl || 'N/A';
            const customer = meta.namacustomer || muatId;
            const totalKeseluruhan = Number(val.total_muat_keseluruhan || 0);

            const listNoFDN = Object.keys(val).filter(k => k !== 'meta' && k !== 'titipan' && k !== 'total_muat_keseluruhan' && k !== 'rekap');
            let badgeInfoItemsFDN = [];
            if (listNoFDN.length > 0) badgeInfoItemsFDN.push(`No FDN: ${listNoFDN.join(', ')}`);

            const titipanObjFDN = val.titipan || {};
            const kategoriTitipanKeysFDN = Object.keys(titipanObjFDN);
            if (kategoriTitipanKeysFDN.length > 0) {
                badgeInfoItemsFDN.push(kategoriTitipanKeysFDN.map(k => k.toUpperCase()).join(', '));
            }

            const badgeTextFDN = badgeInfoItemsFDN.length > 0 ? badgeInfoItemsFDN.join(' | ') : '-';

            // Hitung total seluruh item dari semua FDN dalam arsip ini
            let totalItemFDN = 0;
            listNoFDN.forEach(noFdnKey => {
                const itemFDNObj = val[noFdnKey]?.data || {};
                totalItemFDN += Object.keys(itemFDNObj).length;
            });

            const cardHtml = `
                <div onclick="previewArsipDetail('fdn', '${muatId}')" class="bg-slate-50/80 hover:bg-slate-100/90 border border-slate-300 rounded-lg p-2 transition cursor-pointer mb-1.5">
                    <div class="flex items-center justify-between font-bold text-slate-800 text-[11px] mb-1">
                        <span class="truncate text-slate-600 pr-2">[FDN] ${customer}</span>
                        <span class="bg-slate-600 text-white px-1.5 py-0.5 rounded text-[9px] font-black shrink-0">${totalKeseluruhan} KRT</span>
                    </div>
                    <div class="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span class="truncate">${badgeTextFDN}</span>
                        <span class="text-[9px] font-bold text-slate-400 shrink-0">(${totalItemFDN} Item)</span>
                    </div>
                </div>
            `;
            addToRawGroup(tgl, customer, listNoFDN, cardHtml, totalKeseluruhan);
        });
    }

    const sortedDates = Object.keys(rawGroups).sort((a, b) => {
        return rawGroups[b].sortKey.localeCompare(rawGroups[a].sortKey);
    });

    sortedDates.forEach(dateKey => {
        if (rawGroups[dateKey].items.length > 0) hasData = true;
    });

    // C. Header Filter 1 Baris Sejajar
    let headerFilterHtml = `
        <div class="bg-orange-50 border border-orange-200 rounded p-1.5 mb-2.5 sticky top-0 z-10 shadow-sm flex items-center gap-1.5 text-[10px]">
            <span class="font-bold text-orange-800 uppercase shrink-0 text-[9px]">FILTER TANGGAL/CARI:</span>
            
            <div class="relative flex-1 min-w-0 flex items-center">
                <input type="text" id="search-arsip-input" value="${searchText}" oninput="buildArsipUIAndFilter()" placeholder="Cari Customer / No DO / No FDN..." class="w-full text-[10px] border border-orange-300 rounded px-2 py-0.5 text-slate-700 focus:outline-none focus:border-orange-500 bg-white truncate">
                ${searchText ? `<button type="button" onclick="event.stopPropagation(); clearSearchArsip();" class="absolute right-1 text-[9px] text-slate-400 hover:text-slate-600 font-bold px-1" title="Clear">✕</button>` : ''}
            </div>

            <div class="h-4 border-r border-orange-200 shrink-0"></div>

            <div class="relative shrink-0 flex items-center">
                <button type="button" class="bg-white border border-orange-300 hover:border-orange-500 text-slate-700 rounded px-2 py-0.5 font-mono text-[10px] font-bold flex items-center space-x-1 shadow-sm">
                    <span>${labelTanggalDisplay}</span>
                </button>
                <input type="date" id="filter-tanggal-arsip-input" value="${selectedDateValue}" onchange="buildArsipUIAndFilter()" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full">
            </div>

            ${selectedDateValue ? `
                <button type="button" onclick="event.stopPropagation(); resetFilterArsip();" class="text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-600 px-1.5 py-0.5 rounded font-bold transition shrink-0" title="Reset ke Semua Tanggal">✕</button>
            ` : ''}
        </div>
    `;

    if (!hasData) {
        container.innerHTML = headerFilterHtml + `<div class="text-slate-400 italic text-[10px] text-center py-6">Tidak ada riwayat arsip yang sesuai...</div>`;
        return;
    }

    let finalHtml = headerFilterHtml;

    sortedDates.forEach((tanggal) => {
        const groupData = rawGroups[tanggal];
        if (groupData.items.length > 0) {
            
            // --- AMBIL LANGSUNG DARI TOTAL HARIAN YANG SUDAH DIKUMPULKAN ---
            let totalMuatHariIni = groupData.totalMuatHarian || 0;

            finalHtml += `
                <div class="mb-3">
                    <div class="text-[10px] font-black text-slate-700 bg-slate-300 px-2 py-0.5 rounded mb-1.5 uppercase tracking-wider flex items-center justify-between">
                        <span>📅 ${tanggal}</span>
                        <span class="text-[10px] font-bold text-slate-700">
                            ${groupData.items.length} Dokumen &nbsp;|&nbsp; Total Muat : ${totalMuatHariIni} KRT
                        </span>
                    </div>
                    <div>${groupData.items.join('')}</div>
                </div>
            `;
        }
    });

    container.innerHTML = finalHtml;

    if (searchText) {
        const currentSearchInput = document.getElementById('search-arsip-input');
        if (currentSearchInput) {
            currentSearchInput.focus();
            currentSearchInput.setSelectionRange(currentSearchInput.value.length, currentSearchInput.value.length);
        }
    }
};

// 3. Fungsi Helper untuk Reset (Tanpa menutup popover & mencegah event bubbling)
window.clearSearchArsip = function() {
    const searchInput = document.getElementById('search-arsip-input');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    buildArsipUIAndFilter();
};

window.resetFilterArsip = function() {
    const filterInput = document.getElementById('filter-tanggal-arsip-input');
    if (filterInput) {
        filterInput.value = '';
    }
    buildArsipUIAndFilter();
};

window.invalidateArsipCache = function() {
    window.cacheArsipCetakGlobal = { do: null, fdn: null };
};

// Fungsi Modal Detail Arsip saat Kartu Riwayat Diklik
window.previewArsipDetail = function(kategori, muatId) {
    const path = `ceklist_muat/arsip_cetak/ceklist_${kategori}/${muatId}`;
    
    firebase.database().ref(path).once('value').then((snapshot) => {
        if (!snapshot.exists()) {
            miuiAlert("Data arsip tidak ditemukan di Database!");
            return;
        }

        const data = snapshot.val();
        const meta = data.meta || {};
        const customer = meta.namacustomer || muatId;
        const tanggal = meta.tgl || '-';
        const totalAll = data.total_muat_keseluruhan || 0;

        const keysNoBukti = Object.keys(data).filter(k => k !== 'meta' && k !== 'titipan' && k !== 'total_muat_keseluruhan' && k !== 'rekap');
        
        // --- PISAHKAN FDN_GABUNGAN DARI TITIPAN MURNI ---
        const titipanObj = data.titipan || {};
        let fdnGabunganItems = {};
        let titipanMurniObj = {};

        Object.keys(titipanObj).forEach(kategoriKey => {
            if (kategoriKey.toUpperCase() === 'FDN_GABUNGAN') {
                fdnGabunganItems = titipanObj[kategoriKey];
            } else {
                titipanMurniObj[kategoriKey] = titipanObj[kategoriKey];
            }
        });

        const hasTitipanMurni = Object.keys(titipanMurniObj).length > 0;
        const hasFdnGabungan = Object.keys(fdnGabunganItems).length > 0;

        // Buat opsi dropdown DO/FDN & Titipan secara terpisah
        let optionsDropdownHtml = `<option value="semua">-- Hapus Semua Arsip --</option>`;
        keysNoBukti.forEach(k => {
            const noBuktiVal = data[k]?.meta?.nobukti || k;
            optionsDropdownHtml += `<option value="${k}">Hapus: ${noBuktiVal}</option>`;
        });
        if (hasTitipanMurni || hasFdnGabungan) {
            optionsDropdownHtml += `<option value="titipan">Hapus Data Titipan / Gabungan Saja</option>`;
        }

        // Buat elemen Modal Popup jika belum ada
        let modalEl = document.getElementById('modal-detail-arsip');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'modal-detail-arsip';
            modalEl.className = 'fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 font-sans';
            document.body.appendChild(modalEl);
        }

        let contentHtml = `
            <div onclick="event.stopPropagation()" class="bg-white rounded-xl shadow-2xl border border-orange-300 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
                <!-- Header Modal -->
                <div class="bg-gradient-to-b from-[#323232] to-[#202020] text-white p-3 flex justify-between items-center flex-shrink-0">
                    <div>
                        <div class="text-[16px] font-black uppercase tracking-wider">DETAIL ARSIP ${kategori.toUpperCase()}</div>
                        <div class="text-[15px] text-orange-400 opacity-100">Tujuan: ${customer} | Tanggal: ${tanggal}</div>
                    </div>
                    <button onclick="document.getElementById('modal-detail-arsip').remove()" class="text-white hover:text-red-400 font-bold text-lg">✕</button>
                </div>

                <!-- Body Modal dengan miui-custom-scroll -->
                <div class="p-4 overflow-y-auto space-y-4 text-xs flex-1 miui-custom-scroll">
                    <div class="bg-slate-50 border border-slate-200 rounded p-2.5">
                        <div class="font-bold text-slate-700 mb-2">Daftar Nomor ${kategori.toUpperCase()} & Item Barang:</div>
                        <div class="space-y-3">
        `;

        // 1. RENDER DAFTAR NOMOR DO / FDN UTAMA
        keysNoBukti.forEach((noBuktiKey) => {
            const doObj = data[noBuktiKey];
            const doMeta = doObj.meta || {};
            const items = doObj.data || {};
            const jumlahItem = Object.keys(items).length;

            contentHtml += `
                <div class="border border-orange-200 rounded p-2 bg-white shadow-sm">
                    <div class="flex justify-between items-center font-bold text-orange-800 text-[11px] border-b pb-1 mb-1.5">
                        <span>${doMeta.nobukti || noBuktiKey}</span>
                        <span>Total: ${doMeta.total_muat || 0} KRT <span class="text-slate-600 text-[10px] font-bold">(${jumlahItem} Item)</span></span>
                    </div>
                    <table class="w-full text-left text-[10px]">
                        <thead>
                            <tr class="text-slate-400 border-b">
                                <th class="pb-1">KODE BARANG</th>
                                <th class="pb-1 text-center">GUDANG</th>
                                <th class="pb-1 text-right">QTY (KRT)</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            Object.keys(items).forEach((kbKey) => {
                const item = items[kbKey];
                contentHtml += `
                    <tr class="border-b border-slate-100">
                        <td class="py-1 text-[11px] font-mono font-bold text-slate-700">${item.kodebarang || kbKey}</td>
                        <td class="py-1 text-[11px] text-center text-slate-500">${item.kodegudang || '-'}</td>
                        <td class="py-1 text-[11px] text-right font-bold text-orange-600">${item.qty_b || 0}</td>
                    </tr>
                `;
            });

            contentHtml += `
                        </tbody>
                    </table>
                </div>
            `;
        });

        // 2. RENDER FDN GABUNGAN SEBAGAI BLOK DOKUMEN LENGKAP
        if (hasFdnGabungan) {
            const groupedByBukti = {};
            Object.values(fdnGabunganItems).forEach(item => {
                const nb = item.nobukti || 'FDN';
                const tuj = item.tujuan || '';
                const groupKey = `${nb}_${tuj}`;
                if (!groupedByBukti[groupKey]) {
                    groupedByBukti[groupKey] = { nobukti: nb, tujuan: tuj, items: [], totalQty: 0 };
                }
                groupedByBukti[groupKey].items.push(item);
                groupedByBukti[groupKey].totalQty += Number(item.qty || 0);
            });

            Object.values(groupedByBukti).forEach(group => {
                let rowsSubHtml = '';
                group.items.forEach(it => {
                    rowsSubHtml += `
                        <tr class="border-b border-slate-100">
                            <td class="py-1 text-[11px] font-mono font-bold text-slate-700">${it.kodebarang}</td>
                            <td class="py-1 text-[11px] text-center text-slate-500">WH-2</td>
                            <td class="py-1 text-[11px] text-right font-bold text-orange-600">${it.qty}</td>
                        </tr>
                    `;
                });

                contentHtml += `
                    <div class="border border-slate-200 rounded p-2 bg-white shadow-sm mt-3">
                        <div class="flex justify-between items-center font-bold text-orange-800 text-[11px] border-b pb-1 mb-1.5">
                            <span>DN-${group.nobukti} <span class="text-orange-700 font-bold">[ ${group.tujuan} ]</span></span>
                            <span>Total: ${group.totalQty} KRT <span class="text-slate-600 text-[10px] font-bold">(${group.items.length} Item)</span></span>
                        </div>
                        <table class="w-full text-left text-[10px]">
                            <thead>
                                <tr class="text-slate-400 border-b">
                                    <th class="pb-1">KODE BARANG</th>
                                    <th class="pb-1 text-center">GUDANG</th>
                                    <th class="pb-1 text-right">QTY (KRT)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsSubHtml}
                            </tbody>
                        </table>
                    </div>
                `;
            });
        }

        contentHtml += `
                        </div>
                    </div>
        `;

        // 3. RENDER DATA TITIPAN MURNI (PROMOSI / HRD / TINGGALAN / DIY)
        if (hasTitipanMurni) {
            contentHtml += `
                <div class="bg-amber-50 border border-amber-200 rounded p-2.5">
                    <div class="font-bold text-amber-800 mb-1.5">📦 Data Titipan / Tinggalan:</div>
                    <div class="space-y-1.5">
            `;

            Object.keys(titipanMurniObj).forEach((kategoriTitipan) => {
                const itemsTitipan = titipanMurniObj[kategoriTitipan];
                Object.keys(itemsTitipan).forEach((tKey) => {
                    const tItem = itemsTitipan[tKey];
                    const namaBarangBersih = String(tItem.namabarang || '').replace(/_/g, ' ');

                    contentHtml += `
                        <div class="flex justify-between items-center bg-white border border-amber-100 px-2 py-1 rounded text-[11px]">
                            <span class="font-bold text-slate-700 uppercase">[${kategoriTitipan}] ${namaBarangBersih}</span>
                            <span class="font-black text-amber-600">${tItem.qty} KRT</span>
                        </div>
                    `;
                });
            });

            contentHtml += `
                    </div>
                </div>
            `;
        }

        contentHtml += `
                </div>

                <!-- Footer Modal -->
                <div class="bg-slate-100 p-3 flex flex-wrap justify-between items-center border-t flex-shrink-0 gap-2">
                    <div class="flex items-center gap-2">
                        <select id="select-hapus-arsip-target" class="bg-white border border-slate-300 rounded px-2 py-1 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-red-500">
                            ${optionsDropdownHtml}
                        </select>
                        <button onclick="eksekusiHapusArsip('${kategori}', '${muatId}')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition shadow">
                            Hapus
                        </button>
                        <button onclick="cetakUlangArsip('${kategori}', '${muatId}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition shadow flex items-center gap-1">
                            <i class="fa-solid fa-print"></i> Cetak Ulang
                        </button>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="text-[11px] font-bold text-slate-700">TOTAL MUAT: <span class="text-orange-600 font-black">${totalAll} KRT</span></div>
                    </div>
                </div>
            </div>
        `;

        modalEl.innerHTML = contentHtml;

    }).catch((err) => {
        console.error("Gagal mengambil detail arsip:", err);
        miuiAlert("Terjadi kesalahan saat memuat detail arsip dari database!");
    });
};

// Fungsi Eksekusi Hapus Arsip (Mendukung Hapus Semua, DO/FDN Spesifik, atau Titipan Saja)
window.eksekusiHapusArsip = function(kategori, muatId) {
    const selectEl = document.getElementById('select-hapus-arsip-target');
    if (!selectEl) return;
    const targetVal = selectEl.value;

    const path = `ceklist_muat/arsip_cetak/ceklist_${kategori}/${muatId}`;

    // Helper untuk reset cache arsip agar list di panel kanan benar-benar fresh dari database
    const triggerRefreshList = function() {
        // Kosongkan variabel cache arsip jika ada di aplikasi Anda (sesuaikan nama variabelnya jika berbeda)
        if (typeof window.cacheArsipCetak !== 'undefined') window.cacheArsipCetak = null;
        if (typeof window.allArsipCache !== 'undefined') window.allArsipCache = null;
        if (typeof invalidateArsipCache === 'function') invalidateArsipCache();

        // Panggil render ulang list riwayat
        if (typeof renderRiwayatArsipCetak === 'function') {
            renderRiwayatArsipCetak();
        }
    };

    if (targetVal === 'semua') {
        miuiConfirm("Apakah Anda yakin ingin menghapus seluruh arsip muat ini dari database?", function() {
            firebase.database().ref(path).remove().then(() => {
                miuiAlert("Arsip berhasil dihapus sepenuhnya!");
                
                const modalDetail = document.getElementById('modal-detail-arsip');
                if (modalDetail) modalDetail.remove();

                triggerRefreshList();
            }).catch(err => {
                console.error(err);
                miuiAlert("Gagal menghapus arsip!");
            });
        });
    } else if (targetVal === 'titipan') {
        miuiConfirm("Apakah Anda yakin ingin menghapus data titipan dari arsip ini?", function() {
            firebase.database().ref(`${path}/titipan`).remove().then(() => {
                miuiAlert("Data titipan berhasil dihapus dari arsip!");
                
                if (typeof previewArsipDetail === 'function') previewArsipDetail(kategori, muatId);
                triggerRefreshList();
            }).catch(err => {
                console.error(err);
                miuiAlert("Gagal menghapus data titipan!");
            });
        });
    } else {
        miuiConfirm(`Apakah Anda yakin ingin menghapus nomor DO/FDN (${targetVal}) dari arsip ini?`, function() {
            const subPath = `${path}/${targetVal}`;
            
            firebase.database().ref(subPath).remove().then(() => {
                firebase.database().ref(path).once('value').then(snap => {
                    const val = snap.val() || {};
                    const remainingKeys = Object.keys(val).filter(k => k !== 'meta' && k !== 'titipan' && k !== 'total_muat_keseluruhan');
                    
                    if (remainingKeys.length === 0 && !val.titipan) {
                        // Jika semua item DO/FDN dan titipan habis, hapus seluruh node muatId
                        firebase.database().ref(path).remove().then(() => {
                            miuiAlert("Item DO/FDN terpilih berhasil dihapus dari arsip!");
                            
                            const modalDetail = document.getElementById('modal-detail-arsip');
                            if (modalDetail) modalDetail.remove();

                            triggerRefreshList();
                        });
                    } else {
                        // Hitung ulang total muat keseluruhan dari DO/FDN yang tersisa
                        let newTotal = 0;
                        remainingKeys.forEach(rk => {
                            newTotal += (val[rk]?.meta?.total_muat || 0);
                        });
                        
                        firebase.database().ref(path).update({ total_muat_keseluruhan: newTotal }).then(() => {
                            miuiAlert("Item DO/FDN terpilih berhasil dihapus dari arsip!");
                            
                            if (typeof previewArsipDetail === 'function') previewArsipDetail(kategori, muatId);
                            triggerRefreshList();
                        });
                    }
                });
            }).catch(err => {
                console.error(err);
                miuiAlert("Gagal menghapus item DO/FDN!");
            });
        });
    }
};

// ==========================================
// FUNGSI CETAK ULANG ARSIP (MENDUKUNG FDN GABUNGAN)
// ==========================================
window.cetakUlangArsip = async function(kategori, muatId) {
    console.log("Tombol Cetak Ulang Diklik!", kategori, muatId);

    if (!kategori || !muatId) {
        if (typeof miuiAlert === 'function') miuiAlert("Data arsip tidak valid!");
        else alert("Data arsip tidak valid!");
        return;
    }

    try {
        const nodePath = String(kategori).toLowerCase().includes('do') ? 'ceklist_do' : 'ceklist_fdn';
        const snapshot = await firebase.database().ref(`ceklist_muat/arsip_cetak/${nodePath}/${muatId}`).once('value');

        if (!snapshot.exists()) {
            if (typeof miuiAlert === 'function') miuiAlert("Data arsip tidak ditemukan di database.");
            else alert("Data arsip tidak ditemukan di database.");
            return;
        }

        const dataArsip = snapshot.val();
        const meta = dataArsip.meta || {};
        const customerOrTujuan = meta.namacustomer || muatId;

        // Kumpulkan semua nomor bukti unik dan item barang utama (DO / FDN)
        let listNoBukti = [];
        let allItemsArray = [];

        Object.keys(dataArsip).forEach(subKey => {
            if (['meta', 'titipan', 'rekap', 'total_muat_keseluruhan'].includes(subKey)) return;
            const docObj = dataArsip[subKey];
            if (docObj) {
                const noBuktiAsli = docObj.meta?.nobukti || subKey;
                if (!listNoBukti.includes(noBuktiAsli)) {
                    listNoBukti.push(noBuktiAsli);
                }
                if (docObj.data) {
                    Object.values(docObj.data).forEach(row => {
                        row._nobuktiAsli = noBuktiAsli;
                        row._isTitipan = false;
                        allItemsArray.push(row);
                    });
                }
            }
        });

        // --- SORTING DATA DO/FDN UTAMA: WHNB-2 ditaruh paling akhir ---
        allItemsArray.sort((a, b) => {
            const gudangA = String(a.kodegudang || '').toUpperCase();
            const gudangB = String(b.kodegudang || '').toUpperCase();
            const isWhnb2A = gudangA.includes('WHNB-2');
            const isWhnb2B = gudangB.includes('WHNB-2');
            
            if (isWhnb2A && !isWhnb2B) return 1;
            if (!isWhnb2A && isWhnb2B) return -1;
            return 0;
        });

        const titipanObj = dataArsip.titipan || {};

        // --- KUMPULKAN FDN GABUNGAN (JIKA ADA CHECKBOX GABUNG SAAT SIMPAN) ---
        const fdnGabungObj = titipanObj.FDN_GABUNGAN || {};
        let fdnGabungArray = [];
        let namaTujuanFdnGabung = '';

        Object.keys(fdnGabungObj).forEach(k => {
            const item = fdnGabungObj[k];
            if (!namaTujuanFdnGabung && item.tujuan) {
                // Ubah STOCK POINT menjadi SP, biarkan DEPO tetap
                let cleanTujuan = String(item.tujuan).toUpperCase().replace(/STOCK POINT/g, 'SP');
                namaTujuanFdnGabung = cleanTujuan;
            }
            fdnGabungArray.push({
                kodebarang: String(item.kodebarang || '').replace(/_/g, ' '),
                qty_b: Number(item.qty || 0),
                kodegudang: 'WH-2',
                _nobuktiAsli: item.nobukti || 'FDN',
                _isTitipan: false
            });
        });

        // --- KUMPULKAN DATA TINGGALAN & DIY ---
        let tinggalanDiyArray = [];

        Object.keys(titipanObj).forEach(kTitipan => {
            const lowerK = kTitipan.toLowerCase();
            if (lowerK.includes('tinggalan') || lowerK.includes('diy')) {
                const itemsT = titipanObj[kTitipan];
                if (itemsT) {
                    const isDiy = lowerK.includes('diy');
                    let labelGudang = isDiy ? 'DIY' : 'TINGGALAN';

                    Object.values(itemsT).forEach(tItem => {
                        const rawQty = Number(tItem.qty || tItem.qty_b || tItem.qty_utama || 0);
                        const effectiveQty = isDiy ? Math.ceil(rawQty / 2) : rawQty;
                        const displayQtyStr = isDiy ? `${rawQty}:2` : `${rawQty}`;

                        let namaBarangRaw = tItem.namabarang || tItem.kodebarang || labelGudang;
                        let namaBarangClean = String(namaBarangRaw).replace(/_/g, ' ');

                        tinggalanDiyArray.push({
                            kodebarang: namaBarangClean,
                            qty_b: effectiveQty,
                            display_qty: displayQtyStr,
                            kodegudang: labelGudang,
                            _nobuktiAsli: 'TITIPAN',
                            _isTitipan: false
                        });
                    });
                }
            }
        });

        // Gabungkan data DO/FDN Utama dengan TINGGALAN / DIY
        let coreItemsCombined = [...allItemsArray];
        if (tinggalanDiyArray.length > 0) {
            coreItemsCombined.push({ _isEmptySpacer: true });
            coreItemsCombined = coreItemsCombined.concat(tinggalanDiyArray);
        }

        // --- SISIPKAN FDN GABUNGAN DI BAWAH DO (2 Baris Kosong + Header Judul FDN) ---
        if (fdnGabungArray.length > 0) {
            coreItemsCombined.push({ _isEmptySpacer: true });
            coreItemsCombined.push({ _isEmptySpacer: true });
            
            const titleHeaderFdn = namaTujuanFdnGabung ? `=== ${namaTujuanFdnGabung} ===` : `=== DATA FDN GABUNGAN ===`;
            coreItemsCombined.push({ _isHeaderTitle: true, titleTeks: titleHeaderFdn });
            
            coreItemsCombined = coreItemsCombined.concat(fdnGabungArray);
        }

        // --- KUMPULKAN TITIPAN MURNI (HRD & PROMOSI) ---
        const prioritasTitipanMurni = ['hrd', 'promosi'];
        let titipanMurniArray = [];
        let totalQtyTitipan = 0;

        prioritasTitipanMurni.forEach(keyPrioritas => {
            Object.keys(titipanObj).forEach(kTitipan => {
                if (kTitipan.toLowerCase().includes(keyPrioritas)) {
                    const itemsT = titipanObj[kTitipan];
                    if (itemsT) {
                        let rawLabel = kTitipan.toUpperCase();
                        let labelTitipan = rawLabel;
                        if (rawLabel.includes('HRD')) labelTitipan = 'HRD / ATK';
                        else if (rawLabel.includes('PROMOSI')) labelTitipan = 'PROMOSI';

                        Object.values(itemsT).forEach(tItem => {
                            const qtyT = Number(tItem.qty || tItem.qty_b || tItem.qty_utama || 0);
                            totalQtyTitipan += qtyT;

                            let namaBarangRaw = tItem.namabarang || tItem.kodebarang || kTitipan;
                            let namaBarangClean = String(namaBarangRaw).replace(/_/g, ' ');

                            titipanMurniArray.push({
                                kodebarang: namaBarangClean,
                                qty_b: qtyT,
                                kodegudang: labelTitipan,
                                _isTitipan: true
                            });
                        });
                    }
                }
            });
        });

        // --- GABUNGKAN TITIPAN MURNI (DIBERI 2 BARIS KOSONG) ---
        let combinedRows = [...coreItemsCombined];
        if (titipanMurniArray.length > 0) {
            for (let i = 0; i < 2; i++) {
                combinedRows.push({ _isEmptySpacer: true });
            }
            combinedRows = combinedRows.concat(titipanMurniArray);
        }

        if (combinedRows.length === 0) {
            if (typeof miuiAlert === 'function') miuiAlert("Tidak ada rincian item barang pada arsip ini.");
            else alert("Tidak ada rincian item barang pada arsip ini.");
            return;
        }

        // --- FORMAT NOMOR DO / FDN ---
        let formattedNoDoc = '';
        const prefix = nodePath.includes('do') ? 'DO-' : 'DN-';
        listNoBukti.forEach((nb, idx) => {
            let cleanNb = String(nb).trim();
            if (idx === 0) {
                formattedNoDoc += cleanNb.startsWith(prefix.replace('-', '')) ? cleanNb : `${prefix}${cleanNb}`;
            } else {
                let digits = cleanNb.replace(/\D/g, '');
                let last5 = digits.length >= 5 ? digits.slice(-5) : digits;
                formattedNoDoc += ` | ${last5}`;
            }
        });

        const isDO = nodePath.includes('do');
        const headerTitle = isDO ? "CHECKLIST MUATAN Gd. WH-2" : "CHECKLIST MUATAN DEPO / STOCK POINT Gd. WH-2";
        const nowFormatted = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' });
        const logoUrl = "https://raw.githubusercontent.com/komputerwh2-svg/warelogos.github.io/main/uth.png";

        // --- CHUNKING DATA: Maksimal 45 item per halaman ---
        const ITEMS_PER_PAGE = 45;
        const pageChunks = [];
        for (let i = 0; i < combinedRows.length; i += ITEMS_PER_PAGE) {
            pageChunks.push(combinedRows.slice(i, i + ITEMS_PER_PAGE));
        }
        if (pageChunks.length === 0) pageChunks.push([]);

        let pagesHtml = '';
        let validItemCounter = 0;

        pageChunks.forEach((chunkItems, pageIdx) => {
            let rowsHtml = '';
            chunkItems.forEach((row) => {

                // 1. Render Baris Judul Pemisah FDN (Merge dari Kode Rasa sampai Gudang)
                if (row._isHeaderTitle) {
                    rowsHtml += `
                        <tr style="border-bottom: 1px solid #000; background-color: #f8fafc; font-weight: bold;">
                            <td style="border-right: 1px solid #000; padding: 2px;"></td>
                            <td colspan="4" style="border-right: 1px solid #000; padding: 3px; text-align: center; font-size: 10pt; font-family: Trebuchet MS; letter-spacing: 0.5px;">
                                ${row.titleTeks}
                            </td>
                            <td style="border-right: 1px solid #000; padding: 2px;"></td>
                            <td style="padding: 2px;"></td>
                        </tr>
                    `;
                    return;
                }

                // 2. Render Baris Kosong Pemisah
                if (row._isEmptySpacer) {
                    rowsHtml += `
                        <tr style="border-bottom: 1px solid #cbd5e1; font-size: 10pt;">
                            <td style="border-right: 1px solid #000; padding: 1px 2px; text-align: center;">&nbsp;</td>
                            <td style="border-right: 1px solid #000; padding: 1px 2px;"></td>
                            <td style="border-right: 1px solid #000; padding: 1px 2px;"></td>
                            <td style="border-right: 1px solid #000; padding: 1px 2px;"></td>
                            <td style="border-right: 1px solid #000; padding: 1px 2px;"></td>
                            <td style="border-right: 1px solid #000; padding: 1px 2px;"></td>
                            <td style="padding: 1px 2px;"></td>
                        </tr>
                    `;
                    return;
                }

                validItemCounter++;

                // 3. Render Baris Titipan Murni (HRD & PROMOSI)
                if (row._isTitipan) {
                    rowsHtml += `
                        <tr style="border-bottom: 1px solid #94a3b8; font-size: 10pt;">
                            <td style="border-right: 1px solid #000; padding: 1px 2px; text-align: center; width: 30px;">${validItemCounter}</td>
                            <td style="border-right: 1px solid #000; padding: 1px 5px; font-size: 10pt; width: 45px; font-weight: bold; font-family: Trebuchet MS;">${row.kodebarang}</td>
                            <td style="border-right: 1px solid #000; padding: 1px 2px; text-align: center; width: 26px;"></td>
                            <td style="border-right: 1px solid #000; padding: 1px 18px; text-align: center; width: 50px; font-size: 10pt; font-weight: bold; font-family: Trebuchet MS;">${row.qty_b}</td>
                            <td style="border-right: 1px solid #000; padding: 1px 5px; text-align: center; width: 80px; font-size: 10pt;">
                                <span style="font-weight: bold; font-family: Trebuchet MS;">${row.kodegudang}</span>
                            </td>
                            <td style="border-right: 1px solid #000; padding: 1px 2px;"></td>
                            <td style="padding: 1px 2px; width: 50px;"></td>
                        </tr>
                    `;
                    return;
                }

                // 4. Render Baris Barang Normal (DO / FDN Gabungan / TINGGALAN / DIY)
                let digits = String(row._nobuktiAsli || '').replace(/\D/g, '');
                let subNoBukti = digits.length >= 5 ? digits.slice(-5) : digits;
                let gudangTeks = row.kodegudang || 'WH-2';
                let sourceTag = (row._nobuktiAsli === 'TITIPAN') ? '' : `<span style="font-family: Trebuchet MS; font-size: 6pt; color: #334155;">(${subNoBukti})</span>`;
                let qtyTampil = row.display_qty ? row.display_qty : (row.qty_b || row.qty_utama || 0);

                rowsHtml += `
                    <tr style="border-bottom: 1px solid #94a3b8; font-size: 10pt;">
                        <td style="border-right: 1px solid #000; padding: 1px 2px; text-align: center; width: 30px;">${validItemCounter}</td>
                        <td style="border-right: 1px solid #000; padding: 1px 5px; font-size: 10pt; width: 45px; font-weight: bold; font-family: Trebuchet MS;">${row.kodebarang}</td>
                        <td style="border-right: 1px solid #000; padding: 1px 2px; text-align: center; width: 26px;"></td>
                        <td style="border-right: 1px solid #000; padding: 1px 18px; text-align: center; width: 50px; font-size: 10pt; font-weight: bold; font-family: Trebuchet MS;">${qtyTampil}</td>
                        <td style="border-right: 1px solid #000; padding: 1px 5px; text-align: center; width: 80px; font-size: 10pt;">
                            <span style="font-weight: bold; font-family: Trebuchet MS;">${gudangTeks}</span> ${sourceTag}
                        </td>
                        <td style="border-right: 1px solid #000; padding: 1px 2px;"></td>
                        <td style="padding: 1px 2px; width: 50px;"></td>
                    </tr>
                `;
            });

            // Isian baris penyeimbang 45 baris per halaman
            for (let i = chunkItems.length; i < ITEMS_PER_PAGE; i++) {
                rowsHtml += `
                    <tr style="border-bottom: 1px solid #cbd5e1; font-size: 10pt;">
                        <td style="border-right: 1px solid #000; padding: 1px 2px; text-align: center;">&nbsp;</td>
                        <td style="border-right: 1px solid #000; padding: 1px 2px;"></td>
                        <td style="border-right: 1px solid #000; padding: 1px 2px;"></td>
                        <td style="border-right: 1px solid #000; padding: 1px 2px;"></td>
                        <td style="border-right: 1px solid #000; padding: 1px 2px;"></td>
                        <td style="border-right: 1px solid #000; padding: 1px 2px;"></td>
                        <td style="padding: 1px 2px;"></td>
                    </tr>
                `;
            }

            // --- REKAP KELOMPOK (Termasuk FDN Gabungan) ---
            let r = { 
                'DIY': 0, 'MTR/PDR': 0, 'CRR/THR': 0, 'MRR/CRR EA': 0, 
                'MRR EA': 0, 'MOR/MOB': 0, 'MP/LTGR/MTGR': 0, 'MJR': 0 
            };
            let totalHalaman = 0;
            
            chunkItems.forEach(item => {
                if (item._isTitipan || item._isEmptySpacer || item._isHeaderTitle) return;
                const kelompok = typeof hitungKelompokKodeBarang === 'function' ? hitungKelompokKodeBarang(item.kodebarang) : 'Lainnya';
                let qty = Number(item.effective_qty !== undefined ? item.effective_qty : (item.qty_b || item.qty_utama || 0));
                const isDiyItem = (item.kodegudang === 'DIY' || kelompok === 'DIY');
                const rKey = isDiyItem ? 'DIY' : kelompok;

                if (r.hasOwnProperty(rKey)) r[rKey] += qty;
                totalHalaman += qty;
            });

            let totalSemuaItem = 0;
            coreItemsCombined.forEach(item => {
                if (!item._isEmptySpacer && !item._isHeaderTitle) {
                    totalSemuaItem += Number(item.qty_b || item.qty_utama || 0);
                }
            });

            let infoTotalTeks = `${totalHalaman} KRT / Total Muat : ${totalSemuaItem} KRT`;

            const rekapHtml = `
                <div style="border-top: 2px solid #000; font-family: 'Trebuchet MS', Arial, sans-serif; font-size: 10pt; margin-top: 2px;">
                    <table style="width: 100%; border-collapse: collapse; border-bottom: 1px solid #000;">
                        <tr>
                            <td style="width: 276px; border-right: 1px solid #000; padding: 0; vertical-align: top;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr style="border-bottom: 1px solid #000;">
                                        <td style="padding: 4px 6px; font-weight: bold; font-size: 10pt; text-align: left;">TOTAL CHECKLIST</td>
                                        <td style="padding: 4px 6px; font-weight: bold; font-size: 12pt; text-align: center; width: 65px; border-left: 1px solid #000; text-decoration: underline;">
                                            ${totalHalaman}
                                        </td>
                                    </tr>
                                </table>
                                <div style="padding: 4px 6px; font-weight: bold; font-size: 8pt; line-height: 1.2;">
                                    Total Titipan : ${totalQtyTitipan > 0 ? totalQtyTitipan + ' KRT' : '-'}
                                </div>
                                <div style="padding: 2px 6px 4px 6px; font-weight: bold; font-size: 8pt; line-height: 1.2;">
                                    Total Checklist : ${infoTotalTeks}
                                </div>
                            </td>
                            <td style="border-right: 1px solid #000; padding: 4px 5px; font-style: italic; font-size: 7pt; vertical-align: top; width: 160px; line-height: 1.2;">
                                Barang yang telah dimuat di armada dan diperiksa bersama, setelah meninggalkan gudang sepenuhnya menjadi tanggung jawab driver.
                            </td>
                            <td style="border-right: 1px solid #000; padding: 4px; text-align: center; vertical-align: top;">
                                <div style="font-weight: bold; margin-bottom: 22px;">TTD Checker</div>
                                <span style="border-top: 1px solid #000; display: inline-block; width: 110px;"></span>
                            </td>
                            <td style="padding: 4px; text-align: center; vertical-align: top;">
                                <div style="font-weight: bold; margin-bottom: 22px;">TTD Driver</div>
                                <span style="border-top: 1px solid #000; display: inline-block; width: 110px;"></span>
                            </td>
                        </tr>
                    </table>
                    <div style="border-bottom: 1px solid #000;">
                        <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-bottom: 1px solid #000; text-align: center; font-size: 8pt; font-family: 'Trebuchet MS', Arial, sans-serif;">
                            <div style="border-right: 1px solid #0000008e; padding: 2px;">DIY = ${r['DIY'] > 0 ? r['DIY'] : '-'}</div>
                            <div style="border-right: 1px solid #0000008e; padding: 2px;">MRR/CRR EA = ${r['MRR/CRR EA'] > 0 ? r['MRR/CRR EA'] : '-'}</div>
                            <div style="border-right: 1px solid #0000008e; padding: 2px;">CRR/THR = ${r['CRR/THR'] > 0 ? r['CRR/THR'] : '-'}</div>
                            <div style="padding: 2px;">MOR/MOB = ${r['MOR/MOB'] > 0 ? r['MOR/MOB'] : '-'}</div>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); text-align: center; font-size: 8pt; font-family: 'Trebuchet MS', Arial, sans-serif;">
                            <div style="border-right: 1px solid #0000008e; padding: 2px;">MTR/PDR = ${r['MTR/PDR'] > 0 ? r['MTR/PDR'] : '-'}</div>
                            <div style="border-right: 1px solid #0000008e; padding: 2px;">MRR EA = ${r['MRR EA'] > 0 ? r['MRR EA'] : '-'}</div>
                            <div style="border-right: 1px solid #0000008e; padding: 2px;">MJR = ${r['MJR'] > 0 ? r['MJR'] : '-'}</div>
                            <div style="padding: 2px;">MP/LTGR/MTGR = ${r['MP/LTGR/MTGR'] > 0 ? r['MP/LTGR/MTGR'] : '-'}</div>
                        </div>
                    </div>
                </div>
            `;

            pagesHtml += `
                <div class="page">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 3px; margin-bottom: 5px;">
                            <div style="width: 120px;"><img src="${logoUrl}" class="logo-kop" style="height: 30px; object-fit: contain;"></div>
                            <h2 style="font-size: 14pt; font-weight: 900; text-transform: uppercase; margin: 0; text-align: center; flex-grow: 1; letter-spacing: 0.5px;">${headerTitle}</h2>
                            <div style="width: 160px; text-align: right; font-size: 6pt; font-family: monospace; line-height: 1.2;">print date : ${nowFormatted}</div>
                        </div>

                        <table style="border: 1px solid #000; font-size: 9.5pt; margin-bottom: 6px; width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 6px; width: 50%;">
                                    <div style="display: flex;">
                                        <span style="width: 110px; display: inline-block; font-family: Century Gothic;">Ekspedisi & Nopol</span>
                                        <span>: </span>
                                    </div>
                                </td>
                                <td style="border-bottom: 1px solid #000; padding: 0px;">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="padding: 3px 6px; border: none;">
                                                <div style="display: flex;">
                                                    <span style="width: 95px; display: inline-block; font-family: Century Gothic;">Tanggal Muat</span>
                                                    <span>: </span>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 6px;">
                                    <div style="display: flex;">
                                        <span style="width: 110px; display: inline-block; font-family: Century Gothic;">Nama Driver</span>
                                        <span>: </span>
                                    </div>
                                </td>
                                <td style="border-bottom: 1px solid #000; padding: 0px;">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="border-right: 1px solid #000; padding: 3px 6px; width: 50%; border: none;">
                                                <div style="display: flex;">
                                                    <span style="width: 95px; display: inline-block; font-family: Century Gothic;">Jam Muat</span>
                                                    <span>: </span>
                                                </div>
                                            </td>
                                            <td style="padding: 3px 6px; width: 50%; border: none;">
                                                <div style="display: flex;">
                                                    <span style="width: 95px; display: inline-block; font-family: Century Gothic;">Jam Selesai</span>
                                                    <span>: </span>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="border-right: 1px solid #000; padding: 3px 6px; vertical-align: top;">
                                    <div style="margin-bottom: 2px; font-family: Century Gothic;">Nomor DO & Kota Tujuan :</div>
                                    <div style="font-weight: bold; font-size: 11pt; font-family: Trebuchet MS; padding-top: 2px;">${formattedNoDoc}</div>
                                </td>
                                <td style="padding: 0px; vertical-align: top;">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 6px; width: 50%; border-top: none; border-left: none; font-family: Century Gothic;">
                                                Driver Check : &nbsp; Ya &nbsp;&nbsp; Tidak
                                            </td>
                                            <td style="border-bottom: 1px solid #000; padding: 3px 6px; width: 50%; border-top: none; border-left: none; border-right: none;">
                                                <div style="display: flex;">
                                                    <span style="width: 95px; display: inline-block; font-family: Century Gothic;">Muat Pintu</span>
                                                    <span>: </span>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colspan="2" style="padding: 4px 6px; border: none; font-weight: bold; font-size: 11pt;">
                                                ${customerOrTujuan}
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <table style="border: 1px solid #000;">
                            <thead>
                                <tr style="background-color: #e6e6e6; text-align: center; font-size: 13pt; font-family: 'Trebuchet MS'; font-weight: normal;">
                                    <th style="border: 1px solid #000; padding: 2px; width: 28px;">No</th>
                                    <th style="border: 1px solid #000; padding: 2px; width: 145px;">Kode Rasa</th>
                                    <th style="border: 1px solid #000; padding: 2px; width: 24px;">v</th>
                                    <th style="border: 1px solid #000; padding: 2px; width: 45px;">QTY</th>
                                    <th style="border: 1px solid #000; padding: 2px; width: 90px;">Gudang</th>
                                    <th style="border: 1px solid #000; padding: 2px;">Checklist</th>
                                    <th style="border: 1px solid #000; padding: 2px; width: 60px;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>

                    <div>
                        ${rekapHtml}
                        <div style="display: flex; justify-content: space-between; font-size: 8pt; font-family: Arial; margin-top: 4px; color: #475569;">
                            <span>No. Form : 25.UM/05-02-25/01/0</span>
                            <span>Halaman ${pageIdx + 1} dari ${pageChunks.length}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        const finalHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cetak Ulang - ${muatId}</title>
                <style>
                    @page { 
                        size: 215mm 330mm portrait; 
                        margin: 5mm 5mm 4mm 5mm;
                    }
                    body { 
                        font-family: 'Trebuchet MS', Arial, sans-serif; 
                        font-size: 10pt; 
                        color: #000; 
                        margin: 0; 
                        padding: 0; 
                        background: #fff; 
                        -webkit-print-color-adjust: exact;
                    }
                    .page { 
                        display: flex; 
                        flex-direction: column; 
                        justify-content: space-between; 
                        padding: 8px 10px; 
                        height: 321mm; 
                        box-sizing: border-box; 
                        page-break-after: always;
                        break-after: page;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                    }
                </style>
            </head>
            <body>
                ${pagesHtml}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 300);
                    };
                    // Otomatis menutup tab setelah cetak selesai atau dialog print ditutup
                    window.onafterprint = function() {
                        window.close();
                    };
                </script>
            </body>
            </html>
        `;

        const win = window.open("", "_blank");
        if (win) {
            win.document.write(finalHtml);
            win.document.close();
        } else {
            if (typeof miuiAlert === 'function') miuiAlert("Pop-up diblokir oleh browser! Harap izinkan pop-up untuk situs ini.");
            else alert("Pop-up diblokir oleh browser! Harap izinkan pop-up untuk situs ini.");
        }

    } catch (err) {
        console.error("Gagal mencetak ulang arsip:", err);
        if (typeof miuiAlert === 'function') miuiAlert("Terjadi kesalahan saat memuat data arsip untuk dicetak ulang.");
    }
};

// Variabel global untuk menyimpan data titipan sementara
let dataTitipanList = [];
let aktifKategoriTitipan = '';

// Fungsi untuk membuka popover titipan berdasarkan kategori (PROMOSI / HRD / TINGGALAN)
window.bukaPopoverTitipan = function(kategori, event) {
    event.stopPropagation();
    aktifKategoriTitipan = kategori;
    
    const popover = document.getElementById('popover-form-titipan');
    const judul = document.getElementById('judul-popover-titipan');
    if (!popover) return;

    judul.innerText = `Tambah Titipan - ${kategori}`;
    
    // Posisikan popover di dekat tombol yang diklik
    const rect = event.currentTarget.getBoundingClientRect();
    popover.style.top = `${rect.bottom + window.scrollY + 5}px`;
    popover.style.left = `${rect.left + window.scrollX}px`;
    popover.classList.remove('hidden');

    // Fokus ke input nama barang
    setTimeout(() => {
        const inputNama = document.getElementById('input-nama-titipan');
        if (inputNama) {
            inputNama.value = '';
            inputNama.focus();
        }
        const inputQty = document.getElementById('input-qty-titipan');
        if (inputQty) inputQty.value = '';
    }, 50);
};

// Fungsi untuk menutup popover titipan
window.tutupPopoverTitipan = function() {
    const popover = document.getElementById('popover-form-titipan');
    if (popover) {
        popover.classList.add('hidden');
    }
};

// Fungsi untuk menyimpan item titipan yang diinput
window.simpanDataTitipan = function() {
    const namaBarang = document.getElementById('input-nama-titipan').value.trim();
    const qty = document.getElementById('input-qty-titipan').value.trim();

    if (!namaBarang) {
        miuiAlert("Nama barang titipan tidak boleh kosong!");
        return;
    }

    // Masukkan ke array data titipan
    dataTitipanList.push({
        kategori: aktifKategoriTitipan,
        nama: namaBarang.toUpperCase(),
        qty: qty || '1'
    });

    tutupPopoverTitipan();
    renderListTitipan();
};

// Fungsi untuk merender/menampilkan daftar item titipan ke dalam kotak pratinjau
function renderListTitipan() {
    const container = document.getElementById('container-list-titipan');
    if (!container) return;

    if (dataTitipanList.length === 0) {
        container.innerHTML = `<div class="text-slate-400 text-xs">Belum ada item titipan ditambahkan...</div>`;
        return;
    }

    let html = '';
    // Kelompokkan atau tampilkan berurutan dengan label kategori
    dataTitipanList.forEach((item, index) => {
        html += `
            <div class="flex items-center justify-between bg-orange-50/80 border border-orange-200 rounded px-2 py-1 text-[10px]">
                <div class="flex items-center gap-2">
                    <span class="bg-orange-600 text-white font-bold px-1 rounded text-[8px]">${item.kategori}</span>
                    <span class="font-medium text-slate-800">${item.nama}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-bold text-orange-700">(${item.qty} KRT)</span>
                    <button onclick="hapusItemTitipan(${index})" class="text-red-500 hover:text-red-700 font-bold px-1"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Fungsi untuk menghapus item titipan dari daftar
window.hapusItemTitipan = function(index) {
    dataTitipanList.splice(index, 1);
    renderListTitipan();
};


// Variabel Cache Lokal untuk Menyimpan Data DO/FDN Sementara Sesi Ini
let cacheCeklistDO = {};
let cacheCeklistFDN = {};

// Fungsi Import Multiple File DO (.xls / .xlsx) ke Cache & Render Otomatis
window.importDO = function() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xls, .xlsx';
    fileInput.multiple = true;
    
    fileInput.onchange = function(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        let processedFiles = 0;
        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                    
                    if (!rows || rows.length === 0) return;

                    const rowFirst = rows[0];
                    const rawTgl = String(rowFirst.TGL || '').trim();
                    const rawNoBukti = String(rowFirst.NOBUKTI || '').trim();
                    const rawNamaCust = String(rowFirst.NAMACUSTOMER || '').trim();

                    if (!rawNoBukti) return;

                    // Format Tanggal YYYY_MM_DD
                    let tglFormatted = rawTgl;
                    if (rawTgl.includes('/')) {
                        const parts = rawTgl.split('/');
                        if (parts.length === 3) tglFormatted = `${parts[2]}_${parts[1]}_${parts[0]}`;
                    } else if (rawTgl.includes('-')) {
                        const parts = rawTgl.split('-');
                        if (parts.length === 3) {
                            tglFormatted = parts[0].length === 4 ? `${parts[0]}_${parts[1]}_${parts[2]}` : `${parts[2]}_${parts[1]}_${parts[0]}`;
                        }
                    }

                    const namaCustClean = rawNamaCust.replace(/[\/\s]+/g, '_').toUpperCase();
                    const noBuktiDigits = rawNoBukti.replace(/\D/g, '');
                    const last5NoBukti = noBuktiDigits.length >= 5 ? noBuktiDigits.slice(-5) : noBuktiDigits;
                    const uniqueId = `${tglFormatted}_${namaCustClean}_${last5NoBukti}`.toUpperCase();

                    // Meta Data
                    const metaData = {
                        nobukti: rawNoBukti.toUpperCase(),
                        tgl: rawTgl.toUpperCase(),
                        namacustomer: rawNamaCust.toUpperCase()
                    };

                    // Data Item Barang & Total Muat
                    const itemsData = {};
                    let totalMuat = 0;
                    rows.forEach((row) => {
                        const kodeBarang = String(row.KODEBARANG || '').trim().toUpperCase();
                        const kodeGudang = String(row.KODEGUDANG || '').trim().toUpperCase();
                        const qtyB = Number(row.QTY_B || row.QTY || 0);

                        if (kodeBarang) {
                            itemsData[kodeBarang] = {
                                kodebarang: kodeBarang,
                                kodegudang: kodeGudang,
                                qty_b: qtyB
                            };
                            totalMuat += qtyB;
                        }
                    });

                    // Simpan ke Cache DO
                    cacheCeklistDO[uniqueId] = {
                        meta: metaData,
                        data: itemsData,
                        total_muat: totalMuat
                    };

                } catch (err) {
                    console.error("Gagal memproses file DO:", file.name, err);
                } finally {
                    processedFiles++;
                    // Jika semua file selesai dibaca, render tampilan secara otomatis
                    if (processedFiles === files.length) {
                        renderDaftarDOPreview();
                        renderTabelItemMuatOtomatis();
                    }
                }
            };
            reader.readAsArrayBuffer(file);
        });
    };
    
    fileInput.click();
};


// 1. Fungsi Utama Trigger Import FDN (.txt)
window.importFDN = function() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt';
    fileInput.multiple = true; // Mendukung multiple file txt FDN sekaligus
    
    fileInput.onchange = function(e) {
        const files = e.target.files;
        if (!files.length) return;

        let processedCount = 0;
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const textContent = event.target.result;
                parseTextFDNToCache(textContent, file.name);
                processedCount++;
                
                if (processedCount === files.length) {
                    // Render ulang tampilan DO/FDN dan tabel item otomatis menggunakan fungsi yang benar
                    if (typeof renderDaftarDOPreview === 'function') renderDaftarDOPreview();
                    if (typeof renderTabelItemMuatOtomatis === 'function') renderTabelItemMuatOtomatis();
                }
            };
            reader.readAsText(file);
        });
    };
    
    fileInput.click();
};

// 2. Parser Teks .txt FDN ke Cache Ceklist FDN
window.parseTextFDNToCache = function(fileContent, fileName) {
    const lines = fileContent.split('\n');
    let dariGudangRaw = '', nomorDokumen = '', tanggal = '', tujuanRaw = '';
    let items = {};
    let totalMuatDoc = 0;

    lines.forEach(line => {
        if (line.includes('DARI GUDANG')) {
            const parts = line.split(':');
            if (parts.length > 1) dariGudangRaw = parts[1].trim().split(/\s{2,}/)[0];
        }
        
        if (line.includes('NOMOR DOKUMEN')) {
            const lastIndex = line.lastIndexOf('NOMOR DOKUMEN');
            const subStr = line.substring(lastIndex);
            const parts = subStr.split(':');
            if (parts.length > 1) {
                nomorDokumen = parts[1].trim().split(/\s{2,}/)[0];
            }
        }
        
        if (line.includes('TANGGAL')) {
            const match = line.match(/TANGGAL\s*:\s*([0-9\/]+)/);
            if (match) tanggal = match[1].trim();
        }
        
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
        if (/^\d+\s+[a-zA-Z0-9\-_]+/.test(trimmed)) {
            const tokens = trimmed.split(/\s+/);
            if (tokens.length >= 2) {
                const qtyTokenIndex = tokens.findIndex(t => /^\d+\/\d+\/\d+\/\d+$/.test(t) || (t.includes('/') && t.split('/').length === 4));
                
                if (qtyTokenIndex !== -1) {
                    const kode = tokens[1].trim().toUpperCase();
                    const qtyParts = tokens[qtyTokenIndex].split('/').map(Number);
                    
                    if (kode) {
                        const qtyKrt = qtyParts[0] || 0;
                        items[kode] = {
                            kodebarang: kode,
                            kodegudang: dariGudangRaw.includes("NON WMS") ? "WHNB-2" : "WH-2",
                            qty_b: qtyKrt,
                            sub: {
                                bal: qtyParts[1] || 0,
                                rtg: qtyParts[2] || 0,
                                pcs: qtyParts[3] || 0
                            }
                        };
                        totalMuatDoc += qtyKrt;
                    }
                }
            }
        }
    });

    if (!nomorDokumen) {
        nomorDokumen = fileName.replace('.txt', '').toUpperCase();
    }
    if (!tujuanRaw) {
        tujuanRaw = 'STOCK POINT';
    }

    // Format Gudang Meta
    let metaGudang = "WH-2";
    if (dariGudangRaw.includes("WH-2 HO NON WMS") || dariGudangRaw.includes("WH-3")) {
        metaGudang = "WHNB-2";
    }

    // Pastikan cacheCeklistFDN tersedia secara global
    if (typeof cacheCeklistFDN === 'undefined') {
        window.cacheCeklistFDN = {};
    }

    // Simpan ke cache FDN aktif
    cacheCeklistFDN[nomorDokumen] = {
        meta: {
            nobukti: nomorDokumen,
            namacustomer: tujuanRaw,
            tgl: tanggal || '-',
            gudang: metaGudang,
            total_muat: totalMuatDoc
        },
        data: items
    };
};


// 1. Perbarui Fungsi Proses Data WHNB-2 dengan Verifikasi Metadata DO Terpisah
window.prosesDataWHNB2 = function() {
    const metaTextarea = document.getElementById('ta-bosnet-meta');
    const itemTextarea = document.getElementById('ta-bosnet-input');
    
    if (!metaTextarea || !itemTextarea) return;

    const metaRaw = metaTextarea.value.trim();
    const itemRaw = itemTextarea.value.trim();

    if (!metaRaw) {
        miuiAlert("Silakan paste dari DO Bosnet terlebih dahulu pada kolom atas!");
        return;
    }

    if (!itemRaw) {
        miuiAlert("Silakan paste detail item WHNB-2 pada kolom bawah!");
        return;
    }

    // A. Parse Metadata DO dari teks yang dipaste
    const matchNoDoMeta = metaRaw.match(/(DO-[A-Z0-9\-]+|DN-[A-Z0-9\-]+)/);
    if (!matchNoDoMeta) {
        metaTextarea.value = '';
        itemTextarea.value = '';
        miuiAlert("Format Nomor DO tidak valid pada metadata yang dipaste!");
        return;
    }
    const metaNoDo = matchNoDoMeta[1].trim().toUpperCase();

    const matchTglMeta = metaRaw.match(/(\d{2}\/\d{2}\/\d{4})/);
    const metaTanggal = matchTglMeta ? matchTglMeta[1] : '';

    let metaCustomer = 'NAMA TUJUAN';
    const idxNoDoEnd = metaRaw.indexOf(metaNoDo) + metaNoDo.length;
    let sisaMeta = metaRaw.substring(idxNoDoEnd).trim();
    if (metaTanggal) {
        sisaMeta = sisaMeta.replace(metaTanggal, '').trim();
    }
    sisaMeta = sisaMeta.replace(/^[A-Z0-9\-]+/, '').trim();
    if (sisaMeta) {
        metaCustomer = sisaMeta.toUpperCase();
    }

    let tglFormatted = '';
    let tglDisplay = metaTanggal || '15/10/2026';
    if (metaTanggal) {
        const partsTgl = metaTanggal.split('/');
        if (partsTgl.length === 3) {
            tglFormatted = `${partsTgl[2]}_${partsTgl[1]}_${partsTgl[0]}`;
        }
    }
    if (!tglFormatted) {
        const d = new Date();
        tglFormatted = `${d.getFullYear()}_${String(d.getMonth()+1).padStart(2,'0')}_${String(d.getDate()).padStart(2,'0')}`;
    }

    // B. Parsing Baris Item WHNB-2 dan Validasi Pencocokan No DO
    const lines = itemRaw.split('\n');
    let importedCount = 0;
    let mismatchDetected = false;

    lines.forEach((line) => {
        if (!line.includes('WHNB-2')) return;

        const matchNoDoLine = line.match(/(DO-[A-Z0-9\-]+|DN-[A-Z0-9\-]+)/);
        if (!matchNoDoLine) return;
        const lineNoDo = matchNoDoLine[1].trim().toUpperCase();

        if (lineNoDo !== metaNoDo) {
            mismatchDetected = true;
            return;
        }

        try {
            const gudang = 'WHNB-2';
            const bagianSebelumGudang = line.substring(0, line.indexOf('WHNB-2'));
            const matchesQty = bagianSebelumGudang.match(/(\d+\/\d+\/\d+\/\d+)/g);
            if (!matchesQty || matchesQty.length === 0) return;
            
            const qtyStr = matchesQty[matchesQty.length - 1];
            const qtyParts = qtyStr.split('/');
            const qtyKarton = Number(qtyParts[0] || 0);

            if (qtyKarton <= 0) return;

            const idxNoDo = bagianSebelumGudang.indexOf(lineNoDo);
            const idxQty = bagianSebelumGudang.lastIndexOf(qtyStr);
            if (idxNoDo === -1 || idxQty === -1) return;

            let sisaTengah = bagianSebelumGudang.substring(idxNoDo + lineNoDo.length, idxQty).trim();
            const tokens = sisaTengah.split(/\s+/);
            const kodeBarang = tokens[0] ? tokens[0].toUpperCase() : '';

            if (!kodeBarang) return;

            const noBuktiDigits = metaNoDo.replace(/\D/g, '');
            const last5NoBukti = noBuktiDigits.length >= 5 ? noBuktiDigits.slice(-5) : noBuktiDigits;
            
            let cleanCust = metaCustomer.replace(/\bMT\b/g, '').replace(/[\/\-\_\.\s]+/g, '_').replace(/^_+|_+\$/g, '');
            const targetCacheKey = `${tglFormatted}_${cleanCust}_${last5NoBukti}`.toUpperCase();

            if (!cacheCeklistDO[targetCacheKey]) {
                cacheCeklistDO[targetCacheKey] = {
                    meta: {
                        nobukti: metaNoDo,
                        tgl: tglDisplay,
                        namacustomer: metaCustomer
                    },
                    data: {},
                    total_muat: 0
                };
            }

            if (!cacheCeklistDO[targetCacheKey].data[kodeBarang]) {
                cacheCeklistDO[targetCacheKey].data[kodeBarang] = {
                    kodebarang: kodeBarang,
                    kodegudang: gudang,
                    qty_b: 0
                };
            }

            cacheCeklistDO[targetCacheKey].data[kodeBarang].qty_b += qtyKarton;
            
            let totalMuatDO = 0;
            Object.keys(cacheCeklistDO[targetCacheKey].data).forEach((kb) => {
                totalMuatDO += cacheCeklistDO[targetCacheKey].data[kb].qty_b;
            });
            cacheCeklistDO[targetCacheKey].total_muat = totalMuatDO;

            importedCount++;

        } catch (err) {
            console.error("Gagal memproses baris WHNB-2:", line, err);
        }
    });

    // Jika terjadi ketidakcocokan nomor DO, kosongkan kedua textarea dan beri peringatan
    if (mismatchDetected) {
        metaTextarea.value = '';
        itemTextarea.value = '';
        miuiAlert("Peringatan: Nomor DO Tujuan tidak sama dengan Nomor DO item WHNB-2 yang dipaste!, Silakan periksa kembali data yang dipaste.");
        return;
    }

    if (importedCount > 0) {
        metaTextarea.value = '';
        itemTextarea.value = '';
        renderDaftarDOPreview();
        renderTabelItemMuatOtomatis();
        miuiAlert(`Berhasil memproses ${importedCount} item WHNB-2 untuk ${metaCustomer}!`);
    } else {
        metaTextarea.value = '';
        itemTextarea.value = '';
        miuiAlert("Tidak ditemukan data WHNB-2 valid atau verifikasi nomor DO gagal!");
    }
};

// Fungsi Hapus Cache DO Spesifik
window.hapusCacheDO = function(key) {
    if (cacheCeklistDO[key]) {
        delete cacheCeklistDO[key];
        renderDaftarDOPreview();
        renderTabelItemMuatOtomatis();
    }
};

// Fungsi Hapus Cache FDN Spesifik
window.hapusCacheFDN = function(key) {
    if (cacheCeklistFDN[key]) {
        delete cacheCeklistFDN[key];
        renderDaftarDOPreview();
        renderTabelItemMuatOtomatis();
    }
};

// Fungsi Render Daftar DO & FDN di Kotak Preview Panel Kiri (Tema FDN Abu-abu & Tombol Hapus)
function renderDaftarDOPreview() {
    const container = document.getElementById('container-list-fdn-ceklist');
    if (!container) return;

    const keysDO = Object.keys(cacheCeklistDO);
    const keysFDN = Object.keys(cacheCeklistFDN);

    if (keysDO.length === 0 && keysFDN.length === 0) {
        container.innerHTML = `<div class="text-slate-400 italic text-[10px]">Belum ada data DO atau FDN diimpor...</div>`;
        return;
    }

    let html = '';

    // Kelompok DO (Selalu di atas) - Tema Oranye
    if (keysDO.length > 0) {
        html += `<div class="text-[9px] font-black text-orange-700 uppercase mb-1 border-b border-orange-200 pb-0.5">Daftar DO</div>`;
        keysDO.forEach((key, index) => {
            const item = cacheCeklistDO[key];
            const jumlahItem = item.data ? Object.keys(item.data).length : 0;
            const totalMuatDO = item.meta?.total_muat || item.total_muat || 0;
            html += `
                <div class="flex items-center justify-between bg-white border border-orange-200 rounded p-1 mb-1 text-[10px]">
                    <span class="font-bold text-slate-700 truncate pr-2">${index + 1}. ${item.meta.tgl} | ${item.meta.nobukti} | ${item.meta.namacustomer}</span>
                    <div class="flex items-center space-x-1.5 shrink-0">
                        <span class="bg-orange-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">TOTAL BARANG: ${totalMuatDO} KRT [${jumlahItem} Item]</span>
                        <button onclick="hapusCacheDO('${key}')" class="text-red-500 hover:text-red-700 p-0.5 transition" title="Hapus DO ini">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            `;
        });
    }

    // Kelompok FDN (Di bawah DO) - Tema Abu-abu
    if (keysFDN.length > 0) {
        html += `<div class="text-[9px] font-black text-amber-700 uppercase mt-2 mb-1 border-b border-slate-200 pb-0.5">Daftar FDN</div>`;
        keysFDN.forEach((key, index) => {
            const item = cacheCeklistFDN[key];
            const jumlahItem = item.data ? Object.keys(item.data).length : 0;
            const totalMuatFDN = item.meta?.total_muat || item.total_muat || 0;
            html += `
                <div class="flex items-center justify-between bg-white border border-slate-300 rounded p-1 mb-1 text-[10px]">
                    <span class="font-bold text-slate-700 truncate pr-2">${index + 1}. ${item.meta.tgl} | ${item.meta.nobukti} | ${item.meta.namacustomer}</span>
                    <div class="flex items-center space-x-1.5 shrink-0">
                        <span class="bg-amber-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">TOTAL BARANG: ${totalMuatFDN} KRT [${jumlahItem} Item]</span>
                        <button onclick="hapusCacheFDN('${key}')" class="text-red-500 hover:text-red-700 p-0.5 transition" title="Hapus FDN ini">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            `;
        });
    }

    container.innerHTML = html;
}

// Perbarui fungsi renderTabelItemMuatOtomatis di js/ceklist-muat.js
function renderTabelItemMuatOtomatis() {
    const tbody = document.getElementById('tabel-item-ceklist-body');
    const infoTotalEl = document.getElementById('info-total-muat-keseluruhan');
    if (!tbody) return;

    let html = '';
    let hasData = false;
    let grandTotalQty = 0;
    let grandTotalItemCount = 0;

    // Array penampung seluruh item untuk dikirim ke fungsi rekap kelompok
    let semuaItemBarangAktif = [];

    const warnaBgList = [
        'bg-white',
        'bg-orange-50/60',
        'bg-blue-50/60',
        'bg-emerald-50/60',
        'bg-amber-50/60',
        'bg-purple-50/60',
        'bg-rose-50/60',
        'bg-cyan-50/60'
    ];

    const mappingWarnaNoBukti = {};
    let colorIndex = 0;

    const allKeys = [...Object.keys(cacheCeklistDO), ...Object.keys(cacheCeklistFDN)];
    allKeys.forEach((key) => {
        const obj = cacheCeklistDO[key] || cacheCeklistFDN[key];
        const noBukti = obj.meta.nobukti;
        if (!(noBukti in mappingWarnaNoBukti)) {
            mappingWarnaNoBukti[noBukti] = warnaBgList[colorIndex % warnaBgList.length];
            colorIndex++;
        }
    });

    // Render item DO
    Object.keys(cacheCeklistDO).forEach((key) => {
        const doObj = cacheCeklistDO[key];
        const items = doObj.data;
        const noBukti = doObj.meta.nobukti;
        const warnaBg = mappingWarnaNoBukti[noBukti] || 'bg-white';

        Object.keys(items).forEach((itemKey) => {
            hasData = true;
            const row = items[itemKey];
            const qty = Number(row.qty_b || 0);
            grandTotalQty += qty;
            grandTotalItemCount += 1;

            // Masukkan ke array penampung rekap
            semuaItemBarangAktif.push({
                kodebarang: row.kodebarang,
                qty_b: qty
            });

            html += `
                <tr class="border-b ${warnaBg} hover:opacity-90 text-[11px] transition-colors">
                    <td class="p-1.5 border font-bold text-slate-800">${row.kodebarang}</td>
                    <td class="p-1.5 border text-center font-bold text-orange-700">${qty}</td>
                    <td class="p-1.5 border text-center text-slate-600">${row.kodegudang}</td>
                    <td class="p-1.5 border text-slate-600 font-mono font-semibold">${noBukti}</td>
                </tr>
            `;
        });
    });

    // Render item FDN
    Object.keys(cacheCeklistFDN).forEach((key) => {
        const fdnObj = cacheCeklistFDN[key];
        const items = fdnObj.data;
        const noBukti = fdnObj.meta.nobukti;
        const warnaBg = mappingWarnaNoBukti[noBukti] || 'bg-white';

        Object.keys(items).forEach((itemKey) => {
            hasData = true;
            const row = items[itemKey];
            const qty = Number(row.qty_b || 0);
            grandTotalQty += qty;
            grandTotalItemCount += 1;

            // Masukkan ke array penampung rekap
            semuaItemBarangAktif.push({
                kodebarang: row.kodebarang,
                qty_b: qty
            });

            html += `
                <tr class="border-b ${warnaBg} hover:opacity-90 text-[11px] transition-colors">
                    <td class="p-1.5 border font-bold text-slate-800">${row.kodebarang}</td>
                    <td class="p-1.5 border text-center font-bold text-blue-700">${qty}</td>
                    <td class="p-1.5 border text-center text-slate-600">${row.kodegudang}</td>
                    <td class="p-1.5 border text-slate-600 font-mono font-semibold">${noBukti}</td>
                </tr>
            `;
        });
    });

    if (!hasData) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-slate-400 italic text-xs">Belum ada data barang...</td></tr>`;
        if (infoTotalEl) infoTotalEl.innerText = `TOTAL MUAT KESELURUHAN: 0 KRT [0 Item]`;
        
        // Kosongkan juga rekap kelompok jika data kosong
        if (typeof updateRekapKelompok === 'function') {
            updateRekapKelompok({});
        }
        return;
    }

    tbody.innerHTML = html;
    if (infoTotalEl) {
        infoTotalEl.innerText = `TOTAL MUAT KESELURUHAN: ${grandTotalQty} KRT [${grandTotalItemCount} Item]`;
    }

    // Panggil fungsi rekap kelompok yang sudah kita buat sebelumnya di sini!
    if (typeof updateRekapKelompok === 'function') {
        updateRekapKelompok(semuaItemBarangAktif, grandTotalQty);
    }
}

// Fungsi Helper Menentukan Kelompok Sesuai Aturan Terbaru
function hitungKelompokKodeBarang(kodeBarang) {
    const kode = String(kodeBarang || '').toUpperCase().trim();
    
    if (kode.startsWith('MRL') || kode.startsWith('MTL') || kode.startsWith('ISEL') || kode.startsWith('MEL')) {
        return 'DIY';
    }
    
    // MTR dan PDR digabung menjadi MTR/PDR
    if (kode.startsWith('MTR') || kode.startsWith('PDR')) {
        return 'MTR/PDR';
    }
    
    // MRR berakhiran EA masuk ke grup "MRR EA"
    if (kode.startsWith('MRR') && kode.endsWith('EA')) {
        return 'MRR EA';
    }

    // MRR murni (tanpa EA) atau CRR berakhiran EA masuk ke "MRR/CRR EA"
    if (kode.startsWith('MRR') || (kode.startsWith('CRR') && kode.endsWith('EA'))) {
        return 'MRR/CRR EA';
    }

    // CRR murni (tanpa EA) atau THR masuk ke "CRR/THR"
    if (kode.startsWith('CRR') || kode.startsWith('THR')) {
        return 'CRR/THR';
    }
    
    if (kode.startsWith('MOR') || kode.startsWith('MOB')) {
        return 'MOR/MOB';
    }
    if (kode.startsWith('MP') || kode.startsWith('LTGR') || kode.startsWith('MTGR')) {
        return 'MP/LTGR/MTGR';
    }
    if (kode.startsWith('MJR')) {
        return 'MJR';
    }
    
    return 'Lainnya';
}

// Fungsi Update Rekap Qty Kelompok Barang
window.updateRekapKelompok = function(listBarangObj, targetTotal = 0) {
    let rekap = {
        'DIY': 0, 
        'MTR/PDR': 0, 
        'CRR/THR': 0,
        'MRR/CRR EA': 0, 
        'MRR EA': 0,
        'MOR/MOB': 0, 
        'MP/LTGR/MTGR': 0, 
        'MJR': 0
    };

    let totalSemuaKelompok = 0;
    const itemsArray = Array.isArray(listBarangObj) ? listBarangObj : Object.values(listBarangObj || {});

    itemsArray.forEach(item => {
        const kode = item.kodebarang || item.kode || '';
        const qty = Number(item.qty_b || item.qty || item.qty_utama || 0);
        const kelompok = hitungKelompokKodeBarang(kode);

        if (rekap.hasOwnProperty(kelompok)) {
            rekap[kelompok] += qty;
        }
        totalSemuaKelompok += qty;
    });

    // Render Nilai ke Kotak Grid (Pastikan ID elemen di HTML Anda sudah disesuaikan)
    document.getElementById('val-grp-diy').innerText = rekap['DIY'] > 0 ? rekap['DIY'] : '-';
    document.getElementById('val-grp-mtrpdr').innerText = rekap['MTR/PDR'] > 0 ? rekap['MTR/PDR'] : '-';
    document.getElementById('val-grp-crrthr').innerText = rekap['CRR/THR'] > 0 ? rekap['CRR/THR'] : '-';
    document.getElementById('val-grp-mrrcrrea').innerText = rekap['MRR/CRR EA'] > 0 ? rekap['MRR/CRR EA'] : '-';
    document.getElementById('val-grp-mrrea').innerText = rekap['MRR EA'] > 0 ? rekap['MRR EA'] : '-';
    document.getElementById('val-grp-mormob').innerText = rekap['MOR/MOB'] > 0 ? rekap['MOR/MOB'] : '-';
    document.getElementById('val-grp-mpltgrmtgr').innerText = rekap['MP/LTGR/MTGR'] > 0 ? rekap['MP/LTGR/MTGR'] : '-';
    document.getElementById('val-grp-mjr').innerText = rekap['MJR'] > 0 ? rekap['MJR'] : '-';
    
    const totalQtyEl = document.getElementById('rekap-total-qty');
    if (totalQtyEl) totalQtyEl.innerText = `TOTAL = ${totalSemuaKelompok} KRT`;

    // Validasi Pencocokan dengan Total Keseluruhan
    const statusBadge = document.getElementById('status-rekap-kelompok');
    if (statusBadge) {
        if (targetTotal === 0 && totalSemuaKelompok === 0) {
            statusBadge.innerText = '';
            statusBadge.className = '';
        } else if (totalSemuaKelompok === targetTotal) {
            statusBadge.innerText = '[ SESUAI ]';
            statusBadge.className = 'text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold';
        } else {
            const selisih = totalSemuaKelompok - targetTotal;
            const ket = selisih > 0 ? `[ LEBIH ${selisih} ]` : `[ KURANG ${Math.abs(selisih)} ]`;
            statusBadge.innerText = ket;
            statusBadge.className = 'text-[8px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold';
        }
    }
};


// ==========================================
// FUNGSI UTAMA CETAK CEKLIST MUAT (DENGAN DETEKSI ID KEMBAR & SUFFIX _2, _3, DST)
// ==========================================
window.cetakCeklistMuat = function() {
    console.log("--> Eksekusi cetakCeklistMuat dipanggil.");
    const keysDO = Object.keys(cacheCeklistDO || {});
    const keysFDN = Object.keys(cacheCeklistFDN || {});

    if (keysDO.length === 0 && keysFDN.length === 0 && (!dataTitipanList || dataTitipanList.length === 0)) {
        if (typeof miuiAlert === 'function') miuiAlert("Belum ada data DO, FDN, atau Titipan untuk dicetak!");
        else alert("Belum ada data DO, FDN, atau Titipan untuk dicetak!");
        return;
    }

    const hasDO = keysDO.length > 0;
    const hasFDN = keysFDN.length > 0;

    // --- DETEKSI APAKAH ADA TUJUAN/CUSTOMER YANG BERBEDA ---
    const listTujuanUnik = new Set();
    
    keysDO.forEach(k => {
        const item = cacheCeklistDO[k];
        if (item?.meta?.namacustomer) {
            listTujuanUnik.add(String(item.meta.namacustomer).trim().toUpperCase());
        }
    });

    keysFDN.forEach(k => {
        const item = cacheCeklistFDN[k];
        if (item?.meta?.namacustomer) {
            listTujuanUnik.add(String(item.meta.namacustomer).trim().toUpperCase());
        }
    });

    // Opsi gabung aktif HANYA JIKA ada lebih dari 1 nama tujuan/alamat berbeda
    const canMerge = listTujuanUnik.size > 1;

    const eksekusiSimpan = async function(isMerged) {
        console.log("--> Memproses Penyimpanan & Penggabungan Data (isMerged:", isMerged, ")...");
        const timestampNow = new Date().toISOString();
        let savedPromises = [];

        function normalizeCustomerName(rawName) {
            let clean = String(rawName || '').toUpperCase();
            return clean.replace(/\bMT\b/g, '')
                        .replace(/[\/\-\_\.\s]+/g, '_')
                        .replace(/^_+|_+\$/g, '');
        }

        // Helper untuk mendapatkan ID unik dengan penambahan suffix _2, _3 jika sudah ada di database
        async function getUniqueMuatId(baseMuatId, nodePath) {
            let candidateId = baseMuatId;
            let counter = 2;
            while (true) {
                const snapshot = await firebase.database().ref(`ceklist_muat/arsip_cetak/${nodePath}/${candidateId}`).once('value');
                if (!snapshot.exists()) {
                    return candidateId;
                }
                candidateId = `${baseMuatId}_${counter}`;
                counter++;
            }
        }

        // 1. Olah Data DO
        const groupedDO = {};
        for (const key of keysDO) {
            const item = cacheCeklistDO[key];
            const parts = key.split('_');
            if (parts.length >= 4) {
                const tglPart = `${parts[0]}_${parts[1]}_${parts[2]}`;
                const rawCust = item.meta.namacustomer;
                const custNormalized = normalizeCustomerName(rawCust);
                const baseMuatId = `${tglPart}_${custNormalized}`.toUpperCase();
                
                // Dapatkan ID unik (menambahkan _2, _3 jika nama sudah ada)
                const muatId = await getUniqueMuatId(baseMuatId, 'ceklist_do');

                if (!groupedDO[muatId]) {
                    groupedDO[muatId] = {
                        meta: { tgl: item.meta.tgl, namacustomer: rawCust, timestamp_update: timestampNow },
                        payloadDO: {}, total_muat_all: 0, allItems: []
                    };
                }

                const noBuktiDigits = item.meta.nobukti.replace(/\D/g, '');
                const last5NoBukti = noBuktiDigits.length >= 5 ? noBuktiDigits.slice(-5) : noBuktiDigits;

                const itemsData = {};
                let totalMuatDO = 0;
                Object.keys(item.data).forEach((kb) => {
                    itemsData[kb] = item.data[kb];
                    const qty = Number(item.data[kb].qty_b || 0);
                    totalMuatDO += qty;
                    groupedDO[muatId].allItems.push({ kodebarang: kb, qty_b: qty });
                });

                if (groupedDO[muatId].payloadDO[last5NoBukti]) {
                    Object.keys(itemsData).forEach((kb) => {
                        if (groupedDO[muatId].payloadDO[last5NoBukti].data[kb]) {
                            groupedDO[muatId].payloadDO[last5NoBukti].data[kb].qty_b += itemsData[kb].qty_b;
                        } else {
                            groupedDO[muatId].payloadDO[last5NoBukti].data[kb] = itemsData[kb];
                        }
                    });
                    groupedDO[muatId].payloadDO[last5NoBukti].meta.total_muat += totalMuatDO;
                } else {
                    groupedDO[muatId].payloadDO[last5NoBukti] = {
                        meta: { nobukti: item.meta.nobukti, tgl: item.meta.tgl, total_muat: totalMuatDO },
                        data: itemsData
                    };
                }
                groupedDO[muatId].total_muat_all += totalMuatDO;
            }
        }

        // 2. Olah Data FDN
        const groupedFDN = {};
        for (const key of keysFDN) {
            const item = cacheCeklistFDN[key];
            const meta = item.meta || {};
            const rawTgl = meta.tgl || '';
            let tglPart = rawTgl.replace(/\//g, '_') || '21_10_2026';

            const rawCust = meta.namacustomer || key;
            const custNormalized = normalizeCustomerName(rawCust);
            const baseMuatId = `${tglPart}_${custNormalized}`.toUpperCase();
            
            // Dapatkan ID unik untuk FDN
            const muatId = await getUniqueMuatId(baseMuatId, 'ceklist_fdn');

            if (!groupedFDN[muatId]) {
                groupedFDN[muatId] = {
                    meta: { tgl: meta.tgl, namacustomer: rawCust, timestamp_update: timestampNow },
                    payloadFDN: {}, total_muat_all: 0, allItems: []
                };
            }

            const noBuktiDigits = String(meta.nobukti || key).replace(/\D/g, '');
            const last5NoBukti = noBuktiDigits.length >= 5 ? noBuktiDigits.slice(-5) : noBuktiDigits;

            const itemsData = {};
            let totalMuatFDN = 0;
            Object.keys(item.data || {}).forEach((kb) => {
                itemsData[kb] = item.data[kb];
                const qty = Number(item.data[kb].qty_b || item.data[kb].qty_utama || 0);
                totalMuatFDN += qty;
                groupedFDN[muatId].allItems.push({ kodebarang: kb, qty_b: qty });
            });

            groupedFDN[muatId].payloadFDN[last5NoBukti] = {
                meta: { nobukti: meta.nobukti || key, tgl: meta.tgl, total_muat: totalMuatFDN },
                data: itemsData
            };
            groupedFDN[muatId].total_muat_all += totalMuatFDN;
        }

        // 3. Titipan
        const titipanDataObj = {};
        if (Array.isArray(dataTitipanList) && dataTitipanList.length > 0) {
            dataTitipanList.forEach((t) => {
                const rawKat = String(t.kategori || 'PROMOSI').toLowerCase();
                const kategoriClean = rawKat.replace(/[\/\s]+/g, '_').toUpperCase();
                const namaBarang = String(t.nama || '').replace(/[\/\s]+/g, '_').toUpperCase();
                const rawQty = Number(t.qty || 0);

                if (!titipanDataObj[kategoriClean]) titipanDataObj[kategoriClean] = {};
                const titipanKey = `${namaBarang}_${rawQty}`;
                titipanDataObj[kategoriClean][titipanKey] = { namabarang: namaBarang, qty: rawQty };
            });
        }

        function generateRekapPayload(itemsArray) {
            let rekap = { 'DIY': 0, 'MTR_PDR': 0, 'CRR_THR': 0, 'MRR_CRR_EA': 0, 'MRR_EA': 0, 'MOR_MOB': 0, 'MP_LTGR_MTGR': 0, 'MJR': 0, 'LAINNYA': 0 };
            itemsArray.forEach(item => {
                const kelompok = typeof hitungKelompokKodeBarang === 'function' ? hitungKelompokKodeBarang(item.kodebarang) : 'LAINNYA';
                let rtdbKey = 'LAINNYA';
                if (kelompok === 'DIY') rtdbKey = 'DIY';
                else if (kelompok === 'MTR/PDR') rtdbKey = 'MTR_PDR';
                else if (kelompok === 'CRR/THR') rtdbKey = 'CRR_THR';
                else if (kelompok === 'MRR/CRR EA') rtdbKey = 'MRR_CRR_EA';
                else if (kelompok === 'MRR EA') rtdbKey = 'MRR_EA';
                else if (kelompok === 'MOR/MOB') rtdbKey = 'MOR_MOB';
                else if (kelompok === 'MP/LTGR/MTGR') rtdbKey = 'MP_LTGR_MTGR';
                else if (kelompok === 'MJR') rtdbKey = 'MJR';

                if (rekap.hasOwnProperty(rtdbKey)) rekap[rtdbKey] += Number(item.qty_b || 0);
                else rekap['LAINNYA'] += Number(item.qty_b || 0);
            });
            return rekap;
        }

        let printPayloads = [];

        // JIKA CHECKBOX GABUNG DICENTANG & TUJUAN BERBEDA
        if (isMerged && listTujuanUnik.size > 1) {
            let mainNodePath = '';
            let mainKey = '';
            let mainGroup = null;

            if (hasDO) {
                mainNodePath = 'ceklist_do';
                mainKey = Object.keys(groupedDO)[0];
                mainGroup = groupedDO[mainKey];
            } else {
                mainNodePath = 'ceklist_fdn';
                mainKey = Object.keys(groupedFDN)[0];
                mainGroup = groupedFDN[mainKey];
            }

            const mergedFdnObj = {};

            Object.keys(groupedDO).forEach((doMuatId) => {
                if (hasDO && doMuatId === mainKey) return;
                const doGroup = groupedDO[doMuatId];
                const tujuanNama = String(doGroup.meta.namacustomer || doMuatId).toUpperCase().replace(/STOCK POINT/g, 'SP');

                Object.keys(doGroup.payloadDO).forEach((subNoBukti) => {
                    const subObj = doGroup.payloadDO[subNoBukti];
                    Object.keys(subObj.data || {}).forEach((kb) => {
                        const itm = subObj.data[kb];
                        const keyUnique = `DO_${subNoBukti}_${kb}`;
                        const qtyVal = Number(itm.qty_b || 0);

                        mergedFdnObj[keyUnique] = { kodebarang: kb, qty: qtyVal, nobukti: subNoBukti, tujuan: tujuanNama };
                        mainGroup.allItems.push({ kodebarang: kb, qty_b: qtyVal });
                        mainGroup.total_muat_all += qtyVal;
                    });
                });
            });

            Object.keys(groupedFDN).forEach((fdnMuatId) => {
                if (!hasDO && fdnMuatId === mainKey) return;
                const fdnGroup = groupedFDN[fdnMuatId];
                const tujuanNama = String(fdnGroup.meta.namacustomer || fdnMuatId).toUpperCase().replace(/STOCK POINT/g, 'SP');

                Object.keys(fdnGroup.payloadFDN).forEach((subNoBukti) => {
                    const fdnSubObj = fdnGroup.payloadFDN[subNoBukti];
                    Object.keys(fdnSubObj.data || {}).forEach((kb) => {
                        const itm = fdnSubObj.data[kb];
                        const keyUnique = `FDN_${subNoBukti}_${kb}`;
                        const qtyVal = Number(itm.qty_b || itm.qty_utama || 0);

                        mergedFdnObj[keyUnique] = { kodebarang: kb, qty: qtyVal, nobukti: subNoBukti, tujuan: tujuanNama };
                        mainGroup.allItems.push({ kodebarang: kb, qty_b: qtyVal });
                        mainGroup.total_muat_all += qtyVal;
                    });
                });
            });

            titipanDataObj['FDN_GABUNGAN'] = mergedFdnObj;

            const dbRef = firebase.database().ref(`ceklist_muat/arsip_cetak/${mainNodePath}/${mainKey}`);
            const finalPayload = Object.assign({ meta: mainGroup.meta }, (mainNodePath === 'ceklist_do' ? mainGroup.payloadDO : mainGroup.payloadFDN), {
                rekap: generateRekapPayload(mainGroup.allItems),
                titipan: titipanDataObj,
                total_muat_keseluruhan: mainGroup.total_muat_all
            });

            savedPromises.push(dbRef.set(finalPayload));
            printPayloads.push({ nodePath: mainNodePath, muatId: mainKey, payload: finalPayload });

        } else {
            // PROSES TERPISAH NORMAL
            Object.keys(groupedDO).forEach((muatId) => {
                const group = groupedDO[muatId];
                const dbRef = firebase.database().ref(`ceklist_muat/arsip_cetak/ceklist_do/${muatId}`);
                const finalPayload = Object.assign({ meta: group.meta }, group.payloadDO, {
                    rekap: generateRekapPayload(group.allItems),
                    titipan: titipanDataObj,
                    total_muat_keseluruhan: group.total_muat_all
                });

                savedPromises.push(dbRef.set(finalPayload));
                printPayloads.push({ nodePath: 'ceklist_do', muatId: muatId, payload: finalPayload });
            });

            Object.keys(groupedFDN).forEach((muatId) => {
                const group = groupedFDN[muatId];
                const dbRef = firebase.database().ref(`ceklist_muat/arsip_cetak/ceklist_fdn/${muatId}`);
                const finalPayload = Object.assign({ meta: group.meta }, group.payloadFDN, {
                    rekap: generateRekapPayload(group.allItems),
                    titipan: titipanDataObj,
                    total_muat_keseluruhan: group.total_muat_all
                });

                savedPromises.push(dbRef.set(finalPayload));
                printPayloads.push({ nodePath: 'ceklist_fdn', muatId: muatId, payload: finalPayload });
            });
        }

        // SIMPAN KE FIREBASE & RENDER CETAK OTOMATIS
        Promise.all(savedPromises).then(() => {
            console.log("--> Data berhasil disimpan.");

            printPayloads.forEach(item => {
                if (typeof window.cetakUlangArsip === 'function') {
                    window.cetakUlangArsip(item.nodePath, item.muatId);
                }
            });

            // RESET CACHE & INPUT FORM SECARA TOTAL
            cacheCeklistDO = {};
            cacheCeklistFDN = {};
            if (typeof dataTitipanList !== 'undefined') dataTitipanList = [];

            const containerTitipan = document.getElementById('container-list-titipan');
            if (containerTitipan) containerTitipan.innerHTML = `<div class="text-slate-400 text-xs">Belum ada item titipan ditambahkan...</div>`;

            const containerDO = document.getElementById('container-list-fdn-ceklist');
            if (containerDO) containerDO.innerHTML = `<div class="text-slate-400 italic text-[10px]">Belum ada data DO atau FDN diimport...</div>`;

            const tbody = document.getElementById('tabel-item-ceklist-body');
            if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-slate-400 italic text-xs">Belum ada data barang...</td></tr>`;

            const infoTotalEl = document.getElementById('info-total-muat-keseluruhan');
            if (infoTotalEl) infoTotalEl.innerText = `TOTAL MUAT KESELURUHAN: 0 KRT [0 Item]`;

            if (typeof updateRekapKelompok === 'function') updateRekapKelompok([], 0);
            if (typeof invalidateArsipCache === 'function') invalidateArsipCache();

        }).catch((err) => {
            console.error("Gagal menyimpan data:", err);
            if (typeof miuiAlert === 'function') miuiAlert("Gagal menyimpan arsip ke Database!");
            else alert("Gagal menyimpan arsip ke Database!");
        });
    };

    // Modal Konfirmasi dengan Checkbox Penggabungan Berdasarkan Perbedaan Tujuan
    const modalConfirm = document.getElementById('modal-miuiAlert') || document.getElementById('miui-global-miuiAlert');
    const msgEl = document.getElementById('miui-miuiAlert-message');
    const containerOk = document.getElementById('miui-container-ok');
    const containerConfirm = document.getElementById('miui-container-confirm');
    const btnYa = document.getElementById('miui-btn-ya');
    const btnTidak = document.getElementById('miui-btn-tidak');

    if (modalConfirm && msgEl && containerConfirm) {
        let textMsg = "Apakah Anda yakin ingin memproses cetak dan menyimpan arsip data ke Database?";
        
        let mergeCheckboxHtml = '';
        if (canMerge) {
            mergeCheckboxHtml = `
                <div class="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-left text-xs font-semibold text-amber-900 flex items-center gap-2">
                    <input type="checkbox" id="chk-gabung-fdn-do" class="w-4 h-4 text-slate-600 text-[16px] rounded cursor-pointer" style="width:30px; height:30px; cursor:pointer;">
                    <label for="chk-gabung-fdn-do" class="cursor-pointer select-none">Gabungkan dokumen dengan alamat/tujuan berbeda ke satu lembar?</label>
                </div>
            `;
        }

        msgEl.innerHTML = textMsg + mergeCheckboxHtml;
        if (containerOk) containerOk.classList.add('hidden');
        containerConfirm.classList.remove('hidden');
        modalConfirm.classList.remove('hidden');

        const newBtnYa = btnYa.cloneNode(true);
        const newBtnTidak = btnTidak.cloneNode(true);
        if (btnYa.parentNode) btnYa.parentNode.replaceChild(newBtnYa, btnYa);
        if (btnTidak.parentNode) btnTidak.parentNode.replaceChild(newBtnTidak, btnTidak);

        newBtnYa.addEventListener('click', function() {
            const chkEl = document.getElementById('chk-gabung-fdn-do');
            const isMergedChecked = chkEl ? chkEl.checked : false;
            modalConfirm.classList.add('hidden');
            eksekusiSimpan(isMergedChecked);
        });

        newBtnTidak.addEventListener('click', function() {
            modalConfirm.classList.add('hidden');
        });
    } else {
        let isMerged = false;
        if (canMerge) {
            isMerged = confirm("Terdeteksi dokumen dengan alamat/tujuan berbeda.\n\nKlik 'OK' jika ingin MENGGABUNGKAN ke satu lembar.\nKlik 'Batal' untuk mencetak terpisah.");
        }
        eksekusiSimpan(isMerged);
    }
};


// Aksi Kirim tugas cetak ke Print Server (Firebase Realtime Database)
window.executeCetak2Copy = async function() {
    const jobs = window._currentPrintJobs || [];
    if (jobs.length === 0) {
        if (typeof miuiAlert === 'function') miuiAlert("Tidak ada data untuk dicetak!");
        else alert("Tidak ada data untuk dicetak!");
        return;
    }

    try {
        const now = new Date();
        const tgl = String(now.getDate()).padStart(2, '0');
        const blnIndex = now.getMonth();
        const thn = now.getFullYear();
        const jam = String(now.getHours()).padStart(2, '0');
        const menit = String(now.getMinutes()).padStart(2, '0');
        const detik = String(now.getSeconds()).padStart(2, '0');
        const formatWaktuLengkap = `${tgl}/${String(blnIndex + 1).padStart(2, '0')}/${thn} ${jam}:${menit}:${detik}`;

        let promises = [];

        jobs.forEach((j, index) => {
            const judulTugas = `Cetak Ceklist Muatan - ${j.muatId || 'Dokumen'}`;
            const safeKeyName = `Cetak_Muat_${j.muatId || index}_${tgl}-${String(blnIndex + 1).padStart(2, '0')}-${thn}_${jam}-${menit}-${detik}`;

            const fetchPromise = fetch(`https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/print_jobs/${safeKeyName}.json`, {
                method: 'PUT',
                body: JSON.stringify({ 
                    judul: judulTugas,
                    waktu_teks: formatWaktuLengkap,
                    html: j.htmlContent, 
                    status: 'PENDING',
                    timestamp: Date.now() 
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            promises.push(fetchPromise);
        });

        await Promise.all(promises);

        if (typeof miuiAlert === 'function') {
            miuiAlert("Tugas cetak berhasil dikirim ke print server!");
        } else {
            alert("Tugas cetak berhasil dikirim ke print server!");
        }

        // Tutup modal preview setelah berhasil
        if (typeof window.closePrintPreview === 'function') {
            window.closePrintPreview();
        } else {
            const modalEl = document.getElementById('printPreviewModal');
            if (modalEl) modalEl.classList.add('hidden');
        }

    } catch (err) {
        console.error("Gagal mengirim perintah cetak ke server:", err);
        if (typeof miuiAlert === 'function') {
            miuiAlert("Gagal mengirim perintah cetak ke server.");
        } else {
            alert("Gagal mengirim perintah cetak ke server.");
        }
    }
};