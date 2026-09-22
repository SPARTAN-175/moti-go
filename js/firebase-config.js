import "./motigo-ui.js";

// =========================================================
// FIREBASE — CONFIGURACIÓN CENTRAL
// =========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";


// =========================================================
// CONFIGURACIÓN FIREBASE
// =========================================================

const firebaseConfig = {
  apiKey: "AIzaSyBQyULHw9P6V_nukIe_Np3_6LA2hdWuu5A",
  authDomain: "moti-go-c562c.firebaseapp.com",
  projectId: "moti-go-c562c",
  storageBucket: "moti-go-c562c.firebasestorage.app",
  messagingSenderId: "403488200433",
  appId: "1:403488200433:web:695fd2eee203846546bb50"
};


// =========================================================
// INICIALIZAR FIREBASE
// =========================================================

const app = initializeApp(firebaseConfig);

// La persistencia queda definida explícitamente para que el estado
// autenticado sobreviva correctamente al navegar entre páginas.
// El usuario sigue necesitando cerrar sesión explícitamente para salir.
export const auth = initializeAuth(app, {
  persistence: [
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence
  ]
});

export const db = getFirestore(app);

export const storage = getStorage(app);
