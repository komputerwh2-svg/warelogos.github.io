// js/migration.js

window.handleMigrasiClick = async function(event) {
    console.log("Tombol migrasi diklik!");
    // Tambahkan safety check untuk event
    if (!event || !event.currentTarget) {
        console.error("Fungsi dipanggil tanpa event yang valid");
        return;
    }

    // 1. Memberikan konfirmasi
    // Pastikan fungsi miuiConfirm mengembalikan boolean (true/false)
    const konfirmasi = confirm("Apakah Anda yakin ingin melakukan sinkronisasi data dari RTDB ke Firestore? Proses ini bisa memakan waktu.");
    
    if (konfirmasi) {
        console.log("Konfirmasi disetujui, menjalankan migrasi...");
        // Ambil elemen tombol yang diklik
        const btn = event.currentTarget;
        const icon = btn.querySelector('i');
        
        // 2. Mulai animasi dan nonaktifkan tombol
        icon.classList.add('fa-spin');
        btn.disabled = true;
        btn.style.opacity = "0.5"; // Memberikan efek visual nonaktif

        try {
            // 3. Panggil fungsi migrasi
            if (typeof window.migrasiMuatWH3KeFirestore === 'function') {
                await window.migrasiMuatWH3KeFirestore();
            } else {
                console.error("Fungsi migrasi belum didefinisikan!");
                miuiAlert("Error: Fungsi migrasi tidak ditemukan.");
            }
        } catch (error) {
            console.error("Terjadi kesalahan saat migrasi:", error);
        } finally {
            // 4. Hentikan animasi dan aktifkan kembali tombol
            icon.classList.remove('fa-spin');
            btn.disabled = false;
            btn.style.opacity = "1";
        }
    }
};

window.migrasiMuatWH3KeFirestore = async function() {
    console.log("FUNGSI MIGRASI DIPANGGIL!");
    const rtdb = window.getRTDB();
    const db = window.getFirestore();
    
    const progressContainer = document.getElementById('progress-container');
    const progressText = document.getElementById('progress-text');

    if (!rtdb || !db) return;

    try {
        // Tampilkan Modal MIUI V5
        if (progressContainer) progressContainer.style.display = 'flex';
        
        const snapshot = await rtdb.ref('muat_wh3').once('value');
        const dataLama = snapshot.val();
        
        if (!dataLama) {
            window.miuiAlert("Data RTDB Kosong.");
            if (progressContainer) progressContainer.style.display = 'none';
            return;
        }

        const check = await db.collection("muat_wh3").limit(1).get();
        if (!check.empty && !confirm("Data di Firestore sudah ada. Timpa data?")) {
            if (progressContainer) progressContainer.style.display = 'none';
            return;
        }

        let totalItems = 0;
        let processedItems = 0;
        for (const tglId in dataLama) {
            for (const folderId in dataLama[tglId]) {
                const item = dataLama[tglId][folderId];
                if (item.data) totalItems += Object.keys(item.data).length;
                totalItems++;
            }
        }

        let batch = db.batch();
        let opsCount = 0;

        for (const tglId in dataLama) {
            const folderList = dataLama[tglId];
            for (const folderId in folderList) {
                const item = folderList[folderId];
                const folderRef = db.collection("muat_wh3").doc(tglId).collection("datatujuan").doc(folderId);
                
                batch.set(folderRef, {
                    tujuan: item.tujuan || "UNKNOWN",
                    tanggal_kirim: item.tanggal_kirim || tglId,
                    status: item.status || "DRAFT",
                    tipe: item.tipe || "BOSNET",
                    migrated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                processedItems++;
                if (item.data) {
                    for (const noDO in item.data) {
                        batch.set(folderRef.collection("data").doc(noDO), item.data[noDO]);
                        opsCount++;
                        processedItems++;

                        if (progressText && totalItems > 0) {
                            const percent = Math.round((processedItems / totalItems) * 100);
                            progressText.innerText = `Sinkronisasi: ${percent}%`;
                        }

                        if (opsCount >= 450) {
                            await batch.commit();
                            batch = db.batch();
                            opsCount = 0;
                        }
                    }
                }
            }
        }
        
        await batch.commit();
        progressText.innerText = "Selesai!";
        window.miuiAlert("Migrasi Data Selesai!");
        
    } catch (error) {
        console.error(error);
        window.miuiAlert("Gagal: " + error.message);
    } finally {
        if (progressContainer) {
            setTimeout(() => { progressContainer.style.display = 'none'; }, 1000);
        }
    }
};