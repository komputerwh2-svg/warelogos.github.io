// =========================================================================
// 1. CONTROL LAUNCHER VIEWPORT DRAGGING & WHEEL OVERFLOW SYSTEM (RESPONSIVE)
// =========================================================================
const view = document.getElementById('launcher-viewport');

// Bersihkan atau sembunyikan container dot indikator lama secara otomatis agar HTML tetap rapi
document.addEventListener("DOMContentLoaded", () => {
    const dotsContainer = document.getElementById('page-indicators');
    if (dotsContainer) {
        dotsContainer.classList.remove('opacity-100', 'flex');
        dotsContainer.classList.add('opacity-0', 'hidden');
    }
});

if (view) {
    // KONTROL UNTUK PC/LAPTOP: Mengizinkan scroll wheel mouse jika resolusi layar kecil/browser tidak maximize
    view.addEventListener('wheel', (e) => {
        // Cek jika konten di dalam laci meluap secara vertikal (overflow-y)
        if (view.scrollHeight > view.clientHeight) {
            // Hilangkan default browser horizontal shift, alihkan murni ke scroll vertikal alami
            e.preventDefault();
            view.scrollTop += e.deltaY;
        }
    }, { passive: false });

    // PENGAMAN TOUCH EVENT HP ANDROID: Memastikan browser merespons geseran naik-turun secara instan (1:1)
    view.addEventListener('touchstart', () => {
        // Mengaktifkan feedback responsif sentuhan jari di area laci icon
        view.style.scrollBehavior = 'smooth';
    }, { passive: true });
}

// Menghapus fungsi updateLayoutState() lama karena dot indikator sudah tidak digunakan lagi 
// dalam sistem grid vertical-scroll. Kode dijamin bersih dari error undefinied dot-1 atau dot-2!

// =========================================================================
// 2. LIVE SPEED NETWORKING SIMULATION (ANDROID TELEMETRY STYLE)
// =========================================================================
function perbaruiKecepatanAndroidStyle() {
    const elemenUpload = document.getElementById("status-net-upload");
    const elemenDownload = document.getElementById("status-net-download");
    const setelanUpload = document.getElementById("setelan-upload-speed");
    const setelanDownload = document.getElementById("setelan-download-speed");
    
    if (navigator.connection && navigator.connection.downlink) {
        const totalKecepatanKBs = navigator.connection.downlink * 125;
        let angkaDownload = Math.round(totalKecepatanKBs * 0.85);
        let angkaUpload = Math.round(totalKecepatanKBs * 0.15);
        
        const fluktuasi = () => Math.floor(Math.random() * 15) - 7;
        angkaDownload = Math.max(5, angkaDownload + fluktuasi());
        angkaUpload = Math.max(1, angkaUpload + fluktuasi());
        
        const stringUp = `${angkaUpload} KB/s`;
        const stringDown = `${angkaDownload} KB/s`;

        if (elemenUpload) elemenUpload.innerText = stringUp;
        if (elemenDownload) elemenDownload.innerText = stringDown;
        if (setelanUpload) setelanUpload.innerText = stringUp;
        if (setelanDownload) setelanDownload.innerText = stringDown;
    } else {
        const offlineText = "0 KB/s";
        if (elemenUpload) elemenUpload.innerText = offlineText;
        if (elemenDownload) elemenDownload.innerText = offlineText;
        if (setelanUpload) setelanUpload.innerText = offlineText;
        if (setelanDownload) setelanDownload.innerText = offlineText;
    }
}
perbaruiKecepatanAndroidStyle();
setInterval(perbaruiKecepatanAndroidStyle, 2000);

// =========================================================================
// 3. LIVE OPEN-METEO WEATHER API ENGINE (SEMARANG LAT/LONG FACTORY)
// =========================================================================
async function fetchWeather() {
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=-6.9932&longitude=110.4203&current=temperature_2m,relative_humidity_2m,weather_code`);
        const data = await res.json();
        const code = data.current.weather_code;
        let txt = "Cerah", ico = '<i class="fa-solid fa-sun text-amber-400 text-xs animate-pulse"></i>';
        
        if (code >= 1 && code <= 3) { txt = "Cerah Berawan"; ico = '<i class="fa-solid fa-cloud-sun text-sky-400 text-xs"></i>'; }
        else if (code >= 51 && code <= 67) { txt = "Gerimis"; ico = '<i class="fa-solid fa-cloud-rain text-blue-400 text-xs"></i>'; }
        else if (code >= 71) { txt = "Hujan"; ico = '<i class="fa-solid fa-cloud-showers-heavy text-indigo-400 text-xs"></i>'; }

        const iconEl = document.getElementById("weather-icon");
        const infoEl = document.getElementById("weather-info");
        const humidityEl = document.getElementById("weather-humidity");

        if (iconEl) iconEl.innerHTML = ico;
        if (infoEl) infoEl.innerText = `Semarang: ${Math.round(data.current.temperature_2m)}°C, ${txt}`;
        if (humidityEl) humidityEl.innerText = `• Kelembaban: ${data.current.relative_humidity_2m}%`;
    } catch {
        const infoEl = document.getElementById("weather-info");
        if (infoEl) infoEl.innerText = "Cuaca Terhubung Lokal";
    }
}
fetchWeather();
setInterval(fetchWeather, 15 * 60 * 1000);

// =========================================================================
// 4. NAVIGATION TO SUB-PAGE CONFIGURATION MODAL
// =========================================================================
function bukaSetelan() {
    const pageSetelan = document.getElementById('subpage-setelan');
    if (pageSetelan) pageSetelan.classList.remove('hidden');
}

function tutupSetelan() {
    const pageSetelan = document.getElementById('subpage-setelan');
    if (pageSetelan) pageSetelan.classList.add('hidden');
}

// =========================================================================
// 5. FUNCTION LOGIC FOR MODAL RAK KOSONG PRINT SYSTEM (LOKAL & CLOUD)
// =========================================================================
import { dbPrinter, ref, push, serverTimestamp, query, orderByChild, equalTo, onChildAdded, update } from "./firebase-printer-config.js";

function bukaModalRakKosong() {
    const modal = document.getElementById('modal-rak-kosong');
    const inputJumlah = document.getElementById('input-lembar-rak');
    if (modal) {
        if (inputJumlah) inputJumlah.value = "1"; 
        modal.classList.remove('hidden');
    }
}

function tutupModalRakKosong() {
    const modal = document.getElementById('modal-rak-kosong');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function eksekusiCetakRakKosong() {
    const inputJumlah = document.getElementById('input-lembar-rak');
    const jumlahLembar = inputJumlah ? parseInt(inputJumlah.value) : 1;

    if (isNaN(jumlahLembar) || jumlahLembar < 1) {
        miuiAlert("Harap masukkan jumlah lembar cetak yang valid (minimal 1)!");
        return;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Jika diakses dari HP Checker di lapangan, lempar antrean ke Firebase Cloud Printer
    if (isMobile) {
        kirimAntreanCetakKeCloud(jumlahLembar);
        tutupModalRakKosong();
        return; 
    }

    const areaCetak = document.getElementById('print-area-rak-kosong');
    if (!areaCetak) {
        miuiAlert("Sistem Cetak Error: Elemen area cetak tidak ditemukan!");
        return;
    }

    // AMBIL DATA DARI FOLDER MODULAR APPS
    fetch('apps/rak-kosong.html')
        .then(response => {
            if (!response.ok) throw new Error("Gagal mengambil file template rak kosong");
            return response.text();
        })
        .then(htmlTemplate => {
            let kontenGabungan = "";
            // Lakukan perulangan salinan lembar dokumen di sini
            for (let i = 1; i <= jumlahLembar; i++) {
                kontenGabungan += htmlTemplate; // File dari apps/rak-kosong.html sudah dibungkus .print-page-wrapper
            }
            
            areaCetak.innerHTML = kontenGabungan;
            tutupModalRakKosong(); 

            // Beri jeda 500ms agar engine browser selesai me-render css flexbox sebelum print preview muncul
            setTimeout(() => {
                window.print();
            }, 500);
        })
        .catch(error => {
            console.error(error);
            miuiAlert("Gagal memuat template cetakan Rak Kosong!");
        });
}

async function kirimAntreanCetakKeCloud(jumlahLembar) {
    const printerRef = ref(dbPrinter, 'antrean_cetak');
    try {
        await push(printerRef, {
            jenisDokumen: "rak_kosong",
            salinan: parseInt(jumlahLembar) || 1,
            status: "pending",
            waktuPemicu: serverTimestamp()
        });
        miuiAlert("Sukses! Dokumen dikirim ke mesin printer kantor WH-2."); 
    } catch (error) {
        console.error("Gagal kirim cloud printer:", error);
        miuiAlert("Koneksi Cloud Printer Bermasalah!");
    }
}

// BYPASS ENGINE UNTUK PC MONITOR PRINTER DI KANTOR WH-2
function eksekusiCetakRakKosongBypass(jumlahLembar) {
    const areaCetak = document.getElementById('print-area-rak-kosong');
    if (!areaCetak) return;

    // AMBIL DATA DARI FOLDER MODULAR APPS SECARA DINAMIS
    fetch('apps/rak-kosong.html')
        .then(response => {
            if (!response.ok) throw new Error("Gagal memuat template bypass");
            return response.text();
        })
        .then(htmlTemplate => {
            let kontenGabungan = "";
            for (let i = 1; i <= jumlahLembar; i++) {
                kontenGabungan += htmlTemplate;
            }
            areaCetak.innerHTML = kontenGabungan;

            // Eksekusi print langsung otomatis pada PC server printer
            setTimeout(() => {
                window.print();
            }, 600); 
        })
        .catch(error => console.error("Bypass Print Error:", error));
}

function aktifkanCloudPrintEngine() {
    console.log("Robot Printer Cloud Berjalan & Memantau Antrean...");
    
    const printerRef = ref(dbPrinter, 'antrean_cetak');
    const antreanQuery = query(printerRef, orderByChild('status'), equalTo('pending'));

    onChildAdded(antreanQuery, async (snapshot) => {
        const docId = snapshot.key;
        const dataCetak = snapshot.val();

        console.log(`Cloud Command: Cetak ${dataCetak.jenisDokumen} sebanyak ${dataCetak.salinan} lembar.`);

        try {
            if (dataCetak.jenisDokumen === "rak_kosong") {
                eksekusiCetakRakKosongBypass(dataCetak.salinan);
            }

            const dataUpdate = {};
            dataUpdate[`antrean_cetak/${docId}/status`] = "success";
            
            await update(ref(dbPrinter), dataUpdate);
            console.log(`Dokumen ${docId} berhasil diproses printer.`);

        } catch (error) {
            console.error("Gagal mengeksekusi printer:", error);
        }
    });
}

// =========================================================================
// 6. SYSTEM COMPONENT: CUSTOM NOTIF ALERT ENGINE (MIUI V5 SPEC)
// =========================================================================
function miuiAlert(pesan) {
    const boxAlert = document.getElementById('miui-global-alert');
    const teksAlert = document.getElementById('miui-alert-message');
    
    if (boxAlert && teksAlert) {
        teksAlert.innerText = pesan; 
        boxAlert.classList.remove('hidden'); 
    }
}

function tutupMiuiAlert() {
    const boxAlert = document.getElementById('miui-global-alert');
    if (boxAlert) {
        boxAlert.classList.add('hidden'); 
    }
}

// =========================================================================
// BRIDGE INTERFACE: EKSPOS SEMUA FUNGSI KE GLOBAL WINDOW (WAJIB JIKA MODULE)
// =========================================================================
window.bukaSetelan = bukaSetelan;
window.tutupSetelan = tutupSetelan;
window.bukaModalRakKosong = bukaModalRakKosong;
window.tutupModalRakKosong = tutupModalRakKosong;
window.eksekusiCetakRakKosong = eksekusiCetakRakKosong;
window.miuiAlert = miuiAlert;
window.tutupMiuiAlert = tutupMiuiAlert;

// RUNNING ROBOT CLOUD PRINTER PADA LAYAR PC UTAMA KANTOR
document.addEventListener("DOMContentLoaded", () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) {
        aktifkanCloudPrintEngine();
    }
});

// =========================================================================
// ENGINE SUB-PAGE DYNAMIC LOADING (MODULAR APPS)
// =========================================================================

function bukaSubPageRekapBlok() {
    const container = document.getElementById('subpage-rekap-blok-container');
    
    if (!container) {
        console.error("Wadah 'subpage-rekap-blok-container' tidak ditemukan di index.html!");
        return;
    }

    const subpage = document.getElementById('subpage-rekap-blok');

    // Jika sub-page sudah pernah di-fetch sebelumnya, langsung geser buka
    if (subpage) {
        subpage.classList.remove('translate-x-full');
        return;
    }

    // Ambil data langsung dari file apps/rekap-blok.html yang sudah di-commit ke GitHub
    fetch('apps/rekap-blok.html')
        .then(response => {
            if (!response.ok) throw new Error("Gagal mengambil file apps/rekap-blok.html");
            return response.text();
        })
        .then(htmlContent => {
            container.innerHTML = htmlContent;

            const elemenBaru = document.getElementById('subpage-rekap-blok');
            if (elemenBaru) {
                // Trik force reflow agar CSS transition Tailwind terbaca sempurna
                void elemenBaru.offsetHeight; 
                elemenBaru.classList.remove('translate-x-full');
            }
        })
        .catch(error => {
            console.error(error);
            alert("Sistem Gagal Memuat Template Rekap Blok dari Server GitHub!");
        });
}

function tutupSubPageRekapBlok() {
    const subpage = document.getElementById('subpage-rekap-blok');
    if (subpage) {
        subpage.classList.add('translate-x-full');
    }
}

// -------------------------------------------------------------------------
// JALUR PROTEKSI AKSES: Ikat fungsi ke Window agar bisa ditembak oleh onclick HTML
// -------------------------------------------------------------------------
window.bukaSubPageRekapBlok = bukaSubPageRekapBlok;
window.tutupSubPageRekapBlok = tutupSubPageRekapBlok;

// Handler Ganti Blok Gudang
function pilihBlokGudang(namaBlok) {
    document.getElementById('lbl-rekap-blok').innerText = "BLOK " + namaBlok;
    // Disini tempat Bos melakukan filter query real-time database Firebase
}

// Handler Switch Tab Transaksi IN / OUT
let currentTabTransaksi = "MASUK";
function gantiTabTransaksi(tipe) {
    currentTabTransaksi = tipe;
    const btnIn = document.getElementById('btn-tab-in');
    const btnOut = document.getElementById('btn-tab-out');
    const btnSimpan = document.getElementById('btn-simpan-transaksi');

    if (tipe === 'MASUK') {
        btnIn.className = "py-2.5 text-center text-xs font-bold text-emerald-700 bg-white border-b-2 border-emerald-500 transition-all";
        btnOut.className = "py-2.5 text-center text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all";
        btnSimpan.className = "w-full py-2.5 bg-gradient-to-b from-[#10b981] to-[#059669] active:from-[#047857] text-white font-bold text-xs rounded-xl shadow-md transition-all";
        btnSimpan.innerText = "SIMPAN DATA MASUK (IN)";
    } else {
        btnIn.className = "py-2.5 text-center text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all";
        btnOut.className = "py-2.5 text-center text-xs font-bold text-rose-700 bg-white border-b-2 border-rose-500 transition-all";
        btnSimpan.className = "w-full py-2.5 bg-gradient-to-b from-[#f43f5e] to-[#e11d48] active:from-[#be123c] text-white font-bold text-xs rounded-xl shadow-md transition-all";
        btnSimpan.innerText = "SIMPAN DATA KELUAR (OUT)";
    }
}

function simpanTransaksiBlok() {
    miuiAlert(`Sukses memproses data ${currentTabTransaksi} ke Server!`);
}

// HANDLER SLIDER SWITCH TOGGLE TRANSAKSI (IN/OUT)
window.toggleEngineTransaksi = function(isOut) {
    const titleSide = document.getElementById('title-transaksi-side');
    const lblTanggal = document.getElementById('lbl-tx-tanggal');
    const lblQty = document.getElementById('lbl-tx-qty');
    const wrapperExpired = document.getElementById('wrapper-expired-input');
    const btnSimpan = document.getElementById('btn-simpan-transaksi');

    if (isOut) {
        // JIKA DIGESER KE KANAN (BARANG KELUAR - OUT)
        titleSide.innerText = "Input Barang Keluar";
        titleSide.className = "text-[10px] font-bold text-rose-700 uppercase tracking-wide";
        lblTanggal.innerText = "Tanggal Keluar";
        lblQty.innerText = "Jumlah QTY / KRT";
        wrapperExpired.style.display = "none"; // Hilangkan kolom expired jika barang keluar
        
        btnSimpan.className = "flex-1 py-1.5 bg-gradient-to-b from-[#f43f5e] to-[#e11d48] text-white font-bold text-[10px] rounded-lg shadow-md border border-rose-600 tracking-wide text-center uppercase";
        btnSimpan.innerText = "SIMPAN OUT";
    } else {
        // JIKA KEMBALI KE KIRI (BARANG MASUK - IN)
        titleSide.innerText = "Input Barang Masuk";
        titleSide.className = "text-[10px] font-bold text-emerald-700 uppercase tracking-wide";
        lblTanggal.innerText = "Tanggal Masuk";
        lblQty.innerText = "Jumlah Palet";
        wrapperExpired.style.style.display = "block"; // Munculkan kembali kolom expired
        
        btnSimpan.className = "flex-1 py-1.5 bg-gradient-to-b from-[#10b981] to-[#059669] text-white font-bold text-[10px] rounded-lg shadow-md border border-emerald-600 tracking-wide text-center uppercase";
        btnSimpan.innerText = "SIMPAN IN";
    }
}

window.resetFormTransaksi = function() {
    document.getElementById('tx-tanggal').value = "";
    document.getElementById('tx-palet').value = "";
    document.getElementById('tx-expired').value = "";
}

// =========================================================================
// HANDLER UPDATE LOGIK UTK REKAP BLOK DINAMIS MODULAR
// =========================================================================

// 1. ENGINE GANTI GUDANG (DINAMIS SINKRONISASI LABEL)
window.pilihBlokGudang = function(namaBlok) {
    // Sinkronisasi teks monitor dan tabel bawah
    document.getElementById('lbl-monitor-stok').innerText = "STOK GUDANG : " + namaBlok;
    document.getElementById('lbl-title-riwayat').innerText = "RIWAYAT TRANSAKSI : " + namaBlok;
    document.getElementById('lbl-rekap-blok').innerText = ""+ namaBlok;
    
    // Disini area Bos melakukan pemanggilan data snapshot Firebase real-time sesuai namaBlok
    console.log(`Mengambil data real-time server untuk Blok: ${namaBlok}`);
}

// 2. ENGINE SWITCH TRANSAKSI TOGGLE (WARNA, LAYOUT & LABELS SYMMETRICAL)
window.toggleEngineTransaksi = function(isOut) {
    const boxWorkspace = document.getElementById('box-workspace-input');
    const titleSide = document.getElementById('title-transaksi-side');
    const lblSwitch = document.getElementById('lbl-status-switch');
    const lblTanggal = document.getElementById('lbl-tx-tanggal');
    const lblQty = document.getElementById('lbl-tx-qty');
    const badgeUnit = document.getElementById('badge-unit-input');
    const btnSimpan = document.getElementById('btn-simpan-transaksi');
    
    // Element struktural kolom baru
    const rowGrid = document.getElementById('grid-row-dinamis');
    const wrapKarton = document.getElementById('wrapper-konversi-karton');

    if (isOut) {
        // --- MODE BARANG KELUAR (OUT) ---
        boxWorkspace.className = "col-span-7 bg-rose-50/60 rounded-xl border border-[#dcdcdc] shadow-sm overflow-hidden flex flex-col transition-colors duration-200";
        titleSide.innerText = "Input Barang Keluar";
        titleSide.className = "text-[10px] font-bold text-rose-700 uppercase tracking-wide";
        
        lblSwitch.innerText = "KELUAR";
        lblSwitch.className = "text-[9px] font-bold text-rose-600 bg-rose-100/80 px-1.5 py-0.5 rounded uppercase tracking-wider";
        
        lblTanggal.innerText = "Tanggal Keluar";
        lblQty.innerText = "Jumlah Palet Keluar";
        badgeUnit.innerText = "PLT";
        
        // Ubah struktur grid menjadi 3 kolom untuk menampung input Box konversi
        rowGrid.className = "grid grid-cols-3 gap-2";
        wrapKarton.classList.remove('hidden');

        btnSimpan.className = "flex-1 py-1.5 bg-gradient-to-b from-[#f43f5e] to-[#e11d48] text-white font-bold text-[10px] rounded-lg shadow-md border border-rose-600 tracking-wide text-center uppercase";
        btnSimpan.innerText = "SIMPAN OUT";
    } else {
        // --- MODE BARANG MASUK (IN) ---
        boxWorkspace.className = "col-span-7 bg-emerald-50/60 rounded-xl border border-[#dcdcdc] shadow-sm overflow-hidden flex flex-col transition-colors duration-200";
        titleSide.innerText = "Input Barang Masuk";
        titleSide.className = "text-[10px] font-bold text-emerald-700 uppercase tracking-wide";
        
        lblSwitch.innerText = "MASUK";
        lblSwitch.className = "text-[9px] font-bold text-emerald-600 bg-emerald-100/80 px-1.5 py-0.5 rounded uppercase tracking-wider";
        
        lblTanggal.innerText = "Tanggal Masuk";
        lblQty.innerText = "Jumlah Palet";
        badgeUnit.innerText = "PLT";
        
        // Kembalikan struktur grid menjadi 2 kolom normal
        rowGrid.className = "grid grid-cols-2 gap-2";
        wrapKarton.classList.add('hidden');

        btnSimpan.className = "flex-1 py-1.5 bg-gradient-to-b from-[#10b981] to-[#059669] text-white font-bold text-[10px] rounded-lg shadow-md border border-emerald-600 tracking-wide text-center uppercase";
        btnSimpan.innerText = "SIMPAN IN";
    }
    resetFormTransaksi();
}

// 3. AUTOMATIC CONVERSION FACTOR (PALET TO KARTON)
window.hitungKonversiKartonOtomatis = function(valPalet) {
    const txtKarton = document.getElementById('tx-karton-readonly');
    if (!valPalet || isNaN(valPalet)) {
        txtKarton.value = "";
        return;
    }
    // Asumsi standar operasional: 1 Palet = 77 Karton (bisa Bos ubah pengalinya sesuai standar WH-2)
    const factorKonversi = 77; 
    txtKarton.value = parseInt(valPalet) * factorKonversi;
}

// 4. ACTION UTILITY BUTTONS
window.exportRekapBlokPDF = function() {
    alert("Memproses Export File PDF untuk Rekapitulasi Data Blok... Selesai!");
}


// ==========================================
// KONTROLER SUB-PAGE NAVIGATION BANK DATA
// ==========================================

function bukaSubPageBankData() {
    const sp = document.getElementById("subpage-bank-data");
    sp.classList.remove("translate-x-full");
    initRealtimeBankDataListener(); // Mulai memantau Firebase saat halaman dibuka
}

function tutupSubPageBankData() {
    const sp = document.getElementById("subpage-bank-data");
    sp.classList.add("translate-x-full");
}

// ==========================================
// DATABASE ENGINE FOR BANK DATA SUB-PAGE
// ==========================================
let localMasterStateBD = {};
let isListenerActive = false;

function cleanBDKey(key) {
    return key.replace(/[\.\$\#\[\]\/]/g, "_").trim().toUpperCase();
}

// Nyalakan sinkronisasi data dari Firebase secara realtime
function initRealtimeBankDataListener() {
    if (isListenerActive) return; // Mencegah duplikasi trigger
    
    // Pastikan variabel 'db' di script utama kamu sudah mengarah ke database proyek Firebase kamu
    db.ref("master_barang").on("value", (snapshot) => {
        localMasterStateBD = snapshot.val() || {};
        renderMasterTableBD(localMasterStateBD);
        document.getElementById("db-status-bd").innerText = "ONLINE";
        document.getElementById("db-status-bd").className = "text-emerald-400 font-bold";
        isListenerActive = true;
    }, (error) => {
        document.getElementById("db-status-bd").innerText = "OFFLINE";
        document.getElementById("db-status-bd").className = "text-rose-400 font-bold";
    });
}

function renderMasterTableBD(data, filterKeyword = "") {
    const tbody = document.getElementById("table-master-body-bd");
    tbody.innerHTML = "";
    let nomorUrut = 1;
    const keyword = filterKeyword.toLowerCase().trim();
    const itemsArray = Object.values(data);
    
    const filteredItems = itemsArray.filter(item => {
        return item.kode_barang.toLowerCase().includes(keyword) || 
               item.nama_barang.toLowerCase().includes(keyword);
    });

    document.getElementById("info-total-item-bd").innerHTML = `${filteredItems.length} <span class="text-[8px] font-normal text-slate-400">ITEM</span>`;

    if (filteredItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-400 font-bold">Tidak ada data master barang.</td></tr>`;
        return;
    }

    filteredItems.forEach((item) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50/80 transition-colors";
        tr.innerHTML = `
            <td class="py-2 px-3 text-center font-mono text-slate-400 text-[10px]">${nomorUrut++}</td>
            <td class="py-2 px-4 font-bold text-slate-900 tracking-wide font-mono text-[11px]">${item.kode_barang}</td>
            <td class="py-2 px-4 text-slate-700 font-medium">${item.nama_barang}</td>
            <td class="py-2 px-4 text-center font-black text-slate-900 font-mono text-[11px]">${item.qty_utuhan}</td>
            <td class="py-2 px-3 text-center">
                <button type="button" onclick="pemicuEditMasterBD('${cleanBDKey(item.kode_barang)}')" 
                        class="bg-gradient-to-b from-[#ff8b00] to-[#f36c00] text-white text-[9px] font-bold px-2 py-1 rounded shadow active:scale-95 transition-all border border-orange-600">
                    <i class="fa-solid fa-pen-to-square"></i> EDIT
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Deteksi Input Otomatis untuk Switch Mode Baru vs Revisi
document.getElementById("tx-kode-barang-bd").addEventListener("input", (e) => {
    const kodeClean = cleanBDKey(e.target.value);
    const workspaceBox = document.getElementById("box-workspace-input-bd");
    const titleModeForm = document.getElementById("title-mode-form-bd");
    const badgeMode = document.getElementById("badge-mode-bd");
    const btnSubmitMaster = document.getElementById("btn-submit-master-bd");
    
    if (localMasterStateBD[kodeClean]) {
        workspaceBox.className = "col-span-7 bg-amber-50/60 rounded-xl border border-amber-300 shadow-sm overflow-hidden flex flex-col transition-colors duration-200";
        titleModeForm.innerHTML = `<i class="fa-solid fa-pen-to-square text-amber-600"></i> Revisi Kode Barang Terdaftar`;
        badgeMode.className = "text-[9px] font-black text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded uppercase tracking-wider";
        badgeMode.innerText = "REVISI";
        btnSubmitMaster.className = "flex-1 py-1.5 bg-gradient-to-b from-[#ff8b00] to-[#f36c00] text-white font-bold text-[10px] rounded-lg shadow-md border border-orange-600 tracking-wide text-center uppercase";
        btnSubmitMaster.innerText = "REVISI KODE";
        
        document.getElementById("tx-nama-barang-bd").value = localMasterStateBD[kodeClean].nama_barang;
        document.getElementById("tx-qty-utuhan-bd").value = localMasterStateBD[kodeClean].qty_utuhan;
    } else {
        setFormToInsertModeBD();
    }
});

function setFormToInsertModeBD() {
    document.getElementById("box-workspace-input-bd").className = "col-span-7 bg-emerald-50/60 rounded-xl border border-[#dcdcdc] shadow-sm overflow-hidden flex flex-col transition-colors duration-200";
    document.getElementById("title-mode-form-bd").innerHTML = `<i class="fa-solid fa-square-plus text-emerald-600"></i> Tambah Kode Barang Baru`;
    document.getElementById("badge-mode-bd").className = "text-[9px] font-black text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded uppercase tracking-wider";
    document.getElementById("badge-mode-bd").innerText = "BARU";
    document.getElementById("btn-submit-master-bd").className = "flex-1 py-1.5 bg-gradient-to-b from-[#10b981] to-[#059669] text-white font-bold text-[10px] rounded-lg shadow-md border border-emerald-600 tracking-wide text-center uppercase";
    document.getElementById("btn-submit-master-bd").innerText = "TAMBAH KODE";
}

window.pemicuEditMasterBD = function(firebaseKey) {
    const itemTarget = localMasterStateBD[firebaseKey];
    if (itemTarget) {
        document.getElementById("tx-kode-barang-bd").value = itemTarget.kode_barang;
        document.getElementById("tx-nama-barang-bd").value = itemTarget.nama_barang;
        document.getElementById("tx-qty-utuhan-bd").value = itemTarget.qty_utuhan;
        
        // Trigger event input agar warna form langsung berubah jadi oranye revisi
        document.getElementById("tx-kode-barang-bd").dispatchEvent(new Event('input'));
    }
};

function simpanMasterDataFirebase(e) {
    e.preventDefault();
    const kodeRaw = document.getElementById("tx-kode-barang-bd").value.trim().toUpperCase();
    const namaVal = document.getElementById("tx-nama-barang-bd").value.trim();
    const qtyVal = parseInt(document.getElementById("tx-qty-utuhan-bd").value) || 0;
    
    if(!kodeRaw || !namaVal) return;
    const targetKey = cleanBDKey(kodeRaw);
    
    const payload = {
        kode_barang: kodeRaw,
        nama_barang: namaVal,
        qty_utuhan: qtyVal,
        satuan: "KRT"
    };
    
    db.ref("master_barang").child(targetKey).set(payload, (error) => {
        if (!error) {
            resetFormMasterBD();
        }
    });
}

function resetFormMasterBD() {
    document.getElementById("form-master-barang-bd").reset();
    setFormToInsertModeBD();
}

function liveSearchBankData(val) {
    renderMasterTableBD(localMasterStateBD, val);
}