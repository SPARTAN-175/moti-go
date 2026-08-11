import {

    obtenerConductores

    
}
from "./motor/obtener-conductores.js";

import {

    ejecutarMotor

}
from "./motor/motor-asignacion.js";

import { auth, db }
from "./firebase-config.js";

import {
    addDoc,
    collection,
    getDocs,
    serverTimestamp,
    doc,
    getDoc
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const btnSolicitar =
document.getElementById(
    "btnSolicitar"
);

const observaciones =
document.getElementById(
    "observaciones"
);

const buscarDestinoEspecial =

document.getElementById(

    "buscarDestinoEspecial"

);

const listaDestinos =

document.getElementById(

    "listaDestinos"

);

let destinoSeleccionado = null;

const destino =
document.getElementById(
    "destino"
);

const btnEspecial =
document.getElementById(
    "btnEspecial"
);


// ================================
// BUSCAR DESTINOS
// ================================

buscarDestinoEspecial.addEventListener(

"input",

buscarDestinos

);

async function buscarDestinos(){

const texto=

buscarDestinoEspecial.value

.trim()

.toLowerCase();

listaDestinos.innerHTML="";

if(texto.length<2){

listaDestinos.style.display="none";

return;

}

const snapshot=

await getDocs(

collection(

db,

"destinos"

)

);

const encontrados=[];

snapshot.forEach(doc=>{

const destino=doc.data();

if(

destino.nombre

.toLowerCase()

.includes(texto)

){

encontrados.push({

id:doc.id,

...destino

});

}

});

if(encontrados.length===0){

listaDestinos.style.display="none";

return;

}

listaDestinos.style.display="block";

encontrados.forEach(destino=>{

const item=

document.createElement("div");

item.className=

"item-destino";

item.textContent=

destino.nombre;

item.onclick=()=>{

seleccionarDestino(

destino

);

};

listaDestinos.appendChild(item);

});

}

// ================================
// DESTINO SELECCIONADO
// ================================

function seleccionarDestino(destino){

destinoSeleccionado=

destino;

buscarDestinoEspecial.value=

destino.nombre;

listaDestinos.innerHTML="";

listaDestinos.style.display="none";

console.log(

destinoSeleccionado

);

}


btnSolicitar.addEventListener(
    "click",
    async (e) => {

        e.preventDefault();

        try{

            const user =
            auth.currentUser;

            const userDoc =
await getDoc(
    doc(
        db,
        "usuarios",
        user.uid
    )
);

const userData =
userDoc.data();

            // ========================================
// DESTINO SELECCIONADO EN EL MAPA
// ========================================

const destinoMapa =

JSON.parse(

    sessionStorage.getItem(

        "destinoViaje"

    )

);

            if(!user){

                alert(
                    "Debes iniciar sesión."
                );

                return;

            }

            const tipoViaje =
            btnEspecial.classList.contains(
                "active"
            )
            ?
            "especial"
            :
            "local";
// ========================================
// VIAJE ESPECIAL
// ========================================

if(tipoViaje==="especial"){

    if(!destinoSeleccionado){

        alert(
            "Selecciona un destino de la lista."
        );

        return;

    }

    window.location.href=

`elegir-conductor.html?destinoId=${destinoSeleccionado.id}&nombre=${encodeURIComponent(destinoSeleccionado.nombre)}`;

    return;

}

        // ========================================
// MOTOR MOTI
// ========================================

const conductores =

await obtenerConductores();

const resultado =

ejecutarMotor(

    conductores,

    {

        tipoViaje:"local"

    },

    {

        latitud:userData.latitud,

        longitud:userData.longitud

    }

);

console.log(

resultado.log.join("\n")

);

const mejorConductor =

resultado.mejorConductor;

// ========================================
// LISTA ORDENADA POR MOTI
// ========================================

const listaConductores =

resultado.grupos

.flat()

.map(

conductor => conductor.id

);

console.log(

"Orden MOTI:",

listaConductores

);

if(!mejorConductor){

    alert(

        "No hay conductores disponibles."

    );

    return;

}

console.log(

"Conductor seleccionado:",

mejorConductor

);     


            
            const solicitudRef = await addDoc(

    collection(
        db,
        "solicitudes"
    ),

    {

        pasajeroId:
        user.uid,

        nombrePasajero:
        userData.nombre,

        conductorId:

        mejorConductor.id,

        nombreConductor:

        mejorConductor.nombre,

        placa:

        mejorConductor.placa,

        conductoresEvaluados:

        listaConductores,

        indiceConductor:

        0,
        
        tipoViaje,

        destino:
        tipoViaje === "especial"
        ?
        destinoEspecial.value
        :
        destino.value.trim(),

        observaciones:
        observaciones.value.trim(),

        latitud:
        userData.latitud,

        longitud:
        userData.longitud,

        destinoLatitud:

destinoMapa?.latitud || null,

destinoLongitud:

destinoMapa?.longitud || null,

        estado:
        "pendiente",

        fechaSolicitud:
        serverTimestamp()

    }

);

       

window.location.href =
`esperando-conductor.html?id=${solicitudRef.id}`;

        }
        catch(error){

            console.error(error);

            alert(
                "Error al crear solicitud."
            );

        }

    }
);
