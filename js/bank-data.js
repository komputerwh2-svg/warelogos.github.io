// ==========================================================================
// LOGIKA KHUSUS: MODUL SETELAN BANK DATA & KAMUS BARANG (v2026.05.25.0.0.3 - INTEGRATED WITH CELL)
// ==========================================================================

const BD_FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

// URL Web App Google Apps Script untuk sinkronisasi 2 arah ke Spreadsheet (Sheet KODE - 7 Kolom)
const SPREADSHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbyrop5-Mn4uSKd3P9r1XyQG3F-0G6EJnxYwncH3UKKywKgwIO3OJuPtH2wt8fFsPUCGAA/exec";

// Fungsi ganti switch mode bank data (Kode, Driver, Tujuan) dengan efek geser slider MIUI v5
function gantiSwitchModeBankData(mode) {
    const slider = document.getElementById('slider-content-bd');
    
    // Geser berdasarkan mode
    if (mode === 'KODE') {
        slider.style.transform = 'translateX(0%)';
        setTimeout(tampilkanDropdownKelompok, 100);
    } else if (mode === 'DRIVER') {
        slider.style.transform = 'translateX(-33.333%)';
    } else if (mode === 'TUJUAN') {
        slider.style.transform = 'translateX(-66.666%)';
    }

    // Update Judul di Header utama
    document.getElementById('txt-table-header-title-bd').innerText = `Database Master Register [${mode}]`;
}

// Mapping Kelompok Barang ke Cell Lokasi Warehouse (Contoh: MTR -> B60, PDR -> E60, dst.)
const mappingKelompok = {
    "MTR": "B60",
    "PDR": "E60",
    "MRMR": "G60",
    "CRR / THR": "J59",
    "MRR / CRR EA": "G59",
    "MOR / MOB": "M59",
    "MP / LTGR / MTGR": "M60",
    "MJR": "J60"
};

function isiDropdownKelompok() {
    const selectKelompok = document.getElementById("tx-kelompok-barang-bd");
    
    // Debug: Cek apakah elemen ditemukan
    if (!selectKelompok) {
        console.log("Error: Elemen #tx-kelompok-barang-bd tidak ditemukan di HTML!");
        return;
    }

    // Pastikan tidak duplikat
    selectKelompok.innerHTML = '<option value="">Pilih Kelompok</option>';

    Object.keys(mappingKelompok).forEach(item => {
        const option = document.createElement("option");
        option.value = item;
        option.textContent = item;
        selectKelompok.appendChild(option);
    });
}

// EKSEKUSI: Panggil fungsi segera saat file JS ini di-load oleh browser
isiDropdownKelompok();

function sinkronisasiCell() {
    const kelompok = document.getElementById("tx-kelompok-barang-bd").value;
    const inputCell = document.getElementById("tx-cell-barang-bd");
    
    if (kelompok && mappingKelompok[kelompok]) {
        inputCell.value = mappingKelompok[kelompok];
    } else {
        inputCell.value = "";
    }
}

// fungsi tampil dropdown kelompok dengan data dari mappingKelompok (untuk memastikan dropdown selalu terisi dengan opsi yang benar saat mode KODE aktif)
function tampilkanDropdownKelompok() {
    const selectKelompok = document.getElementById("tx-kelompok-barang-bd");
    if (!selectKelompok) return;

    // Bersihkan isi lama (agar tidak menumpuk)
    selectKelompok.innerHTML = '<option value="">Pilih Kelompok</option>';

    Object.keys(mappingKelompok).forEach(item => {
        const option = document.createElement("option");
        option.value = item;
        option.textContent = item;
        selectKelompok.appendChild(option);
    });
}



/**
 * Mengunduh Data 'master_barang' secara utuh dari Firebase Realtime DB
 * Dan merendernya dengan kolom KELOMPOK serta CELL yang sudah melebur di dalamnya.
 */
function muatDataDariFirebase() {
    const bodiTabel = document.getElementById("tabel-body-bank-data");
    const badgeTotal = document.getElementById("info-total-item-bd");

    if (!bodiTabel) return;

    fetch(`${BD_FIREBASE_URL}master_barang.json`)
        .then(res => res.json())
        .then(kumpulanData => {
            bodiTabel.innerHTML = "";

            if (!kumpulanData) {
                bodiTabel.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-10 text-gray-400 font-bold">
                            <i class="fa-solid fa-box-open mr-1"></i> Tidak ada data barang terdaftar.
                        </td>
                    </tr>
                `;
                if (badgeTotal) badgeTotal.innerHTML = `0 <span class="text-[9px] font-normal text-slate-500">ITEM</span>`;
                return;
            }

            // 1. STRUKTURISASI: Ubah objek Firebase menjadi Array dengan penambahan field KELOMPOK dan CELL
            let listBarangArr = [];
            for (const key in kumpulanData) {
                const item = kumpulanData[key];
                listBarangArr.push({
                    firebaseKey: key,
                    KODE_BARANG: item.KODE_BARANG || key,
                    INISIAL: item.INISIAL || "-",
                    KELOMPOK: item.KELOMPOK || "-", 
                    CELL: item.CELL || "-", // Integrasi komponen cell lokasi warehouse
                    NAMA_BARANG: item.NAMA_BARANG || "-",
                    QTY: item.QTY !== undefined ? item.QTY : 0,
                    Satuan: item.Satuan || "KRT",
                    IS_ACTIVE: item.IS_ACTIVE !== undefined ? item.IS_ACTIVE : true
                });
            }

            // 2. PROSES SORTING: Urutkan data berdasarkan string INISIAL secara lokal/alfanumerik alamiah
            listBarangArr.sort((itemA, itemB) => {
                return itemA.INISIAL.localeCompare(itemB.INISIAL, undefined, {
                    numeric: true,
                    sensitivity: 'base'
                });
            });

            // 3. RENDERING: Cetak data ke tabel (Total 8 kolom dengan Nomor Indeks & Aksi)
            let indeks = 1;
            let barisHtml = "";

            listBarangArr.forEach(detailItem => {
                const key           = detailItem.firebaseKey;
                const inisialBarang = detailItem.INISIAL;
                const kodeBarang    = detailItem.KODE_BARANG;
                const kelompokBarang = detailItem.KELOMPOK;
                const cellBarang    = detailItem.CELL; // Membaca field CELL
                const namaItem      = detailItem.NAMA_BARANG;
                const kuantitas     = detailItem.QTY;
                const satuanPack    = detailItem.Satuan;
                const isActive      = detailItem.IS_ACTIVE;

                barisHtml += `
                    <tr class="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                        <td class="py-3 px-2 text-center font-mono text-gray-400 font-normal">${indeks++}</td>
                        <td class="py-3 px-3 font-mono font-black text-[#e04a00] uppercase tracking-wide text-xs">${inisialBarang}</td>
                        <td class="py-3 px-3 font-mono font-bold text-[#2a67e0] tracking-wider uppercase">${kodeBarang}</td>
                        <td class="py-3 px-3 font-mono font-bold text-emerald-600 tracking-wide uppercase text-xs">
                            ${kelompokBarang} <span class="text-gray-400 font-normal mx-1">|</span> <span class="text-purple-600">${cellBarang}</span>
                        </td>
                        <td class="py-3 px-3 text-slate-800 font-bold uppercase leading-tight text-xs">${namaItem}</td>
                        <td class="py-3 px-4 text-center font-mono font-black text-slate-900 bg-slate-50/50 text-xs">
                            ${kuantitas} <span class="text-[9px] font-normal text-gray-400 ml-0.5">${satuanPack}</span>
                        </td>
                        <td class="py-3 px-3 text-center">
                            <label class="miui-switch">
                                <input type="checkbox" id="toggle-${key}" ${isActive ? 'checked' : ''} onchange="ubahStatusAktifBarangBD('${key}', this.checked)">
                                <span class="miui-slider"></span>
                            </label>
                        </td>
                        <td class="py-3 px-2 text-center">
                            <button onclick="editBarangBD('${key}', '${inisialBarang.replace(/'/g, "\\'")}', '${kelompokBarang.replace(/'/g, "\\'")}', '${cellBarang.replace(/'/g, "\\'")}', '${namaItem.replace(/'/g, "\\'")}', ${kuantitas})" class="text-[10px] font-black text-blue-600 hover:bg-blue-100 p-1.5 rounded-lg transition-all">
                                <i class="fa-solid fa-pen-to-square text-base"></i>
                            </button>
                            <button onclick="hapusBarangBD('${key}', '${namaItem.replace(/'/g, "\\'")}')" class="text-[10px] font-black text-red-600 hover:bg-red-100 p-1.5 rounded-lg transition-all">
                                <i class="fa-solid fa-trash-can text-base"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            bodiTabel.innerHTML = barisHtml;
            if (badgeTotal) badgeTotal.innerHTML = `${listBarangArr.length} <span class="text-[9px] font-normal text-slate-500">ITEM</span>`;
        })
        .catch(err => {
            console.error("Gagal sinkronisasi dengan Firebase:", err);
            bodiTabel.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-10 text-red-500 font-bold">
                        <i class="fa-solid fa-triangle-exclamation mr-1"></i> Gagal Sinkronisasi Database Web.
                    </td>
                </tr>
            `;
        });
}

/**
 * Fungsi khusus untuk menyimpan data MASTER KODE BARANG
 */
function simpanDataMasterBD() {
    const inKode     = document.getElementById("tx-kode-barang-bd");
    const inInisial  = document.getElementById("tx-inisial-barang-bd");
    const inKelompok = document.getElementById("tx-kelompok-barang-bd"); 
    const inCell     = document.getElementById("tx-cell-barang-bd");
    const inNama     = document.getElementById("tx-nama-barang-bd");
    const inQty      = document.getElementById("tx-qty-utuhan-bd");

    // Validasi elemen form
    if (!inKode || !inInisial || !inKelompok || !inCell || !inNama || !inQty) return;

    const kodeVal     = inKode.value.trim().toUpperCase();
    const inisialVal  = inInisial.value.trim().toUpperCase();
    const kelompokVal = inKelompok.value.trim().toUpperCase();
    const cellVal     = inCell.value.trim().toUpperCase();
    const namaVal     = inNama.value.trim().toUpperCase();
    const qtyVal      = inQty.value.trim() !== "" ? parseInt(inQty.value) : 0;

    // Validasi input wajib
    if (!kodeVal || !inisialVal || !kelompokVal || !cellVal || !namaVal) {
        miuiAlert("Mohon lengkapi seluruh kolom input Kode, Inisial, Kelompok, Cell, dan Nama Barang!");
        return;
    }

    const cleanKey = kodeVal.replace(/[\.\$\#\[\]\/]/g, "_");

    const payload = {
        KODE_BARANG: kodeVal,
        INISIAL: inisialVal,
        KELOMPOK: kelompokVal, 
        CELL: cellVal,
        NAMA_BARANG: namaVal,
        QTY: qtyVal,
        Satuan: "KRT",
        IS_ACTIVE: true,
        TIPE_DATA: "MASTER_KODE" // Penanda untuk mempermudah filter di Spreadsheet
    };

    const btnSubmit = document.getElementById("btn-submit-master-bd");
    const txtAsli = btnSubmit.innerText;
    btnSubmit.innerText = "MENYIMPAN...";
    btnSubmit.disabled = true;

    // 1. Kirim ke Firebase (Node: master_barang)
    fetch(`${BD_FIREBASE_URL}master_barang/${cleanKey}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error("Gagal menyimpan ke server database.");
        
        // 2. Sync ke Spreadsheet
        if (SPREADSHEET_WEBHOOK_URL) {
            return fetch(SPREADSHEET_WEBHOOK_URL, {
                method: "POST",
                mode: "no-cors", 
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        }
    })
    .then(() => {
        miuiAlert("Data master KODE berhasil disimpan!");
        resetFormMasterBD();
        // Pastikan fungsi ini memuat ulang tabel khusus mode KODE
        if (typeof muatDataDariFirebase === 'function') {
            muatDataDariFirebase();
        }
    })
    .catch(err => {
        console.error(err);
        miuiAlert("Terjadi masalah koneksi internet.");
    })
    .finally(() => {
        btnSubmit.innerText = txtAsli;
        btnSubmit.disabled = false;
    });
}

/**
 * Mengubah Status Aktif Barang secara realtime saat Slider MIUI v5 digeser
 */
function ubahStatusAktifBarangBD(nodeKey, statusCentang) {
    // 1. Update ke Firebase (agar Web App langsung sinkron)
    fetch(`${BD_FIREBASE_URL}master_barang/${nodeKey}/IS_ACTIVE.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statusCentang)
    })
    .then(res => {
        if (!res.ok) throw new Error("Gagal update Firebase");
        console.log(`Firebase updated: ${nodeKey} = ${statusCentang}`);
        
        // 2. Jika sukses, segera kirim data ke Webhook App Script (Spreadsheet)
        if (typeof SPREADSHEET_WEBHOOK_URL !== 'undefined') {
            return fetch(SPREADSHEET_WEBHOOK_URL, {
                method: "POST",
                mode: "no-cors", // Penting untuk menghindari masalah CORS dengan Apps Script
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    KODE_BARANG: nodeKey, // Mengirim Key sebagai referensi
                    IS_ACTIVE: statusCentang
                })
            });
        }
    })
    .then(() => {
        console.log("Spreadsheet berhasil disinkronisasi.");
    })
    .catch(err => {
        console.error("Sinkronisasi gagal:", err);
        // Rollback slider jika koneksi gagal
        const toggle = document.getElementById(`toggle-${nodeKey}`);
        if (toggle) toggle.checked = !statusCentang;
        alert("Gagal memperbarui status ke database utama. Cek koneksi internet.");
    });
}

/**
 * Mengisi Form dengan Data Terpilih untuk Mode Edit
 */
function editBarangBD(kd, ins, klmpk, cl, nm, qt) {
    const inKode     = document.getElementById("tx-kode-barang-bd");
    const inInisial  = document.getElementById("tx-inisial-barang-bd");
    const inKelompok = document.getElementById("tx-kelompok-barang-bd");
    const inCell     = document.getElementById("tx-cell-barang-bd"); // Rujukan input cell
    const inNama     = document.getElementById("tx-nama-barang-bd");
    const inQty      = document.getElementById("tx-qty-utuhan-bd");
    
    const lblTitle  = document.getElementById("title-mode-form-bd");
    const lblBadge  = document.getElementById("badge-mode-bd");
    const btnAksi   = document.getElementById("btn-submit-master-bd");
    const panelBox  = document.getElementById("box-workspace-input-bd");

    if (inKode && inInisial && inKelompok && inCell && inNama && inQty) {
        inKode.value = kd;
        inKode.readOnly = true;
        inInisial.value = ins;
        inKelompok.value = klmpk;
        inCell.value = cl; // Mengisi value cell saat mode edit aktif
        sinkronisasiCell();
        inNama.value = nm;
        inQty.value = qt;

        if (lblTitle) lblTitle.innerHTML = `<i class="fa-solid fa-pen-to-square text-amber-600"></i> Ubah Data Barang & Kelompok`;
        if (lblBadge) {
            lblBadge.innerText = "EDIT";
            lblBadge.className = "text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded uppercase tracking-wider";
        }
        if (btnAksi) btnAksi.innerText = "SIMPAN PERUBAHAN";
        if (panelBox) {
            panelBox.className = "w-full bg-amber-50/40 rounded-xl border border-amber-300 shadow-[0_2px_4px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-300";
        }
    }
}

/**
 * Menghapus Form Kembali ke Mode Tambah Baru (Batal)
 */
function hapusBarangBD(key, namaBarang) {
    // Menggunakan miuiConfirm sebagai pengganti confirm() native
    miuiConfirm(`Yakin ingin menghapus barang: ${namaBarang}?`, function() {
        
        // 1. Hapus dari Firebase
        fetch(`${BD_FIREBASE_URL}master_barang/${key}.json`, {
            method: "DELETE"
        })
        .then(res => {
            if (!res.ok) throw new Error("Gagal menghapus dari Firebase");

            // 2. Sync Hapus ke Spreadsheet
            if (typeof SPREADSHEET_WEBHOOK_URL !== 'undefined') {
                fetch(SPREADSHEET_WEBHOOK_URL, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        ACTION: "DELETE", 
                        NAMA_BARANG: namaBarang,
                        TIPE_DATA: "MASTER_KODE" 
                    })
                });
            }
        })
        .then(() => {
            miuiAlert("Data berhasil dihapus!");
            // Refresh tabel
            if (typeof muatDataDariFirebase === 'function') {
                muatDataDariFirebase();
            }
        })
        .catch(err => {
            console.error("Error:", err);
            miuiAlert("Gagal menghapus data.");
        });
        
    }); // Akhir dari callback function
}

/**
 * Mereset Form Kembali ke Mode Tambah Baru (Batal)
 */
function resetFormMasterBD() {
    const formBD    = document.getElementById("form-master-general-bd");
    const inKode    = document.getElementById("tx-kode-barang-bd");
    
    const lblTitle  = document.getElementById("title-mode-form-bd");
    const lblBadge  = document.getElementById("badge-mode-bd");
    const btnAksi   = document.getElementById("btn-submit-master-bd");
    const panelBox  = document.getElementById("box-workspace-input-bd");

    if (formBD) formBD.reset();
    if (inKode) inKode.readOnly = false;

    if (lblTitle) lblTitle.innerHTML = `<i class="fa-solid fa-square-plus text-orange-500 text-sm"></i> Tambah Kode Barang Baru`;
    if (lblBadge) {
        lblBadge.innerText = "BARU";
        lblBadge.className = "text-[9px] font-black text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded uppercase tracking-wider";
    }
    if (btnAksi) btnAksi.innerText = "TAMBAH KODE";
    if (panelBox) {
        panelBox.className = "w-full bg-white rounded-xl border border-gray-300 shadow-[0_2px_4px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-300";
    }
}



/**
 * Fungsi Pemuat Data Driver (Mandiri)
 */
async function muatDataDriver() {
    const tbody = document.getElementById("tabel-driver-terpisah");
    const badgeTotal = document.getElementById("info-total-driver-bd");

    if (!tbody) return;

    try {
        const response = await fetch(`${BD_FIREBASE_URL}master_driver.json`);
        const drivers = await response.json();

        tbody.innerHTML = "";
        
        if (!drivers) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-slate-400">Tidak ada data driver.</td></tr>`;
            if (badgeTotal) badgeTotal.innerHTML = `0 <span class="text-[9px] font-normal text-slate-500">DRIVER</span>`;
            return;
        }

        // 1. Ambil keys dan urutkan
        const keys = Object.keys(drivers).sort((a, b) => {
            const d1 = drivers[a];
            const d2 = drivers[b];
            
            // Prioritas 1: Urutkan berdasarkan PLAT
            const plat1 = (d1.PLAT || "").toUpperCase();
            const plat2 = (d2.PLAT || "").toUpperCase();
            
            if (plat1 !== plat2) {
                return plat1.localeCompare(plat2);
            }
            
            // Prioritas 2: Jika PLAT sama, urutkan berdasarkan NAMA DRIVER
            const name1 = (d1.DRIVER || "").toUpperCase();
            const name2 = (d2.DRIVER || "").toUpperCase();
            return name1.localeCompare(name2);
        });
        
        // 2. Iterasi menggunakan keys yang sudah terurut
        keys.forEach((key, index) => {
            const d = drivers[key];
            const platTampil = d.PLAT || '-';
            const driverTampil = d.DRIVER.replace(/'/g, "\\'");
            const platBersih = platTampil.replace(/'/g, "\\'");

            tbody.innerHTML += `
                <tr class="hover:bg-slate-50 transition-colors border-b">
                    <td class="py-3 px-3 text-center text-slate-400 font-mono text-xs">${index + 1}</td>
                    <td class="py-3 px-3 font-bold text-slate-800 uppercase text-xs">${d.DRIVER}</td>
                    <td class="py-3 px-3 font-mono text-xs text-blue-600">${platTampil}</td>
                    <td class="py-3 px-3 text-xs">${d.ISI || '0'}</td>
                    <td class="py-3 px-3 text-xs">${d.HARGA_8_1 || '0'}</td>
                    <td class="py-3 px-3 text-xs">${d.HARGA_18 || '0'}</td>
                    <td class="py-3 px-3 text-center flex justify-center gap-1">
                        <button class="text-amber-600 hover:bg-amber-100 p-1.5 rounded-lg" onclick="editDriver('${key}', '${driverTampil}', '${platBersih}', '${d.ISI}', '${d.HARGA_8_1}', '${d.HARGA_18}')">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="text-red-600 hover:bg-red-100 p-1.5 rounded-lg" onclick="hapusDriver('${key}', '${driverTampil}')">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        if (badgeTotal) {
            badgeTotal.innerHTML = `${keys.length} <span class="text-[9px] font-normal text-slate-500">DRIVER</span>`;
        }

    } catch (err) {
        console.error("Error loading driver:", err);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-red-500 font-bold"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Gagal sinkronisasi data.</td></tr>`;
    }
}

// Pastikan untuk mengekspos ke global scope
window.muatDataDriver = muatDataDriver;

/**
 * FUNGSI SIMPAN DRIVER & NOMINAL (Logika tidak diubah, hanya dirapikan)
 */
function simpanDataDriverBD() {
    const inDriver = document.getElementById("tx-driver-nama");
    const inPlat   = document.getElementById("tx-driver-plat");
    const inIsi    = document.getElementById("tx-driver-isi");
    const inH81    = document.getElementById("tx-harga-81");
    const inH18    = document.getElementById("tx-harga-18");

    // Validasi elemen
    if (!inDriver || !inPlat) return;

    const payload = {
        TIPE_DATA: "MASTER_DRIVER",
        DRIVER: inDriver.value.trim().toUpperCase(),
        PLAT: inPlat.value.trim().toUpperCase(),
        ISI: inIsi ? inIsi.value.trim() : "0",
        HARGA_8_1: inH81 ? inH81.value.trim() : "0",
        HARGA_18: inH18 ? inH18.value.trim() : "0"
    };

    if (!payload.DRIVER || !payload.PLAT) {
        miuiAlert("Data Driver & Plat wajib diisi!");
        return;
    }

    const btnSubmit = document.getElementById("btn-submit-driver-bd"); // Pastikan ID ini ada di HTML Anda
    const txtAsli = btnSubmit ? btnSubmit.innerText : "SIMPAN";
    if (btnSubmit) {
        btnSubmit.innerText = "MENYIMPAN...";
        btnSubmit.disabled = true;
    }

    const cleanKey = payload.DRIVER.replace(/[\.\$\#\[\]\/]/g, "_");

    // 1. Kirim ke Firebase
    fetch(`${BD_FIREBASE_URL}master_driver/${cleanKey}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error("Gagal menyimpan ke server database.");
        
        // 2. Sync ke Spreadsheet
        if (SPREADSHEET_DRIVER_WEBHOOK_URL) {
            return fetch(SPREADSHEET_DRIVER_WEBHOOK_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        }
    })
    .then(() => {
        miuiAlert("Data Driver berhasil disimpan!");
        // Reset form jika ada fungsi reset-nya
        if (typeof resetFormDriverBD === 'function') resetFormDriverBD();
        
        // Panggil pemuat data agar tabel ter-update otomatis
        if (typeof muatDataDriver === 'function') {
            muatDataDriver();
        }
    })
    .catch(err => {
        console.error(err);
        miuiAlert("Terjadi masalah koneksi internet saat menyimpan data.");
    })
    .finally(() => {
        if (btnSubmit) {
            btnSubmit.innerText = txtAsli;
            btnSubmit.disabled = false;
        }
    });
}

/**
 * Mode Edit Data Driver
 * Dipicu oleh tombol edit pada baris tabel
 */
function editDriver(kd, drv, plt, isi, h81, h18) {
    // 1. Referensi elemen form
    const inDriver = document.getElementById("tx-driver-nama");
    const inPlat   = document.getElementById("tx-driver-plat");
    const inIsi    = document.getElementById("tx-driver-isi");
    const inH81    = document.getElementById("tx-harga-81");
    const inH18    = document.getElementById("tx-harga-18");
    
    // 2. UI Elements
    const lblTitle = document.getElementById("title-mode-form-driver");
    const lblBadge = document.getElementById("badge-mode-driver");
    const btnAksi  = document.getElementById("btn-submit-driver-bd");
    const panelBox = document.getElementById("box-workspace-input-driver");

    if (inDriver) {
        // Isi form dengan data yang dikirim dari tombol
        inDriver.value = drv;
        inDriver.readOnly = true; // Kunci agar tidak bisa mengubah Key utama
        inPlat.value = plt;
        inIsi.value = isi;
        inH81.value = h81;
        inH18.value = h18;

        // 3. Ubah UI Mode Edit
        if (lblTitle) lblTitle.innerHTML = `<i class="fa-solid fa-pen-to-square text-amber-600"></i> Ubah Data Driver`;
        if (lblBadge) {
            lblBadge.innerText = "EDIT";
            lblBadge.className = "text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded uppercase tracking-wider";
        }
        
        // 4. Ubah fungsi tombol menjadi Update
        if (btnAksi) {
            btnAksi.innerText = "SIMPAN PERUBAHAN";
            btnAksi.onclick = function() {
                // Mengambil nilai terbaru dari form untuk di-update
                const payload = {
                    TIPE_DATA: "MASTER_DRIVER",
                    DRIVER: inDriver.value.trim().toUpperCase(),
                    PLAT: inPlat.value.trim().toUpperCase(),
                    ISI: inIsi.value.trim(),
                    HARGA_8_1: inH81.value.trim(),
                    HARGA_18: inH18.value.trim()
                };

                // Proses PUT ke Firebase menggunakan kd (Key) yang sudah dikirim
                fetch(`${BD_FIREBASE_URL}master_driver/${kd}.json`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                })
                .then(() => {
                    miuiAlert("Data Driver berhasil diperbarui!");
                    resetFormDriverBD();
                    muatDataDriver(); // Refresh tabel
                })
                .catch(err => console.error("Error updating:", err));
            };
        }

        if (panelBox) {
            panelBox.className = "w-full bg-amber-50/40 rounded-xl border border-amber-300 shadow-[0_2px_4px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-300";
        }
    }
}

//fungsi untuk menyimpan perubahan data driver ke Firebase saat mode edit aktif
function updateDriverKeFirebase(kd) {
    const payload = {
        TIPE_DATA: "MASTER_DRIVER",
        DRIVER: document.getElementById("tx-driver-nama").value.trim().toUpperCase(),
        PLAT: document.getElementById("tx-driver-plat").value.trim().toUpperCase(),
        ISI: document.getElementById("tx-driver-isi").value.trim(),
        HARGA_8_1: document.getElementById("tx-harga-81").value.trim(),
        HARGA_18: document.getElementById("tx-harga-18").value.trim()
    };

    fetch(`${BD_FIREBASE_URL}master_driver/${kd}.json`, {
        method: "PUT", // Gunakan PUT agar data terupdate sepenuhnya
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    }).then(() => {
        miuiAlert("Data Driver berhasil diperbarui!");
        resetFormDriverBD();
        muatDataDriver();
    });
}

/**
 * Menghapus Data Driver
 */
function hapusDriver(key, namaDriver) {
    // Panggil miuiConfirm dan masukkan seluruh logika ke dalam function() {}
    miuiConfirm(`Yakin ingin menghapus driver: ${namaDriver}?`, function() {
        
        console.log("Menghapus Firebase Key:", key); 

        fetch(`${BD_FIREBASE_URL}master_driver/${key}.json`, {
            method: "DELETE"
        })
        .then(res => {
            if (!res.ok) throw new Error("Gagal menghapus dari Firebase");
            return res.json();
        })
        .then(() => {
            // Sync Hapus ke Spreadsheet
            if (typeof SPREADSHEET_DRIVER_WEBHOOK_URL !== 'undefined') {
                fetch(SPREADSHEET_DRIVER_WEBHOOK_URL, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        ACTION: "DELETE", 
                        DRIVER: namaDriver 
                    })
                });
            }
            
            miuiAlert("Data berhasil dihapus!");
            muatDataDriver(); // Refresh tabel
        })
        .catch(err => {
            console.error("Error Detail:", err);
            miuiAlert("Gagal menghapus data. Periksa konsol.");
        });

    }); // <-- Akhir dari callback function
}

/**
 * Mereset Form Kembali ke Mode Tambah Driver Baru (Batal)
 */
function resetFormDriverBD() {
    // 1. Ambil elemen-elemen terkait
    const formDriver = document.getElementById("box-workspace-input-driver"); 
    // Sesuaikan ID menjadi btn-submit-driver-bd agar sinkron dengan fungsi simpan
    const btnAksi    = document.getElementById("btn-submit-driver-bd"); 
    const h3Title    = document.querySelector("#box-workspace-input-driver h3");
    const inDriver   = document.getElementById("tx-driver-nama");

    // 2. Bersihkan semua input di dalam box tersebut
    const inputs = document.querySelectorAll("#box-workspace-input-driver input");
    inputs.forEach(input => input.value = "");

    // 3. Reset ReadOnly agar nama driver bisa diisi kembali
    if (inDriver) inDriver.readOnly = false;

    // 4. Reset Teks Judul
    if (h3Title) {
        h3Title.innerHTML = `<i class="fa-solid fa-truck text-amber-500"></i> TAMBAH DATA DRIVER`;
    }

    // 5. Reset Teks Tombol & Kembalikan fungsi simpan aslinya
    if (btnAksi) {
        btnAksi.innerText = "TAMBAH DRIVER";
        btnAksi.disabled = false; // Pastikan tombol aktif
        btnAksi.onclick = function() { simpanDataDriverBD(); }; 
    }

    // 6. Reset Style
    if (formDriver) {
        formDriver.className = "w-full bg-slate-50/50 rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 p-4 mb-4";
    }
}

// Ekspos ke global scope
window.resetFormDriverBD = resetFormDriverBD;


/**
 * Fungsi Pemuat Data Nominal (Mandiri)
 */
async function muatDataNominal() {
    const tbody = document.getElementById("tabel-nominal-terpisah");
    const badgeTotal = document.getElementById("info-total-item-nominal");

    if (!tbody) return;

    try {
        const response = await fetch(`${BD_FIREBASE_URL}master_nominal.json`);
        const nominals = await response.json();

        tbody.innerHTML = "";
        
        if (!nominals) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-slate-400">Tidak ada data nominal.</td></tr>`;
            if (badgeTotal) badgeTotal.innerHTML = `0 <span class="text-[9px] font-normal text-slate-500">NOMINAL</span>`;
            return;
        }

        // 1. Ambil keys dan urutkan berdasarkan nilai nominalnya
        const sortedKeys = Object.keys(nominals).sort((a, b) => {
            const valA = parseInt(nominals[a].NOMINAL || a);
            const valB = parseInt(nominals[b].NOMINAL || b);
            return valA - valB; // Ascending (terkecil ke terbesar)
        });

        // 2. Iterasi menggunakan sortedKeys
        sortedKeys.forEach((key, index) => {
            const n = nominals[key];
            
            const nominalValue = parseInt(n.NOMINAL || key);
            const nominalTampil = nominalValue.toLocaleString(); 
            const terbilangTampil = n.TERBILANG ? n.TERBILANG.replace(/'/g, "\\'") : '';

            tbody.innerHTML += `
                <tr class="hover:bg-slate-50 transition-colors border-b">
                    <td class="py-3 px-3 text-center text-slate-400 font-mono text-xs">${index + 1}</td>
                    <td class="py-3 px-3 font-bold text-emerald-600 text-xs">${nominalTampil}</td>
                    <td class="py-3 px-3 text-slate-600 text-xs">${n.TERBILANG || '-'}</td>
                    <td class="p-3 text-center flex justify-center gap-1">
                        <button onclick="editNominal('${key}', '${n.NOMINAL}', '${terbilangTampil}')" class="text-blue-600 hover:bg-blue-100 p-1.5 rounded-lg transition-all">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="hapusNominalBD('${key}', '${nominalTampil}')" class="text-red-600 hover:bg-red-100 p-1.5 rounded-lg transition-all">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        if (badgeTotal) {
            badgeTotal.innerHTML = `${sortedKeys.length} <span class="text-[9px] font-normal text-slate-500">NOMINAL</span>`;
        }

    } catch (err) {
        console.error("Error loading nominal:", err);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-red-500 font-bold"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Gagal sinkronisasi data.</td></tr>`;
    }
}

// Ekspos ke global scope
window.muatDataNominal = muatDataNominal;

// Fungsi Simpan Nominal (Mandiri)
function simpanNominalDriverBD() {
    const inNominal = document.getElementById("tx-nominal");
    const inTerbilang = document.getElementById("tx-terbilang");

    // 1. Validasi elemen dan input
    if (!inNominal || !inTerbilang) return;

    const nominalValue = inNominal.value.trim();
    const terbilangValue = inTerbilang.value.trim();
    
    if (!nominalValue || !terbilangValue) {
        miuiAlert("Nominal dan Terbilang wajib diisi!");
        return;
    }

    // 2. State loading pada tombol
    const btnSubmit = document.getElementById("btn-submit-nominal-bd"); // Pastikan ID ini sesuai
    const txtAsli = btnSubmit ? btnSubmit.innerText : "SIMPAN";
    if (btnSubmit) {
        btnSubmit.innerText = "MENYIMPAN...";
        btnSubmit.disabled = true;
    }

    // 3. ID unik dan Payload
    const nominalId = "NOM_" + Date.now();
    const payload = {
        NOMINAL: nominalValue,
        TERBILANG: terbilangValue,
        DIBUAT: new Date().toISOString()
    };

    // 4. Simpan ke Firebase
    fetch(`${BD_FIREBASE_URL}master_nominal/${nominalId}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error("Gagal menyimpan ke server database.");
        miuiAlert("Data Nominal berhasil disimpan secara mandiri!");
        
        // 5. Panggil fungsi pemuat nominal dan reset form
        if (typeof muatDataNominal === 'function') muatDataNominal();
        if (typeof resetFormNominalBD === 'function') resetFormNominalBD();
    })
    .catch(err => {
        console.error("Gagal simpan nominal:", err);
        miuiAlert("Terjadi masalah koneksi saat menyimpan nominal.");
    })
    .finally(() => {
        if (btnSubmit) {
            btnSubmit.innerText = txtAsli;
            btnSubmit.disabled = false;
        }
    });
}

// Ekspos ke global scope
window.simpanNominalDriverBD = simpanNominalDriverBD;

/**
 * Fungsi untuk memicu mode edit pada form nominal
 */
function editNominal(key, nominal, terbilang) {
    // 1. Isi input form
    const inNominal = document.getElementById("tx-nominal");
    const inTerbilang = document.getElementById("tx-terbilang");
    
    if (inNominal) inNominal.value = nominal;
    if (inTerbilang) inTerbilang.value = terbilang;

    // 2. Ubah UI tombol ke mode UPDATE
    const btnAksi = document.getElementById("btn-submit-nominal"); // Pastikan ID ini sesuai
    if (!btnAksi) return;

    const txtAsli = btnAksi.innerText;
    btnAksi.innerText = "UPDATE NOMINAL";
    
    // Simpan referensi onclick asli agar bisa dikembalikan nanti (opsional, tapi praktik yang baik)
    const originalOnclick = btnAksi.onclick;

    btnAksi.onclick = function() {
        const payload = {
            NOMINAL: inNominal.value.trim(),
            TERBILANG: inTerbilang.value.trim()
        };

        if (!payload.NOMINAL || !payload.TERBILANG) {
            miuiAlert("Nominal dan Terbilang wajib diisi!");
            return;
        }

        // State loading
        btnAksi.innerText = "MEMPERBARUI...";
        btnAksi.disabled = true;

        fetch(`${BD_FIREBASE_URL}master_nominal/${key}.json`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (!res.ok) throw new Error("Gagal memperbarui data.");
            miuiAlert("Data Nominal berhasil diperbarui!");
            
            // Refresh data dan reset form
            if (typeof muatDataNominal === 'function') muatDataNominal();
            if (typeof resetFormNominalBD === 'function') resetFormNominalBD();
            
            // Kembalikan tombol ke kondisi semula
            btnAksi.innerText = txtAsli;
            btnAksi.onclick = originalOnclick; 
        })
        .catch(err => {
            console.error("Gagal update:", err);
            miuiAlert("Terjadi masalah saat memperbarui data.");
            btnAksi.innerText = "UPDATE NOMINAL";
        })
        .finally(() => {
            btnAksi.disabled = false;
        });
    };
}

/**
 * Menghapus Form Kembali ke Mode Tambah Nominal Baru (Batal)
 */
function hapusNominalBD(key, nominal) {
    miuiConfirm(`Yakin ingin menghapus nominal: ${nominal}?`, function() {
        
        // 1. Hapus dari Firebase
        fetch(`${BD_FIREBASE_URL}master_nominal/${key}.json`, {
            method: "DELETE"
        })
        .then(res => {
            if (!res.ok) throw new Error("Gagal menghapus dari Firebase");

            // 2. Sync Hapus ke Spreadsheet (sesuaikan URL webhook nominal Anda)
            if (typeof SPREADSHEET_NOMINAL_WEBHOOK_URL !== 'undefined') {
                fetch(SPREADSHEET_NOMINAL_WEBHOOK_URL, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        ACTION: "DELETE", 
                        NOMINAL: nominal,
                        TIPE_DATA: "MASTER_NOMINAL" 
                    })
                });
            }
        })
        .then(() => {
            miuiAlert("Data nominal berhasil dihapus!");
            // Refresh tabel (pastikan nama fungsi refresh Anda benar)
            if (typeof muatDataNominal === 'function') {
                muatDataNominal();
            }
        })
        .catch(err => {
            console.error("Error:", err);
            miuiAlert("Gagal menghapus data nominal.");
        });
        
    });
}

/**
 * Mereset Form Kembali ke Mode Tambah Nominal Baru (Batal)
 */
function resetFormNominalBD() {
    // 1. Target container box
    const boxNominal = document.getElementById("box-workspace-input-nominal");
    
    // 2. Bersihkan semua input di dalam box tersebut
    const inputs = boxNominal.querySelectorAll("input");
    inputs.forEach(input => input.value = "");

    // 3. Reset Teks Tombol (Kembalikan ke 'TAMBAH NOMINAL')
    const btnAksi = document.getElementById("btn-submit-nominal");
    if (btnAksi) {
        btnAksi.innerText = "TAMBAH NOMINAL";
        btnAksi.onclick = function() { simpanNominalDriverBD(); }; 
    }

    // 4. (Opsional) Jika Anda ingin mengembalikan judul ke semula
    const h3Title = boxNominal.querySelector("h3");
    if (h3Title) {
        h3Title.innerHTML = `<i class="fa-solid fa-money-bill text-amber-600"></i> SETELAN NOMINAL & TERBILANG`;
    }
}


/**
 * Fungsi Pemuat Data Tujuan yang stabil
 */
async function muatDataTujuanDariFirebase() {
    const tbody = document.getElementById("tabel-tujuan-bd");
    const badge = document.getElementById("info-total-tujuan-bd");
    if (!tbody) return;

    try {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-14 text-slate-400 font-bold"><i class="fa-solid fa-spinner fa-spin mr-1.5 text-orange-500"></i> Memuat tujuan...</td></tr>`;

        const response = await fetch(`${BD_FIREBASE_URL}master_tujuan.json`);
        const data = await response.json();
        
        tbody.innerHTML = ""; 
        
        if (!data) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-slate-400 font-bold">Belum ada tujuan terdaftar.</td></tr>`;
            if (badge) badge.innerText = "0";
            return;
        }

        let count = 0;
        Object.keys(data).forEach((key, index) => {
            const item = data[key];
            count++;
            
            // Definisikan namaTujuan agar bisa dipakai di onclick
            const namaTujuan = (item.TUJUAN || key).replace(/'/g, "\\'");

            tbody.innerHTML += `
                <tr class="hover:bg-slate-50 transition-colors border-b">
                    <td class="py-3 px-3 text-center text-slate-400 font-mono text-xs">${index + 1}</td>
                    <td class="py-3 px-3 text-slate-800 font-bold text-xs uppercase">${item.TUJUAN || key}</td>
                    <td class="py-3 px-3 text-slate-600 text-xs">${item.KOTA || '-'}</td>
                    <td class="py-3 px-3 text-center flex justify-center gap-1">
                        <button class="text-blue-600 hover:bg-blue-100 p-1.5 rounded-lg transition-all" onclick="editTujuan('${key}')">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="text-red-600 hover:bg-red-100 p-1.5 rounded-lg transition-all" onclick="hapusTujuanBD('${key}', '${namaTujuan}')">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        if (badge) badge.innerHTML = `${count} <span class="text-[9px] font-normal text-slate-500 ml-0.5">TUJUAN</span>`;
        
    } catch (err) {
        console.error("Error loading tujuan:", err);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-red-500 font-bold">Gagal memuat data.</td></tr>`;
    }
}


/**
 * Fungsi Simpan Tujuan (Firebase + Spreadsheet)
 */
function simpanDataTujuanBD() {
    const inTujuan = document.getElementById("tx-tujuan-nama");
    const inKota   = document.getElementById("tx-tujuan-kota");

    if (!inTujuan || !inKota) return;

    const payload = {
        TIPE_DATA: "MASTER_TUJUAN",
        TUJUAN: inTujuan.value.trim().toUpperCase(),
        KOTA: inKota.value.trim().toUpperCase()
    };

    if (!payload.TUJUAN || !payload.KOTA) {
        miuiAlert("Tujuan dan Kota wajib diisi!");
        return;
    }

    // 1. State loading pada tombol
    const btnSubmit = document.getElementById("btn-submit-tujuan-bd"); // Pastikan ID ini ada
    const txtAsli = btnSubmit ? btnSubmit.innerText : "SIMPAN";
    if (btnSubmit) {
        btnSubmit.innerText = "MENYIMPAN...";
        btnSubmit.disabled = true;
    }

    const cleanKey = payload.TUJUAN.replace(/[\.\$\#\[\]\/]/g, "_");

    // 2. Simpan ke Firebase
    fetch(`${BD_FIREBASE_URL}master_tujuan/${cleanKey}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error("Gagal menyimpan ke server database.");
        
        // 3. Kirim ke Webhook Spreadsheet
        if (SPREADSHEET_WEBHOOK_URL) {
            return fetch(SPREADSHEET_WEBHOOK_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        }
    })
    .then(() => {
        miuiAlert("Data Tujuan berhasil disimpan!");
        inTujuan.value = "";
        inKota.value = "";
        
        // 4. Panggil pemuat data jika tersedia
        if (typeof muatDataTujuanDariFirebase === 'function') {
            muatDataTujuanDariFirebase();
        }
    })
    .catch(err => {
        console.error("Gagal simpan tujuan:", err);
        miuiAlert("Terjadi masalah koneksi saat menyimpan tujuan.");
    })
    .finally(() => {
        if (btnSubmit) {
            btnSubmit.innerText = txtAsli;
            btnSubmit.disabled = false;
        }
    });
}

// Ekspos ke global scope
window.simpanDataTujuanBD = simpanDataTujuanBD;

/**
 * Mode Edit Data Tujuan
 * @param {string} key - ID unik di Firebase
 * @param {string} tujuan - Nama tujuan
 * @param {string} kota - Nama kota
 */
function editTujuanBD(key, tujuan, kota) {
    // 1. Isi input form
    const inTujuan = document.getElementById("tx-tujuan-nama");
    const inKota   = document.getElementById("tx-tujuan-kota");
    
    if (inTujuan) inTujuan.value = tujuan;
    if (inKota) inKota.value = kota;

    // 2. Ubah UI tombol ke mode UPDATE
    const btnAksi = document.getElementById("btn-submit-tujuan-bd"); // Sesuaikan ID
    if (!btnAksi) return;

    const txtAsli = btnAksi.innerText;
    btnAksi.innerText = "UPDATE TUJUAN";
    
    // Simpan referensi onclick asli
    const originalOnclick = btnAksi.onclick;

    btnAksi.onclick = function() {
        const payload = {
            TUJUAN: inTujuan.value.trim().toUpperCase(),
            KOTA: inKota.value.trim().toUpperCase()
        };

        if (!payload.TUJUAN || !payload.KOTA) {
            miuiAlert("Tujuan dan Kota wajib diisi!");
            return;
        }

        // State loading
        btnAksi.innerText = "MEMPERBARUI...";
        btnAksi.disabled = true;

        fetch(`${BD_FIREBASE_URL}master_tujuan/${key}.json`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (!res.ok) throw new Error("Gagal memperbarui data.");
            miuiAlert("Data Tujuan berhasil diperbarui!");
            
            // Refresh data
            if (typeof muatDataTujuanDariFirebase === 'function') muatDataTujuanDariFirebase();
            
            // Reset form dan kembalikan tombol
            inTujuan.value = "";
            inKota.value = "";
            btnAksi.innerText = txtAsli;
            btnAksi.onclick = originalOnclick;
        })
        .catch(err => {
            console.error("Gagal update:", err);
            miuiAlert("Terjadi masalah saat memperbarui data.");
            btnAksi.innerText = "UPDATE TUJUAN";
        })
        .finally(() => {
            btnAksi.disabled = false;
        });
    };
}

// Ekspos ke global scope
window.editTujuanBD = editTujuanBD;

/**
 * Menghapus Form Kembali ke Mode Tambah Tujuan Baru (Batal)
 */
function hapusTujuanBD(key, namaTujuan) {
    miuiConfirm(`Yakin ingin menghapus tujuan: ${namaTujuan}?`, function() {
        
        fetch(`${BD_FIREBASE_URL}master_tujuan/${key}.json`, {
            method: "DELETE"
        })
        .then(res => {
            if (!res.ok) throw new Error("Gagal menghapus dari Firebase");

            if (typeof SPREADSHEET_TUJUAN_WEBHOOK_URL !== 'undefined') {
                fetch(SPREADSHEET_TUJUAN_WEBHOOK_URL, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        ACTION: "DELETE", 
                        TUJUAN: namaTujuan,
                        TIPE_DATA: "MASTER_TUJUAN" 
                    })
                });
            }
        })
        .then(() => {
            miuiAlert("Data tujuan berhasil dihapus!");
            // Panggil nama fungsi yang benar di sini
            muatDataTujuanDariFirebase(); 
        })
        .catch(err => {
            console.error("Error:", err);
            miuiAlert("Gagal menghapus data tujuan.");
        });
        
    });
}

/**
 * Mereset Form Kembali ke Mode Tambah Tujuan Baru (Batal)
 */
function resetFormTujuanBD() {
    // 1. Target container box
    const boxTujuan = document.getElementById("box-workspace-input-tujuan");
    
    // 2. Bersihkan semua input di dalam box tersebut
    const inputs = boxTujuan.querySelectorAll("input");
    inputs.forEach(input => input.value = "");

    // 3. Reset Teks Tombol (Kembalikan ke 'TAMBAH TUJUAN')
    const btnAksi = document.getElementById("btn-submit-tujuan");
    if (btnAksi) {
        btnAksi.innerText = "TAMBAH TUJUAN";
        btnAksi.onclick = function() { simpanDataTujuanBD(); }; 
    }

    // 4. Reset Judul H3
    const h3Title = boxTujuan.querySelector("h3");
    if (h3Title) {
        h3Title.innerHTML = `<i class="fa-solid fa-location-dot text-amber-500"></i> TAMBAH DATA TUJUAN`;
    }
}

// =========================================================================
// SYSTEM COMPONENT: CUSTOM NOTIF miuiAlert ENGINE (MIUI V5 SPEC)
// =========================================================================
function miuiAlert(pesan) {
    const box = document.getElementById('miui-global-miuiAlert');
    const teks = document.getElementById('miui-miuiAlert-message');
    const contOk = document.getElementById('miui-container-ok');
    const contConfirm = document.getElementById('miui-container-confirm');

    teks.innerText = pesan;
    contOk.classList.remove('hidden');    // Tampilkan OK
    contConfirm.classList.add('hidden'); // Sembunyikan Ya/Batal
    box.classList.remove('hidden');
}

function tutupmiuiAlert() {
    document.getElementById('miui-global-miuiAlert').classList.add('hidden');
}

// =========================================================================
// SYSTEM COMPONENT: CUSTOM CONFIRM ENGINE (MIUI V5 SPEC)
// =========================================================================
function miuiConfirm(pesan, onConfirm) {
    const box = document.getElementById('miui-global-miuiAlert');
    const teks = document.getElementById('miui-miuiAlert-message');
    const contOk = document.getElementById('miui-container-ok');
    const contConfirm = document.getElementById('miui-container-confirm');
    const btnYa = document.getElementById('miui-btn-ya');
    const btnTidak = document.getElementById('miui-btn-tidak');

    teks.innerText = pesan;
    contOk.classList.add('hidden');       // Sembunyikan OK
    contConfirm.classList.remove('hidden'); // Tampilkan Ya/Batal
    box.classList.remove('hidden');

    btnYa.onclick = function() {
        box.classList.add('hidden');
        if (onConfirm) onConfirm();
    };

    btnTidak.onclick = function() {
        box.classList.add('hidden');
    };
}


// EKSPOS KE SCOPE GLOBAL WINDOW
window.muatDataDariFirebase = muatDataDariFirebase;
window.simpanDataMasterBD = simpanDataMasterBD;
window.ubahStatusAktifBarangBD = ubahStatusAktifBarangBD;
window.editBarangBD = editBarangBD;
window.resetFormMasterBD = resetFormMasterBD;
window.gantiSwitchModeBankData = gantiSwitchModeBankData;
window.simpanDataTujuanBD = simpanDataTujuanBD;
window.muatDataTujuanDariFirebase = muatDataTujuanDariFirebase;
window.muatDataDriver = muatDataDriver;
window.muatDataNominal = muatDataNominal;
window.miuiAlert = miuiAlert;
window.tutupmiuiAlert = tutupmiuiAlert;
window.miuiConfirm = miuiConfirm;