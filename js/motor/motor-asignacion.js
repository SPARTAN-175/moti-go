// =====================================================
// MOTI GO - MOTOR DE ASIGNACIÓN
// =====================================================
//
// Adaptación del motor original de MOTI para MOTI GO.
//
// Flujo:
//
// repartidores registrados
//        ↓
// disponibles
//        ↓
// distancia al cliente
//        ↓
// radio
//        ↓
// rutas especiales (si aplica)
//        ↓
// puntaje
//        ↓
// ordenar
//        ↓
// grupos de prioridad
//
// IMPORTANTE:
// El dispatcher será quien posteriormente envíe
// la solicitud UNO POR UNO.
// =====================================================


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


// =====================================================
// EJECUTAR MOTOR
// =====================================================

export function ejecutarMotor(

    conductores = [],

    pedido = {},

    cliente = {}

){

    const log = [];


    log.push(
        "🛒 MOTI GO - MOTOR DE ASIGNACIÓN INICIADO"
    );


    // =================================================
    // VALIDAR CLIENTE
    // =================================================

    if(

        typeof cliente.latitud !== "number" ||

        typeof cliente.longitud !== "number"

    ){

        log.push(
            "❌ Ubicación del cliente no válida."
        );


        return {

            mejorRepartidor: null,

            candidatos: [],

            grupos: [],

            log,

            estadisticas: {

                registrados:
                    conductores.length,

                disponibles: 0,

                candidatos: 0,

                grupos: 0,

                radio: null

            }

        };

    }


    // =================================================
    // 1. BUSCAR REPARTIDORES DISPONIBLES
    // =================================================

    let disponibles =

        buscarConductores(

            conductores

        );


    log.push(

        `👥 Repartidores registrados: ${conductores.length}`

    );


    log.push(

        `🟢 Repartidores disponibles: ${disponibles.length}`

    );


    // =================================================
    // 2. CALCULAR DISTANCIA
    // =================================================

    disponibles.forEach(

        repartidor => {

            repartidor.distancia =

                Math.round(

                    calcularDistancia(

                        cliente.latitud,

                        cliente.longitud,

                        repartidor.latitud,

                        repartidor.longitud

                    )

                );

        }

    );


    log.push(
        "📍 Distancias calculadas."
    );


    // =================================================
    // 3. FILTRAR POR RADIO
    // =================================================

    const resultadoRadio =

        filtrarRadio(

            disponibles

        );


    log.push(

        `📡 Radio utilizado: ${resultadoRadio.radio} m`

    );


    let candidatos =

        resultadoRadio.conductores;


    // =================================================
    // 4. RUTAS ESPECIALES
    // =================================================
    //
    // MOTI GO puede utilizar pedido.tipoViaje o
    // pedido.tipo para identificar un pedido especial.
    //
    // Si no es especial, no aplicamos este filtro.
    // =================================================

    const tipoViaje =

        pedido.tipoViaje ||

        pedido.tipo ||

        "local";


    if(

        tipoViaje === "especial"

    ){

        candidatos =

            filtrarRutasEspeciales(

                candidatos,

                pedido

            );


        log.push(

            `🛣️ Repartidores compatibles con ruta especial: ${candidatos.length}`

        );

    }


    // =================================================
    // 5. CALCULAR PUNTAJE
    // =================================================

    candidatos =

        calcularPuntaje(

            candidatos

        );


    log.push(
        "⭐ Puntajes calculados."
    );


    // =================================================
    // 6. ORDENAR CANDIDATOS
    // =================================================

    candidatos.sort(

        (a, b) => {

            return (

                b.puntaje -

                a.puntaje

            );

        }

    );


    log.push(
        "📊 Repartidores ordenados por prioridad."
    );


    // =================================================
    // 7. CREAR GRUPOS
    // =================================================
    //
    // Conservamos la estructura original del motor.
    //
    // El dispatcher de MOTI GO NO enviará estos grupos
    // simultáneamente.
    //
    // Los utilizará como bloques de prioridad y recorrerá
    // los repartidores UNO POR UNO.
    // =================================================

    const grupos =

        seleccionarGrupos(

            candidatos

        );


    log.push(

        `📦 Grupos de prioridad creados: ${grupos.length}`

    );


    // =================================================
    // LOG DE CANDIDATOS
    // =================================================

    candidatos.forEach(

        (repartidor, indice) => {

            log.push(

                `🎯 #${indice + 1} ` +

                `${repartidor.nombre || "Sin nombre"} ` +

                `| distancia: ${repartidor.distancia} m ` +

                `| puntaje: ${repartidor.puntaje}`

            );

        }

    );


    // =================================================
    // FINAL
    // =================================================

    log.push(
        "🏁 MOTI GO - MOTOR FINALIZADO"
    );


    // =================================================
    // RESULTADO
    // =================================================

    return {

        // ---------------------------------------------
        // PRIMER REPARTIDOR
        // ---------------------------------------------

        mejorRepartidor:

            candidatos.length > 0

                ?

                candidatos[0]

                :

                null,


        // ---------------------------------------------
        // COMPATIBILIDAD CON NOMBRE ORIGINAL
        // ---------------------------------------------

        mejorConductor:

            candidatos.length > 0

                ?

                candidatos[0]

                :

                null,


        // ---------------------------------------------
        // TODOS LOS CANDIDATOS
        // ---------------------------------------------

        candidatos,


        // ---------------------------------------------
        // GRUPOS
        // ---------------------------------------------

        grupos,


        // ---------------------------------------------
        // LOG
        // ---------------------------------------------

        log,


        // ---------------------------------------------
        // ESTADÍSTICAS
        // ---------------------------------------------

        estadisticas: {

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
