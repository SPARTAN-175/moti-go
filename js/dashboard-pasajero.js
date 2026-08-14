import { auth, db } from "./firebase-config.js";

import {
    doc,
    updateDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


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
// CARGAR CATÁLOGO DESDE FIREBASE
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
        // PRODUCTOS MAESTROS
        // =================================================

        const productosSnapshot =
            await getDocs(
                collection(
                    db,
                    "productos"
                )
            );


        productos = [];


        productosSnapshot.forEach(
            (docSnap) => {

                productos.push({

                    id:
                        docSnap.id,

                    ...docSnap.data()

                });

            }
        );


        // =================================================
        // INVENTARIOS DE LAS TIENDAS
        // =================================================

        const inventarioSnapshot =
            await getDocs(
                collection(
                    db,
                    "inventarios"
                )
            );


        inventarios = [];


        inventarioSnapshot.forEach(
            (docSnap) => {

                inventarios.push({

                    id:
                        docSnap.id,

                    ...docSnap.data()

                });

            }
        );


        console.log(
            "📦 Productos encontrados:",
            productos.length
        );


        console.log(
            "🏪 Inventarios encontrados:",
            inventarios.length
        );


        console.log(
    "🔎 EJEMPLO PRODUCTO:",
    productos[0]
);

console.log(
    "🔎 EJEMPLO INVENTARIO:",
    inventarios[0]
);

console.log(
    "🔎 PRODUCTO ID:",
    productos[0]?.id
);

console.log(
    "🔎 INVENTARIO PRODUCTO ID:",
    inventarios[0]?.productoId
);

console.log(
    "🔎 EXISTENCIA:",
    inventarios[0]?.existencia
);

console.log(
    "🔎 DISPONIBLE:",
    inventarios[0]?.disponible
);

        // =================================================
        // MOSTRAR
        // =================================================

        renderizarProductos();


    }
    catch (error) {

        console.error(
            "❌ Error cargando catálogo:",
            error
        );


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
                Number(mejor.precio);

            const precioActual =
                Number(actual.precio);


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
        producto.categoriaId;


    // -----------------------------------------
    // ICONO
    // -----------------------------------------

    const icono =
        obtenerIconoProducto(
            producto
        );


    // -----------------------------------------
    // UNIDAD
    // -----------------------------------------

    const textoUnidad =
        obtenerTextoUnidad(
            producto
        );


    // -----------------------------------------
    // PRECIO
    // -----------------------------------------

    const precio =
        Number(
            inventario.precio
        );


    // -----------------------------------------
    // CANTIDAD ACTUAL
    // -----------------------------------------

    const cantidad =
        obtenerCantidad(
            producto.id
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

            <span>
                ${textoUnidad}
            </span>

            <b>
                ${formatearPrecio(
                    precio
                )}
            </b>

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


    // -----------------------------------------
    // BOTÓN MENOS
    // -----------------------------------------

    const btnMinus =
        article.querySelector(
            ".quantity-minus"
        );


    btnMinus.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();

            cambiarCantidad(
                producto.id,
                -1
            );

        }
    );


    // -----------------------------------------
    // BOTÓN MÁS
    // -----------------------------------------

    const btnPlus =
        article.querySelector(
            ".quantity-plus"
        );


    btnPlus.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();

            cambiarCantidad(
                producto.id,
                1
            );

        }
    );


    // -----------------------------------------
    // TOCAR PRODUCTO
    // -----------------------------------------

    article.addEventListener(
        "click",
        () => {

            console.log(
                "Producto seleccionado:",
                producto
            );

            // Más adelante:
            // abrirDetalleProducto(producto);

        }
    );


    return article;

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
        ] = nuevaCantidad;

    }


    guardarCarrito();

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
// ACTUALIZAR CANTIDADES VISIBLES
// =====================================================

function actualizarCantidadesVisibles() {

    const controles =
        document.querySelectorAll(
            ".quantity-value"
        );


    controles.forEach(
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

    let totalProductos = 0;

    let total = 0;


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
                    inventario.precio
                );


            totalProductos +=
                Number(cantidad);


            total +=
                precio *
                Number(cantidad);

        }
    );


    if (cartItems) {

        cartItems.textContent =
            `${totalProductos} ${
                totalProductos === 1
                    ? "producto"
                    : "productos"
            }`;

    }


    if (cartTotal) {

        cartTotal.textContent =
            formatearPrecio(
                total
            );

    }


    if (cartBar) {

        cartBar.style.display =
            totalProductos > 0
                ? "flex"
                : "none";

    }

}


// =====================================================
// CATEGORÍAS
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
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );


                    boton.classList.add(
                        "active"
                    );


                    categoriaActual =
                        boton.dataset.category ||
                        "todas";


                    renderizarProductos();

                }
            );

        }
    );

}


// =====================================================
// BUSCADOR
// =====================================================

function configurarBuscador() {

    if (!searchInput) {

        console.warn(
            "⚠️ No se encontró el campo de búsqueda."
        );

        return;

    }


    searchInput.addEventListener(
        "input",
        () => {

            textoBusqueda =
                searchInput.value.trim();


            // Mostrar / ocultar botón limpiar

            if (searchClear) {

                searchClear.style.display =
                    textoBusqueda.length > 0
                        ? "flex"
                        : "none";

            }


            console.log(
                "🔎 Buscando:",
                textoBusqueda
            );


            renderizarProductos();

        }
    );


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


                renderizarProductos();


                searchInput.focus();

            }
        );

    }

}

// =====================================================
// CATEGORÍA POR DEFECTO
// =====================================================

function configurarCategoriaInicial() {

    const categoriaActiva =
        document.querySelector(
            ".category-item.active"
        );


    if (categoriaActiva) {

        categoriaActual =
            categoriaActiva.dataset.category ||
            "todas";

    }

}


// =====================================================
// ICONOS
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

        lacteos:
            "egg",

        "lacteos y huevos":
            "egg",

        bebidas:
            "local_drink",

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

        varios:
            "category"

    };


    return (
        iconos[categoria] ||
        "shopping_bag"
    );

}


// =====================================================
// TEXTO UNIDAD
// =====================================================

function obtenerTextoUnidad(
    producto
) {

    if (
        producto.tipoVenta ===
        "peso"
    ) {

        return `Por ${
            producto.unidad ||
            "kg"
        }`;

    }


    return "Por pieza";

}


// =====================================================
// NOMBRE CATEGORÍA
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

        lacteos:
            "Lácteos",

        "lacteos y huevos":
            "Lácteos y huevos",

        bebidas:
            "Bebidas",

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

    return String(texto)
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
        Number(precio) || 0
    );

}


// =====================================================
// EVITAR HTML INYECTADO
// =====================================================

function escaparHTML(
    texto
) {

    return String(texto)
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
// ACTUALIZAR UBICACIÓN EN FIRESTORE
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

                latitud: lat,

                longitud: lng,

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


if (destinoGuardado) {

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
                consultar inventarios
                    ↓
                determinar tiendas
                    ↓
                calcular ruta
                    ↓
                ticket
            */

        }
    );

}


// =====================================================
// INICIO
// =====================================================

cargarCarrito();

configurarCategorias();

configurarCategoriaInicial();

configurarBuscador();

actualizarCarrito();

cargarCatalogo();


console.log(
    "🛒 MOTI GO - CATÁLOGO INICIADO"
);
