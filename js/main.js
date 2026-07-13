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


// Fungsi global untuk getar
window.triggerVibrate = (duration = 90) => {
    if ("vibrate" in navigator) {
        navigator.vibrate(duration);
    }
};

// Event Delegation: Menangkap semua klik di dokumen
document.addEventListener('click', (e) => {
    // Mencari elemen tombol yang diklik (termasuk jika di dalam tombol ada ikon/span)
    const target = e.target.closest('button, .cursor-pointer, [onclick]');
    
    if (target) {
        window.triggerVibrate(90); // Getar selama 50ms
    }
});

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
import { dbPrinter, ref, push, serverTimestamp, query, orderByChild, equalTo, onChildAdded, update, onValue } from "./firebase-printer-config.js";

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
    ADMIN_PASS: "admin",
    APLIKASI_KUNCI: ["APP_MASTER_DATA1", "APP_REKAP_BLOK1"] // List ID aplikasi yang dikunci
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



function bukaSubPageStokWH() {
    const container = document.getElementById('subpage-stokwh-container');
    
    if (!container) {
        console.error("Wadah 'subpage-stokwh-container' tidak ditemukan di index.html!");
        return;
    }

    const subpage = document.getElementById('subpage-stokwh');

    // Panggil langsung setelah halaman WH2 terbuka
    //setTimeout(() => {
    //    loadStokData();
    //    loadStokDatawh3();
    //}, 100); // delay 100ms agar UI selesai dirender

    // Jika sudah pernah di-fetch, langsung buka
    if (subpage) {
        subpage.classList.remove('translate-x-full');
        return;
    }

    // Fetch file HTML
    fetch('apps/stokwh.html') // Pastikan lokasinya benar di folder apps/
        .then(response => {
            if (!response.ok) throw new Error("Gagal mengambil file apps/stokwh.html");
            return response.text();
        })
        .then(htmlContent => {
            container.innerHTML = htmlContent;

            // Suntikkan script JS-nya
            const script = document.createElement('script');
            script.src = "js/stokwh.js"; 
            
            script.onload = () => {
                const elemenBaru = document.getElementById('subpage-stokwh');
                if (elemenBaru) {
                    void elemenBaru.offsetHeight; 
                    elemenBaru.classList.remove('translate-x-full');
                    
                    // --- TAMBAHKAN PEMICU INI ---
                    // Panggil fungsi inisialisasi utama yang kita buat tadi
                    if (typeof window.initApp === 'function') {
                        window.initApp(); 
                    } else {
                        // Jika belum membuat initApp, panggil manual satu per satu:
                        console.log("Memulai inisialisasi dropdown...");
                        if (typeof initDropdownsRekap === 'function') initDropdownsRekap('REKAP');
                        if (typeof initDropdowns === 'function') initDropdowns('WH2');
                        if (typeof initDropdownsWH3 === 'function') initDropdownsWH3();
                    }
                }
            };
            document.body.appendChild(script);
        })
        .catch(error => {
            console.error(error);
            miuiAlert("Sistem Gagal Memuat Template Stok WH!");
        });
}

function tutupSubPageStokWH() {
    const subpage = document.getElementById('subpage-stokwh');
    if (subpage) {
        subpage.classList.add('translate-x-full');
    }
}

window.bukaSubPageStokWH = bukaSubPageStokWH;
window.tutupSubPageStokWH = tutupSubPageStokWH;


// Fungsi untuk membuka subpage Muat WH-3
function bukaSubPageMuatWH3() {
    // 1. Tentukan kontenernya (pastikan ada <div id="subpage-muat-wh3-container"></div> di index.html Anda)
    const container = document.getElementById('subpage-muat-wh3-container'); 
    
    if (!container) {
        console.error("Wadah 'subpage-muat-wh3-container' tidak ditemukan di index.html!");
        return;
    }

    const subpage = document.getElementById('subpage-muat-wh3');

    // Jika sudah ada (sudah pernah di-fetch), langsung buka
    if (subpage) {
        subpage.classList.remove('translate-x-full');
        return;
    }

    // 2. Fetch file HTML subpage
    fetch('apps/muatwh3.html') 
        .then(response => {
            if (!response.ok) throw new Error("Gagal mengambil file apps/muatwh3.html");
            return response.text();
        })
        .then(htmlContent => {
            container.innerHTML = htmlContent;

            // 3. Suntikkan script JS-nya
            const script = document.createElement('script');
            script.src = "js/muatwh3.js"; 
            
            script.onload = () => {
                // Panggil fungsi inisialisasi yang baru kita buat
                if (typeof window.initMuatWH3 === 'function') {
                    window.initMuatWH3();
                }
                
                const elemenBaru = document.getElementById('subpage-muat-wh3');
                if (elemenBaru) {
                    elemenBaru.classList.remove('translate-x-full');
                }
            };
            document.body.appendChild(script);
        })
        .catch(error => {
            console.error(error);
            alert("Sistem Gagal Memuat Template Muat WH-3!");
        });
}

// Fungsi untuk menutup subpage Muat WH-3
window.tutupSubPageMuatWH3 = function() {
    const subpage = document.getElementById('subpage-muat-wh3');
    if (subpage) {
        subpage.classList.add('translate-x-full');
    }
};

console.log("Modul Muat WH-3 dimuat.");

window.bukaSubPageMuatWH3 = bukaSubPageMuatWH3;
window.tutupSubPageMuatWH3 = tutupSubPageMuatWH3;



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


// Membuka modal dengan mengirim ID spesifik
window.openPktModal = async (modalId, selectId) => {
    const res = await fetch('https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/master_tujuan.json');
    const data = await res.json();
    const select = document.getElementById(selectId);
    
    // Reset select dengan opsi default
    select.innerHTML = '<option value="-">- Pilih Tujuan -</option>';
    
    if (data) {
        Object.values(data).forEach(item => {
            if(item.TUJUAN) {
                select.innerHTML += `<option value="${item.TUJUAN}">${item.TUJUAN}</option>`;
            }
        });
    }
    document.getElementById(modalId).classList.remove('hidden');
};

// Menutup modal universal
window.closeModal = (modalId, selectId, qtyId) => {
    document.getElementById(modalId).classList.add('hidden');
    document.getElementById(selectId).value = "-";
    document.getElementById(qtyId).value = "-";
};

// Fungsi Simpan Universal
window.simpanDataPkt = async (jenisLabel, selectTujuanId, selectQtyId, modalId) => {
    const tujuanRaw = document.getElementById(selectTujuanId).value;
    const qty = document.getElementById(selectQtyId).value;
    
    // 1. Validasi
    if (tujuanRaw === "-" || qty === "-") {
        return miuiAlert("Mohon pilih Tujuan dan QTY dengan benar!");
    }

    // 2. Pembuatan ID Unik
    const tujuanFormatted = tujuanRaw.replace(/\s+/g, '_').toUpperCase();
    const now = new Date();
    const tgl = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeId = now.getHours().toString().padStart(2, '0') + 
                   now.getMinutes().toString().padStart(2, '0') + 
                   now.getSeconds().toString().padStart(2, '0');
    
    // ID Unik sekarang menyertakan jenisLabel agar tidak bentrok
    const uniqueId = `${jenisLabel}_${tujuanFormatted}_${tgl}_${timeId}`;

    const data = {
        jenis: jenisLabel, // Akan berisi PR-PKT40, PR-PKT59, atau PR-PKT82
        tujuan: tujuanRaw,
        qty: qty,
        timestamp: now.getTime()
    };

    // 3. Simpan ke Firebase
    try {
        await fetch(`https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/label_history/${uniqueId}.json`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        
        miuiAlert("Data berhasil disimpan!");
        
        // Reset form setelah sukses
        document.getElementById(selectTujuanId).value = "-";
        document.getElementById(selectQtyId).value = "-";
        //document.getElementById(modalId).classList.add('hidden');
        
    } catch (e) {
        miuiAlert("Gagal menyimpan: " + e.message);
    }
};

window.cetakLabelHariIni = async (jenisLabel) => {
    // 1. Ambil data dari Firebase
    const res = await fetch('https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/label_history.json');
    const allData = await res.json();
    
    // Filter data berdasarkan tanggal hari ini dan jenis yang dikirim (parameter)
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const dataHariIni = Object.values(allData || {}).filter(item => {
        const itemDate = new Date(item.timestamp).toISOString().split('T')[0].replace(/-/g, '');
        return itemDate === today && item.jenis === jenisLabel;
    });

    if (dataHariIni.length === 0) return miuiAlert(`Tidak ada data ${jenisLabel} untuk dicetak hari ini.`);

    // 2. Format HTML untuk F4 Portrait
    let pagesHtml = "";
    const itemsPerPage = 4; 

    for (let i = 0; i < dataHariIni.length; i += itemsPerPage) {
        let chunk = dataHariIni.slice(i, i + itemsPerPage);
        
        pagesHtml += `
        <div class="page" style="page-break-after: always; width: 210mm; height: 330mm; padding: 5mm 2mm; box-sizing: border-box; display: grid; grid-template-rows: repeat(4, 1fr); gap: 59px;">`;
        
        chunk.forEach(item => {
            pagesHtml += `
            <div style="border: 2px solid #000; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; height: 70mm; width: 200mm;">
                <div style="font-size: 57pt; font-family: Edo; line-height: 1;">${item.tujuan.toUpperCase()}</div>
                <div style="border-top: 2px dashed #000; width: 95%; margin: 12px 0;"></div>
                <div style="font-size: 49pt; font-family: Edo; line-height: 1;">${item.jenis} . ${item.qty} . PAKET</div>
            </div>`;
        });
        
        pagesHtml += `</div>`; 
    }

    // 3. Kirim ke Print Server
    try {
        await fetch('https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/print_jobs.json', {
            method: 'POST',
            body: JSON.stringify({ html: pagesHtml, timestamp: Date.now() }),
            headers: { 'Content-Type': 'application/json' }
        });
        miuiAlert(`Proses Mencetak ${dataHariIni.length} Label ${jenisLabel}.`);
    } catch (e) {
        miuiAlert("Gagal mengirim perintah cetak: " + e.message);
    }
};


// Variabel untuk simpan data master
let masterTujuanData = [];
let masterBarangData = [];

window.openKlaimModal = async () => {
    // 1. Fetch data tujuan (seperti sebelumnya)
    const res = await fetch('https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/master_tujuan.json');
    const data = await res.json();
    const select = document.getElementById('tujuanKlaim');
    
    // Simpan ke variabel global
    masterTujuanData = Object.values(data);
    
    select.innerHTML = '<option value="-">- Pilih Tujuan -</option>';
    masterTujuanData.forEach(item => {
        if(item.TUJUAN) {
            select.innerHTML += `<option value="${item.TUJUAN}">${item.TUJUAN}</option>`;
        }
    });

    // 2. Fetch data barang
    const resBarang = await fetch('https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/master_barang.json');
    const dataBarang = await resBarang.json();

    // Filter hanya yang aktif dan Urutkan berdasarkan INISIAL
    masterBarangData = Object.values(dataBarang)
        .filter(item => item.IS_ACTIVE === true)
        .sort((a, b) => {
            // Mengubah inisial menjadi string untuk memastikan perbandingan aman
            const inisialA = (a.INISIAL || "").toString().toLowerCase();
            const inisialB = (b.INISIAL || "").toString().toLowerCase();
            return inisialA.localeCompare(inisialB);
        });

    const selectBarang = document.getElementById('kodeRasaKlaim');
    selectBarang.innerHTML = '<option value="-">- Pilih Barang -</option>';

    masterBarangData.forEach(item => {
        if(item.KODE_BARANG) {
            selectBarang.innerHTML += `<option value="${item.KODE_BARANG}" data-name="${item.NAMA_BARANG}">${item.KODE_BARANG} - ${item.NAMA_BARANG}</option>`;
        }
    });
    
    document.getElementById('klaimModal').classList.remove('hidden');
};

// Fungsi pengisi otomatis
window.isiAlamatOtomatis = () => {
    const tujuanPilih = document.getElementById('tujuanKlaim').value;
    const inputAlamat = document.getElementById('alamatKlaim');
    
    const ditemukan = masterTujuanData.find(item => item.TUJUAN === tujuanPilih);
    
    if (ditemukan) {
        inputAlamat.value = ditemukan.KOTA || "-";
    } else {
        inputAlamat.value = "";
    }
};

// Fungsi isi otomatis dan "membersihkan" tampilan
window.isiBarangOtomatis = () => {
    const select = document.getElementById('kodeRasaKlaim');
    const inputNama = document.getElementById('namaBarangKlaim');
    
    const selectedOption = select.options[select.selectedIndex];
    
    if (select.value !== "-") {
        inputNama.value = selectedOption.getAttribute('data-name');
        
        // TRIK: Kita ganti sementara teks option yang terpilih agar hanya menampilkan KODE
        // Ini akan membuat dropdown terlihat hanya berisi KODE setelah dipilih
        select.options[select.selectedIndex].text = select.value;
    } else {
        inputNama.value = "";
    }
};

window.simpanDataKlaim = async () => {
    // 1. Ambil data dari form
    const tujuan = document.getElementById('tujuanKlaim').value;
    const kodeRasa = document.getElementById('kodeRasaKlaim').value;
    const alamat = document.getElementById('alamatKlaim').value;
    const ball = document.getElementById('qtyBall').value || "0";
    const renteng = document.getElementById('qtyRenteng').value || "0";
    const namaBarang = document.getElementById('namaBarangKlaim').value; // Mengambil dari hidden input

    // 2. Validasi
    if (tujuan === "-" || kodeRasa === "-") {
        return miuiAlert("Mohon pilih Tujuan dan Kode Barang dengan benar!");
    }

    // 3. Persiapan ID Unik: KLAIM_koderasa_tujuan_tgl_jam
    const now = new Date();
    const tgl = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeId = now.getHours().toString().padStart(2, '0') + 
                   now.getMinutes().toString().padStart(2, '0') + 
                   now.getSeconds().toString().padStart(2, '0');
    
    // Format tujuan untuk ID (hapus spasi agar rapi)
    const tujuanFormatted = tujuan.replace(/\s+/g, '_').toUpperCase();
    const uniqueId = `KLAIM_${kodeRasa}_${tujuanFormatted}_${tgl}_${timeId}`;

    const data = {
        jenis: "KLAIM",
        tujuan: tujuan,
        alamat: alamat,
        kodeBarang: kodeRasa,
        namaBarang: namaBarang,
        ball: ball,
        renteng: renteng,
        timestamp: now.getTime()
    };

    // 4. Simpan ke Firebase
    try {
        await fetch(`https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/label_history/${uniqueId}.json`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        
        miuiAlert("Data Klaim Tersimpan!");
        
        // Reset form
        document.getElementById('tujuanKlaim').value = "-";
        document.getElementById('alamatKlaim').value = "";
        document.getElementById('kodeRasaKlaim').value = "-";
        document.getElementById('qtyBall').value = "0";
        document.getElementById('qtyRenteng').value = "0";
        document.getElementById('namaBarangKlaim').value = "";

    } catch (e) {
        miuiAlert("Gagal menyimpan: " + e.message);
    }
};

window.cetakKlaimHariIni = async () => {
    // 1. Ambil data dari label_history
    const res = await fetch('https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/label_history.json');
    const allData = await res.json();
    
    // Filter hanya data KLAIM hari ini
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const dataKlaim = Object.values(allData || {}).filter(item => {
        const itemDate = new Date(item.timestamp).toISOString().split('T')[0].replace(/-/g, '');
        return itemDate === today && item.jenis === "KLAIM";
    });

    if (dataKlaim.length === 0) return miuiAlert("Tidak ada data Klaim hari ini.");

    let pagesHtml = "";
    // 4 label per halaman F4
    for (let i = 0; i < dataKlaim.length; i += 4) {
        let chunk = dataKlaim.slice(i, i + 4);
        
        pagesHtml += `
        <div class="page" style="page-break-after: always; width: 210mm; height: 330mm; padding: 5mm 5mm; box-sizing: border-box; display: grid; grid-template-rows: repeat(4, 1fr); gap: 62px;">`;
        
        chunk.forEach(item => {
            // LOGIKA 3 KONDISI
            const b = parseInt(item.ball) || 0;
            const r = parseInt(item.renteng) || 0;
            let qtyStr = "";
            
            if (b > 0 && r > 0) qtyStr = `${b} BALL . ${r} RTG`;
            else if (b > 0) qtyStr = `${b} . BALL`;
            else if (r > 0) qtyStr = `${r} . RTG`;

            pagesHtml += `
            <div style="border: 2px solid #000; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; height: 75mm; width: 200mm; padding: 5px;">
                <div style="font-size: 45pt; font-family: Edo; line-height: 1;">${item.tujuan.toUpperCase()}</div>
                <div style="font-size: 35pt; font-family: Edo; line-height: 1;">${item.alamat.toUpperCase()}</div>
                <div style="border-top: 2px dashed #000; width: 95%; margin: 8px 0;"></div>
                <div style="font-size: 45pt; font-family: Edo; line-height: 1;">${item.kodeBarang} . ${qtyStr}</div>
                <div style="border-top: 1px double #000; width: 95%; margin: 8px 0;"></div>
                <div style="font-size: 30pt; font-family: Edo; line-height: 1;">${item.namaBarang.toUpperCase()}</div>
            </div>`;
        });
        
        pagesHtml += `</div>`;
    }

    // 2. Kirim ke Print Server
    try {
        await fetch('https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/print_jobs.json', {
            method: 'POST',
            body: JSON.stringify({ html: pagesHtml, timestamp: Date.now() }),
            headers: { 'Content-Type': 'application/json' }
        });
        miuiAlert(`Mencetak ${dataKlaim.length} label Klaim.`);
    } catch (e) {
        miuiAlert("Gagal cetak: " + e.message);
    }
};

// Logika Pemantauan
const printJobsRef = ref(dbPrinter, 'print_jobs');
const statusBar = document.getElementById('print-status-bar');
const statusText = document.getElementById('print-status-text');
const printIcon = document.getElementById('print-icon');
let printTimeout = null;

// Gunakan onValue untuk memantau perubahan secara real-time
onValue(printJobsRef, (snapshot) => {
    const data = snapshot.val();
    
    // Hitung jumlah job
    const jobCount = data ? Object.keys(data).length : 0;
    
    console.log("Jumlah antrian di Firebase:", jobCount); // Debugging: Cek di Console F12

    let countdownInterval = null;
    let timeLeft = 10; // Durasi dalam detik

    if (jobCount > 0) {
        // RESET STATUS BAR & TIMER
        statusBar.classList.remove('hidden');
        statusBar.className = "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-500 text-white animate-pulse";
        printIcon.className = "fa-solid fa-spinner animate-spin";
        
        // Reset timer
        if (printTimeout) clearTimeout(printTimeout);
        if (countdownInterval) clearInterval(countdownInterval);
        
        timeLeft = 10;
        statusText.innerText = `Sedang mencetak ${jobCount} dokumen (${timeLeft}s)...`;

        // Jalankan countdown setiap 1 detik
        countdownInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                statusText.innerText = `Sedang mencetak ${jobCount} dokumen (${timeLeft}s)...`;
            } else {
                clearInterval(countdownInterval);
            }
        }, 1000);

        // Deteksi Masalah (Timeout 10 detik tetap berjalan)
        printTimeout = setTimeout(() => {
            clearInterval(countdownInterval); // Hentikan countdown
            statusBar.className = "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-red-600 text-white";
            printIcon.className = "fa-solid fa-circle-exclamation";
            statusText.innerText = "Antrian cetak mengalami masalah!";
        }, 10000); 

    } else {
        // ANTRIAN KOSONG: Bersihkan semua
        if (printTimeout) clearTimeout(printTimeout);
        if (countdownInterval) clearInterval(countdownInterval);
        statusBar.classList.add('hidden');
    }
});
