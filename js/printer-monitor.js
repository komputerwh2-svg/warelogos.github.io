// printer-monitor.js
import { dbPrinter, ref, onValue } from "./firebase-printer-config.js";

export function initPrinterMonitor() {
    // 1. Inject elemen ke DOM jika belum ada
    if (!document.getElementById('print-status-bar')) {
        const statusBar = document.createElement('div');
        statusBar.id = 'print-status-bar';
        statusBar.className = 'hidden fixed top-2 right-4 z-[9999] flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold shadow-lg bg-slate-100 text-slate-600 transition-all duration-300';
        statusBar.innerHTML = `
            <i id="print-icon" class="fa-solid fa-print"></i>
            <span id="print-status-text">Memuat status...</span>
        `;
        document.body.appendChild(statusBar);
    }

    const statusBar = document.getElementById('print-status-bar');
    const statusText = document.getElementById('print-status-text');
    const printIcon = document.getElementById('print-icon');
    const printJobsRef = ref(dbPrinter, 'print_jobs');
    
    let printTimeout = null;
    let countdownInterval = null;

    onValue(printJobsRef, (snapshot) => {
        const data = snapshot.val();
        const jobCount = data ? Object.keys(data).length : 0;

        // Reset semua timer setiap ada update dari Firebase
        if (printTimeout) clearTimeout(printTimeout);
        if (countdownInterval) clearInterval(countdownInterval);

        if (jobCount > 0) {
            // Tampilkan status bar
            statusBar.classList.remove('hidden');
            statusBar.className = "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-500 text-white animate-pulse shadow-lg fixed top-2 right-4 z-[9999]";
            printIcon.className = "fa-solid fa-spinner animate-spin";
            
            // Deklarasikan variabel timeLeft dengan benar
            let timeLeft = 10; 
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

            // Deteksi Masalah (Timeout 10 detik)
            printTimeout = setTimeout(() => {
                clearInterval(countdownInterval);
                statusBar.className = "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-red-600 text-white shadow-lg fixed top-2 right-4 z-[9999]";
                printIcon.className = "fa-solid fa-circle-exclamation";
                statusText.innerText = "Antrian cetak mengalami masalah!";
            }, 10000); 

        } else {
            // ANTRIAN KOSONG
            statusBar.classList.add('hidden');
        }
    });
}