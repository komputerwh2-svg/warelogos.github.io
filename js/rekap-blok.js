import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// --- 1. INISIALISASI ---
// Gunakan window.app untuk mengakses instance firebase yang sudah ada di main.js
const db = window.db; 

window.initRekapBlok = async function() {
    console.log("Inisialisasi Rekap Blok dimulai...");
    
    // 1. Isi Dropdown Tanggal
    const tglSelect = document.getElementById('tx-tanggal');
    if (tglSelect) {
        tglSelect.innerHTML = "";
        for (let i = 0; i <= 10; i++) {
            let d = new Date();
            d.setDate(d.getDate() - i);
            let dd = String(d.getDate()).padStart(2, '0');
            let mm = String(d.getMonth() + 1).padStart(2, '0');
            let yyyy = d.getFullYear();
            let val = `${yyyy}-${mm}-${dd}`;
            let text = `${dd}/${mm}/${yyyy}`;
            let opt = document.createElement("option");
            opt.value = val;
            opt.textContent = text;
            tglSelect.appendChild(opt);
        }
    }
    
    // 2. Panggil fungsi data
    await loadDropdownBarang();
    window.loadDropdownKode(); // Panggil di sini agar data sudah tersedia 

    const btn = document.getElementById('btn-export-pdf');
    if (btn) {
        btn.addEventListener('click', exportAllToPDF);
    } else {
        console.warn("Tombol #btn-export-pdf tidak ditemukan di DOM");
    }

    // 3. Pastikan blok valid
    if (window.selectedBlok && window.selectedBlok !== "undefined") {
        console.log("Memulai render untuk blok:", window.selectedBlok);
        
        renderRiwayatBlok(window.selectedBlok);
        
        // Panggil renderRekapStok dengan benar
        if (typeof renderRekapStok === 'function') {
            await renderRekapStok(window.selectedBlok);
        }
    } else {
        // Tampilkan pesan jika belum ada blok
        const tableBody = document.getElementById('table-riwayat-blok');
        const rekapBody = document.getElementById('table-rekap-stok-item');
        
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-[10px] text-slate-500 italic">Silakan pilih gudang/blok terlebih dahulu</td></tr>`;
        if (rekapBody) rekapBody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-[10px] text-slate-500 italic">Silakan pilih gudang/blok terlebih dahulu</td></tr>`;
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const dropdown = document.getElementById('dropdown-cari-kode');
    if (dropdown) {
        dropdown.addEventListener('change', function() {
            window.cariKodeBarang(this.value);
        });
    } else {
        console.warn("Dropdown belum ditemukan, mungkin dimuat secara dinamis.");
    }
}); 


// Letakkan di bagian atas file JavaScript Anda
window.generateExpiredList = function() {
    const dropdown = document.getElementById('tx-expired');
    if (!dropdown) {
        console.warn("Dropdown #tx-expired tidak ditemukan!");
        return;
    }
    
    dropdown.innerHTML = '<option value="">Pilih Expired...</option>';
    let date = new Date();
    date.setMonth(date.getMonth() + 24);
    
    for (let i = 0; i < 10; i++) {
        let month = date.toLocaleString('id-ID', { month: 'short' }).toUpperCase();
        let year = date.getFullYear().toString().slice(-2);
        let value = `${year}-${month}`; 
        
        let opt = document.createElement("option");
        opt.value = value;
        opt.textContent = value;
        dropdown.appendChild(opt);
        date.setMonth(date.getMonth() - 1);
    }
    console.log("Dropdown expired berhasil di-generate.");
};


/**
 * @param {string} tipeTransaksi - "IN" atau "OUT"
 * @param {string} blokTerpilih - (Opsional) Nama blok untuk filter mode OUT
 */
// Pastikan variabel global ini dideklarasikan di luar fungsi agar bisa diakses fungsi hitung
window.dataMasterBarang = {}; 

async function loadDropdownBarang(tipeTransaksi, blokTerpilih = "") {
    const select = document.getElementById('tx-kode');
    if (!select) return;

    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

    try {
        select.innerHTML = '<option value="">Memuat data...</option>';
        const response = await fetch(`${FIREBASE_URL}master_barang.json`);
        const dataBarang = await response.json();

        if (!dataBarang) {
            select.innerHTML = '<option value="">Data Kosong</option>';
            return;
        }

        // SIMPAN DATA KE MEMORI GLOBAL agar bisa digunakan oleh fungsi hitung
        window.dataMasterBarang = dataBarang;

        // 1. Konversi ke Array agar bisa di-sort
        let listBarang = Object.keys(dataBarang).map(key => ({
            key: key,
            ...dataBarang[key]
        }));

        // 2. FILTERING
        listBarang = listBarang.filter(item => {
            const isActive = item.IS_ACTIVE !== false;
            if (!isActive) return false;

            if (tipeTransaksi === "OUT" && blokTerpilih) {
                return (item.KELOMPOK || "").toUpperCase() === (blokTerpilih || "").toUpperCase();
            }
            return true;
        });

        // 3. SORTING
        listBarang.sort((a, b) => {
            const inisialA = (a.INISIAL || "").toString();
            const inisialB = (b.INISIAL || "").toString();
            return inisialA.localeCompare(inisialB, undefined, { numeric: true, sensitivity: 'base' });
        });

        // 4. RENDERING
        select.innerHTML = '<option value="">Pilih Barang...</option>';
        listBarang.forEach(item => {
            let opt = document.createElement("option");
            opt.value = item.KODE_BARANG || item.key;
            const teksTampilan = `${item.INISIAL || "-"}`;
            opt.textContent = teksTampilan;
            select.appendChild(opt);
        });

    } catch (e) {
        console.error("Gagal load dropdown:", e);
        select.innerHTML = '<option value="">Error Load</option>';
    }
}

window.populateKodeBarangOut = async function(namaBlok) {
    const dropdown = document.getElementById('tx-kode'); 
    if (!dropdown) return;

    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

    try {
        const response = await fetch(`${FIREBASE_URL}stok_blok/${namaBlok.trim()}.json`);
        const stokData = await response.json();

        dropdown.innerHTML = '<option value="">Pilih Barang...</option>';

        if (stokData) {
            const master = window.dataMasterBarang || {};
            
            // 1. Ubah objek stok menjadi array agar bisa diurutkan
            let listBarang = Object.entries(stokData).map(([kode, expData]) => {
                const totalPlt = Object.values(expData).reduce((sum, item) => sum + (parseInt(item.plt) || 0), 0);
                const infoBarang = master[kode] || { INISIAL: kode }; // Fallback jika tidak ada di master
                return {
                    kode: kode,
                    inisial: infoBarang.INISIAL,
                    totalPlt: totalPlt
                };
            }).filter(item => item.totalPlt > 0);

            // 2. Urutkan berdasarkan inisial secara alfabetis/numerik
            listBarang.sort((a, b) => {
                return a.inisial.localeCompare(b.inisial, undefined, { 
                    numeric: true, 
                    sensitivity: 'base' 
                });
            });

            // 3. Masukkan ke dropdown yang sudah urut
            listBarang.forEach(item => {
                dropdown.innerHTML += `<option value="${item.kode}">${item.inisial}</option>`;
            });
        }
    } catch (error) {
        console.error("Gagal memuat barang keluar:", error);
    }
};



// 1. FUNGSI LOGIKA (Hanya mengambil data dan mengisi dropdown)
window.populateExpiredFIFO = async function(namaBlok, kodeBarang) {
    // TAMBAHAN: Safety Guard - Berhenti jika mode saat ini adalah MASUK (IN)
    // Asumsi: elemen checkbox atau status toggle memiliki id 'mode-toggle'
    const isOutMode = document.getElementById('toggle-tipe-transaksi')?.checked;
    if (isOutMode === false) return; 

    const dropdownExpired = document.getElementById('tx-expired');
    if (!dropdownExpired) return;

    dropdownExpired.innerHTML = '<option value="">Memuat...</option>';
    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

    try {
        const response = await fetch(`${FIREBASE_URL}stok_blok/${namaBlok.trim()}/${kodeBarang}.json`);
        const expData = await response.json();

        dropdownExpired.innerHTML = '<option value="">Pilih Expired...</option>';

        if (expData) {
            const listExpired = Object.entries(expData).map(([exp, val]) => ({
                exp: exp,
                plt: parseInt(val.plt) || 0
            })).filter(item => item.plt > 0);

            listExpired.sort((a, b) => {
                const dateA = new Date(`01-${a.exp.replace('-', '-')}-20${a.exp.split('-')[0]}`);
                const dateB = new Date(`01-${b.exp.replace('-', '-')}-20${b.exp.split('-')[0]}`);
                return dateA - dateB;
            });

            listExpired.forEach(item => {
                dropdownExpired.innerHTML += `<option value="${item.exp}" data-plt="${item.plt}">${item.exp} (SISA ${item.plt} PLT)</option>`;
            });

            if (listExpired.length > 0) {
                dropdownExpired.selectedIndex = 1;
                dropdownExpired.dispatchEvent(new Event('change'));
            }
        } else {
            dropdownExpired.innerHTML = '<option value="">Stok Kosong</option>';
        }
    } catch (error) {
        console.error("Gagal load data expired:", error);
    }
};

// 2. FUNGSI INISIALISASI (Jalankan ini SATU KALI SAJA saat halaman dimuat)
// Fungsi ini menangani semua "pendengar" tombol/input
window.initOutEventListeners = function() {
    const dropdownBarang = document.getElementById('tx-kode');
    const inputQtyPlt = document.getElementById('tx-palet'); // <--- ID SUDAH DISINKRONKAN

    // A. Listener saat barang dipilih (Memicu pengambilan data Expired)
    if (dropdownBarang) {
        dropdownBarang.addEventListener('change', function() {
            window.populateExpiredFIFO(window.selectedBlok, this.value);
        });
    }

    // B. Listener saat qty diinput (Validasi stok)
    if (inputQtyPlt) {
        inputQtyPlt.addEventListener('input', function() {
            const dropdownExp = document.getElementById('tx-expired');
            if (!dropdownExp) return;

            const selectedOption = dropdownExp.options[dropdownExp.selectedIndex];
            
            if (!selectedOption || !selectedOption.dataset.plt) return;

            const stokTersedia = parseInt(selectedOption.dataset.plt);
            const qtyDiminta = parseInt(this.value) || 0;

            if (qtyDiminta > stokTersedia) {
                const msg = `Stok tidak mencukupi! Stok Tersedia: ${stokTersedia} PLT.`;
                
                if (typeof miuiAlert === 'function') {
                    miuiAlert("Peringatan: " + msg); 
                } else {
                    alert(msg);
                }
                
                // 1. Reset nilai input PLT ke stok maksimal
                this.value = stokTersedia;

                // 2. TRIGGER KONVERSI OTOMATIS
                // Panggil fungsi konversi Anda dengan nilai maksimal tersebut
                // agar input Karton di layar ikut berubah
                if (typeof hitungKonversiKartonOtomatis === 'function') {
                    hitungKonversiKartonOtomatis(stokTersedia);
                }
            }
        });
    }
};


// WAJIB ADA: Mengikat fungsi ke window agar bisa diakses main.js
window.initRekapBlok = initRekapBlok;
window.generateExpiredList = generateExpiredList;
window.loadDropdownBarang = loadDropdownBarang;
// Tambahkan log untuk debug
console.log("Modul Rekap Blok telah dimuat dan init terpasang.");

// --- HANDLER GUDANG ---
window.toggleLockGudang = function(isUnlocked) {
    const container = document.getElementById('container-pilih-gudang');
    const radioButtons = container ? container.querySelectorAll('input[type="radio"]') : [];
    const lblSwitch = document.getElementById('lbl-status-gudang');
    
    // Elemen tambahan yang perlu dikunci/dibuka
    const boxInput = document.getElementById('box-workspace-input');
    const wrapperRiwayat = document.getElementById('wrapper-riwayat-transaksi');
    const wrapperRekap = document.getElementById('wrapper-rekap-detail');

    if (isUnlocked) {
        // --- MODE TERBUKA (ON) ---
        if (container) container.classList.remove('opacity-50', 'pointer-events-none');
        radioButtons.forEach(rb => rb.disabled = false);
        
        //if (boxInput) boxInput.classList.remove('opacity-50', 'pointer-events-none');
        if (wrapperRiwayat) wrapperRiwayat.classList.remove('opacity-50', 'pointer-events-none');
        if (wrapperRekap) wrapperRekap.classList.remove('opacity-50', 'pointer-events-none');

        if (lblSwitch) {
            lblSwitch.innerText = "GUDANG AKTIF";
            lblSwitch.className = "text-[9px] font-bold text-emerald-600 bg-emerald-100/80 px-1.5 py-0.5 rounded uppercase tracking-wider";
        }

    } else {
        // --- MODE TERKUNCI (OFF) ---
        if (container) container.classList.add('opacity-50', 'pointer-events-none');
        radioButtons.forEach(rb => {
            rb.disabled = true;
            rb.checked = false;
        });

        // Kunci semua area
        if (boxInput) boxInput.classList.add('opacity-50', 'pointer-events-none');
        if (wrapperRiwayat) wrapperRiwayat.classList.add('opacity-50', 'pointer-events-none');
        if (wrapperRekap) wrapperRekap.classList.add('opacity-50', 'pointer-events-none');

        window.selectedBlok = ""; // Reset variabel blok global
        if (typeof window.initRekapBlok === 'function') window.initRekapBlok(); 
        
        if (lblSwitch) {
            lblSwitch.innerText = "GUDANG NONAKTIF";
            lblSwitch.className = "text-[9px] font-bold text-red-500 bg-red-100/80 px-1.5 py-0.5 rounded uppercase tracking-wider";
        }
        
        // Reset form jika ada
        if (typeof resetFormTransaksi === 'function') resetFormTransaksi();
    }
};

// --- HANDLER TRANSAKSI ---
window.toggleEngineTransaksi = function(isOut) {
    const boxWorkspace = document.getElementById('box-workspace-input');
    const titleSide = document.getElementById('title-transaksi-side');
    const lblSwitch = document.getElementById('lbl-status-switch');
    const lblTanggal = document.getElementById('lbl-tx-tanggal');
    const lblQtyPlt = document.getElementById('lbl-tx-qty-plt');
    const lblQtyKrt = document.getElementById('lbl-tx-qty-krt');
    
    const btnSimpan = document.getElementById('btn-simpan-transaksi');
    const rowGrid = document.getElementById('grid-row-dinamis');
    const wrapKarton = document.getElementById('wrapper-konversi-karton');
    const wrapperExpired = document.getElementById('wrapper-expired-input');
    const inputKarton = document.getElementById('tx-karton-readonly');

    const blokTerpilih = window.selectedBlok; 

    // --- PEMBERSIHAN EVENT LISTENER ---
    // Mengganti elemen tx-kode dengan clone-nya untuk menghapus semua event listener lama
    const select = document.getElementById('tx-kode');
    if (select) {
        const newSelect = select.cloneNode(true);
        select.parentNode.replaceChild(newSelect, select);
    }
    const freshSelect = document.getElementById('tx-kode');
    freshSelect.innerHTML = '<option value="">Memuat data...</option>';

    // Logic UI
    if (isOut) {
        boxWorkspace.className = "col-span-7 bg-rose-50/60 rounded-xl border border-[#dcdcdc] shadow-sm overflow-hidden flex flex-col transition-colors duration-200";
        titleSide.innerText = "Input Barang Keluar";
        titleSide.className = "text-[10px] font-bold text-rose-700 uppercase tracking-wide";
        lblSwitch.innerText = "KELUAR";
        lblSwitch.className = "text-[9px] font-bold text-rose-600 bg-rose-100/80 px-1.5 py-0.5 rounded uppercase tracking-wider";
        lblTanggal.innerText = "Tanggal Keluar";
        lblQtyPlt.innerText = "Qty Palet Keluar";
        lblQtyKrt.innerText = "Qty Karton Keluar";
        inputKarton.readOnly = false;
        inputKarton.className = "w-full bg-white border border-[#c8c8c8] rounded-md py-1 px-1.5 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-rose-500";
        rowGrid.className = "grid grid-cols-3 gap-2";
        wrapKarton.classList.remove('hidden');
        wrapperExpired.style.display = "block";
        btnSimpan.className = "flex-1 py-1.5 bg-gradient-to-b from-[#f43f5e] to-[#e11d48] text-white font-bold text-[10px] rounded-lg shadow-md border border-rose-600 tracking-wide text-center uppercase";
        btnSimpan.innerText = "SIMPAN OUT";

        if (blokTerpilih) {
            window.populateKodeBarangOut(blokTerpilih);
            window.populateExpiredFIFO(blokTerpilih, "");
            window.initOutEventListeners(); 
        } else {
            if (freshSelect) freshSelect.innerHTML = '<option value="">Pilih Blok Dahulu!</option>';
        }
    } else {
        boxWorkspace.className = "col-span-7 bg-emerald-50/60 rounded-xl border border-[#dcdcdc] shadow-sm overflow-hidden flex flex-col transition-colors duration-200";
        titleSide.innerText = "Input Barang Masuk";
        titleSide.className = "text-[10px] font-bold text-emerald-700 uppercase tracking-wide";
        lblSwitch.innerText = "MASUK";
        lblSwitch.className = "text-[9px] font-bold text-emerald-600 bg-emerald-100/80 px-1.5 py-0.5 rounded uppercase tracking-wider";
        lblTanggal.innerText = "Tanggal Masuk";
        lblQtyPlt.innerText = "Qty Palet Masuk";
        lblQtyKrt.innerText = "Qty Karton Masuk";
        inputKarton.readOnly = true;
        inputKarton.className = "w-full bg-slate-100 border border-[#c8c8c8] rounded-md py-1 px-1.5 text-[11px] font-bold text-slate-500 focus:outline-none";
        rowGrid.className = "grid grid-cols-3 gap-2";
        wrapKarton.classList.remove('hidden');
        wrapperExpired.style.display = "block";
        btnSimpan.className = "flex-1 py-1.5 bg-gradient-to-b from-[#10b981] to-[#059669] text-white font-bold text-[10px] rounded-lg shadow-md border border-emerald-600 tracking-wide text-center uppercase";
        btnSimpan.innerText = "SIMPAN IN";

        // Mode MASUK
        window.loadDropdownBarang(blokTerpilih);
        if (typeof window.generateExpiredList === 'function') {
            window.generateExpiredList();
        }
    }
    
    if (typeof resetFormTransaksi === 'function') resetFormTransaksi();
};

window.gantiTabTransaksi = function(tipe) {
    // Logic ganti tab UI Anda...
};

window.resetFormTransaksi = function() {
    document.getElementById('tx-tanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('tx-palet').value = "";
    document.getElementById('tx-karton-readonly').value = "";
    document.getElementById('tx-expired').value = "";
};

window.selectedBlok = "RETUR"; // Pastikan inisialisasi awal sesuai dengan kebutuhan Anda. Bisa juga kosong jika ingin memaksa pilih blok terlebih dahulu.
window.pilihBlokGudang = function(namaBlok) {
    // 1. Simpan ke variabel global
    window.selectedBlok = namaBlok;

    // 2. BUKA KUNCI INPUT
    const boxInput = document.getElementById('box-workspace-input');
    if (boxInput) {
        boxInput.classList.remove('opacity-50', 'pointer-events-none');
    }

    // 3. Update Label
    document.getElementById('lbl-monitor-stok').innerText = "STOK GUDANG : " + namaBlok;
    document.getElementById('lbl-title-riwayat').innerText = "RIWAYAT TRANSAKSI : " + namaBlok;
    const badgeBlok = document.getElementById('lbl-nama-blok-badge');
    if (badgeBlok) badgeBlok.innerText = namaBlok;

    // 4. UPDATE DROPDOWN SESUAI MODE YANG SEDANG AKTIF
    const statusSwitch = document.getElementById('lbl-status-switch');
    const isOut = statusSwitch ? statusSwitch.innerText.trim() === "KELUAR" : false;

    if (isOut) {
        // Jika mode KELUAR, pakai fungsi khusus stok
        window.populateKodeBarangOut(namaBlok);
        window.populateExpiredFIFO(namaBlok, ""); // Pastikan ini dipanggil setelah dropdown barang terisi
        window.toggleEngineTransaksi(true); // Pastikan mode OUT aktif agar event listener dan UI sesuai
        window.initOutEventListeners(); // Pastikan event listener untuk mode OUT diinisialisasi
    } else {
        // Jika mode MASUK, pakai fungsi master barang
        window.loadDropdownBarang("IN", namaBlok);
        window.toggleEngineTransaksi(false); // Pastikan mode IN aktif agar event listener dan UI sesuai
        if (typeof window.generateExpiredList === 'function') {
            window.generateExpiredList();
        }
    }

    // 5. Update data lainnya
    if (typeof initRekapBlok === 'function') initRekapBlok();
    if (typeof renderRekapStok === 'function') renderRekapStok(namaBlok);
    if (typeof renderRiwayatBlok === 'function') renderRiwayatBlok(namaBlok);
    if (typeof updateTotalStokBlok === 'function') updateTotalStokBlok(namaBlok);
    if (typeof updateInfoTransaksi === 'function') updateInfoTransaksi(namaBlok);
    if (typeof toggleEngineTransaksi === 'function') toggleEngineTransaksi(isOut); // Pastikan mode transaksi sesuai dengan status switch saat blok dipilih 
    if (typeof initOutEventListeners === 'function') initOutEventListeners(); // Pastikan event listener untuk mode OUT diinisialisasi jika mode OUT aktif  
};

window.hitungKonversiKartonOtomatis = function(valPalet) {
    const txtKarton = document.getElementById('tx-karton-readonly');
    const kodeBarangTerpilih = document.getElementById('tx-kode').value;

    // Jika tidak ada barang yang dipilih atau input palet kosong, kosongkan hasil
    if (!kodeBarangTerpilih || !valPalet) {
        txtKarton.value = "";
        return;
    }

    // Cari data barang berdasarkan KODE_BARANG (key)
    // Catatan: Jika key di Firebase bukan KODE_BARANG, sesuaikan pencariannya
    const dataBarang = window.dataMasterBarang;
    
    // Cari objek barang yang kodenya cocok
    let barangDitemukan = null;
    for (let key in dataBarang) {
        if (dataBarang[key].KODE_BARANG === kodeBarangTerpilih) {
            barangDitemukan = dataBarang[key];
            break;
        }
    }

    if (barangDitemukan && barangDitemukan.QTY) {
        const pengali = parseInt(barangDitemukan.QTY);
        txtKarton.value = parseInt(valPalet) * pengali;
    } else {
        txtKarton.value = "0"; // Atau beri pesan error
    }
};

window.simpanTransaksiBlok = async function() {
    console.log("Fungsi simpan dipanggil!");
    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
    
    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : "";
    };

    // 1. Ambil data
    const data = {
        blok: window.selectedBlok,
        tanggal: getVal('tx-tanggal'),
        kodeBarang: getVal('tx-kode'),
        qtyPalet: parseInt(getVal('tx-palet') || 0),
        qtyKarton: parseInt(getVal('tx-karton-readonly') || 0),
        expired: getVal('tx-expired'),
        tipe: document.getElementById('lbl-status-switch') ? document.getElementById('lbl-status-switch').innerText.trim() : "MASUK"
    };

    // Validasi
    if (!data.blok) {
        miuiAlert("Silakan pilih blok terlebih dahulu!");
        return;
    }
    if (!data.kodeBarang || (data.qtyPalet === 0 && data.qtyKarton === 0) || !data.expired) {
        miuiAlert("Mohon lengkapi data barang, qty, dan expired!");
        return;
    }

    const timestamp = new Date().getTime();
    const transactionId = `${data.blok}_${data.tanggal}_${timestamp}`;

    try {
        // 3. Simpan ke log_transaksi
        await fetch(`${FIREBASE_URL}log_transaksi/${transactionId}.json`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });

        // 4. Update stok_blok dengan struktur baru: stok_blok/BLOK/KODE/EXP
        const pathStok = `${FIREBASE_URL}stok_blok/${data.blok}/${data.kodeBarang}/${data.expired}.json`;
        
        const respStok = await fetch(pathStok);
        let dataLama = await respStok.json();

        // LOGIKA AMAN: Jika dataLama bukan objek (masih angka), reset ke format objek
        let pltLama = 0;
        let krtLama = 0;
        
        if (dataLama && typeof dataLama === 'object') {
            pltLama = parseInt(dataLama.plt || 0);
            krtLama = parseInt(dataLama.krt || 0);
        } else if (dataLama && typeof dataLama === 'number') {
            // Jika data lama hanya angka (sebelum migrasi), anggap itu PLT
            pltLama = dataLama;
        }

        let dataBaru = {
            plt: (data.tipe === "MASUK") ? (pltLama + data.qtyPalet) : (pltLama - data.qtyPalet),
            krt: (data.tipe === "MASUK") ? (krtLama + data.qtyKarton) : (krtLama - data.qtyKarton)
        };

        // Simpan kembali
        if (dataBaru.plt <= 0 && dataBaru.krt <= 0) {
            await fetch(pathStok, { method: 'DELETE' });
        } else {
            await fetch(pathStok, {
                method: 'PUT',
                body: JSON.stringify(dataBaru)
            });
        }

        miuiAlert("Sukses! Data tersimpan.");
        
        // Refresh UI
        if(typeof resetFormTransaksi === 'function') resetFormTransaksi();
        if(typeof initRekapBlok === 'function') initRekapBlok();
        if (typeof updateTotalStokBlok === 'function') updateTotalStokBlok(data.blok); 
        if (typeof updateInfoTransaksi === 'function') updateInfoTransaksi(data.blok); 
        if (typeof renderRekapStok === 'function') renderRekapStok(data.blok); // Panggil fungsi rekap Anda
        if (typeof toggleEngineTransaksi === 'function') toggleEngineTransaksi(data.tipe === "KELUAR"); // Pastikan mode transaksi sesuai dengan tipe yang baru saja disimpan
        if (typeof initOutEventListeners === 'function') initOutEventListeners(); // Pastikan event listener untuk mode OUT diinisialisasi jika mode OUT aktif
        if (typeof populateKodeBarangOut === 'function') populateKodeBarangOut(data.blok); // Refresh dropdown barang keluar jika mode OUT aktif

    } catch (e) {
        console.error("Gagal simpan:", e);
        miuiAlert("Gagal menyimpan data: " + e.message);
    }
};

// --- 4. RENDER RIWAYAT & REKAP ---
window.renderRiwayatBlok = async function(namaBlok) {
    const tableBody = document.getElementById('table-riwayat-blok');
    const targetBlok = namaBlok || window.selectedBlok;

    if (!targetBlok || targetBlok === "undefined") return;

    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
    
    // Ambil data
    const [resLog, resMaster] = await Promise.all([
        fetch(`${FIREBASE_URL}log_transaksi.json`),
        fetch(`${FIREBASE_URL}master_barang.json`)
    ]);
    
    const data = await resLog.json();
    const masterBarang = await resMaster.json();
    
    if (!data || Object.keys(data).length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-2 text-slate-400">Belum ada transaksi</td></tr>`;
        return;
    }

    const riwayatArray = Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .filter(item => item.blok === targetBlok)
        .sort((a, b) => b.id.localeCompare(a.id)); 

    if (riwayatArray.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-slate-400">Belum ada transaksi untuk blok ini</td></tr>`;
        return;
    }

    // Render ke tabel
    tableBody.innerHTML = riwayatArray.map(item => {
        const isOut = item.tipe?.trim().toUpperCase() === "KELUAR";
        const infoBarang = masterBarang ? masterBarang[item.kodeBarang] : null;
        const displayKode = infoBarang ? infoBarang.INISIAL : item.kodeBarang;
        
        let tglDisplay = item.tanggal || '-';
        if (tglDisplay.includes('-') && tglDisplay.split('-')[0].length === 4) {
            const parts = tglDisplay.split('-');
            tglDisplay = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        
        return `
            <tr class="hover:bg-slate-50 border-b border-slate-50">
                <td class="py-1 px-2 text-slate-400 text-[9px] w-[55px] truncate">${tglDisplay}</td>
                <td class="py-1 px-1 text-center">
                    <span class="${isOut ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'} text-[8px] px-1 rounded font-bold">
                        ${isOut ? 'OUT' : 'IN'}
                    </span>
                </td>
                <td class="py-1 px-1 font-bold text-slate-900 text-[10px]">${displayKode}</td>
                <td class="py-1 px-1 text-center text-[10px] text-slate-600">${item.qtyKarton || 0}</td>
                <td class="py-1 px-1 text-center font-bold text-[10px]">${item.qtyPalet || 0}</td>
                <td class="py-1 px-1 text-center text-[9px] text-slate-500 font-medium">${item.expired || '-'}</td>
                <td class="py-1 px-2 flex justify-center gap-1">
                    <button onclick="editTransaksiBlok('${item.id}')" class="text-blue-500 hover:text-blue-700">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onclick="hapusTransaksiBlok('${item.id}')" class="text-red-500 hover:text-red-700">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};

// Fungsi untuk menghapus transaksi dan menyesuaikan stok
window.hapusTransaksiBlok = function(idTransaksi) {
    console.log("Tombol hapus diklik untuk ID:", idTransaksi); // Tambahkan ini
    miuiConfirm("Yakin ingin menghapus transaksi ini? Stok akan disesuaikan kembali.", async function() {
        
        const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

        try {
            const res = await fetch(`${FIREBASE_URL}log_transaksi/${idTransaksi}.json`);
            const trans = await res.json();
            
            if (!trans) {
                miuiAlert("Data transaksi tidak ditemukan!");
                return;
            }

            const isOut = trans.tipe === "KELUAR";
            const pathStok = `${FIREBASE_URL}stok_blok/${trans.blok}/${trans.kodeBarang}/${trans.expired}.json`;
            
            // 1. AMBIL DATA STOK TERKINI DULU
            const resStok = await fetch(pathStok);
            const dataStok = await resStok.json() || { plt: 0, krt: 0 }; 

            // 2. HITUNG PENYESUAIAN
            // Kita gunakan (trans.qtyPalet || 0) untuk mencegah nilai undefined
            const penyesuaianPlt = isOut ? parseInt(trans.qtyPalet || 0) : -parseInt(trans.qtyPalet || 0);
            const penyesuaianKrt = isOut ? parseInt(trans.qtyKarton || 0) : -parseInt(trans.qtyKarton || 0);
            
            const newQtyPlt = parseInt(dataStok.plt || 0) + penyesuaianPlt;
            const newQtyKrt = parseInt(dataStok.krt || 0) + penyesuaianKrt;

            // 3. KIRIM KEDUANYA AGAR TIDAK HILANG
            // Kita paksa kirim plt dan krt agar struktur objek di Firebase tetap utuh
            await fetch(pathStok, { 
                method: 'PATCH', 
                body: JSON.stringify({ 
                    plt: newQtyPlt,
                    krt: newQtyKrt 
                }) 
            });
            
            await fetch(`${FIREBASE_URL}log_transaksi/${idTransaksi}.json`, { method: 'DELETE' });

            miuiAlert("Transaksi berhasil dihapus dan stok telah disesuaikan!");
            
            // Refresh UI
            window.renderRiwayatBlok(window.selectedBlok);
            if (typeof window.renderRekapStok === 'function') window.renderRekapStok(trans.blok);
            if (typeof window.updateTotalStokBlok === 'function') window.updateTotalStokBlok(trans.blok);

        } catch (error) {
            console.error("Error:", error);
            miuiAlert("Terjadi kesalahan saat menghapus data.");
        }
    });
};

// Fungsi untuk mengedit transaksi (Anda harus membuat form/modal untuk ini)
window.editTransaksiBlok = async function(idTransaksi) {
    // Tambahkan ini untuk debug
    console.log("Mencoba mengedit ID:", idTransaksi);
    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
    
    // 1. Ambil data dengan loading state (optional: tambahkan indikator loading jika perlu)
    const [resLog, resMaster] = await Promise.all([
        fetch(`${FIREBASE_URL}log_transaksi/${idTransaksi}.json`),
        fetch(`${FIREBASE_URL}master_barang.json`)
    ]);

    const data = await resLog.json();
    const masterBarang = await resMaster.json();

    if (!data) return miuiAlert("Data transaksi tidak ditemukan!");

    // Simpan data master ke global agar bisa diakses oleh fungsi konversi
    window.dataMasterBarang = masterBarang;

    // 2. Generate Dropdown Tanggal
    const tglSelect = document.getElementById('edit-tanggal');
    if (tglSelect) {
        tglSelect.innerHTML = "";
        for (let i = 0; i <= 10; i++) {
            let d = new Date();
            d.setDate(d.getDate() - i);
            let dd = String(d.getDate()).padStart(2, '0');
            let mm = String(d.getMonth() + 1).padStart(2, '0');
            let yyyy = d.getFullYear();
            let val = `${yyyy}-${mm}-${dd}`;
            let text = `${dd}/${mm}/${yyyy}`;
            
            let opt = document.createElement("option");
            opt.value = val;
            opt.textContent = text;
            tglSelect.appendChild(opt);
        }

        if (tglSelect.querySelector(`option[value="${data.tanggal}"]`)) {
            tglSelect.value = data.tanggal;
        } else {
            let optExtra = document.createElement("option");
            optExtra.value = data.tanggal;
            optExtra.textContent = data.tanggal;
            tglSelect.appendChild(optExtra);
            tglSelect.value = data.tanggal;
        }
    }

    // 3. Set data lainnya ke elemen form
    const infoBarang = masterBarang ? masterBarang[data.kodeBarang] : null;
    const displayKode = infoBarang ? infoBarang.INISIAL : data.kodeBarang;

    const mapping = {
        'edit-id-transaksi-blok': idTransaksi,
        'edit-tipe': data.tipe,
        'edit-kode': displayKode,
        'edit-palet': data.qtyPalet,
        'edit-kode-asli': data.kodeBarang,
        'edit-expired': data.expired
    };

    for (const [id, value] of Object.entries(mapping)) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    // 4. Trigger hitung konversi (Pastikan ini dijalankan setelah input terisi)
    if (typeof window.hitungKonversiKartonEdit === 'function') {
        // Kita panggil fungsi ini dengan delay 0 (setTimeout) 
        // untuk memastikan DOM benar-benar selesai update nilai
        setTimeout(() => {
            window.hitungKonversiKartonEdit(data.qtyPalet);
        }, 50);
    }

    // 5. Tampilkan Modal
    const modal = document.getElementById('modal-edit-transaksi-blok');
    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.simpanEditTransaksiBlok = async function() {
    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
    const idTransaksi = document.getElementById('edit-id-transaksi-blok').value;

    miuiConfirm("Yakin ingin menyimpan perubahan? Stok akan disesuaikan secara otomatis.", async function() {
        try {
            // 1. Ambil data transaksi lama
            const res = await fetch(`${FIREBASE_URL}log_transaksi/${idTransaksi}.json`);
            const transLama = await res.json();
            
            if (!transLama) return miuiAlert("Data transaksi asli tidak ditemukan!");

            // 2. REVERT STOK LAMA (Batalkan dampak transaksi lama)
            const isOutLama = transLama.tipe === "KELUAR";
            const pathStokLama = `${FIREBASE_URL}stok_blok/${transLama.blok}/${transLama.kodeBarang}/${transLama.expired}.json`;
            const resStokLama = await fetch(pathStokLama);
            const dataStokLama = await resStokLama.json() || { plt: 0, krt: 0 };

            // Jika dulu KELUAR, stok ditambah kembali. Jika dulu MASUK, stok dikurangi.
            const revertPlt = isOutLama ? parseInt(transLama.qtyPalet || 0) : -parseInt(transLama.qtyPalet || 0);
            const revertKrt = isOutLama ? parseInt(transLama.qtyKarton || 0) : -parseInt(transLama.qtyKarton || 0);
            
            await fetch(pathStokLama, { 
                method: 'PATCH', 
                body: JSON.stringify({ 
                    plt: parseInt(dataStokLama.plt || 0) + revertPlt,
                    krt: parseInt(dataStokLama.krt || 0) + revertKrt 
                }) 
            });

            // 3. SIAPKAN DATA BARU
            const dataBaru = {
                tanggal: document.getElementById('edit-tanggal').value,
                tipe: document.getElementById('edit-tipe').value,
                kodeBarang: document.getElementById('edit-kode-asli').value,
                qtyPalet: parseInt(document.getElementById('edit-palet').value || 0),
                qtyKarton: parseInt(document.getElementById('edit-karton').value || 0),
                expired: document.getElementById('edit-expired').value,
                blok: transLama.blok // Blok tidak berubah
            };

            // 4. TERAPKAN STOK BARU
            const pathStokBaru = `${FIREBASE_URL}stok_blok/${dataBaru.blok}/${dataBaru.kodeBarang}/${dataBaru.expired}.json`;
            const resStokBaru = await fetch(pathStokBaru);
            const dataStokBaru = await resStokBaru.json() || { plt: 0, krt: 0 };

            const isOutBaru = dataBaru.tipe === "KELUAR";
            const updatePlt = isOutBaru ? -dataBaru.qtyPalet : dataBaru.qtyPalet;
            const updateKrt = isOutBaru ? -dataBaru.qtyKarton : dataBaru.qtyKarton;

            await fetch(pathStokBaru, { 
                method: 'PATCH', 
                body: JSON.stringify({ 
                    plt: parseInt(dataStokBaru.plt || 0) + updatePlt,
                    krt: parseInt(dataStokBaru.krt || 0) + updateKrt 
                }) 
            });

            // 5. UPDATE LOG TRANSAKSI
            await fetch(`${FIREBASE_URL}log_transaksi/${idTransaksi}.json`, { 
                method: 'PATCH', 
                body: JSON.stringify(dataBaru) 
            });

            miuiAlert("Data berhasil diupdate dan stok telah disesuaikan!");
            tutupModalEditBlok();

            // Refresh UI
            window.renderRiwayatBlok(dataBaru.blok);
            if (typeof window.renderRekapStok === 'function') window.renderRekapStok(dataBaru.blok);
            if (typeof window.updateTotalStokBlok === 'function') window.updateTotalStokBlok(dataBaru.blok);

        } catch (error) {
            console.error("Error:", error);
            miuiAlert("Terjadi kesalahan saat mengupdate data.");
        }
    });
};

window.tutupModalEditBlok = () => document.getElementById('modal-edit-transaksi-blok').classList.add('hidden');

window.hitungKonversiKartonEdit = function(valPalet) {
    const txtKarton = document.getElementById('edit-karton');
    const elKodeAsli = document.getElementById('edit-kode-asli');
    
    // Safety check: Jika elemen tidak ada, jangan paksa eksekusi
    if (!txtKarton || !elKodeAsli) {
        console.warn("Konversi Karton: Elemen edit-karton/edit-kode-asli belum siap di DOM.");
        return;
    }

    const kodeAsli = elKodeAsli.value;
    const valP = parseInt(valPalet) || 0;

    // Jika kode barang atau palet kosong, reset karton ke 0
    if (!kodeAsli || valP === 0) {
        txtKarton.value = "0";
        return;
    }

    // Ambil data master
    const dataBarang = window.dataMasterBarang || {};
    const barangDitemukan = dataBarang[kodeAsli];

    if (barangDitemukan && barangDitemukan.QTY) {
        const pengali = parseInt(barangDitemukan.QTY);
        txtKarton.value = valP * pengali;
    } else {
        txtKarton.value = "0";
    }
};

window.updateTotalStokBlok = async function(namaBlok) {
    const infoStokEl = document.getElementById('info-stok-blok');
    const infoKapasitasEl = document.getElementById('info-kapasitas-blok');
    const infoSisaEl = document.getElementById('info-sisa-blok');
    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

    try {
        // 1. Ambil Data Stok & Data Kapasitas (Struktur: {stok: X, laporan: Y})
        const [stokRes, kapasitasRes] = await Promise.all([
            fetch(`${FIREBASE_URL}stok_blok/${namaBlok.trim()}.json`),
            fetch(`${FIREBASE_URL}master_blok/${namaBlok.trim()}/kapasitas.json`)
        ]);

        const stokData = await stokRes.json();
        const kapData = await kapasitasRes.json() || { stok: 0, laporan: 0 }; 

        // 2. Hitung Total Stok Palet
        let totalPalet = 0;
        if (stokData) {
            Object.values(stokData).forEach(expData => {
                totalPalet += Object.values(expData).reduce((acc, item) => {
                    return acc + (parseInt(item.plt) || 0);
                }, 0);
            });
        }

        // 3. Gunakan 'stok' untuk perhitungan sisa kapasitas (sesuai permintaan)
        const kapStok = parseInt(kapData.stok) || 0;
        const sisaKapasitas = Math.max(0, kapStok - totalPalet);

        // 4. Update UI
        if (infoStokEl) {
            infoStokEl.innerHTML = `${totalPalet} <span class="text-[8px] font-normal text-slate-400">PLT</span>`;
        }
        
        // Menampilkan kapasitas stok di header (dengan tombol edit yang sudah dibuat)
        if (infoKapasitasEl) {
            infoKapasitasEl.innerHTML = `${kapStok} <span class="text-[8px] font-normal text-slate-400">MAX</span>`;
        }

        if (infoSisaEl) {
            infoSisaEl.innerHTML = `${sisaKapasitas} <span class="text-[8px] font-normal text-slate-400">PLT</span>`;
            
            // Efek visual jika sisa kapasitas habis
            infoSisaEl.className = sisaKapasitas <= 0 
                ? "text-[10px] font-black text-red-600 tracking-wide" 
                : "text-[10px] font-black text-slate-800 tracking-wide";
        }
        
    } catch (e) {
        console.error("Gagal update data blok:", e);
        if (infoStokEl) infoStokEl.innerHTML = `0 <span class="text-[8px] font-normal text-slate-400">PLT</span>`;
        if (infoSisaEl) infoSisaEl.innerHTML = `0 <span class="text-[8px] font-normal text-slate-400">PLT</span>`;
    }
};

// Fungsi untuk membuka modal kapasitas dan mengisi data jika sudah ada
window.bukaModalKapasitas = async function() {
    const modal = document.getElementById('modal-kapasitas');
    const namaBlok = window.selectedBlok;
    
    // Reset/Kosongkan input sebelum diisi data baru
    document.getElementById('input-kap-lama').value = "";
    document.getElementById('input-kap-baru').value = "";
    
    if (!namaBlok) {
        miuiAlert("Pilih blok terlebih dahulu!");
        return;
    }

    modal.classList.remove('hidden');

    // Ambil data dari Firebase untuk mengisi input (pre-fill)
    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
    try {
        const response = await fetch(`${FIREBASE_URL}master_blok/${namaBlok.trim()}/kapasitas.json`);
        const data = await response.json();
        
        // Jika data ada, isi dengan nilai dari Firebase
        if (data) {
            document.getElementById('input-kap-lama').value = data.stok || "";
            document.getElementById('input-kap-baru').value = data.laporan || "";
        }
    } catch (e) {
        console.error("Gagal memuat data kapasitas:", e);
        // Tetap biarkan kosong jika gagal ambil data
    }
};

window.tutupModalKapasitas = function() {
    document.getElementById('modal-kapasitas').classList.add('hidden');
};

window.simpanKapasitas = async function() {
    const namaBlok = window.selectedBlok;
    if (!namaBlok) return miuiAlert("Pilih blok terlebih dahulu!");
    
    const kapStok = document.getElementById('input-kap-lama').value;
    const kapLap = document.getElementById('input-kap-baru').value;
    
    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
    
    try {
        // Menyimpan dengan key 'stok' dan 'laporan' sesuai kesepakatan kita
        await fetch(`${FIREBASE_URL}master_blok/${namaBlok.trim()}/kapasitas.json`, {
            method: 'PATCH',
            body: JSON.stringify({ 
                stok: kapStok, 
                laporan: kapLap 
            })
        });
        
        miuiAlert("Kapasitas berhasil disimpan!");
        tutupModalKapasitas();
        
        // Update tampilan utama
        window.updateTotalStokBlok(namaBlok);
    } catch (e) {
        console.error("Gagal simpan kapasitas", e);
        miuiAlert("Gagal simpan kapasitas");
    }
};

// Fungsi untuk mengambil info transaksi terakhir (MASUK/KELUAR) per blok dan menampilkannya di header  
window.updateInfoTransaksi = async function(namaBlok) {
    const container = document.getElementById('container-info-transaksi');
    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

    const response = await fetch(`${FIREBASE_URL}log_transaksi.json`);
    const data = await response.json();
    if (!data) return;

    // Filter transaksi berdasarkan blok
    const list = Object.values(data).filter(item => item.blok === namaBlok);
    
    // Fungsi untuk mengelompokkan dan menjumlahkan per tanggal
    const getSumByDate = (tipe) => {
        const filtered = list.filter(item => item.tipe === tipe);
        if (filtered.length === 0) return { tanggal: '-', qtyPalet: 0 };

        // Grouping berdasarkan tanggal
        const grouped = filtered.reduce((acc, curr) => {
            acc[curr.tanggal] = (acc[curr.tanggal] || 0) + (parseInt(curr.qtyPalet) || 0);
            return acc;
        }, {});

        // Cari tanggal terbaru dari hasil group
        const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
        const lastDate = sortedDates[0];

        return { tanggal: lastDate, qtyPalet: grouped[lastDate] };
    };

    const lastIn = getSumByDate("MASUK");
    const lastOut = getSumByDate("KELUAR");

    container.innerHTML = `
        <div class="flex items-center gap-1">
            <span class="text-[10px] text-emerald-700 font-bold">MASUK:</span>
            <span class="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">${lastIn.tanggal}</span>
            <span class="text-[10px] font-bold text-emerald-700">[ ${lastIn.qtyPalet} PLT ]</span>
        </div>
        <div class="flex items-center gap-1">
            <span class="text-[10px] text-rose-700 font-bold">| KELUAR:</span>
            <span class="text-[10px] bg-rose-100 text-rose-800 px-1 rounded font-bold">${lastOut.tanggal}</span>
            <span class="text-[10px] font-bold text-rose-700">[ ${lastOut.qtyPalet} PLT ]</span>
        </div>
    `;
};


// Fungsi untuk render rekap stok per blok dengan struktur baru
window.renderRekapStok = async function(namaBlok) {
    const tableBody = document.getElementById('table-rekap-stok-item');
    if (!tableBody) return;

    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

    try {
        const [responseStok, responseMaster] = await Promise.all([
            fetch(`${FIREBASE_URL}stok_blok/${namaBlok.trim()}.json`),
            fetch(`${FIREBASE_URL}master_barang.json`)
        ]);
        
        const data = await responseStok.json(); 
        const masterBarang = await responseMaster.json();

        const badgeBlok = document.getElementById('lbl-nama-blok-badge');
        if (badgeBlok) {
            badgeBlok.innerText = namaBlok;
        }

        if (!data || Object.keys(data).length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-slate-400">Belum ada transaksi untuk blok ini</td></tr>`;
            return;
        }

        // 1. Konversi data menjadi array untuk pengurutan
        let listStok = Object.entries(data).map(([kode, expData]) => {
            const infoBarang = masterBarang ? masterBarang[kode] : null;
            const inisial = infoBarang ? infoBarang.INISIAL : kode;
            
            return {
                kode: kode,
                inisial: inisial,
                expData: expData
            };
        });

        // 2. Urutkan berdasarkan inisial
        listStok.sort((a, b) => {
            return a.inisial.localeCompare(b.inisial, undefined, { 
                numeric: true, 
                sensitivity: 'base' 
            });
        });

        // 3. Render HTML berdasarkan array yang sudah urut
        let html = '';
        listStok.forEach(item => {
            let totalPlt = 0;
            let totalKrt = 0;
            let expList = [];

            Object.entries(item.expData).forEach(([exp, val]) => {
                totalPlt += (parseInt(val.plt) || 0);
                totalKrt += (parseInt(val.krt) || 0);
                expList.push(`<span class="whitespace-nowrap">${exp} : ${val.plt || 0} PLT</span>`);
            });

            html += `
                <tr class="hover:bg-slate-50 border-b border-slate-100">
                    <td class="py-2 px-4 font-bold text-slate-900 w-[15%] text-[11px]">${item.inisial}</td>
                    <td class="py-2 px-4 text-center font-black text-orange-600 w-[10%] text-[11px]">${totalKrt}</td>
                    <td class="py-2 px-4 text-center font-black text-slate-900 w-[10%] text-[11px]">${totalPlt}</td>
                    <td class="py-2 px-4 text-[10px] text-slate-600 font-medium leading-relaxed w-[65%]">
                        ${expList.join(' | ')}
                    </td>
                </tr>`;
        });
        
        tableBody.innerHTML = html;
    } catch (err) {
        console.error("Gagal render rekap:", err);
    }
};


// 1. Fungsi untuk mengisi dropdown kode barang dari seluruh blok
window.loadDropdownKode = async function() {
    const dropdown = document.getElementById('dropdown-cari-kode');
    if (!dropdown) return;

    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

    try {
        // Ambil stok dan master secara bersamaan untuk memastikan data tersedia
        const [resStok, resMaster] = await Promise.all([
            fetch(`${FIREBASE_URL}stok_blok.json`),
            // Jika Anda punya URL master, pastikan fetch-nya di sini
            // Untuk sementara, kita pakai window.dataMasterBarang
        ]);
        
        const data = await resStok.json();
        const master = window.dataMasterBarang || {};

        if (!data) {
            console.warn("Data stok_blok kosong di Firebase!");
            return;
        }

        const kodeSet = new Set();
        Object.values(data).forEach(blok => {
            if (typeof blok === 'object') {
                Object.keys(blok).forEach(kode => kodeSet.add(kode));
            }
        });

        let listKode = Array.from(kodeSet).map(kode => {
            // Memastikan INISIAL ada, jika tidak pakai kode aslinya
            const infoBarang = master[kode] || { INISIAL: kode };
            return {
                kode: kode,
                inisial: infoBarang.INISIAL || kode 
            };
        });

        listKode.sort((a, b) => {
            return String(a.inisial).localeCompare(String(b.inisial), undefined, { 
                numeric: true, 
                sensitivity: 'base' 
            });
        });

        dropdown.innerHTML = '<option value="">Pilih Kode Barang...</option>';
        listKode.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.kode;
            opt.textContent = item.inisial;
            dropdown.appendChild(opt);
        });
        
        console.log("Dropdown berhasil diisi dengan", listKode.length, "item.");

    } catch (e) {
        console.error("Gagal memuat dropdown:", e);
    }
};

// 2. Fungsi untuk mencari dan menampilkan data berdasarkan kode yang dipilih
window.cariKodeBarang = async function(kodeTerpilih) {
    const tbody = document.getElementById('table-pencarian-data');
    tbody.innerHTML = "";
    
    if (!kodeTerpilih) return;

    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
    const master = window.dataMasterBarang || {};

    try {
        const response = await fetch(`${FIREBASE_URL}stok_blok.json`);
        const allData = await response.json();
        
        if (!allData) return;

        const inisialDicari = master[kodeTerpilih]?.INISIAL || kodeTerpilih;

        Object.keys(allData).forEach(namaBlok => {
            const blokData = allData[namaBlok];
            
            Object.keys(blokData).forEach(kode => {
                const infoBarang = master[kode] || { INISIAL: kode };
                
                if (infoBarang.INISIAL === inisialDicari) {
                    const expData = blokData[kode];
                    
                    // Hitung total KRT dan PLT serta gabungkan string EXPIRED
                    let totalKrt = 0;
                    let totalPlt = 0;
                    let arrExpired = [];

                    Object.keys(expData).forEach(exp => {
                        const item = expData[exp];
                        const krt = parseInt(item.krt) || 0;
                        const plt = parseInt(item.plt) || 0;
                        
                        totalKrt += krt;
                        totalPlt += plt;
                        arrExpired.push(`${exp} : ${plt} PLT`);
                    });

                    // Gabungkan semua expired dengan pemisah |
                    const rincianExpired = arrExpired.join(' | ');

                    // Render ke baris tabel
                    const row = document.createElement('tr');
                    row.className = "hover:bg-slate-50 border-b border-slate-100";
                    row.innerHTML = `
                        <td class="py-2 px-3 font-black w-[20%] text-orange-600">${namaBlok}</td>
                        <td class="py-2 px-3 text-center w-[10%] text-slate-700">${totalKrt}</td>
                        <td class="py-2 px-3 text-center w-[10%] text-slate-700">${totalPlt}</td>
                        <td class="py-2 px-3 text-left text-[10px] text-slate-600 truncate w-[60%]" title="${rincianExpired}">${rincianExpired}</td>
                    `;
                    tbody.appendChild(row);
                }
            });
        });
    } catch (e) {
        console.error("Gagal melakukan pencarian:", e);
    }
};

// 3. Event Listener untuk dropdown
// Pasang di level dokumen, dia akan mendengarkan perubahan pada elemen dropdown
document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'dropdown-cari-kode') {
        window.cariKodeBarang(e.target.value);
    }
});


// Fungsi untuk mengekspor semua data stok per blok ke PDF  
// Pastikan tombol export Anda di index.html memiliki id="btn-export-pdf"
// Di file rekap-blok.js (sebagai module):

export async function exportAllToPDF() {
    miuiAlert("Sedang menyusun laporan PDF...");

    try {
        // --- 1. SETUP LIBRARY ---
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.autoTable === 'undefined') {
            await new Promise((resolve) => {
                const s = document.createElement('script');
                s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
                s.onload = resolve;
                document.head.appendChild(s);
            });
            await new Promise((resolve) => {
                const s = document.createElement('script');
                s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js";
                s.onload = resolve;
                document.head.appendChild(s);
            });
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4');
        if (typeof window.jspdf.autoTable === 'function') { doc.autoTable = window.jspdf.autoTable; }
        
        // --- 2. FETCH DATA ---
        const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";
        const [resStok, resMaster] = await Promise.all([
            fetch(`${FIREBASE_URL}stok_blok.json`).then(r => r.json()),
            fetch(`${FIREBASE_URL}master_blok.json`).then(r => r.json())
        ]);
        if (!resStok) { miuiAlert("Data stok tidak tersedia."); return; }

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        const dateStr = new Date().toLocaleString('id-ID', options);
        const formattedDate = dateStr.replace(',', '').replace(' pukul', '');

        // --- 3. PROSES DATA ---
        doc.setFontSize(16);
        doc.text("LAPORAN EXPIRED DATE ALL BLOK", 297.6, 40, { align: 'center' });
        doc.setFontSize(8);
        doc.text(`Dicetak PDF pada: ${formattedDate}`, 40, 55);

        let currentY = 80;
        const pageHeight = doc.internal.pageSize.height;
        const rekapData = [];
        let totalKartonAll = 0, totalPaletAll = 0, totalSisaAll = 0;

        for (const namaBlok in resStok) {
            const blokData = resStok[namaBlok];
            const masterInfo = resMaster[namaBlok] || {};
            const kapasitas = parseInt(masterInfo.kapasitas?.laporan) || 0;
            
            let totalStokBlok = 0, totalKrtBlok = 0;
            const tableData = Object.keys(blokData).map(kode => {
                const expData = blokData[kode];
                let totalKrt = 0, totalPlt = 0;
                let expDetails = [];
                for (const exp in expData) {
                    totalKrt += parseInt(expData[exp].krt) || 0;
                    totalPlt += parseInt(expData[exp].plt) || 0;
                    expDetails.push(`${exp} (${expData[exp].plt})`);
                }
                totalStokBlok += totalPlt;
                totalKrtBlok += totalKrt;
                return [kode, totalKrt, totalPlt, expDetails.join(' | ')];
            });

            const sisaPlt = kapasitas - totalStokBlok;
            const displaySisa = sisaPlt <= 0 ? "FULL" : sisaPlt;

            rekapData.push([namaBlok, totalKrtBlok, totalStokBlok, displaySisa]);
            totalKartonAll += totalKrtBlok;
            totalPaletAll += totalStokBlok;
            totalSisaAll += (sisaPlt > 0 ? sisaPlt : 0);

            tableData.push([{ content: 'TOTAL', colSpan: 1, styles: { fontStyle: 'bold' } }, 
                            { content: totalKrtBlok, styles: { fontStyle: 'bold', halign: 'center' } }, 
                            { content: totalStokBlok, styles: { fontStyle: 'bold', halign: 'center' } }, 
                            '']);

            // --- REVISI: Logika Keamanan (Prevent Break) ---
            // 1. Definisikan tinggi blok (Header Teks ~25pt + Tabel ~ (baris * 20pt) + margin)
            const estimatedHeight = 50 + (tableData.length * 20);

            // 2. Jika tidak cukup ruang, pindah halaman SEBELUM cetak header
            if (currentY + estimatedHeight > pageHeight - 50) {
                doc.addPage();
                currentY = 40;
            }

            // 3. Cetak Header Blok
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(`GUDANG: ${namaBlok} | Kapasitas: ${kapasitas} PLT | Total Stok: ${totalStokBlok} PLT | Sisa Kapasitas: ${displaySisa} PLT`, 40, currentY);
            currentY += 15;

            // 4. Cetak Tabel
            doc.autoTable({
                startY: currentY,
                head: [['KODE BARANG', 'KRT', 'PLT', 'Rincian Expired (PLT)']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [70, 130, 180], halign: 'center' },
                styles: { fontSize: 9 },
                columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
                didParseCell: (data) => { if (data.row.index === data.table.body.length - 1) { data.cell.styles.fillColor = [230, 230, 230]; } },
                margin: { left: 40, right: 40 },
                // Paksa tabel untuk tidak memotong baris internal
                pageBreak: 'avoid'
            });
            
            // Update posisi Y berdasarkan hasil akhir tabel
            currentY = doc.lastAutoTable.finalY + 30;
        }

        // --- 4. HALAMAN REKAP ---
        doc.addPage();
        doc.setFontSize(14);
        doc.text("REKAP STOK GUDANG WH-1 & WH-2", 297.6, 40, { align: 'center' });
        rekapData.push(["TOTAL ALL BLOK", totalKartonAll, totalPaletAll, totalSisaAll]);

        doc.autoTable({
            startY: 60,
            head: [['NAMA BLOK', 'KARTON', 'PALET', 'SISA PLT']],
            body: rekapData,
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50], halign: 'center' },
            columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
            // TAMBAHKAN LOGIKA INI:
            didParseCell: (data) => {
                // 1. Warna Abu-abu untuk Baris Total (Baris Terakhir)
                if (data.row.index === data.table.body.length - 1) {
                    data.cell.styles.fillColor = [230, 230, 230];
                    data.cell.styles.fontStyle = 'bold';
                }

                // 2. Warna Merah HANYA jika kolom SISA PLT (indeks 3) berisi "FULL"
                // Pastikan data.cell.raw adalah string "FULL"
                if (data.column.index === 3 && data.cell.raw === "FULL") {
                    data.cell.styles.textColor = [255, 0, 0];
                    data.cell.styles.fontStyle = 'bold';
                }
            },
            margin: { left: 40, right: 40 }
        });

        const now = new Date();
        const f = (n) => String(n).padStart(2, '0');
        const fileName = `LAPORAN_EXP_BLOK_${f(now.getDate())}${f(now.getMonth()+1)}${now.getFullYear()}_${f(now.getHours())}${f(now.getMinutes())}${f(now.getSeconds())}.pdf`;
        doc.save(fileName);
        miuiAlert("Berhasil! Laporan PDF telah diunduh.");
    } catch (error) {
        console.error("Error Export PDF:", error);
        miuiAlert("Gagal: " + error.message);
    }
}



// =========================================================================
// SYSTEM COMPONENT: CUSTOM NOTIF miuiAlert ENGINE (MIUI V5 SPEC)
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
    document.getElementById('miui-global-miuiAlert').classList.add('hidden');
}

// =========================================================================
// SYSTEM COMPONENT: CUSTOM CONFIRM ENGINE (MIUI V5 SPEC)
// =========================================================================
function miuiConfirm(pesan, onConfirm) {
    const box = document.getElementById('miui-global-miuiAlert');
    const teks = document.getElementById('miui-miuiAlert-message');
    const contOk = document.getElementById('miui-container-ok');
    const contConfirm = document.getElementById('miui-container-confirm');
    const btnYa = document.getElementById('miui-btn-ya');
    const btnTidak = document.getElementById('miui-btn-tidak');

    teks.innerText = pesan;
    contOk.classList.add('hidden');       // Sembunyikan OK
    contConfirm.classList.remove('hidden'); // Tampilkan Ya/Batal
    box.classList.remove('hidden');

    btnYa.onclick = function() {
        box.classList.add('hidden');
        if (onConfirm) onConfirm();
    };

    btnTidak.onclick = function() {
        box.classList.add('hidden');
    };
}

window.tutupmiuiAlert = tutupmiuiAlert;
window.miuiAlert = miuiAlert;
window.miuiConfirm = miuiConfirm;