// =========================================================================
// 1. CONTROL LAUNCHER VIEWPORT DRAGGING & WHEEL OVERFLOW SYSTEM
// =========================================================================
const view = document.getElementById('launcher-viewport');
const dotsContainer = document.getElementById('page-indicators');
const dot1 = document.getElementById('dot-1');
const dot2 = document.getElementById('dot-2');

let isDown = false;
let startX, scrollLeft;

if (view) {
    view.addEventListener('mousedown', (e) => {
        isDown = true;
        view.classList.add('active-drag');
        startX = e.pageX - view.offsetLeft;
        scrollLeft = view.scrollLeft;
    });

    view.addEventListener('mouseleave', () => {
        isDown = false;
        view.classList.remove('active-drag');
    });

    view.addEventListener('mouseup', () => {
        isDown = false;
        view.classList.remove('active-drag');
    });

    view.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - view.offsetLeft;
        const walk = (x - startX) * 1.5; 
        view.scrollLeft = scrollLeft - walk;
    });

    view.addEventListener('wheel', (e) => {
        if (view.scrollWidth > view.clientWidth) {
            e.preventDefault();
            view.scrollLeft += e.deltaY;
        }
    });
}

// --- DYNAMIC DOT INDICATOR RECOGNITION ---
function updateLayoutState() {
    if (!view || !dotsContainer) return;
    const hasOverflow = view.scrollWidth > view.clientWidth;
    
    if (hasOverflow) {
        dotsContainer.classList.remove('opacity-0');
        dotsContainer.classList.add('opacity-100');
        
        if (view.scrollLeft >= (view.scrollWidth / 2) - 100) {
            dot1.className = "w-2 h-2 rounded-full bg-white/30 transition-all duration-300 shadow-sm";
            dot2.className = "w-4 h-2 rounded-full bg-sky-400 transition-all duration-300 shadow-sm";
        } else {
            dot1.className = "w-4 h-2 rounded-full bg-sky-400 transition-all duration-300 shadow-sm";
            dot2.className = "w-2 h-2 rounded-full bg-white/30 transition-all duration-300 shadow-sm";
        }
    } else {
        dotsContainer.classList.remove('opacity-100');
        dotsContainer.classList.add('opacity-0');
    }
}

if (view) view.addEventListener('scroll', updateLayoutState);
window.addEventListener('resize', updateLayoutState);
setTimeout(updateLayoutState, 500);

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
// Memanggil sesama file di dalam folder 'js' yang sama
//import { dbPrinter, ref, push, serverTimestamp, query, orderByChild, equalTo, onChildAdded, update } from "./firebase-printer-config.js";

function bukaModalRakKosong() {
    const modal = document.getElementById('modal-rak-kosong');
    const inputJumlah = document.getElementById('input-lembar-rak');
    if (modal) {
        if (inputJumlah) inputJumlah.value = "1"; // Reset ke angka 1 setiap kali dibuka
        modal.classList.remove('hidden');
    }
}

function tutupModalRakKosong() {
    const modal = document.getElementById('modal-rak-kosong');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// FUNGSI UTAMA (Di HP bertindak sebagai pengirim Cloud, di PC bertindak sebagai cetak lokal)
function eksekusiCetakRakKosong() {
    const inputJumlah = document.getElementById('input-lembar-rak');
    const jumlahLembar = inputJumlah ? parseInt(inputJumlah.value) : 1;

    // 1. Validasi proteksi angka kosong atau di bawah 1
    if (isNaN(jumlahLembar) || jumlahLembar < 1) {
        miuiAlert("Harap masukkan jumlah lembar cetak yang valid (minimal 1)!");
        return;
    }

    // CEK PERANGKAT: Jika dibuka di HP, kirim perintah ke Cloud Printer Firebase
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Panggil fungsi Firebase Cloud Print project baru
        kirimAntreanCetakKeCloud(jumlahLembar);
        tutupModalRakKosong();
        return; // Stop di sini, biar PC kantor yang mengeksekusi kertasnya
    }

    // JIKA DIBUKA DI PC KANTOR secara manual (Tetap pertahankan fungsi lokal asli Anda)
    const areaCetak = document.getElementById('print-area-rak-kosong');
    if (!areaCetak) {
        miuiAlert("Sistem Cetak Error: Elemen area cetak tidak ditemukan!");
        return;
    }

    // Simpan template asli ke memori window jika belum ada
    if (!window.masterTemplateCetakRak && areaCetak.innerHTML.trim() !== "") {
        window.masterTemplateCetakRak = areaCetak.innerHTML;
    }

    let kontenGabungan = "";
    for (let i = 1; i <= jumlahLembar; i++) {
        kontenGabungan += `<div class="print-page-wrapper">${window.masterTemplateCetakRak}</div>`;
    }
    
    areaCetak.innerHTML = kontenGabungan;
    tutupModalRakKosong(); 

    setTimeout(() => {
        window.print();
    }, 1000); // Jeda 1 detik anti-blank Chrome tetap dipertahankan
}

// =========================================================================
// SUB-FUNCTION A: PENGIRIM DATA DARI HP FIELD KE CLOUD DATABASE
// =========================================================================
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

// =========================================================================
// SUB-FUNCTION B: BYPASS ENGINE KHUSUS PC KANTOR (MENERIMA DARI CLOUD)
// =========================================================================
function eksekusiCetakRakKosongBypass(jumlahLembar) {
    const areaCetak = document.getElementById('print-area-rak-kosong');
    if (!areaCetak) return;

    // PENGAMANAN KRUSIAL: Jika menu Rak Kosong sedang tidak dibuka di layar PC kantor, 
    // areaCetak.innerHTML bisa jadi kosong murni. Kita amankan dengan fallback HTML string:
    if (!window.masterTemplateCetakRak || window.masterTemplateCetakRak.trim() === "") {
        if (areaCetak.innerHTML.trim() !== "") {
            window.masterTemplateCetakRak = areaCetak.innerHTML;
        } else {
            // JALUR DARURAT: Jika benar-benar kosong, buatkan kerangka dasarnya secara dinamis
            window.masterTemplateCetakRak = `
                <div style="text-align:center; font-family:sans-serif;">
                    <h2>DAFTAR RAK KOSONG</h2>
                </div>
            `;
        }
    }

    let kontenGabungan = "";
    for (let i = 1; i <= jumlahLembar; i++) {
        kontenGabungan += `<div class="print-page-wrapper">${window.masterTemplateCetakRak}</div>`;
    }
    areaCetak.innerHTML = kontenGabungan;

    // Kiosk printing langsung memuntahkan kertas setelah struktur siap
    setTimeout(() => {
        window.print();
    }, 1200); // Jeda 1200ms agar rendering background maping tabel aman
}

// =========================================================================
// SUB-FUNCTION C: LISTENER DATABASE REAL-TIME UNTUK INTERFACES KANTOR
// =========================================================================
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

            // Tandai sukses di database baru agar tidak terjadi cetak ganda
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
// BRIDGE INTERFACE: MENGEKSPOS SEMUA FUNGSI KE GLOBAL (WAJIB KARENA MODULE)
// =========================================================================
window.bukaSetelan = bukaSetelan;
window.tutupSetelan = tutupSetelan;
window.bukaModalRakKosong = bukaModalRakKosong;
window.tutupModalRakKosong = tutupModalRakKosong;
window.eksekusiCetakRakKosong = eksekusiCetakRakKosong;
window.miuiAlert = miuiAlert;
window.tutupMiuiAlert = tutupMiuiAlert;

// NYALAKAN ROBOT PRINTER BEGITU APLIKASI DIBUKA (Hanya aktif penuh jika diakses di PC)
document.addEventListener("DOMContentLoaded", () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) {
        aktifkanCloudPrintEngine();
    }
});
// =========================================================================