import {
    auth,
    db
} from "./firebase-config.js";

import {
    collection,
    addDoc,
    serverTimestamp,
    getDocs,
    doc,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// =====================================================
// MOTOR DE ASIGNACIÓN MOTI GO
// =====================================================

import {
    ejecutarMotor
}
from "./motor/motor-asignacion.js";

import {
    iniciarDispatcher
}
from "./dispatcher/dispatcher.js";


// =====================================================
// MOTI GO
// GESTIÓN DE PEDIDOS DEL CLIENTE
// =====================================================
//
// Este archivo es exclusivo de MOTI GO.
//
// RESPONSABILIDADES ACTUALES:
//
// 1. Leer el carrito local.
// 2. Abrir el panel de revisión.
// 3. Reconstruir los productos del carrito.
// 4. Agrupar productos por tienda.
// 5. Calcular subtotal.
// 6. Mostrar costo de entrega.
// 7. Mostrar total.
// 8. Preparar el punto de entrada para:
//
//       validar inventario
//       reservar inventario
//       crear pedido
//       generar folio
//       generar código
//       asignar repartidor
//
// IMPORTANTE:
//
// En esta primera versión NO:
//
// - modifica inventarios;
// - crea pedidos en Firebase;
// - asigna repartidores;
// - genera códigos;
// - descuenta existencias.
//
// Primero validamos visualmente el pedido.
// =====================================================


// =====================================================
// ESTADO
// =====================================================

let pedidoCarrito =
    {};

let pedidoProductos =
    [];

let pedidoTiendas =
    [];

let pedidoCliente =
    null;


  function inicializarMotiGoPedido() {

    console.log(
        "🛍️ MOTI GO PEDIDOS INICIADO"
    );

}


// =====================================================
// CARGAR CARRITO
// =====================================================

function cargarCarritoPedido() {

    try {

        const guardado =
            localStorage.getItem(
                "motiCarrito"
            );


        if (
            !guardado
        ) {

            pedidoCarrito =
                {};

            return;

        }


        const datos =
            JSON.parse(
                guardado
            );


        if (
            !datos ||
            typeof datos !==
            "object"
        ) {

            pedidoCarrito =
                {};

            return;

        }


        pedidoCarrito =
            datos;

    }
    catch (
        error
    ) {

        console.error(
            "❌ MOTI GO: error leyendo carrito:",
            error
        );


        pedidoCarrito =
            {};

    }

}


// =====================================================
// OBTENER PRODUCTOS DEL CARRITO
// =====================================================
//
// El carrito actual utiliza dos formatos:
//
// 1. Producto de la tienda actual:
//
//    {
//        productoId: cantidad
//    }
//
// 2. Producto de otra tienda:
//
//    {
//        productoId_tiendaId: {
//            productoId,
//            tiendaId,
//            cantidad,
//            precio,
//            nombre,
//            existencia
//        }
//    }
//
// No modificamos ninguno de los dos formatos.
// Aquí solamente los convertimos a una estructura
// uniforme para trabajar con el pedido.
// =====================================================

function obtenerProductosDelCarrito(
    carritoActual,
    productosDisponibles,
    tiendasDisponiblesActuales
) {

    const productosPedido =
        [];


    Object.values(
        carritoActual || {}
    ).forEach(
        item => {

            if (
                !item ||
                !item.productoId ||
                !item.tiendaId
            ) {

                return;

            }


            const cantidad =
                Number(
                    item.cantidad ||
                    0
                );


            if (
                cantidad <=
                0
            ) {

                return;

            }


            // =================================================
            // BUSCAR PRODUCTO MAESTRO
            // =================================================

            const producto =
                productosDisponibles.find(
                    productoItem =>
                        productoItem.id ===
                        item.productoId
                );


            // =================================================
            // NOMBRE
            // =================================================

            const nombre =
                producto?.nombre ||
                item.nombre ||
                "Producto";


            // =================================================
            // PRECIO
            // =================================================

            const precio =
                Number(
                    item.precio ??
                    producto?.precio ??
                    0
                );


            // =================================================
            // TIENDA
            // =================================================

            const tienda =
                tiendasDisponiblesActuales.find(
                    tiendaItem =>
                        tiendaItem.id ===
                        item.tiendaId
                );


            const tiendaNombre =
                tienda?.nombre ||
                "Tienda";


            // =================================================
            // AGREGAR PRODUCTO
            // =================================================

            productosPedido.push({

                productoId:
                    item.productoId,

                tiendaId:
                    item.tiendaId,

                tiendaNombre:
                    tiendaNombre,

                cantidad:
                    cantidad,

                precio:
                    precio,

                nombre:
                    nombre,

                existencia:
                    item.existencia !==
                    undefined
                        ? Number(
                            item.existencia
                        )
                        : null

            });

        }
    );


    return productosPedido;

}


// =====================================================
// AGRUPAR POR TIENDA
// =====================================================

function agruparProductosPorTienda(
    productosPedido
) {

    const grupos =
        {};


    productosPedido.forEach(
        producto => {

            const tiendaId =
                producto.tiendaId;


            if (
                !grupos[
                    tiendaId
                ]
            ) {

                grupos[
                    tiendaId
                ] = {

                    tiendaId:
                        tiendaId,

                    nombre:
                        producto.tiendaNombre ||
                        "Tienda",

                    productos:
                        []

                };

            }


            grupos[
                tiendaId
            ].productos.push(
                producto
            );

        }
    );


    return Object.values(
        grupos
    );

}


// =====================================================
// CALCULAR SUBTOTAL
// =====================================================

function calcularSubtotalPedido(
    productosPedido
) {

    return productosPedido.reduce(
        (
            total,
            producto
        ) => {

            return (
                total +
                (
                    Number(
                        producto.precio
                    ) *
                    Number(
                        producto.cantidad
                    )
                )
            );

        },
        0
    );

}


// =====================================================
// COSTO DE ENTREGA
// =====================================================
//
// POR AHORA utilizamos el valor que actualmente maneja
// MOTI GO para el servicio.
//
// Más adelante NO quedará fijo aquí.
//
// Será calculado por el sistema de asignación según:
//
// - distancia;
// - cantidad de tiendas;
// - zona;
// - tipo de servicio;
// - configuración de MOTI GO.
//
// =====================================================

function obtenerCostoEntregaPedido() {

    return 10;

}


// =====================================================
// FORMATEAR PRECIO
// =====================================================

function formatearPrecioPedido(
    precio
) {

    return new Intl.NumberFormat(
        "es-MX",
        {
            style:
                "currency",

            currency:
                "MXN",

            minimumFractionDigits:
                2
        }
    ).format(
        Number(
            precio
        ) ||
        0
    );

}


// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHTMLPedido(
    texto
) {

    return String(
        texto ??
        ""
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
// CREAR PANEL
// =====================================================

function crearPanelRevisionPedido() {

    let panel =
        document.getElementById(
            "motiGoPedidoPanel"
        );


    if (
        panel
    ) {

        return panel;

    }


    panel =
        document.createElement(
            "div"
        );


    panel.id =
        "motiGoPedidoPanel";


    panel.innerHTML = `

        <div
            class="moti-go-pedido-overlay"
            id="motiGoPedidoOverlay"
        >

            <div
                class="moti-go-pedido-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="motiGoPedidoTitulo"
            >

                <div
                    class="moti-go-pedido-header"
                >

                    <div>

                        <span
                            class="moti-go-pedido-kicker"
                        >
                            MOTI GO
                        </span>

                        <h2
                            id="motiGoPedidoTitulo"
                        >
                            Revisar pedido
                        </h2>

                    </div>


                    <button
                        type="button"
                        id="motiGoPedidoCerrar"
                        aria-label="Cerrar"
                    >
                        ×
                    </button>

                </div>


                <div
                    id="motiGoPedidoContenido"
                    class="moti-go-pedido-contenido"
                ></div>


                <div
                    class="moti-go-pedido-footer"
                >

                    <button
                        type="button"
                        id="motiGoPedidoConfirmar"
                    >
                        Confirmar pedido
                    </button>

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        panel
    );


    // =================================================
    // CERRAR
    // =================================================

    const cerrar =
        document.getElementById(
            "motiGoPedidoCerrar"
        );


    if (
        cerrar
    ) {

        cerrar.addEventListener(
            "click",
            cerrarRevisionPedido
        );

    }


    const overlay =
        document.getElementById(
            "motiGoPedidoOverlay"
        );


    if (
        overlay
    ) {

        overlay.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    overlay
                ) {

                    cerrarRevisionPedido();

                }

            }
        );

    }


    // =================================================
    // ESC
    // =================================================

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                const panelActual =
                    document.getElementById(
                        "motiGoPedidoPanel"
                    );


                if (
                    panelActual
                ) {

                    cerrarRevisionPedido();

                }

            }

        }
    );


    // =================================================
    // CONFIRMAR
    // =================================================

    const confirmar =
        document.getElementById(
            "motiGoPedidoConfirmar"
        );


    if (
        confirmar
    ) {

        confirmar.addEventListener(
            "click",
            () => {

                prepararConfirmacionPedido();

            }
        );

    }


    // =================================================
    // ESTILOS
    // =================================================

    agregarEstilosPanelPedido();


    return panel;

}


window.abrirRevisionPedido = function (
    carritoActual,
    productosActuales,
    tiendasActuales,
    clienteActual
) {

    // =================================================
    // GUARDAR LOS DATOS ACTUALES DEL DASHBOARD
    // =================================================

    pedidoCarrito =
        carritoActual || {};

    pedidoProductos =
    productosActuales || [];

    pedidoTiendas =
    tiendasActuales || [];

    pedidoCliente =
    clienteActual || null;


    const productosDisponibles =
        productosActuales || [];


    const tiendasDisponiblesActuales =
        tiendasActuales || [];


    // =================================================
    // OBTENER PRODUCTOS REALES DEL CARRITO
    // =================================================

    const productosPedido =
        obtenerProductosDelCarrito(
            pedidoCarrito,
            productosDisponibles,
            tiendasDisponiblesActuales
        );


    if (
        productosPedido.length ===
        0
    ) {

        console.warn(
            "🛒 MOTI GO: el carrito está vacío."
        );

        return;

    }


    // =================================================
    // CREAR / OBTENER PANEL
    // =================================================

    const panel =
        crearPanelRevisionPedido();


    // =================================================
    // MOSTRAR CONTENIDO
    // =================================================

    renderizarRevisionPedido(
        productosPedido,
        tiendasDisponiblesActuales
    );


    // =================================================
    // MOSTRAR PANEL
    // =================================================

    panel.style.display =
        "block";


    document.body.style.overflow =
        "hidden";


    console.log(
        "🧾 MOTI GO: revisión de pedido abierta.",
        productosPedido
    );

}


// =====================================================
// CERRAR PANEL
// =====================================================

function cerrarRevisionPedido() {

    const panel =
        document.getElementById(
            "motiGoPedidoPanel"
        );


    if (
        panel
    ) {

        panel.style.display =
            "none";

    }


    document.body.style.overflow =
        "";

}

// =====================================================
// MOSTRAR ESTADO: BUSCANDO REPARTIDOR
// =====================================================

function mostrarBuscandoRepartidorMotiGo(
    pedido
) {

    // -----------------------------------------
    // CERRAR REVISIÓN DEL PEDIDO
    // -----------------------------------------

    cerrarRevisionPedido();


    // -----------------------------------------
    // ELIMINAR PANEL ANTERIOR
    // -----------------------------------------

    const panelAnterior =
        document.getElementById(
            "motiGoBuscandoRepartidor"
        );


    if (
        panelAnterior
    ) {

        panelAnterior.remove();

    }


    // -----------------------------------------
    // CREAR PANEL
    // -----------------------------------------

    const panel =
        document.createElement(
            "div"
        );


    panel.id =
        "motiGoBuscandoRepartidor";


    panel.innerHTML = `

        <div
            class="moti-go-buscando-overlay"
        >

            <div
                class="moti-go-buscando-panel"
            >

                <div
                    class="moti-go-buscando-icono"
                >

                    <span
                        class="material-symbols-outlined"
                    >
                        delivery_dining
                    </span>

                </div>


                <h2>
                    Buscando repartidor
                </h2>


                <p>
                    Estamos buscando un repartidor
                    disponible para llevar tu pedido.
                </p>


                <div
                    class="moti-go-buscando-folio"
                >

                    <span>
                        Pedido
                    </span>

                    <strong>
                        ${escaparHTMLPedido(
                            pedido.folio
                        )}
                    </strong>

                </div>


                <div
                    class="moti-go-buscando-cargando"
                    aria-label="Buscando repartidor"
                >

                    <span></span>
                    <span></span>
                    <span></span>

                </div>


                <p
                    class="moti-go-buscando-ayuda"
                >
                    Te avisaremos cuando un
                    repartidor acepte tu pedido.
                </p>

            </div>

        </div>

    `;


    document.body.appendChild(
        panel
    );


    agregarEstilosBuscandoRepartidorMotiGo();


    console.log(
        "🕐 MOTI GO: buscando repartidor para:",
        pedido.folio
    );

}

// =====================================================
// ESTILOS - BUSCANDO REPARTIDOR
// =====================================================

function agregarEstilosBuscandoRepartidorMotiGo() {

    if (
        document.getElementById(
            "motiGoBuscandoRepartidorEstilos"
        )
    ) {

        return;

    }


    const estilos =
        document.createElement(
            "style"
        );


    estilos.id =
        "motiGoBuscandoRepartidorEstilos";


    estilos.textContent = `

        #motiGoBuscandoRepartidor {

            position:
                fixed;

            inset:
                0;

            z-index:
                100000;

        }


        .moti-go-buscando-overlay {

            position:
                absolute;

            inset:
                0;

            background:
                rgba(
                    0,
                    0,
                    0,
                    0.52
                );

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            padding:
                20px;

        }


        .moti-go-buscando-panel {

            width:
                min(
                    100%,
                    380px
                );

            background:
                #ffffff;

            border-radius:
                24px;

            padding:
                32px 24px;

            text-align:
                center;

            box-shadow:
                0
                20px
                60px
                rgba(
                    0,
                    0,
                    0,
                    0.22
                );

        }


        .moti-go-buscando-icono {

            width:
                76px;

            height:
                76px;

            margin:
                0
                auto
                20px;

            border-radius:
                50%;

            background:
                #f1f5f3;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

        }


        .moti-go-buscando-icono span {

            font-size:
                42px;

        }


        .moti-go-buscando-panel h2 {

            margin:
                0
                0
                10px;

            font-size:
                24px;

            color:
                #111111;

        }


        .moti-go-buscando-panel > p {

            margin:
                0;

            color:
                #666666;

            line-height:
                1.5;

        }


        .moti-go-buscando-folio {

            margin:
                22px 0;

            padding:
                14px;

            border-radius:
                14px;

            background:
                #f7f7f7;

            display:
                flex;

            flex-direction:
                column;

            gap:
                4px;

        }


        .moti-go-buscando-folio span {

            font-size:
                12px;

            color:
                #777777;

        }


        .moti-go-buscando-folio strong {

            font-size:
                15px;

            color:
                #111111;

            word-break:
                break-word;

        }


        .moti-go-buscando-cargando {

            display:
                flex;

            justify-content:
                center;

            gap:
                7px;

            margin:
                20px 0;

        }


        .moti-go-buscando-cargando span {

            width:
                8px;

            height:
                8px;

            border-radius:
                50%;

            background:
                #111111;

            animation:
                motiGoPunto
                1.2s
                infinite
                ease-in-out;

        }


        .moti-go-buscando-cargando span:nth-child(2) {

            animation-delay:
                .15s;

        }


        .moti-go-buscando-cargando span:nth-child(3) {

            animation-delay:
                .30s;

        }


        .moti-go-buscando-ayuda {

            font-size:
                13px !important;

        }


        @keyframes motiGoPunto {

            0%,
            80%,
            100% {

                opacity:
                    .3;

                transform:
                    translateY(0);

            }

            40% {

                opacity:
                    1;

                transform:
                    translateY(-5px);

            }

        }

    `;


    document.head.appendChild(
        estilos
    );

}


// =====================================================
// RENDERIZAR REVISIÓN
// =====================================================

function renderizarRevisionPedido(
    productosPedido
) {

    const contenido =
        document.getElementById(
            "motiGoPedidoContenido"
        );


    if (
        !contenido
    ) {

        return;

    }


    const grupos =
        agruparProductosPorTienda(
            productosPedido
        );


    const subtotal =
        calcularSubtotalPedido(
            productosPedido
        );


    const costoEntrega =
        obtenerCostoEntregaPedido();


    const total =
        subtotal +
        costoEntrega;


    let html =
        "";


    // =================================================
    // PRODUCTOS
    // =================================================

    grupos.forEach(
        grupo => {

            html += `

                <section
                    class="moti-go-tienda-pedido"
                >

                    <div
                        class="moti-go-tienda-titulo"
                    >

                        <span
                            class="material-symbols-outlined"
                        >
                            store
                        </span>

                        <strong>
                            ${escaparHTMLPedido(
                                grupo.nombre
                            )}
                        </strong>

                    </div>

            `;


            grupo.productos.forEach(
                producto => {

                    const importe =
                        Number(
                            producto.precio
                        ) *
                        Number(
                            producto.cantidad
                        );


                    html += `

                        <div
                            class="moti-go-producto-pedido"
                        >

                            <div>

                                <strong>
                                    ${escaparHTMLPedido(
                                        producto.nombre
                                    )}
                                </strong>

                                <span>
                                    ${producto.cantidad}
                                    ×
                                    ${formatearPrecioPedido(
                                        producto.precio
                                    )}
                                </span>

                            </div>


                            <b>
                                ${formatearPrecioPedido(
                                    importe
                                )}
                            </b>

                        </div>

                    `;

                }
            );


            html += `

                </section>

            `;

        }
    );


    // =================================================
    // RESUMEN
    // =================================================

    html += `

        <section
            class="moti-go-resumen-pedido"
        >

            <div>

                <span>
                    Productos
                </span>

                <strong>
                    ${formatearPrecioPedido(
                        subtotal
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Servicio de entrega
                </span>

                <strong>
                    ${formatearPrecioPedido(
                        costoEntrega
                    )}
                </strong>

            </div>


            <div
                class="moti-go-total-pedido"
            >

                <span>
                    Total
                </span>

                <strong>
                    ${formatearPrecioPedido(
                        total
                    )}
                </strong>

            </div>

        </section>


        <section
            class="moti-go-pago-pedido"
        >

            <span
                class="material-symbols-outlined"
            >
                payments
            </span>

            <div>

                <strong>
                    Pago en efectivo
                </strong>

                <span>
                    Pagarás al recibir tu pedido.
                </span>

            </div>

        </section>

    `;


    contenido.innerHTML =
        html;


    // =================================================
    // MOSTRAR BOTÓN
    // =================================================

    const confirmar =
        document.getElementById(
            "motiGoPedidoConfirmar"
        );


    if (
        confirmar
    ) {

        confirmar.disabled =
            false;

        confirmar.textContent =
            "Confirmar pedido";

    }

}

// =====================================================
// OBTENER REPARTIDORES PARA EL MOTOR
// =====================================================
//
// Traemos los usuarios que tienen tipo "repartidor".
//
// NO filtramos aquí por disponibilidad.
//
// Eso lo hace el propio motor mediante:
//
// buscarConductores()
//      ↓
// estadoServicio === "disponible"
//
// Así mantenemos separadas las responsabilidades.
// =====================================================

async function obtenerRepartidoresParaMotorMotiGo() {

    console.log(
        "🔎 MOTI GO: buscando repartidores registrados..."
    );


    const snapshot =
        await getDocs(
            collection(
                db,
                "usuarios"
            )
        );


    const repartidores =
        [];


    snapshot.forEach(
        docSnap => {

            const datos =
                docSnap.data();


            if (
                datos.tipo !==
                "repartidor"
            ) {

                return;

            }


            repartidores.push({

                id:
                    docSnap.id,

                ...datos

            });

        }
    );


    console.log(
        "👥 MOTI GO: repartidores registrados encontrados:",
        repartidores.length
    );


    console.log(
        "👥 MOTI GO: repartidores:",
        repartidores
    );


    return repartidores;

}


// =====================================================
// EJECUTAR MOTOR DE ASIGNACIÓN
// =====================================================
//
// Este paso solamente calcula los candidatos.
//
// TODAVÍA NO enviamos la solicitud al repartidor.
//
// Eso lo hará el dispatcher en el siguiente paso.
// =====================================================

async function ejecutarAsignacionInicialMotiGo(
    pedido
) {

    console.log("");
    console.log(
        "🛒 MOTI GO: iniciando motor de asignación..."
    );


    try {

        // =============================================
        // VALIDAR UBICACIÓN
        // =============================================

        if (
            !pedido?.destino
        ) {

            console.warn(
                "⚠️ MOTI GO: el pedido no tiene destino."
            );

            return null;

        }


        const clienteMotor = {

            latitud:
                Number(
                    pedido.destino.latitud
                ),

            longitud:
                Number(
                    pedido.destino.longitud
                )

        };


        // =============================================
        // OBTENER REPARTIDORES
        // =============================================

        const repartidores =
            await obtenerRepartidoresParaMotorMotiGo();


        if (
            repartidores.length ===
            0
        ) {

            console.warn(
                "⚠️ MOTI GO: no existen repartidores registrados."
            );

            return {

                mejorRepartidor:
                    null,

                candidatos:
                    [],

                grupos:
                    [],

                estadisticas: {

                    registrados:
                        0,

                    disponibles:
                        0,

                    candidatos:
                        0,

                    grupos:
                        0

                }

            };

        }


        // =============================================
        // EJECUTAR MOTOR
        // =============================================

        const resultado =
            ejecutarMotor(

                repartidores,

                pedido,

                clienteMotor

            );


        // =============================================
        // MOSTRAR LOG DEL MOTOR
        // =============================================

        console.log("");

        console.log(
            "📊 MOTI GO - RESULTADO DEL MOTOR"
        );


        console.log(
            "--------------------------------"
        );


        if (
            Array.isArray(
                resultado.log
            )
        ) {

            resultado.log.forEach(
                linea => {

                    console.log(
                        linea
                    );

                }
            );

        }


        console.log(
            "--------------------------------"
        );


        console.log(
            "📊 MOTI GO - ESTADÍSTICAS:",
            resultado.estadisticas
        );


        console.log(
            "🎯 MOTI GO - MEJOR REPARTIDOR:",
            resultado.mejorRepartidor
        );


        console.log(
            "👥 MOTI GO - CANDIDATOS:",
            resultado.candidatos
        );


        console.log(
            "📦 MOTI GO - GRUPOS:",
            resultado.grupos
        );


        return resultado;

    }
    catch (
        error
    ) {

        console.error(
            "❌ MOTI GO: error ejecutando motor de asignación:",
            error
        );


        return null;

    }

}

// =====================================================
// PREPARAR CONFIRMACIÓN
// =====================================================
//
// TODAVÍA NO CREA EL PEDIDO.
//
// Esta función solamente deja preparado el punto
// donde posteriormente haremos:
//
// validar inventario
// ↓
// reservar
// ↓
// crear pedido
// ↓
// asignar repartidor
//
// =====================================================



// =====================================================
// RESERVAR INVENTARIO DEL PEDIDO
// =====================================================
//
// Reserva las unidades solicitadas utilizando una
// transacción de Firestore.
//
// IMPORTANTE:
//
// existencia = inventario físico
// reservado  = unidades apartadas para pedidos activos
//
// Disponible real:
//
// existencia - reservado
//
// Ejemplo:
//
// existencia: 20
// reservado:  3
// disponible: 17
//
// =====================================================

async function reservarInventarioPedido(
    transaction,
    productosPedido
) {

    console.log(
        "📦 MOTI GO: verificando inventario real..."
    );


    const inventarios = [];


    // =================================================
    // OBTENER REFERENCIAS
    // =================================================

    productosPedido.forEach(
        producto => {

            const inventarioId =
                `${producto.tiendaId}_${producto.productoId}`;


            const referencia =
                doc(
                    db,
                    "inventarios",
                    inventarioId
                );


            inventarios.push({

                producto,

                referencia

            });

        }
    );


    // =================================================
    // LEER INVENTARIOS
    // =================================================

    const snapshots = [];


    for (
        const item
        of inventarios
    ) {

        const snapshot =
            await transaction.get(
                item.referencia
            );


        snapshots.push({

            ...item,

            snapshot

        });

    }


    // =================================================
    // VALIDAR TODOS LOS PRODUCTOS
    // =================================================

    const problemas = [];


    snapshots.forEach(
        item => {

            if (
                !item.snapshot.exists()
            ) {

                problemas.push({

                    producto:
                        item.producto.nombre,

                    solicitado:
                        item.producto.cantidad,

                    disponible:
                        0,

                    motivo:
                        "Producto sin inventario."

                });

                return;

            }


            const datos =
                item.snapshot.data();


            const existencia =
                Number(
                    datos.existencia || 0
                );


            const reservado =
                Number(
                    datos.reservado || 0
                );


            const disponible =
                Math.max(
                    0,
                    existencia -
                    reservado
                );


            const solicitado =
                Number(
                    item.producto.cantidad
                );


            console.log(
                "📦 Inventario:",
                item.producto.nombre,
                {
                    existencia,
                    reservado,
                    disponible,
                    solicitado
                }
            );


            if (
                datos.disponible === false ||
                disponible <
                solicitado
            ) {

                problemas.push({

                    producto:
                        item.producto.nombre,

                    solicitado:
                        solicitado,

                    disponible:
                        disponible,

                    motivo:
                        datos.disponible === false
                            ? "Producto marcado como no disponible."
                            : "Existencia insuficiente."

                });

            }

        }
    );


    // =================================================
    // SI HAY PROBLEMAS → CANCELAR TODO
    // =================================================

    if (
        problemas.length > 0
    ) {

        console.warn(
            "⚠️ MOTI GO: no se pudo reservar el pedido:",
            problemas
        );


        const detalle =
            problemas
                .map(
                    problema =>
                        `• ${problema.producto}: ` +
                        `solicitaste ${problema.solicitado}, ` +
                        `disponibles ${problema.disponible}`
                )
                .join("\n");


        throw new Error(
            "INVENTARIO_INSUFICIENTE:" +
            detalle
        );

    }


    // =================================================
    // RESERVAR
    // =================================================

    snapshots.forEach(
        item => {

            const datos =
                item.snapshot.data();


            const reservadoActual =
                Number(
                    datos.reservado || 0
                );


            const cantidadSolicitada =
                Number(
                    item.producto.cantidad
                );


            const nuevoReservado =
                reservadoActual +
                cantidadSolicitada;


            transaction.update(

                item.referencia,

                {

                    reservado:
                        nuevoReservado,

                    actualizadoEn:
                        serverTimestamp()

                }

            );


            console.log(
                "🔒 MOTI GO: reservado:",
                item.producto.nombre,
                cantidadSolicitada,
                "→ reservado total:",
                nuevoReservado
            );

        }
    );


    console.log(
        "✅ MOTI GO: inventario reservado correctamente."
    );

}

async function prepararConfirmacionPedido() {

    cargarCarritoPedido();


    const productosPedido =
    obtenerProductosDelCarrito(
        pedidoCarrito,
        pedidoProductos,
        pedidoTiendas
    );
const destino =
    obtenerDestinoClienteMotiGo();

console.log(
    "📍 MOTI GO - DESTINO PARA PEDIDO:",
    destino
);

// =====================================================
// VALIDAR UBICACIÓN DE ENTREGA
// =====================================================

if (
    !destino
) {

    alert(
        "No pudimos obtener tu ubicación actual. Activa el GPS e intenta nuevamente."
    );

    return;

}
    
// =====================================================
// CONSTRUIR TIENDAS DEL PEDIDO
// =====================================================

const tiendasPedido =
    agruparProductosPorTienda(
        productosPedido
    ).map(
        grupo => {

            const tienda =
                pedidoTiendas.find(
                    item =>
                        item.id ===
                        grupo.tiendaId
                );


            return {

                tiendaId:
                    grupo.tiendaId,

                nombre:
                    grupo.nombre,

                latitud:
                    tienda
                        ? Number(
                            tienda.latitud
                        )
                        : null,

                longitud:
                    tienda
                        ? Number(
                            tienda.longitud
                        )
                        : null,

                productos:
                    grupo.productos.map(
                        producto => {

                            return {

                                productoId:
                                    producto.productoId,

                                nombre:
                                    producto.nombre,

                                cantidad:
                                    Number(
                                        producto.cantidad
                                    ),

                                precio:
                                    Number(
                                        producto.precio
                                    ),

                                importe:
                                    Number(
                                        producto.precio
                                    ) *
                                    Number(
                                        producto.cantidad
                                    )

                            };

                        }
                    )

            };

        }
    );


console.log(
    "🏪 MOTI GO - TIENDAS DEL PEDIDO:",
    tiendasPedido
);


// =====================================================
// CONSTRUIR PEDIDO FINAL
// =====================================================

const usuario =
    auth.currentUser;


if (
    !usuario
) {

    throw new Error(
        "No hay un usuario autenticado."
    );

}


const folio =
    generarFolioPedido();


const codigoEntrega =
    generarCodigoEntrega();


// =====================================================
// SUBTOTAL
// =====================================================

const subtotal =
    productosPedido.reduce(
        (
            total,
            producto
        ) => {

            return (
                total +
                (
                    Number(
                        producto.precio
                    ) *
                    Number(
                        producto.cantidad
                    )
                )
            );

        },
        0
    );


// =====================================================
// COMISIÓN DE ENTREGA
// =====================================================

const costoEntrega =
    obtenerCostoEntregaPedido();


// =====================================================
// TOTAL
// =====================================================

const total =
    subtotal +
    costoEntrega;


// =====================================================
// PEDIDO
// =====================================================

const pedido = {

    folio:

        folio,


    clienteId:

        usuario.uid,


   clienteNombre:

    pedidoCliente?.nombre ||
    "",


    estado:

        "pendiente_asignacion",


    pago: {

        metodo:

            "efectivo",

        estado:

            "pendiente"

    },


    tiendas:

        tiendasPedido,


    productos:

        productosPedido.map(
            producto => {

                return {

                    productoId:
                        producto.productoId,

                    tiendaId:
                        producto.tiendaId,

                    nombre:
                        producto.nombre,

                    cantidad:
                        Number(
                            producto.cantidad
                        ),

                    precio:
                        Number(
                            producto.precio
                        ),

                    importe:
                        Number(
                            producto.precio
                        ) *
                        Number(
                            producto.cantidad
                        ),

                    estado:
                        "pendiente",

                    cantidadComprada:
                        0

                };

            }
        ),


    destino: {

        latitud:
            destino.latitud,

        longitud:
            destino.longitud,

        localidad:
            destino.localidad,

        referencia:
            destino.referencia

    },


    subtotal:

        subtotal,


    costoEntrega:

        costoEntrega,


    total:

        total,


    codigoEntrega:

        codigoEntrega,


    creadoEn:

        new Date(),


    actualizadoEn:

        new Date()

};


// =====================================================
// MOSTRAR PEDIDO COMPLETO
// =====================================================

console.log(
    "🧾🧾🧾 MOTI GO - PEDIDO FINAL:",
    pedido
);

    // =====================================================
// GUARDAR PEDIDO EN FIRESTORE
// =====================================================

try {

    console.log(
        "🔥 MOTI GO: guardando pedido en Firebase..."
    );


    // =====================================================
// CREAR PEDIDO + RESERVAR INVENTARIO
// =====================================================
//
// Todo ocurre dentro de una transacción.
//
// Si falla la reserva:
//     NO se crea el pedido.
//
// Si falla la creación:
//     NO queda la reserva aplicada.
//
// =====================================================

const referenciaPedido =
    doc(
        collection(
            db,
            "pedidos"
        )
    );


const pedidoParaFirebase = {

    ...pedido,

    creadoEn:
        serverTimestamp(),

    actualizadoEn:
        serverTimestamp(),

    // =================================================
    // INFORMACIÓN DE INVENTARIO
    // =================================================

    inventario: {

        estado:
            "reservado",

        reservadoEn:
            serverTimestamp()

    }

};


await runTransaction(
    db,
    async transaction => {

        // =============================================
        // RESERVAR PRODUCTOS
        // =============================================

        await reservarInventarioPedido(
            transaction,
            productosPedido
        );


        // =============================================
        // CREAR PEDIDO
        // =============================================

        transaction.set(
            referenciaPedido,
            pedidoParaFirebase
        );

    }
);


console.log(
    "✅ MOTI GO: pedido creado y productos reservados:",
    referenciaPedido.id
);

    // =====================================================
// LIMPIAR CARRITO DEL DASHBOARD
// =====================================================

if (
    typeof window.limpiarCarritoMotiGo ===
    "function"
) {

    window.limpiarCarritoMotiGo();

}
else {

    console.warn(
        "⚠️ MOTI GO: no se encontró la función para limpiar el carrito del dashboard."
    );

}

// =====================================================
// LIMPIAR CARRITO
// =====================================================
//
// El pedido ya fue creado correctamente y las
// existencias ya quedaron reservadas.
//
// Ahora podemos vaciar el carrito local.
// =====================================================

localStorage.removeItem(
    "motiCarrito"
);


pedidoCarrito =
    {};


console.log(
    "🧹 MOTI GO: carrito limpiado después de crear el pedido."
);
    
    
console.log(
    "✅ MOTI GO: PEDIDO CREADO EN FIREBASE:",
    referenciaPedido.id
);

 // =====================================================
// MOTI GO - AVISAR AL DASHBOARD DEL CLIENTE
// =====================================================

if (
    typeof window.motiGoEscucharPedidoActivo ===
    "function"
) {

    window.motiGoEscucharPedidoActivo(
        referenciaPedido.id
    );

}
else {

    console.warn(
        "⚠️ MOTI GO: el listener del pedido activo todavía no está disponible."
    );

}   

console.log(
    "🧾 MOTI GO: FOLIO:",
    pedido.folio
);


console.log(
    "🔐 MOTI GO: CÓDIGO DE ENTREGA:",
    pedido.codigoEntrega
);


// =====================================================
// PEDIDO CREADO
// =====================================================
//
// Guardamos temporalmente el ID real de Firestore
// para que todo el flujo posterior pueda trabajar
// con este pedido.
// =====================================================

const pedidoCreado =
    {

        ...pedido,

        id:
            referenciaPedido.id

    };

// =====================================================
// EJECUTAR MOTOR DE ASIGNACIÓN
// =====================================================

const resultadoAsignacion =
    await ejecutarAsignacionInicialMotiGo(
        pedidoCreado
    );


// =====================================================
// RESULTADO DEL MOTOR
// =====================================================

if (
    !resultadoAsignacion
) {

    console.warn(
        "⚠️ MOTI GO: el motor no pudo generar candidatos."
    );


    mostrarBuscandoRepartidorMotiGo(
        pedidoCreado
    );


    return;

}


// =====================================================
// GUARDAR RESULTADO DEL MOTOR
// =====================================================

pedidoCreado.resultadoAsignacion =
    resultadoAsignacion;


console.log(
    "🛵 MOTI GO: motor de asignación completado."
);


console.log(
    "📦 MOTI GO: grupos para dispatcher:",
    resultadoAsignacion.grupos
);


// =====================================================
// MOSTRAR AL CLIENTE QUE ESTAMOS BUSCANDO
// =====================================================
//
// Lo hacemos inmediatamente para que el cliente no
// tenga que esperar mientras comienza el dispatcher.
// =====================================================

mostrarBuscandoRepartidorMotiGo(
    pedidoCreado
);


// =====================================================
// INICIAR DISPATCHER
// =====================================================
//
// IMPORTANTE:
//
// NO usamos "await" aquí.
//
// El dispatcher continuará trabajando en segundo plano:
//
// grupo 1
//    ↓
// repartidor 1
//    ↓
// espera respuesta
//    ↓
// rechaza / expira
//    ↓
// siguiente
//
// Mientras tanto el cliente ya está viendo:
//
// "Buscando repartidor"
// =====================================================

console.log(
    "📤 MOTI GO: iniciando dispatcher..."
);


iniciarDispatcher(

    pedidoCreado,

    resultadoAsignacion.grupos

)
.then(
    resultadoDispatcher => {

        console.log(
            "🏁 MOTI GO: dispatcher finalizado:",
            resultadoDispatcher
        );

    }
)
.catch(
    error => {

        console.error(
            "❌ MOTI GO: error en dispatcher:",
            error
        );

    }
);
}
catch (
    error
) {

    console.error(
        "❌ MOTI GO: ERROR CREANDO PEDIDO:",
        error
    );


    // =================================================
    // INVENTARIO INSUFICIENTE
    // =================================================

    if (
        String(
            error?.message || ""
        ).startsWith(
            "INVENTARIO_INSUFICIENTE:"
        )
    ) {

        const detalle =
            String(
                error.message
            ).replace(
                "INVENTARIO_INSUFICIENTE:",
                ""
            );


        alert(
            "Algunos productos ya no tienen suficiente existencia.\n\n" +
            detalle +
            "\n\nActualiza tu carrito e intenta nuevamente."
        );


        return;

    }


    // =================================================
    // ERROR GENERAL
    // =================================================

    alert(
        "No pudimos crear tu pedido. Intenta nuevamente."
    );


    return;

}
    
    if (
        productosPedido.length ===
        0
    ) {

        alert(
            "Tu carrito está vacío."
        );

        cerrarRevisionPedido();

        return;

    }


    console.log(
        "🧾 MOTI GO - PEDIDO PREPARADO:",
        productosPedido
    );


console.log(
    "🧾 MOTI GO - DATOS DEL PEDIDO:",
    {
        carrito: pedidoCarrito,
        productos: pedidoProductos,
        tiendas: pedidoTiendas
    }
);

}


// =====================================================
// ESTILOS
// =====================================================

function agregarEstilosPanelPedido() {

    if (
        document.getElementById(
            "motiGoPedidoEstilos"
        )
    ) {

        return;

    }


    const estilos =
        document.createElement(
            "style"
        );


    estilos.id =
        "motiGoPedidoEstilos";


    estilos.textContent = `

        #motiGoPedidoPanel {

            display: none;

            position: fixed;

            inset: 0;

            z-index: 99999;

        }


        .moti-go-pedido-overlay {

            position: absolute;

            inset: 0;

            background:
                rgba(
                    0,
                    0,
                    0,
                    0.48
                );

            display: flex;

            align-items: flex-end;

            justify-content: center;

        }


        .moti-go-pedido-panel {

            width: 100%;

            max-width: 620px;

            max-height: 92vh;

            overflow-y: auto;

            background: #ffffff;

            border-radius:
                22px 22px 0 0;

            box-shadow:
                0 -10px 35px
                rgba(
                    0,
                    0,
                    0,
                    0.18
                );

            animation:
                motiGoPedidoEntrada
                0.22s
                ease-out;

        }


        @keyframes motiGoPedidoEntrada {

            from {

                transform:
                    translateY(
                        100%
                    );

                opacity: 0;

            }

            to {

                transform:
                    translateY(
                        0
                    );

                opacity: 1;

            }

        }


        .moti-go-pedido-header {

            display: flex;

            align-items: center;

            justify-content: space-between;

            padding:
                20px
                20px
                14px;

            border-bottom:
                1px solid
                #eeeeee;

        }


        .moti-go-pedido-kicker {

            display: block;

            font-size:
                11px;

            font-weight:
                800;

            letter-spacing:
                0.12em;

            color:
                #777777;

            margin-bottom:
                4px;

        }


        .moti-go-pedido-header h2 {

            margin: 0;

            font-size:
                24px;

        }


        #motiGoPedidoCerrar {

            width:
                38px;

            height:
                38px;

            border:
                0;

            border-radius:
                50%;

            background:
                #f1f1f1;

            font-size:
                26px;

            line-height:
                1;

            cursor:
                pointer;

        }


        .moti-go-pedido-contenido {

            padding:
                16px
                20px
                20px;

        }


        .moti-go-tienda-pedido {

            margin-bottom:
                18px;

            padding:
                14px;

            border:
                1px solid
                #eeeeee;

            border-radius:
                16px;

            background:
                #fafafa;

        }


        .moti-go-tienda-titulo {

            display: flex;

            align-items: center;

            gap: 8px;

            margin-bottom:
                12px;

            font-size:
                16px;

        }


        .moti-go-producto-pedido {

            display: flex;

            align-items: center;

            justify-content: space-between;

            gap: 12px;

            padding:
                11px 0;

            border-top:
                1px solid
                #eeeeee;

        }


        .moti-go-producto-pedido > div {

            display: flex;

            flex-direction: column;

            gap: 3px;

            min-width: 0;

        }


        .moti-go-producto-pedido strong {

            font-size:
                15px;

        }


        .moti-go-producto-pedido span {

            font-size:
                13px;

            color:
                #777777;

        }


        .moti-go-producto-pedido b {

            white-space:
                nowrap;

        }


        .moti-go-resumen-pedido {

            padding:
                4px
                0;

        }


        .moti-go-resumen-pedido > div {

            display: flex;

            justify-content: space-between;

            padding:
                7px
                0;

            color:
                #555555;

        }


        .moti-go-total-pedido {

            margin-top:
                7px;

            padding-top:
                14px !important;

            border-top:
                1px solid
                #dddddd;

            color:
                #111111 !important;

            font-size:
                19px;

        }


        .moti-go-pago-pedido {

            display: flex;

            align-items: center;

            gap: 12px;

            margin-top:
                12px;

            padding:
                14px;

            border-radius:
                14px;

            background:
                #f4f7f5;

        }


        .moti-go-pago-pedido > span {

            font-size:
                28px;

        }


        .moti-go-pago-pedido div {

            display: flex;

            flex-direction: column;

            gap: 3px;

        }


        .moti-go-pago-pedido span {

            font-size:
                13px;

            color:
                #666666;

        }


        .moti-go-pedido-footer {

            padding:
                12px
                20px
                calc(
                    18px +
                    env(
                        safe-area-inset-bottom
                    )
                );

            border-top:
                1px solid
                #eeeeee;

            background:
                #ffffff;

        }


        #motiGoPedidoConfirmar {

            width:
                100%;

            min-height:
                52px;

            border:
                0;

            border-radius:
                14px;

            background:
                #111111;

            color:
                #ffffff;

            font-size:
                16px;

            font-weight:
                700;

            cursor:
                pointer;

        }


        #motiGoPedidoConfirmar:disabled {

            opacity:
                0.55;

            cursor:
                not-allowed;

        }


        @media (
            min-width: 700px
        ) {

            .moti-go-pedido-overlay {

                align-items:
                    center;

                padding:
                    20px;

            }


            .moti-go-pedido-panel {

                border-radius:
                    22px;

            }

        }

    `;


    document.head.appendChild(
        estilos
    );

}


// =====================================================
// GENERAR FOLIO DEL PEDIDO
// =====================================================

function generarFolioPedido() {

    const ahora =
        new Date();

    const fecha =
        ahora
            .toISOString()
            .slice(0, 10)
            .replaceAll("-", "");

    const hora =
        ahora
            .toTimeString()
            .slice(0, 8)
            .replaceAll(":", "");

    const aleatorio =
        Math.floor(
            100 +
            Math.random() *
            900
        );

    return `MG-${fecha}-${hora}-${aleatorio}`;

}


// =====================================================
// GENERAR CÓDIGO DE ENTREGA
// =====================================================

function generarCodigoEntrega() {

    return String(
        Math.floor(
            100000 +
            Math.random() *
            900000
        )
    );

}

// =====================================================
// OBTENER UBICACIÓN DE ENTREGA DEL CLIENTE
// =====================================================
//
// MOTI GO NO utiliza "destinoViaje".
//
// En MOTI GO, mientras el cliente no tenga direcciones
// guardadas, el pedido se entrega en su ubicación actual.
//
// La ubicación viene del perfil recibido desde
// dashboard-pasajero.js.
// =====================================================

function obtenerDestinoClienteMotiGo() {

    // =================================================
    // VALIDAR PERFIL DEL CLIENTE
    // =================================================

    if (
        !pedidoCliente
    ) {

        console.warn(
            "⚠️ MOTI GO: no se recibió el perfil del cliente."
        );

        return null;

    }


    // =================================================
    // OBTENER COORDENADAS ACTUALES
    // =================================================

    const latitud =
        Number(
            pedidoCliente.latitud
        );


    const longitud =
        Number(
            pedidoCliente.longitud
        );


    // =================================================
    // VALIDAR COORDENADAS
    // =================================================

    if (
        !Number.isFinite(
            latitud
        ) ||
        !Number.isFinite(
            longitud
        )
    ) {

        console.error(
            "❌ MOTI GO: el cliente no tiene coordenadas válidas:",
            pedidoCliente
        );

        return null;

    }


    // =================================================
    // CONSTRUIR UBICACIÓN DE ENTREGA
    // =================================================

    const destino = {

        latitud:
            latitud,

        longitud:
            longitud,

        localidad:
            pedidoCliente.localidad ||
            "",

        referencia:
            pedidoCliente.referencia ||
            ""

    };


    console.log(
        "📍 MOTI GO - UBICACIÓN DE ENTREGA DEL CLIENTE:",
        destino
    );


    return destino;

}
