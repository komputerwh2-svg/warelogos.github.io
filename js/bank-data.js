// ==========================================================================
// LOGIKA KHUSUS: MODUL SETELAN BANK DATA & KAMUS BARANG
// ==========================================================================

// Gunakan block scoping (const/let) agar tidak bentrok dengan modul lain
const BD_FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

/**
 * Mengunduh Data 'master_barang' dari Firebase Realtime Database
 */
function ambilDataMasterFirebase() {
    const bodiTabel = document.getElementById("table-master-body-bd");
    const badgeTotal = document.getElementById("info-total-item-bd");

    if (!bodiTabel) return;

    bodiTabel.innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-10 text-slate-400 font-bold">
                <i class="fa-solid fa-spinner fa-spin mr-1"></i> Menghubungkan ke Live Firebase...
            </td>
        </tr>
    `;

    fetch(`${BD_FIREBASE_URL}master_barang.json`)
        .then(res => res.json())
        .then(kumpulanData => {
            bodiTabel.innerHTML = "";

            if (!kumpulanData) {
                bodiTabel.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center py-10 text-slate-400 font-bold">
                            <i class="fa-solid fa-box-open mr-1"></i> Tidak ada data barang terdaftar.
                        </td>
                    </tr>
                `;
                if (badgeTotal) badgeTotal.innerHTML = `0 <span class="text-[8px] font-normal text-slate-400">ITEM</span>`;
                return;
            }

            let indeks = 1;
            let hitungTotal = 0;
            let barisHtml = "";

            for (const kodeKey in kumpulanData) {
                const detailItem = kumpulanData[kodeKey];
                const namaItem = detailItem.NAMA_BARANG || detailItem.nama_barang || "-";
                const kuantitas = detailItem.QTY || detailItem.qty || 0;

                barisHtml += `
                    <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                        <td class="py-2 px-3 text-center font-mono text-slate-400">${indeks++}</td>
                        <td class="py-2 px-4 font-mono font-bold text-blue-600 tracking-wide uppercase">${kodeKey}</td>
                        <td class="py-2 px-4 text-slate-700 font-medium">${namaItem}</td>
                        <td class="py-2 px-4 text-center font-mono font-bold text-slate-900">${kuantitas} KRT</td>
                        <td class="py-2 px-3 text-center">
                            <button onclick="editBarangBD('${kodeKey}', '${namaItem.replace(/'/g, "\\'")}', ${kuantitas})" class="text-xs font-bold text-orange-500 hover:text-orange-600 px-1.5 py-0.5 rounded border border-orange-200 bg-orange-50/50 active:bg-orange-100 transition-all">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                        </td>
                    </tr>
                `;
                hitungTotal++;
            }

            bodiTabel.innerHTML = barisHtml;
            if (badgeTotal) badgeTotal.innerHTML = `${hitungTotal} <span class="text-[8px] font-normal text-slate-400">ITEM</span>`;
        })
        .catch(err => {
            console.error("Koneksi Firebase gagal:", err);
            bodiTabel.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-10 text-red-500 font-bold">
                        <i class="fa-solid fa-triangle-exclamation mr-1"></i> Gagal Sinkronisasi Database.
                    </td>
                </tr>
            `;
        });
}

/**
 * Mengisi Form dengan Data Terpilih untuk Mode Edit
 */
function editBarangBD(kd, nm, qt) {
    const inKode = document.getElementById("tx-kode-barang-bd");
    const inNama = document.getElementById("tx-nama-barang-bd");
    const inQty = document.getElementById("tx-qty-utuhan-bd");
    const lblTitle = document.getElementById("title-mode-form-bd");
    const lblBadge = document.getElementById("badge-mode-bd");
    const btnAksi = document.getElementById("btn-submit-master-bd");
    const panelBox = document.getElementById("box-workspace-input-bd");

    if (inKode && inNama && inQty) {
        inKode.value = kd;
        inKode.readOnly = true;
        inNama.value = nm;
        inQty.value = qt;

        if (lblTitle) lblTitle.innerHTML = `<i class="fa-solid fa-pen-to-square text-amber-600"></i> Ubah Data Barang`;
        if (lblBadge) {
            lblBadge.innerText = "EDIT";
            lblBadge.className = "text-[9px] font-black text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded uppercase tracking-wider";
        }
        if (btnAksi) btnAksi.innerText = "SIMPAN PERUBAHAN";
        if (panelBox) {
            panelBox.classList.remove("bg-emerald-50/60", "border-[#dcdcdc]");
            panelBox.classList.add("bg-amber-50/60", "border-amber-200");
        }
    }
}

/**
 * Mereset Form Kembali ke Mode Tambah Baru
 */
function resetFormMasterBD() {
    const formBD = document.getElementById("form-master-barang-bd");
    const inKode = document.getElementById("tx-kode-barang-bd");
    const lblTitle = document.getElementById("title-mode-form-bd");
    const lblBadge = document.getElementById("badge-mode-bd");
    const btnAksi = document.getElementById("btn-submit-master-bd");
    const panelBox = document.getElementById("box-workspace-input-bd");

    if (formBD) formBD.reset();
    if (inKode) inKode.readOnly = false;

    if (lblTitle) lblTitle.innerHTML = `<i class="fa-solid fa-square-plus text-emerald-600"></i> Tambah Kode Barang Baru`;
    if (lblBadge) {
        lblBadge.innerText = "BARU";
        lblBadge.className = "text-[9px] font-black text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded uppercase tracking-wider";
    }
    if (btnAksi) btnAksi.innerText = "TAMBAH KODE";
    if (panelBox) {
        panelBox.classList.remove("bg-amber-50/60", "border-amber-200");
        panelBox.classList.add("bg-emerald-50/60", "border-[#dcdcdc]");
    }
}
