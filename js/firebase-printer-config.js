// =========================================================================
// FIREBASE REALTIME DATABASE PRINTER CLOUD CONFIGURATION (WH-2 ENGINE)
// =========================================================================
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, serverTimestamp, query, orderByChild, equalTo, onChildAdded, update, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Konfigurasi endpoint Realtime Database printer-cloud-wh2
const firebaseConfigPrinter = {
    databaseURL: "https://printer-cloud-wh2-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Validasi pencegahan inisialisasi ganda aplikasi Firebase di browser
const appPrinter = getApps().length === 0 ? initializeApp(firebaseConfigPrinter, "printerApp") : getApp("printerApp");
const dbPrinter = getDatabase(appPrinter);

// EKSPOR UTUH MODUL AGAR BISA DITANGKAP OLEH IMPORT PADA SEKSI 5 DI MAIN.JS
export {
    dbPrinter,
    ref,
    push,
    serverTimestamp,
    query,
    orderByChild,
    equalTo,
    onChildAdded,
    update,
    onValue
};

console.log("Firebase Printer Config Berhasil Diekspor dalam Mode Modul Server GitHub.");