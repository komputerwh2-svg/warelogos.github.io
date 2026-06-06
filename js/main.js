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
        if (infoEl) infoEl.innerText = `Semarang : ${Math.round(data.current.temperature_2m)}°C, ${txt}`;
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
// 6. SYSTEM COMPONENT: CUSTOM NOTIF miuiAlert ENGINE (MIUI V5 SPEC)
// =========================================================================
function miuiAlert(pesan) {
    const box = document.getElementById('miui-global-miuiAlert');
    const teks = document.getElementById('miui-miuiAlert-message');
    const contOk = document.getElementById('miui-container-ok');
    const contConfirm = document.getElementById('miui-container-confirm');

    teks.innerText = pesan;
    contOk.classList.remove('hidden');    // Tampilkan OK
    contConfirm.classList.add('hidden'); // Sembunyikan Ya/Batal
    box.classList.remove('hidden');
}

function tutupmiuiAlert() {
    const boxmiuiAlert = document.getElementById('miui-global-miuiAlert');
    if (boxmiuiAlert) {
        boxmiuiAlert.classList.add('hidden'); 
    }
}


// Variabel penyimpan target aplikasi yang ingin dibuka
// Konfigurasi Keamanan Lokal
const APP_CONFIG = {
    ADMIN_USER: "admin",
    ADMIN_PASS: "adminwh2",
    APLIKASI_KUNCI: ["APP_MASTER_DATA", "APP_REKAP_BLOK1"] // List ID aplikasi yang dikunci
};

let pendingTargetApp = "";

function requestAksesAplikasi(appId) {
    // Cek apakah aplikasi ada di dalam daftar kunci
    if (APP_CONFIG.APLIKASI_KUNCI.includes(appId)) {
        // Jika terkunci, tampilkan modal
        pendingTargetApp = appId;
        document.getElementById('modal-admin-lock').classList.remove('hidden');
    } else {
        // Jika tidak ada dalam daftar, langsung buka
        bukaAplikasi(appId);
    }
}

function cekLoginAdmin() {
    const u = document.getElementById('admin-user').value;
    const p = document.getElementById('admin-pass').value;

    if (u === APP_CONFIG.ADMIN_USER && p === APP_CONFIG.ADMIN_PASS) {
        // Berhasil Login
        document.getElementById('modal-admin-lock').classList.add('hidden');
        bukaAplikasi(pendingTargetApp);
        
        // Reset input
        document.getElementById('admin-user').value = "";
        document.getElementById('admin-pass').value = "";
    } else {
        // Gagal Login
        miuiAlert("Username atau password salah! Akses ditolak.");
    }
}

function closeModalAdmin() {
    document.getElementById('modal-admin-lock').classList.add('hidden');
}

function bukaAplikasi(appId) {
    console.log("Akses diberikan untuk:", appId);
    
   if (appId === 'APP_MASTER_DATA') {
        bukaSubPageBankData(); // Memanggil fungsi master data
    } else if (appId === 'APP_REKAP_BLOK') {
        bukaSubPageRekapBlok(); // Memanggil fungsi rekap blok
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
window.tutupmiuiAlert = tutupmiuiAlert;
window.requestAksesAplikasi = requestAksesAplikasi;
window.cekLoginAdmin = cekLoginAdmin;
window.closeModalAdmin = closeModalAdmin;

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
        // Tetap jalankan init jika perlu (misal: refresh tanggal atau dropdown)
        if (typeof window.initRekapBlok === 'function') window.initRekapBlok();
        return;
    }


    // Ambil data langsung dari file apps/rekap-blok.html
    fetch('apps/rekap-blok.html')
        .then(response => {
            if (!response.ok) throw new Error("Gagal mengambil file apps/rekap-blok.html");
            return response.text();
        })
        .then(htmlContent => {
            container.innerHTML = htmlContent;

            // --- PERBAIKAN: SUNTIKKAN SCRIPT JS SECARA DINAMIS ---
            const script = document.createElement('script');
            script.type = "module";
            script.src = "js/rekap-blok.js"; // Pastikan path ini benar
            
            script.onload = () => {
                // Sekarang baru panggil init setelah JS-nya benar-benar dimuat
                const elemenBaru = document.getElementById('subpage-rekap-blok');
                if (elemenBaru) {
                    void elemenBaru.offsetHeight; 
                    elemenBaru.classList.remove('translate-x-full');
                    
                    if (typeof window.initRekapBlok === 'function') {
                        window.initRekapBlok();
                        window.selectedBlok = null; // Pastikan null saat aplikasi baru jalan

                        // 1. KUNCI KEMBALI semua bagian UI
                        const boxInput = document.getElementById('box-workspace-input');
                        const wrapperRiwayat = document.getElementById('wrapper-riwayat-transaksi');
                        const wrapperRekap = document.getElementById('wrapper-rekap-detail');

                        if (boxInput) boxInput.classList.add('opacity-50', 'pointer-events-none');
                        if (wrapperRiwayat) wrapperRiwayat.classList.add('opacity-50', 'pointer-events-none');
                        if (wrapperRekap) wrapperRekap.classList.add('opacity-50', 'pointer-events-none');
                    }
                }
            };
            document.body.appendChild(script);
            // ----------------------------------------------------
        })
        .catch(error => {
            console.error(error);
            miuiAlert("Sistem Gagal Memuat Template Rekap Blok!");
        });
}

function tutupSubPageRekapBlok() {
    const subpage = document.getElementById('subpage-rekap-blok');
    if (subpage) {
        subpage.classList.add('translate-x-full');
    }

    // 1. KUNCI KEMBALI semua bagian UI
    const boxInput = document.getElementById('box-workspace-input');
    const wrapperRiwayat = document.getElementById('wrapper-riwayat-transaksi');
    const wrapperRekap = document.getElementById('wrapper-rekap-detail');

    if (boxInput) boxInput.classList.add('opacity-50', 'pointer-events-none');
    if (wrapperRiwayat) wrapperRiwayat.classList.add('opacity-50', 'pointer-events-none');
    if (wrapperRekap) wrapperRekap.classList.add('opacity-50', 'pointer-events-none');

    // 2. RESET SLIDER KE POSISI OFF
    const toggle = document.getElementById('toggle-tipe-gudang');
    if (toggle) {
        toggle.checked = false;
        
        // Panggil fungsi kunci agar UI Gudang kembali terkunci dan ter-reset
        // Fungsi ini akan menangani radio button dan label status
        if (typeof window.toggleLockGudang === 'function') {
            window.toggleLockGudang(false);
        }
    }

    // 3. Reset form agar saat dibuka kembali data lama sudah hilang
    if (typeof resetFormTransaksi === 'function') {
        resetFormTransaksi();
    }
    
    console.log("Subpage ditutup, semua area UI telah dikunci dan di-reset.");
}

// -------------------------------------------------------------------------
// JALUR PROTEKSI AKSES: Ikat fungsi ke Window agar bisa ditembak oleh onclick HTML
// -------------------------------------------------------------------------
window.bukaSubPageRekapBlok = bukaSubPageRekapBlok;
window.tutupSubPageRekapBlok = tutupSubPageRekapBlok;




// =========================================================================
// ENGINE SUB-PAGE DYNAMIC LOADING: ONGKIR
// =========================================================================

function bukaSubPageOngkir() {
    const container = document.getElementById('subpage-ongkir-container');
    const subpage = document.getElementById('subpage-ongkir');

    if (subpage) {
        subpage.classList.remove('translate-x-full');
        if (typeof window.initOngkir === 'function') window.initOngkir();
        return;
    }

    // Jika belum ada, lakukan fetch
    fetch('apps/ongkir.html')
        .then(response => response.text())
        .then(htmlContent => {
            container.innerHTML = htmlContent;

            // Gunakan import() dinamis daripada appendChild script
            import('../js/ongkir.js').then((module) => {
                // Sekarang initOngkir sudah tersedia di window karena kita set di ongkir.js
                const elemenBaru = document.getElementById('subpage-ongkir');
                if (elemenBaru) {
                    elemenBaru.classList.remove('translate-x-full');
                    if (typeof window.initOngkir === 'function') {
                        window.initOngkir();
                    }
                }
            });
        })
        .catch(err => console.error("Gagal:", err));
}

function tutupSubPageOngkir() {
    const subpage = document.getElementById('subpage-ongkir');
    if (subpage) {
        subpage.classList.add('translate-x-full');
    }
    
    // Reset form jika fungsi reset tersedia
    if (typeof window.resetFormOngkir === 'function') {
        window.resetFormOngkir();
    }
    
    console.log("Subpage Ongkir ditutup.");
}

// Ikat fungsi ke Window
window.bukaSubPageOngkir = bukaSubPageOngkir;
window.tutupSubPageOngkir = tutupSubPageOngkir;



// ==========================================================================
// REGISTRASI NAVIGASI UTAMA LAUNCHER SUB-PAGE SETELAN
// ==========================================================================

let isBankDataLoaded = false;

/**
 * Membuka Sub-Page Bank Data dari Menu Setelan (Fetch Modular Mode)
 */
async function bukaSubPageBankData() {
    const container = document.getElementById("bank-data-container");
    
    if (!container) {
        console.error("Elemen 'bank-data-container' tidak ditemukan di index.html!");
        return;
    }

    try {
        if (!isBankDataLoaded) {
            
            // 1. Fetch dan suntik file arsitektur HTML Halaman
            const htmlRes = await fetch("apps/bank-data.html");
            if (!htmlRes.ok) throw new Error("Gagal memuat komponen HTML Bank Data");
            container.innerHTML = await htmlRes.text();

            // 2. Suntik berkas CSS
            const linkCSS = document.createElement("link");
            linkCSS.rel = "stylesheet";
            linkCSS.href = "css/bank-data.css";
            document.head.appendChild(linkCSS);

            // 3. Suntik berkas Javascript
            const scriptJS = document.createElement("script");
            scriptJS.src = "js/bank-data.js";
            
            await new Promise((resolve) => {
                scriptJS.onload = resolve;
                document.body.appendChild(scriptJS);
            });

            isBankDataLoaded = true;
        }

        // 4. Jalankan efek transisi visual
        setTimeout(() => {
            const subPage = document.getElementById("subpage-bank-data");
            if (subPage) {
                subPage.classList.remove("translate-x-full");
                subPage.classList.add("translate-x-0");
            }
            
            // PERUBAHAN UTAMA: Memanggil fungsi sinkronisasi semua database master
            sinkronisasiSemuaDataMaster();
        }, 50);

    } catch (error) {
        console.error("Gagal menjalankan modul modular:", error);
        miuiAlert("Sistem gagal memuat komponen Setelan Bank Data.");
    }
}

/**
 * Fungsi untuk memicu semua pemuat data agar sinkron
 */
function sinkronisasiSemuaDataMaster() {
    // Memanggil ketiga fungsi pemuat dari file bank-data.js
    if (typeof window.muatDataDariFirebase === "function") window.muatDataDariFirebase();
    if (typeof window.muatDataDriver === "function") window.muatDataDriver();
    if (typeof window.muatDataNominal === "function") window.muatDataNominal();
    if (typeof window.muatDataTujuanDariFirebase === "function") window.muatDataTujuanDariFirebase();
    
    console.log("Semua data master (Driver, Nominal, Tujuan) berhasil dimuat.");
}

/**
 * Menutup halaman Bank Data
 */
function tutupSubPageBankData() {
    const subPage = document.getElementById("subpage-bank-data");
    if (subPage) {
        subPage.classList.remove("translate-x-0");
        subPage.classList.add("translate-x-full");
    }
}

// EKSPOS KE WINDOW GLOBAL SCOPE
window.bukaSubPageBankData = bukaSubPageBankData;
window.tutupSubPageBankData = tutupSubPageBankData;
window.sinkronisasiSemuaDataMaster = sinkronisasiSemuaDataMaster;