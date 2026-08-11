import { auth, db }
from "./firebase-config.js";

import {
    onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


onAuthStateChanged(
    auth,
    async (user) => {

        if(!user) return;

        try{

            const docSnap =
            await getDoc(
                doc(
                    db,
                    "usuarios",
                    user.uid
                )
            );

            if(!docSnap.exists())
                return;

            const datos =
            docSnap.data();

            document.getElementById(
                "profileName"
            ).textContent =
            datos.nombre || "-";

            document.getElementById(
                "infoName"
            ).textContent =
            datos.nombre || "-";

            document.getElementById(
                "infoPhone"
            ).textContent =
            datos.telefono || "-";

            document.getElementById(
                "infoMunicipio"
            ).textContent =
            datos.municipio || "-";

            document.getElementById(
                "infoLocalidad"
            ).textContent =
            datos.localidad || "-";

            document.getElementById(
                "infoPlaca"
            ).textContent =
            datos.placa || "-";

            const estado =
datos.estadoServicio ||
"disponible";

const serviceStatus =
document.getElementById(
    "serviceStatus"
);

if(serviceStatus){

    if(
        estado ===
        "disponible"
    ){

        serviceStatus.textContent =
        "Disponible";

    }

    if(
        estado ===
        "no_disponible"
    ){

        serviceStatus.textContent =
        "No disponible";

    }

    if(
        estado ===
        "en_viaje"
    ){

        serviceStatus.textContent =
        "En viaje";

    }

}

        }
        catch(error){

            console.error(error);

        }

    }
);
