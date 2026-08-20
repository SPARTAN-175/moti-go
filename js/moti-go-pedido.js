import {
    auth,
    db
} from "./firebase-config.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


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

function prepararConfirmacionPedido() {

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
// OBTENER DESTINO DEL CLIENTE
// =====================================================

function obtenerDestinoClienteMotiGo() {

    const destino =
        window.motiGoDestinoSeleccionado;


    if (
        !destino
    ) {

        console.warn(
            "⚠️ MOTI GO: no se encontró destino seleccionado."
        );

        return null;

    }


    return {

        latitud:
            Number(
                destino.latitud
            ),

        longitud:
            Number(
                destino.longitud
            ),

        localidad:
            destino.localidad ||
            "",

        referencia:
            destino.referencia ||
            ""

    };

}
