// REKAP-BLOK.JS
// HAPUS URL LAMA ANDA, GANTI DENGAN INI:
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

// Letakkan di bagian atas file JavaScript Anda
window.generateExpiredList = function() {
    const dropdown = document.getElementById('tx-expired');
    if (!dropdown) {
        console.warn("Dropdown #tx-expired tidak ditemukan!");
        return;
    }
    
    dropdown.innerHTML = '<option value="">Pilih Expired</option>';
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

// Pastikan ID 'tx-kode' sesuai dengan dropdown barang Anda
const dropdownBarang = document.getElementById('tx-kode');

if (dropdownBarang) {
    dropdownBarang.addEventListener('change', function() {
        const kodeBarang = this.value;
        const namaBlok = window.selectedBlok; // Mengambil blok yang sedang aktif

        if (kodeBarang && namaBlok) {
            // Panggil fungsi untuk mengambil data expired secara FIFO
            window.populateExpiredFIFO(namaBlok, kodeBarang);
            // Tambahkan ini agar saat tanggal expired diganti, qty langsung tervalidasi ulang
            const dropdownExp = document.getElementById('expired-barang-out');
            if (dropdownExp) {
                dropdownExp.addEventListener('change', function() {
                    const inputQty = document.getElementById('tx-qty-plt-out');
                    if (inputQty && inputQty.value) {
                        // Trigger ulang event input agar fungsi validasi di atas berjalan lagi
                        inputQty.dispatchEvent(new Event('input')); 
                    }
                });
            }
        } else {
            // Bersihkan dropdown expired jika tidak ada barang yang dipilih
            const dropdownExp = document.getElementById('expired-barang-out');
            if (dropdownExp) dropdownExp.innerHTML = '<option value="">Pilih Expired...</option>';
        }
    });
}

window.populateExpiredFIFO = async function(namaBlok, kodeBarang) {
    const dropdownExp = document.getElementById('expired-barang-out');
    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

    try {
        const response = await fetch(`${FIREBASE_URL}stok_blok/${namaBlok.trim()}/${kodeBarang}.json`);
        const expData = await response.json();

        dropdownExp.innerHTML = '<option value="">Pilih Expired...</option>';
        
        if (expData) {
            // Sort berdasarkan tanggal (FIFO)
            const sorted = Object.entries(expData).sort((a, b) => {
                return new Date(`01-${a[0]}-2026`) - new Date(`01-${b[0]}-2026`);
            });

            sorted.forEach(([exp, val]) => {
                if (parseInt(val.plt) > 0) {
                    dropdownExp.innerHTML += `<option value="${exp}" data-plt="${val.plt}">${exp} (Sisa: ${val.plt} PLT)</option>`;
                }
            });

            // OTOMATIS PILIH STOK TERLAMA
            if (dropdownExp.options.length > 1) {
                dropdownExp.selectedIndex = 1; // Pilih opsi pertama setelah "Pilih Expired..."
                dropdownExp.dispatchEvent(new Event('change')); // Trigger event agar aplikasi tahu ada perubahan
            }
        }
    } catch (e) {
        console.error("Gagal load expired:", e);
    }
};

// Tambahkan ini di bagian inisialisasi aplikasi Anda
const inputQtyPlt = document.getElementById('tx-qty-plt-out'); // Sesuaikan ID dengan input Anda

if (inputQtyPlt) {
    inputQtyPlt.addEventListener('input', function() {
        const dropdownExp = document.getElementById('expired-barang-out');
        const selectedOption = dropdownExp.options[dropdownExp.selectedIndex];
        
        if (!selectedOption || !selectedOption.dataset.plt) return;

        const stokTersedia = parseInt(selectedOption.dataset.plt);
        const qtyDiminta = parseInt(this.value) || 0;

        if (qtyDiminta > stokTersedia) {
            // Panggil miuiAlert (sesuaikan dengan fungsi alert Anda)
            if (typeof miuiAlert === 'function') {
                miuiAlert("Peringatan", `Stok tidak mencukupi! Stok tersedia: ${stokTersedia} PLT.`);
            } else {
                alert(`Stok tidak mencukupi! Hanya tersedia ${stokTersedia} PLT.`);
            }
            this.value = stokTersedia; // Reset ke batas maksimal stok
        }
    });
}

// WAJIB ADA: Mengikat fungsi ke window agar bisa diakses main.js
window.initRekapBlok = initRekapBlok;
window.generateExpiredList = generateExpiredList;
window.loadDropdownBarang = loadDropdownBarang;

// Tambahkan log untuk debug
console.log("Modul Rekap Blok telah dimuat dan init terpasang.");

// --- 3. HANDLER TRANSAKSI ---
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

    // Gunakan variabel yang ada secara konsisten
    const mode = isOut ? "OUT" : "IN";
    
    // Perbaikan: Gunakan window.selectedBlok sebagai sumber kebenaran utama
    const blokTerpilih = window.selectedBlok; 

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
    }

    const select = document.getElementById('tx-kode');
    if (select) select.innerHTML = '<option value="">Memuat data...</option>';

    if (isOut) {
        if (blokTerpilih) {
            window.populateKodeBarangOut(blokTerpilih);

        } else {
            if (select) select.innerHTML = '<option value="">Pilih Blok Dahulu!</option>';
        }
    } else {
        // Mode MASUK
        window.loadDropdownBarang("IN", window.selectedBlok);
        
        // Panggil dengan jeda singkat untuk memastikan elemen sudah dirender
        setTimeout(() => {
            if (typeof window.generateExpiredList === 'function') {
                window.generateExpiredList();
            } else {
                console.error("Fungsi generateExpiredList tidak ditemukan!");
            }
        }, 100);
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

window.selectedBlok = ""; // Pastikan inisialisasi awal sesuai dengan kebutuhan Anda. Bisa juga kosong jika ingin memaksa pilih blok terlebih dahulu.
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
    } else {
        // Jika mode MASUK, pakai fungsi master barang
        window.loadDropdownBarang("IN", namaBlok);
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
    
    // Perbaikan Logika: Pastikan data bukan null DAN bukan objek kosong
    if (!data || Object.keys(data).length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-2 text-slate-400">Belum ada transaksi</td></tr>`;
        return;
    }

    // Filter dan Sort
    const riwayatArray = Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .filter(item => item.blok === targetBlok)
        .sort((a, b) => b.id.localeCompare(a.id)); 

    // PERBAIKAN KRITIS: Cek apakah setelah filter array-nya kosong
    if (riwayatArray.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-2 text-slate-400">Belum ada transaksi untuk blok ini</td></tr>`;
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
                <td class="py-1 px-2 text-slate-400 text-[9px] whitespace-nowrap">${tglDisplay}</td>
                <td class="py-1 px-1 text-center">
                    <span class="${isOut ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'} text-[8px] px-1 rounded font-bold">
                        ${isOut ? 'OUT' : 'IN'}
                    </span>
                </td>
                <td class="py-1 px-1 font-bold text-slate-900 text-[10px]">${displayKode}</td>
                <td class="py-1 px-1 text-center text-[10px] text-slate-600">${item.qtyKarton || 0}</td>
                <td class="py-1 px-1 text-center font-bold text-[10px]">${item.qtyPalet || 0}</td>
                <td class="py-1 px-1 text-center text-[9px] text-slate-500 font-medium">${item.expired || '-'}</td>
            </tr>
        `;
    }).join('');
};

// Fungsi untuk menghitung total stok blok dan update di header
window.updateTotalStokBlok = async function(namaBlok) {
    const infoStokEl = document.getElementById('info-stok-blok');
    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

    try {
        // Ambil data stok blok untuk blok tertentu
        const response = await fetch(`${FIREBASE_URL}stok_blok/${namaBlok.trim()}.json`);
        const stokData = await response.json(); 
        
        let totalPalet = 0;
        
        if (stokData) {
            // 1. Loop setiap KODE barang
            Object.values(stokData).forEach(expData => {
                // 2. Loop setiap tanggal expired di dalam kode barang tersebut
                // expData adalah objek: { "28-APR": { plt: 8, krt: 760 }, "28-MEI": { ... } }
                const stokPerBarang = Object.values(expData).reduce((acc, item) => {
                    // Ambil nilai plt, pastikan menjadi integer
                    return acc + (parseInt(item.plt) || 0);
                }, 0);
                
                totalPalet += stokPerBarang;
            });
        }

        // Update UI
        if (infoStokEl) {
            infoStokEl.innerHTML = `${totalPalet} <span class="text-[8px] font-normal text-slate-400">PLT</span>`;
        }
        
    } catch (e) {
        console.error("Gagal ambil total stok:", e);
        if (infoStokEl) {
            infoStokEl.innerHTML = `0 <span class="text-[8px] font-normal text-slate-400">PLT</span>`;
        }
    }
};

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


window.exportRekapBlokPDF = function() {
    miuiAlert("Memproses Export File PDF...");
};