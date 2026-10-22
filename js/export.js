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
            
            // Ambil kategori dari level utama batch, jika kosong deteksi dari item pertamanya
            let kategoriBatch = (batch.kategori || "").toUpperCase();

            Object.keys(batch).forEach(key => {
                if (key !== "tanggal" && key !== "no_bukti" && key !== "kategori" && key !== "timestamp" && key !== "tipe") {
                    const item = batch[key];
                    if (item && item.kode) {
                        // Fallback deteksi dari awalan kode jika kategori batch belum ada
                        let currentKat = kategoriBatch;
                        if (!currentKat) {
                            currentKat = item.kode.startsWith("PUXR") ? "PUXR" : "MEXA";
                        }

                        // Filter ketat berdasarkan kategori yang sedang aktif dibuka
                        if (currentKat === targetKategori) {
                            listRiwayatMasuk.push({
                                tglPin: tglPin,
                                kode: item.kode,
                                qty: item.qty,
                                batchId: batchId,
                                childKey: key
                            });

                            dataInMap[item.kode] = (dataInMap[item.kode] || 0) + parseInt(item.qty || 0);
                        }
                    }
                }
            });
        });
    }

    // Parsing Data OUT
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

// --- RENDER TABEL RIWAYAT INPUT MASUK ---
function renderRiwayatMasuk(riwayatList) {
    const tbody = document.getElementById("table-riwayat-masuk-export");
    if (!tbody) return;

    if (riwayatList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-slate-400 italic">Belum ada riwayat tersimpan</td></tr>`;
        return;
    }

    let html = "";
    // Urutkan dari yang terbaru (berdasarkan urutan array)
    riwayatList.reverse().forEach((row) => {
        html += `
            <tr class="hover:bg-slate-50">
                <td class="p-1.5 px-2 font-bold text-slate-700">${row.tglPin}</td>
                <td class="p-1.5 px-2 font-semibold text-emerald-700">${row.kode}</td>
                <td class="p-1.5 px-2 text-center font-bold text-slate-800">${row.qty}</td>
                <td class="p-1.5 px-2 text-center">
                    <button onclick="hapusItemRiwayatMasuk('${row.batchId}', '${row.childKey}')" class="text-red-500 hover:text-red-700 font-bold" title="Hapus Item"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
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

// --- HAPUS ITEM RIWAYAT MASUK DARI RTDB ---
window.hapusItemRiwayatMasuk = function(batchId, childKey) {
    if (confirm("Apakah Anda yakin ingin menghapus item riwayat masuk ini?")) {
        firebase.database().ref(`barang_export/IN/${batchId}/${childKey}`).remove()
            .then(() => {
                alert("Item riwayat berhasil dihapus!");
            })
            .catch(error => {
                alert("Gagal menghapus: " + error.message);
            });
    }
};