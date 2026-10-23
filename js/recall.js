// --- INISIALISASI MODUL RECALL ---
window.initRecall = function() {
    //console.log("Modul Recall berhasil diinisialisasi.");
    switchRecallSlide('CARI');
};

// --- BUKA & TUTUP SUBPAGE RECALL ---
window.bukaSubPageRecall = function() {
    const subpage = document.getElementById('subpageRecall');
    if (subpage) subpage.classList.remove('hidden');
};

window.tutupSubPageRecall = function() {
    const subpage = document.getElementById('subpageRecall');
    if (subpage) subpage.classList.add('hidden');
};

// Alias untuk kompatibilitas tombol di HTML
window.bukaSubpageRecall = window.bukaSubPageRecall;
window.tutupSubpageRecall = window.tutupSubPageRecall;

// --- SWITCH SLIDE MENGGUNAKAN EFEK SLIDER ---
window.switchRecallSlide = function(mode) {
    const slider = document.getElementById('slider-content-recall');
    if (!slider) return;

    if (mode === 'CARI') {
        slider.style.transform = 'translateX(0%)';
    } else if (mode === 'DETAIL') {
        slider.style.transform = 'translateX(-50%)';
    }
};

window.jalankanPencarianRecall = function() {
    const kode = document.getElementById('recallInputKode').value.trim();
    const expdate = document.getElementById('recallInputExpdate').value;

    if (!kode) {
        if (typeof miuiAlert === 'function') miuiAlert("Masukkan kode barang terlebih dahulu!");
        else alert("Masukkan kode barang terlebih dahulu!");
        return;
    }

    if (typeof miuiAlert === 'function') miuiAlert(`Memuat data WMS 1 tahun ke belakang untuk ${kode}...`);
};

window.resetPencarianRecall = function() {
    document.getElementById('recallInputKode').value = "";
    document.getElementById('recallInputExpdate').value = "";
    document.getElementById('tabelBodyRecallCari').innerHTML = `
        <tr><td colspan="9" class="text-center py-10 text-slate-400 italic">Silakan masukkan kode barang dan tanggal expdate untuk memulai pencarian...</td></tr>
    `;
    document.getElementById('recallTotalStok').innerText = "0 Karton";
};