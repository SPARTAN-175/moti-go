// Importaciones Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// CONFIGURACIÓN FIREBASE

const firebaseConfig = {
  apiKey: "AIzaSyBQyULHw9P6V_nukIe_Np3_6LA2hdWuu5A",
  authDomain: "moti-go-c562c.firebaseapp.com",
  projectId: "moti-go-c562c",
  storageBucket: "moti-go-c562c.firebasestorage.app",
  messagingSenderId: "403488200433",
  appId: "1:403488200433:web:695fd2eee203846546bb50"
};

// Inicializar Firebase

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);
