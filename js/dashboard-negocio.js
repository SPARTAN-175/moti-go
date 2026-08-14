// =========================================================
// MOTI GO
// DASHBOARD DEL NEGOCIO
// =========================================================


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


// =========================================================
// VISTAS
// =========================================================

const views =
    document.querySelectorAll(
        ".business-view"
    );


// =========================================================
// BOTONES DEL MENÚ
// =========================================================

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

        subtitle:
            "Resumen de tu negocio"

    },

    productos: {

        title: "Mis productos",

        subtitle:
            "Administra tu catálogo"

    },

    importar: {

        title: "Importar catálogo",

        subtitle:
            "Carga tus productos desde Excel o CSV"

    },

    agregar: {

        title: "Agregar producto",

        subtitle:
            "Registra un producto manualmente"

    },

    negocio: {

        title: "Mi negocio",

        subtitle:
            "Información de tu negocio"

    },

    configuracion: {

        title: "Configuración",

        subtitle:
            "Administra las opciones de tu cuenta"

    }

};


// =========================================================
// ABRIR MENÚ
// =========================================================

function abrirMenu() {

    if (!sidebar) {
        return;
    }


    sidebar.classList.add(
        "open"
    );


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

    if (!sidebar) {
        return;
    }


    sidebar.classList.remove(
        "open"
    );


    if (sidebarOverlay) {

        sidebarOverlay.classList.remove(
            "active"
        );

    }

}


// =========================================================
// BOTÓN MENÚ
// =========================================================

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

            }
            else {

                abrirMenu();

            }

        }
    );

}


// =========================================================
// BOTÓN CERRAR
// =========================================================

if (sidebarClose) {

    sidebarClose.addEventListener(
        "click",
        cerrarMenu
    );

}


// =========================================================
// OVERLAY
// =========================================================

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

    if (!nombreVista) {
        return;
    }


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


    // ---------------------------------------------
    // Ocultar todas
    // ---------------------------------------------

    views.forEach(
        (view) => {

            view.classList.remove(
                "active"
            );

        }
    );


    // ---------------------------------------------
    // Mostrar la seleccionada
    // ---------------------------------------------

    vistaObjetivo.classList.add(
        "active"
    );


    // ---------------------------------------------
    // Actualizar menú
    // ---------------------------------------------

    navItems.forEach(
        (item) => {

            const itemView =
                item.dataset.view;


            item.classList.toggle(
                "active",
                itemView === nombreVista
            );

        }
    );


    // ---------------------------------------------
    // Actualizar encabezado
    // ---------------------------------------------

    actualizarEncabezado(
        nombreVista
    );


    // ---------------------------------------------
    // Cerrar menú en móvil
    // ---------------------------------------------

    cerrarMenu();


    // ---------------------------------------------
    // Volver arriba
    // ---------------------------------------------

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
// ACTUALIZAR ENCABEZADO
// =========================================================

function actualizarEncabezado(
    nombreVista
) {

    const config =
        viewConfig[
            nombreVista
        ];


    if (!config) {
        return;
    }


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
// EVENTOS DEL MENÚ
// =========================================================

navItems.forEach(
    (item) => {

        item.addEventListener(
            "click",
            () => {

                const nombreVista =
                    item.dataset.view;


                cambiarVista(
                    nombreVista
                );

            }
        );

    }
);


// =========================================================
// BOTONES QUE CAMBIAN DE VISTA
// =========================================================

const goViewButtons =
    document.querySelectorAll(
        "[data-go-view]"
    );


goViewButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                const nombreVista =
                    button.dataset.goView;


                cambiarVista(
                    nombreVista
                );

            }
        );

    }
);


// =========================================================
// BUSCADOR DE PRODUCTOS
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

            const texto =
                productSearch.value
                    .trim()
                    .toLowerCase();


            if (
                clearProductSearch
            ) {

                clearProductSearch.classList.toggle(
                    "visible",
                    texto.length > 0
                );

            }


            /*
                El buscador real se conectará
                posteriormente con los productos
                de Firebase.

                Por ahora solamente registramos
                el texto.
            */

            console.log(
                "🔎 Búsqueda:",
                texto
            );

        }
    );

}


// =========================================================
// LIMPIAR BÚSQUEDA
// =========================================================

if (clearProductSearch) {

    clearProductSearch.addEventListener(
        "click",
        () => {

            if (productSearch) {

                productSearch.value =
                    "";

                productSearch.focus();

            }


            clearProductSearch.classList.remove(
                "visible"
            );


            console.log(
                "🔎 Búsqueda limpiada"
            );

        }
    );

}


// =========================================================
// FILTROS DE PRODUCTOS
// =========================================================

const productFilters =
    document.querySelectorAll(
        ".product-filter[data-filter]"
    );


productFilters.forEach(
    (filterButton) => {

        filterButton.addEventListener(
            "click",
            () => {

                productFilters.forEach(
                    (button) => {

                        button.classList.remove(
                            "active"
                        );

                    }
                );


                filterButton.classList.add(
                    "active"
                );


                const filtro =
                    filterButton.dataset.filter;


                /*
                    Más adelante este filtro
                    se aplicará sobre los productos
                    cargados desde Firestore.
                */

                console.log(
                    "📦 Filtro:",
                    filtro
                );

            }
        );

    }
);


// =========================================================
// BOTÓN PERFIL
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


            /*
                La autenticación real se conectará
                aquí con Firebase Authentication.

                Por ahora solo mostramos el evento.
            */

            console.log(
                "🚪 Solicitud de cierre de sesión"
            );

        }
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
