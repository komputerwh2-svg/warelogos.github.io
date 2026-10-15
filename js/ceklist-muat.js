// Fungsi Inisialisasi Modul Ceklist Muat
window.initCeklistMuat = function() {
    console.log("Modul Ceklist Muat Berhasil Diinisialisasi.");
    updateWaktuCeklist();
    // Update jam setiap detik
    setInterval(updateWaktuCeklist, 1000);
};

// Fungsi untuk menampilkan Hari, Tanggal, dan Jam
function updateWaktuCeklist() {
    const el = document.getElementById('display-waktu-ceklist');
    if (!el) return;

    const sekarang = new Date();
    
    // Format Hari, Tanggal (DD/MM/YYYY), dan Jam (HH:MM:SS)
    const optionsHari = { weekday: 'long', timeZone: 'Asia/Jakarta' };
    const hari = sekarang.toLocaleDateString('id-ID', optionsHari);
    
    const tgl = String(sekarang.getDate()).padStart(2, '0');
    const bln = String(sekarang.getMonth() + 1).padStart(2, '0');
    thn = sekarang.getFullYear();
    
    const jam = String(sekarang.getHours()).padStart(2, '0');
    const menit = String(sekarang.getMinutes()).padStart(2, '0');
    const detik = String(sekarang.getSeconds()).padStart(2, '0');

    el.innerText = `[ ${hari}, ${tgl}/${bln}/${thn} | ${jam}:${menit}:${detik} WIB ]`;
}

// Fungsi Placeholder Tombol Arsip Ceklist (Popover)
window.togglePopoverArsipCeklist = function(event) {
    event.stopPropagation();
    const popover = document.getElementById('popover-arsip-ceklist');
    if (popover) {
        popover.classList.toggle('hidden');
    }
};

// Tutup popover jika klik di luar
window.addEventListener('click', function() {
    const popover = document.getElementById('popover-arsip-ceklist');
    if (popover && !popover.classList.contains('hidden')) {
        popover.classList.add('hidden');
    }
});



// Variabel global untuk menyimpan data titipan sementara
let dataTitipanList = [];
let aktifKategoriTitipan = '';

// Fungsi untuk membuka popover titipan berdasarkan kategori (PROMOSI / HRD / TINGGALAN)
window.bukaPopoverTitipan = function(kategori, event) {
    event.stopPropagation();
    aktifKategoriTitipan = kategori;
    
    const popover = document.getElementById('popover-form-titipan');
    const judul = document.getElementById('judul-popover-titipan');
    if (!popover) return;

    judul.innerText = `Tambah Titipan - ${kategori}`;
    
    // Posisikan popover di dekat tombol yang diklik
    const rect = event.currentTarget.getBoundingClientRect();
    popover.style.top = `${rect.bottom + window.scrollY + 5}px`;
    popover.style.left = `${rect.left + window.scrollX}px`;
    popover.classList.remove('hidden');

    // Fokus ke input nama barang
    setTimeout(() => {
        const inputNama = document.getElementById('input-nama-titipan');
        if (inputNama) {
            inputNama.value = '';
            inputNama.focus();
        }
        const inputQty = document.getElementById('input-qty-titipan');
        if (inputQty) inputQty.value = '1';
    }, 50);
};

// Fungsi untuk menutup popover titipan
window.tutupPopoverTitipan = function() {
    const popover = document.getElementById('popover-form-titipan');
    if (popover) {
        popover.classList.add('hidden');
    }
};

// Fungsi untuk menyimpan item titipan yang diinput
window.simpanDataTitipan = function() {
    const namaBarang = document.getElementById('input-nama-titipan').value.trim();
    const qty = document.getElementById('input-qty-titipan').value.trim();

    if (!namaBarang) {
        alert("Nama barang titipan tidak boleh kosong!");
        return;
    }

    // Masukkan ke array data titipan
    dataTitipanList.push({
        kategori: aktifKategoriTitipan,
        nama: namaBarang.toUpperCase(),
        qty: qty || '1'
    });

    tutupPopoverTitipan();
    renderListTitipan();
};

// Fungsi untuk merender/menampilkan daftar item titipan ke dalam kotak pratinjau
function renderListTitipan() {
    const container = document.getElementById('container-list-titipan');
    if (!container) return;

    if (dataTitipanList.length === 0) {
        container.innerHTML = `<div class="text-slate-400 text-xs">Belum ada item titipan ditambahkan...</div>`;
        return;
    }

    let html = '';
    // Kelompokkan atau tampilkan berurutan dengan label kategori
    dataTitipanList.forEach((item, index) => {
        html += `
            <div class="flex items-center justify-between bg-orange-50/80 border border-orange-200 rounded px-2 py-1 text-[10px]">
                <div class="flex items-center gap-2">
                    <span class="bg-orange-600 text-white font-bold px-1 rounded text-[8px]">${item.kategori}</span>
                    <span class="font-medium text-slate-800">${item.nama}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-bold text-orange-700">(${item.qty} pcs)</span>
                    <button onclick="hapusItemTitipan(${index})" class="text-red-500 hover:text-red-700 font-bold px-1"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Fungsi untuk menghapus item titipan dari daftar
window.hapusItemTitipan = function(index) {
    dataTitipanList.splice(index, 1);
    renderListTitipan();
};