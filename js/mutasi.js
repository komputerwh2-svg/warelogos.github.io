// Buka Modal Database Manager & Auto Pilih Tanggal Terbaru
window.openDatabaseManagerModal = async function() {
    const modal = document.getElementById('modal-db-manager');
    const selectTgl = document.getElementById('db-select-tanggal');
    if (!modal || !selectTgl) return;

    modal.classList.remove('hidden');
    selectTgl.innerHTML = '<option value="">Memuat daftar tanggal...</option>';
    document.getElementById('db-node-details-container').innerHTML = '<p class="text-slate-500 italic text-center py-10">Pilih tanggal terlebih dahulu...</p>';

    try {
        const snapshot = await firebase.database().ref('muat_fdn').once('value');
        selectTgl.innerHTML = '<option value="">-- Pilih Tanggal Database --</option>';

        if (snapshot.exists()) {
            const dataObj = snapshot.val();
            // Urutkan tanggal dari yang terbaru (descending)
            const dates = Object.keys(dataObj).sort((a, b) => b.localeCompare(a));

            dates.forEach(dateId => {
                const thn = dateId.substring(0, 4);
                const bln = dateId.substring(4, 6);
                const tgl = dateId.substring(6, 8);
                const formatted = `${tgl}-${bln}-${thn}`;

                let opt = document.createElement('option');
                opt.value = dateId;
                opt.textContent = `${formatted} (ID: ${dateId})`;
                selectTgl.appendChild(opt);
            });

            // Otomatis pilih dan muat tanggal terbaru jika datanya ada
            if (dates.length > 0) {
                selectTgl.value = dates[0];
                loadDatabaseNodeDetails(); // Langsung muat rincian data tanggal terbaru
            }
        } else {
            selectTgl.innerHTML = '<option value="">Tidak ada data di muat_fdn</option>';
        }
    } catch (error) {
        console.error("Gagal memuat tanggal database:", error);
        selectTgl.innerHTML = '<option value="">Error memuat data</option>';
    }
};

// Tutup Modal Database Manager
window.closeDatabaseManagerModal = function() {
    const modal = document.getElementById('modal-db-manager');
    if (modal) modal.classList.add('hidden');
};

// Muat Rincian Node RTDB Berdasarkan Tanggal yang Dipilih
window.loadDatabaseNodeDetails = async function() {
    const selectTgl = document.getElementById('db-select-tanggal');
    const container = document.getElementById('db-node-details-container');
    const dateId = selectTgl?.value;

    if (!dateId) {
        container.innerHTML = '<p class="text-slate-500 italic text-center py-10">Pilih tanggal terlebih dahulu untuk melihat isi node database...</p>';
        return;
    }

    container.innerHTML = '<p class="text-slate-500 italic text-center py-10">Memuat rincian node dari RTDB...</p>';

    try {
        const dateRef = firebase.database().ref(`muat_fdn/${dateId}`);
        const snapshot = await dateRef.once('value');

        if (!snapshot.exists()) {
            container.innerHTML = '<p class="text-red-500 text-center py-10">Data untuk tanggal ini kosong atau sudah terhapus.</p>';
            return;
        }

        const dataNode = snapshot.val();
        const ambilRakCount = dataNode.ambilrak ? Object.keys(dataNode.ambilrak).length : 0;
        const dataTujuanCount = dataNode.datatujuan ? Object.keys(dataNode.datatujuan).length : 0;

        let html = `
            <div class="space-y-3">
                <div class="bg-white p-3 rounded border border-slate-200 space-y-2">
                    <div class="flex justify-between items-center border-b border-slate-100 pb-2">
                        <div>
                            <span class="font-bold text-slate-800">Tanggal ID:</span> <span class="text-orange-600 font-bold">${dateId}</span><br>
                            <span class="text-slate-700">• Jumlah Data Ambil Rak: <b>${ambilRakCount} item</b></span>
                        </div>
                        <div>
                            <button onclick="confirmDeleteNodeData('${dateId}', 'ambilrak', 'Data Ambil Rak')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded font-bold shadow-xs transition text-[11px]">
                                🗑️ Hapus Data Rak
                            </button>
                        </div>
                    </div>

                    <div class="flex justify-between items-center pt-1">
                        <div>
                            <span class="text-slate-700">• Jumlah Data Tujuan FDN: <b>${dataTujuanCount} dokumen</b></span>
                        </div>
                        <div>
                            <button onclick="confirmDeleteNodeData('${dateId}', 'datatujuan', 'Data FDN')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded font-bold shadow-xs transition text-[11px]">
                                🗑️ Hapus Data Fdn
                            </button>
                        </div>
                    </div>
                </div>

                <div class="border-t border-slate-200 pt-2">
                    <h5 class="font-bold text-slate-700 mb-1">Rincian Dokumen Tujuan:</h5>
                    <div class="max-h-40 overflow-y-auto bg-white p-2 rounded border border-orange-200 space-y-1 miui-custom-scroll">
        `;

        if (dataNode.datatujuan) {
            Object.keys(dataNode.datatujuan).forEach(tujuanKey => {
                const item = dataNode.datatujuan[tujuanKey];
                const meta = item.meta || {};
                html += `<div class="text-[11px] border-b border-slate-100 pb-1 flex justify-between">
                    <span><b>${meta.nomor_dokumen || tujuanKey}</b> → ${meta.tujuan || '-'} (${meta.tipe || 'UTAMA'})</span>
                    <button onclick="confirmDeleteFdnDoc('${dateId}', '${tujuanKey}')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded font-bold">🗑️ Hapus</button>
                </div>`;
            });
        } else {
            html += `<p class="text-slate-400 italic">Tidak ada data datatujuan.</p>`;
        }

        html += `
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

    } catch (error) {
        console.error("Gagal memuat rincian node RTDB:", error);
        container.innerHTML = '<p class="text-red-500 text-center py-10">Terjadi kesalahan saat memuat rincian database.</p>';
    }
};

// Helper Global untuk miuiConfirm Kustom Anda
window.miuiConfirmCustom = function(message, onYes) {
    const alertBox = document.getElementById('modal-miuiAlert') || document.getElementById('miui-global-miuiAlert');
    const msgEl = document.getElementById('miui-miuiAlert-message');
    const containerOk = document.getElementById('miui-container-ok');
    const containerConfirm = document.getElementById('miui-container-confirm');
    const btnYa = document.getElementById('miui-btn-ya');
    const btnTidak = document.getElementById('miui-btn-tidak');

    if (!alertBox || !msgEl) {
        // Fallback ke confirm browser jika elemen tidak ditemukan
        if (confirm(message)) onYes();
        return;
    }

    msgEl.textContent = message;
    containerOk.classList.add('hidden');
    containerConfirm.classList.remove('hidden');
    alertBox.classList.remove('hidden');

    // Bersihkan event listener sebelumnya agar tidak menumpuk
    const newBtnYa = btnYa.cloneNode(true);
    const newBtnTidak = btnTidak.cloneNode(true);
    btnYa.parentNode.replaceChild(newBtnYa, btnYa);
    btnTidak.parentNode.replaceChild(newBtnTidak, btnTidak);

    newBtnYa.addEventListener('click', function() {
        alertBox.classList.add('hidden');
        if (typeof onYes === 'function') onYes();
    });

    newBtnTidak.addEventListener('click', function() {
        alertBox.classList.add('hidden');
    });
};

// Konfirmasi & Hapus Node Spesifik (ambilrak / datatujuan) - Memanggil initMutasi()
window.confirmDeleteNodeData = function(dateId, nodeName, labelName) {
    miuiConfirmCustom(`Yakin ingin menghapus seluruh ${labelName} untuk tanggal ${dateId}?`, function() {
        firebase.database().ref(`muat_fdn/${dateId}/${nodeName}`).remove()
            .then(() => {
                if (typeof window.miuiAlert === 'function') {
                    window.miuiAlert(`${labelName} berhasil dihapus!`);
                }
                
                // Inisialisasi ulang seluruh modul mutasi agar dropdown & preview ikut ter-refresh total
                if (typeof window.initMutasi === 'function') {
                    window.initMutasi();
                } else if (typeof window.modalLoadDataBulanDanTanggal === 'function') {
                    window.modalLoadDataBulanDanTanggal();
                }
                
                // Refresh rincian di modal database manager
                if (typeof window.loadDatabaseNodeDetails === 'function') {
                    window.loadDatabaseNodeDetails();
                }
            })
            .catch((err) => {
                if (typeof window.miuiAlert === 'function') {
                    window.miuiAlert("Gagal menghapus: " + err.message);
                } else {
                    alert("Gagal menghapus: " + err.message);
                }
            });
    });
};

// Konfirmasi & Hapus Satu Dokumen FDN - Memanggil initMutasi()
window.confirmDeleteFdnDoc = function(dateId, docKey) {
    miuiConfirmCustom(`Yakin ingin menghapus dokumen FDN (${docKey}) ini dari database?`, function() {
        firebase.database().ref(`muat_fdn/${dateId}/datatujuan/${docKey}`).remove()
            .then(() => {
                if (typeof window.miuiAlert === 'function') {
                    window.miuiAlert("Dokumen FDN berhasil dihapus!");
                }
                
                // Inisialisasi ulang seluruh modul mutasi agar dropdown & preview ikut ter-refresh total
                if (typeof window.initMutasi === 'function') {
                    window.initMutasi();
                } else if (typeof window.modalLoadDataBulanDanTanggal === 'function') {
                    window.modalLoadDataBulanDanTanggal();
                }
                
                // Refresh rincian di modal database manager
                if (typeof window.loadDatabaseNodeDetails === 'function') {
                    window.loadDatabaseNodeDetails();
                }
            })
            .catch((err) => {
                if (typeof window.miuiAlert === 'function') {
                    window.miuiAlert("Gagal menghapus: " + err.message);
                } else {
                    alert("Gagal menghapus: " + err.message);
                }
            });
    });
};


// Variabel global untuk menyimpan data FDN yang valid
let globalDataFdn = [];

window.loadDataBulanDanTanggal = async function() {
    const selectBulan = document.getElementById('select-periode-bulan');
    const selectTgl = document.getElementById('input-tgl-muat');
    const rtdb = firebase.database(); // Gunakan instance RTDB

    if (!selectBulan || !selectTgl) return;

    selectBulan.innerHTML = '<option value="">Memuat Bulan...</option>';
    selectTgl.innerHTML = '<option value="">Pilih Tanggal...</option>';

    try {
        console.log("Membaca data tanggal dari node muat_fdn di Realtime Database");
        const snapshot = await rtdb.ref('muat_fdn').once('value');
        
        if (!snapshot.exists()) {
            console.log("Tidak ada data FDN ditemukan di RTDB.");
            selectBulan.innerHTML = '<option value="">Tidak ada data bulan</option>';
            selectTgl.innerHTML = '<option value="">Pilih Tanggal</option>';
            return;
        }

        const muatFdnData = snapshot.val();
        globalDataFdn = [];
        let bulanSet = new Set();
        let tanggalSet = new Set();
        const namaBulan = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];

        // Iterasi tanggal (key utama di bawah muat_fdn, contoh: "20261012")
        Object.keys(muatFdnData).forEach(tglId => {
            const tanggalNode = muatFdnData[tglId];
            const dataTujuan = tanggalNode.datatujuan || {};

            // Iterasi dokumen tujuan di dalam tanggal tersebut
            Object.keys(dataTujuan).forEach(tujuanKey => {
                const docData = dataTujuan[tujuanKey];
                const tglStr = docData && docData.meta ? docData.meta.tanggal : null;

                if (tglStr && typeof tglStr === 'string' && tglStr.includes('/')) {
                    const parts = tglStr.split('/');
                    if (parts.length === 3) {
                        let hari = parts[0]; 
                        let angkaBulan = parts[1]; 
                        let tahun = parts[2]; 

                        if (!tanggalSet.has(tglId)) {
                            tanggalSet.add(tglId);

                            let bulanIndex = parseInt(angkaBulan, 10) - 1;
                            if (bulanIndex >= 0 && bulanIndex < 12) {
                                let namaBulanStr = `${namaBulan[bulanIndex]} ${tahun}`; 
                                let bulanKey = `${tahun}-${angkaBulan}`; 
                                let formattedDate = `${hari}-${angkaBulan}-${tahun}`; 

                                bulanSet.add(JSON.stringify({ key: bulanKey, name: namaBulanStr }));

                                globalDataFdn.push({
                                    raw: tglId,           // "20261012"
                                    bulanKey: bulanKey,   // "2026-10"
                                    formatted: formattedDate // "12-10-2026"
                                });
                            }
                        }
                    }
                }
            });
        });

        console.log("Total tanggal unik ditemukan di RTDB:", globalDataFdn.length);

        if (globalDataFdn.length === 0) {
            selectBulan.innerHTML = '<option value="">Tidak ada data bulan</option>';
            selectTgl.innerHTML = '<option value="">Pilih Tanggal</option>';
            return;
        }

        // Urutkan data dari yang terbaru (Descending)
        globalDataFdn.sort((a, b) => b.raw.localeCompare(a.raw));

        let listBulan = Array.from(bulanSet).map(item => JSON.parse(item));
        listBulan.sort((a, b) => b.key.localeCompare(a.key));

        // Render Dropdown Bulan
        selectBulan.innerHTML = '<option value="">Pilih Bulan...</option>';
        listBulan.forEach(b => {
            let opt = document.createElement('option');
            opt.value = b.key;
            opt.textContent = b.name;
            selectBulan.appendChild(opt);
        });

        // Set default ke bulan aktif saat ini jika ada, atau ambil yang teratas
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
        const currentBulanKey = `${currentYear}-${currentMonth}`;

        const foundCurrentMonth = listBulan.find(b => b.key === currentBulanKey);
        if (foundCurrentMonth) {
            selectBulan.value = currentBulanKey;
        } else if (listBulan.length > 0) {
            selectBulan.value = listBulan[0].key;
        }

        // Panggil filter tanggal berdasarkan bulan yang terpilih
        if (typeof window.filterTanggalByBulan === 'function') {
            window.filterTanggalByBulan();
        }

    } catch (error) {
        console.error("Gagal memuat data dari RTDB:", error);
        selectBulan.innerHTML = '<option value="">Error Memuat Data</option>';
    }
};

// 1. Perbarui fungsi onTanggalMuatChange agar memanggil renderDaftarFdnToPreview
window.onTanggalMuatChange = async function(tglId) {
    if (!tglId) return;
    console.log("Tanggal Muat dipilih:", tglId);
    
    // 1. Render preview FDN
    if (typeof renderDaftarFdnToPreview === 'function') {
        await renderDaftarFdnToPreview(tglId);
    }
    
    // 2. Render atau muat data ambilrak dari Firestore sesuai tanggal terpilih
    if (typeof loadDataAmbilRak === 'function') {
        loadDataAmbilRak();
    }

    // 3. Isi dropdown kode barang berdasarkan FDN tanggal aktif
    if (typeof populateMutasiKodeDropdown === 'function') {
        await populateMutasiKodeDropdown(tglId);
    }
    
    // 3. Jika ada fungsi lain untuk render tabel gabungan
    if (typeof window.renderTabelGabungan === 'function') {
        await window.renderTabelGabungan(tglId);
    }
};

// 2. Pastikan saat filter tanggal diubah, nilai value-nya adalah 'YYYYMMDD' (tglId)
window.filterTanggalByBulan = function() {
    const selectBulan = document.getElementById('select-periode-bulan');
    const selectTgl = document.getElementById('input-tgl-muat');
    
    if (!selectBulan || !selectTgl) return;

    const selectedBulanKey = selectBulan.value; // Contoh: "2026-09"
    selectTgl.innerHTML = '<option value="">Pilih Tanggal...</option>';

    if (!selectedBulanKey) return;

    const filteredDates = globalDataFdn.filter(item => item.bulanKey === selectedBulanKey);

    if (filteredDates.length === 0) {
        selectTgl.innerHTML = '<option value="">Tidak ada tanggal</option>';
        return;
    }

    filteredDates.forEach(item => {
        let opt = document.createElement('option');
        opt.value = item.raw; // item.raw ini berisi "20260926" (dateId)
        opt.textContent = item.formatted; // Tampilan "26-09-2026"
        selectTgl.appendChild(opt);
    });

    // Otomatis pilih tanggal pertama dan trigger perubahannya
    if (filteredDates.length > 0) {
        selectTgl.value = filteredDates[0].raw;
        if (typeof window.onTanggalMuatChange === 'function') {
            window.onTanggalMuatChange(selectTgl.value);
        }
    }
};

// Event Listener
document.addEventListener('DOMContentLoaded', () => {
    const selectBulan = document.getElementById('select-periode-bulan');
    if (selectBulan) {
        selectBulan.addEventListener('change', window.filterTanggalByBulan);
    }
    const selectTgl = document.getElementById('input-tgl-muat');
    if (selectTgl) {
        selectTgl.addEventListener('change', function() {
            window.onTanggalMuatChange(this.value);
        });
    }
});

// Inisialisasi Otomatis saat Modul Mutasi Dibuka
window.initMutasi = async function() {
    try {
        if (typeof window.loadDataBulanDanTanggal === 'function') {
            await window.loadDataBulanDanTanggal();
        }

        console.log("Modul Mutasi berhasil diinisialisasi menggunakan meta.tanggal.");
        
        if (typeof window.refreshWmsData === 'function') {
            refreshWmsData();
        }
    } catch (error) {
        console.error("Gagal menginisialisasi Modul Mutasi:", error);
    }
};

// Array global untuk menyimpan data cache
let wmsGlobalData = [];
let listRakMutasiTemp = [];

// Fungsi untuk merender data dengan dukungan filter pencarian real-time dan Rak No
function filterWmsReportData() {
    const tbody = document.getElementById('tabel-wms-report-body');
    if (!tbody) return;

    if (!wmsGlobalData || wmsGlobalData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400 italic">Tidak ada data stok.</td></tr>`;
        return;
    }

    // Ambil nilai dari input filter di HTML
    const keywordRak = document.getElementById('filter-kode-rak')?.value.trim().toUpperCase() || '';
    const keywordBarang = document.getElementById('filter-kode-barang')?.value.trim().toUpperCase() || '';
    const keywordRakNo = document.getElementById('filter-rak-no')?.value.trim() || '';

    // Salin data sebelum diurutkan agar data global tetap aman
    let sortedData = [...wmsGlobalData];

    // --- LOGIKA PENGURUTAN (SORTING) ---
    sortedData.sort((a, b) => {
        const stokA = Number(a.QTY_STOK ?? a.STOK ?? a.stok ?? 0);
        const stokB = Number(b.QTY_STOK ?? b.STOK ?? b.stok ?? 0);

        // 1. Urutkan berdasarkan stok terkecil ke terbesar
        if (stokA !== stokB) {
            return stokA - stokB;
        }

        // 2. Jika stok sama, urutkan berdasarkan expdate terdekat ke terlama
        const expA = a.EXPDATE || a.expdate || '9999-12-31';
        const expB = b.EXPDATE || b.expdate || '9999-12-31';
        return expA.localeCompare(expB);
    });

    // Filter data sesuai input pengguna dari data yang sudah terurut
    const filteredData = sortedData.filter(item => {
        const kodeLokasi = String(item.LOKASI_PALET || item.KODE_LOKASI || item.kode_lokasi || '').trim().toUpperCase();
        const kodeBarang = String(item.KODE || item.kode || '').toUpperCase();

        const matchRak = kodeLokasi.includes(keywordRak);
        const matchBarang = kodeBarang.includes(keywordBarang);
        
        let matchRakNo = true;
        if (keywordRakNo) {
            const regex = new RegExp(`^\\s*${keywordRakNo}\\b`, 'i');
            matchRakNo = regex.test(kodeLokasi);
        }

        return matchRak && matchBarang && matchRakNo;
    });

    if (filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400 italic">Data tidak ditemukan sesuai filter.</td></tr>`;
        return;
    }

    let html = '';
    filteredData.slice(0, 100).forEach((item, index) => {
        const lok = item.LOKASI_PALET || item.KODE_LOKASI || item.kode_lokasi || '-';
        const kode = item.KODE || item.kode || '-';
        const stok = item.QTY_STOK ?? item.STOK ?? item.stok ?? 0;
        const exp = item.EXPDATE || item.expdate || '-';

        // Tambahkan event onclick pada baris tabel untuk mengisi form di kiri secara otomatis
        html += `
            <tr class="border-b hover:bg-orange-50 cursor-pointer transition text-xs" onclick="pilihRakWms('${lok}', ${stok})">
                <td class="p-2 border text-center font-semibold text-slate-500">${index + 1}</td>
                <td class="p-2 border font-semibold text-orange-700">${lok}</td>
                <td class="p-2 border font-bold text-orange-600">${kode}</td>
                <td class="p-2 border text-center text-slate-700 font-bold">${stok}</td>
                <td class="p-2 border text-center text-slate-500">${exp}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Variabel global untuk menyimpan snapshot data sebelumnya guna perbandingan perubahan
let previousWmsDataSnapshot = [];

async function refreshWmsData() {
    const updateLabel = document.getElementById('wms-last-update');
    const badge = document.getElementById('firebase-badge');
    const tbody = document.getElementById('tabel-wms-report-body');
    
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400 italic">Memuat data terbaru dari Firebase...</td></tr>`;
    }
    
    if (badge) {
        badge.className = "bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-semibold";
        badge.innerText = "Firebase: Memuat...";
    }

    try {
        const rtdbUrl = 'https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/stok_cache.json?t=' + new Date().getTime();
        const response = await fetch(rtdbUrl);
        
        if (!response.ok) {
            throw new Error('Gagal terhubung ke Firebase RTDB.');
        }
        
        const jsonResponse = await response.json();
        
        if (!jsonResponse) {
            wmsGlobalData = [];
        } else {
            const rawData = jsonResponse.data || jsonResponse;
            const serverSyncTime = jsonResponse.meta?.last_sync ? jsonResponse.meta.last_sync.substring(11, 19) : '-';
            const totalItemsServer = jsonResponse.meta?.total_items || (Array.isArray(rawData) ? rawData.length : Object.values(rawData).length);
            
            if (Array.isArray(rawData)) {
                wmsGlobalData = rawData;
            } else {
                wmsGlobalData = Object.values(rawData);
            }

            // --- LOGIKA PENGECEKAN PERUBAHAN DATA SECARA RINCI (LOKASI & QTY STOK) ---
            let isDataChanged = false;
            if (previousWmsDataSnapshot.length > 0) {
                if (previousWmsDataSnapshot.length !== wmsGlobalData.length) {
                    isDataChanged = true;
                } else {
                    // Cek perubahan isi detail per item (membandingkan Lokasi Palet & Qty Stok)
                    for (let i = 0; i < wmsGlobalData.length; i++) {
                        const curr = wmsGlobalData[i];
                        const prev = previousWmsDataSnapshot[i];
                        
                        const currLoc = curr.LOKASI_PALET || curr.kode_lokasi || '';
                        const prevLoc = prev.LOKASI_PALET || prev.kode_lokasi || '';
                        const currQty = curr.QTY_STOK ?? curr.STOK ?? 0;
                        const prevQty = prev.QTY_STOK ?? prev.STOK ?? 0;

                        if (currLoc !== prevLoc || currQty !== prevQty) {
                            isDataChanged = true;
                            break;
                        }
                    }
                }
            }
            
            // Simpan snapshot data saat ini untuk perbandingan berikutnya
            previousWmsDataSnapshot = JSON.parse(JSON.stringify(wmsGlobalData));

            filterWmsReportData();

            // Waktu lokal saat browser menarik data
            const now = new Date();
            const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateString = now.toLocaleDateString('id-ID');

            // 1. Label di bawah tabel: Menampilkan waktu lokal, total item dari server, dan status validasi perubahan
            if (updateLabel) {
                let statusPerubahanHTML = isDataChanged 
                    ? `<span class="text-amber-600 font-bold ml-1">⚠️ [Ada Perubahan Stok/Lokasi]</span>` 
                    : `<span class="text-emerald-600 ml-1">✓ (Data Stabil / Sesuai)</span>`;
                
                updateLabel.innerHTML = `Update Data WMS Terakhir: ${dateString} ${timeString} | Total Sinkron: ${totalItemsServer} Item ${statusPerubahanHTML}`;
            }

            // 2. Badge Firebase di kanan atas
            if (badge) {
                badge.className = "bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-semibold";
                badge.innerText = `Firebase: ${wmsGlobalData.length} Item (Pembaruan terakhir: ${serverSyncTime})`;
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-red-500 italic">Gagal memuat data dari Firebase.</td></tr>`;
        }
        if (badge) {
            badge.className = "bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-semibold";
            badge.innerText = "Gagal Terhubung";
        }
    }
}


// Fungsi utama untuk menangani banyak file yang dipilih sekaligus (Aman & Berurutan dengan Deteksi Batch Utama/Tambahan)
async function handleImportFdnFiles(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    let successCount = 0;
    let failCount = 0;
    let latestImportedDateId = null; 
    let batchTipe = null; // Penyeragaman tipe (UTAMA / TAMBAHAN) untuk satu batch import ini

    // Loop melalui setiap file yang dipilih secara berurutan dengan for...of
    for (const file of files) {
        try {
            const textContent = await readFileAsync(file);

            // Jika ini adalah file pertama dalam batch, tentukan tanggal dan cek status database RTDB SEKALI SAJA
            if (!batchTipe) {
                // Ekstraksi tanggal singkat dari teks file pertama untuk cek database
                const matchTanggal = textContent.match(/TANGGAL\s*:\s*([0-9\/]+)/);
                if (matchTanggal) {
                    const [d, m, y] = matchTanggal[1].trim().split('/');
                    const targetDateId = `${y}${m}${d}`;
                    latestImportedDateId = targetDateId;

                    // Cek ke RTDB apakah node datatujuan di tanggal ini sudah ada isinya
                    const snapshot = await firebase.database().ref(`muat_fdn/${targetDateId}/datatujuan`).once('value');
                    if (snapshot.exists() && Object.keys(snapshot.val()).length > 0) {
                        batchTipe = "TAMBAHAN";
                    } else {
                        batchTipe = "UTAMA";
                    }
                    console.log(`[Batch Import] Deteksi tipe batch untuk tanggal ${targetDateId}: ${batchTipe}`);
                }
            }

            // Panggil fungsi parseAndSaveFdn dengan membawa parameter batchTipe yang seragam
            const parsedDateId = await parseAndSaveFdn(textContent, batchTipe);
            if (parsedDateId) {
                latestImportedDateId = parsedDateId;
            }
            successCount++;
        } catch (error) {
            console.error(`Gagal memproses file ${file.name}:`, error);
            failCount++;
        }
    }

    miuiAlert(`Proses Impor Selesai!\nTipe Batch: ${batchTipe || 'UTAMA'}\nBerhasil: ${successCount} file\nGagal: ${failCount} file`);

    // JIKA SEMUA FILE SELESAI DIIMPOR, BARU JALANKAN REFRESH UI SEKALI SAJA DI AKHIR
    if (latestImportedDateId) {
        // 1. Muat ulang data bulan dan tanggal
        if (typeof window.loadDataBulanDanTanggal === 'function') {
            await window.loadDataBulanDanTanggal();
        }

        // 2. Set nilai dropdown tanggal ke tanggal muat terbaru
        const selectTgl = document.getElementById('input-tgl-muat');
        if (selectTgl) {
            selectTgl.value = latestImportedDateId; 
        }

        // 3. Panggil event/fungsi render sekali saja di akhir
        if (typeof window.onTanggalMuatChange === 'function') {
            await window.onTanggalMuatChange(latestImportedDateId);
        } else if (typeof renderDaftarFdnToPreview === 'function') {
            await renderDaftarFdnToPreview(latestImportedDateId);
        }

        // 4. Perbarui dropdown kode mutasi secara bersih
        if (typeof populateMutasiKodeDropdown === 'function') {
            await populateMutasiKodeDropdown(latestImportedDateId);
        }
    }
    
    // Reset input file
    event.target.value = '';
}

// Helper untuk membaca file teks secara asinkron
function readFileAsync(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

// Fungsi parser dan penyimpanan FDN ke Firebase Realtime Database (RTDB) - Mendukung Forced Tipe (Batch)
async function parseAndSaveFdn(fileContent, forcedTipe = null) {
    const lines = fileContent.split('\n');
    let dariGudangRaw = '', nomorDokumen = '', tanggal = '', tujuanRaw = '';
    let items = [];

    // 1. Parsing Header dan Baris Item secara presisi
    lines.forEach(line => {
        if (line.includes('DARI GUDANG')) {
            const parts = line.split(':');
            if (parts.length > 1) dariGudangRaw = parts[1].trim().split(/\s{2,}/)[0];
        }
        
        if (line.includes('NOMOR DOKUMEN')) {
            const lastIndex = line.lastIndexOf('NOMOR DOKUMEN');
            const subStr = line.substring(lastIndex);
            const parts = subStr.split(':');
            if (parts.length > 1) {
                nomorDokumen = parts[1].trim().split(/\s{2,}/)[0];
            }
        }
        
        if (line.includes('TANGGAL')) {
            const match = line.match(/TANGGAL\s*:\s*([0-9\/]+)/);
            if (match) tanggal = match[1].trim();
        }
        
        if (line.includes('TUJUAN')) {
            const lastIndex = line.lastIndexOf('TUJUAN');
            const subStr = line.substring(lastIndex);
            const parts = subStr.split(':');
            if (parts.length > 1) {
                tujuanRaw = parts[1].trim().split(/\s{2,}/)[0].toUpperCase();
            }
        }

        // Parsing baris produk tabel (Dibuat lebih fleksibel menangkap format kuantitas terpisah spasi/slash)
        const trimmed = line.trim();
        // Gunakan regex yang lebih fleksibel untuk mendeteksi baris produk dengan kode berhuruf kecil/besar
        if (/^\d+\s+[a-zA-Z0-9\-_]+/.test(trimmed)) {
            const tokens = trimmed.split(/\s+/);
            if (tokens.length >= 2) {
                const qtyTokenIndex = tokens.findIndex(t => /^\d+\/\d+\/\d+\/\d+\$/.test(t) || (t.includes('/') && t.split('/').length === 4));
                
                if (qtyTokenIndex !== -1) {
                    // --- PERBAIKAN UTAMA: PAKSA KODE MENJADI UPPERCASE SECARA MUTLAK ---
                    const kode = tokens[1].trim().toUpperCase();
                    const qtyParts = tokens[qtyTokenIndex].split('/').map(Number);
                    
                    if (kode) {
                        items.push({
                            kode: kode,
                            qty_utama: qtyParts[0] || 0,
                            sub: {
                                bal: qtyParts[1] || 0,
                                rtg: qtyParts[2] || 0,
                                pcs: qtyParts[3] || 0
                            }
                        });
                    }
                }
            }
        }
    });

    console.log(`[Parser] Berhasil mendeteksi ${items.length} item produk dari file.`);

    if (!tanggal || !nomorDokumen || !tujuanRaw) {
        throw new Error("Format file FDN tidak valid atau header tidak lengkap.");
    }

    // 2. Format Gudang (WH-2 atau WH-3)
    let dariGudang = "WH-2";
    if (dariGudangRaw.includes("WH-2 HO NON WMS") || dariGudangRaw.includes("WH-3")) {
        dariGudang = "WH-3";
    }

    // 3. Format ID Tujuan
    let formattedTujuan = tujuanRaw.replace('STOCK POINT', 'SP').replace(/[^a-zA-Z0-9]/g, '_').trim();
    formattedTujuan = formattedTujuan.replace(/_+/g, '_');

    const docNumberDigits = nomorDokumen.replace(/\D/g, '');
    const last5Digits = docNumberDigits.slice(-5);
    const docIdTujuan = `${formattedTujuan}_${last5Digits}`;

    // 4. Format ID Tanggal (DD/MM/YYYY -> YYYYMMDD)
    const [d, m, y] = tanggal.split('/');
    const docIdTanggal = `${y}${m}${d}`;

    // Tentukan tipe FDN: gunakan forcedTipe jika diberikan dari batch, jika tidak lakukan cek otomatis
    let tipeFdn = forcedTipe;
    if (!tipeFdn) {
        const tanggalRef = firebase.database().ref(`muat_fdn/${docIdTanggal}`);
        const datatujuanRef = tanggalRef.child('datatujuan');
        const existingSnapshot = await datatujuanRef.once('value');
        
        tipeFdn = "UTAMA";
        if (existingSnapshot.exists() && Object.keys(existingSnapshot.val()).length > 0) {
            tipeFdn = "TAMBAHAN";
        }
    }

    // 5. Simpan ke Realtime Database (RTDB) dengan menyertakan tipe FDN di dalam meta
    const tujuanRef = firebase.database().ref(`muat_fdn/${docIdTanggal}/datatujuan/${docIdTujuan}`);

    await tujuanRef.set({
        meta: {
            dari_gudang: dariGudang,
            nomor_dokumen: nomorDokumen,
            tanggal: tanggal,
            tujuan: tujuanRaw,
            tipe: tipeFdn, // Menandai UTAMA atau TAMBAHAN secara konsisten dalam satu batch
            updated_at: new Date().toISOString()
        },
        data: items
    });

    console.log(`[RTDB] Sukses menyimpan FDN (${tipeFdn}) dengan ID: ${docIdTujuan} beserta ${items.length} item.`);
    return docIdTanggal;
}

// Fungsi untuk mengambil data dari RTDB node datatujuan dan menampilkannya ke #fdn-preview-text (Dengan dukungan Badge Tambahan)
async function renderDaftarFdnToPreview(dateId) {
    const previewContainer = document.getElementById('fdn-preview-text');
    if (!previewContainer) return;

    previewContainer.innerHTML = '<div class="text-slate-500 italic p-1">Memuat data FDN...</div>';

    // Elemen statistik
    const inputTotFdn = document.getElementById('tot-fdn');
    const inputTotTujuan = document.getElementById('tot-tujuan');
    const inputTotKeseluruhan = document.getElementById('tot-keseluruhan');

    try {
        // Ambil data dari RTDB: muat_fdn/{dateId}/datatujuan
        const tujuanRef = firebase.database().ref(`muat_fdn/${dateId}/datatujuan`);
        const snapshot = await tujuanRef.once('value');

        if (!snapshot.exists()) {
            previewContainer.innerHTML = '<div class="text-slate-900 shadow-sm">Belum ada data FDN diimport ditanggal ini...</div>';
            if (inputTotFdn) inputTotFdn.value = '0';
            if (inputTotTujuan) inputTotTujuan.value = '0';
            if (inputTotKeseluruhan) inputTotKeseluruhan.value = '0';
            return;
        }

        const dataTujuanObj = snapshot.val();
        let totalFdnCount = 0;
        let totalQtyKeseluruhan = 0;
        const uniqueTujuanSet = new Set();
        const groupedByTujuan = {};

        // Iterasi objek data dari RTDB
        Object.keys(dataTujuanObj).forEach(docId => {
            const data = dataTujuanObj[docId];
            const meta = data.meta || {};
            let tujuan = meta.tujuan || 'TANPA TUJUAN';
            
            // Singkat "STOCK POINT" menjadi "SP"
            tujuan = tujuan.replace('STOCK POINT', 'SP');
            uniqueTujuanSet.add(tujuan);

            const nomorDokumen = meta.nomor_dokumen || docId;
            const docIdRtdb = docId; 
            const gudang = meta.dari_gudang || 'WH-2';
            const tipeFdn = meta.tipe || 'UTAMA'; // Ambil tipe FDN (UTAMA / TAMBAHAN)
            
            // Hitung item & total qty_utama
            const items = data.data || [];
            const itemCount = items.length;
            
            items.forEach(item => {
                totalQtyKeseluruhan += Number(item.qty_utama || 0);
            });

            totalFdnCount++;

            if (!groupedByTujuan[tujuan]) {
                groupedByTujuan[tujuan] = {
                    tujuan: tujuan,
                    dokumenList: [],
                    docIdList: [], 
                    gudangSet: new Set(),
                    itemCounts: [],
                    hasTambahan: false // Indikator apakah ada dokumen tambahan di tujuan ini
                };
            }
            groupedByTujuan[tujuan].dokumenList.push({
                nomorDokumen: nomorDokumen,
                tipe: tipeFdn
            });
            groupedByTujuan[tujuan].docIdList.push(docIdRtdb);
            groupedByTujuan[tujuan].gudangSet.add(gudang);
            groupedByTujuan[tujuan].itemCounts.push(itemCount);

            if (tipeFdn === 'TAMBAHAN') {
                groupedByTujuan[tujuan].hasTambahan = true;
            }
        });

        // Update nilai ke 3 kotak statistik di bawah
        if (inputTotFdn) inputTotFdn.value = totalFdnCount;
        if (inputTotTujuan) inputTotTujuan.value = uniqueTujuanSet.size;
        if (inputTotKeseluruhan) inputTotKeseluruhan.value = totalQtyKeseluruhan;

        let htmlContent = '<div class="space-y-1">';
        let nomorUrut = 1;

        // Render hasil grouping ke dalam HTML preview dengan format ringkas & interaktif
        for (const key in groupedByTujuan) {
            const group = groupedByTujuan[key];
            
            // Ambil 5 digit terakhir dari setiap nomor dokumen dan format tampilannya
            const suffixes = group.dokumenList.map(docObj => {
                const doc = docObj.nomorDokumen;
                const digits = doc.replace(/\D/g, '');
                const suffix = digits.length >= 5 ? digits.slice(-5) : doc;
                
                // Jika dokumen berstatus TAMBAHAN, berikan badge khusus di samping nomor dokumen
                if (docObj.tipe === 'TAMBAHAN') {
                    return `${suffix} <span style="background-color: #ff9800; color: #fff; font-size: 8px; padding: 1px 3px; border-radius: 2px; font-weight: bold;">TAMBAHAN</span>`;
                }
                return suffix;
            });
            
            const formattedDoc = suffixes.join(' & ');

            // Format Gudang (misal: WH-2 atau WH-2 & WH-3)
            const gudangArr = Array.from(group.gudangSet);
            const gudangStr = gudangArr.length > 1 ? gudangArr.join(' & ') : (gudangArr[0] || 'WH-2');

            // Format rincian item (Contoh: 10 + 1 item)
            const itemCountStr = group.itemCounts.join(' + ');

            htmlContent += `
                <div onclick="openFdnDetailModalByTujuan('${dateId}', '${group.tujuan}')" 
                     class="flex justify-between items-center bg-orange-50 hover:bg-orange-100 cursor-pointer p-1 rounded border border-slate-200 transition shadow-xs">
                    <div>
                        <span class="font-bold text-slate-800">${nomorUrut}.</span> 
                        <span class="font-semibold text-orange-700">${formattedDoc}</span> 
                        <span class="text-slate-600">→ ${group.tujuan} (${gudangStr})</span>
                    </div>
                    <span class="bg-orange-100 text-orange-800 text-[9px] px-1.5 py-0.5 rounded font-bold">
                        (${itemCountStr} item)
                    </span>
                </div>
            `;
            nomorUrut++;
        }

        htmlContent += '</div>';
        previewContainer.innerHTML = htmlContent;

    } catch (error) {
        console.error("Gagal memuat preview FDN dari RTDB:", error);
        previewContainer.innerHTML = '<div class="text-red-500 p-1">Terjadi kesalahan saat memuat data.</div>';
    }
}

// Variabel global sementara untuk menyimpan konteks modal aktif
let activeModalContext = {
    dateId: '',
    matchedDocs: [] // Berisi array ID dokumen RTDB dan nomor dokumennya
};

// Modifikasi fungsi openFdnDetailModalByTujuan untuk menampilkan Badge Tipe (UTAMA / TAMBAHAN)
async function openFdnDetailModalByTujuan(dateId, tujuanKey) {
    const modal = document.getElementById('fdn-modal-detail');
    const itemListContainer = document.getElementById('modal-item-list');
    
    // Sembunyikan dulu dropdown pilihan hapus saat modal baru dibuka
    document.getElementById('container-pilih-hapus').classList.add('hidden');
    document.getElementById('btn-hapus-fdn').classList.remove('hidden');

    itemListContainer.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-500 italic">Memuat seluruh data item FDN...</td></tr>';
    modal.classList.remove('hidden');

    try {
        // Ambil data dari RTDB: muat_fdn/{dateId}/datatujuan
        const tujuanRef = firebase.database().ref(`muat_fdn/${dateId}/datatujuan`);
        const snapshot = await tujuanRef.once('value');

        if (!snapshot.exists()) {
            alert("Data FDN tidak ditemukan di database!");
            closeFdnModal();
            return;
        }

        const dataTujuanObj = snapshot.val();
        let matchedDocs = [];
        let allItemsCombined = [];
        let docEntries = []; // Menyimpan info nomor dokumen beserta tipenya
        let tanggalVal = '-';
        let tujuanVal = '-';
        let gudangSet = new Set();

        // Iterasi objek data dari RTDB
        Object.keys(dataTujuanObj).forEach(docId => {
            const data = dataTujuanObj[docId];
            const meta = data.meta || {};
            let currentTujuan = meta.tujuan || 'TANPA TUJUAN';
            currentTujuan = currentTujuan.replace('STOCK POINT', 'SP');

            if (currentTujuan === tujuanKey) {
                const noDok = meta.nomor_dokumen || docId;
                const tipeDok = (meta.tipe || 'UTAMA').toUpperCase(); // Ambil tipe dokumen

                matchedDocs.push({
                    rtdbId: docId,
                    nomorDokumen: noDok,
                    tipe: tipeDok
                });
                
                docEntries.push({ nomor: noDok, tipe: tipeDok });
                
                if (tanggalVal === '-') tanggalVal = meta.tanggal || '-';
                if (tujuanVal === '-') tujuanVal = currentTujuan;
                
                const gudangAsal = meta.dari_gudang || 'WH-2';
                gudangSet.add(gudangAsal);

                const items = data.data || [];
                items.forEach(item => {
                    allItemsCombined.push({
                        ...item,
                        nomor_dokumen: noDok,
                        tipe_dokumen: tipeDok, // Sertakan tipe di setiap item tabel
                        dari_gudang: gudangAsal
                    });
                });
            }
        });

        // Simpan ke konteks global modal
        activeModalContext = {
            dateId: dateId,
            matchedDocs: matchedDocs
        };

        if (matchedDocs.length === 0) {
            alert("Data tujuan tidak ditemukan.");
            closeFdnModal();
            return;
        }

        // Format tampilan nomor dokumen gabungan lengkap dengan Badge Tipe di Header
        let formattedDocHtml = '';
        docEntries.forEach((entry, idx) => {
            const docStr = entry.nomor;
            const digits = docStr.replace(/\D/g, '');
            const shortDoc = digits.length >= 5 ? digits.slice(-5) : docStr;
            
            const badgeClass = entry.tipe === 'TAMBAHAN' 
                ? 'bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold ml-1 inline-block align-middle' 
                : 'bg-blue-100 text-blue-800 border border-blue-300 px-1.5 py-0.5 rounded text-[10px] font-bold ml-1 inline-block align-middle';

            formattedDocHtml += `${shortDoc} <span class="${badgeClass}">${entry.tipe}</span>`;
            if (idx < docEntries.length - 1) {
                formattedDocHtml += ' & ';
            }
        });

        const gudangArr = Array.from(gudangSet);
        const gudangStr = gudangArr.length > 1 ? gudangArr.join(' & ') : (gudangArr[0] || 'WH-2');

        document.getElementById('modal-doc-no').innerHTML = formattedDocHtml;
        document.getElementById('modal-tanggal').innerText = tanggalVal;
        document.getElementById('modal-tujuan').innerText = tujuanVal;
        document.getElementById('modal-gudang').innerText = gudangStr;

        // Render baris tabel 5 kolom
        let rowsHtml = '';
        allItemsCombined.forEach((item, index) => {
            const sub = item.sub || {};
            const bal = sub.bal !== undefined ? sub.bal : 0;
            const rtg = sub.rtg !== undefined ? sub.rtg : 0;
            const pcs = sub.pcs !== undefined ? sub.pcs : 0;
            const jumlahStr = `${item.qty_utama || 0} / ${bal} / ${rtg} / ${pcs}`;

            const docStr = item.nomor_dokumen;
            const digits = docStr.replace(/\D/g, '');
            const shortDoc = digits.length >= 5 ? digits.slice(-5) : docStr;
            const tipeItem = item.tipe_dokumen || 'UTAMA';

            // Tentukan warna badge kecil di baris tabel
            const tableBadgeClass = tipeItem === 'TAMBAHAN'
                ? 'bg-amber-100 text-amber-800 border border-amber-300 px-1 py-0.2 rounded text-[9px] font-bold ml-1'
                : 'bg-blue-100 text-blue-800 border border-blue-300 px-1 py-0.2 rounded text-[9px] font-bold ml-1';

            // Tentukan styling baris: WH-3 diberi warna oranye, WH-2 tetap standar
            const rowClass = item.dari_gudang === 'WH-3'
                ? 'bg-orange-50 hover:bg-orange-100/60 border-b border-orange-100 text-orange-900 font-medium'
                : 'border-b border-slate-100 hover:bg-slate-50 text-slate-700';

            const gudangColClass = item.dari_gudang === 'WH-3'
                ? 'p-2 text-center font-bold text-orange-600'
                : 'p-2 text-center font-bold text-slate-700';

            rowsHtml += `
                <tr class="${rowClass}">
                    <td class="p-2 text-center font-medium text-slate-500">${index + 1}</td>
                    <td class="p-2 font-mono font-bold text-orange-600 uppercase">${item.kode}</td>
                    <td class="p-2 font-mono">${jumlahStr}</td>
                    <td class="p-2 font-mono font-semibold">${shortDoc} <span class="${tableBadgeClass}">${tipeItem}</span></td>
                    <td class="${gudangColClass}">${item.dari_gudang}</td>
                </tr>
            `;
        });

        itemListContainer.innerHTML = rowsHtml;

        // Hitung total keseluruhan qty_utama dari semua item yang tergabung
        let totalMuatKeseluruhan = 0;
        allItemsCombined.forEach(item => {
            totalMuatKeseluruhan += Number(item.qty_utama || 0);
        });

        // Tampilkan nilai Total Muat lengkap dengan satuan Karton di footer modal
        document.getElementById('modal-total-muat-val').innerText = `${totalMuatKeseluruhan} Karton`;

    } catch (error) {
        console.error("Gagal memuat detail gabungan FDN dari RTDB:", error);
        itemListContainer.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-500">Gagal memuat data dari server.</td></tr>';
    }
}

// Fungsi ketika tombol utama "Hapus FDN Ini" diklik
function handleTombolHapusClick() {
    const docs = activeModalContext.matchedDocs;
    
    if (docs.length === 1) {
        // Jika hanya ada 1 FDN, langsung konfirmasi hapus dokumen tersebut
        hapusFdnDocument(activeModalContext.dateId, docs[0].rtdbId);
    } else if (docs.length > 1) {
        // Jika ada lebih dari 1 FDN, tampilkan dropdown pilihan dan sembunyikan tombol utama
        const selectElem = document.getElementById('select-fdn-to-delete');
        selectElem.innerHTML = '';
        
        // Tambahkan opsi "Semua FDN" dan opsi satuan per nomor dokumen
        let optionsHtml = `<option value="ALL">-- Hapus Semua (${docs.length} FDN) --</option>`;
        docs.forEach(d => {
            optionsHtml += `<option value="${d.rtdbId}">Hapus FDN: ${d.nomorDokumen}</option>`;
        });
        selectElem.innerHTML = optionsHtml;

        document.getElementById('btn-hapus-fdn').classList.add('hidden');
        document.getElementById('container-pilih-hapus').classList.remove('hidden');
    }
}

// Fungsi untuk membatalkan pemilihan hapus
function batalPilihHapus() {
    document.getElementById('container-pilih-hapus').classList.add('hidden');
    document.getElementById('btn-hapus-fdn').classList.remove('hidden');
}

// Fungsi untuk mengeksekusi penghapusan berdasarkan pilihan di dropdown (RTDB)
async function eksekusiHapusPilihan() {
    const selectElem = document.getElementById('select-fdn-to-delete');
    const selectedVal = selectElem.value;
    const dateId = activeModalContext.dateId;

    if (selectedVal === "ALL") {
        miuiConfirm("Apakah Anda yakin ingin menghapus SEMUA data FDN ini?", async function() {
            const allRtdbIds = activeModalContext.matchedDocs.map(d => d.rtdbId);
            await hapusGroupFdnDocuments(dateId, allRtdbIds);
        });
    } else {
        // Hapus spesifik satu dokumen FDN yang dipilih menggunakan miuiConfirm
        miuiConfirm("Apakah Anda yakin ingin menghapus FDN yang dipilih ini?", async function() {
            try {
                await firebase.database().ref(`muat_fdn/${dateId}/datatujuan/${selectedVal}`).remove();
                miuiAlert("Data FDN berhasil dihapus.");
                closeFdnModal();
                renderDaftarFdnToPreview(dateId);
            } catch (error) {
                console.error("Gagal menghapus FDN satuan di RTDB:", error);
                miuiAlert("Terjadi kesalahan saat menghapus data.");
            }
        });
    }
}

// Fungsi untuk menutup modal
function closeFdnModal() {
    const modal = document.getElementById('fdn-modal-detail');
    if (modal) modal.classList.add('hidden');
}

// Fungsi helper hapus dokumen satuan (RTDB)
async function hapusFdnDocument(dateId, docId) {
    miuiConfirm("Apakah Anda yakin ingin menghapus FDN ini dari sistem?", async function() {
        try {
            await firebase.database().ref(`muat_fdn/${dateId}/datatujuan/${docId}`).remove();
            miuiAlert("Data FDN berhasil dihapus.");
            closeFdnModal();
            renderDaftarFdnToPreview(dateId);
        } catch (error) {
            console.error("Gagal menghapus FDN di RTDB:", error);
            miuiAlert("Terjadi kesalahan saat menghapus data.");
        }
    });
}

// Fungsi helper hapus sekumpulan dokumen FDN (RTDB)
async function hapusGroupFdnDocuments(dateId, docIdArray) {
    miuiConfirm(`Apakah Anda yakin ingin menghapus seluruh (${docIdArray.length}) FDN pada tujuan ini?`, async function() {
        try {
            // Di RTDB, kita bisa melakukan penghapusan paralel menggunakan Promise.all
            const deletePromises = docIdArray.map(docId => {
                return firebase.database().ref(`muat_fdn/${dateId}/datatujuan/${docId}`).remove();
            });
            await Promise.all(deletePromises);

            miuiAlert("Semua data FDN pada tujuan ini berhasil dihapus.");
            closeFdnModal();
            renderDaftarFdnToPreview(dateId);
        } catch (error) {
            console.error("Gagal menghapus sekumpulan FDN di RTDB:", error);
            miuiAlert("Terjadi kesalahan saat menghapus data.");
        }
    });
}


// 1. Fungsi untuk mengisi dropdown kode dengan Agregasi Sesuai Gudang Asal (WH-2 & WH-3 Terpisah)
async function populateMutasiKodeDropdown(dateId) {
    const selectKode = document.getElementById('mutasi-kode');
    if (!selectKode) return;

    // 1. Reset total isi dropdown secara bersih, sisakan opsi default pertama
    selectKode.innerHTML = '<option value="">Pilih Kode...</option>';

    try {
        const rtdbRef = firebase.database().ref(`muat_fdn/${dateId}`);
        
        // 2. Ambil seluruh data dari node 'datatujuan' di RTDB
        const tujuanSnapshot = await rtdbRef.child('datatujuan').once('value');
        const globalItemMap = new Map(); // Map eksklusif dengan key berbasis Kode + Gudang

        if (tujuanSnapshot.exists()) {
            const dataTujuanObj = tujuanSnapshot.val();
            Object.keys(dataTujuanObj).forEach(docId => {
                const docData = dataTujuanObj[docId];
                const items = docData.data || [];
                const dariGudang = String(docData.meta?.dari_gudang || docData.dari_gudang || 'WH-2').trim().toUpperCase();

                // Deteksi apakah dokumen FDN ini berstatus tambahan
                const isDocTambahan = (docData.meta?.tipe || docData.tipe || '').toUpperCase() === 'TAMBAHAN' || 
                                      String(docId).toUpperCase().includes('TAMBAHAN') ||
                                      JSON.stringify(docData).toUpperCase().includes('TAMBAHAN');

                items.forEach(item => {
                    const kode = String(item.kode || '').trim().toUpperCase();
                    if (!kode) return;

                    const qtyUtama = Number(item.qty_utama || item.qty || 0);
                    const isWh3Doc = (dariGudang === 'WH-3' || dariGudang.includes('WH3'));

                    // Buat unique key gabungan kode dan gudang agar WH-2 dan WH-3 terpisah mutlak
                    const uniqueKey = `${kode}_${isWh3Doc ? 'WH3' : 'WH2'}`;

                    // Jika key unik sudah ada, jumlahkan total kuantitasnya
                    if (globalItemMap.has(uniqueKey)) {
                        const existing = globalItemMap.get(uniqueKey);
                        existing.totalQty += qtyUtama;
                        if (isDocTambahan) existing.isTambahan = true;
                    } else {
                        globalItemMap.set(uniqueKey, {
                            kode: kode,
                            totalQty: qtyUtama,
                            isWh3: isWh3Doc,
                            isTambahan: isDocTambahan
                        });
                    }
                });
            });
        }

        // 3. Ambil data yang sudah diambil di 'ambilrak' dari RTDB untuk rekap
        const ambilRakSnapshot = await rtdbRef.child('ambilrak').once('value');
        const rekapAmbil = {};

        if (ambilRakSnapshot.exists()) {
            const dataAmbilObj = ambilRakSnapshot.val();
            Object.keys(dataAmbilObj).forEach(rakId => {
                const data = dataAmbilObj[rakId];
                const kode = String(data.kode || '').trim().toUpperCase();
                const lokasi = String(data.lokasi || '').trim().toUpperCase();
                const ambil = Number(data.qtyAmbil || 0);
                if (kode) {
                    const isWh3Lokasi = (lokasi === 'WH-3' || lokasi.includes('WH3'));
                    const uniqueKey = `${kode}_${isWh3Lokasi ? 'WH3' : 'WH2'}`;
                    
                    rekapAmbil[uniqueKey] = (rekapAmbil[uniqueKey] || 0) + ambil;
                    rekapAmbil[kode] = (rekapAmbil[kode] || 0) + ambil; // Fallback
                }
            });
        }

        // 4. Hitung sisa kekurangan secara unik per gudang
        let aggregatedItems = [];
        globalItemMap.forEach((value, uniqueKey) => {
            const totalKebutuhan = value.totalQty;
            const sudahDiambil = rekapAmbil[uniqueKey] || rekapAmbil[value.kode] || 0;
            const kekurangan = totalKebutuhan - sudahDiambil;

            if (kekurangan > 0) {
                aggregatedItems.push({
                    uniqueKey: uniqueKey,
                    kode: value.kode,
                    totalQty: totalKebutuhan,
                    sudahDiambil: sudahDiambil,
                    kekurangan: kekurangan,
                    isWh3: value.isWh3,
                    isTambahan: value.isTambahan
                });
            }
        });

        // Urutkan prioritas WH-3 lalu abjad kode
        aggregatedItems.sort((a, b) => {
            if (a.isWh3 && !b.isWh3) return -1;
            if (!a.isWh3 && b.isWh3) return 1;
            return a.kode.localeCompare(b.kode);
        });

        // 5. Masukkan ke dropdown dengan value murni kode barang (bersih untuk WMS Report)
        aggregatedItems.forEach(item => {
            const option = document.createElement('option');
            
            // Value murni hanya kode barang saja agar saat diklik/disalin ke WMS Report tidak ikut tercampur teks gudang
            option.value = item.kode; 
            
            const labelGudang = item.isWh3 ? ' [WH-3]' : ' [WH-2]';
            
            if (item.sudahDiambil > 0) {
                option.textContent = `${item.kode} (${item.totalQty} Krt)${labelGudang} (Kurang ${item.kekurangan} krt)`;
                option.className = "text-orange-600 font-bold";
            } else {
                option.textContent = `${item.kode} (${item.totalQty} Krt)${labelGudang}`;
                option.className = "text-slate-800 font-bold";
            }

            // Simpan informasi pendukung & identitas gudang di dataset
            option.dataset.kode = item.kode;
            option.dataset.gudang = item.isWh3 ? 'WH3' : 'WH2'; // Identitas gudang untuk sistem
            option.dataset.totalQty = item.totalQty;
            option.dataset.sudahDiambil = item.sudahDiambil;
            option.dataset.kekurangan = item.kekurangan;
            option.dataset.isWh3 = item.isWh3 ? 'true' : 'false';
            option.dataset.isTambahan = item.isTambahan ? 'true' : 'false';
            
            selectKode.appendChild(option);
        });

        if (selectKode.options.length > 1) {
            selectKode.selectedIndex = 1; 
            selectKode.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            selectKode.value = "";
        }

    } catch (error) {
        console.error("Gagal memuat data untuk dropdown mutasi dari RTDB:", error);
    }
}

// 2. Event listener ketika pilihan dropdown Kode berubah
document.getElementById('mutasi-kode').addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const selectedKode = this.value;
    const inputWmsBarang = document.getElementById('filter-kode-barang');

    if (!selectedKode) {
        if (inputWmsBarang) {
            inputWmsBarang.value = "";
            if (typeof filterWmsReportData === 'function') {
                filterWmsReportData();
            }
        }
        hitungSisaBelumDiinput();
        return;
    }

    // Otomatis isi kolom pencarian di WMS Report dan jalankan filternya
    if (inputWmsBarang) {
        inputWmsBarang.value = selectedKode;
        if (typeof filterWmsReportData === 'function') {
            filterWmsReportData();
        }
    }

    // Panggil fungsi hitung sisa (otomatis menampilkan full total kebutuhan FDN karena tabel bawah masih kosong)
    hitungSisaBelumDiinput();
});

// Fungsi utilitas untuk memastikan dropdown #mutasi-kode tidak pernah ada duplikat nilai
function bersihkanDropdownMutasi() {
    const selectKode = document.getElementById('mutasi-kode');
    if (!selectKode) return;

    const seenValues = new Set();
    const options = Array.from(selectKode.options);

    // Kosongkan dulu
    selectKode.innerHTML = '';

    options.forEach((opt, index) => {
        // Biarkan opsi pertama (placeholder "Pilih Kode...") selalu ada
        if (index === 0 || opt.value === '') {
            selectKode.appendChild(opt);
            return;
        }

        // Jika value (kode barang) belum pernah dimasukkan, tambahkan. Jika sudah, abaikan (buang duplikatnya).
        if (!seenValues.has(opt.value)) {
            seenValues.add(opt.value);
            selectKode.appendChild(opt);
        }
    });
}

// MUTATION OBSERVER: Penjaga otomatis untuk mencegah duplikat opsi pada dropdown mutasi-kode
document.addEventListener("DOMContentLoaded", () => {
    const selectKode = document.getElementById('mutasi-kode');
    if (!selectKode) return;

    const observer = new MutationObserver((mutations) => {
        // Cegahinfinite loop dengan memeriksa apakah benar-benar ada penambahan opsi
        let hasChanges = false;
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) {
                hasChanges = true;
            }
        });

        if (hasChanges) {
            // Hentikan observer sejenak saat kita membersihkan elemen agar tidak looping
            observer.disconnect();

            const seenValues = new Set();
            const options = Array.from(selectKode.options);
            let needsClean = false;

            options.forEach((opt, index) => {
                if (index === 0 || opt.value === '') return;
                if (seenValues.has(opt.value)) {
                    needsClean = true; // Ditemukan duplikat!
                } else {
                    seenValues.add(opt.value);
                }
            });

            // Jika ada duplikat, susun ulang elemen select secara unik
            if (needsClean) {
                const newOptions = [options[0]]; // Simpan opsi placeholder "Pilih Kode..."
                const uniqueValues = new Set();

                options.slice(1).forEach(opt => {
                    if (opt.value && !uniqueValues.has(opt.value)) {
                        uniqueValues.add(opt.value);
                        newOptions.push(opt);
                    } else if (!opt.value) {
                        newOptions.push(opt);
                    }
                });

                selectKode.innerHTML = '';
                newOptions.forEach(opt => selectKode.appendChild(opt));
                console.log("[Auto-Cleaner] Berhasil membersihkan opsi dropdown mutasi yang dobel.");
            }

            // Aktifkan kembali observer
            observer.observe(selectKode, { childList: true });
        }
    });

    observer.observe(selectKode, { childList: true });
});

// Fungsi untuk menangani klik pada baris tabel WMS Report
function pilihRakWms(lokasi, stok) {
    const inputLokasi = document.getElementById('mutasi-lokasi');
    const inputStok = document.getElementById('mutasi-stok-gudang');
    const inputQtyAmbil = document.getElementById('mutasi-qty');
    const selectKodeBarangRak = document.getElementById('mutasi-kode');

    const lokasiBaru = (lokasi || '').trim().toUpperCase();
    const kodeBarangAktif = selectKodeBarangRak && selectKodeBarangRak.selectedOptions.length > 0 
        ? selectKodeBarangRak.selectedOptions[0].value.trim().toUpperCase() 
        : '';

    // 1. Cek duplikasi terlebih dahulu sebelum memasukkan nilai (Kecuali WH-3)
    if (lokasiBaru && lokasiBaru !== 'WH-3' && kodeBarangAktif) {
        const barisListRak = document.querySelectorAll('#container-list-mutasi tr');
        let sudahAda = false;

        barisListRak.forEach(row => {
            const cols = row.querySelectorAll('td');
            if (cols.length >= 3) {
                const textKode = (cols[1]?.textContent || '').trim().toUpperCase();
                const textLokasi = (cols[2]?.textContent || '').trim().toUpperCase();

                if (textKode === kodeBarangAktif && textLokasi === lokasiBaru) {
                    sudahAda = true;
                }
            }
        });

        // Jika sudah ada, tampilkan miuiAlert dan batalkan pengisian otomatis
        if (sudahAda) {
            const pesanPeringatan = `Rak [${lokasiBaru}] untuk barang [${kodeBarangAktif}] sudah pernah diinput! Silakan pilih rak lainnya.`;
            if (typeof miuiAlert === 'function') {
                miuiAlert(pesanPeringatan);
            } else {
                alert(pesanPeringatan);
            }
            return; // Berhenti di sini, form tidak terisi data duplikat
        }
    }

    // 2. Jika aman (belum ada / WH-3), isi input Rak / Lokasi di form sebelah kiri
    if (inputLokasi) {
        inputLokasi.value = lokasiBaru;
    }

    // 3. Isi input QTY Stok di form sebelah kiri
    if (inputStok) {
        inputStok.value = stok;
    }

    // 4. Otomatis arahkan fokus kursor ke input QTY Ambil agar operator bisa langsung mengetik
    if (inputQtyAmbil) {
        inputQtyAmbil.focus();
        inputQtyAmbil.select(); // Opsional: langsung pilih teks di dalam qty ambil
    }

    console.log("Rak dipilih:", lokasiBaru, "Stok:", stok);
}

// Fungsi untuk mengisi otomatis kolom Rak / Lokasi dengan teks "WH-3" dan memfokuskan ke QTY Stok
function isiRakWh3() {
    const inputLokasi = document.getElementById('mutasi-lokasi');
    if (inputLokasi) {
        inputLokasi.value = 'WH-3';
        
        // Berikan fokus ke QTY Stok terlebih dahulu untuk pengisian manual
        const inputStok = document.getElementById('mutasi-stok-gudang');
        if (inputStok) {
            inputStok.removeAttribute('readonly'); // Pastikan bisa diisi jika diperlukan untuk item manual WH-3
            inputStok.focus();
            inputStok.select();
        }
    }
}

// Fungsi utama untuk memproses ambil rak otomatis dengan pemisahan gudang WH-2 & WH-3 yang akurat
async function prosesAmbilRakOtomatis() {
    const tanggalMuat = document.getElementById('input-tgl-muat')?.value;
    if (!tanggalMuat) {
        if (typeof miuiAlert === 'function') miuiAlert("Tanggal aktif belum dipilih!");
        else alert("Tanggal aktif belum dipilih!");
        return;
    }

    const firestoreDateId = tanggalMuat.replace(/-/g, '');
    const rtdbRef = firebase.database().ref(`muat_fdn/${firestoreDateId}`);

    try {
        const selectKode = document.getElementById('mutasi-kode');
        if (!selectKode || selectKode.options.length <= 1) {
            if (typeof miuiAlert === 'function') miuiAlert("Tidak ada data FDN / kode barang yang tersedia untuk diproses!");
            else alert("Tidak ada data FDN / kode barang yang tersedia untuk diproses!");
            return;
        }

        // 1. Ambil seluruh data yang sudah diambil sebelumnya di RTDB (tabel kiri) untuk melacak pemakaian rak
        const existingAmbilSnapshot = await rtdbRef.child('ambilrak').once('value');
        const terambilMap = {};    // Format: { "KODE_WH2" atau "KODE_WH3": totalQtySudahDiambil }
        const rakTerpakaiMap = {}; // Format: { "KODE_LOKASIRAK": totalQtySudahDiambilDiRakIni }
        
        if (existingAmbilSnapshot.exists()) {
            const dataAmbilObj = existingAmbilSnapshot.val();
            Object.keys(dataAmbilObj).forEach(rakId => {
                const data = dataAmbilObj[rakId];
                const kd = String(data.kode || '').trim().toUpperCase();
                const lokasi = String(data.lokasi || '').trim().toUpperCase();
                const qty = Number(data.qtyAmbil || 0);
                if (kd) {
                    const isWh3Lokasi = (lokasi === 'WH-3' || lokasi.includes('WH3'));
                    const keyGudang = `${kd}_${isWh3Lokasi ? 'WH3' : 'WH2'}`;
                    
                    terambilMap[keyGudang] = (terambilMap[keyGudang] || 0) + qty;
                    terambilMap[kd] = (terambilMap[kd] || 0) + qty; // Fallback umum

                    if (lokasi) {
                        const rakKey = `${kd}_${lokasi}`;
                        rakTerpakaiMap[rakKey] = (rakTerpakaiMap[rakKey] || 0) + qty;
                    }
                }
            });
        }

        // 2. Ambil seluruh data WMS terbaru dari Firebase RTDB
        let rawData = [];
        try {
            if (typeof firebase !== 'undefined' && firebase.database) {
                const snapshot = await firebase.database().ref('stok_cache/data').once('value');
                const val = snapshot.val();
                if (val) {
                    rawData = Array.isArray(val) ? val : Object.values(val);
                }
            }
        } catch (err) {
            console.warn("Gagal ambil langsung dari RTDB, mencoba variabel global...", err);
        }

        if (rawData.length === 0) {
            let sourceData = typeof globalWmsData !== 'undefined' ? globalWmsData : 
                           (typeof wmsDataCache !== 'undefined' ? wmsDataCache : 
                           (typeof stokCache !== 'undefined' ? stokCache : null));
            if (sourceData) {
                rawData = Array.isArray(sourceData) ? sourceData : Object.values(sourceData);
            }
        }

        if (!rawData || rawData.length === 0) {
            if (typeof miuiAlert === 'function') miuiAlert("Data WMS di Firebase / memori kosong!");
            else alert("Data WMS di Firebase / memori kosong!");
            return;
        }

        // Konfirmasi MIUI sebelum eksekusi
        miuiConfirm("Jalankan sinkronisasi FDN otomatis? (Memproses FDN baru atau kekurangan qty yang belum terambil)", async function() {
            
            const processedKeys = new Set();
            let adaItemDiproses = false;

            // Loop per opsi di dropdown secara aman
            for (let i = 0; i < selectKode.options.length; i++) {
                const opt = selectKode.options[i];
                
                // 1. Ambil kode barang murni dari value option (bersih tanpa |WH2 / |WH3)
                const kodeBarang = (opt.value || '').trim().toUpperCase();
                
                if (!kodeBarang || kodeBarang.includes('PILIH') || kodeBarang === '') continue;

                // 2. Ambil informasi target gudang dari dataset yang sudah kita pisahkan
                const targetGudang = (opt.dataset.gudang || 'WH2').trim().toUpperCase();

                const uniqueItemKey = `${kodeBarang}_${targetGudang}`;
                if (processedKeys.has(uniqueItemKey)) {
                    continue;
                }
                processedKeys.add(uniqueItemKey);

                // Ambil sisa kekurangan murni spesifik dari dataset option
                let sisaKebutuhanItem = Number(opt.dataset.kekurangan || opt.getAttribute('data-kekurangan') || 0);

                if (sisaKebutuhanItem <= 0) {
                    let totalFdnItem = Number(opt.dataset.totalQty || opt.dataset.qty || 0);
                    if (totalFdnItem <= 0) {
                        const fullText = (opt.text || '').trim();
                        const matchTotal = fullText.match(/\((\d+)\s*Krt/i) || fullText.match(/\((\d+)\)/);
                        totalFdnItem = matchTotal ? parseInt(matchTotal[1]) : 0;
                    }
                    const sudahDiambilInThisWarehouse = terambilMap[uniqueItemKey] || 0;
                    sisaKebutuhanItem = totalFdnItem - sudahDiambilInThisWarehouse;
                }

                if (sisaKebutuhanItem <= 0) {
                    continue;
                }

                adaItemDiproses = true;
                
                // Status Alokasi (UTAMA / TAMBAHAN)
                const isFDNTambahan = opt.dataset.isTambahan === 'true' || (opt.text || '').toUpperCase().includes('TAMBAHAN');
                const sudahDiambilGlobal = terambilMap[kodeBarang] || 0;
                const tipeAlokasi = isFDNTambahan ? "TAMBAHAN" : ((sudahDiambilGlobal > 0) ? "TAMBAHAN" : "UTAMA");

                // --- 1. JIKA TARGETNYA WH-3 ---
                const isWh3Target = (targetGudang === 'WH3') || (opt.dataset.isWh3 === 'true');

                if (isWh3Target) {
                    let realKekurangan = sisaKebutuhanItem;
                    if (realKekurangan > 0) {
                        const docIdKodeQty = `${kodeBarang}_${realKekurangan}_${Date.now()}_${i}_wh3`;
                        await rtdbRef.child(`ambilrak/${docIdKodeQty}`).set({
                            kode: kodeBarang,
                            lokasi: 'WH-3',
                            qtyStok: realKekurangan,
                            qtyAmbil: realKekurangan,
                            qtySisa: 0,
                            tipe: tipeAlokasi,
                            timestamp: firebase.database.ServerValue.TIMESTAMP
                        });
                    }
                    continue;
                }

                // --- 2. JIKA TARGETNYA WH-2 (PENCARIAN ITEM WMS REGULER) ---
                let stokWmsList = rawData.filter(item => {
                    if (!item) return false;
                    const kodeItem = String(item.KODE || item.kode || item.KODE_BARANG || '').trim().toUpperCase();
                    return kodeItem === kodeBarang; // Exact Match
                });

                if (stokWmsList.length === 0) continue;

                let normalizedStok = stokWmsList.map(item => {
                    const lokasiRak = String(item.LOKASI_PALET || item.lokasi || item.LOKASI || '').trim().toUpperCase();
                    const stokAsliWms = Number(item.QTY_STOK || item.stok || item.QTY || 0);
                    
                    // Hitung stok berjalan (kurangi dengan yang sudah diambil sebelumnya di rak ini)
                    const rakKey = `${kodeBarang}_${lokasiRak}`;
                    const sudahDiambilDiRakIni = rakTerpakaiMap[rakKey] || 0;
                    const sisaStokReal = stokAsliWms - sudahDiambilDiRakIni;

                    return {
                        kode: kodeBarang,
                        lokasi: lokasiRak,
                        stok: stokAsliWms,
                        sisaStokReal: sisaStokReal, 
                        expdate: String(item.EXPDATE || item.expdate || item.TANGGAL_EXP || '2099-12-31').trim()
                    };
                }).filter(item => item.sisaStokReal > 0 && item.lokasi);

                if (normalizedStok.length > 0) {
                    // Urutkan stok berdasarkan sisa terkecil, lalu expired terdekat (FEFO)
                    normalizedStok.sort((a, b) => {
                        if (a.sisaStokReal !== b.sisaStokReal) return a.sisaStokReal - b.sisaStokReal;
                        const dateA = new Date(a.expdate);
                        const dateB = new Date(b.expdate);
                        return dateA - dateB;
                    });

                    for (const wms of normalizedStok) {
                        if (sisaKebutuhanItem <= 0) break;

                        const stokTersedia = wms.sisaStokReal; 
                        if (stokTersedia <= 0) continue;

                        const qtyAmbil = Math.min(sisaKebutuhanItem, stokTersedia);
                        const qtySisa = stokTersedia - qtyAmbil;
                        
                        const docIdKodeQty = `${kodeBarang}_${qtyAmbil}_${Date.now()}_${i}_${Math.floor(Math.random()*10000)}`;

                        await rtdbRef.child(`ambilrak/${docIdKodeQty}`).set({
                            kode: kodeBarang,
                            lokasi: wms.lokasi,
                            qtyStok: wms.stok, 
                            qtyAmbil: qtyAmbil,
                            qtySisa: qtySisa,
                            tipe: tipeAlokasi, 
                            timestamp: firebase.database.ServerValue.TIMESTAMP
                        });

                        // Update peta pemakaian rak lokal
                        const rakKey = `${kodeBarang}_${wms.lokasi}`;
                        rakTerpakaiMap[rakKey] = (rakTerpakaiMap[rakKey] || 0) + qtyAmbil;

                        sisaKebutuhanItem -= qtyAmbil;
                    }
                }
            }

            if (!adaItemDiproses) {
                if (typeof miuiAlert === 'function') {
                    miuiAlert("Semua item FDN sudah terpenuhi / tidak ada kekurangan baru.");
                } else {
                    alert("Semua item FDN sudah terpenuhi / tidak ada kekurangan baru.");
                }
                return;
            }

            if (typeof miuiAlert === 'function') {
                miuiAlert("Simpan Data Berhasil!");
            } else {
                alert("Simpan Data Berhasil!");
            }

            if (typeof loadDataAmbilRak === 'function') loadDataAmbilRak(firestoreDateId);
            if (typeof updateSummaryMutasi === 'function') updateSummaryMutasi();
            if (typeof populateMutasiKodeDropdown === 'function') await populateMutasiKodeDropdown(firestoreDateId);
        });

    } catch (error) {
        console.error("Gagal menjalankan sinkronisasi FDN otomatis ke RTDB:", error);
        if (typeof miuiAlert === 'function') miuiAlert("Terjadi kesalahan saat sinkronisasi FDN.");
    }
}

// Pengaman real-time pada input QTY Ambil (Batas: Stok Gudang & Sisa Kekurangan Dropdown)
const inputQtyAmbil = document.getElementById('mutasi-qty');
const inputStokGudang = document.getElementById('mutasi-stok-gudang');
const selectKodeBarang = document.getElementById('mutasi-kode');

if (inputQtyAmbil && inputStokGudang) {
    inputQtyAmbil.addEventListener('input', function() {
        const qtyAmbil = Number(this.value);
        const qtyStok = Number(inputStokGudang.value || 0);
        
        // Ambil sisa kekurangan dari dataset option dropdown yang sedang dipilih
        let qtyKekurangan = qtyStok; // Default jika belum pilih
        if (selectKodeBarang && selectKodeBarang.selectedOptions.length > 0) {
            const selectedOpt = selectKodeBarang.selectedOptions[0];
            const kekuranganAttr = selectedOpt.dataset.kekurangan;
            if (kekuranganAttr !== undefined) {
                qtyKekurangan = Number(kekuranganAttr);
            }
        }
        
        // Tentukan batas maksimal yang paling ketat (antara Stok Gudang atau Sisa Kekurangan)
        let batasMaksimal = Math.min(qtyStok, qtyKekurangan);
        let pesanPeringatan = `QTY Ambil tidak boleh melebihi batas (Stok: ${qtyStok}, Kekurangan: ${qtyKekurangan})!`;

        // Cek jika QTY Ambil melampaui batas maksimal
        if (qtyAmbil > batasMaksimal) {
            if (typeof miuiAlert === 'function') {
                miuiAlert(pesanPeringatan);
            } else {
                alert(pesanPeringatan);
            }
            this.value = batasMaksimal; // Kembalikan ke nilai batas aman
        }
    });
}

// Pengaman real-time pada input Lokasi Rak (Cek duplikasi rak per kode barang, kecuali WH-3)
const inputLokasiRak = document.getElementById('mutasi-lokasi');
const selectKodeBarangRak = document.getElementById('mutasi-kode');

if (inputLokasiRak) {
    // Fungsi pengecekan saat input kehilangan fokus (blur) atau ditekan Enter
    function validasiRakDuplikat() {
        const lokasiDipilih = inputLokasiRak.value.trim().toUpperCase();
        
        // Jika kosong atau WH-3, lewati pengaman (WH-3 boleh dipakai berkali-kali)
        if (!lokasiDipilih || lokasiDipilih === 'WH-3') return true;

        // Ambil kode barang yang sedang dipilih
        let kodeBarangAktif = '';
        if (selectKodeBarangRak && selectKodeBarangRak.selectedOptions.length > 0) {
            kodeBarangAktif = selectKodeBarangRak.selectedOptions[0].value.trim().toUpperCase();
        }

        if (!kodeBarangAktif) {
            if (typeof miuiAlert === 'function') {
                miuiAlert("Silakan pilih Kode Barang terlebih dahulu!");
            } else {
                alert("Silakan pilih Kode Barang terlebih dahulu!");
            }
            inputLokasiRak.value = '';
            return false;
        }

        // Cek secara instan dari tabel list rak yang sudah diinput di sebelah kiri (container-list-mutasi)
        const barisListRak = document.querySelectorAll('#container-list-mutasi tr');
        let sudahAda = false;

        barisListRak.forEach(row => {
            const cols = row.querySelectorAll('td');
            // Pastikan baris tersebut valid (bukan baris "Belum ada rak ditambahkan")
            if (cols.length >= 3) {
                const textKode = (cols[1]?.textContent || '').trim().toUpperCase();
                const textLokasi = (cols[2]?.textContent || '').trim().toUpperCase();

                if (textKode === kodeBarangAktif && textLokasi === lokasiDipilih) {
                    sudahAda = true;
                }
            }
        });

        if (sudahAda) {
            const pesanPeringatan = `Rak [${lokasiDipilih}] untuk barang [${kodeBarangAktif}] sudah pernah diinput! Silakan pilih rak lainnya.`;
            if (typeof miuiAlert === 'function') {
                miuiAlert(pesanPeringatan);
            } else {
                alert(pesanPeringatan);
            }
            inputLokasiRak.value = ''; // Kosongkan kembali
            inputLokasiRak.focus();
            return false;
        }

        return true;
    }

    // Jalankan validasi saat input selesai diketik (blur)
    inputLokasiRak.addEventListener('blur', function() {
        this.value = this.value.trim().toUpperCase();
        validasiRakDuplikat();
    });

    // Jalankan juga saat tombol Enter ditekan pada kolom lokasi rak
    inputLokasiRak.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.value = this.value.trim().toUpperCase();
            
            // Jika lolos validasi duplikat, pindah fokus ke input QTY Stok
            if (validasiRakDuplikat()) {
                const inputStokGudang = document.getElementById('mutasi-stok-gudang');
                if (inputStokGudang) {
                    inputStokGudang.focus();
                    inputStokGudang.select();
                }
            }
        }
    });
}

// Fungsi untuk menghitung QTY Belum Diinput secara presisi langsung dari data terkumpul
function hitungSisaBelumDiinput() {
    const inputTotKeseluruhan = document.getElementById('tot-keseluruhan');
    const inputSummaryKurang = document.getElementById('summary-kurang');
    
    if (!inputTotKeseluruhan || !inputSummaryKurang) return;

    const totalMuat = Number(inputTotKeseluruhan.value || 0);

    // Hitung total QTY Ambil dari seluruh baris di tabel dengan mencari sel yang berisi angka qty
    let totalSudahDiambil = 0;
    const rows = document.querySelectorAll('#container-list-mutasi tr');
    
    rows.forEach(row => {
        // Cari sel di dalam baris yang kemungkinan besar adalah Qty Ambil 
        // (Biasanya kolom angka di tabel mutasi berada di indeks 2, 3, atau 4)
        for (let i = 0; i < row.cells.length; i++) {
            const cellText = row.cells[i].textContent.trim();
            // Validasi sederhana: jika angka dan bukan kode barang / tanggal
            if (/^\d+$/.test(cellText) && cellText.length <= 4) {
                // Ambil nilai angka yang masuk akal sebagai qty ambil (misal < 1000)
                const val = Number(cellText);
                // Kita pastikan ini kolom Qty Ambil (biasanya kolom ke-3 atau ke-4)
                if (i >= 2 && i <= 4) {
                    totalSudahDiambil += val;
                    break; // Ambil satu angka per baris yang valid
                }
            }
        }
    });

    // Jika totalSudahDiambil mendadak melebihi totalMuat akibat duplikat baris lama,
    // kita batasi agar tidak minus, atau hitung selisih bersihnya.
    let sisaBelumDiinput = totalMuat - totalSudahDiambil;
    
    // Proteksi agar jika terjadi minus akibat duplikat visual tabel, 
    // kita hitung ulang berdasarkan sisa item di dropdown atau minimal 0.
    if (sisaBelumDiinput < 0) {
        // Coba hitung berdasarkan sisa di opsi dropdown jika ada
        const selectKode = document.getElementById('mutasi-kode');
        if (selectKode && selectKode.options.length > 1) {
            let totalKekuranganDropdown = 0;
            for (let i = 1; i < selectKode.options.length; i++) {
                const opt = selectKode.options[i];
                const kurang = Number(opt.dataset.kekurangan || 0);
                totalKekuranganDropdown += kurang;
            }
            sisaBelumDiinput = totalKekuranganDropdown;
        } else {
            sisaBelumDiinput = 0;
        }
    }

    inputSummaryKurang.value = sisaBelumDiinput;
}

// fungsi tombol enter
document.addEventListener("DOMContentLoaded", function() {
    const inputLokasi = document.getElementById('mutasi-lokasi');
    const inputStok = document.getElementById('mutasi-stok-gudang');
    const inputAmbil = document.getElementById('mutasi-qty');
    const selectKode = document.getElementById('mutasi-kode');

    // 1. Dari Dropdown Kode Barang (jika ditekan Enter, pindah ke Lokasi)
    if (selectKode) {
        selectKode.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (inputLokasi) {
                    inputLokasi.focus();
                    inputLokasi.select();
                }
            }
        });
        selectKode.addEventListener('change', function() {
            if (inputLokasi) {
                inputLokasi.focus();
                inputLokasi.select();
            }
        });
    }

    // 2. Dari Rak / Lokasi (Enter -> Pindah ke QTY Stok & otomatis huruf kapital)
    if (inputLokasi) {
        inputLokasi.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.value = this.value.trim().toUpperCase(); // Otomatis kapital
                if (inputStok) {
                    inputStok.focus();
                    inputStok.select();
                }
            }
        });
    }

    // 3. Dari QTY Stok (Enter -> Pindah ke QTY Ambil)
    if (inputStok) {
        inputStok.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (inputAmbil) {
                    inputAmbil.focus();
                    inputAmbil.select();
                }
            }
        });
    }

    // 4. Dari QTY Ambil (Enter -> Jalankan Tambah Rak)
    if (inputAmbil) {
        inputAmbil.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (typeof tambahItemMutasiList === 'function') {
                    tambahItemMutasiList();
                }
            }
        });
    }
});


// Fungsi untuk menyimpan data Ambil Rak ke Realtime Database (RTDB) dengan penanda TAMBAHAN
async function tambahItemMutasiList() {
    // 1. Ambil nilai dari form input di sebelah kiri
    const tanggalMuat = document.getElementById('input-tgl-muat')?.value; // Format: YYYY-MM-DD
    const selectKode = document.getElementById('mutasi-kode');
    const kodeBarang = selectKode ? selectKode.value : '';
    const lokasiRak = document.getElementById('mutasi-lokasi')?.value.trim().toUpperCase();
    const qtyStok = Number(document.getElementById('mutasi-stok-gudang')?.value || 0);
    const qtyAmbil = Number(document.getElementById('mutasi-qty')?.value || 0);

    // Validasi input
    if (!tanggalMuat) {
        miuiAlert("Pilih tanggal muat terlebih dahulu!");
        return;
    }
    if (!kodeBarang) {
        miuiAlert("Pilih kode barang terlebih dahulu!");
        return;
    }
    if (!lokasiRak) {
        miuiAlert("Masukkan lokasi rak atau pilih dari WMS Report!");
        return;
    }
    if (qtyAmbil <= 0) {
        miuiAlert("Masukkan QTY Ambil dengan benar!");
        return;
    }

    // Konversi format tanggal ke ID dokumen tanggal (contoh: 20261002)
    const firestoreDateId = tanggalMuat.replace(/-/g, '');
    const rtdbRef = firebase.database().ref(`muat_fdn/${firestoreDateId}`);

    try {
        // Cek apakah barang ini sudah pernah diambil sebelumnya di node ambilrak
        const existingAmbilSnapshot = await rtdbRef.child('ambilrak').once('value');
        let sudahDiambil = 0;
        
        if (existingAmbilSnapshot.exists()) {
            const dataAmbilObj = existingAmbilSnapshot.val();
            Object.keys(dataAmbilObj).forEach(rakId => {
                const data = dataAmbilObj[rakId];
                if (String(data.kode || '').trim().toUpperCase() === kodeBarang.toUpperCase()) {
                    sudahDiambil += Number(data.qtyAmbil || 0);
                }
            });
        }

        // Tentukan status tipe: jika sudah ada pengambilan sebelumnya, maka input manual ini adalah TAMBAHAN
        const tipeAlokasi = (sudahDiambil > 0) ? "TAMBAHAN" : "UTAMA";

        // Hitung sisa stok (stok gudang dikurangi qty yang diambil)
        const qtySisa = qtyStok - qtyAmbil;

        // Buat ID unik berformat kode_qty
        const docIdKodeQty = `${kodeBarang}_${qtyAmbil}_${Date.now()}`;

        // Data payload lengkap dengan menyertakan field tipe
        const dataPayload = {
            kode: kodeBarang,
            lokasi: lokasiRak,
            qtyStok: qtyStok,
            qtyAmbil: qtyAmbil,
            qtySisa: qtySisa,
            tipe: tipeAlokasi, // <--- Menandai UTAMA atau TAMBAHAN secara otomatis
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        // 2. Simpan ke RTDB: muat_fdn/{firestoreDateId}/ambilrak/{docIdKodeQty}
        await rtdbRef.child(`ambilrak/${docIdKodeQty}`).set(dataPayload);

        console.log(`Berhasil menyimpan data ambilrak (${tipeAlokasi}) ke RTDB!`);

        // 3. Reset form input kecil agar siap untuk input berikutnya
        document.getElementById('mutasi-lokasi').value = '';
        document.getElementById('mutasi-stok-gudang').value = '';
        document.getElementById('mutasi-qty').value = '';
        document.getElementById('mutasi-lokasi').focus();

        // 4. Perbarui dropdown secara otomatis agar sisa kuantitas/kode yang habis langsung ter-refresh
        if (typeof populateMutasiKodeDropdown === 'function') {
            await populateMutasiKodeDropdown(firestoreDateId);
        }

        // 5. Perbarui juga tabel atau ringkasan ambil rak di sebelah kiri
        if (typeof loadDataAmbilRak === 'function') {
            loadDataAmbilRak(firestoreDateId);
        }
        if (typeof updateSummaryMutasi === 'function') {
            updateSummaryMutasi();
        }

    } catch (error) {
        console.error("Gagal menyimpan data ke RTDB: ", error);
        miuiAlert("Terjadi kesalahan saat menyimpan data ke database.");
    }
}

// Fungsi untuk memuat dan merender data ambilrak dari RTDB ke tabel (Dilengkapi Badge Utama/Tambahan di tiap baris rak)
function loadDataAmbilRak() {
    const tanggalMuat = document.getElementById('input-tgl-muat')?.value;
    if (!tanggalMuat) return;

    const firestoreDateId = tanggalMuat.replace(/-/g, '');
    const tbody = document.getElementById('container-list-mutasi');
    const badgeTotalAmbil = document.getElementById('total-ambil-badge');
    const inputSummaryKurang = document.getElementById('summary-kurang'); // Opsional pengingat
    
    if (!tbody) return;

    // Referensi node ambilrak di RTDB
    const ambilRakRef = firebase.database().ref(`muat_fdn/${firestoreDateId}/ambilrak`);

    // Gunakan listener on('value') di RTDB dan urutkan berdasarkan timestamp secara ascending
    ambilRakRef.orderByChild('timestamp').on('value', (snapshot) => {
        tbody.innerHTML = '';

        if (!snapshot.exists()) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="p-4 text-center text-slate-400 italic">Belum ada rak ditambahkan</td>
                </tr>
            `;
            if (badgeTotalAmbil) badgeTotalAmbil.textContent = '0';
            return;
        }

        let akumulasiTotalAmbil = 0;
        let mainDataArray = [];     // Untuk data Utama
        let tambahanDataArray = []; // Untuk data Tambahan

        // Tampung semua data dari snapshot objek RTDB dan pisahkan tipenya
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const itemObj = {
                id: childSnapshot.key, // Key unik RTDB
                kode: data.kode || '-',
                rak: data.lokasi || '-',
                ambil: Number(data.qtyAmbil || 0),
                stok: data.qtyStok || 0,
                sisa: data.qtySisa !== undefined ? data.qtySisa : (Number(data.qtyStok || 0) - Number(data.qtyAmbil || 0)),
                tipe: (data.tipe || 'UTAMA').toUpperCase(),
                rawDocData: data
            };

            if (itemObj.tipe === 'TAMBAHAN') {
                tambahanDataArray.push(itemObj);
            } else {
                mainDataArray.push(itemObj);
            }
        });

        // Gabungkan: Data Utama di atas, Data Tambahan di bawah secara berurutan
        let rawDataArray = [...mainDataArray, ...tambahanDataArray];

        // Kelompokkan data berdasarkan kode barang yang sama
        const groupedData = {};
        rawDataArray.forEach((item) => {
            akumulasiTotalAmbil += item.ambil; // Akumulasi total
            if (!groupedData[item.kode]) {
                groupedData[item.kode] = [];
            }
            groupedData[item.kode].push(item);
        });

        let nomorUrut = 1;

        // Render data yang sudah dikelompokkan ke dalam tabel
        Object.keys(groupedData).forEach((kode) => {
            const itemsInGroup = groupedData[kode];

            itemsInGroup.forEach((item, subIndex) => {
                const tr = document.createElement('tr');
                
                const isTambahanGroup = item.tipe === 'TAMBAHAN';
                const rowBgClass = isTambahanGroup 
                    ? "border-b bg-amber-50/70 hover:bg-amber-100/80 cursor-pointer transition text-amber-900" 
                    : "border-b hover:bg-orange-50 cursor-pointer transition text-slate-700";
                
                tr.className = rowBgClass;
                tr.title = "Klik untuk Edit atau Hapus";
                tr.onclick = function() {
                    bukaModalEditHapus(firestoreDateId, item.id, item.rawDocData);
                };

                // Badge kecil penanda status (UTAMA / TAMBAHAN) di setiap baris rak
                // Pindahkan badge ke sebelah kiri nama rak, perbesar lebar kolom rak, dan hilangkan truncate agar badge terlihat jelas
                const badgeStatusHtml = isTambahanGroup 
                    ? '<span class="bg-amber-200 text-amber-900 border border-amber-400 px-1 py-0.2 rounded text-[9px] font-bold mr-1 inline-block align-middle">TBH</span>' 
                    : '<span class="bg-blue-100 text-blue-800 border border-blue-300 px-1 py-0.2 rounded text-[9px] font-bold mr-1 inline-block align-middle">UTM</span>';

                if (subIndex === 0) {
                    tr.innerHTML = `
                        <td class="p-1.5 border border-orange-200 text-center font-semibold text-slate-500 w-10 align-top" rowspan="${itemsInGroup.length}">${nomorUrut}</td>
                        <td class="p-1.5 border border-orange-200 font-bold text-slate-800 truncate align-top" rowspan="${itemsInGroup.length}">${item.kode}</td>
                        <td class="p-1.5 border border-orange-200 font-semibold text-orange-700 w-70 whitespace-nowrap">${badgeStatusHtml} ${item.rak}</td>
                        <td class="p-1.5 border border-orange-200 text-center font-black text-orange-600 w-14">${item.ambil}</td>
                        <td class="p-1.5 border border-orange-200 text-center text-slate-600 w-14">${item.stok}</td>
                        <td class="p-1.5 border border-orange-200 text-center text-slate-600 w-14">${item.sisa}</td>
                    `;
                    nomorUrut++;
                } else {
                    tr.innerHTML = `
                        <td class="p-1.5 border border-orange-200 font-semibold text-orange-700 w-70 whitespace-nowrap">${badgeStatusHtml} ${item.rak}</td>
                        <td class="p-1.5 border border-orange-200 text-center font-black text-orange-600 w-14">${item.ambil}</td>
                        <td class="p-1.5 border border-orange-200 text-center text-slate-600 w-14">${item.stok}</td>
                        <td class="p-1.5 border border-orange-200 text-center text-slate-600 w-14">${item.sisa}</td>
                    `;
                }
                tbody.appendChild(tr);
            });
        });

        // Tampilkan total akumulasi ambil ke badge/footer
        if (badgeTotalAmbil) {
            badgeTotalAmbil.textContent = akumulasiTotalAmbil;
        }

        // Perbarui summary kurang jika ada
        const totalMuat = Number(document.getElementById('tot-keseluruhan')?.value || 0);
        if (inputSummaryKurang) {
            inputSummaryKurang.value = totalMuat - akumulasiTotalAmbil;
        }

        // <--- OTOMATIS SCROLL KE BAWAH (FOKUS KE DATA TERBARU) --->
        const containerTabel = tbody.closest('.overflow-y-auto') || tbody.parentElement;
        if (containerTabel) {
            containerTabel.scrollTop = containerTabel.scrollHeight;
        }

    }, (error) => {
        console.error("Gagal memuat data ambilrak dari RTDB: ", error);
    });
}

// Fungsi untuk mengatur tombol aktif (UTAMA / TAMBAHAN) pada modal edit
function setTipeAlokasiEdit(tipe) {
    const hiddenTipe = document.getElementById('edit-tipe-value');
    const btnUtama = document.getElementById('btn-tipe-utama');
    const btnTambahan = document.getElementById('btn-tipe-tambahan');

    if (hiddenTipe) hiddenTipe.value = tipe;

    if (tipe === 'UTAMA') {
        if (btnUtama) {
            btnUtama.className = "py-2 px-3 rounded font-bold border transition text-center text-xs bg-blue-600 text-white border-blue-600 shadow";
        }
        if (btnTambahan) {
            btnTambahan.className = "py-2 px-3 rounded font-bold border transition text-center text-xs bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200";
        }
    } else {
        if (btnUtama) {
            btnUtama.className = "py-2 px-3 rounded font-bold border transition text-center text-xs bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200";
        }
        if (btnTambahan) {
            btnTambahan.className = "py-2 px-3 rounded font-bold border transition text-center text-xs bg-amber-500 text-white border-amber-500 shadow";
        }
    }
}

// Perbarui juga fungsi bukaModalEditHapus untuk memanggil status tombol tipe
async function bukaModalEditHapus(dateId, docId, data) {
    const elDateId = document.getElementById('edit-date-id');
    const elDocId = document.getElementById('edit-doc-id');
    const elKode = document.getElementById('edit-kode');
    const elLokasi = document.getElementById('edit-lokasi');
    const elStok = document.getElementById('edit-qty-stok');
    const elAmbil = document.getElementById('edit-qty-ambil');
    const elSisa = document.getElementById('edit-qty-sisa');

    if (elDateId) elDateId.value = dateId || '';
    if (elDocId) elDocId.value = docId || '';

    // Set tipe alokasi (UTAMA / TAMBAHAN)
    const tipeData = (data.tipe || 'UTAMA').toUpperCase();
    setTipeAlokasiEdit(tipeData);

    if (elKode) elKode.value = data.kode || '';
    if (elLokasi) elLokasi.value = data.lokasi || '';
    if (elStok) elStok.value = data.qtyStok || 0;
    if (elAmbil) elAmbil.value = data.qtyAmbil || 0;
    if (elSisa) elSisa.value = data.qtySisa !== undefined ? data.qtySisa : ((data.qtyStok || 0) - (data.qtyAmbil || 0));

    // Tampilkan modal
    const modal = document.getElementById('modal-edit-rak');
    if (modal) modal.classList.remove('hidden');
}

// Fungsi untuk menutup modal
function tutupModalEditRak() {
    const modal = document.getElementById('modal-edit-rak');
    if (modal) modal.classList.add('hidden');
}

// Fungsi hitung otomatis nilai sisa di dalam modal saat input stok/ambil diubah + Pengaman Batas
function hitungOtomatisSisaEdit() {
    const inputAmbil = document.getElementById('edit-qty-ambil');
    const inputStok = document.getElementById('edit-qty-stok');
    const inputSisa = document.getElementById('edit-qty-sisa');
    
    if (!inputAmbil || !inputStok) return;

    const stok = Number(inputStok.value || 0);
    let ambil = Number(inputAmbil.value || 0);
    
    // Ambil batas maksimal kekurangan dari dataset (jika ada)
    const maxKekurangan = inputAmbil.dataset.maxKekurangan !== undefined ? Number(inputAmbil.dataset.maxKekurangan) : stok;
    
    // Tentukan batas paling ketat antara stok gudang dan sisa kekurangan FDN
    const batasMaksimum = Math.min(stok, maxKekurangan);

    if (ambil > batasMaksimum) {
        if (typeof miuiAlert === 'function') {
            miuiAlert(`QTY Ambil tidak boleh melebihi batas (Stok: ${stok}, Maks. Kekurangan: ${maxKekurangan})!`);
        } else {
            alert(`QTY Ambil melebihi batas yang diizinkan!`);
        }
        ambil = batasMaksimum;
        inputAmbil.value = ambil;
    }

    const sisa = stok - ambil;
    if (inputSisa) {
        inputSisa.value = sisa >= 0 ? sisa : 0;
    }
}

// Fungsi untuk menyimpan perubahan data ke RTDB dan Sinkronisasi Ulang (Versi Lengkap dengan Tipe)
async function simpanPerubahanItem() {
    const dateId = document.getElementById('edit-date-id').value;
    const docId = document.getElementById('edit-doc-id').value;
    const tipeBaru = document.getElementById('edit-tipe-value')?.value || 'UTAMA'; // Ambil nilai tipe (UTAMA / TAMBAHAN)
    const lokasiBaru = document.getElementById('edit-lokasi').value.trim().toUpperCase();
    const qtyStokBaru = Number(document.getElementById('edit-qty-stok').value || 0);
    const qtyAmbilBaru = Number(document.getElementById('edit-qty-ambil').value || 0);
    const qtySisaBaru = Number(document.getElementById('edit-qty-sisa').value || 0);

    if (!lokasiBaru) {
        if (typeof miuiAlert === 'function') {
            miuiAlert("Lokasi rak tidak boleh kosong!");
        } else {
            alert("Lokasi rak tidak boleh kosong!");
        }
        return;
    }
    if (qtyAmbilBaru <= 0) {
        if (typeof miuiAlert === 'function') {
            miuiAlert("QTY Ambil harus lebih besar dari 0!");
        } else {
            alert("QTY Ambil harus lebih besar dari 0!");
        }
        return;
    }

    try {
        // Update data dokumen di RTDB termasuk tipe alokasi menggunakan .update()
        await firebase.database()
                .ref(`muat_fdn/${dateId}/ambilrak/${docId}`)
                .update({
                    tipe: tipeBaru,
                    lokasi: lokasiBaru,
                    qtyStok: qtyStokBaru,
                    qtyAmbil: qtyAmbilBaru,
                    qtySisa: qtySisaBaru
                });

        console.log("Data berhasil diperbarui di RTDB!");
        tutupModalEditRak();

        // Sinkronisasi otomatis dropdown kode di layar utama setelah perubahan
        if (typeof populateMutasiKodeDropdown === 'function') {
            await populateMutasiKodeDropdown(dateId);
        }
    } catch (error) {
        console.error("Gagal memperbarui data di RTDB: ", error);
        if (typeof miuiAlert === 'function') {
            miuiAlert("Terjadi kesalahan saat memperbarui data ke database.");
        } else {
            alert("Terjadi kesalahan saat memperbarui data ke database.");
        }
    }
}

// Fungsi untuk menghapus item dari modal di RTDB dan Sinkronisasi Ulang
async function hapusItemDariModal() {
    miuiConfirm("Apakah Anda yakin ingin menghapus item rak ini dari daftar?", async function() {
        const dateId = document.getElementById('edit-date-id').value;
        const docId = document.getElementById('edit-doc-id').value;

        try {
            // Hapus data dokumen di RTDB menggunakan .remove()
            await firebase.database()
                    .ref(`muat_fdn/${dateId}/ambilrak/${docId}`)
                    .remove();

            console.log("Item berhasil dihapus dari RTDB!");
            tutupModalEditRak();

            // Sinkronisasi otomatis dropdown kode di layar utama setelah penghapusan
            if (typeof populateMutasiKodeDropdown === 'function') {
                await populateMutasiKodeDropdown(dateId);
            }
        } catch (error) {
            console.error("Gagal menghapus item dari RTDB: ", error);
            miuiAlert("Terjadi kesalahan saat menghapus data.");
        }
    });
}

// Daftarkan fungsi ke window agar bisa diakses global
window.filterWmsReportData = filterWmsReportData;
window.tambahItemMutasiList = tambahItemMutasiList;


// 1. Fungsi untuk membuka Modal Popup MIUI v5 saat tombol Cetak / Arsip diklik
window.bukaModalCetakArsip = function() {
    const tglMuat = document.getElementById('input-tgl-muat')?.value;
    if (!tglMuat) {
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert("Pilih tanggal muat terlebih dahulu!");
        } else {
            alert("Pilih tanggal muat terlebih dahulu!");
        }
        return;
    }

    let modalEl = document.getElementById('miui-modal-cetak-arsip');
    if (!modalEl) {
        const modalHtml = `
        <div id="miui-modal-cetak-arsip" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; justify-content: center; align-items: center; font-family: 'Century Gothic', Arial, sans-serif;">
            <div style="background: #ffffff; width: 320px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; animation: miuiScaleUp 0.2s ease-in-out;">
                <!-- Header MIUI v5 -->
                <div style="background-color: #ff9800; color: #1e293b; padding: 12px 16px; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">
                    🖨️ Pengaturan Cetak Arsip Mutasi
                </div>
                <!-- Body Content -->
                <div style="padding: 16px;">
                    <label for="input-jumlah-copy-v2" style="display: block; font-size: 11px; font-weight: bold; color: #334155; margin-bottom: 6px; text-transform: uppercase;">
                        Masukkan Jumlah Salinan Cetak Rak:
                    </label>
                    <input type="number" id="input-jumlah-copy-v2" value="2" min="1" max="10" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; color: #060606; font-weight: bold; box-sizing: border-box; outline: none; text-align: center;" />
                    <div style="font-size: 10px; color: #64748b; margin-top: 6px;">
                        Sistem akan mengunduh Excel Arsip, mencetak 1x Rekap Mutasi (Versi 1), dan Detail Rak (Versi 2) sesuai jumlah copy.
                    </div>
                </div>
                <!-- Footer Buttons (Di dalam Modal Pengaturan Cetak Arsip) -->
                <div style="background-color: #f8fafc; padding: 10px 16px; display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid #e2e8f0;">
                    <button type="button" onclick="tutupModalCetakArsip()" style="background-color: #e2e8f0; color: #334155; border: none; padding: 6px 12px; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer; text-transform: uppercase;">
                        🚫 Batal
                    </button>
                    
                    <!-- TOMBOL BARU: Cetak Khusus Data Tambahan dari dalam Modal -->
                    <button type="button" onclick="cetakLaporanVersi2Tambahan()" style="background-color: #d97706; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; font-size: 10px; font-weight: 900; cursor: pointer; text-transform: uppercase; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                        🖨️ Cetak Tambahan
                    </button>

                    <button type="button" onclick="eksekusiCetakArsipDariModal()" style="background-color: #ff9800; color: #1e293b; border: none; padding: 6px 14px; border-radius: 4px; font-size: 10px; font-weight: 900; cursor: pointer; text-transform: uppercase; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                        🖨️ Cetak Sekarang
                    </button>
                </div>
            </div>
        </div>
        <style>
            @keyframes miuiScaleUp {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
        </style>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('miui-modal-cetak-arsip');
    }

    modalEl.style.display = 'flex';
    document.getElementById('input-jumlah-copy-v2').value = '2';    
    document.getElementById('input-jumlah-copy-v2').focus();
};

window.tutupModalCetakArsip = function() {
    const modalEl = document.getElementById('miui-modal-cetak-arsip');
    if (modalEl) {
        modalEl.style.display = 'none';
    }
};

window.eksekusiCetakArsipDariModal = function() {
    const jmlInput = document.getElementById('input-jumlah-copy-v2');
    let jumlahCopy = parseInt(jmlInput?.value || 1);
    if (isNaN(jumlahCopy) || jumlahCopy < 1) {
        jumlahCopy = 1;
    }

    tutupModalCetakArsip();
    
    // Panggil fungsi utama cetakArsipMutasi dengan membawa parameter jumlah copy Versi 2
    window.cetakArsipMutasi(jumlahCopy);
};


// 2. Fungsi Utama Cetak Arsip Mutasi dengan Ekspor Excel di awal & Loop Versi 2
window.cetakArsipMutasi = async function(jumlahCopyV2 = 1) {
    const tglMuat = document.getElementById('input-tgl-muat')?.value;
    
    if (!tglMuat) {
        if (typeof window.miuiAlert === 'function') window.miuiAlert("Pilih tanggal muat terlebih dahulu!");
        else alert("Pilih tanggal muat terlebih dahulu!");
        return;
    }

    // Total langkah: 1 (Ekspor Excel) + 1 (Versi 1) + jumlahCopyV2 (Versi 2)
    const totalStep = 2 + jumlahCopyV2;
    let currentStep = 0;

    if (typeof window.showCetakProgress === 'function') {
        window.showCetakProgress(`Menyiapkan Dokumen Cetak & Arsip (0/${totalStep})...`);
    } else {
        console.warn("Fungsi showCetakProgress belum terdaftar di window!");
    }

    try {
        // Step 1: Ekspor & Unduh File Excel (.xls) dengan Sheet MUTASI & RAK terlebih dahulu
        currentStep++;
        if (window.showCetakProgress) {
            window.showCetakProgress(`Membuat & Mengunduh Berkas Excel Arsip (${currentStep}/${totalStep})...`);
        }
        if (typeof window.exportMutasiToExcel === 'function') {
            await window.exportMutasiToExcel(tglMuat);
        } else {
            console.warn("Fungsi exportMutasiToExcel belum tersedia.");
        }
        await new Promise(resolve => setTimeout(resolve, 600));

        // Step 2: Cetak Versi 1 (Rekap Mutasi)
        currentStep++;
        if (window.showCetakProgress) {
            window.showCetakProgress(`Mengirim Dokumen Versi 1 - Rekap Mutasi (${currentStep}/${totalStep})...`);
        }
        await cetakLaporanVersi1(tglMuat);
        await new Promise(resolve => setTimeout(resolve, 600));

        // Step 3 hingga N: Cetak Versi 2 - Berulang sebanyak jumlah copy
        for (let i = 1; i <= jumlahCopyV2; i++) {
            currentStep++;
            if (window.showCetakProgress) {
                window.showCetakProgress(`Mengirim Dokumen Detail Rak - Copy ${i} dari ${jumlahCopyV2} (${currentStep}/${totalStep})...`);
            }
            await cetakLaporanVersi2(tglMuat);
            await new Promise(resolve => setTimeout(resolve, 600));
        }

        // Sembunyikan modal progress setelah selesai
        if (typeof window.hideCetakProgress === 'function') {
            window.hideCetakProgress();
        }

        const pesanSukses = `Berhasil mengunduh arsip Excel & mengirim ${jumlahCopyV2} Detail Rak ke antrean cetak!`;
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert(pesanSukses);
        } else {
            alert(pesanSukses);
        }

    } catch (error) {
        console.error("Gagal memproses cetak & arsip:", error);
        if (typeof window.hideCetakProgress === 'function') window.hideCetakProgress();
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert("Terjadi kesalahan saat memproses cetak & arsip.");
        } else {
            alert("Terjadi kesalahan saat memproses cetak & arsip.");
        }
    }
};

// Fungsi Cetak Versi 1: Akumulasi Item Barang & FDN (Lengkap & Bersih - RTDB Version)
window.cetakLaporanVersi1 = async function(tglMuat) {
    if (!tglMuat) {
        tglMuat = document.getElementById('input-tgl-muat')?.value;
    }
    if (!tglMuat) {
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert("Pilih tanggal muat terlebih dahulu!");
        } else {
            alert("Pilih tanggal muat terlebih dahulu!");
        }
        return;
    }
    const firestoreDateId = tglMuat.replace(/-/g, '');

    try {
        const rtdbRef = firebase.database().ref(`muat_fdn/${firestoreDateId}`);

        // 1. Ambil data akumulasi barang dari node 'ambilrak' di RTDB
        const snapshotAmbil = await rtdbRef.child('ambilrak').once('value');
        const dataMap = {};

        if (snapshotAmbil.exists()) {
            const dataAmbilObj = snapshotAmbil.val();
            Object.keys(dataAmbilObj).forEach(key => {
                const d = dataAmbilObj[key];
                const kode = String(d.kode || '').trim().toUpperCase();
                if (!kode) return;

                if (!dataMap[kode]) {
                    dataMap[kode] = { total: 0, wh2: 0, wh3: 0 };
                }
                const qty = Number(d.qtyAmbil || 0);
                dataMap[kode].total += qty;
                
                const lok = String(d.lokasi || '').toUpperCase();
                if (lok.includes('WH-3') || lok === 'WH3') {
                    dataMap[kode].wh3 += qty;
                } else {
                    dataMap[kode].wh2 += qty;
                }
            });
        }

        // 2. Ambil data FDN & Tujuan dari node 'datatujuan' di RTDB dan kelompokkan berdasarkan Tujuan
        const tujuanMap = {}; 
        
        try {
            const snapshotDatatujuan = await rtdbRef.child('datatujuan').once('value');
            if (snapshotDatatujuan.exists()) {
                const dataTujuanObj = snapshotDatatujuan.val();
                Object.keys(dataTujuanObj).forEach(key => {
                    const d = dataTujuanObj[key];
                    const rawNoFdn = String(d.meta?.nomor_dokumen || d.nomor_dokumen || '').trim();
                    let tujuan = String(d.meta?.tujuan || d.tujuan || '').trim().toUpperCase();

                    // Ganti "STOCK POINT" menjadi "SP" secara konsisten
                    tujuan = tujuan.replace(/STOCK POINT/g, 'SP');

                    if (rawNoFdn && tujuan) {
                        if (!tujuanMap[tujuan]) {
                            tujuanMap[tujuan] = [];
                        }
                        if (!tujuanMap[tujuan].includes(rawNoFdn)) {
                            tujuanMap[tujuan].push(rawNoFdn);
                        }
                    }
                });
            }
        } catch (e) {
            console.log("Gagal mengambil data dari datatujuan RTDB:", e);
        }

        let listCombinedRows = [];
        const sortedKeys = Object.keys(dataMap).sort((a, b) => {
            const itemA = dataMap[a];
            const itemB = dataMap[b];
            const isWh3A = itemA.wh3 > 0 && itemA.wh2 === 0 ? 1 : 0;
            const isWh3B = itemB.wh3 > 0 && itemB.wh2 === 0 ? 1 : 0;
            if (isWh3A !== isWh3B) return isWh3B - isWh3A;
            return a.localeCompare(b);
        });

        let tujuanKeys = Object.keys(tujuanMap);
        let maxRows = Math.max(sortedKeys.length, tujuanKeys.length);

        for (let i = 0; i < maxRows; i++) {
            const kode = sortedKeys[i] || '';
            const tujuan = tujuanKeys[i] || '';
            let formattedFdn = '';

            if (tujuan && tujuanMap[tujuan]) {
                const fdnList = tujuanMap[tujuan];
                formattedFdn = fdnList.map((rawFdn, idx) => {
                    if (idx === 0) {
                        return rawFdn.length >= 5 ? rawFdn.slice(-5) : rawFdn;
                    } else {
                        return rawFdn.length >= 3 ? rawFdn.slice(-3) : rawFdn;
                    }
                }).join('/');
            }

            listCombinedRows.push({
                kode: kode,
                item: kode ? dataMap[kode] : null,
                noFdn: formattedFdn,
                tujuan: tujuan
            });
        }

        let totalSeluruh = 0, totalWh2 = 0, totalWh3 = 0;
        let rowsUtamaHtml = '';

        listCombinedRows.forEach(row => {
            const item = row.item;
            if (item) {
                totalSeluruh += item.total;
                totalWh2 += item.wh2;
                totalWh3 += item.wh3;
            }

            rowsUtamaHtml += `
                <tr>
                    <td class="text-left font-bold" style="text-align: left; padding-left: 5px; width: 75px; font-weight: bold;">${row.kode}</td>
                    <td>${item ? item.total : ''}</td>
                    <td></td>
                    <td>${item && item.wh2 > 0 ? item.wh2 : ''}</td>
                    <td>${item && item.wh3 > 0 ? item.wh3 : ''}</td>
                    <td class="text-left" style="text-align: left;">${row.noFdn}</td>
                    <td class="text-left" style="text-align: left;">${row.tujuan}</td>
                </tr>
            `;
        });

        // Baris Total Qty di bawah tabel
        rowsUtamaHtml += `
            <tr class="font-bold" style="background-color: #f9f9f9; font-weight: bold;">
                <td class="text-left" style="text-align: left; padding-left: 5px;">TOTAL QTY</td>
                <td>${totalSeluruh}</td>
                <td></td>
                <td>${totalWh2}</td>
                <td>${totalWh3}</td>
                <td></td>
                <td></td>
            </tr>
        `;

        // Format Sub-Header Waktu Lengkap
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
        
        const formatWaktuLengkap = `${hari}, ${tgl} ${bulan} ${thn} - ${jam}.${menit}.${detik}`;

        const finalHtml = `
        <html>
        <head>
            <style>
                @font-face {
                    font-family: 'Edo';
                    src: local('Edo'), url('EDO.ttf') format('truetype');
                }
                @font-face {
                    font-family: 'Century Gothic';
                    src: local('Century Gothic'), url('CenturyGothic.ttf') format('truetype');
                }

                @page { size: 215mm 330mm portrait; margin: 20mm 1mm 1mm 1mm; }
                body { 
                    font-family: 'Century Gothic', Arial, sans-serif; 
                    font-size: 10pt; 
                    margin: 0; 
                    padding: 0; 
                    color: #000; 
                }
                .header-title { 
                    font-family: 'Edo', Arial, sans-serif; 
                    font-weight: normal; 
                    font-size: 16pt; 
                    text-align: center; 
                    margin-bottom: 2px; 
                    letter-spacing: 1px;
                }
                .sub-header { 
                    font-family: 'Century Gothic', Arial, sans-serif; 
                    margin-bottom: 8px; 
                    font-size: 12pt; 
                    text-align: left;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 10px; 
                    font-family: 'Century Gothic', Arial, sans-serif;
                    font-size: 11pt;
                    table-layout: fixed;
                }
                th, td { 
                    border: 1px solid #000; 
                    padding: 3px 5px; 
                    text-align: center; 
                    vertical-align: middle; 
                }
                th { 
                    background-color: #f2f2f2; 
                    font-size: 11pt; 
                }
                .text-left { text-align: left; }
                .font-bold { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header-title">MUTASI GUDANG WH-2</div>
            <div class="sub-header">dicetak pada: ${formatWaktuLengkap}</div>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 22%;">KODE</th>
                        <th style="width: 8%;">TOTAL</th>
                        <th style="width: 5%;">V</th>
                        <th style="width: 10%;">WH-2</th>
                        <th style="width: 10%;">WH-3</th>
                        <th style="width: 20%;">NO. FDN</th>
                        <th style="width: 25%;">TUJUAN</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsUtamaHtml}
                </tbody>
            </table>
        </body>
        </html>`;

        // 3. Kirim ke Print Server (Firebase Realtime Database)
        const judulTugas = "Cetak Dokumen v1";
        const safeKeyName = `Cetak_Dokumen_v1_${tgl}-${String(blnIndex + 1).padStart(2, '0')}-${thn}_${jam}-${menit}-${detik}`;

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
        
    } catch (e) {
        console.error("Gagal mencetak laporan versi 1:", e);
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert("Gagal cetak v1: " + e.message);
        } else {
            alert("Gagal cetak v1: " + e.message);
        }
        throw e;
    }
};


// Fungsi Cetak Versi 2: Detail Ambil Rak & FDN (RTDB Version)
window.cetakLaporanVersi2 = async function(tglMuat) {
    if (!tglMuat) {
        tglMuat = document.getElementById('input-tgl-muat')?.value;
    }
    if (!tglMuat) {
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert("Pilih tanggal muat terlebih dahulu!");
        } else {
            alert("Pilih tanggal muat terlebih dahulu!");
        }
        return;
    }
    const firestoreDateId = tglMuat.replace(/-/g, '');

    try {
        const rtdbRef = firebase.database().ref(`muat_fdn/${firestoreDateId}`);

        // 1. Ambil data dari node 'ambilrak' di RTDB
        const snapshotAmbil = await rtdbRef.child('ambilrak').once('value');
        let rawDataArray = [];

        if (snapshotAmbil.exists()) {
            const dataAmbilObj = snapshotAmbil.val();
            
            // Ubah objek ke array dan urutkan berdasarkan timestamp secara ascending (kronologis)
            rawDataArray = Object.keys(dataAmbilObj).map(key => {
                return {
                    id: key,
                    ...dataAmbilObj[key]
                };
            }).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        }

        // Normalisasi properti data ambilrak
        const normalizedAmbilData = rawDataArray.map(data => ({
            id: data.id,
            kode: String(data.kode || '-').trim(),
            rak: String(data.lokasi || '-').trim(),
            ambil: Number(data.qtyAmbil || 0),
            stok: Number(data.qtyStok || 0),
            sisa: data.qtySisa !== undefined ? Number(data.qtySisa) : (Number(data.qtyStok || 0) - Number(data.qtyAmbil || 0)),
            rawDocData: data
        }));

        // 2. Ambil data FDN & Tujuan dari node 'datatujuan' di RTDB dan kelompokkan per Tujuan
        const tujuanMap = {}; 
        try {
            const snapshotDatatujuan = await rtdbRef.child('datatujuan').once('value');
            if (snapshotDatatujuan.exists()) {
                const dataTujuanObj = snapshotDatatujuan.val();
                Object.keys(dataTujuanObj).forEach(key => {
                    const d = dataTujuanObj[key];
                    const rawNoFdn = String(d.meta?.nomor_dokumen || d.nomor_dokumen || '').trim();
                    let tujuan = String(d.meta?.tujuan || d.tujuan || '').trim().toUpperCase();

                    // Ganti "STOCK POINT" menjadi "SP" secara konsisten
                    tujuan = tujuan.replace(/STOCK POINT/g, 'SP');

                    if (rawNoFdn && tujuan) {
                        if (!tujuanMap[tujuan]) {
                            tujuanMap[tujuan] = [];
                        }
                        if (!tujuanMap[tujuan].includes(rawNoFdn)) {
                            tujuanMap[tujuan].push(rawNoFdn);
                        }
                    }
                });
            }
        } catch (e) {
            console.log("Gagal mengambil data dari datatujuan RTDB:", e);
        }

        let fdnRowsData = [];
        Object.keys(tujuanMap).forEach(tujuan => {
            const fdnList = tujuanMap[tujuan];
            const formattedFdn = fdnList.map((rawFdn, idx) => {
                if (idx === 0) {
                    return rawFdn.length >= 5 ? rawFdn.slice(-5) : rawFdn;
                } else {
                    return rawFdn.length >= 3 ? rawFdn.slice(-3) : rawFdn;
                }
            }).join('/');

            fdnRowsData.push({
                noFdn: formattedFdn,
                tujuan: tujuan
            });
        });

        let rowsBodyHtml = '';
        let nomorUrut = 1;
        let lastKode = '';
        let finalMaxRows = Math.max(normalizedAmbilData.length, fdnRowsData.length);

        for (let i = 0; i < finalMaxRows; i++) {
            const ambilRow = normalizedAmbilData[i] || {};
            const itemFdn = fdnRowsData[i] || {};

            const formatVal = (val) => {
                if (val === undefined || val === null || val === '' || Number(val) === 0) {
                    return '-';
                }
                return val;
            };

            let noDisplay = '';
            let kodeDisplay = '';

            if (ambilRow.kode) {
                if (ambilRow.kode !== lastKode) {
                    // Kemunculan pertama kode ini: tampilkan nomor urut dan kode barang
                    noDisplay = nomorUrut++;
                    kodeDisplay = ambilRow.kode;
                    lastKode = ambilRow.kode;
                } else {
                    // Kode yang sama pada baris berikutnya: kosongkan nomor dan kode
                    noDisplay = '';
                    kodeDisplay = '';
                }
            }

            rowsBodyHtml += `
                <tr>
                    <td>${noDisplay}</td>
                    <td class="text-left font-bold" style="text-align: left; padding-left: 5px; font-weight: bold;">${kodeDisplay}</td>
                    <td>${ambilRow.rak || ''}</td>
                    <td>${formatVal(ambilRow.ambil)}</td>
                    <td>${formatVal(ambilRow.stok)}</td>
                    <td>${formatVal(ambilRow.sisa)}</td>
                    <td>${itemFdn.noFdn ? (i + 1) : ''}</td>
                    <td class="text-left" style="text-align: left;">${itemFdn.noFdn || ''}</td>
                    <td class="text-left" style="text-align: left;">${itemFdn.tujuan || ''}</td>
                </tr>
            `;
        }

        // Format Sub-Header Waktu Lengkap
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
        
        const formatWaktuLengkap = `${hari}, ${tgl} ${bulan} ${thn} - ${jam}.${menit}.${detik}`;

        const finalHtml = `
        <html>
        <head>
            <style>
                @font-face {
                    font-family: 'Edo';
                    src: local('Edo'), url('EDO.ttf') format('truetype');
                }
                @font-face {
                    font-family: 'Century Gothic';
                    src: local('Century Gothic'), url('CenturyGothic.ttf') format('truetype');
                }

                /* Pengaturan halaman cetak dan nomor halaman otomatis di bawah */
                @page { 
                    size: 215mm 330mm portrait; 
                    margin: 15mm 10mm 20mm 10mm; 
                    @bottom-center {
                        content: "Halaman " counter(page) " dari " counter(pages);
                        font-family: 'Century Gothic', Arial, sans-serif;
                        font-size: 9pt;
                        color: #000;
                    }
                }

                body { 
                    font-family: 'Century Gothic', Arial, sans-serif; 
                    font-size: 10pt; 
                    margin: 0; 
                    padding: 0; 
                    color: #000; 
                }

                @media print {
                    .page-footer {
                        display: block;
                    }
                }

                .header-title { 
                    font-family: 'Edo', Arial, sans-serif; 
                    font-weight: normal; 
                    font-size: 16pt; 
                    text-align: center; 
                    margin-bottom: 2px; 
                    letter-spacing: 1px;
                }
                .sub-header { 
                    font-family: 'Century Gothic', Arial, sans-serif; 
                    margin-bottom: 8px; 
                    font-size: 12pt; 
                    text-align: left;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 15px; 
                    font-family: 'Century Gothic', Arial, sans-serif;
                    font-size: 11pt;
                    table-layout: fixed;
                }
                th, td { 
                    border: 1px solid #000; 
                    padding: 3px 5px; 
                    text-align: center; 
                    vertical-align: middle; 
                }
                th { 
                    background-color: #f2f2f2; 
                    font-size: 11pt; 
                }
                .text-left { text-align: left; }
                .font-bold { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header-title">MUTASI GUDANG WH-2</div>
            <div class="sub-header">${formatWaktuLengkap}</div>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 4%;">NO</th>
                        <th style="width: 23%;">KODE</th>
                        <th style="width: 9%;">RAK</th>
                        <th style="width: 7%;">AMBIL</th>
                        <th style="width: 7%;">STOK</th>
                        <th style="width: 7%;">SISA</th>
                        <th style="width: 4%;">NO</th>
                        <th style="width: 18%;">NO. FDN</th>
                        <th style="width: 21%;">TUJUAN KIRIM</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsBodyHtml}
                </tbody>
            </table>
        </body>
        </html>`;

        // 3. Kirim ke Print Server (Firebase Realtime Database)
        const judulTugas = "Cetak Dokumen v2 (Detail Rak)";
        const safeKeyName = `Cetak_Dokumen_v2_${tgl}-${String(blnIndex + 1).padStart(2, '0')}-${thn}_${jam}-${menit}-${detik}`;

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
        
    } catch (error) {
        console.error("Gagal mencetak laporan versi 2 dari RTDB:", error);
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert("Gagal cetak v2: " + error.message);
        } else {
            alert("Gagal cetak v2: " + error.message);
        }
        throw error;
    }
};


// Fungsi Cetak Versi 2 KHUSUS TAMBAHAN: Detail Ambil Rak Tambahan & FDN Tambahan Saja
window.cetakLaporanVersi2Tambahan = async function(tglMuat) {
    if (!tglMuat) {
        tglMuat = document.getElementById('input-tgl-muat')?.value;
    }
    if (!tglMuat) {
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert("Pilih tanggal muat terlebih dahulu!");
        } else {
            alert("Pilih tanggal muat terlebih dahulu!");
        }
        return;
    }

    // --- AMBIL JUMLAH SALINAN DARI INPUT MODAL (input-jumlah-copy-v2) ---
    const inputCopy = document.getElementById('input-jumlah-copy-v2');
    let jumlahSalinan = parseInt(inputCopy?.value || 1);
    if (isNaN(jumlahSalinan) || jumlahSalinan < 1) {
        jumlahSalinan = 1;
    }

    const firestoreDateId = tglMuat.replace(/-/g, '');

    try {
        const rtdbRef = firebase.database().ref(`muat_fdn/${firestoreDateId}`);

        // 1. Ambil data dari node 'ambilrak' di RTDB dan filter HANYA yang bertipe TAMBAHAN
        const snapshotAmbil = await rtdbRef.child('ambilrak').once('value');
        let rawDataArray = [];

        if (snapshotAmbil.exists()) {
            const dataAmbilObj = snapshotAmbil.val();
            
            rawDataArray = Object.keys(dataAmbilObj).map(key => {
                return {
                    id: key,
                    ...dataAmbilObj[key]
                };
            }).filter(data => String(data.tipe || 'UTAMA').toUpperCase() === 'TAMBAHAN')
              .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        }

        if (rawDataArray.length === 0) {
            if (typeof window.miuiAlert === 'function') {
                window.miuiAlert("Tidak ada data dengan status TAMBAHAN untuk dicetak.");
            } else {
                alert("Tidak ada data dengan status TAMBAHAN untuk dicetak.");
            }
            return;
        }

        // Normalisasi properti data ambilrak tambahan
        const normalizedAmbilData = rawDataArray.map(data => ({
            id: data.id,
            kode: String(data.kode || '-').trim(),
            rak: String(data.lokasi || '-').trim(),
            ambil: Number(data.qtyAmbil || 0),
            stok: Number(data.qtyStok || 0),
            sisa: data.qtySisa !== undefined ? Number(data.qtySisa) : (Number(data.qtyStok || 0) - Number(data.qtyAmbil || 0)),
            rawDocData: data
        }));

        // 2. Ambil data FDN & Tujuan HANYA yang berstatus TAMBAHAN dari node 'datatujuan' RTDB
        const tujuanMap = {}; 
        try {
            const snapshotDatatujuan = await rtdbRef.child('datatujuan').once('value');
            if (snapshotDatatujuan.exists()) {
                const dataTujuanObj = snapshotDatatujuan.val();
                Object.keys(dataTujuanObj).forEach(key => {
                    const d = dataTujuanObj[key];
                    
                    // Deteksi apakah dokumen datatujuan ini berstatus TAMBAHAN
                    const isDocTambahan = (d.meta?.tipe || d.tipe || '').toUpperCase() === 'TAMBAHAN' || 
                                          String(key).toUpperCase().includes('TAMBAHAN') ||
                                          JSON.stringify(d).toUpperCase().includes('TAMBAHAN');

                    // Jika bukan dokumen tambahan, lewati
                    if (!isDocTambahan) return;

                    const rawNoFdn = String(d.meta?.nomor_dokumen || d.nomor_dokumen || '').trim();
                    let tujuan = String(d.meta?.tujuan || d.tujuan || '').trim().toUpperCase();

                    tujuan = tujuan.replace(/STOCK POINT/g, 'SP');

                    if (rawNoFdn && tujuan) {
                        if (!tujuanMap[tujuan]) {
                            tujuanMap[tujuan] = [];
                        }
                        if (!tujuanMap[tujuan].includes(rawNoFdn)) {
                            tujuanMap[tujuan].push(rawNoFdn);
                        }
                    }
                });
            }
        } catch (e) {
            console.log("Gagal mengambil data dari datatujuan RTDB:", e);
        }

        let fdnRowsData = [];
        Object.keys(tujuanMap).forEach(tujuan => {
            const fdnList = tujuanMap[tujuan];
            const formattedFdn = fdnList.map((rawFdn, idx) => {
                if (idx === 0) {
                    return rawFdn.length >= 5 ? rawFdn.slice(-5) : rawFdn;
                } else {
                    return rawFdn.length >= 3 ? rawFdn.slice(-3) : rawFdn;
                }
            }).join('/');

            fdnRowsData.push({
                noFdn: formattedFdn,
                tujuan: tujuan
            });
        });

        let rowsBodyHtml = '';
        let nomorUrut = 1;
        let lastKode = '';
        let finalMaxRows = Math.max(normalizedAmbilData.length, fdnRowsData.length);

        for (let i = 0; i < finalMaxRows; i++) {
            const ambilRow = normalizedAmbilData[i] || {};
            const itemFdn = fdnRowsData[i] || {};

            const formatVal = (val) => {
                if (val === undefined || val === null || val === '' || Number(val) === 0) {
                    return '-';
                }
                return val;
            };

            let noDisplay = '';
            let kodeDisplay = '';

            if (ambilRow.kode) {
                if (ambilRow.kode !== lastKode) {
                    noDisplay = nomorUrut++;
                    kodeDisplay = ambilRow.kode;
                    lastKode = ambilRow.kode;
                } else {
                    noDisplay = '';
                    kodeDisplay = '';
                }
            }

            rowsBodyHtml += `
                <tr>
                    <td>${noDisplay}</td>
                    <td class="text-left font-bold" style="text-align: left; padding-left: 5px; font-weight: bold;">${kodeDisplay}</td>
                    <td>${ambilRow.rak || ''}</td>
                    <td>${formatVal(ambilRow.ambil)}</td>
                    <td>${formatVal(ambilRow.stok)}</td>
                    <td>${formatVal(ambilRow.sisa)}</td>
                    <td>${itemFdn.noFdn ? (i + 1) : ''}</td>
                    <td class="text-left" style="text-align: left;">${itemFdn.noFdn || ''}</td>
                    <td class="text-left" style="text-align: left;">${itemFdn.tujuan || ''}</td>
                </tr>
            `;
        }

        // Format Sub-Header Waktu Lengkap
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

        const finalHtml = `
        <html>
        <head>
            <style>
                @font-face {
                    font-family: 'Edo';
                    src: local('Edo'), url('EDO.ttf') format('truetype');
                }
                @font-face {
                    font-family: 'Century Gothic';
                    src: local('Century Gothic'), url('CenturyGothic.ttf') format('truetype');
                }

                /* Pengaturan halaman cetak dan nomor halaman otomatis di bawah */
                @page { 
                    size: 215mm 330mm portrait; 
                    margin: 15mm 10mm 20mm 10mm; 
                    @bottom-center {
                        content: "Halaman " counter(page) " dari " counter(pages);
                        font-family: 'Century Gothic', Arial, sans-serif;
                        font-size: 9pt;
                        color: #000;
                    }
                }

                body { 
                    font-family: 'Century Gothic', Arial, sans-serif; 
                    font-size: 10pt; 
                    margin: 0; 
                    padding: 0; 
                    color: #000; 
                }

                .page-footer {
                    position: fixed;
                    bottom: -10mm;
                    left: 0;
                    right: 0;
                    text-align: center;
                    font-size: 9pt;
                    font-family: 'Century Gothic', Arial, sans-serif;
                    display: none;
                }

                @media print {
                    .page-footer {
                        display: block;
                    }
                }

                .header-title { 
                    font-family: 'Edo', Arial, sans-serif; 
                    font-weight: normal; 
                    font-size: 16pt; 
                    text-align: center; 
                    margin-bottom: 2px; 
                    letter-spacing: 1px;
                }
                .sub-header { 
                    font-family: 'Century Gothic', Arial, sans-serif; 
                    margin-bottom: 8px; 
                    font-size: 12pt; 
                    text-align: left;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 15px; 
                    font-family: 'Century Gothic', Arial, sans-serif;
                    font-size: 11pt;
                    table-layout: fixed;
                }
                th, td { 
                    border: 1px solid #000; 
                    padding: 3px 5px; 
                    text-align: center; 
                    vertical-align: middle; 
                }
                th { 
                    background-color: #f2f2f2; 
                    font-size: 11pt; 
                }
                .text-left { text-align: left; }
                .font-bold { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header-title">MUTASI GUDANG WH-2 (CETAK TAMBAHAN)</div>
            <div class="sub-header">${formatWaktuLengkap}</div>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 4%;">NO</th>
                        <th style="width: 23%;">KODE</th>
                        <th style="width: 9%;">RAK</th>
                        <th style="width: 7%;">AMBIL</th>
                        <th style="width: 7%;">STOK</th>
                        <th style="width: 7%;">SISA</th>
                        <th style="width: 4%;">NO</th>
                        <th style="width: 18%;">NO. FDN</th>
                        <th style="width: 21%;">TUJUAN KIRIM</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsBodyHtml}
                </tbody>
            </table>
        </body>
        </html>`;

        // 3. Kirim ke Print Server (Firebase Realtime Database) berulang sesuai jumlahSalinan
        for (let c = 1; c <= jumlahSalinan; c++) {
            const judulTugas = `Cetak Dokumen v2 Tambahan (Detail Rak) - Copy ${c} dari ${jumlahSalinan}`;
            const safeKeyName = `Cetak_Dokumen_v2_Tambahan_${tgl}-${String(blnIndex + 1).padStart(2, '0')}-${thn}_${jam}-${menit}-${detik}_copy${c}`;

            await fetch(`https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/print_jobs/${safeKeyName}.json`, {
                method: 'PUT',
                body: JSON.stringify({ 
                    judul: judulTugas,
                    waktu_teks: formatWaktuLengkap,
                    html: finalHtml, 
                    status: 'PENDING',
                    timestamp: Date.now() + c 
                }),
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert(`Berhasil mengirim ${jumlahSalinan} salinan perintah cetak tambahan!`);
        }
        
    } catch (error) {
        console.error("Gagal mencetak laporan versi 2 tambahan dari RTDB:", error);
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert("Gagal cetak v2 tambahan: " + error.message);
        } else {
            alert("Gagal cetak v2 tambahan: " + error.message);
        }
        throw error;
    }
};

// Helper Format Tanggal & Waktu
function formatTanggalIndo(tglStr) {
    if (!tglStr) return '';
    const date = new Date(tglStr);
    return date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function getCurrentTime() {
    const now = new Date();
    return now.toTimeString().split(' ')[0].substring(0, 5);
}


// Fungsi Ekspor Excel Arsip Dua Sheet (.xls) - RTDB Version
window.exportMutasiToExcel = async function(tglMuat) {
    if (!tglMuat) {
        tglMuat = document.getElementById('input-tgl-muat')?.value;
    }
    if (!tglMuat) {
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert("Pilih tanggal muat terlebih dahulu!");
        } else {
            alert("Pilih tanggal muat terlebih dahulu!");
        }
        return;
    }
    const firestoreDateId = tglMuat.replace(/-/g, '');

    try {
        if (typeof window.showCetakProgress === 'function') {
            window.showCetakProgress("Menyiapkan data untuk file Excel...");
        }

        const rtdbRef = firebase.database().ref(`muat_fdn/${firestoreDateId}`);

        // ==========================================
        // 1. AMBIL & PROSES DATA UNTUK SHEET 1 (MUTASI / VERSI 1)
        // ==========================================
        const snapshotAmbilV1 = await rtdbRef.child('ambilrak').once('value');
        const dataMapV1 = {};

        if (snapshotAmbilV1.exists()) {
            const dataAmbilObj = snapshotAmbilV1.val();
            Object.keys(dataAmbilObj).forEach(key => {
                const d = dataAmbilObj[key];
                const kode = String(d.kode || '').trim().toUpperCase();
                if (!kode) return;

                if (!dataMapV1[kode]) {
                    dataMapV1[kode] = { total: 0, wh2: 0, wh3: 0 };
                }
                const qty = Number(d.qtyAmbil || 0);
                dataMapV1[kode].total += qty;
                
                const lok = String(d.lokasi || '').toUpperCase();
                if (lok.includes('WH-3') || lok === 'WH3') {
                    dataMapV1[kode].wh3 += qty;
                } else {
                    dataMapV1[kode].wh2 += qty;
                }
            });
        }

        const tujuanMapV1 = {}; 
        try {
            const snapshotDatatujuan = await rtdbRef.child('datatujuan').once('value');
            if (snapshotDatatujuan.exists()) {
                const dataTujuanObj = snapshotDatatujuan.val();
                Object.keys(dataTujuanObj).forEach(key => {
                    const d = dataTujuanObj[key];
                    const rawNoFdn = String(d.meta?.nomor_dokumen || d.nomor_dokumen || '').trim();
                    let tujuan = String(d.meta?.tujuan || d.tujuan || '').trim().toUpperCase();
                    tujuan = tujuan.replace(/STOCK POINT/g, 'SP');

                    if (rawNoFdn && tujuan) {
                        if (!tujuanMapV1[tujuan]) tujuanMapV1[tujuan] = [];
                        if (!tujuanMapV1[tujuan].includes(rawNoFdn)) tujuanMapV1[tujuan].push(rawNoFdn);
                    }
                });
            }
        } catch (e) {
            console.log("Catatan datatujuan V1 RTDB:", e);
        }

        let listCombinedRowsV1 = [];
        const sortedKeysV1 = Object.keys(dataMapV1).sort((a, b) => {
            const itemA = dataMapV1[a];
            const itemB = dataMapV1[b];
            const isWh3A = itemA.wh3 > 0 && itemA.wh2 === 0 ? 1 : 0;
            const isWh3B = itemB.wh3 > 0 && itemB.wh2 === 0 ? 1 : 0;
            if (isWh3A !== isWh3B) return isWh3B - isWh3A;
            return a.localeCompare(b);
        });

        let tujuanKeysV1 = Object.keys(tujuanMapV1);
        let maxRowsV1 = Math.max(sortedKeysV1.length, tujuanKeysV1.length);

        for (let i = 0; i < maxRowsV1; i++) {
            const kode = sortedKeysV1[i] || '';
            const tujuan = tujuanKeysV1[i] || '';
            let formattedFdn = '';

            if (tujuan && tujuanMapV1[tujuan]) {
                const fdnList = tujuanMapV1[tujuan];
                formattedFdn = fdnList.map((rawFdn, idx) => {
                    if (idx === 0) return rawFdn.length >= 5 ? rawFdn.slice(-5) : rawFdn;
                    else return rawFdn.length >= 3 ? rawFdn.slice(-3) : rawFdn;
                }).join('/');
            }

            listCombinedRowsV1.push({
                kode: kode,
                item: kode ? dataMapV1[kode] : null,
                noFdn: formattedFdn,
                tujuan: tujuan
            });
        }

        let totalSeluruhV1 = 0, totalWh2V1 = 0, totalWh3V1 = 0;
        let sheet1XmlRows = '';

        listCombinedRowsV1.forEach((row, index) => {
            const item = row.item;
            if (item) {
                totalSeluruhV1 += item.total;
                totalWh2V1 += item.wh2;
                totalWh3V1 += item.wh3;
            }
            const valTotal = item && item.total > 0 ? item.total : '';
            const valWh2 = item && item.wh2 > 0 ? item.wh2 : '';
            const valWh3 = item && item.wh3 > 0 ? item.wh3 : '';
            const noFdnNum = row.noFdn ? (index + 1) : '';

            sheet1XmlRows += `
            <Row>
                <Cell><Data ss:Type="String">${row.kode || ''}</Data></Cell>
                <Cell><Data ss:Type="${valTotal !== '' ? 'Number' : 'String'}">${valTotal}</Data></Cell>
                <Cell><Data ss:Type="String"></Data></Cell>
                <Cell><Data ss:Type="${valWh2 !== '' ? 'Number' : 'String'}">${valWh2}</Data></Cell>
                <Cell><Data ss:Type="${valWh3 !== '' ? 'Number' : 'String'}">${valWh3}</Data></Cell>
                <Cell><Data ss:Type="${noFdnNum !== '' ? 'Number' : 'String'}">${noFdnNum}</Data></Cell>
                <Cell><Data ss:Type="String">${row.noFdn || ''}</Data></Cell>
                <Cell><Data ss:Type="String">${row.tujuan || ''}</Data></Cell>
            </Row>`;
        });

        sheet1XmlRows += `
        <Row>
            <Cell><Data ss:Type="String">TOTAL QTY</Data></Cell>
            <Cell><Data ss:Type="Number">${totalSeluruhV1}</Data></Cell>
            <Cell><Data ss:Type="String"></Data></Cell>
            <Cell><Data ss:Type="Number">${totalWh2V1}</Data></Cell>
            <Cell><Data ss:Type="Number">${totalWh3V1}</Data></Cell>
            <Cell><Data ss:Type="String"></Data></Cell>
            <Cell><Data ss:Type="String"></Data></Cell>
            <Cell><Data ss:Type="String"></Data></Cell>
        </Row>`;


        // ==========================================
        // 2. AMBIL & PROSES DATA UNTUK SHEET 2 (RAK / VERSI 2)
        // ==========================================
        const snapshotAmbilV2 = await rtdbRef.child('ambilrak').once('value');
        let rawDataArrayV2 = [];

        if (snapshotAmbilV2.exists()) {
            const dataAmbilObj = snapshotAmbilV2.val();
            rawDataArrayV2 = Object.keys(dataAmbilObj).map(key => {
                return {
                    id: key,
                    ...dataAmbilObj[key]
                };
            }).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        }

        const normalizedAmbilV2 = rawDataArrayV2.map(data => ({
            id: data.id,
            kode: String(data.kode || '-').trim(),
            rak: String(data.lokasi || '-').trim(),
            ambil: Number(data.qtyAmbil || 0),
            stok: Number(data.qtyStok || 0),
            sisa: data.qtySisa !== undefined ? Number(data.qtySisa) : (Number(data.qtyStok || 0) - Number(data.qtyAmbil || 0))
        }));

        const tujuanMapV2 = {}; 
        try {
            const snapshotDatatujuanV2 = await rtdbRef.child('datatujuan').once('value');
            if (snapshotDatatujuanV2.exists()) {
                const dataTujuanObjV2 = snapshotDatatujuanV2.val();
                Object.keys(dataTujuanObjV2).forEach(key => {
                    const d = dataTujuanObjV2[key];
                    const rawNoFdn = String(d.meta?.nomor_dokumen || d.nomor_dokumen || '').trim();
                    let tujuan = String(d.meta?.tujuan || d.tujuan || '').trim().toUpperCase();
                    tujuan = tujuan.replace(/STOCK POINT/g, 'SP');

                    if (rawNoFdn && tujuan) {
                        if (!tujuanMapV2[tujuan]) tujuanMapV2[tujuan] = [];
                        if (!tujuanMapV2[tujuan].includes(rawNoFdn)) tujuanMapV2[tujuan].push(rawNoFdn);
                    }
                });
            }
        } catch (e) {
            console.log("Catatan datatujuan V2 RTDB:", e);
        }

        let fdnRowsDataV2 = [];
        Object.keys(tujuanMapV2).forEach(tujuan => {
            const fdnList = tujuanMapV2[tujuan];
            const formattedFdn = fdnList.map((rawFdn, idx) => {
                if (idx === 0) return rawFdn.length >= 5 ? rawFdn.slice(-5) : rawFdn;
                else return rawFdn.length >= 3 ? rawFdn.slice(-3) : rawFdn;
            }).join('/');

            fdnRowsDataV2.push({
                noFdn: formattedFdn,
                tujuan: tujuan
            });
        });

        let sheet2XmlRows = '';
        let nomorUrutV2 = 1;
        let lastKodeV2 = '';
        let finalMaxRowsV2 = Math.max(normalizedAmbilV2.length, fdnRowsDataV2.length);

        for (let i = 0; i < finalMaxRowsV2; i++) {
            const ambilRow = normalizedAmbilV2[i] || {};
            const itemFdn = fdnRowsDataV2[i] || {};

            const formatVal = (val) => (val === undefined || val === null || val === '' || Number(val) === 0) ? '-' : val;

            let noDisplay = '';
            let kodeDisplay = '';

            if (ambilRow.kode) {
                if (ambilRow.kode !== lastKodeV2) {
                    noDisplay = nomorUrutV2++;
                    kodeDisplay = ambilRow.kode;
                    lastKodeV2 = ambilRow.kode;
                } else {
                    noDisplay = '';
                    kodeDisplay = '';
                }
            }

            sheet2XmlRows += `
            <Row>
                <Cell><Data ss:Type="${noDisplay !== '' ? 'Number' : 'String'}">${noDisplay !== '' ? noDisplay : ''}</Data></Cell>
                <Cell><Data ss:Type="String">${kodeDisplay}</Data></Cell>
                <Cell><Data ss:Type="String">${ambilRow.rak || ''}</Data></Cell>
                <Cell><Data ss:Type="String">${formatVal(ambilRow.ambil)}</Data></Cell>
                <Cell><Data ss:Type="String">${formatVal(ambilRow.stok)}</Data></Cell>
                <Cell><Data ss:Type="String">${formatVal(ambilRow.sisa)}</Data></Cell>
                <Cell><Data ss:Type="${itemFdn.noFdn ? 'Number' : 'String'}">${itemFdn.noFdn ? (i + 1) : ''}</Data></Cell>
                <Cell><Data ss:Type="String">${itemFdn.noFdn || ''}</Data></Cell>
                <Cell><Data ss:Type="String">${itemFdn.tujuan || ''}</Data></Cell>
            </Row>`;
        }


        // ==========================================
        // 3. FORMAT NAMA FILE & WAKTU
        // ==========================================
        const now = new Date();
        const daftarHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const hari = daftarHari[now.getDay()];
        
        const tgl = String(now.getDate()).padStart(2, '0');
        const bln = String(now.getMonth() + 1).padStart(2, '0');
        const thn = now.getFullYear();
        
        const jam = String(now.getHours()).padStart(2, '0');
        const menit = String(now.getMinutes()).padStart(2, '0');
        const detik = String(now.getSeconds()).padStart(2, '0');
        
        const namaFileExcel = `Form Mutasi ${thn} ${bln}-${tgl} ${hari} ${jam}.${menit}.${detik}.xls`;


        // ==========================================
        // 4. STRUKTUR XML SPREADSHEETML MULTI-SHEET
        // ==========================================
        const excelXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
         xmlns:o="urn:schemas-microsoft-com:office:office"
         xmlns:x="urn:schemas-microsoft-com:office:excel"
         xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
         xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Header">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:Bold="1" ss:Size="10" ss:FontName="Arial"/>
      <Interior ss:Color="#F2F2F2" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
    </Style>
    <Style ss:ID="Default">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
      <Font ss:Size="10" ss:FontName="Arial"/>
    </Style>
  </Styles>

  <!-- SHEET 1: MUTASI -->
  <Worksheet ss:Name="MUTASI">
    <Table>
      <Row ss:StyleID="Header">
        <Cell><Data ss:Type="String">KODE</Data></Cell>
        <Cell><Data ss:Type="String">TOTAL</Data></Cell>
        <Cell><Data ss:Type="String">V</Data></Cell>
        <Cell><Data ss:Type="String">WH-2</Data></Cell>
        <Cell><Data ss:Type="String">WH-3</Data></Cell>
        <Cell><Data ss:Type="String">NO</Data></Cell>
        <Cell><Data ss:Type="String">NO. FDN</Data></Cell>
        <Cell><Data ss:Type="String">TUJUAN</Data></Cell>
      </Row>
      ${sheet1XmlRows}
    </Table>
  </Worksheet>

  <!-- SHEET 2: RAK -->
  <Worksheet ss:Name="RAK">
    <Table>
      <Row ss:StyleID="Header">
        <Cell><Data ss:Type="String">NO</Data></Cell>
        <Cell><Data ss:Type="String">KODE</Data></Cell>
        <Cell><Data ss:Type="String">RAK</Data></Cell>
        <Cell><Data ss:Type="String">AMBIL</Data></Cell>
        <Cell><Data ss:Type="String">STOK</Data></Cell>
        <Cell><Data ss:Type="String">SISA</Data></Cell>
        <Cell><Data ss:Type="String">NO</Data></Cell>
        <Cell><Data ss:Type="String">NO. FDN</Data></Cell>
        <Cell><Data ss:Type="String">TUJUAN KIRIM</Data></Cell>
      </Row>
      ${sheet2XmlRows}
    </Table>
  </Worksheet>
</Workbook>`;

        const blob = new Blob([excelXml], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = namaFileExcel;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (typeof window.hideCetakProgress === 'function') window.hideCetakProgress();

    } catch (error) {
        console.error("Gagal export Excel ke RTDB:", error);
        if (typeof window.hideCetakProgress === 'function') window.hideCetakProgress();
        if (typeof window.miuiAlert === 'function') {
            window.miuiAlert("Gagal export Excel: " + error.message);
        } else {
            alert("Gagal export Excel: " + error.message);
        }
        throw error;
    }
};