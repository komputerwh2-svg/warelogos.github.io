// ==========================================================================
// LOGIKA KHUSUS: MODUL SETELAN BANK DATA & KAMUS BARANG (v2026.05.25.0.0.3 - INTEGRATED WITH CELL)
// ==========================================================================

const BD_FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

// URL Web App Google Apps Script untuk sinkronisasi 2 arah ke Spreadsheet (Sheet KODE - 7 Kolom)
const SPREADSHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbw7t9pv3LXVP1GSGCua98RNIpvCWWeWcp5V_GFAX93tkyu9E1XhtwnUVDm2lf09SihwWA/exec";

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
        alert("Mohon lengkapi seluruh kolom input Kode, Inisial, Kelompok, Cell, dan Nama Barang!");
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
        alert("Data master KODE berhasil disimpan!");
        resetFormMasterBD();
        // Pastikan fungsi ini memuat ulang tabel khusus mode KODE
        if (typeof muatDataDariFirebase === 'function') {
            muatDataDariFirebase();
        }
    })
    .catch(err => {
        console.error(err);
        alert("Terjadi masalah koneksi internet.");
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
    fetch(`${BD_FIREBASE_URL}master_barang/${nodeKey}/IS_ACTIVE.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statusCentang)
    })
    .then(res => {
        if (!res.ok) throw new Error("Gagal memperbarui status aktif.");
        console.log(`Status item ${nodeKey} berhasil diubah menjadi: ${statusCentang}`);
    })
    .catch(err => {
        console.error(err);
        alert("Gagal merubah status item. Hubungkan kembali koneksi internet!");
        document.getElementById(`toggle-${nodeKey}`).checked = !statusCentang;
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

function gantiSwitchModeBankData(mode) {
    const slider = document.getElementById('slider-content-bd');
    
    // Geser berdasarkan mode
    if (mode === 'KODE') {
        slider.style.transform = 'translateX(0%)';
    } else if (mode === 'DRIVER') {
        slider.style.transform = 'translateX(-33.333%)';
    } else if (mode === 'TUJUAN') {
        slider.style.transform = 'translateX(-66.666%)';
    }

    // Update Judul di Header utama
    document.getElementById('txt-table-header-title-bd').innerText = `Database Master Register [${mode}]`;
}

/**
 * Fungsi Simpan Driver (Firebase + Spreadsheet)
 */
function simpanDataDriverBD() {
    const payload = {
        TIPE_DATA: "MASTER_DRIVER", // Identifikasi untuk Webhook
        DRIVER: document.getElementById("tx-driver-nama").value.trim().toUpperCase(),
        PLAT: document.getElementById("tx-driver-plat").value.trim().toUpperCase(),
        ISI: document.getElementById("tx-driver-isi").value.trim(),
        HARGA_8_1: document.getElementById("tx-harga-81").value.trim(),
        HARGA_18: document.getElementById("tx-harga-18").value.trim()
    };

    if (!payload.DRIVER || !payload.PLAT) return alert("Data Driver & Plat wajib diisi!");

    // 1. Simpan ke Firebase (Node master_driver)
    fetch(`${BD_FIREBASE_URL}master_driver/${payload.DRIVER}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    }).then(() => {
        // 2. Kirim ke Webhook Spreadsheet
        fetch(SPREADSHEET_DRIVER_WEBHOOK_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }).then(() => {
            alert("Data Driver berhasil disimpan!");
            muatDataDriverDariFirebase(); 
        });
    });
}

/**
 * Fungsi Simpan Nominal (Firebase + Spreadsheet)
 */
function simpanNominalDriverBD() {
    // Ambil nama driver sebagai referensi baris (PENTING untuk sinkronisasi)
    const refDriver = document.getElementById("tx-driver-nama").value.trim().toUpperCase();
    
    const payload = {
        TIPE_DATA: "MASTER_NOMINAL", // Identifikasi untuk Webhook
        NAMA_DRIVER_REF: refDriver,
        NOMINAL: document.getElementById("tx-nominal").value.trim(),
        TERBILANG: document.getElementById("tx-terbilang").value.trim()
    };

    if (!refDriver) return alert("Silakan isi nama driver sebagai referensi!");

    // 1. Simpan ke Firebase (Node master_nominal)
    fetch(`${BD_FIREBASE_URL}master_nominal/${refDriver}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    }).then(() => {
        // 2. Kirim ke Webhook Spreadsheet
        fetch(SPREADSHEET_DRIVER_WEBHOOK_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }).then(() => alert("Data Nominal tersimpan!"));
    });
}

/**
 * Fungsi Muat Data Driver & Nominal (Menggabungkan tampilan)
 */
async function muatDataDriverDariFirebase() {
    // Ambil data driver dan nominal secara bersamaan
    const [driverRes, nominalRes] = await Promise.all([
        fetch(`${BD_FIREBASE_URL}master_driver.json`),
        fetch(`${BD_FIREBASE_URL}master_nominal.json`)
    ]);

    const drivers = await driverRes.json();
    const nominals = await nominalRes.json();

    const tbody = document.getElementById("tabel-driver-bd");
    tbody.innerHTML = "";

    if (!drivers) return;

    Object.keys(drivers).forEach(key => {
        const d = drivers[key];
        const n = nominals ? (nominals[key] || {}) : {}; // Cari nominal berdasarkan key driver yang sama

        const row = `
            <tr>
                <td>${d.DRIVER}</td>
                <td>${d.PLAT}</td>
                <td>${d.ISI}</td>
                <td>${d.HARGA_8_1}</td>
                <td>${d.HARGA_18}</td>
                <td class="font-bold text-blue-600">${n.NOMINAL || '-'}</td>
                <td>
                    <button class="bg-yellow-500 text-white px-2 py-1 rounded" onclick="editDriver('${key}')">EDIT</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

/**
 * Fungsi untuk mengambil data Master Driver dan Nominal
 */
async function loadDriverData() {
    try {
        // Mengambil data dari Firebase
        const driverResponse = await fetch(`${FIREBASE_DB_URL}master_driver.json`);
        const nominalResponse = await fetch(`${FIREBASE_DB_URL}master_nominal.json`);

        const drivers = await driverResponse.json();
        const nominals = await nominalResponse.json();

        renderDriverTable(drivers, nominals);
    } catch (error) {
        console.error("Gagal mengambil data driver:", error);
    }
}

function renderDriverTable(drivers, nominals) {
    const tableBody = document.getElementById('table-body-driver'); // ID elemen tbody Anda
    tableBody.innerHTML = ""; // Bersihkan tabel sebelum diisi

    if (!drivers) return;

    Object.keys(drivers).forEach((key, index) => {
        const driver = drivers[key];
        // Mencari data nominal yang cocok, misalnya berdasarkan urutan atau logika lain
        // Karena nominalKey di Firebase adalah "NOM_1", "NOM_2", dst sesuai baris
        const nominalData = nominals ? nominals[`NOM_${index + 1}`] : null;

        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${driver.DRIVER}</td>
                <td>${driver.PLAT}</td>
                <td>${driver.ISI}</td>
                <td>${driver.HARGA_8_1}</td>
                <td>${driver.HARGA_18}</td>
                <td>${nominalData ? nominalData.NOMINAL : '-'}</td>
                <td>${nominalData ? nominalData.TERBILANG : '-'}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}


/**
 * Fungsi Pemuat Data Tujuan
 */
async function muatDataTujuanDariFirebase() {
    const response = await fetch(`${BD_FIREBASE_URL}master_tujuan.json`);
    const data = await response.json();
    const tbody = document.getElementById("tabel-tujuan-bd");
    
    tbody.innerHTML = ""; // Bersihkan tabel
    
    if (!data) return;

    Object.keys(data).forEach(key => {
        const item = data[key];
        const row = `
            <tr class="border-b">
                <td class="p-2">${item.TUJUAN}</td>
                <td class="p-2">${item.KOTA}</td>
                <td class="p-2">
                    <button class="bg-yellow-500 text-white px-2 py-1 rounded" onclick="editTujuan('${key}')">EDIT</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// EKSPOS KE SCOPE GLOBAL WINDOW
window.muatDataDariFirebase = muatDataDariFirebase;
window.simpanDataMasterBD = simpanDataMasterBD;
window.ubahStatusAktifBarangBD = ubahStatusAktifBarangBD;
window.editBarangBD = editBarangBD;
window.resetFormMasterBD = resetFormMasterBD;
window.gantiSwitchModeBankData = gantiSwitchModeBankData;