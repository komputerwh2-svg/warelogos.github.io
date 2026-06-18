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

    // Fungsi helper format tanggal
    const formatTgl = (tgl) => {
        const d = new Date(tgl);
        const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
    };

    const contentHtml = `
        ${['ASLI', 'COPY'].map(type => `
            <div class="sisi-kertas">
                <div class="header-kop">
                    <img src="uth logo TR.png" class="logo-kop">
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
                        <tr>
                            <td>Yang Menyerahkan</td>
                            <td>Mengetahui</td>
                            <td>Menyetujui</td>
                            <td>Penerima</td>
                        </tr>
                        <tr>
                            <td style="height: 18mm;"></td>
                            <td></td>
                            <td></td>
                            <td></td>
                        </tr>
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
        `).join('')}
    `;

    // Kirim ke engine cetak
    localStorage.setItem('printData', JSON.stringify({ html: contentHtml, css: '' }));
    window.open('cetak.html', '_blank', 'width=800,height=600');
};