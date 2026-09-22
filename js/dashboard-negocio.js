// =========================================================
// MOTI GO
// DASHBOARD DEL NEGOCIO
// CATÁLOGO + IMPORTACIÓN
// =========================================================

import {
    auth,
    db,
    storage
} from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    setDoc,
    addDoc,
    serverTimestamp,
    documentId,
    onSnapshot,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

// =========================================================
// ESTADO GLOBAL
// =========================================================

let usuarioActual = null;

let tiendaActual = null;

let datosUsuarioNegocio = null;

let tiendaId = null;

let productos = [];

let productosFiltrados = [];

let filtroActual = "todos";

let archivoSeleccionado = null;

let productosParaImportar = [];

// =========================================================
// CUENTA DEL NEGOCIO
// =========================================================

let movimientosCuenta = [];

let filtroCuentaActual = "todos";

let fechaCuentaDesde = "";

let fechaCuentaHasta = "";

let ventasPeriodoActual = "mes";

let cancelarListenerCuenta = null;
let cancelarListenerDevoluciones = null;
let devolucionesPendientes = [];

// Estado de autenticación para proteger la interfaz mientras Firebase inicializa.
let authEstadoResuelto = false;


// =========================================================
// ELEMENTOS PRINCIPALES
// =========================================================

const sidebar =
    document.getElementById("businessSidebar");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");

const menuButton =
    document.getElementById("menuButton");

const sidebarClose =
    document.getElementById("sidebarClose");

const logoutButton =
    document.getElementById("logoutButton");

const pageTitle =
    document.getElementById("pageTitle");

const pageSubtitle =
    document.getElementById("pageSubtitle");

const views =
    document.querySelectorAll(
        ".business-view"
    );

const navItems =
    document.querySelectorAll(
        ".nav-item[data-view]"
    );


// =========================================================
// CONFIGURACIÓN DE VISTAS
// =========================================================

const viewConfig = {

    inicio: {
        title: "Inicio",
        subtitle: "Resumen de tu negocio"
    },

    productos: {
        title: "Mis productos",
        subtitle: "Administra tu catálogo"
    },

    importar: {
        title: "Importar catálogo",
        subtitle: "Carga tus productos desde Excel o CSV"
    },

    agregar: {
        title: "Agregar producto",
        subtitle: "Registra un producto manualmente"
    },

    negocio: {
    title: "Mi negocio",
    subtitle: "Información de tu negocio"
},

cuenta: {
    title: "Mi cuenta",
    subtitle: "Comisiones, pagos y saldo pendiente"
},

configuracion: {
        title: "Configuración",
        subtitle: "Administra las opciones de tu cuenta"
    }

};


// =========================================================
// ABRIR MENÚ
// =========================================================

function abrirMenu() {

    if (!sidebar) return;

    sidebar.classList.add("open");

    if (sidebarOverlay) {

        sidebarOverlay.classList.add(
            "active"
        );

    }

}


// =========================================================
// CERRAR MENÚ
// =========================================================

function cerrarMenu() {

    if (!sidebar) return;

    sidebar.classList.remove("open");

    if (sidebarOverlay) {

        sidebarOverlay.classList.remove(
            "active"
        );

    }

}


if (menuButton) {

    menuButton.addEventListener(
        "click",
        () => {

            const abierto =
                sidebar.classList.contains(
                    "open"
                );

            if (abierto) {

                cerrarMenu();

            } else {

                abrirMenu();

            }

        }
    );

}


if (sidebarClose) {

    sidebarClose.addEventListener(
        "click",
        cerrarMenu
    );

}


if (sidebarOverlay) {

    sidebarOverlay.addEventListener(
        "click",
        cerrarMenu
    );

}


// =========================================================
// CAMBIAR VISTA
// =========================================================

function cambiarVista(
    nombreVista
) {

    const vistaObjetivo =
        document.querySelector(
            `[data-view-content="${nombreVista}"]`
        );

    if (!vistaObjetivo) {

        console.warn(
            "Vista no encontrada:",
            nombreVista
        );

        return;

    }


    views.forEach(
        view => {

            view.classList.remove(
                "active"
            );

        }
    );


    vistaObjetivo.classList.add(
        "active"
    );


    navItems.forEach(
        item => {

            item.classList.toggle(
                "active",
                item.dataset.view ===
                nombreVista
            );

        }
    );


    actualizarEncabezado(
        nombreVista
    );


    cerrarMenu();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    console.log(
        "📂 Vista:",
        nombreVista
    );

}


// =========================================================
// ENCABEZADO
// =========================================================

function actualizarEncabezado(
    nombreVista
) {

    const config =
        viewConfig[nombreVista];

    if (!config) return;


    if (pageTitle) {

        pageTitle.textContent =
            config.title;

    }


    if (pageSubtitle) {

        pageSubtitle.textContent =
            config.subtitle;

    }

}


// =========================================================
// EVENTOS MENÚ
// =========================================================

navItems.forEach(
    item => {

        item.addEventListener(
            "click",
            () => {

                cambiarVista(
                    item.dataset.view
                );

            }
        );

    }
);


// =========================================================
// BOTONES INTERNOS
// =========================================================

document
    .querySelectorAll(
        "[data-go-view]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    cambiarVista(
                        button.dataset.goView
                    );

                }
            );

        }
    );


// =========================================================
// FIREBASE AUTH
// =========================================================

async function resolverSesionNegocio(user) {

    authEstadoResuelto = true;

    if (!user) {

        console.warn(
            "⚠️ MOTI GO: sesión de negocio no disponible. Redirigiendo al acceso..."
        );

        // Nunca dejar listeners activos después de cerrar sesión.
        if (cancelarListenerDevoluciones) {
            cancelarListenerDevoluciones();
            cancelarListenerDevoluciones = null;
        }

        if (cancelarListenerCuenta) {
            cancelarListenerCuenta();
            cancelarListenerCuenta = null;
        }

        usuarioActual = null;
        tiendaActual = null;
        tiendaId = null;
        devolucionesPendientes = [];
        movimientosCuenta = [];

        document.body.classList.add("auth-pending");

        // La pantalla de negocio nunca debe quedar accesible sin sesión.
        window.location.replace("login.html");
        return;
    }

    usuarioActual = user;

    // Solo mostramos el panel después de confirmar que existe una sesión.
    document.body.classList.remove("auth-pending");

    console.log(
        "👤 Usuario negocio:",
        user.uid
    );

    await cargarDatosNegocio();
}


// Esperamos explícitamente a que Firebase termine de restaurar la sesión
// antes de tomar la decisión de redirigir o mostrar el dashboard.
(async () => {

    try {

        await auth.authStateReady();

        await resolverSesionNegocio(
            auth.currentUser
        );

    }
    catch (error) {

        console.error(
            "❌ MOTI GO: error resolviendo la sesión del negocio:",
            error
        );

        document.body.classList.add("auth-pending");
        window.location.replace("login.html");

    }

})();


// Después de resolver el estado inicial, seguimos escuchando cambios reales
// de sesión para cerrar correctamente el dashboard cuando haya logout.
onAuthStateChanged(
    auth,
    async user => {

        if (!authEstadoResuelto) {
            return;
        }

        // Evitamos recargar todo el negocio cuando el mismo usuario provoca
        // una notificación de Auth que no cambia realmente la identidad.
        if (user && usuarioActual?.uid === user.uid) {
            return;
        }

        await resolverSesionNegocio(user);

    }
);


// =========================================================
// CARGAR DATOS DEL NEGOCIO
// =========================================================

async function cargarDatosNegocio() {

    try {

        console.log(
            "🏪 Buscando información del negocio..."
        );


        const usuarioRef =
            doc(
                db,
                "usuarios",
                usuarioActual.uid
            );


        const usuarioSnap =
            await getDoc(
                usuarioRef
            );


        if (!usuarioSnap.exists()) {

            console.error(
                "❌ No existe el documento del usuario."
            );

            mostrarErrorNegocio(
                "No encontramos la información de esta cuenta."
            );

            return;

        }


        const datosUsuario =
            usuarioSnap.data();

        datosUsuarioNegocio =
            datosUsuario;


        /*
            Esperamos que la cuenta del negocio
            tenga un campo:

            tiendaId

            Ejemplo:

            {
                nombre: "Tienda de Prueba",
                rol: "negocio",
                tiendaId: "tienda_001"
            }
        */


        tiendaId =
            datosUsuario.tiendaId;


        if (!tiendaId) {

            console.error(
                "❌ El usuario no tiene tiendaId."
            );

            mostrarErrorNegocio(
                "Esta cuenta todavía no está asociada a una tienda."
            );

            return;

        }


        console.log(
            "🏪 tiendaId:",
            tiendaId
        );


        await cargarTienda();

await cargarProductos();

escucharMovimientosCuenta();
escucharDevoluciones();


    }
    catch (error) {

        console.error(
            "❌ Error cargando negocio:",
            error
        );

    }

}


// =========================================================
// CARGAR TIENDA
// =========================================================

async function cargarTienda() {

    const tiendaRef =
        doc(
            db,
            "tiendas",
            tiendaId
        );


    const tiendaSnap =
        await getDoc(
            tiendaRef
        );


    if (!tiendaSnap.exists()) {

        console.error(
            "❌ No existe la tienda:",
            tiendaId
        );

        return;

    }


    tiendaActual =
        {
            id: tiendaSnap.id,
            ...tiendaSnap.data()
        };


    console.log(
        "🏪 Tienda cargada:",
        tiendaActual
    );


    actualizarDatosVisualesTienda();
actualizarPerfilCompletoNegocio();

}


// =========================================================
// ACTUALIZAR NOMBRE DE TIENDA
// =========================================================

function actualizarDatosVisualesTienda() {

    const nombre =
        tiendaActual.nombre ||
        "Mi negocio";


    const tipo =
        tiendaActual.tipo ||
        tiendaActual.categoria ||
        "Negocio afiliado";


    const elementosNombre = [

        "businessName",

        "importBusinessName",

        "profileBusinessName"

    ];


    elementosNombre.forEach(
        id => {

            const elemento =
                document.getElementById(id);

            if (elemento) {

                elemento.textContent =
                    nombre;

            }

        }
    );


    const elementosTipo = [

        "businessType",

        "profileBusinessType"

    ];


    elementosTipo.forEach(
        id => {

            const elemento =
                document.getElementById(id);

            if (elemento) {

                elemento.textContent =
                    tipo;

            }

        }
    );


    const direccion =
        tiendaActual.direccion ||
        "No registrada";


    const profileAddress =
        document.getElementById(
            "profileAddress"
        );


    if (profileAddress) {

        profileAddress.textContent =
            direccion;

    }


    const welcomeTitle =
        document.getElementById(
            "welcomeTitle"
        );


    if (welcomeTitle) {

        welcomeTitle.textContent =
            `Hola, ${nombre} 👋`;

    }

}


// =========================================================
// PERFIL COMPLETO DEL NEGOCIO
// =========================================================

function obtenerValorNegocio(...valores) {
    return valores.find(
        valor =>
            valor !== undefined &&
            valor !== null &&
            String(valor).trim() !== ""
    );
}

function actualizarPerfilCompletoNegocio() {

    const usuario = datosUsuarioNegocio || {};
    const tienda = tiendaActual || {};

    const datos = {
        nombre: obtenerValorNegocio(
            tienda.nombre,
            tienda.nombreTienda,
            usuario.nombre,
            "Mi negocio"
        ),
        tipo: obtenerValorNegocio(
            tienda.tipo,
            tienda.categoria,
            "Negocio afiliado"
        ),
        categoria: obtenerValorNegocio(
            tienda.categoria,
            tienda.departamento,
            "No registrada"
        ),
        direccion: obtenerValorNegocio(
            tienda.direccion,
            tienda.domicilio,
            "No registrada"
        ),
        telefono: obtenerValorNegocio(
            tienda.telefono,
            tienda.telefonoContacto,
            usuario.telefono,
            usuario.telefonoContacto,
            "No registrado"
        ),
        email: obtenerValorNegocio(
            tienda.email,
            tienda.correo,
            usuario.email,
            usuario.correo,
            usuarioActual?.email,
            "No registrado"
        ),
        estado: obtenerValorNegocio(
            tienda.estado,
            usuario.estado,
            "Activo"
        ),
        id: obtenerValorNegocio(
            tienda.id,
            tiendaId,
            "No disponible"
        )
    };

    const asignaciones = {
        profileBusinessName: datos.nombre,
        profileBusinessType: datos.tipo,
        profileAddress: datos.direccion,
        profileBusinessCategory: datos.categoria,
        profileBusinessPhone: datos.telefono,
        profileBusinessEmail: datos.email,
        profileBusinessId: datos.id,
        profileBusinessStatus: datos.estado
    };

    Object.entries(asignaciones).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = String(valor);
    });

    const estadoElemento = document.getElementById("profileBusinessStatus");
    if (estadoElemento) {
        const estadoNormalizado = String(datos.estado || "activo").toLowerCase();
        const activo = !["inactivo", "suspendido", "bloqueado", "cerrado"].includes(estadoNormalizado);
        estadoElemento.classList.toggle("status-active", activo);
        estadoElemento.classList.toggle("status-inactive", !activo);
    }
}


// =========================================================
// CARGAR PRODUCTOS DE LA TIENDA — OPTIMIZADO
// =========================================================

async function cargarProductos() {

    console.log(
        "📦 Cargando productos de la tienda..."
    );


    try {

        if (!tiendaId) {

            console.warn(
                "⚠️ No hay tiendaId para cargar productos."
            );

productos = [];

productosFiltrados = [];

renderizarProductos();

            return;

        }


        // =================================================
        // 1. OBTENER INVENTARIOS DE LA TIENDA
        // =================================================

        const inventariosQuery =
            query(
                collection(
                    db,
                    "inventarios"
                ),
                where(
                    "tiendaId",
                    "==",
                    tiendaId
                )
            );


        const inventariosSnap =
            await getDocs(
                inventariosQuery
            );


        const inventarios =
            inventariosSnap.docs.map(
                docSnap => ({

                    id:
                        docSnap.id,

                    ...docSnap.data()

                })
            );


        console.log(
            "📦 Inventarios encontrados:",
            inventarios.length
        );


        if (
            inventarios.length === 0
        ) {

productos = [];

productosFiltrados = [];

renderizarProductos();

            console.log(
                "📭 La tienda no tiene productos."
            );

            return;

        }


        // =================================================
        // 2. OBTENER PRODUCT IDS ÚNICOS
        // =================================================

        const productIds =
            [
                ...new Set(
                    inventarios
                        .map(
                            inventario =>
                                inventario.productoId
                        )
                        .filter(
                            id =>
                                !!id
                        )
                )
            ];


        console.log(
            "🔎 Productos únicos a consultar:",
            productIds.length
        );


        // =================================================
        // 3. CONSULTAR PRODUCTOS EN LOTES
        // =================================================
        //
        // Firestore permite consultar múltiples IDs
        // mediante documentId() + where("in").
        //
        // Usamos lotes de 30 para mantenernos dentro
        // del límite de la consulta.
        // =================================================

        const TAMANO_LOTE =
            30;


        const productosPorId =
            new Map();


        for (
            let i = 0;
            i < productIds.length;
            i += TAMANO_LOTE
        ) {

            const lote =
                productIds.slice(
                    i,
                    i + TAMANO_LOTE
                );


            console.log(
                `🔎 Consultando lote ${
                    Math.floor(
                        i / TAMANO_LOTE
                    ) + 1
                }...`,
                lote.length,
                "productos"
            );


            const productosQuery =
                query(
                    collection(
                        db,
                        "productos"
                    ),
                    where(
                        documentId(),
                        "in",
                        lote
                    )
                );


            const productosSnap =
                await getDocs(
                    productosQuery
                );


            productosSnap.docs.forEach(
                docSnap => {

                    productosPorId.set(
                        docSnap.id,
                        {

                            id:
                                docSnap.id,

                            ...docSnap.data()

                        }
                    );

                }
            );

        }


        console.log(
            "📚 Productos maestros encontrados:",
            productosPorId.size
        );


        // =================================================
        // 4. COMBINAR INVENTARIO + PRODUCTO
        // =================================================

        const productosCombinados =
            [];


        inventarios.forEach(
            inventario => {

                const producto =
                    productosPorId.get(
                        inventario.productoId
                    );


                // -----------------------------------------
                // Si el producto maestro no existe
                // -----------------------------------------

                if (!producto) {

                    console.warn(
                        "⚠️ No se encontró producto maestro:",
                        inventario.productoId
                    );

                    return;

                }


                // -----------------------------------------
                // Crear objeto completo
                // -----------------------------------------

                productosCombinados.push({

                    // =====================================
                    // IDENTIFICADORES
                    // =====================================

                    id:
                        producto.id,

                    productoId:
                        producto.id,

                    inventarioId:
                        inventario.id,


                    // =====================================
                    // PRODUCTO MAESTRO
                    // =====================================

                    nombre:
                        producto.nombre ||
                        "",

                    nombreNormalizado:
                        producto.nombreNormalizado ||
                        normalizarTexto(
                            producto.nombre ||
                            ""
                        ),

                    codigoBarras:
                        producto.codigoBarras ||
                        inventario.codigoBarras ||
                        "",

                    categoria:
                        producto.categoria ||
                        "otros",

                    departamentoOriginal:
                        producto.departamentoOriginal ||
                        "",

                    descripcion:
                        producto.descripcion ||
                        "",

                    imagenUrl:
                        producto.imagenUrl ||
                        "",


                    // =====================================
                    // INVENTARIO
                    // =====================================

                    codigoTienda:
                        inventario.codigoTienda ||
                        "",

                    precio:
                        Number(
                            inventario.precio ||
                            0
                        ),

                    costo:
                        Number(
                            inventario.costo ||
                            0
                        ),

                    existencia:
                        Number(
                            inventario.existencia ||
                            0
                        ),

                    inventarioMinimo:
                        Number(
                            inventario.inventarioMinimo ||
                            0
                        ),

                    inventarioMaximo:
                        Number(
                            inventario.inventarioMaximo ||
                            0
                        ),

                    tipoVenta:
                        inventario.tipoVenta ||
                        producto.tipoVenta ||
                        "unidad",

                    disponible:
                        inventario.disponible ===
                        true,


                    // =====================================
                    // REVISIÓN
                    // =====================================

                    necesitaRevision:
                        producto.necesitaRevision ===
                        true

                });

            }
        );


        // =================================================
        // 5. GUARDAR RESULTADO
        // =================================================

       productos =
    productosCombinados;


productosFiltrados =
    [...productos];


console.log(
    "🛒 Productos cargados:",
    productos.length
);


// =================================================
// 6. MOSTRAR PRODUCTOS
// =================================================

renderizarProductos();

actualizarEstadisticas();
        
    }
    catch (error) {

        console.error(
            "❌ Error cargando productos:",
            error
        );


productos = [];

productosFiltrados = [];

renderizarProductos();

    }

}


// =========================================================
// RENDERIZAR PRODUCTOS
// =========================================================

function renderizarProductos() {

    const container =
        document.getElementById(
            "businessProductsList"
        );


    const empty =
        document.getElementById(
            "businessProductsEmpty"
        );


    const count =
        document.getElementById(
            "businessProductsCount"
        );


    if (!container) return;


    container.innerHTML =
        "";


    if (
        productosFiltrados.length ===
        0
    ) {

        container.style.display =
            "none";


        if (empty) {

            empty.style.display =
                "block";

        }


    }
    else {

        container.style.display =
            "flex";


        if (empty) {

            empty.style.display =
                "none";

        }


        productosFiltrados.forEach(
            producto => {

                container.appendChild(
                    crearProductoElemento(
                        producto
                    )
                );

            }
        );

    }


    if (count) {

        count.textContent =
            `${productosFiltrados.length} producto${
                productosFiltrados.length === 1
                    ? ""
                    : "s"
            }`;

    }

}


// =========================================================
// CREAR ELEMENTO PRODUCTO
// =========================================================

function crearProductoElemento(
    producto
) {

    const article =
        document.createElement(
            "article"
        );


    article.className =
        "business-product-item";


    let estadoClase =
        "";


    if (
        producto.necesitaRevision
    ) {

        estadoClase =
            "review";

    }
    else if (
        !producto.disponible ||
        producto.existencia <= 0
    ) {

        estadoClase =
            "unavailable";

    }


    const imagen =
        producto.imagenUrl
            ? `
                <img
                    src="${escapeHtml(
                        producto.imagenUrl
                    )}"
                    alt="${escapeHtml(
                        producto.nombre
                    )}"
                    loading="lazy"
                >
            `
            : `
                <span class="material-symbols-outlined">
                    inventory_2
                </span>
            `;


    article.innerHTML = `

        <div class="business-product-image">

            ${imagen}

        </div>


        <div class="business-product-info">

            <strong>
                ${escapeHtml(
                    producto.nombre
                )}
            </strong>

            <span>
                ${escapeHtml(
                    formatearCategoria(
                        producto.categoria
                    )
                )}
                ·
                ${producto.existencia}
                disponibles
            </span>

        </div>


        <strong class="business-product-price">

            ${formatearPrecio(
                producto.precio
            )}

        </strong>


        <span
            class="business-product-status ${estadoClase}"
        ></span>

    `;


    article.addEventListener(
        "click",
        () => {

            console.log(
                "📦 Producto seleccionado:",
                producto
            );

            abrirProductoParaEditar(
                producto
            );

        }
    );


    return article;

}


// =========================================================
// ESTADÍSTICAS
// =========================================================

function actualizarEstadisticas() {

    const total =
        productos.length;


    const disponibles =
        productos.filter(
            producto =>
                producto.disponible &&
                producto.existencia > 0
        ).length;


    const revision =
        productos.filter(
            producto =>
                producto.necesitaRevision
        ).length;


    const totalProducts =
        document.getElementById(
            "totalProducts"
        );


    const availableProducts =
        document.getElementById(
            "availableProducts"
        );


    const reviewProducts =
        document.getElementById(
            "reviewProducts"
        );


    if (totalProducts) {

        totalProducts.textContent =
            total;

    }


    if (availableProducts) {

        availableProducts.textContent =
            disponibles;

    }


    if (reviewProducts) {

        reviewProducts.textContent =
            revision;

    }

}


// =========================================================
// BUSCADOR
// =========================================================

const productSearch =
    document.getElementById(
        "businessProductSearch"
    );


const clearProductSearch =
    document.getElementById(
        "clearProductSearch"
    );


if (productSearch) {

    productSearch.addEventListener(
        "input",
        () => {

            aplicarFiltros();

            const texto =
                productSearch.value
                    .trim();


            if (clearProductSearch) {

                clearProductSearch.classList.toggle(
                    "visible",
                    texto.length > 0
                );

            }

        }
    );

}


if (clearProductSearch) {

    clearProductSearch.addEventListener(
        "click",
        () => {

            if (productSearch) {

                productSearch.value =
                    "";

            }


            clearProductSearch.classList.remove(
                "visible"
            );


            aplicarFiltros();

        }
    );

}


// =========================================================
// FILTROS
// =========================================================

const productFilters =
    document.querySelectorAll(
        ".product-filter[data-filter]"
    );


productFilters.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                productFilters.forEach(
                    item => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                button.classList.add(
                    "active"
                );


                filtroActual =
                    button.dataset.filter;


                aplicarFiltros();

            }
        );

    }
);


// =========================================================
// APLICAR FILTROS
// =========================================================

function aplicarFiltros() {

    const texto =
        productSearch
            ? productSearch.value
                .trim()
                .toLowerCase()
            : "";


    productosFiltrados =
        productos.filter(
            producto => {

                const coincideTexto =

                    !texto ||

                    producto.nombre
                        .toLowerCase()
                        .includes(
                            texto
                        );


                if (!coincideTexto) {

                    return false;

                }


                switch (
                    filtroActual
                ) {

                    case "disponibles":

                        return (
                            producto.disponible &&
                            producto.existencia > 0
                        );


                    case "agotados":

                        return (
                            !producto.disponible ||
                            producto.existencia <= 0
                        );


                    case "revision":

                        return (
                            producto.necesitaRevision
                        );


                    default:

                        return true;

                }

            }
        );


    renderizarProductos();

}


// =========================================================
// IMPORTADOR DE ARCHIVO
// =========================================================

const catalogFile =
    document.getElementById(
        "businessCatalogFile"
    );


const uploadZone =
    document.getElementById(
        "businessUploadZone"
    );


const selectedFile =
    document.getElementById(
        "businessSelectedFile"
    );


const selectedFileName =
    document.getElementById(
        "businessSelectedFileName"
    );


const selectedFileSize =
    document.getElementById(
        "businessSelectedFileSize"
    );


const removeFile =
    document.getElementById(
        "businessRemoveFile"
    );


const processButton =
    document.getElementById(
        "businessProcessCatalog"
    );


if (catalogFile) {

    catalogFile.addEventListener(
        "change",
        () => {

            const archivo =
                catalogFile.files[0];


            if (!archivo) {

                limpiarArchivo();

                return;

            }


            seleccionarArchivo(
                archivo
            );

        }
    );

}


function seleccionarArchivo(
    archivo
) {

    const nombre =
        archivo.name.toLowerCase();


    const valido =

        nombre.endsWith(".xlsx") ||

        nombre.endsWith(".csv");


    if (!valido) {

        window.motiGoNotificar(
            "Selecciona un archivo Excel (.xlsx) o CSV (.csv)."
        );


        limpiarArchivo();

        return;

    }


    archivoSeleccionado =
        archivo;


    if (selectedFileName) {

        selectedFileName.textContent =
            archivo.name;

    }


    if (selectedFileSize) {

        selectedFileSize.textContent =
            formatearTamaño(
                archivo.size
            );

    }


    if (selectedFile) {

        selectedFile.style.display =
            "flex";

    }


    if (uploadZone) {

        uploadZone.style.display =
            "none";

    }


    if (processButton) {

        processButton.disabled =
            false;

    }


    console.log(
        "📄 Archivo seleccionado:",
        archivo.name
    );

}


// =========================================================
// DRAG & DROP
// =========================================================

if (uploadZone) {

    uploadZone.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

            uploadZone.classList.add(
                "dragover"
            );

        }
    );


    uploadZone.addEventListener(
        "dragleave",
        () => {

            uploadZone.classList.remove(
                "dragover"
            );

        }
    );


    uploadZone.addEventListener(
        "drop",
        event => {

            event.preventDefault();

            uploadZone.classList.remove(
                "dragover"
            );


            const archivo =
                event.dataTransfer.files[0];


            if (archivo) {

                seleccionarArchivo(
                    archivo
                );

            }

        }
    );

}


// =========================================================
// ELIMINAR ARCHIVO
// =========================================================

if (removeFile) {

    removeFile.addEventListener(
        "click",
        limpiarArchivo
    );

}


function limpiarArchivo() {

    archivoSeleccionado =
        null;


    productosParaImportar =
        [];


    if (catalogFile) {

        catalogFile.value =
            "";

    }


    if (selectedFile) {

        selectedFile.style.display =
            "none";

    }


    if (uploadZone) {

        uploadZone.style.display =
            "flex";

    }


    if (processButton) {

        processButton.disabled =
            true;

    }


    const results =
        document.getElementById(
            "businessImportResults"
        );


    if (results) {

        results.style.display =
            "none";

    }

}


// =========================================================
// PROCESAR CATÁLOGO
// =========================================================

if (processButton) {

    processButton.addEventListener(
        "click",
        procesarCatalogo
    );

}


async function procesarCatalogo() {

    if (!archivoSeleccionado) {

        window.motiGoNotificar(
            "Selecciona un archivo primero."
        );

        return;

    }


    if (!tiendaId) {

        window.motiGoNotificar(
            "Esta cuenta todavía no tiene una tienda asociada."
        );

        return;

    }


    if (
        typeof XLSX ===
        "undefined"
    ) {

        window.motiGoNotificar(
            "No se pudo cargar el lector de Excel."
        );

        return;

    }


    try {

        processButton.disabled =
            true;


        processButton.innerHTML = `

            <span class="material-symbols-outlined">
                progress_activity
            </span>

            Analizando catálogo...

        `;


        console.log(
            "📊 Analizando archivo..."
        );


        const buffer =
            await archivoSeleccionado.arrayBuffer();


        const workbook =
            XLSX.read(
                buffer,
                {
                    type: "array"
                }
            );


        console.log(
            "📑 Hojas encontradas:",
            workbook.SheetNames
        );


        const primeraHoja =
            workbook.Sheets[
                workbook.SheetNames[0]
            ];


        const filas =
            XLSX.utils.sheet_to_json(
                primeraHoja,
                {
                    defval: ""
                }
            );


        console.log(
            "📦 Filas encontradas:",
            filas.length
        );


        if (!filas.length) {

            throw new Error(
                "El archivo no contiene productos."
            );

        }


        const resultado =
            await analizarFilas(
                filas
            );


        productosParaImportar =
            resultado;


        mostrarResultadoImportacion(
            resultado
        );


    }
    catch (error) {

        console.error(
            "❌ Error procesando catálogo:",
            error
        );


        window.motiGoNotificar(
            "No pudimos procesar el archivo. Revisa la consola para más detalles."
        );

    }
    finally {

        processButton.disabled =
            false;


        processButton.innerHTML = `

            <span class="material-symbols-outlined">
                upload
            </span>

            Procesar catálogo

        `;

    }

}


// =========================================================
// ANALIZAR FILAS
// =========================================================

function detectarTipoCatalogo(filas = []) {
    let carne = 0, fruta = 0, variable = 0;
    for (const fila of filas) {
        const nombre = normalizarTexto(obtenerValor(fila, ["Producto", "producto", "Nombre", "nombre", "Descripción", "Descripcion"]));
        const departamento = normalizarTexto(obtenerValor(fila, ["Departamento", "departamento", "Categoría", "Categoria", "categoria"]));
        const tipoVenta = normalizarTexto(obtenerValor(fila, ["Tipo de Venta", "TipoVenta", "tipoVenta"]));
        const unidad = normalizarTexto(obtenerValor(fila, ["Unidad de Venta", "UnidadVenta", "unidadVenta", "Unidad", "unidad"]));
        const texto = `${nombre} ${departamento}`;
        if (/carn|res|cerdo|pollo|ave|embut|choriz|salch|tocino|costilla|bistec|milanesa|molida|carne/.test(texto)) carne++;
        if (/frut|verd|hortal|legum|tomate|jitomate|cebolla|papa|zanah|platano|mango|limon|manzana|aguacate|cilantro/.test(texto)) fruta++;
        if (["peso", "pesable"].includes(tipoVenta) || ["kg", "kilo", "kilogramo", "g", "gramo"].includes(unidad)) variable++;
    }
    const total = filas.length || 1;
    const tieneCarne = carne / total >= 0.25;
    const tieneFruta = fruta / total >= 0.25;
    if (tieneCarne && tieneFruta) return "mixto_variable";
    if (tieneCarne && (variable / total >= 0.10 || carne >= 3)) return "carniceria";
    if (tieneFruta && (variable / total >= 0.10 || fruta >= 3)) return "fruteria";
    if (variable / total >= 0.15) return "mixto_variable";
    return "estandar";
}

function normalizarUnidadVenta(valor, tipoVenta = "") {
    const unidad = normalizarTexto(valor);
    const tipo = normalizarTexto(tipoVenta);
    if (["kg", "kilo", "kilogramo", "kilogramos"].includes(unidad) || tipo === "peso" || tipo === "pesable") return "kg";
    if (["g", "gramo", "gramos"].includes(unidad)) return "g";
    if (["l", "litro", "litros"].includes(unidad)) return "l";
    if (["ml", "mililitro", "mililitros"].includes(unidad)) return "ml";
    if (["manojo", "manojos"].includes(unidad)) return "manojo";
    if (["paquete", "paquetes"].includes(unidad)) return "paquete";
    return unidad || "pieza";
}

async function analizarFilas(
    filas
) {

    const resultado = [];
    const tipoCatalogoDetectado = detectarTipoCatalogo(filas);

    console.log("🏪 MOTI GO: tipo de catálogo detectado:", tipoCatalogoDetectado);


    // =====================================================
    // 1. CARGAR PRODUCTOS MAESTROS EXISTENTES
    // =====================================================

    const productosSnap =
        await getDocs(
            collection(
                db,
                "productos"
            )
        );


    const existentes =
        productosSnap.docs.map(
            docSnap => ({

                id:
                    docSnap.id,

                ...docSnap.data()

            })
        );


    console.log(
        "📚 Productos maestros encontrados:",
        existentes.length
    );


    // =====================================================
    // 2. CARGAR INVENTARIOS DE ESTA TIENDA
    // =====================================================

    let inventariosTienda = [];


    if (tiendaId) {

        const inventariosQuery =
            query(
                collection(
                    db,
                    "inventarios"
                ),
                where(
                    "tiendaId",
                    "==",
                    tiendaId
                )
            );


        const inventariosSnap =
            await getDocs(
                inventariosQuery
            );


        inventariosTienda =
            inventariosSnap.docs.map(
                docSnap => ({

                    id:
                        docSnap.id,

                    ...docSnap.data()

                })
            );


        console.log(
            "🏪 Inventarios de esta tienda:",
            inventariosTienda.length
        );

    }


    // =====================================================
    // 3. CREAR ÍNDICES PARA BÚSQUEDA RÁPIDA
    // =====================================================

    const productosPorGTIN =
        new Map();


    const productosPorNombre =
        new Map();


    const inventariosPorCodigo =
        new Map();


    // -----------------------------------------------------
    // PRODUCTOS POR GTIN
    // -----------------------------------------------------

    existentes.forEach(
        producto => {

            const gtin =
                normalizarGTIN(
                    producto.codigoBarras
                );


            if (
                gtin &&
                !productosPorGTIN.has(
                    gtin
                )
            ) {

                productosPorGTIN.set(
                    gtin,
                    producto
                );

            }


            // ---------------------------------------------
            // RESPALDO POR NOMBRE
            // ---------------------------------------------

            const nombreNormalizado =
                producto.nombreNormalizado ||
                normalizarTexto(
                    producto.nombre ||
                    ""
                );


            if (
                nombreNormalizado &&
                !productosPorNombre.has(
                    nombreNormalizado
                )
            ) {

                productosPorNombre.set(
                    nombreNormalizado,
                    producto
                );

            }

        }
    );


    // -----------------------------------------------------
    // INVENTARIOS POR CÓDIGO DE TIENDA
    // -----------------------------------------------------

    inventariosTienda.forEach(
        inventario => {

            const codigo =
                normalizarGTIN(
                    inventario.codigoTienda
                );


            if (
                codigo &&
                !inventariosPorCodigo.has(
                    codigo
                )
            ) {

                inventariosPorCodigo.set(
                    codigo,
                    inventario
                );

            }

        }
    );


    // =====================================================
    // 4. DETECTAR GTIN DUPLICADOS DENTRO DEL EXCEL
    // =====================================================

    const gtinsArchivo =
        new Map();


    filas.forEach(
        fila => {

            const codigo =
                obtenerValor(
                    fila,
                    [
                        "Código",
                        "Codigo",
                        "codigo",
                        "GTIN",
                        "gtin",
                        "EAN",
                        "EAN13",
                        "EAN-13",
                        "Código de barras",
                        "Codigo de barras",
                        "CodigoBarras",
                        "codigoBarras"
                    ]
                );


            const gtin =
                normalizarGTIN(
                    codigo
                );


            if (!gtin) {
                return;
            }


            if (
                gtinsArchivo.has(
                    gtin
                )
            ) {

                gtinsArchivo
                    .get(
                        gtin
                    )
                    .push(
                        fila
                    );

            }
            else {

                gtinsArchivo.set(
                    gtin,
                    [fila]
                );

            }

        }
    );


    // =====================================================
    // 5. ANALIZAR CADA FILA
    // =====================================================

    for (
        const fila
        of filas
    ) {

        // -------------------------------------------------
        // NOMBRE
        // -------------------------------------------------

        const nombre =
            obtenerValor(
                fila,
                [
                    "Producto",
                    "producto",
                    "Nombre",
                    "nombre",
                    "Descripción",
                    "Descripcion"
                ]
            );


        // -------------------------------------------------
        // DEPARTAMENTO
        // -------------------------------------------------

        const departamento =
            obtenerValor(
                fila,
                [
                    "Departamento",
                    "departamento",
                    "Categoría",
                    "Categoria",
                    "categoria"
                ]
            );


        // -------------------------------------------------
        // PRECIO DE VENTA
        // -------------------------------------------------

        const precio =
            convertirNumero(
                obtenerValor(
                    fila,
                    [
                        "P. Venta",
                        "P.Venta",
                        "Precio Venta",
                        "Precio",
                        "precio"
                    ]
                )
            );


        // -------------------------------------------------
        // COSTO
        // -------------------------------------------------

        const costo =
            convertirNumero(
                obtenerValor(
                    fila,
                    [
                        "P. Costo",
                        "P.Costo",
                        "Costo",
                        "costo"
                    ]
                )
            );


        // -------------------------------------------------
        // MAYOREO
        // -------------------------------------------------

        const mayoreo =
            convertirNumero(
                obtenerValor(
                    fila,
                    [
                        "P. Mayoreo",
                        "P.Mayoreo",
                        "Mayoreo",
                        "precioMayoreo"
                    ]
                )
            );


        // -------------------------------------------------
        // EXISTENCIA
        // -------------------------------------------------

        const existencia =
            convertirNumero(
                obtenerValor(
                    fila,
                    [
                        "Existencia",
                        "existencia",
                        "Stock",
                        "stock"
                    ]
                )
            );


        // -------------------------------------------------
        // INVENTARIO MÍNIMO
        // -------------------------------------------------

        const minimo =
            convertirNumero(
                obtenerValor(
                    fila,
                    [
                        "Inv. Mínimo",
                        "Inv.Minimo",
                        "Inv. Mínimo",
                        "Minimo",
                        "Mínimo"
                    ]
                )
            );


        // -------------------------------------------------
        // INVENTARIO MÁXIMO
        // -------------------------------------------------

        const maximo =
            convertirNumero(
                obtenerValor(
                    fila,
                    [
                        "Inv. Máximo",
                        "Inv.Maximo",
                        "Inv. Máximo",
                        "Maximo",
                        "Máximo"
                    ]
                )
            );


        // -------------------------------------------------
        // TIPO DE VENTA
        // -------------------------------------------------

        const tipoVenta =
            obtenerValor(
                fila,
                [
                    "Tipo de Venta",
                    "TipoVenta",
                    "tipoVenta"
                ]
            );

        const unidadVenta = normalizarUnidadVenta(
            obtenerValor(fila, ["Unidad de Venta", "UnidadVenta", "unidadVenta", "Unidad", "unidad"]),
            tipoVenta
        );

        const incrementoVenta = convertirNumero(
            obtenerValor(fila, ["Incremento", "Incremento Venta", "incrementoVenta"])
        ) || (unidadVenta === "kg" ? 0.25 : 1);

        const cantidadMinimaVenta = convertirNumero(
            obtenerValor(fila, ["Cantidad Mínima", "Cantidad Minima", "cantidadMinimaVenta", "Mínimo de Venta"])
        ) || (unidadVenta === "kg" ? 0.25 : 1);


        // -------------------------------------------------
        // CÓDIGO / GTIN
        // -------------------------------------------------

        const codigo =
            obtenerValor(
                fila,
                [
                    "Código",
                    "Codigo",
                    "codigo",
                    "GTIN",
                    "gtin",
                    "EAN",
                    "EAN13",
                    "EAN-13",
                    "Código de barras",
                    "Codigo de barras",
                    "CodigoBarras",
                    "codigoBarras"
                ]
            );


        const gtin =
            normalizarGTIN(
                codigo
            );


        // -------------------------------------------------
        // NOMBRE NORMALIZADO
        // -------------------------------------------------

        const nombreNormalizado =
            normalizarTexto(
                nombre
            );


        // =================================================
        // BUSCAR PRODUCTO EXISTENTE
        // =================================================

        let productoExistente =
            null;


        let metodoCoincidencia =
            "ninguno";


        // -------------------------------------------------
        // PRIORIDAD 1: GTIN
        // -------------------------------------------------

        if (gtin) {

            productoExistente =
                productosPorGTIN.get(
                    gtin
                );


            if (
                productoExistente
            ) {

                metodoCoincidencia =
                    "gtin";

            }

        }


        // -------------------------------------------------
        // PRIORIDAD 2:
        // INVENTARIO DE ESTA TIENDA
        // -------------------------------------------------

        if (
            !productoExistente &&
            gtin
        ) {

            const inventarioExistente =
                inventariosPorCodigo.get(
                    gtin
                );


            if (
                inventarioExistente &&
                inventarioExistente.productoId
            ) {

                productoExistente =
                    existentes.find(
                        producto =>
                            producto.id ===
                            inventarioExistente.productoId
                    );


                if (
                    productoExistente
                ) {

                    metodoCoincidencia =
                        "codigo_tienda";

                }

            }

        }


        // -------------------------------------------------
        // PRIORIDAD 3:
        // NOMBRE COMO RESPALDO
        // -------------------------------------------------

        if (
            !productoExistente &&
            nombreNormalizado
        ) {

            productoExistente =
                productosPorNombre.get(
                    nombreNormalizado
                );


            if (
                productoExistente
            ) {

                metodoCoincidencia =
                    "nombre";

            }

        }


        // =================================================
        // DUPLICADO DENTRO DEL MISMO EXCEL
        // =================================================

        let duplicadoArchivo =
            false;


        if (gtin) {

            const coincidencias =
                gtinsArchivo.get(
                    gtin
                );


            if (
                coincidencias &&
                coincidencias.length > 1
            ) {

                duplicadoArchivo =
                    true;

            }

        }


        // =================================================
        // DETERMINAR ESTADO
        // =================================================

        let estado;


        if (
            duplicadoArchivo
        ) {

            estado =
                "duplicado";

        }
        else if (
            productoExistente
        ) {

            estado =
                "existente";

        }
        else {

            estado =
                "nuevo";

        }


        // =================================================
        // GUARDAR RESULTADO
        // =================================================

        resultado.push({

            nombre:
                nombre.trim(),

            nombreNormalizado,

            codigoTienda:
                codigo,

            codigoBarras:
                gtin,

            precio,

            costo,

            mayoreo,

            categoria:
                mapearCategoria(
                    departamento
                ),

            departamentoOriginal:
                departamento,

            existencia,

            inventarioMinimo:
                minimo,

            inventarioMaximo:
                maximo,

            tipoVenta:
                normalizarTipoVenta(
                    tipoVenta
                ),

            unidadVenta,
            incrementoVenta,
            cantidadMinimaVenta,
            tipoCatalogo: tipoCatalogoDetectado,

            productoExistenteId:
                productoExistente
                    ? productoExistente.id
                    : null,

            metodoCoincidencia,

            estado

        });

    }


    // =====================================================
    // RESUMEN EN CONSOLA
    // =====================================================

    console.log(
        "🔎 Productos maestros indexados por GTIN:",
        productosPorGTIN.size
    );


    console.log(
        "🔎 Productos indexados por nombre:",
        productosPorNombre.size
    );


    console.log(
        "🏪 Inventarios de la tienda:",
        inventariosTienda.length
    );


    return resultado;

}


// =========================================================
// MOSTRAR RESULTADO IMPORTACIÓN
// =========================================================

function mostrarResultadoImportacion(
    resultado
) {

    const results =
        document.getElementById(
            "businessImportResults"
        );


    // =====================================================
    // CONTADORES
    // =====================================================

    const total =
        resultado.length;


    const existentes =
        resultado.filter(
            item =>
                item.estado ===
                "existente"
        ).length;


    const nuevos =
        resultado.filter(
            item =>
                item.estado ===
                "nuevo"
        ).length;


    const duplicados =
        resultado.filter(
            item =>
                item.estado ===
                "duplicado"
        ).length;


    const revision =
        resultado.filter(
            item =>
                !item.nombre ||
                item.precio <= 0
        ).length;


    // =====================================================
    // MOSTRAR PANEL DE RESULTADOS
    // =====================================================

    if (results) {

        results.style.display =
            "block";

    }


    const totalElement =
        document.getElementById(
            "businessImportTotal"
        );


    const recognizedElement =
        document.getElementById(
            "businessRecognizedCount"
        );


    const newElement =
        document.getElementById(
            "businessNewCount"
        );


    const reviewElement =
        document.getElementById(
            "businessReviewCount"
        );


    if (totalElement) {

        totalElement.textContent =
            `${total} productos`;

    }


    if (recognizedElement) {

        recognizedElement.textContent =
            existentes;

    }


    if (newElement) {

        newElement.textContent =
            nuevos;

    }


    if (reviewElement) {

        reviewElement.textContent =
            revision +
            duplicados;

    }


    // =====================================================
    // VISTA PREVIA
    // =====================================================

    const preview =
        document.getElementById(
            "businessImportPreview"
        );


    if (!preview) {

        return;

    }


    preview.innerHTML =
        "";


    resultado
        .slice(
            0,
            20
        )
        .forEach(
            producto => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.style.padding =
                    "11px 13px";


                item.style.borderBottom =
                    "1px solid #f0f1f3";


                // -----------------------------------------
                // TEXTO DEL ESTADO
                // -----------------------------------------

                let estadoTexto =
                    "Nuevo";


                if (
                    producto.estado ===
                    "existente"
                ) {

                    estadoTexto =
                        `Existente · ${producto.metodoCoincidencia}`;

                }


                if (
                    producto.estado ===
                    "duplicado"
                ) {

                    estadoTexto =
                        "⚠️ GTIN DUPLICADO";

                }


                if (
                    !producto.codigoBarras
                ) {

                    estadoTexto +=
                        " · Sin GTIN";

                }


                // -----------------------------------------
                // ELEMENTO
                // -----------------------------------------

                item.innerHTML = `

                    <strong>
                        ${escapeHtml(
                            producto.nombre
                        )}
                    </strong>

                    <div
                        style="
                            margin-top:3px;
                            color:#9ca3af;
                            font-size:9px;
                        "
                    >

                        ${
                            producto.codigoBarras
                                ? `GTIN: ${escapeHtml(
                                    producto.codigoBarras
                                )}`
                                : "Sin GTIN"
                        }

                        ·

                        ${formatearPrecio(
                            producto.precio
                        )}

                        ·

                        ${escapeHtml(
                            formatearCategoria(
                                producto.categoria
                            )
                        )}

                        ·

                        ${estadoTexto}

                    </div>

                `;


                preview.appendChild(
                    item
                );

            }
        );


    // =====================================================
    // MENSAJE SI HAY MÁS DE 20
    // =====================================================

    if (
        resultado.length >
        20
    ) {

        const more =
            document.createElement(
                "div"
            );


        more.style.padding =
            "12px";


        more.style.textAlign =
            "center";


        more.style.color =
            "#9ca3af";


        more.style.fontSize =
            "9px";


        more.textContent =
            `Mostrando 20 de ${resultado.length} productos.`;


        preview.appendChild(
            more
        );

    }


    // =====================================================
    // BOTÓN DE IMPORTAR
    // =====================================================

    const confirmButton =
        document.getElementById(
            "businessConfirmImport"
        );


    if (confirmButton) {

        // -------------------------------------------------
        // NO PERMITIR IMPORTAR SI HAY GTIN DUPLICADOS
        // -------------------------------------------------

        confirmButton.disabled =
            resultado.length === 0 ||
            duplicados > 0;

    }


    // =====================================================
    // MENSAJE VISUAL SI HAY DUPLICADOS
    // =====================================================

    if (
        duplicados > 0
    ) {

        const mensaje =
            document.createElement(
                "div"
            );


        mensaje.style.marginTop =
            "14px";


        mensaje.style.padding =
            "12px";


        mensaje.style.borderRadius =
            "10px";


        mensaje.style.background =
            "#fff3f3";


        mensaje.style.color =
            "#b42318";


        mensaje.style.fontSize =
            "11px";


        mensaje.style.lineHeight =
            "1.5";


        mensaje.innerHTML = `

            <strong>
                ⚠️ No se puede importar todavía
            </strong>

            <br>

            Se encontraron
            <strong>
                ${duplicados}
            </strong>
            filas con GTIN duplicados
            dentro del archivo.

            <br><br>

            Corrige esos códigos en el Excel
            antes de continuar.

        `;


        preview.appendChild(
            mensaje
        );

    }


    // =====================================================
    // MENSAJE SI HAY PRODUCTOS SIN GTIN
    // =====================================================

    const sinGTIN =
        resultado.filter(
            item =>
                !item.codigoBarras
        ).length;


    if (
        sinGTIN > 0
    ) {

        const mensajeGTIN =
            document.createElement(
                "div"
            );


        mensajeGTIN.style.marginTop =
            "10px";


        mensajeGTIN.style.padding =
            "10px";


        mensajeGTIN.style.borderRadius =
            "10px";


        mensajeGTIN.style.background =
            "#fff8e8";


        mensajeGTIN.style.color =
            "#8a5a00";


        mensajeGTIN.style.fontSize =
            "10px";


        mensajeGTIN.innerHTML = `

            ⚠️
            <strong>
                ${sinGTIN}
            </strong>
            productos no tienen GTIN.

            <br>

            MOTI utilizará el nombre como
            respaldo para identificarlos.

        `;


        preview.appendChild(
            mensajeGTIN
        );

    }


    // =====================================================
    // SCROLL
    // =====================================================

    results.scrollIntoView({

        behavior:
            "smooth",

        block:
            "start"

    });


    // =====================================================
    // CONSOLA
    // =====================================================

    console.log(
        "📊 Resultado del análisis:",
        {

            total,

            existentes,

            nuevos,

            duplicados,

            sinGTIN,

            revision

        }
    );

}


// =========================================================
// CONFIRMAR IMPORTACIÓN
// =========================================================

const confirmImport =
    document.getElementById(
        "businessConfirmImport"
    );


if (confirmImport) {

    confirmImport.addEventListener(
        "click",
        importarProductos
    );

}


// =========================================================
// IMPORTAR PRODUCTOS
// =========================================================

async function importarProductos() {

    if (
        !productosParaImportar ||
        productosParaImportar.length === 0
    ) {

        window.motiGoNotificar(
            "No hay productos para importar."
        );

        return;

    }


    // =====================================================
    // VERIFICAR TIENDA
    // =====================================================

    if (!tiendaId) {

        window.motiGoNotificar(
            "No hay una tienda asociada a esta cuenta."
        );

        return;

    }


    // =====================================================
    // NO PERMITIR DUPLICADOS DEL ARCHIVO
    // =====================================================

    const duplicados =
        productosParaImportar.filter(
            producto =>
                producto.estado ===
                "duplicado"
        );


    if (
        duplicados.length > 0
    ) {

        window.motiGoNotificar(

            "No se puede importar el catálogo.\n\n" +

            `Se encontraron ${duplicados.length} ` +
            "filas con GTIN duplicados dentro del archivo.\n\n" +

            "Corrige el archivo y vuelve a intentarlo."

        );

        return;

    }


    try {

        // =================================================
        // DESHABILITAR BOTÓN
        // =================================================

        confirmImport.disabled =
            true;


        confirmImport.innerHTML = `

            <span class="material-symbols-outlined">
                progress_activity
            </span>

            Guardando catálogo...

        `;


        let nuevos =
            0;


        let actualizados =
            0;


        let inventariosActualizados =
            0;


        // =================================================
        // PROCESAR CADA PRODUCTO
        // =================================================

        for (
            const item
            of productosParaImportar
        ) {


            // =============================================
            // PRODUCTO EXISTENTE
            // =============================================

            let productoId =
                item.productoExistenteId;


            // =============================================
            // SI NO EXISTE → CREAR PRODUCTO MAESTRO
            // =============================================

            if (!productoId) {

                const productoRef =
                    await addDoc(
                        collection(
                            db,
                            "productos"
                        ),
                        {

                            codigoBarras:
                                item.codigoBarras ||
                                "",

                            nombre:
                                item.nombre,

                            nombreNormalizado:
                                item.nombreNormalizado,

                            categoria:
                                item.categoria,

                            departamentoOriginal:
                                item.departamentoOriginal,

                            tipoVenta:
                                item.tipoVenta,

                            unidadVenta:
                                item.unidadVenta,

                            incrementoVenta:
                                item.incrementoVenta,

                            cantidadMinimaVenta:
                                item.cantidadMinimaVenta,

                            tipoCatalogo:
                                item.tipoCatalogo,

                            imagenUrl:
                                "",

                            descripcion:
                                "",

                            necesitaRevision:
                                item.precio <= 0,

                            creadoEn:
                                serverTimestamp(),

                            actualizadoEn:
                                serverTimestamp()

                        }
                    );


                productoId =
                    productoRef.id;


                nuevos++;

            }


            // =============================================
            // SI YA EXISTE → ACTUALIZAR PRODUCTO
            // =============================================

            else {

    await setDoc(

        doc(
            db,
            "productos",
            productoId
        ),

        {

            codigoBarras:
                item.codigoBarras ||
                "",

            nombre:
                item.nombre,

            nombreNormalizado:
                item.nombreNormalizado,

            categoria:
                item.categoria,

            departamentoOriginal:
                item.departamentoOriginal,

            tipoVenta:
                item.tipoVenta,

            unidadVenta:
                item.unidadVenta,

            incrementoVenta:
                item.incrementoVenta,

            cantidadMinimaVenta:
                item.cantidadMinimaVenta,

            tipoCatalogo:
                item.tipoCatalogo,

            // =============================================
            // REVISIÓN
            // =============================================

            necesitaRevision:
                !item.nombre ||
                item.precio <= 0,

            actualizadoEn:
                serverTimestamp()

        },

        {
            merge: true
        }

    );


    actualizados++;

}


            // =============================================
            // INVENTARIO DE LA TIENDA
            // =============================================

            const inventarioId =
                `${tiendaId}_${productoId}`;


            await setDoc(

                doc(
                    db,
                    "inventarios",
                    inventarioId
                ),

                {

                    tiendaId,

                    productoId,

                    // -------------------------------------
                    // CÓDIGOS
                    // -------------------------------------

                    codigoTienda:
                        item.codigoTienda,

                    codigoBarras:
                        item.codigoBarras ||
                        "",

                    // -------------------------------------
                    // PRECIOS
                    // -------------------------------------

                    precio:
                        item.precio,

                    costo:
                        item.costo,

                    precioMayoreo:
                        item.mayoreo,

                    // -------------------------------------
                    // EXISTENCIAS
                    // -------------------------------------

                    existencia:
                        item.existencia,

                    inventarioMinimo:
                        item.inventarioMinimo,

                    inventarioMaximo:
                        item.inventarioMaximo,

                    // -------------------------------------
                    // TIPO DE VENTA
                    // -------------------------------------

                    tipoVenta:
                        item.tipoVenta,

                    unidadVenta:
                        item.unidadVenta,

                    incrementoVenta:
                        item.incrementoVenta,

                    cantidadMinimaVenta:
                        item.cantidadMinimaVenta,

                    tipoCatalogo:
                        item.tipoCatalogo,

                    // -------------------------------------
                    // DISPONIBILIDAD
                    // -------------------------------------

                    disponible:
                        item.existencia > 0,

                    // -------------------------------------
                    // FECHA
                    // -------------------------------------

                    actualizadoEn:
                        serverTimestamp()

                },

                {
                    merge: true
                }

            );


            inventariosActualizados++;

        }


        // =================================================
        // GUARDAR TIPO DE CATÁLOGO DETECTADO
        // =================================================

        const tipoCatalogoImportado =
            productosParaImportar[0]?.tipoCatalogo ||
            "estandar";

        await setDoc(
            doc(db, "tiendas", tiendaId),
            {
                tipoCatalogo: tipoCatalogoImportado,
                catalogoVariable: tipoCatalogoImportado !== "estandar",
                catalogoActualizadoEn: serverTimestamp()
            },
            { merge: true }
        );

        // =================================================
        // RESULTADO
        // =================================================

        console.log(
            "✅ IMPORTACIÓN COMPLETADA",
            {

                nuevos,

                actualizados,

                inventariosActualizados

            }
        );


        window.motiGoNotificar(

            "Catálogo importado correctamente.\n\n" +

            `Productos nuevos: ${nuevos}\n` +

            `Productos actualizados: ${actualizados}\n` +

            `Inventarios actualizados: ${inventariosActualizados}`

        );


        // =================================================
        // LIMPIAR IMPORTACIÓN
        // =================================================

        limpiarArchivo();


        // =================================================
        // RECARGAR PRODUCTOS
        // =================================================

        await cargarProductos();


        // =================================================
        // VOLVER A PRODUCTOS
        // =================================================

        cambiarVista(
            "productos"
        );

    }
    catch (error) {

        console.error(
            "❌ ERROR IMPORTANDO CATÁLOGO:",
            error
        );


        window.motiGoNotificar(

            "Ocurrió un error al guardar el catálogo.\n\n" +

            "Revisa la consola para conocer el detalle."

        );

    }
    finally {

        confirmImport.disabled =
            false;


        confirmImport.innerHTML = `

            <span class="material-symbols-outlined">
                cloud_upload
            </span>

            Importar catálogo

        `;

    }

}

// =========================================================
// AGREGAR PRODUCTO MANUAL
// =========================================================

const productForm =
    document.getElementById(
        "businessProductForm"
    );


if (productForm) {

    productForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (!tiendaId) {

                window.motiGoNotificar(
                    "Esta cuenta no tiene una tienda asociada."
                );

                return;

            }


            try {

                const nombre =
                    document.getElementById(
                        "productName"
                    ).value.trim();


                const categoria =
                    document.getElementById(
                        "productCategory"
                    ).value;


                const tipoVenta =
                    document.getElementById(
                        "productSaleType"
                    ).value;


                const precio =
                    Number(
                        document.getElementById(
                            "productPrice"
                        ).value
                    );


                const unidad =
                    document.getElementById(
                        "productUnit"
                    ).value;


                const descripcion =
                    document.getElementById(
                        "productDescription"
                    ).value.trim();


                const disponible =
                    document.getElementById(
                        "productAvailable"
                    ).checked;


                if (
                    !nombre ||
                    !categoria ||
                    precio < 0
                ) {

                    window.motiGoNotificar(
                        "Completa los campos obligatorios."
                    );

                    return;

                }


                const nombreNormalizado =
                    normalizarTexto(
                        nombre
                    );


                // -------------------------------------
                // Buscar producto maestro
                // -------------------------------------

                const productosSnap =
                    await getDocs(
                        collection(
                            db,
                            "productos"
                        )
                    );


                let productoExistente =
                    productosSnap.docs.find(
                        snap => {

                            const data =
                                snap.data();


                            return (
                                (
                                    data.nombreNormalizado ||
                                    normalizarTexto(
                                        data.nombre ||
                                        ""
                                    )
                                ) ===
                                nombreNormalizado
                            );

                        }
                    );


                let productoId;


                if (
                    productoExistente
                ) {

                    productoId =
                        productoExistente.id;

                }
                else {

                    const nuevo =
                        await addDoc(
                            collection(
                                db,
                                "productos"
                            ),
                            {

                                nombre,

                                nombreNormalizado,

                                categoria,

                                tipoVenta,

                                unidad,

                                descripcion,

                                imagenUrl:
                                    "",

                                necesitaRevision:
                                    false,

                                creadoEn:
                                    serverTimestamp(),

                                actualizadoEn:
                                    serverTimestamp()

                            }
                        );


                    productoId =
                        nuevo.id;

                }


                // -------------------------------------
                // Inventario
                // -------------------------------------

                await setDoc(

                    doc(
                        db,
                        "inventarios",
                        `${tiendaId}_${productoId}`
                    ),

                    {

                        tiendaId,

                        productoId,

                        precio,

                        existencia:
                            disponible
                                ? 1
                                : 0,

                        disponible,

                        tipoVenta,

                        unidad,

                        actualizadoEn:
                            serverTimestamp()

                    },

                    {
                        merge: true
                    }

                );


                window.motiGoNotificar(
                    "Producto guardado correctamente."
                );


                productForm.reset();


                const available =
                    document.getElementById(
                        "productAvailable"
                    );


                if (available) {

                    available.checked =
                        true;

                }


                await cargarProductos();


                cambiarVista(
                    "productos"
                );


            }
            catch (error) {

                console.error(
                    "❌ Error guardando producto:",
                    error
                );


                window.motiGoNotificar(
                    "No se pudo guardar el producto."
                );

            }

        }
    );

}


// =========================================================
// EDITAR PRODUCTO
// =========================================================

function abrirProductoParaEditar(
    producto
) {

    console.log(
        "✏️ Editando producto:",
        producto
    );


    // =====================================================
    // CREAR MODAL
    // =====================================================

    const modalExistente =
        document.getElementById(
            "modalEditarProducto"
        );


    if (modalExistente) {

        modalExistente.remove();

    }


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "modalEditarProducto";


    modal.style.position =
        "fixed";

    modal.style.inset =
        "0";

    modal.style.background =
        "rgba(0,0,0,0.45)";

    modal.style.display =
        "flex";

    modal.style.alignItems =
        "center";

    modal.style.justifyContent =
        "center";

    modal.style.zIndex =
        "9999";

    modal.style.padding =
        "20px";


    // =====================================================
    // CONTENEDOR
    // =====================================================

    const contenido =
        document.createElement(
            "div"
        );


    contenido.style.width =
        "100%";

    contenido.style.maxWidth =
        "430px";

    contenido.style.maxHeight =
        "90vh";

    contenido.style.overflowY =
        "auto";

    contenido.style.background =
        "#ffffff";

    contenido.style.borderRadius =
        "18px";

    contenido.style.padding =
        "22px";

    contenido.style.boxShadow =
        "0 20px 50px rgba(0,0,0,0.20)";


    // =====================================================
    // TÍTULO
    // =====================================================

    contenido.innerHTML = `

        <div
            style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                margin-bottom:18px;
            "
        >

            <div>

                <div
                    style="
                        font-size:18px;
                        font-weight:700;
                        color:#111827;
                    "
                >
                    Editar producto
                </div>

                <div
                    style="
                        margin-top:4px;
                        font-size:10px;
                        color:#9ca3af;
                    "
                >
                    GTIN:
                    ${escapeHtml(
                        producto.codigoBarras ||
                        "Sin GTIN"
                    )}
                </div>

            </div>


            <button
                id="btnCerrarEditarProducto"
                type="button"
                style="
                    border:0;
                    background:#f3f4f6;
                    width:34px;
                    height:34px;
                    border-radius:50%;
                    cursor:pointer;
                    font-size:18px;
                "
            >
                ×
            </button>

        </div>


        <!-- IMAGEN DEL PRODUCTO -->

<div
    style="
        margin-bottom:20px;
        text-align:center;
    "
>

    <div
        id="previewImagenProducto"
        style="
            width:130px;
            height:130px;
            margin:0 auto 10px;
            border-radius:16px;
            border:1px solid #e5e7eb;
            background:#f9fafb;
            display:flex;
            align-items:center;
            justify-content:center;
            overflow:hidden;
        "
    >

        ${
            producto.imagenUrl
                ? `
                    <img
                        src="${escapeHtml(
                            producto.imagenUrl
                        )}"
                        alt="${escapeHtml(
                            producto.nombre || "Producto"
                        )}"
                        style="
                            width:100%;
                            height:100%;
                            object-fit:contain;
                        "
                    >
                `
                : `
                    <span
                        class="material-symbols-outlined"
                        style="
                            font-size:42px;
                            color:#9ca3af;
                        "
                    >
                        image
                    </span>
                `
        }

    </div>


    <label
        for="editarImagenProducto"
        style="
            display:inline-flex;
            align-items:center;
            justify-content:center;
            gap:7px;
            padding:9px 14px;
            border-radius:10px;
            background:#f3f4f6;
            color:#374151;
            font-size:11px;
            font-weight:600;
            cursor:pointer;
        "
    >

        <span class="material-symbols-outlined">
            photo_camera
        </span>

        Cambiar imagen

    </label>


    <input
        id="editarImagenProducto"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style="
            display:none;
        "
    />

</div>

        <!-- NOMBRE -->

        <label
            style="
                display:block;
                margin-bottom:6px;
                font-size:11px;
                font-weight:600;
                color:#374151;
            "
        >
            Nombre
        </label>

        <input
            id="editarNombreProducto"
            type="text"
            value="${escapeHtml(
                producto.nombre || ""
            )}"
            style="
                width:100%;
                box-sizing:border-box;
                padding:12px;
                border:1px solid #d1d5db;
                border-radius:10px;
                margin-bottom:15px;
                font-size:13px;
            "
        />


        <!-- CATEGORÍA -->

        <label
            style="
                display:block;
                margin-bottom:6px;
                font-size:11px;
                font-weight:600;
                color:#374151;
            "
        >
            Categoría
        </label>

        <select
            id="editarCategoriaProducto"
            style="
                width:100%;
                box-sizing:border-box;
                padding:12px;
                border:1px solid #d1d5db;
                border-radius:10px;
                margin-bottom:15px;
                font-size:13px;
                background:#fff;
            "
        >

            <option value="abarrotes">
                Abarrotes
            </option>

            <option value="bebidas">
                Bebidas
            </option>

            <option value="limpieza">
                Limpieza
            </option>

            <option value="higiene">
                Higiene
            </option>

            <option value="botanas">
                Botanas
            </option>

            <option value="lacteos">
                Lácteos
            </option>

            <option value="carnes">
                Carnes
            </option>

            <option value="frutas">
                Frutas y verduras
            </option>

            <option value="panaderia">
                Panadería
            </option>

            <option value="congelados">
                Congelados
            </option>

            <option value="farmacia">
                Farmacia
            </option>

            <option value="otros">
                Otros
            </option>

        </select>


        <!-- PRECIO -->

        <label
            style="
                display:block;
                margin-bottom:6px;
                font-size:11px;
                font-weight:600;
                color:#374151;
            "
        >
            Precio de venta
        </label>

        <input
            id="editarPrecioProducto"
            type="number"
            min="0"
            step="0.01"
            value="${Number(
                producto.precio || 0
            )}"
            style="
                width:100%;
                box-sizing:border-box;
                padding:12px;
                border:1px solid #d1d5db;
                border-radius:10px;
                margin-bottom:15px;
                font-size:13px;
            "
        />


        <!-- EXISTENCIA -->

        <label
            style="
                display:block;
                margin-bottom:6px;
                font-size:11px;
                font-weight:600;
                color:#374151;
            "
        >
            Existencia
        </label>

        <input
            id="editarExistenciaProducto"
            type="number"
            min="0"
            step="1"
            value="${Number(
                producto.existencia || 0
            )}"
            style="
                width:100%;
                box-sizing:border-box;
                padding:12px;
                border:1px solid #d1d5db;
                border-radius:10px;
                margin-bottom:15px;
                font-size:13px;
            "
        />


        <!-- TIPO DE VENTA -->

        <label
            style="
                display:block;
                margin-bottom:6px;
                font-size:11px;
                font-weight:600;
                color:#374151;
            "
        >
            Tipo de venta
        </label>

        <select
            id="editarTipoVentaProducto"
            style="
                width:100%;
                box-sizing:border-box;
                padding:12px;
                border:1px solid #d1d5db;
                border-radius:10px;
                margin-bottom:15px;
                font-size:13px;
                background:#fff;
            "
        >

            <option value="unidad">
                Por unidad
            </option>

            <option value="peso">
                Por peso
            </option>

            <option value="litro">
                Por litro
            </option>

            <option value="pieza">
                Por pieza
            </option>

        </select>


        <!-- DISPONIBILIDAD -->

        <label
            style="
                display:flex;
                align-items:center;
                gap:9px;
                margin-bottom:20px;
                font-size:12px;
                color:#374151;
                cursor:pointer;
            "
        >

            <input
                id="editarDisponibleProducto"
                type="checkbox"
                ${
                    producto.disponible
                        ? "checked"
                        : ""
                }
            />

            Producto disponible para clientes

        </label>


        <!-- BOTONES -->

        <div
            style="
                display:flex;
                gap:10px;
            "
        >

            <button
                id="btnCancelarEditarProducto"
                type="button"
                style="
                    flex:1;
                    padding:12px;
                    border:0;
                    border-radius:10px;
                    background:#f3f4f6;
                    color:#374151;
                    font-weight:600;
                    cursor:pointer;
                "
            >
                Cancelar
            </button>


            <button
                id="btnGuardarEditarProducto"
                type="button"
                style="
                    flex:1;
                    padding:12px;
                    border:0;
                    border-radius:10px;
                    background:#111827;
                    color:#fff;
                    font-weight:600;
                    cursor:pointer;
                "
            >
                Guardar cambios
            </button>

        </div>

    `;


    modal.appendChild(
        contenido
    );


    document.body.appendChild(
        modal
    );


    // =====================================================
// VISTA PREVIA DE IMAGEN
// =====================================================

const inputImagen =
    document.getElementById(
        "editarImagenProducto"
    );


const previewImagen =
    document.getElementById(
        "previewImagenProducto"
    );


if (
    inputImagen &&
    previewImagen
) {

    inputImagen.addEventListener(
        "change",
        event => {

            const archivo =
                event.target.files[0];


            if (!archivo) {

                return;

            }


            // =============================================
            // VALIDAR TIPO
            // =============================================

            if (
                ![
                    "image/jpeg",
                    "image/png",
                    "image/webp"
                ].includes(
                    archivo.type
                )
            ) {

                window.motiGoNotificar(
                    "Solo puedes seleccionar imágenes JPG, PNG o WebP."
                );


                inputImagen.value =
                    "";


                return;

            }


            // =============================================
            // VALIDAR TAMAÑO
            // =============================================

            const maximoMB =
                2;


            const maximoBytes =
                maximoMB *
                1024 *
                1024;


            if (
                archivo.size >
                maximoBytes
            ) {

                window.motiGoNotificar(
                    "La imagen no puede superar los 2 MB."
                );


                inputImagen.value =
                    "";


                return;

            }


            // =============================================
            // CREAR PREVIEW
            // =============================================

            const reader =
                new FileReader();


            reader.onload =
                () => {

                    previewImagen.innerHTML = `

                        <img
                            src="${reader.result}"
                            alt="Vista previa"
                            style="
                                width:100%;
                                height:100%;
                                object-fit:contain;
                            "
                        >

                    `;

                };


            reader.readAsDataURL(
                archivo
            );

        }
    );

}


    // =====================================================
    // ESTABLECER CATEGORÍA
    // =====================================================

    const categoria =
        document.getElementById(
            "editarCategoriaProducto"
        );


    if (categoria) {

        categoria.value =
            producto.categoria ||
            "otros";

    }


    // =====================================================
    // ESTABLECER TIPO DE VENTA
    // =====================================================

    const tipoVenta =
        document.getElementById(
            "editarTipoVentaProducto"
        );


    if (tipoVenta) {

        tipoVenta.value =
            producto.tipoVenta ||
            "unidad";

    }


    // =====================================================
    // CERRAR MODAL
    // =====================================================

    const cerrar =
        () => {

            modal.remove();

        };


    document
        .getElementById(
            "btnCerrarEditarProducto"
        )
        .addEventListener(
            "click",
            cerrar
        );


    document
        .getElementById(
            "btnCancelarEditarProducto"
        )
        .addEventListener(
            "click",
            cerrar
        );


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modal
            ) {

                cerrar();

            }

        }
    );


    // =====================================================
    // GUARDAR
    // =====================================================

    document
        .getElementById(
            "btnGuardarEditarProducto"
        )
        .addEventListener(
            "click",
            async () => {

                await guardarEdicionProducto(
                    producto,
                    cerrar
                );

            }
        );

}



// =========================================================
// GUARDAR EDICIÓN DE PRODUCTO
// =========================================================

async function guardarEdicionProducto(
    producto,
    cerrarModal
) {

    const productoId =
    producto.productoId ||
    producto.id;

const inventarioId =
    producto.inventarioId ||
    `${tiendaId}_${productoId}`;


if (!productoId) {

    window.motiGoNotificar(
        "No se pudo identificar el producto."
    );

    return;

}

    
    const btnGuardar =
        document.getElementById(
            "btnGuardarEditarProducto"
        );


    // =====================================================
    // OBTENER VALORES
    // =====================================================

    const nombre =
        document
            .getElementById(
                "editarNombreProducto"
            )
            .value
            .trim();


    const categoria =
        document
            .getElementById(
                "editarCategoriaProducto"
            )
            .value;


    const precio =
        Number(
            document
                .getElementById(
                    "editarPrecioProducto"
                )
                .value
        );


    const existencia =
        Number(
            document
                .getElementById(
                    "editarExistenciaProducto"
                )
                .value
        );


    const tipoVenta =
        document
            .getElementById(
                "editarTipoVentaProducto"
            )
            .value;


    const disponible =
        document
            .getElementById(
                "editarDisponibleProducto"
            )
            .checked;

    const inputImagen =
    document.getElementById(
        "editarImagenProducto"
    );

const archivoImagen =
    inputImagen &&
    inputImagen.files &&
    inputImagen.files[0]
        ? inputImagen.files[0]
        : null;


    // =====================================================
    // VALIDACIONES
    // =====================================================

    if (!nombre) {

        window.motiGoNotificar(
            "El nombre del producto es obligatorio."
        );

        return;

    }


    if (
        !Number.isFinite(
            precio
        ) ||
        precio < 0
    ) {

        window.motiGoNotificar(
            "Ingresa un precio válido."
        );

        return;

    }


    if (
        !Number.isFinite(
            existencia
        ) ||
        existencia < 0
    ) {

        window.motiGoNotificar(
            "Ingresa una existencia válida."
        );

        return;

    }


    if (!tiendaId) {

        window.motiGoNotificar(
            "No se encontró la tienda asociada."
        );

        return;

    }


if (!productoId) {

    window.motiGoNotificar(
        "No se pudo identificar el producto."
    );

    return;

}

    try {

        btnGuardar.disabled =
            true;


        btnGuardar.textContent =
            "Guardando...";





// =====================================================
// SUBIR IMAGEN SI EL USUARIO SELECCIONÓ UNA
// =====================================================

let imagenUrl =
    producto.imagenUrl || "";


if (archivoImagen) {

    console.log(
        "📸 Subiendo imagen:",
        archivoImagen.name
    );


    const rutaImagen =
        `productos/${productoId}/imagen`;


    const referenciaImagen =
        ref(
            storage,
            rutaImagen
        );


    await uploadBytes(
        referenciaImagen,
        archivoImagen
    );


    imagenUrl =
        await getDownloadURL(
            referenciaImagen
        );


    console.log(
        "✅ Imagen subida:",
        imagenUrl
    );

}

        
        // =================================================
        // ACTUALIZAR PRODUCTO MAESTRO
        // =================================================

        await setDoc(

            doc(
                db,
                "productos",
                productoId
            ),

            {

                nombre,

                nombreNormalizado:
                    normalizarTexto(
                        nombre
                    ),

                categoria,
                imagenUrl,

                necesitaRevision:
                    precio <= 0,

                actualizadoEn:
                    serverTimestamp()

            },

            {
                merge: true
            }

        );


        // =================================================
        // ACTUALIZAR INVENTARIO DE ESTA TIENDA
        // =================================================

        const inventarioId =
    producto.inventarioId ||
    `${tiendaId}_${productoId}`;


        await setDoc(

            doc(
                db,
                "inventarios",
                inventarioId
            ),

            {

                tiendaId,

                productoId:
                productoId,

                precio,

                existencia,

                tipoVenta,

                disponible:
                    disponible &&
                    existencia > 0,

                actualizadoEn:
                    serverTimestamp()

            },

            {
                merge: true
            }

        );


        console.log(
            "✅ Producto actualizado:",
            producto.productoId
        );


        // =================================================
        // CERRAR
        // =================================================

        cerrarModal();


        // =================================================
        // RECARGAR CATÁLOGO
        // =================================================

        await cargarProductos();


        // =================================================
        // MENSAJE
        // =================================================

        console.log(
            "✅ Catálogo actualizado correctamente."
        );

    }
    catch (error) {

        console.error(
            "❌ Error actualizando producto:",
            error
        );


        window.motiGoNotificar(
            "No se pudo actualizar el producto. Revisa la consola."
        );

    }
    finally {

        if (btnGuardar) {

            btnGuardar.disabled =
                false;

            btnGuardar.textContent =
                "Guardar cambios";

        }

    }

}

// =========================================================
// PERFIL
// =========================================================

const profileButton =
    document.getElementById(
        "profileButton"
    );


if (profileButton) {

    profileButton.addEventListener(
        "click",
        () => {

            cambiarVista(
                "configuracion"
            );

        }
    );

}


// =========================================================
// NOTIFICACIONES
// =========================================================

const notificationsButton =
    document.getElementById(
        "notificationsButton"
    );


if (notificationsButton) {

    notificationsButton.addEventListener(
        "click",
        () => {

            console.log(
                "🔔 Notificaciones"
            );

        }
    );

}


// =========================================================
// CERRAR SESIÓN
// =========================================================

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async () => {

            const confirmar =
                await window.motiGoConfirm(
                    "¿Deseas cerrar sesión?",
                    { titulo: "Cerrar sesión" }
                );


            if (!confirmar) {
                return;
            }


            try {

                // Detener primero todos los listeners de Firestore.
                if (cancelarListenerDevoluciones) {
                    cancelarListenerDevoluciones();
                    cancelarListenerDevoluciones = null;
                }

                if (cancelarListenerCuenta) {
                    cancelarListenerCuenta();
                    cancelarListenerCuenta = null;
                }

                usuarioActual = null;
                tiendaActual = null;
                tiendaId = null;
                devolucionesPendientes = [];
                movimientosCuenta = [];

                // Ocultar inmediatamente el panel mientras se completa el cierre.
                document.body.classList.add("auth-pending");

                await signOut(
                    auth
                );

                // replace evita regresar al dashboard con el botón Atrás.
                window.location.replace(
                    "login.html"
                );

            }
            catch (error) {

                document.body.classList.remove("auth-pending");

                console.error(
                    "❌ Error cerrando sesión:",
                    error
                );

            }

        }
    );

}


// =========================================================
// FUNCIONES AUXILIARES
// =========================================================

function normalizarTexto(
    texto
) {

    return String(
        texto || ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim()
        .replace(
            /\s+/g,
            " "
        );

}

// =========================================================
// NORMALIZAR GTIN / CÓDIGO DE BARRAS
// =========================================================

function normalizarGTIN(
    valor
) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return "";

    }


    let texto =
        String(
            valor
        ).trim();


    // Excel puede convertir algunos códigos
    // en números terminados en .0

    texto =
        texto.replace(
            /\.0$/,
            ""
        );


    // Conservamos solamente números

    texto =
        texto.replace(
            /\D/g,
            ""
        );


    return texto;

}


function convertirNumero(
    valor
) {

    if (
        valor ===
        null ||
        valor ===
        undefined ||
        valor ===
        ""
    ) {

        return 0;

    }


    if (
        typeof valor ===
        "number"
    ) {

        return valor;

    }


    let texto =
        String(valor)
            .replace(
                /[$,\s]/g,
                ""
            );


    texto =
        texto.replace(
            ",",
            "."
        );


    const numero =
        Number(
            texto
        );


    return Number.isFinite(
        numero
    )
        ? numero
        : 0;

}


function obtenerValor(
    fila,
    nombres
) {

    for (
        const nombre
        of nombres
    ) {

        if (
            Object.prototype.hasOwnProperty.call(
                fila,
                nombre
            )
        ) {

            return fila[nombre];

        }

    }


    return "";

}


function mapearCategoria(
    departamento
) {

    const categoria =
        normalizarTexto(
            departamento
        );


    const mapa = {

        "abarrotes":
            "abarrotes",

        "carnes":
            "carnes",

        "frutas y verduras":
            "frutas_verduras",

        "frutas":
            "frutas_verduras",

        "verduras":
            "frutas_verduras",

        "bebidas":
            "bebidas",

        "lacteos":
            "lacteos",

        "lacteos y huevos":
            "lacteos",

        "mariscos":
            "mariscos",

        "botanas":
            "botanas",

        "limpieza":
            "limpieza",

        "higiene personal":
            "higiene",

        "varios":
            "varios"

    };


    return (
        mapa[categoria] ||
        "otros"
    );

}


function normalizarTipoVenta(
    tipo
) {

    const valor =
        normalizarTexto(
            tipo
        );


    if (
        valor.includes(
            "peso"
        ) ||
        valor.includes(
            "kilo"
        ) ||
        valor.includes(
            "kg"
        )
    ) {

        return "peso";

    }


    return "unidad";

}


function formatearPrecio(
    precio
) {

    return new Intl.NumberFormat(
        "es-MX",
        {
            style: "currency",
            currency: "MXN"
        }
    ).format(
        Number(
            precio || 0
        )
    );

}


function formatearCategoria(
    categoria
) {

    const mapa = {

        abarrotes:
            "Abarrotes",

        carnes:
            "Carnes",

        frutas_verduras:
            "Frutas y verduras",

        bebidas:
            "Bebidas",

        lacteos:
            "Lácteos",

        mariscos:
            "Mariscos",

        botanas:
            "Botanas",

        limpieza:
            "Limpieza",

        higiene:
            "Higiene personal",

        varios:
            "Varios",

        otros:
            "Otros"

    };


    return (
        mapa[categoria] ||
        "Otros"
    );

}


function formatearTamaño(
    bytes
) {

    if (
        !bytes
    ) {

        return "0 KB";

    }


    const kb =
        bytes /
        1024;


    if (
        kb < 1024
    ) {

        return (
            kb.toFixed(1) +
            " KB"
        );

    }


    return (
        (kb / 1024).toFixed(1) +
        " MB"
    );

}


function escapeHtml(
    texto
) {

    return String(
        texto || ""
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


function mostrarErrorNegocio(
    mensaje
) {

    console.error(
        "❌",
        mensaje
    );

}


function mostrarErrorProductos(
    error
) {

    const container =
        document.getElementById(
            "businessProductsList"
        );


    if (!container) return;


    container.innerHTML = `

        <div
            style="
                padding:30px;
                text-align:center;
                color:#dc2626;
                font-size:10px;
            "
        >

            <span
                class="material-symbols-outlined"
                style="
                    display:block;
                    font-size:32px;
                    margin-bottom:8px;
                "
            >
                error
            </span>

            No pudimos cargar tus productos.

        </div>

    `;


    console.error(
        error
    );

}

// =========================================================
// DEVOLUCIONES DE INVENTARIO
// =========================================================

function obtenerFechaGenerica(valor) {
    if (!valor) return new Date(0);
    if (typeof valor?.toDate === "function") return valor.toDate();
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? new Date(0) : fecha;
}

function formatearFechaDevolucion(valor) {
    const fecha = obtenerFechaGenerica(valor);
    if (fecha.getTime() === 0) return "Fecha pendiente";
    return fecha.toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function mostrarEstadoDevoluciones() {
    const lista = document.getElementById("businessReturnsList");
    const vacio = document.getElementById("businessReturnsEmpty");
    const contador = document.getElementById("businessReturnsCount");
    const badge = document.getElementById("businessReturnsBadge");

    if (!lista) return;

    lista.innerHTML = "";

    if (contador) {
        contador.textContent = `${devolucionesPendientes.length} pendiente${devolucionesPendientes.length === 1 ? "" : "s"}`;
    }

    if (badge) {
        badge.textContent = String(devolucionesPendientes.length);
        badge.hidden = devolucionesPendientes.length === 0;
    }

    if (!devolucionesPendientes.length) {
        if (vacio) vacio.hidden = false;
        return;
    }

    if (vacio) vacio.hidden = true;

    devolucionesPendientes.forEach(devolucion => {
        const article = document.createElement("article");
        article.className = "business-return-card";

        const items = devolucion.items || [];
        const totalUnidades = items.reduce((total, item) => total + Number(item.cantidad || 0), 0);

        const listaItems = items.map(item => `
            <li>
                <span>${escapeHtmlNegocio(item.nombre || "Producto")}</span>
                <strong>${Number(item.cantidad || 0)}</strong>
            </li>
        `).join("");

        article.innerHTML = `
            <div class="business-return-card__top">
                <div>
                    <span class="business-return-eyebrow">DEVOLUCIÓN PENDIENTE</span>
                    <h3>Pedido #${escapeHtmlNegocio(devolucion.pedidoId || devolucion.id)}</h3>
                </div>
                <span class="business-return-status">Pendiente</span>
            </div>
            <div class="business-return-meta">
                <span><span class="material-symbols-outlined">local_shipping</span> Repartidor: ${escapeHtmlNegocio(devolucion.repartidorNombre || devolucion.repartidorId || "No disponible")}</span>
                <span><span class="material-symbols-outlined">schedule</span> ${formatearFechaDevolucion(devolucion.creadaEn)}</span>
            </div>
            <div class="business-return-items">
                <div class="business-return-items__header">
                    <strong>Productos a recibir</strong>
                    <span>${totalUnidades} unidad${totalUnidades === 1 ? "" : "es"}</span>
                </div>
                <ul>${listaItems}</ul>
            </div>
            <div class="business-return-note">
                <span class="material-symbols-outlined">inventory_2</span>
                Los productos todavía no están disponibles. Confirma la recepción física antes de devolverlos al inventario.
            </div>
            <button type="button" class="business-return-confirm" data-return-id="${escapeHtmlNegocio(devolucion.id)}">
                <span class="material-symbols-outlined">inventory</span>
                Confirmar recepción y devolver al inventario
            </button>
        `;

        lista.appendChild(article);
    });

    lista.querySelectorAll("[data-return-id]").forEach(button => {
        button.addEventListener("click", () => confirmarRecepcionDevolucion(button.dataset.returnId));
    });
}

function escapeHtmlNegocio(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escucharDevoluciones() {
    if (!tiendaId) return;

    if (cancelarListenerDevoluciones) {
        cancelarListenerDevoluciones();
        cancelarListenerDevoluciones = null;
    }

    const devolucionesQuery = query(
        collection(db, "devolucionesInventario"),
        where("estado", "==", "pendiente_recepcion")
    );

    cancelarListenerDevoluciones = onSnapshot(
        devolucionesQuery,
        snapshot => {
            devolucionesPendientes = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            })).map(devolucion => {
                const itemsTienda = (devolucion.items || []).filter(item =>
                    item.tiendaId === tiendaId &&
                    item.estadoRecepcion !== "recibido"
                );
                return { ...devolucion, items: itemsTienda };
            }).filter(devolucion => devolucion.items.length > 0);

            mostrarEstadoDevoluciones();
        },
        error => {
            console.error("❌ Error escuchando devoluciones:", error);
        }
    );
}

async function confirmarRecepcionDevolucion(devolucionId) {
    if (!devolucionId || !tiendaId || !usuarioActual) return;

    const button = document.querySelector(`[data-return-id="${CSS.escape(devolucionId)}"]`);
    if (button) {
        button.disabled = true;
        button.innerHTML = '<span class="material-symbols-outlined">progress_activity</span> Registrando...';
    }

    try {
        const devolucionRef = doc(db, "devolucionesInventario", devolucionId);

        await runTransaction(db, async transaction => {
            const devolucionSnap = await transaction.get(devolucionRef);

            if (!devolucionSnap.exists()) {
                throw new Error("La devolución ya no existe.");
            }

            const devolucion = devolucionSnap.data();
            const items = Array.isArray(devolucion.items) ? devolucion.items : [];

            const itemsActualizados = items.map(item => ({ ...item }));
            const inventariosAActualizar = [];
            let recibidosEnEstaOperacion = 0;

            for (let index = 0; index < itemsActualizados.length; index++) {
                const item = itemsActualizados[index];

                if (item.tiendaId !== tiendaId || item.estadoRecepcion === "recibido") {
                    continue;
                }

                const cantidad = Math.max(0, Number(item.cantidad || 0));
                if (!cantidad) continue;

                const inventarioId = item.inventarioId || `${tiendaId}_${item.productoId}`;
                const inventarioRef = doc(db, "inventarios", inventarioId);
                const inventarioSnap = await transaction.get(inventarioRef);

                if (!inventarioSnap.exists()) {
                    throw new Error(`No se encontró el inventario de "${item.nombre || "Producto"}".`);
                }

                const inventario = inventarioSnap.data();
                const existenciaActual = Math.max(0, Number(inventario.existencia || 0));

                inventariosAActualizar.push({
                    ref: inventarioRef,
                    existencia: existenciaActual + cantidad
                });

                itemsActualizados[index] = {
                    ...item,
                    estadoRecepcion: "recibido",
                    recibidoPor: usuarioActual.uid,
                    recibidoEn: new Date().toISOString(),
                    cantidadRestituida: cantidad
                };

                recibidosEnEstaOperacion += cantidad;
            }

            if (recibidosEnEstaOperacion <= 0) {
                throw new Error("Esta devolución ya fue recibida o no contiene productos de tu tienda.");
            }

            inventariosAActualizar.forEach(item => {
                transaction.update(item.ref, {
                    existencia: item.existencia,
                    disponible: item.existencia > 0,
                    actualizadoEn: serverTimestamp()
                });
            });

            const quedanPendientes = itemsActualizados.some(item =>
                item.estadoRecepcion !== "recibido"
            );

            transaction.update(devolucionRef, {
                items: itemsActualizados,
                estado: quedanPendientes ? "pendiente_recepcion" : "recibida",
                inventarioRestituido: !quedanPendientes,
                ultimaRecepcion: {
                    tiendaId,
                    usuarioId: usuarioActual.uid,
                    cantidadUnidades: recibidosEnEstaOperacion
                },
                actualizadaEn: serverTimestamp()
            });
        });

        window.motiGoNotificar?.(
            "Devolución recibida. Los productos ya volvieron a estar disponibles en el inventario de tu tienda."
        );
    } catch (error) {
        console.error("❌ Error confirmando devolución:", error);
        window.motiGoNotificar?.(error.message || "No pudimos registrar la recepción de la devolución.", "error");
    } finally {
        mostrarEstadoDevoluciones();
    }
}

// =========================================================
// CUENTA DEL NEGOCIO
// =========================================================

function escucharMovimientosCuenta() {

    if (!tiendaId) {

        console.warn(
            "⚠️ No se puede escuchar la cuenta: falta tiendaId."
        );

        return;

    }


    // =====================================================
    // CANCELAR LISTENER ANTERIOR
    // =====================================================

    if (cancelarListenerCuenta) {

        cancelarListenerCuenta();

        cancelarListenerCuenta = null;

    }


    console.log(
        "💳 Escuchando movimientos de la tienda:",
        tiendaId
    );


    // =====================================================
    // CONSULTA
    // =====================================================

    const movimientosQuery =
        query(
            collection(
                db,
                "movimientosTiendas"
            ),
            where(
                "tiendaId",
                "==",
                tiendaId
            )
        );


    cancelarListenerCuenta =
        onSnapshot(
            movimientosQuery,

            snapshot => {

                movimientosCuenta =
                    snapshot.docs.map(
                        movimientoDoc => ({

                            id:
                                movimientoDoc.id,

                            ...movimientoDoc.data()

                        })
                    );


                // =================================================
                // ORDENAR POR FECHA
                // =================================================

                movimientosCuenta.sort(
                    (a, b) => {

                        const fechaA =
                            obtenerFechaMovimiento(
                                a
                            );

                        const fechaB =
                            obtenerFechaMovimiento(
                                b
                            );


                        return (
                            fechaB -
                            fechaA
                        );

                    }
                );


                console.log(
                    "💳 Movimientos de cuenta:",
                    movimientosCuenta.length
                );


                actualizarResumenCuenta();

                aplicarFiltrosCuenta();
                actualizarPanelVentas();

            },

            error => {

                console.error(
                    "❌ Error escuchando movimientos de cuenta:",
                    error
                );

            }
        );

}


// =========================================================
// RESUMEN DE CUENTA
// =========================================================

function actualizarResumenCuenta() {

    let generado =
        0;

    let pagado =
        0;


    movimientosCuenta.forEach(
        movimiento => {

            const tipo =
                String(
                    movimiento.tipo ||
                    ""
                ).toLowerCase();


            const monto =
                Number(
                    movimiento.monto ||
                    0
                );


            if (
                tipo ===
                "comision"
            ) {

                generado +=
                    monto;

            }


            if (
                tipo ===
                "pago"
            ) {

                pagado +=
                    monto;

            }

        }
    );


    const pendiente =
        Math.max(
            0,
            generado - pagado
        );


    const generatedElement =
        document.getElementById(
            "accountGenerated"
        );


    const paidElement =
        document.getElementById(
            "accountPaid"
        );


    const pendingElement =
        document.getElementById(
            "accountPendingBalance"
        );


    if (generatedElement) {

        generatedElement.textContent =
            formatearPrecio(
                generado
            );

    }


    if (paidElement) {

        paidElement.textContent =
            formatearPrecio(
                pagado
            );

    }


    if (pendingElement) {

        pendingElement.textContent =
            formatearPrecio(
                pendiente
            );

    }


    console.log(
        "💰 Resumen cuenta:",
        {

            generado,

            pagado,

            pendiente

        }
    );

        actualizarGraficaGanancias();

}


// =========================================================
// FILTROS DE CUENTA
// =========================================================

const accountFilters =
    document.querySelectorAll(
        ".account-filter[data-account-filter]"
    );


accountFilters.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                accountFilters.forEach(
                    item => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                button.classList.add(
                    "active"
                );


                filtroCuentaActual =
                    button.dataset.accountFilter;


                aplicarFiltrosCuenta();

            }
        );

    }
);


// =========================================================
// FECHAS
// =========================================================

const accountDateFrom =
    document.getElementById(
        "accountDateFrom"
    );


const accountDateTo =
    document.getElementById(
        "accountDateTo"
    );


if (accountDateFrom) {

    accountDateFrom.addEventListener(
        "change",
        () => {

            fechaCuentaDesde =
                accountDateFrom.value ||
                "";

            aplicarFiltrosCuenta();

        }
    );

}


if (accountDateTo) {

    accountDateTo.addEventListener(
        "change",
        () => {

            fechaCuentaHasta =
                accountDateTo.value ||
                "";

            aplicarFiltrosCuenta();

        }
    );

}


// =========================================================
// LIMPIAR FILTROS
// =========================================================

const accountClearFilters =
    document.getElementById(
        "accountClearFilters"
    );


if (accountClearFilters) {

    accountClearFilters.addEventListener(
        "click",
        () => {

            filtroCuentaActual =
                "todos";

            fechaCuentaDesde =
                "";

            fechaCuentaHasta =
                "";


            if (accountDateFrom) {

                accountDateFrom.value =
                    "";

            }


            if (accountDateTo) {

                accountDateTo.value =
                    "";

            }


            accountFilters.forEach(
                button => {

                    button.classList.toggle(
                        "active",
                        button.dataset.accountFilter ===
                            "todos"
                    );

                }
            );


            aplicarFiltrosCuenta();

        }
    );

}


// =========================================================
// APLICAR FILTROS
// =========================================================

function aplicarFiltrosCuenta() {

    let movimientos =
        [...movimientosCuenta];


    // =====================================================
    // FILTRO POR TIPO
    // =====================================================

    if (
        filtroCuentaActual !==
        "todos"
    ) {

        movimientos =
            movimientos.filter(
                movimiento => {

                    return (
                        String(
                            movimiento.tipo ||
                            ""
                        ).toLowerCase() ===
                        filtroCuentaActual
                    );

                }
            );

    }


    // =====================================================
    // FILTRO DESDE
    // =====================================================

    if (fechaCuentaDesde) {

        const desde =
            crearFechaInicio(
                fechaCuentaDesde
            );


        movimientos =
            movimientos.filter(
                movimiento => {

                    const fecha =
                        obtenerFechaMovimiento(
                            movimiento
                        );


                    return (
                        fecha >=
                        desde
                    );

                }
            );

    }


    // =====================================================
    // FILTRO HASTA
    // =====================================================

    if (fechaCuentaHasta) {

        const hasta =
            crearFechaFin(
                fechaCuentaHasta
            );


        movimientos =
            movimientos.filter(
                movimiento => {

                    const fecha =
                        obtenerFechaMovimiento(
                            movimiento
                        );


                    return (
                        fecha <=
                        hasta
                    );

                }
            );

    }


    renderizarMovimientosCuenta(
        movimientos
    );

}


// =========================================================
// RENDERIZAR MOVIMIENTOS
// =========================================================

function renderizarMovimientosCuenta(
    movimientos
) {

    const container =
        document.getElementById(
            "accountMovementsList"
        );


    const empty =
        document.getElementById(
            "accountMovementsEmpty"
        );


    const count =
        document.getElementById(
            "accountMovementsCount"
        );


    if (!container) {

        return;

    }


    // =====================================================
    // CONTADOR
    // =====================================================

    if (count) {

        count.textContent =
            `${movimientos.length} movimiento${
                movimientos.length === 1
                    ? ""
                    : "s"
            }`;

    }


    // =====================================================
    // LIMPIAR
    // =====================================================

    container.innerHTML =
        "";


    // =====================================================
    // SIN MOVIMIENTOS
    // =====================================================

    if (
        movimientos.length ===
        0
    ) {

        if (empty) {

            container.appendChild(
                empty
            );

            empty.style.display =
                "block";

        }

        return;

    }


    // =====================================================
    // MOSTRAR MOVIMIENTOS
    // =====================================================

    movimientos.forEach(
        movimiento => {

            container.appendChild(
                crearMovimientoCuenta(
                    movimiento
                )
            );

        }
    );

}


// =========================================================
// CREAR MOVIMIENTO
// =========================================================

function crearMovimientoCuenta(
    movimiento
) {

    const article =
        document.createElement(
            "article"
        );


    article.className =
        "account-movement";


    const tipo =
        String(
            movimiento.tipo ||
            ""
        ).toLowerCase();


    const esComision =
        tipo ===
        "comision";


    const monto =
        Number(
            movimiento.monto ||
            0
        );


    const fecha =
        obtenerFechaMovimiento(
            movimiento
        );


    const fechaTexto =
        formatearFechaMovimiento(
            fecha
        );


    const folio =
        movimiento.pedidoId ||
        movimiento.folio ||
        movimiento.id ||
        "Sin referencia";


    const concepto =
        esComision
            ? "Comisión por venta"
            : "Pago recibido";


    const estado =
        String(
            movimiento.estado ||
            ""
        ).toLowerCase();


    let estadoTexto =
        "";


    let estadoClase =
        "";


    if (esComision) {

        if (
            estado ===
            "pendiente"
        ) {

            estadoTexto =
                "Pendiente";

            estadoClase =
                "pending";

        }
        else {

            estadoTexto =
                movimiento.estado ||
                "Registrada";

        }

    }
    else {

        estadoTexto =
            movimiento.estado ||
            "Aplicado";

        estadoClase =
            "paid";

    }


    article.innerHTML = `

        <div
            class="account-movement-icon ${
                esComision
                    ? "comision"
                    : "pago"
            }"
        >

            <span class="material-symbols-outlined">

                ${
                    esComision
                        ? "receipt_long"
                        : "payments"
                }

            </span>

        </div>


        <div class="account-movement-info">

            <strong>
                ${escapeHtml(
                    concepto
                )}
            </strong>

            <span>
                ${escapeHtml(
                    fechaTexto
                )}
                ·
                ${escapeHtml(
                    folio
                )}
            </span>

        </div>


        <div class="account-movement-amount">

            <strong>
                ${
                    esComision
                        ? "+"
                        : "-"
                }${formatearPrecio(
                    monto
                )}
            </strong>

            <span class="${estadoClase}">
                ${escapeHtml(
                    estadoTexto
                )}
            </span>

        </div>

    `;


    return article;

}


// =========================================================
// OBTENER FECHA DEL MOVIMIENTO
// =========================================================

function obtenerFechaMovimiento(
    movimiento
) {

    const valor =
        movimiento.creadoEn ||
        movimiento.actualizadoEn ||
        movimiento.fecha ||
        null;


    if (!valor) {

        return new Date(0);

    }


    // =====================================================
    // TIMESTAMP FIREBASE
    // =====================================================

    if (
        typeof valor.toDate ===
        "function"
    ) {

        return valor.toDate();

    }


    // =====================================================
    // DATE NATIVO
    // =====================================================

    if (
        valor instanceof Date
    ) {

        return valor;

    }


    // =====================================================
    // MILISEGUNDOS
    // =====================================================

    if (
        typeof valor ===
        "number"
    ) {

        return new Date(
            valor
        );

    }


    // =====================================================
    // TEXTO
    // =====================================================

    const fecha =
        new Date(
            valor
        );


    return Number.isNaN(
        fecha.getTime()
    )
        ? new Date(0)
        : fecha;

}


// =========================================================
// FECHA INICIO
// =========================================================

function crearFechaInicio(
    fecha
) {

    const partes =
        fecha.split(
            "-"
        );


    if (
        partes.length !==
        3
    ) {

        return new Date(0);

    }


    return new Date(
        Number(partes[0]),
        Number(partes[1]) - 1,
        Number(partes[2]),
        0,
        0,
        0,
        0
    );

}


// =========================================================
// FECHA FIN
// =========================================================

function crearFechaFin(
    fecha
) {

    const partes =
        fecha.split(
            "-"
        );


    if (
        partes.length !==
        3
    ) {

        return new Date(
            8640000000000000
        );

    }


    return new Date(
        Number(partes[0]),
        Number(partes[1]) - 1,
        Number(partes[2]),
        23,
        59,
        59,
        999
    );

}


// =========================================================
// FORMATEAR FECHA
// =========================================================

function formatearFechaMovimiento(
    fecha
) {

    if (
        !fecha ||
        fecha.getTime() ===
            0
    ) {

        return "Fecha no disponible";

    }


    return new Intl.DateTimeFormat(
        "es-MX",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(
        fecha
    );

}

// =========================================================
// VENTAS REALES DEL NEGOCIO
// =========================================================

function obtenerVentasReales() {

    return movimientosCuenta
        .filter(movimiento =>
            String(movimiento.tipo || "").toLowerCase() === "comision"
        )
        .map(movimiento => {
            const ventaBruta = Number(
                movimiento.subtotalVenta ??
                movimiento.subtotal ??
                0
            ) || 0;

            const comision = Number(movimiento.monto || 0) || 0;

            return {
                ...movimiento,
                ventaBruta,
                comision,
                neto: Number((ventaBruta - comision).toFixed(2))
            };
        })
        .filter(venta => venta.ventaBruta > 0);
}

function obtenerClavePeriodo(fecha, periodo) {

    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");

    if (periodo === "dia") {
        return `${año}-${mes}-${String(fecha.getDate()).padStart(2, "0")}`;
    }

    if (periodo === "semana") {
        const inicio = new Date(fecha);
        const dia = inicio.getDay();
        inicio.setDate(inicio.getDate() + (dia === 0 ? -6 : 1 - dia));
        return `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, "0")}-${String(inicio.getDate()).padStart(2, "0")}`;
    }

    return `${año}-${mes}`;
}

function formatearEtiquetaPeriodo(clave, periodo) {

    if (periodo === "mes") {
        const [año, mes] = clave.split("-");
        return new Intl.DateTimeFormat("es-MX", {
            month: "short",
            year: "numeric"
        }).format(new Date(Number(año), Number(mes) - 1, 1)).replace(".", "");
    }

    const fecha = new Date(`${clave}T12:00:00`);
    if (Number.isNaN(fecha.getTime())) return clave;

    const texto = new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short"
    }).format(fecha).replace(".", "");

    return periodo === "semana" ? `Sem. ${texto}` : texto;
}

function obtenerDatosGraficaVentas() {

    const agrupadas = new Map();

    obtenerVentasReales().forEach(venta => {

        const fecha = obtenerFechaMovimiento(venta);
        if (fecha.getTime() === 0) return;

        const clave = obtenerClavePeriodo(fecha, ventasPeriodoActual);
        const actual = agrupadas.get(clave) || {
            ventaBruta: 0,
            comision: 0,
            neto: 0,
            pedidos: 0
        };

        actual.ventaBruta += venta.ventaBruta;
        actual.comision += venta.comision;
        actual.neto += venta.neto;
        actual.pedidos += 1;
        agrupadas.set(clave, actual);
    });

    const limite =
        ventasPeriodoActual === "dia" ? 14 :
        ventasPeriodoActual === "semana" ? 8 : 12;

    return [...agrupadas.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-limite);
}

function renderizarGraficaVentas() {

    const container = document.getElementById("accountEarningsChart");
    if (!container) return;

    const datos = obtenerDatosGraficaVentas();

    if (!datos.length) {
        container.innerHTML = `
            <div class="account-chart-empty">
                <div>
                    <span class="material-symbols-outlined">bar_chart</span>
                    Todavía no hay ventas realizadas por la aplicación.
                </div>
            </div>
        `;
        return;
    }

    const maximo = Math.max(
        ...datos.map(([, datosPeriodo]) => datosPeriodo.ventaBruta),
        0
    );

    container.innerHTML = "";

    datos.forEach(([clave, datosPeriodo]) => {

        const porcentaje = maximo > 0
            ? (datosPeriodo.ventaBruta / maximo) * 100
            : 0;

        const columna = document.createElement("div");
        columna.className = "account-chart-month";

        columna.innerHTML = `
            <div class="account-chart-value">
                ${formatearPrecio(datosPeriodo.ventaBruta)}
            </div>
            <div class="account-chart-bar-wrapper">
                <div
                    class="account-chart-bar"
                    style="height:${Math.max(porcentaje, 3)}%;"
                    title="Venta bruta: ${escapeHtml(formatearPrecio(datosPeriodo.ventaBruta))}"
                ></div>
            </div>
            <div class="account-chart-label">
                ${escapeHtml(formatearEtiquetaPeriodo(clave, ventasPeriodoActual))}
            </div>
        `;

        container.appendChild(columna);
    });
}

function actualizarResumenVentas() {

    const ventas = obtenerVentasReales();

    const ventaBruta = ventas.reduce(
        (total, venta) => total + venta.ventaBruta,
        0
    );

    const comision = ventas.reduce(
        (total, venta) => total + venta.comision,
        0
    );

    const neto = Number((ventaBruta - comision).toFixed(2));

    const elementos = {
        businessSalesGross: ventaBruta,
        businessSalesCommission: comision,
        businessSalesNet: neto,
        businessSalesOrders: ventas.length
    };

    Object.entries(elementos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (!elemento) return;

        elemento.textContent =
            id === "businessSalesOrders"
                ? String(valor)
                : formatearPrecio(valor);
    });
}

function actualizarPanelVentas() {
    actualizarResumenVentas();
    renderizarGraficaVentas();
}

function obtenerVentasParaExportar() {

    return obtenerVentasReales().map(venta => ({
        Fecha: formatearFechaMovimiento(obtenerFechaMovimiento(venta)),
        Pedido: venta.pedidoId || venta.folio || venta.id || "",
        Negocio: venta.tiendaNombre || tiendaActual?.nombre || "",
        Venta_bruta: Number(venta.ventaBruta.toFixed(2)),
        Comision_MOTI: Number(venta.comision.toFixed(2)),
        Porcentaje_comision: Number(venta.porcentaje || 0),
        Neto_despues_comision: Number(venta.neto.toFixed(2)),
        Estado: venta.estado || "registrada"
    }));
}

function exportarVentasExcel() {

    if (typeof XLSX === "undefined") {
        window.motiGoNotificar?.(
            "No se pudo cargar el exportador de Excel.",
            "error"
        );
        return;
    }

    const datos = obtenerVentasParaExportar();

    if (!datos.length) {
        window.motiGoNotificar?.(
            "Todavía no hay ventas realizadas para exportar.",
            "info"
        );
        return;
    }

    const hoja = XLSX.utils.json_to_sheet(datos);
    hoja["!cols"] = [
        { wch: 18 },
        { wch: 28 },
        { wch: 24 },
        { wch: 15 },
        { wch: 17 },
        { wch: 20 },
        { wch: 24 },
        { wch: 24 }
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Ventas");

    XLSX.writeFile(
        libro,
        `MOTI_GO_Ventas_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
}

const salesPeriodButtons = document.querySelectorAll("[data-sales-period]");

salesPeriodButtons.forEach(button => {
    button.addEventListener("click", () => {
        salesPeriodButtons.forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        ventasPeriodoActual = button.dataset.salesPeriod || "mes";
        renderizarGraficaVentas();
    });
});

const exportSalesButton = document.getElementById("exportBusinessSales");

if (exportSalesButton) {
    exportSalesButton.addEventListener("click", exportarVentasExcel);
}


// =========================================================
// INICIO
// =========================================================

cambiarVista(
    "inicio"
);


console.log(
    "🏪 MOTI GO - DASHBOARD NEGOCIO INICIADO"
);
