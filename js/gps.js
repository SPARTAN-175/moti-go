import { auth, db } from "./firebase-config.js";

import { onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { doc, getDoc, updateDoc }
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

let watchId = null;
let uidActivo = null;
let ultimaActualizacion = 0;
let intervaloActualizacion = 30000;

function detenerGPS() {
    if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    uidActivo = null;
    console.log("📍 GPS MOTI GO: detenido.");
}

window.motiGoGPS = { detener: detenerGPS };

window.addEventListener("moti-go:logout", detenerGPS);

onAuthStateChanged(auth, (user) => {
    if (!user) {
        detenerGPS();
        return;
    }

    iniciarGPS(user.uid);
});

function iniciarGPS(uid) {
    if (!("geolocation" in navigator)) {
        console.log("GPS no compatible");
        return;
    }

    if (watchId !== null && uidActivo === uid) return;
    detenerGPS();
    uidActivo = uid;

    watchId = navigator.geolocation.watchPosition(
        async (position) => {
            if (!auth.currentUser || auth.currentUser.uid !== uidActivo) return;

            try {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const ahora = Date.now();

                const usuarioDoc = await getDoc(doc(db, "usuarios", uid));

                if (!auth.currentUser || auth.currentUser.uid !== uidActivo) return;
                if (!usuarioDoc.exists()) return;

                const usuario = usuarioDoc.data() || {};
                intervaloActualizacion = usuario.estadoServicio === "en_viaje" ? 5000 : 30000;

                if (ahora - ultimaActualizacion < intervaloActualizacion) return;
                ultimaActualizacion = ahora;

                await updateDoc(
                    doc(db, "usuarios", uid),
                    {
                        latitud: lat,
                        longitud: lng,
                        ultimaUbicacion: new Date().toISOString()
                    }
                );

                console.log("📍 GPS", uid, lat, lng);
            } catch (error) {
                if (error?.code === "permission-denied" || !auth.currentUser) return;
                console.error("📍 GPS MOTI GO: error actualizando ubicación:", error);
            }
        },
        (error) => {
            if (error?.code === 1) {
                console.warn("📍 GPS MOTI GO: permiso de ubicación no concedido.");
                return;
            }
            console.error("📍 GPS MOTI GO: error de geolocalización:", error);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
}
