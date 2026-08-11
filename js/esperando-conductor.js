import { db }
from "./firebase-config.js";

import {

doc,
onSnapshot,
updateDoc

}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const params =

new URLSearchParams(

window.location.search

);

const solicitudId =

params.get("id");


if(!solicitudId){

    alert("Solicitud no encontrada.");

    window.location.href =
    "dashboard-pasajero.html";

}


const solicitudRef =

doc(

db,

"solicitudes",

solicitudId

);

// ======================
// REFERENCIAS HTML
// ======================

const btnCancelar =

document.getElementById(
"btnCancelar"
);

const cancelModal =

document.getElementById(
"cancelModal"
);

const btnNoCancelar =

document.getElementById(
"btnNoCancelar"
);

const btnConfirmarCancelar =

document.getElementById(
"btnConfirmarCancelar"
);


// ======================
// ABRIR MODAL
// ======================

btnCancelar.addEventListener(

"click",

()=>{

cancelModal.style.display="flex";

}

);

// ======================
// CERRAR MODAL
// ======================

btnNoCancelar.addEventListener(

"click",

()=>{

cancelModal.style.display="none";

}

);

// ======================
// CONFIRMAR CANCELACIÓN
// ======================

btnConfirmarCancelar.addEventListener(

"click",

async()=>{

try{

await updateDoc(

solicitudRef,

{

estado:"cancelada"

}

);

window.location.href=

"dashboard-pasajero.html";

}

catch(error){

console.error(error);

alert(

"No se pudo cancelar la solicitud."

);

}

}

);

onSnapshot(

solicitudRef,

(docSnap)=>{

    if(!docSnap.exists()) return;

    const solicitud =

    docSnap.data();

    console.log(

        "Estado:",

        solicitud.estado

    );

  // ======================
// VIAJE ACEPTADO
// ======================

if(solicitud.estado === "aceptada"){

    window.location.href =
    `viaje-activo-pasajero.html?id=${solicitudId}`;

    return;

}

// ======================
// VIAJE RECHAZADO
// ======================

if(solicitud.estado === "rechazada"){

    if(solicitud.tipoViaje === "especial"){

        alert(
            "El conductor rechazó la solicitud. Selecciona otro conductor."
        );

        window.location.href =
        `elegir-conductor.html?destinoId=${solicitud.destinoId}&nombre=${encodeURIComponent(solicitud.destino)}`;

    }

    else{

        // FUTURO:
        // El algoritmo MOTI asignará automáticamente
        // el siguiente conductor disponible.

        alert(
            "Buscando otro conductor disponible..."
        );

    }

    return;

}

}

);
