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
    collection,
    doc,
    getDoc,
    onSnapshot,
    setDoc,
    serverTimestamp
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
   ELEMENTOS — TIENDAS
========================================================= */

const contenedorTiendas =
    document.getElementById(
        "contenedorTiendas"
    );


/* =========================================================
   LISTENER DE TIENDAS
========================================================= */

let listenerTiendas =
    null;


/* =========================================================
   ELEMENTOS — INVITACIONES DE TIENDAS
========================================================= */

const btnNuevaTienda =
    document.getElementById(
        "btnNuevaTienda"
    );


const btnNuevaTiendaVacio =
    document.getElementById(
        "btnNuevaTiendaVacio"
    );


const modalNuevaTienda =
    document.getElementById(
        "modalNuevaTienda"
    );


const btnCerrarModalTienda =
    document.getElementById(
        "btnCerrarModalTienda"
    );


const btnGenerarInvitacion =
    document.getElementById(
        "btnGenerarInvitacion"
    );


const contenidoInvitacionTienda =
    document.getElementById(
        "contenidoInvitacionTienda"
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
       VOLVER AL INICIO
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

            window.location.href =
                "./marketplace/dashboard-marketplace.html";

        }
    );

}


/* =========================================================
   ESCAPAR TEXTO PARA HTML
========================================================= */

function escaparHTMLAdmin(
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


/* =========================================================
   MOSTRAR BOTÓN DE INVITACIÓN CUANDO NO HAY TIENDAS
========================================================= */

function configurarBotonNuevaTiendaVacio() {

    const boton =
        document.getElementById(
            "btnNuevaTiendaVacio"
        );


    if (!boton) {
        return;
    }


    boton.addEventListener(
        "click",
        () => {

            abrirModalNuevaTienda();

        }
    );

}


/* =========================================================
   CARGAR TIENDAS EN TIEMPO REAL
========================================================= */

function escucharTiendas() {

    if (!contenedorTiendas) {

        console.warn(
            "⚠️ MOTI GO ADMIN: no existe contenedorTiendas."
        );

        return;

    }


    /* -----------------------------------------------------
       EVITAR LISTENERS DUPLICADOS
    ----------------------------------------------------- */

    if (listenerTiendas) {

        listenerTiendas();

        listenerTiendas =
            null;

    }


    console.log(
        "👂 MOTI GO ADMIN: escuchando colección tiendas..."
    );


    const referenciaTiendas =
        collection(
            db,
            "tiendas"
        );


    listenerTiendas =
        onSnapshot(

            referenciaTiendas,

            snapshot => {

                console.log(
                    "🏪 MOTI GO ADMIN: tiendas recibidas:",
                    snapshot.size
                );


                /* -----------------------------------------
                   NO HAY TIENDAS
                ----------------------------------------- */

                if (
                    snapshot.empty
                ) {

                    contenedorTiendas.innerHTML = `

                        <div class="tiendas-vacio">

                            <div class="tiendas-vacio-icono">
                                🏪
                            </div>

                            <h3>
                                Aún no hay tiendas registradas
                            </h3>

                            <p>
                                Genera una invitación para que
                                una nueva tienda pueda registrarse.
                            </p>

                            <button
                                class="btn-generar"
                                id="btnNuevaTiendaVacio"
                                type="button"
                            >
                                + Generar invitación
                            </button>

                        </div>

                    `;


                    configurarBotonNuevaTiendaVacio();


                    return;

                }


                /* -----------------------------------------
                   OBTENER TIENDAS
                ----------------------------------------- */

                const tiendas =
                    snapshot.docs.map(
                        documento => {

                            return {

                                id:
                                    documento.id,

                                ...documento.data()

                            };

                        }
                    );


                /* -----------------------------------------
                   ORDENAR POR NOMBRE
                ----------------------------------------- */

                tiendas.sort(
                    (a, b) => {

                        return String(
                            a.nombre || ""
                        ).localeCompare(
                            String(
                                b.nombre || ""
                            ),
                            "es"
                        );

                    }
                );


                /* -----------------------------------------
                   CONSTRUIR HTML
                ----------------------------------------- */

                let html =
                    "";


                tiendas.forEach(
                    tienda => {

                        const activa =
                            tienda.activa !== false;


                        const estadoTexto =
                            activa
                                ? "Activa"
                                : "Suspendida";


                        const estadoClase =
                            activa
                                ? "activa"
                                : "suspendida";


                        const tipo =
                            tienda.tipo ||
                            "Sin tipo";


                        const ubicacion =
                            tienda.direccion ||
                            tienda.municipio ||
                            "Sin dirección";


                        html += `

                            <div
                                class="tienda-admin-card"
                            >

                                <div
                                    class="tienda-admin-icono"
                                >
                                    🏪
                                </div>


                                <div
                                    class="tienda-admin-info"
                                >

                                    <div
                                        class="tienda-admin-titulo"
                                    >

                                        <h3>
                                            ${escaparHTMLAdmin(
                                                tienda.nombre ||
                                                "Tienda sin nombre"
                                            )}
                                        </h3>


                                        <span
                                            class="tienda-admin-estado ${estadoClase}"
                                        >
                                            ${estadoTexto}
                                        </span>

                                    </div>


                                    <div
                                        class="tienda-admin-datos"
                                    >

                                        <span>
                                            ${escaparHTMLAdmin(
                                                tipo
                                            )}
                                        </span>


                                        <span>
                                            ${escaparHTMLAdmin(
                                                ubicacion
                                            )}
                                        </span>

                                    </div>

                                </div>


                                <div
                                    class="tienda-admin-id"
                                >

                                    <span>
                                        ID
                                    </span>


                                    <strong>
                                        ${escaparHTMLAdmin(
                                            tienda.id
                                        )}
                                    </strong>

                                </div>

                            </div>

                        `;

                    }
                );


                contenedorTiendas.innerHTML =
                    html;

            },

            error => {

                console.error(
                    "❌ MOTI GO ADMIN: error escuchando tiendas:",
                    error
                );


                contenedorTiendas.innerHTML = `

                    <div class="tiendas-vacio">

                        <div class="tiendas-vacio-icono">
                            ⚠️
                        </div>

                        <h3>
                            No pudimos cargar las tiendas
                        </h3>

                        <p>
                            Revisa las reglas de Firestore
                            y vuelve a intentarlo.
                        </p>

                    </div>

                `;

            }

        );

}


/* =========================================================
   MODAL — INVITACIÓN DE TIENDA
========================================================= */

function abrirModalNuevaTienda() {

    if (!modalNuevaTienda) {
        return;
    }


    modalNuevaTienda.classList.add(
        "active"
    );


    modalNuevaTienda.setAttribute(
        "aria-hidden",
        "false"
    );

}


function cerrarModalNuevaTienda() {

    if (!modalNuevaTienda) {
        return;
    }


    modalNuevaTienda.classList.remove(
        "active"
    );


    modalNuevaTienda.setAttribute(
        "aria-hidden",
        "true"
    );

}


/* =========================================================
   BOTONES PARA ABRIR EL MODAL
========================================================= */

if (btnNuevaTienda) {

    btnNuevaTienda.addEventListener(
        "click",
        () => {

            abrirModalNuevaTienda();

        }
    );

}


if (btnNuevaTiendaVacio) {

    btnNuevaTiendaVacio.addEventListener(
        "click",
        () => {

            abrirModalNuevaTienda();

        }
    );

}


/* =========================================================
   CERRAR MODAL
========================================================= */

if (btnCerrarModalTienda) {

    btnCerrarModalTienda.addEventListener(
        "click",
        () => {

            cerrarModalNuevaTienda();

        }
    );

}


/* =========================================================
   CERRAR MODAL AL HACER CLIC EN EL FONDO
========================================================= */

if (modalNuevaTienda) {

    modalNuevaTienda.addEventListener(
        "click",
        evento => {

            if (
                evento.target ===
                modalNuevaTienda
            ) {

                cerrarModalNuevaTienda();

            }

        }
    );

}


/* =========================================================
   GENERAR CÓDIGO DE INVITACIÓN
========================================================= */

function generarCodigoInvitacion() {

    const caracteres =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    let codigo =
        "MG-";


    for (
        let i = 0;
        i < 8;
        i++
    ) {

        const posicion =
            Math.floor(
                Math.random() *
                caracteres.length
            );


        codigo +=
            caracteres[
                posicion
            ];

    }


    return codigo;

}


/* =========================================================
   GENERAR INVITACIÓN
========================================================= */

async function crearInvitacionTienda() {

    if (!auth.currentUser) {

        alert(
            "Tu sesión administrativa ya no está disponible."
        );

        return;

    }


    if (!btnGenerarInvitacion) {
        return;
    }


    try {

        /* -------------------------------------------------
           DESACTIVAR BOTÓN
        ------------------------------------------------- */

        btnGenerarInvitacion.disabled =
            true;


        btnGenerarInvitacion.textContent =
            "Generando...";


        /* -------------------------------------------------
           GENERAR CÓDIGO ÚNICO
        ------------------------------------------------- */

        let codigo;

        let referenciaInvitacion;

        let snapshotInvitacion;

        let intentos = 0;


        do {

            codigo =
                generarCodigoInvitacion();


            referenciaInvitacion =
                doc(
                    db,
                    "invitacionesTiendas",
                    codigo
                );


            snapshotInvitacion =
                await getDoc(
                    referenciaInvitacion
                );


            intentos++;

        }
        while (
            snapshotInvitacion.exists() &&
            intentos < 5
        );


        if (
            snapshotInvitacion.exists()
        ) {

            throw new Error(
                "No fue posible generar un código único."
            );

        }


        /* -------------------------------------------------
           GUARDAR INVITACIÓN
        ------------------------------------------------- */

        await setDoc(
            referenciaInvitacion,
            {

                codigo,

                estado:
                    "pendiente",

                creadoPor:
                    auth.currentUser.uid,

                creadoEn:
                    serverTimestamp(),

                usadoEn:
                    null,

                tiendaId:
                    null

            }
        );


        /* -------------------------------------------------
           CREAR ENLACE
        ------------------------------------------------- */

        const enlace =
            new URL(
                "../registro-tienda.html",
                window.location.href
            );


        enlace.searchParams.set(
            "codigo",
            codigo
        );


        const enlaceRegistro =
            enlace.href;

       const qrContenedor =
    document.getElementById(
        "qrInvitacionTienda"
    );

if (qrContenedor) {

    qrContenedor.innerHTML = "";

    new QRCode(
        qrContenedor,
        {
            text: enlaceRegistro,
            width: 220,
            height: 220,
            correctLevel:
                QRCode.CorrectLevel.H
        }
    );

}


        /* -------------------------------------------------
           MOSTRAR RESULTADO
        ------------------------------------------------- */

        if (contenidoInvitacionTienda) {

            contenidoInvitacionTienda.innerHTML = `

                <div class="invitacion-generada">

                    <div class="invitacion-exito">
                        ✓ Invitación generada
                    </div>


                    <div class="invitacion-bloque">

                        <span class="invitacion-label">
                            Código de invitación
                        </span>


                        <strong class="invitacion-codigo">
                            ${codigo}
                        </strong>

                    </div>


                    <div class="invitacion-bloque">

                        <span class="invitacion-label">
                            Enlace de registro
                        </span>


                        <div class="invitacion-enlace">
                            ${escaparHTMLAdmin(
                                enlaceRegistro
                            )}
                        </div>

                    </div>


                    <button
                        type="button"
                        class="btn-principal btn-ancho"
                        id="btnCopiarInvitacion"
                    >
                        Copiar enlace
                    </button>


                    <div class="invitacion-qr-pendiente">

   <div
    id="qrInvitacionTienda"
    class="qr-invitacion">
</div>


                        <p>
                            El código QR lo agregaremos
                            en el siguiente paso.
                        </p>

                    </div>


                    <div class="invitacion-aviso">

                        🔒 Esta invitación es de un solo uso.
                        Después del registro quedará invalidada.

                    </div>

                </div>

            `;


            /* -------------------------------------------------
               BOTÓN COPIAR
            ------------------------------------------------- */

            const btnCopiarInvitacion =
                document.getElementById(
                    "btnCopiarInvitacion"
                );


            if (btnCopiarInvitacion) {

                btnCopiarInvitacion.addEventListener(
                    "click",
                    async () => {

                        try {

                            await navigator.clipboard.writeText(
                                enlaceRegistro
                            );


                            btnCopiarInvitacion.textContent =
                                "✓ Enlace copiado";


                            setTimeout(
                                () => {

                                    btnCopiarInvitacion.textContent =
                                        "Copiar enlace";

                                },
                                2000
                            );

                        }
                        catch (error) {

                            console.error(
                                "Error copiando enlace:",
                                error
                            );


                            alert(
                                "No se pudo copiar automáticamente. Copia el enlace manualmente."
                            );

                        }

                    }
                );

            }

        }


        console.log(
            "🏪 MOTI GO: invitación de tienda creada:",
            codigo
        );

    }
    catch (error) {

        console.error(
            "❌ Error creando invitación:",
            error
        );


        alert(
            "No se pudo crear la invitación. Revisa Firebase y las reglas de Firestore."
        );

    }
    finally {

        if (btnGenerarInvitacion) {

            btnGenerarInvitacion.disabled =
                false;


            btnGenerarInvitacion.textContent =
                "Generar invitación";

        }

    }

}


/* =========================================================
   EVENTO — GENERAR INVITACIÓN
========================================================= */

if (btnGenerarInvitacion) {

    btnGenerarInvitacion.addEventListener(
        "click",
        () => {

            crearInvitacionTienda();

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


            /* -------------------------------------------------
               ESCUCHAR TIENDAS
               
               IMPORTANTE:
               Esto ocurre DESPUÉS de comprobar que el
               usuario realmente es administrador.
            ------------------------------------------------- */

            escucharTiendas();

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
