// =====================================================
// MOTI GO - DISPATCHER
// =====================================================
// Se encarga de recorrer los candidatos de asignación
// UNO POR UNO.
//
// Flujo:
//
// repartidor 1
//      ↓
// espera respuesta
//      ↓
// acepta → termina
// rechaza / expira → siguiente
//
// Cuando llega al último candidato, vuelve al primero
// mientras el pedido siga pendiente de asignación.
// =====================================================


// =====================================================
// CONFIGURACIÓN
// =====================================================

const TIEMPO_ESPERA = 15;


// =====================================================
// ESTADO DEL DISPATCHER
// =====================================================

let dispatcherActivo = false;

let pedidoActualId = null;

let indiceActual = 0;


// =====================================================
// INICIAR DISPATCHER
// =====================================================

export async function iniciarDispatcher(

    pedidoId,

    candidatos,

    opciones = {}

){

    console.log("");
    console.log("🛒 MOTI GO - DISPATCHER");
    console.log("==============================");

    console.log(
        "📦 Pedido:",
        pedidoId
    );

    console.log(
        "👥 Candidatos:",
        candidatos?.length || 0
    );

    console.log("");

    if(

        !pedidoId ||

        !Array.isArray(candidatos) ||

        candidatos.length === 0

    ){

        console.warn(
            "⚠️ MOTI GO DISPATCHER: no hay candidatos."
        );

        return {

            asignado: false,

            motivo:
                "sin_candidatos"

        };

    }


    dispatcherActivo = true;

    pedidoActualId =
        pedidoId;

    indiceActual = 0;


    // =================================================
    // RECORRER CANDIDATOS
    // =================================================

    while(

        dispatcherActivo

    ){

        const candidato =
            candidatos[
                indiceActual
            ];


        if(!candidato){

            indiceActual = 0;

            continue;

        }


        console.log("");

        console.log(
            "🎯 MOTI GO: candidato actual:",
            candidato
        );


        // =============================================
        // NOTIFICAR CANDIDATO
        // =============================================

        let resultado;

        if(

            typeof opciones.enviarSolicitud ===
            "function"

        ){

            resultado =
                await opciones.enviarSolicitud(

                    pedidoId,

                    candidato

                );

        }else{

            console.warn(
                "⚠️ MOTI GO DISPATCHER: enviarSolicitud no está configurada."
            );

            resultado = {

                respuesta:
                    "sin_respuesta"

            };

        }


        // =============================================
        // REVISAR RESULTADO
        // =============================================

        if(

            resultado?.respuesta ===
            "aceptado"

        ){

            console.log("");

            console.log(
                "✅ MOTI GO: pedido aceptado por:",
                candidato.id ||
                candidato.uid ||
                candidato.repartidorId
            );

            dispatcherActivo =
                false;

            return {

                asignado: true,

                candidato:

                    candidato

            };

        }


        // =============================================
        // RECHAZADO / EXPIRADO
        // =============================================

        console.log("");

        console.log(
            "↪️ MOTI GO: candidato no aceptó."
        );


        // =============================================
        // SIGUIENTE CANDIDATO
        // =============================================

        indiceActual++;


        // =============================================
        // SI LLEGAMOS AL FINAL
        // =============================================

        if(

            indiceActual >=
            candidatos.length

        ){

            console.log("");

            console.log(
                "🔄 MOTI GO: se recorrieron todos los candidatos."
            );

            console.log(
                "🔁 MOTI GO: reiniciando desde el primer candidato."
            );


            indiceActual = 0;

        }


        // =============================================
        // PEQUEÑA PAUSA ANTES DEL SIGUIENTE
        // =============================================

        if(

            dispatcherActivo

        ){

            console.log("");

            console.log(
                "⏭️ MOTI GO: preparando siguiente candidato..."
            );

        }

    }


    return {

        asignado: false,

        motivo:
            "dispatcher_detendido"

    };

}


// =====================================================
// DETENER DISPATCHER
// =====================================================

export function detenerDispatcher(){

    console.log("");

    console.log(
        "🛑 MOTI GO: deteniendo dispatcher."
    );


    dispatcherActivo =
        false;

}


// =====================================================
// CONSULTAR ESTADO
// =====================================================

export function dispatcherEstaActivo(){

    return dispatcherActivo;

}


// =====================================================
// OBTENER PEDIDO ACTUAL
// =====================================================

export function obtenerPedidoDispatcher(){

    return pedidoActualId;

}
