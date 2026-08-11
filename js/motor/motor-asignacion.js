import {
    buscarConductores
}
from "./buscar-conductores.js";

import {
    calcularDistancia
}
from "./calcular-distancia.js";

import {
    filtrarRadio
}
from "./filtrar-radio.js";

import {
    calcularPuntaje
}
from "./calcular-puntaje.js";

import {
    filtrarRutasEspeciales
}
from "./filtrar-rutas-especiales.js";

import {
    seleccionarGrupos
}
from "./seleccionar-grupo.js";


export function ejecutarMotor(

    conductores,

    viaje,

    pasajero

){

    const log=[];

    log.push("🚖 MOTI ENGINE INICIADO");

    let disponibles=

    buscarConductores(

        conductores

    );

    log.push(

        `Conductores registrados: ${conductores.length}`

    );

    log.push(

        `Disponibles: ${disponibles.length}`

    );



    disponibles.forEach(

        conductor=>{

            conductor.distancia=

            Math.round(

                calcularDistancia(

                    pasajero.latitud,

                    pasajero.longitud,

                    conductor.latitud,

                    conductor.longitud

                )

            );

        }

    );



    log.push(

        "Distancias calculadas."

    );



    const resultadoRadio=

    filtrarRadio(

        disponibles

    );



    log.push(

        `Radio utilizado: ${resultadoRadio.radio}`

    );



    let candidatos=

    resultadoRadio.conductores;



    if(

        viaje.tipoViaje==="especial"

    ){

        candidatos=

        filtrarRutasEspeciales(

            candidatos,

            viaje

        );



        log.push(

            `Conductores compatibles: ${candidatos.length}`

        );

    }



    candidatos=

    calcularPuntaje(

        candidatos

    );



    log.push(

        "Puntajes calculados."

    );



    candidatos.sort(

        (a,b)=>

        b.puntaje-a.puntaje

    );



    log.push(

        "Conductores ordenados."

    );



    const grupos=

    seleccionarGrupos(

        candidatos

    );



    log.push(

        `Grupos creados: ${grupos.length}`

    );



    log.push(

        "🏁 MOTOR FINALIZADO"

    );



   return{

    mejorConductor:

    candidatos.length > 0

    ?

    candidatos[0]

    :

    null,

    grupos,

    log,

    estadisticas:{

        registrados:
        conductores.length,

        disponibles:
        disponibles.length,

        radio:
        resultadoRadio.radio,

        candidatos:
        candidatos.length,

        grupos:
        grupos.length

    }

};
}
