// Menggunakan production CDN bundle agar bisa berjalan di protokol file:/// offline hardisk
import * as firebaseApp from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import * as firebaseDatabase from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Konfigurasi Firebase Printer Cloud WH-2
const firebaseConfigPrinter = {
    databaseURL: "https://printer-cloud-wh2-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Inisialisasi Aplikasi Printer
const appPrinter = firebaseApp.initializeApp(firebaseConfigPrinter, "printerApp");
const dbPrinter = firebaseDatabase.getDatabase(appPrinter);

// Ekspos fungsi Firebase ke objek global window agar bisa dibaca main.js biasa
window.dbPrinter = dbPrinter;
window.fbRef = firebaseDatabase.ref;
window.fbPush = firebaseDatabase.push;
window.fbServerTimestamp = firebaseDatabase.serverTimestamp;
window.fbQuery = firebaseDatabase.query;
window.fbOrderByChild = firebaseDatabase.orderByChild;
window.fbEqualTo = firebaseDatabase.equalTo;
window.fbOnChildAdded = firebaseDatabase.onChildAdded;
window.fbUpdate = firebaseDatabase.update;

console.log("Firebase Printer Config terikat ke Global Windows Offline Mode.");