import { auth, db }
from "./firebase-config.js";

import {

collection,
query,
where,
getDocs,
doc,
getDoc,
orderBy

}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {

onAuthStateChanged

}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


const lista =

document.getElementById(

"listaHistorial"

);


onAuthStateChanged(

auth,

async(user)=>{

if(!user)return;

await cargarHistorial(

user.uid

);

});



async function cargarHistorial(uid){

lista.innerHTML="";

const consulta = query(

collection(
db,
"solicitudes"
),

where(
"conductorId",
"==",
uid
),

orderBy(
"fechaFinalizacion",
"desc"
)

);

const snapshot=

await getDocs(

consulta

);

if(snapshot.empty){

lista.innerHTML=

"<p>No tienes viajes registrados.</p>";

return;

}

for(const viajeDoc of snapshot.docs){

const viaje=

viajeDoc.data();

crearTarjeta(

viaje

);

}

}


// ========================================
// CREAR TARJETA
// ========================================

function crearTarjeta(viaje){

const tarjeta =

document.createElement("div");

tarjeta.className = "route-card";

let fecha = "-";

if(viaje.fechaFinalizacion){

fecha =

viaje.fechaFinalizacion

.toDate()

.toLocaleString(

"es-MX"

);

}

tarjeta.innerHTML = `

<h3>

${viaje.destino}

</h3>

<p>

👤 ${viaje.nombrePasajero}

</p>

<p>

Estado:

<b>

${viaje.estado}

</b>

</p>

<p>

📅 ${fecha}

</p>

`;

lista.appendChild(

tarjeta

);

}



