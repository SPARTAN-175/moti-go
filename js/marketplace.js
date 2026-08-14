// =========================================================
// MOTI GO - MARKETPLACE
// =========================================================


// =========================================================
// ELEMENTOS DEL MENÚ
// =========================================================

const marketMenuButton =
    document.getElementById("marketMenuButton");

const marketCloseMenu =
    document.getElementById("marketCloseMenu");

const marketSideMenu =
    document.getElementById("marketSideMenu");

const marketMenuOverlay =
    document.getElementById("marketMenuOverlay");


// =========================================================
// ABRIR MENÚ
// =========================================================

function abrirMenu() {

    marketSideMenu.classList.add("active");

    marketMenuOverlay.classList.add("active");

    document.body.style.overflow = "hidden";

}


// =========================================================
// CERRAR MENÚ
// =========================================================

function cerrarMenu() {

    marketSideMenu.classList.remove("active");

    marketMenuOverlay.classList.remove("active");

    document.body.style.overflow = "";

}


// =========================================================
// EVENTOS MENÚ
// =========================================================

if (marketMenuButton) {

    marketMenuButton.addEventListener(
        "click",
        abrirMenu
    );

}


if (marketCloseMenu) {

    marketCloseMenu.addEventListener(
        "click",
        cerrarMenu
    );

}


if (marketMenuOverlay) {

    marketMenuOverlay.addEventListener(
        "click",
        cerrarMenu
    );

}


// =========================================================
// CERRAR CON ESC
// =========================================================

document.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Escape") {

            cerrarMenu();

        }

    }
);


// =========================================================
// CERRAR MENÚ AL NAVEGAR
// =========================================================

const menuLinks =
    document.querySelectorAll(
        ".market-menu-link"
    );

menuLinks.forEach(link => {

    link.addEventListener(
        "click",
        () => {

            cerrarMenu();

        }
    );

});


// =========================================================
// BUSCADOR
// =========================================================

const searchInput =
    document.getElementById(
        "marketplaceSearch"
    );

const clearSearch =
    document.getElementById(
        "clearSearch"
    );

const productsContainer =
    document.getElementById(
        "marketplaceProducts"
    );

const emptyMarketplace =
    document.getElementById(
        "emptyMarketplace"
    );

const productsCount =
    document.getElementById(
        "productsCount"
    );


// =========================================================
// OBTENER PRODUCTOS
// =========================================================

function obtenerProductos() {

    return Array.from(
        document.querySelectorAll(
            ".market-product"
        )
    );

}


// =========================================================
// FILTRAR PRODUCTOS
// =========================================================

function filtrarProductos() {

    const texto =
        searchInput.value
            .trim()
            .toLowerCase();

    const categoriaActiva =
        document.querySelector(
            ".market-category.active"
        );

    const categoria =
        categoriaActiva
            ? categoriaActiva.dataset.category
            : "todos";


    const productos =
        obtenerProductos();


    let visibles = 0;


    productos.forEach(producto => {

        const nombre =
            producto
                .querySelector(
                    ".product-content h3"
                )
                ?.textContent
                .toLowerCase() || "";


        const vendedor =
            producto
                .querySelector(
                    ".seller-name"
                )
                ?.textContent
                .toLowerCase() || "";


        const categoriaProducto =
            producto.dataset.category;


        const coincideTexto =
            !texto ||
            nombre.includes(texto) ||
            vendedor.includes(texto);


        const coincideCategoria =
            categoria === "todos" ||
            categoriaProducto === categoria;


        const mostrar =
            coincideTexto &&
            coincideCategoria;


        if (mostrar) {

            producto.style.display = "";

            visibles++;

        } else {

            producto.style.display = "none";

        }

    });


    // =====================================================
    // CONTADOR
    // =====================================================

    if (productsCount) {

        productsCount.textContent =
            `${visibles} ${
                visibles === 1
                    ? "producto"
                    : "productos"
            }`;

    }


    // =====================================================
    // SIN RESULTADOS
    // =====================================================

    if (emptyMarketplace) {

        emptyMarketplace.style.display =
            visibles === 0
                ? "block"
                : "none";

    }

}


// =========================================================
// BUSCAR MIENTRAS ESCRIBE
// =========================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        () => {

            filtrarProductos();


            if (clearSearch) {

                clearSearch.style.display =
                    searchInput.value
                        ? "flex"
                        : "none";

            }

        }
    );

}


// =========================================================
// LIMPIAR BÚSQUEDA
// =========================================================

if (clearSearch) {

    clearSearch.addEventListener(
        "click",
        () => {

            searchInput.value = "";

            clearSearch.style.display =
                "none";

            filtrarProductos();

            searchInput.focus();

        }
    );

}


// =========================================================
// CATEGORÍAS
// =========================================================

const categoryButtons =
    document.querySelectorAll(
        ".market-category"
    );


categoryButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {


            categoryButtons.forEach(
                item => {

                    item.classList.remove(
                        "active"
                    );

                }
            );


            button.classList.add(
                "active"
            );


            filtrarProductos();


            // Regresamos suavemente
            // al inicio del catálogo

            window.scrollTo({

                top: 0,

                behavior: "smooth"

            });

        }
    );

});


// =========================================================
// FAVORITOS
// =========================================================

const favoriteButtons =
    document.querySelectorAll(
        ".favorite-button"
    );


favoriteButtons.forEach(button => {

    button.addEventListener(
        "click",
        (event) => {

            // Evita abrir el producto

            event.stopPropagation();

            event.preventDefault();


            button.classList.toggle(
                "active"
            );


            const icon =
                button.querySelector(
                    ".material-symbols-outlined"
                );


            if (
                button.classList.contains(
                    "active"
                )
            ) {

                icon.textContent =
                    "favorite";

            } else {

                icon.textContent =
                    "favorite";

            }


            // Por ahora solamente
            // guardamos visualmente
            // en localStorage

            guardarFavoritos();


        }
    );

});


// =========================================================
// GUARDAR FAVORITOS LOCALMENTE
// =========================================================

function guardarFavoritos() {

    const favoritos = [];


    document
        .querySelectorAll(
            ".market-product"
        )
        .forEach(producto => {


            const boton =
                producto.querySelector(
                    ".favorite-button"
                );


            if (
                boton &&
                boton.classList.contains(
                    "active"
                )
            ) {

                favoritos.push(
                    producto.dataset.productId
                );

            }

        });


    localStorage.setItem(

        "motiMarketplaceFavoritos",

        JSON.stringify(
            favoritos
        )

    );

}


// =========================================================
// CARGAR FAVORITOS
// =========================================================

function cargarFavoritos() {

    const guardados =
        JSON.parse(

            localStorage.getItem(
                "motiMarketplaceFavoritos"
            )

        ) || [];


    document
        .querySelectorAll(
            ".market-product"
        )
        .forEach(producto => {


            const id =
                producto.dataset.productId;


            if (
                guardados.includes(id)
            ) {


                const boton =
                    producto.querySelector(
                        ".favorite-button"
                    );


                if (boton) {

                    boton.classList.add(
                        "active"
                    );

                }

            }

        });

}


// =========================================================
// ABRIR PRODUCTO
// =========================================================

const productButtons =
    document.querySelectorAll(
        ".product-open"
    );


productButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            const productId =
                button.dataset.productId;


            if (!productId) {

                return;

            }


            window.location.href =
                `producto-marketplace.html?id=${encodeURIComponent(
                    productId
                )}`;

        }
    );

});


// =========================================================
// CARRITO
// =========================================================

const btnMarketplaceCart =
    document.getElementById(
        "btnMarketplaceCart"
    );

const marketplaceCartBar =
    document.getElementById(
        "marketplaceCartBar"
    );


// =========================================================
// ESTADO TEMPORAL DEL CARRITO
// =========================================================

function obtenerCarrito() {

    return JSON.parse(

        localStorage.getItem(
            "motiMarketplaceCart"
        )

    ) || [];

}


// =========================================================
// ACTUALIZAR CARRITO
// =========================================================

function actualizarCarritoVisual() {

    const carrito =
        obtenerCarrito();


    let cantidad = 0;

    let total = 0;


    carrito.forEach(producto => {

        cantidad +=
            producto.cantidad || 0;

        total +=
            (producto.precio || 0) *
            (producto.cantidad || 0);

    });


    // Badge superior

    const cartBadge =
        document.getElementById(
            "cartBadge"
        );


    if (cartBadge) {

        cartBadge.textContent =
            cantidad;

    }


    // Badge menú

    const menuCartBadge =
        document.getElementById(
            "menuCartBadge"
        );


    if (menuCartBadge) {

        menuCartBadge.textContent =
            cantidad;

    }


    // Barra inferior

    const cartItems =
        document.getElementById(
            "cartItems"
        );

    const cartTotal =
        document.getElementById(
            "cartTotal"
        );


    if (cartItems) {

        cartItems.textContent =
            `${cantidad} ${
                cantidad === 1
                    ? "producto"
                    : "productos"
            }`;

    }


    if (cartTotal) {

        cartTotal.textContent =
            `$${total.toFixed(0)}`;

    }


    if (marketplaceCartBar) {

        marketplaceCartBar.style.display =
            cantidad > 0
                ? "flex"
                : "none";

    }

}


// =========================================================
// ABRIR CARRITO
// =========================================================

function abrirCarrito() {

    window.location.href =
        "carrito-marketplace.html";

}


if (btnMarketplaceCart) {

    btnMarketplaceCart.addEventListener(
        "click",
        abrirCarrito
    );

}


if (marketplaceCartBar) {

    marketplaceCartBar.addEventListener(
        "click",
        abrirCarrito
    );

}


// =========================================================
// INICIALIZACIÓN
// =========================================================

cargarFavoritos();

filtrarProductos();

actualizarCarritoVisual();
