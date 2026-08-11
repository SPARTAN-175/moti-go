// Importaciones Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// CONFIGURACIÓN FIREBASE

const firebaseConfig = {
  apiKey: "AIzaSyBV_kc6922rgTsCX1AapGAAnjZU--QhPFI",
  authDomain: "moti-c1c5e.firebaseapp.com",
  projectId: "moti-c1c5e",
  storageBucket: "moti-c1c5e.firebasestorage.app",
  messagingSenderId: "348090491214",
  appId: "1:348090491214:web:794845834e6078a1847e1f"
};

// Inicializar Firebase

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);
