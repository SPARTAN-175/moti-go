// =====================================================
// MOTI GO - DISPATCHER
// =====================================================
//
// Recibe los grupos generados por el motor.
//
// IMPORTANTE:
// NO manda el pedido a todo el grupo.
//
// Los candidatos se recorren UNO POR UNO:
//
// repartidor 1
//      ↓
// espera
//      ↓
// rechaza / expira
//      ↓
// repartidor 2
//      ↓
// espera
//      ↓
// etc.
//
// El estado de la solicitud se guarda en el mismo
// documento del pedido.
//
// =====================================================


import {
    db
}
from "../firebase-config.js";


import {
    doc,
    updateDoc,
    getDoc,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// =====================================================
// CONFIGURACIÓN
// =====================================================

const TIEMPO_ESPERA =
    15;


// =====================================================
// ESTADO INTERNO
// =====================================================

let temporizadorDispatcher =
    null;

let resolverSolicitud =
    null;

let dispatcherActivo =
    false;


// =====================================================
// ESPERAR RESPUESTA DEL REPARTIDOR
// =====================================================

function esperarRespuestaPedido(
    pedidoId,
    repartidorId
) {

    return new Promise(
        resolve => {

            resolverSolicitud = {

                pedidoId,

                repartidorId,

                resolve

            };


            console.log(
                "⏳ MOTI GO: esperando respuesta de:",
                repartidorId
            );


            temporizadorDispatcher =
                setTimeout(

                    () => {

                        temporizadorDispatcher =
                            null;

                        if (
                            resolverSolicitud
                        ) {

                            const resolver =
                                resolverSolicitud.resolve;

                            resolverSolicitud =
                                null;

                            console.log(
                                "⌛ MOTI GO: solicitud expirada:",
                                repartidorId
                            );

                            resolver(
                                "expirada"
                            );

                        }

                    },

                    TIEMPO_ESPERA * 1000

                );

        }
    );

}


// =====================================================
// RESPONDER DESDE EL REPARTIDOR
// =====================================================
//
// Esta función será llamada posteriormente cuando el
// repartidor acepte o rechace.
//
// =====================================================

export function responderDispatcherMotiGo(
    pedidoId,
    repartidorId,
    respuesta
) {

    if (
        !resolverSolicitud
    ) {

        console.warn(
            "⚠️ MOTI GO: no hay solicitud activa en dispatcher."
        );

        return false;

    }


    if (
        resolverSolicitud.pedidoId !==
        pedidoId
    ) {

        return false;

    }


    if (
        resolverSolicitud.repartidorId !==
        repartidorId
    ) {

        return false;

    }


    if (
        temporizadorDispatcher
    ) {

        clearTimeout(
            temporizadorDispatcher
        );

        temporizadorDispatcher =
            null;

    }


    const resolver =
        resolverSolicitud.resolve;


    resolverSolicitud =
        null;


    resolver(
        respuesta
    );


    return true;

}


// =====================================================
// ENVIAR SOLICITUD A UN REPARTIDOR
// =====================================================

async function enviarSolicitudRepartidor(
    pedido,
    repartidor,
    indice
) {

    const pedidoRef =
        doc(
            db,
            "pedidos",
            pedido.id
        );


    console.log("");

    console.log(
        "📤 MOTI GO: enviando solicitud"
    );


    console.log(
        `🎯 Repartidor #${indice + 1}:`,
        repartidor.nombre ||
        repartidor.id
    );


    // =================================================
    // MARCAR PEDIDO COMO SOLICITUD ACTIVA
    // =================================================

    await updateDoc(

        pedidoRef,

        {

            estado:
                "solicitud_repartidor",

            repartidorId:
                repartidor.id,

            repartidorNombre:
                repartidor.nombre ||
                "",

            repartidorPlaca:
                repartidor.placa ||
                "",

            indiceRepartidor:
                indice,

            solicitudEnviadaEn:
                serverTimestamp(),

            actualizadoEn:
                serverTimestamp()

        }

    );


    console.log(
        "📨 MOTI GO: solicitud enviada a:",
        repartidor.id
    );


    // =================================================
    // ESPERAR RESPUESTA
    // =================================================

    const respuesta =
        await esperarRespuestaPedido(

            pedido.id,

            repartidor.id

        );


    return respuesta;

}


// =====================================================
// INICIAR DISPATCHER
// =====================================================

export async function iniciarDispatcher(

    pedido,

    grupos

) {

    if (
        dispatcherActivo
    ) {

        console.warn(
            "⚠️ MOTI GO: ya existe un dispatcher activo."
        );

        return {

            asignado:
                false,

            motivo:
                "dispatcher_activo"

        };

    }


    dispatcherActivo =
        true;


    console.log("");

    console.log(
        "🚖 MOTI GO - DISPATCHER INICIADO"
    );


    try {

        // =================================================
        // CONVERTIR GRUPOS EN UNA SOLA LISTA
        // =================================================
        //
        // El motor crea grupos de hasta 3 repartidores.
        //
        // Nosotros los recorremos individualmente.
        //
        // Así conservamos el orden del puntaje.
        // =================================================

        const candidatos =
            [];


        for (
            const grupo of
            (grupos || [])
        ) {

            for (
                const repartidor of
                (grupo || [])
            ) {

                if (
                    !repartidor?.id
                ) {

                    continue;

                }


                if (
                    candidatos.some(
                        item =>
                            item.id ===
                            repartidor.id
                    )
                ) {

                    continue;

                }


                candidatos.push(
                    repartidor
                );

            }

        }


        console.log(
            "👥 MOTI GO: candidatos para despacho:",
            candidatos.length
        );


        // =================================================
        // NO HAY REPARTIDORES
        // =================================================

        if (
            candidatos.length ===
            0
        ) {

            console.warn(
                "⚠️ MOTI GO: no hay candidatos para enviar."
            );


            await marcarSinRepartidor(
                pedido
            );


            return {

                asignado:
                    false,

                motivo:
                    "sin_candidatos"

            };

        }


        // =================================================
        // ENVIAR UNO POR UNO
        // =================================================

        for (
            let indice = 0;

            indice <
            candidatos.length;

            indice++
        ) {

            const repartidor =
                candidatos[indice];


            const respuesta =
                await enviarSolicitudRepartidor(

                    pedido,

                    repartidor,

                    indice

                );


            console.log(
                "📥 MOTI GO: respuesta:",
                respuesta
            );


            // =============================================
            // ACEPTADO
            // =============================================

            if (
                respuesta ===
                "aceptado"
            ) {

                console.log(
                    "🎉 MOTI GO: pedido aceptado por:",
                    repartidor.nombre ||
                    repartidor.id
                );


                return {

                    asignado:
                        true,

                    repartidor

                };

            }


            // =============================================
            // RECHAZADO / EXPIRADO
            // =============================================

            console.log(
                "➡️ MOTI GO: continuando con el siguiente repartidor..."
            );

        }


        // =================================================
        // TERMINAR CANDIDATOS
        // =================================================

        await marcarSinRepartidor(
            pedido
        );


        return {

            asignado:
                false,

            motivo:
                "sin_respuesta"

        };

    }
    catch (
        error
    ) {

        console.error(
            "❌ MOTI GO: error en dispatcher:",
            error
        );


        return {

            asignado:
                false,

            motivo:
                "error",

            error

        };

    }
    finally {

        dispatcherActivo =
            false;

    }

}


// =====================================================
// MARCAR QUE NO HAY REPARTIDOR
// =====================================================

async function marcarSinRepartidor(
    pedido
) {

    try {

        await updateDoc(

            doc(
                db,
                "pedidos",
                pedido.id
            ),

            {

                estado:
                    "sin_repartidor",

                repartidorId:
                    null,

                repartidorNombre:
                    null,

                actualizadoEn:
                    serverTimestamp()

            }

        );


        console.log(
            "😕 MOTI GO: no se encontró repartidor."
        );

    }
    catch (
        error
    ) {

        console.error(
            "❌ MOTI GO: error marcando sin repartidor:",
            error
        );

    }

}
