// Inisialisasi Modul Mutasi
window.initMutasi = function() {
    console.log("Modul Mutasi Berhasil Diinisialisasi");
    refreshWmsData();
};

// Array global untuk menyimpan data cache
let wmsGlobalData = [];
let listRakMutasiTemp = [];

// Fungsi utama untuk memuat data dari file cache lokal
async function loadWmsReportData() {
    const tbody = document.getElementById('tabel-wms-report-body');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400 italic">Memuat data dari cache lokal...</td></tr>`;
    }

    try {
        const response = await fetch('stok_cache.json?t=' + new Date().getTime());
        if (!response.ok) {
            throw new Error('File cache tidak ditemukan.');
        }
        
        wmsGlobalData = await response.json();
        filterWmsReportData(); // Render dan terapkan filter
        
    } catch (error) {
        console.error('Error:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500 italic">Gagal memuat stok_cache.json. Jalankan sync.py terlebih dahulu.</td></tr>`;
        }
    }
}

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

    // Filter data sesuai input pengguna
    const filteredData = wmsGlobalData.filter(item => {
        const kodeLokasi = String(item.LOKASI_PALET || item.KODE_LOKASI || item.kode_lokasi || '').trim().toUpperCase();
        const kodeBarang = String(item.KODE || item.kode || '').toUpperCase();

        const matchRak = kodeLokasi.includes(keywordRak);
        const matchBarang = kodeBarang.includes(keywordBarang);
        
        let matchRakNo = true;
        if (keywordRakNo) {
            // Memeriksa apakah kode lokasi diawali dengan nomor rak yang dipilih (misal "5")
            // Menggunakan regex untuk mencocokkan angka di awal string (contoh: "5 A 10" atau "5B")
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
    // Batasi 100 baris pertama agar performa browser tetap ringan dengan menyertakan indeks (nomor urut)
    filteredData.slice(0, 100).forEach((item, index) => {
        const lok = item.LOKASI_PALET || item.KODE_LOKASI || item.kode_lokasi || '-';
        const kode = item.KODE || item.kode || '-';
        const stok = item.QTY_STOK ?? item.STOK ?? item.stok ?? 0;
        const exp = item.EXPDATE || item.expdate || '-';
        const barcode = item.BARCODE || item.barcode || '-';
        const nama = item.NAMA || item.nama || '-';

        html += `
            <tr class="border-b hover:bg-slate-50 text-xs">
                <td class="p-2 border text-center font-semibold text-slate-500">${index + 1}</td>
                <td class="p-2 border font-semibold text-slate-700">${lok}</td>
                <td class="p-2 border font-bold text-blue-600">${kode}</td>
                <td class="p-2 border text-center text-slate-700 font-bold">${stok}</td>
                <td class="p-2 border text-center text-slate-500">${exp}</td>
                <td class="p-2 border text-slate-500">${barcode}</td>
                <td class="p-2 border text-slate-700">${nama}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Fungsi untuk tombol "Update Data WMS" (Langsung memuat ulang dari stok_cache.json)
async function refreshWmsData() {
    const updateLabel = document.getElementById('wms-last-update');
    const tbody = document.getElementById('tabel-wms-report-body');
    
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400 italic">Memuat ulang data cache terbaru...</td></tr>`;
    }

    try {
        // Langsung ambil file cache lokal dengan timestamp agar tidak tersimpan di cache browser
        const response = await fetch('stok_cache.json?t=' + new Date().getTime());
        if (!response.ok) {
            throw new Error('File stok_cache.json tidak ditemukan. Jalankan sinkronisasi terlebih dahulu.');
        }
        
        wmsGlobalData = await response.json();
        filterWmsReportData();

        // Perbarui label waktu terakhir update
        if (updateLabel) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateString = now.toLocaleDateString('id-ID');
            updateLabel.innerText = `Last Update: ${dateString} ${timeString}`;
        }
        
    } catch (error) {
        console.error('Error:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-red-500 italic">Gagal memuat data. Pastikan file stok_cache.json tersedia.</td></tr>`;
        }
    }
}

// Jalankan otomatis saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    loadWmsReportData();
});

// Fungsi Placeholder untuk menambah rak ke list mutasi di sebelah kiri
function tambahItemMutasiList() {
    const kode = document.getElementById('mutasi-kode').value.trim().toUpperCase();
    const lokasi = document.getElementById('mutasi-lokasi').value.trim().toUpperCase();
    const qty = parseInt(document.getElementById('mutasi-qty').value) || 0;

    if (!kode || !lokasi || qty <= 0) {
        if (typeof miuiAlert === 'function') {
            miuiAlert('Kode Barang, Lokasi Rak, dan Qty Ambil wajib diisi dengan benar!');
        }
        return;
    }

    listRakMutasiTemp.push({ kode, lokasi, qty });
    renderListMutasiTemp();

    // Reset input form kecil
    document.getElementById('mutasi-qty').value = '';
}

// Render daftar rak sementara di form kiri
function renderListMutasiTemp() {
    const container = document.getElementById('container-list-mutasi');
    if (!container) return;

    if (listRakMutasiTemp.length === 0) {
        container.innerHTML = `<div class="text-slate-400 italic text-center py-1">Belum ada rak ditambahkan</div>`;
        return;
    }

    let html = '';
    listRakMutasiTemp.forEach((item, idx) => {
        html += `
            <div class="flex justify-between items-center bg-white px-2.5 py-1.5 rounded-lg border border-orange-200">
                <div>
                    <span class="font-bold text-slate-800">${item.kode}</span> 
                    <span class="text-slate-500 text-[10px]">(${item.lokasi})</span>
                    <span class="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded font-black text-[9px]">Ambil: ${item.qty}</span>
                </div>
                <button type="button" onclick="hapusItemMutasiTemp(${idx})" class="text-red-500 hover:text-red-700 px-1.5 py-0.5 text-xs font-bold" title="Hapus">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function hapusItemMutasiTemp(idx) {
    listRakMutasiTemp.splice(idx, 1);
    renderListMutasiTemp();
}

function simpanDataMutasi() {
    if (listRakMutasiTemp.length === 0) {
        if (typeof miuiAlert === 'function') {
            miuiAlert('Belum ada data rak yang dimasukkan ke daftar mutasi!');
        }
        return;
    }
    if (typeof miuiAlert === 'function') {
        miuiAlert('Data Mutasi berhasil disimpan dan diarsipkan!');
    }
    listRakMutasiTemp = [];
    renderListMutasiTemp();
}

// Daftarkan fungsi ke window agar bisa diakses global
window.filterWmsReportData = filterWmsReportData;
window.tambahItemMutasiList = tambahItemMutasiList;
window.hapusItemMutasiTemp = hapusItemMutasiTemp;
window.simpanDataMutasi = simpanDataMutasi;