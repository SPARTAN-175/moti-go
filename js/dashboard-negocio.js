// =========================================================
// MOTI GO
// DASHBOARD DEL NEGOCIO
// CATÁLOGO + IMPORTACIÓN
// =========================================================

import { auth, db } from "./firebase-config.js";

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
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// =========================================================
// ESTADO GLOBAL
// =========================================================

let usuarioActual = null;

let tiendaActual = null;

let tiendaId = null;

let productos = [];

let productosFiltrados = [];

let filtroActual = "todos";

let archivoSeleccionado = null;

let productosParaImportar = [];


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

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            console.warn(
                "⚠️ No hay usuario autenticado."
            );

            return;

        }


        usuarioActual =
            user;


        console.log(
            "👤 Usuario negocio:",
            user.uid
        );


        await cargarDatosNegocio();

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
// CARGAR PRODUCTOS DE LA TIENDA
// =========================================================

async function cargarProductos() {

    try {

        console.log(
            "📦 Cargando productos de la tienda..."
        );


        /*
            Estructura prevista:

            inventarios
            ├── tiendaId
            ├── productoId
            ├── precio
            ├── disponible
            └── ...

            productos
            ├── nombre
            ├── categoria
            ├── imagenUrl
            └── ...
        */


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


        console.log(
            "📦 Inventarios encontrados:",
            inventariosSnap.size
        );


        const lista =
            [];


        for (
            const inventarioDoc
            of inventariosSnap.docs
        ) {

            const inventario =
                inventarioDoc.data();


            const productoId =
                inventario.productoId;


            if (!productoId) {

                console.warn(
                    "⚠️ Inventario sin productoId:",
                    inventarioDoc.id
                );

                continue;

            }


            const productoRef =
                doc(
                    db,
                    "productos",
                    productoId
                );


            const productoSnap =
                await getDoc(
                    productoRef
                );


            if (!productoSnap.exists()) {

                console.warn(
                    "⚠️ Producto no encontrado:",
                    productoId
                );

                continue;

            }


            const producto =
                productoSnap.data();


            lista.push({

                id:
                    productoSnap.id,

                inventarioId:
                    inventarioDoc.id,

                nombre:
                    producto.nombre ||
                    "Producto sin nombre",

                nombreNormalizado:
                    producto.nombreNormalizado ||
                    normalizarTexto(
                        producto.nombre ||
                        ""
                    ),

                categoria:
                    producto.categoria ||
                    "otros",

                descripcion:
                    producto.descripcion ||
                    "",

                imagenUrl:
                    producto.imagenUrl ||
                    "",

                codigo:
                    inventario.codigoTienda ||
                    producto.codigo ||
                    "",

                precio:
                    Number(
                        inventario.precio ??
                        producto.precio ??
                        0
                    ),

                existencia:
                    Number(
                        inventario.existencia ??
                        0
                    ),

                disponible:
                    inventario.disponible !== false,

                necesitaRevision:
                    producto.necesitaRevision === true

            });

        }


        productos =
            lista;


        productosFiltrados =
            [...productos];


        console.log(
            "🛒 Productos cargados:",
            productos.length
        );


        renderizarProductos();


        actualizarEstadisticas();


    }
    catch (error) {

        console.error(
            "❌ Error cargando productos:",
            error
        );

        mostrarErrorProductos(
            error
        );

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

        alert(
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

        alert(
            "Selecciona un archivo primero."
        );

        return;

    }


    if (!tiendaId) {

        alert(
            "Esta cuenta todavía no tiene una tienda asociada."
        );

        return;

    }


    if (
        typeof XLSX ===
        "undefined"
    ) {

        alert(
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


        alert(
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

async function analizarFilas(
    filas
) {

    console.log(
        "🔍 Analizando productos..."
    );


    /*
        Cargamos productos maestros existentes
        para poder detectar coincidencias.
    */


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
        "📚 Productos maestros:",
        existentes.length
    );


    const resultado =
        [];


    for (
        const fila
        of filas
    ) {

        const nombre =
            obtenerValor(
                fila,
                [
                    "Producto",
                    "producto",
                    "Nombre",
                    "nombre",
                    "Descripción",
                    "descripcion"
                ]
            );


        if (!nombre) {

            continue;

        }


        const precio =
            convertirNumero(
                obtenerValor(
                    fila,
                    [
                        "P. Venta",
                        "P.Venta",
                        "Precio",
                        "precio"
                    ]
                )
            );


        const costo =
            convertirNumero(
                obtenerValor(
                    fila,
                    [
                        "P. Costo",
                        "P.Costo",
                        "Costo"
                    ]
                )
            );


        const mayoreo =
            convertirNumero(
                obtenerValor(
                    fila,
                    [
                        "P. Mayoreo",
                        "P.Mayoreo"
                    ]
                )
            );


        const departamento =
            obtenerValor(
                fila,
                [
                    "Departamento",
                    "departamento",
                    "Categoría",
                    "categoria"
                ]
            );


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


        const minimo =
            convertirNumero(
                obtenerValor(
                    fila,
                    [
                        "Inv. Mínimo",
                        "Inv.Minimo",
                        "Minimo"
                    ]
                )
            );


        const maximo =
            convertirNumero(
                obtenerValor(
                    fila,
                    [
                        "Inv. Máximo",
                        "Inv.Maximo",
                        "Maximo"
                    ]
                )
            );


        const tipoVenta =
            obtenerValor(
                fila,
                [
                    "Tipo de Venta",
                    "TipoVenta",
                    "tipoVenta"
                ]
            );


        const codigo =
            obtenerValor(
                fila,
                [
                    "Código",
                    "Codigo",
                    "codigo",
                    "Clave"
                ]
            );


        const nombreNormalizado =
            normalizarTexto(
                nombre
            );


        const productoExistente =
            existentes.find(
                producto => {

                    const existenteNormalizado =

                        producto.nombreNormalizado ||

                        normalizarTexto(
                            producto.nombre ||
                            ""
                        );


                    return (
                        existenteNormalizado ===
                        nombreNormalizado
                    );

                }
            );


        resultado.push({

            nombre:
                nombre.trim(),

            nombreNormalizado,

            codigoTienda:
                codigo,

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

            productoExistenteId:
                productoExistente
                    ? productoExistente.id
                    : null,

            estado:
                productoExistente
                    ? "existente"
                    : "nuevo"

        });

    }


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


    const revision =
        resultado.filter(
            item =>
                !item.nombre ||
                item.precio <= 0
        ).length;


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
            revision;

    }


    const preview =
        document.getElementById(
            "businessImportPreview"
        );


    if (!preview) return;


    preview.innerHTML =
        "";


    resultado
        .slice(0, 20)
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

                        ${
                            producto.estado ===
                            "nuevo"
                                ? "Nuevo"
                                : "Existente"
                        }

                    </div>

                `;


                preview.appendChild(
                    item
                );

            }
        );


    if (resultado.length > 20) {

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


    const confirmButton =
        document.getElementById(
            "businessConfirmImport"
        );


    if (confirmButton) {

        confirmButton.disabled =
            resultado.length === 0;

    }


    results.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });


    console.log(
        "📊 Resultado:",
        {
            total,
            existentes,
            nuevos,
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


async function importarProductos() {

    if (
        !productosParaImportar.length
    ) {

        return;

    }


    if (!tiendaId) {

        alert(
            "No hay una tienda asociada."
        );

        return;

    }


    try {

        confirmImport.disabled =
            true;


        confirmImport.innerHTML = `

            <span class="material-symbols-outlined">
                progress_activity
            </span>

            Guardando catálogo...

        `;


        let nuevos = 0;

        let actualizados = 0;


        for (
            const item
            of productosParaImportar
        ) {

            let productoId =
                item.productoExistenteId;


            // -----------------------------------------
            // PRODUCTO MAESTRO
            // -----------------------------------------

            if (!productoId) {

                const productoRef =
                    await addDoc(
                        collection(
                            db,
                            "productos"
                        ),
                        {

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
            else {

                actualizados++;

            }


            // -----------------------------------------
            // INVENTARIO DE LA TIENDA
            // -----------------------------------------

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

                    codigoTienda:
                        item.codigoTienda,

                    precio:
                        item.precio,

                    costo:
                        item.costo,

                    precioMayoreo:
                        item.mayoreo,

                    existencia:
                        item.existencia,

                    inventarioMinimo:
                        item.inventarioMinimo,

                    inventarioMaximo:
                        item.inventarioMaximo,

                    tipoVenta:
                        item.tipoVenta,

                    disponible:
                        item.existencia > 0,

                    actualizadoEn:
                        serverTimestamp()

                },

                {
                    merge: true
                }

            );

        }


        console.log(
            "✅ Importación terminada:",
            {
                nuevos,
                actualizados
            }
        );


        alert(
            `Catálogo importado correctamente.\n\nNuevos: ${nuevos}\nActualizados: ${actualizados}`
        );


        limpiarArchivo();


        await cargarProductos();


        cambiarVista(
            "productos"
        );


    }
    catch (error) {

        console.error(
            "❌ Error importando catálogo:",
            error
        );


        alert(
            "Ocurrió un error al guardar el catálogo. Revisa la consola."
        );

    }
    finally {

        confirmImport.disabled =
            false;


        confirmImport.innerHTML = `

            <span class="material-symbols-outlined">
                cloud_done
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

                alert(
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

                    alert(
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


                alert(
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


                alert(
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

    /*
        Por ahora no abrimos otra página.

        Más adelante podemos convertir esto
        en una vista interna:

        #viewEditarProducto

        para modificar:

        - nombre
        - precio
        - categoría
        - existencia
        - fotografía
        - disponibilidad
    */


    console.log(
        "✏️ Preparado para editar:",
        producto
    );


    alert(
        `Producto seleccionado:\n\n${producto.nombre}\n${formatearPrecio(producto.precio)}`
    );

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
                confirm(
                    "¿Deseas cerrar sesión?"
                );


            if (!confirmar) {
                return;
            }


            try {

                await signOut(
                    auth
                );


                window.location.href =
                    "login.html";


            }
            catch (error) {

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
// INICIO
// =========================================================

cambiarVista(
    "inicio"
);


console.log(
    "🏪 MOTI GO - DASHBOARD NEGOCIO INICIADO"
);
