// --- KONFIGURASI LIST KODE BARANG & KONVERSI PALET ---
const listKodeBarangExport = {
    MEXA: [
        { kode: "MEXA-01", pltKrt: 153 },
        { kode: "MEXA-02", pltKrt: 153 },
        { kode: "MEXA-03", pltKrt: 153 },
        { kode: "MEXA-04", pltKrt: 153 },
        { kode: "MEXA-05", pltKrt: 153 },
        { kode: "MEXA-06", pltKrt: 153 },
        { kode: "MEXA-07", pltKrt: 153 },
        { kode: "MEXA-08", pltKrt: 153 },
        { kode: "MXR2A01EB", pltKrt: 198 },
        { kode: "MXR2A02EB", pltKrt: 198 },
        { kode: "MXR2A03EB", pltKrt: 198 },
        { kode: "MXR2A04EB", pltKrt: 198 },
        { kode: "MXR2A05EB", pltKrt: 198 },
        { kode: "MXR2A06EB", pltKrt: 198 },
        { kode: "MXR2A07EB", pltKrt: 198 },
        { kode: "MXR2A08EB", pltKrt: 198 }
    ],
    PUXR: [
        { kode: "PUXR2A01", pltKrt: 153 },
        { kode: "PUXR2A02", pltKrt: 153 },
        { kode: "PUXR2A03", pltKrt: 153 },
        { kode: "PUXR2A04", pltKrt: 153 },
        { kode: "PUXR2A05", pltKrt: 153 },
        { kode: "PUXR2A01S", pltKrt: 153 },
        { kode: "PUXR2A02S", pltKrt: 153 },
        { kode: "PUXR2A03S", pltKrt: 153 },
        { kode: "PUXR2A04S", pltKrt: 153 },
        { kode: "PUXR2A05S", pltKrt: 153 }
    ]
};

let cacheMasuk = [];
let cacheKeluar = [];

// Inisialisasi Utama Module Export
window.initExport = async function() {
    console.log("Inisialisasi Barang Export dimulai...");
    
    // Set default tanggal hari ini
    const tglInput = document.getElementById('in-batch-tanggal');
    if (tglInput && !tglInput.value) {
        tglInput.value = new Date().toISOString().split('T')[0];
    }

    const tglMuat = document.getElementById('out-tanggal-muat');
    if (tglMuat && !tglMuat.value) {
        tglMuat.value = new Date().toISOString().split('T')[0];
    }

    // Set default PIN dengan "PIN-" jika kosong
    const pinInput = document.getElementById("in-batch-pin");
    if (pinInput && (!pinInput.value || pinInput.value === "")) {
        pinInput.value = "PIN-";
    }
    
    // Load Master Data & Dropdown (jika ada dari server/lokal)
    if (typeof loadMasterBarangExport === 'function') {
        await loadMasterBarangExport();
    }

    // Panggil fungsi untuk memuat data realtime dari Firebase RTDB & merender tabel
    if (typeof loadRealtimeDataExport === 'function') {
        loadRealtimeDataExport();
    }

    // Set default langsung ke MEXA saat pertama kali dibuka
    window.gantiKategoriExportSlider("MEXA");

    // Pastikan catatan sisa stok ikut termuat saat inisialisasi
    if (typeof loadDanRenderCatatanSisaStok === 'function') {
        loadDanRenderCatatanSisaStok(window.selectedKategoriExport || "MEXA");
    }
};

// Fungsi Slider / Ganti Kategori MEXA / PUXR
window.gantiKategoriExportSlider = function(kategori) {
    window.selectedKategoriExport = kategori;
    
    // Ubah background sesuai brand
    const subpageEl = document.getElementById('subpage-export');
    if (subpageEl) {
        if (kategori === "MEXA") {
            subpageEl.style.backgroundColor = "#ffedd5"; // Soft Orange 100
        } else if (kategori === "PUXR") {
            subpageEl.style.backgroundColor = "#dbeafe"; // Soft Blue 100
        }
    }

    // Sesuaikan status checked pada radio button di header agar sinkron secara visual
    const radioEl = document.querySelector(`input[name="rb-export-kategori"][value="${kategori}"]`);
    if (radioEl) radioEl.checked = true;

    // Update label di ringkasan atas
    const lblMonitor = document.getElementById('lbl-monitor-stok-export');
    const lblBadge = document.getElementById('lbl-nama-kategori-badge');
    if (lblMonitor) lblMonitor.innerText = "TOTAL STOK MASUK : " + kategori;
    if (lblBadge) lblBadge.innerText = "KATEGORI: " + kategori;

    // Refresh data dropdown kode barang
    populateDropdownKodeExport(kategori);

    // Render ulang data tabel bawah (Riwayat Masuk & Rekap Stok) agar ikut terfilter
    if (typeof prosesDanRenderDataExport === 'function') {
        prosesDanRenderDataExport(kategori);
    }

    // Render ulang data Riwayat Muat (OUT) agar ikut terfilter berdasarkan kategori aktif
    if (typeof prosesDanRenderDataExportOUT === 'function') {
        prosesDanRenderDataExportOUT(kategori);
    }

    // Render ulang Catatan Sisa Stok sesuai kategori aktif
    if (typeof loadDanRenderCatatanSisaStok === 'function') {
        loadDanRenderCatatanSisaStok(kategori);
    }
};

// Fungsi Mengisi Dropdown Kode Barang Sesuai Kategori
function populateDropdownKodeExport(kategori) {
    const selectIn = document.getElementById("in-item-kode");
    const selectOut = document.getElementById("out-item-kode");
    
    const items = listKodeBarangExport[kategori] || listKodeBarangExport.MEXA;
    
    let optionsHtml = '<option value="">Pilih Kode...</option>';
    items.forEach(item => {
        optionsHtml += `<option value="${item.kode}">${item.kode}</option>`;
    });

    if (selectIn) selectIn.innerHTML = optionsHtml;
    if (selectOut) selectOut.innerHTML = optionsHtml;
}

// --- FUNGSI CACHE & RENDER BARANG MASUK (IN) ---
window.tambahItemCacheMasuk = function() {
    const kode = document.getElementById("in-item-kode").value;
    const qty = parseInt(document.getElementById("in-item-qty").value);

    if (!kode) {
        miuiAlert("Pilih kode barang terlebih dahulu!");
        return;
    }
    if (!qty || qty <= 0) {
        miuiAlert("Masukkan jumlah Qty karton dengan benar!");
        return;
    }

    cacheMasuk.push({ kode: kode, qty: qty });
    document.getElementById("in-item-qty").value = "";
    document.getElementById("in-item-kode").value = "";
    renderCacheMasuk();
};

window.hapusCacheMasuk = function(index) {
    cacheMasuk.splice(index, 1);
    renderCacheMasuk();
};

function renderCacheMasuk() {
    const tbody = document.getElementById("table-cache-masuk");
    if (!tbody) return;

    if (cacheMasuk.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-slate-400 italic">Belum ada data diinput...</td></tr>`;
        return;
    }

    let html = "";
    cacheMasuk.forEach((item, index) => {
        html += `
            <tr class="hover:bg-slate-50">
                <td class="p-1 px-1.5 font-bold text-slate-700">${item.kode}</td>
                <td class="p-1 px-1.5 text-center font-bold text-emerald-600">${item.qty}</td>
                <td class="p-1 px-1.5 text-center">
                    <button onclick="hapusCacheMasuk(${index})" class="text-red-500 hover:text-red-700 font-bold"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// --- FUNGSI CACHE & RENDER BARANG KELUAR (OUT) ---
window.tambahItemCacheKeluar = function() {
    const kode = document.getElementById("out-item-kode").value;
    const qty = parseInt(document.getElementById("out-item-qty").value);

    if (!kode) {
        miuiAlert("Pilih kode barang terlebih dahulu!");
        return;
    }
    if (!qty || qty <= 0) {
        miuiAlert("Masukkan jumlah Qty karton dengan benar!");
        return;
    }

    cacheKeluar.push({ kode: kode, qty: qty });
    document.getElementById("out-item-qty").value = "";
    document.getElementById("out-item-kode").value = "";
    renderCacheKeluar();
};

window.hapusCacheKeluar = function(index) {
    cacheKeluar.splice(index, 1);
    renderCacheKeluar();
};

function renderCacheKeluar() {
    const tbody = document.getElementById("table-cache-keluar");
    if (!tbody) return;

    if (cacheKeluar.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-slate-400 italic">Belum ada item ditambahkan ke batch ini</td></tr>`;
        return;
    }

    let html = "";
    cacheKeluar.forEach((item, index) => {
        html += `
            <tr class="hover:bg-slate-50">
                <td class="p-1 px-1.5 font-bold text-slate-700">${item.kode}</td>
                <td class="p-1 px-1.5 text-center font-bold text-rose-600">${item.qty}</td>
                <td class="p-1 px-1.5 text-center">
                    <button onclick="hapusCacheKeluar(${index})" class="text-red-500 hover:text-red-700 font-bold"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// --- SIMPAN & PROSES MASUK KE FIREBASE RTDB ---
window.simpanBatchMasukExport = function() {
    const tanggal = document.getElementById("in-batch-tanggal").value;
    let pin = document.getElementById("in-batch-pin").value.trim();

    if (!tanggal) {
        miuiAlert("Tanggal produksi belum diisi!");
        return;
    }
    if (!pin || pin === "PIN-") {
        miuiAlert("Nomor Bukti / PIN belum diisi dengan benar!");
        return;
    }
    if (cacheMasuk.length === 0) {
        miuiAlert("Cache batch Masuk masih kosong! Tambahkan item terlebih dahulu.");
        return;
    }

    const formattedDate = tanggal.replace(/-/g, "_");
    const cleanPin = pin.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = Date.now();
    const batchId = `${formattedDate}_${cleanPin}_${timestamp}`;

    let payloadData = {
        tanggal: tanggal,
        no_bukti: pin,
        kategori: window.selectedKategoriExport || "MEXA",
        timestamp: timestamp,
        tipe: "IN"
    };

    cacheMasuk.forEach(item => {
        const childKey = `${item.kode}_${item.qty}`.replace(/[^a-zA-Z0-9_]/g, "_");
        payloadData[childKey] = {
            kode: item.kode,
            qty: item.qty
        };
    });

    firebase.database().ref(`barang_export/IN/${batchId}`).set(payloadData)
        .then(() => {
            miuiAlert("Data Barang Masuk berhasil disimpan ke Database!");
            cacheMasuk = [];
            renderCacheMasuk();
            document.getElementById("in-batch-pin").value = "PIN-";
            
            // Trigger refresh/render ulang data realtime jika diperlukan secara instan
            if (typeof loadRealtimeDataExport === 'function') {
                loadRealtimeDataExport();
            }
        })
        .catch((error) => {
            miuiAlert("Gagal menyimpan data: " + error.message);
        });
};

// --- SIMPAN & PROSES KELUAR KE FIREBASE RTDB ---
window.simpanBatchKeluarExport = function() {
    const tanggal = document.getElementById("out-tanggal-muat").value;
    const buyer = document.getElementById("out-buyer").value.trim();
    const tujuan = document.getElementById("out-tujuan").value.trim();

    if (!tanggal) {
        miuiAlert("Tanggal loading belum diisi!");
        return;
    }
    if (!buyer) {
        miuiAlert("Nama buyer belum diisi!");
        return;
    }
    if (cacheKeluar.length === 0) {
        miuiAlert("Cache batch Keluar masih kosong! Tambahkan item terlebih dahulu.");
        return;
    }

    const formattedDate = tanggal.replace(/-/g, "_");
    const cleanTujuan = `${buyer}_${tujuan}`.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = Date.now();
    const batchId = `${formattedDate}_${cleanTujuan}_${timestamp}`;

    let payloadData = {
        tanggal: tanggal,
        buyer: buyer,
        tujuan: tujuan,
        kategori: window.selectedKategoriExport || "MEXA",
        timestamp: timestamp,
        tipe: "OUT"
    };

    cacheKeluar.forEach(item => {
        const childKey = `${item.kode}_${item.qty}`.replace(/[^a-zA-Z0-9_]/g, "_");
        payloadData[childKey] = {
            kode: item.kode,
            qty: item.qty
        };
    });

    firebase.database().ref(`barang_export/OUT/${batchId}`).set(payloadData)
        .then(() => {
            miuiAlert("Data Barang Keluar / Pengiriman berhasil disimpan!");
            cacheKeluar = [];
            renderCacheKeluar();
            document.getElementById("out-buyer").value = "";
            document.getElementById("out-tujuan").value = "";

            // Trigger refresh/render ulang data realtime jika diperlukan secara instan
            if (typeof loadRealtimeDataExport === 'function') {
                loadRealtimeDataExport();
            }
        })
        .catch((error) => {
            miuiAlert("Gagal menyimpan pengiriman: " + error.message);
        });
};


// Variabel global untuk menampung cache data mentah dari Firebase
let globalFirebaseDataExport = { IN: {}, OUT: {} };

// --- FUNGSI LISTENER REALTIME DATA EXPORT ---
function loadRealtimeDataExport() {
    const dbRef = firebase.database().ref("barang_export");
    
    dbRef.on("value", (snapshot) => {
        const data = snapshot.val();
        globalFirebaseDataExport = data || { IN: {}, OUT: {} };
        
        // Jalankan proses render berdasarkan kategori aktif saat ini
        prosesDanRenderDataExport(window.selectedKategoriExport || "MEXA");
    });
}

// --- FUNGSI PEMPROSESAN & FILTER DATA BERDASARKAN KATEGORI AKTIF ---
function prosesDanRenderDataExport(kategoriAktif) {
    const data = globalFirebaseDataExport;
    let listRiwayatMasuk = [];
    let dataInMap = {}; 
    let dataOutMap = {}; 
    
    const targetKategori = (kategoriAktif || "MEXA").toUpperCase();

    // Parsing Data IN
    if (data.IN) {
        Object.keys(data.IN).forEach(batchId => {
            const batch = data.IN[batchId];
            const tglPin = `${batch.tanggal || '-'} / ${batch.no_bukti || '-'}`;
            let kategoriBatch = (batch.kategori || "").toUpperCase();

            let itemsInBatch = [];
            let isValidCategory = false;

            Object.keys(batch).forEach(key => {
                if (key !== "tanggal" && key !== "no_bukti" && key !== "kategori" && key !== "timestamp" && key !== "tipe") {
                    const item = batch[key];
                    if (item && item.kode) {
                        let currentKat = kategoriBatch;
                        if (!currentKat) {
                            currentKat = item.kode.startsWith("PUXR") ? "PUXR" : "MEXA";
                        }

                        if (currentKat === targetKategori) {
                            isValidCategory = true;
                            itemsInBatch.push({
                                kode: item.kode,
                                qty: item.qty,
                                childKey: key
                            });
                            dataInMap[item.kode] = (dataInMap[item.kode] || 0) + parseInt(item.qty || 0);
                        }
                    }
                }
            });

            if (isValidCategory && itemsInBatch.length > 0) {
                listRiwayatMasuk.push({
                    batchId: batchId,
                    tglPin: tglPin,
                    items: itemsInBatch
                });
            }
        });
    }

    // Parsing Data OUT (Tetap)
    if (data.OUT) {
        Object.keys(data.OUT).forEach(batchId => {
            const batch = data.OUT[batchId];
            let kategoriBatch = (batch.kategori || "").toUpperCase();

            Object.keys(batch).forEach(key => {
                if (key !== "tanggal" && key !== "buyer" && key !== "tujuan" && key !== "kategori" && key !== "timestamp" && key !== "tipe") {
                    const item = batch[key];
                    if (item && item.kode) {
                        let currentKat = kategoriBatch;
                        if (!currentKat) {
                            currentKat = item.kode.startsWith("PUXR") ? "PUXR" : "MEXA";
                        }

                        if (currentKat === targetKategori) {
                            dataOutMap[item.kode] = (dataOutMap[item.kode] || 0) + parseInt(item.qty || 0);
                        }
                    }
                }
            });
        });
    }

    renderRiwayatMasuk(listRiwayatMasuk);
    renderRekapStokBerjalan(dataInMap, dataOutMap, targetKategori);
}

// --- RENDER TABEL RIWAYAT INPUT MASUK (PENGELOMPOKKAN BERDASARKAN TANGGAL) ---
function renderRiwayatMasuk(riwayatList) {
    const tbody = document.getElementById("table-riwayat-masuk-export");
    if (!tbody) return;

    if (riwayatList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-slate-400 italic">Belum ada riwayat tersimpan</td></tr>`;
        return;
    }

    // Kelompokkan data berdasarkan Tanggal
    let groupedByDate = {};
    riwayatList.forEach((batch) => {
        // Ambil bagian tanggal saja dari string "YYYY-MM-DD / PIN-..."
        const tglOnly = batch.tglPin.split(" / ")[0].trim();
        if (!groupedByDate[tglOnly]) {
            groupedByDate[tglOnly] = [];
        }
        groupedByDate[tglOnly].push(batch);
    });

    let html = "";
    // Urutkan tanggal dari yang terbaru secara sistem (tetap YYYY-MM-DD)
    const sortedDates = Object.keys(groupedByDate).sort().reverse();

    // Daftar nama hari dalam bahasa Indonesia
    const namaHari = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

    sortedDates.forEach((tgl) => {
        // Ambil nama hari dan format tanggal DD-MM-YYYY
        let tglFormatted = tgl;
        let hariStr = "";
        if (tgl && tgl.includes("-") && tgl.split("-").length === 3) {
            const parts = tgl.split("-"); // [YYYY, MM, DD]
            const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            hariStr = namaHari[dateObj.getDay()];
            tglFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        // Baris Header Grup Tanggal dengan Hari
        html += `
            <tr class="bg-slate-200/80 font-bold text-slate-700">
                <td colspan="4" class="p-1.5 px-2 text-[10px] uppercase tracking-wider text-slate-800 border-t border-b border-orange-300">
                    <i class="fa-regular fa-calendar-days mr-1 text-orange-600"></i>${hariStr}, ${tglFormatted}
                </td>
            </tr>
        `;

        groupedByDate[tgl].forEach((batch) => {
            // Ambil nomor PIN saja (membuang tanggal di depan jika ada)
            const parts = batch.tglPin.split(" / ");
            const pinOnly = parts.length > 1 ? parts[1] : batch.tglPin;

            batch.items.forEach((item, index) => {
                html += `
                    <tr class="hover:bg-slate-50 border-t border-slate-100">
                `;
                
                // Kolom PIN (hanya ditampilkan di baris pertama batch tersebut)
                if (index === 0) {
                    html += `<td class="p-1.5 px-2 text-[10px] font-semibold text-slate-600 align-top whitespace-nowrap pl-4">${pinOnly}</td>`;
                } else {
                    html += `<td class="p-1.5 px-2 text-[10px] text-slate-300 align-top"></td>`;
                }

                // Kolom Kode & Qty
                html += `
                    <td class="p-1.5 px-2 text-[10px] font-semibold text-emerald-700">${item.kode}</td>
                    <td class="p-1.5 px-2 text-[10px] text-center font-bold text-slate-800">${item.qty}</td>
                `;

                // Tombol Hapus (hanya di baris pertama batch)
                if (index === 0) {
                    html += `
                        <td class="p-1.5 px-2 text-[10px] text-center align-top">
                            <button onclick="hapusBatchRiwayatMasuk('${batch.batchId}')" class="text-red-500 hover:text-red-700 font-bold" title="Hapus Batch Ini"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    `;
                } else {
                    html += `<td class="p-1.5 px-2 text-[10px] text-center align-top"></td>`;
                }

                html += `</tr>`;
            });
        });
    });

    tbody.innerHTML = html;
}

// --- RENDER TABEL REKAP STOK REALTIME BERJALAN ---
function renderRekapStokBerjalan(dataInMap, dataOutMap, kategoriAktif) {
    const tbody = document.getElementById("table-rekap-stok-export");
    if (!tbody) return;

    const masterItems = listKodeBarangExport[kategoriAktif] || [];

    if (masterItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-400 italic">Belum ada data stok</td></tr>`;
        return;
    }

    let html = "";
    masterItems.forEach(master => {
        const kode = master.kode;
        const totalIn = dataInMap[kode] || 0;
        const totalOut = dataOutMap[kode] || 0;
        const stokAkhir = totalIn - totalOut;

        // Hitung konversi Palet & Bec (1 Plt = master.pltKrt krt)
        const pltKrt = master.pltKrt || 153;
        const jumlahPlt = Math.floor(stokAkhir / pltKrt);
        const sisaKrt = stokAkhir % pltKrt;
        const formatPltBec = `${jumlahPlt} Plt ${sisaKrt > 0 ? sisaKrt + ' Krt' : ''}`;

        html += `
            <tr class="hover:bg-slate-50">
                <td class="p-1.5 px-2 font-bold text-slate-800">${kode}</td>
                <td class="p-1.5 px-2 text-center font-semibold text-emerald-600">${totalIn}</td>
                <td class="p-1.5 px-2 text-center font-semibold text-rose-600">${totalOut}</td>
                <td class="p-1.5 px-2 text-center font-bold text-slate-900">${stokAkhir}</td>
                <td class="p-1.5 px-2 text-center text-blue-600 font-semibold">${formatPltBec}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// --- HAPUS SATU BATCH UTUH RIWAYAT MASUK DARI RTDB ---
window.hapusBatchRiwayatMasuk = function(batchId) {
    if (confirm("Apakah Anda yakin ingin menghapus seluruh batch/PIN ini?")) {
        firebase.database().ref(`barang_export/IN/${batchId}`).remove()
            .then(() => {
                miuiAlert("Batch riwayat berhasil dihapus!");
            })
            .catch(error => {
                miuiAlert("Gagal menghapus: " + error.message);
            });
    }
};



// --- FUNGSI PEMPROSESAN & RENDER DATA OUT (RIWAYAT MUAT) ---
function prosesDanRenderDataExportOUT(kategoriAktif) {
    const data = globalFirebaseDataExport;
    let listRiwayatMuat = [];
    const targetKategori = (kategoriAktif || "MEXA").toUpperCase();

    if (data.OUT) {
        Object.keys(data.OUT).forEach(batchId => {
            const batch = data.OUT[batchId];
            const tglMuat = batch.tanggal || '-';
            const buyerVal = batch.buyer || '-';
            const tujuanVal = batch.tujuan || '-';
            let kategoriBatch = (batch.kategori || "").toUpperCase();

            let itemsInBatch = [];
            let totalQtyBatch = 0;
            let isValidCategory = false;

            Object.keys(batch).forEach(key => {
                const lowerKey = key.toLowerCase();
                if (lowerKey !== "tanggal" && lowerKey !== "buyer" && lowerKey !== "tujuan" && lowerKey !== "kategori" && lowerKey !== "timestamp" && lowerKey !== "tipe") {
                    const item = batch[key];
                    if (item && item.kode) {
                        let currentKat = kategoriBatch;
                        if (!currentKat) {
                            currentKat = item.kode.startsWith("PUXR") ? "PUXR" : "MEXA";
                        }

                        if (currentKat === targetKategori) {
                            isValidCategory = true;
                            const qtyNum = parseInt(item.qty || 0);
                            totalQtyBatch += qtyNum;
                            itemsInBatch.push({
                                kode: item.kode,
                                qty: qtyNum
                            });
                        }
                    }
                }
            });

            if (isValidCategory && itemsInBatch.length > 0) {
                listRiwayatMuat.push({
                    batchId: batchId,
                    tglMuat: tglMuat,
                    buyer: buyerVal,
                    tujuan: tujuanVal,
                    totalQty: totalQtyBatch,
                    items: itemsInBatch
                });
            }
        });
    }

    renderRiwayatMuat(listRiwayatMuat);
}

// --- RENDER TABEL RIWAYAT MUAT (DENGAN TOTAL MUAT) ---
function renderRiwayatMuat(riwayatList) {
    const tbody = document.getElementById("table-riwayat-muat-export");
    if (!tbody) return;

    if (riwayatList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="text-center py-6 text-slate-400 italic">Belum ada riwayat muat</td></tr>`;
        return;
    }

    // Kelompokkan data berdasarkan Tanggal Muat
    let groupedByDate = {};
    riwayatList.forEach((batch) => {
        const tglOnly = batch.tglMuat.trim();
        if (!groupedByDate[tglOnly]) {
            groupedByDate[tglOnly] = [];
        }
        groupedByDate[tglOnly].push(batch);
    });

    let html = "";
    const sortedDates = Object.keys(groupedByDate).sort().reverse();
    const namaHari = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

    sortedDates.forEach((tgl) => {
        let tglFormatted = tgl;
        let hariStr = "";
        if (tgl && tgl.includes("-") && tgl.split("-").length === 3) {
            const parts = tgl.split("-");
            const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            hariStr = namaHari[dateObj.getDay()];
            tglFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        // Baris Header Grup Tanggal Muat
        html += `
            <tr class="bg-slate-200/80 font-bold text-slate-700">
                <td colspan="2" class="p-1.5 px-2 text-[10px] uppercase tracking-wider text-slate-800 border-t border-b border-blue-300">
                    <i class="fa-regular fa-calendar-days mr-1 text-blue-600"></i>${hariStr ? hariStr + ', ' : ''}${tglFormatted}
                </td>
            </tr>
        `;

        groupedByDate[tgl].forEach((batch) => {
            batch.items.forEach((item, index) => {
                html += `
                    <tr class="hover:bg-slate-50 border-t border-slate-100">
                `;
                
                // Kolom Kiri: Buyer (Atas) & Tujuan + Total Muat (Bawah) - Hanya di baris pertama batch
                if (index === 0) {
                    html += `
                        <td class="p-1.5 px-2 align-top pl-4">
                            <div class="font-bold text-slate-800 uppercase">${batch.buyer}</div>
                            <div class="text-[10px] font-medium text-slate-600 uppercase">
                                ${batch.tujuan} <span class="font-bold text-blue-700 ml-1">| Total : ${batch.totalQty.toLocaleString('id-ID')} Krt</span>
                            </div>
                        </td>
                    `;
                } else {
                    html += `<td class="p-1.5 px-2 text-slate-300 align-top"></td>`;
                }

                // Kolom Kanan: Kode Barang (Atas) & Qty Krt (Bawah)
                html += `
                    <td class="p-1.5 px-2 text-right align-top whitespace-nowrap">
                        <div class="font-bold text-emerald-700">${item.kode}</div>
                        <div class="text-[10px] font-bold text-blue-600">${item.qty.toLocaleString('id-ID')} Krt</div>
                    </td>
                `;

                html += `</tr>`;
            });
        });
    });

    tbody.innerHTML = html;
}



// --- FUNGSI SIMPAN SISA STOK DARI TABEL REKAP BERJALAN ---
window.simpanSisaStokAktif = function() {
    const kategori = (window.selectedKategoriExport || "MEXA").toUpperCase();
    const nodeTarget = kategori === "PUXR" ? "barang_export/SISA_PUXR" : "barang_export/SISA_MEXA";
    
    let dataSisaPayload = {};
    let adaData = false;

    const tbodyRekap = document.getElementById("table-rekap-stok-export"); 
    if (!tbodyRekap) {
        miuiAlert("Tabel rekap stok tidak ditemukan!");
        return;
    }

    const trs = tbodyRekap.querySelectorAll("tr");
    if (!trs || trs.length === 0) {
        miuiAlert("Belum ada data sisa stok untuk disimpan!");
        return;
    }

    // Buat ID unik berdasarkan tanggal & timestamp (format: yyyy_mm_dd_timestamp)
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const timestamp = now.getTime();
    const uniqueId = `${yyyy}_${mm}_${dd}_${timestamp}`;

    dataSisaPayload.tanggal = `${yyyy}-${mm}-${dd}`;
    dataSisaPayload.kategori = kategori;
    dataSisaPayload.timestamp = timestamp;

    trs.forEach((tr) => {
        const cols = tr.querySelectorAll("td");
        // Kolom rekap biasanya: [Kode, IN, OUT, AKHIR, PLT|BEC]
        if (cols.length >= 4) {
            const kode = cols[0].innerText.trim();
            const qtySisa = parseInt(cols[3].innerText.trim().replace(/\./g, '')) || 0;
            const pltBec = cols[4] ? cols[4].innerText.trim() : "-";

            if (kode && kode !== "KODE" && !kode.includes("Belum")) {
                // Simpan menggunakan kode barang langsung sebagai kunci (key) payload
                dataSisaPayload[kode] = {
                    kode: kode,
                    qty_sisa: qtySisa,
                    plt_bec: pltBec
                };
                adaData = true;
            }
        }
    });

    if (!adaData) {
        miuiAlert("Tidak ada rincian sisa stok yang valid untuk disimpan.");
        return;
    }

    // Menggunakan miuiConfirm kustom
    miuiConfirm(`Simpan catatan sisa stok untuk kategori ${kategori} tanggal ${yyyy}-${mm}-${dd}?`, () => {
        firebase.database().ref(`${nodeTarget}/${uniqueId}`).set(dataSisaPayload)
            .then(() => {
                miuiAlert("Catatan sisa stok berhasil disimpan dan dikunci!");
                if (typeof loadDanRenderCatatanSisaStok === 'function') {
                    loadDanRenderCatatanSisaStok(kategori);
                }
            })
            .catch(error => {
                miuiAlert("Gagal menyimpan sisa stok: " + error.message);
            });
    });
};


// --- FUNGSI LOAD & RENDER CATATAN SISA STOK (HANYA QTY > 0) ---
window.loadDanRenderCatatanSisaStok = function(kategoriAktif) {
    const kategori = (kategoriAktif || window.selectedKategoriExport || "MEXA").toUpperCase();
    const nodeTarget = kategori === "PUXR" ? "barang_export/sisa_puxr" : "barang_export/sisa_mexa";
    
    const tbodyCatatan = document.getElementById("table-sisa-stok-export");
    if (!tbodyCatatan) return;

    firebase.database().ref(nodeTarget).once("value", snapshot => {
        if (!snapshot.exists()) {
            const nodeFallback = kategori === "PUXR" ? "barang_export/SISA_PUXR" : "barang_export/SISA_MEXA";
            firebase.database().ref(nodeFallback).once("value", snapFallback => {
                if (!snapFallback.exists()) {
                    tbodyCatatan.innerHTML = `<tr><td colspan="2" class="text-center py-6 text-slate-400 italic">Belum ada catatan sisa stok</td></tr>`;
                    return;
                }
                prosesDanRenderSnap(snapFallback, tbodyCatatan);
            });
            return;
        }
        prosesDanRenderSnap(snapshot, tbodyCatatan);
    });
};

function prosesDanRenderSnap(snapshot, tbodyCatatan) {
    let dataSisaList = [];
    snapshot.forEach(childSnap => {
        const val = childSnap.val();
        if (val) {
            dataSisaList.push({
                id: childSnap.key,
                timestamp: val.timestamp || 0,
                ...val
            });
        }
    });

    if (dataSisaList.length === 0) {
        tbodyCatatan.innerHTML = `<tr><td colspan="2" class="text-center py-6 text-slate-400 italic">Belum ada catatan sisa stok</td></tr>`;
        return;
    }

    dataSisaList.sort((a, b) => b.timestamp - a.timestamp);

    let html = "";
    const namaHari = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

    dataSisaList.forEach(record => {
        let tgl = record.tanggal || "-";
        let tglFormatted = tgl;
        let hariStr = "";
        
        if (tgl && tgl.includes("-") && tgl.split("-").length === 3) {
            const parts = tgl.split("-");
            const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            hariStr = namaHari[dateObj.getDay()];
            tglFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        // Kumpulkan item yang qty_sisa > 0 terlebih dahulu untuk dicek
        let validItemsHtml = "";
        let countValid = 0;

        Object.keys(record).forEach(key => {
            if (key !== "tanggal" && key !== "kategori" && key !== "timestamp") {
                const detail = record[key];
                const qtySisa = parseInt(detail && detail.qty_sisa ? detail.qty_sisa : 0);
                
                // HANYA TAMPILKAN JIKA QTY > 0
                if (detail && detail.kode && qtySisa > 0) {
                    countValid++;
                    validItemsHtml += `
                        <tr class="hover:bg-slate-50 border-t border-slate-100">
                            <td class="p-1.5 px-2 font-semibold text-emerald-700 pl-4">${detail.kode}</td>
                            <td class="p-1.5 px-2 text-right font-bold text-slate-800">${qtySisa.toLocaleString('id-ID')} Krt</td>
                        </tr>
                    `;
                }
            }
        });

        // Tampilkan header tanggal hanya jika ada item dengan qty > 0 di batch tersebut
        if (countValid > 0) {
            html += `
                <tr class="bg-slate-200/80 font-bold text-slate-700">
                    <td colspan="2" class="p-1.5 px-2 text-[10px] uppercase tracking-wider text-slate-800 border-t border-b border-slate-300">
                        <i class="fa-regular fa-calendar-check mr-1 text-emerald-600"></i>${hariStr ? hariStr + ', ' : ''}${tglFormatted} (SISA STOK)
                    </td>
                </tr>
            `;
            html += validItemsHtml;
        }
    });

    if (html === "") {
        tbodyCatatan.innerHTML = `<tr><td colspan="2" class="text-center py-6 text-slate-400 italic">Tidak ada sisa stok > 0</td></tr>`;
    } else {
        tbodyCatatan.innerHTML = html;
    }
}