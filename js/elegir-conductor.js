import { auth, db }
from "./firebase-config.js";

import {

  
collection,
query,
where,
onSnapshot,
doc,
getDoc,
addDoc,
serverTimestamp

}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const params =

new URLSearchParams(

window.location.search

);

const destinoId =

params.get(

"destinoId"

);

const nombre =

params.get(

"nombre"

);

const lista =

document.getElementById(

"listaConductores"

);

const nombreDestino =

document.getElementById(

"nombreDestino"

);
const listenersConductores = {};

nombreDestino.textContent =

nombre;



const consulta =

query(

collection(
db,
"rutasEspeciales"
),

where(
"destinoId",
"==",
destinoId
),

where(
"activo",
"==",
true
)

);
onSnapshot(

    consulta,

    async(snapshot)=>{

        lista.innerHTML = "";

        for(const rutaDoc of snapshot.docs){

            const ruta = rutaDoc.data();

            if(!listenersConductores[ruta.conductorId]){

                listenersConductores[ruta.conductorId] =

                onSnapshot(

                    doc(
                        db,
                        "usuarios",
                        ruta.conductorId
                    ),

                    (conductorDoc)=>{

                        if(!conductorDoc.exists()) return;

                        const conductor = conductorDoc.data();

                        crearTarjeta(
                            ruta,
                            conductor
                        );

                    }

                );

            }

        }

    }

);


// ========================================
// CREAR TARJETA
// ========================================

function crearTarjeta(

ruta,

conductor

){

const idTarjeta = `card-${ruta.conductorId}`;

let tarjeta =

document.getElementById(idTarjeta);

if(!tarjeta){

    tarjeta =

    document.createElement("div");

    tarjeta.id = idTarjeta;

    tarjeta.className =

    "route-card";

    lista.appendChild(tarjeta);

}

const estado =

conductor.estadoServicio ===

"disponible"

?

"🟢 Disponible"

:

"🟡 Ocupado";

  const htmlBoton =

conductor.estadoServicio ===

"disponible"

?

`<button
class="btn-primary elegir-btn"
data-conductor="${ruta.conductorId}"
data-ruta="${ruta.destinoId}"
data-tarifa="${ruta.tarifa}">

Elegir

</button>`

:

`<button
class="btn-primary"
disabled>

No disponible

</button>`;

tarjeta.innerHTML =

`

<h3>

${conductor.nombre}

</h3>

<p>

${estado}

</p>

<p>

Tarifa: $${ruta.tarifa}

</p>

${htmlBoton}
`;


const btnElegir =

tarjeta.querySelector(

".elegir-btn"

);

if(btnElegir){

btnElegir.addEventListener(

"click",

()=>{

seleccionarConductor(

ruta,

conductor

);

}

);

}

}



async function seleccionarConductor(
ruta,
conductor
){

  // ========================================
// VERIFICAR DISPONIBILIDAD EN TIEMPO REAL
// ========================================

const conductorActual = await getDoc(

    doc(
        db,
        "usuarios",
        ruta.conductorId
    )

);

if(!conductorActual.exists()){

    alert("El conductor ya no existe.");

    return;

}

const datosConductor = conductorActual.data();

if(datosConductor.estadoServicio !== "disponible"){

    alert(

        "Este conductor ya no está disponible.\nSelecciona otro."

    );

    return;

}

try{

const pasajero = auth.currentUser;

const pasajeroDoc = await getDoc(

doc(
db,
"usuarios",
pasajero.uid
)

);

const datosPasajero = pasajeroDoc.data();

  // ========================================
// OBTENER COORDENADAS DEL DESTINO
// ========================================

const destinoDoc = await getDoc(

    doc(
        db,
        "destinos",
        ruta.destinoId
    )

);

if(!destinoDoc.exists()){

    alert(
        "No se encontró el destino."
    );

    return;

}

const datosDestino = destinoDoc.data();
  
const solicitudRef = await addDoc(

collection(
db,
"solicitudes"
),

{

pasajeroId: pasajero.uid,

nombrePasajero: datosPasajero.nombre,

conductorId: ruta.conductorId,

nombreConductor: conductor.nombre,

placa: conductor.placa,

tipoViaje: "especial",

destinoId: ruta.destinoId,

destino: nombre,

tarifa: ruta.tarifa,

observaciones: "",

latitud: datosPasajero.latitud,

longitud: datosPasajero.longitud,

destinoLatitud:

datosDestino.latitud,

destinoLongitud:

datosDestino.longitud,

estado: "pendiente",

fechaSolicitud: serverTimestamp()

}

);

console.log("Solicitud creada:", solicitudRef.id);
alert("Solicitud creada correctamente");
window.location.href =
`esperando-conductor.html?id=${solicitudRef.id}`;

}
catch(error){

console.error(error);

alert(error.message);

}

}





