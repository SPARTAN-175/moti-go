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
                precio

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

    return Number(
        carrito[
            productoId
        ] || 0
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
                    inventario.precio
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
                    inventario.precio
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
    precio
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

    const inventario =
        inventarios.find(
            item =>
                item.productoId ===
                productoId &&
                item.tiendaId ===
                tiendaId
        );


    // Si la búsqueda global no tiene ese inventario
    // en memoria, utilizamos el precio recibido y
    // permitimos agregarlo. La existencia será validada
    // nuevamente antes de crear el pedido.

    const existencia =
        inventario
            ? Number(
                inventario.existencia ??
                0
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
                )

        };

    }


    guardarCarrito();


    actualizarCarrito();


    actualizarPanelCarrito();


    mostrarResultadosBusquedaGlobalActualizados();

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
                    "🧾 Revisar pedido:",
                    carrito
                );


                // -----------------------------------------
                // TODAVÍA NO CREAMOS EL PEDIDO.
                // -----------------------------------------

                alert(
                    "La revisión del pedido estará disponible en el siguiente paso."
                );

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
                                item.precio
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
                                item.precio
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
