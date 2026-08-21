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
    getDoc,
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

const TIEMPO_SOLICITUD = 15;


// =====================================================
// ESTADO DEL MÓDULO
// =====================================================

let usuarioRepartidor = null;

let pedidoActual = null;

let escuchandoPedidos = false;

let solicitudesActivas = new Map();


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


    await verificarViajeActivo();


    escucharSolicitudesAsignadas();

}


// =====================================================
// VERIFICAR PEDIDO ACTIVO
// =====================================================

async function verificarViajeActivo() {

    if (
        !usuarioRepartidor
    ) {

        return null;

    }


    try {

        const repartidorRef =
            doc(
                db,
                "usuarios",
                usuarioRepartidor.uid
            );


        const snapshot =
            await getDoc(
                repartidorRef
            );


        if (
            !snapshot.exists()
        ) {

            return null;

        }


        const datos =
            snapshot.data();


        if (
            datos.viajeActivo
        ) {

            pedidoActual =
                datos.viajeActivo;


            console.log(
                "🚗 MOTI GO: el repartidor tiene un viaje activo:",
                datos.viajeActivo
            );


            mostrarViajeActivo(
                datos.viajeActivo
            );


            return datos.viajeActivo;

        }


        return null;

    }
    catch (
        error
    ) {

        console.error(
            "❌ MOTI GO: error verificando viaje activo:",
            error
        );

        return null;

    }

}


// =====================================================
// ESCUCHAR SOLICITUDES ASIGNADAS
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
                        // CAMBIO
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
                        // SOLICITUD RETIRADA
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


    // =================================================
    // CREAR MODAL
    // =================================================

    const overlay =
        document.createElement(
            "div"
        );


    overlay.className =
        "moti-go-solicitud-overlay";


    overlay.dataset.pedidoId =
        pedido.id;


    overlay.innerHTML = `

        <div class="moti-go-solicitud-modal">

            <div class="moti-go-solicitud-icono">
                <span class="material-symbols-outlined">
                    shopping_bag
                </span>
            </div>

            <div class="moti-go-solicitud-titulo">
                Nuevo pedido
            </div>

            <div class="moti-go-solicitud-folio">
                ${escaparHTML(
                    pedido.folio ||
                    "Pedido MOTI GO"
                )}
            </div>

            <div class="moti-go-solicitud-info">

                <div class="moti-go-solicitud-dato">

                    <span class="material-symbols-outlined">
                        inventory_2
                    </span>

                    <div>
                        <small>Productos</small>
                        <strong>
                            ${cantidadProductos}
                        </strong>
                    </div>

                </div>


                <div class="moti-go-solicitud-dato">

                    <span class="material-symbols-outlined">
                        store
                    </span>

                    <div>
                        <small>Tiendas</small>
                        <strong>
                            ${cantidadTiendas}
                        </strong>
                    </div>

                </div>

            </div>


            <div class="moti-go-solicitud-total">

                <span>Total del pedido</span>

                <strong>
                    $${total.toFixed(2)}
                </strong>

            </div>


            <div class="moti-go-solicitud-tiempo">

                <div class="moti-go-solicitud-tiempo-texto">

                    <span>
                        Tiempo para responder
                    </span>

                    <strong
                        class="moti-go-contador"
                    >
                        ${TIEMPO_SOLICITUD}
                    </strong>

                </div>

                <div class="moti-go-barra-tiempo">

                    <div
                        class="moti-go-barra-tiempo-progreso"
                    ></div>

                </div>

            </div>


            <div class="moti-go-solicitud-botones">

                <button
                    type="button"
                    class="moti-go-btn-rechazar"
                    data-accion="rechazar"
                >

                    <span class="material-symbols-outlined">
                        close
                    </span>

                    Rechazar

                </button>


                <button
                    type="button"
                    class="moti-go-btn-aceptar"
                    data-accion="aceptar"
                >

                    <span class="material-symbols-outlined">
                        check
                    </span>

                    Aceptar pedido

                </button>

            </div>

        </div>

    `;


    document.body.appendChild(
        overlay
    );


    agregarEstilosSolicitud();


    // =================================================
    // BOTONES
    // =================================================

    const botonAceptar =
        overlay.querySelector(
            '[data-accion="aceptar"]'
        );


    const botonRechazar =
        overlay.querySelector(
            '[data-accion="rechazar"]'
        );


    botonAceptar.addEventListener(
        "click",
        () => {

            aceptarPedido(
                pedido
            );

        }
    );


    botonRechazar.addEventListener(
        "click",
        () => {

            rechazarPedido(
                pedido
            );

        }
    );


    // =================================================
    // TEMPORIZADOR
    // =================================================

    let segundos =
        TIEMPO_SOLICITUD;


    const contador =
        overlay.querySelector(
            ".moti-go-contador"
        );


    const barra =
        overlay.querySelector(
            ".moti-go-barra-tiempo-progreso"
        );


    const intervalo =
        setInterval(
            () => {

                segundos--;


                if (
                    contador
                ) {

                    contador.textContent =
                        segundos;

                }


                if (
                    barra
                ) {

                    const porcentaje =
                        Math.max(
                            0,
                            (segundos /
                                TIEMPO_SOLICITUD) *
                            100
                        );


                    barra.style.width =
                        `${porcentaje}%`;

                }


                if (
                    segundos <= 0
                ) {

                    clearInterval(
                        intervalo
                    );


                    expirarSolicitud(
                        pedido
                    );

                }

            },
            1000
        );


    solicitudesActivas.set(

        pedido.id,

        {

            pedido,

            overlay,

            intervalo

        }

    );

}


// =====================================================
// EXPIRAR SOLICITUD
// =====================================================

function expirarSolicitud(
    pedido
) {

    if (
        !pedido ||
        !pedido.id
    ) {

        return;

    }


    console.log(
        "⌛ MOTI GO: solicitud expirada:",
        pedido.id
    );


    limpiarSolicitud(
        pedido.id
    );


    // IMPORTANTE:
    //
    // No modificamos el pedido desde aquí.
    //
    // El dispatcher es quien controla el
    // tiempo de cada candidato.
    //
    // Cuando cambie el estado de Firebase,
    // el listener retirará la solicitud.


    mostrarAvisoSolicitudExpirada();

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


    // =================================================
    // EVITAR DOS PEDIDOS ACTIVOS
    // =================================================

    if (
        pedidoActual
    ) {

        mostrarAviso(
            "Ya tienes un pedido activo.",
            "Finaliza el pedido actual antes de aceptar otro."
        );

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


        // =================================================
        // VERIFICAR NUEVAMENTE EL PEDIDO EN FIREBASE
        // =================================================

        const pedidoSnapshot =
            await getDoc(
                pedidoRef
            );


        if (
            !pedidoSnapshot.exists()
        ) {

            limpiarSolicitud(
                pedido.id
            );

            return;

        }


        const datosActuales =
            pedidoSnapshot.data();


        if (
            datosActuales.estado !==
            "solicitud_repartidor"
            ||
            datosActuales.repartidorId !==
            usuarioRepartidor.uid
        ) {

            mostrarAviso(
                "Solicitud no disponible",
                "Este pedido ya no está disponible."
            );


            limpiarSolicitud(
                pedido.id
            );


            return;

        }


        // =================================================
        // ACEPTAR
        // =================================================

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
{
    id:
        pedido.id,

    ...datosActuales,

    estado:
        "asignado",

    repartidorId:
        usuarioRepartidor.uid,

    repartidorNombre:
        usuarioRepartidor.displayName ||
        pedido.repartidorNombre ||
        ""
};


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


        // =================================================
        // GUARDAR VIAJE ACTIVO
        // =================================================

        try {

            const repartidorRef =
                doc(
                    db,
                    "usuarios",
                    usuarioRepartidor.uid
                );


            await updateDoc(

                repartidorRef,

                {

                    viajeActivo:
                        {

                            pedidoId:
                                pedido.id,

                            estado:
                                "asignado",

                            iniciadoEn:
                                serverTimestamp()

                        },

                    estadoServicio:
                        "ocupado",

                    actualizadoEn:
                        serverTimestamp()

                }

            );


            console.log(
                "📌 MOTI GO: viaje activo guardado."
            );

        }
        catch (
            errorViaje
        ) {

            console.error(
                "⚠️ MOTI GO: no se pudo guardar viaje activo:",
                errorViaje
            );

        }


        mostrarAviso(
            "Pedido aceptado",
            "El pedido ha sido asignado a ti."
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


        const pedidoSnapshot =
            await getDoc(
                pedidoRef
            );


        if (
            !pedidoSnapshot.exists()
        ) {

            limpiarSolicitud(
                pedido.id
            );

            return;

        }


        const datosActuales =
            pedidoSnapshot.data();


        if (
            datosActuales.estado !==
            "solicitud_repartidor"
            ||
            datosActuales.repartidorId !==
            usuarioRepartidor.uid
        ) {

            limpiarSolicitud(
                pedido.id
            );

            return;

        }


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
        !solicitud
    ) {

        return;

    }


    if (
        solicitud.intervalo
    ) {

        clearInterval(
            solicitud.intervalo
        );

    }


    if (
        solicitud.overlay
    ) {

        solicitud.overlay.remove();

    }


    solicitudesActivas.delete(
        pedidoId
    );

}


// =====================================================
// VIAJE ACTIVO
// =====================================================

function mostrarViajeActivo(
    viaje
) {

    if (
        !viaje
    ) {

        return;

    }


    console.log(
        "🚗 MOTI GO: mostrando viaje activo:",
        viaje
    );


    // Por ahora dejamos el registro preparado.
    //
    // En el siguiente paso recuperaremos la
    // pantalla completa del viaje activo del MOTI
    // original.

}


// =====================================================
// AVISO
// =====================================================

function mostrarAviso(
    titulo,
    descripcion
) {

    const anterior =
        document.querySelector(
            ".moti-go-aviso"
        );


    if (
        anterior
    ) {

        anterior.remove();

    }


    const aviso =
        document.createElement(
            "div"
        );


    aviso.className =
        "moti-go-aviso";


    aviso.innerHTML = `

        <div class="moti-go-aviso-contenido">

            <span class="material-symbols-outlined">
                check_circle
            </span>

            <strong>
                ${escaparHTML(
                    titulo
                )}
            </strong>

            <p>
                ${escaparHTML(
                    descripcion
                )}
            </p>

        </div>

    `;


    document.body.appendChild(
        aviso
    );


    setTimeout(
        () => {

            aviso.classList.add(
                "moti-go-aviso-saliendo"
            );


            setTimeout(
                () => {

                    aviso.remove();

                },
                300
            );

        },
        2500
    );

}


// =====================================================
// AVISO SOLICITUD EXPIRADA
// =====================================================

function mostrarAvisoSolicitudExpirada() {

    mostrarAviso(
        "Solicitud expirada",
        "El tiempo para responder terminó."
    );

}


// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHTML(
    texto
) {

    return String(
        texto ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// =====================================================
// ESTILOS DE SOLICITUD
// =====================================================

function agregarEstilosSolicitud() {

    if (
        document.getElementById(
            "moti-go-estilos-solicitud"
        )
    ) {

        return;

    }


    const estilos =
        document.createElement(
            "style"
        );


    estilos.id =
        "moti-go-estilos-solicitud";


    estilos.textContent = `

        .moti-go-solicitud-overlay {

            position: fixed;

            inset: 0;

            z-index: 99999;

            display: flex;

            align-items: center;

            justify-content: center;

            padding: 20px;

            background:
                rgba(15, 23, 42, .58);

            backdrop-filter:
                blur(5px);

            animation:
                motiGoAparecer .22s ease;

        }


        .moti-go-solicitud-modal {

            width: min(
                430px,
                100%
            );

            background:
                #ffffff;

            border-radius:
                24px;

            padding:
                24px;

            box-shadow:
                0 20px 60px
                rgba(0,0,0,.25);

            font-family:
                system-ui,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                sans-serif;

        }


        .moti-go-solicitud-icono {

            width:
                62px;

            height:
                62px;

            margin:
                0 auto 14px;

            border-radius:
                20px;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            background:
                #e8f5e9;

            color:
                #16a34a;

        }


        .moti-go-solicitud-icono
        .material-symbols-outlined {

            font-size:
                32px;

        }


        .moti-go-solicitud-titulo {

            text-align:
                center;

            font-size:
                23px;

            font-weight:
                800;

            color:
                #111827;

        }


        .moti-go-solicitud-folio {

            text-align:
                center;

            margin-top:
                5px;

            font-size:
                13px;

            color:
                #6b7280;

        }


        .moti-go-solicitud-info {

            display:
                grid;

            grid-template-columns:
                1fr 1fr;

            gap:
                12px;

            margin-top:
                22px;

        }


        .moti-go-solicitud-dato {

            display:
                flex;

            align-items:
                center;

            gap:
                10px;

            padding:
                13px;

            border-radius:
                16px;

            background:
                #f8fafc;

        }


        .moti-go-solicitud-dato
        .material-symbols-outlined {

            font-size:
                25px;

            color:
                #475569;

        }


        .moti-go-solicitud-dato
        small {

            display:
                block;

            color:
                #64748b;

            font-size:
                11px;

        }


        .moti-go-solicitud-dato
        strong {

            display:
                block;

            margin-top:
                2px;

            color:
                #0f172a;

            font-size:
                17px;

        }


        .moti-go-solicitud-total {

            display:
                flex;

            align-items:
                center;

            justify-content:
                space-between;

            margin-top:
                14px;

            padding:
                16px;

            border-radius:
                16px;

            background:
                #f1f5f9;

        }


        .moti-go-solicitud-total span {

            font-size:
                13px;

            color:
                #64748b;

        }


        .moti-go-solicitud-total strong {

            font-size:
                22px;

            color:
                #111827;

        }


        .moti-go-solicitud-tiempo {

            margin-top:
                18px;

        }


        .moti-go-solicitud-tiempo-texto {

            display:
                flex;

            justify-content:
                space-between;

            align-items:
                center;

            font-size:
                12px;

            color:
                #64748b;

        }


        .moti-go-solicitud-tiempo-texto strong {

            font-size:
                18px;

            color:
                #111827;

        }


        .moti-go-barra-tiempo {

            height:
                7px;

            margin-top:
                8px;

            overflow:
                hidden;

            border-radius:
                99px;

            background:
                #e5e7eb;

        }


        .moti-go-barra-tiempo-progreso {

            width:
                100%;

            height:
                100%;

            border-radius:
                inherit;

            background:
                #16a34a;

            transition:
                width 1s linear;

        }


        .moti-go-solicitud-botones {

            display:
                grid;

            grid-template-columns:
                1fr 1.4fr;

            gap:
                10px;

            margin-top:
                22px;

        }


        .moti-go-solicitud-botones button {

            border:
                0;

            min-height:
                50px;

            border-radius:
                15px;

            font-size:
                14px;

            font-weight:
                750;

            cursor:
                pointer;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            gap:
                7px;

        }


        .moti-go-btn-rechazar {

            background:
                #f1f5f9;

            color:
                #475569;

        }


        .moti-go-btn-aceptar {

            background:
                #16a34a;

            color:
                #ffffff;

        }


        .moti-go-solicitud-botones button:active {

            transform:
                scale(.98);

        }


        .moti-go-aviso {

            position:
                fixed;

            left:
                50%;

            bottom:
                24px;

            transform:
                translateX(-50%);

            z-index:
                100000;

            width:
                min(
                    380px,
                    calc(100% - 30px)
                );

            animation:
                motiGoSubir .25s ease;

        }


        .moti-go-aviso-contenido {

            display:
                flex;

            flex-direction:
                column;

            align-items:
                center;

            text-align:
                center;

            padding:
                18px;

            border-radius:
                18px;

            background:
                #ffffff;

            box-shadow:
                0 15px 45px
                rgba(0,0,0,.22);

        }


        .moti-go-aviso-contenido
        .material-symbols-outlined {

            font-size:
                30px;

            color:
                #16a34a;

        }


        .moti-go-aviso-contenido
        strong {

            margin-top:
                6px;

            color:
                #111827;

        }


        .moti-go-aviso-contenido
        p {

            margin:
                4px 0 0;

            color:
                #64748b;

            font-size:
                13px;

        }


        .moti-go-aviso-saliendo {

            opacity:
                0;

            transition:
                opacity .3s ease;

        }


        @keyframes motiGoAparecer {

            from {

                opacity:
                    0;

                transform:
                    scale(.97);

            }

            to {

                opacity:
                    1;

                transform:
                    scale(1);

            }

        }


        @keyframes motiGoSubir {

            from {

                opacity:
                    0;

                transform:
                    translate(
                        -50%,
                        20px
                    );

            }

            to {

                opacity:
                    1;

                transform:
                    translate(
                        -50%,
                        0
                    );

            }

        }


        @media (
            max-width: 480px
        ) {

            .moti-go-solicitud-modal {

                padding:
                    20px;

                border-radius:
                    22px;

            }


            .moti-go-solicitud-titulo {

                font-size:
                    21px;

            }

        }

    `;


    document.head.appendChild(
        estilos
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
        rechazarPedido,

    verificarViajeActivo:
        verificarViajeActivo

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
