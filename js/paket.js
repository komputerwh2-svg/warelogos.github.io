// =========================================================
// MODUL SUB-PAGE: PAKET PAJANG (js/paket.js)
// =========================================================

let daftarItemPaketSementara = [];
let streamKameraPaket = null;
let timerWatermarkPaket = null;
let dataUrlFotoWatermarkAktif = null;
let cacheFotoWatermarkHariIni = [];

const ISI_KRT_PER_PAKET = {
    'PR-PKT40': 6,
    'PR-PKT59': 3,
    'PR-PKT82': 6
};

// =========================================================
// 1. HELPER TANGGAL, FORMAT, KONVERSI & NOTIFIKASI MIUI ALERT
// =========================================================
function notifPaket(pesan) {
    if (typeof window.miuiAlert === 'function') {
        return window.miuiAlert(pesan);
    }
    alert(pesan);
}

function getTanggalHariIniISO() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getTanggalUnderscore() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}_${m}_${d}`;
}

function sanitizeKeyRTDB(teks) {
    return String(teks || 'TANPA_TUJUAN')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'TANPA_TUJUAN';
}

function escapeHTMLPaket(str) {
    return String(str || '')
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"');
}

function getPembagiKrtPaket(jenisPaket) {
    const kode = String(jenisPaket || '').trim().toUpperCase();
    if (Object.prototype.hasOwnProperty.call(ISI_KRT_PER_PAKET, kode)) {
        return ISI_KRT_PER_PAKET[kode];
    }
    if (kode.includes('59')) return 3;
    if (kode.includes('40') || kode.includes('82')) return 6;
    return 1;
}

// Helper Format Rincian Konversi
function formatRincianKonversiPaket(jenisPaket, qty) {
    const jenis = String(jenisPaket || '').trim().toUpperCase();
    const totalQty = Number(qty) || 0;
    if (!jenis || totalQty <= 0) return '';

    const kapasitasKrt = (jenis === 'PR-PKT59') ? 3 : 6;
    const krt = Math.floor(totalQty / kapasitasKrt);
    const sisaPkt = totalQty % kapasitasKrt;

    const bagian = [];
    if (krt > 0) bagian.push(`${krt} KRT`);
    if (sisaPkt > 0) bagian.push(`${sisaPkt} PKT`);

    const infoKonversi = bagian.length ? ` ( ${bagian.join(' + ')} )` : '';
    return `${jenis} = ${totalQty} PKT${infoKonversi}`;
}

function formatRincianPaketWatermark(jenisPaket, qtyPkt) {
    const kode = String(jenisPaket || '').trim().toUpperCase();
    const qty = Math.max(0, parseInt(qtyPkt, 10) || 0);
    const pembagi = getPembagiKrtPaket(kode);
    const krt = Math.floor(qty / pembagi);
    const sisaPkt = qty % pembagi;

    const bagian = [];
    if (krt > 0) bagian.push(`${krt} KRT`);
    if (sisaPkt > 0) bagian.push(`${sisaPkt} PKT`);

    const rincian = bagian.length ? ` ( ${bagian.join(' + ')} )` : '';
    return `${kode} = ${qty} PKT${rincian}`;
}

// =========================================================
// 2. MUAT DROPDOWN TUJUAN DARI RTDB master_tujuan (INISIAL)
// =========================================================
async function muatMasterTujuanInisial() {
    const datalistEl = document.getElementById('list-tujuan-paket');
    if (!datalistEl) return;

    const CACHE_KEY = 'cache_master_tujuan_inisial_v1';
    const setInisial = new Set();

    // Tampilkan cache lokal terlebih dahulu agar langsung muncul
    try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
        if (Array.isArray(cached)) {
            cached.forEach((item) => {
                if (item) setInisial.add(String(item).trim().toUpperCase());
            });
            renderDatalistTujuanPaket(datalistEl, setInisial);
        }
    } catch (_) {}

    // Ambil dari Firebase Realtime Database -> master_tujuan -> INISIAL
    try {
        if (typeof firebase !== 'undefined' && firebase.apps?.length && typeof firebase.database === 'function') {
            const snap = await firebase.database().ref('master_tujuan').once('value');
            const val = snap.val();

            if (val && typeof val === 'object') {
                setInisial.clear();
                Object.values(val).forEach((item) => {
                    if (item && typeof item === 'object' && item.INISIAL) {
                        const inisial = String(item.INISIAL).trim().toUpperCase();
                        if (inisial) setInisial.add(inisial);
                    }
                });

                const sorted = renderDatalistTujuanPaket(datalistEl, setInisial);
                localStorage.setItem(CACHE_KEY, JSON.stringify(sorted));
            }
        }
    } catch (err) {
        console.warn('Gagal mengambil master_tujuan dari RTDB:', err);
    }
}

function renderDatalistTujuanPaket(datalistEl, setInisial) {
    const sorted = Array.from(setInisial).sort((a, b) => a.localeCompare(b, 'id'));
    datalistEl.innerHTML = sorted
        .map((inisial) => `<option value="${escapeHTMLPaket(inisial)}"></option>`)
        .join('');
    return sorted;
}

// =========================================================
// 3. MULTI-ITEM PAKET & SIMPAN KE RTDB data_paket
// =========================================================
function renderDaftarItemPaketSementara() {
    const container = document.getElementById('container-item-paket');
    if (!container) return;

    if (!daftarItemPaketSementara.length) {
        container.innerHTML = `
            <div class="text-slate-400 italic text-[11px] text-center py-1.5">
                Belum ada item ditambahkan (bisa klik Tambah Item atau langsung Simpan Data jika 1 item)
            </div>`;
        return;
    }

    container.innerHTML = daftarItemPaketSementara.map((item, idx) => {
        const kode = String(item.jenis_paket || '').trim().toUpperCase();
        const qty = Math.max(0, parseInt(item.qty, 10) || 0);
        const pembagi = getPembagiKrtPaket(kode);
        const krt = Math.floor(qty / pembagi);
        const sisaPkt = qty % pembagi;

        const bagian = [];
        if (krt > 0) bagian.push(`${krt} KRT`);
        if (sisaPkt > 0) bagian.push(`${sisaPkt} PKT`);
        const teksKonversi = bagian.length ? `(${bagian.join(' + ')})` : '';

        return `
        <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-orange-50 border border-orange-200">
            <div class="min-w-0">
                <span class="font-black text-orange-700 text-[11px]">${escapeHTMLPaket(kode)}</span>
                <span class="text-slate-700 font-bold text-[11px] ml-1.5">= ${qty} PKT</span>
                ${teksKonversi ? `<span class="text-slate-500 font-semibold text-[10px] ml-1">${teksKonversi}</span>` : ''}
            </div>
            <button type="button" onclick="hapusItemPaketSementara(${idx})"
                class="w-6 h-6 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center shrink-0 transition"
                title="Hapus item">
                <i class="fa-solid fa-xmark text-xs"></i>
            </button>
        </div>`;
    }).join('');
}

function tambahItemPaketKeList() {
    const jenisEl = document.getElementById('paket-jenis');
    const qtyEl = document.getElementById('paket-qty');

    const jenisPaket = (jenisEl?.value || '').trim().toUpperCase();
    const qty = parseInt(qtyEl?.value || '0', 10);

    if (!jenisPaket) {
        return notifPaket('Pilih jenis paket terlebih dahulu.');
    }
    if (!Number.isFinite(qty) || qty <= 0) {
        notifPaket('Masukkan QTY (PKT) lebih dari 0.');
        qtyEl?.focus();
        return;
    }

    const existingIdx = daftarItemPaketSementara.findIndex((it) => it.jenis_paket === jenisPaket);
    if (existingIdx >= 0) {
        daftarItemPaketSementara[existingIdx].qty += qty;
    } else {
        daftarItemPaketSementara.push({
            jenis_paket: jenisPaket,
            qty: qty
        });
    }

    if (qtyEl) qtyEl.value = '';
    qtyEl?.focus();
    renderDaftarItemPaketSementara();
    notifPaket(`${jenisPaket} (${qty} PKT) ditambahkan ke daftar.`);
}

function hapusItemPaketSementara(index) {
    daftarItemPaketSementara.splice(index, 1);
    renderDaftarItemPaketSementara();
}

async function simpanDataPaketPajang() {
    const noDoEl = document.getElementById('paket-no-do');
    const tujuanEl = document.getElementById('paket-tujuan');
    const jenisEl = document.getElementById('paket-jenis');
    const qtyEl = document.getElementById('paket-qty');
    const btnSimpan = document.getElementById('btn-simpan-paket');

    const noDo = (noDoEl?.value || '').trim().toUpperCase();
    const tujuan = (tujuanEl?.value || '').trim().toUpperCase();

    if (!tujuan) {
        notifPaket('Tujuan wajib diisi atau dipilih.');
        tujuanEl?.focus();
        return;
    }

    const itemsFinal = daftarItemPaketSementara.map((it) => ({ ...it }));
    const jenisAktif = (jenisEl?.value || '').trim().toUpperCase();
    const qtyAktif = parseInt(qtyEl?.value || '0', 10);

    if (jenisAktif && Number.isFinite(qtyAktif) && qtyAktif > 0) {
        const idx = itemsFinal.findIndex((it) => it.jenis_paket === jenisAktif);
        if (idx >= 0) {
            itemsFinal[idx].qty += qtyAktif;
        } else {
            itemsFinal.push({ jenis_paket: jenisAktif, qty: qtyAktif });
        }
    }

    if (!itemsFinal.length) {
        notifPaket('Isi QTY paket atau klik Tambah Item terlebih dahulu.');
        qtyEl?.focus();
        return;
    }

    const timestamp = Date.now();
    const tglUnderscore = getTanggalUnderscore();
    const tglISO = getTanggalHariIniISO();
    const tujuanKey = sanitizeKeyRTDB(tujuan);
    const recordId = `${tglUnderscore}_${tujuanKey}_${timestamp}`;

    const totalQty = itemsFinal.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);

    const payload = {
        id: recordId,
        tanggal: tglISO,
        no_do: noDo,
        tujuan: tujuan,
        items: itemsFinal.map((it) => ({
            jenis_paket: it.jenis_paket,
            qty: Number(it.qty) || 0,
            rincian: formatRincianPaketWatermark(it.jenis_paket, it.qty)
        })),
        total_qty: totalQty,
        timestamp: timestamp,
        status_cetak: 'BELUM_DICETAK'
    };

    try {
        if (btnSimpan) btnSimpan.disabled = true;

        if (typeof firebase !== 'undefined' && firebase.apps?.length && typeof firebase.database === 'function') {
            await firebase.database().ref(`data_paket/${recordId}`).set(payload);
        } else {
            throw new Error('Firebase Realtime Database belum terinisialisasi.');
        }

        daftarItemPaketSementara = [];
        renderDaftarItemPaketSementara();
        if (noDoEl) noDoEl.value = '';
        if (tujuanEl) tujuanEl.value = '';
        if (qtyEl) qtyEl.value = '';
        noDoEl?.focus();

        notifPaket(`Data tujuan ${tujuan} berhasil disimpan.`);
        await muatRiwayatPaketHariIni();
    } catch (err) {
        console.error('Gagal menyimpan ke RTDB data_paket:', err);
        notifPaket(`Gagal menyimpan data ke Realtime Database: ${err.message}`);
    } finally {
        if (btnSimpan) btnSimpan.disabled = false;
    }
}

// =========================================================
// 4. PANEL RIWAYAT & TOMBOL CETAK PER BARIS / PER TANGGAL
// =========================================================
function togglePanelRiwayatPaket(paksaState) {
    const panel = document.getElementById('panel-riwayat-paket');
    const grid = document.getElementById('paket-main-grid');
    const formKolom = document.getElementById('paket-form-kolom');
    if (!panel) return;

    const akanBuka = typeof paksaState === 'boolean'
        ? paksaState
        : panel.classList.contains('hidden');

    if (akanBuka) {
        panel.classList.remove('hidden');
        panel.classList.add('lg:block', 'lg:col-span-6');

        if (grid) {
            grid.classList.remove('max-w-3xl');
            grid.classList.add('max-w-6xl');
        }
        if (formKolom) {
            formKolom.classList.remove('lg:col-span-12');
            formKolom.classList.add('lg:col-span-6');
        }
        muatRiwayatPaketHariIni();
    } else {
        panel.classList.add('hidden');
        panel.classList.remove('lg:block', 'lg:col-span-6');

        if (grid) {
            grid.classList.remove('max-w-6xl');
            grid.classList.add('max-w-3xl');
        }
        if (formKolom) {
            formKolom.classList.remove('lg:col-span-6');
            formKolom.classList.add('lg:col-span-12');
        }
    }
}

let modeRiwayatPaketAktif = 'hari'; // 'hari' | 'semua' | 'tanggal'
let tanggalFilterRiwayatPaket = '';

function updateTampilanTombolModeRiwayat() {
    const btnHari = document.getElementById('btn-filter-riwayat-hari');
    const btnSemua = document.getElementById('btn-filter-riwayat-semua');
    if (!btnHari || !btnSemua) return;

    if (modeRiwayatPaketAktif === 'semua') {
        btnSemua.className = 'px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-orange-600 text-white transition';
        btnHari.className = 'px-2.5 py-1 rounded-md text-[10px] font-black uppercase text-slate-600 hover:text-orange-600 transition';
    } else {
        btnHari.className = 'px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-orange-600 text-white transition';
        btnSemua.className = 'px-2.5 py-1 rounded-md text-[10px] font-black uppercase text-slate-600 hover:text-orange-600 transition';
    }
}

async function setModeRiwayatPaket(mode) {
    modeRiwayatPaketAktif = mode === 'semua' ? 'semua' : 'hari';
    if (modeRiwayatPaketAktif === 'hari') {
        tanggalFilterRiwayatPaket = '';
        const inpTgl = document.getElementById('filter-tanggal-riwayat-paket');
        if (inpTgl) inpTgl.value = '';
    }
    updateTampilanTombolModeRiwayat();
    await muatRiwayatPaketHariIni();
}

async function handleGantiTanggalRiwayatPaket(val) {
    tanggalFilterRiwayatPaket = (val || '').trim();
    modeRiwayatPaketAktif = tanggalFilterRiwayatPaket ? 'tanggal' : 'hari';
    updateTampilanTombolModeRiwayat();
    await muatRiwayatPaketHariIni();
}

function ekstrakTanggalDariKeyAtauData(key, data) {
    const matchKey = String(key || '').match(/^(\d{4})_(\d{2})_(\d{2})_/);
    if (matchKey) {
        return {
            iso: `${matchKey[1]}-${matchKey[2]}-${matchKey[3]}`,
            underscore: `${matchKey[1]}_${matchKey[2]}_${matchKey[3]}`
        };
    }
    if (data && data.timestamp) {
        const dt = new Date(Number(data.timestamp));
        if (!Number.isNaN(dt.getTime())) {
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const d = String(dt.getDate()).padStart(2, '0');
            return {
                iso: `${y}-${m}-${d}`,
                underscore: `${y}_${m}_${d}`
            };
        }
    }
    return { iso: '', underscore: '' };
}

function formatLabelTanggalBajuPaket(tglISO) {
    if (!tglISO) return 'TANPA TANGGAL';
    const parts = String(tglISO).split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return tglISO;
}

function sinkronkanDropdownWatermarkPaket(semuaRecords) {
    const selectWm = document.getElementById('paket-wm-select-data');
    if (!selectWm) return;

    const prevSelected = selectWm.value;
    window.__opsiWatermarkPaketMap = {};

    if (!Array.isArray(semuaRecords) || !semuaRecords.length) {
        selectWm.innerHTML = `<option value="">-- Belum ada data tersimpan --</option>`;
        return;
    }

    selectWm.innerHTML = semuaRecords.map((rec) => {
        window.__opsiWatermarkPaketMap[rec.id] = rec;
        const tglLabel = rec._tglISO ? `[${formatLabelTanggalBajuPaket(rec._tglISO)}] ` : '';
        const doLabel = rec.no_do ? ` (DO: ${rec.no_do})` : '';
        return `<option value="${escapeHTMLPaket(rec.id)}">${escapeHTMLPaket(tglLabel + (rec.tujuan || '-') + doLabel)}</option>`;
    }).join('');

    const masihAda = semuaRecords.some((r) => r.id === prevSelected);
    selectWm.value = masihAda ? prevSelected : semuaRecords[0].id;

    if (typeof handlePilihDataWatermarkPaket === 'function') {
        handlePilihDataWatermarkPaket(selectWm.value);
    }
}

function renderKartuItemRiwayatPaket(rec) {
    const items = Array.isArray(rec.items) ? rec.items : [];
    const jamStr = rec.timestamp
        ? new Date(rec.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : '';

    const badgeItemsHtml = items.map((it) => `
        <span class="inline-flex items-center px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200 text-[10px] font-black">
            ${escapeHTMLPaket(it.jenis_paket)}: ${Number(it.qty) || 0} PKT
        </span>
    `).join(' ');

    return `
        <div class="p-3 rounded-xl bg-slate-50 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div class="min-w-0 space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-black text-slate-800 uppercase">${escapeHTMLPaket(rec.tujuan)}</span>
                    ${rec.no_do ? `<span class="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px] font-bold">DO: ${escapeHTMLPaket(rec.no_do)}</span>` : ''}
                    ${jamStr ? `<span class="text-[10px] font-mono text-slate-400">${escapeHTMLPaket(jamStr)}</span>` : ''}
                </div>
                <div class="flex flex-wrap gap-1">
                    ${badgeItemsHtml}
                </div>
            </div>

            <div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <button type="button" onclick="pakaiDataKeKameraPaket('${escapeHTMLPaket(rec.id)}')"
                    class="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black uppercase shadow-sm transition flex items-center gap-1"
                    title="Gunakan data ini untuk watermark kamera">
                    <i class="fa-solid fa-camera"></i>
                    <span>Foto</span>
                </button>

                <button type="button" onclick="cetakLabelPerTujuanPaket('${escapeHTMLPaket(rec.id)}')"
                    class="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black uppercase shadow-sm transition flex items-center gap-1"
                    title="Cetak label sisa PKT untuk tujuan ini">
                    <i class="fa-solid fa-print"></i>
                    <span>Cetak</span>
                </button>

                <button type="button" onclick="hapusRiwayatPaket('${escapeHTMLPaket(rec.id)}')"
                    class="w-7 h-7 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center transition"
                    title="Hapus data">
                    <i class="fa-solid fa-trash-can text-[11px]"></i>
                </button>
            </div>
        </div>
    `;
}

function renderRiwayatDikelompokkanPerTanggal(listEl, records) {
    if (!listEl) return;

    const mapKelompok = new Map();
    records.forEach((rec) => {
        const keyTgl = rec._tglISO || 'tanpa-tanggal';
        if (!mapKelompok.has(keyTgl)) {
            mapKelompok.set(keyTgl, []);
        }
        mapKelompok.get(keyTgl).push(rec);
    });

    const tanggalTerurut = Array.from(mapKelompok.keys()).sort((a, b) => b.localeCompare(a));

    listEl.innerHTML = tanggalTerurut.map((tglKey) => {
        const groupRecs = mapKelompok.get(tglKey) || [];
        const labelBaju = formatLabelTanggalBajuPaket(tglKey === 'tanpa-tanggal' ? '' : tglKey);
        const totalQtyKelompok = groupRecs.reduce((s, r) => s + (Number(r.total_qty) || 0), 0);
        const cardsHtml = groupRecs.map((rec) => renderKartuItemRiwayatPaket(rec)).join('');

        return `
            <section class="rounded-xl border border-orange-200 bg-orange-50/35 p-2.5 space-y-2">
                <div class="flex items-center justify-between gap-2 pb-1.5 border-b border-orange-200/80">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-800 text-white text-[10px] font-black tracking-wider uppercase shadow-sm">
                            <i class="fa-solid fa-calendar-day text-orange-400"></i>
                            <span>${escapeHTMLPaket(labelBaju)}</span>
                        </span>
                        <span class="text-[10px] font-bold text-slate-500">
                            ${groupRecs.length} tujuan • ${totalQtyKelompok} PKT
                        </span>
                    </div>

                    <button type="button" onclick="cetakLabelPerTanggalPaket('${escapeHTMLPaket(tglKey)}')"
                        class="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black uppercase shadow-sm transition flex items-center gap-1 shrink-0"
                        title="Cetak semua label sisa PKT pada tanggal ${escapeHTMLPaket(labelBaju)}">
                        <i class="fa-solid fa-print"></i>
                        <span>Cetak Semua</span>
                    </button>
                </div>

                <div class="space-y-2">
                    ${cardsHtml}
                </div>
            </section>
        `;
    }).join('');
}

async function muatRiwayatPaketHariIni() {
    const listEl = document.getElementById('paket-riwayat-list');
    const ringkasanEl = document.getElementById('paket-ringkasan');
    const badgeEl = document.getElementById('badge-jumlah-riwayat-paket');

    const tglISO = getTanggalHariIniISO();
    const prefixHariIni = `${getTanggalUnderscore()}_`;
    const targetISO = modeRiwayatPaketAktif === 'tanggal' ? tanggalFilterRiwayatPaket : tglISO;

    const semuaRecords = [];

    try {
        if (typeof firebase !== 'undefined' && firebase.apps?.length && typeof firebase.database === 'function') {
            const snap = await firebase.database().ref('data_paket').once('value');
            const val = snap.val();
            if (val && typeof val === 'object') {
                Object.entries(val).forEach(([key, data]) => {
                    if (data && typeof data === 'object') {
                        const infoTgl = ekstrakTanggalDariKeyAtauData(key, data);
                        semuaRecords.push({
                            id: key,
                            _tglISO: infoTgl.iso,
                            ...data
                        });
                    }
                });
            }
        }

        semuaRecords.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
        window.__semuaRiwayatPaketCache = semuaRecords;
        sinkronkanDropdownWatermarkPaket(semuaRecords);

        const jumlahHariIni = semuaRecords.filter(
            (r) => r._tglISO === tglISO || String(r.id || '').startsWith(prefixHariIni)
        ).length;

        let recordsTampil = semuaRecords;
        if (modeRiwayatPaketAktif === 'hari' || modeRiwayatPaketAktif === 'tanggal') {
            recordsTampil = semuaRecords.filter((r) => r._tglISO === targetISO);
        }

        window.__riwayatPaketHariIniCache = recordsTampil;

        const totalQtyTampil = recordsTampil.reduce((sum, r) => sum + (Number(r.total_qty) || 0), 0);
        if (badgeEl) badgeEl.textContent = jumlahHariIni;
        if (ringkasanEl) {
            const labelPeriode = modeRiwayatPaketAktif === 'semua'
                ? 'Semua Tanggal'
                : `Tanggal ${targetISO}`;
            ringkasanEl.textContent = `${labelPeriode} • Total tujuan: ${recordsTampil.length} | Total QTY: ${totalQtyTampil} PKT`;
        }

        if (!listEl) return;

        if (!recordsTampil.length) {
            const pesanKosong = modeRiwayatPaketAktif === 'semua'
                ? 'Belum ada data tersimpan di riwayat.'
                : `Belum ada data tersimpan pada tanggal ${targetISO}.`;
            listEl.innerHTML = `
                <div class="text-center py-8 text-xs font-bold text-slate-400 bg-slate-50 rounded-xl border border-dashed border-orange-200">
                    ${escapeHTMLPaket(pesanKosong)}
                </div>`;
            return;
        }

        renderRiwayatDikelompokkanPerTanggal(listEl, recordsTampil);
    } catch (err) {
        console.error('Gagal memuat riwayat data_paket:', err);
        if (listEl) {
            listEl.innerHTML = `
                <div class="text-center py-6 text-xs font-bold text-rose-500">
                    Gagal memuat riwayat dari Realtime Database.
                </div>`;
        }
    }
}

async function cetakLabelPerTanggalPaket(tglKey) {
    let semuaRecords = Array.isArray(window.__semuaRiwayatPaketCache)
        ? window.__semuaRiwayatPaketCache
        : null;

    if (!semuaRecords) {
        await muatRiwayatPaketHariIni();
        semuaRecords = window.__semuaRiwayatPaketCache || [];
    }

    const recordsTanggal = semuaRecords.filter((rec) => (rec._tglISO || 'tanpa-tanggal') === tglKey);
    const daftarLabel = pecahRecordKeDaftarLabel(recordsTanggal);
    const labelTgl = formatLabelTanggalBajuPaket(tglKey === 'tanpa-tanggal' ? '' : tglKey);

    if (!daftarLabel.length) {
        return notifPaket(`Tidak ada sisa (+ PKT) untuk dicetak pada tanggal ${labelTgl}.`);
    }

    const kodeTugas = `SISA_PKT_${labelTgl.replace(/\//g, '-')}`;
    await kirimTugasCetakKePrintJobs(daftarLabel, kodeTugas);
}

function getInfoBeceranItemPaket(jenisPaket, qtyPkt) {
    const kode = String(jenisPaket || '').trim().toUpperCase();
    const qty = Math.max(0, parseInt(qtyPkt, 10) || 0);
    const pembagi = (typeof getPembagiKrtPaket === 'function')
        ? getPembagiKrtPaket(kode)
        : (kode === 'PR-PKT59' ? 3 : 6);

    const krt = Math.floor(qty / pembagi);
    const sisaPkt = qty % pembagi;

    return {
        jenis_paket: kode,
        qty_awal: qty,
        pembagi: pembagi,
        krt: krt,
        sisa_pkt: sisaPkt
    };
}

async function hapusRiwayatPaket(recordId) {
    if (!recordId) return;
    if (!confirm('Hapus data Paket Pajang ini dari riwayat?')) return;

    try {
        if (typeof firebase !== 'undefined' && firebase.apps?.length && typeof firebase.database === 'function') {
            await firebase.database().ref(`data_paket/${recordId}`).remove();
        }
        notifPaket('Data berhasil dihapus.');
        await muatRiwayatPaketHariIni();
    } catch (err) {
        console.error('Gagal menghapus data_paket:', err);
        notifPaket('Gagal menghapus data.');
    }
}

// =========================================================
// 5. KAMERA WATERMARK ALA TIMEMARK + DROPDOWN DATA TERSIMPAN
// =========================================================
function getInfoWaktuWatermarkSekarang() {
    const now = new Date();
    const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const hari = namaHari[now.getDay()];
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    return {
        jam: `${hh}:${min}`,
        hari: hari,
        tanggal: `${dd}/${mm}/${yyyy}`,
        hariTanggal: `${hari}, ${dd}/${mm}/${yyyy}`
    };
}

function formatInfoWatermarkDariRecord(rec) {
    if (!rec) return '';
    const lines = [];
    const tujuan = (rec.tujuan || '').trim();
    const noDo = (rec.no_do || '').trim();

    if (tujuan || noDo) {
        lines.push(`▪ ${tujuan || 'TUJUAN'}${noDo ? ` [ DO:${noDo} ]` : ''}`);
    }

    const items = Array.isArray(rec.items) ? rec.items : [];
    items.forEach((it) => {
        lines.push(formatRincianPaketWatermark(it.jenis_paket, it.qty));
    });

    return lines.join('\n');
}

function susunOpsiDraftFormJikaAda() {
    const noDo = (document.getElementById('paket-no-do')?.value || '').trim().toUpperCase();
    const tujuan = (document.getElementById('paket-tujuan')?.value || '').trim().toUpperCase();
    const jenisAktif = (document.getElementById('paket-jenis')?.value || '').trim().toUpperCase();
    const qtyAktif = parseInt(document.getElementById('paket-qty')?.value || '0', 10);

    const gabungan = daftarItemPaketSementara.map((it) => ({ ...it }));
    if (jenisAktif && Number.isFinite(qtyAktif) && qtyAktif > 0) {
        const idx = gabungan.findIndex((it) => it.jenis_paket === jenisAktif);
        if (idx >= 0) gabungan[idx].qty += qtyAktif;
        else gabungan.push({ jenis_paket: jenisAktif, qty: qtyAktif });
    }

    if (!tujuan && !noDo && !gabungan.length) return null;

    return {
        id: '__DRAFT_FORM__',
        tujuan: tujuan || 'INPUT AKTIF',
        no_do: noDo,
        items: gabungan
    };
}

let tanggalFilterWatermarkPaket = ''; // '' = tampilkan semua tanggal, 'YYYY-MM-DD' = filter tanggal tertentu

async function ambilSemuaRecordPaketUntukKamera() {
    if (Array.isArray(window.__semuaRiwayatPaketCache) && window.__semuaRiwayatPaketCache.length) {
        return window.__semuaRiwayatPaketCache;
    }

    const hasil = [];
    if (typeof firebase !== 'undefined' && firebase.apps?.length && typeof firebase.database === 'function') {
        const snap = await firebase.database().ref('data_paket').once('value');
        const val = snap.val();
        if (val && typeof val === 'object') {
            Object.entries(val).forEach(([key, data]) => {
                if (data && typeof data === 'object') {
                    const infoTgl = ekstrakTanggalDariKeyAtauData(key, data);
                    hasil.push({
                        id: key,
                        _tglISO: infoTgl.iso,
                        ...data
                    });
                }
            });
        }
    }

    hasil.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
    window.__semuaRiwayatPaketCache = hasil;
    return hasil;
}

async function handleGantiTanggalWatermarkPaket(tglVal) {
    tanggalFilterWatermarkPaket = (tglVal || '').trim();
    await isiDropdownDataWatermarkPaket();
}

async function resetTanggalWatermarkSemua() {
    tanggalFilterWatermarkPaket = '';
    const inpTgl = document.getElementById('paket-wm-tanggal');
    if (inpTgl) inpTgl.value = '';
    await isiDropdownDataWatermarkPaket();
}

async function isiDropdownDataWatermarkPaket(pilihIdOtomatis = '') {
    const selectEl = document.getElementById('paket-wm-select-data');
    const inpTgl = document.getElementById('paket-wm-tanggal');
    if (!selectEl) return;

    let semuaRecords = [];
    try {
        semuaRecords = await ambilSemuaRecordPaketUntukKamera();
    } catch (err) {
        console.warn('Gagal memuat data paket untuk kamera:', err);
        semuaRecords = Array.isArray(window.__semuaRiwayatPaketCache) ? window.__semuaRiwayatPaketCache : [];
    }

    // Jika dipanggil dengan recordId spesifik (misal klik tombol FOTO pada baris riwayat), arahkan tanggalnya ke record tersebut bila ada
    if (pilihIdOtomatis && pilihIdOtomatis !== '__DRAFT_FORM__') {
        const recDipilih = semuaRecords.find((r) => r.id === pilihIdOtomatis);
        if (recDipilih && recDipilih._tglISO) {
            tanggalFilterWatermarkPaket = recDipilih._tglISO;
        }
    }

    if (inpTgl && inpTgl.value !== tanggalFilterWatermarkPaket) {
        inpTgl.value = tanggalFilterWatermarkPaket;
    }

    const recordsTersaring = tanggalFilterWatermarkPaket
        ? semuaRecords.filter((rec) => rec._tglISO === tanggalFilterWatermarkPaket)
        : semuaRecords;

    const draft = susunOpsiDraftFormJikaAda();
    const opsiList = [];

    if (draft && !tanggalFilterWatermarkPaket) {
        opsiList.push({
            value: '__DRAFT_FORM__',
            label: `[Draft Form] ${draft.tujuan}${draft.no_do ? ` (DO:${draft.no_do})` : ''}`,
            record: draft
        });
    }

    recordsTersaring.forEach((rec) => {
        const totalQty = Number(rec.total_qty) || 0;
        const tglPrefix = !tanggalFilterWatermarkPaket && rec._tglISO
            ? `[${formatLabelTanggalBajuPaket(rec._tglISO)}] `
            : '';
        opsiList.push({
            value: rec.id,
            label: `${tglPrefix}${rec.tujuan || 'TUJUAN'}${rec.no_do ? ` • DO:${rec.no_do}` : ''} (${totalQty} PKT)`,
            record: rec
        });
    });

    window.__opsiWatermarkPaketMap = {};
    opsiList.forEach((opt) => {
        window.__opsiWatermarkPaketMap[opt.value] = opt.record;
    });

    if (!opsiList.length) {
        const ketKosong = tanggalFilterWatermarkPaket
            ? `-- Tidak ada data pada tanggal ${formatLabelTanggalBajuPaket(tanggalFilterWatermarkPaket)} --`
            : '-- Belum ada data tersimpan --';
        selectEl.innerHTML = `<option value="">${escapeHTMLPaket(ketKosong)}</option>`;
        updatePreviewWatermarkPaket();
        return;
    }

    selectEl.innerHTML = opsiList
        .map((opt) => `<option value="${escapeHTMLPaket(opt.value)}">${escapeHTMLPaket(opt.label)}</option>`)
        .join('');

    const targetVal = pilihIdOtomatis && window.__opsiWatermarkPaketMap[pilihIdOtomatis]
        ? pilihIdOtomatis
        : opsiList[0].value;

    selectEl.value = targetVal;
    updatePreviewWatermarkPaket();
}

function handlePilihDataWatermarkPaket() {
    updatePreviewWatermarkPaket();
}

function togglePanelEditCatatanWatermark(paksaState) {
    const panel = document.getElementById('panel-edit-watermark-paket');
    if (!panel) return;

    const akanBuka = typeof paksaState === 'boolean'
        ? paksaState
        : panel.classList.contains('hidden');

    if (akanBuka) {
        panel.classList.remove('hidden');
    } else {
        panel.classList.add('hidden');
    }
}

function updateBadgeRiwayatFotoPaket() {
    const thumbEl = document.getElementById('wm-thumb-riwayat');
    const iconKosongEl = document.getElementById('wm-icon-riwayat-kosong');
    const badgeEl = document.getElementById('wm-badge-count-foto');

    const jumlah = cacheFotoWatermarkHariIni.length;
    if (badgeEl) badgeEl.textContent = jumlah;

    if (jumlah > 0 && cacheFotoWatermarkHariIni[0]?.dataUrl) {
        if (thumbEl) {
            thumbEl.src = cacheFotoWatermarkHariIni[0].dataUrl;
            thumbEl.classList.remove('hidden');
        }
        if (iconKosongEl) iconKosongEl.classList.add('hidden');
    } else {
        if (thumbEl) {
            thumbEl.src = '';
            thumbEl.classList.add('hidden');
        }
        if (iconKosongEl) iconKosongEl.classList.remove('hidden');
    }
}

function bukaRiwayatFotoWatermarkPaket() {
    const modal = document.getElementById('modal-riwayat-foto-paket');
    const wadah = document.getElementById('daftar-riwayat-foto-paket');
    if (!modal || !wadah) return;

    modal.classList.remove('hidden');

    if (!cacheFotoWatermarkHariIni.length) {
        wadah.innerHTML = `
            <div class="col-span-full text-center py-8 text-xs font-bold text-slate-400">
                Belum ada foto watermark yang diambil.
            </div>`;
        return;
    }

    wadah.innerHTML = cacheFotoWatermarkHariIni.map((item, idx) => `
        <div class="rounded-xl border border-orange-200 bg-slate-50 overflow-hidden flex flex-col shadow-xs">
            <img src="${item.dataUrl}" alt="Foto ${idx + 1}" class="w-full h-28 object-cover bg-slate-900">
            <div class="p-2 space-y-1.5 flex-1 flex flex-col justify-between">
                <div class="text-[10px] font-mono font-bold text-slate-500 truncate">${escapeHTMLPaket(item.waktu || '')}</div>
                <div class="text-[10px] font-bold text-slate-700 line-clamp-2 leading-tight">${escapeHTMLPaket(item.caption || 'Paket Pajang')}</div>
                <button type="button" onclick="unduhUlangFotoCache(${idx})"
                    class="w-full py-1 px-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black uppercase transition">
                    Simpan / Share
                </button>
            </div>
        </div>
    `).join('');
}

function tutupRiwayatFotoWatermarkPaket() {
    const modal = document.getElementById('modal-riwayat-foto-paket');
    if (modal) modal.classList.add('hidden');
}

async function unduhUlangFotoCache(index) {
    const item = cacheFotoWatermarkHariIni[index];
    if (!item?.dataUrl) return;
    dataUrlFotoWatermarkAktif = item.dataUrl;
    await simpanHasilFotoWatermarkPaket();
}

function pakaiDataKeKameraPaket(recordId) {
    bukaKameraWatermarkPaket(recordId || '');
}

async function bukaKameraWatermarkPaket(pilihIdOtomatis = '') {
    const modal = document.getElementById('modal-kamera-paket');
    if (!modal) return;

    modal.classList.remove('hidden');
    togglePanelEditCatatanWatermark(false);
    tutupRiwayatFotoWatermarkPaket();
    updateBadgeRiwayatFotoPaket();
    resetModeKameraPaket();

    await isiDropdownDataWatermarkPaket(pilihIdOtomatis);

    clearInterval(timerWatermarkPaket);
    timerWatermarkPaket = setInterval(updatePreviewWatermarkPaket, 1000);

    await mulaiStreamKameraPaket();
}

function tutupKameraWatermarkPaket() {
    const modal = document.getElementById('modal-kamera-paket');
    if (modal) modal.classList.add('hidden');

    togglePanelEditCatatanWatermark(false);
    tutupRiwayatFotoWatermarkPaket();
    clearInterval(timerWatermarkPaket);
    hentikanStreamKameraPaket();
}

async function mulaiStreamKameraPaket() {
    const videoEl = document.getElementById('paket-camera-video');
    if (!videoEl) return;

    hentikanStreamKameraPaket();

    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Browser tidak mendukung akses kamera langsung.');
        }

        streamKameraPaket = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false
        });

        videoEl.srcObject = streamKameraPaket;
        videoEl.classList.remove('hidden');
    } catch (err) {
        console.warn('Kamera langsung tidak tersedia, gunakan tombol Foto Lokal:', err);
        notifPaket('Kamera tidak tersedia, gunakan tombol Foto Lokal.');
    }
}

function hentikanStreamKameraPaket() {
    if (streamKameraPaket) {
        streamKameraPaket.getTracks().forEach((track) => track.stop());
        streamKameraPaket = null;
    }
}

function updatePreviewWatermarkPaket() {
    const { jam, hari, tanggal } = getInfoWaktuWatermarkSekarang();
    const jamEl = document.getElementById('wm-jam-preview');
    const hariEl = document.getElementById('wm-hari-preview');
    const tglEl = document.getElementById('wm-tanggal-preview');
    const infoEl = document.getElementById('wm-info-preview');
    const selectEl = document.getElementById('paket-wm-select-data');

    if (jamEl) jamEl.textContent = jam;
    if (hariEl) hariEl.textContent = hari;
    if (tglEl) tglEl.textContent = tanggal;

    const selectedId = selectEl?.value || '';
    const rec = window.__opsiWatermarkPaketMap?.[selectedId] || null;
    if (infoEl) {
        infoEl.textContent = rec ? formatInfoWatermarkDariRecord(rec) : '';
    }
}

function buatImageIconWarehouse() {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        let sudahFallback = false;

        img.onload = () => resolve(img);
        img.onerror = () => {
            if (!sudahFallback) {
                sudahFallback = true;
                img.src = 'https://komputerwh2-svg.github.io/warelogos.github.io/icon.png';
            } else {
                resolve(null);
            }
        };

        img.src = './icon.png';
    });
}

function buatImageLogoMariFood() {
    return new Promise((resolve) => {
        const svgMarkup = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" width="480" height="400">
                <rect width="120" height="100" rx="10" fill="#ececec"/>
                <path d="M 42 36 A 18 18 0 0 1 78 36 Z" fill="#f58220"/>
                <path d="M 37 36 A 23 23 0 0 1 83 36" fill="none" stroke="#ffd200" stroke-width="3.5" stroke-linecap="round"/>
                <path d="M 28 42 C 46 28, 76 26, 96 37 C 78 35, 56 38, 38 48 Z" fill="#a3e635"/>
                <path d="M 30 43 C 52 32, 78 34, 95 40 C 76 50, 50 51, 32 45 Z" fill="#009444"/>
                <text x="60" y="74" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-weight="800" font-size="23" letter-spacing="-0.5">
                    <tspan fill="#009444">Mari</tspan><tspan fill="#f58220">food</tspan>
                </text>
            </svg>
        `.trim();

        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMarkup);
    });
}

async function gambarWatermarkKeCanvas(sumberMedia, lebarAsli, tinggiAsli) {
    const canvas = document.getElementById('paket-watermark-canvas');
    const videoEl = document.getElementById('paket-camera-video');
    const overlayEl = document.getElementById('paket-watermark-overlay');
    const topRightEl = document.getElementById('wm-top-right-preview');
    const rightVertEl = document.getElementById('wm-right-vertical-preview');
    const gridEl = document.getElementById('paket-camera-grid');
    const selectEl = document.getElementById('paket-wm-select-data');

    if (!canvas) return;

    // Gunakan resolusi asli media tanpa dikompresi/diperkecil
    const w = Math.max(1, Math.round(lebarAsli || 900));
    const h = Math.max(1, Math.round(tinggiAsli || 1200));

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (sumberMedia === videoEl && typeof levelZoomKameraAktif === 'number' && Math.abs(levelZoomKameraAktif - 1.0) > 0.01) {
        const effectiveZoom = Math.max(0.6, Math.min(2.5, levelZoomKameraAktif));
        const cropW = w / effectiveZoom;
        const cropH = h / effectiveZoom;
        const sx = Math.max(0, (w - cropW) / 2);
        const sy = Math.max(0, (h - cropH) / 2);
        ctx.drawImage(sumberMedia, sx, sy, cropW, cropH, 0, 0, w, h);
    } else {
        ctx.drawImage(sumberMedia, 0, 0, w, h);
    }

    const [logoImg, iconWhImg] = await Promise.all([
        buatImageLogoMariFood(),
        buatImageIconWarehouse()
    ]);

    const { jam, hari, tanggal, hariTanggal } = getInfoWaktuWatermarkSekarang();
    const selectedId = selectEl?.value || '';
    const rec = window.__opsiWatermarkPaketMap?.[selectedId] || null;
    const teksInfo = rec ? formatInfoWatermarkDariRecord(rec) : '';
    const barisInfo = teksInfo ? teksInfo.split('\n') : [];

    const scale = Math.max(0.75, w / 900);

    const pad = Math.round(16 * scale);
    const margin = Math.round(16 * scale);

    const logoH = Math.round(52 * scale);
    const logoW = Math.round(logoH * 1.2);
    const judulGap = Math.round(12 * scale);

    const fontJudul = `900 ${Math.round(21 * scale)}px Arial, sans-serif`;
    const fontSubjudul = `800 ${Math.round(21 * scale)}px Arial, sans-serif`;
    const fontChevron = `900 ${Math.round(10 * scale)}px monospace`;
    const fontJam = `900 ${Math.round(46 * scale)}px monospace`;
    const fontTgl = `700 ${Math.round(16 * scale)}px Arial, sans-serif`;
    const fontDetail = `700 ${Math.round(17 * scale)}px Arial, sans-serif`;

    const maxBoxW = Math.round(w * 0.56);

    ctx.font = fontDetail;
    let maxDetailWidth = 0;
    barisInfo.forEach((line) => {
        const mw = ctx.measureText(line).width;
        if (mw > maxDetailWidth) maxDetailWidth = mw;
    });

    const boxWidth = Math.min(maxBoxW, Math.max(maxDetailWidth + pad * 2, Math.round(360 * scale)));

    const topBlockH = Math.max(logoH, Math.round(52 * scale));
    const dividerBlockH = Math.round(22 * scale);
    const timeBlockH = Math.round(52 * scale);
    const lineH = Math.round(25 * scale);
    const detailBlockH = barisInfo.length ? (Math.round(8 * scale) + barisInfo.length * lineH) : 0;
    const boxHeight = pad * 2 + topBlockH + dividerBlockH + timeBlockH + detailBlockH;

    const boxX = margin;
    const boxY = h - margin - boxHeight;

    ctx.fillStyle = 'rgba(34, 38, 46, 0.72)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, Math.round(10 * scale));
    ctx.fill();

    const innerX = boxX + pad;
    let curY = boxY + pad;

    if (logoImg) {
        ctx.drawImage(logoImg, innerX, curY, logoW, logoH);
    }

    const titleX = innerX + logoW + judulGap;
    ctx.font = fontJudul;
    ctx.fillStyle = '#a3e635';
    ctx.fillText('Dokumentasi', titleX, curY + Math.round(20 * scale));

    ctx.font = fontSubjudul;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Paket Pajang', titleX, curY + Math.round(45 * scale));

    curY += topBlockH + Math.round(8 * scale);
    ctx.strokeStyle = '#a3e635';
    ctx.lineWidth = Math.max(2.5, Math.round(3 * scale));
    ctx.beginPath();
    ctx.moveTo(innerX, curY);
    ctx.lineTo(boxX + boxWidth - pad, curY);
    ctx.stroke();

    ctx.font = fontChevron;
    ctx.fillStyle = 'rgba(163, 230, 53, 0.92)';
    const chevronStr = '>'.repeat(Math.max(16, Math.floor((boxWidth - pad * 2) / (6.5 * scale))));
    ctx.fillText(chevronStr, innerX, curY + Math.round(10 * scale), boxWidth - pad * 2);

    curY += Math.round(50 * scale);
    ctx.font = fontJam;
    ctx.fillStyle = '#a3e635';
    ctx.fillText(jam, innerX, curY);

    const jamW = ctx.measureText(jam).width;
    const dateX = innerX + jamW + Math.round(12 * scale);
    ctx.font = fontTgl;
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(hari, dateX, curY - Math.round(22 * scale));
    ctx.fillText(tanggal, dateX, curY - Math.round(2 * scale));

    if (barisInfo.length) {
        curY += Math.round(10 * scale);
        ctx.font = fontDetail;
        ctx.fillStyle = '#ffffff';
        barisInfo.forEach((line) => {
            curY += lineH;
            ctx.fillText(line, innerX, curY, boxWidth - pad * 2);
        });
    }

    // Pojok kanan atas: [icon.png] Warehouse Logistik tanpa kompresi
    const namaWh = 'Warehouse Logistik';
    const whFont = `900 ${Math.round(18 * scale)}px Arial, sans-serif`;
    const whIconSize = Math.round(22 * scale);
    const whGap = Math.round(7 * scale);

    ctx.save();
    ctx.font = whFont;
    const whTextW = ctx.measureText(namaWh).width;
    const whTotalW = whIconSize + whGap + whTextW;
    const whX = w - margin - whTotalW;
    const whY = margin + Math.round(4 * scale);

    if (iconWhImg) {
        ctx.drawImage(iconWhImg, whX, whY, whIconSize, whIconSize);
    }

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = Math.round(4 * scale);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.round(1 * scale);
    ctx.textBaseline = 'middle';
    ctx.fillText(namaWh, whX + whIconSize + whGap, whY + whIconSize / 2);
    ctx.restore();

    // Teks vertikal di sisi kanan: Dokumentasi Terverifikasi
    const teksVertikal = 'Dokumentasi Terverifikasi';
    const vFontSize = Math.round(12 * scale);
    ctx.save();
    ctx.font = `700 ${vFontSize}px Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = Math.round(3 * scale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const vx = w - Math.round(12 * scale);
    const vy = Math.round(h * 0.52);
    ctx.translate(vx, vy);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(teksVertikal, 0, 0);
    ctx.restore();

    // Kualitas JPG 1.0 (tanpa kompresi lossy tambahan)
    dataUrlFotoWatermarkAktif = canvas.toDataURL('image/jpeg', 1.0);

    cacheFotoWatermarkHariIni.unshift({
        dataUrl: dataUrlFotoWatermarkAktif,
        caption: teksInfo,
        waktu: `${jam} ${hariTanggal}`
    });
    if (cacheFotoWatermarkHariIni.length > 8) {
        cacheFotoWatermarkHariIni.pop();
    }
    updateBadgeRiwayatFotoPaket();

    if (videoEl) videoEl.classList.add('hidden');
    if (overlayEl) overlayEl.classList.add('hidden');
    if (topRightEl) topRightEl.classList.add('hidden');
    if (rightVertEl) rightVertEl.classList.add('hidden');
    if (gridEl) gridEl.classList.add('hidden');
    canvas.classList.remove('hidden');

    document.getElementById('btn-jepret-watermark')?.classList.add('hidden');
    document.getElementById('btn-ulang-kamera-paket')?.classList.remove('hidden');

    const btnSimpanFoto = document.getElementById('btn-simpan-foto-watermark');
    if (btnSimpanFoto) {
        btnSimpanFoto.classList.remove('hidden');
        btnSimpanFoto.disabled = false;
    }
}

function jepretFotoWatermarkPaket() {
    const videoEl = document.getElementById('paket-camera-video');
    if (!videoEl || !videoEl.videoWidth) {
        return notifPaket('Kamera belum siap. Gunakan tombol Foto Lokal jika kamera tidak aktif.');
    }
    gambarWatermarkKeCanvas(videoEl, videoEl.videoWidth, videoEl.videoHeight);
}

function handleFotoFileWatermarkPaket(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            gambarWatermarkKeCanvas(img, img.naturalWidth, img.naturalHeight);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function resetModeKameraPaket() {
    dataUrlFotoWatermarkAktif = null;

    const videoEl = document.getElementById('paket-camera-video');
    const canvas = document.getElementById('paket-watermark-canvas');
    const overlayEl = document.getElementById('paket-watermark-overlay');
    const gridEl = document.getElementById('paket-camera-grid');

    if (canvas) canvas.classList.add('hidden');
    if (videoEl) videoEl.classList.remove('hidden');
    if (overlayEl) overlayEl.classList.remove('hidden');
    if (gridEl) gridEl.classList.remove('hidden');

    document.getElementById('btn-jepret-watermark')?.classList.remove('hidden');
    document.getElementById('btn-ulang-kamera-paket')?.classList.add('hidden');

    const btnSimpanFoto = document.getElementById('btn-simpan-foto-watermark');
    if (btnSimpanFoto) {
        btnSimpanFoto.classList.add('hidden');
        btnSimpanFoto.disabled = true;
    }
}

async function simpanHasilFotoWatermarkPaket() {
    if (!dataUrlFotoWatermarkAktif) {
        return notifPaket('Ambil foto terlebih dahulu.');
    }

    const namaFile = `PAKET_PAJANG_${getTanggalUnderscore()}_${Date.now()}.jpg`;
    const selectEl = document.getElementById('paket-wm-select-data');
    const rec = window.__opsiWatermarkPaketMap?.[selectEl?.value || ''] || null;
    const caption = rec ? formatInfoWatermarkDariRecord(rec) : '';

    const link = document.createElement('a');
    link.href = dataUrlFotoWatermarkAktif;
    link.download = namaFile;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notifPaket('Foto watermark tersimpan ke perangkat.');

    try {
        if (navigator.canShare && navigator.share) {
            const res = await fetch(dataUrlFotoWatermarkAktif);
            const blob = await res.blob();
            const file = new File([blob], namaFile, { type: 'image/jpeg' });

            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Dokumentasi Paket Pajang',
                    text: caption,
                    files: [file]
                });
            }
        }
    } catch (err) {
        if (err?.name !== 'AbortError') {
            console.warn('Share langsung dilewati:', err);
        }
    }
}

// =========================================================
// 6. INISIALISASI MODUL PAKET PAJANG
// =========================================================
window.initPaketPajang = function () {
    const tglEl = document.getElementById('label-tanggal-hari-ini');
    if (tglEl) tglEl.textContent = getTanggalHariIniISO();

    renderDaftarItemPaketSementara();
    muatMasterTujuanInisial();
    muatRiwayatPaketHariIni();

    const qtyInput = document.getElementById('paket-qty');
    if (qtyInput && !qtyInput.dataset.boundEnter) {
        qtyInput.dataset.boundEnter = '1';
        qtyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                tambahItemPaketKeList();
            }
        });
    }
};

// =========================================================
// 7. CETAK LABEL F4 PORTRAIT & ANTREAN PRINT_JOBS
// =========================================================
const RTDB_BASE_URL_PAKET = 'https://bank-data-cbd97-default-rtdb.asia-southeast1.firebasedatabase.app';

function getSisaPktDariItem(jenisPaket, qty) {
    const jenis = String(jenisPaket || '').trim().toUpperCase();
    const totalQty = Number(qty) || 0;
    if (totalQty <= 0) return 0;

    if (typeof hitungKonversiPaket === 'function') {
        const res = hitungKonversiPaket(jenis, totalQty);
        if (res && typeof res.sisaPkt === 'number') {
            return res.sisaPkt;
        }
    }

    const kapasitasKrt = (jenis === 'PR-PKT59') ? 3 : 6;
    return totalQty % kapasitasKrt;
}

function buatHtmlHalamanLabelPaket(daftarLabel) {
    let pagesHtml = '';
    const itemsPerPage = 4;

    for (let i = 0; i < daftarLabel.length; i += itemsPerPage) {
        const chunk = daftarLabel.slice(i, i + itemsPerPage);

        pagesHtml += `
        <div class="page" style="page-break-after: always; width: 210mm; height: 330mm; padding: 5mm 2mm; box-sizing: border-box; display: grid; grid-template-rows: repeat(4, 1fr); gap: 59px;">`;

        chunk.forEach((lbl) => {
            const tujuanTeks = escapeHTMLPaket((lbl.tujuan || '').toUpperCase());
            const jenisTeks = escapeHTMLPaket((lbl.jenis_paket || '').toUpperCase());
            const sisaAngka = Number(lbl.sisa_pkt) || 0;

            pagesHtml += `
            <div style="border: 2px solid #000; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; height: 70mm; width: 200mm;">
                <div style="font-size: 57pt; font-family: Edo; line-height: 1;">${tujuanTeks}</div>
                <div style="border-top: 2px dashed #000; width: 95%; margin: 12px 0;"></div>
                <div style="font-size: 49pt; font-family: Edo; line-height: 1;">${jenisTeks} . ${sisaAngka} . PAKET</div>
            </div>`;
        });

        pagesHtml += `</div>`;
    }

    return pagesHtml;
}

function pecahRecordKeDaftarLabel(records, filterJenis = '') {
    const hasil = [];
    const targetJenis = (filterJenis || '').trim().toUpperCase();

    (records || []).forEach((rec) => {
        const tujuan = (rec.tujuan || '').trim().toUpperCase();
        const items = Array.isArray(rec.items) ? rec.items : [];

        items.forEach((it) => {
            const jenis = (it.jenis_paket || '').trim().toUpperCase();
            if (targetJenis && jenis !== targetJenis) return;

            const sisaPkt = getSisaPktDariItem(jenis, it.qty);
            if (sisaPkt <= 0) return;

            hasil.push({
                tujuan: tujuan,
                no_do: (rec.no_do || '').trim().toUpperCase(),
                jenis_paket: jenis,
                qty_asal: Number(it.qty) || 0,
                sisa_pkt: sisaPkt
            });
        });
    });

    return hasil;
}

async function kirimTugasCetakKePrintJobs(daftarLabel, kodeLabelTugas) {
    if (!Array.isArray(daftarLabel) || daftarLabel.length === 0) {
        return notifPaket('Tidak ada sisa (+ PKT) untuk dicetak labelnya.');
    }

    if (typeof window.showCetakProgress === 'function') {
        window.showCetakProgress(`Mengirim Dokumen Cetak Label ${kodeLabelTugas}...`);
    }

    const pagesHtml = buatHtmlHalamanLabelPaket(daftarLabel);
    const now = new Date();

    const daftarHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const hari = daftarHari[now.getDay()];

    const tgl = String(now.getDate()).padStart(2, '0');
    const bln = String(now.getMonth() + 1).padStart(2, '0');
    const thn = now.getFullYear();
    const tanggalStr = `${tgl}-${bln}-${thn}`;

    const jam = String(now.getHours()).padStart(2, '0');
    const menit = String(now.getMinutes()).padStart(2, '0');
    const detik = String(now.getSeconds()).padStart(2, '0');
    const waktuStr = `${jam}.${menit}.${detik}`;

    const formatWaktuLengkap = `${hari} / ${tanggalStr} / ${waktuStr}`;
    const judulTugas = `Cetak ${kodeLabelTugas} (${daftarLabel.length} Label)`;

    const safeKode = String(kodeLabelTugas || 'SISA_PKT')
        .replace(/[^A-Za-z0-9_-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

    const safeKeyName = `Cetak_${safeKode}_${daftarLabel.length}_Label_${tgl}-${bln}-${thn}_${jam}-${menit}-${detik}`;

    try {
        const resp = await fetch(`${RTDB_BASE_URL_PAKET}/print_jobs/${encodeURIComponent(safeKeyName)}.json`, {
            method: 'PUT',
            body: JSON.stringify({
                judul: judulTugas,
                waktu_teks: formatWaktuLengkap,
                html: pagesHtml,
                status: 'PENDING',
                timestamp: Date.now()
            }),
            headers: { 'Content-Type': 'application/json' }
        });

        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
        }

        notifPaket(`Proses Mencetak ${daftarLabel.length} Label Sisa PKT (${kodeLabelTugas}).`);
    } catch (e) {
        notifPaket(`Gagal mengirim perintah cetak label: ${e.message}`);
    }
}

async function cetakLabelPerTujuanPaket(recordId) {
    let records = Array.isArray(window.__riwayatPaketHariIniCache)
        ? window.__riwayatPaketHariIniCache
        : [];
    let target = records.find((r) => r.id === recordId);

    if (!target && Array.isArray(window.__semuaRiwayatPaketCache)) {
        target = window.__semuaRiwayatPaketCache.find((r) => r.id === recordId);
    }

    if (!target) {
        await muatRiwayatPaketHariIni();
        const gabungan = [
            ...(window.__riwayatPaketHariIniCache || []),
            ...(window.__semuaRiwayatPaketCache || [])
        ];
        target = gabungan.find((r) => r.id === recordId);
    }

    if (!target) {
        return notifPaket('Data tujuan tidak ditemukan.');
    }

    const daftarLabel = pecahRecordKeDaftarLabel([target]);
    if (!daftarLabel.length) {
        return notifPaket(`Tujuan ${target.tujuan || ''} tidak memiliki sisa (+ PKT) untuk dicetak.`);
    }

    const kodeTugas = `${target.tujuan || 'TUJUAN'}_SISA_PKT`;
    await kirimTugasCetakKePrintJobs(daftarLabel, kodeTugas);

    try {
        if (typeof firebase !== 'undefined' && firebase.apps?.length && typeof firebase.database === 'function') {
            await firebase.database().ref(`data_paket/${target.id}`).update({
                status_cetak: 'TERKIRIM_CETAK',
                last_print_at: Date.now()
            });
        }
    } catch (err) {
        console.warn('Gagal memperbarui status_cetak di data_paket:', err);
    }
}

async function cetakLabelHariIniPaket(filterJenis = '') {
    if (!Array.isArray(window.__riwayatPaketHariIniCache)) {
        await muatRiwayatPaketHariIni();
    }

    const records = window.__riwayatPaketHariIniCache || [];
    const daftarLabel = pecahRecordKeDaftarLabel(records, filterJenis);

    if (!daftarLabel.length) {
        const infoJenis = filterJenis ? ` ${filterJenis}` : '';
        return notifPaket(`Tidak ada sisa (+ PKT)${infoJenis} untuk dicetak hari ini.`);
    }

    const kodeTugas = filterJenis ? `${filterJenis.toUpperCase()}_SISA_PKT` : 'SISA_PKT_PAJANG';
    await kirimTugasCetakKePrintJobs(daftarLabel, kodeTugas);
}

// =========================================================
// 8. EKSPOR FUNGSI KE GLOBAL WINDOW
// =========================================================
window.tambahItemPaketKeList = tambahItemPaketKeList;
window.hapusItemPaketSementara = hapusItemPaketSementara;
window.simpanDataPaketPajang = simpanDataPaketPajang;
window.togglePanelRiwayatPaket = togglePanelRiwayatPaket;
window.muatRiwayatPaketHariIni = muatRiwayatPaketHariIni;
window.cetakLabelPerTujuanPaket = cetakLabelPerTujuanPaket;
window.hapusRiwayatPaket = hapusRiwayatPaket;
window.pakaiDataKeKameraPaket = pakaiDataKeKameraPaket;
window.handleGantiTanggalWatermarkPaket = handleGantiTanggalWatermarkPaket;
window.resetTanggalWatermarkSemua = resetTanggalWatermarkSemua;
window.isiDropdownDataWatermarkPaket = isiDropdownDataWatermarkPaket;
window.bukaKameraWatermarkPaket = bukaKameraWatermarkPaket;
window.tutupKameraWatermarkPaket = tutupKameraWatermarkPaket;
window.handlePilihDataWatermarkPaket = handlePilihDataWatermarkPaket;
window.togglePanelEditCatatanWatermark = togglePanelEditCatatanWatermark;
window.bukaRiwayatFotoWatermarkPaket = bukaRiwayatFotoWatermarkPaket;
window.tutupRiwayatFotoWatermarkPaket = tutupRiwayatFotoWatermarkPaket;
window.unduhUlangFotoCache = unduhUlangFotoCache;
window.jepretFotoWatermarkPaket = jepretFotoWatermarkPaket;
window.handleFotoFileWatermarkPaket = handleFotoFileWatermarkPaket;
window.resetModeKameraPaket = resetModeKameraPaket;
window.simpanHasilFotoWatermarkPaket = simpanHasilFotoWatermarkPaket;
window.cetakLabelHariIniPaket = cetakLabelHariIniPaket;
window.setModeRiwayatPaket = setModeRiwayatPaket;
window.handleGantiTanggalRiwayatPaket = handleGantiTanggalRiwayatPaket;
window.cetakLabelPerTanggalPaket = cetakLabelPerTanggalPaket;