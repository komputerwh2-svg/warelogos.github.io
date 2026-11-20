// js/dotrobel.js
console.log("Modul DO Trobel dimuat.");

// Inisialisasi utama modul DO Trobel
window.initDoTrobel = function() {
    console.log("Inisialisasi DO Trobel dijalankan.");
    
    // Set tanggal default hari ini pada input tanggal form Trobel & Klaim
    const tglHariIni = new Date().toISOString().split('T')[0];
    
    const elTglDoTrobel = document.getElementById('trobel-tgl-do');
    const elTglProsesTrobel = document.getElementById('trobel-tgl-proses');
    const elTglDoKlaim = document.getElementById('klaim-tgl-do');

    if (elTglDoTrobel && !elTglDoTrobel.value) elTglDoTrobel.value = tglHariIni;
    if (elTglProsesTrobel && !elTglProsesTrobel.value) elTglProsesTrobel.value = tglHariIni;
    if (elTglDoKlaim && !elTglDoKlaim.value) elTglDoKlaim.value = tglHariIni;

    // Panggil pemuat master data
    loadMasterTujuanTrobel();
    muatMasterBarangTrobel();
    loadMasterTujuanKlaim();
    
    renderRiwayatTrobel();
    renderRiwayatKlaim();
};

// Fungsi Kontrol Slider antara Trobel dan Klaim
window.gantiModulDoTrobel = function(mode) {
    const slider = document.getElementById('slider-content-do-trobel');
    if (!slider) return;

    if (mode === 'TROBEL') {
        slider.style.transform = 'translateX(0%)';
        console.log("Mode: DO TROBEL");
    } else if (mode === 'KLAIM') {
        slider.style.transform = 'translateX(-50%)';
        console.log("Mode: KLAIM");
    }
};

// Global variabel penampung cache master barang untuk DO Trobel
let masterBarangCacheTrobel = {};

// 1. Fungsi Memuat Master Tujuan
async function loadMasterTujuanTrobel() {
    try {
        if (window.rtdb) {
            const snapshot = await window.rtdb.ref('master_tujuan').once('value');
            const dataTujuan = snapshot.val();
            const dlTujuan = document.getElementById('list-master-tujuan');

            if (dataTujuan && dlTujuan) {
                let htmlTujuan = '';
                Object.keys(dataTujuan).forEach(key => {
                    const item = dataTujuan[key];
                    let valTujuan = '';

                    if (typeof item === 'object' && item !== null) {
                        valTujuan = item.TUJUAN || item.tujuan || item.nama || key;
                    } else {
                        valTujuan = item;
                    }

                    if (valTujuan) {
                        htmlTujuan += `<option value="${valTujuan}">`;
                    }
                });
                dlTujuan.innerHTML = htmlTujuan;
            }
        }
    } catch (e) {
        console.error("Gagal memuat master tujuan Trobel:", e);
    }
}

async function loadMasterTujuanKlaim() {
    try {
        const rtdbRef = window.rtdb ? window.rtdb.ref('master_tujuan') : firebase.database().ref('master_tujuan');
        const snapshot = await rtdbRef.once('value');
        const dataTujuan = snapshot.val();
        
        //console.log("Data Master Tujuan dari RTDB:", dataTujuan); // Cek F12 Console browser

        const dlTujuan = document.getElementById('list-template-tujuan');

        if (dataTujuan && dlTujuan) {
            let htmlTujuan = '';
            Object.keys(dataTujuan).forEach(key => {
                const item = dataTujuan[key];
                let valTujuan = '';

                if (typeof item === 'object' && item !== null) {
                    valTujuan = item.TUJUAN || item.tujuan || item.nama || key;
                } else {
                    valTujuan = item;
                }

                if (valTujuan) {
                    htmlTujuan += `<option value="${valTujuan}">`;
                }
            });
            dlTujuan.innerHTML = htmlTujuan;
            //console.log("HTML Datalist Tujuan berhasil di-inject:", htmlTujuan);
        } else {
            console.warn("Element dlTujuan tidak ditemukan atau dataTujuan kosong.");
        }
    } catch (e) {
        console.error("Gagal memuat master tujuan Klaim:", e);
    }
}

// 2. Fungsi Memuat Master Barang dengan Datalist & Autofill Nama
async function muatMasterBarangTrobel() {
    try {
        if (window.rtdb) {
            const snapshot = await window.rtdb.ref('master_barang').once('value');
            const data = snapshot.val();
            const datalist = document.getElementById('listMasterKodeBarang');
            if (!datalist) return;
            datalist.innerHTML = '';
            // Setelah mengisi datalist (`listMasterKodeBarang`), isi juga datalist klaim bila ada:
            const datalistKlaim = document.getElementById('list-template-kode-barang');
            if (datalistKlaim) {
                datalistKlaim.innerHTML = datalist.innerHTML;
            }
            masterBarangCacheTrobel = {};

            if (data) {
                const items = Array.isArray(data) ? data : Object.values(data);
                
                items.forEach(item => {
                    if (!item) return;
                    const kode = (item.KODE_BARANG || item.kodebarang || item.kode || '').trim();
                    const nama = (item.NAMA_BARANG || item.namabarang || item.nama || '').trim();
                    
                    if (kode) {
                        masterBarangCacheTrobel[kode.toUpperCase()] = nama;
                        const opt = document.createElement('option');
                        opt.value = kode;
                        opt.textContent = nama ? `${kode} - ${nama}` : kode;
                        datalist.appendChild(opt);
                    }
                });
            }
        }
    } catch (e) {
        console.error("Gagal memuat master barang Trobel:", e);
    }
}

// Fungsi otomatis mengisi/menampilkan nama barang berdasarkan kode yang diketik/dipilih
window.handlePilihKodeBarangTrobel = function(kodeInput) {
    const displayNama = document.getElementById('trobel-nama-barang-display');
    const cleanKode = (kodeInput || '').trim().toUpperCase();
    
    if (masterBarangCacheTrobel[cleanKode]) {
        const namaBrg = masterBarangCacheTrobel[cleanKode];
        if (displayNama) {
            displayNama.textContent = `[ ${namaBrg} ]`;
            displayNama.title = namaBrg;
        }
    } else {
        if (displayNama) {
            displayNama.textContent = '';
            displayNama.title = '';
        }
    }
};


// Fungsi Helper Template No. DN / DO
window.pilihTemplateNoDnDo = function(val) {
    const inputNo = document.getElementById('trobel-no-dn');
    if (inputNo) {
        inputNo.value = val;
        inputNo.focus();
    }
};

// Fungsi Helper Template Keterangan Trobel
window.pilihTemplateKetTrobel = function(val) {
    const inputKet = document.getElementById('trobel-keterangan');
    if (inputKet) {
        inputKet.value = val;
    }
};

// Fungsi Helper Template Keterangan Proses
window.pilihTemplateKetProses = function(val) {
    const textareaProses = document.getElementById('trobel-ket-proses');
    if (textareaProses) {
        textareaProses.value = val;
    }
};

// Array penampung item sementara sebelum disimpan permanen ke database
let listTrobelTemp = [];

// 1. Fungsi untuk menambahkan item (Kode & Qty) ke list sementara
window.tambahItemTrobelKeList = function() {
    const inputKode = document.getElementById('trobel-kode');
    const inputQty = document.getElementById('trobel-qty');
    const displayNama = document.getElementById('trobel-nama-barang-display');

    const kode = (inputKode.value || '').trim().toUpperCase();
    const qty = parseInt(inputQty.value) || 0;
    const namaBarang = displayNama.textContent ? displayNama.textContent.replace(/^-\s*/, '') : '';

    // Validasi input
    if (!kode) {
        miuiAlert('Silakan pilih atau ketik Kode Barang terlebih dahulu!');
        inputKode.focus();
        return;
    }
    if (qty <= 0) {
        miuiAlert('Jumlah Qty harus lebih dari 0!');
        inputQty.focus();
        return;
    }

    // Masukkan ke array sementara
    listTrobelTemp.push({
        kode: kode,
        nama: namaBarang,
        qty: qty
    });

    // Reset input kode dan qty untuk item berikutnya
    inputKode.value = '';
    inputQty.value = '';
    displayNama.textContent = '';
    displayNama.title = '';
    inputKode.focus();

    // Render ulang tampilan daftar item sementara
    renderListTrobelTemp();
};

// 2. Fungsi untuk menghapus item dari list sementara berdasarkan index
window.hapusItemTrobelTemp = function(index) {
    listTrobelTemp.splice(index, 1);
    renderListTrobelTemp();
};

// 3. Fungsi untuk merender daftar item sementara ke HTML
function renderListTrobelTemp() {
    const container = document.getElementById('container-list-item-trobel');
    if (!container) return;

    if (listTrobelTemp.length === 0) {
        container.innerHTML = `<div class="text-slate-400 italic text-center py-1">Belum ada item ditambahkan</div>`;
        return;
    }

    let html = '';
    listTrobelTemp.forEach((item, idx) => {
        html += `
            <div class="flex justify-between items-center bg-orange-50/80 p-1.5 rounded border border-orange-200">
                <div class="truncate pr-2">
                    <span class="font-bold text-slate-800">${item.kode}</span>
                    <span class="text-slate-500 text-[10px]">${item.nama || '-'}</span>
                    <span class="ml-2 px-1.5 py-0.5 bg-orange-200 text-orange-800 rounded font-black text-[9px]">Qty: ${item.qty} Krt</span>
                </div>
                <button type="button" onclick="hapusItemTrobelTemp(${idx})" class="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-md font-black text-[10px] flex items-center gap-1 transition" title="Hapus Item">
                    <i class="fa-solid fa-trash text-[9px]"></i> Hapus
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
}

// 4. Modifikasi fungsi simpan utama untuk melalukan perulangan (looping) menyimpan setiap item dalam listTrobelTemp
window.simpanDoTrobel = async function() {
    const tglDo = document.getElementById('trobel-tgl-do').value;
    const noDn = document.getElementById('trobel-no-dn').value.trim().toUpperCase();
    const tujuan = document.getElementById('trobel-tujuan').value.trim().toUpperCase();
    const keterangan = document.getElementById('trobel-keterangan').value.trim().toUpperCase();

    const tglProses = document.getElementById('trobel-tgl-proses').value;
    const noDnRetur = document.getElementById('trobel-no-dn-retur').value.trim().toUpperCase();
    const idBosnet = document.getElementById('trobel-id-bosnet').value.trim();
    const ketProses = document.getElementById('trobel-ket-proses').value.trim().toUpperCase();

    // Validasi data utama
    if (!tglDo || !noDn || !tujuan) {
        miuiAlert('Tanggal DO, No. DN/DO, dan Tujuan wajib diisi!');
        return;
    }

    // Jika list masih kosong tapi input kode & qty terisi, masukkan otomatis sebagai item tunggal
    const inputKodeVal = document.getElementById('trobel-kode').value.trim().toUpperCase();
    const inputQtyVal = parseInt(document.getElementById('trobel-qty').value) || 0;
    if (listTrobelTemp.length === 0 && inputKodeVal && inputQtyVal > 0) {
        const displayNama = document.getElementById('trobel-nama-barang-display');
        const namaBrg = displayNama.textContent ? displayNama.textContent.replace(/^-\s*/, '') : '';
        listTrobelTemp.push({
            kode: inputKodeVal.toUpperCase(),
            nama: namaBrg,
            qty: inputQtyVal
        });
    }

    if (listTrobelTemp.length === 0) {
        miuiAlert('Tambahkan minimal 1 item barang trobel!');
        document.getElementById('trobel-kode').focus();
        return;
    }

    try {
        if (!window.rtdb) {
            miuiAlert('Koneksi Database Firebase belum siap!');
            return;
        }

        const dbRef = window.rtdb.ref('do_trobel');
        const timestamp = Date.now();

        // Bersihkan karakter khusus pada tanggal dan tujuan agar aman dijadikan key Firebase
        const cleanTgl = tglDo.replace(/[^a-zA-Z0-9]/g, '_');
        const cleanTujuan = tujuan.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();

        // Simpan setiap item di dalam list menggunakan custom ID format: tanggal_tujuan_timestamp_kode
        for (const item of listTrobelTemp) {
            const cleanKode = item.kode.replace(/[^a-zA-Z0-9]/g, '_');
            const customId = `${cleanTgl}_${cleanTujuan}_${timestamp}_${cleanKode}`;

            const dataPayload = {
                id_unik: customId,
                tgl_do: tglDo,
                no_dn: noDn,
                tujuan: tujuan,
                keterangan: keterangan,
                kode_barang: item.kode,
                nama_barang: item.nama,
                qty: item.qty,
                tgl_proses: tglProses,
                no_dn_retur: noDnRetur,
                id_bosnet: idBosnet,
                ket_proses: ketProses,
                timestamp: timestamp
            };

            // Menggunakan .set(dataPayload) dengan customId alih-alih .push()
            await dbRef.child(customId).set(dataPayload);
        }

        miuiAlert('Data DO Trobel berhasil disimpan!');
        
        // Reset list sementara & item input
        listTrobelTemp = [];
        renderListTrobelTemp();
        document.getElementById('trobel-kode').value = '';
        document.getElementById('trobel-qty').value = '';
        document.getElementById('trobel-nama-barang-display').textContent = '';
        
        // Reset / Kosongkan seluruh form input Identitas DO & Info Proses
        document.getElementById('trobel-no-dn').value = '';
        document.getElementById('trobel-tujuan').value = '';
        document.getElementById('trobel-keterangan').value = '';
        document.getElementById('trobel-no-dn-retur').value = '';
        document.getElementById('trobel-id-bosnet').value = '';
        document.getElementById('trobel-ket-proses').value = '';
        
        // (Opsional) Jika ingin tanggal kembali ke hari ini secara otomatis:
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('trobel-tgl-do').value = today;
        document.getElementById('trobel-tgl-proses').value = today;

        // Refresh tabel riwayat
        if (typeof renderRiwayatTrobel === 'function') {
            renderRiwayatTrobel();
        }

    } catch (e) {
        console.error("Gagal menyimpan data DO Trobel:", e);
        miuiAlert('Terjadi kesalahan saat menyimpan data.');
    }
};

let cacheRiwayatTrobel = {};

window.resetFilterRiwayatTrobel = function() {
    const elTgl = document.getElementById('filter-trobel-tgl');
    const elCari = document.getElementById('filter-trobel-cari');
    if (elTgl) elTgl.value = '';
    if (elCari) elCari.value = '';
    renderTabelRiwayatTrobelTersaring();
};

function renderTabelRiwayatTrobelTersaring() {
    const tbody = document.getElementById('tabel-riwayat-trobel-body');
    if (!tbody) return;

    const data = cacheRiwayatTrobel || {};
    const keys = Object.keys(data);

    if (!keys.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="p-3 text-center text-slate-400 italic">Belum ada catatan DO trobel tersimpan.</td>
            </tr>
        `;
        return;
    }

    const elTgl = document.getElementById('filter-trobel-tgl');
    const elCari = document.getElementById('filter-trobel-cari');
    const tglDipilih = (elTgl && elTgl.value ? elTgl.value : '').trim();
    const kataKunci = (elCari && elCari.value ? elCari.value : '').trim().toLowerCase();

    const itemsArray = keys.map(key => ({
        id: key,
        ...data[key]
    }));

    // Kelompokkan informasi per grup (berdasarkan no_dn + timestamp)
    const grupInfo = {};
    itemsArray.forEach((it, idx) => {
        const gKey = getKunciGrupTrobel(it);
        if (!grupInfo[gKey]) {
            grupInfo[gKey] = {
                maxTgl: parseTglDoKeAngka(it.tgl_do),
                maxTs: it.timestamp || 0,
                firstIdx: idx,
                tglDoList: new Set(),
                teksGabungan: ''
            };
        }
        const g = grupInfo[gKey];
        const tglNum = parseTglDoKeAngka(it.tgl_do);
        if (tglNum > g.maxTgl) g.maxTgl = tglNum;
        if ((it.timestamp || 0) > g.maxTs) g.maxTs = it.timestamp || 0;
        if ((it.tgl_do || '').trim()) g.tglDoList.add((it.tgl_do || '').trim());

        g.teksGabungan += ` ${(it.tujuan || '')} ${(it.no_dn || '')}`;
    });

    // Saring berdasarkan grup agar semua item dalam satu DO/DN tetap ikut tampil utuh
    const filteredArray = itemsArray.filter(it => {
        const gKey = getKunciGrupTrobel(it);
        const g = grupInfo[gKey];

        if (tglDipilih) {
            const cocokTgl = (it.tgl_do || '').trim() === tglDipilih || (g && g.tglDoList.has(tglDipilih));
            if (!cocokTgl) return false;
        }

        if (kataKunci) {
            const sumberTeks = (g ? g.teksGabungan : `${it.tujuan || ''} ${it.no_dn || ''}`).toLowerCase();
            if (!sumberTeks.includes(kataKunci)) return false;
        }

        return true;
    });

    if (!filteredArray.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="p-3 text-center text-slate-400 italic">Data DO trobel tidak ditemukan sesuai pencarian.</td>
            </tr>
        `;
        return;
    }

    // Urutkan berdasarkan Tanggal DO terbaru ke terlama, lalu timestamp terbaru
    filteredArray.sort((a, b) => {
        const keyA = getKunciGrupTrobel(a);
        const keyB = getKunciGrupTrobel(b);
        const gA = grupInfo[keyA] || { maxTgl: parseTglDoKeAngka(a.tgl_do), maxTs: a.timestamp || 0, firstIdx: 0 };
        const gB = grupInfo[keyB] || { maxTgl: parseTglDoKeAngka(b.tgl_do), maxTs: b.timestamp || 0, firstIdx: 0 };

        if (gB.maxTgl !== gA.maxTgl) return gB.maxTgl - gA.maxTgl;
        if (gB.maxTs !== gA.maxTs) return gB.maxTs - gA.maxTs;
        if (keyA !== keyB) return gA.firstIdx - gB.firstIdx;
        return (a.timestamp || 0) - (b.timestamp || 0);
    });

    let html = '';
    let no = 1;
    let lastTimestamp = null;
    let lastNoDn = '';

    filteredArray.forEach(item => {
        const tglDoFormatted = item.tgl_do ? item.tgl_do.split('-').reverse().join('/') : '-';
        const tglProsesFormatted = item.tgl_proses ? item.tgl_proses.split('-').reverse().join('/') : '-';

        const isSameGroup = (item.timestamp && item.timestamp === lastTimestamp) || (item.no_dn && item.no_dn === lastNoDn);
        const nomorTampil = isSameGroup ? '' : no++;
        const encodedGroup = encodeURIComponent(getKunciGrupTrobel(item));

        lastTimestamp = item.timestamp;
        lastNoDn = item.no_dn;

        html += `
            <tr class="hover:bg-orange-50/50 transition border-b">
                <td class="p-2 border text-center font-bold text-slate-600">${nomorTampil}</td>
                <td class="p-2 border text-center font-semibold text-slate-800">${isSameGroup ? '' : tglDoFormatted}</td>
                <td onclick="event.stopPropagation(); window.bukaModalEditTrobelByGroupKey(decodeURIComponent('${encodedGroup}'))" title="Klik untuk Edit / Hapus Data" class="p-2 border font-bold text-slate-800 cursor-pointer hover:bg-orange-100/70">${isSameGroup ? '' : (item.tujuan || '-')}</td>
                <td onclick="event.stopPropagation(); window.bukaModalEditTrobelByGroupKey(decodeURIComponent('${encodedGroup}'))" title="Klik untuk Edit / Hapus Data" class="p-2 border font-bold text-orange-600 cursor-pointer hover:bg-orange-100/70 underline-offset-2 hover:underline">${isSameGroup ? '' : (item.no_dn || '-')}</td>
                <td class="p-2 border font-bold text-slate-800">${item.kode_barang || '-'}</td>
                <td class="p-2 border text-center font-black text-slate-900">${item.qty || 0}</td>
                <td class="p-2 border font-semibold text-slate-700">${item.keterangan || '-'}</td>
                <td class="p-2 border text-center text-slate-700">${isSameGroup ? '' : tglProsesFormatted}</td>
                <td class="p-2 border font-bold text-orange-600">${isSameGroup ? '' : (item.no_dn_retur || '-')}</td>
                <td class="p-2 border font-bold text-orange-600">${isSameGroup ? '' : (item.id_bosnet || '-')}</td>
                <td class="p-2 border text-slate-700">${isSameGroup ? '' : (item.ket_proses || '-')}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function renderRiwayatTrobel() {
    const tbody = document.getElementById('tabel-riwayat-trobel-body');
    if (!tbody) return;

    if (!window.rtdb) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="p-3 text-center text-slate-400 italic">Koneksi database belum siap.</td>
            </tr>
        `;
        return;
    }

    window.rtdb.ref('do_trobel').off('value');
    window.rtdb.ref('do_trobel').on('value', (snapshot) => {
        cacheRiwayatTrobel = snapshot.val() || {};
        renderTabelRiwayatTrobelTersaring();
    });
}


let modalEditTrobelState = {
    groupKey: null,
    recordIds: [],
    items: []
};

function getKunciGrupTrobel(item) {
    return `${item.no_dn || ''}__${item.timestamp || 0}`;
}

function pastikanModalEditTrobelAda() {
    if (document.getElementById('modal-edit-data-trobel')) return;

    const modalHtml = `
        <div id="modal-edit-data-trobel" style="z-index: 9999;" onclick="window.tutupModalEditTrobel()" class="fixed inset-0 z-[9999] hidden bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div onclick="event.stopPropagation()" class="bg-white rounded-2xl shadow-2xl border-2 border-orange-500 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
                <div class="bg-gradient-to-b from-[#3c3c3c] to-[#262626] text-white px-4 py-3 flex items-center justify-between shrink-0">
                    <div>
                        <div class="text-xs sm:text-sm font-black uppercase tracking-wider text-orange-400">
                            Edit Data DO Trobel
                        </div>
                        <div class="text-[11px] text-slate-300">
                            Grup: <span id="edit-trobel-id-info" class="font-mono"></span>
                        </div>
                    </div>
                    <button type="button" onclick="window.tutupModalEditTrobel()" class="text-slate-300 hover:text-red-400 font-black text-lg px-2">✕</button>
                </div>

                <div class="p-4 overflow-y-auto space-y-3.5 flex-1 miui-custom-scroll text-xs">
                    <div class="bg-slate-50 border border-orange-200 rounded-xl p-3.5 space-y-3">
                        <div class="text-[11px] font-black text-orange-600 uppercase tracking-wide">
                            1. Identitas DO Trobel & Proses Retur
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Tanggal DO</label>
                                <input type="date" id="edit-trobel-tgl-do" class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white">
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">No. DN / DO</label>
                                <input type="text" id="edit-trobel-no-dn" oninput="this.value = this.value.toUpperCase()" class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white uppercase">
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Tujuan</label>
                                <input type="text" id="edit-trobel-tujuan" oninput="this.value = this.value.toUpperCase()" class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white uppercase">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Keterangan</label>
                                <input type="text" id="edit-trobel-keterangan" oninput="this.value = this.value.toUpperCase()" class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white uppercase">
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Tanggal Proses</label>
                                <input type="date" id="edit-trobel-tgl-proses" class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">No. DN Retur</label>
                                <input type="text" id="edit-trobel-no-dn-retur" oninput="this.value = this.value.toUpperCase()" class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white uppercase">
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">No. ID Bosnet</label>
                                <input type="text" id="edit-trobel-id-bosnet" oninput="this.value = this.value.toUpperCase()" class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white uppercase">
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Ket. Proses</label>
                                <input type="text" id="edit-trobel-ket-proses" oninput="this.value = this.value.toUpperCase()" class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white uppercase">
                            </div>
                        </div>
                    </div>

                    <div class="bg-orange-50/50 border border-orange-200 rounded-xl p-3.5 space-y-2.5">
                        <div class="text-[11px] font-black text-orange-700 uppercase tracking-wide">
                            2. Daftar Item DO Trobel (Kode Barang & Qty)
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <div class="sm:col-span-7">
                                <input type="text" id="edit-trobel-inp-kode" oninput="this.value = this.value.toUpperCase()" placeholder="KODE BARANG..." class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white uppercase">
                            </div>
                            <div class="sm:col-span-3">
                                <input type="number" id="edit-trobel-inp-qty" min="1" placeholder="Qty..." class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white">
                            </div>
                            <div class="sm:col-span-2">
                                <button type="button" onclick="window.tambahItemEditTrobel()" class="w-full h-full py-2 px-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-black text-[10px] uppercase shadow-sm">
                                    + Tambah
                                </button>
                            </div>
                        </div>
                        <div id="edit-trobel-daftar-item" class="space-y-1.5 pt-1"></div>
                    </div>
                </div>

                <div class="bg-slate-100 px-4 py-3 border-t flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <button type="button" onclick="window.hapusDataTrobelDariModal()" class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-[11px] uppercase shadow">
                        Hapus Data
                    </button>

                    <div class="flex items-center gap-2">
                        <button type="button" onclick="window.tutupModalEditTrobel()" class="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-[11px] uppercase">
                            Batal
                        </button>
                        <button type="button" id="btn-simpan-perubahan-trobel" onclick="window.simpanPerubahanDataTrobel()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase shadow">
                            Simpan Perubahan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function renderDaftarItemEditTrobel() {
    const wrap = document.getElementById('edit-trobel-daftar-item');
    if (!wrap) return;

    if (!modalEditTrobelState.items.length) {
        wrap.innerHTML = `<div class="text-[11px] text-slate-400 italic py-1">Belum ada item di daftar. Anda bisa isi langsung Kode & Qty di atas lalu klik Simpan Perubahan.</div>`;
        return;
    }

    wrap.innerHTML = modalEditTrobelState.items.map((it, idx) => `
        <div class="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <div class="font-bold text-slate-800">
                <span class="text-orange-600">${escapeHtmlCctv(it.kode_barang)}</span>
                <span class="text-slate-400 mx-1.5">•</span>
                <span>Qty: <b>${Number(it.qty) || 0}</b></span>
            </div>
            <button type="button" onclick="window.hapusItemEditTrobel(${idx})" class="px-2 py-0.5 rounded bg-red-100 hover:bg-red-200 text-red-600 text-[10px] font-black">
                Hapus
            </button>
        </div>
    `).join('');
}

window.tambahItemEditTrobel = function() {
    const elKode = document.getElementById('edit-trobel-inp-kode');
    const elQty = document.getElementById('edit-trobel-inp-qty');
    const kode = (elKode && elKode.value ? elKode.value : '').trim().toUpperCase();
    const qty = parseInt(elQty && elQty.value ? elQty.value : '0', 10);

    if (!kode) {
        notifyKlaim('Kode barang wajib diisi!');
        return;
    }
    if (!qty || qty <= 0) {
        notifyKlaim('Qty harus lebih dari 0!');
        return;
    }

    modalEditTrobelState.items.push({
        id: null,
        kode_barang: kode,
        qty: qty
    });

    if (elKode) elKode.value = '';
    if (elQty) elQty.value = '';
    renderDaftarItemEditTrobel();
};

window.hapusItemEditTrobel = function(idx) {
    modalEditTrobelState.items.splice(idx, 1);
    renderDaftarItemEditTrobel();
};

window.bukaModalEditTrobelByGroupKey = function(groupKey) {
    const data = cacheRiwayatTrobel || {};
    const grupRecords = Object.keys(data)
        .map(key => ({ id: key, ...data[key] }))
        .filter(it => getKunciGrupTrobel(it) === groupKey);

    if (!grupRecords.length) {
        notifyKlaim('Data DO trobel tidak ditemukan!');
        return;
    }

    pastikanModalEditTrobelAda();

    const induk = grupRecords.find(r => (r.tujuan || '').trim() || (r.no_dn || '').trim()) || grupRecords[0];

    modalEditTrobelState = {
        groupKey,
        recordIds: grupRecords.map(r => r.id),
        items: grupRecords.map(r => ({
            id: r.id,
            kode_barang: (r.kode_barang || '').toUpperCase(),
            qty: Number(r.qty) || 0
        }))
    };

    const elId = document.getElementById('edit-trobel-id-info');
    if (elId) elId.textContent = `${induk.no_dn || '-'} • ${induk.tujuan || '-'}`;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('edit-trobel-tgl-do', induk.tgl_do || '');
    setVal('edit-trobel-no-dn', (induk.no_dn || '').toUpperCase());
    setVal('edit-trobel-tujuan', (induk.tujuan || '').toUpperCase());
    setVal('edit-trobel-keterangan', (induk.keterangan || '').toUpperCase());
    setVal('edit-trobel-tgl-proses', induk.tgl_proses || '');
    setVal('edit-trobel-no-dn-retur', (induk.no_dn_retur || '').toUpperCase());
    setVal('edit-trobel-id-bosnet', (induk.id_bosnet || '').toUpperCase());
    setVal('edit-trobel-ket-proses', (induk.ket_proses || '').toUpperCase());
    setVal('edit-trobel-inp-kode', '');
    setVal('edit-trobel-inp-qty', '');

    renderDaftarItemEditTrobel();

    const modalEl = document.getElementById('modal-edit-data-trobel');
    if (modalEl) modalEl.classList.remove('hidden');
};

window.tutupModalEditTrobel = function() {
    const modalEl = document.getElementById('modal-edit-data-trobel');
    if (modalEl) modalEl.classList.add('hidden');
    modalEditTrobelState = { groupKey: null, recordIds: [], items: [] };
};

window.simpanPerubahanDataTrobel = async function() {
    if (!modalEditTrobelState.groupKey || !window.rtdb) return;

    const getVal = (id) => (document.getElementById(id)?.value || '').trim();
    const tglDo = getVal('edit-trobel-tgl-do');
    const noDn = getVal('edit-trobel-no-dn').toUpperCase();
    const tujuan = getVal('edit-trobel-tujuan').toUpperCase();
    const keterangan = getVal('edit-trobel-keterangan').toUpperCase();
    const tglProses = getVal('edit-trobel-tgl-proses');
    const noDnRetur = getVal('edit-trobel-no-dn-retur').toUpperCase();
    const idBosnet = getVal('edit-trobel-id-bosnet').toUpperCase();
    const ketProses = getVal('edit-trobel-ket-proses').toUpperCase();

    const inpKode = getVal('edit-trobel-inp-kode').toUpperCase();
    const inpQty = parseInt(getVal('edit-trobel-inp-qty') || '0', 10);

    let finalItems = modalEditTrobelState.items.slice();
    if (!finalItems.length && inpKode) {
        finalItems.push({ id: null, kode_barang: inpKode, qty: inpQty > 0 ? inpQty : 1 });
    }

    if (!noDn && !tujuan) {
        notifyKlaim('Tujuan atau No. DN/DO wajib diisi!');
        return;
    }
    if (!finalItems.length) {
        notifyKlaim('Minimal harus ada 1 item kode barang!');
        return;
    }

    const btnSimpan = document.getElementById('btn-simpan-perubahan-trobel');
    if (btnSimpan) {
        btnSimpan.disabled = true;
        btnSimpan.textContent = 'Menyimpan...';
    }

    try {
        const refRoot = window.rtdb.ref('do_trobel');
        const dataLama = cacheRiwayatTrobel || {};
        const recordLamaPertama = modalEditTrobelState.recordIds
            .map(id => dataLama[id])
            .find(Boolean) || {};
        const timestampGrup = recordLamaPertama.timestamp || Date.now();

        const keptIds = new Set(finalItems.map(it => it.id).filter(Boolean));
        const removedIds = modalEditTrobelState.recordIds.filter(id => !keptIds.has(id));

        for (const remId of removedIds) {
            await refRoot.child(remId).remove();
        }

        const payloadDasar = {
            tgl_do: tglDo,
            no_dn: noDn,
            tujuan: tujuan,
            keterangan: keterangan,
            tgl_proses: tglProses,
            no_dn_retur: noDnRetur,
            id_bosnet: idBosnet,
            ket_proses: ketProses,
            timestamp: timestampGrup,
            updated_at: Date.now()
        };

        for (const it of finalItems) {
            const payloadItem = {
                ...payloadDasar,
                kode_barang: (it.kode_barang || '').toUpperCase(),
                qty: Number(it.qty) || 0
            };

            if (it.id) {
                await refRoot.child(it.id).update(payloadItem);
            } else {
                await refRoot.push().set(payloadItem);
            }
        }

        window.tutupModalEditTrobel();
        notifyKlaim('Perubahan data DO Trobel berhasil disimpan.');
    } catch (err) {
        console.error(err);
        notifyKlaim('Gagal menyimpan perubahan data DO Trobel!');
    } finally {
        if (btnSimpan) {
            btnSimpan.disabled = false;
            btnSimpan.textContent = 'Simpan Perubahan';
        }
    }
};

window.hapusDataTrobelDariModal = function() {
    if (!modalEditTrobelState.recordIds.length || !window.rtdb) return;

    const info = document.getElementById('edit-trobel-id-info')?.textContent || 'data ini';
    confirmKlaim(`Yakin ingin menghapus data DO Trobel (${info})?`, async () => {
        try {
            const refRoot = window.rtdb.ref('do_trobel');
            for (const recId of modalEditTrobelState.recordIds) {
                await refRoot.child(recId).remove();
            }
            window.tutupModalEditTrobel();
            notifyKlaim('Data DO Trobel berhasil dihapus.');
        } catch (err) {
            console.error(err);
            notifyKlaim('Gagal menghapus data DO Trobel!');
        }
    });
};


// ==========================================
// MODUL KLAIM KURANG - TAHAP 1 (REVISI: MIUI ALERT/CONFIRM, KLAIM_KURANG, ID SERAGAM & LASERJET GRAYSCALE)
// ==========================================
let listKlaimTemp = [];
let fotoSuratKlaimTemp = [];
let viewerFotoList = [];
let viewerFotoIndex = 0;
let selectedKlaimIdAktif = null;
let cacheRiwayatKlaim = {};

function notifyKlaim(pesan) {
    if (typeof window.miuiAlert === 'function') window.miuiAlert(pesan);
    else alert(pesan);
}

function confirmKlaim(pesan, onYa) {
    if (typeof window.miuiConfirm === 'function') window.miuiConfirm(pesan, onYa);
    else if (confirm(pesan) && typeof onYa === 'function') onYa();
}

function getKlaimDbRef() {
    if (window.rtdb) return window.rtdb.ref('klaim_kurang');
    if (typeof firebase !== 'undefined' && firebase.database) return firebase.database().ref('klaim_kurang');
    return null;
}

function buatIdKlaimSeragam(tglDo, tujuan, timestamp) {
    const cleanTgl = (tglDo || '').replace(/[^a-zA-Z0-9]/g, '_');
    const cleanTujuan = (tujuan || '').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    return `${cleanTgl}_${cleanTujuan}_${timestamp}`;
}

window.handlePilihKodeBarangKlaim = function(kodeInput) {
    const displayNama = document.getElementById('klaim-nama-barang-display');
    const cleanKode = (kodeInput || '').trim().toUpperCase();
    if (displayNama) {
        displayNama.textContent = masterBarangCacheTrobel[cleanKode] ? `[ ${masterBarangCacheTrobel[cleanKode]} ]` : '';
    }
};

window.tambahItemKlaimKeList = function() {
    const inputKode = document.getElementById('klaim-kode');
    const inputQty = document.getElementById('klaim-qty');
    const displayNama = document.getElementById('klaim-nama-barang-display');

    const kode = (inputKode?.value || '').trim().toUpperCase();
    const qty = parseInt(inputQty?.value, 10) || 0;
    const namaBarang = displayNama?.textContent ? displayNama.textContent.replace(/^\[|\]$/g, '').trim() : (masterBarangCacheTrobel[kode] || '');

    if (!kode) {
        notifyKlaim('Silakan pilih atau ketik Kode Barang terlebih dahulu!');
        inputKode?.focus();
        return;
    }
    if (qty <= 0) {
        notifyKlaim('Jumlah Qty klaim harus lebih dari 0!');
        inputQty?.focus();
        return;
    }

    listKlaimTemp.push({ kode, nama: namaBarang, qty });

    if (inputKode) inputKode.value = '';
    if (inputQty) inputQty.value = '';
    if (displayNama) displayNama.textContent = '';
    inputKode?.focus();

    renderListKlaimTemp();
};

window.hapusItemKlaimTemp = function(index) {
    confirmKlaim('Hapus item ini dari daftar klaim sementara?', () => {
        listKlaimTemp.splice(index, 1);
        renderListKlaimTemp();
    });
};

function renderListKlaimTemp() {
    const container = document.getElementById('container-list-item-klaim');
    if (!container) return;

    if (listKlaimTemp.length === 0) {
        container.innerHTML = `<div class="text-slate-400 italic text-center py-1">Belum ada item ditambahkan (bisa langsung simpan jika 1 item)</div>`;
        return;
    }

    container.innerHTML = listKlaimTemp.map((item, idx) => `
        <div class="flex justify-between items-center bg-orange-50/80 p-1.5 rounded border border-orange-200">
            <div class="truncate pr-2">
                <span class="font-bold text-slate-800">${item.kode}</span>
                <span class="text-slate-500 text-[10px]">${item.nama ? '- ' + item.nama : ''}</span>
                <span class="ml-2 px-1.5 py-0.5 bg-orange-200 text-orange-800 rounded font-black text-[9px]">Qty: ${item.qty}</span>
            </div>
            <button type="button" onclick="hapusItemKlaimTemp(${idx})" class="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-600 rounded font-black text-[10px]">
                Hapus
            </button>
        </div>
    `).join('');
}

// Kompres gambar berwarna berkualitas tinggi agar tetap jernih & hemat ukuran untuk RTDB
function prosesGambarKlaim(file, applyLaserjetMode = false, maxWidth = 1440, quality = 0.83) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const scale = img.width > maxWidth ? maxWidth / img.width : 1;
                const targetW = Math.max(1, Math.round(img.width * scale));
                const targetH = Math.max(1, Math.round(img.height * scale));

                const canvas = document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;

                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, targetW, targetH);

                // Tetap pertahankan warna asli di aplikasi; grayscale diterapkan saat cetak
                const mimeType = file && file.type === 'image/png' && !applyLaserjetMode
                    ? 'image/jpeg'
                    : 'image/jpeg';

                resolve({
                    nama: file && file.name ? file.name : 'bukti-klaim.jpg',
                    grayscale: false,
                    src: canvas.toDataURL(mimeType, quality)
                });
            };
            img.onerror = reject;
            img.src = ev.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

let viewerZoomScale = 1;
let viewerPanX = 0;
let viewerPanY = 0;
let viewerDragCleanup = null;

function terapkanTransformGambar(imgEl) {
    if (!imgEl) return;
    imgEl.style.transform = `translate(${viewerPanX}px, ${viewerPanY}px) scale(${viewerZoomScale})`;
    imgEl.style.cursor = viewerZoomScale > 1 ? 'grab' : 'default';

    const zoomLabel = document.getElementById('label-zoom-foto');
    if (zoomLabel) zoomLabel.textContent = `${Math.round(viewerZoomScale * 100)}%`;
}

window.ubahZoomFotoKlaim = function(delta) {
    if (!viewerFotoList.length) return;
    const nextScale = Math.max(0.5, Math.min(5, Number((viewerZoomScale + delta).toFixed(2))));
    viewerZoomScale = nextScale;
    if (viewerZoomScale <= 1) {
        viewerPanX = 0;
        viewerPanY = 0;
    }
    const imgEl = document.querySelector('#container-viewer-foto img');
    terapkanTransformGambar(imgEl);
};

window.resetZoomFotoKlaim = function() {
    viewerZoomScale = 1;
    viewerPanX = 0;
    viewerPanY = 0;
    const imgEl = document.querySelector('#container-viewer-foto img');
    terapkanTransformGambar(imgEl);
};

function tampilkanFotoDiViewer(fotoArr, statusText = '') {
    viewerFotoList = Array.isArray(fotoArr) ? fotoArr : [];
    viewerFotoIndex = 0;
    viewerZoomScale = 1;
    viewerPanX = 0;
    viewerPanY = 0;
    renderViewerFotoAktif(statusText);
}

function renderViewerFotoAktif(statusText = '') {
    const container = document.getElementById('container-viewer-foto');
    const indeksEl = document.getElementById('info-indeks-foto');
    const statusEl = document.getElementById('label-status-foto');
    const btnPrev = document.getElementById('btn-prev-foto');
    const btnNext = document.getElementById('btn-next-foto');
    const btnZoomIn = document.getElementById('btn-zoom-in-foto');
    const btnZoomOut = document.getElementById('btn-zoom-out-foto');
    const btnZoomReset = document.getElementById('btn-zoom-reset-foto');
    const zoomLabel = document.getElementById('label-zoom-foto');
    const btnHapusFoto = document.getElementById('btn-hapus-foto-viewer');

    if (!container) return;

    if (typeof viewerDragCleanup === 'function') {
        viewerDragCleanup();
        viewerDragCleanup = null;
    }

    container.querySelectorAll('img, .viewer-placeholder-msg, .viewer-slide-wrap').forEach(el => el.remove());

    if (!viewerFotoList.length) {
        const span = document.createElement('span');
        span.className = 'viewer-placeholder-msg text-xs text-slate-400 font-medium text-center px-4';
        span.textContent = 'Belum ada foto surat klaim pada data ini';
        container.appendChild(span);

        if (indeksEl) indeksEl.textContent = '0 / 0';
        if (statusEl) statusEl.textContent = statusText || 'Belum ada foto yang ditampilkan';
        if (zoomLabel) zoomLabel.textContent = '100%';

        if (btnPrev) btnPrev.disabled = true;
        if (btnNext) btnNext.disabled = true;
        if (btnZoomIn) btnZoomIn.disabled = true;
        if (btnZoomOut) btnZoomOut.disabled = true;
        if (btnZoomReset) btnZoomReset.disabled = true;
        if (btnHapusFoto) btnHapusFoto.classList.add('hidden');
        return;
    }

    if (viewerFotoIndex < 0) viewerFotoIndex = viewerFotoList.length - 1;
    if (viewerFotoIndex >= viewerFotoList.length) viewerFotoIndex = 0;

    const currentFoto = viewerFotoList[viewerFotoIndex];
    const isSlideObj = typeof currentFoto === 'object' && currentFoto !== null;
    const isCctvSlide = isSlideObj && currentFoto.tipe === 'CCTV';
    const imgSrc = isSlideObj ? currentFoto.src : currentFoto;
    const imgNama = isSlideObj && currentFoto.nama ? currentFoto.nama : `Foto ${viewerFotoIndex + 1}`;
    const slideFilterCss = isCctvSlide && currentFoto.filterCss ? currentFoto.filterCss : '';

    if (btnHapusFoto) {
        if (!isCctvSlide) btnHapusFoto.classList.remove('hidden');
        else btnHapusFoto.classList.add('hidden');
    }

    const slideWrap = document.createElement('div');
    slideWrap.className = 'viewer-slide-wrap relative w-full h-full flex items-center justify-center bg-black overflow-hidden';

    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = imgNama;
    img.draggable = false;
    img.className = 'w-full h-full object-contain bg-black select-none transition-transform duration-150';
    terapkanTransformGambar(img);
    if (slideFilterCss) {
        img.style.filter = slideFilterCss;
    }
    slideWrap.appendChild(img);

    if (isCctvSlide) {
        if (currentFoto.zoomCropSrc) {
            const zoomBox = document.createElement('div');
            zoomBox.className = 'w-24 h-20 sm:w-28 sm:h-24 bg-black border-2 border-white shadow-lg overflow-hidden pointer-events-none';
            zoomBox.style.cssText = `position:absolute; z-index:3; ${getPosCss(currentFoto.zoomPos || 'right-bottom')}`;
            const zoomFilterAttr = slideFilterCss ? ` style="filter: ${slideFilterCss};"` : '';
            zoomBox.innerHTML = `<img src="${currentFoto.zoomCropSrc}" alt="Zoom Beceran" class="w-full h-full object-contain"${zoomFilterAttr}>`;
            slideWrap.appendChild(zoomBox);
        }

        const cat = currentFoto.catatan || {};
        const noteBox = document.createElement('div');
        noteBox.className = 'max-w-[52%] bg-white/95 text-slate-900 border border-slate-900 px-2.5 py-1.5 text-[10px] leading-tight shadow pointer-events-none';
        noteBox.style.cssText = `position:absolute; z-index:3; ${getPosCss(currentFoto.notePos || 'right-bottom')}`;
        noteBox.innerHTML = `
            <div class="font-black uppercase">${escapeHtmlCctv(cat.tujuan || '')}</div>
            <div class="font-bold">${escapeHtmlCctv(cat.meta || '')}</div>
            <div class="font-bold mb-0.5">${escapeHtmlCctv(cat.ekspedisi || '')}</div>
            <div class="font-black uppercase">${escapeHtmlCctv(cat.palet || '')}</div>
            ${cat.rumus ? `<div class="font-bold">${escapeHtmlCctv(cat.rumus)}</div>` : ''}
            ${cat.tambahan ? `<div class="font-bold mt-0.5 whitespace-pre-line">${escapeHtmlCctv(cat.tambahan)}</div>` : ''}
        `;
        slideWrap.appendChild(noteBox);
    }

    // 1. Scroll wheel zoom di dalam kotak gambar
    const handleWheelZoom = (e) => {
        e.preventDefault();
        const step = e.deltaY < 0 ? 0.25 : -0.25;
        window.ubahZoomFotoKlaim(step);
    };
    container.addEventListener('wheel', handleWheelZoom, { passive: false });

    // 2. Klik dua kali (double click) untuk toggle cepat 100% <-> 200%
    const handleDoubleClick = (e) => {
        e.preventDefault();
        if (viewerZoomScale > 1) {
            viewerZoomScale = 1;
            viewerPanX = 0;
            viewerPanY = 0;
        } else {
            viewerZoomScale = 2;
        }
        terapkanTransformGambar(img);
    };
    img.addEventListener('dblclick', handleDoubleClick);

    // 3. Drag/geser gambar saat di-zoom > 100%
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const handleMouseDown = (e) => {
        if (viewerZoomScale <= 1) return;
        isDragging = true;
        startX = e.clientX - viewerPanX;
        startY = e.clientY - viewerPanY;
        img.style.transition = 'none';
        img.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        viewerPanX = e.clientX - startX;
        viewerPanY = e.clientY - startY;
        terapkanTransformGambar(img);
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        img.style.transition = 'transform 150ms ease';
        img.style.cursor = viewerZoomScale > 1 ? 'grab' : 'default';
    };

    img.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    viewerDragCleanup = () => {
        container.removeEventListener('wheel', handleWheelZoom);
        img.removeEventListener('dblclick', handleDoubleClick);
        img.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    container.appendChild(slideWrap);

    if (indeksEl) indeksEl.textContent = `${viewerFotoIndex + 1} / ${viewerFotoList.length}`;
    if (statusEl) statusEl.textContent = statusText || `${imgNama} (${viewerFotoIndex + 1} dari ${viewerFotoList.length})`;

    const hasMultiple = viewerFotoList.length > 1;
    if (btnPrev) btnPrev.disabled = !hasMultiple;
    if (btnNext) btnNext.disabled = !hasMultiple;
    if (btnZoomIn) btnZoomIn.disabled = false;
    if (btnZoomOut) btnZoomOut.disabled = false;
    if (btnZoomReset) btnZoomReset.disabled = false;
}

window.hapusFotoAktifViewer = function() {
    if (!viewerFotoList.length) {
        notifyKlaim('Tidak ada foto yang sedang ditampilkan.');
        return;
    }

    const idxHapus = viewerFotoIndex;
    const fotoTarget = viewerFotoList[idxHapus];
    const namaTarget = typeof fotoTarget === 'object' && fotoTarget?.nama
        ? fotoTarget.nama
        : `Foto ke-${idxHapus + 1}`;

    confirmKlaim(`Hapus "${namaTarget}"?`, async () => {
        // Kasus 1: Foto milik riwayat klaim yang sudah tersimpan di RTDB
        if (selectedKlaimIdAktif && cacheRiwayatKlaim[selectedKlaimIdAktif]) {
            const dbRef = getKlaimDbRef();
            if (!dbRef) {
                notifyKlaim('Koneksi database Firebase belum siap!');
                return;
            }

            const existingData = cacheRiwayatKlaim[selectedKlaimIdAktif];
            const fotoLama = Array.isArray(existingData.foto_surat) ? [...existingData.foto_surat] : [];
            if (idxHapus < 0 || idxHapus >= fotoLama.length) return;

            fotoLama.splice(idxHapus, 1);

            try {
                await dbRef.child(selectedKlaimIdAktif).update({
                    foto_surat: fotoLama,
                    updated_at: Date.now()
                });

                cacheRiwayatKlaim[selectedKlaimIdAktif].foto_surat = fotoLama;
                viewerFotoList = fotoLama;
                viewerFotoIndex = Math.max(0, Math.min(idxHapus, fotoLama.length - 1));
                viewerZoomScale = 1;
                viewerPanX = 0;
                viewerPanY = 0;

                const ringkasInfo = `${existingData.no_dn || '-'} | ${existingData.tujuan || '-'}`;
                renderViewerFotoAktif(
                    fotoLama.length
                        ? `${ringkasInfo} (${fotoLama.length} foto)`
                        : `${ringkasInfo} - Foto surat sudah dihapus`
                );
                notifyKlaim('Foto surat klaim berhasil dihapus!');
            } catch (e) {
                console.error('Gagal menghapus foto surat klaim:', e);
                notifyKlaim('Gagal menghapus foto surat klaim dari database.');
            }
            return;
        }

        // Kasus 2: Foto masih berstatus draft sebelum disimpan
        if (idxHapus >= 0 && idxHapus < fotoSuratKlaimTemp.length) {
            fotoSuratKlaimTemp.splice(idxHapus, 1);
            viewerFotoList = [...fotoSuratKlaimTemp];
            viewerFotoIndex = Math.max(0, Math.min(idxHapus, fotoSuratKlaimTemp.length - 1));
            viewerZoomScale = 1;
            viewerPanX = 0;
            viewerPanY = 0;

            const labelBtn = document.getElementById('label-btn-foto-klaim');
            if (labelBtn) {
                labelBtn.textContent = fotoSuratKlaimTemp.length > 0
                    ? `Foto Surat Terpilih (${fotoSuratKlaimTemp.length})`
                    : 'Tambah Foto Surat Klaim (Opsional)';
            }

            renderViewerFotoAktif(
                fotoSuratKlaimTemp.length
                    ? `Draft foto surat klaim (${fotoSuratKlaimTemp.length} file)`
                    : 'Draft foto surat klaim dikosongkan'
            );
            notifyKlaim('Foto draft berhasil dihapus.');
        }
    });
};

window.geserFotoKlaim = function(step) {
    if (!viewerFotoList.length) return;
    viewerFotoIndex += step;
    viewerZoomScale = 1;
    viewerPanX = 0;
    viewerPanY = 0;
    renderViewerFotoAktif();
};

window.handleTambahFotoKlaim = async function(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const useLaserjet = !!document.getElementById('klaim-chk-grayscale')?.checked;

    try {
        const hasilProses = await Promise.all(files.map(f => prosesGambarKlaim(f, useLaserjet)));
        fotoSuratKlaimTemp = fotoSuratKlaimTemp.concat(hasilProses);

        const labelBtn = document.getElementById('label-btn-foto-klaim');
        if (labelBtn) labelBtn.textContent = `Foto Surat Terpilih (${fotoSuratKlaimTemp.length})`;

        tampilkanFotoDiViewer(
            fotoSuratKlaimTemp,
            `Draft foto surat klaim (${fotoSuratKlaimTemp.length} file)${useLaserjet ? ' - Grayscale LaserJet' : ''}`
        );
    } catch (e) {
        console.error('Gagal memproses foto klaim:', e);
        notifyKlaim('Gagal memproses file foto klaim.');
    } finally {
        event.target.value = '';
    }
};

window.updateFotoKlaimRiwayat = async function(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length || !selectedKlaimIdAktif) return;

    const dbRef = getKlaimDbRef();
    if (!dbRef) {
        notifyKlaim('Koneksi database Firebase belum siap!');
        return;
    }

    const useLaserjet = !!document.getElementById('klaim-chk-grayscale')?.checked;

    try {
        const hasilBaru = await Promise.all(files.map(f => prosesGambarKlaim(f, useLaserjet)));
        const existingData = cacheRiwayatKlaim[selectedKlaimIdAktif] || {};
        const fotoLama = Array.isArray(existingData.foto_surat) ? existingData.foto_surat : [];
        const fotoGabungan = fotoLama.concat(hasilBaru);

        await dbRef.child(selectedKlaimIdAktif).update({
            foto_surat: fotoGabungan,
            updated_at: Date.now()
        });

        notifyKlaim(`Foto surat klaim berhasil diperbarui (${fotoGabungan.length} foto)!`);
        tampilkanFotoDiViewer(fotoGabungan, `Surat klaim diperbarui (${fotoGabungan.length} foto)`);
    } catch (e) {
        console.error('Gagal mengupdate foto klaim:', e);
        notifyKlaim('Gagal mengupdate foto surat klaim.');
    } finally {
        event.target.value = '';
    }
};

function bangunDaftarSlideViewerKlaim(item) {
    const slides = [];

    // 1. Slide foto surat klaim
    const daftarSurat = Array.isArray(item.foto_surat) ? item.foto_surat : [];
    daftarSurat.forEach((f, idx) => {
        const src = typeof f === 'string' ? f : f.src;
        const nama = typeof f === 'object' && f.nama ? f.nama : `Surat Klaim ${idx + 1}`;
        if (src) {
            slides.push({
                tipe: 'SURAT',
                suratIndex: idx,
                nama: nama,
                src: src
            });
        }
    });

    // 2. Slide hasil edit laporan CCTV (jika sudah tersimpan di item.laporan_cctv)
    const lapRoot = item && typeof item.laporan_cctv === 'object' && item.laporan_cctv !== null
        ? item.laporan_cctv
        : {};

    Object.keys(lapRoot).forEach((kodeKey) => {
        const lap = lapRoot[kodeKey];
        const fotosCctv = Array.isArray(lap?.fotos) ? lap.fotos : [];
        const tujuanLap = lap.tujuan || item.tujuan || '';
        const noDoLap = lap.no_do || item.no_dn || '';
        const kodeLap = lap.kode_barang || kodeKey || item.kode_barang || '';
        const totalDoLap = lap.total_do || '';
        const ekspedisiLap = lap.ekspedisi_nopol || '';
        const baris2 = `(${noDoLap}) / ${kodeLap}${totalDoLap ? ' = ' + totalDoLap : ''}`;

        fotosCctv.forEach((fc, fIdx) => {
            if (!fc || !fc.src) return;
            const hasZoom = !!fc.zoomCropSrc;
            slides.push({
                tipe: 'CCTV',
                kodeBarang: kodeLap,
                nama: `CCTV ${kodeLap} - ${fc.palet || `Foto ${fIdx + 1}`}`,
                src: fc.src,
                zoomCropSrc: fc.zoomCropSrc || '',
                filterCss: getFotoFilterCss(fc, false),
                notePos: fc.notePos || (hasZoom ? 'left-bottom' : 'right-bottom'),
                zoomPos: fc.zoomPos || 'right-bottom',
                catatan: {
                    tujuan: tujuanLap,
                    meta: baris2,
                    ekspedisi: ekspedisiLap,
                    palet: fc.palet || `PALET KE-${fIdx + 1}: `,
                    rumus: fc.rumus || '',
                    tambahan: fc.catatanTambahan || ''
                }
            });
        });
    });

    return slides;
}

window.pilihRiwayatKlaim = function(klaimId) {
    selectedKlaimIdAktif = klaimId;
    const item = cacheRiwayatKlaim[klaimId];
    const btnUpdate = document.getElementById('btn-update-foto-riwayat');

    if (btnUpdate) {
        if (item) btnUpdate.classList.remove('hidden');
        else btnUpdate.classList.add('hidden');
    }

    if (!item) return;

    const daftarSlide = bangunDaftarSlideViewerKlaim(item);
    const jmlSurat = Array.isArray(item.foto_surat) ? item.foto_surat.length : 0;
    const jmlCctv = daftarSlide.filter(s => s.tipe === 'CCTV').length;
    const ringkasInfo = `${item.no_dn || '-'} | ${item.tujuan || '-'}`;

    let statusAwal = `${ringkasInfo} - Belum ada foto atau laporan CCTV`;
    if (daftarSlide.length > 0) {
        statusAwal = `${ringkasInfo} (${jmlSurat} Surat, ${jmlCctv} Laporan CCTV)`;
    }

    tampilkanFotoDiViewer(daftarSlide, statusAwal);
};

window.simpanDataKlaim = async function() {
    const tglDo = document.getElementById('klaim-tgl-do')?.value || '';
    const noDo = (document.getElementById('klaim-no-do')?.value || '').trim().toUpperCase();
    const tujuan = (document.getElementById('klaim-tujuan')?.value || '').trim().toUpperCase();
    const keterangan = (document.getElementById('klaim-keterangan')?.value || '').trim().toUpperCase() || 'BARANG KURANG';

    const kodeInputEl = document.getElementById('klaim-kode');
    const qtyInputEl = document.getElementById('klaim-qty');
    const namaDisplayEl = document.getElementById('klaim-nama-barang-display');

    let itemsUntukSimpan = [...listKlaimTemp];
    const kodeLangsung = (kodeInputEl?.value || '').trim().toUpperCase();
    const qtyLangsung = parseInt(qtyInputEl?.value, 10) || 0;

    if (kodeLangsung && qtyLangsung > 0) {
        const namaLangsung = namaDisplayEl?.textContent
            ? namaDisplayEl.textContent.replace(/^\[|\]$/g, '').trim()
            : (masterBarangCacheTrobel[kodeLangsung] || '');
        itemsUntukSimpan.push({ kode: kodeLangsung, nama: namaLangsung, qty: qtyLangsung });
    }

    if (!tglDo || !noDo || !tujuan || itemsUntukSimpan.length === 0) {
        notifyKlaim('Lengkapi Tanggal DO, No. DO/DN, Tujuan, serta minimal 1 Kode Barang & Qty!');
        return;
    }

    const dbRef = getKlaimDbRef();
    if (!dbRef) {
        notifyKlaim('Koneksi database Firebase belum siap!');
        return;
    }

    try {
        const timestamp = Date.now();
        const klaimId = buatIdKlaimSeragam(tglDo, tujuan, timestamp);

        const payload = {
            id_unik: klaimId,
            id_klaim: klaimId,
            tgl_do: tglDo,
            no_dn: noDo,
            tujuan: tujuan,
            keterangan: keterangan,
            items: itemsUntukSimpan,
            kode_barang: itemsUntukSimpan.map(i => i.kode).join(', '),
            qty: itemsUntukSimpan.reduce((acc, i) => acc + (Number(i.qty) || 0), 0),
            foto_surat: fotoSuratKlaimTemp,
            laporan_cctv: {},
            timestamp: timestamp
        };

        await dbRef.child(klaimId).set(payload);
        notifyKlaim('Data Klaim berhasil disimpan ke riwayat!');

        listKlaimTemp = [];
        fotoSuratKlaimTemp = [];
        renderListKlaimTemp();

        if (document.getElementById('klaim-no-do')) document.getElementById('klaim-no-do').value = '';
        if (document.getElementById('klaim-tujuan')) document.getElementById('klaim-tujuan').value = '';
        if (document.getElementById('klaim-keterangan')) document.getElementById('klaim-keterangan').value = '';
        if (kodeInputEl) kodeInputEl.value = '';
        if (qtyInputEl) qtyInputEl.value = '';
        if (namaDisplayEl) namaDisplayEl.textContent = '';

        const labelBtn = document.getElementById('label-btn-foto-klaim');
        if (labelBtn) labelBtn.textContent = 'Tambah Foto Surat Klaim (Opsional)';

        tampilkanFotoDiViewer([]);
        renderRiwayatKlaim();
    } catch (e) {
        console.error('Gagal menyimpan data klaim:', e);
        notifyKlaim('Terjadi kesalahan saat menyimpan data klaim.');
    }
};

function parseTglDoKeAngka(tglStr) {
    if (!tglStr || typeof tglStr !== 'string') return 0;
    const bersih = tglStr.trim();

    // Format standar input date: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(bersih)) {
        const t = new Date(`${bersih}T00:00:00`).getTime();
        return Number.isNaN(t) ? 0 : t;
    }

    // Fallback jika ada format DD/MM/YYYY atau DD-MM-YYYY
    const m = bersih.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
    if (m) {
        const t = new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`).getTime();
        return Number.isNaN(t) ? 0 : t;
    }

    const t = Date.parse(bersih);
    return Number.isNaN(t) ? 0 : t;
}

function renderRiwayatKlaim() {
    const tbody = document.getElementById('tabel-riwayat-klaim-body');
    if (!tbody) return;

    const dbRef = getKlaimDbRef();
    if (!dbRef) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-3 text-center text-slate-400 italic">Koneksi database belum siap.</td></tr>`;
        return;
    }

    dbRef.off('value');
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        cacheRiwayatKlaim = data || {};

        if (!data) {
            tbody.innerHTML = `<tr><td colspan="9" class="p-3 text-center text-slate-400 italic">Belum ada catatan klaim tersimpan.</td></tr>`;
            return;
        }

        const list = Object.keys(data)
            .map(key => ({ id: key, ...data[key] }))
            .sort((a, b) => {
                const tglA = parseTglDoKeAngka(a.tgl_do);
                const tglB = parseTglDoKeAngka(b.tgl_do);
                if (tglB !== tglA) return tglB - tglA;
                return (b.timestamp || 0) - (a.timestamp || 0);
            });

        tbody.innerHTML = list.map((item, idx) => {
            const tglFormatted = item.tgl_do ? item.tgl_do.split('-').reverse().join('/') : '-';
            const itemsArr = Array.isArray(item.items) && item.items.length
                ? item.items
                : [{ kode: item.kode_barang || '-', qty: item.qty || 0 }];

            const kodeTampil = itemsArr.map(i => i.kode).join('<br>');
            const qtyTampil = itemsArr.map(i => i.qty).join('<br>');
            const jumlahFoto = Array.isArray(item.foto_surat) ? item.foto_surat.length : 0;
            const isSelected = selectedKlaimIdAktif === item.id;

            const badgeFoto = jumlahFoto > 0
                ? `<span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-black text-[10px]">${jumlahFoto} Foto</span>`
                : `<span class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold text-[10px]">Belum Ada</span>`;

            return `
                <tr onclick="pilihRiwayatKlaim('${item.id}')" class="cursor-pointer transition border-b ${isSelected ? 'bg-orange-100/80' : 'hover:bg-orange-50/60'}">
                    <td class="p-2 border text-center font-bold text-slate-600">${idx + 1}</td>
                    <td class="p-2 border text-center font-semibold text-slate-800">${tglFormatted}</td>
                    <td class="p-2 border font-bold text-orange-600">${item.no_dn || '-'}</td>
                    <td class="p-2 border font-bold text-slate-800">${item.tujuan || '-'}</td>
                    <td class="p-2 border font-bold text-slate-800">${kodeTampil}</td>
                    <td class="p-2 border text-center font-black text-slate-900">${qtyTampil}</td>
                    <td class="p-2 border font-semibold text-slate-700">${item.keterangan || '-'}</td>
                    <td class="p-2 border text-center">${badgeFoto}</td>
                    ${renderKolomAksiLaporanCctv(item)}
                </tr>
            `;
        }).join('');
    });
}

window.resetFilterRiwayatKlaim = function() {
    const elTgl = document.getElementById('filter-klaim-tgl');
    const elCari = document.getElementById('filter-klaim-cari');
    if (elTgl) elTgl.value = '';
    if (elCari) elCari.value = '';
    renderTabelRiwayatKlaimTersaring();
};

function renderTabelRiwayatKlaimTersaring() {
    const tbody = document.getElementById('tabel-riwayat-klaim-body');
    if (!tbody) return;

    const data = cacheRiwayatKlaim || {};
    const keys = Object.keys(data);

    if (!keys.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-3 text-center text-slate-400 italic">Belum ada catatan klaim tersimpan.</td></tr>`;
        return;
    }

    const elTgl = document.getElementById('filter-klaim-tgl');
    const elCari = document.getElementById('filter-klaim-cari');
    const tglDipilih = (elTgl && elTgl.value ? elTgl.value : '').trim();
    const kataKunci = (elCari && elCari.value ? elCari.value : '').trim().toLowerCase();

    const list = keys
        .map(key => ({ id: key, ...data[key] }))
        .filter(item => {
            if (tglDipilih && (item.tgl_do || '').trim() !== tglDipilih) {
                return false;
            }
            if (kataKunci) {
                const noDn = (item.no_dn || '').toLowerCase();
                const tujuan = (item.tujuan || '').toLowerCase();
                if (!noDn.includes(kataKunci) && !tujuan.includes(kataKunci)) {
                    return false;
                }
            }
            return true;
        })
        .sort((a, b) => {
            const tglA = parseTglDoKeAngka(a.tgl_do);
            const tglB = parseTglDoKeAngka(b.tgl_do);
            if (tglB !== tglA) return tglB - tglA;
            return (b.timestamp || 0) - (a.timestamp || 0);
        });

    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-3 text-center text-slate-400 italic">Data klaim tidak ditemukan sesuai pencarian.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((item, idx) => {
        const tglFormatted = item.tgl_do ? item.tgl_do.split('-').reverse().join('/') : '-';
        const itemsArr = Array.isArray(item.items) && item.items.length
            ? item.items
            : [{ kode: item.kode_barang || '-', qty: item.qty || 0 }];

        const kodeTampil = itemsArr.map(i => i.kode).join('<br>');
        const qtyTampil = itemsArr.map(i => i.qty).join('<br>');
        const jumlahFoto = Array.isArray(item.foto_surat) ? item.foto_surat.length : 0;
        const isSelected = selectedKlaimIdAktif === item.id;

        const badgeFoto = jumlahFoto > 0
            ? `<span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-black text-[10px]">${jumlahFoto} Foto</span>`
            : `<span class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold text-[10px]">Belum Ada</span>`;

        return `
            <tr onclick="pilihRiwayatKlaim('${item.id}')" class="cursor-pointer transition border-b ${isSelected ? 'bg-orange-100/80' : 'hover:bg-orange-50/60'}">
                <td class="p-2 border text-center font-bold text-slate-600">${idx + 1}</td>
                <td class="p-2 border text-center font-semibold text-slate-800">${tglFormatted}</td>
                <td class="p-2 border font-bold text-orange-600">${item.no_dn || '-'}</td>
                <td class="p-2 border font-bold text-slate-800">${item.tujuan || '-'}</td>
                <td class="p-2 border font-bold text-slate-800">${kodeTampil}</td>
                <td class="p-2 border text-center font-black text-slate-900">${qtyTampil}</td>
                <td class="p-2 border font-semibold text-slate-700">${item.keterangan || '-'}</td>
                <td class="p-2 border text-center">${badgeFoto}</td>
                ${renderKolomAksiLaporanCctv(item)}
            </tr>
        `;
    }).join('');
}

function renderRiwayatKlaim() {
    const tbody = document.getElementById('tabel-riwayat-klaim-body');
    if (!tbody) return;

    const dbRef = getKlaimDbRef();
    if (!dbRef) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-3 text-center text-slate-400 italic">Koneksi database belum siap.</td></tr>`;
        return;
    }

    dbRef.off('value');
    dbRef.on('value', (snapshot) => {
        cacheRiwayatKlaim = snapshot.val() || {};
        renderTabelRiwayatKlaimTersaring();
    });
}


// ==========================================
// MODUL KLAIM KURANG - TAHAP 2 (LENGKAP & REVISI)
// - Format cetak F4 (215mm x 330mm), maksimal 2 foto landscape per halaman
// - Foto normal: kotak catatan di kanan bawah (bisa diubah posisinya per foto)
// - Foto beceran (ada zoomCropSrc): gambar zoom di kanan bawah & kotak catatan pindah ke kiri bawah (bisa diubah posisinya per foto)
// - Catatan palet, rumus, dan catatan tambahan/total bisa diedit bebas per foto
// ==========================================
let cctvEditorState = {
    klaimId: null,
    kodeAktif: '',
    tujuan: '',
    noDo: '',
    totalDo: '',
    ekspedisiNopol: '',
    fotos: [] // { nama, src, palet, rumus, catatanTambahan, zoomCropSrc, notePos, zoomPos }
};

let cropModalState = {
    fotoIndex: null,
    imgSrc: '',
    startX: 0,
    startY: 0,
    currX: 0,
    currY: 0,
    dragging: false
};

function escapeHtmlCctv(str) {
    return String(str || '')
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"');
}

function getLaporanItemObj(klaimObj, kodeItem) {
    const lapRoot = klaimObj && typeof klaimObj.laporan_cctv === 'object' && klaimObj.laporan_cctv !== null
        ? klaimObj.laporan_cctv
        : {};
    if (kodeItem && lapRoot[kodeItem]) return lapRoot[kodeItem];
    const firstKey = Object.keys(lapRoot)[0];
    return firstKey ? lapRoot[firstKey] : null;
}

function renderKolomAksiLaporanCctv(item) {
    const lapRoot = typeof item.laporan_cctv === 'object' && item.laporan_cctv !== null
        ? item.laporan_cctv
        : {};
    const jumlahLapCctv = Object.keys(lapRoot).reduce((sum, k) => {
        const fArr = Array.isArray(lapRoot[k]?.fotos) ? lapRoot[k].fotos.length : 0;
        return sum + fArr;
    }, 0);

    const badgeCctv = jumlahLapCctv > 0
        ? `<span class="block text-[9px] font-bold text-emerald-700 mb-1">${jumlahLapCctv} Foto CCTV</span>`
        : '';

    return `
        <td onclick="event.stopPropagation()" class="p-2 border text-center whitespace-nowrap">
            ${badgeCctv}
            <div class="inline-flex items-center justify-center gap-1">
                <button type="button" onclick="bukaModalEditKlaim('${item.id}')" class="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] uppercase shadow-sm">
                    Edit Klaim
                </button>
                <button type="button" onclick="bukaModalLaporanCctv('${item.id}')" class="px-2 py-1 rounded bg-orange-600 hover:bg-orange-700 text-white font-black text-[9px] uppercase shadow-sm">
                    Edit Catatan
                </button>
                <button type="button" onclick="cetakLaporanBuktiCctv('${item.id}')" class="px-2 py-1 rounded bg-slate-700 hover:bg-slate-800 text-white font-black text-[9px] uppercase shadow-sm">
                    Cetak Laporan
                </button>
            </div>
        </td>
    `;
}

let modalEditKlaimState = {
    klaimId: null,
    items: [],
    fotoSurat: []
};

function pastikanModalEditKlaimAda() {
    if (document.getElementById('modal-edit-data-klaim')) return;

    const modalHtml = `
        <div id="modal-edit-data-klaim" style="z-index: 9999;" onclick="window.tutupModalEditKlaim()" class="fixed inset-0 z-[9999] hidden bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div onclick="event.stopPropagation()" class="bg-white rounded-2xl shadow-2xl border-2 border-orange-500 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
                <div class="bg-gradient-to-b from-[#3c3c3c] to-[#262626] text-white px-4 py-3 flex items-center justify-between shrink-0">
                    <div>
                        <div class="text-xs sm:text-sm font-black uppercase tracking-wider text-orange-400">
                            Edit Data Klaim Barang Kurang
                        </div>
                        <div class="text-[11px] text-slate-300">
                            ID Klaim: <span id="edit-klaim-id-info" class="font-mono"></span>
                        </div>
                    </div>
                    <button type="button" onclick="window.tutupModalEditKlaim()" class="text-slate-300 hover:text-red-400 font-black text-lg px-2">✕</button>
                </div>

                <div class="p-4 overflow-y-auto space-y-3.5 flex-1 miui-custom-scroll text-xs">
                    <div class="bg-slate-50 border border-orange-200 rounded-xl p-3.5 space-y-3">
                        <div class="text-[11px] font-black text-orange-600 uppercase tracking-wide">
                            1. Identitas Klaim & Keterangan
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Tanggal DO</label>
                                <input type="date" id="edit-klaim-tgl-do" class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white">
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">No. DO / DN</label>
                                <input type="text" id="edit-klaim-no-dn" oninput="this.value = this.value.toUpperCase()" class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white uppercase">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Tujuan / Customer</label>
                                <input type="text" id="edit-klaim-tujuan" oninput="this.value = this.value.toUpperCase()" class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white uppercase">
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Keterangan Klaim</label>
                                <input type="text" id="edit-klaim-keterangan" oninput="this.value = this.value.toUpperCase()" class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white uppercase">
                            </div>
                        </div>
                    </div>

                    <div class="bg-orange-50/50 border border-orange-200 rounded-xl p-3.5 space-y-2.5">
                        <div class="text-[11px] font-black text-orange-700 uppercase tracking-wide">
                            2. Daftar Item Klaim (Kode Barang & Qty)
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <div class="sm:col-span-7">
                                <input type="text" id="edit-klaim-inp-kode" oninput="this.value = this.value.toUpperCase()" placeholder="KODE BARANG..." class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white uppercase">
                            </div>
                            <div class="sm:col-span-3">
                                <input type="number" id="edit-klaim-inp-qty" min="1" placeholder="Qty..." class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white">
                            </div>
                            <div class="sm:col-span-2">
                                <button type="button" onclick="window.tambahItemEditKlaim()" class="w-full h-full py-2 px-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-black text-[10px] uppercase shadow-sm">
                                    + Tambah
                                </button>
                            </div>
                        </div>
                        <div id="edit-klaim-daftar-item" class="space-y-1.5 pt-1"></div>
                    </div>

                    <div id="edit-klaim-info-foto" class="text-[11px] font-semibold text-slate-700 bg-slate-50 border border-orange-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                        <span id="edit-klaim-label-foto">Foto Surat Klaim: 0 foto</span>
                        <button type="button" id="edit-klaim-btn-kosong-foto" onclick="window.kosongkanFotoSuratEditKlaim()" class="hidden px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 text-[10px] font-black uppercase">
                            Hapus Foto Surat
                        </button>
                    </div>
                </div>

                <div class="bg-slate-100 px-4 py-3 border-t flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <button type="button" onclick="window.hapusDataKlaimDariModal()" class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-[11px] uppercase shadow">
                        Hapus Data
                    </button>

                    <div class="flex items-center gap-2">
                        <button type="button" onclick="window.tutupModalEditKlaim()" class="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-[11px] uppercase">
                            Batal
                        </button>
                        <button type="button" id="btn-simpan-perubahan-klaim" onclick="window.simpanPerubahanDataKlaim()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase shadow">
                            Simpan Perubahan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function renderDaftarItemEditKlaim() {
    const wrap = document.getElementById('edit-klaim-daftar-item');
    if (!wrap) return;

    if (!modalEditKlaimState.items.length) {
        wrap.innerHTML = `<div class="text-[11px] text-slate-400 italic py-1">Belum ada item di daftar. Anda bisa isi langsung Kode & Qty di atas lalu klik Simpan Perubahan.</div>`;
        return;
    }

    wrap.innerHTML = modalEditKlaimState.items.map((it, idx) => `
        <div class="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <div class="font-bold text-slate-800">
                <span class="text-orange-600">${escapeHtmlCctv(it.kode)}</span>
                <span class="text-slate-400 mx-1.5">•</span>
                <span>Qty: <b>${Number(it.qty) || 0}</b></span>
            </div>
            <button type="button" onclick="window.hapusItemEditKlaim(${idx})" class="px-2 py-0.5 rounded bg-red-100 hover:bg-red-200 text-red-600 text-[10px] font-black">
                Hapus
            </button>
        </div>
    `).join('');
}

function updateLabelFotoEditKlaim() {
    const lbl = document.getElementById('edit-klaim-label-foto');
    const btn = document.getElementById('edit-klaim-btn-kosong-foto');
    const jml = Array.isArray(modalEditKlaimState.fotoSurat) ? modalEditKlaimState.fotoSurat.length : 0;
    if (lbl) lbl.textContent = `Foto Surat Klaim tersimpan: ${jml} foto`;
    if (btn) {
        if (jml > 0) btn.classList.remove('hidden');
        else btn.classList.add('hidden');
    }
}

window.tambahItemEditKlaim = function() {
    const elKode = document.getElementById('edit-klaim-inp-kode');
    const elQty = document.getElementById('edit-klaim-inp-qty');
    const kode = (elKode && elKode.value ? elKode.value : '').trim().toUpperCase();
    const qty = parseInt(elQty && elQty.value ? elQty.value : '0', 10);

    if (!kode) {
        notifyKlaim('Kode barang wajib diisi!');
        return;
    }
    if (!qty || qty <= 0) {
        notifyKlaim('Qty harus lebih dari 0!');
        return;
    }

    modalEditKlaimState.items.push({ kode, qty });
    if (elKode) elKode.value = '';
    if (elQty) elQty.value = '';
    renderDaftarItemEditKlaim();
};

window.hapusItemEditKlaim = function(idx) {
    modalEditKlaimState.items.splice(idx, 1);
    renderDaftarItemEditKlaim();
};

window.kosongkanFotoSuratEditKlaim = function() {
    confirmKlaim('Hapus semua foto surat klaim pada data ini?', () => {
        modalEditKlaimState.fotoSurat = [];
        updateLabelFotoEditKlaim();
    });
};

window.bukaModalEditKlaim = function(klaimId) {
    const klaim = cacheRiwayatKlaim && cacheRiwayatKlaim[klaimId];
    if (!klaim) {
        notifyKlaim('Data klaim tidak ditemukan!');
        return;
    }

    pastikanModalEditKlaimAda();

    const itemsSumber = Array.isArray(klaim.items) && klaim.items.length
        ? klaim.items
        : (klaim.kode_barang ? [{ kode: klaim.kode_barang, qty: klaim.qty || 0 }] : []);

    modalEditKlaimState = {
        klaimId,
        items: itemsSumber.map(i => ({
            kode: (i.kode || '').toUpperCase(),
            qty: Number(i.qty) || 0
        })),
        fotoSurat: Array.isArray(klaim.foto_surat) ? klaim.foto_surat.slice() : []
    };

    const elId = document.getElementById('edit-klaim-id-info');
    const elTgl = document.getElementById('edit-klaim-tgl-do');
    const elNoDn = document.getElementById('edit-klaim-no-dn');
    const elTujuan = document.getElementById('edit-klaim-tujuan');
    const elKet = document.getElementById('edit-klaim-keterangan');
    const elInpKode = document.getElementById('edit-klaim-inp-kode');
    const elInpQty = document.getElementById('edit-klaim-inp-qty');

    if (elId) elId.textContent = `ID: ${klaimId}`;
    if (elTgl) elTgl.value = klaim.tgl_do || '';
    if (elNoDn) elNoDn.value = (klaim.no_dn || '').toUpperCase();
    if (elTujuan) elTujuan.value = (klaim.tujuan || '').toUpperCase();
    if (elKet) elKet.value = (klaim.keterangan || '').toUpperCase();
    if (elInpKode) elInpKode.value = '';
    if (elInpQty) elInpQty.value = '';

    renderDaftarItemEditKlaim();
    updateLabelFotoEditKlaim();

    const modalEl = document.getElementById('modal-edit-data-klaim');
    if (modalEl) modalEl.classList.remove('hidden');
};

window.tutupModalEditKlaim = function() {
    const modalEl = document.getElementById('modal-edit-data-klaim');
    if (modalEl) modalEl.classList.add('hidden');
    modalEditKlaimState = { klaimId: null, items: [], fotoSurat: [] };
};

window.simpanPerubahanDataKlaim = async function() {
    const klaimId = modalEditKlaimState.klaimId;
    if (!klaimId) return;

    const dbRef = getKlaimDbRef();
    if (!dbRef) {
        notifyKlaim('Koneksi database belum siap!');
        return;
    }

    const tglDo = (document.getElementById('edit-klaim-tgl-do')?.value || '').trim();
    const noDn = (document.getElementById('edit-klaim-no-dn')?.value || '').trim().toUpperCase();
    const tujuan = (document.getElementById('edit-klaim-tujuan')?.value || '').trim().toUpperCase();
    const keterangan = (document.getElementById('edit-klaim-keterangan')?.value || '').trim().toUpperCase();

    // Jika user mengetik 1 item di input tanpa sempat klik "+ Tambah" dan daftar masih kosong
    const inpKode = (document.getElementById('edit-klaim-inp-kode')?.value || '').trim().toUpperCase();
    const inpQty = parseInt(document.getElementById('edit-klaim-inp-qty')?.value || '0', 10);
    let finalItems = modalEditKlaimState.items.slice();
    if (!finalItems.length && inpKode) {
        finalItems.push({ kode: inpKode, qty: inpQty > 0 ? inpQty : 1 });
    }

    if (!tglDo || !noDn || !tujuan) {
        notifyKlaim('Tanggal DO, No. DO/DN, dan Tujuan wajib diisi!');
        return;
    }
    if (!finalItems.length) {
        notifyKlaim('Minimal harus ada 1 item kode barang!');
        return;
    }

    const btnSimpan = document.getElementById('btn-simpan-perubahan-klaim');
    if (btnSimpan) {
        btnSimpan.disabled = true;
        btnSimpan.textContent = 'Menyimpan...';
    }

    try {
        const itemPertama = finalItems[0];
        const totalQty = finalItems.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);

        await dbRef.child(klaimId).update({
            tgl_do: tglDo,
            no_dn: noDn,
            tujuan: tujuan,
            keterangan: keterangan,
            items: finalItems,
            kode_barang: itemPertama.kode,
            qty: totalQty,
            foto_surat: modalEditKlaimState.fotoSurat,
            updated_at: Date.now()
        });

        window.tutupModalEditKlaim();
        notifyKlaim('Perubahan data klaim berhasil disimpan.');
    } catch (err) {
        console.error(err);
        notifyKlaim('Gagal menyimpan perubahan data klaim!');
    } finally {
        if (btnSimpan) {
            btnSimpan.disabled = false;
            btnSimpan.textContent = 'Simpan Perubahan';
        }
    }
};

window.hapusDataKlaimDariModal = function() {
    const klaimId = modalEditKlaimState.klaimId;
    if (!klaimId) return;

    const klaim = cacheRiwayatKlaim && cacheRiwayatKlaim[klaimId];
    const info = klaim ? `${klaim.no_dn || '-'} (${klaim.tujuan || '-'})` : klaimId;

    confirmKlaim(`Yakin ingin menghapus data klaim ${info}? Data akan dihapus permanen dari database.`, async () => {
        const dbRef = getKlaimDbRef();
        if (!dbRef) {
            notifyKlaim('Koneksi database belum siap!');
            return;
        }

        try {
            await dbRef.child(klaimId).remove();

            if (selectedKlaimIdAktif === klaimId) {
                selectedKlaimIdAktif = null;
                viewerFotoList = [];
                viewerFotoIndex = 0;
                if (typeof renderViewerFotoAktif === 'function') {
                    renderViewerFotoAktif('Data klaim telah dihapus');
                }
            }

            window.tutupModalEditKlaim();
            notifyKlaim('Data klaim berhasil dihapus.');
        } catch (err) {
            console.error(err);
            notifyKlaim('Gagal menghapus data klaim!');
        }
    });
};

function getPosCss(pos) {
    switch (pos) {
        case 'left-top':
            return 'top: 6px; left: 6px; right: auto; bottom: auto;';
        case 'right-top':
            return 'top: 6px; right: 6px; left: auto; bottom: auto;';
        case 'left-bottom':
            return 'bottom: 6px; left: 6px; right: auto; top: auto;';
        case 'right-bottom':
        default:
            return 'bottom: 6px; right: 6px; left: auto; top: auto;';
    }
}

window.bukaModalLaporanCctv = function(klaimId, kodeDipilih = '') {
    const klaim = cacheRiwayatKlaim[klaimId];
    if (!klaim) {
        notifyKlaim('Data klaim tidak ditemukan!');
        return;
    }

    const itemsArr = Array.isArray(klaim.items) && klaim.items.length
        ? klaim.items
        : [{ kode: klaim.kode_barang || 'ITEM', nama: '', qty: klaim.qty || 0 }];

    const lapRoot = typeof klaim.laporan_cctv === 'object' && klaim.laporan_cctv !== null
        ? klaim.laporan_cctv
        : {};

    const kodeAwal = kodeDipilih || Object.keys(lapRoot)[0] || itemsArr[0].kode || 'ITEM';
    const existingLap = lapRoot[kodeAwal] || {};

    cctvEditorState = {
        klaimId: klaimId,
        kodeAktif: kodeAwal,
        tujuan: existingLap.tujuan || klaim.tujuan || '',
        noDo: existingLap.no_do || klaim.no_dn || '',
        totalDo: existingLap.total_do || '',
        ekspedisiNopol: existingLap.ekspedisi_nopol || '',
        fotos: Array.isArray(existingLap.fotos)
            ? existingLap.fotos.map((f, idx) => ({
                nama: f.nama || `CCTV-${idx + 1}.jpg`,
                src: f.src,
                palet: f.palet || `PALET KE-${idx + 1}: `,
                rumus: f.rumus || '',
                catatanTambahan: f.catatanTambahan || '',
                zoomCropSrc: f.zoomCropSrc || '',
                notePos: f.notePos || (f.zoomCropSrc ? 'left-bottom' : 'right-bottom'),
                zoomPos: f.zoomPos || 'right-bottom'
            }))
            : []
    };

    let modalEl = document.getElementById('modal-laporan-cctv-klaim');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'modal-laporan-cctv-klaim';
        modalEl.className = 'fixed inset-0 bg-black/60 z-[9990] flex items-center justify-center p-3 sm:p-5';
        document.body.appendChild(modalEl);
    }

    const opsiKodeHtml = itemsArr.map(it => {
        const k = it.kode || 'ITEM';
        const sel = k === cctvEditorState.kodeAktif ? 'selected' : '';
        return `<option value="${escapeHtmlCctv(k)}" ${sel}>${escapeHtmlCctv(k)} (Klaim: ${it.qty || 0})</option>`;
    }).join('');

    modalEl.innerHTML = `
        <div onclick="event.stopPropagation()" class="bg-white rounded-2xl shadow-2xl border-2 border-orange-500 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            <div class="bg-gradient-to-b from-[#3c3c3c] to-[#262626] text-white px-4 py-3 flex items-center justify-between shrink-0">
                <div>
                    <div class="text-xs sm:text-sm font-black uppercase tracking-wider text-orange-400">
                        Penyusunan Laporan Bukti CCTV (Format F4 • Maks. 2 Foto / Halaman)
                    </div>
                    <div class="text-[11px] text-slate-300">
                        ID Klaim: <span class="font-mono">${escapeHtmlCctv(klaimId)}</span>
                    </div>
                </div>
                <button type="button" onclick="tutupModalLaporanCctv()" class="text-slate-300 hover:text-red-400 font-black text-lg px-2">✕</button>
            </div>

            <div class="p-4 overflow-y-auto space-y-4 flex-1 miui-custom-scroll text-xs">
                <div class="bg-slate-50 border border-orange-200 rounded-xl p-3.5 space-y-3">
                    <div class="text-[11px] font-black text-orange-600 uppercase tracking-wide">
                        1. Identitas Laporan & Armada
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                        <div>
                            <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">No. DO / DN</label>
                            <input type="text" id="cctv-no-do" value="${escapeHtmlCctv(cctvEditorState.noDo)}" oninput="cctvEditorState.noDo = this.value.toUpperCase()" class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white uppercase">
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Tujuan / Customer</label>
                            <input type="text" id="cctv-tujuan" value="${escapeHtmlCctv(cctvEditorState.tujuan)}" oninput="cctvEditorState.tujuan = this.value.toUpperCase()" class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white uppercase">
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Ekspedisi & Nopol</label>
                            <input type="text" id="cctv-ekspedisi-nopol" value="${escapeHtmlCctv(cctvEditorState.ekspedisiNopol)}" oninput="cctvEditorState.ekspedisiNopol = this.value.toUpperCase()" placeholder="SINAR INDAH - BE 8807 AUD" class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white uppercase">
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Kode Barang</label>
                            <select id="cctv-select-kode" onchange="gantiKodeLaporanCctv(this.value)" class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white uppercase">
                                ${opsiKodeHtml}
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Total DO</label>
                            <input type="text" id="cctv-total-do" value="${escapeHtmlCctv(cctvEditorState.totalDo)}" oninput="cctvEditorState.totalDo = this.value.toUpperCase()" placeholder="Misal: 500 KARTON" class="w-full p-2 text-xs font-bold text-slate-800 border border-orange-300 rounded-lg bg-white uppercase">
                        </div>
                    </div>
                </div>

                <div class="bg-orange-50/50 border border-orange-200 rounded-xl p-3.5 space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="text-[11px] font-black text-orange-700 uppercase tracking-wide">
                            2. Foto Bukti CCTV, Zoom Beceran & Catatan (Normal: Catatan Kanan • Beceran: Zoom Kanan Bawah & Catatan Kiri)
                        </div>
                        <label class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-black text-[11px] uppercase cursor-pointer shadow transition">
                            <i class="fa-solid fa-plus mr-1"></i> Tambah Foto CCTV
                            <input type="file" id="cctv-input-foto-file" accept="image/*" multiple class="hidden" onchange="handleTambahFotoCctvModal(event)">
                        </label>
                    </div>

                    <div id="cctv-daftar-foto-container" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <!-- Kartu foto CCTV dirender dinamis -->
                    </div>
                </div>
            </div>

            <div class="bg-slate-100 px-4 py-3 border-t flex flex-wrap items-center justify-between gap-2 shrink-0">
                <button type="button" onclick="tutupModalLaporanCctv()" class="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-[11px] uppercase">
                    Tutup
                </button>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="simpanLaporanCctvKeRtdb(false)" class="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-[11px] uppercase shadow">
                        <i class="fa-solid fa-save mr-1"></i> Simpan Laporan CCTV
                    </button>
                    <button type="button" onclick="simpanLaporanCctvKeRtdb(true)" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase shadow">
                        <i class="fa-solid fa-print mr-1"></i> Cetak Laporan Klaim
                    </button>
                </div>
            </div>
        </div>
    `;

    renderDaftarFotoCctvModal();
};

window.tutupModalLaporanCctv = function() {
    const modalEl = document.getElementById('modal-laporan-cctv-klaim');
    if (modalEl) modalEl.remove();
};

window.gantiKodeLaporanCctv = function(kodeBaru) {
    const klaim = cacheRiwayatKlaim[cctvEditorState.klaimId];
    if (!klaim) return;

    const lapRoot = typeof klaim.laporan_cctv === 'object' && klaim.laporan_cctv !== null
        ? klaim.laporan_cctv
        : {};
    const existingLap = lapRoot[kodeBaru] || {};

    // Ambil ekspedisi & nopol dari simpanan pertama (atau nilai aktif saat ini jika belum tersimpan)
    let ekspedisiPertama = '';
    const keysLap = Object.keys(lapRoot);
    for (const k of keysLap) {
        if (k === kodeBaru) continue;
        const valExp = (lapRoot[k] && lapRoot[k].ekspedisi_nopol || '').trim();
        if (valExp) {
            ekspedisiPertama = valExp;
            break;
        }
    }
    if (!ekspedisiPertama) {
        for (const k of keysLap) {
            const valExp = (lapRoot[k] && lapRoot[k].ekspedisi_nopol || '').trim();
            if (valExp) {
                ekspedisiPertama = valExp;
                break;
            }
        }
    }
    if (!ekspedisiPertama && (cctvEditorState.ekspedisiNopol || '').trim()) {
        ekspedisiPertama = cctvEditorState.ekspedisiNopol.trim();
    }

    cctvEditorState.kodeAktif = kodeBaru;
    cctvEditorState.tujuan = existingLap.tujuan || klaim.tujuan || '';
    cctvEditorState.noDo = existingLap.no_do || klaim.no_dn || '';
    cctvEditorState.totalDo = existingLap.total_do || '';
    cctvEditorState.ekspedisiNopol = existingLap.ekspedisi_nopol || ekspedisiPertama || '';
    cctvEditorState.fotos = Array.isArray(existingLap.fotos)
        ? existingLap.fotos.map((f, idx) => ({
            nama: f.nama || `CCTV-${idx + 1}.jpg`,
            src: f.src,
            palet: f.palet || `PALET KE-${idx + 1}: `,
            rumus: f.rumus || '',
            catatanTambahan: f.catatanTambahan || '',
            zoomCropSrc: f.zoomCropSrc || '',
            notePos: f.notePos || (f.zoomCropSrc ? 'left-bottom' : 'right-bottom'),
            zoomPos: f.zoomPos || 'right-bottom',
            filter: f.filter && typeof f.filter === 'object'
                ? {
                    brightness: Number(f.filter.brightness) || 0,
                    contrast: Number(f.filter.contrast) || 1
                }
                : { brightness: 0, contrast: 1 }
        }))
        : [];

    const elNoDo = document.getElementById('cctv-no-do');
    const elTujuan = document.getElementById('cctv-tujuan');
    const elTotalDo = document.getElementById('cctv-total-do');
    const elEkspedisi = document.getElementById('cctv-ekspedisi-nopol');

    if (elNoDo) elNoDo.value = cctvEditorState.noDo;
    if (elTujuan) elTujuan.value = cctvEditorState.tujuan;
    if (elTotalDo) elTotalDo.value = cctvEditorState.totalDo;
    if (elEkspedisi) elEkspedisi.value = cctvEditorState.ekspedisiNopol;

    renderDaftarFotoCctvModal();
};

window.handleTambahFotoCctvModal = async function(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const useLaserjet = !!document.getElementById('klaim-chk-grayscale')?.checked;

    try {
        const startIdx = cctvEditorState.fotos.length;
        const hasil = await Promise.all(files.map((f) => prosesGambarKlaim(f, useLaserjet, 1280, 0.78)));
        hasil.forEach((item, i) => {
            cctvEditorState.fotos.push({
                nama: item.nama,
                src: item.src,
                palet: `PALET KE-${startIdx + i + 1}: `,
                rumus: '',
                catatanTambahan: '',
                zoomCropSrc: '',
                notePos: 'right-bottom',
                zoomPos: 'right-bottom'
            });
        });
        renderDaftarFotoCctvModal();
    } catch (e) {
        console.error('Gagal memproses foto CCTV:', e);
        notifyKlaim('Gagal memproses file foto CCTV.');
    } finally {
        event.target.value = '';
    }
};

window.geserUrutanFotoCctv = function(index, arah) {
    const targetIdx = index + arah;
    if (targetIdx < 0 || targetIdx >= cctvEditorState.fotos.length) return;
    const temp = cctvEditorState.fotos[index];
    cctvEditorState.fotos[index] = cctvEditorState.fotos[targetIdx];
    cctvEditorState.fotos[targetIdx] = temp;
    renderDaftarFotoCctvModal();
};

window.hapusFotoCctvModal = function(index) {
    confirmKlaim('Hapus foto CCTV ini dari laporan?', () => {
        cctvEditorState.fotos.splice(index, 1);
        renderDaftarFotoCctvModal();
    });
};

window.hapusZoomSelipanFotoCctv = function(index) {
    if (!cctvEditorState.fotos[index]) return;
    cctvEditorState.fotos[index].zoomCropSrc = '';
    if (cctvEditorState.fotos[index].notePos === 'left-bottom') {
        cctvEditorState.fotos[index].notePos = 'right-bottom';
    }
    renderDaftarFotoCctvModal();
};

window.bukaCropZoomBeceran = function(index) {
    const foto = cctvEditorState.fotos[index];
    if (!foto) return;

    cropModalState = {
        fotoIndex: index,
        imgSrc: foto.src,
        startX: 0,
        startY: 0,
        currX: 0,
        currY: 0,
        dragging: false
    };

    let cropModal = document.getElementById('modal-crop-zoom-cctv');
    if (!cropModal) {
        cropModal = document.createElement('div');
        cropModal.id = 'modal-crop-zoom-cctv';
        cropModal.className = 'fixed inset-0 bg-black/80 z-[9998] flex items-center justify-center p-4';
        document.body.appendChild(cropModal);
    }

    cropModal.innerHTML = `
        <div onclick="event.stopPropagation()" class="bg-slate-900 border border-orange-400 rounded-2xl max-w-3xl w-full p-4 space-y-3 text-white shadow-2xl">
            <div class="flex items-center justify-between">
                <div class="text-xs font-black uppercase text-orange-400">
                    Pilih Area Zoom Beceran (#${index + 1} - ${escapeHtmlCctv(foto.palet || '')})
                </div>
                <button type="button" onclick="tutupCropZoomBeceran()" class="text-slate-300 hover:text-red-400 font-black text-base px-2">✕</button>
            </div>
            <div class="text-[11px] text-slate-300">
                Tahan & tarik mouse di atas gambar untuk menyeleksi bagian beceran yang ingin diperbesar.
            </div>
            <div id="crop-stage-cctv" class="relative w-full h-72 bg-black rounded-xl overflow-hidden flex items-center justify-center select-none border border-slate-700">
                <img id="crop-img-cctv" src="${foto.src}" draggable="false" class="max-w-full max-h-full object-contain select-none pointer-events-none">
                <div id="crop-box-cctv" class="hidden absolute border-2 border-amber-400 bg-amber-400/20 pointer-events-none"></div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
                <button type="button" onclick="tutupCropZoomBeceran()" class="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold">Batal</button>
                <button type="button" onclick="simpanHasilCropZoomBeceran()" class="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-xs font-black uppercase">Terapkan Zoom Beceran</button>
            </div>
        </div>
    `;

    const stage = document.getElementById('crop-stage-cctv');
    const box = document.getElementById('crop-box-cctv');

    const getRelPos = (e) => {
        const rect = stage.getBoundingClientRect();
        return {
            x: Math.max(0, Math.min(rect.width, e.clientX - rect.left)),
            y: Math.max(0, Math.min(rect.height, e.clientY - rect.top))
        };
    };

    stage.onmousedown = (e) => {
        const pos = getRelPos(e);
        cropModalState.dragging = true;
        cropModalState.startX = pos.x;
        cropModalState.startY = pos.y;
        cropModalState.currX = pos.x;
        cropModalState.currY = pos.y;
        box.style.left = `${pos.x}px`;
        box.style.top = `${pos.y}px`;
        box.style.width = '0px';
        box.style.height = '0px';
        box.classList.remove('hidden');
    };

    stage.onmousemove = (e) => {
        if (!cropModalState.dragging) return;
        const pos = getRelPos(e);
        cropModalState.currX = pos.x;
        cropModalState.currY = pos.y;
        const left = Math.min(cropModalState.startX, cropModalState.currX);
        const top = Math.min(cropModalState.startY, cropModalState.currY);
        const w = Math.abs(cropModalState.currX - cropModalState.startX);
        const h = Math.abs(cropModalState.currY - cropModalState.startY);
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        box.style.width = `${w}px`;
        box.style.height = `${h}px`;
    };

    window.onmouseup = () => {
        cropModalState.dragging = false;
    };
};

window.tutupCropZoomBeceran = function() {
    window.onmouseup = null;
    const cropModal = document.getElementById('modal-crop-zoom-cctv');
    if (cropModal) cropModal.remove();
};

window.simpanHasilCropZoomBeceran = function() {
    const idx = cropModalState.fotoIndex;
    const foto = cctvEditorState.fotos[idx];
    const stage = document.getElementById('crop-stage-cctv');
    const imgEl = document.getElementById('crop-img-cctv');
    if (!foto || !stage || !imgEl) return;

    const left = Math.min(cropModalState.startX, cropModalState.currX);
    const top = Math.min(cropModalState.startY, cropModalState.currY);
    const w = Math.abs(cropModalState.currX - cropModalState.startX);
    const h = Math.abs(cropModalState.currY - cropModalState.startY);

    if (w < 12 || h < 12) {
        notifyKlaim('Tarik kotak area yang lebih besar pada gambar terlebih dahulu.');
        return;
    }

    const stageRect = stage.getBoundingClientRect();
    const natW = imgEl.naturalWidth || 1;
    const natH = imgEl.naturalHeight || 1;
    const stageRatio = stageRect.width / stageRect.height;
    const imgRatio = natW / natH;

    let renderW, renderH, offsetX, offsetY;
    if (imgRatio > stageRatio) {
        renderW = stageRect.width;
        renderH = stageRect.width / imgRatio;
        offsetX = 0;
        offsetY = (stageRect.height - renderH) / 2;
    } else {
        renderH = stageRect.height;
        renderW = stageRect.height * imgRatio;
        offsetX = (stageRect.width - renderW) / 2;
        offsetY = 0;
    }

    const cropLeft = Math.max(0, left - offsetX);
    const cropTop = Math.max(0, top - offsetY);
    const cropRight = Math.min(renderW, left + w - offsetX);
    const cropBottom = Math.min(renderH, top + h - offsetY);

    const finalW = cropRight - cropLeft;
    const finalH = cropBottom - cropTop;
    if (finalW <= 4 || finalH <= 4) {
        notifyKlaim('Area seleksi berada di luar gambar.');
        return;
    }

    const sx = (cropLeft / renderW) * natW;
    const sy = (cropTop / renderH) * natH;
    const sw = (finalW / renderW) * natW;
    const sh = (finalH / renderH) * natH;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(240, Math.round(sw));
    canvas.height = Math.max(180, Math.round(sh));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    foto.zoomCropSrc = canvas.toDataURL('image/jpeg', 0.85);
    if (!foto.notePos || foto.notePos === 'right-bottom') {
        foto.notePos = 'left-bottom';
    }
    if (!foto.zoomPos) {
        foto.zoomPos = 'right-bottom';
    }

    tutupCropZoomBeceran();
    renderDaftarFotoCctvModal();
};

function getFotoFilterCss(foto, forPrint = false) {
    const f = foto && typeof foto.filter === 'object' && foto.filter !== null ? foto.filter : {};
    const bright = 1 + (Number(f.brightness) || 0) / 100;
    const contrast = Number(f.contrast) || 1;
    const grayPart = forPrint ? ' grayscale(1)' : '';
    return `brightness(${bright.toFixed(2)}) contrast(${contrast.toFixed(2)})${grayPart}`;
}

window.updateFilterFotoCctv = function(index, key, val) {
    const foto = cctvEditorState.fotos[index];
    if (!foto) return;
    if (!foto.filter || typeof foto.filter !== 'object') {
        foto.filter = { brightness: 0, contrast: 1 };
    }

    if (key === 'brightness') {
        foto.filter.brightness = parseInt(val, 10) || 0;
    } else if (key === 'contrast') {
        foto.filter.contrast = parseFloat(val) || 1;
    }

    const brightVal = Number(foto.filter.brightness) || 0;
    const contrastVal = Number(foto.filter.contrast) || 1;
    const filterCss = getFotoFilterCss(foto, false);

    const imgEl = document.getElementById(`cctv-img-preview-${index}`);
    if (imgEl) imgEl.style.filter = filterCss;

    const brightLabel = document.getElementById(`cctv-val-brightness-${index}`);
    if (brightLabel) brightLabel.textContent = brightVal > 0 ? `+${brightVal}` : `${brightVal}`;

    const contrastLabel = document.getElementById(`cctv-val-contrast-${index}`);
    if (contrastLabel) contrastLabel.textContent = `${contrastVal.toFixed(2)}x`;
};

window.resetFilterFotoCctv = function(index) {
    const foto = cctvEditorState.fotos[index];
    if (!foto) return;
    foto.filter = { brightness: 0, contrast: 1 };
    renderDaftarFotoCctvModal();
};

function renderDaftarFotoCctvModal() {
    const container = document.getElementById('cctv-daftar-foto-container');
    if (!container) return;

    if (!cctvEditorState.fotos.length) {
        container.innerHTML = `
            <div class="col-span-full bg-white border border-dashed border-orange-300 rounded-xl p-6 text-center text-slate-400 italic text-xs">
                Belum ada foto CCTV ditambahkan. Klik "Tambah Foto CCTV" di kanan atas.
            </div>
        `;
        return;
    }

    container.innerHTML = cctvEditorState.fotos.map((foto, idx) => {
        const hasZoom = !!foto.zoomCropSrc;
        const notePos = foto.notePos || (hasZoom ? 'left-bottom' : 'right-bottom');
        const zoomPos = foto.zoomPos || 'right-bottom';

        const filterObj = foto.filter && typeof foto.filter === 'object'
            ? foto.filter
            : { brightness: 0, contrast: 1 };
        const brightVal = Number(filterObj.brightness) || 0;
        const contrastVal = Number(filterObj.contrast) || 1;
        const filterCss = getFotoFilterCss(foto, false);

        return `
            <div class="bg-white border border-orange-200 rounded-xl p-3 flex flex-col justify-between space-y-2.5 shadow-sm">
                <div class="relative h-44 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                    <img id="cctv-img-preview-${idx}" src="${foto.src}" alt="${escapeHtmlCctv(foto.nama)}" style="filter: ${filterCss};" class="w-full h-full object-contain transition-[filter] duration-75">
                    <span class="bg-black/75 text-white text-[10px] font-black px-2 py-0.5 rounded" style="position:absolute; top:6px; left:6px;">#${idx + 1}</span>
                    ${hasZoom ? `
                        <div class="w-24 h-20 bg-black border-2 border-amber-400 rounded overflow-hidden shadow-lg" style="position:absolute; ${getPosCss(zoomPos)}">
                            <img src="${foto.zoomCropSrc}" alt="Zoom Beceran" class="w-full h-full object-cover">
                        </div>
                    ` : ''}
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                        <label class="text-[9px] font-black text-slate-500 uppercase block">Label / Palet</label>
                        <input type="text" value="${escapeHtmlCctv(foto.palet)}" oninput="cctvEditorState.fotos[${idx}].palet = this.value.toUpperCase()" placeholder="PALET KE-1 / PALET KE-7 BECERAN:" class="w-full p-1.5 text-[11px] font-bold text-slate-800 border border-slate-300 rounded-lg uppercase">
                    </div>
                    <div>
                        <label class="text-[9px] font-black text-slate-500 uppercase block">Rumus Hitungan</label>
                        <input type="text" value="${escapeHtmlCctv(foto.rumus)}" oninput="cctvEditorState.fotos[${idx}].rumus = this.value" placeholder="(17 x 4 = 68 + 9 = 77krt)" class="w-full p-1.5 text-[11px] font-semibold text-slate-800 border border-slate-300 rounded-lg">
                    </div>
                </div>

                <div>
                    <label class="text-[9px] font-black text-slate-500 uppercase block">Catatan Tambahan / Total (Bisa Diedit Bebas)</label>
                    <input type="text" value="${escapeHtmlCctv(foto.catatanTambahan)}" oninput="cctvEditorState.fotos[${idx}].catatanTambahan = this.value" placeholder="Misal: TOTAL: ( 77 x 6 = 462 + 38 = 500 Karton )" class="w-full p-1.5 text-[11px] font-semibold text-slate-800 border border-slate-300 rounded-lg">
                </div>

                <div class="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-black text-slate-700">
                            Terang & Kontras Foto #${idx + 1} (Grayscale Saat Cetak)
                        </span>
                        <button type="button" onclick="resetFilterFotoCctv(${idx})" class="text-[9px] font-bold text-slate-500 hover:text-orange-600 underline">
                            Reset
                        </button>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <div class="flex justify-between text-[9px] font-bold text-slate-500">
                                <span>Terang</span>
                                <span id="cctv-val-brightness-${idx}">${brightVal > 0 ? '+' + brightVal : brightVal}</span>
                            </div>
                            <input type="range" min="-45" max="45" step="1" value="${brightVal}" oninput="updateFilterFotoCctv(${idx}, 'brightness', this.value)" class="w-full accent-orange-600 cursor-pointer">
                        </div>
                        <div>
                            <div class="flex justify-between text-[9px] font-bold text-slate-500">
                                <span>Kontras</span>
                                <span id="cctv-val-contrast-${idx}">${contrastVal.toFixed(2)}x</span>
                            </div>
                            <input type="range" min="0.7" max="1.6" step="0.05" value="${contrastVal}" oninput="updateFilterFotoCctv(${idx}, 'contrast', this.value)" class="w-full accent-orange-600 cursor-pointer">
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-[9px] font-black text-slate-500 uppercase block">Posisi Kotak Catatan</label>
                        <select onchange="cctvEditorState.fotos[${idx}].notePos = this.value; renderDaftarFotoCctvModal();" class="w-full p-1.5 text-[10px] font-bold text-slate-800 border border-slate-300 rounded-lg bg-white">
                            <option value="right-bottom" ${notePos === 'right-bottom' ? 'selected' : ''}>Kanan Bawah</option>
                            <option value="left-bottom" ${notePos === 'left-bottom' ? 'selected' : ''}>Kiri Bawah</option>
                            <option value="right-top" ${notePos === 'right-top' ? 'selected' : ''}>Kanan Atas</option>
                            <option value="left-top" ${notePos === 'left-top' ? 'selected' : ''}>Kiri Atas</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[9px] font-black text-slate-500 uppercase block">Posisi Selipan Zoom</label>
                        <select onchange="cctvEditorState.fotos[${idx}].zoomPos = this.value; renderDaftarFotoCctvModal();" ${!hasZoom ? 'disabled' : ''} class="w-full p-1.5 text-[10px] font-bold text-slate-800 border border-slate-300 rounded-lg bg-white disabled:opacity-40">
                            <option value="right-bottom" ${zoomPos === 'right-bottom' ? 'selected' : ''}>Kanan Bawah</option>
                            <option value="left-bottom" ${zoomPos === 'left-bottom' ? 'selected' : ''}>Kiri Bawah</option>
                            <option value="right-top" ${zoomPos === 'right-top' ? 'selected' : ''}>Kanan Atas</option>
                            <option value="left-top" ${zoomPos === 'left-top' ? 'selected' : ''}>Kiri Atas</option>
                        </select>
                    </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                    <div class="flex items-center gap-1">
                        <button type="button" onclick="bukaCropZoomBeceran(${idx})" class="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-black">
                            <i class="fa-solid fa-crop-simple mr-0.5"></i> Zoom Beceran
                        </button>
                        ${hasZoom ? `
                            <button type="button" onclick="hapusZoomSelipanFotoCctv(${idx})" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold">
                                Hapus Zoom
                            </button>
                        ` : ''}
                    </div>

                    <div class="flex items-center gap-1">
                        <button type="button" onclick="geserUrutanFotoCctv(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-[10px] font-black" title="Geser Naik">▲</button>
                        <button type="button" onclick="geserUrutanFotoCctv(${idx}, 1)" ${idx === cctvEditorState.fotos.length - 1 ? 'disabled' : ''} class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-[10px] font-black" title="Geser Turun">▼</button>
                        <button type="button" onclick="hapusFotoCctvModal(${idx})" class="px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-600 text-[10px] font-black">
                            Hapus
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.simpanLaporanCctvKeRtdb = async function(lanjutCetak = false) {
    const dbRef = getKlaimDbRef();
    if (!dbRef || !cctvEditorState.klaimId) {
        notifyKlaim('Koneksi database Firebase belum siap!');
        return;
    }

    const kodeItem = (document.getElementById('cctv-select-kode')?.value || cctvEditorState.kodeAktif || 'ITEM').trim().toUpperCase();
    const noDo = (document.getElementById('cctv-no-do')?.value || cctvEditorState.noDo || '').trim().toUpperCase();
    const tujuan = (document.getElementById('cctv-tujuan')?.value || cctvEditorState.tujuan || '').trim().toUpperCase();
    const totalDo = (document.getElementById('cctv-total-do')?.value || cctvEditorState.totalDo || '').trim().toUpperCase();
    const ekspedisiNopol = (document.getElementById('cctv-ekspedisi-nopol')?.value || cctvEditorState.ekspedisiNopol || '').trim().toUpperCase();

    if (!tujuan || !noDo) {
        notifyKlaim('No. DO / DN dan Tujuan laporan wajib diisi!');
        return;
    }

    const payloadLaporan = {
        kode_barang: kodeItem,
        no_do: noDo,
        tujuan: tujuan,
        total_do: totalDo,
        ekspedisi_nopol: ekspedisiNopol,
        fotos: cctvEditorState.fotos,
        updated_at: Date.now()
    };

    try {
        await dbRef.child(`${cctvEditorState.klaimId}/laporan_cctv/${kodeItem}`).set(payloadLaporan);

        if (cacheRiwayatKlaim[cctvEditorState.klaimId]) {
            if (!cacheRiwayatKlaim[cctvEditorState.klaimId].laporan_cctv) {
                cacheRiwayatKlaim[cctvEditorState.klaimId].laporan_cctv = {};
            }
            cacheRiwayatKlaim[cctvEditorState.klaimId].laporan_cctv[kodeItem] = payloadLaporan;
        }

        if (lanjutCetak) {
            cetakLaporanBuktiCctv(cctvEditorState.klaimId, kodeItem);
        } else {
            notifyKlaim(`Laporan bukti CCTV (${kodeItem}) berhasil disimpan!`);
        }
    } catch (e) {
        console.error('Gagal menyimpan laporan CCTV:', e);
        notifyKlaim('Gagal menyimpan laporan bukti CCTV ke database.');
    }
};

window.cetakLaporanBuktiCctv = function(klaimId, kodeDipilih = '') {
    const klaim = cacheRiwayatKlaim[klaimId];
    if (!klaim) {
        notifyKlaim('Data klaim tidak ditemukan!');
        return;
    }

    const lap = getLaporanItemObj(klaim, kodeDipilih);
    const fotos = lap && Array.isArray(lap.fotos) ? lap.fotos : [];

    if (!fotos.length) {
        confirmKlaim('Foto bukti CCTV pada klaim ini belum diisi. Buka form penyusunan laporan CCTV sekarang?', () => {
            window.bukaModalLaporanCctv(klaimId, kodeDipilih);
        });
        return;
    }

    const tujuanCetak = escapeHtmlCctv(lap.tujuan || klaim.tujuan || '');
    const noDoCetak = escapeHtmlCctv(lap.no_do || klaim.no_dn || '');
    const kodeCetak = escapeHtmlCctv(lap.kode_barang || kodeDipilih || klaim.kode_barang || '');
    const totalDoCetak = escapeHtmlCctv(lap.total_do || '');
    const ekspedisiCetak = escapeHtmlCctv(lap.ekspedisi_nopol || '');

    const baris2Info = `(${noDoCetak}) / ${kodeCetak}${totalDoCetak ? ' = ' + totalDoCetak : ''}`;

    const PER_PAGE = 2;
    const chunks = [];
    for (let i = 0; i < fotos.length; i += PER_PAGE) {
        chunks.push(fotos.slice(i, i + PER_PAGE));
    }

    const pagesHtml = chunks.map((chunk) => {
        const slotHtml = chunk.map((f, idx) => {
            const paletText = escapeHtmlCctv(f.palet || `PALET KE-${idx + 1}: `);
            const rumusText = escapeHtmlCctv(f.rumus || '');
            const tambahanText = escapeHtmlCctv(f.catatanTambahan || '');
            const hasZoom = !!f.zoomCropSrc;
            const notePos = f.notePos || (hasZoom ? 'left-bottom' : 'right-bottom');
            const zoomPos = f.zoomPos || 'right-bottom';
            const fotoFilterCetak = getFotoFilterCss(f, true);

            return `
                <div class="foto-slot">
                    <div class="foto-frame">
                        <img class="main-img" src="${f.src}" alt="${paletText}" style="filter: ${fotoFilterCetak};">

                        <div class="note-box" style="${getPosCss(notePos)}">
                            <div class="note-tujuan">${tujuanCetak}</div>
                            <div class="note-meta">${baris2Info}</div>
                            <div class="note-ekspedisi">${ekspedisiCetak}</div>
                            <div class="note-palet">${paletText}</div>
                            ${rumusText ? `<div class="note-rumus">${rumusText}</div>` : ''}
                            ${tambahanText ? `<div class="note-tambahan">${tambahanText}</div>` : ''}
                        </div>

                        ${hasZoom ? `
                            <div class="zoom-inset" style="${getPosCss(zoomPos)}">
                                <img src="${f.zoomCropSrc}" alt="Zoom Beceran" style="filter: ${fotoFilterCetak};">
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="f4-page">${slotHtml}</div>`;
    }).join('');

    const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Laporan Bukti CCTV (F4) - ${tujuanCetak} (${kodeCetak})</title>
            <style>
                @page {
                    size: 215mm 330mm;
                    margin: 8mm;
                }
                * {
                    box-sizing: border-box;
                }
                body {
                    margin: 0;
                    padding: 0;
                    background: #fff;
                    font-family: Arial, Helvetica, sans-serif;
                    color: #000;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .f4-page {
                    width: 100%;
                    min-height: 310mm;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    gap: 6mm;
                    page-break-after: always;
                    break-after: page;
                }
                .f4-page:last-child {
                    page-break-after: auto;
                    break-after: auto;
                }
                .foto-slot {
                    width: 100%;
                    flex: 1 1 0;
                    max-height: 151mm;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }
                .foto-frame {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    max-width: 100%;
                    max-height: 100%;
                    background: #000;
                }
                .foto-slot img.main-img {
                    display: block;
                    width: auto;
                    height: auto;
                    max-width: 198mm;
                    max-height: 150mm;
                    object-fit: contain;
                }
                .note-box {
                    position: absolute;
                    width: 46%;
                    max-width: 88mm;
                    background: rgba(255, 255, 255, 0.96);
                    border: 1px solid #0f172a;
                    padding: 5px 7px;
                    line-height: 1.28;
                    z-index: 2;
                }
                .note-tujuan {
                    font-size: 8pt;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                .note-meta {
                    font-size: 7.5pt;
                    font-weight: 700;
                }
                .note-ekspedisi {
                    font-size: 7.5pt;
                    font-weight: 700;
                    margin-bottom: 3px;
                }
                .note-palet {
                    font-size: 8pt;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                .note-rumus {
                    font-size: 8pt;
                    font-weight: 700;
                }
                .note-tambahan {
                    font-size: 7.5pt;
                    font-weight: 700;
                    margin-top: 2px;
                    white-space: pre-line;
                }
                .zoom-inset {
                    position: absolute;
                    width: 42mm;
                    height: 36mm;
                    border: 2px solid #ffffff;
                    box-shadow: 0 0 0 1px #0f172a;
                    background: #000;
                    overflow: hidden;
                    z-index: 2;
                }
                .zoom-inset img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    display: block;
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
                window.onafterprint = function() {
                    window.close();
                };
            </script>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
        win.document.write(printHtml);
        win.document.close();
    } else {
        notifyKlaim('Pop-up diblokir oleh browser! Izinkan pop-up untuk mencetak laporan.');
    }
};