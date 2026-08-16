import { auth, db } from "./firebase-config.js";

import {
    doc,
    updateDoc,
    collection,
    getDocs,
    getDoc,
    query,
    where,
    documentId
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
// CAMBIAR CANTIDAD
// =====================================================

function cambiarCantidad(
    productoId,
    cambio
) {

    const cantidadActual =
        obtenerCantidad(
            productoId
        );


    const nuevaCantidad =
        cantidadActual +
        cambio;


    const inventario =
        obtenerMejorInventario(
            productoId
        );


    // =================================================
    // NO PERMITIR MÁS PRODUCTOS QUE LA EXISTENCIA
    // =================================================

    if (
        cambio > 0 &&
        inventario &&
        nuevaCantidad >
            Number(
                inventario.existencia ??
                0
            )
    ) {

        console.warn(
            "⚠️ No hay suficiente existencia para:",
            productoId
        );


        return;

    }


    // =================================================
    // ELIMINAR DEL CARRITO
    // =================================================

    if (
        nuevaCantidad <= 0
    ) {

        delete carrito[
            productoId
        ];

    }
    else {

        carrito[
            productoId
        ] =
            nuevaCantidad;

    }


    // =================================================
    // GUARDAR LOCALMENTE
    // =================================================

    guardarCarrito();


    // =================================================
    // ACTUALIZAR INTERFAZ
    // =================================================

    actualizarCantidadesVisibles();

    actualizarCarrito();

}


// =====================================================
// OBTENER CANTIDAD
// =====================================================

function obtenerCantidad(
    productoId
) {

    return Number(
        carrito[
            productoId
        ] || 0
    );

}
// =====================================================
// CANTIDAD DE PRODUCTO EN BÚSQUEDA GLOBAL
// =====================================================

function obtenerCantidadGlobal(
    productoId,
    tiendaId
) {

    const clave =
        `${productoId}_${tiendaId}`;


    return Number(
        carrito[
            clave
        ] || 0
    );

}


// =====================================================
// CAMBIAR CANTIDAD DESDE BÚSQUEDA GLOBAL
// =====================================================

function cambiarCantidadGlobal(
    productoId,
    tiendaId,
    cambio
) {

    const clave =
        `${productoId}_${tiendaId}`;


    const cantidadActual =
        obtenerCantidadGlobal(
            productoId,
            tiendaId
        );


    const nuevaCantidad =
        cantidadActual +
        cambio;


    if (
        nuevaCantidad <= 0
    ) {

        delete carrito[
            clave
        ];

    }
    else {

        carrito[
            clave
        ] =
            nuevaCantidad;

    }


    guardarCarrito();


    actualizarCarrito();


    // Actualizar los resultados globales
    // sin recargar la página.

    if (
        textoBusqueda &&
        textoBusqueda.trim()
    ) {

        mostrarResultadosBusquedaGlobalActualizados();

    }

}

// =====================================================
// ACTUALIZAR CANTIDADES DE RESULTADOS GLOBALES
// =====================================================

function mostrarResultadosBusquedaGlobalActualizados() {

    const valores =
        document.querySelectorAll(
            ".global-quantity-value"
        );


    valores.forEach(
        elemento => {

            const productoId =
                elemento.dataset.productId;


            const tiendaId =
                elemento.dataset.tiendaId;


            if (
                !productoId ||
                !tiendaId
            ) {

                return;

            }


            elemento.textContent =
                obtenerCantidadGlobal(
                    productoId,
                    tiendaId
                );

        }
    );

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
// ACTUALIZAR CARRITO
// =====================================================

function actualizarCarrito() {

    let totalProductos =
        0;


    let total =
        0;


    Object.entries(
        carrito
    ).forEach(
        ([productoId, cantidad]) => {

            const producto =
                productos.find(
                    item =>
                        item.id ===
                        productoId
                );


            if (!producto) {
                return;
            }


            const inventario =
                obtenerMejorInventario(
                    productoId
                );


            if (!inventario) {
                return;
            }


            const precio =
                Number(
                    inventario.precio ??
                    producto.precio ??
                    0
                );


            const cantidadNumero =
                Number(
                    cantidad || 0
                );


            totalProductos +=
                cantidadNumero;


            total +=
                precio *
                cantidadNumero;

        }
    );


    // =================================================
    // CANTIDAD DE PRODUCTOS
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
    // TOTAL
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


            const cantidad =
                obtenerCantidadGlobal(
                    producto.id,
                    tienda.id
                );


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


                    cambiarCantidadGlobal(
                        producto.id,
                        tienda.id,
                        -1
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


                    cambiarCantidadGlobal(
                        producto.id,
                        tienda.id,
                        1
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
// BOTÓN DEL CARRITO
// =====================================================

if (cartBar) {

    cartBar.addEventListener(
        "click",
        () => {

            console.log(
                "🛒 Carrito:",
                carrito
            );


            /*
                TODAVÍA NO ENVIAMOS EL PEDIDO.

                En el siguiente paso construiremos:

                carrito
                    ↓
                revisar pedido
                    ↓
                validar existencia
                    ↓
                determinar tienda(s)
                    ↓
                calcular tarifa
                    ↓
                crear pedido
                    ↓
                asignar repartidor
            */

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
