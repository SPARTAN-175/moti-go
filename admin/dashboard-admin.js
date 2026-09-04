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


let listenerTiendas =
    null;


/* =========================================================
   ELEMENTOS — INVITACIONES
========================================================= */

const btnNuevaTienda =
    document.getElementById(
        "btnNuevaTienda"
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
   SISTEMA DE NOTIFICACIONES
========================================================= */

function crearContenedorNotificaciones() {

    let contenedor =
        document.getElementById(
            "motiNotificaciones"
        );


    if (contenedor) {

        return contenedor;

    }


    contenedor =
        document.createElement(
            "div"
        );


    contenedor.id =
        "motiNotificaciones";


    contenedor.className =
        "moti-notificaciones";


    document.body.appendChild(
        contenedor
    );


    return contenedor;

}


/* =========================================================
   MOSTRAR NOTIFICACIÓN
========================================================= */

function mostrarNotificacion(
    mensaje,
    tipo = "info",
    duracion = 4000
) {

    const contenedor =
        crearContenedorNotificaciones();


    const notificacion =
        document.createElement(
            "div"
        );


    notificacion.className =
        `moti-notificacion moti-notificacion-${tipo}`;


    let icono =
        "info";


    if (
        tipo ===
        "exito"
    ) {

        icono =
            "✓";

    }
    else if (
        tipo ===
        "error"
    ) {

        icono =
            "×";

    }
    else if (
        tipo ===
        "advertencia"
    ) {

        icono =
            "!";

    }


    notificacion.innerHTML = `

        <div class="moti-notificacion-icono">
            ${icono}
        </div>

        <div class="moti-notificacion-texto">
            ${escaparHTMLAdmin(
                mensaje
            )}
        </div>

        <button
            type="button"
            class="moti-notificacion-cerrar"
            aria-label="Cerrar"
        >
            ×
        </button>

    `;


    contenedor.appendChild(
        notificacion
    );


    requestAnimationFrame(
        () => {

            notificacion.classList.add(
                "visible"
            );

        }
    );


    const cerrar =
        notificacion.querySelector(
            ".moti-notificacion-cerrar"
        );


    const eliminar =
        () => {

            notificacion.classList.remove(
                "visible"
            );


            setTimeout(
                () => {

                    notificacion.remove();

                },
                250
            );

        };


    if (cerrar) {

        cerrar.addEventListener(
            "click",
            eliminar
        );

    }


    setTimeout(
        eliminar,
        duracion
    );

}


/* =========================================================
   ESCAPAR HTML
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
   EVENTO BOTÓN CERRAR MENÚ
========================================================= */

if (btnCerrarMenu) {

    btnCerrarMenu.addEventListener(
        "click",
        cerrarMenu
    );

}


/* =========================================================
   EVENTO OVERLAY
========================================================= */

if (sidebarOverlay) {

    sidebarOverlay.addEventListener(
        "click",
        cerrarMenu
    );

}


/* =========================================================
   CAMBIAR VISTA
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


    vistas.forEach(
        vista => {

            vista.classList.remove(
                "active"
            );

        }
    );


    const vistaSeleccionada =
        document.getElementById(
            `view-${nombreVista}`
        );


    if (vistaSeleccionada) {

        vistaSeleccionada.classList.add(
            "active"
        );

    }


    botonesMenu.forEach(
        boton => {

            boton.classList.toggle(
                "active",
                boton.dataset.view ===
                nombreVista
            );

        }
    );


    if (tituloVista) {

        tituloVista.textContent =
            informacion.titulo;

    }


    if (subtituloVista) {

        subtituloVista.textContent =
            informacion.subtitulo;

    }


    cerrarMenu();


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/* =========================================================
   EVENTOS DEL MENÚ
========================================================= */

botonesMenu.forEach(
    boton => {

        boton.addEventListener(
            "click",
            () => {

                mostrarVista(
                    boton.dataset.view
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
   CARGAR TIENDAS EN TIEMPO REAL
========================================================= */

function escucharTiendas() {

    if (!contenedorTiendas) {

        console.warn(
            "⚠️ MOTI GO ADMIN: no existe contenedorTiendas."
        );

        return;

    }


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

                            <article
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

                            </article>

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
   BOTÓN NUEVA TIENDA CUANDO LISTA VACÍA
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
        abrirModalNuevaTienda
    );

}


/* =========================================================
   MODAL — NUEVA TIENDA
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
   BOTÓN NUEVA TIENDA
========================================================= */

if (btnNuevaTienda) {

    btnNuevaTienda.addEventListener(
        "click",
        abrirModalNuevaTienda
    );

}


/* =========================================================
   CERRAR MODAL
========================================================= */

if (btnCerrarModalTienda) {

    btnCerrarModalTienda.addEventListener(
        "click",
        cerrarModalNuevaTienda
    );

}


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
   GENERAR CÓDIGO
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
   GENERAR QR
========================================================= */

function generarQRInvitacion(
    enlaceRegistro
) {

    const contenedor =
        document.getElementById(
            "qrInvitacionTienda"
        );


    if (!contenedor) {

        console.warn(
            "⚠️ No existe qrInvitacionTienda."
        );

        return;

    }


    contenedor.innerHTML =
        "";


    if (
        typeof QRCode ===
        "undefined"
    ) {

        contenedor.innerHTML = `

            <div class="qr-error">
                No se pudo cargar el generador QR.
            </div>

        `;

        console.error(
            "❌ QRCode no está disponible."
        );

        return;

    }


    new QRCode(
        contenedor,
        {

            text:
                enlaceRegistro,

            width:
                220,

            height:
                220,

            correctLevel:
                QRCode.CorrectLevel.H

        }
    );

}


/* =========================================================
   DESCARGAR QR
========================================================= */

function descargarQRInvitacion(
    codigo
) {

    const contenedor =
        document.getElementById(
            "qrInvitacionTienda"
        );


    if (!contenedor) {

        return;

    }


    const imagen =
        contenedor.querySelector(
            "img"
        );


    const canvas =
        contenedor.querySelector(
            "canvas"
        );


    let enlace =
        null;


    if (imagen) {

        enlace =
            document.createElement(
                "a"
            );


        enlace.href =
            imagen.src;

    }
    else if (canvas) {

        enlace =
            document.createElement(
                "a"
            );


        enlace.href =
            canvas.toDataURL(
                "image/png"
            );

    }


    if (!enlace) {

        mostrarNotificacion(
            "No se pudo preparar el QR para descargar.",
            "error"
        );

        return;

    }


    enlace.download =
        `MOTI-G-invitacion-${codigo}.png`;


    document.body.appendChild(
        enlace
    );


    enlace.click();


    enlace.remove();


    mostrarNotificacion(
        "QR guardado correctamente.",
        "exito"
    );

}


/* =========================================================
   CREAR INVITACIÓN
========================================================= */

async function crearInvitacionTienda() {

    if (!auth.currentUser) {

        mostrarNotificacion(
            "Tu sesión administrativa ya no está disponible.",
            "error"
        );

        return;

    }


    if (!btnGenerarInvitacion) {
        return;
    }


    try {

        btnGenerarInvitacion.disabled =
            true;


        btnGenerarInvitacion.textContent =
            "Generando...";


        let codigo;

        let referenciaInvitacion;

        let snapshotInvitacion;

        let intentos =
            0;


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


                    <div class="invitacion-qr-real">

                        <div
                            id="qrInvitacionTienda"
                            class="qr-invitacion"
                        ></div>

                        <p>
                            Escanea este código para abrir
                            directamente el registro de la tienda.
                        </p>

                    </div>


                    <div class="invitacion-acciones">

                        <button
                            type="button"
                            class="btn-principal btn-ancho"
                            id="btnCopiarInvitacion"
                        >
                            Copiar enlace
                        </button>


                        <button
                            type="button"
                            class="btn-secundario btn-ancho"
                            id="btnDescargarQR"
                        >
                            Descargar QR
                        </button>

                    </div>


                    <div class="invitacion-aviso">

                        🔒 Esta invitación es de un solo uso.
                        Después del registro quedará invalidada.

                    </div>

                </div>

            `;


            /* -------------------------------------------------
               GENERAR QR
            ------------------------------------------------- */

            generarQRInvitacion(
                enlaceRegistro
            );


            /* -------------------------------------------------
               COPIAR ENLACE
            ------------------------------------------------- */

            const btnCopiar =
                document.getElementById(
                    "btnCopiarInvitacion"
                );


            if (btnCopiar) {

                btnCopiar.addEventListener(
                    "click",
                    async () => {

                        try {

                            await navigator.clipboard.writeText(
                                enlaceRegistro
                            );


                            btnCopiar.textContent =
                                "✓ Enlace copiado";


                            mostrarNotificacion(
                                "Enlace copiado correctamente.",
                                "exito"
                            );


                            setTimeout(
                                () => {

                                    btnCopiar.textContent =
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


                            mostrarNotificacion(
                                "No se pudo copiar automáticamente el enlace.",
                                "error"
                            );

                        }

                    }
                );

            }


            /* -------------------------------------------------
               DESCARGAR QR
            ------------------------------------------------- */

            const btnDescargarQR =
                document.getElementById(
                    "btnDescargarQR"
                );


            if (btnDescargarQR) {

                btnDescargarQR.addEventListener(
                    "click",
                    () => {

                        descargarQRInvitacion(
                            codigo
                        );

                    }
                );

            }

        }


        mostrarNotificacion(
            "La invitación fue generada correctamente.",
            "exito"
        );


        console.log(
            "🏪 MOTI GO: invitación creada:",
            codigo
        );

    }
    catch (error) {

        console.error(
            "❌ Error creando invitación:",
            error
        );


        mostrarNotificacion(
            "No se pudo crear la invitación. Revisa Firebase y las reglas de Firestore.",
            "error",
            6000
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
        crearInvitacionTienda
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


        if (!usuario) {

            window.location.href =
                "../index.html";

            return;

        }


        try {

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


            if (!snapshot.exists()) {

                console.error(
                    "❌ El documento del usuario no existe."
                );


                mostrarNotificacion(
                    "No se encontró tu perfil administrativo.",
                    "error"
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


            if (
                datosUsuario.tipo !==
                "admin"
            ) {

                mostrarNotificacion(
                    "No tienes permisos para acceder al panel administrativo.",
                    "error",
                    5000
                );


                await signOut(
                    auth
                );


                window.location.href =
                    "../index.html";

                return;

            }


            console.log(
                "✅ MOTI GO ADMIN: acceso autorizado."
            );


            if (estadoAdmin) {

                estadoAdmin.textContent =
                    "Sesión administrativa activa";

            }


            const nombre =
                datosUsuario.nombre ||
                usuario.displayName ||
                usuario.email ||
                "Administrador";


            if (nombreAdmin) {

                nombreAdmin.textContent =
                    nombre;

            }


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
               INICIAR TIENDAS
            ------------------------------------------------- */

            escucharTiendas();

        }
        catch (error) {

            console.error(
                "❌ Error verificando administrador:",
                error
            );


            mostrarNotificacion(
                "No se pudo verificar tu cuenta administrativa.",
                "error",
                5000
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


                mostrarNotificacion(
                    "No se pudo cerrar la sesión.",
                    "error"
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


                mostrarNotificacion(
                    "Revisa los valores de las tarifas.",
                    "advertencia"
                );


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


                mostrarNotificacion(
                    "La comisión máxima no puede ser menor que la mínima.",
                    "advertencia"
                );


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


            mostrarNotificacion(
                "Los valores son válidos. La conexión con Firebase se agregará en el módulo de configuración.",
                "info"
            );

        }
    );

}


/* =========================================================
   INICIO
========================================================= */

mostrarVista(
    "inicio"
);


console.log(
    "🚀 MOTI GO ADMIN: panel iniciado."
);
