// ==========================================
// SUB-PAGE: PAKET PAJANG (MODUL TUNGGAL)
// ==========================================
function getTanggalHariIniISO() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function bukaSubPagePaketPajang() {
    const el = document.getElementById('subpage-paket-pajang');
    if (el) {
        el.classList.remove('hidden');
        const qtyInput = document.getElementById('paket-pajang-qty');
        if (qtyInput) qtyInput.focus();
        muatUlangRiwayatPaketPajang();
    }
}

function tutupSubPagePaketPajang() {
    const el = document.getElementById('subpage-paket-pajang');
    if (el) {
        el.classList.add('hidden');
    }
}

async function simpanPaketPajang() {
    const jenisEl = document.getElementById('paket-pajang-jenis');
    const qtyEl = document.getElementById('paket-pajang-qty');
    const catatanEl = document.getElementById('paket-pajang-catatan');
    const btnSimpan = document.getElementById('btn-simpan-paket-pajang');

    const jenisPaket = (jenisEl?.value || '').trim().toUpperCase();
    const qty = parseInt(qtyEl?.value || '0', 10);
    const catatan = (catatanEl?.value || '').trim();

    if (!jenisPaket) {
        alert('Silakan pilih jenis paket terlebih dahulu.');
        return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
        alert('QTY harus berupa angka lebih dari 0.');
        qtyEl?.focus();
        return;
    }

    try {
        if (btnSimpan) btnSimpan.disabled = true;

        const payload = {
            modul: 'PAKET_PAJANG',
            jenis_paket: jenisPaket,
            qty: qty,
            catatan: catatan,
            tanggal: getTanggalHariIniISO(),
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (typeof db !== 'undefined' && db) {
            await db.collection('label_history').add(payload);
        }

        if (qtyEl) qtyEl.value = '';
        if (catatanEl) catatanEl.value = '';
        qtyEl?.focus();

        await muatUlangRiwayatPaketPajang();
    } catch (err) {
        console.error('Gagal menyimpan Paket Pajang:', err);
        alert('Terjadi kesalahan saat menyimpan data Paket Pajang.');
    } finally {
        if (btnSimpan) btnSimpan.disabled = false;
    }
}

async function muatUlangRiwayatPaketPajang() {
    const listEl = document.getElementById('paket-pajang-list');
    const ringkasanEl = document.getElementById('paket-pajang-ringkasan');
    if (!listEl) return;

    const hariIni = getTanggalHariIniISO();
    let items = [];

    try {
        if (typeof db !== 'undefined' && db) {
            const snap = await db.collection('label_history')
                .where('modul', '==', 'PAKET_PAJANG')
                .where('tanggal', '==', hariIni)
                .get();

            snap.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });

            items.sort((a, b) => {
                const ta = a.created_at?.toMillis ? a.created_at.toMillis() : 0;
                const tb = b.created_at?.toMillis ? b.created_at.toMillis() : 0;
                return tb - ta;
            });
        }

        const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
        if (ringkasanEl) {
            ringkasanEl.textContent = `Total entri: ${items.length} | Total QTY: ${totalQty}`;
        }

        if (!items.length) {
            listEl.innerHTML = `
                <div class="text-center py-10 text-xs text-slate-500">
                    Belum ada data Paket Pajang hari ini (${hariIni}).
                </div>`;
            return;
        }

        listEl.innerHTML = items.map((item) => `
            <div class="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between gap-3">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            ${item.jenis_paket || '-'}
                        </span>
                        <span class="text-sm font-bold text-white">QTY: ${item.qty || 0}</span>
                    </div>
                    ${item.catatan ? `<p class="text-xs text-slate-400 mt-1">${item.catatan}</p>` : ''}
                </div>
                <span class="text-[11px] font-mono text-slate-500">${item.tanggal || hariIni}</span>
            </div>
        `).join('');
    } catch (err) {
        console.error('Gagal memuat riwayat Paket Pajang:', err);
        listEl.innerHTML = `
            <div class="text-center py-8 text-xs text-rose-400">
                Gagal memuat riwayat Paket Pajang.
            </div>`;
    }
}

async function cetakLabelPaketPajangHariIni() {
    const btnCetak = document.getElementById('btn-cetak-paket-pajang');
    const hariIni = getTanggalHariIniISO();

    try {
        if (btnCetak) btnCetak.disabled = true;

        let items = [];
        if (typeof db !== 'undefined' && db) {
            const snap = await db.collection('label_history')
                .where('modul', '==', 'PAKET_PAJANG')
                .where('tanggal', '==', hariIni)
                .get();

            snap.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
        }

        if (!items.length) {
            alert('Belum ada data Paket Pajang hari ini untuk dikirim ke antrean cetak.');
            return;
        }

        const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

        if (typeof db !== 'undefined' && db) {
            await db.collection('print_jobs').add({
                modul: 'PAKET_PAJANG',
                tanggal: hariIni,
                total_item: items.length,
                total_qty: totalQty,
                items: items.map(({ jenis_paket, qty, catatan }) => ({
                    jenis_paket,
                    qty: Number(qty) || 0,
                    catatan: catatan || ''
                })),
                status: 'PENDING',
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        alert(`Antrean cetak Paket Pajang hari ini (${items.length} entri, total QTY ${totalQty}) berhasil dikirim.`);
    } catch (err) {
        console.error('Gagal mengirim antrean cetak Paket Pajang:', err);
        alert('Terjadi kesalahan saat mengirim antrean cetak.');
    } finally {
        if (btnCetak) btnCetak.disabled = false;
    }
}