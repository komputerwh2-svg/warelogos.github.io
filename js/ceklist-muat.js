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

// Fungsi untuk Mengambil dan Merender Daftar Arsip Cetak Dikelompokkan Berdasarkan Tanggal
function renderRiwayatArsipCetak() {
    const container = document.getElementById('container-list-arsip-ceklist');
    if (!container) return;

    container.innerHTML = `<div class="text-slate-400 italic text-[10px] text-center py-4">Memuat data arsip...</div>`;

    const dbRefDO = firebase.database().ref('ceklist_muat/arsip_cetak/ceklist_do');
    const dbRefFDN = firebase.database().ref('ceklist_muat/arsip_cetak/ceklist_fdn');

    Promise.all([
        dbRefDO.once('value'),
        dbRefFDN.once('value')
    ]).then(([snapshotDO, snapshotFDN]) => {
        let groupedByDate = {};
        let hasData = false;

        // Helper untuk memasukkan data ke grup tanggal
        function addToGroup(tgl, itemHtml) {
            const dateKey = tgl || 'TANGGAL LAINNYA';
            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
            }
            groupedByDate[dateKey].push(itemHtml);
        }

        // 1. Proses Arsip DO
        if (snapshotDO.exists()) {
            snapshotDO.forEach((childSnap) => {
                hasData = true;
                const muatId = childSnap.key;
                const val = childSnap.val();
                const meta = val.meta || {};
                const tgl = meta.tgl || 'N/A';
                const customer = meta.namacustomer || muatId;
                const totalKeseluruhan = val.total_muat_keseluruhan || 0;

                const listNoDO = Object.keys(val).filter(k => k !== 'meta' && k !== 'titipan' && k !== 'total_muat_keseluruhan');
                const noDoBadge = listNoDO.length > 0 ? listNoDO.join(', ') : '-';

                const cardHtml = `
                    <div onclick="previewArsipDetail('do', '${muatId}')" class="bg-orange-50/50 hover:bg-orange-100/70 border border-orange-200 rounded-lg p-2 transition cursor-pointer mb-1.5">
                        <div class="flex items-center justify-between font-bold text-slate-800 text-[11px] mb-1">
                            <span class="truncate pr-2">[DO] ${customer}</span>
                            <span class="bg-orange-600 text-white px-1.5 py-0.5 rounded text-[9px] font-black shrink-0">${totalKeseluruhan} KRT</span>
                        </div>
                        <div class="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span>No DO: ${noDoBadge}</span>
                        </div>
                    </div>
                `;
                addToGroup(tgl, cardHtml);
            });
        }

        // 2. Proses Arsip FDN
        if (snapshotFDN.exists()) {
            snapshotFDN.forEach((childSnap) => {
                hasData = true;
                const muatId = childSnap.key;
                const val = childSnap.val();
                const meta = val.meta || {};
                const tgl = meta.tgl || 'N/A';
                const customer = meta.namacustomer || muatId;
                const totalKeseluruhan = val.total_muat_keseluruhan || 0;

                const listNoFDN = Object.keys(val).filter(k => k !== 'meta' && k !== 'titipan' && k !== 'total_muat_keseluruhan');
                const noFdnBadge = listNoFDN.length > 0 ? listNoFDN.join(', ') : '-';

                const cardHtml = `
                    <div onclick="previewArsipDetail('fdn', '${muatId}')" class="bg-blue-50/50 hover:bg-blue-100/70 border border-blue-200 rounded-lg p-2 transition cursor-pointer mb-1.5">
                        <div class="flex items-center justify-between font-bold text-slate-800 text-[11px] mb-1">
                            <span class="truncate pr-2">[FDN] ${customer}</span>
                            <span class="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[9px] font-black shrink-0">${totalKeseluruhan} KRT</span>
                        </div>
                        <div class="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span>No FDN: ${noFdnBadge}</span>
                        </div>
                    </div>
                `;
                addToGroup(tgl, cardHtml);
            });
        }

        if (!hasData) {
            container.innerHTML = `<div class="text-slate-400 italic text-[10px] text-center py-4">Belum ada riwayat arsip tersimpan...</div>`;
            return;
        }

        // Render HTML dengan pengelompokan tanggal di atas setiap grup data
        let finalHtml = '';
        Object.keys(groupedByDate).forEach((tanggal) => {
            finalHtml += `
                <div class="mb-3">
                    <div class="text-[10px] font-black text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded mb-1.5 sticky top-0 uppercase tracking-wider">
                        📅 ${tanggal}
                    </div>
                    <div>${groupedByDate[tanggal].join('')}</div>
                </div>
            `;
        });

        container.innerHTML = finalHtml;

    }).catch((err) => {
        console.error("Gagal membaca data arsip dari Firebase:", err);
        container.innerHTML = `<div class="text-red-400 italic text-[10px] text-center py-4">Gagal memuat riwayat arsip.</div>`;
    });
}



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
        alert("Nama barang titipan tidak boleh kosong!");
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
                    <span class="font-bold text-orange-700">(${item.qty} pcs)</span>
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


// 1. Perbarui Fungsi Proses Data WHNB-2 agar Menyesuaikan ID Muat dengan Customer DO yang Ada
window.prosesDataWHNB2 = function() {
    const textarea = document.querySelector('textarea[placeholder*="Paste data WHNB-2"]');
    if (!textarea) return;

    const rawText = textarea.value.trim();
    if (!rawText) {
        miuiAlert("Silakan paste data WHNB-2 dari Bosnet terlebih dahulu!");
        return;
    }

    const lines = rawText.split('\n');
    let importedCount = 0;

    lines.forEach((line) => {
        if (!line.includes('WHNB-2')) return;

        try {
            const matchNoDo = line.match(/(DO-[A-Z0-9\-]+|DN-[A-Z0-9\-]+)/);
            if (!matchNoDo) return;
            const noBukti = matchNoDo[1].trim().toUpperCase();
            const gudang = 'WHNB-2';

            const bagianSebelumGudang = line.substring(0, line.indexOf('WHNB-2'));
            const matchesQty = bagianSebelumGudang.match(/(\d+\/\d+\/\d+\/\d+)/g);
            if (!matchesQty || matchesQty.length === 0) return;
            
            const qtyStr = matchesQty[matchesQty.length - 1];
            const qtyParts = qtyStr.split('/');
            const qtyKarton = Number(qtyParts[0] || 0);

            if (qtyKarton <= 0) return;

            const idxNoDo = bagianSebelumGudang.indexOf(noBukti);
            const idxQty = bagianSebelumGudang.lastIndexOf(qtyStr);
            if (idxNoDo === -1 || idxQty === -1) return;

            let sisaTengah = bagianSebelumGudang.substring(idxNoDo + noBukti.length, idxQty).trim();
            const tokens = sisaTengah.split(/\s+/);
            const kodeBarang = tokens[0] ? tokens[0].toUpperCase() : '';

            if (!kodeBarang) return;

            // Cari apakah nomor DO ini sudah ada di cache DO Excel yang diimport sebelumnya
            let matchedDOKey = null;
            Object.keys(cacheCeklistDO).forEach((k) => {
                if (cacheCeklistDO[k].meta.nobukti === noBukti) {
                    matchedDOKey = k;
                }
            });

            let targetCacheKey = matchedDOKey;

            // Jika belum ada di DO Excel, buatkan di cache dengan mencarikan customer umum / default
            if (!targetCacheKey) {
                const noBuktiDigits = noBukti.replace(/\D/g, '');
                const last5NoBukti = noBuktiDigits.length >= 5 ? noBuktiDigits.slice(-5) : noBuktiDigits;
                
                const sekarang = new Date();
                const thn = sekarang.getFullYear();
                const bln = String(sekarang.getMonth() + 1).padStart(2, '0');
                const tgl = String(sekarang.getDate()).padStart(2, '0');
                const tglFormatted = `${thn}_${bln}_${tgl}`;
                const tglDisplay = `${tgl}/${bln}/${thn}`;

                // Coba gunakan nama customer dari DO pertama yang sudah ada jika ada, agar menyatu
                let defaultCust = 'UMUM';
                const existingKeys = Object.keys(cacheCeklistDO);
                if (existingKeys.length > 0) {
                    defaultCust = cacheCeklistDO[existingKeys[0]].meta.namacustomer;
                }

                const custClean = defaultCust.replace(/[\/\s]+/g, '_').toUpperCase();
                targetCacheKey = `${tglFormatted}_${custClean}_${last5NoBukti}`.toUpperCase();

                cacheCeklistDO[targetCacheKey] = {
                    meta: {
                        nobukti: noBukti,
                        tgl: tglDisplay,
                        namacustomer: defaultCust
                    },
                    data: {},
                    total_muat: 0
                };
            }

            // Masukkan item ke cache
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
            console.error("Gagal memparsing baris WHNB-2:", line, err);
        }
    });

    if (importedCount > 0) {
        textarea.value = '';
        renderDaftarDOPreview();
        renderTabelItemMuatOtomatis();
        miuiAlert(`Berhasil memproses ${importedCount} item data WHNB-2!`);
    } else {
        miuiAlert("Tidak ditemukan baris data 'WHNB-2' yang valid pada teks yang dipaste!");
    }
};

// Fungsi Render Daftar DO & FDN di Kotak Preview Panel Kiri (Dengan Info Total Muat & Jumlah Item)
function renderDaftarDOPreview() {
    const container = document.getElementById('container-list-fdn-ceklist');
    if (!container) return;

    const keysDO = Object.keys(cacheCeklistDO);
    const keysFDN = Object.keys(cacheCeklistFDN);

    if (keysDO.length === 0 && keysFDN.length === 0) {
        container.innerHTML = `<div class="text-slate-400 italic text-[10px]">Belum ada data DO atau FDN diimport...</div>`;
        return;
    }

    let html = '';

    // Kelompok DO (Selalu di atas)
    if (keysDO.length > 0) {
        html += `<div class="text-[9px] font-black text-orange-700 uppercase mb-1 border-b border-orange-200 pb-0.5">Daftar DO</div>`;
        keysDO.forEach((key, index) => {
            const item = cacheCeklistDO[key];
            const jumlahItem = Object.keys(item.data).length;
            html += `
                <div class="flex items-center justify-between bg-white border border-orange-200 rounded p-1 mb-1 text-[10px]">
                    <span class="font-bold text-slate-700">${index + 1}. ${item.meta.tgl} | ${item.meta.nobukti} | ${item.meta.namacustomer}</span>
                    <span class="bg-orange-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">TOTAL BARANG: ${item.total_muat} KRT [${jumlahItem} Item]</span>
                </div>
            `;
        });
    }

    // Kelompok FDN (Di bawah DO)
    if (keysFDN.length > 0) {
        html += `<div class="text-[9px] font-black text-blue-700 uppercase mt-2 mb-1 border-b border-blue-200 pb-0.5">Daftar FDN</div>`;
        keysFDN.forEach((key, index) => {
            const item = cacheCeklistFDN[key];
            const jumlahItem = Object.keys(item.data).length;
            html += `
                <div class="flex items-center justify-between bg-white border border-blue-200 rounded p-1 mb-1 text-[10px]">
                    <span class="font-bold text-slate-700">${index + 1}. ${item.meta.tgl} | ${item.meta.nobukti} | ${item.meta.namacustomer}</span>
                    <span class="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">TOTAL BARANG: ${item.total_muat} KRT [${jumlahItem} Item]</span>
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
        return;
    }

    tbody.innerHTML = html;
    if (infoTotalEl) {
        infoTotalEl.innerText = `TOTAL MUAT KESELURUHAN: ${grandTotalQty} KRT [${grandTotalItemCount} Item]`;
    }
}


// Fungsi Tombol Cetak: Menyimpan Arsip Final Terstruktur ke RTDB (Termasuk WHNB-2 masuk ke No DO)
// Fungsi Tombol Cetak dengan Normalisasi Nama Customer untuk Menyatukan Varian (seperti MT)
window.cetakCeklistMuat = function() {
    const keysDO = Object.keys(cacheCeklistDO);
    const keysFDN = Object.keys(cacheCeklistFDN);

    if (keysDO.length === 0 && keysFDN.length === 0 && dataTitipanList.length === 0) {
        miuiAlert("Belum ada data DO, FDN, atau Titipan untuk dicetak!");
        return;
    }

    if (!confirm("Apakah Anda yakin ingin memproses cetak dan menyimpan arsip data ke Database?")) {
        return;
    }

    const timestampNow = new Date().toISOString();
    let savedPromises = [];

    // Fungsi helper untuk membersihkan dan menyeragamkan nama customer (misal buang 'MT', spasi ganda, dll)
    function normalizeCustomerName(rawName) {
        let clean = String(rawName || '').toUpperCase();
        // Hapus kata tambahan umum seperti MT, REG di akhir atau bagian tertentu jika diinginkan
        // Contoh: Mengganti spasi berlebih atau simbol khusus
        clean = clean.replace(/\bMT\b/g, '').replace(/[\/\-\_\.\s]+/g, '_').replace(/^_+|_+\$/g, '');
        return clean;
    }

    // 1. Kelompokkan data DO berdasarkan ID Muat yang sudah dinormalisasi
    const groupedDO = {};
    keysDO.forEach((key) => {
        const item = cacheCeklistDO[key];
        const parts = key.split('_');
        if (parts.length >= 4) {
            const tglPart = `${parts[0]}_${parts[1]}_${parts[2]}`;
            
            // Normalisasi nama customer agar "SUMBER ALAM BARABAY MT" dan "SUMBER ALAM BARABAY" menjadi satu ID Muat
            const rawCust = item.meta.namacustomer;
            const custNormalized = normalizeCustomerName(rawCust);
            const muatId = `${tglPart}_${custNormalized}`.toUpperCase();

            if (!groupedDO[muatId]) {
                groupedDO[muatId] = {
                    meta: {
                        tgl: item.meta.tgl,
                        namacustomer: rawCust, // Tetap simpan nama aslinya di meta
                        timestamp_update: timestampNow
                    },
                    payloadDO: {},
                    total_muat_all: 0
                };
            }

            const noBuktiDigits = item.meta.nobukti.replace(/\D/g, '');
            const last5NoBukti = noBuktiDigits.length >= 5 ? noBuktiDigits.slice(-5) : noBuktiDigits;

            const itemsData = {};
            let totalMuatDO = 0;
            Object.keys(item.data).forEach((kb) => {
                itemsData[kb] = item.data[kb];
                totalMuatDO += Number(item.data[kb].qty_b || 0);
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
                    meta: {
                        nobukti: item.meta.nobukti,
                        tgl: item.meta.tgl,
                        total_muat: totalMuatDO
                    },
                    data: itemsData
                };
            }

            groupedDO[muatId].total_muat_all += totalMuatDO;
        }
    });

    // 2. Siapkan Objek Titipan
    const titipanDataObj = {};
    if (Array.isArray(dataTitipanList) && dataTitipanList.length > 0) {
        dataTitipanList.forEach((t) => {
            const kategori = String(t.kategori || 'PROMOSI').toLowerCase();
            const namaBarang = String(t.nama || '').replace(/[\/\s]+/g, '_').toUpperCase();
            const qty = Number(t.qty || 0);

            if (!titipanDataObj[kategori]) {
                titipanDataObj[kategori] = {};
            }

            const titipanKey = `${namaBarang}_${qty}`;
            titipanDataObj[kategori][titipanKey] = {
                namabarang: namaBarang,
                qty: qty
            };
        });
    }

    // 3. Simpan DO ke RTDB dengan ID Muat yang disatukan
    Object.keys(groupedDO).forEach((muatId) => {
        const group = groupedDO[muatId];
        const dbRef = firebase.database().ref(`ceklist_muat/arsip_cetak/ceklist_do/${muatId}`);

        const finalPayload = Object.assign({
            meta: group.meta
        }, group.payloadDO, {
            titipan: titipanDataObj,
            total_muat_keseluruhan: group.total_muat_all
        });

        savedPromises.push(dbRef.set(finalPayload));
    });

    // 4. Lakukan hal serupa untuk FDN jika ada
    const groupedFDN = {};
    keysFDN.forEach((key) => {
        const item = cacheCeklistFDN[key];
        const parts = key.split('_');
        if (parts.length >= 4) {
            const tglPart = `${parts[0]}_${parts[1]}_${parts[2]}`;
            const custNormalized = normalizeCustomerName(item.meta.namacustomer);
            const muatId = `${tglPart}_${custNormalized}`.toUpperCase();

            if (!groupedFDN[muatId]) {
                groupedFDN[muatId] = {
                    meta: {
                        tgl: item.meta.tgl,
                        namacustomer: item.meta.namacustomer,
                        timestamp_update: timestampNow
                    },
                    payloadFDN: {},
                    total_muat_all: 0
                };
            }

            const noBuktiDigits = item.meta.nobukti.replace(/\D/g, '');
            const last5NoBukti = noBuktiDigits.length >= 5 ? noBuktiDigits.slice(-5) : noBuktiDigits;

            const itemsData = {};
            let totalMuatFDN = 0;
            Object.keys(item.data).forEach((kb) => {
                itemsData[kb] = item.data[kb];
                totalMuatFDN += Number(item.data[kb].qty_b || 0);
            });

            groupedFDN[muatId].payloadFDN[last5NoBukti] = {
                meta: {
                    nobukti: item.meta.nobukti,
                    tgl: item.meta.tgl,
                    total_muat: totalMuatFDN
                },
                data: itemsData
            };

            groupedFDN[muatId].total_muat_all += totalMuatFDN;
        }
    });

Object.keys(groupedFDN).forEach((muatId) => {
        const group = groupedFDN[muatId];
        const dbRef = firebase.database().ref(`ceklist_muat/arsip_cetak/ceklist_fdn/${muatId}`);

        const finalPayload = Object.assign({
            meta: group.meta
        }, group.payloadFDN, {
            titipan: titipanDataObj,
            total_muat_keseluruhan: group.total_muat_all
        });

        savedPromises.push(dbRef.set(finalPayload));
    });

    // Perbarui bagian akhir fungsi cetakCeklistMuat untuk membersihkan cache dan tampilan
    Promise.all(savedPromises).then(() => {
        miuiAlert("Arsip cetak berhasil disimpan ke Database!");
        console.log("Arsip cetak berhasil disimpan.");
        
        // 1. Bersihkan Cache DO & FDN
        cacheCeklistDO = {};
        cacheCeklistFDN = {};

        // 2. Kosongkan Array Titipan (Coba berbagai variasi nama variabel global yang mungkin digunakan)
        if (typeof dataTitipanList !== 'undefined') dataTitipanList = [];
        if (typeof titipanList !== 'undefined') titipanList = [];
        if (typeof listTitipan !== 'undefined') listTitipan = [];

        // 3. Reset Tampilan Panel Kiri & Tabel Kanan
        const containerDO = document.getElementById('container-list-fdn-ceklist');
        if (containerDO) {
            containerDO.innerHTML = `<div class="text-slate-400 italic text-[10px]">Belum ada data DO atau FDN diimport...</div>`;
        }

        const tbody = document.getElementById('tabel-item-ceklist-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-slate-400 italic text-xs">Belum ada data barang...</td></tr>`;
        }

        const infoTotalEl = document.getElementById('info-total-muat-keseluruhan');
        if (infoTotalEl) {
            infoTotalEl.innerText = `TOTAL MUAT KESELURUHAN: 0 KRT [0 Item]`;
        }

        // 4. Panggil fungsi render titipan bawaan aplikasi Anda jika ada, 
        // atau kosongkan container-nya secara langsung
        if (typeof renderTitipan === 'function') {
            renderTitipan();
        } else if (typeof renderListTitipan === 'function') {
            renderListTitipan();
        } else {
            // Cari elemen pembungkus list titipan dan kosongkan paksa
            const containers = document.querySelectorAll('.space-y-2');
            containers.forEach(el => {
                if (el.innerHTML.includes('PKT-') || el.innerHTML.includes('PROMOSI') || el.innerHTML.includes('HRD')) {
                    el.innerHTML = `<div class="text-slate-400 italic text-[10px] text-center py-2">Belum ada item titipan ditambahkan...</div>`;
                }
            });
        }

        // 5. Trigger print browser (opsional)
        // window.print();

    }).catch((err) => {
        console.error("Gagal menyimpan arsip ke Firebase:", err);
        miuiAlert("Terjadi kesalahan saat menyimpan arsip ke Database!");
    });
};