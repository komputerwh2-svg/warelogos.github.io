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
// 1. HELPER TANGGAL, FORMAT & KONVERSI KRT + PKT
// =========================================================
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

function formatRincianPaketWatermark(jenisPaket, qtyPkt) {
    const kode = String(jenisPaket || '').trim().toUpperCase();
    const qty = Math.max(0, parseInt(qtyPkt, 10) || 0);
    const pembagi = getPembagiKrtPaket(kode);
    const krt = Math.floor(qty / pembagi);
    const sisaPkt = qty % pembagi;
    return `${kode} = ${qty} PKT ( ${krt} KRT + ${sisaPkt} PKT )`;
}

function tampilkanToastPaket(pesan, tipe = 'info') {
    const toast = document.getElementById('paket-toast');
    if (!toast) return;

    toast.textContent = pesan;
    toast.className = 'fixed bottom-5 right-5 z-[80] px-4 py-2.5 rounded-xl border text-xs font-bold shadow-2xl transition-all';

    if (tipe === 'success') {
        toast.classList.add('bg-emerald-950', 'border-emerald-500', 'text-emerald-200');
    } else if (tipe === 'error') {
        toast.classList.add('bg-rose-950', 'border-rose-500', 'text-rose-200');
    } else {
        toast.classList.add('bg-slate-900', 'border-orange-500', 'text-white');
    }

    clearTimeout(window.__paketToastTimer);
    window.__paketToastTimer = setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
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

    container.innerHTML = daftarItemPaketSementara.map((item, idx) => `
        <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-orange-50 border border-orange-200">
            <div class="min-w-0">
                <span class="font-black text-orange-700 text-[11px]">${escapeHTMLPaket(item.jenis_paket)}</span>
                <span class="text-slate-700 font-bold text-[11px] ml-1.5">= ${item.qty} PKT</span>
                <span class="text-slate-500 font-semibold text-[10px] ml-1">(${Math.floor(item.qty / getPembagiKrtPaket(item.jenis_paket))} KRT + ${item.qty % getPembagiKrtPaket(item.jenis_paket)} PKT)</span>
            </div>
            <button type="button" onclick="hapusItemPaketSementara(${idx})"
                class="w-6 h-6 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center shrink-0 transition"
                title="Hapus item">
                <i class="fa-solid fa-xmark text-xs"></i>
            </button>
        </div>
    `).join('');
}

function tambahItemPaketKeList() {
    const jenisEl = document.getElementById('paket-jenis');
    const qtyEl = document.getElementById('paket-qty');

    const jenisPaket = (jenisEl?.value || '').trim().toUpperCase();
    const qty = parseInt(qtyEl?.value || '0', 10);

    if (!jenisPaket) {
        tampilkanToastPaket('Pilih jenis paket terlebih dahulu.', 'error');
        return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
        tampilkanToastPaket('Masukkan QTY (PKT) lebih dari 0.', 'error');
        qtyEl?.focus();
        return;
    }

    // Jika jenis paket yang sama sudah ada di list sementara, akumulasikan QTY-nya
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
    tampilkanToastPaket(`${jenisPaket} (${qty} PKT) ditambahkan ke daftar.`, 'success');
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
        tampilkanToastPaket('Tujuan wajib diisi atau dipilih.', 'error');
        tujuanEl?.focus();
        return;
    }

    // Siapkan daftar item final (gabungan daftar sementara + input aktif bila diisi)
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
        tampilkanToastPaket('Isi QTY paket atau klik Tambah Item terlebih dahulu.', 'error');
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

        // Reset form setelah berhasil simpan
        daftarItemPaketSementara = [];
        renderDaftarItemPaketSementara();
        if (noDoEl) noDoEl.value = '';
        if (tujuanEl) tujuanEl.value = '';
        if (qtyEl) qtyEl.value = '';
        noDoEl?.focus();

        tampilkanToastPaket(`Data tujuan ${tujuan} berhasil disimpan.`, 'success');
        await muatRiwayatPaketHariIni();
    } catch (err) {
        console.error('Gagal menyimpan ke RTDB data_paket:', err);
        tampilkanToastPaket('Gagal menyimpan data ke Realtime Database.', 'error');
    } finally {
        if (btnSimpan) btnSimpan.disabled = false;
    }
}

// =========================================================
// 4. PANEL RIWAYAT & TOMBOL CETAK PER BARIS TUJUAN
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

async function muatRiwayatPaketHariIni() {
    const listEl = document.getElementById('paket-riwayat-list');
    const ringkasanEl = document.getElementById('paket-ringkasan');
    const badgeEl = document.getElementById('badge-jumlah-riwayat-paket');

    const tglISO = getTanggalHariIniISO();
    const prefixHariIni = `${getTanggalUnderscore()}_`;
    const records = [];

    try {
        if (typeof firebase !== 'undefined' && firebase.apps?.length && typeof firebase.database === 'function') {
            const snap = await firebase.database()
                .ref('data_paket')
                .orderByKey()
                .startAt(prefixHariIni)
                .endAt(`${prefixHariIni}\uf8ff`)
                .once('value');

            const val = snap.val();
            if (val && typeof val === 'object') {
                Object.entries(val).forEach(([key, data]) => {
                    if (data && typeof data === 'object') {
                        records.push({ id: key, ...data });
                    }
                });
            }
        }

        // Urutkan terbaru di atas
        records.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
        window.__riwayatPaketHariIniCache = records;

        const totalQtySemua = records.reduce((sum, r) => sum + (Number(r.total_qty) || 0), 0);
        if (badgeEl) badgeEl.textContent = records.length;
        if (ringkasanEl) {
            ringkasanEl.textContent = `Total tujuan: ${records.length} | Total QTY: ${totalQtySemua} PKT`;
        }

        if (!listEl) return;

        if (!records.length) {
            listEl.innerHTML = `
                <div class="text-center py-8 text-xs font-bold text-slate-400 bg-slate-50 rounded-xl border border-dashed border-orange-200">
                    Belum ada data tersimpan pada tanggal ${tglISO}.
                </div>`;
            return;
        }

        listEl.innerHTML = records.map((rec) => {
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
                            ${jamStr ? `<span class="text-[10px] font-mono text-slate-400">${jamStr}</span>` : ''}
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
                            title="Cetak label untuk tujuan ini">
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
        }).join('');
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

async function cetakLabelPerTujuanPaket(recordId) {
    const records = Array.isArray(window.__riwayatPaketHariIniCache) ? window.__riwayatPaketHariIniCache : [];
    const target = records.find((r) => r.id === recordId);

    if (!target) {
        tampilkanToastPaket('Data tujuan tidak ditemukan.', 'error');
        return;
    }

    try {
        const jobPayload = {
            modul: 'PAKET_PAJANG',
            paket_id: target.id,
            tanggal: target.tanggal || getTanggalHariIniISO(),
            no_do: target.no_do || '',
            tujuan: target.tujuan || '',
            items: Array.isArray(target.items) ? target.items : [],
            total_qty: Number(target.total_qty) || 0,
            status: 'PENDING',
            timestamp: Date.now()
        };

        // Kirim ke print_jobs (Firestore jika aktif, dan tandai status di RTDB)
        if (typeof db !== 'undefined' && db) {
            await db.collection('print_jobs').add({
                ...jobPayload,
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else if (typeof firebase !== 'undefined' && firebase.apps?.length && typeof firebase.database === 'function') {
            await firebase.database().ref(`print_jobs/${target.id}_${Date.now()}`).set(jobPayload);
        }

        if (typeof firebase !== 'undefined' && firebase.apps?.length && typeof firebase.database === 'function') {
            await firebase.database().ref(`data_paket/${target.id}`).update({
                status_cetak: 'TERKIRIM_CETAK',
                last_print_at: Date.now()
            });
        }

        tampilkanToastPaket(`Antrean cetak ${target.tujuan} berhasil dikirim.`, 'success');
    } catch (err) {
        console.error('Gagal mengirim antrean cetak tujuan:', err);
        tampilkanToastPaket('Gagal mengirim antrean cetak.', 'error');
    }
}

async function hapusRiwayatPaket(recordId) {
    if (!recordId) return;
    if (!confirm('Hapus data Paket Pajang ini dari riwayat?')) return;

    try {
        if (typeof firebase !== 'undefined' && firebase.apps?.length && typeof firebase.database === 'function') {
            await firebase.database().ref(`data_paket/${recordId}`).remove();
        }
        tampilkanToastPaket('Data berhasil dihapus.', 'info');
        await muatRiwayatPaketHariIni();
    } catch (err) {
        console.error('Gagal menghapus data_paket:', err);
        tampilkanToastPaket('Gagal menghapus data.', 'error');
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

async function isiDropdownDataWatermarkPaket(pilihIdOtomatis = '') {
    const selectEl = document.getElementById('paket-wm-select-data');
    if (!selectEl) return;

    if (!Array.isArray(window.__riwayatPaketHariIniCache)) {
        await muatRiwayatPaketHariIni();
    }

    const records = Array.isArray(window.__riwayatPaketHariIniCache)
        ? window.__riwayatPaketHariIniCache
        : [];

    const draft = susunOpsiDraftFormJikaAda();
    const opsiList = [];

    if (draft) {
        opsiList.push({
            value: '__DRAFT_FORM__',
            label: `[Draft Form] ${draft.tujuan}${draft.no_do ? ` (DO:${draft.no_do})` : ''}`,
            record: draft
        });
    }

    records.forEach((rec) => {
        const totalQty = Number(rec.total_qty) || 0;
        opsiList.push({
            value: rec.id,
            label: `${rec.tujuan || 'TUJUAN'}${rec.no_do ? ` • DO:${rec.no_do}` : ''} (${totalQty} PKT)`,
            record: rec
        });
    });

    window.__opsiWatermarkPaketMap = {};
    opsiList.forEach((opt) => {
        window.__opsiWatermarkPaketMap[opt.value] = opt.record;
    });

    if (!opsiList.length) {
        selectEl.innerHTML = `<option value="">-- Belum ada data tersimpan hari ini --</option>`;
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
        tampilkanToastPaket('Kamera tidak tersedia, gunakan tombol Foto Lokal.', 'info');
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
    const gridEl = document.getElementById('paket-camera-grid');
    const selectEl = document.getElementById('paket-wm-select-data');

    if (!canvas) return;

    const maxDim = 1920;
    let w = lebarAsli || 1280;
    let h = tinggiAsli || 720;
    if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(sumberMedia, 0, 0, w, h);

    const logoImg = await buatImageLogoMariFood();

    const minSide = Math.min(w, h);
    const scale = Math.max(1.0, minSide / 640);

    const pad = Math.round(16 * scale);
    const margin = Math.round(22 * scale);
    const { jam, hari, tanggal, hariTanggal } = getInfoWaktuWatermarkSekarang();

    const selectedId = selectEl?.value || '';
    const rec = window.__opsiWatermarkPaketMap?.[selectedId] || null;
    const teksInfo = rec ? formatInfoWatermarkDariRecord(rec) : '';
    const barisInfo = teksInfo ? teksInfo.split('\n') : [];

    // Kotak logo proporsional (120:100 -> 6:5) agar tidak gepeng
    const logoH = Math.round(50 * scale);
    const logoW = Math.round(logoH * 1.2);
    const judulGap = Math.round(12 * scale);

    const fontJudul = `900 ${Math.round(20 * scale)}px Arial, sans-serif`;
    const fontSubjudul = `800 ${Math.round(20 * scale)}px Arial, sans-serif`;
    const fontChevron = `900 ${Math.round(10 * scale)}px monospace`;
    const fontJam = `900 ${Math.round(42 * scale)}px monospace`;
    const fontTgl = `700 ${Math.round(16 * scale)}px Arial, sans-serif`;
    const fontDetail = `700 ${Math.round(17 * scale)}px Arial, sans-serif`;

    ctx.font = fontJudul;
    const wJudul = ctx.measureText('Dokumentasi').width;
    ctx.font = fontSubjudul;
    const wSubjudul = ctx.measureText('Paket Pajang').width;
    const headerFixedW = logoW + judulGap + Math.max(wJudul, wSubjudul);

    ctx.font = fontDetail;
    let maxDetailWidth = 0;
    barisInfo.forEach((line) => {
        const mw = ctx.measureText(line).width;
        if (mw > maxDetailWidth) maxDetailWidth = mw;
    });

    const contentWidth = Math.max(headerFixedW, maxDetailWidth, Math.round(230 * scale));
    const boxWidth = Math.min(w - margin * 2, contentWidth + pad * 2);

    const topBlockH = Math.max(logoH, Math.round(50 * scale));
    const dividerBlockH = Math.round(22 * scale);
    const timeBlockH = Math.round(48 * scale);
    const lineH = Math.round(25 * scale);
    const detailBlockH = barisInfo.length ? (Math.round(8 * scale) + barisInfo.length * lineH) : 0;
    const boxHeight = pad * 2 + topBlockH + dividerBlockH + timeBlockH + detailBlockH;

    const boxX = margin;
    const boxY = h - margin - boxHeight;

    // Panel gelap semi-transparan gaya Timemark
    ctx.fillStyle = 'rgba(26, 30, 36, 0.78)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, Math.round(10 * scale));
    ctx.fill();

    const innerX = boxX + pad;
    let curY = boxY + pad;

    // Logo MariFood di kiri atas
    if (logoImg) {
        ctx.drawImage(logoImg, innerX, curY, logoW, logoH);
    }

    // Judul "Dokumentasi" & "Paket Pajang" sejajar di kanan logo
    const titleX = innerX + logoW + judulGap;
    ctx.font = fontJudul;
    ctx.fillStyle = '#a3e635';
    ctx.fillText('Dokumentasi', titleX, curY + Math.round(19 * scale));

    ctx.font = fontSubjudul;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Paket Pajang', titleX, curY + Math.round(43 * scale));

    // Garis pemisah hijau stabilo + chevron kecil
    curY += topBlockH + Math.round(8 * scale);
    ctx.strokeStyle = '#a3e635';
    ctx.lineWidth = Math.max(3, Math.round(3 * scale));
    ctx.beginPath();
    ctx.moveTo(innerX, curY);
    ctx.lineTo(boxX + boxWidth - pad, curY);
    ctx.stroke();

    ctx.font = fontChevron;
    ctx.fillStyle = 'rgba(163, 230, 53, 0.92)';
    const chevronStr = '>'.repeat(Math.max(14, Math.floor((boxWidth - pad * 2) / (6.5 * scale))));
    ctx.fillText(chevronStr, innerX, curY + Math.round(10 * scale), boxWidth - pad * 2);

    // Jam hijau stabilo + Hari & Tanggal
    curY += Math.round(48 * scale);
    ctx.font = fontJam;
    ctx.fillStyle = '#a3e635';
    ctx.fillText(jam, innerX, curY);

    const jamW = ctx.measureText(jam).width;
    const dateX = innerX + jamW + Math.round(14 * scale);
    ctx.font = fontTgl;
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(hari, dateX, curY - Math.round(21 * scale));
    ctx.fillText(tanggal, dateX, curY - Math.round(2 * scale));

    // Rincian Tujuan, No DO & Konversi Paket (KRT + PKT)
    if (barisInfo.length) {
        curY += Math.round(10 * scale);
        ctx.font = fontDetail;
        ctx.fillStyle = '#ffffff';
        barisInfo.forEach((line) => {
            curY += lineH;
            ctx.fillText(line, innerX, curY);
        });
    }

    dataUrlFotoWatermarkAktif = canvas.toDataURL('image/jpeg', 0.95);

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
        tampilkanToastPaket('Kamera belum siap. Gunakan tombol Foto Lokal jika kamera tidak aktif.', 'error');
        return;
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
        tampilkanToastPaket('Ambil foto terlebih dahulu.', 'error');
        return;
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

    tampilkanToastPaket('Foto watermark tersimpan ke perangkat.', 'success');

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
// 7. EKSPOR FUNGSI KE GLOBAL WINDOW
// =========================================================
window.tambahItemPaketKeList = tambahItemPaketKeList;
window.hapusItemPaketSementara = hapusItemPaketSementara;
window.simpanDataPaketPajang = simpanDataPaketPajang;
window.togglePanelRiwayatPaket = togglePanelRiwayatPaket;
window.muatRiwayatPaketHariIni = muatRiwayatPaketHariIni;
window.cetakLabelPerTujuanPaket = cetakLabelPerTujuanPaket;
window.hapusRiwayatPaket = hapusRiwayatPaket;
window.pakaiDataKeKameraPaket = pakaiDataKeKameraPaket;
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