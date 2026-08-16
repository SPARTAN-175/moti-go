import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    updateDoc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    documentId
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

let tiendasDisponibles = [];
let tiendaSeleccionada = null;
let tiendaSeleccionadaId = null;

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

const storeSelector =
    document.getElementById("storeSelector");

const storeSelectorSection =
    document.getElementById("storeSelectorSection");


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
// CARGAR CONTEXTO DEL CLIENTE Y TIENDAS DISPONIBLES
// =====================================================

async function cargarContextoTiendas() {

    const user = auth.currentUser;

    if (!user) {
        throw new Error("No hay usuario autenticado.");
    }

    console.log("📍 Cargando zona del cliente...");

    const usuarioSnap =
        await getDoc(
            doc(
                db,
                "usuarios",
                user.uid
            )
        );

    if (!usuarioSnap.exists()) {
        throw new Error("No existe el perfil del cliente.");
    }

    const usuario = usuarioSnap.data();

    const municipioCliente =
        normalizarTexto(usuario.municipio || "");

    const localidadCliente =
        normalizarTexto(usuario.localidad || "");

    if (!municipioCliente && !localidadCliente) {
        throw new Error("El cliente no tiene municipio o localidad registrados.");
    }

    console.log("📍 Zona cliente:", {
        municipio: usuario.municipio,
        localidad: usuario.localidad,
        latitud: usuario.latitud,
        longitud: usuario.longitud
    });

    // Una sola consulta principal: tiendas del municipio del cliente.
    // Firestore compara los textos literalmente, por lo que primero
    // usamos el valor guardado en el perfil y, si no hay resultados,
    // probamos variantes compatibles con los datos actuales.
    let tiendasSnapshot =
        await getDocs(
            query(
                collection(db, "tiendas"),
                where(
                    "municipio",
                    "==",
                    usuario.municipio
                )
            )
        );

    tiendasDisponibles = [];

    if (!tiendasSnapshot.empty) {

        tiendasSnapshot.forEach((docSnap) => {

            tiendasDisponibles.push({
                id: docSnap.id,
                ...docSnap.data()
            });

        });

    }
    else {

        // Compatibilidad temporal con municipios que tienen
        // diferencias de acentos en los documentos existentes.
        const municipioNormalizado =
            normalizarTexto(
                usuario.municipio || ""
            );

        const municipiosCompatibles = [
            usuario.municipio,
            municipioNormalizado
        ];

        // Caso actual conocido:
        // Ostuacan <-> Ostuacán
        if (
            municipioNormalizado ===
            "ostuacan"
        ) {

            municipiosCompatibles.push(
                "Ostuacán"
            );

        }

        const municipiosUnicos =
            [
                ...new Set(
                    municipiosCompatibles.filter(Boolean)
                )
            ];

        for (
            const municipio of municipiosUnicos
        ) {

            const snapshot =
                await getDocs(
                    query(
                        collection(db, "tiendas"),
                        where(
                            "municipio",
                            "==",
                            municipio
                        )
                    )
                );

            snapshot.forEach((docSnap) => {

                if (
                    !tiendasDisponibles.some(
                        tienda =>
                            tienda.id ===
                            docSnap.id
                    )
                ) {

                    tiendasDisponibles.push({
                        id: docSnap.id,
                        ...docSnap.data()
                    });

                }

            });

        }

    }

    // Filtrar tiendas activas y validar localidad.
    tiendasDisponibles =
        tiendasDisponibles.filter(
            tienda => {

                if (
                    tienda.activa === false
                ) {
                    return false;
                }

                const localidadTienda =
                    normalizarTexto(
                        tienda.localidad || ""
                    );

                const municipioTienda =
                    normalizarTexto(
                        tienda.municipio || ""
                    );

                const mismaLocalidad =
                    !localidadTienda ||
                    !localidadCliente ||
                    localidadTienda ===
                        localidadCliente;

                const mismoMunicipio =
                    !municipioTienda ||
                    !municipioCliente ||
                    municipioTienda ===
                        municipioCliente;

                return (
                    mismaLocalidad &&
                    mismoMunicipio
                );

            }
        );

    tiendasDisponibles.sort((a, b) =>
        String(a.nombre || "").localeCompare(
            String(b.nombre || ""),
            "es"
        )
    );

    console.log(
        "🏪 Tiendas disponibles en la zona:",
        tiendasDisponibles.length,
        tiendasDisponibles
    );

    // La ausencia de tiendas locales no es un error técnico.
    // Más adelante aquí se conectará la opción para buscar
    // tiendas de otra zona.
    if (!tiendasDisponibles.length) {

        console.warn(
            "⚠️ No hay tiendas disponibles en la localidad del cliente."
        );

        tiendaSeleccionada = null;
        tiendaSeleccionadaId = null;

        if (storeSelector) {

            storeSelector.innerHTML = "";
            storeSelector.disabled = true;

        }

        if (storeSelectorSection) {

            storeSelectorSection.style.display =
                "none";

        }

        if (productsContainer) {

            productsContainer.innerHTML =
                "";

        }

        if (emptyProducts) {

            emptyProducts.style.display =
                "flex";
        }

        return;

    }

    const tiendaGuardada =
        sessionStorage.getItem("motiTiendaSeleccionadaId");

    const tiendaEncontrada =
        tiendasDisponibles.find(
            tienda => tienda.id === tiendaGuardada
        );

    tiendaSeleccionada =
        tiendaEncontrada ||
        tiendasDisponibles[0];

    tiendaSeleccionadaId =
        tiendaSeleccionada.id;

    sessionStorage.setItem(
        "motiTiendaSeleccionadaId",
        tiendaSeleccionadaId
    );

    renderizarSelectorTiendas();

}


// =====================================================
// SELECTOR DE TIENDAS
// =====================================================

function renderizarSelectorTiendas() {

    if (!storeSelector) {
        return;
    }

    storeSelector.innerHTML = "";

    tiendasDisponibles.forEach((tienda) => {

        const option =
            document.createElement("option");

        option.value = tienda.id;

        option.textContent =
            tienda.nombre || "Tienda";

        if (tienda.id === tiendaSeleccionadaId) {
            option.selected = true;
        }

        storeSelector.appendChild(option);

    });

    storeSelector.disabled = false;

    if (storeSelectorSection) {
        storeSelectorSection.style.display =
            tiendasDisponibles.length > 0
                ? "block"
                : "none";
    }

}


async function seleccionarTienda(tiendaId) {

    const tienda =
        tiendasDisponibles.find(
            item => item.id === tiendaId
        );

    if (!tienda) {
        return;
    }

    tiendaSeleccionada = tienda;
    tiendaSeleccionadaId = tienda.id;

    sessionStorage.setItem(
        "motiTiendaSeleccionadaId",
        tiendaSeleccionadaId
    );

    categoriaActual = "todos";

    document
        .querySelectorAll(".category-item")
        .forEach((item) => {
            item.classList.toggle(
                "active",
                item.dataset.category === "todos"
            );
        });

    console.log(
        "🏪 Tienda seleccionada:",
        tiendaSeleccionada
    );

    await cargarCatalogoDeTienda();

}


if (storeSelector) {

    storeSelector.addEventListener(
        "change",
        async (event) => {

            try {

                storeSelector.disabled = true;

                await seleccionarTienda(
                    event.target.value
                );

            }
            catch (error) {

                console.error(
                    "❌ Error cambiando de tienda:",
                    error
                );

                alert(
                    "No pudimos cargar esta tienda. Intenta nuevamente."
                );

            }
            finally {

                storeSelector.disabled = false;

            }

        }
    );

}


// =====================================================
// CARGAR CATÁLOGO DE LA TIENDA SELECCIONADA
// =====================================================

async function cargarCatalogoDeTienda() {

    if (!productsContainer) {
        return;
    }

    if (!tiendaSeleccionadaId) {
        return;
    }

    console.log(
        "🛒 Cargando catálogo de:",
        tiendaSeleccionada?.nombre
    );

    // Una sola lectura de inventarios: solamente esta tienda.
    const inventariosQuery =
        query(
            collection(db, "inventarios"),
            where(
                "tiendaId",
                "==",
                tiendaSeleccionadaId
            )
        );

    const inventarioSnapshot =
        await getDocs(inventariosQuery);

    inventarios = [];

    inventarioSnapshot.forEach((docSnap) => {

        const inventario = {
            id: docSnap.id,
            ...docSnap.data()
        };

        const existencia =
            Number(inventario.existencia ?? 0);

        if (
            inventario.disponible !== false &&
            existencia > 0
        ) {
            inventarios.push(inventario);
        }

    });

    console.log(
        "🏪 Inventarios disponibles de la tienda:",
        inventarios.length
    );

    // Solamente necesitamos los productos que existen en esta tienda.
    const productoIds = [
        ...new Set(
            inventarios
                .map(item => item.productoId)
                .filter(Boolean)
        )
    ];

    productos = [];

    // Firestore limita las consultas IN a grupos pequeños.
    const loteTamano = 30;

    for (
        let inicio = 0;
        inicio < productoIds.length;
        inicio += loteTamano
    ) {

        const lote =
            productoIds.slice(
                inicio,
                inicio + loteTamano
            );

        const productosQuery =
            query(
                collection(db, "productos"),
                where(
                    documentId(),
                    "in",
                    lote
                )
            );

        const productosSnapshot =
            await getDocs(productosQuery);

        productosSnapshot.forEach((docSnap) => {

            productos.push({
                id: docSnap.id,
                ...docSnap.data()
            });

        });

    }

    console.log(
        "📦 Productos de la tienda cargados:",
        productos.length
    );

    renderizarProductos();

    actualizarCarrito();

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

        await cargarContextoTiendas();

        await cargarCatalogoDeTienda();

    }
    catch (error) {

        console.error(
            "❌ Error cargando catálogo:",
            error
        );

        if (productsContainer) {
            productsContainer.innerHTML = "";
        }

        if (emptyProducts) {
            emptyProducts.style.display = "flex";
        }

        if (storeSelector) {
            storeSelector.disabled = true;
        }

        if (storeSelectorSection) {
            storeSelectorSection.style.display = "none";
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

            return (
                producto.disponible !== false
            );

        }
    );


    // =================================================
    // FILTRAR POR CATEGORÍA
    // =================================================

    if (
        categoriaActual &&
        categoriaActual !== "todos"
    ) {

        productosDisponibles =
            productosDisponibles.filter(
                producto => {

                    const categoria =
                        normalizarTexto(
                            producto.categoria ||
                            ""
                        );


                    return (
                        categoria ===
                        normalizarTexto(
                            categoriaActual
                        )
                    );

                }
            );

    }


    // =================================================
    // FILTRAR POR BÚSQUEDA
    // =================================================

    if (textoBusqueda) {

        const busqueda =
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


                    const marca =
                        normalizarTexto(
                            producto.marca ||
                            ""
                        );


                    const codigo =
                        normalizarTexto(
                            producto.codigoBarras ||
                            producto.codigo ||
                            ""
                        );


                    return (
                        nombre.includes(
                            busqueda
                        ) ||
                        marca.includes(
                            busqueda
                        ) ||
                        codigo.includes(
                            busqueda
                        )
                    );

                }
            );

    }


    // =================================================
    // MOSTRAR RESULTADOS
    // =================================================

    productosDisponibles.forEach(
        producto => {

            const elemento =
                crearProductoElemento(
                    producto
                );


            if (elemento) {

                productsContainer.appendChild(
                    elemento
                );

            }

        }
    );


    if (productsCount) {

        productsCount.textContent =
            `${productosDisponibles.length} producto${
                productosDisponibles.length === 1
                    ? ""
                    : "s"
            }`;

    }


    if (productsLabel) {

        productsLabel.textContent =
            `${productosDisponibles.length} producto${
                productosDisponibles.length === 1
                    ? ""
                    : "s"
            }`;

    }


    if (productsTitle) {

        productsTitle.textContent =
            tiendaSeleccionada?.nombre ||
            "Productos";

    }


    // =================================================
    // CATÁLOGO VACÍO
    // =================================================

    if (
        productosDisponibles.length === 0
    ) {

        if (emptyProducts) {

            emptyProducts.style.display =
                "flex";


            const mensaje =
                emptyProducts.querySelector(
                    ".empty-text"
                );


            if (mensaje) {

                mensaje.textContent =
                    textoBusqueda
                        ? "No encontramos productos con esa búsqueda."
                        : "No hay productos disponibles.";

            }

        }

    }
    else {

        if (emptyProducts) {

            emptyProducts.style.display =
                "none";

        }

    }

}


// =====================================================
// CREAR ELEMENTO DEL PRODUCTO
// =====================================================

function crearProductoElemento(
    producto
) {

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "product-item";


    const inventario =
        obtenerMejorInventario(
            producto.id
        );


    if (!inventario) {

        return null;

    }


    const precio =
        Number(
            inventario.precio ??
            producto.precio ??
            0
        );


    const existencia =
        Number(
            inventario.existencia ??
            0
        );


    const cantidadCarrito =
        Number(
            carrito[producto.id] ||
            0
        );


    const imagen =
        producto.imagenUrl ||
        producto.imagen ||
        producto.imageUrl ||
        "";


    const nombre =
        producto.nombre ||
        "Producto";


    const marca =
        producto.marca ||
        "";


    const unidad =
        obtenerTextoUnidad(
            producto,
            inventario
        );


    item.innerHTML = `

        <div class="product-image">

            ${
                imagen
                    ? `
                        <img
                            src="${escapeHtml(
                                imagen
                            )}"
                            alt="${escapeHtml(
                                nombre
                            )}"
                            loading="lazy"
                        >
                    `
                    : `
                        <div class="product-image-placeholder">
                            ${obtenerIconoProducto(
                                producto
                            )}
                        </div>
                    `
            }

        </div>


        <div class="product-info">

            <div class="product-name">
                ${escapeHtml(
                    nombre
                )}
            </div>


            ${
                marca
                    ? `
                        <div class="product-brand">
                            ${escapeHtml(
                                marca
                            )}
                        </div>
                    `
                    : ""
            }


            <div class="product-price">

                $${precio.toFixed(2)}

                ${
                    unidad
                        ? `
                            <span class="product-unit">
                                ${escapeHtml(
                                    unidad
                                )}
                            </span>
                        `
                        : ""
                }

            </div>


            ${
                existencia > 0
                    ? `
                        <div class="product-stock">
                            ${existencia} disponibles
                        </div>
                    `
                    : `
                        <div class="product-stock unavailable">
                            Agotado
                        </div>
                    `
            }


            <div class="product-actions">

                ${
                    cantidadCarrito > 0
                        ? `

                            <button
                                type="button"
                                class="quantity-minus"
                                data-product-id="${producto.id}"
                            >
                                −
                            </button>


                            <span
                                class="quantity-value"
                                data-product-id="${producto.id}"
                            >
                                ${cantidadCarrito}
                            </span>


                            <button
                                type="button"
                                class="quantity-plus"
                                data-product-id="${producto.id}"
                            >
                                +
                            </button>

                        `
                        : `

                            <button
                                type="button"
                                class="add-product"
                                data-product-id="${producto.id}"
                                ${
                                    existencia <= 0
                                        ? "disabled"
                                        : ""
                                }
                            >
                                Agregar
                            </button>

                        `
                }

            </div>

        </div>

    `;


    // =================================================
    // BOTÓN AGREGAR
    // =================================================

    const botonAgregar =
        item.querySelector(
            ".add-product"
        );


    if (botonAgregar) {

        botonAgregar.addEventListener(
            "click",
            () => {

                agregarAlCarrito(
                    producto.id
                );

            }
        );

    }


    // =================================================
    // BOTÓN MENOS
    // =================================================

    const botonMenos =
        item.querySelector(
            ".quantity-minus"
        );


    if (botonMenos) {

        botonMenos.addEventListener(
            "click",
            () => {

                cambiarCantidadCarrito(
                    producto.id,
                    -1
                );

            }
        );

    }


    // =================================================
    // BOTÓN MÁS
    // =================================================

    const botonMas =
        item.querySelector(
            ".quantity-plus"
        );


    if (botonMas) {

        botonMas.addEventListener(
            "click",
            () => {

                cambiarCantidadCarrito(
                    producto.id,
                    1
                );

            }
        );

    }


    return item;

}


// =====================================================
// ICONO DE PRODUCTO
// =====================================================

function obtenerIconoProducto(
    producto
) {

    const categoria =
        normalizarTexto(
            producto.categoria ||
            ""
        );


    const iconos = {

        abarrotes:
            "🛒",

        bebidas:
            "🥤",

        lacteos:
            "🥛",

        carnes:
            "🥩",

        frutas:
            "🍎",

        verduras:
            "🥬",

        limpieza:
            "🧹",

        higiene:
            "🧴",

        botanas:
            "🍿",

        dulces:
            "🍬",

        panaderia:
            "🥖",

        congelados:
            "🧊",

        mascotas:
            "🐶",

        farmacia:
            "💊"

    };


    return (
        iconos[categoria] ||
        "📦"
    );

}


// =====================================================
// TEXTO DE UNIDAD
// =====================================================

function obtenerTextoUnidad(
    producto,
    inventario
) {

    if (
        inventario &&
        inventario.unidad
    ) {

        return inventario.unidad;

    }


    if (
        producto &&
        producto.unidad
    ) {

        return producto.unidad;

    }


    return "";

}


// =====================================================
// AGREGAR AL CARRITO
// =====================================================

function agregarAlCarrito(
    productoId
) {

    const inventario =
        obtenerMejorInventario(
            productoId
        );


    if (!inventario) {

        alert(
            "Este producto no está disponible."
        );

        return;

    }


    const existencia =
        Number(
            inventario.existencia ??
            0
        );


    const cantidadActual =
        Number(
            carrito[productoId] ||
            0
        );


    if (
        cantidadActual >=
        existencia
    ) {

        alert(
            "No hay más unidades disponibles."
        );

        return;

    }


    carrito[productoId] =
        cantidadActual + 1;


    guardarCarrito();

    actualizarCarrito();

    renderizarProductos();

}


// =====================================================
// CAMBIAR CANTIDAD DEL CARRITO
// =====================================================

function cambiarCantidadCarrito(
    productoId,
    cambio
) {

    const cantidadActual =
        Number(
            carrito[productoId] ||
            0
        );


    const nuevaCantidad =
        cantidadActual +
        cambio;


    const inventario =
        obtenerMejorInventario(
            productoId
        );


    if (
        cambio > 0 &&
        inventario &&
        nuevaCantidad >
            Number(
                inventario.existencia ?? 0
            )
    ) {

        return;

    }


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

    actualizarCarrito();

    renderizarProductos();

}


// =====================================================
// ACTUALIZAR CARRITO
// =====================================================

function actualizarCarrito() {

    if (!cartBar) {
        return;
    }


    const productosCarrito =
        Object.entries(
            carrito
        );


    let total =
        0;


    let cantidadTotal =
        0;


    if (cartItems) {

        cartItems.innerHTML =
            "";

    }


    productosCarrito.forEach(
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


            const subtotal =
                precio *
                cantidadNumero;


            total +=
                subtotal;


            cantidadTotal +=
                cantidadNumero;


            if (cartItems) {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "cart-item";


                item.innerHTML = `

                    <div class="cart-item-info">

                        <div class="cart-item-name">
                            ${escapeHtml(
                                producto.nombre ||
                                "Producto"
                            )}
                        </div>


                        <div class="cart-item-price">
                            $${precio.toFixed(2)}
                        </div>

                    </div>


                    <div class="cart-item-actions">

                        <button
                            type="button"
                            class="quantity-minus"
                            data-product-id="${productoId}"
                        >
                            −
                        </button>


                        <span>
                            ${cantidadNumero}
                        </span>


                        <button
                            type="button"
                            class="quantity-plus"
                            data-product-id="${productoId}"
                        >
                            +
                        </button>

                    </div>

                `;


                const botonMenos =
                    item.querySelector(
                        ".quantity-minus"
                    );


                const botonMas =
                    item.querySelector(
                        ".quantity-plus"
                    );


                if (botonMenos) {

                    botonMenos.addEventListener(
                        "click",
                        (event) => {

                            event.stopPropagation();

                            cambiarCantidadCarrito(
                                productoId,
                                -1
                            );

                        }
                    );

                }


                if (botonMas) {

                    botonMas.addEventListener(
                        "click",
                        (event) => {

                            event.stopPropagation();

                            cambiarCantidadCarrito(
                                productoId,
                                1
                            );

                        }
                    );

                }


                cartItems.appendChild(
                    item
                );

            }

        }
    );


    if (cartTotal) {

        cartTotal.textContent =
            `$${total.toFixed(2)}`;

    }


    if (cartBar) {

        cartBar.style.display =
            cantidadTotal > 0
                ? "flex"
                : "none";

    }

}


// =====================================================
// ESCAPAR HTML
// =====================================================

function escapeHtml(
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
// NORMALIZAR TEXTO
// =====================================================

function normalizarTexto(
    texto
) {

    return String(
        texto || ""
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim();

}

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
// OBTENER ICONO DEL PRODUCTO
// =====================================================

function obtenerIconoProducto(
    producto
) {

    const categoria =
        normalizarTexto(
            producto.categoria ||
            producto.categoriaId ||
            ""
        );


    const iconos = {

        abarrotes:
            "shopping_cart",

        bebidas:
            "local_drink",

        lacteos:
            "local_drink",

        carnes:
            "restaurant",

        frutas:
            "nutrition",

        verduras:
            "eco",

        limpieza:
            "cleaning_services",

        higiene:
            "soap",

        botanas:
            "fastfood",

        dulces:
            "cake",

        panaderia:
            "bakery_dining",

        congelados:
            "ac_unit",

        mascotas:
            "pets",

        farmacia:
            "medication"

    };


    return (
        iconos[categoria] ||
        "inventory_2"
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
// FORMATEAR PRECIO
// =====================================================

function formatearPrecio(
    precio
) {

    return Number(
        precio || 0
    ).toLocaleString(
        "es-MX",
        {
            style: "currency",
            currency: "MXN"
        }
    );

}


// =====================================================
// OBTENER NOMBRE DE CATEGORÍA
// =====================================================

function obtenerNombreCategoria(
    categoria
) {

    const nombres = {

        abarrotes:
            "Abarrotes",

        bebidas:
            "Bebidas",

        lacteos:
            "Lácteos",

        carnes:
            "Carnes",

        frutas:
            "Frutas",

        verduras:
            "Verduras",

        limpieza:
            "Limpieza",

        higiene:
            "Higiene",

        botanas:
            "Botanas",

        dulces:
            "Dulces",

        panaderia:
            "Panadería",

        congelados:
            "Congelados",

        mascotas:
            "Mascotas",

        farmacia:
            "Farmacia"

    };


    return (
        nombres[categoria] ||
        "Productos"
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


    if (
        cambio > 0 &&
        inventario &&
        nuevaCantidad >
            Number(
                inventario.existencia ?? 0
            )
    ) {

        return;

    }


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


// =====================================================
// FIREBASE AUTH
// ESPERAR A QUE FIREBASE RESTAURE LA SESIÓN
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


console.log(
    "🛒 MOTI GO - CATÁLOGO INICIADO"
);
