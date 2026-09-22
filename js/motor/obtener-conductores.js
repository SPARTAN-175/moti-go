import { db, rtdb }
from "../firebase-config.js";

import {
    collection,
    query,
    where,
    getDocs
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    ref,
    get
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

export async function obtenerConductores(){

    const consulta = query(

        collection(db,"usuarios"),

        where("tipo","==","repartidor"),

        where("estadoServicio","==","disponible")

    );

    const [snapshot, ubicacionesSnapshot] = await Promise.all([
        getDocs(consulta),
        get(ref(rtdb, "ubicacionesRepartidores"))
    ]);

    const ubicaciones = ubicacionesSnapshot.exists()
        ? ubicacionesSnapshot.val() || {}
        : {};

    const conductores = [];

    snapshot.forEach(
        docSnap => {
            const datos = docSnap.data() || {};
            const ubicacion = ubicaciones[docSnap.id] || {};

            conductores.push({
                id: docSnap.id,
                ...datos,
                latitud: Number(ubicacion.latitud),
                longitud: Number(ubicacion.longitud),
                ubicacionActiva: ubicacion.activo === true,
                ubicacionActualizadaEn: ubicacion.actualizadoEn ?? null,
                precisionGPS: Number(ubicacion.precision) || null
            });
        }
    );

    console.log(
        "🚴 Repartidores disponibles con ubicación RTDB:",
        conductores
    );

    return conductores;
}
