import {
    ejecutarMotor
}
from "../motor/motor-asignacion.js";

import {

    obtenerConductores

}
from "../motor/obtener-conductores.js";

import {
    mostrarTabla,
    mostrarLog
}
from "./ui.js";


// ========================================
// DATOS DE PRUEBA
// ========================================

const viaje = {

    tipoViaje: "especial",

    destino: "Plan de Ayala"

};

const pasajero = {

    latitud: 17.4088035,

    longitud: -93.327078

};

const conductores = [

{

    nombre:"Carlos",

    estadoServicio:"disponible",

    latitud:17.409058,

    longitud:-93.327280,

    minutosSinViaje:35,

    aceptaViaje:false,

    rutasEspeciales:[

        {

            destino:"Plan de Ayala",

            tarifa:120,

            activo:true

        }

    ]

},

{

    nombre:"Juan",

    estadoServicio:"en_viaje",

    latitud:17.410500,

    longitud:-93.329500,

    minutosSinViaje:5,

    aceptaViaje:false,

    rutasEspeciales:[]

},

{

    nombre:"Pedro",

    estadoServicio:"disponible",

    latitud:17.408700,

    longitud:-93.327100,

    minutosSinViaje:55,

    aceptaViaje:false,

    rutasEspeciales:[

        {

            destino:"Nuevo Xochimilco",

            tarifa:150,

            activo:true

        }

    ]

},

{

    nombre:"Miguel",

    estadoServicio:"disponible",

    latitud:17.412000,

    longitud:-93.331000,

    minutosSinViaje:15,

    aceptaViaje:true,

    rutasEspeciales:[

        {

            destino:"Plan de Ayala",

            tarifa:130,

            activo:true

        }

    ]

},

{

    nombre:"José",

    estadoServicio:"disponible",

    latitud:17.414000,

    longitud:-93.333000,

    minutosSinViaje:45,

    aceptaViaje:false,

    rutasEspeciales:[

        {

            destino:"Plan de Ayala",

            tarifa:110,

            activo:true

        }

    ]

},

{

    nombre:"Antonio",

    estadoServicio:"disponible",

    latitud:17.413000,

    longitud:-93.330000,

    minutosSinViaje:70,

    aceptaViaje:false,

    rutasEspeciales:[

        {

            destino:"Plan de Ayala",

            tarifa:130,

            activo:true

        }

    ]

},

{

    nombre:"Luis",

    estadoServicio:"disponible",

    latitud:17.415000,

    longitud:-93.334000,

    minutosSinViaje:25,

    aceptaViaje:false,

    rutasEspeciales:[

        {

            destino:"Plan de Ayala",

            tarifa:100,

            activo:true

        }

    ]

}

];


// ========================================
// BOTÓN
// ========================================

document

.getElementById(

    "btnProbar"

)

.addEventListener(

    "click",

    probarMotor

);


// ========================================
// EJECUTAR MOTOR
// ========================================

async function probarMotor(){

    const conductores =

    await obtenerConductores();

    console.log(

        "Conductores desde Firebase:",

        conductores

    );

    const resultado = ejecutarMotor(

        conductores,

        viaje,

        pasajero

    );

    mostrarTabla(

        resultado.grupos

    );

    mostrarLog(

        resultado.log

    );

}
