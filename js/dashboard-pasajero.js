import { auth, db } from "./firebase-config.js";

import {
    doc,
    updateDoc,
    collection,
    getDocs,
    getDoc,
    query,
    where,
    documentId,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


// =====================================================
// MOTI GO
// DASHBOARD CLIENTE
// CATÁLOGO + CARRITO + GPS
// =====================================================


// =====================================================
// ESTADO GENERAL
// =====================================================

let userLat = null;
let userLng = null;

let productos = [];
let inventarios = [];

let categoriaActual = "todos";
let textoBusqueda = "";

let carrito = {};

let tiendasDisponibles = [];

let tiendaSeleccionada = null;

let tiendaSeleccionadaId = null;

let perfilCliente = null;

// =====================================================
// ELEMENTOS DEL DOM
// =====================================================

const productsContainer =
    document.getElementById("productsContainer");

const productsCount =
    document.getElementById("productsCount");

const productsTitle =
    document.getElementById("productsTitle");

const productsLabel =
    document.getElementById("productsLabel");

const emptyProducts =
    document.getElementById("emptyProducts");

const cartBar =
    document.getElementById("cartBar");

const cartItems =
    document.getElementById("cartItems");

const cartTotal =
    document.getElementById("cartTotal");

const searchInput =
    document.getElementById("buscarProducto");

const searchClear =
    document.getElementById("btnClearSearch");

const locationText =
    document.getElementById("currentLocation");

// =====================================================
// SELECTOR DE TIENDA
// =====================================================

const storeSelectorSection =
    document.createElement("div");

storeSelectorSection.id =
    "motiStoreSelectorSection";

storeSelectorSection.style.display =
    "none";


const storeSelectorLabel =
    document.createElement("div");

storeSelectorLabel.textContent =
    "Comprar en";


storeSelectorLabel.style.fontWeight =
    "600";

storeSelectorLabel.style.marginBottom =
    "6px";


const storeSelector =
    document.createElement("select");

storeSelector.id =
    "motiStoreSelector";


storeSelector.style.width =
    "100%";

storeSelector.style.padding =
    "12px";

storeSelector.style.borderRadius =
    "10px";

storeSelector.style.border =
    "1px solid #ddd";

storeSelector.style.background =
    "#fff";

storeSelector.style.fontSize =
    "15px";


storeSelectorSection.appendChild(
    storeSelectorLabel
);

storeSelectorSection.appendChild(
    storeSelector
);


// =====================================================
// INSERTAR SELECTOR ANTES DEL CATÁLOGO
// =====================================================

if (productsContainer) {

    productsContainer.parentNode.insertBefore(
        storeSelectorSection,
        productsContainer
    );

}


// =====================================================
// SELECTOR DE VIAJE
// =====================================================

const btnLocal =
    document.getElementById("btnLocal");

const btnEspecial =
    document.getElementById("btnEspecial");

const specialFields =
    document.getElementById("specialFields");

const fareAmount =
    document.getElementById("fareAmount");


if (btnLocal) {

    btnLocal.addEventListener("click", () => {

        btnLocal.classList.add("active");

        if (btnEspecial) {
            btnEspecial.classList.remove("active");
        }

        if (specialFields) {
            specialFields.style.display = "none";
        }

        if (fareAmount) {
            fareAmount.textContent = "$10";
        }

    });

}


if (btnEspecial) {

    btnEspecial.addEventListener("click", () => {

        btnEspecial.classList.add("active");

        if (btnLocal) {
            btnLocal.classList.remove("active");
        }

        if (specialFields) {
            specialFields.style.display = "block";
        }

        if (fareAmount) {
            fareAmount.textContent = "$30";
        }

    });

}


// =====================================================
// CARGAR CARRITO LOCAL
// =====================================================

function cargarCarrito() {

    try {

        const guardado =
            localStorage.getItem("motiCarrito");

        if (guardado) {

            carrito =
                JSON.parse(guardado);

        }

    }
    catch (error) {

        console.error(
            "Error cargando carrito:",
            error
        );

        carrito = {};

    }

}


// =====================================================
// GUARDAR CARRITO
// =====================================================

function guardarCarrito() {

    localStorage.setItem(
        "motiCarrito",
        JSON.stringify(carrito)
    );

}


// =====================================================
// CARGAR CONTEXTO DEL CLIENTE
// =====================================================

async function cargarContextoCliente() {

    const user =
        auth.currentUser;


    if (!user) {

        throw new Error(
            "No hay usuario autenticado."
        );

    }


    console.log(
        "👤 Usuario pasajero autenticado:",
        user.uid
    );


    const usuarioSnap =
        await getDoc(
            doc(
                db,
                "usuarios",
                user.uid
            )
        );


    if (!usuarioSnap.exists()) {

        throw new Error(
            "No existe el perfil del cliente."
        );

    }


    const usuario =
        usuarioSnap.data();

    perfilCliente =
    usuario;

    console.log(
        "👤 Perfil cliente:",
        usuario
    );


    return usuario;

}


// =====================================================
// OBTENER TIENDAS DE LA ZONA DEL CLIENTE
// =====================================================
//
// PRIORIDAD:
//
// 1. localidadId
// 2. compatibilidad temporal con municipio/localidad
//
// NO utilizamos las coordenadas del catálogo de
// localidades para determinar la posición física.
//
// Las coordenadas reales del cliente continúan viniendo
// del GPS.
//
// =====================================================

async function cargarTiendasDeLaZona(
    usuario
) {

    let tiendasEncontradas = [];


    // =================================================
    // OPCIÓN PRINCIPAL: localidadId
    // =================================================

    if (
        usuario.localidadId
    ) {

        console.log(
            "📍 Buscando tiendas por localidadId:",
            usuario.localidadId
        );


        const tiendasQuery =
            query(
                collection(
                    db,
                    "tiendas"
                ),
                where(
                    "localidadId",
                    "==",
                    usuario.localidadId
                )
            );


        const tiendasSnapshot =
            await getDocs(
                tiendasQuery
            );


        tiendasSnapshot.forEach(
            docSnap => {

                const tienda = {

                    id:
                        docSnap.id,

                    ...docSnap.data()

                };


                if (
                    tienda.activa !== false
                ) {

                    tiendasEncontradas.push(
                        tienda
                    );

                }

            }
        );


        console.log(
            "🏪 Tiendas encontradas por localidadId:",
            tiendasEncontradas.length
        );


        return tiendasEncontradas;

    }


    // =================================================
    // COMPATIBILIDAD TEMPORAL
    // =================================================
    //
    // Los registros antiguos todavía pueden no tener
    // localidadId.
    //
    // En ese caso utilizamos municipio/localidad.
    //
    // Esta parte desaparecerá cuando todos los usuarios
    // y tiendas nuevos utilicen localidadId.
    //
    // =================================================

    console.warn(
        "⚠️ El usuario todavía no tiene localidadId. Usando compatibilidad por municipio/localidad."
    );


    const municipioUsuario =
        normalizarTexto(
            usuario.municipio ||
            ""
        );


    const localidadUsuario =
        normalizarTexto(
            usuario.localidad ||
            ""
        );


    if (
        !municipioUsuario
    ) {

        return [];

    }


    const tiendasQuery =
        query(
            collection(
                db,
                "tiendas"
            ),
            where(
                "municipio",
                "==",
                usuario.municipio
            )
        );


    const tiendasSnapshot =
        await getDocs(
            tiendasQuery
        );


    tiendasSnapshot.forEach(
        docSnap => {

            const tienda = {

                id:
                    docSnap.id,

                ...docSnap.data()

            };


            if (
                tienda.activa === false
            ) {

                return;

            }


            const municipioTienda =
                normalizarTexto(
                    tienda.municipio ||
                    ""
                );


            const localidadTienda =
                normalizarTexto(
                    tienda.localidad ||
                    ""
                );


            const mismoMunicipio =
                municipioTienda ===
                municipioUsuario;


            const mismaLocalidad =
                !localidadUsuario ||
                !localidadTienda ||
                localidadTienda ===
                localidadUsuario;


            if (
                mismoMunicipio &&
                mismaLocalidad
            ) {

                tiendasEncontradas.push(
                    tienda
                );

            }

        }
    );


    console.log(
        "🏪 Tiendas encontradas por compatibilidad:",
        tiendasEncontradas.length
    );


    return tiendasEncontradas;

}


// =====================================================
// CARGAR CONTEXTO DE TIENDAS
// =====================================================

async function cargarContextoTiendas() {

    console.log(
        "📍 Cargando zona del cliente..."
    );


    const usuario =
        await cargarContextoCliente();


    // =================================================
    // OBTENER TIENDAS DE LA ZONA
    // =================================================

    tiendasDisponibles =
        await cargarTiendasDeLaZona(
            usuario
        );


    console.log(
        "🏪 Tiendas disponibles en la zona:",
        tiendasDisponibles.length,
        tiendasDisponibles
    );


    // =================================================
    // NO HAY TIENDAS
    // =================================================

    if (
        tiendasDisponibles.length ===
        0
    ) {

        tiendaSeleccionada =
            null;

        tiendaSeleccionadaId =
            null;


        if (storeSelectorSection) {

            storeSelectorSection.style.display =
                "none";

        }


        return;

    }


    // =================================================
    // RECUPERAR TIENDA ANTERIOR
    // =================================================

    const tiendaGuardada =
        sessionStorage.getItem(
            "motiTiendaSeleccionadaId"
        );


    let tiendaInicial =
        null;


    if (
        tiendaGuardada
    ) {

        tiendaInicial =
            tiendasDisponibles.find(
                tienda =>
                    tienda.id ===
                    tiendaGuardada
            );

    }


    // =================================================
    // SI NO EXISTE, USAR LA PRIMERA
    // =================================================

    if (!tiendaInicial) {

        tiendaInicial =
            tiendasDisponibles[0];

    }


    tiendaSeleccionada =
        tiendaInicial;


    tiendaSeleccionadaId =
        tiendaInicial.id;


    sessionStorage.setItem(
        "motiTiendaSeleccionadaId",
        tiendaSeleccionadaId
    );


    console.log(
        "🏪 Tienda seleccionada:",
        tiendaSeleccionada
    );


    // =================================================
    // CONSTRUIR SELECTOR
    // =================================================

    if (storeSelector) {

        storeSelector.innerHTML =
            "";


        tiendasDisponibles.forEach(
            tienda => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    tienda.id;


                option.textContent =
                    tienda.nombre ||
                    "Tienda";


                if (
                    tienda.id ===
                    tiendaSeleccionadaId
                ) {

                    option.selected =
                        true;

                }


                storeSelector.appendChild(
                    option
                );

            }
        );


        storeSelectorSection.style.display =
            "block";

    }


    // =================================================
    // EVENTO CAMBIO DE TIENDA
    // =================================================

    if (
        !storeSelector.dataset.listener
    ) {

        storeSelector.addEventListener(
            "change",
            async event => {

                const nuevaTiendaId =
                    event.target.value;


                try {

                    storeSelector.disabled =
                        true;


                    await seleccionarTienda(
                        nuevaTiendaId
                    );

                }
                catch (error) {

                    console.error(
                        "❌ Error cambiando de tienda:",
                        error
                    );

                }
                finally {

                    storeSelector.disabled =
                        false;

                }

            }
        );


        storeSelector.dataset.listener =
            "true";

    }

}

// =====================================================
// SELECCIONAR TIENDA
// =====================================================

async function seleccionarTienda(
    tiendaId
) {

    const tienda =
        tiendasDisponibles.find(
            item =>
                item.id ===
                tiendaId
        );


    if (!tienda) {

        console.warn(
            "⚠️ No se encontró la tienda seleccionada:",
            tiendaId
        );


        return;

    }


    // =================================================
    // CAMBIAR TIENDA
    // =================================================

    tiendaSeleccionada =
        tienda;


    tiendaSeleccionadaId =
        tienda.id;


    sessionStorage.setItem(
        "motiTiendaSeleccionadaId",
        tiendaSeleccionadaId
    );


    console.log(
        "🏪 Cambiando a tienda:",
        tiendaSeleccionada
    );


    // =================================================
    // LIMPIAR CATÁLOGO ANTERIOR
    // =================================================

    productos = [];

    inventarios = [];


    if (productsContainer) {

        productsContainer.innerHTML =
            "";

    }


    if (emptyProducts) {

        emptyProducts.style.display =
            "none";

    }


    if (productsCount) {

        productsCount.textContent =
            "Cargando...";

    }


    // =================================================
    // CARGAR CATÁLOGO NUEVO
    // =================================================

    await cargarCatalogoDeTienda();

}

// =====================================================
// CARGAR CATÁLOGO DE LA TIENDA SELECCIONADA
// =====================================================

async function cargarCatalogoDeTienda() {

    if (
        !tiendaSeleccionadaId
    ) {

        console.warn(
            "⚠️ No hay tienda seleccionada."
        );


        return;

    }


    try {

        console.log(
            "🛒 Cargando catálogo de:",
            tiendaSeleccionada
                ?.nombre ||
            tiendaSeleccionadaId
        );


        // =================================================
        // LIMPIAR DATOS ANTERIORES
        // =================================================

        productos = [];

        inventarios = [];


        // =================================================
        // INVENTARIOS DE ESTA TIENDA
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
                    tiendaSeleccionadaId
                )
            );


        const inventariosSnapshot =
            await getDocs(
                inventariosQuery
            );


        inventariosSnapshot.forEach(
            docSnap => {

                const inventario = {

                    id:
                        docSnap.id,

                    ...docSnap.data()

                };


                const existencia =
                    Number(
                        inventario.existencia ??
                        0
                    );


                if (
                    inventario.disponible !== false &&
                    existencia > 0
                ) {

                    inventarios.push(
                        inventario
                    );

                }

            }
        );


        console.log(
            "🏪 Inventarios disponibles de la tienda:",
            inventarios.length
        );


        // =================================================
        // IDS DE PRODUCTOS
        // =================================================

        const productoIds = [
            ...new Set(
                inventarios
                    .map(
                        inventario =>
                            inventario.productoId
                    )
                    .filter(Boolean)
            )
        ];


        if (
            productoIds.length ===
            0
        ) {

            console.warn(
                "⚠️ La tienda no tiene productos disponibles."
            );


            renderizarProductos();


            return;

        }


        // =================================================
        // CONSULTAR PRODUCTOS POR LOTES
        // =================================================

        const loteProductos =
            30;


        for (
            let inicio = 0;
            inicio < productoIds.length;
            inicio += loteProductos
        ) {

            const lote =
                productoIds.slice(
                    inicio,
                    inicio +
                    loteProductos
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


            const productosSnapshot =
                await getDocs(
                    productosQuery
                );


            productosSnapshot.forEach(
                docSnap => {

                    productos.push({

                        id:
                            docSnap.id,

                        ...docSnap.data()

                    });

                }
            );

        }


        console.log(
            "📦 Productos de la tienda cargados:",
            productos.length
        );


        // =================================================
        // RENDERIZAR
        // =================================================

        renderizarProductos();


        // =================================================
        // ACTUALIZAR CARRITO
        // =================================================

        actualizarCarrito();

    }
    catch (error) {

        console.error(
            "❌ Error cargando catálogo de la tienda:",
            error
        );


        productos = [];

        inventarios = [];


        if (productsContainer) {

            productsContainer.innerHTML =
                "";

        }


        if (emptyProducts) {

            emptyProducts.style.display =
                "flex";

        }

    }

}
// =====================================================
// CARGAR CATÁLOGO
// =====================================================

async function cargarCatalogo() {

    if (!productsContainer) {
        return;
    }


    try {

        console.log(
            "🛒 Cargando catálogo MOTI GO..."
        );


        // =================================================
        // 1. OBTENER TIENDAS DE LA ZONA
        // =================================================

        await cargarContextoTiendas();


        // =================================================
        // 2. SI NO HAY TIENDAS
        // =================================================

        if (
            !tiendasDisponibles.length
        ) {

            console.warn(
                "⚠️ No hay tiendas disponibles en la zona."
            );


            productos = [];

            inventarios = [];


            if (productsContainer) {

                productsContainer.innerHTML =
                    "";

            }


            if (emptyProducts) {

                emptyProducts.style.display =
                    "flex";

            }


            if (productsCount) {

                productsCount.textContent =
                    "0 productos";

            }


            return;

        }


        // =================================================
        // 3. CARGAR CATÁLOGO DE LA TIENDA SELECCIONADA
        // =================================================

        await cargarCatalogoDeTienda();


    }
    catch (error) {

        console.error(
            "❌ Error cargando catálogo:",
            error
        );


        productos = [];

        inventarios = [];


        if (productsContainer) {

            productsContainer.innerHTML =
                "";

        }


        if (emptyProducts) {

            emptyProducts.style.display =
                "flex";

        }

    }

}

// =====================================================
// OBTENER INVENTARIO DISPONIBLE
// =====================================================

function obtenerInventarioProducto(
    productoId
) {

    const resultados =
        inventarios.filter(
            inventario => {

                return (
                    inventario.productoId ===
                    productoId
                );

            }
        );


    return resultados.filter(
        inventario => {

            const disponible =
                inventario.disponible;


            const existencia =
                Number(
                    inventario.existencia ?? 0
                );


            return (
                disponible !== false &&
                existencia > 0
            );

        }
    );

}


// =====================================================
// OBTENER MEJOR PRECIO DISPONIBLE
// =====================================================

function obtenerMejorInventario(
    productoId
) {

    const disponibles =
        obtenerInventarioProducto(
            productoId
        );


    if (!disponibles.length) {

        return null;

    }


    return disponibles.reduce(
        (mejor, actual) => {

            const precioMejor =
                Number(
                    mejor.precio
                );

            const precioActual =
                Number(
                    actual.precio
                );


            if (
                precioActual <
                precioMejor
            ) {

                return actual;

            }


            return mejor;

        }
    );

}


// =====================================================
// RENDERIZAR PRODUCTOS
// =====================================================

function renderizarProductos() {

    if (!productsContainer) {
        return;
    }


    productsContainer.innerHTML =
        "";


    // =================================================
    // PRODUCTOS CON INVENTARIO DISPONIBLE
    // =================================================

    let productosDisponibles =
        productos.filter(
            producto => {

                const inventario =
                    obtenerMejorInventario(
                        producto.id
                    );


                return (
                    inventario !== null
                );

            }
        );


    // =================================================
    // FILTRO POR CATEGORÍA
    // =================================================

    if (
        categoriaActual !==
        "todos" &&
        categoriaActual !==
        "todas"
    ) {

        productosDisponibles =
            productosDisponibles.filter(
                producto => {

                    const categoria =
                        producto.categoria ||
                        producto.categoriaId ||
                        "otros";


                    return (
                        normalizarTexto(
                            categoria
                        ) ===
                        normalizarTexto(
                            categoriaActual
                        )
                    );

                }
            );

    }


    // =================================================
    // FILTRO POR BÚSQUEDA
    // =================================================

    if (
        textoBusqueda
            .trim()
            .length > 0
    ) {

        const texto =
            normalizarTexto(
                textoBusqueda
            );


        productosDisponibles =
            productosDisponibles.filter(
                producto => {

                    const nombre =
                        normalizarTexto(
                            producto.nombre ||
                            ""
                        );


                    const nombreNormalizado =
                        normalizarTexto(
                            producto.nombreNormalizado ||
                            ""
                        );


                    const codigo =
                        normalizarTexto(
                            producto.codigo ||
                            producto.codigoTienda ||
                            ""
                        );


                    return (

                        nombre.includes(
                            texto
                        ) ||

                        nombreNormalizado.includes(
                            texto
                        ) ||

                        codigo.includes(
                            texto
                        )

                    );

                }
            );

    }


    // =================================================
    // CONTADOR
    // =================================================

    if (productsCount) {

        productsCount.textContent =
            `${productosDisponibles.length} ${
                productosDisponibles.length === 1
                    ? "producto"
                    : "productos"
            }`;

    }


    // =================================================
    // TÍTULO
    // =================================================

    if (productsTitle) {

        if (
            categoriaActual ===
            "todos" ||
            categoriaActual ===
            "todas"
        ) {

            productsTitle.textContent =
                "Productos";

        }
        else {

            productsTitle.textContent =
                obtenerNombreCategoria(
                    categoriaActual
                );

        }

    }


    // =================================================
    // SIN RESULTADOS
    // =================================================

    if (
        productosDisponibles.length ===
        0
    ) {

        if (emptyProducts) {

            emptyProducts.style.display =
                "flex";

        }


        console.log(
            "📭 No hay productos disponibles con los filtros actuales."
        );


        return;

    }


    if (emptyProducts) {

        emptyProducts.style.display =
            "none";

    }


    // =================================================
    // CREAR PRODUCTOS
    // =================================================

    productosDisponibles.forEach(
        producto => {

            const inventario =
                obtenerMejorInventario(
                    producto.id
                );


            if (!inventario) {
                return;
            }


            const elemento =
                crearProductoElemento(
                    producto,
                    inventario
                );


            productsContainer.appendChild(
                elemento
            );

        }
    );


    actualizarCantidadesVisibles();


    console.log(
        "🛒 Productos mostrados:",
        productosDisponibles.length
    );

}

// =====================================================
// CREAR ELEMENTO DE PRODUCTO
// =====================================================

function crearProductoElemento(
    producto,
    inventario
) {

    const article =
        document.createElement(
            "article"
        );


    article.className =
        "product-item";


    article.dataset.productId =
        producto.id;


    article.dataset.category =
        producto.categoriaId ||
        producto.categoria ||
        "";


    // =================================================
    // INFORMACIÓN DEL PRODUCTO
    // =================================================

    const icono =
        obtenerIconoProducto(
            producto
        );


    const textoUnidad =
        obtenerTextoUnidad(
            producto
        );


    const precio =
        Number(
            inventario.precio ??
            producto.precio ??
            0
        );


    const cantidad =
        obtenerCantidad(
            producto.id
        );


    const existencia =
        Number(
            inventario.existencia ??
            0
        );


    article.innerHTML = `

        <div class="product-icon">

            <span class="material-symbols-outlined">
                ${icono}
            </span>

        </div>


        <div class="product-info">

            <strong>
                ${escaparHTML(
                    producto.nombre ||
                    "Producto"
                )}
            </strong>


            ${
                producto.marca
                    ? `
                        <span>
                            ${escaparHTML(
                                producto.marca
                            )}
                        </span>
                    `
                    : ""
            }


            ${
                textoUnidad
                    ? `
                        <span>
                            ${escaparHTML(
                                textoUnidad
                            )}
                        </span>
                    `
                    : ""
            }


            <b>
                ${formatearPrecio(
                    precio
                )}
            </b>


            ${
                existencia > 0
                    ? `
                        <small>
                            ${existencia} disponibles
                        </small>
                    `
                    : `
                        <small>
                            Agotado
                        </small>
                    `
            }

        </div>


        <div class="quantity-control">

            <button
                type="button"
                class="quantity-minus"
                data-product-id="${producto.id}"
                aria-label="Disminuir cantidad"
            >
                −
            </button>


            <span
                class="quantity-value"
                data-product-id="${producto.id}"
            >
                ${cantidad}
            </span>


            <button
                type="button"
                class="quantity-plus"
                data-product-id="${producto.id}"
                aria-label="Aumentar cantidad"
            >
                +
            </button>

        </div>

    `;


    // =================================================
    // BOTÓN MENOS
    // =================================================

    const btnMinus =
        article.querySelector(
            ".quantity-minus"
        );


    if (btnMinus) {

        btnMinus.addEventListener(
            "click",
            event => {

                event.stopPropagation();


                cambiarCantidad(
                    producto.id,
                    -1
                );

            }
        );

    }


    // =================================================
    // BOTÓN MÁS
    // =================================================

    const btnPlus =
        article.querySelector(
            ".quantity-plus"
        );


    if (btnPlus) {

        btnPlus.addEventListener(
            "click",
            event => {

                event.stopPropagation();


                cambiarCantidad(
                    producto.id,
                    1
                );

            }
        );

    }


    return article;

}


// =====================================================
// OBTENER ICONO DEL PRODUCTO
// =====================================================

function obtenerIconoProducto(
    producto
) {

    const categoria =
        normalizarTexto(
            producto.categoria ||
            producto.categoriaId ||
            "otros"
        );


    const iconos = {

        abarrotes:
            "grocery",

        carnes:
            "set_meal",

        carniceria:
            "set_meal",

        lacteos:
            "egg",

        "lacteos y huevos":
            "egg",

        bebidas:
            "local_drink",

        frutas:
            "nutrition",

        verduras:
            "eco",

        frutas_verduras:
            "nutrition",

        "frutas y verduras":
            "nutrition",

        limpieza:
            "cleaning_services",

        higiene:
            "soap",

        "higiene personal":
            "soap",

        botanas:
            "fastfood",

        mariscos:
            "set_meal",

        panaderia:
            "bakery_dining",

        congelados:
            "ac_unit",

        mascotas:
            "pets",

        farmacia:
            "medication",

        varios:
            "category"

    };


    return (
        iconos[categoria] ||
        "shopping_bag"
    );

}


// =====================================================
// OBTENER TEXTO DE UNIDAD
// =====================================================

function obtenerTextoUnidad(
    producto
) {

    if (
        producto.unidad
    ) {

        return producto.unidad;

    }


    if (
        producto.presentacion
    ) {

        return producto.presentacion;

    }


    if (
        producto.contenido
    ) {

        return producto.contenido;

    }


    return "";

}


// =====================================================
// CAMBIAR CANTIDAD DEL PRODUCTO DE LA TIENDA ACTUAL
// =====================================================

function cambiarCantidad(
    productoId,
    cambio
) {

    if (
        !tiendaSeleccionadaId
    ) {

        console.warn(
            "⚠️ No hay tienda seleccionada."
        );

        return;

    }


    const inventario =
        inventarios.find(
            item =>
                item.productoId ===
                productoId
        );


    if (!inventario) {

        console.warn(
            "⚠️ No existe inventario para:",
            productoId
        );

        return;

    }


    const precio =
        Number(
            inventario.precio ??
            0
        );


    const existencia =
        Number(
            inventario.existencia ??
            0
        );


    const clave =
        obtenerClaveCarrito(
            productoId,
            tiendaSeleccionadaId
        );


    const itemActual =
        carrito[
            clave
        ];


    const cantidadActual =
        itemActual
            ? Number(
                itemActual.cantidad ||
                0
            )
            : 0;


    const nuevaCantidad =
        cantidadActual +
        cambio;


    // =================================================
    // VALIDAR EXISTENCIA
    // =================================================

    if (
        nuevaCantidad >
        existencia
    ) {

        console.warn(
            "⚠️ No hay suficiente existencia para:",
            productoId
        );

        return;

    }


    // =================================================
    // ELIMINAR
    // =================================================

    if (
        nuevaCantidad <= 0
    ) {

        delete carrito[
            clave
        ];

    }

    // =================================================
    // GUARDAR
    // =================================================

   else {

    const producto =
        productos.find(
            item =>
                item.id ===
                productoId
        );


    carrito[
        clave
    ] = {

        productoId:
            productoId,

        tiendaId:
            tiendaSeleccionadaId,

        cantidad:
            nuevaCantidad,

        precio:
            precio,

        nombre:
            producto?.nombre ||
            itemActual?.nombre ||
            "Producto",

        tiendaNombre:
            tiendaSeleccionada?.nombre ||
            itemActual?.tiendaNombre ||
            "Tienda",

        existencia:
            existencia

    };

}


    guardarCarrito();


    actualizarCantidadesVisibles();

    actualizarCarrito();


    if (
        typeof actualizarPanelCarrito ===
        "function"
    ) {

        actualizarPanelCarrito();

    }

}

// =====================================================
// CLAVE ÚNICA DEL CARRITO
// =====================================================

function obtenerClaveCarrito(
    productoId,
    tiendaId
) {

    return `${tiendaId}__${productoId}`;

}
// =====================================================
// OBTENER CANTIDAD
// =====================================================

function obtenerCantidad(
    productoId
) {

    if (
        !tiendaSeleccionadaId
    ) {

        return 0;

    }


    const clave =
        obtenerClaveCarrito(
            productoId,
            tiendaSeleccionadaId
        );


    const item =
        carrito[
            clave
        ];


    return item
        ? Number(
            item.cantidad ||
            0
        )
        : 0;

}

// =====================================================
// ACTUALIZAR CANTIDADES VISIBLES
// =====================================================

function actualizarCantidadesVisibles() {

    const elementos =
        document.querySelectorAll(
            ".quantity-value"
        );


    elementos.forEach(
        elemento => {

            const productoId =
                elemento.dataset.productId;


            elemento.textContent =
                obtenerCantidad(
                    productoId
                );

        }
    );

}


// =====================================================
// ACTUALIZAR BARRA DEL CARRITO
// =====================================================

function actualizarCarrito() {

    let totalProductos =
        0;


    let total =
        0;


    Object.values(
        carrito
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


            const precio =
                Number(
                    item.precio ||
                    0
                );


            if (
                cantidad <= 0
            ) {

                return;

            }


            totalProductos +=
                cantidad;


            total +=
                precio *
                cantidad;

        }
    );


    // =================================================
    // CANTIDAD
    // =================================================

    if (cartItems) {

        cartItems.textContent =
            `${totalProductos} ${
                totalProductos === 1
                    ? "producto"
                    : "productos"
            }`;

    }


    // =================================================
    // TOTAL PRODUCTOS
    // =================================================

    if (cartTotal) {

        cartTotal.textContent =
            formatearPrecio(
                total
            );

    }


    // =================================================
    // MOSTRAR / OCULTAR BARRA
    // =================================================

    if (cartBar) {

        cartBar.style.display =
            totalProductos > 0
                ? "flex"
                : "none";

    }

}


// =====================================================
// CONFIGURAR CATEGORÍAS
// =====================================================

function configurarCategorias() {

    const botones =
        document.querySelectorAll(
            ".category-item"
        );


    botones.forEach(
        boton => {

            boton.addEventListener(
                "click",
                () => {

                    botones.forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    boton.classList.add(
                        "active"
                    );


                    categoriaActual =
                        boton.dataset.category ||
                        "todos";


                    renderizarProductos();

                }
            );

        }
    );

}


// =====================================================
// CONFIGURAR CATEGORÍA INICIAL
// =====================================================

function configurarCategoriaInicial() {

    const categoriaActiva =
        document.querySelector(
            ".category-item.active"
        );


    if (categoriaActiva) {

        categoriaActual =
            categoriaActiva.dataset.category ||
            "todos";

    }

}


// =====================================================
// CONFIGURAR BUSCADOR
// =====================================================

let busquedaGlobalTimer = null;

let busquedaGlobalSolicitud = 0;


function configurarBuscador() {

    if (!searchInput) {

        console.warn(
            "⚠️ No se encontró el campo de búsqueda."
        );

        return;

    }


    // =================================================
    // FORZAR ESCRITURA NORMAL
    // =================================================

    searchInput.style.direction =
        "ltr";

    searchInput.style.textAlign =
        "left";


    // =================================================
    // ESCRIBIR
    // =================================================

    searchInput.addEventListener(
        "input",
        () => {

            textoBusqueda =
                searchInput.value;


            if (searchClear) {

                searchClear.style.display =
                    textoBusqueda.length > 0
                        ? "flex"
                        : "none";

            }


            // Cancelar búsqueda global anterior

            if (
                busquedaGlobalTimer
            ) {

                clearTimeout(
                    busquedaGlobalTimer
                );

            }


            busquedaGlobalSolicitud++;


            // =================================================
            // CAMPO VACÍO
            // =================================================

            if (
                !textoBusqueda.trim()
            ) {

                ocultarResultadosBusquedaGlobal();


                renderizarProductos();


                return;

            }


            // =================================================
            // PRIMERO: BUSCAR EN LA TIENDA ACTUAL
            // =================================================

            renderizarProductos();


            const resultadosLocales =
                obtenerProductosBusquedaLocal();


            // =================================================
            // SI ENCONTRÓ EN LA TIENDA
            // =================================================

            if (
                resultadosLocales.length > 0
            ) {

                ocultarResultadosBusquedaGlobal();

                return;

            }


            // =================================================
            // NO ENCONTRÓ
            //
            // ESPERAMOS UN POQUITO PARA NO CONSULTAR
            // FIREBASE POR CADA LETRA.
            // =================================================

            const solicitudActual =
                busquedaGlobalSolicitud;


            busquedaGlobalTimer =
                setTimeout(
                    async () => {

                        if (
                            solicitudActual !==
                            busquedaGlobalSolicitud
                        ) {

                            return;

                        }


                        await buscarAutomaticamenteEnOtrasTiendas();

                    },
                    400
                );

        }
    );


    // =================================================
    // LIMPIAR
    // =================================================

    if (searchClear) {

        searchClear.addEventListener(
            "click",
            () => {

                searchInput.value =
                    "";

                textoBusqueda =
                    "";


                searchClear.style.display =
                    "none";


                busquedaGlobalSolicitud++;


                if (
                    busquedaGlobalTimer
                ) {

                    clearTimeout(
                        busquedaGlobalTimer
                    );

                }


                ocultarResultadosBusquedaGlobal();


                renderizarProductos();


                searchInput.focus();

            }
        );

    }

}

// =====================================================
// OBTENER RESULTADOS LOCALES
// =====================================================

function obtenerProductosBusquedaLocal() {

    if (
        !textoBusqueda ||
        !textoBusqueda.trim()
    ) {

        return productos;

    }


    const texto =
        normalizarTexto(
            textoBusqueda
        );


    return productos.filter(
        producto => {

            const nombre =
                normalizarTexto(
                    producto.nombre ||
                    ""
                );


            const nombreNormalizado =
                normalizarTexto(
                    producto.nombreNormalizado ||
                    ""
                );


            const codigo =
                normalizarTexto(
                    producto.codigo ||
                    producto.codigoTienda ||
                    ""
                );


            return (

                nombre.includes(
                    texto
                ) ||

                nombreNormalizado.includes(
                    texto
                ) ||

                codigo.includes(
                    texto
                )

            );

        }
    );

}


// =====================================================
// OCULTAR RESULTADOS GLOBALES
// =====================================================

function ocultarResultadosBusquedaGlobal() {

    if (!emptyProducts) {

        return;

    }


    emptyProducts.innerHTML =
        "";


    emptyProducts.style.display =
        "none";

}


// =====================================================
// BUSCAR AUTOMÁTICAMENTE EN OTRAS TIENDAS
// =====================================================

async function buscarAutomaticamenteEnOtrasTiendas() {

    if (
        !textoBusqueda ||
        !textoBusqueda.trim()
    ) {

        return;

    }


    if (
        !tiendasDisponibles ||
        !tiendasDisponibles.length
    ) {

        return;

    }


    const textoBuscado =
        textoBusqueda.trim();


    const textoNormalizado =
        normalizarTexto(
            textoBuscado
        );


    const solicitudActual =
        busquedaGlobalSolicitud;


    // =================================================
    // TIENDAS DIFERENTES A LA ACTUAL
    // =================================================

    const otrasTiendas =
        tiendasDisponibles.filter(
            tienda =>
                tienda.id !==
                tiendaSeleccionadaId
        );


    if (
        otrasTiendas.length ===
        0
    ) {

        mostrarResultadosBusquedaGlobal(
            [],
            textoBuscado
        );


        return;

    }


    try {

        // =================================================
        // MOSTRAR ESTADO DE BÚSQUEDA
        // =================================================

        mostrarEstadoBusquedaGlobal(
            textoBuscado
        );


        // =================================================
        // CONSULTAR INVENTARIOS DE LAS OTRAS TIENDAS
        // =================================================

        const tiendaIds =
            otrasTiendas.map(
                tienda =>
                    tienda.id
            );


        const inventariosGlobales =
            [];


        const loteTiendas =
            30;


        for (
            let inicio = 0;
            inicio < tiendaIds.length;
            inicio += loteTiendas
        ) {

            const lote =
                tiendaIds.slice(
                    inicio,
                    inicio +
                    loteTiendas
                );


            const inventariosQuery =
                query(
                    collection(
                        db,
                        "inventarios"
                    ),
                    where(
                        "tiendaId",
                        "in",
                        lote
                    )
                );


            const inventariosSnapshot =
                await getDocs(
                    inventariosQuery
                );


            inventariosSnapshot.forEach(
                docSnap => {

                    const inventario = {

                        id:
                            docSnap.id,

                        ...docSnap.data()

                    };


                    const existencia =
                        Number(
                            inventario.existencia ??
                            0
                        );


                    if (
                        inventario.disponible !== false &&
                        existencia > 0
                    ) {

                        inventariosGlobales.push(
                            inventario
                        );

                    }

                }
            );

        }


        // =================================================
        // SI EL USUARIO CAMBIÓ LA BÚSQUEDA MIENTRAS
        // FIREBASE RESPONDÍA, IGNORAMOS ESTE RESULTADO.
        // =================================================

        if (
            solicitudActual !==
            busquedaGlobalSolicitud
        ) {

            return;

        }


        // =================================================
        // IDS DE PRODUCTOS
        // =================================================

        const productoIds =
            [
                ...new Set(
                    inventariosGlobales
                        .map(
                            inventario =>
                                inventario.productoId
                        )
                        .filter(Boolean)
                )
            ];


        if (
            productoIds.length ===
            0
        ) {

            mostrarResultadosBusquedaGlobal(
                [],
                textoBuscado
            );


            return;

        }


        // =================================================
        // PRODUCTOS MAESTROS
        // =================================================

        const productosGlobales =
            [];


        const loteProductos =
            30;


        for (
            let inicio = 0;
            inicio < productoIds.length;
            inicio += loteProductos
        ) {

            const lote =
                productoIds.slice(
                    inicio,
                    inicio +
                    loteProductos
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


            const productosSnapshot =
                await getDocs(
                    productosQuery
                );


            productosSnapshot.forEach(
                docSnap => {

                    productosGlobales.push({

                        id:
                            docSnap.id,

                        ...docSnap.data()

                    });

                }
            );

        }


        // =================================================
        // COMPARAR PRODUCTOS
        // =================================================

        const resultados =
            [];


        inventariosGlobales.forEach(
            inventario => {

                const producto =
                    productosGlobales.find(
                        item =>
                            item.id ===
                            inventario.productoId
                    );


                if (!producto) {

                    return;

                }


                const nombre =
                    normalizarTexto(
                        producto.nombre ||
                        ""
                    );


                const nombreNormalizado =
                    normalizarTexto(
                        producto.nombreNormalizado ||
                        ""
                    );


                const codigo =
                    normalizarTexto(
                        producto.codigo ||
                        inventario.codigoTienda ||
                        ""
                    );


                const coincide =
                    nombre.includes(
                        textoNormalizado
                    ) ||

                    nombreNormalizado.includes(
                        textoNormalizado
                    ) ||

                    codigo.includes(
                        textoNormalizado
                    );


                if (!coincide) {

                    return;

                }


                const tienda =
                    tiendasDisponibles.find(
                        item =>
                            item.id ===
                            inventario.tiendaId
                    );


                if (!tienda) {

                    return;

                }


                resultados.push({

                    producto:
                        producto,

                    inventario:
                        inventario,

                    tienda:
                        tienda

                });

            }
        );


        // =================================================
        // EVITAR RESULTADOS DUPLICADOS
        // =================================================

        const resultadosUnicos =
            [];


        const claves =
            new Set();


        resultados.forEach(
            resultado => {

                const clave =
                    `${resultado.tienda.id}_${resultado.producto.id}`;


                if (
                    claves.has(
                        clave
                    )
                ) {

                    return;

                }


                claves.add(
                    clave
                );


                resultadosUnicos.push(
                    resultado
                );

            }
        );


        mostrarResultadosBusquedaGlobal(
            resultadosUnicos,
            textoBuscado
        );

    }
    catch (error) {

        console.error(
            "❌ Error buscando en otras tiendas:",
            error
        );


        mostrarErrorBusquedaGlobal();

    }

}

// =====================================================
// LIMPIAR BÚSQUEDA GLOBAL
// =====================================================
//
// Se ejecuta cuando el cliente agrega un producto
// encontrado en otra tienda.
//
// La búsqueda desaparece y el cliente vuelve a ver
// el catálogo normal de la tienda seleccionada.
// =====================================================

function limpiarBusquedaGlobal() {

    // =================================================
    // INVALIDAR LA BÚSQUEDA GLOBAL ACTUAL
    // =================================================

    busquedaGlobalSolicitud++;


    // =================================================
    // CANCELAR BÚSQUEDA PENDIENTE
    // =================================================

    if (
        busquedaGlobalTimer
    ) {

        clearTimeout(
            busquedaGlobalTimer
        );

        busquedaGlobalTimer =
            null;

    }


    // =================================================
    // LIMPIAR TEXTO
    // =================================================

    textoBusqueda =
        "";


    // =================================================
    // LIMPIAR CAMPO DE BÚSQUEDA
    // =================================================

    if (searchInput) {

        searchInput.value =
            "";

    }


    // =================================================
    // OCULTAR BOTÓN DE LIMPIAR
    // =================================================

    if (searchClear) {

        searchClear.style.display =
            "none";

    }


    // =================================================
    // OCULTAR RESULTADOS GLOBALES
    // =================================================

    ocultarResultadosBusquedaGlobal();


    // =================================================
    // VOLVER AL CATÁLOGO NORMAL
    // =================================================

    renderizarProductos();

}
// =====================================================
// ESTADO DE BÚSQUEDA GLOBAL
// =====================================================

function mostrarEstadoBusquedaGlobal(
    texto
) {

    if (!emptyProducts) {

        return;

    }


    emptyProducts.innerHTML = `

        <div
            style="
                width:100%;
                text-align:center;
                padding:20px 12px;
            "
        >

            <div
                style="
                    font-size:14px;
                    margin-bottom:8px;
                "
            >
                Buscando
            </div>


            <strong>
                ${escaparHTML(
                    texto
                )}
            </strong>

        </div>

    `;


    emptyProducts.style.display =
        "flex";

}


// =====================================================
// MOSTRAR RESULTADOS GLOBALES
// =====================================================

function mostrarResultadosBusquedaGlobal(
    resultados,
    texto
) {

    if (!emptyProducts) {

        return;

    }


    if (
        resultados.length ===
        0
    ) {

        emptyProducts.innerHTML = `

            <div
                style="
                    width:100%;
                    padding:20px 12px;
                    text-align:center;
                "
            >

                <div
                    style="
                        font-size:14px;
                        margin-bottom:8px;
                    "
                >
                    No encontramos
                </div>


                <strong>
                    "${escaparHTML(
                        texto
                    )}"
                </strong>


                <div
                    style="
                        font-size:13px;
                        margin-top:8px;
                    "
                >
                    No está disponible en
                    otras tiendas de tu zona.
                </div>

            </div>

        `;


        emptyProducts.style.display =
            "flex";


        return;

    }


    emptyProducts.innerHTML = `

        <div
            style="
                width:100%;
                text-align:left;
            "
        >

            <div
                style="
                    text-align:center;
                    margin-bottom:14px;
                "
            >

                <strong>
                    "${escaparHTML(
                        texto
                    )}"
                </strong>


                <div
                    style="
                        font-size:13px;
                        margin-top:5px;
                    "
                >
                    Disponible en otras tiendas
                    de tu zona
                </div>

            </div>


            <div
                id="motiGlobalResultsList"
            ></div>

        </div>

    `;


    const lista =
        document.getElementById(
            "motiGlobalResultsList"
        );


    resultados.forEach(
        resultado => {

            const producto =
                resultado.producto;


            const inventario =
                resultado.inventario;


            const tienda =
                resultado.tienda;


            const precio =
                Number(
                    inventario.precio ??
                    producto.precio ??
                    0
                );


            const clave =
    obtenerClaveCarrito(
        producto.id,
        tienda.id
    );


const itemCarrito =
    carrito[
        clave
    ];


const cantidad =
    itemCarrito
        ? Number(
            itemCarrito.cantidad ||
            0
        )
        : 0;


            const item =
                document.createElement(
                    "article"
                );


            item.style.display =
                "flex";


            item.style.alignItems =
                "center";


            item.style.gap =
                "10px";


            item.style.padding =
                "12px 0";


            item.style.borderBottom =
                "1px solid #eeeeee";


            item.innerHTML = `

                <div
                    style="
                        flex:1;
                        min-width:0;
                    "
                >

                    <strong
                        style="
                            display:block;
                            font-size:14px;
                        "
                    >
                        ${escaparHTML(
                            producto.nombre ||
                            "Producto"
                        )}
                    </strong>


                    <span
                        style="
                            display:block;
                            font-size:12px;
                            margin-top:3px;
                        "
                    >
                        🏪 ${escaparHTML(
                            tienda.nombre ||
                            "Tienda"
                        )}
                    </span>


                    <b
                        style="
                            display:block;
                            margin-top:4px;
                        "
                    >
                        ${formatearPrecio(
                            precio
                        )}
                    </b>

                </div>


                <div
                    class="quantity-control"
                    style="
                        flex-shrink:0;
                    "
                >

                    <button
                        type="button"
                        class="global-quantity-minus"
                        aria-label="Disminuir cantidad"
                    >
                        −
                    </button>


 <span
    class="global-quantity-value"
    data-product-id="${producto.id}"
    data-tienda-id="${tienda.id}"
>
    ${cantidad}
</span>

                    <button
                        type="button"
                        class="global-quantity-plus"
                        aria-label="Aumentar cantidad"
                    >
                        +
                    </button>

                </div>

            `;


            // =================================================
            // MENOS
            // =================================================

            const btnMinus =
                item.querySelector(
                    ".global-quantity-minus"
                );


            btnMinus.addEventListener(
                "click",
                event => {

                    event.stopPropagation();


    cambiarCantidadDesdeTienda(
    producto.id,
    tienda.id,
    -1,
    inventario.precio,
    producto.nombre,
    inventario.existencia
);

                }
            );


            // =================================================
            // MÁS
            // =================================================

            const btnPlus =
                item.querySelector(
                    ".global-quantity-plus"
                );


            btnPlus.addEventListener(
                "click",
                event => {

                    event.stopPropagation();


    cambiarCantidadDesdeTienda(
    producto.id,
    tienda.id,
    1,
    inventario.precio,
    producto.nombre,
    inventario.existencia
);
                }
            );


            if (lista) {

                lista.appendChild(
                    item
                );

            }

        }
    );


    emptyProducts.style.display =
        "flex";

}


// =====================================================
// CAMBIAR CANTIDAD DESDE BÚSQUEDA GLOBAL
// =====================================================

function cambiarCantidadDesdeTienda(
    productoId,
    tiendaId,
    cambio,
    precio,
    nombreProducto,
    existenciaDisponible
) {

    const clave =
        obtenerClaveCarrito(
            productoId,
            tiendaId
        );


    const itemActual =
        carrito[
            clave
        ];


    const cantidadActual =
        itemActual
            ? Number(
                itemActual.cantidad ||
                0
            )
            : 0;


    const nuevaCantidad =
        cantidadActual +
        cambio;


    // =================================================
    // BUSCAR EXISTENCIA
    // =================================================

    const existencia =
    existenciaDisponible !==
    undefined &&
    existenciaDisponible !==
    null
        ? Number(
            existenciaDisponible
        )
        : null;


    if (
        existencia !== null &&
        nuevaCantidad >
        existencia
    ) {

        console.warn(
            "⚠️ No hay suficiente existencia."
        );

        return;

    }


    // =================================================
    // ELIMINAR
    // =================================================

    if (
        nuevaCantidad <= 0
    ) {

        delete carrito[
            clave
        ];

    }

    // =================================================
    // GUARDAR
    // =================================================

 else {

    carrito[
        clave
    ] = {

        productoId:
            productoId,

        tiendaId:
            tiendaId,

        cantidad:
            nuevaCantidad,

        precio:
            Number(
                precio ||
                0
            ),

        nombre:
            nombreProducto ||
            "Producto",

        existencia:
            existencia

    };

}


    guardarCarrito();


    actualizarCarrito();


    actualizarPanelCarrito();

// =================================================
// SI SE AGREGA DESDE BÚSQUEDA GLOBAL,
// LIMPIAR LA BÚSQUEDA Y VOLVER AL CATÁLOGO
// =================================================

if (
    cambio > 0
) {

    limpiarBusquedaGlobal();

}

}

// =====================================================
// ERROR
// =====================================================

function mostrarErrorBusquedaGlobal() {

    if (!emptyProducts) {

        return;

    }


    emptyProducts.innerHTML = `

        <div
            style="
                text-align:center;
                padding:20px;
            "
        >

            No pudimos consultar
            otras tiendas en este momento.

        </div>

    `;


    emptyProducts.style.display =
        "flex";

}

// =====================================================
// NOMBRE DE CATEGORÍA
// =====================================================

function obtenerNombreCategoria(
    categoriaId
) {

    const nombres = {

        todos:
            "Productos",

        todas:
            "Productos",

        abarrotes:
            "Abarrotes",

        carnes:
            "Carnes",

        carniceria:
            "Carnes",

        lacteos:
            "Lácteos",

        "lacteos y huevos":
            "Lácteos y huevos",

        bebidas:
            "Bebidas",

        frutas:
            "Frutas",

        verduras:
            "Verduras",

        frutas_verduras:
            "Frutas y verduras",

        "frutas y verduras":
            "Frutas y verduras",

        limpieza:
            "Limpieza",

        higiene:
            "Higiene",

        "higiene personal":
            "Higiene personal",

        botanas:
            "Botanas",

        mariscos:
            "Mariscos",

        panaderia:
            "Panadería",

        congelados:
            "Congelados",

        mascotas:
            "Mascotas",

        farmacia:
            "Farmacia",

        varios:
            "Varios",

        otros:
            "Otros"

    };


    return (
        nombres[
            normalizarTexto(
                categoriaId
            )
        ] ||
        "Productos"
    );

}


// =====================================================
// NORMALIZAR TEXTO
// =====================================================

function normalizarTexto(
    texto
) {

    return String(
        texto || ""
    )
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();

}


// =====================================================
// FORMATO DE PRECIO
// =====================================================

function formatearPrecio(
    precio
) {

    return new Intl.NumberFormat(
        "es-MX",
        {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: 2
        }
    ).format(
        Number(
            precio
        ) || 0
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
// GPS
// =====================================================

if (
    "geolocation" in navigator
) {

    navigator.geolocation.getCurrentPosition(

        (position) => {

            userLat =
                position.coords.latitude;

            userLng =
                position.coords.longitude;


            if (locationText) {

                locationText.textContent =
                    "GPS conectado correctamente";

            }


            const user =
                auth.currentUser;


            if (user) {

                actualizarUbicacion(
                    user.uid,
                    userLat,
                    userLng
                );

            }

        },

        (error) => {

            if (locationText) {

                locationText.textContent =
                    "No se pudo obtener la ubicación";

            }


            console.error(
                "Error GPS:",
                error
            );

        }

    );

}
else {

    if (locationText) {

        locationText.textContent =
            "GPS no compatible";

    }

}


// =====================================================
// ACTUALIZAR UBICACIÓN REAL DEL CLIENTE
// =====================================================

async function actualizarUbicacion(
    uid,
    lat,
    lng
) {

    try {

        await updateDoc(

            doc(
                db,
                "usuarios",
                uid
            ),

            {

                latitud:
                    lat,

                longitud:
                    lng,

                ultimaUbicacion:
                    new Date().toISOString()

            }

        );


        console.log(
            "📍 Ubicación actualizada"
        );

    }
    catch (error) {

        console.error(
            "Error actualizando ubicación:",
            error
        );

    }

}


// =====================================================
// DESTINO SELECCIONADO
// =====================================================

const destinoGuardado =
    sessionStorage.getItem(
        "destinoViaje"
    );


if (
    destinoGuardado
) {

    try {

        const destino =
            JSON.parse(
                destinoGuardado
            );

    window.motiGoDestinoSeleccionado =
    destino;
        
        console.log(
            "Destino seleccionado:",
            destino
        );

    }
    catch (error) {

        console.error(
            "Error leyendo destino:",
            error
        );

    }

}

// =====================================================
// PANEL DEL CARRITO MOTI GO
// =====================================================
//
// El carrito se abre sobre la misma pantalla.
// No navegamos a otra página.
//
// En esta primera etapa:
//
// ✓ Mostrar productos
// ✓ Mostrar cantidades
// ✓ Botones + y -
// ✓ Mostrar subtotal
// ✓ Mostrar costo de entrega
// ✓ Mostrar total
// ✓ Cerrar panel
//
// Todavía NO se crea el pedido en Firebase.
// =====================================================


// =====================================================
// CREAR ESTRUCTURA DEL PANEL
// =====================================================

let cartPanelOverlay = null;
let cartPanel = null;


// =====================================================
// CREAR PANEL
// =====================================================

function crearPanelCarrito() {

    // Evitar duplicarlo

    if (
        document.getElementById(
            "motiCartOverlay"
        )
    ) {

        cartPanelOverlay =
            document.getElementById(
                "motiCartOverlay"
            );

        cartPanel =
            document.getElementById(
                "motiCartPanel"
            );

        return;

    }


    // =================================================
    // OVERLAY
    // =================================================

    cartPanelOverlay =
        document.createElement(
            "div"
        );


    cartPanelOverlay.id =
        "motiCartOverlay";


    // =================================================
    // PANEL
    // =================================================

    cartPanel =
        document.createElement(
            "section"
        );


    cartPanel.id =
        "motiCartPanel";


    cartPanel.setAttribute(
        "aria-label",
        "Carrito de compra"
    );


    // =================================================
    // HTML DEL PANEL
    // =================================================

    cartPanel.innerHTML = `

        <div
            class="moti-cart-header"
        >

            <div>

                <span
                    class="moti-cart-title"
                >
                    Mi pedido
                </span>

                <span
                    class="moti-cart-subtitle"
                    id="motiCartSubtitle"
                >
                    0 productos
                </span>

            </div>


            <button
                type="button"
                id="motiCartClose"
                class="moti-cart-close"
                aria-label="Cerrar carrito"
            >
                ×
            </button>

        </div>


        <div
            id="motiCartContent"
            class="moti-cart-content"
        ></div>


        <div
            class="moti-cart-footer"
        >

            <div
                class="moti-cart-summary-row"
            >

                <span>
                    Productos
                </span>

                <strong
                    id="motiCartSubtotal"
                >
                    $0.00
                </strong>

            </div>


            <div
                class="moti-cart-summary-row"
            >

                <span>
                    Entrega
                </span>

                <strong
                    id="motiCartDelivery"
                >
                    $10.00
                </strong>

            </div>


            <div
                class="moti-cart-summary-total"
            >

                <span>
                    Total
                </span>

                <strong
                    id="motiCartTotal"
                >
                    $10.00
                </strong>

            </div>


            <button
                type="button"
                id="motiCartConfirm"
                class="moti-cart-confirm"
            >
                Revisar pedido
            </button>

        </div>

    `;


    // =================================================
    // INSERTAR
    // =================================================

    cartPanelOverlay.appendChild(
        cartPanel
    );


    document.body.appendChild(
        cartPanelOverlay
    );


    // =================================================
    // CERRAR CON X
    // =================================================

    const closeButton =
        document.getElementById(
            "motiCartClose"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            cerrarPanelCarrito
        );

    }


    // =================================================
    // CERRAR TOCANDO EL FONDO
    // =================================================

    cartPanelOverlay.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                cartPanelOverlay
            ) {

                cerrarPanelCarrito();

            }

        }
    );


    // =================================================
// BOTÓN REVISAR PEDIDO
// =================================================

const confirmButton =
    document.getElementById(
        "motiCartConfirm"
    );


if (confirmButton) {

    confirmButton.addEventListener(
        "click",
        () => {

            console.log(
                "🧾 Revisar pedido MOTI GO:",
                carrito
            );


            // =================================================
            // ABRIR EL NUEVO MÓDULO DE PEDIDOS
            // =================================================
            //
            // moti-go-pedido.js se encarga de:
            //
            // - leer nuevamente el carrito
            // - agrupar productos
            // - calcular subtotal
            // - calcular entrega
            // - mostrar el panel de revisión
            //
            // Todavía NO crea el pedido.
            // =================================================

           if (
    typeof window.abrirRevisionPedido ===
    "function"
) {

    window.abrirRevisionPedido(
    carrito,
    productos,
    tiendasDisponibles,
    perfilCliente
);

}
else {

    console.error(
        "❌ MOTI GO: abrirRevisionPedido() no está disponible."
    );

}

        }
    );

}

    // =================================================
    // CREAR ESTILOS
    // =================================================

    crearEstilosPanelCarrito();

}


// =====================================================
// ABRIR PANEL
// =====================================================

function abrirPanelCarrito() {

    crearPanelCarrito();


    actualizarPanelCarrito();


    requestAnimationFrame(
        () => {

            cartPanelOverlay.classList.add(
                "moti-cart-open"
            );

        }
    );


    document.body.classList.add(
        "moti-cart-lock"
    );

}


// =====================================================
// CERRAR PANEL
// =====================================================

function cerrarPanelCarrito() {

    if (!cartPanelOverlay) {

        return;

    }


    cartPanelOverlay.classList.remove(
        "moti-cart-open"
    );


    document.body.classList.remove(
        "moti-cart-lock"
    );

}


// =====================================================
// ACTUALIZAR PANEL DEL CARRITO
// =====================================================

function actualizarPanelCarrito() {

    if (!cartPanel) {

        return;

    }


    const content =
        document.getElementById(
            "motiCartContent"
        );


    const subtitle =
        document.getElementById(
            "motiCartSubtitle"
        );


    const subtotalElement =
        document.getElementById(
            "motiCartSubtotal"
        );


    const deliveryElement =
        document.getElementById(
            "motiCartDelivery"
        );


    const totalElement =
        document.getElementById(
            "motiCartTotal"
        );


    if (!content) {

        return;

    }


    content.innerHTML =
        "";


    let subtotal =
        0;


    let totalProductos =
        0;


    // =================================================
    // AGRUPAR POR TIENDA
    // =================================================

    const gruposTiendas =
        {};


    Object.values(
        carrito
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
                cantidad <= 0
            ) {

                return;

            }


            if (
                !gruposTiendas[
                    item.tiendaId
                ]
            ) {

                gruposTiendas[
                    item.tiendaId
                ] = [];

            }


            gruposTiendas[
                item.tiendaId
            ].push(
                item
            );

        }
    );


    // =================================================
    // MOSTRAR CADA TIENDA
    // =================================================

    Object.entries(
        gruposTiendas
    ).forEach(
        ([tiendaId, items]) => {

            const tienda =
                tiendasDisponibles.find(
                    item =>
                        item.id ===
                        tiendaId
                );


            const tiendaNombre =
                tienda?.nombre ||
                "Tienda";


            const tiendaHeader =
                document.createElement(
                    "div"
                );


            tiendaHeader.className =
                "moti-cart-store";


            tiendaHeader.innerHTML = `

                <div
                    class="moti-cart-store-title"
                >

                    <span
                        class="material-symbols-outlined"
                    >
                        store
                    </span>

                    <strong>
                        ${escaparHTML(
                            tiendaNombre
                        )}
                    </strong>

                </div>

            `;


            content.appendChild(
                tiendaHeader
            );


            // =================================================
            // PRODUCTOS DE ESTA TIENDA
            // =================================================

            items.forEach(
                item => {

                    const producto =
                        productos.find(
                            productoItem =>
                                productoItem.id ===
                                item.productoId
                        );


                    const nombre =
                        producto?.nombre ||
                        item.nombre ||
                        "Producto";


                    const precio =
                        Number(
                            item.precio ||
                            0
                        );


                    const cantidad =
                        Number(
                            item.cantidad ||
                            0
                        );


                    const importe =
                        precio *
                        cantidad;


                    subtotal +=
                        importe;


                    totalProductos +=
                        cantidad;


                    const elemento =
                        document.createElement(
                            "article"
                        );


                    elemento.className =
                        "moti-cart-product";


                    elemento.innerHTML = `

                        <div
                            class="moti-cart-product-info"
                        >

                            <strong>
                                ${escaparHTML(
                                    nombre
                                )}
                            </strong>


                            <b>
                                ${formatearPrecio(
                                    precio
                                )}
                            </b>


                            <small>
                                ${formatearPrecio(
                                    importe
                                )}
                            </small>

                        </div>


                        <div
                            class="moti-cart-product-controls"
                        >

                            <button
                                type="button"
                                class="moti-cart-minus"
                            >
                                −
                            </button>


                            <span>
                                ${cantidad}
                            </span>


                            <button
                                type="button"
                                class="moti-cart-plus"
                            >
                                +
                            </button>

                        </div>

                    `;


                    // =================================================
                    // MENOS
                    // =================================================

                    const minus =
                        elemento.querySelector(
                            ".moti-cart-minus"
                        );


                    minus.addEventListener(
                        "click",
                        event => {

                            event.stopPropagation();


    cambiarCantidadDesdeTienda(
    item.productoId,
    item.tiendaId,
    -1,
    item.precio,
    item.nombre,
    item.existencia
);

                        }
                    );


                    // =================================================
                    // MÁS
                    // =================================================

                    const plus =
                        elemento.querySelector(
                            ".moti-cart-plus"
                        );


                    plus.addEventListener(
                        "click",
                        event => {

                            event.stopPropagation();


    cambiarCantidadDesdeTienda(
    item.productoId,
    item.tiendaId,
    1,
    item.precio,
    item.nombre,
    item.existencia
);

                        }
                    );


                    content.appendChild(
                        elemento
                    );

                }
            );

        }
    );


    // =================================================
    // CARRITO VACÍO
    // =================================================

    if (
        totalProductos ===
        0
    ) {

        content.innerHTML = `

            <div
                class="moti-cart-empty"
            >

                <span
                    class="material-symbols-outlined"
                >
                    shopping_cart
                </span>


                <strong>
                    Tu carrito está vacío
                </strong>


                <span>
                    Agrega productos para comenzar
                    tu pedido.
                </span>

            </div>

        `;

    }


    // =================================================
    // ENTREGA
    // =================================================

    const costoEntrega =
        totalProductos > 0
            ? 10
            : 0;


    const total =
        subtotal +
        costoEntrega;


    // =================================================
    // RESUMEN
    // =================================================

    if (subtitle) {

        subtitle.textContent =
            `${totalProductos} ${
                totalProductos === 1
                    ? "producto"
                    : "productos"
            }`;

    }


    if (subtotalElement) {

        subtotalElement.textContent =
            formatearPrecio(
                subtotal
            );

    }


    if (deliveryElement) {

        deliveryElement.textContent =
            formatearPrecio(
                costoEntrega
            );

    }


    if (totalElement) {

        totalElement.textContent =
            formatearPrecio(
                total
            );

    }


    const confirmButton =
        document.getElementById(
            "motiCartConfirm"
        );


    if (confirmButton) {

        confirmButton.disabled =
            totalProductos ===
            0;

        confirmButton.style.opacity =
            totalProductos === 0
                ? "0.5"
                : "1";

    }

}


// =====================================================
// ESTILOS DEL PANEL
// =====================================================

function crearEstilosPanelCarrito() {

    if (
        document.getElementById(
            "motiCartStyles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "motiCartStyles";


    style.textContent = `

        /* ============================================
           OVERLAY
        ============================================ */

        #motiCartOverlay {

            position: fixed;

            inset: 0;

            z-index: 99999;

            background: rgba(
                0,
                0,
                0,
                0.42
            );

            opacity: 0;

            visibility: hidden;

            transition:
                opacity 0.25s ease,
                visibility 0.25s ease;

        }


        #motiCartOverlay.moti-cart-open {

            opacity: 1;

            visibility: visible;

        }


        /* ============================================
           PANEL
        ============================================ */

        #motiCartPanel {

            position: absolute;

            left: 0;

            right: 0;

            bottom: 0;

            max-height: 88vh;

            background: #fff;

            border-radius:
                22px 22px 0 0;

            display: flex;

            flex-direction: column;

            overflow: hidden;

            transform:
                translateY(100%);

            transition:
                transform 0.28s
                cubic-bezier(
                    0.22,
                    1,
                    0.36,
                    1
                );

            box-shadow:
                0 -8px 30px
                rgba(
                    0,
                    0,
                    0,
                    0.18
                );

        }


        #motiCartOverlay.moti-cart-open
        #motiCartPanel {

            transform:
                translateY(0);

        }


        /* ============================================
           HEADER
        ============================================ */

        .moti-cart-header {

            display: flex;

            align-items: center;

            justify-content:
                space-between;

            padding:
                18px 20px 14px;

            border-bottom:
                1px solid #eeeeee;

        }


        .moti-cart-title {

            display: block;

            font-size: 20px;

            font-weight: 700;

            color: #151515;

        }


        .moti-cart-subtitle {

            display: block;

            margin-top: 3px;

            font-size: 13px;

            color: #777;

        }


        .moti-cart-close {

            width: 40px;

            height: 40px;

            border: 0;

            border-radius: 50%;

            background: #f3f3f3;

            font-size: 26px;

            line-height: 1;

            cursor: pointer;

        }


        /* ============================================
           CONTENIDO
        ============================================ */

        .moti-cart-content {

            flex: 1;

            overflow-y: auto;

            padding:
                8px 18px 18px;

            -webkit-overflow-scrolling:
                touch;

        }


        /* ============================================
           PRODUCTO
        ============================================ */

        .moti-cart-product {

            display: flex;

            align-items: center;

            justify-content:
                space-between;

            gap: 12px;

            padding:
                14px 0;

            border-bottom:
                1px solid #eeeeee;

        }


        .moti-cart-product-info {

            flex: 1;

            min-width: 0;

        }


        .moti-cart-product-info strong {

            display: block;

            font-size: 15px;

            color: #202020;

        }


        .moti-cart-product-info span {

            display: block;

            margin-top: 3px;

            font-size: 12px;

            color: #777;

        }


        .moti-cart-product-info b {

            display: block;

            margin-top: 6px;

            font-size: 14px;

        }


        .moti-cart-product-info small {

            display: block;

            margin-top: 2px;

            font-size: 12px;

            color: #555;

        }


        /* ============================================
           CONTROLES
        ============================================ */

        .moti-cart-product-controls {

            display: flex;

            align-items: center;

            gap: 10px;

            flex-shrink: 0;

        }


        .moti-cart-product-controls button {

            width: 34px;

            height: 34px;

            border: 0;

            border-radius: 50%;

            background: #f1f1f1;

            font-size: 20px;

            cursor: pointer;

        }


        .moti-cart-product-controls span {

            min-width: 20px;

            text-align: center;

            font-size: 15px;

            font-weight: 600;

            color: #222;

        }


        /* ============================================
           FOOTER
        ============================================ */

        .moti-cart-footer {

            padding:
                14px 18px
                calc(
                    18px +
                    env(
                        safe-area-inset-bottom
                    )
                );

            background: #fff;

            border-top:
                1px solid #eeeeee;

            box-shadow:
                0 -4px 15px
                rgba(
                    0,
                    0,
                    0,
                    0.06
                );

        }


        .moti-cart-summary-row {

            display: flex;

            justify-content:
                space-between;

            align-items: center;

            margin-bottom: 8px;

            font-size: 14px;

            color: #555;

        }


        .moti-cart-summary-total {

            display: flex;

            justify-content:
                space-between;

            align-items: center;

            margin-top: 10px;

            padding-top: 12px;

            border-top:
                1px solid #eeeeee;

            font-size: 18px;

            font-weight: 700;

            color: #111;

        }


        .moti-cart-confirm {

            width: 100%;

            margin-top: 14px;

            padding: 14px 18px;

            border: 0;

            border-radius: 12px;

            background: #111;

            color: #fff;

            font-size: 15px;

            font-weight: 700;

            cursor: pointer;

        }


        .moti-cart-confirm:disabled {

            cursor: default;

        }


        /* ============================================
           CARRITO VACÍO
        ============================================ */

        .moti-cart-empty {

            min-height: 240px;

            display: flex;

            flex-direction: column;

            align-items: center;

            justify-content: center;

            gap: 8px;

            text-align: center;

            color: #777;

        }


        .moti-cart-empty
        .material-symbols-outlined {

            font-size: 42px;

            margin-bottom: 5px;

        }


        .moti-cart-empty strong {

            color: #333;

            font-size: 16px;

        }


        /* ============================================
           BLOQUEAR SCROLL DEL FONDO
        ============================================ */

        body.moti-cart-lock {

            overflow: hidden;

        }


        /* ============================================
           MÓVIL
        ============================================ */

        @media (
            min-width: 700px
        ) {

            #motiCartPanel {

                left: 50%;

                right: auto;

                width: 520px;

                max-width: 95vw;

                transform:
                    translate(-50%, 100%);

            }


            #motiCartOverlay.moti-cart-open
            #motiCartPanel {

                transform:
                    translate(-50%, 0);

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


// =====================================================
// BOTÓN DEL CARRITO
// =====================================================

if (cartBar) {

    cartBar.addEventListener(
        "click",
        event => {

            event.preventDefault();

            event.stopPropagation();


            abrirPanelCarrito();

        }
    );

}


// =====================================================
// INICIALIZACIÓN DEL CARRITO
// =====================================================

cargarCarrito();


// =====================================================
// CONFIGURAR INTERFAZ
// =====================================================

configurarCategorias();

configurarCategoriaInicial();

configurarBuscador();

actualizarCarrito();


// =====================================================
// FIREBASE AUTH
// =====================================================
//
// IMPORTANTE:
//
// No intentamos cargar el catálogo antes de que
// Firebase haya restaurado la sesión.
//
// Esto evita el error:
//
// "No hay usuario autenticado."
//
// =====================================================


onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            console.warn(
                "⚠️ No hay usuario autenticado."
            );


            return;

        }


        console.log(
            "👤 Usuario pasajero autenticado:",
            user.uid
        );


        try {

            await cargarCatalogo();

        }
        catch (error) {

            console.error(
                "❌ Error iniciando catálogo:",
                error
            );

        }

    }
);


// =====================================================
// INICIO
// =====================================================

console.log(
    "🛒 MOTI GO - CATÁLOGO INICIADO"
);




// =====================================================
// MENÚ LATERAL — MOTI GO
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        // -------------------------------------------------
        // MI CARRITO
        // -------------------------------------------------

        const menuMiCarrito =
            document.getElementById(
                "menuMiCarrito"
            );


        if (
            menuMiCarrito
        ) {

            menuMiCarrito.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();

                    console.log(
                        "🛒 MOTI GO: Mi carrito seleccionado."
                    );


                    if (
                        typeof abrirPanelCarrito ===
                        "function"
                    ) {

                        abrirPanelCarrito();

                    }
                    else if (
                        typeof window.abrirPanelCarrito ===
                        "function"
                    ) {

                        window.abrirPanelCarrito();

                    }
                    else {

                        console.error(
                            "❌ MOTI GO: abrirPanelCarrito() no está disponible."
                        );

                    }

                }
            );

        }


        // -------------------------------------------------
        // MIS PEDIDOS
        // -------------------------------------------------

        const menuMisPedidos =
            document.getElementById(
                "menuMisPedidos"
            );


        if (
            menuMisPedidos
        ) {

            menuMisPedidos.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();

                    console.log(
                        "🧾 MOTI GO: Mis pedidos seleccionado."
                    );

                    abrirPanelMisPedidos();

                }
            );

        }

    }
);

// =====================================================
// ESTILOS — MIS PEDIDOS MOTI GO
// =====================================================

function crearEstilosMisPedidos() {

    if (
        document.getElementById(
            "motiEstilosMisPedidos"
        )
    ) {

        return;

    }


    const estilo =
        document.createElement(
            "style"
        );


    estilo.id =
        "motiEstilosMisPedidos";


    estilo.textContent = `

        #motiPanelMisPedidos {

            position: fixed;

            inset: 0;

            z-index: 99999;

            background: #f7f7f7;

            visibility: hidden;

            opacity: 0;

            transform: translateX(100%);

            transition:
                opacity .25s ease,
                transform .25s ease,
                visibility .25s ease;

        }


        #motiPanelMisPedidos.activo {

            visibility: visible;

            opacity: 1;

            transform: translateX(0);

        }


        .moti-pedidos-panel {

            width: 100%;

            height: 100%;

            display: flex;

            flex-direction: column;

            background: #f7f7f7;

        }


        .moti-pedidos-header {

            min-height: 72px;

            padding:
                12px
                16px;

            display: flex;

            align-items: center;

            gap: 12px;

            background: #ffffff;

            border-bottom:
                1px solid
                #e5e5e5;

        }


        .moti-pedidos-header > div {

            display: flex;

            flex-direction: column;

            gap: 2px;

        }


        .moti-pedidos-header span {

            font-size: 11px;

            font-weight: 700;

            color: #777;

            letter-spacing: .08em;

        }


        .moti-pedidos-header h2 {

            margin: 0;

            font-size: 22px;

            color: #111;

        }


        .moti-pedidos-cerrar {

            width: 44px;

            height: 44px;

            border: 0;

            border-radius: 50%;

            background: #f0f0f0;

            display: flex;

            align-items: center;

            justify-content: center;

            cursor: pointer;

        }


        .moti-pedidos-contenido {

            flex: 1;

            overflow-y: auto;

            padding: 20px 16px 32px;

        }


        .moti-pedidos-seccion {

            margin-bottom: 28px;

        }


        .moti-pedidos-titulo {

            display: flex;

            align-items: center;

            gap: 8px;

            margin-bottom: 12px;

        }


        .moti-pedidos-titulo .material-symbols-outlined {

            font-size: 21px;

        }


        .moti-pedidos-titulo h3 {

            margin: 0;

            font-size: 16px;

            color: #222;

        }


        .moti-pedido-card {

            width: 100%;

            margin-bottom: 12px;

            padding: 16px;

            border: 1px solid #e5e5e5;

            border-radius: 18px;

            background: #ffffff;

            display: flex;

            align-items: center;

            gap: 12px;

            text-align: left;

            cursor: pointer;

            box-shadow:
                0 3px 12px
                rgba(
                    0,
                    0,
                    0,
                    .05
                );

        }


        .moti-pedido-card.activo {

            border-color: #111;

        }


        .moti-pedido-icono {

            width: 46px;

            height: 46px;

            flex: 0 0 46px;

            border-radius: 14px;

            background: #f0f0f0;

            display: flex;

            align-items: center;

            justify-content: center;

        }


        .moti-pedido-icono .material-symbols-outlined {

            font-size: 23px;

            color: #222;

        }


        .moti-pedido-info {

            min-width: 0;

            flex: 1;

            display: flex;

            flex-direction: column;

            gap: 3px;

        }


        .moti-pedido-info strong {

            font-size: 14px;

            color: #111;

            overflow: hidden;

            text-overflow: ellipsis;

            white-space: nowrap;

        }


        .moti-pedido-info span {

            font-size: 13px;

            color: #777;

        }


        .moti-pedido-info small {

            font-size: 12px;

            font-weight: 600;

            color: #333;

        }


        .moti-pedido-total {

            display: flex;

            flex-direction: column;

            align-items: flex-end;

            gap: 5px;

        }


        .moti-pedido-total strong {

            font-size: 14px;

            color: #111;

            white-space: nowrap;

        }


        .moti-pedido-total .material-symbols-outlined {

            font-size: 19px;

            color: #888;

        }


        .moti-pedidos-vacio {

            min-height: 300px;

            display: flex;

            flex-direction: column;

            align-items: center;

            justify-content: center;

            text-align: center;

            padding: 30px;

            color: #777;

        }


        .moti-pedidos-vacio
        .material-symbols-outlined {

            font-size: 52px;

            margin-bottom: 12px;

            color: #999;

        }


        .moti-pedidos-vacio strong {

            font-size: 17px;

            color: #222;

            margin-bottom: 6px;

        }


        .moti-pedidos-vacio p {

            margin: 0;

            max-width: 280px;

            line-height: 1.5;

            font-size: 14px;

        }


        .moti-pedidos-cargando {

            min-height: 300px;

            display: flex;

            flex-direction: column;

            align-items: center;

            justify-content: center;

            gap: 10px;

            color: #777;

        }


        .moti-pedidos-cargando
        .material-symbols-outlined {

            font-size: 35px;

        }


        @media (
            min-width: 700px
        ) {

            .moti-pedidos-panel {

                max-width: 600px;

                margin-left: auto;

                box-shadow:
                    -8px 0 30px
                    rgba(
                        0,
                        0,
                        0,
                        .12
                    );

            }

        }

    `;


    document.head.appendChild(
        estilo
    );

}

// =====================================================
// PANEL — MIS PEDIDOS
// =====================================================

function abrirPanelMisPedidos() {

    crearEstilosMisPedidos();

    let panel =
        document.getElementById(
            "motiPanelMisPedidos"
        );


    // -------------------------------------------------
    // SI YA EXISTE, SOLAMENTE LO MOSTRAMOS
    // -------------------------------------------------

    if (
        panel
    ) {

        panel.classList.add(
            "activo"
        );

        cargarMisPedidos();

        return;

    }


    // -------------------------------------------------
    // CREAR PANEL
    // -------------------------------------------------

    panel =
        document.createElement(
            "div"
        );


    panel.id =
        "motiPanelMisPedidos";


    panel.innerHTML = `

        <div class="moti-pedidos-panel">

            <div class="moti-pedidos-header">

                <button
                    type="button"
                    id="cerrarMisPedidos"
                    class="moti-pedidos-cerrar"
                    aria-label="Cerrar"
                >

                    <span class="material-symbols-outlined">
                        arrow_back
                    </span>

                </button>


                <div>

                    <span>
                        MOTI GO
                    </span>

                    <h2>
                        Mis pedidos
                    </h2>

                </div>

            </div>


            <div
                id="motiPedidosContenido"
                class="moti-pedidos-contenido"
            >

                <div class="moti-pedidos-cargando">

                    <span class="material-symbols-outlined">
                        progress_activity
                    </span>

                    <p>
                        Cargando tus pedidos...
                    </p>

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        panel
    );


    // -------------------------------------------------
    // CERRAR
    // -------------------------------------------------

    const cerrar =
        document.getElementById(
            "cerrarMisPedidos"
        );


    if (
        cerrar
    ) {

        cerrar.addEventListener(
            "click",
            () => {

                cerrarPanelMisPedidos();

            }
        );

    }


    // -------------------------------------------------
    // MOSTRAR
    // -------------------------------------------------

    requestAnimationFrame(
        () => {

            panel.classList.add(
                "activo"
            );

        }
    );


    cargarMisPedidos();

}

function cerrarPanelMisPedidos() {

    const panel =
        document.getElementById(
            "motiPanelMisPedidos"
        );


    if (
        !panel
    ) {

        return;

    }


    panel.classList.remove(
        "activo"
    );

}


async function cargarMisPedidos() {

    const contenido =
        document.getElementById(
            "motiPedidosContenido"
        );


    if (
        !contenido
    ) {

        return;

    }


    try {

        // -------------------------------------------------
        // USUARIO ACTUAL
        // -------------------------------------------------

        const usuario =
            auth.currentUser;


        if (
            !usuario
        ) {

            contenido.innerHTML = `

                <div class="moti-pedidos-vacio">

                    <span class="material-symbols-outlined">
                        person_off
                    </span>

                    <strong>
                        Sesión no disponible
                    </strong>

                    <p>
                        No pudimos identificar tu cuenta.
                    </p>

                </div>

            `;

            return;

        }


        console.log(
            "🧾 MOTI GO: cargando pedidos de:",
            usuario.uid
        );


        // -------------------------------------------------
        // CONSULTAR PEDIDOS
        // -------------------------------------------------

        const consulta =
            query(
                collection(
                    db,
                    "pedidos"
                ),
                where(
                    "clienteId",
                    "==",
                    usuario.uid
                )
            );


        const resultado =
            await getDocs(
                consulta
            );


        const pedidos =
            resultado.docs.map(
                (doc) => ({

                    id:
                        doc.id,

                    ...doc.data()

                })
            );


        console.log(
            "🧾 MOTI GO: pedidos encontrados:",
            pedidos.length
        );


        // -------------------------------------------------
        // ORDENAR — MÁS RECIENTE PRIMERO
        // -------------------------------------------------

        pedidos.sort(
            (a, b) => {

                const fechaA =
                    obtenerFechaPedido(
                        a
                    );

                const fechaB =
                    obtenerFechaPedido(
                        b
                    );


                return (
                    fechaB -
                    fechaA
                );

            }
        );


        renderizarMisPedidos(
            pedidos
        );

    }
    catch (
        error
    ) {

        console.error(
            "❌ MOTI GO: error cargando pedidos:",
            error
        );


        contenido.innerHTML = `

            <div class="moti-pedidos-vacio">

                <span class="material-symbols-outlined">
                    error
                </span>

                <strong>
                    No pudimos cargar tus pedidos
                </strong>

                <p>
                    Intenta nuevamente.
                </p>

            </div>

        `;

    }

}

function obtenerFechaPedido(
    pedido
) {

    if (
        pedido.creadoEn?.toMillis
    ) {

        return pedido.creadoEn.toMillis();

    }


    if (
        pedido.creadoEn?.seconds
    ) {

        return (
            pedido.creadoEn.seconds *
            1000
        );

    }


    if (
        pedido.creadoEn
    ) {

        const fecha =
            new Date(
                pedido.creadoEn
            );


        if (
            !Number.isNaN(
                fecha.getTime()
            )
        ) {

            return fecha.getTime();

        }

    }


    return 0;

}

function renderizarMisPedidos(
    pedidos
) {

    const contenido =
        document.getElementById(
            "motiPedidosContenido"
        );


    if (
        !contenido
    ) {

        return;

    }


    if (
        !pedidos.length
    ) {

        contenido.innerHTML = `

            <div class="moti-pedidos-vacio">

                <span class="material-symbols-outlined">
                    receipt_long
                </span>

                <strong>
                    Aún no tienes pedidos
                </strong>

                <p>
                    Cuando hagas tu primer mandado,
                    aparecerá aquí.
                </p>

            </div>

        `;

        return;

    }


    const estadosActivos = [

    "pendiente_asignacion",

    "solicitud_repartidor",

    "asignado",

    "en_compra",

    "listo_entrega",

    "en_ruta",

    "entregando"

];


    const pedidosActivos =
        pedidos.filter(
            (pedido) =>
                estadosActivos.includes(
                    pedido.estado
                )
        );


    const pedidosHistorial =
        pedidos.filter(
            (pedido) =>
                !estadosActivos.includes(
                    pedido.estado
                )
        );


    let html = "";


    // -------------------------------------------------
    // EN CURSO
    // -------------------------------------------------

    if (
        pedidosActivos.length
    ) {

        html += `

            <section class="moti-pedidos-seccion">

                <div class="moti-pedidos-titulo">

                    <span class="material-symbols-outlined">
                        schedule
                    </span>

                    <h3>
                        En curso
                    </h3>

                </div>

        `;


        pedidosActivos.forEach(
            (pedido) => {

                html += crearTarjetaPedido(
                    pedido,
                    true
                );

            }
        );


        html += `

            </section>

        `;

    }


    // -------------------------------------------------
    // HISTORIAL
    // -------------------------------------------------

    if (
        pedidosHistorial.length
    ) {

        html += `

            <section class="moti-pedidos-seccion">

                <div class="moti-pedidos-titulo">

                    <span class="material-symbols-outlined">
                        history
                    </span>

                    <h3>
                        Historial
                    </h3>

                </div>

        `;


        pedidosHistorial.forEach(
            (pedido) => {

                html += crearTarjetaPedido(
                    pedido,
                    false
                );

            }
        );


        html += `

            </section>

        `;

    }


    contenido.innerHTML =
        html;


    // -------------------------------------------------
    // EVENTOS
    // -------------------------------------------------

    contenido
        .querySelectorAll(
            "[data-pedido-id]"
        )
        .forEach(
            (boton) => {

                boton.addEventListener(
                    "click",
                    () => {

                        const pedidoId =
                            boton.dataset.pedidoId;


                        const pedido =
                            pedidos.find(
                                (item) =>
                                    item.id ===
                                    pedidoId
                            );


                        if (
                            pedido
                        ) {

                            abrirPedidoDesdeMisPedidos(
                                pedido
                            );

                        }

                    }
                );

            }
        );

}

function crearTarjetaPedido(
    pedido,
    activo
) {

    const estado =
        obtenerTextoEstadoPedido(
            pedido.estado
        );


    const icono =
        obtenerIconoEstadoPedido(
            pedido.estado
        );


    const total =
        Number(
            pedido.total || 0
        );


    const folio =
        pedido.folio ||
        pedido.id;


    const productos =
        Array.isArray(
            pedido.productos
        )
            ? pedido.productos.length
            : 0;


    return `

        <button
            type="button"
            class="moti-pedido-card ${activo ? "activo" : ""}"
            data-pedido-id="${String(
            pedido.id || ""
            ).replace(
            /"/g,
            "&quot;"
            )}"
        >

            <div class="moti-pedido-icono">

                <span class="material-symbols-outlined">
                    ${icono}
                </span>

            </div>


            <div class="moti-pedido-info">

                <strong>
                    Pedido ${String(
                        folio || ""
                        ).replace(
                        /"/g,
                        "&quot;"
                        )}
                </strong>


                <span>
                    ${productos}
                    ${
                        productos === 1
                            ? "producto"
                            : "productos"
                    }
                </span>


                <small>
                    ${estado}
                </small>

            </div>


            <div class="moti-pedido-total">

                <strong>
                    $${total.toFixed(2)}
                </strong>


                <span class="material-symbols-outlined">
                    chevron_right
                </span>

            </div>

        </button>

    `;

}

function obtenerTextoEstadoPedido(
    estado
) {

    const estados = {

        pendiente_asignacion:
            "Buscando repartidor",

        asignado:
            "Repartidor asignado",

        en_compra:
            "Repartidor comprando",

        listo_entrega:
            "Pedido listo",

        en_ruta:
            "En camino",

        entregando:
            "Llegando contigo",

        entregado:
            "Pedido entregado",

        cancelado:
            "Pedido cancelado"

    };


    return (
        estados[estado] ||
        "Pedido en proceso"
    );

}


function obtenerIconoEstadoPedido(
    estado
) {

    const iconos = {

        pendiente_asignacion:
            "search",

        asignado:
            "two_wheeler",

        en_compra:
            "shopping_basket",

        listo_entrega:
            "inventory_2",

        en_ruta:
            "delivery_dining",

        entregando:
            "location_on",

        entregado:
            "check_circle",

        cancelado:
            "cancel"

    };


    return (
        iconos[estado] ||
        "receipt_long"
    );

}

function abrirPedidoDesdeMisPedidos(
    pedido
) {

    console.log(
        "🧾 MOTI GO: pedido seleccionado:",
        pedido
    );


    // =================================================
    // PEDIDO ACTIVO
    // =================================================

    const estadosActivos = [

        "pendiente_asignacion",
        "asignado",
        "en_compra",
        "listo_entrega",
        "en_ruta",
        "entregando"

    ];


    if (
        estadosActivos.includes(
            pedido.estado
        )
    ) {

        console.log(
            "🛵 MOTI GO: pedido activo seleccionado."
        );


        cerrarPanelMisPedidos();


        abrirSeguimientoPedidoMotiGo(
            pedido
        );


        return;

    }


    // =================================================
// PEDIDO HISTÓRICO
// =================================================

console.log(
    "🧾 MOTI GO: pedido histórico seleccionado:",
    pedido
);


// Cerramos la lista

cerrarPanelMisPedidos();


// Abrimos igualmente el pedido

abrirSeguimientoPedidoMotiGo(
    pedido
);

}
 
function abrirSeguimientoPedidoMotiGo(
    pedido
) {

    console.log(
        "🛵 MOTI GO: abriendo seguimiento:",
        pedido
    );


    let panel =
        document.getElementById(
            "motiPanelSeguimientoPedido"
        );


    // =================================================
    // SI YA EXISTE
    // =================================================

    if (
        panel
    ) {

        actualizarPanelSeguimientoPedido(
            pedido
        );


        panel.classList.add(
            "activo"
        );


        escucharEstadoPedidoMotiGo(
            pedido.id
        );


        return;

    }


    // =================================================
    // CREAR PANEL
    // =================================================

    panel =
        document.createElement(
            "div"
        );


    panel.id =
        "motiPanelSeguimientoPedido";


    panel.innerHTML = `

        <div class="moti-seguimiento-panel">

            <div class="moti-seguimiento-header">

                <button
                    type="button"
                    id="cerrarSeguimientoPedido"
                    class="moti-seguimiento-regresar"
                >

                    <span class="material-symbols-outlined">
                        arrow_back
                    </span>

                </button>


                <div>

                    <span>
                        MOTI GO
                    </span>

                    <h2>
                        Seguimiento del pedido
                    </h2>

                </div>

            </div>


            <div
                id="motiSeguimientoContenido"
                class="moti-seguimiento-contenido"
            ></div>

        </div>

    `;


    document.body.appendChild(
        panel
    );


    const cerrar =
        document.getElementById(
            "cerrarSeguimientoPedido"
        );


    if (
        cerrar
    ) {

        cerrar.addEventListener(
            "click",
            () => {

                cerrarSeguimientoPedidoMotiGo();

            }
        );

    }


    actualizarPanelSeguimientoPedido(
        pedido
    );


    crearEstilosSeguimientoPedido();


    requestAnimationFrame(
        () => {

            panel.classList.add(
                "activo"
            );

        }
    );


    escucharEstadoPedidoMotiGo(
        pedido.id
    );

}

// =====================================================
// ESTADOS EN LOS QUE EL CLIENTE PUEDE CANCELAR
// =====================================================

function pedidoPuedeSerCancelado(
    estado
) {

    return [

        "pendiente_asignacion",

        "solicitud_repartidor",

        "asignado",

        "en_compra",

        "listo_entrega"

    ].includes(
        estado
    );

}

function actualizarPanelSeguimientoPedido(
    pedido
) {

    const contenido =
        document.getElementById(
            "motiSeguimientoContenido"
        );


    if (!contenido) {

        return;

    }


    // =================================================
    // DATOS PRINCIPALES DEL PEDIDO
    // =================================================

    const total =
        Number(
            pedido.total || 0
        );


    const folio =
        pedido.folio ||
        pedido.id ||
        "Sin folio";


    const codigoEntrega =
        pedido.codigoEntrega ||
        pedido.codigoConfirmacion ||
        pedido.codigo ||
        pedido.codigoEntregaPedido ||
        "";


    const fecha =
        obtenerFechaPedido(
            pedido
        );


    const fechaFormateada =
        fecha
            ? new Intl.DateTimeFormat(
                "es-MX",
                {
                    dateStyle: "medium",
                    timeStyle: "short"
                }
            ).format(
                new Date(
                    fecha
                )
            )
            : "Fecha no disponible";


    // =================================================
    // PRODUCTOS
    // =================================================

    const productosPedido =
        Array.isArray(
            pedido.productos
        )
            ? pedido.productos
            : [];


    // =================================================
    // ESTADO
    // =================================================

    const estado =
        pedido.estado ||
        "pendiente_asignacion";


    // =================================================
    // SI ESTÁ ASIGNADO
    // MOSTRAR CONFIRMACIÓN + TICKET
    // =================================================

    if (
        estado ===
        "asignado"
    ) {

        const gruposTiendas =
            {};


        // =============================================
        // AGRUPAR PRODUCTOS POR TIENDA
        // =============================================

        productosPedido.forEach(
            item => {

                const tiendaId =
                    item.tiendaId ||
                    item.tienda?.id ||
                    "tienda";


                if (
                    !gruposTiendas[
                        tiendaId
                    ]
                ) {

                    gruposTiendas[
                        tiendaId
                    ] = {

                        nombre:
                            item.tiendaNombre ||
                            item.tienda?.nombre ||
                            "Tienda",

                        productos:
                            []

                    };

                }


                gruposTiendas[
                    tiendaId
                ].productos.push(
                    item
                );

            }
        );


        // =============================================
        // CONSTRUIR TICKET
        // =============================================

        let ticketHTML =
            "";


        Object.values(
            gruposTiendas
        ).forEach(
            tienda => {

                let subtotalTienda =
                    0;


                let productosHTML =
                    "";


                tienda.productos.forEach(
                    item => {

                        const nombre =
                            item.nombre ||
                            item.productoNombre ||
                            "Producto";


                        const cantidad =
                            Number(
                                item.cantidad ||
                                0
                            );


                        const precio =
                            Number(
                                item.precio ||
                                0
                            );


                        const importe =
                            cantidad *
                            precio;


                        subtotalTienda +=
                            importe;


                        productosHTML += `

                            <div
                                class="moti-ticket-producto"
                            >

                                <div
                                    class="moti-ticket-producto-info"
                                >

                                    <strong>
                                        ${escaparHTML(
                                            nombre
                                        )}
                                    </strong>

                                    <span>
                                        ${cantidad}
                                        ×
                                        ${formatearPrecio(
                                            precio
                                        )}
                                    </span>

                                </div>


                                <strong
                                    class="moti-ticket-importe"
                                >
                                    ${formatearPrecio(
                                        importe
                                    )}
                                </strong>

                            </div>

                        `;

                    }
                );


                ticketHTML += `

                    <div
                        class="moti-ticket-tienda"
                    >

                        <div
                            class="moti-ticket-tienda-header"
                        >

                            <span
                                class="material-symbols-outlined"
                            >
                                store
                            </span>


                            <strong>
                                ${escaparHTML(
                                    tienda.nombre
                                )}
                            </strong>

                        </div>


                        <div
                            class="moti-ticket-productos"
                        >

                            ${productosHTML}

                        </div>


                        <div
                            class="moti-ticket-subtotal"
                        >

                            <span>
                                Subtotal
                            </span>

                            <strong>
                                ${formatearPrecio(
                                    subtotalTienda
                                )}
                            </strong>

                        </div>

                    </div>

                `;

            }
        );


        // =============================================
        // INFORMACIÓN DE PAGO
        // =============================================

        const pago =
            pedido.pago ||
            {};


        const subtotalPedido =
            Number(
                pago.subtotal ??
                pedido.subtotal ??
                0
            );


        const costoEntrega =
            Number(
                pedido.costoEntrega ??
                pago.costoEntrega ??
                pago.entrega ??
                0
            );


        const comision =
            Number(
                pedido.comision ??
                pago.comision ??
                costoEntrega
            );


        const totalPedido =
            Number(
                pedido.total ??
                pago.total ??
                (
                    subtotalPedido +
                    comision
                )
            );


        // =============================================
        // HTML COMPLETO
        // =============================================

        contenido.innerHTML = `

            <div
                class="moti-ticket-wrapper"
            >

                <!-- ================================= -->
                <!-- CONFIRMACIÓN -->
                <!-- ================================= -->

                <section
                    class="moti-asignado-confirmacion"
                >

                    <div
                        class="moti-asignado-icono"
                    >

                        <span
                            class="material-symbols-outlined"
                        >
                            two_wheeler
                        </span>

                    </div>


                    <div>

                        <h3>
                            ¡Tu pedido fue aceptado!
                        </h3>


                        <p>
                            Un repartidor ya fue
                            asignado a tu pedido.
                        </p>

                    </div>

                </section>


                <!-- ================================= -->
                <!-- CÓDIGO DE ENTREGA -->
                <!-- ================================= -->

                <section
                    class="moti-codigo-entrega-card"
                >

                    <div
                        class="moti-codigo-entrega-icono"
                    >

                        <span
                            class="material-symbols-outlined"
                        >
                            lock
                        </span>

                    </div>


                    <div
                        class="moti-codigo-entrega-texto"
                    >

                        <span>
                            CÓDIGO DE ENTREGA
                        </span>


                        <strong>
                            ${
                                codigoEntrega
                                    ? escaparHTML(
                                        codigoEntrega
                                    )
                                    : "------"
                            }
                        </strong>


                        <p>
                            Proporciona este código
                            al repartidor cuando te
                            entregue tu pedido.
                        </p>

                    </div>

                </section>


                <!-- ================================= -->
                <!-- TICKET -->
                <!-- ================================= -->

                <section
                    class="moti-ticket"
                    id="motiTicketPedido"
                >

                    <header
                        class="moti-ticket-header"
                    >

                        <div>

                            <span>
                                MOTI GO
                            </span>

                            <h3>
                                Ticket de compra
                            </h3>

                        </div>


                        <span
                            class="material-symbols-outlined"
                        >
                            receipt_long
                        </span>

                    </header>


                    <div
                        class="moti-ticket-datos"
                    >

                        <div>

                            <span>
                                Pedido
                            </span>

                            <strong>
                                ${escaparHTML(
                                    folio
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Fecha
                            </span>

                            <strong>
                                ${escaparHTML(
                                    fechaFormateada
                                )}
                            </strong>

                        </div>

                    </div>


                    <!-- PRODUCTOS -->

                    <div
                        class="moti-ticket-contenido"
                    >

                        ${ticketHTML}

                    </div>


                    <!-- RESUMEN -->

                    <div
                        class="moti-ticket-resumen"
                    >

                        <div>

                            <span>
                                Productos
                            </span>

                            <strong>
                                ${formatearPrecio(
                                    subtotalPedido
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Comisión de entrega
                            </span>

                            <strong>
                                ${formatearPrecio(
                                    comision
                                )}
                            </strong>

                        </div>


                        <div
                            class="moti-ticket-total"
                        >

                            <span>
                                TOTAL
                            </span>

                            <strong>
                                ${formatearPrecio(
                                    totalPedido
                                )}
                            </strong>

                        </div>

                    </div>


                    <!-- CANCELACIÓN -->

${
    pedidoPuedeSerCancelado(estado)
        ? `

            <button
                type="button"
                id="cancelarPedidoMotiGo"
                class="moti-seguimiento-cancelar"
            >

                Cancelar pedido

            </button>

        `
        : ""
}


<!-- PIE -->

<footer
    class="moti-ticket-footer"
>

                        <span>
                            Gracias por usar MOTI GO
                        </span>


                        <small>
                            Conserva este comprobante
                            hasta recibir tu pedido.
                        </small>

                    </footer>

                </section>

            </div>

        `;


        configurarBotonCancelarPedido(
    pedido
);
        
        return;

    }


    // =================================================
    // PEDIDO PENDIENTE
    // =================================================

    const configuracion =
        obtenerConfiguracionEstadoPedido(
            estado
        );


    const productos =
        productosPedido.length;


    contenido.innerHTML = `

        <div
            class="moti-seguimiento-estado"
        >

            <div
                class="moti-seguimiento-icono"
            >

                <span
                    class="material-symbols-outlined"
                >
                    ${configuracion.icono}
                </span>

            </div>


            <h3>
                ${configuracion.titulo}
            </h3>


            <p>
                ${configuracion.descripcion}
            </p>


            <div
                class="moti-seguimiento-resumen"
            >

                <div>

                    <span>
                        Pedido
                    </span>

                    <strong>
                        ${escaparHTML(
                            folio
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Productos
                    </span>

                    <strong>
                        ${productos}
                    </strong>

                </div>


                <div>

                    <span>
                        Total
                    </span>

                    <strong>
                        ${formatearPrecio(
                            total
                        )}
                    </strong>

                </div>

            </div>


            ${
    pedidoPuedeSerCancelado(estado)

        ? `

            <button
                type="button"
                id="cancelarPedidoMotiGo"
                class="moti-seguimiento-cancelar"
            >

                Cancelar pedido

            </button>

        `

        : ""
}

        </div>

    `;


    // =====================================================
// CANCELAR PEDIDO
// =====================================================

const cancelar =
    document.getElementById(
        "cancelarPedidoMotiGo"
    );


if (
    cancelar
) {

    cancelar.addEventListener(
        "click",
        async () => {

            const confirmar =
                confirm(
                    "¿Seguro que quieres cancelar este pedido?"
                );


            if (
                !confirmar
            ) {

                return;

            }


            try {

                console.log(
                    "⚠️ MOTI GO: verificando cancelación:",
                    pedido.id
                );


                const referencia =
                    doc(
                        db,
                        "pedidos",
                        pedido.id
                    );


                // =============================================
                // LEER ESTADO REAL DESDE FIREBASE
                // =============================================

                const pedidoActual =
                    await getDoc(
                        referencia
                    );


                if (
                    !pedidoActual.exists()
                ) {

                    alert(
                        "El pedido ya no existe."
                    );

                    return;

                }


                const datosActuales =
                    pedidoActual.data();


                const estadoActual =
                    datosActuales.estado ||
                    "";


                console.log(
                    "📦 MOTI GO: estado real antes de cancelar:",
                    estadoActual
                );


                // =============================================
                // VALIDAR REGLA DE CANCELACIÓN
                // =============================================

                if (
                    !pedidoPuedeSerCancelado(
                        estadoActual
                    )
                ) {

                    alert(
                        "Este pedido ya está en proceso de entrega y ya no puede cancelarse."
                    );


                    // Actualizar inmediatamente la vista

                    actualizarPanelSeguimientoPedido({

                        id:
                            pedidoActual.id,

                        ...datosActuales

                    });


                    return;

                }


               // =====================================================
// LIBERAR REPARTIDOR SI EL PEDIDO YA ESTABA ASIGNADO
// =====================================================

const repartidorId =
    datosActuales.repartidorId;


if (
    repartidorId
) {

    console.log(
        "🧹 MOTI GO: pedido tiene repartidor asignado:",
        repartidorId
    );


    const repartidorRef =
        doc(
            db,
            "usuarios",
            repartidorId
        );


    const repartidorSnapshot =
        await getDoc(
            repartidorRef
        );


    if (
        repartidorSnapshot.exists()
    ) {

        const datosRepartidor =
            repartidorSnapshot.data();


        const viajeActivo =
            datosRepartidor.viajeActivo;


        // =================================================
        // SOLO LIBERAR SI EL VIAJE ACTIVO CORRESPONDE
        // EXACTAMENTE A ESTE PEDIDO
        // =================================================

        const pedidoActivoId =
            typeof viajeActivo === "string"
                ? viajeActivo
                : viajeActivo?.pedidoId;


        if (
            pedidoActivoId ===
            pedido.id
        ) {

            await updateDoc(
                repartidorRef,
                {

                    estadoServicio:
                        "disponible",

                    viajeActivo:
                        null,

                    actualizadoEn:
                        serverTimestamp()

                }
            );


            console.log(
                "✅ MOTI GO: repartidor liberado:",
                repartidorId
            );

        }
        else {

            console.warn(
                "⚠️ MOTI GO: el repartidor tiene otro viaje activo. No se modificará."
            );

        }

    }

}


// =====================================================
// CANCELAR PEDIDO
// =====================================================

await updateDoc(
    referencia,
    {

        estado:
            "cancelado",

        canceladoEn:
            serverTimestamp(),

        canceladoPor:
            "cliente",

        actualizadoEn:
            serverTimestamp()

    }
);


                console.log(
                    "✅ MOTI GO: pedido cancelado:",
                    pedido.id
                );


                alert(
                    "Tu pedido fue cancelado correctamente."
                );


                // =============================================
                // ACTUALIZAR VISTA
                // =============================================

                actualizarPanelSeguimientoPedido({

                    id:
                        pedido.id,

                    ...datosActuales,

                    estado:
                        "cancelado"

                });

            }
            catch (
                error
            ) {

                console.error(
                    "❌ MOTI GO: error cancelando pedido:",
                    error
                );


                alert(
                    "No pudimos cancelar el pedido. Inténtalo nuevamente."
                );

            }

        }
    );

}
}

// =====================================================
// MOTI GO - CONFIGURAR BOTÓN CANCELAR PEDIDO
// =====================================================

function configurarBotonCancelarPedido(
    pedido
) {

    const cancelar =
        document.getElementById(
            "cancelarPedidoMotiGo"
        );


    if (
        !cancelar
    ) {

        return;

    }


    // Evitar registrar el evento más de una vez

    if (
        cancelar.dataset.listenerActivo ===
        "true"
    ) {

        return;

    }


    cancelar.dataset.listenerActivo =
        "true";


    cancelar.addEventListener(
        "click",
        async () => {

            if (
                cancelar.disabled
            ) {

                return;

            }


            const confirmar =
                confirm(
                    "¿Seguro que quieres cancelar este pedido?"
                );


            if (
                !confirmar
            ) {

                return;

            }


            try {

                cancelar.disabled =
                    true;


                cancelar.textContent =
                    "Cancelando...";


                console.log(
                    "⚠️ MOTI GO: verificando cancelación:",
                    pedido.id
                );


                const referencia =
                    doc(
                        db,
                        "pedidos",
                        pedido.id
                    );


                // =====================================
                // CONSULTAR ESTADO REAL EN FIREBASE
                // =====================================

                const pedidoActual =
                    await getDoc(
                        referencia
                    );


                if (
                    !pedidoActual.exists()
                ) {

                    alert(
                        "El pedido ya no existe."
                    );

                    return;

                }


                const datosActuales =
                    pedidoActual.data();


                const estadoActual =
                    datosActuales.estado ||
                    "";


                console.log(
                    "📦 MOTI GO: estado real:",
                    estadoActual
                );


                // =====================================
                // VERIFICAR SI TODAVÍA SE PUEDE CANCELAR
                // =====================================

                if (
                    !pedidoPuedeSerCancelado(
                        estadoActual
                    )
                ) {

                    alert(
                        "Este pedido ya está en proceso de entrega y ya no puede cancelarse."
                    );


                    actualizarPanelSeguimientoPedido({

                        id:
                            pedidoActual.id,

                        ...datosActuales

                    });


                    return;

                }


                // =====================================
                // CANCELAR
                // =====================================

                await updateDoc(
                    referencia,
                    {

                        estado:
                            "cancelado",

                        canceladoEn:
                            new Date(),

                        canceladoPor:
                            "cliente"

                    }
                );


                console.log(
                    "✅ MOTI GO: pedido cancelado:",
                    pedido.id
                );


                alert(
                    "Tu pedido fue cancelado correctamente."
                );


                actualizarPanelSeguimientoPedido({

                    id:
                        pedido.id,

                    ...datosActuales,

                    estado:
                        "cancelado"

                });

            }
            catch (
                error
            ) {

                console.error(
                    "❌ MOTI GO: error cancelando pedido:",
                    error
                );


                alert(
                    "No pudimos cancelar el pedido. Inténtalo nuevamente."
                );

            }
            finally {

                const botonActual =
                    document.getElementById(
                        "cancelarPedidoMotiGo"
                    );


                if (
                    botonActual
                ) {

                    botonActual.disabled =
                        false;

                    botonActual.textContent =
                        "Cancelar pedido";

                }

            }

        }
    );

}

function obtenerConfiguracionEstadoPedido(
    estado
) {

    const estados = {

        pendiente_asignacion: {

            icono:
                "search",

            titulo:
                "Buscando repartidor",

            descripcion:
                "Estamos buscando un repartidor para tu pedido.",

            progreso:
                25

        },


        solicitud_repartidor: {

    icono:
        "notifications_active",

    titulo:
        "Solicitud enviada",

    descripcion:
        "Estamos esperando que el repartidor acepte tu pedido.",

    progreso:
        30

},
        
        asignado: {

            icono:
                "two_wheeler",

            titulo:
                "Repartidor asignado",

            descripcion:
                "Un repartidor aceptó tu pedido.",

            progreso:
                35

        },


        en_compra: {

            icono:
                "shopping_basket",

            titulo:
                "Comprando tus productos",

            descripcion:
                "El repartidor está realizando tu compra.",

            progreso:
                55

        },


        listo_entrega: {

            icono:
                "inventory_2",

            titulo:
                "Pedido preparado",

            descripcion:
                "Tu pedido está listo para ser entregado.",

            progreso:
                70

        },


        en_ruta: {

            icono:
                "delivery_dining",

            titulo:
                "Tu pedido va en camino",

            descripcion:
                "El repartidor se dirige hacia ti.",

            progreso:
                85

        },


        entregando: {

            icono:
                "location_on",

            titulo:
                "El repartidor está llegando",

            descripcion:
                "Tu pedido está muy cerca.",

            progreso:
                95

        },


               entregado: {

            icono:
                "check_circle",

            titulo:
                "Pedido entregado",

            descripcion:
                "Tu pedido fue entregado correctamente.",

            progreso:
                100

        },


        cancelado: {

            icono:
                "cancel",

            titulo:
                "Pedido cancelado",

            descripcion:
                "Este pedido fue cancelado.",

            progreso:
                0

        }

    };


    return (
        estados[estado] ||
        {

            icono:
                "receipt_long",

            titulo:
                "Pedido en proceso",

            descripcion:
                "Estamos actualizando tu pedido.",

            progreso:
                25

        }
    );

    

}

function crearEstilosSeguimientoPedido() {

    if (
        document.getElementById(
            "motiEstilosSeguimientoPedido"
        )
    ) {

        return;

    }


    const estilo =
        document.createElement(
            "style"
        );


    estilo.id =
        "motiEstilosSeguimientoPedido";


    estilo.textContent = `

        #motiPanelSeguimientoPedido {

            position: fixed;

            inset: 0;

            z-index: 100000;

            background: #f7f7f7;

            visibility: hidden;

            opacity: 0;

            transform: translateX(100%);

            transition:
                opacity .25s ease,
                transform .25s ease,
                visibility .25s ease;

        }


        #motiPanelSeguimientoPedido.activo {

            visibility: visible;

            opacity: 1;

            transform: translateX(0);

        }


        .moti-seguimiento-panel {

            width: 100%;

            height: 100%;

            display: flex;

            flex-direction: column;

            background: #f7f7f7;

        }


        .moti-seguimiento-header {

            min-height: 72px;

            padding: 12px 16px;

            display: flex;

            align-items: center;

            gap: 12px;

            background: #ffffff;

            border-bottom:
                1px solid
                #e5e5e5;

        }


        .moti-seguimiento-header > div {

            display: flex;

            flex-direction: column;

            gap: 2px;

        }


        .moti-seguimiento-header span {

            font-size: 11px;

            font-weight: 700;

            color: #777;

            letter-spacing: .08em;

        }


        .moti-seguimiento-header h2 {

            margin: 0;

            font-size: 20px;

            color: #111;

        }


        .moti-seguimiento-regresar {

            width: 44px;

            height: 44px;

            border: 0;

            border-radius: 50%;

            background: #f0f0f0;

            display: flex;

            align-items: center;

            justify-content: center;

            cursor: pointer;

        }


        .moti-seguimiento-contenido {

            flex: 1;

            overflow-y: auto;

            padding:
                24px 16px 40px;

        }


        .moti-seguimiento-estado {

            max-width: 560px;

            margin: 0 auto;

            text-align: center;

        }


        .moti-seguimiento-icono {

            width: 82px;

            height: 82px;

            margin:
                20px auto 18px;

            border-radius: 50%;

            background: #eeeeee;

            display: flex;

            align-items: center;

            justify-content: center;

        }


        .moti-seguimiento-icono
        .material-symbols-outlined {

            font-size: 42px;

        }


        .moti-seguimiento-estado h3 {

            margin:
                0 0 8px;

            font-size: 25px;

            color: #111;

        }


        .moti-seguimiento-estado p {

            margin:
                0 auto 28px;

            max-width: 340px;

            line-height: 1.5;

            font-size: 15px;

            color: #707070;

        }


        .moti-seguimiento-barra {

            width: 100%;

            height: 8px;

            overflow: hidden;

            border-radius: 20px;

            background: #e5e5e5;

        }


        .moti-seguimiento-progreso {

            height: 100%;

            border-radius: 20px;

            background: #111;

            transition:
                width .35s ease;

        }


        .moti-seguimiento-pasos {

            display: flex;

            justify-content: space-between;

            margin:
                10px 0 30px;

            font-size: 11px;

            color: #999;

        }


        .moti-seguimiento-pasos span.activo {

            color: #111;

            font-weight: 700;

        }


        .moti-seguimiento-resumen {

            display: flex;

            flex-direction: column;

            gap: 1px;

            overflow: hidden;

            border:
                1px solid
                #e5e5e5;

            border-radius: 18px;

            background: #ffffff;

            text-align: left;

        }


        .moti-seguimiento-resumen > div {

            padding:
                14px 16px;

            display: flex;

            align-items: center;

            justify-content: space-between;

            gap: 15px;

            border-bottom:
                1px solid
                #eeeeee;

        }


        .moti-seguimiento-resumen > div:last-child {

            border-bottom: 0;

        }


        .moti-seguimiento-resumen span {

            color: #777;

            font-size: 13px;

        }


        .moti-seguimiento-resumen strong {

            color: #111;

            font-size: 13px;

            text-align: right;

        }


        .moti-seguimiento-cancelar {

            width: 100%;

            margin-top: 18px;

            padding: 14px;

            border:
                1px solid
                #dddddd;

            border-radius: 14px;

            background: #ffffff;

            color: #555;

            font-weight: 600;

            cursor: pointer;

        }


        @media (
            min-width: 700px
        ) {

            .moti-seguimiento-panel {

                max-width: 600px;

                margin-left: auto;

                box-shadow:
                    -8px 0 30px
                    rgba(
                        0,
                        0,
                        0,
                        .12
                    );

            }

        }

    `;


    document.head.appendChild(
        estilo
    );

}

function escucharEstadoPedidoMotiGo(
    pedidoId
) {

    if (
        !pedidoId
    ) {

        console.warn(
            "⚠️ MOTI GO: no se puede escuchar pedido sin ID."
        );

        return;

    }


    // ---------------------------------------------
    // Evitar listeners duplicados
    // ---------------------------------------------

    if (
        window.motiGoListenerPedido
    ) {

        try {

            window.motiGoListenerPedido();

        }
        catch (
            error
        ) {

            console.warn(
                "⚠️ MOTI GO: no se pudo cerrar listener anterior.",
                error
            );

        }

    }


    console.log(
        "👂 MOTI GO: escuchando cambios del pedido:",
        pedidoId
    );


    try {

        const referencia =
            doc(
                db,
                "pedidos",
                pedidoId
            );


        window.motiGoListenerPedido =
            onSnapshot(
                referencia,
                (
                    snapshot
                ) => {

                    if (
                        !snapshot.exists()
                    ) {

                        console.warn(
                            "⚠️ MOTI GO: el pedido ya no existe."
                        );

                        return;

                    }


                    const pedidoActual = {

                        id:
                            snapshot.id,

                        ...snapshot.data()

                    };


                    console.log(
                        "🔄 MOTI GO: pedido actualizado:",
                        pedidoActual
                    );


                    actualizarPanelSeguimientoPedido(
                        pedidoActual
                    );

                },


                (
                    error
                ) => {

                    console.error(
                        "❌ MOTI GO: error escuchando pedido:",
                        error
                    );

                }
            );

    }
    catch (
        error
    ) {

        console.error(
            "❌ MOTI GO: no se pudo iniciar listener:",
            error
        );

    }

}

function cerrarSeguimientoPedidoMotiGo() {

    const panel =
        document.getElementById(
            "motiPanelSeguimientoPedido"
        );


    if (
        panel
    ) {

        panel.classList.remove(
            "activo"
        );

    }


    if (
        window.motiGoListenerPedido
    ) {

        try {

            window.motiGoListenerPedido();

        }
        catch (
            error
        ) {

            console.warn(
                "⚠️ MOTI GO: error cerrando listener.",
                error
            );

        }


        window.motiGoListenerPedido =
            null;

    }


    console.log(
        "↩️ MOTI GO: seguimiento cerrado."
    );

}
