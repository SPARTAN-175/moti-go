import { auth, db }
from "./firebase-config.js";

import {

collection,
query,
where,
getDocs,
doc,
getDoc,
deleteDoc,
updateDoc
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {

onAuthStateChanged

}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


const lista =

document.getElementById(

"listaRutas"

);


onAuthStateChanged(

auth,

async(user)=>{

if(!user)return;

await cargarRutas(

user.uid

);

}

);


async function cargarRutas(uid){

lista.innerHTML="";

const consulta=

query(

collection(

db,

"rutasEspeciales"

),

where(

"conductorId",

"==",

uid

),

where(

"activo",

"==",

true

)

);

const snapshot=

await getDocs(

consulta

);

if(snapshot.empty){

lista.innerHTML=

"<p>No tienes rutas registradas.</p>";

return;

}

for(const rutaDoc of snapshot.docs){

const ruta=

rutaDoc.data();

const destinoDoc=

await getDoc(

doc(

db,

"destinos",

ruta.destinoId

)

);

if(!destinoDoc.exists()){

continue;

}

const destino=

destinoDoc.data();

crearTarjeta(

rutaDoc.id,

destino,

ruta

);

}

}


// ========================================
// CREAR TARJETA
// ========================================

function crearTarjeta(idRuta,destino,ruta){

const tarjeta =

document.createElement("div");

tarjeta.className="route-card";

tarjeta.innerHTML=`

<h3>

${destino.nombre}

</h3>

<p>

Tarifa: $${ruta.tarifa}

</p>

<div class="card-actions">

<button

class="edit-btn"

data-id="${idRuta}">

Editar

</button>

<button

class="delete-btn"

data-id="${idRuta}">

Eliminar

</button>

</div>

`;

lista.appendChild(

tarjeta

);

}

// ========================================
// ELIMINAR RUTA
// ========================================

document.addEventListener(

"click",

async(e)=>{

if(

e.target.classList.contains(

"delete-btn"

)

){

const id=

e.target.dataset.id;

const confirmar=

confirm(

"¿Eliminar esta ruta?"

);

if(!confirmar)return;

await deleteDoc(

doc(

db,

"rutasEspeciales",

id

)

);

await cargarRutas(

auth.currentUser.uid

);

}

});


// ========================================
// EDITAR TARIFA
// ========================================

document.addEventListener(

"click",

async(e)=>{

if(

!e.target.classList.contains(

"edit-btn"

)

)return;

const id=

e.target.dataset.id;

const nuevaTarifa=

prompt(

"Escribe la nueva tarifa"

);

if(

nuevaTarifa===null

)return;

if(

isNaN(nuevaTarifa)

||

Number(nuevaTarifa)<=0

){

alert(

"Tarifa inválida."

);

return;

}

await updateDoc(

doc(

db,

"rutasEspeciales",

id

),

{

tarifa:Number(

nuevaTarifa

)

}

);

await cargarRutas(

auth.currentUser.uid

);

});
