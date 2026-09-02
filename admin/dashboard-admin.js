/* =========================================================
   MOTI GO — PANEL DE ADMINISTRACIÓN
   dashboard-admin.js
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
   ELEMENTOS
========================================================= */

const estadoAdmin =
    document.getElementById("estadoAdmin");

const nombreAdmin =
    document.getElementById("nombreAdmin");

const btnCerrarSesion =
    document.getElementById("btnCerrarSesion");

const tituloVista =
    document.getElementById("tituloVista");

const subtituloVista =
    document.getElementById("subtituloVista");

const btnMarketplace =
    document.getElementById("btnMarketplace");

const btnGuardarTarifas =
    document.getElementById("btnGuardarTarifas");

const estadoConfiguracion =
    document.getElementById("estadoConfiguracion");


/* =========================================================
   INFORMACIÓN DE LAS VISTAS
========================================================= */

const informacionVistas = {

    inicio: {
        titulo: "Resumen",
        subtitulo:
            "Centro de operaciones de MOTI GO"
    },

    tiendas: {
        titulo: "Tiendas",
        subtitulo:
            "Administración de tiendas"
    },

    repartidores: {
        titulo: "Repartidores",
        subtitulo:
            "Gestión de repartidores"
    },

    clientes: {
        titulo: "Clientes",
        subtitulo:
            "Clientes registrados"
    },

    pedidos: {
        titulo: "Pedidos",
        subtitulo:
            "Operación y seguimiento"
    },

    finanzas: {
        titulo: "Finanzas",
        subtitulo:
            "Movimientos e ingresos"
    },

    carteras: {
        titulo: "Carteras",
        subtitulo:
            "Saldos y movimientos"
    },

    configuracion: {
        titulo: "Configuración",
        subtitulo:
            "Reglas generales de MOTI GO"
    },

    operadores: {
        titulo: "Operadores",
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
   CAMBIAR DE VISTA
========================================================= */

function mostrarVista(nombreVista) {

    const informacion =
        informacionVistas[nombreVista];

    if (!informacion) {
        return;
    }


    /* Ocultar todas las vistas */

    vistas.forEach(vista => {

        vista.classList.remove("active");

    });


    /* Mostrar la vista seleccionada */

    const vistaSeleccionada =
        document.getElementById(
            `view-${nombreVista}`
        );


    if (vistaSeleccionada) {

        vistaSeleccionada.classList.add(
            "active"
        );

    }


    /* Actualizar botón activo */

    botonesMenu.forEach(boton => {

        boton.classList.toggle(
            "active",
            boton.dataset.view === nombreVista
        );

    });


    /* Actualizar encabezado */

    tituloVista.textContent =
        informacion.titulo;

    subtituloVista.textContent =
        informacion.subtitulo;


    /* Regresar arriba */

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   EVENTOS DEL MENÚ
========================================================= */

botonesMenu.forEach(boton => {

    boton.addEventListener(
        "click",
        () => {

            mostrarVista(
                boton.dataset.view
            );

        }
    );

});


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
             * No mezclamos sus funciones
             * con este dashboard.
             */

            window.location.href =
                "./marketplace/dashboard-marketplace.html";

        }
    );

}


/* =========================================================
   VERIFICAR ADMINISTRADOR
========================================================= */

onAuthStateChanged(
    auth,
    async usuario => {

        console.log(
            "🔐 MOTI GO ADMIN: verificando sesión..."
        );


        /* -------------------------------------------------
           SIN SESIÓN
        ------------------------------------------------- */

        if (!usuario) {

            window.location.href =
                "../index.html";

            return;

        }


        try {

            /* Buscar usuario */

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
               USUARIO NO EXISTE
            ------------------------------------------------- */

            if (!snapshot.exists()) {

                console.error(
                    "❌ El documento del usuario no existe."
                );

                await signOut(auth);

                window.location.href =
                    "../index.html";

                return;

            }


            const datosUsuario =
                snapshot.data();


            /* -------------------------------------------------
               COMPROBAR TIPO
            ------------------------------------------------- */

            if (
                datosUsuario.tipo !== "admin"
            ) {

                alert(
                    "No tienes permisos para acceder al panel administrativo."
                );


                await signOut(auth);

                window.location.href =
                    "../index.html";

                return;

            }


            /* -------------------------------------------------
               ADMINISTRADOR AUTORIZADO
            ------------------------------------------------- */

            console.log(
                "✅ MOTI GO ADMIN: acceso autorizado."
            );


            estadoAdmin.textContent =
                "Sesión administrativa activa";


            /* Nombre */

            if (
                datosUsuario.nombre
            ) {

                nombreAdmin.textContent =
                    datosUsuario.nombre;

            }
            else if (
                usuario.displayName
            ) {

                nombreAdmin.textContent =
                    usuario.displayName;

            }
            else if (
                usuario.email
            ) {

                nombreAdmin.textContent =
                    usuario.email;

            }


            /* Avatar */

            const avatar =
                document.querySelector(
                    ".admin-avatar"
                );


            if (avatar) {

                const nombre =
                    datosUsuario.nombre ||
                    usuario.displayName ||
                    usuario.email ||
                    "A";


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

                await signOut(auth);

            }
            catch (errorLogout) {

                console.error(
                    "Error cerrando sesión:",
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


                await signOut(auth);


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
   POR AHORA SOLO VALIDAMOS LOS DATOS.
   FIRESTORE LO CONECTAREMOS EN EL SIGUIENTE PASO.
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
               VALIDACIONES
            ------------------------------------------------- */

            const valores = [
                tarifaBase,
                precioKm,
                tiendaAdicional,
                minimoRepartidor,
                maximoRepartidor
            ];


            if (
                valores.some(
                    valor =>
                        !Number.isFinite(valor) ||
                        valor < 0
                )
            ) {

                estadoConfiguracion.textContent =
                    "Revisa los valores ingresados.";

                return;

            }


            if (
                maximoRepartidor <
                minimoRepartidor
            ) {

                estadoConfiguracion.textContent =
                    "La comisión máxima no puede ser menor que la mínima.";

                return;

            }


            /* -------------------------------------------------
               DATOS PREPARADOS
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


            estadoConfiguracion.textContent =
                "Valores válidos. Listos para guardar en Firebase.";

        }
    );

}


/* =========================================================
   INICIO
========================================================= */

mostrarVista("inicio");

console.log(
    "🚀 MOTI GO ADMIN: panel iniciado."
);
