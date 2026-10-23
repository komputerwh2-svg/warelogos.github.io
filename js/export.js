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
        
        const kategoriAktif = window.selectedKategoriExport || "MEXA";

        // Jalankan proses render untuk semua tabel berdasarkan kategori aktif saat ini
        prosesDanRenderDataExport(kategoriAktif);
        
        if (typeof prosesDanRenderDataExportOUT === 'function') {
            prosesDanRenderDataExportOUT(kategoriAktif);
        }
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
        
        let formatPltBec = "-";
        if (stokAkhir !== 0) {
            formatPltBec = `${jumlahPlt} Plt / ${sisaKrt > 0 ? sisaKrt + ' Krt' : ''} `.trim();
        }

        const displayIn = totalIn > 0 ? totalIn.toLocaleString('id-ID') : '-';
        const displayOut = totalOut > 0 ? totalOut.toLocaleString('id-ID') : '-';
        const displayAkhir = stokAkhir !== 0 ? stokAkhir.toLocaleString('id-ID') : '-';

        html += `
            <tr class="hover:bg-slate-50">
                <td class="p-1.5 px-2 font-bold text-slate-800">${kode}</td>
                <td class="p-1.5 px-2 text-center font-semibold text-emerald-600">${displayIn}</td>
                <td class="p-1.5 px-2 text-center font-semibold text-rose-600">${displayOut}</td>
                <td class="p-1.5 px-2 text-center font-bold text-slate-900">${displayAkhir}</td>
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




// --- MODAL & FUNGSI FULLSCREEN CETAK LAPORAN STOK EXPORT ---
window.bukaModalCetakLaporan = function() {
    const kategori = (window.selectedKategoriExport || "MEXA").toUpperCase();
    
    let modalEl = document.getElementById('modal-cetak-laporan-export');
    if (!modalEl) {
        const div = document.createElement('div');
        div.id = 'modal-cetak-laporan-export';
        div.className = 'fixed inset-0 bg-slate-900/80 z-50 flex flex-col hidden';
        div.innerHTML = `
            <!-- Header Modal -->
            <div class="bg-slate-900 text-white px-6 py-3 flex justify-between items-center shadow-md">
                <h3 class="font-bold text-sm uppercase flex items-center gap-2">
                    <i class="fa-solid fa-print text-orange-400"></i> Preview & Cetak Laporan Stok Export (<span id="modal-lbl-kategori">${kategori}</span>)
                </h3>
                <button onclick="tutupModalCetak()" class="text-white hover:text-red-400 font-bold text-lg">✕</button>
            </div>

            <!-- Konten Fullscreen (Split: Kiri Preview F4, Kanan Panel Kontrol) -->
            <div class="flex flex-1 overflow-hidden">
                <!-- Sebelah Kiri: Area Print Preview (F4 Portrait) -->
                <div class="flex-1 bg-slate-700 p-6 overflow-y-auto flex justify-center">
                    <div id="print-preview-paper" class="bg-white shadow-2xl rounded text-xs text-black" style="width: 210mm; min-height: 330mm; padding: 10mm; box-sizing: border-box; miui-custom-scrollbar: thin;">
                        <!-- Konten preview akan dirender di sini -->
                    </div>
                </div>

                <!-- Sebelah Kanan: Panel Pengaturan & Tombol Aksi -->
                <div class="w-80 bg-white border-l border-slate-200 p-5 flex flex-col justify-between shadow-xl overflow-y-auto">
                    <div class="space-y-4">
                        <h4 class="font-bold text-slate-900 uppercase text-xs border-b pb-2 flex items-center gap-1.5">
                            <i class="fa-solid fa-sliders text-orange-600"></i> Pengaturan Filter Laporan
                        </h4>

                        <div>
                            <label class="block font-bold text-slate-900 mb-1 text-[11px]">Pilih Kode Tampil:</label>
                            <select id="print-filter-tipe-kode" onchange="updatePrintPreviewHTML()" class="w-full border border-slate-300 rounded p-2 text-xs bg-white text-slate-900 font-bold shadow-sm">
                                <!-- Opsi akan diisi dinamis -->
                            </select>
                        </div>
                        
                        <div>
                            <label class="block font-bold text-slate-900 mb-1 text-[11px]">Dari Tanggal Masuk:</label>
                            <input type="date" id="print-tgl-mulai" onchange="updatePrintPreviewHTML()" class="w-full border border-slate-300 rounded p-2 text-xs bg-white text-slate-900 font-bold shadow-sm">
                        </div>

                        <div>
                            <label class="block font-bold text-slate-900 mb-1 text-[11px]">Sampai Tanggal Masuk:</label>
                            <input type="date" id="print-tgl-selesai" onchange="updatePrintPreviewHTML()" class="w-full border border-slate-300 rounded p-2 text-xs bg-white text-slate-900 font-bold shadow-sm">
                        </div>

                        <div>
                            <label class="block font-bold text-slate-900 mb-1 text-[11px]">Pilih Tanggal Sisa Stok:</label>
                            <select id="print-select-sisa-stok" onchange="updatePrintPreviewHTML()" class="w-full border border-slate-300 rounded p-2 text-xs bg-white text-slate-900 font-bold shadow-sm">
                                <option value="">-- Memuat Sisa Stok --</option>
                            </select>
                        </div>
                    </div>

                    <div class="pt-4 border-t space-y-2">
                        <button onclick="kirimCetakKePrintJobs()" class="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-4 rounded shadow flex items-center justify-center gap-2 text-xs transition">
                            <i class="fa-solid fa-print"></i> CETAK LAPORAN
                        </button>
                    </div>
                </div>
            </div>

            <!-- CSS Khusus Ukuran F4 Portrait & Margin Minimum untuk Print -->
            <style>
                @page {
                    size: 210mm 330mm;
                    margin: 5mm;
                }
                @media print {
                    body * { visibility: hidden; }
                    #print-preview-paper, #print-preview-paper * { visibility: visible; }
                    #print-preview-paper { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 210mm !important; 
                        min-height: 330mm !important; 
                        margin: 0 !important; 
                        padding: 8mm !important; 
                        box-shadow: none !important; 
                        background: white !important;
                    }
                }
            </style>
        `;
        document.body.appendChild(div);
        modalEl = div;
    }

    modalEl.classList.remove('hidden');
    document.getElementById('modal-lbl-kategori').innerText = kategori;

    const selectFilterKode = document.getElementById('print-filter-tipe-kode');
    if (kategori === "MEXA") {
        selectFilterKode.innerHTML = `
            <option value="ALL">Tampilkan Semua Kode Barang</option>
            <option value="MEXA">Hanya MEXA</option>
            <option value="MXR">Hanya MXR</option>
        `;
    } else {
        selectFilterKode.innerHTML = `
            <option value="ALL">Tampilkan Semua Kode Barang</option>
            <option value="PUXR">Hanya PUXR</option>
            <option value="PUXRS">Hanya PUXRS</option>
        `;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('print-tgl-mulai').value = todayStr;
    document.getElementById('print-tgl-selesai').value = todayStr;

    populateDropdownSisaStokModal(kategori);
};

window.tutupModalCetak = function() {
    const modalEl = document.getElementById('modal-cetak-laporan-export');
    if (modalEl) modalEl.classList.add('hidden');
};

function populateDropdownSisaStokModal(kategori) {
    const selectEl = document.getElementById('print-select-sisa-stok');
    if (!selectEl) return;

    const nodeCapital = kategori === "PUXR" ? "barang_export/SISA_PUXR" : "barang_export/SISA_MEXA";
    const nodeLower = kategori === "PUXR" ? "barang_export/sisa_puxr" : "barang_export/sisa_mexa";

    firebase.database().ref(nodeCapital).once("value", snapshot => {
        if (!snapshot.exists()) {
            firebase.database().ref(nodeLower).once("value", snapFallback => {
                renderDropdownOptions(snapFallback, selectEl, kategori);
            });
            return;
        }
        renderDropdownOptions(snapshot, selectEl, kategori);
    });
}

function renderDropdownOptions(snapshot, selectEl, kategori) {
    let optionsHtml = '<option value="">-- Pilih Tanggal Sisa Stok --</option>';
    if (snapshot.exists()) {
        let listData = [];
        snapshot.forEach(child => {
            listData.push({ id: child.key, ...child.val() });
        });
        listData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        listData.forEach(item => {
            let tglRaw = item.tanggal || "";
            let tglFormatted = tglRaw;
            if (tglRaw.includes("-") && tglRaw.split("-").length === 3) {
                const parts = tglRaw.split("-");
                tglFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            optionsHtml += `<option value="${item.id}">${tglFormatted} (${item.kategori || kategori})</option>`;
        });
    }
    selectEl.innerHTML = optionsHtml;
    updatePrintPreviewHTML();
}

// --- FUNGSI FORMAT TANGGAL DD-MM-YYYY ---
function formatDateIndo(dateStr) {
    if (!dateStr || !dateStr.includes("-")) return dateStr;
    const parts = dateStr.split("-");
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
}

// --- FUNGSI UPDATE PREVIEW SECARA LIVE ---
window.updatePrintPreviewHTML = function() {
    const tglMulai = document.getElementById('print-tgl-mulai').value;
    const tglSelesai = document.getElementById('print-tgl-selesai').value;
    const sisaStokKey = document.getElementById('print-select-sisa-stok').value;
    const filterTipeKode = document.getElementById('print-filter-tipe-kode').value;
    const kategori = (window.selectedKategoriExport || "MEXA").toUpperCase();
    const previewPaper = document.getElementById('print-preview-paper');

    if (!previewPaper) return;

    const data = globalFirebaseDataExport || {};
    let filteredMasuk = [];

    function isCodeMatchFilter(kode) {
        if (!kode) return false;
        const upper = kode.toUpperCase();
        if (filterTipeKode === "ALL") return true;
        if (filterTipeKode === "MEXA") return upper.startsWith("MEXA");
        if (filterTipeKode === "MXR") return upper.startsWith("MXR");
        if (filterTipeKode === "PUXR") return upper.startsWith("PUXR") && !upper.endsWith("S");
        if (filterTipeKode === "PUXRS") return upper.startsWith("PUXR") && upper.endsWith("S");
        return true;
    }

    if (data.IN) {
        Object.keys(data.IN).forEach(batchId => {
            const batch = data.IN[batchId];
            const tglBatch = batch.tanggal || "";
            let katBatch = (batch.kategori || "").toUpperCase();

            if (tglBatch >= tglMulai && tglBatch <= tglSelesai) {
                Object.keys(batch).forEach(key => {
                    if (key !== "tanggal" && key !== "no_bukti" && key !== "kategori" && key !== "timestamp" && key !== "tipe") {
                        const item = batch[key];
                        if (item && item.kode) {
                            if (!katBatch) katBatch = item.kode.startsWith("PUXR") ? "PUXR" : "MEXA";
                            if (katBatch === kategori && isCodeMatchFilter(item.kode)) {
                                filteredMasuk.push({
                                    tanggal: formatDateIndo(tglBatch),
                                    pin: batch.no_bukti || "-",
                                    kode: item.kode,
                                    qty: parseInt(item.qty || 0)
                                });
                            }
                        }
                    }
                });
            }
        });
    }

    const masterMasterItems = listKodeBarangExport[kategori] || [];
    const masterItems = masterMasterItems.filter(m => isCodeMatchFilter(m.kode));

    let dataInMap = {};
    let dataOutMap = {};

    if (data.IN) {
        Object.keys(data.IN).forEach(id => {
            const b = data.IN[id];
            let kat = (b.kategori || "").toUpperCase();
            Object.keys(b).forEach(k => {
                if (k !== "tanggal" && k !== "no_bukti" && k !== "kategori" && k !== "timestamp" && k !== "tipe") {
                    const itm = b[k];
                    if (itm && itm.kode) {
                        if (!kat) kat = itm.kode.startsWith("PUXR") ? "PUXR" : "MEXA";
                        if (kat === kategori) dataInMap[itm.kode] = (dataInMap[itm.kode] || 0) + parseInt(itm.qty || 0);
                    }
                }
            });
        });
    }
    if (data.OUT) {
        Object.keys(data.OUT).forEach(id => {
            const b = data.OUT[id];
            let kat = (b.kategori || "").toUpperCase();
            Object.keys(b).forEach(k => {
                if (k !== "tanggal" && k !== "buyer" && k !== "tujuan" && k !== "kategori" && k !== "timestamp" && k !== "tipe") {
                    const itm = b[k];
                    if (itm && itm.kode) {
                        if (!kat) kat = itm.kode.startsWith("PUXR") ? "PUXR" : "MEXA";
                        if (kat === kategori) dataOutMap[itm.kode] = (dataOutMap[itm.kode] || 0) + parseInt(itm.qty || 0);
                    }
                }
            });
        });
    }

    const nodeCapital = kategori === "PUXR" ? "barang_export/SISA_PUXR" : "barang_export/SISA_MEXA";
    const nodeLower = kategori === "PUXR" ? "barang_export/sisa_puxr" : "barang_export/sisa_mexa";

    if (sisaStokKey) {
        firebase.database().ref(`${nodeCapital}/${sisaStokKey}`).once("value", snap => {
            let sisaData = snap.val();
            if (!sisaData) {
                firebase.database().ref(`${nodeLower}/${sisaStokKey}`).once("value", snap2 => {
                    sisaData = snap2.val();
                    renderPreviewHTMLContent(previewPaper, filteredMasuk, masterItems, dataInMap, dataOutMap, sisaData, tglMulai, tglSelesai, kategori, isCodeMatchFilter);
                });
            } else {
                renderPreviewHTMLContent(previewPaper, filteredMasuk, masterItems, dataInMap, dataOutMap, sisaData, tglMulai, tglSelesai, kategori, isCodeMatchFilter);
            }
        });
    } else {
        renderPreviewHTMLContent(previewPaper, filteredMasuk, masterItems, dataInMap, dataOutMap, null, tglMulai, tglSelesai, kategori, isCodeMatchFilter);
    }
};

function renderPreviewHTMLContent(container, filteredMasuk, masterItems, dataInMap, dataOutMap, sisaData, tglMulai, tglSelesai, kategori, isCodeMatchFilter) {
    const tglMulaiFmt = formatDateIndo(tglMulai);
    const tglSelesaiFmt = formatDateIndo(tglSelesai);
    const sisaTglFmt = sisaData && sisaData.tanggal ? formatDateIndo(sisaData.tanggal) : 'Pilih Tanggal';

    let html = `
        <style>
            .preview-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
            .preview-table th, .preview-table td { border: 1px solid #1e293bc4; padding: 3px 5px; text-align: left; }
            .preview-table th { background-color: #f1f5f9; text-transform: uppercase; font-size: 11px; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .section-box { font-weight: bold; font-size: 11px; margin-bottom: 4px; background: #cbd5e1d8; padding: 3px 5px; border: 1px solid #1e293b; text-transform: uppercase; }
        </style>

        <h2 style="text-align: center; margin-bottom: 2px; text-transform: uppercase; font-size: 14px; font-weight: bold;">LAPORAN STOK EXPORT ${kategori}</h2>
        <div style="text-align: center; margin-bottom: 10px; font-size: 11px; font-weight: bold; color: #334155;">Periode Stok: ${tglMulaiFmt} s/d ${tglSelesaiFmt}</div>

        <div style="display: flex; gap: 12px; width: 100%;">
            <!-- SEBELAH KIRI: RIWAYAT MASUK -->
            <div style="width: 48%;">
                <div class="section-box">DATA STOK MASUK (IN)</div>
                <table class="preview-table">
                    <thead>
                        <tr>
                            <th>TANGGAL MASUK</th>
                            <th>No. Bukti</th>
                            <th>Kode</th>
                            <th class="text-center">Qty</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    if (filteredMasuk.length === 0) {
        html += `<tr><td colspan="4" class="text-center italic" style="padding: 10px;">Tidak ada data masuk pada rentang tanggal tersebut</td></tr>`;
    } else {
        filteredMasuk.forEach(item => {
            html += `
                <tr>
                    <td>${item.tanggal}</td>
                    <td>${item.pin}</td>
                    <td class="font-bold">${item.kode}</td>
                    <td class="text-center">${item.qty.toLocaleString('id-ID')}</td>
                </tr>
            `;
        });
    }

    html += `
                    </tbody>
                </table>
            </div>

            <!-- SEBELAH KANAN: REKAP STOK (KODE, AKHIR, PLT/BEC) & SISA STOK -->
            <div style="width: 48%;">
                <div class="section-box">REKAP STOK TERSEDIA</div>
                <table class="preview-table">
                    <thead>
                        <tr>
                            <th>Kode Barang</th>
                            <th class="text-center">Stok Akhir</th>
                            <th class="text-center">Palet / Beceran</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    masterItems.forEach(master => {
        const kode = master.kode;
        const totalIn = dataInMap[kode] || 0;
        const totalOut = dataOutMap[kode] || 0;
        const stokAkhir = totalIn - totalOut;
        const pltKrt = master.pltKrt || 153;
        const jumlahPlt = Math.floor(stokAkhir / pltKrt);
        const sisaKrt = stokAkhir % pltKrt;
        const formatPltBec = stokAkhir !== 0 ? `${jumlahPlt} Plt / ${sisaKrt > 0 ? sisaKrt + ' Krt' : ''}` : '-';

        html += `
            <tr>
                <td class="font-bold">${kode}</td>
                <td class="text-center font-bold">${stokAkhir !== 0 ? stokAkhir.toLocaleString('id-ID') : '-'}</td>
                <td class="text-center">${formatPltBec}</td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>

                <div class="section-box">CATATAN SISA STOK PER TANGGAL ${sisaTglFmt}</div>
                <table class="preview-table">
                    <thead>
                        <tr>
                            <th>Kode Barang</th>
                            <th class="text-right">Qty Sisa</th>
                            <th class="text-center">Palet / Beceran</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    if (!sisaData) {
        html += `<tr><td colspan="3" class="text-center italic" style="padding: 8px;">Belum ada data sisa stok yang dipilih</td></tr>`;
    } else {
        let hasItem = false;
        Object.keys(sisaData).forEach(k => {
            if (k !== "tanggal" && k !== "kategori" && k !== "timestamp") {
                const det = sisaData[k];
                if (det && det.kode && (det.qty_sisa || 0) > 0 && isCodeMatchFilter(det.kode)) {
                    hasItem = true;
                    html += `
                        <tr>
                            <td class="font-bold">${det.kode}</td>
                            <td class="text-right font-bold">${(det.qty_sisa || 0).toLocaleString('id-ID')} Krt</td>
                            <td class="text-center">${det.plt_bec || '-'}</td>
                        </tr>
                    `;
                }
            }
        });
        if (!hasItem) {
            html += `<tr><td colspan="3" class="text-center italic" style="padding: 8px;">Tidak ada sisa stok > 0 pada catatan ini</td></tr>`;
        }
    }

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// --- FUNGSI KIRIM KE PRINT JOBS FIREBASE ---
window.kirimCetakKePrintJobs = async function() {
    const kategori = (window.selectedKategoriExport || "MEXA").toUpperCase();
    const previewEl = document.getElementById('print-preview-paper');
    if (!previewEl) {
        miuiAlert("Area preview tidak ditemukan!");
        return;
    }

    const now = new Date();
    const daftarHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const hari = daftarHari[now.getDay()];
    
    const tgl = String(now.getDate()).padStart(2, '0');
    const blnIndex = now.getMonth();
    const thn = now.getFullYear();
    
    const namaBulan = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const bulan = namaBulan[blnIndex];

    const jam = String(now.getHours()).padStart(2, '0');
    const menit = String(now.getMinutes()).padStart(2, '0');
    const detik = String(now.getSeconds()).padStart(2, '0');
    
    const formatWaktuLengkap = `${hari}, ${tgl} ${bulan} ${thn} ${jam}.${menit}.${detik}`;

    const htmlIsi = previewEl.innerHTML;

    const finalHtml = `
    <html>
    <head>
        <title>Cetak Laporan Stok Export ${kategori}</title>
        <style>
            @page { 
                size: 210mm 330mm portrait; 
                margin: 10mm 5mm 5mm 5mm; 
                @bottom-right {
                    content: "Halaman " counter(page) " dari " counter(pages);
                    font-family: Arial, sans-serif;
                    font-size: 8pt;
                    color: #000;
                }
            }
            body { 
                font-family: Arial, sans-serif; 
                font-size: 12pt; 
                margin: 0; 
                padding: 0; 
                color: #000; 
            }
            .sub-header { 
                margin-bottom: 10px; 
                font-size: 8pt; 
                text-align: right;
            }
        </style>
    </head>
    <body>
        <div class="sub-header">Dicetak pada: ${formatWaktuLengkap}</div>
        ${htmlIsi}
    </body>
    </html>`;

    const judulTugas = `Cetak Stok Export ${kategori}`;
    const safeKeyName = `Export_${kategori}_${tgl}-${String(blnIndex + 1).padStart(2, '0')}-${thn}_${jam}-${menit}-${detik}`;

    try {
        await fetch(`https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/print_jobs/${safeKeyName}.json`, {
            method: 'PUT',
            body: JSON.stringify({ 
                judul: judulTugas,
                waktu_teks: formatWaktuLengkap,
                html: finalHtml, 
                status: 'PENDING',
                timestamp: Date.now() 
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        
        miuiAlert("Perintah cetak berhasil dikirim ke Print Server (Firebase)!");
        tutupModalCetak();
    } catch (error) {
        miuiAlert("Gagal mengirim perintah cetak: " + error.message);
    }
};