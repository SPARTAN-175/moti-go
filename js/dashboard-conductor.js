import { auth, db }
from "./firebase-config.js";


import {
    onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const statusButton =
document.getElementById(
    "statusButton"
);

const statusDescription =
document.getElementById(
    "statusDescription"
);

let currentState = null;

const requestPopup =
document.getElementById(
    "requestPopup"
);

const requestContent =
document.getElementById(
    "requestContent"
);

const activeTripCard =
document.getElementById(
    "activeTripCard"
);

const activePassenger =
document.getElementById(
    "activePassenger"
);

const activeDestination =
document.getElementById(
    "activeDestination"
);

const activeStatus =
document.getElementById(
    "activeStatus"
);

const continueTrip =
document.getElementById(
    "continueTrip"
);

continueTrip.addEventListener(
    "click",
    ()=>{

        window.location.href =
        "viaje-activo.html";

    }
);

let ultimaSolicitud =
null;

let temporizador = null;

let segundosRestantes = 15;

let listenerSolicitud = null;

requestContent.addEventListener(
    "click",
    (e)=>{

        if(
            e.target.classList.contains(
                "accept-trip"
            )
        ){

            aceptarSolicitud(
                ultimaSolicitud
            );

        }

        if(
            e.target.classList.contains(
                "reject-trip"
            )
        ){

            rechazarSolicitud(
    ultimaSolicitud
);

        }

    }
);

onAuthStateChanged(
    auth,
    async (user) => {

        if(!user) return;

        const docRef =
        doc(
            db,
            "usuarios",
            user.uid
        );

        const docSnap =
        await getDoc(docRef);

        if(!docSnap.exists()) return;

        const datos =
        docSnap.data();

        currentState =
        datos.estadoServicio ||
        "disponible";

       actualizarVista();

       await verificarViajeActivo();

       if(currentState === "disponible"){

       escucharSolicitudes();

       }

        statusButton.addEventListener(
            "click",
            async () => {

                if(
                    currentState ===
                    "en_viaje"
                ){
                    return;
                }

                currentState =
                currentState ===
                "disponible"
                ?
                "no_disponible"
                :
                "disponible";

                await updateDoc(
                    docRef,
                    {
                        estadoServicio:
                        currentState
                    }
                );

                actualizarVista();

            }
        );

    }
);


function actualizarVista(){

    statusButton.classList.remove(
        "status-green",
        "status-gray",
        "status-yellow"
    );

    if(
        currentState ===
        "disponible"
    ){

        statusButton.textContent =
        "Disponible";

        statusDescription.textContent =
        "Estás recibiendo solicitudes";

        statusButton.classList.add(
            "status-green"
        );

    }

    if(
        currentState ===
        "no_disponible"
    ){

        statusButton.textContent =
        "No disponible";

        statusDescription.textContent =
        "No estás recibiendo solicitudes";

        statusButton.classList.add(
            "status-gray"
        );

    }

    if(
        currentState ===
        "en_viaje"
    ){

        statusButton.textContent =
        "En viaje";

        statusDescription.textContent =
        "Tienes un viaje activo";

        statusButton.classList.add(
            "status-yellow"
        );

    }

}


// ======================
// SOLICITUDES EN TIEMPO REAL
// ======================

function escucharSolicitudes(){
   
   const uid =

auth.currentUser.uid;

const q =

query(

collection(

db,

"solicitudes"

),

where(

"conductorId",

"==",

uid

),

where(

"estado",

"==",

"pendiente"

),

orderBy(

"fechaSolicitud",

"desc"

),

limit(1)

);
    console.log("UID del conductor:", uid);

    onSnapshot(

        q,

        (snapshot)=>{
            console.log("Documentos encontrados:", snapshot.size);

            if(snapshot.empty){

                requestPopup.style.display =
                "none";

                ultimaSolicitud =
                null;

                return;

            }

            const solicitud =
            snapshot.docs[0];

            if(
                ultimaSolicitud ===
                solicitud.id
            ){
                return;
            }

            ultimaSolicitud =
            solicitud.id;

            mostrarPopup(
                solicitud.id,
                solicitud.data()
            );
            iniciarTemporizador(
             solicitud.id
            );

        }

    );

}

function mostrarPopup(
    id,
    datos
){

    const clase =
    datos.tipoViaje ===
    "especial"
    ?
    "popup-special"
    :
    "popup-local";

    const tipoViaje =
    datos.tipoViaje ===
    "especial"
    ?
    "ESPECIAL"
    :
    "LOCAL";

    let hora = "";

if(datos.fecha){

    hora =
    datos.fecha
    .toDate()
    .toLocaleTimeString(
        "es-MX",
        {
            hour:"2-digit",
            minute:"2-digit"
        }
    );

}

    requestContent.innerHTML = `

<div class="${clase}">

    <h3>

        Nueva solicitud

    </h3>

    <div class="trip-badge">

        ${tipoViaje}

    </div>

    <p>

        <strong>

            ${datos.nombrePasajero}

        </strong>

    </p>

    <p class="popup-time">

        ${hora}

    </p>

    <p>

        <strong>Destino</strong><br>

        ${datos.destino}

    </p>

    <p>

        <strong>Referencia</strong><br>

        ${datos.observaciones || "-"}

    </p>

    <div class="popup-actions">

        <button
            class="accept-trip">

            Aceptar

        </button>

        <button
            class="reject-trip">

            Rechazar

        </button>

    </div>

</div>

`;
    requestPopup.style.display =
    "block";

    // ===================================
// ESCUCHAR CAMBIOS DE ESTA SOLICITUD
// ===================================

if(listenerSolicitud){

    listenerSolicitud();

}

listenerSolicitud = onSnapshot(

    doc(
        db,
        "solicitudes",
        id
    ),

    (docSnap)=>{

        if(!docSnap.exists()) return;

        const datos = docSnap.data();

        if(datos.estado !== "pendiente"){

            clearInterval(temporizador);

            requestPopup.style.display = "none";

            ultimaSolicitud = null;

            if(listenerSolicitud){

                listenerSolicitud();

                listenerSolicitud = null;

            }

        }

    }

);

    console.log("Botón encontrado:",
document.querySelector(".accept-trip"));
}

async function aceptarSolicitud(id){

    try{

        const uid =
        auth.currentUser.uid;

        // Actualizar solicitud
        
        clearInterval(temporizador);

        await updateDoc(

            doc(
                db,
                "solicitudes",
                id
            ),

            {

                estado:
                "aceptada",

                conductorId:
                uid,

                fechaAceptacion:
                serverTimestamp()

            }

        );

        // Actualizar conductor

        await updateDoc(

            doc(
                db,
                "usuarios",
                uid
            ),

            {

                estadoServicio:
                "en_viaje",

                viajeActivo:
                id

            }

        );

        window.location.href =
        "viaje-activo.html";

    }

    catch(error){

        console.error(error);

        alert(
            "No se pudo aceptar el viaje."
        );

    }

}
        // ===================================
        // INICIAR TEMPORIZADOR
        // ===================================

function iniciarTemporizador(solicitudId){

    clearInterval(temporizador);

    segundosRestantes = 15;

    temporizador = setInterval(()=>{

        console.log(

            "Tiempo:",

            segundosRestantes

        );

        segundosRestantes--;

        if(segundosRestantes < 0){

    clearInterval(temporizador);

    console.log("Tiempo agotado");

    rechazarSolicitud(solicitudId);

}

    },1000);

}
        // ===================================
        // RECHAZAR SOLICITUD
        // ===================================


async function rechazarSolicitud(id){

    clearInterval(temporizador);
   
    try{

        const solicitudRef =

        doc(
            db,
            "solicitudes",
            id
        );

        const solicitudSnap =

        await getDoc(
            solicitudRef
        );

        if(!solicitudSnap.exists()) return;

        const solicitud =

        solicitudSnap.data();

        const lista =

        solicitud.conductoresEvaluados || [];

        let indice =

        solicitud.indiceConductor || 0;

        indice++;

        // ===================================
        // YA NO HAY MÁS CONDUCTORES
        // ===================================

        if(indice >= lista.length){

            await updateDoc(

                solicitudRef,

                {

                    estado:"rechazada"

                }

            );

            requestPopup.style.display="none";

            ultimaSolicitud=null;

            return;

        }

        // ===================================
        // OBTENER SIGUIENTE CONDUCTOR
        // ===================================

        const siguienteId =

        lista[indice];

        const conductorSnap =

        await getDoc(

            doc(
                db,
                "usuarios",
                siguienteId
            )

        );

        if(!conductorSnap.exists()){

            return;

        }

        const conductor =

        conductorSnap.data();

        // ===================================
        // REASIGNAR
        // ===================================

        await updateDoc(

            solicitudRef,

            {

                conductorId:siguienteId,

                nombreConductor:conductor.nombre,

                placa:conductor.placa,

                indiceConductor:indice,

                estado:"pendiente"

            }

        );

        requestPopup.style.display="none";

        ultimaSolicitud=null;

    }

    catch(error){

        console.error(error);

        alert("No se pudo reasignar la solicitud.");

    }

}


async function verificarViajeActivo(){

    const user =
    auth.currentUser;

    if(!user) return;

    const usuarioDoc =
    await getDoc(

        doc(
            db,
            "usuarios",
            user.uid
        )

    );

    const usuario =
    usuarioDoc.data();

    if(!usuario.viajeActivo){

        activeTripCard.style.display =
        "none";

        return;

    }

    const viajeDoc =
    await getDoc(

        doc(
            db,
            "solicitudes",
            usuario.viajeActivo
        )

    );

    if(!viajeDoc.exists()) return;

    const viaje =
    viajeDoc.data();

    activePassenger.textContent =
    viaje.nombrePasajero;

    activeDestination.textContent =
    viaje.destino;

    activeStatus.textContent =
    viaje.estado;

    activeTripCard.style.display =
    "block";

}







