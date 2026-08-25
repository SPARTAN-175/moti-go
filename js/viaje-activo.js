import { auth, db }
from "./firebase-config.js";

import {
    doc,
    getDoc,
    updateDoc,
    onSnapshot,
    increment
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


// =====================================================
// VARIABLES
// =====================================================

let viajeActual = null;
let viajeId = null;

let usuarioActual = null;

let map = null;

let conductorMarker = null;
let destinoMarker = null;

let rutaControl = null;

let listenerPedido = null;
let listenerMovimiento = false;


// =====================================================
// CONTROL DE TIENDAS
// =====================================================

let tiendasPedido = [];
let indiceTiendaActual = 0;

let productosPedido = [];


// =====================================================
// ICONOS
// =====================================================

const motoIcon = L.icon({

    iconUrl:
        "../assets/icons/mototaxi.svg",

    iconSize: [42, 42],

    iconAnchor: [21, 21],

    popupAnchor: [0, -18]

});


const tiendaIcon = L.icon({

    iconUrl:
        "../assets/icons/destino.svg",

    iconSize: [40, 40],

    iconAnchor: [20, 20],

    popupAnchor: [0, -18]

});


const clienteIcon = L.icon({

    iconUrl:
        "../assets/icons/pasajero.svg",

    iconSize: [40, 40],

    iconAnchor: [20, 20],

    popupAnchor: [0, -18]

});


// =====================================================
// INICIO
// =====================================================

onAuthStateChanged(

    auth,

    async (user) => {

        if (!user) {

            volverAlDashboard();

            return;

        }


        try {

            const usuarioRef =
                doc(
                    db,
                    "usuarios",
                    user.uid
                );


            const usuarioSnap =
                await getDoc(
                    usuarioRef
                );


            if (!usuarioSnap.exists()) {

                volverAlDashboard();

                return;

            }


            usuarioActual =
                usuarioSnap.data();


            const viajeActivo =
                usuarioActual.viajeActivo;


            const pedidoId =
                typeof viajeActivo === "string"
                    ? viajeActivo
                    : viajeActivo?.pedidoId;


            console.log(
                "🚗 MOTI GO: pedido activo:",
                pedidoId
            );


            if (!pedidoId) {

                console.warn(
                    "⚠️ MOTI GO: no existe pedido activo."
                );

                volverAlDashboard();

                return;

            }


            viajeId =
                pedidoId;


            escucharPedidoActivo(
                pedidoId
            );


            escucharMovimientoConductor();

        }

        catch (error) {

            console.error(
                "❌ MOTI GO: error iniciando viaje activo:",
                error
            );

            volverAlDashboard();

        }

    }

);


// =====================================================
// ESCUCHAR PEDIDO EN TIEMPO REAL
// =====================================================

function escucharPedidoActivo(
    pedidoId
) {

    if (listenerPedido) {

        listenerPedido();

        listenerPedido = null;

    }


    listenerPedido =
        onSnapshot(

            doc(
                db,
                "pedidos",
                pedidoId
            ),

            async (snapshot) => {

                if (!snapshot.exists()) {

                    console.warn(
                        "⚠️ MOTI GO: el pedido ya no existe."
                    );

                    manejarCancelacion();

                    return;

                }


                viajeActual = {

                    id:
                        snapshot.id,

                    ...snapshot.data()

                };


                console.log(
                    "🔄 MOTI GO: pedido actualizado:",
                    viajeActual
                );


                // =====================================
                // CANCELADO
                // =====================================

                if (
                    viajeActual.estado ===
                    "cancelado"
                ) {

                    manejarCancelacion();

                    return;

                }


                // =====================================
                // CARGAR ESTRUCTURA DEL PEDIDO
                // =====================================

                prepararDatosPedido();


                // =====================================
                // ACTUALIZAR INTERFAZ
                // =====================================

                actualizarInterfaz();


                await actualizarDatosVisuales();


                // =====================================
                // ENTREGADO
                // =====================================

                if (
                    viajeActual.estado ===
                    "entregado"
                ) {

                    mostrarEntregaFinalizada();

                }

            },

            (error) => {

                console.error(
                    "❌ MOTI GO: error escuchando pedido:",
                    error
                );

            }

        );

}


// =====================================================
// PREPARAR DATOS DEL PEDIDO
// =====================================================

function prepararDatosPedido() {

    productosPedido =
        Array.isArray(
            viajeActual.productos
        )
            ? viajeActual.productos
            : [];


    tiendasPedido =
        Array.isArray(
            viajeActual.tiendas
        )
            ? viajeActual.tiendas
            : [];


    /*
     * Si las tiendas vienen como objeto,
     * intentamos convertirlas en arreglo.
     */

    if (
        !Array.isArray(
            viajeActual.tiendas
        ) &&
        viajeActual.tiendas &&
        typeof viajeActual.tiendas === "object"
    ) {

        tiendasPedido =
            Object.entries(
                viajeActual.tiendas
            )
            .map(
                ([id, tienda]) => ({

                    id,

                    ...(tienda || {})

                })
            );

    }


    /*
     * Orden de tiendas.
     *
     * Si alguna tiene orden/ordenCompra,
     * respetamos ese valor.
     */

    tiendasPedido.sort(

        (a, b) => {

            const ordenA =
                Number(
                    a.orden ??
                    a.ordenCompra ??
                    a.posicion ??
                    999
                );


            const ordenB =
                Number(
                    b.orden ??
                    b.ordenCompra ??
                    b.posicion ??
                    999
                );


            return ordenA - ordenB;

        }

    );


    /*
     * Intentamos conservar la tienda que ya
     * estaba activa.
     */

    const estado =
        viajeActual.estado;


    if (
        estado === "asignado" ||
        estado === "en_camino"
    ) {

        indiceTiendaActual =
            Math.min(
                indiceTiendaActual,
                Math.max(
                    tiendasPedido.length - 1,
                    0
                )
            );

    }


    console.log(
        "🏪 MOTI GO: tiendas del pedido:",
        tiendasPedido
    );


    console.log(
        "📦 MOTI GO: productos del pedido:",
        productosPedido
    );

}


// =====================================================
// ACTUALIZAR DATOS VISUALES
// =====================================================

async function actualizarDatosVisuales() {

    if (!viajeActual) {
        return;
    }


    // =====================================
    // CLIENTE
    // =====================================

    const nombreCliente =
        viajeActual.clienteNombre ||
        "Cliente";


    const nombreElement =
        document.getElementById(
            "nombrePasajero"
        );


    if (nombreElement) {

        nombreElement.textContent =
            nombreCliente;

    }


    // =====================================
    // DESTINO
    // =====================================

    const ubicacionEntrega =
        obtenerUbicacionEntrega();


    const localidad =
        ubicacionEntrega.localidad ||
        viajeActual.localidad ||
        "Destino de entrega";


    const referencia =
        ubicacionEntrega.referencia ||
        viajeActual.referencia ||
        viajeActual.observaciones ||
        "Sin referencia";


    const destinoElement =
        document.getElementById(
            "destinoViaje"
        );


    const referenciaElement =
        document.getElementById(
            "referenciaViaje"
        );


    if (destinoElement) {

        destinoElement.textContent =
            localidad;

    }


    if (referenciaElement) {

        referenciaElement.textContent =
            referencia;

    }


    // =====================================
    // FOLIO
    // =====================================

    const numeroPedido =
        document.getElementById(
            "numeroPedido"
        );


    if (numeroPedido) {

        numeroPedido.textContent =
            viajeActual.folio ||
            `#${viajeActual.id.slice(0, 6)}`;

    }


    // =====================================
    // PRODUCTOS / TIENDAS
    // =====================================

    renderizarPedido();


    // =====================================
    // MAPA
    // =====================================

    try {

        await cargarMapa();

    }

    catch (error) {

        console.error(
            "⚠️ MOTI GO: error actualizando mapa:",
            error
        );

    }

}


// =====================================================
// INTERFAZ SEGÚN ESTADO
// =====================================================

function actualizarInterfaz() {

    if (!viajeActual) {
        return;
    }


    const estado =
        viajeActual.estado;


    const estadoTitulo =
        document.getElementById(
            "estadoTitulo"
        );


    const estadoDescripcion =
        document.getElementById(
            "estadoDescripcion"
        );


    const estadoIcono =
        document.getElementById(
            "estadoIcono"
        );


    const estadoBox =
        document.getElementById(
            "estadoViaje"
        );


    const boton =
        document.getElementById(
            "btnAccion"
        );


    const botonTexto =
        document.getElementById(
            "btnAccionTexto"
        );


    const botonIcono =
        document.getElementById(
            "btnAccionIcono"
        );


    if (boton) {

        boton.disabled =
            false;

    }


    limpiarClasesEstado(
        estadoBox
    );


    switch (estado) {


        // =====================================
        // ASIGNADO
        // =====================================

        case "asignado":

            setEstadoVisual(

                "Pedido asignado",

                "Revisa los productos y dirígete a la primera tienda.",

                "shopping_bag",

                "estado-asignado"

            );


            setBoton(

                "Ir a la tienda",

                "navigation",

                ""

            );


            actualizarProgreso(
                0
            );

            break;


        // =====================================
        // EN CAMINO
        // =====================================

        case "en_camino":

            setEstadoVisual(

                "En camino a la tienda",

                obtenerNombreTiendaActual(),

                "store",

                "estado-compra"

            );


            setBoton(

                "Llegué a la tienda",

                "store",

                "estado-compra"

            );


            actualizarProgreso(
                15
            );

            break;


        // =====================================
        // ESPERANDO CLIENTE
        // =====================================

        case "esperando_cliente":

            setEstadoVisual(

                "En la tienda",

                "Verifica los productos antes de continuar.",

                "shopping_cart",

                "estado-compra"

            );


            setBoton(

                "Verificar productos",

                "fact_check",

                "estado-compra"

            );


            actualizarProgreso(
                35
            );

            break;


        // =====================================
        // EN ENTREGA
        // =====================================

        case "en_entrega":

            setEstadoVisual(

                "En camino al cliente",

                "Sigue la ruta hasta el punto de entrega.",

                "local_shipping",

                "estado-entrega"

            );


            setBoton(

                "Llegué al cliente",

                "location_on",

                "estado-entrega"

            );


            actualizarProgreso(
                75
            );

            break;


        // =====================================
        // ENTREGADO
        // =====================================

        case "entregado":

            setEstadoVisual(

                "Pedido entregado",

                "La entrega fue confirmada correctamente.",

                "check_circle",

                "estado-finalizado"

            );


            setBoton(

                "Pedido entregado",

                "check_circle",

                ""

            );


            if (boton) {

                boton.disabled =
                    true;

            }


            actualizarProgreso(
                100
            );

            break;


        // =====================================
        // CANCELADO
        // =====================================

        case "cancelado":

            setEstadoVisual(

                "Pedido cancelado",

                "El pedido fue cancelado por el cliente.",

                "cancel",

                "estado-finalizado"

            );


            setBoton(

                "Pedido cancelado",

                "cancel",

                ""

            );


            if (boton) {

                boton.disabled =
                    true;

            }

            break;


        default:

            setEstadoVisual(

                "Pedido asignado",

                "Revisa el pedido y dirígete a la tienda.",

                "shopping_bag",

                "estado-asignado"

            );


            setBoton(

                "Ir a la tienda",

                "navigation",

                ""

            );

    }

}


// =====================================================
// ESTADO VISUAL
// =====================================================

function setEstadoVisual(
    titulo,
    descripcion,
    icono,
    clase
) {

    const tituloElement =
        document.getElementById(
            "estadoTitulo"
        );


    const descripcionElement =
        document.getElementById(
            "estadoDescripcion"
        );


    const iconoElement =
        document.getElementById(
            "estadoIcono"
        );


    const estadoBox =
        document.getElementById(
            "estadoViaje"
        );


    if (tituloElement) {

        tituloElement.textContent =
            titulo;

    }


    if (descripcionElement) {

        descripcionElement.textContent =
            descripcion;

    }


    if (iconoElement) {

        iconoElement.textContent =
            icono;

    }


    if (estadoBox) {

        estadoBox.classList.add(
            clase
        );

    }

}


// =====================================================
// BOTÓN
// =====================================================

function setBoton(
    texto,
    icono,
    clase
) {

    const boton =
        document.getElementById(
            "btnAccion"
        );


    const textoElement =
        document.getElementById(
            "btnAccionTexto"
        );


    const iconoElement =
        document.getElementById(
            "btnAccionIcono"
        );


    if (textoElement) {

        textoElement.textContent =
            texto;

    }


    if (iconoElement) {

        iconoElement.textContent =
            icono;

    }


    if (boton) {

        boton.classList.remove(
            "estado-compra",
            "estado-entrega",
            "estado-confirmacion"
        );


        if (clase) {

            boton.classList.add(
                clase
            );

        }

    }

}


// =====================================================
// LIMPIAR CLASES DE ESTADO
// =====================================================

function limpiarClasesEstado(
    elemento
) {

    if (!elemento) {
        return;
    }


    elemento.classList.remove(

        "estado-asignado",

        "estado-compra",

        "estado-entrega",

        "estado-finalizado"

    );

}


// =====================================================
// PROGRESO
// =====================================================

function actualizarProgreso(
    porcentaje
) {

    const barra =
        document.getElementById(
            "progresoActivo"
        );


    if (barra) {

        barra.style.width =
            porcentaje + "%";

    }


    const pasos = [

        document.getElementById(
            "pasoCompra"
        ),

        document.getElementById(
            "pasoVerificacion"
        ),

        document.getElementById(
            "pasoEntrega"
        ),

        document.getElementById(
            "pasoFinal"
        )

    ];


    pasos.forEach(
        paso => {

            if (paso) {

                paso.classList.remove(
                    "activo",
                    "completado"
                );

            }

        }
    );


    if (porcentaje >= 100) {

        pasos.forEach(
            paso => {

                if (paso) {

                    paso.classList.add(
                        "completado"
                    );

                }

            }
        );

        return;

    }


    if (porcentaje >= 75) {

        marcarPaso(
            pasos,
            0,
            true
        );

        marcarPaso(
            pasos,
            1,
            true
        );

        marcarPaso(
            pasos,
            2,
            true
        );

        return;

    }


    if (porcentaje >= 35) {

        marcarPaso(
            pasos,
            0,
            true
        );

        marcarPaso(
            pasos,
            1,
            true
        );

        return;

    }


    marcarPaso(
        pasos,
        0,
        false
    );

}


// =====================================================
// MARCAR PASO
// =====================================================

function marcarPaso(
    pasos,
    indice,
    activo
) {

    const paso =
        pasos[indice];


    if (!paso) {
        return;
    }


    paso.classList.add(
        activo
            ? "activo"
            : "completado"
    );

}


// =====================================================
// RENDERIZAR PEDIDO
// =====================================================

function renderizarPedido() {

    const contenedor =
        document.getElementById(
            "tiendasPedido"
        );


    if (!contenedor) {
        return;
    }


    if (
        tiendasPedido.length === 0
    ) {

        contenedor.innerHTML = `

            <div class="pedido-cargando">

                <span class="material-symbols-outlined">
                    inventory_2
                </span>

                <span>
                    No se encontraron tiendas en el pedido.
                </span>

            </div>

        `;

        return;

    }


    let html = "";


    tiendasPedido.forEach(

        (tienda, indice) => {

            const tiendaId =
                tienda.id ||
                tienda.tiendaId ||
                tienda.idTienda ||
                "";


            const nombre =
                tienda.nombre ||
                tienda.nombreTienda ||
                tienda.tiendaNombre ||
                `Tienda ${indice + 1}`;


            const productos =
                obtenerProductosTienda(
                    tienda,
                    tiendaId
                );


            const activa =
                indice ===
                indiceTiendaActual;


            html += `

                <div
                    class="tienda-pedido"
                    data-tienda-index="${indice}"
                >

                    <div class="tienda-header">

                        <div class="tienda-identidad">

                            <div class="tienda-icono">

                                <span class="material-symbols-outlined">
                                    store
                                </span>

                            </div>

                            <div class="tienda-nombre">

                                <strong>
                                    ${escaparHTML(nombre)}
                                </strong>

                                <small>
                                    ${
                                        activa
                                            ? "Tienda actual"
                                            : `Tienda ${indice + 1}`
                                    }
                                </small>

                            </div>

                        </div>


                        <div class="tienda-numero">

                            ${indice + 1}/${tiendasPedido.length}

                        </div>

                    </div>


                    <div class="productos-lista">

                        ${
                            productos.length
                                ? productos.map(
                                    (
                                        producto,
                                        productoIndice
                                    ) =>
                                        renderizarProducto(
                                            producto,
                                            tienda,
                                            indice,
                                            productoIndice
                                        )
                                ).join("")
                                : `

                                    <div class="pedido-cargando">

                                        <span>
                                            No hay productos registrados para esta tienda.
                                        </span>

                                    </div>

                                `
                        }

                    </div>

                </div>

            `;

        }

    );


    contenedor.innerHTML =
        html;


    configurarBotonesProductos();


    actualizarResumenPedido();

}


// =====================================================
// OBTENER PRODUCTOS DE TIENDA
// =====================================================

function obtenerProductosTienda(
    tienda,
    tiendaId
) {

    /*
     * Primero intentamos por referencia de tienda.
     */

    const candidatos =
        productosPedido.filter(

            producto => {

                const productoTiendaId =
                    producto.tiendaId ||
                    producto.idTienda ||
                    producto.tienda_id ||
                    producto.tienda?.id ||
                    producto.tienda?.tiendaId;


                if (
                    productoTiendaId &&
                    tiendaId
                ) {

                    return String(
                        productoTiendaId
                    ) === String(
                        tiendaId
                    );

                }


                const nombreTiendaProducto =
                    producto.tiendaNombre ||
                    producto.nombreTienda ||
                    producto.tienda?.nombre;


                const nombreTienda =
                    tienda.nombre ||
                    tienda.nombreTienda;


                if (
                    nombreTiendaProducto &&
                    nombreTienda
                ) {

                    return (
                        nombreTiendaProducto ===
                        nombreTienda
                    );

                }


                return false;

            }

        );


    /*
     * Si el producto no trae tiendaId,
     * pero la tienda contiene un arreglo de productos,
     * lo utilizamos.
     */

    if (
        candidatos.length === 0 &&
        Array.isArray(
            tienda.productos
        )
    ) {

        return tienda.productos;

    }


    return candidatos;

}


// =====================================================
// RENDERIZAR PRODUCTO
// =====================================================

function renderizarProducto(
    producto,
    tienda,
    tiendaIndice,
    productoIndice
) {

    const estado =
        producto.estadoCompra ||
        producto.estado ||
        "pendiente";


    const disponible =
        estado === "disponible";


    const noDisponible =
        estado === "no_disponible";


    const claseEstado =
        disponible
            ? "disponible"
            : noDisponible
                ? "no-disponible"
                : "";


    const nombre =
        producto.nombre ||
        producto.productoNombre ||
        producto.descripcion ||
        "Producto";


    const cantidad =
        Number(
            producto.cantidad ??
            producto.qty ??
            producto.cantidadSolicitada ??
            1
        );


    const precio =
        Number(
            producto.precio ??
            producto.precioUnitario ??
            producto.precioVenta ??
            0
        );


    const estadoIcono =
        disponible
            ? "check"
            : noDisponible
                ? "close"
                : "remove";


    const etiqueta =
        disponible
            ? "Disponible"
            : noDisponible
                ? "No disponible"
                : "Pendiente";


    return `

        <div
            class="producto-item ${claseEstado}"
            data-tienda-index="${tiendaIndice}"
            data-producto-index="${productoIndice}"
        >

            <div class="producto-info">

                <span class="producto-nombre">

                    ${escaparHTML(nombre)}

                </span>

                <span class="producto-cantidad">

                    Cantidad: ${cantidad}

                </span>

            </div>


            <div class="producto-precio">

                ${
                    precio > 0
                        ? "$" +
                          (
                              precio *
                              cantidad
                          ).toFixed(2)
                        : ""
                }

            </div>


            <button
                type="button"
                class="producto-estado"
                data-tienda-index="${tiendaIndice}"
                data-producto-index="${productoIndice}"
                title="${etiqueta}"
            >

                <span class="material-symbols-outlined">

                    ${estadoIcono}

                </span>

            </button>

        </div>

    `;

}


// =====================================================
// BOTONES DE PRODUCTOS
// =====================================================

function configurarBotonesProductos() {

    const botones =
        document.querySelectorAll(
            ".producto-estado"
        );


    botones.forEach(

        boton => {

            boton.addEventListener(

                "click",

                async () => {

                    const tiendaIndice =
                        Number(
                            boton.dataset.tiendaIndex
                        );


                    const productoIndice =
                        Number(
                            boton.dataset.productoIndex
                        );


                    await cambiarDisponibilidadProducto(

                        tiendaIndice,

                        productoIndice

                    );

                }

            );

        }

    );

}


// =====================================================
// CAMBIAR DISPONIBILIDAD
// =====================================================

async function cambiarDisponibilidadProducto(
    tiendaIndice,
    productoIndice
) {

    const tienda =
        tiendasPedido[
            tiendaIndice
        ];


    if (!tienda) {
        return;
    }


    const productos =
        obtenerProductosTienda(

            tienda,

            tienda.id ||
            tienda.tiendaId ||
            tienda.idTienda ||
            ""

        );


    const producto =
        productos[
            productoIndice
        ];


    if (!producto) {

        console.warn(
            "⚠️ MOTI GO: producto no encontrado."
        );

        return;

    }


    const estadoActual =
        producto.estadoCompra ||
        producto.estado ||
        "pendiente";


    const nuevoEstado =
        estadoActual === "disponible"
            ? "no_disponible"
            : "disponible";


    /*
     * Buscamos el producto real dentro
     * del arreglo original.
     */

    const productoOriginalIndex =
        productosPedido.findIndex(

            p => {

                if (
                    producto.id &&
                    p.id
                ) {

                    return (
                        String(p.id) ===
                        String(producto.id)
                    );

                }


                return (
                    p === producto
                );

            }

        );


    if (
        productoOriginalIndex === -1
    ) {

        console.warn(
            "⚠️ MOTI GO: no se pudo localizar el producto original."
        );

        return;

    }


    const productosActualizados =
        productosPedido.map(

            (p, index) => {

                if (
                    index !==
                    productoOriginalIndex
                ) {

                    return p;

                }


                return {

                    ...p,

                    estadoCompra:
                        nuevoEstado,

                    estado:
                        nuevoEstado

                };

            }

        );


    try {

        await updateDoc(

            doc(
                db,
                "pedidos",
                viajeId
            ),

            {

                productos:
                    productosActualizados

            }

        );


        console.log(
            "🛒 MOTI GO: producto actualizado:",
            producto.nombre,
            nuevoEstado
        );

    }

    catch (error) {

        console.error(
            "❌ MOTI GO: error actualizando producto:",
            error
        );


        alert(
            "No se pudo actualizar el estado del producto."
        );

    }

}


// =====================================================
// RESUMEN DEL PEDIDO
// =====================================================

function actualizarResumenPedido() {

    const cantidadElement =
        document.getElementById(
            "cantidadProductos"
        );


    const totalElement =
        document.getElementById(
            "totalPedido"
        );


    const cantidad =
        productosPedido.reduce(

            (
                total,
                producto
            ) => {

                return (
                    total +
                    Number(
                        producto.cantidad ??
                        producto.qty ??
                        producto.cantidadSolicitada ??
                        1
                    )
                );

            },

            0

        );


    const total =
        productosPedido.reduce(

            (
                acumulado,
                producto
            ) => {

                const precio =
                    Number(
                        producto.precio ??
                        producto.precioUnitario ??
                        producto.precioVenta ??
                        0
                    );


                const cantidadProducto =
                    Number(
                        producto.cantidad ??
                        producto.qty ??
                        producto.cantidadSolicitada ??
                        1
                    );


                return (
                    acumulado +
                    (
                        precio *
                        cantidadProducto
                    )
                );

            },

            0

        );


    if (cantidadElement) {

        cantidadElement.textContent =
            `${cantidad} producto${cantidad === 1 ? "" : "s"}`;

    }


    if (totalElement) {

        totalElement.textContent =
            "$" +
            total.toFixed(2);

    }

}


// =====================================================
// ACCIÓN PRINCIPAL
// =====================================================

document
    .getElementById(
        "btnAccion"
    )
    .addEventListener(
        "click",
        ejecutarAccion
    );


// =====================================================
// EJECUTAR ACCIÓN
// =====================================================

async function ejecutarAccion() {

    if (!viajeActual) {
        return;
    }


    console.log(
        "🛵 MOTI GO: acción:",
        viajeActual.estado
    );


    switch (
        viajeActual.estado
    ) {


        // =====================================
        // ASIGNADO → IR A TIENDA
        // =====================================

        case "asignado":

            await cambiarEstado(
                "en_camino"
            );

            break;


        // =====================================
        // EN CAMINO → LLEGÓ A TIENDA
        // =====================================

        case "en_camino":

            await cambiarEstado(
                "esperando_cliente"
            );

            break;


        // =====================================
        // EN TIENDA → VERIFICAR
        // =====================================

        case "esperando_cliente":

            if (
                !todosLosProductosVerificados()
            ) {

                const continuar =
                    confirm(
                        "Todavía hay productos pendientes. ¿Quieres continuar de todos modos?"
                    );


                if (!continuar) {

                    return;

                }

            }


            /*
             * Si hay otra tienda,
             * avanzamos a ella.
             */

            if (
                indiceTiendaActual <
                tiendasPedido.length - 1
            ) {

                indiceTiendaActual++;


                console.log(
                    "🏪 MOTI GO: siguiente tienda:",
                    indiceTiendaActual
                );


                await cambiarEstado(
                    "en_camino"
                );


                return;

            }


            /*
             * Ya terminamos todas las tiendas.
             * Ahora vamos al cliente.
             */

            await cambiarEstado(
                "en_entrega"
            );

            break;


        // =====================================
        // EN ENTREGA → LLEGÓ AL CLIENTE
        // =====================================

        case "en_entrega":

            mostrarConfirmacionEntrega();

            break;


        // =====================================
        // ENTREGADO
        // =====================================

        case "entregado":

            return;


        default:

            console.warn(
                "⚠️ MOTI GO: estado sin acción:",
                viajeActual.estado
            );

    }

}


// =====================================================
// VERIFICAR PRODUCTOS
// =====================================================

function todosLosProductosVerificados() {

    if (
        productosPedido.length === 0
    ) {

        return true;

    }


    return productosPedido.every(

        producto => {

            const estado =
                producto.estadoCompra ||
                producto.estado;


            return (
                estado === "disponible" ||
                estado === "no_disponible"
            );

        }

    );

}


// =====================================================
// CAMBIAR ESTADO
// =====================================================

async function cambiarEstado(
    nuevoEstado
) {

    if (!viajeId) {
        return;
    }


    try {

        console.log(
            "🔄 MOTI GO: cambiando estado:",
            viajeActual.estado,
            "→",
            nuevoEstado
        );


        await updateDoc(

            doc(
                db,
                "pedidos",
                viajeId
            ),

            {

                estado:
                    nuevoEstado

            }

        );


        console.log(
            "✅ MOTI GO: estado actualizado:",
            nuevoEstado
        );

    }

    catch (error) {

        console.error(
            "❌ MOTI GO: error cambiando estado:",
            error
        );


        alert(
            "No se pudo actualizar el estado del pedido."
        );

    }

}


// =====================================================
// OBTENER UBICACIÓN DEL CLIENTE
// =====================================================

function obtenerUbicacionEntrega() {

    const ubicacion =
        viajeActual?.ubicacionEntrega ||
        viajeActual?.destino ||
        {};


    return {

        latitud:
            Number(
                ubicacion.latitud ??
                ubicacion.latitude ??
                viajeActual?.destinoLatitud ??
                viajeActual?.latitud
            ),

        longitud:
            Number(
                ubicacion.longitud ??
                ubicacion.longitude ??
                viajeActual?.destinoLongitud ??
                viajeActual?.longitud
            ),

        localidad:
            ubicacion.localidad ||
            ubicacion.nombre ||
            viajeActual?.localidad ||
            "",

        referencia:
            ubicacion.referencia ||
            viajeActual?.referencia ||
            ""

    };

}


// =====================================================
// TIENDA ACTUAL
// =====================================================

function obtenerTiendaActual() {

    if (
        tiendasPedido.length === 0
    ) {

        return null;

    }


    return (
        tiendasPedido[
            indiceTiendaActual
        ] ||
        tiendasPedido[0]
    );

}


// =====================================================
// NOMBRE TIENDA ACTUAL
// =====================================================

function obtenerNombreTiendaActual() {

    const tienda =
        obtenerTiendaActual();


    if (!tienda) {

        return "Primera tienda";

    }


    return (
        tienda.nombre ||
        tienda.nombreTienda ||
        tienda.tiendaNombre ||
        "Tienda"
    );

}


// =====================================================
// COORDENADAS DE TIENDA
// =====================================================

function obtenerCoordenadasTienda(
    tienda
) {

    if (!tienda) {

        return null;

    }


    const lat =
        Number(
            tienda.latitud ??
            tienda.latitude ??
            tienda.ubicacion?.latitud ??
            tienda.ubicacion?.latitude
        );


    const lng =
        Number(
            tienda.longitud ??
            tienda.longitude ??
            tienda.ubicacion?.longitud ??
            tienda.ubicacion?.longitude
        );


    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
    ) {

        return null;

    }


    return [

        lat,
        lng

    ];

}


// =====================================================
// CARGAR MAPA
// =====================================================

async function cargarMapa() {

    if (!viajeActual) {
        return;
    }


    if (!auth.currentUser) {
        return;
    }


    const usuarioSnap =
        await getDoc(

            doc(
                db,
                "usuarios",
                auth.currentUser.uid
            )

        );


    if (!usuarioSnap.exists()) {
        return;
    }


    const conductor =
        usuarioSnap.data();


    const conductorLat =
        Number(
            conductor.latitud
        );


    const conductorLng =
        Number(
            conductor.longitud
        );


    if (
        !Number.isFinite(conductorLat) ||
        !Number.isFinite(conductorLng)
    ) {

        console.warn(
            "⚠️ MOTI GO: ubicación del repartidor no disponible."
        );

        return;

    }


    const conductorPos = [

        conductorLat,
        conductorLng

    ];


    // =====================================
    // INICIALIZAR MAPA
    // =====================================

    if (!map) {

        map =
            L.map(
                "map"
            );


        L.tileLayer(

            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

            {

                maxZoom: 19,

                attribution:
                    "© OpenStreetMap"

            }

        ).addTo(map);

    }


    // =====================================
    // MARCADOR REPARTIDOR
    // =====================================

    if (conductorMarker) {

        conductorMarker.setLatLng(
            conductorPos
        );

    }

    else {

        conductorMarker =
            L.marker(

                conductorPos,

                {

                    icon:
                        motoIcon

                }

            )
            .addTo(map)
            .bindPopup(
                "Tu ubicación"
            );

    }


    // =====================================
    // DETERMINAR DESTINO
    // =====================================

    let destinoPos =
        null;


    let destinoIconActual =
        tiendaIcon;


    let destinoTexto =
        "Tienda";


    let tituloNavegacion =
        "Tienda";


    /*
     * Mientras estamos comprando,
     * vamos a la tienda actual.
     */

    if (
        viajeActual.estado === "asignado" ||
        viajeActual.estado === "en_camino" ||
        viajeActual.estado === "esperando_cliente"
    ) {

        const tienda =
            obtenerTiendaActual();


        destinoPos =
            obtenerCoordenadasTienda(
                tienda
            );


        destinoTexto =
            obtenerNombreTiendaActual();


        tituloNavegacion =
            obtenerNombreTiendaActual();

    }


    /*
     * Cuando terminamos las tiendas,
     * el destino pasa a ser el cliente.
     */

    if (
        viajeActual.estado === "en_entrega"
    ) {

        const ubicacion =
            obtenerUbicacionEntrega();


        if (
            Number.isFinite(
                ubicacion.latitud
            ) &&
            Number.isFinite(
                ubicacion.longitud
            )
        ) {

            destinoPos = [

                ubicacion.latitud,

                ubicacion.longitud

            ];

            destinoIconActual =
                clienteIcon;

            destinoTexto =
                viajeActual.clienteNombre ||
                "Cliente";

            tituloNavegacion =
                "Entrega al cliente";

        }

    }


    console.log(
        "🗺️ MOTI GO: destino actual:",
        destinoPos
    );


    // =====================================
    // SI NO HAY COORDENADAS
    // =====================================

    if (!destinoPos) {

        console.warn(
            "⚠️ MOTI GO: no se encontraron coordenadas para el destino actual."
        );


        actualizarNavegacion(
            tituloNavegacion,
            "navigation",
            "—",
            "—"
        );


        map.setView(
            conductorPos,
            15
        );


        return;

    }


    // =====================================
    // MARCADOR DESTINO
    // =====================================

    if (destinoMarker) {

        destinoMarker.setLatLng(
            destinoPos
        );

        destinoMarker.setIcon(
            destinoIconActual
        );

    }

    else {

        destinoMarker =
            L.marker(

                destinoPos,

                {

                    icon:
                        destinoIconActual

                }

            )
            .addTo(map)
            .bindPopup(
                destinoTexto
            );

    }


    // =====================================
    // NAVEGACIÓN
    // =====================================

    actualizarNavegacion(

        tituloNavegacion,

        viajeActual.estado ===
            "en_entrega"
            ? "home"
            : "store",

        "Calculando...",

        "Calculando..."

    );


    // =====================================
    // RUTA
    // =====================================

    dibujarRuta(

        conductorPos,

        destinoPos

    );


    // =====================================
    // AJUSTAR MAPA
    // =====================================

    const grupo =
        L.featureGroup([

            conductorMarker,

            destinoMarker

        ]);


    map.fitBounds(

        grupo.getBounds(),

        {

            padding:
                [70, 70]

        }

    );

}


// =====================================================
// NAVEGACIÓN
// =====================================================

function actualizarNavegacion(
    titulo,
    icono,
    distancia,
    tiempo
) {

    const title =
        document.getElementById(
            "navigationTitle"
        );


    const icon =
        document.getElementById(
            "navigationIcon"
        );


    const distance =
        document.getElementById(
            "distanceText"
        );


    const time =
        document.getElementById(
            "timeText"
        );


    if (title) {

        title.textContent =
            titulo;

    }


    if (icon) {

        icon.textContent =
            icono;

    }


    if (distance) {

        distance.textContent =
            distancia;

    }


    if (time) {

        time.textContent =
            tiempo;

    }

}


// =====================================================
// ESCUCHAR UBICACIÓN DEL REPARTIDOR
// =====================================================

function escucharMovimientoConductor() {

    if (
        listenerMovimiento
    ) {

        return;

    }


    listenerMovimiento =
        true;


    onSnapshot(

        doc(
            db,
            "usuarios",
            auth.currentUser.uid
        ),

        (snapshot) => {

            const datos =
                snapshot.data();


            if (!datos) {
                return;
            }


            const lat =
                Number(
                    datos.latitud
                );


            const lng =
                Number(
                    datos.longitud
                );


            if (
                !Number.isFinite(lat) ||
                !Number.isFinite(lng)
            ) {

                return;

            }


            const nuevaPos = [

                lat,
                lng

            ];


            if (conductorMarker) {

                conductorMarker.setLatLng(
                    nuevaPos
                );

            }


            if (
                map &&
                viajeActual
            ) {

                let destino =
                    null;


                if (
                    viajeActual.estado ===
                    "en_entrega"
                ) {

                    const ubicacion =
                        obtenerUbicacionEntrega();


                    if (
                        Number.isFinite(
                            ubicacion.latitud
                        ) &&
                        Number.isFinite(
                            ubicacion.longitud
                        )
                    ) {

                        destino = [

                            ubicacion.latitud,

                            ubicacion.longitud

                        ];

                    }

                }

                else {

                    destino =
                        obtenerCoordenadasTienda(
                            obtenerTiendaActual()
                        );

                }


                if (destino) {

                    dibujarRuta(

                        nuevaPos,

                        destino

                    );

                }

            }

        },

        (error) => {

            console.error(
                "❌ MOTI GO: error escuchando GPS:",
                error
            );

        }

    );

}


// =====================================================
// DIBUJAR RUTA
// =====================================================

function dibujarRuta(
    origen,
    destino
) {

    if (
        !map ||
        !origen ||
        !destino
    ) {

        return;

    }


    if (!rutaControl) {

        rutaControl =
            L.Routing.control({

                waypoints: [

                    L.latLng(
                        origen[0],
                        origen[1]
                    ),

                    L.latLng(
                        destino[0],
                        destino[1]
                    )

                ],

                showAlternatives:
                    false,

                collapsible:
                    false,

                routeWhileDragging:
                    false,

                addWaypoints:
                    false,

                draggableWaypoints:
                    false,

                fitSelectedRoutes:
                    false,

                show:
                    false,

                createMarker:
                    () => null,

                lineOptions: {

                    styles: [{

                        color:
                            "#16a34a",

                        weight:
                            6,

                        opacity:
                            0.9

                    }]

                }

            })
            .addTo(map);


        rutaControl.on(

            "routesfound",

            (e) => {

                const ruta =
                    e.routes?.[0];


                if (!ruta) {
                    return;
                }


                const distanciaKm =
                    ruta.summary.totalDistance /
                    1000;


                const tiempoMin =
                    Math.ceil(
                        ruta.summary.totalTime /
                        60
                    );


                actualizarNavegacion(

                    document
                        .getElementById(
                            "navigationTitle"
                        )
                        ?.textContent ||
                        "Destino",

                    document
                        .getElementById(
                            "navigationIcon"
                        )
                        ?.textContent ||
                        "navigation",

                    distanciaKm < 1
                        ? `${Math.round(
                            ruta.summary.totalDistance
                        )} m`
                        : `${distanciaKm.toFixed(
                            1
                        )} km`,

                    `${tiempoMin} min`

                );

            }

        );

    }

    else {

        rutaControl.setWaypoints([

            L.latLng(
                origen[0],
                origen[1]
            ),

            L.latLng(
                destino[0],
                destino[1]
            )

        ]);

    }

}


// =====================================================
// CONFIRMACIÓN DE ENTREGA
// =====================================================

function mostrarConfirmacionEntrega() {

    const panel =
        document.getElementById(
            "confirmacionEntrega"
        );


    if (!panel) {

        console.warn(
            "⚠️ MOTI GO: panel de código no encontrado."
        );

        return;

    }


    panel.classList.remove(
        "oculto"
    );


    const boton =
        document.getElementById(
            "btnAccion"
        );


    const botonTexto =
        document.getElementById(
            "btnAccionTexto"
        );


    const botonIcono =
        document.getElementById(
            "btnAccionIcono"
        );


    if (boton) {

        boton.classList.remove(
            "estado-compra",
            "estado-entrega"
        );

        boton.classList.add(
            "estado-confirmacion"
        );

    }


    if (botonTexto) {

        botonTexto.textContent =
            "Confirmar entrega";

    }


    if (botonIcono) {

        botonIcono.textContent =
            "verified";

    }


    prepararInputsCodigo();


    const primerInput =
        panel.querySelector(
            "input"
        );


    if (primerInput) {

        setTimeout(
            () => {
                primerInput.focus();
            },
            100
        );

    }

}


// =====================================================
// INPUTS CÓDIGO
// =====================================================

function prepararInputsCodigo() {

    const contenedor =
        document.getElementById(
            "codigoEntregaInputs"
        );


    if (!contenedor) {
        return;
    }


    const inputs =
        contenedor.querySelectorAll(
            "input"
        );


    inputs.forEach(

        (input, indice) => {

            input.value = "";


            input.oninput =
                () => {

                    input.value =
                        input.value
                            .replace(
                                /\D/g,
                                ""
                            )
                            .slice(
                                0,
                                1
                            );


                    if (
                        input.value &&
                        indice <
                        inputs.length - 1
                    ) {

                        inputs[
                            indice + 1
                        ].focus();

                    }

                };


            input.onkeydown =
                (event) => {

                    if (
                        event.key ===
                        "Backspace" &&
                        !input.value &&
                        indice > 0
                    ) {

                        inputs[
                            indice - 1
                        ].focus();

                    }

                };

        }

    );

}


// =====================================================
// OBTENER CÓDIGO INGRESADO
// =====================================================

function obtenerCodigoIngresado() {

    const contenedor =
        document.getElementById(
            "codigoEntregaInputs"
        );


    if (!contenedor) {

        return "";

    }


    const inputs =
        contenedor.querySelectorAll(
            "input"
        );


    return Array.from(
        inputs
    )
    .map(
        input =>
            input.value
    )
    .join("");

}


// =====================================================
// VALIDAR CÓDIGO
// =====================================================

async function validarCodigoEntrega() {

    const codigo =
        obtenerCodigoIngresado();


    if (
        codigo.length !== 6
    ) {

        alert(
            "Ingresa el código completo de 6 dígitos."
        );

        return;

    }


    const codigoCorrecto =
        String(
            viajeActual.codigoEntrega ??
            ""
        );


    if (
        codigo !==
        codigoCorrecto
    ) {

        alert(
            "El código de entrega no es correcto."
        );

        limpiarCodigo();

        return;

    }


    console.log(
        "🔐 MOTI GO: código de entrega correcto."
    );


    await finalizarViaje();

}


// =====================================================
// LIMPIAR CÓDIGO
// =====================================================

function limpiarCodigo() {

    const inputs =
        document.querySelectorAll(
            "#codigoEntregaInputs input"
        );


    inputs.forEach(
        input => {
            input.value = "";
        }
    );


    if (inputs[0]) {

        inputs[0].focus();

    }

}


// =====================================================
// FINALIZAR ENTREGA
// =====================================================

async function finalizarViaje() {

    if (!viajeId) {
        return;
    }


    try {

        const ahora =
            new Date();


        // =====================================
        // PEDIDO
        // =====================================

        await updateDoc(

            doc(
                db,
                "pedidos",
                viajeId
            ),

            {

                estado:
                    "entregado",

                fechaFinalizacion:
                    ahora,

                entregaConfirmada:
                    true,

                codigoValidado:
                    true

            }

        );


        console.log(
            "✅ MOTI GO: pedido marcado como entregado."
        );


        // =====================================
        // LIBERAR REPARTIDOR
        // =====================================

        await updateDoc(

            doc(
                db,
                "usuarios",
                auth.currentUser.uid
            ),

            {

                estadoServicio:
                    "disponible",

                viajeActivo:
                    null,

                viajesHoy:
                    increment(1),

                viajesTotales:
                    increment(1)

            }

        );


        console.log(
            "✅ MOTI GO: repartidor liberado."
        );


        mostrarEntregaFinalizada();


        setTimeout(

            () => {

                window.location.replace(
                    "dashboard-repartidor.html"
                );

            },

            1200

        );

    }

    catch (error) {

        console.error(
            "❌ MOTI GO: error finalizando entrega:",
            error
        );


        alert(
            "No se pudo finalizar la entrega."
        );

    }

}


// =====================================================
// ENTREGA FINALIZADA
// =====================================================

function mostrarEntregaFinalizada() {

    const panel =
        document.getElementById(
            "confirmacionEntrega"
        );


    if (panel) {

        panel.classList.add(
            "oculto"
        );

    }


    setEstadoVisual(

        "Entrega confirmada",

        "El pedido fue entregado correctamente.",

        "check_circle",

        "estado-finalizado"

    );


    setBoton(

        "Entrega completada",

        "check_circle",

        ""

    );


    const boton =
        document.getElementById(
            "btnAccion"
        );


    if (boton) {

        boton.disabled =
            true;

    }


    actualizarProgreso(
        100
    );

}


// =====================================================
// PEDIDO CANCELADO
// =====================================================

async function manejarCancelacion() {

    console.warn(
        "🚨 MOTI GO: el pedido fue cancelado."
    );


    alert(
        "El cliente canceló este pedido."
    );


    try {

        await updateDoc(

            doc(
                db,
                "usuarios",
                auth.currentUser.uid
            ),

            {

                estadoServicio:
                    "disponible",

                viajeActivo:
                    null

            }

        );

    }

    catch (error) {

        console.error(
            "❌ MOTI GO: error liberando repartidor:",
            error
        );

    }


    volverAlDashboard();

}


// =====================================================
// VOLVER
// =====================================================

const btnVolver =
    document.getElementById(
        "btnVolver"
    );


if (btnVolver) {

    btnVolver.addEventListener(

        "click",

        () => {

            const confirmar =
                confirm(
                    "¿Quieres salir del pedido? El viaje seguirá activo."
                );


            if (confirmar) {

                window.location.replace(
                    "dashboard-repartidor.html"
                );

            }

        }

    );

}


// =====================================================
// BOTÓN PRINCIPAL — VALIDACIÓN ESPECIAL
// =====================================================

/*
 * Reemplazamos la función normal del botón
 * para que en estado en_entrega aparezca
 * el código de confirmación.
 */

const botonAccion =
    document.getElementById(
        "btnAccion"
    );


if (botonAccion) {

    botonAccion.addEventListener(

        "click",

        async (event) => {

            /*
             * Si el botón está en confirmación,
             * validamos el código.
             */

            if (
                viajeActual?.estado ===
                "en_entrega" &&
                !document
                    .getElementById(
                        "confirmacionEntrega"
                    )
                    ?.classList.contains(
                        "oculto"
                    )
            ) {

                event.stopImmediatePropagation();

                await validarCodigoEntrega();

            }

        },

        true

    );

}


// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHTML(
    valor
) {

    return String(
        valor ?? ""
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
// VOLVER AL DASHBOARD
// =====================================================

function volverAlDashboard() {

    if (listenerPedido) {

        listenerPedido();

        listenerPedido =
            null;

    }


    window.location.replace(
        "dashboard-repartidor.html"
    );

}
