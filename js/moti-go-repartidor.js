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
// ESTADO DEL MÓDULO
// =====================================================

let usuarioRepartidor = null;

let pedidoActual = null;

let escuchandoPedidos = false;

let pedidosEscuchados = new Set();


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


    escucharPedidosDisponibles();

}


// =====================================================
// ESCUCHAR PEDIDOS DISPONIBLES
// =====================================================

function escucharPedidosDisponibles() {

    if (
        escuchandoPedidos
    ) {

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
                "pendiente_asignacion"
            )
        );


    onSnapshot(
        pedidosQuery,
        snapshot => {

            console.log(
                "📦 MOTI GO - PEDIDOS DISPONIBLES:",
                snapshot.size
            );


            snapshot.docChanges()
                .forEach(
                    cambio => {

                        if (
                            cambio.type !==
                            "added"
                        ) {

                            return;

                        }


                        const pedido = {

                            id:
                                cambio.doc.id,

                            ...cambio.doc.data()

                        };


                        if (
                            pedidosEscuchados.has(
                                pedido.id
                            )
                        ) {

                            return;

                        }


                        pedidosEscuchados.add(
                            pedido.id
                        );


                        mostrarSolicitudPedido(
                            pedido
                        );

                    }
                );

        },
        error => {

            console.error(
                "❌ MOTI GO: error escuchando pedidos:",
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

    console.log(
        "🔔 MOTI GO - NUEVO PEDIDO:",
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


    const mensaje =
        `
🛒 NUEVO PEDIDO MOTI GO

Productos: ${cantidadProductos}
Tiendas: ${cantidadTiendas}

Total:
$${Number(
    pedido.total || 0
).toFixed(2)}

Pago:
${pedido.pago?.metodo || "efectivo"}
        `.trim();


    alert(
        mensaje
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
        !pedido.id
    ) {

        return;

    }


    try {

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
                    "",

                fechaAsignacion:
                    serverTimestamp(),

                actualizadoEn:
                    serverTimestamp()

            }
        );


        pedidoActual =
            pedido;


        console.log(
            "✅ MOTI GO - PEDIDO ACEPTADO:",
            pedido.id
        );

    }
    catch (error) {

        console.error(
            "❌ MOTI GO - ERROR ACEPTANDO PEDIDO:",
            error
        );

    }

}


// =====================================================
// EXPONER FUNCIONES
// =====================================================

window.motiGoRepartidor = {

    iniciar:
        iniciarMotiGoRepartidor,

    aceptarPedido:
        aceptarPedido

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
