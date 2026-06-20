// --- PASTIKAN INI ADALAH BARIS PALING ATAS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, push, set, remove, get, child, update } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Tentukan konstanta di sini
const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

// Tambahkan inisialisasi agar error 'No Firebase App' hilang
const firebaseConfig = {
    databaseURL: FIREBASE_URL
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
// ---------------------------------------------

export function initOngkir() {
    isiDropdownTanggal();
    initDropdownPeriode();
    loadDriverData();
    loadNominalData();
    loadDataTransaksi();
    
    // Matikan slider di awal
    toggleSliderControls(false);

    // 1.1 Setup Listener Driver
    document.getElementById('ongkir-driver').addEventListener('change', () => {
        handleDriverChange();
        updateDetailTransaksi(); // Pastikan update saat driver ganti
    });

    // 1.2 Listener Tombol
    document.getElementById('btn-simpan-ongkir').addEventListener('click', simpanTransaksi);
    document.getElementById('btn-batal-ongkir').addEventListener('click', resetForm);

    // 1.3 Tambahkan listener filter
    document.getElementById('filter-bulan-ongkir').addEventListener('change', () => {
        loadDataTransaksi(); // Memanggil ulang dengan filter aktif
    });
    
    // 2. Suntikkan class 'ongkir-qty'
    const containers = ['container-ambil', 'container-langsir'];
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.querySelectorAll('select').forEach(sel => sel.classList.add('ongkir-qty'));
        }
    });

    // 3. Setup listener terpusat untuk Slider & Qty
    // Kita gabungkan logikanya agar tidak ada listener ganda yang membingungkan
    const setupListeners = () => {
        document.querySelectorAll('.ongkir-slider').forEach((slider, index) => {
            slider.onchange = function() {
                const allSelects = document.querySelectorAll('.ongkir-qty');
                const qtySelect = allSelects[index];
                
                if (qtySelect) {
                    if (!this.checked) {
                        qtySelect.value = "0";
                    } else if (qtySelect.value === "0") {
                        qtySelect.value = "1";
                    }
                    qtySelect.disabled = !this.checked;
                }
                
                generateKeteranganTujuan();
                updateDetailTransaksi();
            };
        });

        document.querySelectorAll('.ongkir-qty').forEach(qty => {
            qty.onchange = () => {
                generateKeteranganTujuan();
                updateDetailTransaksi();
            };
        });
    };

    setupListeners();
}

window.initOngkir = initOngkir;

function isiDropdownTanggal() {
    const select = document.getElementById('ongkir-tanggal');
    if (!select) return;

    const bulanNama = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    for (let i = 0; i <= 10; i++) {
        let d = new Date();
        d.setDate(d.getDate() - i);
        
        // Ambil komponen tanggal
        let tgl = d.getDate().toString().padStart(2, '0'); // dd
        let bln = bulanNama[d.getMonth()];                 // MMMM
        let thn = d.getFullYear();                         // yyyy
        
        // Format yyyy-mm-dd untuk value (agar tetap bisa dipakai di database)
        let valueTgl = d.toISOString().split('T')[0];
        
        // Format dd MMMM yyyy untuk tampilan
        let displayTgl = `${tgl} ${bln} ${thn}`;
        
        let opt = document.createElement('option');
        opt.value = valueTgl;
        opt.textContent = displayTgl;
        select.appendChild(opt);
    }
}

function isiDropdownTanggalEdit() {
    const select = document.getElementById('edit-tanggal-select');
    if (!select) return;
    
    // Bersihkan isi lama agar tidak duplikat saat modal dibuka berulang kali
    select.innerHTML = "";

    const bulanNama = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    for (let i = 0; i <= 10; i++) {
        let d = new Date();
        d.setDate(d.getDate() - i);
        
        let tgl = d.getDate().toString().padStart(2, '0');
        let bln = bulanNama[d.getMonth()];
        let thn = d.getFullYear();
        
        let valueTgl = d.toISOString().split('T')[0]; // Format yyyy-mm-dd
        let displayTgl = `${tgl} ${bln} ${thn}`;
        
        let opt = document.createElement('option');
        opt.value = valueTgl;
        opt.textContent = displayTgl;
        select.appendChild(opt);
    }
}

export function initDropdownPeriode() {
    const select = document.getElementById('filter-bulan-ongkir');
    if (!select) return;

    const bulanNama = [
        "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", 
        "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
    ];

    const sekarang = new Date();
    
    // Bersihkan dropdown sebelum diisi
    select.innerHTML = "";

    // Loop untuk 8 bulan terakhir
    for (let i = 0; i < 8; i++) {
        let d = new Date(sekarang.getFullYear(), sekarang.getMonth() - i, 1);
        let bulan = bulanNama[d.getMonth()];
        let tahun = d.getFullYear();
        
        let opt = document.createElement('option');
        // Value sebagai filter (contoh: 2026-06)
        opt.value = `${tahun}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        // Tampilan (contoh: JUNI 2026)
        opt.textContent = `${bulan} ${tahun}`;
        
        select.appendChild(opt);
    }
}

export async function loadDriverData() {
    const selectDriver = document.getElementById('ongkir-driver');
    const selectPlat = document.getElementById('ongkir-plat'); // Tambahkan ini
    if (!selectDriver) return;

    try {
        selectDriver.innerHTML = '<option value="">Memuat data...</option>';
        const response = await fetch(`${FIREBASE_URL}master_driver.json`);
        const dataDriver = await response.json();

        if (!dataDriver) return;

        window.dataMasterDriver = dataDriver;

        // 1. Siapkan daftar untuk sorting
        let listDriver = Object.keys(dataDriver).map(key => ({
            key: key,
            ...dataDriver[key]
        }));

        // Sort berdasarkan Plat, baru Driver
        listDriver.sort((a, b) => {
            return (a.DRIVER || "").localeCompare(b.DRIVER);
        });

        // 2. Render Driver
        selectDriver.innerHTML = '<option value="">Pilih Driver...</option>';
        listDriver.forEach(item => {
            let opt = document.createElement("option");
            opt.value = item.key;
            opt.textContent = item.DRIVER;
            // PENTING: Pastikan ini ada
            opt.setAttribute('data-plat', item.PLAT || "-"); 
            selectDriver.appendChild(opt);
        });

        // 3. Render SEMUA Plat ke dropdown ongkir-plat (Urutkan unik)
        const semuaPlat = [...new Set(listDriver.map(d => d.PLAT).filter(p => p))].sort();
        selectPlat.innerHTML = '<option value="">Pilih Ekspedisi - Plat...</option>';
        semuaPlat.forEach(plat => {
            let opt = document.createElement("option");
            opt.value = plat;
            opt.textContent = plat;
            selectPlat.appendChild(opt);
        });
        document.getElementById('ongkir-driver').addEventListener('change', updateDetailTransaksi);

    } catch (e) {
        console.error("Gagal load:", e);
    }
}


// Fungsi untuk menangani perubahan pada dropdown driver
export function handleDriverChange() {
    console.log("Fungsi driver change dipanggil!");
    const selectDriver = document.getElementById('ongkir-driver');
    const selectPlat = document.getElementById('ongkir-plat');
    
    const selectedOption = selectDriver.options[selectDriver.selectedIndex];
    const platDriver = selectedOption ? selectedOption.getAttribute('data-plat') : null;
    
    if (platDriver && platDriver !== "-" && platDriver !== "null") {
        // PERBAIKAN: Cari apakah plat tersebut ada di daftar selectPlat
        // Kita bandingkan secara trim() dan toLowerCase() agar cocok
        const targetPlat = platDriver.trim();
        
        let found = false;
        for (let i = 0; i < selectPlat.options.length; i++) {
            if (selectPlat.options[i].value.trim() === targetPlat) {
                selectPlat.selectedIndex = i;
                found = true;
                break;
            }
        }
        
        if (!found) console.warn("Plat driver tidak ditemukan di list plat: " + targetPlat);
    } else {
        selectPlat.selectedIndex = 0; // Reset ke "Pilih Plat..."
    }
    
    toggleSliderControls(true);
}

// Fungsi untuk mengaktifkan/menonaktifkan input
function toggleSliderControls(isEnabled) {
    const sliders = document.querySelectorAll('.ongkir-slider');
    const selects = document.querySelectorAll('.ongkir-qty');

    console.log("Jumlah Slider:", sliders.length);
    console.log("Jumlah Select:", selects.length);
    
    sliders.forEach((slider, index) => {
        // Matikan slider jika isEnabled false
        slider.disabled = !isEnabled;
        
        // Cari select pasangannya
        const select = selects[index];
        
        if (select) {
            if (!isEnabled) {
                slider.checked = false;
                select.disabled = true;
            } else {
                // Dropdown aktif hanya jika slider dicentang (checked)
                select.disabled = !slider.checked;
            }
        }
    });
}

// Fungsi untuk menghasilkan keterangan tujuan berdasarkan slider yang aktif
function generateKeteranganTujuan() {
    const ambilSliders = document.querySelectorAll('#container-ambil .ongkir-slider');
    const langsirSliders = document.querySelectorAll('#container-langsir .ongkir-slider');
    
    let ambilList = [];
    let langsirList = [];

    ambilSliders.forEach(slider => {
        if (slider.checked) {
            // Mengambil teks dari span di sebelah checkbox
            const labelText = slider.parentElement.parentElement.querySelector('span.truncate').textContent;
            ambilList.push(labelText.split(' /')[0].replace('BLOK ', ''));
        }
    });

    langsirSliders.forEach(slider => {
        if (slider.checked) {
            const labelText = slider.parentElement.parentElement.querySelector('span.truncate').textContent;
            langsirList.push(labelText.split(' /')[0].replace('BLOK ', ''));
        }
    });

    let hasilAmbil = ambilList.length > 0 ? `AMBIL BLOK ${ambilList.join(', ')} KE WH-2` : "";
    let hasilLangsir = langsirList.length > 0 ? `LANGSIR WH-2 KE BLOK ${langsirList.join(', ')}` : "";

    // Gabungkan
    let finalString = [hasilAmbil, hasilLangsir].filter(Boolean).join(' & ');
    
    // Pastikan ID ini cocok dengan textarea Anda
    const tujuanField = document.getElementById('ongkir-tujuan');
    if (tujuanField) {
        tujuanField.value = finalString;
    }
}

export async function loadNominalData() {
    try {
        const response = await fetch(`${FIREBASE_URL}master_nominal.json`);
        const data = await response.json();
        // Pastikan kita menyimpan objek, jika null kita set objek kosong agar tidak error
        window.dataMasterNominal = data || {}; 
        console.log("Master Nominal Loaded:", window.dataMasterNominal);
    } catch (e) {
        console.error("Gagal load nominal:", e);
        window.dataMasterNominal = {};
    }
}

// Tambahkan fungsi ini di js/ongkir.js
export function updateDetailTransaksi() {
    const driverKey = document.getElementById('ongkir-driver').value;
    const dataDriver = window.dataMasterDriver ? window.dataMasterDriver[driverKey] : null;
    
    // Jika tidak ada driver, reset semua field agar tidak menampilkan data lama
    if (!dataDriver) {
        document.getElementById('ongkir-banyaknya').value = "";
        document.getElementById('ongkir-nominal').value = "";
        document.getElementById('ongkir-palet').value = "";
        document.getElementById('ongkir-terbilang').value = "";
        return;
    }

    const isiPalet = parseInt(dataDriver.ISI) || 0;
    const sliders = document.querySelectorAll('.ongkir-slider');
    const qtys = document.querySelectorAll('.ongkir-qty'); 
    
    let listBanyaknya = [];
    let totalNominal = 0;
    let totalPalet = 0;

    sliders.forEach((slider, index) => {
        if (slider.checked) {
            const qty = parseInt(qtys[index].value) || 0;
            const namaBlok = slider.parentElement.parentElement.querySelector('span.truncate').textContent;
            
            const harga = namaBlok.includes("BLOK 18") ? parseInt(dataDriver.HARGA_18) : parseInt(dataDriver.HARGA_8_1);
            
            listBanyaknya.push(`${qty} KALI @${harga.toLocaleString('id-ID')}`);
            totalNominal += (qty * harga);
            totalPalet += (qty * isiPalet);
        }
    });

    // Update UI Teks
    document.getElementById('ongkir-banyaknya').value = listBanyaknya.length > 0 ? "SEBANYAK " + listBanyaknya.join(' & ') : "";
    document.getElementById('ongkir-nominal').value = totalNominal > 0 ? totalNominal.toLocaleString('id-ID') : "";
    document.getElementById('ongkir-palet').value = totalPalet > 0 ? totalPalet : "";

    // Update Terbilang
    const inputTerbilang = document.getElementById('ongkir-terbilang');
    // Update Terbilang (Mengambil dari data master_nominal Firebase)
    if (window.dataMasterNominal) {
        const inputTerbilang = document.getElementById('ongkir-terbilang');
        
        // 1. Bersihkan totalNominal menjadi angka murni
        const nominalTarget = parseInt(totalNominal);
        
        // 2. Debugging: Lihat apa isi window.dataMasterNominal di console
        console.log("Data Master yang dibaca:", window.dataMasterNominal);
        
        let hasilTerbilang = "";
        const masterObj = window.dataMasterNominal;

        // 3. Gunakan Object.values agar kita tidak pusing dengan key NOM_1, NOM_10, dst
        // Kita langsung ambil isi datanya saja
        const listData = Object.values(masterObj);
        
        const ditemukan = listData.find(item => {
            // Bersihkan string nominal dari semua karakter non-angka
            const nominalItem = parseInt(item.NOMINAL.toString().replace(/\D/g, ''));
            return nominalItem === totalNominal;
        });

        if (ditemukan) {
            // Mengambil teks dan menghapus tanda kurung
            // .replace(/[()]/g, '') artinya hapus semua karakter ( atau )
            // .trim() digunakan untuk membersihkan spasi berlebih di awal/akhir
            hasilTerbilang = ditemukan.TERBILANG.replace(/[()]/g, '').trim();
        }

        // 4. Update UI
        inputTerbilang.value = hasilTerbilang;
        console.log("Mencari nominal:", nominalTarget, "Hasil bersih:", hasilTerbilang);
    } else {
        inputTerbilang.value = "";
    }
}

// Fungsi untuk menyimpan transaksi ke Firebase
async function simpanTransaksi() {
    const driverVal = document.getElementById('ongkir-driver').value;
    const tanggalVal = document.getElementById('ongkir-tanggal').value;
    const tujuanVal = document.getElementById('ongkir-tujuan').value.toLowerCase(); // Diubah ke lowercase agar mudah dicek

    // 1. Logika penentuan keterangan & kategori otomatis
    let ketOtomatis = "";
    let kategoriTotal = ""; // Field baru untuk rekap di spreadsheet

    if (tujuanVal.includes("ambil") && tujuanVal.includes("langsir")) {
        ketOtomatis = "BIAYA AMBIL & LANGSIR BARANG JADI MARIMAS";
        kategoriTotal = "TOTAL AMBIL & LANGSIR";
    } else if (tujuanVal.includes("ambil")) {
        ketOtomatis = "BIAYA AMBIL BARANG JADI MARIMAS";
        kategoriTotal = "TOTAL AMBIL";
    } else if (tujuanVal.includes("langsir")) {
        ketOtomatis = "BIAYA LANGSIR BARANG JADI MARIMAS";
        kategoriTotal = "TOTAL LANGSIR";
    }

    const customID = `${tanggalVal}_${driverVal}`.replace(/[\.\s]/g, '_');

    const data = {
        id: customID, // TAMBAHKAN BARIS INI: Agar Apps Script tahu ID-nya
        tanggal: tanggalVal,
        driver: driverVal,
        plat: document.getElementById('ongkir-plat').value,
        tujuan: document.getElementById('ongkir-tujuan').value,
        banyaknya: document.getElementById('ongkir-banyaknya').value,
        nominal: document.getElementById('ongkir-nominal').value,
        terbilang: document.getElementById('ongkir-terbilang').value,
        palet: document.getElementById('ongkir-palet').value,
        keterangan_cetak: ketOtomatis,
        kategori_total: kategoriTotal,
        timestamp: Date.now()
    };

    if (!driverVal || !data.nominal) {
        miuiAlert("Silakan pilih driver dan lengkapi data!");
        return;
    }

    try {
        // 1. Simpan ke Firebase
        const transaksiRef = ref(db, `transaksi_ongkir/${customID}`);
        await set(transaksiRef, data);
        
        miuiAlert("Data berhasil disimpan");

        resetForm();
        loadDataTransaksi();

        // 2. Kirim ke Spreadsheet via Web App
        const response = await fetch("https://script.google.com/macros/s/AKfycbwJmCtDsQyv7APYeoi0met9bG4oKG6No9lLtEX9VF45LT876fxe_1Bi0FoyKhNBkVWysA/exec", {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        // Beritahu user bahwa cetak bisa dilakukan
        // Karena kita tidak bisa memanggil fungsi server secara langsung, 
        // kita beri link ke spreadsheet atau beri notifikasi
        console.log("Data dikirim ke Spreadsheet");
        
    } catch (e) {
        console.error("Error simpan:", e);
        miuiAlert("Gagal menyimpan data.");
    }
}

function resetForm() {
    // Reset input teks
    document.querySelectorAll('textarea, input[type="text"]').forEach(el => el.value = "");
    
    // Reset driver & plat
    document.getElementById('ongkir-driver').selectedIndex = 0;
    document.getElementById('ongkir-plat').selectedIndex = 0;

    // 3. Reset SEMUA select di dalam container-ambil dan container-langsir
    const containers = ['container-ambil', 'container-langsir'];
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            const selects = container.querySelectorAll('select');
            selects.forEach(select => {
                select.selectedIndex = 0; // Kembalikan ke opsi 0
                select.disabled = true;   // Kunci kembali
            });
        }
    });
    
    // Reset slider & qty (gunakan fungsi yang sudah ada)
    toggleSliderControls(false);
    
    // Reset nominal/palet agar hilang dari layar
    updateDetailTransaksi();
}

export async function loadDataTransaksi() {
    const tbody = document.getElementById('table-ongkir-data');
    const filterValue = document.getElementById('filter-bulan-ongkir').value;
    const infoTotal = document.getElementById('info-total-ongkir'); // Menangkap elemen info
    if (!tbody) return;

    try {
        const snapshot = await get(child(ref(db), 'transaksi_ongkir'));
        tbody.innerHTML = ""; 

        if (snapshot.exists()) {
            const data = snapshot.val();
            const bulanNama = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

            let dataArray = Object.keys(data).map(key => ({
                key: key,
                ...data[key]
            }));

            dataArray.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

            let adaData = false; 
            let totalNominal = 0; // Variabel baru
            let totalPalet = 0;   // Variabel baru
            
            dataArray.forEach(item => {
                const key = item.key;
                
                const itemBulan = item.tanggal.substring(0, 7); 
                
                if (filterValue && itemBulan !== filterValue) return;

                adaData = true; 
                
                // Kalkulasi total
                totalNominal += parseInt(item.nominal.replace(/\./g, '')) || 0;
                totalPalet += parseInt(item.palet) || 0;
                
                const d = new Date(item.tanggal);
                const tglFormatted = `${d.getDate().toString().padStart(2, '0')} ${bulanNama[d.getMonth()]} ${d.getFullYear()}`;

                const tr = document.createElement('tr');
                tr.className = "border-b hover:bg-slate-50";
                
                tr.innerHTML = `
                    <td class="p-3 text-[11px] font-bold text-orange-800 uppercase">${tglFormatted}</td>
                    <td class="p-3">
                        <div class="font-bold text-emerald-800">${item.driver}</div>
                        <div class="text-slate-800">${item.plat}</div>
                    </td>
                    <td class="p-3">
                        <div class="font-semibold text-emerald-800 break-words">${item.tujuan}</div>
                        <div class="text-[11px] text-slate-800">${item.banyaknya}</div>
                    </td>
                    <td class="p-3">
                        <div class="font-semibold text-emerald-800">Rp ${item.nominal}</div>
                        <div class="text-[11px] text-slate-800">Palet: ${item.palet}</div>
                    </td>
                    <td class="py-2 px-2">
                        <div class="flex justify-center items-center gap-3">
                            <button onclick="editTransaksiOngkir('${key}')" class="text-blue-600 hover:text-blue-800 transition-all active:scale-90" title="Edit">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            <button onclick="hapusTransaksiOngkir('${key}')" class="text-red-600 hover:text-red-800 transition-all active:scale-90" title="Hapus">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                            <button onclick="cetakPresisi('${key}')" class="text-orange-500 hover:text-orange-700 transition-all active:scale-90" title="Cetak">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Update informasi total di header
            if (infoTotal) {
                infoTotal.textContent = adaData ? `Total Pengeluaran: Rp ${totalNominal.toLocaleString('id-ID')} | ${totalPalet} Palet` : "Total Pengeluaran: Belum ada data";
            }

            if (!adaData) {
                const select = document.getElementById('filter-bulan-ongkir');
                const bulanTerpilih = select.options[select.selectedIndex].text;

                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="p-6 text-center text-slate-500 italic">
                            Tidak ada data di bulan <strong>${bulanTerpilih}</strong>
                        </td>
                    </tr>`;
            }
        } else {
            if (infoTotal) infoTotal.textContent = "Total Pengeluaran: Belum ada data";
            tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-500 italic">Belum ada data transaksi</td></tr>`;
        }
    } catch (e) {
        console.error("Gagal memuat data:", e);
    }
}

// Tambahkan ke window agar bisa dipanggil dari atribut onclick HTML
window.editTransaksiOngkir = async (key) => {
    try {
        // Isi dropdown tanggal terlebih dahulu
        isiDropdownTanggalEdit();
        const snapshot = await get(child(ref(db), `transaksi_ongkir/${key}`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Debugging: Cek di console apakah data.banyaknya ada
            console.log("Data dari Firebase:", data);

            document.getElementById('edit-id-transaksi-ongkir').value = key;
            document.getElementById('edit-tanggal-select').value = data.tanggal;
            document.getElementById('edit-driver').value = data.driver;
            document.getElementById('edit-plat').value = data.plat;
            document.getElementById('edit-tujuan').value = data.tujuan;
            document.getElementById('edit-nominal').value = data.nominal;
            document.getElementById('edit-palet').value = data.palet;
            
            // PASTIKAN ID DI HTML SAMA PERSIS DENGAN DI SINI
            // Jika ID input di HTML Anda adalah "edit-banyaknya", gunakan itu
            document.getElementById('edit-banyaknya').value = data.banyaknya || "";
            document.getElementById('edit-terbilang').value = data.terbilang || "";
            
            document.getElementById('modal-edit-ongkir').classList.remove('hidden');
        }
    } catch (e) {
        console.error("Gagal memuat data:", e);
    }
};

window.tutupModalEditOngkir = () => {
    document.getElementById('modal-edit-ongkir').classList.add('hidden');
};

window.simpanEditTransaksiOngkir = async () => {
    const key = document.getElementById('edit-id-transaksi-ongkir').value;
    const updatedData = {
        tanggal: document.getElementById('edit-tanggal-select').value,
        driver: document.getElementById('edit-driver').value,
        plat: document.getElementById('edit-plat').value,
        tujuan: document.getElementById('edit-tujuan').value,
        nominal: document.getElementById('edit-nominal').value,
        palet: document.getElementById('edit-palet').value,
        // Tambahkan field baru di sini
        banyaknya: document.getElementById('edit-banyaknya').value,
        terbilang: document.getElementById('edit-terbilang').value,
        timestamp: Date.now()
    };

    try {
        await set(ref(db, `transaksi_ongkir/${key}`), updatedData);
        miuiAlert("Data berhasil diperbarui!");
        tutupModalEditOngkir();
        loadDataTransaksi(); 
    } catch (e) {
        miuiAlert("Gagal memperbarui data!");
    }
};

window.hapusTransaksiOngkir = async (key) => {
    // 1. Pastikan key bersih
    const targetKey = key.trim();
    const FIREBASE_URL = "https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/";

    // 2. Gunakan miuiConfirm sebagai pembungkus
    miuiConfirm("Yakin ingin menghapus data dengan ID: " + targetKey + "?", async function() {
        try {
            // 3. Gunakan fetch dengan method DELETE (REST API)
            // Ini adalah cara paling "telanjang" dan pasti berhasil
            const response = await fetch(`${FIREBASE_URL}transaksi_ongkir/${targetKey}.json`, {
                method: 'DELETE'
            });

            if (response.ok) {
                miuiAlert("Data berhasil dihapus");
                
                // 4. Refresh data
                if (typeof loadDataTransaksi === 'function') {
                    loadDataTransaksi();
                }
            } else {
                throw new Error("Server merespons dengan status: " + response.status);
            }
        } catch (e) {
            console.error("Error saat menghapus:", e);
            miuiAlert("Gagal menghapus: " + e.message);
        }
    });
};

window.cetakPerData = async (idFirebase) => {
    // 1. Ambil data dari Firebase
    const res = await fetch(`https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/transaksi_ongkir/${idFirebase}.json`);
    const data = await res.json();
    
    if (!data) return miuiAlert("Data tidak ditemukan!");

    // 2. Kirim ke Web App Google Script untuk diisi ke template
    const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwJmCtDsQyv7APYeoi0met9bG4oKG6No9lLtEX9VF45LT876fxe_1Bi0FoyKhNBkVWysA/exec";
    
    miuiAlert("Sedang menyiapkan template cetak...");

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(data)
        });

        // 3. Setelah data dikirim, buka spreadsheet agar bisa dicetak user
        const spreadsheetURL = "https://docs.google.com/spreadsheets/d/1XDPOkhoES72Y3_gYoUZJdbzMSzk4HzeACkRwzJzWlAE/edit#gid=635878249";
        window.open(spreadsheetURL, "_blank");
        
    } catch (err) {
        miuiAlert("Gagal mengirim data ke cetakan: " + err.message);
    }
};

window.cetakPresisi = async (idFirebase) => {
    const res = await fetch(`https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/transaksi_ongkir/${idFirebase}.json`);
    const data = await res.json();
    if (!data) return;

    const formatTgl = (tgl) => {
        const d = new Date(tgl);
        const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
    };

    // Kita masukkan CSS langsung di sini agar terbawa saat dikirim ke Firebase/PDF
    const styleCss = `
    <style>
        @page { size: 210mm 330mm portrait; margin: 0mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Trebuchet MS', sans-serif; font-size: 11pt; color: #000; margin: 0; padding: 0; }
        
        .sisi-kertas { 
            width: 190mm; 
            height: 140mm; 
            border: 1px solid #000; 
            padding: 10mm; /* Padding dalam kertas */
            margin-top: 15mm; /* MENURUNKAN posisi kertas agar tidak mepet atas */
            margin-left: 10mm;
            position: relative;
        }

        /* Header Kop */
                .header-kop { 
                    text-align: center; /* Memusatkan teks */
                    font-weight: bold; /* Membuat teks menjadi tebal */
                    font-size: 16pt; /* Ukuran font lebih besar untuk judul */
                    position: relative; /* Agar logo bisa menempel di pojok */
                    padding-bottom: 5px; /* Memberikan jarak antara header dan garis bawah */
                }
        /* Memastikan logo muncul dan punya posisi yang pas */
        .logo-kop { 
            width: 80px; /* Lebar logo */
            position: absolute; /* Posisi absolut agar bisa menempel di pojok */
            left: 10mm; /* Jarak dari batas dalam kertas */
            top: -2mm; /* Jarak dari batas dalam kertas */
        }

        .judul-garis { 
                    display: inline-block; /* Membuat judul menjadi inline agar bisa diberi garis bawah */
                    border-bottom: 2px solid #000; /* Garis bawah tebal */
                    padding-bottom: 2px; /* Memberikan jarak antara teks dan garis bawah */
                    margin-bottom: 10px; /* Memberikan jarak antara judul dan konten di bawahnya */
                }
        .status-badge { 
                    position: absolute; /* Posisi absolut agar bisa menempel di pojok */
                    right: 0; /* Menempel di pojok kanan atas */
                    top: 0; /* Menempel di pojok kanan atas */
                    font-size: 16pt; /* Ukuran font lebih besar agar terlihat jelas */
                    font-weight: 900; /* Segoe UI Black memiliki weight sangat tebal (900) */
                    font-family: 'Segoe UI Black', 'Segoe UI', sans-serif; /* Menggunakan font tersebut dengan fallback */
                    color: #e1e1e1; /* Warna abu-abu terang agar terlihat seperti watermark */
                }
        
        /* Tabel Presisi */
                table { width: 100%; border-collapse: collapse; margin-top: 5px; } /* Menghapus jarak antar sel */
                td { padding: 4px 5px; vertical-align: top; } /* Memberikan jarak vertikal agar teks tidak menempel */
                .label { width: 45mm; } /* Lebar label tetap agar rapi */

        /* Kelas untuk membuat garis bawah yang panjang penuh */
                .garis-bawah {
                    border-bottom: 1px solid #000; /* Garis bawah tipis */
                }

        /* Footer fix: Paksa ke bawah menggunakan absolute positioning */
        /* Atur agar paragraf tidak memiliki jarak bawah yang berlebihan */
                .footer-sign p {
                    margin: 0;  /* Menghapus margin default */
                    padding: 0; /* Menghapus margin default */
                    margin-bottom: 10mm; /* <--- Ini akan menurunkan posisi teks tanggal */
                }
        
        /* Footer & Tanda Tangan */
                .footer-sign { margin-top: auto; padding-top: 50px; } /* Memberikan jarak dari konten di atas ke footer */
                .sign-table {
                    width: 100%; /* Memastikan tabel tanda tangan mengambil lebar penuh */
                    border-collapse: collapse; /* Menghapus jarak antar sel */
                    table-layout: fixed; /* Memaksa setiap kolom memiliki lebar yang sama */
                    margin-top: 10mm; /* Memberikan jarak dari konten di atas ke tabel tanda tangan */
                }
                
                .sign-table td {
                    text-align: center; /* Memusatkan teks di dalam sel */
                    vertical-align: top; /* Memastikan teks berada di atas sel */
                    width: 25%; /* Membagi meja menjadi 4 bagian sama besar */
                    padding: 0 2px; /* Memberikan sedikit padding horizontal */
                }

                .nama-bawah {
                    border-bottom: 1px solid #000; /* Garis bawah untuk tanda tangan */
                    display: inline-block; /* Membuat garis bawah hanya sepanjang teks */
                    min-width: 80px; /* Memberikan lebar minimum agar terlihat konsisten */
                    padding-bottom: 2px; /* Memberikan jarak antara teks dan garis bawah */
                }
                .garis-lipat { 
                    border-top: 0.5px dashed #000; /* Garis putus-putus tipis untuk lipatan */
                    margin: 60px 0; /* Memberikan jarak vertikal agar terlihat jelas */
                }
    </style>`;

    const bodyHtml = `
        ${['ASLI', 'COPY'].map(type => `
            <div class="sisi-kertas">
                <div class="header-kop">
                    <img src="data:image/png;base64,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" class="logo-kop">
                    <div class="judul-garis">TANDA TERIMA</div>
                    <div class="status-badge">${type}</div>
                </div>
                <table>
                    <tr><td class="label">TELAH TERIMA DARI</td><td colspan="2" class="garis-bawah">: <strong>PT. Ulam Tiba Halim</strong></td></tr>
                    <tr><td class="label">KEPADA</td><td colspan="2" class="garis-bawah">: ${data.driver || '-'} <span style="margin-left: 10px;">| ${data.plat || ''}</span></td></tr>
                    <tr><td class="label">JUMLAH</td><td colspan="2" class="garis-bawah">: Rp ${(data.nominal || 0).toLocaleString()} <span style="margin-left: 10px;">| ( ${data.terbilang || '-'} )</span></td></tr>
                    <tr><td class="label">KETERANGAN</td><td colspan="2" class="garis-bawah">: ${data.keterangan_cetak || '-'}</td></tr>
                    <tr><td></td><td colspan="2" style="padding-left: 13px;" class="garis-bawah">${data.tujuan || ''}</td></tr>
                    <tr><td></td><td colspan="2" style="padding-left: 13px;" class="garis-bawah">${data.banyaknya || ''}</td></tr>
                    <tr><td></td><td colspan="2" style="padding-left: 13px;" class="garis-bawah">${data.kategori_total || ''} ${data.palet || '0'} PALET</td></tr>
                </table>
                <div class="footer-sign">
                    <p>Semarang, ${formatTgl(data.tanggal)}</p>
                    <table class="sign-table">
                        <tr><td>Yang Menyerahkan</td><td>Mengetahui</td><td>Menyetujui</td><td>Penerima</td></tr>
                        <tr><td style="height: 18mm;"></td><td></td><td></td><td></td></tr>
                        <tr>
                            <td><span class="nama-bawah">FARIN A.</span></td>
                            <td><span class="nama-bawah">ANTONIUS H.</span></td>
                            <td><span class="nama-bawah">DIMAS W.J</span></td>
                            <td><span class="nama-bawah">${data.driver || '-'}</span></td>
                        </tr>
                    </table>
                </div>
            </div>
            ${type === 'ASLI' ? '<div class="garis-lipat"></div>' : ''}
        `).join('')}`;

    // Gabungkan CSS dan HTML menjadi satu kesatuan
    const finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            ${styleCss}
        </head>
        <body>
            ${bodyHtml}
        </body>
        </html>
    `;

    // 1. Logika Cetak Lokal
    localStorage.setItem('printData', JSON.stringify({ html: finalHtml }));
    //window.open('cetak.html', '_blank', 'width=800,height=600');

    // 2. Kirim ke Firebase untuk Print Server
    try {
        await fetch('https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app/print_jobs.json', {
            method: 'POST',
            body: JSON.stringify({ html: finalHtml, timestamp: Date.now() }),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error("Gagal mengirim ke server:", error);
    }
};