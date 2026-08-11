import { auth, db }
from "./firebase-config.js";

import {
    onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {

    doc,

    getDoc,

    updateDoc

}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


onAuthStateChanged(

    auth,

    (user)=>{

        if(!user) return;

        iniciarGPS(user.uid);

    }

);

let ultimaActualizacion = 0;

let intervaloActualizacion = 30000;

function iniciarGPS(uid){

    if(!("geolocation" in navigator)){

        console.log(
            "GPS no compatible"
        );

        return;

    }

    navigator.geolocation.watchPosition(

        async(position)=>{

            const lat =
            position.coords.latitude;

            const lng =
            position.coords.longitude;

            const ahora = Date.now();

const usuarioDoc =
await getDoc(

    doc(
        db,
        "usuarios",
        uid
    )

);

const usuario =
usuarioDoc.data();

intervaloActualizacion =

usuario.estadoServicio === "en_viaje"

?

5000

:

30000;

if(

    ahora - ultimaActualizacion

    <

    intervaloActualizacion

){

    return;

}

ultimaActualizacion = ahora;

            await updateDoc(

                doc(
                    db,
                    "usuarios",
                    uid
                ),

                {

                    latitud:lat,

                    longitud:lng,

                    ultimaUbicacion:
                    new Date().toISOString()

                }

            );

            console.log(
    "📍 GPS",
    auth.currentUser?.uid,
    lat,
    lng
);

        },

        (error)=>{

            console.error(error);

        },

        {

            enableHighAccuracy:true,

            maximumAge:5000,

            timeout:10000

        }

    );

}
