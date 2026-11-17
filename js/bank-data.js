// ==========================================================================
// LOGIKA KHUSUS: MODUL SETELAN BANK DATA & KAMUS BARANG (FIREBASE PURE v2026.11)
// ==========================================================================

const BD_FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

// Fungsi ganti switch mode bank data (Kode, Driver, Tujuan) dengan efek geser slider MIUI v5
function gantiSwitchModeBankData(mode) {
    const slider = document.getElementById('slider-content-bd');
    
    if (mode === 'KODE') {
        slider.style.transform = 'translateX(0%)';
        setTimeout(tampilkanDropdownKelompok, 100);
    } else if (mode === 'DRIVER') {
        slider.style.transform = 'translateX(-33.333%)';
    } else if (mode === 'TUJUAN') {
        slider.style.transform = 'translateX(-66.666%)';
    }

    document.getElementById('txt-table-header-title-bd').innerText = `Database Master Register [${mode}]`;
}

// Mapping Kelompok Barang ke Cell Lokasi Warehouse
const mappingKelompok = {
    "MTR": "B60",
    "PDR": "E60",
    "MRMR": "G60",
    "CRR / THR": "J59",
    "MRR / CRR EA": "G59",
    "MOR / MOB": "M59",
    "MP / LTGR / MTGR": "M60",
    "MJR": "J60",
    "DIY": "D60"
};

function isiDropdownKelompok() {
    const selectKelompok = document.getElementById("tx-kelompok-barang-bd");
    if (!selectKelompok) return;

    selectKelompok.innerHTML = '<option value="">Pilih Kelompok</option>';
    Object.keys(mappingKelompok).forEach(item => {
        const option = document.createElement("option");
        option.value = item;
        option.textContent = item;
        selectKelompok.appendChild(option);
    });
}

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

function tampilkanDropdownKelompok() {
    const selectKelompok = document.getElementById("tx-kelompok-barang-bd");
    if (!selectKelompok) return;

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

            let listBarangArr = [];
            for (const key in kumpulanData) {
                const item = kumpulanData[key];
                listBarangArr.push({
                    firebaseKey: key,
                    KODE_BARANG: item.KODE_BARANG || key,
                    INISIAL: item.INISIAL || "-",
                    KELOMPOK: item.KELOMPOK || "-", 
                    CELL: item.CELL || "-",
                    NAMA_BARANG: item.NAMA_BARANG || "-",
                    QTY: item.QTY !== undefined ? item.QTY : 0,
                    Satuan: item.Satuan || "KRT",
                    IS_ACTIVE: item.IS_ACTIVE !== undefined ? item.IS_ACTIVE : true
                });
            }

            listBarangArr.sort((itemA, itemB) => {
                return itemA.INISIAL.localeCompare(itemB.INISIAL, undefined, {
                    numeric: true,
                    sensitivity: 'base'
                });
            });

            let indeks = 1;
            let barisHtml = "";

            listBarangArr.forEach(detailItem => {
                const key           = detailItem.firebaseKey;
                const inisialBarang = detailItem.INISIAL;
                const kodeBarang    = detailItem.KODE_BARANG;
                const kelompokBarang = detailItem.KELOMPOK;
                const cellBarang    = detailItem.CELL;
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
                            <button class="btn-edit-item text-[10px] font-black text-blue-600 hover:bg-blue-100 p-1.5 rounded-lg transition-all"
                                data-key="${key}"
                                data-inisial="${inisialBarang}"
                                data-kode="${kodeBarang}"
                                data-kelompok="${kelompokBarang}"
                                data-cell="${cellBarang}"
                                data-nama="${namaItem.replace(/"/g, '"')}"
                                data-qty="${kuantitas}">
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

// Tangani klik tombol edit menggunakan dataset (Aman dari error karakter khusus / kutip)
document.addEventListener('click', function(e) {
    const btnEdit = e.target.closest('.btn-edit-item');
    if (btnEdit) {
        editBarangBD(
            btnEdit.dataset.key,
            btnEdit.dataset.inisial,
            btnEdit.dataset.kelompok,
            btnEdit.dataset.cell,
            btnEdit.dataset.nama,
            parseInt(btnEdit.dataset.qty || 0)
        );
    }
});

/**
 * Simpan atau Perbarui Data Master Kode Barang ke Firebase (Smart Mode: BARU / EDIT)
 */
function simpanDataMasterBD() {
    const inKode     = document.getElementById("tx-kode-barang-bd");
    const inInisial  = document.getElementById("tx-inisial-barang-bd");
    const inKelompok = document.getElementById("tx-kelompok-barang-bd"); 
    const inCell     = document.getElementById("tx-cell-barang-bd");
    const inNama     = document.getElementById("tx-nama-barang-bd");
    const inQty      = document.getElementById("tx-qty-utuhan-bd");
    const lblBadge   = document.getElementById("badge-mode-bd");

    if (!inKode || !inInisial || !inKelompok || !inCell || !inNama || !inQty) return;

    const kodeVal     = inKode.value.trim().toUpperCase();
    const inisialVal  = inInisial.value.trim().toUpperCase();
    const kelompokVal = inKelompok.value.trim().toUpperCase();
    const cellVal     = inCell.value.trim().toUpperCase();
    const namaVal     = inNama.value.trim().toUpperCase();
    const qtyVal      = inQty.value.trim() !== "" ? parseInt(inQty.value) : 0;

    if (!kodeVal || !inisialVal || !kelompokVal || !cellVal || !namaVal) {
        miuiAlert("Mohon lengkapi seluruh kolom input Kode, Inisial, Kelompok, Cell, dan Nama Barang!");
        return;
    }

    const cleanKey = kodeVal.replace(/[\.\$\#\[\]\/]/g, "_");
    
    // Cek apakah sedang dalam mode EDIT berdasarkan teks badge form
    const isEditMode = lblBadge && lblBadge.innerText === "EDIT";

    // Susun payload data
    const payload = {
        KODE_BARANG: kodeVal,
        INISIAL: inisialVal,
        KELOMPOK: kelompokVal, 
        CELL: cellVal,
        NAMA_BARANG: namaVal,
        QTY: qtyVal,
        Satuan: "KRT"
    };

    // Jika mode tambah baru (BARU), set default IS_ACTIVE menjadi true
    if (!isEditMode) {
        payload.IS_ACTIVE = true;
    }

    const btnSubmit = document.getElementById("btn-submit-master-bd");
    const txtAsli = btnSubmit.innerText;
    btnSubmit.innerText = isEditMode ? "MENYIMPAN PERUBAHAN..." : "MENYIMPAN...";
    btnSubmit.disabled = true;

    // Gunakan PATCH agar data yang sudah ada (seperti status IS_ACTIVE) tidak terhapus/tertindih
    fetch(`${BD_FIREBASE_URL}master_barang/${cleanKey}.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error("Gagal menyimpan ke server database.");
        
        miuiAlert(isEditMode ? "Perubahan data master KODE berhasil disimpan!" : "Data master KODE baru berhasil ditambahkan!");
        resetFormMasterBD();
        muatDataDariFirebase();
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

function ubahStatusAktifBarangBD(nodeKey, statusCentang) {
    fetch(`${BD_FIREBASE_URL}master_barang/${nodeKey}/IS_ACTIVE.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statusCentang)
    })
    .catch(err => {
        console.error("Sinkronisasi gagal:", err);
        const toggle = document.getElementById(`toggle-${nodeKey}`);
        if (toggle) toggle.checked = !statusCentang;
        miuiAlert("Gagal memperbarui status ke database utama.");
    });
}

/**
 * Mengisi Form dengan Data Terpilih untuk Mode Edit (Anti-NaN & Anti-Strip)
 */
function editBarangBD(kd, ins, klmpk, cl, nm, qt) {
    const inKode     = document.getElementById("tx-kode-barang-bd");
    const inInisial  = document.getElementById("tx-inisial-barang-bd");
    const inKelompok = document.getElementById("tx-kelompok-barang-bd");
    const inCell     = document.getElementById("tx-cell-barang-bd");
    const inNama     = document.getElementById("tx-nama-barang-bd");
    const inQty      = document.getElementById("tx-qty-utuhan-bd");
    
    const lblTitle  = document.getElementById("title-mode-form-bd");
    const lblBadge  = document.getElementById("badge-mode-bd");
    const btnAksi   = document.getElementById("btn-submit-master-bd");
    const panelBox  = document.getElementById("box-workspace-input-bd");

    // Helper pembersih: ubah "-" atau null/undefined menjadi string kosong
    const bersihTeks = (val) => (!val || val === "-") ? "" : val;
    
    // Helper pembersih angka: pastikan valid number, jika NaN/strip jadikan 0
    const bersihAngka = (val) => {
        const parsed = parseInt(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    if (inKode && inInisial && inKelompok && inCell && inNama && inQty) {
        inKode.value = kd;
        inKode.readOnly = true;
        inInisial.value = bersihTeks(ins);
        inKelompok.value = bersihTeks(klmpk);
        
        // Sinkronisasi cell otomatis jika kelompok valid, atau pakai data cell yang ada
        sinkronisasiCell();
        if (!inCell.value) {
            inCell.value = bersihTeks(cl);
        }

        inNama.value = bersihTeks(nm);
        inQty.value = bersihAngka(qt);

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

// Tangani klik tombol edit menggunakan dataset (Aman dari NaN dan karakter khusus)
document.addEventListener('click', function(e) {
    const btnEdit = e.target.closest('.btn-edit-item');
    if (btnEdit) {
        const rawQty = parseInt(btnEdit.dataset.qty);
        editBarangBD(
            btnEdit.dataset.key,
            btnEdit.dataset.inisial,
            btnEdit.dataset.kelompok,
            btnEdit.dataset.cell,
            btnEdit.dataset.nama,
            isNaN(rawQty) ? 0 : rawQty
        );
    }
});

function hapusBarangBD(key, namaBarang) {
    miuiConfirm(`Yakin ingin menghapus barang: ${namaBarang}?`, function() {
        fetch(`${BD_FIREBASE_URL}master_barang/${key}.json`, {
            method: "DELETE"
        })
        .then(res => {
            if (!res.ok) throw new Error("Gagal menghapus dari Firebase");
            miuiAlert("Data berhasil dihapus!");
            muatDataDariFirebase();
        })
        .catch(err => {
            console.error("Error:", err);
            miuiAlert("Gagal menghapus data.");
        });
    });
}

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
 * Modul Driver
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

        const keys = Object.keys(drivers).sort((a, b) => {
            const d1 = drivers[a];
            const d2 = drivers[b];
            const plat1 = (d1.PLAT || "").toUpperCase();
            const plat2 = (d2.PLAT || "").toUpperCase();
            if (plat1 !== plat2) return plat1.localeCompare(plat2);
            const name1 = (d1.DRIVER || "").toUpperCase();
            const name2 = (d2.DRIVER || "").toUpperCase();
            return name1.localeCompare(name2);
        });
        
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

function simpanDataDriverBD() {
    const inDriver = document.getElementById("tx-driver-nama");
    const inPlat   = document.getElementById("tx-driver-plat");
    const inIsi    = document.getElementById("tx-driver-isi");
    const inH81    = document.getElementById("tx-harga-81");
    const inH18    = document.getElementById("tx-harga-18");

    if (!inDriver || !inPlat) return;

    const payload = {
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

    const cleanKey = payload.DRIVER.replace(/[\.\$\#\[\]\/]/g, "_");

    fetch(`${BD_FIREBASE_URL}master_driver/${cleanKey}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error("Gagal menyimpan data driver.");
        miuiAlert("Data Driver berhasil disimpan!");
        resetFormDriverBD();
        muatDataDriver();
    })
    .catch(err => {
        console.error(err);
        miuiAlert("Terjadi masalah koneksi internet.");
    });
}

function editDriver(kd, drv, plt, isi, h81, h18) {
    const inDriver = document.getElementById("tx-driver-nama");
    const inPlat   = document.getElementById("tx-driver-plat");
    const inIsi    = document.getElementById("tx-driver-isi");
    const inH81    = document.getElementById("tx-harga-81");
    const inH18    = document.getElementById("tx-harga-18");
    
    const btnAksi  = document.getElementById("btn-submit-driver");

    if (inDriver) {
        inDriver.value = drv;
        inDriver.readOnly = true;
        inPlat.value = plt;
        inIsi.value = isi;
        inH81.value = h81;
        inH18.value = h18;

        if (btnAksi) {
            btnAksi.innerText = "SIMPAN PERUBAHAN";
            btnAksi.onclick = function() {
                const payload = {
                    DRIVER: inDriver.value.trim().toUpperCase(),
                    PLAT: inPlat.value.trim().toUpperCase(),
                    ISI: inIsi.value.trim(),
                    HARGA_8_1: inH81.value.trim(),
                    HARGA_18: inH18.value.trim()
                };

                fetch(`${BD_FIREBASE_URL}master_driver/${kd}.json`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                })
                .then(() => {
                    miuiAlert("Data Driver berhasil diperbarui!");
                    resetFormDriverBD();
                    muatDataDriver();
                });
            };
        }
    }
}

function hapusDriver(key, namaDriver) {
    miuiConfirm(`Yakin ingin menghapus driver: ${namaDriver}?`, function() {
        fetch(`${BD_FIREBASE_URL}master_driver/${key}.json`, {
            method: "DELETE"
        })
        .then(() => {
            miuiAlert("Data driver berhasil dihapus!");
            muatDataDriver();
        })
        .catch(err => {
            console.error(err);
            miuiAlert("Gagal menghapus data driver.");
        });
    });
}

function resetFormDriverBD() {
    const inDriver = document.getElementById("tx-driver-nama");
    const inPlat   = document.getElementById("tx-driver-plat");
    const inIsi    = document.getElementById("tx-driver-isi");
    const inH81    = document.getElementById("tx-harga-81");
    const inH18    = document.getElementById("tx-harga-18");
    const btnAksi  = document.getElementById("btn-submit-driver");

    if (inDriver) { inDriver.value = ""; inDriver.readOnly = false; }
    if (inPlat) inPlat.value = "";
    if (inIsi) inIsi.value = "";
    if (inH81) inH81.value = "";
    if (inH18) inH18.value = "";

    if (btnAksi) {
        btnAksi.innerText = "TAMBAH DRIVER";
        btnAksi.onclick = function() { simpanDataDriverBD(); };
    }
}

/**
 * Modul Nominal
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

        const sortedKeys = Object.keys(nominals).sort((a, b) => {
            const valA = parseInt(nominals[a].NOMINAL || a);
            const valB = parseInt(nominals[b].NOMINAL || b);
            return valA - valB;
        });

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
    }
}

function simpanNominalDriverBD() {
    const inNominal = document.getElementById("tx-nominal");
    const inTerbilang = document.getElementById("tx-terbilang");

    if (!inNominal || !inTerbilang) return;

    const nominalValue = inNominal.value.trim();
    const terbilangValue = inTerbilang.value.trim();
    
    if (!nominalValue || !terbilangValue) {
        miuiAlert("Nominal dan Terbilang wajib diisi!");
        return;
    }

    const nominalId = "NOM_" + Date.now();
    const payload = {
        NOMINAL: nominalValue,
        TERBILANG: terbilangValue
    };

    fetch(`${BD_FIREBASE_URL}master_nominal/${nominalId}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error("Gagal menyimpan nominal.");
        miuiAlert("Data Nominal berhasil disimpan!");
        muatDataNominal();
        resetFormNominalBD();
    })
    .catch(err => {
        console.error(err);
        miuiAlert("Terjadi masalah koneksi.");
    });
}

function editNominal(key, nominal, terbilang) {
    const inNominal = document.getElementById("tx-nominal");
    const inTerbilang = document.getElementById("tx-terbilang");
    
    if (inNominal) inNominal.value = nominal;
    if (inTerbilang) inTerbilang.value = terbilang;

    const btnAksi = document.getElementById("btn-submit-nominal");
    if (!btnAksi) return;

    btnAksi.innerText = "UPDATE NOMINAL";
    btnAksi.onclick = function() {
        const payload = {
            NOMINAL: inNominal.value.trim(),
            TERBILANG: inTerbilang.value.trim()
        };

        fetch(`${BD_FIREBASE_URL}master_nominal/${key}.json`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(() => {
            miuiAlert("Data Nominal berhasil diperbarui!");
            muatDataNominal();
            resetFormNominalBD();
        });
    };
}

function hapusNominalBD(key, nominal) {
    miuiConfirm(`Yakin ingin menghapus nominal: ${nominal}?`, function() {
        fetch(`${BD_FIREBASE_URL}master_nominal/${key}.json`, {
            method: "DELETE"
        })
        .then(() => {
            miuiAlert("Data nominal berhasil dihapus!");
            muatDataNominal();
        });
    });
}

function resetFormNominalBD() {
    const inNominal = document.getElementById("tx-nominal");
    const inTerbilang = document.getElementById("tx-terbilang");
    const btnAksi = document.getElementById("btn-submit-nominal");

    if (inNominal) inNominal.value = "";
    if (inTerbilang) inTerbilang.value = "";
    if (btnAksi) {
        btnAksi.innerText = "TAMBAH NOMINAL";
        btnAksi.onclick = function() { simpanNominalDriverBD(); };
    }
}

/**
 * Fungsi Pemuat Data Tujuan dari Firebase (Mendukung Inisial & Kode Tujuan)
 */
async function muatDataTujuanDariFirebase() {
    const tbody = document.getElementById("tabel-tujuan-bd");
    const badge = document.getElementById("info-total-tujuan-bd");
    if (!tbody) return;

    try {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-14 text-slate-400 font-bold"><i class="fa-solid fa-spinner fa-spin mr-1.5 text-orange-500"></i> Memuat tujuan...</td></tr>`;

        const response = await fetch(`${BD_FIREBASE_URL}master_tujuan.json`);
        const data = await response.json();
        
        tbody.innerHTML = ""; 
        
        if (!data) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-slate-400 font-bold">Belum ada tujuan terdaftar.</td></tr>`;
            if (badge) badge.innerText = "0";
            return;
        }

        let listTujuanArr = [];
        for (const key in data) {
            const item = data[key];
            listTujuanArr.push({
                firebaseKey: key,
                INISIAL: item.INISIAL || "-",
                KODE_TUJUAN: item.KODE_TUJUAN || "-",
                TUJUAN: item.TUJUAN || key,
                KOTA: item.KOTA || "-"
            });
        }

        // Urutkan berdasarkan Nama Tujuan secara alfanumerik
        listTujuanArr.sort((a, b) => a.TUJUAN.localeCompare(b.TUJUAN));

        let index = 1;
        let barisHtml = "";

        listTujuanArr.forEach(item => {
            const key = item.firebaseKey;
            const inisialTujuan = item.INISIAL;
            const kodeTujuan = item.KODE_TUJUAN;
            const namaTujuan = item.TUJUAN;
            const kotaTujuan = item.KOTA;

            const safeInisial = inisialTujuan.replace(/'/g, "\\'");
            const safeKode = kodeTujuan.replace(/'/g, "\\'");
            const safeNama = namaTujuan.replace(/'/g, "\\'");
            const safeKota = kotaTujuan.replace(/'/g, "\\'");

            // Berikan ID unik pada baris tr agar bisa dilacak
            barisHtml += `
                <tr id="row-tujuan-${key}" class="hover:bg-slate-50 transition-colors border-b">
                    <td class="py-3 px-2 text-center text-slate-400 font-mono text-xs">${index++}</td>
                    <td class="py-3 px-2.5 font-mono font-bold text-blue-600 uppercase text-xs">${kodeTujuan}</td>
                    <td class="py-3 px-2.5 font-mono text-amber-600 font-semibold text-xs">${inisialTujuan}</td>
                    <td class="py-3 px-2.5 text-slate-800 font-bold text-xs uppercase">${namaTujuan}</td>
                    <td class="py-3 px-2.5 text-slate-600 text-xs">${kotaTujuan}</td>
                    <td class="py-3 px-2 text-center flex justify-center gap-1">
                        <button class="btn-edit-tujuan text-blue-600 hover:bg-blue-100 p-1.5 rounded-lg transition-all"
                            data-key="${key}"
                            data-inisial="${safeInisial}"
                            data-kode="${safeKode}"
                            data-tujuan="${safeNama}"
                            data-kota="${safeKota}">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="text-red-600 hover:bg-red-100 p-1.5 rounded-lg transition-all" onclick="hapusTujuanBD('${key}', '${safeNama}')">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = barisHtml;
        if (badge) badge.innerHTML = `${listTujuanArr.length} <span class="text-[9px] font-normal text-slate-500 ml-0.5">TUJUAN</span>`;
        
        // FITUR AUTO-SCROLL: Jika ada data yang baru diedit, arahkan pandangan ke baris tersebut
        if (targetScrollKeyBD) {
            setTimeout(() => {
                const targetRow = document.getElementById(`row-tujuan-${targetScrollKeyBD}`);
                if (targetRow) {
                    targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Berikan efek kilau/highlight kuning sebentar pada baris yang diedit
                    targetRow.classList.add('bg-amber-100/80', 'transition-colors', 'duration-700');
                    setTimeout(() => {
                        targetRow.classList.remove('bg-amber-100/80');
                    }, 2000);
                }
                targetScrollKeyBD = null; // Reset kembali
            }, 150);
        }
        
    } catch (err) {
        console.error("Error loading tujuan:", err);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-red-500 font-bold">Gagal memuat data.</td></tr>`;
    }
}

/**
 * Simpan atau Perbarui Data Tujuan (Smart Mode: BARU / EDIT via PATCH)
 */
function simpanDataTujuanBD() {
    const inInisial = document.getElementById("tx-tujuan-inisial");
    const inKode    = document.getElementById("tx-tujuan-kode");
    const inTujuan  = document.getElementById("tx-tujuan-nama");
    const inKota    = document.getElementById("tx-tujuan-kota");
    const lblBadge  = document.getElementById("badge-mode-tujuan");

    if (!inInisial || !inKode || !inTujuan || !inKota) return;

    const inisialVal = inInisial.value.trim().toUpperCase();
    const kodeVal    = inKode.value.trim().toUpperCase();
    const tujuanVal  = inTujuan.value.trim().toUpperCase();
    const kotaVal    = inKota.value.trim().toUpperCase();

    if (!inisialVal || !kodeVal || !tujuanVal || !kotaVal) {
        miuiAlert("Mohon lengkapi seluruh kolom Inisial, Kode, Nama, dan Kota Tujuan!");
        return;
    }

    const cleanKey = tujuanVal.replace(/[\.\$\#\[\]\/]/g, "_");
    const isEditMode = lblBadge && lblBadge.innerText === "EDIT";

    const payload = {
        INISIAL: inisialVal,
        KODE_TUJUAN: kodeVal,
        TUJUAN: tujuanVal,
        KOTA: kotaVal
    };

    const btnSubmit = document.getElementById("btn-submit-tujuan");
    const txtAsli = btnSubmit.innerText;
    btnSubmit.innerText = isEditMode ? "MENYIMPAN PERUBAHAN..." : "MENYIMPAN...";
    btnSubmit.disabled = true;

    fetch(`${BD_FIREBASE_URL}master_tujuan/${cleanKey}.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error("Gagal menyimpan tujuan.");
        
        // Simpan cleanKey ke targetScrollKeyBD SUPAYA TIDAK HILANG SAAT RESET FORM
        targetScrollKeyBD = cleanKey;

        miuiAlert(isEditMode ? "Perubahan data Tujuan berhasil disimpan!" : "Data Tujuan baru berhasil ditambahkan!");
        
        resetFormTujuanBD(); // Reset form tampilan
        
        // Kembalikan lagi targetScrollKeyBD agar pembacaan auto-scroll tidak kosong
        targetScrollKeyBD = cleanKey;

        muatDataTujuanDariFirebase();
    })
    .catch(err => {
        console.error(err);
        miuiAlert("Terjadi masalah koneksi.");
    })
    .finally(() => {
        btnSubmit.innerText = txtAsli;
        btnSubmit.disabled = false;
    });
}

// Variabel penyimpan jejak baris yang terakhir diedit
let targetScrollKeyBD = null;

/**
 * Mode Edit Data Tujuan (Menyimpan target key untuk scroll otomatis)
 */
function editTujuanBD(key, inisial, kode, tujuan, kota) {
    targetScrollKeyBD = key; // Simpan key yang sedang diedit

    const inInisial = document.getElementById("tx-tujuan-inisial");
    const inKode    = document.getElementById("tx-tujuan-kode");
    const inTujuan  = document.getElementById("tx-tujuan-nama");
    const inKota    = document.getElementById("tx-tujuan-kota");
    
    const lblTitle  = document.getElementById("title-mode-form-tujuan");
    const lblBadge  = document.getElementById("badge-mode-tujuan");
    const btnAksi   = document.getElementById("btn-submit-tujuan");
    const panelBox  = document.getElementById("box-workspace-input-tujuan");

    const bersih = (val) => (!val || val === "-") ? "" : val;

    if (inInisial && inKode && inTujuan && inKota) {
        inInisial.value = bersih(inisial);
        inKode.value = bersih(kode);
        inTujuan.value = bersih(tujuan);
        inKota.value = bersih(kota);

        if (lblTitle) lblTitle.innerHTML = `<i class="fa-solid fa-pen-to-square text-amber-600"></i> Ubah Data Tujuan`;
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

// Event listener untuk tombol edit tujuan (aman dari kutip/karakter khusus)
document.addEventListener('click', function(e) {
    const btnEdit = e.target.closest('.btn-edit-tujuan');
    if (btnEdit) {
        editTujuanBD(
            btnEdit.dataset.key,
            btnEdit.dataset.inisial,
            btnEdit.dataset.kode,
            btnEdit.dataset.tujuan,
            btnEdit.dataset.kota
        );
    }
});

/**
 * Menghapus Data Tujuan (Dengan fokus ke baris sebelumnya setelah hapus)
 */
function hapusTujuanBD(key, namaTujuan) {
    miuiConfirm(`Yakin ingin menghapus tujuan: ${namaTujuan}?`, function() {
        // Cari elemen baris saat ini dan ambil elemen sebelumnya (jika ada)
        const currentRow = document.getElementById(`row-tujuan-${key}`);
        if (currentRow) {
            const prevRow = currentRow.previousElementSibling;
            if (prevRow && prevRow.id && prevRow.id.startsWith('row-tujuan-')) {
                // Ambil key dari baris sebelumnya untuk dijadikan target scroll
                targetScrollKeyBD = prevRow.id.replace('row-tujuan-', '');
            } else {
                targetScrollKeyBD = null; // Jika itu baris pertama, biarkan di atas atau kosong
            }
        }

        fetch(`${BD_FIREBASE_URL}master_tujuan/${key}.json`, {
            method: "DELETE"
        })
        .then(() => {
            miuiAlert("Data tujuan berhasil dihapus!");
            muatDataTujuanDariFirebase();
        })
        .catch(err => {
            console.error("Gagal menghapus:", err);
            miuiAlert("Gagal menghapus data tujuan.");
        });
    });
}

/**
 * Mereset Form Tujuan Kembali ke Mode Tambah Baru
 */
function resetFormTujuanBD() {
    // JANGAN set targetScrollKeyBD = null di sini agar fungsi auto-scroll tetap berjalan lancar!
    
    const formTujuan = document.getElementById("form-tujuan-bd");
    const lblTitle   = document.getElementById("title-mode-form-tujuan");
    const lblBadge   = document.getElementById("badge-mode-tujuan");
    const btnAksi    = document.getElementById("btn-submit-tujuan");
    const panelBox   = document.getElementById("box-workspace-input-tujuan");

    if (formTujuan) formTujuan.reset();

    if (lblTitle) lblTitle.innerHTML = `<i class="fa-solid fa-location-dot text-amber-600 text-sm"></i> Tambah Data Tujuan`;
    if (lblBadge) {
        lblBadge.innerText = "BARU";
        lblBadge.className = "text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded uppercase tracking-wider";
    }
    if (btnAksi) btnAksi.innerText = "TAMBAH TUJUAN";
    if (panelBox) {
        panelBox.className = "w-full bg-white rounded-xl border border-gray-300 shadow-[0_2px_4px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-300";
    }
}


// =========================================================================
// SYSTEM COMPONENT: CUSTOM miuiAlert & miuiConfirm (MIUI V5 SPEC)
// =========================================================================
function miuiAlert(pesan) {
    const box = document.getElementById('miui-global-miuiAlert');
    const teks = document.getElementById('miui-miuiAlert-message');
    const contOk = document.getElementById('miui-container-ok');
    const contConfirm = document.getElementById('miui-container-confirm');

    if (!box) {
        alert(pesan);
        return;
    }

    teks.innerText = pesan;
    contOk.classList.remove('hidden');
    contConfirm.classList.add('hidden');
    box.classList.remove('hidden');
}

function tutupmiuiAlert() {
    const box = document.getElementById('miui-global-miuiAlert');
    if (box) box.classList.add('hidden');
}

function miuiConfirm(pesan, onConfirm) {
    const box = document.getElementById('miui-global-miuiAlert');
    const teks = document.getElementById('miui-miuiAlert-message');
    const contOk = document.getElementById('miui-container-ok');
    const contConfirm = document.getElementById('miui-container-confirm');
    const btnYa = document.getElementById('miui-btn-ya');
    const btnTidak = document.getElementById('miui-btn-tidak');

    if (!box) {
        if (confirm(pesan)) onConfirm();
        return;
    }

    teks.innerText = pesan;
    contOk.classList.add('hidden');
    contConfirm.classList.remove('hidden');
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
window.editTujuanBD = editTujuanBD;
window.editDriver = editDriver;
window.editNominal = editNominal;
window.hapusTujuanBD = hapusTujuanBD;
window.resetFormTujuanBD = resetFormTujuanBD;

