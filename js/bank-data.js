// ==========================================================================
// LOGIKA KHUSUS: MODUL SETELAN BANK DATA & KAMUS BARANG (v3.6.1)
// ==========================================================================

const BD_FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

/**
 * Mengunduh Data 'master_barang' secara utuh dari Firebase Realtime DB
 * Dan mengurutkannya berdasarkan INISIAL barang agar rapi secara urutan angka
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
                        <td colspan="7" class="text-center py-10 text-gray-400 font-bold">
                            <i class="fa-solid fa-box-open mr-1"></i> Tidak ada data barang terdaftar.
                        </td>
                    </tr>
                `;
                if (badgeTotal) badgeTotal.innerHTML = `0 <span class="text-[9px] font-normal text-slate-500">ITEM</span>`;
                return;
            }

            // 1. STRUKTURISASI: Ubah objek Firebase menjadi Array agar bisa kita urutkan (Sort)
            let listBarangArr = [];
            for (const key in kumpulanData) {
                const item = kumpulanData[key];
                listBarangArr.push({
                    firebaseKey: key,
                    KODE_BARANG: item.KODE_BARANG || key,
                    INISIAL: item.INISIAL || "-",
                    NAMA_BARANG: item.NAMA_BARANG || "-",
                    QTY: item.QTY !== undefined ? item.QTY : 0,
                    Satuan: item.Satuan || "KRT",
                    IS_ACTIVE: item.IS_ACTIVE !== undefined ? item.IS_ACTIVE : true
                });
            }

            // 2. PROSES SORTING: Urutkan data berdasarkan string INISIAL secara lokal/alamiah (Alfanumerik)
            listBarangArr.sort((itemA, itemB) => {
                return itemA.INISIAL.localeCompare(itemB.INISIAL, undefined, {
                    numeric: true,
                    sensitivity: 'base'
                });
            });

            // 3. RENDERING: Cetak tumpukan data yang sudah terurut dengan pewarnaan khas MIUI v5
            let indeks = 1;
            let barisHtml = "";

            listBarangArr.forEach(detailItem => {
                const key           = detailItem.firebaseKey;
                const inisialBarang = detailItem.INISIAL;
                const kodeBarang    = detailItem.KODE_BARANG;
                const namaItem      = detailItem.NAMA_BARANG;
                const kuantitas     = detailItem.QTY;
                const satuanPack    = detailItem.Satuan;
                const isActive      = detailItem.IS_ACTIVE;

                barisHtml += `
                    <tr class="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                        <td class="py-3 px-2 text-center font-mono text-gray-400 font-normal">${indeks++}</td>
                        <td class="py-3 px-3 font-mono font-black text-[#e04a00] uppercase tracking-wide text-xs">${inisialBarang}</td>
                        <td class="py-3 px-3 font-mono font-bold text-[#2a67e0] tracking-wider uppercase">${kodeBarang}</td>
                        <td class="py-3 px-3 text-slate-800 font-bold uppercase leading-tight">${namaItem}</td>
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
                            <button onclick="editBarangBD('${key}', '${inisialBarang.replace(/'/g, "\\'")}', '${namaItem.replace(/'/g, "\\'")}', ${kuantitas})" class="text-[10px] font-black text-blue-600 hover:bg-blue-100 p-1.5 rounded-lg transition-all">
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
                    <td colspan="7" class="text-center py-10 text-red-500 font-bold">
                        <i class="fa-solid fa-triangle-exclamation mr-1"></i> Gagal Sinkronisasi Database Web.
                    </td>
                </tr>
            `;
        });
}

/**
 * Menyimpan data input baru atau memperbarui perubahan edit ke Firebase
 */
function simpanDataMasterBD() {
    const inKode    = document.getElementById("tx-kode-barang-bd");
    const inInisial = document.getElementById("tx-inisial-barang-bd");
    const inNama    = document.getElementById("tx-nama-barang-bd");
    const inQty     = document.getElementById("tx-qty-utuhan-bd"); // Mengikuti id Qty Utuhan

    if (!inKode || !inInisial || !inNama || !inQty) return;

    const kodeVal    = inKode.value.trim().toUpperCase();
    const inisialVal = inInisial.value.trim().toUpperCase();
    const namaVal    = inNama.value.trim().toUpperCase();
    const qtyVal     = inQty.value.trim() !== "" ? parseInt(inQty.value) : 0;

    if (!kodeVal || !inisialVal || !namaVal) {
        alert("Mohon lengkapi seluruh kolom input Kode, Inisial, dan Nama Barang!");
        return;
    }

    const cleanKey = kodeVal.replace(/[\.\$\#\[\]\/]/g, "_");

    const payload = {
        KODE_BARANG: kodeVal,
        INISIAL: inisialVal,
        NAMA_BARANG: namaVal,
        QTY: qtyVal,
        Satuan: "KRT",
        IS_ACTIVE: true
    };

    const btnSubmit = document.getElementById("btn-submit-master-bd");
    const txtAsli = btnSubmit.innerText;
    btnSubmit.innerText = "MENYIMPAN...";
    btnSubmit.disabled = true;

    fetch(`${BD_FIREBASE_URL}master_barang/${cleanKey}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error("Gagal menyimpan ke server database.");
        alert("Data master kamus barang berhasil disinkronisasi!");
        resetFormMasterBD();
        muatDataDariFirebase();
    })
    .catch(err => {
        console.error(err);
        alert("Terjadi masalah koneksi internet saat menyimpan data.");
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
function editBarangBD(kd, ins, nm, qt) {
    const inKode    = document.getElementById("tx-kode-barang-bd");
    const inInisial = document.getElementById("tx-inisial-barang-bd");
    const inNama    = document.getElementById("tx-nama-barang-bd");
    const inQty     = document.getElementById("tx-qty-utuhan-bd"); // Mengikuti id Qty Utuhan
    
    const lblTitle  = document.getElementById("title-mode-form-bd");
    const lblBadge  = document.getElementById("badge-mode-bd");
    const btnAksi   = document.getElementById("btn-submit-master-bd");
    const panelBox  = document.getElementById("box-workspace-input-bd");

    if (inKode && inInisial && inNama && inQty) {
        inKode.value = kd;
        inKode.readOnly = true;
        inInisial.value = ins;
        inNama.value = nm;
        inQty.value = qt;

        if (lblTitle) lblTitle.innerHTML = `<i class="fa-solid fa-pen-to-square text-amber-600"></i> Ubah Data Barang`;
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
    const formBD    = document.getElementById("form-master-barang-bd");
    const inKode    = document.getElementById("tx-kode-barang-bd");
    
    const lblTitle  = document.getElementById("title-mode-form-bd");
    const lblBadge  = document.getElementById("badge-mode-bd");
    const btnAksi   = document.getElementById("btn-submit-master-bd");
    const panelBox  = document.getElementById("box-workspace-input-bd");

    if (formBD) formBD.reset();
    if (inKode) inKode.readOnly = false;

    if (lblTitle) lblTitle.innerHTML = `<i class="fa-solid fa-square-plus text-emerald-600"></i> Tambah Kode Barang Baru`;
    if (lblBadge) {
        lblBadge.innerText = "BARU";
        lblBadge.className = "text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase tracking-wider";
    }
    if (btnAksi) btnAksi.innerText = "TAMBAH KODE";
    if (panelBox) {
        panelBox.className = "w-full bg-white rounded-xl border border-gray-300 shadow-[0_2px_4px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-300";
    }
}

// EKSPOS KE SCOPE GLOBAL WINDOW
window.muatDataDariFirebase = muatDataDariFirebase;
window.simpanDataMasterBD = simpanDataMasterBD;
window.ubahStatusAktifBarangBD = ubahStatusAktifBarangBD;
window.editBarangBD = editBarangBD;
window.resetFormMasterBD = resetFormMasterBD;