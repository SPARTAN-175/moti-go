import { auth, db } from "./firebase-config.js";

import {

    doc,

    updateDoc

} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";



// =====================
// SELECTOR DE VIAJE
// =====================

const btnLocal =
document.getElementById("btnLocal");

const btnEspecial =
document.getElementById("btnEspecial");

const specialFields =
document.getElementById("specialFields");

const fareAmount =
document.getElementById("fareAmount");

btnLocal.addEventListener("click", () => {

    btnLocal.classList.add("active");
    btnEspecial.classList.remove("active");

    specialFields.style.display = "none";

    fareAmount.textContent = "$10";

});

btnEspecial.addEventListener("click", () => {

    btnEspecial.classList.add("active");
    btnLocal.classList.remove("active");

    specialFields.style.display = "block";

    fareAmount.textContent = "$30";

});


// Coordenadas del usuario

let userLat = null;
let userLng = null;

// =====================
// GPS
// =====================

const locationText =
document.getElementById("currentLocation");

if ("geolocation" in navigator) {

    navigator.geolocation.getCurrentPosition(

        (position) => {

            userLat =
            position.coords.latitude;

            userLng =
            position.coords.longitude;

            locationText.textContent =
            `GPS conectado correctamente`;

            const user = auth.currentUser;

if(user){

    actualizarUbicacion(
        user.uid,
        userLat,
        userLng
    );

}

        },

        (error) => {

            locationText.textContent =
            "No se pudo obtener la ubicación";

            console.error(error);

        }

    );

} else {

    locationText.textContent =
    "GPS no compatible";

}

async function actualizarUbicacion(
    uid,
    lat,
    lng
){

    try{

        await updateDoc(

            doc(
                db,
                "usuarios",
                uid
            ),

            {

                latitud: lat,

                longitud: lng,

                ultimaUbicacion:
                new Date().toISOString()

            }

        );

        console.log(
            "📍 Ubicación actualizada"
        );

    }
    catch(error){

        console.error(error);

    }

}


// ======================
// DESTINO SELECCIONADO
// ======================

const destinoGuardado =

sessionStorage.getItem(

"destinoViaje"

);

if(destinoGuardado){

    const destino =

    JSON.parse(

        destinoGuardado

    );

    console.log(

        "Destino seleccionado:",

        destino

    );

}
