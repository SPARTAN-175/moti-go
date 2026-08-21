// =====================================================
// MOTI GO - DISPATCHER
// =====================================================
//
// Asignación UNO POR UNO.
//
// El dispatcher:
// 1. recibe los grupos del motor;
// 2. toma un repartidor;
// 3. escribe la solicitud en Firestore;
// 4. espera respuesta REAL desde Firestore;
// 5. si acepta -> termina;
// 6. si rechaza -> siguiente;
// 7. si expira -> siguiente;
// 8. si no quedan candidatos -> sin_repartidor.
//
// =====================================================


import {
    db
}
from "../firebase-config.js";


import {
    doc,
    updateDoc,
    onSnapshot,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// =====================================================
// CONFIGURACIÓN
// =====================================================

const TIEMPO_ESPERA =
    15;


// =====================================================
// ESTADO
// =====================================================

let dispatcherActivo =
    false;


// =====================================================
// ESPERAR RESPUESTA REAL DESDE FIREBASE
// =====================================================

function esperarRespuestaPedido(

    pedidoId,

    repartidorId

) {

    return new Promise(
        resolve => {

            console.log(
                "👂 MOTI GO: esperando respuesta Firebase:",
                pedidoId
            );


            const pedidoRef =
                doc(
                    db,
                    "pedidos",
                    pedidoId
                );


            let finalizado =
                false;


            let temporizador =
                null;


            // =============================================
            // FINALIZAR
            // =============================================

            const finalizar =
                respuesta => {

                    if (
                        finalizado
                    ) {

                        return;

                    }


                    finalizado =
                        true;


                    if (
                        temporizador
                    ) {

                        clearTimeout(
                            temporizador
                        );

                    }


                    if (
                        detenerListener
                    ) {

                        detenerListener();

                    }


                    resolve(
                        respuesta
                    );

                };


            // =============================================
            // LISTENER
            // =============================================

            const detenerListener =
                onSnapshot(

                    pedidoRef,

                    snapshot => {

                        if (
                            !snapshot.exists()
                        ) {

                            console.warn(
                                "⚠️ MOTI GO: el pedido ya no existe."
                            );


                            finalizar(
                                "cancelado"
                            );


                            return;

                        }


                        const pedido =
                            snapshot.data();


                        console.log(
                            "🔄 MOTI GO: cambio en pedido:",
                            {
                                id:
                                    pedidoId,

                                estado:
                                    pedido.estado,

                                repartidorId:
                                    pedido.repartidorId,

                                rechazo:
                                    pedido.solicitudRechazadaPor
                            }
                        );


                        // =================================
                        // ACEPTADO
                        // =================================

                        if (
                            pedido.estado ===
                            "asignado" &&

                            pedido.repartidorId ===
                            repartidorId
                        ) {

                            console.log(
                                "🎉 MOTI GO: repartidor aceptó:",
                                repartidorId
                            );


                            finalizar(
                                "aceptado"
                            );


                            return;

                        }


                        // =================================
                        // RECHAZADO
                        // =================================

                        if (
                            pedido.estado ===
                            "pendiente_asignacion" &&

                            pedido.solicitudRechazadaPor ===
                            repartidorId
                        ) {

                            console.log(
                                "❌ MOTI GO: repartidor rechazó:",
                                repartidorId
                            );


                            finalizar(
                                "rechazado"
                            );


                            return;

                        }


                        // =================================
                        // CLIENTE CANCELÓ
                        // =================================

                        if (
                            pedido.estado ===
                            "cancelado"
                        ) {

                            console.log(
                                "🛑 MOTI GO: cliente canceló el pedido."
                            );


                            finalizar(
                                "cancelado"
                            );


                            return;

                        }

                    },

                    error => {

                        console.error(
                            "❌ MOTI GO: error escuchando respuesta:",
                            error
                        );


                        finalizar(
                            "error"
                        );

                    }

                );


            // =============================================
            // TEMPORIZADOR
            // =============================================

            temporizador =
                setTimeout(

                    () => {

                        console.log(
                            "⌛ MOTI GO: solicitud expirada:",
                            repartidorId
                        );


                        finalizar(
                            "expirada"
                        );

                    },

                    TIEMPO_ESPERA * 1000

                );

        }
    );

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
    // LIMPIAR MARCA DE RECHAZO ANTERIOR
    // =================================================

    const datosSolicitud = {

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

    };


    // =================================================
    // ESCRIBIR SOLICITUD
    // =================================================

    await updateDoc(

        pedidoRef,

        datosSolicitud

    );


    console.log(
        "📨 MOTI GO: solicitud enviada:",
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
        // APLANAR GRUPOS
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


                // =========================================
                // EVITAR DUPLICADOS
                // =========================================

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
            "👥 MOTI GO: candidatos:",
            candidatos.length
        );


        // =================================================
        // SIN CANDIDATOS
        // =================================================

        if (
            candidatos.length ===
            0
        ) {

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
        // RECORRER UNO POR UNO
        // =================================================

        for (
            let indice = 0;

            indice <
            candidatos.length;

            indice++
        ) {

            const repartidor =
                candidatos[indice];


            console.log("");
            console.log(
                `🔄 MOTI GO: ronda ${indice + 1}/${candidatos.length}`
            );


            const respuesta =
                await enviarSolicitudRepartidor(

                    pedido,

                    repartidor,

                    indice

                );


            console.log(
                "📥 MOTI GO: respuesta recibida:",
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
                    "🎉 MOTI GO: PEDIDO ASIGNADO"
                );


                return {

                    asignado:
                        true,

                    repartidor

                };

            }


            // =============================================
            // CANCELADO
            // =============================================

            if (
                respuesta ===
                "cancelado"
            ) {

                console.log(
                    "🛑 MOTI GO: dispatcher detenido por cancelación."
                );


                return {

                    asignado:
                        false,

                    motivo:
                        "cancelado"

                };

            }


            // =============================================
            // RECHAZADO / EXPIRADO
            // =============================================

            console.log(
                "➡️ MOTI GO: pasando al siguiente repartidor..."
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
// SIN REPARTIDOR
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
            "😕 MOTI GO: no quedan repartidores."
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
