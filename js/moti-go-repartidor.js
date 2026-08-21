// =====================================================
// MOTI GO - REPARTIDOR
// Sistema exclusivo para pedidos MOTI GO
// =====================================================

import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// =====================================================
// CONFIGURACIÓN
// =====================================================

const TIEMPO_SOLICITUD =
    15;


// =====================================================
// ESTADO DEL MÓDULO
// =====================================================

let usuarioRepartidor = null;

let pedidoActual = null;

let escuchandoPedidos = false;

let solicitudesActivas =
    new Map();


// =====================================================
// INICIO
// =====================================================

async function iniciarMotiGoRepartidor() {

    console.log(
        "🛵 MOTI GO - REPARTIDOR INICIANDO..."
    );


    const usuario =
        auth.currentUser;


    if (!usuario) {

        console.warn(
            "⚠️ MOTI GO: no hay repartidor autenticado."
        );

        return;

    }


    usuarioRepartidor =
        usuario;


    console.log(
        "👤 MOTI GO - REPARTIDOR:",
        usuarioRepartidor.uid
    );


    escucharSolicitudesAsignadas();

}


// =====================================================
// ESCUCHAR SOLICITUDES ASIGNADAS
// =====================================================
//
// IMPORTANTE:
//
// Ya NO escuchamos:
//
// estado == pendiente_asignacion
//
// Ahora escuchamos:
//
// estado == solicitud_repartidor
//
// Y además:
//
// repartidorId == MI UID
//
// Por lo tanto solamente este repartidor recibe
// la solicitud que el dispatcher le asignó.
// =====================================================

function escucharSolicitudesAsignadas() {

    if (
        escuchandoPedidos
    ) {

        return;

    }


    if (
        !usuarioRepartidor
    ) {

        console.warn(
            "⚠️ MOTI GO: usuario repartidor no disponible."
        );

        return;

    }


    escuchandoPedidos =
        true;


    const pedidosQuery =
        query(

            collection(
                db,
                "pedidos"
            ),

            where(
                "estado",
                "==",
                "solicitud_repartidor"
            ),

            where(
                "repartidorId",
                "==",
                usuarioRepartidor.uid
            )

        );


    console.log(
        "👂 MOTI GO: escuchando solicitudes para:",
        usuarioRepartidor.uid
    );


    onSnapshot(

        pedidosQuery,

        snapshot => {

            console.log(
                "📦 MOTI GO - SOLICITUDES PARA ESTE REPARTIDOR:",
                snapshot.size
            );


            snapshot.docChanges()
                .forEach(
                    cambio => {

                        const pedido = {

                            id:
                                cambio.doc.id,

                            ...cambio.doc.data()

                        };


                        // =================================
                        // NUEVA SOLICITUD
                        // =================================

                        if (
                            cambio.type ===
                            "added"
                        ) {

                            mostrarSolicitudPedido(
                                pedido
                            );

                        }


                        // =================================
                        // CAMBIO DE SOLICITUD
                        // =================================

                        if (
                            cambio.type ===
                            "modified"
                        ) {

                            console.log(
                                "🔄 MOTI GO: solicitud actualizada:",
                                pedido.id
                            );

                        }


                        // =================================
                        // SOLICITUD ELIMINADA
                        // =================================

                        if (
                            cambio.type ===
                            "removed"
                        ) {

                            console.log(
                                "↩️ MOTI GO: solicitud retirada:",
                                pedido.id
                            );

                            limpiarSolicitud(
                                pedido.id
                            );

                        }

                    }
                );

        },

        error => {

            console.error(
                "❌ MOTI GO: error escuchando solicitudes:",
                error
            );

        }

    );

}


// =====================================================
// MOSTRAR SOLICITUD
// =====================================================

function mostrarSolicitudPedido(
    pedido
) {

    if (
        !pedido ||
        !pedido.id
    ) {

        return;

    }


    if (
        solicitudesActivas.has(
            pedido.id
        )
    ) {

        return;

    }


    console.log(
        "🔔 MOTI GO - NUEVA SOLICITUD:",
        pedido
    );


    const cantidadProductos =
        Array.isArray(
            pedido.productos
        )
            ? pedido.productos.length
            : 0;


    const cantidadTiendas =
        Array.isArray(
            pedido.tiendas
        )
            ? pedido.tiendas.length
            : 0;


    const total =
        Number(
            pedido.total || 0
        );


    const mensaje =
        `
🛒 NUEVO PEDIDO MOTI GO

Productos: ${cantidadProductos}
Tiendas: ${cantidadTiendas}

Total:
$${total.toFixed(2)}

Pago:
${pedido.pago?.metodo || "efectivo"}

⏱️ Tienes ${TIEMPO_SOLICITUD} segundos para responder.
        `.trim();


    // =============================================
    // MOSTRAR SOLICITUD
    // =============================================

    const respuesta =
        window.confirm(
            mensaje +
            "\n\n¿Quieres aceptar este pedido?"
        );


    if (
        respuesta
    ) {

        aceptarPedido(
            pedido
        );

    }
    else {

        rechazarPedido(
            pedido
        );

    }


    // =============================================
    // TEMPORIZADOR DE SEGURIDAD
    // =============================================
    //
    // El dispatcher también tiene su temporizador.
    //
    // Este temporizador solamente evita que una
    // solicitud quede abierta indefinidamente en
    // la interfaz del repartidor.
    // =============================================

    const temporizador =
        setTimeout(

            () => {

                if (
                    solicitudesActivas.has(
                        pedido.id
                    )
                ) {

                    console.log(
                        "⌛ MOTI GO: solicitud expirada en repartidor:",
                        pedido.id
                    );


                    solicitudesActivas.delete(
                        pedido.id
                    );

                }

            },

            TIEMPO_SOLICITUD * 1000

        );


    solicitudesActivas.set(

        pedido.id,

        {

            pedido,

            temporizador

        }

    );

}


// =====================================================
// ACEPTAR PEDIDO
// =====================================================

async function aceptarPedido(
    pedido
) {

    if (
        !pedido ||
        !pedido.id ||
        !usuarioRepartidor
    ) {

        return;

    }


    try {

        console.log(
            "✅ MOTI GO: aceptando pedido:",
            pedido.id
        );


        const pedidoRef =
            doc(
                db,
                "pedidos",
                pedido.id
            );


        await updateDoc(

            pedidoRef,

            {

                estado:
                    "asignado",

                repartidorId:
                    usuarioRepartidor.uid,

                repartidorNombre:
                    usuarioRepartidor.displayName ||
                    pedido.repartidorNombre ||
                    "",

                fechaAsignacion:
                    serverTimestamp(),

                actualizadoEn:
                    serverTimestamp()

            }

        );


        pedidoActual =
            pedido;


        limpiarSolicitud(
            pedido.id
        );


        console.log(
            "🎉 MOTI GO - PEDIDO ACEPTADO:",
            pedido.id
        );


        console.log(
            "🛵 MOTI GO - REPARTIDOR ASIGNADO:",
            usuarioRepartidor.uid
        );

    }
    catch (
        error
    ) {

        console.error(
            "❌ MOTI GO - ERROR ACEPTANDO PEDIDO:",
            error
        );

    }

}


// =====================================================
// RECHAZAR PEDIDO
// =====================================================
//
// El repartidor NO cancela el pedido.
//
// Solamente rechaza esta oportunidad.
//
// El dispatcher debe continuar con el siguiente
// candidato.
// =====================================================

async function rechazarPedido(
    pedido
) {

    if (
        !pedido ||
        !pedido.id ||
        !usuarioRepartidor
    ) {

        return;

    }


    try {

        console.log(
            "❌ MOTI GO: rechazando pedido:",
            pedido.id
        );


        const pedidoRef =
            doc(
                db,
                "pedidos",
                pedido.id
            );


        // =============================================
        // IMPORTANTE
        // =============================================
        //
        // Regresamos el pedido a pendiente_asignacion.
        //
        // El dispatcher está esperando la respuesta.
        // Cuando detecte el rechazo continuará con
        // el siguiente candidato.
        //
        // =============================================

        await updateDoc(

            pedidoRef,

            {

                estado:
                    "pendiente_asignacion",

                repartidorId:
                    null,

                repartidorNombre:
                    null,

                solicitudRechazadaPor:
                    usuarioRepartidor.uid,

                solicitudRechazadaEn:
                    serverTimestamp(),

                actualizadoEn:
                    serverTimestamp()

            }

        );


        limpiarSolicitud(
            pedido.id
        );


        console.log(
            "↪️ MOTI GO: pedido rechazado, buscando siguiente repartidor."
        );

    }
    catch (
        error
    ) {

        console.error(
            "❌ MOTI GO - ERROR RECHAZANDO PEDIDO:",
            error
        );

    }

}


// =====================================================
// LIMPIAR SOLICITUD
// =====================================================

function limpiarSolicitud(
    pedidoId
) {

    const solicitud =
        solicitudesActivas.get(
            pedidoId
        );


    if (
        solicitud?.temporizador
    ) {

        clearTimeout(
            solicitud.temporizador
        );

    }


    solicitudesActivas.delete(
        pedidoId
    );

}


// =====================================================
// EXPONER FUNCIONES
// =====================================================

window.motiGoRepartidor = {

    iniciar:
        iniciarMotiGoRepartidor,

    aceptarPedido:
        aceptarPedido,

    rechazarPedido:
        rechazarPedido

};


// =====================================================
// INICIO AUTOMÁTICO
// =====================================================

if (
    auth.currentUser
) {

    iniciarMotiGoRepartidor();

}
else {

    auth.onAuthStateChanged(

        usuario => {

            if (
                usuario
            ) {

                iniciarMotiGoRepartidor();

            }

        }

    );

}
