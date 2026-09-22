import { auth, db, rtdb } from "./firebase-config.js";

import { onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { doc, onSnapshot }
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    ref,
    update,
    onDisconnect,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

let watchId = null;
let uidActivo = null;
let ultimaActualizacion = 0;
let intervaloActualizacion = 30000;
let estadoServicioActual = null;
let unsubscribeEstadoServicio = null;
let referenciaUbicacion = null;
let desconexionConfigurada = false;

async function marcarGPSInactivo(uid) {
    if (!uid) return;

    try {
        await update(
            ref(rtdb, `ubicacionesRepartidores/${uid}`),
            {
                activo: false,
                actualizadoEn: serverTimestamp()
            }
        );
    } catch (error) {
        if (auth.currentUser) {
            console.warn(
                "📍 GPS RTDB: no se pudo marcar inactivo:",
                error
            );
        }
    }
}

function detenerGPS() {
    const uidAnterior = uidActivo;

    if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    if (unsubscribeEstadoServicio) {
        unsubscribeEstadoServicio();
        unsubscribeEstadoServicio = null;
    }

    if (referenciaUbicacion && desconexionConfigurada) {
        try {
            onDisconnect(referenciaUbicacion).cancel();
        } catch (_) {}
    }

    referenciaUbicacion = null;
    desconexionConfigurada = false;
    uidActivo = null;
    estadoServicioActual = null;
    ultimaActualizacion = 0;

    if (uidAnterior) {
        marcarGPSInactivo(uidAnterior);
    }

    console.log("📍 GPS RTDB MOTI GO: detenido.");
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
    referenciaUbicacion = ref(
        rtdb,
        `ubicacionesRepartidores/${uid}`
    );

    unsubscribeEstadoServicio = onSnapshot(
        doc(db, "usuarios", uid),
        (snapshot) => {
            if (!snapshot.exists()) return;

            const usuario = snapshot.data() || {};

            estadoServicioActual = usuario.estadoServicio || null;
            intervaloActualizacion =
                estadoServicioActual === "en_viaje"
                    ? 5000
                    : 30000;
        },
        (error) => {
            if (auth.currentUser?.uid !== uid) return;
            console.warn(
                "📍 GPS RTDB: no se pudo escuchar el estado del servicio:",
                error
            );
        }
    );

    onDisconnect(referenciaUbicacion)
        .update({
            activo: false,
            actualizadoEn: serverTimestamp()
        })
        .then(() => {
            desconexionConfigurada = true;
        })
        .catch((error) => {
            console.warn(
                "📍 GPS RTDB: no se pudo configurar onDisconnect:",
                error
            );
        });

    watchId = navigator.geolocation.watchPosition(
        async (position) => {
            if (!auth.currentUser || auth.currentUser.uid !== uidActivo) return;

            try {
                const lat = Number(position.coords.latitude);
                const lng = Number(position.coords.longitude);
                const ahora = Date.now();

                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

                if (ahora - ultimaActualizacion < intervaloActualizacion) return;
                ultimaActualizacion = ahora;

                await update(
                    referenciaUbicacion,
                    {
                        uid,
                        latitud: lat,
                        longitud: lng,
                        precision: Number.isFinite(position.coords.accuracy)
                            ? position.coords.accuracy
                            : null,
                        rumbo: Number.isFinite(position.coords.heading)
                            ? position.coords.heading
                            : null,
                        velocidad: Number.isFinite(position.coords.speed)
                            ? position.coords.speed
                            : null,
                        activo: true,
                        actualizadoEn: serverTimestamp()
                    }
                );

                console.log(
                    "📍 GPS RTDB:",
                    uid,
                    lat,
                    lng,
                    estadoServicioActual || "sin_estado"
                );
            } catch (error) {
                if (error?.code === "permission-denied" || !auth.currentUser) return;

                console.error(
                    "📍 GPS RTDB MOTI GO: error actualizando ubicación:",
                    error
                );
            }
        },
        (error) => {
            if (error?.code === 1) {
                console.warn(
                    "📍 GPS MOTI GO: permiso de ubicación no concedido."
                );
                return;
            }

            console.error(
                "📍 GPS MOTI GO: error de geolocalización:",
                error
            );
        },
        {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000
        }
    );

    console.log("📍 GPS RTDB: iniciado para", uid);
}
