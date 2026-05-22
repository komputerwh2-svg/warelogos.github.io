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
// 4. NAVIGATION NAVIGATION TO SUB-PAGE CONFIGURATION MODAL
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
// 5. FUNCTION LOGIC FOR MODAL RAK KOSONG PRINT SYSTEM
// =========================================================================
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

function eksekusiCetakRakKosong() {
    const inputJumlah = document.getElementById('input-lembar-rak');
    const jumlahLembar = inputJumlah ? inputJumlah.value : 1;

    // Validasi input proteksi angka kosong atau minus
    if (jumlahLembar < 1 || jumlahLembar === "") {
        alert("Harap masukkan jumlah lembar cetak yang valid (minimal 1)!");
        return;
    }

    // Aksi cetak sementara (nanti bisa kita hubungkan ke print engine excel / window.print)
    alert(`Mencetak dokumen "Status Rak Kosong" sebanyak ${jumlahLembar} Lembar.`);
    
    // Otomatis tutup kembali setelah tombol cetak ditekan
    tutupModalRakKosong();
}