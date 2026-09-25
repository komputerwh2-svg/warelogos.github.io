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

// 2. Fungsi Memuat Master Barang dengan Datalist & Autofill Nama
async function muatMasterBarangTrobel() {
    try {
        if (window.rtdb) {
            const snapshot = await window.rtdb.ref('master_barang').once('value');
            const data = snapshot.val();
            const datalist = document.getElementById('listMasterKodeBarang');
            if (!datalist) return;
            
            datalist.innerHTML = '';
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

// Render Tabel Riwayat Trobel dari Firebase
function renderRiwayatTriggerTrobel() { // atau renderRiwayatTrobel
    // nama fungsi tetap sesuaikan dengan pemanggilan Anda
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

    // Ambil data dari node 'do_trobel' di Firebase
    window.rtdb.ref('do_trobel').on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (!data) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="p-3 text-center text-slate-400 italic">Belum ada catatan DO trobel tersimpan.</td>
                </tr>
            `;
            return;
        }

        let html = '';
        let no = 1;

        // Ubah objek data menjadi array agar bisa di-sort dari yang terbaru ke terlama
        const itemsArray = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));

        // Urutkan berdasarkan timestamp (terbaru di atas)
        itemsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        let lastTimestamp = null;
        let lastNoDn = '';

        itemsArray.forEach(item => {
            // Format tanggal agar lebih mudah dibaca (DD/MM/YYYY)
            const tglDoFormatted = item.tgl_do ? item.tgl_do.split('-').reverse().join('/') : '-';
            const tglProsesFormatted = item.tgl_proses ? item.tgl_proses.split('-').reverse().join('/') : '-';

            // Kelompokkan berdasarkan kesamaan timestamp (satu kali proses simpan multi-item) atau No. DN
            const isSameGroup = (item.timestamp && item.timestamp === lastTimestamp) || (item.no_dn && item.no_dn === lastNoDn);
            
            // Jika baris baru (bukan satu grup), naikkan nomor urut
            const nomorTampil = isSameGroup ? '' : no++;

            lastTimestamp = item.timestamp;
            lastNoDn = item.no_dn;

            html += `
                <tr class="hover:bg-orange-50/50 transition border-b">
                    <td class="p-2 border text-center font-bold text-slate-600">${nomorTampil}</td>
                    <td class="p-2 border text-center font-semibold text-slate-800">${isSameGroup ? '' : tglDoFormatted}</td>
                    <td class="p-2 border font-bold text-slate-800">${isSameGroup ? '' : (item.tujuan || '-')}</td>
                    <td class="p-2 border font-bold text-orange-600">${isSameGroup ? '' : (item.no_dn || '-')}</td>
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
    });
}


// Fungsi Placeholder Simpan Data Klaim
window.simpanDataKlaim = function() {
    const tglDo = document.getElementById('klaim-tgl-do').value;
    const noDo = document.getElementById('klaim-no-do').value.trim();
    const tujuan = document.getElementById('klaim-tujuan').value.trim();
    const kode = document.getElementById('klaim-kode').value.trim().toUpperCase();
    const qty = document.getElementById('klaim-qty').value;
    const keterangan = document.getElementById('klaim-keterangan').value.trim();

    if (!noDo || !tujuan || !kode || !qty) {
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert("Mohon lengkapi data klaim dengan benar!");
        } else {
            alert("Mohon lengkapi data klaim dengan benar!");
        }
        return;
    }

    console.log("Menyimpan Data Klaim:", { tglDo, noDo, tujuan, kode, qty, keterangan });
    
    if (typeof window.miuiAlert === 'function') {
        window.miuiAlert("Data Klaim berhasil disimpan!");
    } else {
        alert("Data Klaim berhasil disimpan!");
    }

    // Reset Form Klaim
    document.getElementById('klaim-no-do').value = '';
    document.getElementById('klaim-tujuan').value = '';
    document.getElementById('klaim-kode').value = '';
    document.getElementById('klaim-qty').value = '';
    document.getElementById('klaim-keterangan').value = '';
    
    const containerFoto = document.getElementById('container-slider-foto');
    if (containerFoto) {
        containerFoto.innerHTML = `<span class="text-xs text-slate-400 font-medium">Belum ada foto diunggah</span>`;
    }

    renderRiwayatKlaim();
};

// Handler unggah foto bukti klaim
window.handleTambahFotoKlaim = function(event) {
    const files = event.target.files;
    const containerFoto = document.getElementById('container-slider-foto');
    if (!containerFoto || files.length === 0) return;

    containerFoto.innerHTML = ''; // Bersihkan placeholder
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'w-full h-full object-cover rounded-xl shadow-inner';
            containerFoto.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
};

// Render Tabel Riwayat Klaim (Placeholder)
function renderRiwayatKlaim() {
    const tbody = document.getElementById('tabel-riwayat-klaim-body');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="p-3 text-center text-slate-400 italic">Belum ada catatan klaim tersimpan.</td>
        </tr>
    `;
}