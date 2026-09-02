/* =========================================================
   MOTI GO — PANEL DE ADMINISTRACIÓN
   dashboard-admin.js
========================================================= */


/* =========================================================
   FIREBASE
========================================================= */

import {
    auth,
    db
} from "../js/firebase-config.js";


import {
    onAuthStateChanged,
    signOut
} from
"https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


import {
    doc,
    getDoc
} from
"https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================================================
   ELEMENTOS PRINCIPALES
========================================================= */

const estadoAdmin =
    document.getElementById(
        "estadoAdmin"
    );


const nombreAdmin =
    document.getElementById(
        "nombreAdmin"
    );


const btnCerrarSesion =
    document.getElementById(
        "btnCerrarSesion"
    );


const tituloVista =
    document.getElementById(
        "tituloVista"
    );


const subtituloVista =
    document.getElementById(
        "subtituloVista"
    );


/* =========================================================
   ELEMENTOS DEL MENÚ
========================================================= */

const btnMenu =
    document.getElementById(
        "btnMenu"
    );


const btnCerrarMenu =
    document.getElementById(
        "btnCerrarMenu"
    );


const sidebar =
    document.getElementById(
        "sidebar"
    );


const sidebarOverlay =
    document.getElementById(
        "sidebarOverlay"
    );


const btnMarketplace =
    document.getElementById(
        "btnMarketplace"
    );


/* =========================================================
   ELEMENTOS DE CONFIGURACIÓN
========================================================= */

const btnGuardarTarifas =
    document.getElementById(
        "btnGuardarTarifas"
    );


const estadoConfiguracion =
    document.getElementById(
        "estadoConfiguracion"
    );


/* =========================================================
   INFORMACIÓN DE LAS VISTAS
========================================================= */

const informacionVistas = {

    inicio: {

        titulo:
            "Resumen",

        subtitulo:
            "Centro de operaciones de MOTI GO"

    },


    tiendas: {

        titulo:
            "Tiendas",

        subtitulo:
            "Administración de tiendas"

    },


    repartidores: {

        titulo:
            "Repartidores",

        subtitulo:
            "Gestión de repartidores"

    },


    clientes: {

        titulo:
            "Clientes",

        subtitulo:
            "Clientes registrados"

    },


    pedidos: {

        titulo:
            "Pedidos",

        subtitulo:
            "Operación y seguimiento"

    },


    finanzas: {

        titulo:
            "Finanzas",

        subtitulo:
            "Movimientos e ingresos"

    },


    carteras: {

        titulo:
            "Carteras",

        subtitulo:
            "Saldos y movimientos"

    },


    configuracion: {

        titulo:
            "Configuración",

        subtitulo:
            "Reglas generales de MOTI GO"

    },


    operadores: {

        titulo:
            "Operadores",

        subtitulo:
            "Cuentas administrativas"

    }

};


/* =========================================================
   ELEMENTOS DE NAVEGACIÓN
========================================================= */

const botonesMenu =
    document.querySelectorAll(
        ".menu-button[data-view]"
    );


const vistas =
    document.querySelectorAll(
        ".view"
    );


/* =========================================================
   ABRIR MENÚ
========================================================= */

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


    if (btnMenu) {

        btnMenu.setAttribute(
            "aria-expanded",
            "true"
        );

    }

}


/* =========================================================
   CERRAR MENÚ
========================================================= */

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


    if (btnMenu) {

        btnMenu.setAttribute(
            "aria-expanded",
            "false"
        );

    }

}


/* =========================================================
   EVENTO BOTÓN HAMBURGUESA
========================================================= */

if (btnMenu) {

    btnMenu.addEventListener(
        "click",
        () => {

            const menuAbierto =
                sidebar &&
                sidebar.classList.contains(
                    "open"
                );


            if (menuAbierto) {

                cerrarMenu();

            }
            else {

                abrirMenu();

            }

        }
    );

}


/* =========================================================
   EVENTO BOTÓN CERRAR
========================================================= */

if (btnCerrarMenu) {

    btnCerrarMenu.addEventListener(
        "click",
        () => {

            cerrarMenu();

        }
    );

}


/* =========================================================
   EVENTO OVERLAY
========================================================= */

if (sidebarOverlay) {

    sidebarOverlay.addEventListener(
        "click",
        () => {

            cerrarMenu();

        }
    );

}


/* =========================================================
   CAMBIAR DE VISTA
========================================================= */

function mostrarVista(
    nombreVista
) {

    const informacion =
        informacionVistas[
            nombreVista
        ];


    if (!informacion) {

        console.warn(
            "Vista no encontrada:",
            nombreVista
        );

        return;

    }


    /* -----------------------------------------------------
       OCULTAR TODAS LAS VISTAS
    ----------------------------------------------------- */

    vistas.forEach(
        vista => {

            vista.classList.remove(
                "active"
            );

        }
    );


    /* -----------------------------------------------------
       MOSTRAR VISTA SELECCIONADA
    ----------------------------------------------------- */

    const vistaSeleccionada =
        document.getElementById(
            `view-${nombreVista}`
        );


    if (vistaSeleccionada) {

        vistaSeleccionada.classList.add(
            "active"
        );

    }


    /* -----------------------------------------------------
       ACTUALIZAR BOTÓN ACTIVO
    ----------------------------------------------------- */

    botonesMenu.forEach(
        boton => {

            boton.classList.toggle(
                "active",
                boton.dataset.view ===
                nombreVista
            );

        }
    );


    /* -----------------------------------------------------
       ACTUALIZAR ENCABEZADO
    ----------------------------------------------------- */

    if (tituloVista) {

        tituloVista.textContent =
            informacion.titulo;

    }


    if (subtituloVista) {

        subtituloVista.textContent =
            informacion.subtitulo;

    }


    /* -----------------------------------------------------
       CERRAR MENÚ
    ----------------------------------------------------- */

    cerrarMenu();


    /* -----------------------------------------------------
       VOLVER AL INICIO DEL CONTENIDO
    ----------------------------------------------------- */

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/* =========================================================
   EVENTOS DE LAS OPCIONES DEL MENÚ
========================================================= */

botonesMenu.forEach(
    boton => {

        boton.addEventListener(
            "click",
            () => {

                const nombreVista =
                    boton.dataset.view;


                mostrarVista(
                    nombreVista
                );

            }
        );

    }
);


/* =========================================================
   MARKETPLACE
========================================================= */

if (btnMarketplace) {

    btnMarketplace.addEventListener(
        "click",
        () => {

            /*
             * Marketplace tendrá su propio
             * panel administrativo.
             *
             * No mezclamos su funcionamiento
             * con este dashboard.
             */

            window.location.href =
                "./marketplace/dashboard-marketplace.html";

        }
    );

}


/* =========================================================
   VERIFICACIÓN DEL ADMINISTRADOR
========================================================= */

onAuthStateChanged(
    auth,
    async usuario => {

        console.log(
            "🔐 MOTI GO ADMIN: verificando sesión..."
        );


        /* -------------------------------------------------
           NO HAY SESIÓN
        ------------------------------------------------- */

        if (!usuario) {

            window.location.href =
                "../index.html";

            return;

        }


        try {

            /* -------------------------------------------------
               OBTENER DOCUMENTO DEL USUARIO
            ------------------------------------------------- */

            const referenciaUsuario =
                doc(
                    db,
                    "usuarios",
                    usuario.uid
                );


            const snapshot =
                await getDoc(
                    referenciaUsuario
                );


            /* -------------------------------------------------
               EL DOCUMENTO NO EXISTE
            ------------------------------------------------- */

            if (!snapshot.exists()) {

                console.error(
                    "❌ El documento del usuario no existe."
                );


                await signOut(
                    auth
                );


                window.location.href =
                    "../index.html";

                return;

            }


            const datosUsuario =
                snapshot.data();


            /* -------------------------------------------------
               COMPROBAR TIPO DE USUARIO
            ------------------------------------------------- */

            if (
                datosUsuario.tipo !==
                "admin"
            ) {

                alert(
                    "No tienes permisos para acceder al panel administrativo."
                );


                await signOut(
                    auth
                );


                window.location.href =
                    "../index.html";

                return;

            }


            /* -------------------------------------------------
               ACCESO AUTORIZADO
            ------------------------------------------------- */

            console.log(
                "✅ MOTI GO ADMIN: acceso autorizado."
            );


            if (estadoAdmin) {

                estadoAdmin.textContent =
                    "Sesión administrativa activa";

            }


            /* -------------------------------------------------
               NOMBRE DEL ADMINISTRADOR
            ------------------------------------------------- */

            const nombre =
                datosUsuario.nombre ||
                usuario.displayName ||
                usuario.email ||
                "Administrador";


            if (nombreAdmin) {

                nombreAdmin.textContent =
                    nombre;

            }


            /* -------------------------------------------------
               AVATAR
            ------------------------------------------------- */

            const avatar =
                document.querySelector(
                    ".admin-avatar"
                );


            if (avatar) {

                avatar.textContent =
                    nombre
                        .trim()
                        .charAt(0)
                        .toUpperCase();

            }

        }
        catch (error) {

            console.error(
                "❌ Error verificando administrador:",
                error
            );


            alert(
                "No se pudo verificar tu cuenta administrativa."
            );


            try {

                await signOut(
                    auth
                );

            }
            catch (errorLogout) {

                console.error(
                    "❌ Error cerrando sesión:",
                    errorLogout
                );

            }


            window.location.href =
                "../index.html";

        }

    }
);


/* =========================================================
   CERRAR SESIÓN
========================================================= */

if (btnCerrarSesion) {

    btnCerrarSesion.addEventListener(
        "click",
        async () => {

            try {

                btnCerrarSesion.disabled =
                    true;


                btnCerrarSesion.textContent =
                    "Cerrando sesión...";


                await signOut(
                    auth
                );


                window.location.href =
                    "../index.html";

            }
            catch (error) {

                console.error(
                    "❌ Error cerrando sesión:",
                    error
                );


                btnCerrarSesion.disabled =
                    false;


                btnCerrarSesion.textContent =
                    "Cerrar sesión";

            }

        }
    );

}


/* =========================================================
   CONFIGURACIÓN DE TARIFAS
   -----------------------------------------------
   TODAVÍA NO GUARDA EN FIREBASE.
   SOLAMENTE VALIDAMOS LOS VALORES.
========================================================= */

if (btnGuardarTarifas) {

    btnGuardarTarifas.addEventListener(
        "click",
        () => {

            const tarifaBase =
                Number(
                    document.getElementById(
                        "tarifaBase"
                    ).value
                );


            const precioKm =
                Number(
                    document.getElementById(
                        "precioKm"
                    ).value
                );


            const tiendaAdicional =
                Number(
                    document.getElementById(
                        "tiendaAdicional"
                    ).value
                );


            const minimoRepartidor =
                Number(
                    document.getElementById(
                        "minimoRepartidor"
                    ).value
                );


            const maximoRepartidor =
                Number(
                    document.getElementById(
                        "maximoRepartidor"
                    ).value
                );


            /* -------------------------------------------------
               VALIDAR VALORES
            ------------------------------------------------- */

            const valores = [

                tarifaBase,

                precioKm,

                tiendaAdicional,

                minimoRepartidor,

                maximoRepartidor

            ];


            const valoresInvalidos =
                valores.some(
                    valor =>
                        !Number.isFinite(valor) ||
                        valor < 0
                );


            if (valoresInvalidos) {

                if (estadoConfiguracion) {

                    estadoConfiguracion.textContent =
                        "Revisa los valores ingresados.";

                }

                return;

            }


            /* -------------------------------------------------
               VALIDAR MÍNIMO / MÁXIMO
            ------------------------------------------------- */

            if (
                maximoRepartidor <
                minimoRepartidor
            ) {

                if (estadoConfiguracion) {

                    estadoConfiguracion.textContent =
                        "La comisión máxima no puede ser menor que la mínima.";

                }

                return;

            }


            /* -------------------------------------------------
               PREPARAR CONFIGURACIÓN
            ------------------------------------------------- */

            const configuracion = {

                tarifaBase,

                precioKm,

                tiendaAdicional,

                minimoRepartidor,

                maximoRepartidor

            };


            console.log(
                "⚙️ Configuración de tarifas:",
                configuracion
            );


            if (estadoConfiguracion) {

                estadoConfiguracion.textContent =
                    "Valores válidos. Listos para guardar en Firebase.";

            }

        }
    );

}


/* =========================================================
   INICIO DEL PANEL
========================================================= */

mostrarVista(
    "inicio"
);


console.log(
    "🚀 MOTI GO ADMIN: panel iniciado."
);
