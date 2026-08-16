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
// CARGAR CATÁLOGO DE LAS TIENDAS DE LA ZONA
// =====================================================

async function cargarCatalogo() {

    if (!productsContainer) {
        return;
    }


    try {

        console.log(
            "🛒 Cargando catálogo MOTI GO..."
        );


        const usuario =
            await cargarContextoCliente();


        // =================================================
        // TIENDAS
        // =================================================

        const tiendas =
            await cargarTiendasDeLaZona(
                usuario
            );


        console.log(
            "🏪 Tiendas disponibles en la zona:",
            tiendas.length,
            tiendas
        );


        if (
            tiendas.length === 0
        ) {

            console.warn(
                "⚠️ No hay tiendas disponibles en la localidad del cliente."
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


            if (productsLabel) {

                productsLabel.textContent =
                    "0 productos";

            }


            if (productsTitle) {

                productsTitle.textContent =
                    "Productos";

            }


            return;

        }


        // =================================================
        // INVENTARIOS
        // =================================================
        //
        // IMPORTANTE:
        //
        // Ya NO descargamos todos los inventarios.
        //
        // Solamente consultamos los inventarios de las
        // tiendas que pertenecen a la zona del cliente.
        //
        // =================================================

        inventarios = [];


        const tiendaIds =
            tiendas.map(
                tienda =>
                    tienda.id
            );


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


            const inventarioQuery =
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


            const inventarioSnapshot =
                await getDocs(
                    inventarioQuery
                );


            inventarioSnapshot.forEach(
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

        }


        console.log(
            "🏪 Inventarios disponibles:",
            inventarios.length
        );


        // =================================================
        // PRODUCTOS
        // =================================================
        //
        // Solo consultamos los productos que realmente
        // aparecen en los inventarios disponibles.
        //
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


        productos = [];


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
            "📦 Productos encontrados:",
            productos.length
        );


        console.log(
            "🏪 Inventarios encontrados:",
            inventarios.length
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


            if (searchClear) {

                searchClear.style.display =
                    textoBusqueda.length > 0
                        ? "flex"
                        : "none";

            }


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
