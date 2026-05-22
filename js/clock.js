// --- DATABASE MEMORI STATUS ANGKA LAMA ---
const memoriAngkaLama = { 'htc-h1': '', 'htc-h2': '', 'htc-m1': '', 'htc-m2': '' };

// --- ENGINE UTAMA MEKANIK FLIP HTC STYLE ---
function eksekusiMekanikFlip(containerId, angkaBaru) {
    const kotakDigit = document.getElementById(containerId);
    if (!kotakDigit) return;

    const bagianAtas = kotakDigit.querySelector('.htc-segment.htc-top');
    const bagianBawah = kotakDigit.querySelector('.htc-segment.htc-bottom');

    if (memoriAngkaLama[containerId] === angkaBaru) return;
    memoriAngkaLama[containerId] = angkaBaru;

    const flipperBaru = document.createElement('div');
    flipperBaru.className = 'htc-flipper';
    flipperBaru.innerHTML = `
        <div class="htc-segment htc-top">${bagianAtas.innerText}</div>
        <div class="htc-segment htc-bottom" style="transform: rotateX(-180deg); line-height: 0px;">${angkaBaru}</div>
    `;

    kotakDigit.appendChild(flipperBaru);
    bagianBawah.innerText = angkaBaru;

    setTimeout(() => {
        flipperBaru.classList.add('htc-flipped');
        bagianAtas.innerText = angkaBaru;
    }, 20);

    setTimeout(() => { flipperBaru.remove(); }, 450);
}

// --- TICKER INTERVAL JAM DOCK UTAMA & STATUS BAR ---
function sinkronisasiJamSistem() {
    const waktuSekarang = new Date();
    const stringJam = waktuSekarang.getHours().toString().padStart(2, '0');
    const stringMenit = waktuSekarang.getMinutes().toString().padStart(2, '0');

    // Jalankan Animasi Flip Jam Utama
    eksekusiMekanikFlip('htc-h1', stringJam[0]);
    eksekusiMekanikFlip('htc-h2', stringJam[1]);
    eksekusiMekanikFlip('htc-m1', stringMenit[0]);
    eksekusiMekanikFlip('htc-m2', stringMenit[1]);

    // Jalankan Jam Digital Kecil di Status Bar Sub-Page Setelan
    const statusClock = document.getElementById('setelan-status-clock');
    if (statusClock) statusClock.textContent = `${stringJam}:${stringMenit}`;
}

// Booting Jam Pertama Kali
sinkronisasiJamSistem();
setInterval(sinkronisasiJamSistem, 1000);
