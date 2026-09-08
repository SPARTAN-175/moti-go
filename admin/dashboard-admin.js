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
    getDocs,
    onSnapshot,
    setDoc,
    updateDoc,
    addDoc,
    serverTimestamp
} from
"https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================================================
   ELEMENTOS PRINCIPALES
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


/* =========================================================
   MENÚ
========================================================= */

const btnMenu =
    document.getElementById("btnMenu");

const btnCerrarMenu =
    document.getElementById("btnCerrarMenu");

const sidebar =
    document.getElementById("sidebar");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");

const btnMarketplace =
    document.getElementById("btnMarketplace");


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const btnGuardarTarifas =
    document.getElementById("btnGuardarTarifas");

const estadoConfiguracion =
    document.getElementById("estadoConfiguracion");


/* =========================================================
   TIENDAS
========================================================= */

const contenedorTiendas =
    document.getElementById("contenedorTiendas");

let listenerTiendas = null;
let tiendasActuales = [];


/* =========================================================
   INVITACIONES
========================================================= */

const btnNuevaTienda =
    document.getElementById("btnNuevaTienda");

const modalNuevaTienda =
    document.getElementById("modalNuevaTienda");

const btnCerrarModalTienda =
    document.getElementById("btnCerrarModalTienda");

const btnGenerarInvitacion =
    document.getElementById("btnGenerarInvitacion");

const contenidoInvitacionTienda =
    document.getElementById(
        "contenidoInvitacionTienda"
    );


/* =========================================================
   DATOS ADMINISTRATIVOS
========================================================= */

let repartidoresActuales = [];
let clientesActuales = [];
let pedidosActuales = [];

let movimientosTiendasActuales = [];

let listenerUsuarios = null;
let listenerPedidos = null;
let listenerMovimientosTiendas = null;

let configuracionMOTI = {
    tarifaBase: 8,
    precioKm: 2,
    tiendaAdicional: 4,
    minimoRepartidor: 10,
    maximoRepartidor: 60,
    comisionTiendaPorcentaje: 10,
    comisionFundadorPorcentaje: 100
};


/* =========================================================
   INFORMACIÓN DE VISTAS
========================================================= */

const informacionVistas = {

    inicio: {
        titulo: "Resumen",
        subtitulo: "Centro de operaciones de MOTI GO"
    },

    tiendas: {
        titulo: "Tiendas",
        subtitulo: "Administración de tiendas"
    },

    repartidores: {
        titulo: "Repartidores",
        subtitulo: "Gestión de repartidores"
    },

    clientes: {
        titulo: "Clientes",
        subtitulo: "Clientes registrados"
    },

    pedidos: {
        titulo: "Pedidos",
        subtitulo: "Operación y seguimiento"
    },

    finanzas: {
        titulo: "Finanzas",
        subtitulo: "Movimientos e ingresos"
    },

    carteras: {
        titulo: "Carteras",
        subtitulo: "Saldos y movimientos"
    },

    configuracion: {
        titulo: "Configuración",
        subtitulo: "Reglas generales de MOTI GO"
    },

    operadores: {
        titulo: "Operadores",
        subtitulo: "Cuentas administrativas"
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
    document.querySelectorAll(".view");


/* =========================================================
   NOTIFICACIONES
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
        document.createElement("div");

    contenedor.id =
        "motiNotificaciones";

    contenedor.className =
        "moti-notificaciones";

    document.body.appendChild(
        contenedor
    );

    return contenedor;
}


function mostrarNotificacion(
    mensaje,
    tipo = "info",
    duracion = 4000
) {

    const contenedor =
        crearContenedorNotificaciones();

    const notificacion =
        document.createElement("div");

    notificacion.className =
        `moti-notificacion moti-notificacion-${tipo}`;

    let icono = "i";

    if (tipo === "exito") {
        icono = "✓";
    }

    if (tipo === "error") {
        icono = "×";
    }

    if (tipo === "advertencia") {
        icono = "!";
    }

    notificacion.innerHTML = `

        <div class="moti-notificacion-icono">
            ${icono}
        </div>

        <div class="moti-notificacion-texto">
            ${escaparHTMLAdmin(mensaje)}
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

    requestAnimationFrame(() => {

        notificacion.classList.add(
            "visible"
        );

    });

    const cerrar =
        notificacion.querySelector(
            ".moti-notificacion-cerrar"
        );

    const eliminar = () => {

        notificacion.classList.remove(
            "visible"
        );

        setTimeout(() => {

            notificacion.remove();

        }, 250);

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

function escaparHTMLAdmin(texto) {

    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   FORMATO MONEDA
========================================================= */

function moneda(valor) {

    const numero =
        Number(valor);

    if (!Number.isFinite(numero)) {
        return "$0.00";
    }

    return numero.toLocaleString(
        "es-MX",
        {
            style: "currency",
            currency: "MXN"
        }
    );
}


/* =========================================================
   ABRIR MENÚ
========================================================= */

function abrirMenu() {

    if (!sidebar) {
        return;
    }

    sidebar.classList.add("open");

    if (sidebarOverlay) {
        sidebarOverlay.classList.add("active");
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

    sidebar.classList.remove("open");

    if (sidebarOverlay) {
        sidebarOverlay.classList.remove("active");
    }

    if (btnMenu) {

        btnMenu.setAttribute(
            "aria-expanded",
            "false"
        );

    }
}


if (btnMenu) {

    btnMenu.addEventListener(
        "click",
        () => {

            if (
                sidebar &&
                sidebar.classList.contains("open")
            ) {

                cerrarMenu();

            }
            else {

                abrirMenu();

            }

        }
    );

}


if (btnCerrarMenu) {

    btnCerrarMenu.addEventListener(
        "click",
        cerrarMenu
    );

}


if (sidebarOverlay) {

    sidebarOverlay.addEventListener(
        "click",
        cerrarMenu
    );

}


/* =========================================================
   CAMBIAR VISTA
========================================================= */

function mostrarVista(nombreVista) {

    const informacion =
        informacionVistas[nombreVista];

    if (!informacion) {
        return;
    }

    vistas.forEach(vista => {

        vista.classList.remove(
            "active"
        );

    });

    const vistaSeleccionada =
        document.getElementById(
            `view-${nombreVista}`
        );

    if (vistaSeleccionada) {

        vistaSeleccionada.classList.add(
            "active"
        );

    }

    botonesMenu.forEach(boton => {

        boton.classList.toggle(
            "active",
            boton.dataset.view === nombreVista
        );

    });

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


    /* -----------------------------------------------------
       CARGAS ESPECÍFICAS
    ----------------------------------------------------- */

    if (nombreVista === "repartidores") {
        renderizarRepartidores();
    }

    if (nombreVista === "clientes") {
        renderizarClientes();
    }

    if (nombreVista === "pedidos") {
        renderizarPedidos();
    }

    if (nombreVista === "finanzas") {
        renderizarFinanzas();
    }

    if (nombreVista === "carteras") {
        renderizarCarteras();
    }

    if (nombreVista === "configuracion") {
        prepararConfiguracion();
    }

}


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

            window.location.href =
                "./marketplace/dashboard-marketplace.html";

        }
    );

}


/* =========================================================
   TIENDAS
========================================================= */

function escucharTiendas() {

    if (!contenedorTiendas) {
        return;
    }

    if (listenerTiendas) {

        listenerTiendas();

        listenerTiendas =
            null;

    }

    const referencia =
        collection(
            db,
            "tiendas"
        );

    listenerTiendas =
        onSnapshot(
            referencia,
            snapshot => {

                tiendasActuales =
                    snapshot.docs.map(
                        documento => {

                            return {
                                id: documento.id,
                                ...documento.data()
                            };

                        }
                    );

                tiendasActuales.sort(
                    (a, b) =>
                        String(
                            a.nombre || ""
                        ).localeCompare(
                            String(
                                b.nombre || ""
                            ),
                            "es"
                        )
                );

                renderizarTiendas(
                    tiendasActuales
                );

            },
            error => {

                console.error(
                    "Error escuchando tiendas:",
                    error
                );

                contenedorTiendas.innerHTML = `

                    <div class="admin-empty">

                        <div class="admin-empty-icon">
                            ⚠️
                        </div>

                        <h3>
                            No pudimos cargar las tiendas
                        </h3>

                        <p>
                            Revisa las reglas de Firestore.
                        </p>

                    </div>

                `;

            }
        );

}


/* =========================================================
   RENDER TIENDAS
========================================================= */

function renderizarTiendas(
    tiendas
) {

    if (!contenedorTiendas) {
        return;
    }

    if (!tiendas.length) {

        contenedorTiendas.innerHTML = `

            <div class="admin-empty">

                <div class="admin-empty-icon">
                    🏪
                </div>

                <h3>
                    Aún no hay tiendas registradas
                </h3>

                <p>
                    Genera una invitación para incorporar
                    una nueva tienda a MOTI GO.
                </p>

                <button
                    id="btnNuevaTiendaVacio"
                    class="btn-generar"
                    type="button"
                >
                    + Generar invitación
                </button>

            </div>

        `;

        const boton =
            document.getElementById(
                "btnNuevaTiendaVacio"
            );

        if (boton) {

            boton.addEventListener(
                "click",
                abrirModalNuevaTienda
            );

        }

        return;
    }


    contenedorTiendas.innerHTML = `

        <div class="admin-toolbar">

            <div class="admin-search">

                <span>⌕</span>

                <input
                    id="buscarTiendasAdmin"
                    type="search"
                    placeholder="Buscar tienda..."
                    autocomplete="off"
                >

            </div>

            <button
                id="btnFiltrosTiendas"
                class="admin-filter-button"
                type="button"
            >
                ☷ Filtros
            </button>

        </div>


        <div
            id="filtrosTiendasAdmin"
            class="admin-filter-panel"
        >

            <button
                class="admin-filter active"
                data-filtro-tienda="todas"
                type="button"
            >
                Todas
            </button>

            <button
                class="admin-filter"
                data-filtro-tienda="activas"
                type="button"
            >
                Activas
            </button>

            <button
                class="admin-filter"
                data-filtro-tienda="suspendidas"
                type="button"
            >
                Suspendidas
            </button>

        </div>


        <div
            id="listaTiendasAdmin"
            class="admin-lista"
        ></div>

    `;


    const lista =
        document.getElementById(
            "listaTiendasAdmin"
        );

    let filtroActual =
        "todas";


    function actualizar() {

        const texto =
            document.getElementById(
                "buscarTiendasAdmin"
            )?.value
            .trim()
            .toLowerCase() || "";


        let resultado =
            tiendas.filter(
                tienda => {

                    const activa =
                        tienda.activa !== false;

                    if (
                        filtroActual ===
                        "activas" &&
                        !activa
                    ) {
                        return false;
                    }

                    if (
                        filtroActual ===
                        "suspendidas" &&
                        activa
                    ) {
                        return false;
                    }

                    const nombre =
                        String(
                            tienda.nombre || ""
                        ).toLowerCase();

                    const municipio =
                        String(
                            tienda.municipio || ""
                        ).toLowerCase();

                    const tipo =
                        String(
                            tienda.tipo || ""
                        ).toLowerCase();

                    return (
                        nombre.includes(texto) ||
                        municipio.includes(texto) ||
                        tipo.includes(texto)
                    );

                }
            );


        lista.innerHTML =
            resultado.map(
                crearTarjetaTienda
            ).join("");


        configurarAdministrarTiendas();

    }


    const buscador =
        document.getElementById(
            "buscarTiendasAdmin"
        );

    if (buscador) {

        buscador.addEventListener(
            "input",
            actualizar
        );

    }


    const btnFiltros =
        document.getElementById(
            "btnFiltrosTiendas"
        );

    const panelFiltros =
        document.getElementById(
            "filtrosTiendasAdmin"
        );

    if (btnFiltros) {

        btnFiltros.addEventListener(
            "click",
            () => {

                panelFiltros.classList.toggle(
                    "visible"
                );

            }
        );

    }


    panelFiltros
        ?.querySelectorAll(
            "[data-filtro-tienda]"
        )
        .forEach(boton => {

            boton.addEventListener(
                "click",
                () => {

                    filtroActual =
                        boton.dataset.filtroTienda;

                    panelFiltros
                        .querySelectorAll(
                            ".admin-filter"
                        )
                        .forEach(
                            elemento =>
                                elemento.classList.remove(
                                    "active"
                                )
                        );

                    boton.classList.add(
                        "active"
                    );

                    actualizar();

                }
            );

        });


    actualizar();

}


/* =========================================================
   TARJETA TIENDA
========================================================= */

function crearTarjetaTienda(tienda) {

    const activa =
        tienda.activa !== false;

    const estado =
        activa
            ? "Activa"
            : "Suspendida";

    const clase =
        activa
            ? "activa"
            : "suspendida";

    return `

        <article
            class="admin-card entidad-tienda"
        >

            <div class="admin-card-icon">
                🏪
            </div>


            <div class="admin-card-main">

                <div class="admin-card-title-row">

                    <h3>
                        ${escaparHTMLAdmin(
                            tienda.nombre ||
                            "Tienda sin nombre"
                        )}
                    </h3>

                    <span
                        class="admin-status ${clase}"
                    >
                        ${estado}
                    </span>

                </div>


                <div class="admin-card-meta">

                    <span>
                        ${escaparHTMLAdmin(
                            tienda.tipo ||
                            "Sin tipo"
                        )}
                    </span>

                    <span>
                        ${escaparHTMLAdmin(
                            tienda.municipio ||
                            "Sin municipio"
                        )}
                    </span>

                </div>


                <div class="admin-card-finance">

                    <div>

                        <span>
                            Comisión pendiente
                        </span>

                        <strong>
                            $0.00
                        </strong>

                    </div>

                    <div>

                        <span>
                            Ventas
                        </span>

                        <strong>
                            —
                        </strong>

                    </div>

                </div>

            </div>


            <div class="admin-card-actions">

                <button
                    type="button"
                    class="admin-button-primary"
                    data-administrar-tienda="${escaparHTMLAdmin(
                        tienda.id
                    )}"
                >
                    Administrar
                </button>

            </div>

        </article>

    `;

}


/* =========================================================
   ADMINISTRAR TIENDAS
========================================================= */

function configurarAdministrarTiendas() {

    document
        .querySelectorAll(
            "[data-administrar-tienda]"
        )
        .forEach(boton => {

            boton.addEventListener(
                "click",
                () => {

                    const tienda =
                        tiendasActuales.find(
                            elemento =>
                                elemento.id ===
                                boton.dataset.administrarTienda
                        );

                    if (tienda) {

                        abrirModalAdministrarTienda(
                            tienda
                        );

                    }

                }
            );

        });

}


/* =========================================================
   MODAL ADMIN TIENDA
========================================================= */

function abrirModalAdministrarTienda(
    tienda
) {

    cerrarModalAdminGenerico();


    const activa =
        tienda.activa !== false;


    const modal =
        document.createElement("div");

    modal.id =
        "modalAdminTienda";

    modal.className =
        "admin-modal";

    modal.innerHTML = `

        <div class="admin-modal-content">

            <div class="admin-modal-header">

                <div>

                    <span class="admin-modal-kicker">
                        Administración
                    </span>

                    <h2>
                        ${escaparHTMLAdmin(
                            tienda.nombre ||
                            "Tienda"
                        )}
                    </h2>

                    <p>
                        Control administrativo del negocio.
                    </p>

                </div>

                <button
                    type="button"
                    class="admin-modal-close"
                    id="cerrarModalAdminTienda"
                >
                    ×
                </button>

            </div>


            <div class="admin-modal-body">


                <div class="admin-detail-status">

                    <span>
                        Estado actual
                    </span>

                    <strong
                        class="${activa ? "activo" : "suspendido"}"
                    >
                        ${activa ? "ACTIVA" : "SUSPENDIDA"}
                    </strong>

                </div>


                <div class="admin-detail-grid">

                    <div>
                        <span>Tipo</span>
                        <strong>
                            ${escaparHTMLAdmin(
                                tienda.tipo ||
                                "—"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Municipio</span>
                        <strong>
                            ${escaparHTMLAdmin(
                                tienda.municipio ||
                                "—"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Dirección</span>
                        <strong>
                            ${escaparHTMLAdmin(
                                tienda.direccion ||
                                "—"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>ID</span>
                        <strong>
                            ${escaparHTMLAdmin(
                                tienda.id
                            )}
                        </strong>
                    </div>

                </div>


                <div class="admin-detail-section">

                    <h3>
                        Estado de la tienda
                    </h3>

                    <p>
                        Una tienda suspendida dejará de estar
                        disponible para nuevas compras desde
                        los módulos que respeten el campo
                        <strong>activa</strong>.
                    </p>


                    <button
                        type="button"
                        id="btnCambiarEstadoTienda"
                        class="${
                            activa
                                ? "admin-button-danger"
                                : "admin-button-primary"
                        }"
                    >
                        ${
                            activa
                                ? "Suspender tienda"
                                : "Reactivar tienda"
                        }
                    </button>

                </div>

                <div class="admin-detail-section">

    <h3>
        Comisión MOTI
    </h3>

    <p>
        Define el porcentaje que MOTI GO recibirá
        de las ventas realizadas mediante Mandaditos
        en esta tienda.
    </p>

    <div class="field">

        <label for="comisionTiendaAdmin">
            Comisión de la tienda
        </label>

        <div class="config-input-suffix">

            <input
                id="comisionTiendaAdmin"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value="${
                    Number.isFinite(
                        Number(
                            tienda.comisionTiendaPorcentaje
                        )
                    )
                        ? tienda.comisionTiendaPorcentaje
                        : configuracionMOTI.comisionTiendaPorcentaje
                }"
            >

            <span>
                %
            </span>

        </div>

        <small>
            Esta comisión se descuenta de la venta
            de la tienda. No se suma al cliente.
        </small>

    </div>

    <div class="config-actions">

        <span
            class="save-status"
            id="estadoComisionTiendaAdmin"
        >
            Configuración actual.
        </span>

        <button
            type="button"
            id="btnGuardarComisionTiendaAdmin"
            class="btn-primary"
        >
            Guardar comisión
        </button>

    </div>

</div>


                <div class="admin-detail-section">

                    <h3>
                        Finanzas
                    </h3>

                    <div class="admin-finance-preview">

                        <div>

                            <span>
                                Comisión generada
                            </span>

                            <strong>
                                $0.00
                            </strong>

                        </div>

                        <div>

                            <span>
                                Pagado a MOTI
                            </span>

                            <strong>
                                $0.00
                            </strong>

                        </div>

                        <div>

                            <span>
                                Pendiente
                            </span>

                            <strong>
                                $0.00
                            </strong>

                        </div>

                    </div>

                    <p class="admin-muted">
                        El control contable se alimentará de
                        los pedidos que empiecen a guardar
                        la comisión MOTI.
                    </p>

                </div>


            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    requestAnimationFrame(() => {

        modal.classList.add(
            "visible"
        );

    });


    document
        .getElementById(
            "cerrarModalAdminTienda"
        )
        ?.addEventListener(
            "click",
            () => modal.remove()
        );


    modal.addEventListener(
        "click",
        evento => {

            if (
                evento.target ===
                modal
            ) {

                modal.remove();

            }

        }
    );


    document
        .getElementById(
            "btnCambiarEstadoTienda"
        )
        ?.addEventListener(
            "click",
            async () => {

                await cambiarEstadoTienda(
                    tienda
                );

            }
        );

   document
    .getElementById(
        "btnGuardarComisionTiendaAdmin"
    )
    ?.addEventListener(
        "click",
        async () => {

            await guardarComisionTiendaAdmin(
                tienda
            );

        }
    );

}

/* =========================================================
   GUARDAR COMISIÓN INDIVIDUAL DE TIENDA
========================================================= */

async function guardarComisionTiendaAdmin(
    tienda
) {

    const campo =
        document.getElementById(
            "comisionTiendaAdmin"
        );


    if (!campo) {
        return;
    }


    const porcentaje =
        Number(
            campo.value
        );


    if (
        !Number.isFinite(porcentaje) ||
        porcentaje < 0 ||
        porcentaje > 100
    ) {

        mostrarNotificacion(
            "La comisión debe estar entre 0 % y 100 %.",
            "advertencia"
        );

        return;

    }


    const boton =
        document.getElementById(
            "btnGuardarComisionTiendaAdmin"
        );


    try {

        if (boton) {

            boton.disabled =
                true;

            boton.textContent =
                "Guardando...";

        }


        await updateDoc(
            doc(
                db,
                "tiendas",
                tienda.id
            ),
            {

                comisionTiendaPorcentaje:
                    porcentaje,

                comisionTiendaActualizadaPor:
                    auth.currentUser?.uid ||
                    null,

                comisionTiendaActualizadaEn:
                    serverTimestamp()

            }
        );


        const estado =
            document.getElementById(
                "estadoComisionTiendaAdmin"
            );


        if (estado) {

            estado.textContent =
                "Comisión guardada correctamente.";

        }


        mostrarNotificacion(
            `Comisión de ${porcentaje}% guardada correctamente.`,
            "exito"
        );

    }
    catch (error) {

        console.error(
            "Error guardando comisión de tienda:",
            error
        );


        mostrarNotificacion(
            "No se pudo guardar la comisión de la tienda.",
            "error"
        );

    }
    finally {

        if (boton) {

            boton.disabled =
                false;

            boton.textContent =
                "Guardar comisión";

        }

    }

}


function cerrarModalAdminGenerico() {

    const anterior =
        document.getElementById(
            "modalAdminTienda"
        );

    if (anterior) {
        anterior.remove();
    }

}


/* =========================================================
   ACTIVAR / SUSPENDER TIENDA
========================================================= */

async function cambiarEstadoTienda(
    tienda
) {

    const nuevoEstado =
        tienda.activa === false;

    try {

        const boton =
            document.getElementById(
                "btnCambiarEstadoTienda"
            );

        if (boton) {

            boton.disabled =
                true;

            boton.textContent =
                "Guardando...";

        }


        await updateDoc(
            doc(
                db,
                "tiendas",
                tienda.id
            ),
            {
                activa:
                    nuevoEstado
            }
        );


        mostrarNotificacion(
            nuevoEstado
                ? "La tienda fue reactivada correctamente."
                : "La tienda fue suspendida correctamente.",
            "exito"
        );


        cerrarModalAdminGenerico();

    }
    catch (error) {

        console.error(
            "Error cambiando estado de tienda:",
            error
        );

        mostrarNotificacion(
            "No se pudo actualizar el estado de la tienda.",
            "error"
        );

    }

}


/* =========================================================
   USUARIOS — REPARTIDORES Y CLIENTES
========================================================= */

function escucharUsuarios() {

    if (listenerUsuarios) {

        listenerUsuarios();

        listenerUsuarios =
            null;

    }


    listenerUsuarios =
        onSnapshot(
            collection(
                db,
                "usuarios"
            ),
            snapshot => {

                const usuarios =
                    snapshot.docs.map(
                        documento => {

                            return {
                                id:
                                    documento.id,

                                ...documento.data()

                            };

                        }
                    );


                repartidoresActuales =
                    usuarios.filter(
                        usuario =>
                            usuario.tipo ===
                            "repartidor"
                    );


                clientesActuales =
                    usuarios.filter(
                        usuario =>
                            usuario.tipo ===
                            "cliente"
                    );


                renderizarRepartidores();

                renderizarClientes();

            },
            error => {

                console.error(
                    "Error escuchando usuarios:",
                    error
                );

            }
        );

}


/* =========================================================
   REPARTIDORES
========================================================= */

function renderizarRepartidores() {

    const vista =
        document.getElementById(
            "view-repartidores"
        );

    if (!vista) {
        return;
    }


    vista.innerHTML = `

        <div class="admin-page-header">

            <div>

                <span class="admin-kicker">
                    Operación
                </span>

                <h2>
                    Repartidores
                </h2>

                <p>
                    Administra disponibilidad y cuentas
                    de repartidores.
                </p>

            </div>

        </div>


        <div class="admin-summary-grid">

            <div class="admin-summary">
                <span>Total</span>
                <strong>
                    ${repartidoresActuales.length}
                </strong>
            </div>

            <div class="admin-summary">
                <span>Activos</span>
                <strong>
                    ${
                        repartidoresActuales.filter(
                            r =>
                                r.activo !== false
                        ).length
                    }
                </strong>
            </div>

            <div class="admin-summary">
                <span>Suspendidos</span>
                <strong>
                    ${
                        repartidoresActuales.filter(
                            r =>
                                r.activo === false
                        ).length
                    }
                </strong>
            </div>

        </div>


        <div class="admin-section-panel">

            <div class="admin-toolbar">

                <div class="admin-search">

                    <span>⌕</span>

                    <input
                        id="buscarRepartidoresAdmin"
                        type="search"
                        placeholder="Buscar repartidor..."
                    >

                </div>

                <button
                    id="btnFiltrosRepartidores"
                    class="admin-filter-button"
                    type="button"
                >
                    ☷ Filtros
                </button>

            </div>


            <div
                id="filtrosRepartidoresAdmin"
                class="admin-filter-panel"
            >

                <button
                    class="admin-filter active"
                    data-filtro-repartidor="todos"
                    type="button"
                >
                    Todos
                </button>

                <button
                    class="admin-filter"
                    data-filtro-repartidor="activos"
                    type="button"
                >
                    Activos
                </button>

                <button
                    class="admin-filter"
                    data-filtro-repartidor="suspendidos"
                    type="button"
                >
                    Suspendidos
                </button>

            </div>


            <div
                id="listaRepartidoresAdmin"
                class="admin-lista"
            ></div>

        </div>

    `;


    const lista =
        document.getElementById(
            "listaRepartidoresAdmin"
        );

    let filtro =
        "todos";


    function actualizar() {

        const texto =
            document.getElementById(
                "buscarRepartidoresAdmin"
            )
            ?.value
            .trim()
            .toLowerCase() || "";


        const resultado =
            repartidoresActuales.filter(
                repartidor => {

                    const activo =
                        repartidor.activo !== false;


                    if (
                        filtro === "activos" &&
                        !activo
                    ) {
                        return false;
                    }


                    if (
                        filtro === "suspendidos" &&
                        activo
                    ) {
                        return false;
                    }


                    const nombre =
                        String(
                            repartidor.nombre ||
                            ""
                        ).toLowerCase();


                    const email =
                        String(
                            repartidor.email ||
                            ""
                        ).toLowerCase();


                    return (
                        nombre.includes(texto) ||
                        email.includes(texto)
                    );

                }
            );


        lista.innerHTML =
            resultado.length
                ? resultado.map(
                    crearTarjetaRepartidor
                  ).join("")
                : crearVacio(
                    "🚴",
                    "No encontramos repartidores",
                    "Todavía no hay repartidores que coincidan con este filtro."
                  );


        configurarBotonesRepartidores();

    }


    document
        .getElementById(
            "buscarRepartidoresAdmin"
        )
        ?.addEventListener(
            "input",
            actualizar
        );


    const btnFiltros =
        document.getElementById(
            "btnFiltrosRepartidores"
        );

    btnFiltros?.addEventListener(
        "click",
        () => {

            document
                .getElementById(
                    "filtrosRepartidoresAdmin"
                )
                ?.classList.toggle(
                    "visible"
                );

        }
    );


    document
        .querySelectorAll(
            "[data-filtro-repartidor]"
        )
        .forEach(
            boton => {

                boton.addEventListener(
                    "click",
                    () => {

                        filtro =
                            boton.dataset.filtroRepartidor;

                        document
                            .querySelectorAll(
                                "[data-filtro-repartidor]"
                            )
                            .forEach(
                                elemento =>
                                    elemento.classList.remove(
                                        "active"
                                    )
                            );

                        boton.classList.add(
                            "active"
                        );

                        actualizar();

                    }
                );

            }
        );


    actualizar();

}


function crearTarjetaRepartidor(
    repartidor
) {

    const activo =
        repartidor.activo !== false;


    return `

        <article class="admin-card">

            <div class="admin-card-icon">
                🛵
            </div>


            <div class="admin-card-main">

                <div class="admin-card-title-row">

                    <h3>
                        ${escaparHTMLAdmin(
                            repartidor.nombre ||
                            repartidor.email ||
                            "Repartidor"
                        )}
                    </h3>

                    <span
                        class="admin-status ${
                            activo
                                ? "activa"
                                : "suspendida"
                        }"
                    >
                        ${
                            activo
                                ? "Activo"
                                : "Suspendido"
                        }
                    </span>

                </div>


                <div class="admin-card-meta">

                    <span>
                        ${escaparHTMLAdmin(
                            repartidor.email ||
                            "Sin correo"
                        )}
                    </span>

                    <span>
                        ${
                            repartidor.disponible === true
                                ? "Disponible"
                                : "No disponible"
                        }
                    </span>

                </div>


                <div class="admin-card-finance">

                    <div>
                        <span>Pedidos</span>
                        <strong>—</strong>
                    </div>

                    <div>
                        <span>Ganancias</span>
                        <strong>—</strong>
                    </div>

                </div>

            </div>


            <div class="admin-card-actions">

                <button
                    type="button"
                    class="admin-button-primary"
                    data-admin-repartidor="${repartidor.id}"
                >
                    Administrar
                </button>

            </div>

        </article>

    `;

}


function configurarBotonesRepartidores() {

    document
        .querySelectorAll(
            "[data-admin-repartidor]"
        )
        .forEach(
            boton => {

                boton.addEventListener(
                    "click",
                    () => {

                        const repartidor =
                            repartidoresActuales.find(
                                elemento =>
                                    elemento.id ===
                                    boton.dataset.adminRepartidor
                            );

                        if (repartidor) {

                            abrirModalUsuario(
                                repartidor,
                                "repartidor"
                            );

                        }

                    }
                );

            }
        );

}


/* =========================================================
   CLIENTES
========================================================= */

function renderizarClientes() {

    const vista =
        document.getElementById(
            "view-clientes"
        );

    if (!vista) {
        return;
    }


    vista.innerHTML = `

        <div class="admin-page-header">

            <div>

                <span class="admin-kicker">
                    Usuarios
                </span>

                <h2>
                    Clientes
                </h2>

                <p>
                    Consulta el comportamiento y actividad
                    de los clientes de MOTI GO.
                </p>

            </div>

        </div>


        <div class="admin-summary-grid">

            <div class="admin-summary">
                <span>Total</span>
                <strong>
                    ${clientesActuales.length}
                </strong>
            </div>

            <div class="admin-summary">
                <span>Activos</span>
                <strong>
                    ${
                        clientesActuales.filter(
                            c =>
                                c.activo !== false
                        ).length
                    }
                </strong>
            </div>

            <div class="admin-summary">
                <span>Con reportes</span>
                <strong>0</strong>
            </div>

            <div class="admin-summary">
                <span>Incidencias</span>
                <strong>0</strong>
            </div>

        </div>


        <div class="admin-section-panel">

            <div class="admin-toolbar">

                <div class="admin-search">

                    <span>⌕</span>

                    <input
                        id="buscarClientesAdmin"
                        type="search"
                        placeholder="Buscar cliente..."
                    >

                </div>

                <button
                    id="btnFiltrosClientes"
                    class="admin-filter-button"
                    type="button"
                >
                    ☷ Filtros
                </button>

            </div>


            <div
                id="filtrosClientesAdmin"
                class="admin-filter-panel"
            >

                <button
                    class="admin-filter active"
                    data-filtro-cliente="todos"
                    type="button"
                >
                    Todos
                </button>

                <button
                    class="admin-filter"
                    data-filtro-cliente="activos"
                    type="button"
                >
                    Activos
                </button>

                <button
                    class="admin-filter"
                    data-filtro-cliente="suspendidos"
                    type="button"
                >
                    Suspendidos
                </button>

            </div>


            <div
                id="listaClientesAdmin"
                class="admin-lista"
            ></div>

        </div>

    `;


    const lista =
        document.getElementById(
            "listaClientesAdmin"
        );

    let filtro =
        "todos";


    function actualizar() {

        const texto =
            document.getElementById(
                "buscarClientesAdmin"
            )
            ?.value
            .trim()
            .toLowerCase() || "";


        const resultado =
            clientesActuales.filter(
                cliente => {

                    const activo =
                        cliente.activo !== false;


                    if (
                        filtro === "activos" &&
                        !activo
                    ) {
                        return false;
                    }


                    if (
                        filtro === "suspendidos" &&
                        activo
                    ) {
                        return false;
                    }


                    const nombre =
                        String(
                            cliente.nombre ||
                            ""
                        ).toLowerCase();


                    const email =
                        String(
                            cliente.email ||
                            ""
                        ).toLowerCase();


                    return (
                        nombre.includes(texto) ||
                        email.includes(texto)
                    );

                }
            );


        lista.innerHTML =
            resultado.length
                ? resultado.map(
                    crearTarjetaCliente
                  ).join("")
                : crearVacio(
                    "👤",
                    "No encontramos clientes",
                    "No hay clientes que coincidan con el filtro."
                  );


        configurarBotonesClientes();

    }


    document
        .getElementById(
            "buscarClientesAdmin"
        )
        ?.addEventListener(
            "input",
            actualizar
        );


    document
        .getElementById(
            "btnFiltrosClientes"
        )
        ?.addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "filtrosClientesAdmin"
                    )
                    ?.classList.toggle(
                        "visible"
                    );

            }
        );


    document
        .querySelectorAll(
            "[data-filtro-cliente]"
        )
        .forEach(
            boton => {

                boton.addEventListener(
                    "click",
                    () => {

                        filtro =
                            boton.dataset.filtroCliente;

                        document
                            .querySelectorAll(
                                "[data-filtro-cliente]"
                            )
                            .forEach(
                                elemento =>
                                    elemento.classList.remove(
                                        "active"
                                    )
                            );

                        boton.classList.add(
                            "active"
                        );

                        actualizar();

                    }
                );

            }
        );


    actualizar();

}


function crearTarjetaCliente(
    cliente
) {

    const activo =
        cliente.activo !== false;


    return `

        <article class="admin-card">

            <div class="admin-card-icon">
                👤
            </div>


            <div class="admin-card-main">

                <div class="admin-card-title-row">

                    <h3>
                        ${escaparHTMLAdmin(
                            cliente.nombre ||
                            cliente.email ||
                            "Cliente"
                        )}
                    </h3>

                    <span
                        class="admin-status ${
                            activo
                                ? "activa"
                                : "suspendida"
                        }"
                    >
                        ${
                            activo
                                ? "Activo"
                                : "Suspendido"
                        }
                    </span>

                </div>


                <div class="admin-card-meta">

                    <span>
                        ${escaparHTMLAdmin(
                            cliente.email ||
                            "Sin correo"
                        )}
                    </span>

                </div>


                <div class="admin-behavior">

                    <div>

                        <span>
                            Pedidos
                        </span>

                        <strong>
                            —
                        </strong>

                    </div>

                    <div>

                        <span>
                            Cancelaciones
                        </span>

                        <strong>
                            —
                        </strong>

                    </div>

                    <div>

                        <span>
                            Reportes
                        </span>

                        <strong>
                            0
                        </strong>

                    </div>

                    <div>

                        <span>
                            Incidencias
                        </span>

                        <strong>
                            0
                        </strong>

                    </div>

                </div>

            </div>


            <div class="admin-card-actions">

                <button
                    type="button"
                    class="admin-button-primary"
                    data-admin-cliente="${cliente.id}"
                >
                    Administrar
                </button>

            </div>

        </article>

    `;

}


function configurarBotonesClientes() {

    document
        .querySelectorAll(
            "[data-admin-cliente]"
        )
        .forEach(
            boton => {

                boton.addEventListener(
                    "click",
                    () => {

                        const cliente =
                            clientesActuales.find(
                                elemento =>
                                    elemento.id ===
                                    boton.dataset.adminCliente
                            );

                        if (cliente) {

                            abrirModalUsuario(
                                cliente,
                                "cliente"
                            );

                        }

                    }
                );

            }
        );

}


/* =========================================================
   MODAL USUARIO
========================================================= */

function abrirModalUsuario(
    usuario,
    tipo
) {

    const anterior =
        document.getElementById(
            "modalAdminUsuario"
        );

    anterior?.remove();


    const activo =
        usuario.activo !== false;


    const modal =
        document.createElement("div");

    modal.id =
        "modalAdminUsuario";

    modal.className =
        "admin-modal";


    const titulo =
        tipo === "repartidor"
            ? "Repartidor"
            : "Cliente";


    modal.innerHTML = `

        <div class="admin-modal-content">

            <div class="admin-modal-header">

                <div>

                    <span class="admin-modal-kicker">
                        Administración
                    </span>

                    <h2>
                        ${escaparHTMLAdmin(
                            usuario.nombre ||
                            usuario.email ||
                            titulo
                        )}
                    </h2>

                    <p>
                        Gestión de cuenta y actividad.
                    </p>

                </div>

                <button
                    type="button"
                    class="admin-modal-close"
                    id="cerrarModalUsuario"
                >
                    ×
                </button>

            </div>


            <div class="admin-modal-body">


                <div class="admin-detail-status">

                    <span>
                        Estado de cuenta
                    </span>

                    <strong
                        class="${
                            activo
                                ? "activo"
                                : "suspendido"
                        }"
                    >
                        ${
                            activo
                                ? "ACTIVA"
                                : "SUSPENDIDA"
                        }
                    </strong>

                </div>


                <div class="admin-detail-grid">

                    <div>

                        <span>
                            Tipo
                        </span>

                        <strong>
                            ${titulo}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Correo
                        </span>

                        <strong>
                            ${escaparHTMLAdmin(
                                usuario.email ||
                                "—"
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            ID
                        </span>

                        <strong>
                            ${escaparHTMLAdmin(
                                usuario.id
                            )}
                        </strong>

                    </div>

                </div>


                ${
                    tipo === "cliente"
                    ? `

                        <div class="admin-detail-section">

                            <h3>
                                Comportamiento
                            </h3>

                            <div class="admin-behavior-large">

                                <div>
                                    <span>Pedidos</span>
                                    <strong>—</strong>
                                </div>

                                <div>
                                    <span>Completados</span>
                                    <strong>—</strong>
                                </div>

                                <div>
                                    <span>Cancelados</span>
                                    <strong>—</strong>
                                </div>

                                <div>
                                    <span>Reportes</span>
                                    <strong>0</strong>
                                </div>

                            </div>

                            <p class="admin-muted">
                                Las métricas se conectarán
                                al historial de pedidos e
                                incidencias.
                            </p>

                        </div>

                    `
                    : `

                        <div class="admin-detail-section">

                            <h3>
                                Operación
                            </h3>

                            <div class="admin-behavior-large">

                                <div>
                                    <span>Pedidos</span>
                                    <strong>—</strong>
                                </div>

                                <div>
                                    <span>Completados</span>
                                    <strong>—</strong>
                                </div>

                                <div>
                                    <span>Cancelaciones</span>
                                    <strong>—</strong>
                                </div>

                                <div>
                                    <span>Ganancias</span>
                                    <strong>—</strong>
                                </div>

                            </div>

                        </div>

                    `
                }


                <div class="admin-detail-section">

                    <h3>
                        Estado de la cuenta
                    </h3>

                    <button
                        type="button"
                        id="btnCambiarEstadoUsuario"
                        class="${
                            activo
                                ? "admin-button-danger"
                                : "admin-button-primary"
                        }"
                    >
                        ${
                            activo
                                ? "Suspender cuenta"
                                : "Reactivar cuenta"
                        }
                    </button>

                </div>


            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    requestAnimationFrame(() => {

        modal.classList.add(
            "visible"
        );

    });


    document
        .getElementById(
            "cerrarModalUsuario"
        )
        ?.addEventListener(
            "click",
            () => modal.remove()
        );


    modal.addEventListener(
        "click",
        evento => {

            if (
                evento.target ===
                modal
            ) {

                modal.remove();

            }

        }
    );


    document
        .getElementById(
            "btnCambiarEstadoUsuario"
        )
        ?.addEventListener(
            "click",
            async () => {

                const nuevoEstado =
                    usuario.activo === false;


                try {

                    const boton =
                        document.getElementById(
                            "btnCambiarEstadoUsuario"
                        );


                    if (boton) {

                        boton.disabled =
                            true;

                        boton.textContent =
                            "Guardando...";

                    }


                    await updateDoc(
                        doc(
                            db,
                            "usuarios",
                            usuario.id
                        ),
                        {
                            activo:
                                nuevoEstado
                        }
                    );


                    mostrarNotificacion(
                        nuevoEstado
                            ? "La cuenta fue reactivada."
                            : "La cuenta fue suspendida.",
                        "exito"
                    );


                    modal.remove();

                }
                catch (error) {

                    console.error(
                        "Error actualizando usuario:",
                        error
                    );

                    mostrarNotificacion(
                        "No se pudo actualizar la cuenta.",
                        "error"
                    );

                }

            }
        );

}


/* =========================================================
   PEDIDOS
========================================================= */

function escucharPedidos() {

    if (listenerPedidos) {

        listenerPedidos();

        listenerPedidos =
            null;

    }


    listenerPedidos =
        onSnapshot(
            collection(
                db,
                "pedidos"
            ),
            snapshot => {

                pedidosActuales =
                    snapshot.docs.map(
                        documento => {

                            return {
                                id:
                                    documento.id,

                                ...documento.data()

                            };

                        }
                    );


                pedidosActuales.sort(
                    (a, b) => {

                        const fechaA =
                            a.creadoEn?.seconds ||
                            0;

                        const fechaB =
                            b.creadoEn?.seconds ||
                            0;

                        return fechaB -
                            fechaA;

                    }
                );


                renderizarPedidos();

                renderizarFinanzas();

                renderizarCarteras();

                actualizarResumen();

            },
            error => {

                console.error(
                    "Error escuchando pedidos:",
                    error
                );

            }
        );

}

/* =========================================================
   MOVIMIENTOS DE TIENDAS
========================================================= */

function escucharMovimientosTiendas() {

    if (listenerMovimientosTiendas) {

        listenerMovimientosTiendas();

        listenerMovimientosTiendas =
            null;

    }


    listenerMovimientosTiendas =
        onSnapshot(

            collection(
                db,
                "movimientosTiendas"
            ),

            snapshot => {

                movimientosTiendasActuales =
                    snapshot.docs.map(
                        documento => {

                            return {

                                id:
                                    documento.id,

                                ...documento.data()

                            };

                        }
                    );


                console.log(
                    "💰 MOTI GO: movimientos de tiendas:",
                    movimientosTiendasActuales
                );


                renderizarCarteras();

                renderizarTiendas(
                    tiendasActuales
                );

            },

            error => {

                console.error(
                    "❌ MOTI GO: error escuchando movimientos de tiendas:",
                    error
                );

            }

        );

}

/* =========================================================
   PEDIDOS
========================================================= */

function renderizarPedidos() {

    const vista =
        document.getElementById(
            "view-pedidos"
        );

    if (!vista) {
        return;
    }


    vista.innerHTML = `

        <div class="admin-page-header">

            <div>

                <span class="admin-kicker">
                    Operación
                </span>

                <h2>
                    Pedidos
                </h2>

                <p>
                    Consulta y audita cada pedido de MOTI GO.
                </p>

            </div>

        </div>


        <div class="admin-summary-grid">

            <div class="admin-summary">
                <span>Total</span>
                <strong>
                    ${pedidosActuales.length}
                </strong>
            </div>

            <div class="admin-summary">
                <span>En proceso</span>
                <strong>
                    ${
                        pedidosActuales.filter(
                            pedido =>
                                ![
                                    "entregado",
                                    "cancelado"
                                ].includes(
                                    String(
                                        pedido.estado ||
                                        ""
                                    )
                                )
                        ).length
                    }
                </strong>
            </div>

            <div class="admin-summary">
                <span>Entregados</span>
                <strong>
                    ${
                        pedidosActuales.filter(
                            pedido =>
                                pedido.estado ===
                                "entregado"
                        ).length
                    }
                </strong>
            </div>

            <div class="admin-summary">
                <span>Cancelados</span>
                <strong>
                    ${
                        pedidosActuales.filter(
                            pedido =>
                                pedido.estado ===
                                "cancelado"
                        ).length
                    }
                </strong>
            </div>

        </div>


        <div class="admin-section-panel">

            <div class="admin-toolbar">

                <div class="admin-search">

                    <span>⌕</span>

                    <input
                        id="buscarPedidosAdmin"
                        type="search"
                        placeholder="Buscar por folio, cliente o tienda..."
                    >

                </div>

                <button
                    id="btnFiltrosPedidos"
                    class="admin-filter-button"
                    type="button"
                >
                    ☷ Filtros
                </button>

            </div>


            <div
                id="filtrosPedidosAdmin"
                class="admin-filter-panel"
            >

                <button
                    class="admin-filter active"
                    data-filtro-pedido="todos"
                    type="button"
                >
                    Todos
                </button>

                <button
                    class="admin-filter"
                    data-filtro-pedido="pendientes"
                    type="button"
                >
                    Pendientes
                </button>

                <button
                    class="admin-filter"
                    data-filtro-pedido="proceso"
                    type="button"
                >
                    En proceso
                </button>

                <button
                    class="admin-filter"
                    data-filtro-pedido="entregados"
                    type="button"
                >
                    Entregados
                </button>

                <button
                    class="admin-filter"
                    data-filtro-pedido="cancelados"
                    type="button"
                >
                    Cancelados
                </button>

            </div>


            <div
                id="listaPedidosAdmin"
                class="admin-lista"
            ></div>

        </div>

    `;


    const lista =
        document.getElementById(
            "listaPedidosAdmin"
        );

    let filtro =
        "todos";


    function coincideEstado(
        pedido
    ) {

        const estado =
            String(
                pedido.estado ||
                ""
            ).toLowerCase();


        if (
            filtro === "pendientes"
        ) {

            return [
                "pendiente_asignacion",
                "solicitud_repartidor",
                "sin_repartidor"
            ].includes(
                estado
            );

        }


        if (
            filtro === "proceso"
        ) {

            return ![
                "entregado",
                "cancelado"
            ].includes(
                estado
            );

        }


        if (
            filtro === "entregados"
        ) {

            return estado ===
                "entregado";

        }


        if (
            filtro === "cancelados"
        ) {

            return estado ===
                "cancelado";

        }


        return true;

    }


    function actualizar() {

        const texto =
            document.getElementById(
                "buscarPedidosAdmin"
            )
            ?.value
            .trim()
            .toLowerCase() || "";


        const resultado =
            pedidosActuales.filter(
                pedido => {

                    if (
                        !coincideEstado(
                            pedido
                        )
                    ) {

                        return false;

                    }


                    const folio =
                        String(
                            pedido.folio ||
                            pedido.id ||
                            ""
                        ).toLowerCase();


                    const cliente =
                        String(
                            pedido.clienteNombre ||
                            pedido.nombreCliente ||
                            ""
                        ).toLowerCase();


                    const tienda =
                        String(
                            pedido.tiendaNombre ||
                            ""
                        ).toLowerCase();


                    return (
                        folio.includes(texto) ||
                        cliente.includes(texto) ||
                        tienda.includes(texto)
                    );

                }
            );


        lista.innerHTML =
            resultado.length
                ? resultado.map(
                    crearTarjetaPedido
                  ).join("")
                : crearVacio(
                    "📦",
                    "No encontramos pedidos",
                    "No hay pedidos que coincidan con este filtro."
                  );


        configurarBotonesPedidos();

    }


    document
        .getElementById(
            "buscarPedidosAdmin"
        )
        ?.addEventListener(
            "input",
            actualizar
        );


    document
        .getElementById(
            "btnFiltrosPedidos"
        )
        ?.addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "filtrosPedidosAdmin"
                    )
                    ?.classList.toggle(
                        "visible"
                    );

            }
        );


    document
        .querySelectorAll(
            "[data-filtro-pedido]"
        )
        .forEach(
            boton => {

                boton.addEventListener(
                    "click",
                    () => {

                        filtro =
                            boton.dataset.filtroPedido;

                        document
                            .querySelectorAll(
                                "[data-filtro-pedido]"
                            )
                            .forEach(
                                elemento =>
                                    elemento.classList.remove(
                                        "active"
                                    )
                            );

                        boton.classList.add(
                            "active"
                        );

                        actualizar();

                    }
                );

            }
        );


    actualizar();

}


function crearTarjetaPedido(
    pedido
) {

    const estado =
        String(
            pedido.estado ||
            "desconocido"
        );


    const folio =
        pedido.folio ||
        pedido.id;


    const total =
        Number(
            pedido.total ||
            pedido.totalPedido ||
            0
        );


    return `

        <article class="admin-card pedido-admin-card">

            <div class="admin-card-icon">
                📦
            </div>


            <div class="admin-card-main">

                <div class="admin-card-title-row">

                    <h3>
                        #${escaparHTMLAdmin(
                            folio
                        )}
                    </h3>

                    <span class="admin-status estado-pedido">
                        ${escaparHTMLAdmin(
                            estado
                        )}
                    </span>

                </div>


                <div class="admin-card-meta">

                    <span>
                        ${
                            escaparHTMLAdmin(
                                pedido.clienteNombre ||
                                pedido.nombreCliente ||
                                "Cliente no disponible"
                            )
                        }
                    </span>

                    <span>
                        ${
                            escaparHTMLAdmin(
                                pedido.tiendaNombre ||
                                "Pedido MOTI GO"
                            )
                        }
                    </span>

                </div>


                <div class="admin-card-finance">

                    <div>

                        <span>
                            Total
                        </span>

                        <strong>
                            ${moneda(total)}
                        </strong>

                    </div>

                </div>

            </div>


            <div class="admin-card-actions">

                <button
                    type="button"
                    class="admin-button-primary"
                    data-admin-pedido="${escaparHTMLAdmin(
                        pedido.id
                    )}"
                >
                    Ver pedido
                </button>

            </div>

        </article>

    `;

}


function configurarBotonesPedidos() {

    document
        .querySelectorAll(
            "[data-admin-pedido]"
        )
        .forEach(
            boton => {

                boton.addEventListener(
                    "click",
                    () => {

                        const pedido =
                            pedidosActuales.find(
                                elemento =>
                                    elemento.id ===
                                    boton.dataset.adminPedido
                            );

                        if (pedido) {

                            abrirModalPedido(
                                pedido
                            );

                        }

                    }
                );

            }
        );

}


/* =========================================================
   EXPEDIENTE DEL PEDIDO
========================================================= */

function abrirModalPedido(
    pedido
) {

    const anterior =
        document.getElementById(
            "modalAdminPedido"
        );

    anterior?.remove();


    const modal =
        document.createElement("div");

    modal.id =
        "modalAdminPedido";

    modal.className =
        "admin-modal";


    const folio =
        pedido.folio ||
        pedido.id;


    const subtotal =
        Number(
            pedido.subtotal ||
            0
        );


    const total =
        Number(
            pedido.total ||
            pedido.totalPedido ||
            0
        );


    const comisionRepartidor =
        Number(
            pedido.comisionRepartidor ||
            0
        );


    const comisionTienda =
        Number(
            pedido.comisionTienda ||
            0
        );


    modal.innerHTML = `

        <div class="admin-modal-content admin-modal-wide">

            <div class="admin-modal-header">

                <div>

                    <span class="admin-modal-kicker">
                        Expediente del pedido
                    </span>

                    <h2>
                        #${escaparHTMLAdmin(
                            folio
                        )}
                    </h2>

                    <p>
                        Registro administrativo del pedido.
                    </p>

                </div>

                <button
                    type="button"
                    class="admin-modal-close"
                    id="cerrarModalPedido"
                >
                    ×
                </button>

            </div>


            <div class="admin-modal-body">


                <div class="admin-order-status">

                    <span>
                        Estado actual
                    </span>

                    <strong>
                        ${escaparHTMLAdmin(
                            pedido.estado ||
                            "Sin estado"
                        )}
                    </strong>

                </div>


                <div class="admin-order-grid">

                    <div>

                        <span>
                            Cliente
                        </span>

                        <strong>
                            ${escaparHTMLAdmin(
                                pedido.clienteNombre ||
                                pedido.nombreCliente ||
                                "—"
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Repartidor
                        </span>

                        <strong>
                            ${escaparHTMLAdmin(
                                pedido.repartidorNombre ||
                                "—"
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Tienda
                        </span>

                        <strong>
                            ${escaparHTMLAdmin(
                                pedido.tiendaNombre ||
                                "—"
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Método de pago
                        </span>

                        <strong>
                            ${escaparHTMLAdmin(
                                pedido.metodoPago ||
                                "—"
                            )}
                        </strong>

                    </div>

                </div>


                <div class="admin-detail-section">

                    <h3>
                        Resumen financiero
                    </h3>


                    <div class="admin-finance-preview">

                        <div>

                            <span>
                                Subtotal
                            </span>

                            <strong>
                                ${moneda(subtotal)}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Repartidor
                            </span>

                            <strong>
                                ${moneda(
                                    comisionRepartidor
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Comisión MOTI tienda
                            </span>

                            <strong>
                                ${moneda(
                                    comisionTienda
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Total
                            </span>

                            <strong>
                                ${moneda(total)}
                            </strong>

                        </div>

                    </div>

                </div>


                <div class="admin-detail-section">

                    <h3>
                        Productos
                    </h3>

                    <div class="admin-order-products">

                        ${
                            crearProductosPedido(
                                pedido
                            )
                        }

                    </div>

                </div>


                <div class="admin-detail-section">

                    <h3>
                        Información técnica
                    </h3>

                    <div class="admin-technical">

                        <div>
                            <span>ID</span>
                            <strong>
                                ${escaparHTMLAdmin(
                                    pedido.id
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Estado</span>
                            <strong>
                                ${escaparHTMLAdmin(
                                    pedido.estado ||
                                    "—"
                                )}
                            </strong>
                        </div>

                    </div>

                </div>


            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    requestAnimationFrame(() => {

        modal.classList.add(
            "visible"
        );

    });


    document
        .getElementById(
            "cerrarModalPedido"
        )
        ?.addEventListener(
            "click",
            () => modal.remove()
        );


    modal.addEventListener(
        "click",
        evento => {

            if (
                evento.target ===
                modal
            ) {

                modal.remove();

            }

        }
    );

}


function crearProductosPedido(
    pedido
) {

    const productos =
        Array.isArray(
            pedido.productos
        )
            ? pedido.productos
            : [];


    if (!productos.length) {

        return `

            <div class="admin-muted">
                Los productos de este pedido
                todavía no están disponibles
                en la estructura administrativa.
            </div>

        `;

    }


    return productos.map(
        producto => {

            const nombre =
                producto.nombre ||
                producto.producto ||
                "Producto";


            const cantidad =
                Number(
                    producto.cantidad ||
                    producto.qty ||
                    1
                );


            const precio =
                Number(
                    producto.precio ||
                    producto.precioVenta ||
                    0
                );


            return `

                <div class="admin-product-row">

                    <span>
                        ${escaparHTMLAdmin(
                            nombre
                        )}
                    </span>

                    <span>
                        ${cantidad} × ${moneda(precio)}
                    </span>

                </div>

            `;

        }
    ).join("");

}


/* =========================================================
   FINANZAS
========================================================= */

function renderizarFinanzas() {

    const vista =
        document.getElementById(
            "view-finanzas"
        );

    if (!vista) {
        return;
    }


    const ventas =
        pedidosActuales.reduce(
            (total, pedido) => {

                return total +
                    Number(
                        pedido.subtotal ||
                        pedido.totalProductos ||
                        0
                    );

            },
            0
        );


    const comisionesRepartidores =
        pedidosActuales.reduce(
            (total, pedido) => {

                return total +
                    Number(
                        pedido.comisionRepartidor ||
                        0
                    );

            },
            0
        );


    const comisionesTiendas =
        pedidosActuales.reduce(
            (total, pedido) => {

                return total +
                    Number(
                        pedido.comisionTienda ||
                        0
                    );

            },
            0
        );


    vista.innerHTML = `

        <div class="admin-page-header">

            <div>

                <span class="admin-kicker">
                    Dinero
                </span>

                <h2>
                    Finanzas
                </h2>

                <p>
                    Visión financiera de la operación.
                </p>

            </div>

        </div>


        <div class="admin-summary-grid">

            <div class="admin-summary">
                <span>Ventas</span>
                <strong>
                    ${moneda(ventas)}
                </strong>
            </div>

            <div class="admin-summary">
                <span>Comisiones repartidores</span>
                <strong>
                    ${moneda(
                        comisionesRepartidores
                    )}
                </strong>
            </div>

            <div class="admin-summary">
                <span>Comisiones MOTI</span>
                <strong>
                    ${moneda(
                        comisionesTiendas
                    )}
                </strong>
            </div>

            <div class="admin-summary">
                <span>Pedidos</span>
                <strong>
                    ${pedidosActuales.length}
                </strong>
            </div>

        </div>


        <div class="admin-section-panel">

            <div class="admin-panel-heading">

                <div>

                    <h3>
                        Resumen financiero
                    </h3>

                    <p>
                        Los valores se alimentarán
                        progresivamente de los pedidos.
                    </p>

                </div>

            </div>


            <div class="admin-finance-list">

                <div class="admin-finance-line">

                    <span>
                        Comisión de tiendas generada
                    </span>

                    <strong>
                        ${moneda(
                            comisionesTiendas
                        )}
                    </strong>

                </div>


                <div class="admin-finance-line">

                    <span>
                        Ganancias de repartidores
                    </span>

                    <strong>
                        ${moneda(
                            comisionesRepartidores
                        )}
                    </strong>

                </div>


                <div class="admin-finance-line">

                    <span>
                        Comisión MOTI pendiente de tiendas
                    </span>

                    <strong>
                        ${moneda(
                            comisionesTiendas
                        )}
                    </strong>

                </div>

            </div>

        </div>

    `;

}


/* =========================================================
   CARTERAS
========================================================= */

function renderizarCarteras() {

    const contenedor = document.getElementById("view-carteras");

    if (!contenedor) return;

    const movimientos = Array.isArray(movimientosTiendasActuales)
        ? movimientosTiendasActuales
        : [];

    const cuentas = {};

    movimientos.forEach(mov => {

        if (!mov.tiendaId) return;

        if (!cuentas[mov.tiendaId]) {

            cuentas[mov.tiendaId] = {
                tiendaId: mov.tiendaId,
                tiendaNombre: mov.tiendaNombre || "Tienda",
                generado: 0,
                pagado: 0,
                movimientos: []
            };

        }

        const monto = Number(mov.monto || 0);

        cuentas[mov.tiendaId].movimientos.push(mov);

        if (mov.tipo === "comision") {
            cuentas[mov.tiendaId].generado += monto;
        }

        if (mov.tipo === "pago") {
            cuentas[mov.tiendaId].pagado += monto;
        }

    });


    const listaCuentas = Object.values(cuentas);


    let generadoTotal = 0;
    let pagadoTotal = 0;

    listaCuentas.forEach(cuenta => {

        generadoTotal += cuenta.generado;
        pagadoTotal += cuenta.pagado;

    });


    const pendienteTotal = Math.max(
        generadoTotal - pagadoTotal,
        0
    );


    contenedor.innerHTML = `

        <div class="welcome">

            <h2>
                Carteras
            </h2>

            <p>
                Administración de saldos y movimientos de las tiendas.
            </p>

        </div>


        <!-- ==============================================
             RESUMEN GENERAL
        =============================================== -->

        <div class="stats">

            <div class="stat">

                <div class="stat-top">

                    <span class="stat-label">
                        Comisiones generadas
                    </span>

                    <span class="stat-icon">
                        💰
                    </span>

                </div>

                <div class="stat-value">
                    ${moneda(generadoTotal)}
                </div>

            </div>


            <div class="stat">

                <div class="stat-top">

                    <span class="stat-label">
                        Pagos recibidos
                    </span>

                    <span class="stat-icon">
                        💳
                    </span>

                </div>

                <div class="stat-value">
                    ${moneda(pagadoTotal)}
                </div>

            </div>


            <div class="stat">

                <div class="stat-top">

                    <span class="stat-label">
                        Pendiente por cobrar
                    </span>

                    <span class="stat-icon">
                        ⏳
                    </span>

                </div>

                <div class="stat-value">
                    ${moneda(pendienteTotal)}
                </div>

            </div>


            <div class="stat">

                <div class="stat-top">

                    <span class="stat-label">
                        Tiendas con movimientos
                    </span>

                    <span class="stat-icon">
                        🏪
                    </span>

                </div>

                <div class="stat-value">
                    ${listaCuentas.length}
                </div>

            </div>

        </div>


        <!-- ==============================================
             CUENTAS DE TIENDAS
        =============================================== -->

        <div class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Cuentas por tienda
                    </h3>

                    <p>
                        Consulta saldos, registra pagos y revisa comprobantes.
                    </p>

                </div>

            </div>


            <div class="panel-body">

                ${
                    listaCuentas.length === 0

                    ? `

                        <div class="tiendas-vacio">

                            <div class="tiendas-vacio-icono">
                                💼
                            </div>

                            <h3>
                                No hay movimientos todavía
                            </h3>

                            <p>
                                Las comisiones aparecerán aquí cuando
                                existan pedidos entregados con tiendas.
                            </p>

                        </div>

                    `

                    : `

                        <div class="carteras-lista">

                            ${listaCuentas.map(cuenta => {

                                const pendiente = Math.max(
                                    cuenta.generado - cuenta.pagado,
                                    0
                                );

                                return `

                                    <div class="cartera-tienda">

                                        <div class="cartera-tienda-info">

                                            <div class="cartera-tienda-icono">
                                                🏪
                                            </div>

                                            <div>

                                                <strong>
                                                    ${escaparHTMLAdmin(
                                                        cuenta.tiendaNombre
                                                    )}
                                                </strong>

                                                <span>
                                                    ID:
                                                    ${escaparHTMLAdmin(
                                                        cuenta.tiendaId
                                                    )}
                                                </span>

                                            </div>

                                        </div>


                                        <div class="cartera-tienda-montos">

                                            <div>

                                                <span>
                                                    Generado
                                                </span>

                                                <strong>
                                                    ${moneda(
                                                        cuenta.generado
                                                    )}
                                                </strong>

                                            </div>


                                            <div>

                                                <span>
                                                    Pagado
                                                </span>

                                                <strong>
                                                    ${moneda(
                                                        cuenta.pagado
                                                    )}
                                                </strong>

                                            </div>


                                            <div>

                                                <span>
                                                    Pendiente
                                                </span>

                                                <strong>
                                                    ${moneda(
                                                        pendiente
                                                    )}
                                                </strong>

                                            </div>

                                        </div>


                                        <div class="cartera-tienda-acciones">

                                            ${
                                                pendiente > 0

                                                ? `

                                                    <button
                                                        type="button"
                                                        class="btn-primary"
                                                        onclick="abrirModalPagoTienda('${cuenta.tiendaId}')"
                                                    >
                                                        Registrar pago
                                                    </button>

                                                `

                                                : `

                                                    <span class="cartera-pagada">
                                                        ✓ Cuenta liquidada
                                                    </span>

                                                `
                                            }


                                            <button
                                                type="button"
                                                class="btn-secundario"
                                                onclick="mostrarHistorialPagosTienda('${cuenta.tiendaId}')"
                                            >
                                                Ver historial
                                            </button>

                                        </div>

                                    </div>

                                `;

                            }).join("")}

                        </div>

                    `
                }

            </div>

        </div>

    `;

}

// =========================================================
// PAGOS DE TIENDAS
// =========================================================

window.abrirModalPagoTienda = function(tiendaId) {

    const movimientos = movimientosTiendasActuales.filter(
        mov => mov.tiendaId === tiendaId
    );

    if (!movimientos.length) {

        mostrarNotificacion(
            "No existen movimientos para esta tienda.",
            "error"
        );

        return;

    }


    const tiendaNombre =
        movimientos.find(m => m.tiendaNombre)?.tiendaNombre ||
        "Tienda";


    let generado = 0;
    let pagado = 0;

    movimientos.forEach(mov => {

        const monto = Number(mov.monto || 0);

        if (mov.tipo === "comision") {
            generado += monto;
        }

        if (mov.tipo === "pago") {
            pagado += monto;
        }

    });


    const pendiente = Math.max(
        generado - pagado,
        0
    );


    if (pendiente <= 0) {

        mostrarNotificacion(
            "Esta tienda no tiene saldo pendiente.",
            "info"
        );

        return;

    }


    const modal = document.createElement("div");

    modal.id = "modalPagoTienda";

    modal.className = "modal";

    modal.setAttribute("aria-hidden", "false");


    modal.innerHTML = `

        <div class="modal-contenido">

            <div class="modal-cabecera">

                <div>

                    <h3>
                        Registrar pago
                    </h3>

                    <p>
                        ${escaparHTMLAdmin(tiendaNombre)}
                    </p>

                </div>

                <button
                    type="button"
                    class="modal-cerrar"
                    onclick="cerrarModalPagoTienda()"
                >
                    ×
                </button>

            </div>


            <div class="modal-cuerpo">


                <div class="pago-resumen">

                    <div>

                        <span>
                            Saldo pendiente
                        </span>

                        <strong>
                            ${moneda(pendiente)}
                        </strong>

                    </div>

                </div>


                <form id="formPagoTienda">


                    <input
                        type="hidden"
                        id="pagoTiendaId"
                        value="${escaparHTMLAdmin(tiendaId)}"
                    >


                    <div class="field">

                        <label for="pagoMonto">
                            Monto del pago
                        </label>

                        <input
                            id="pagoMonto"
                            type="number"
                            min="0.01"
                            max="${pendiente.toFixed(2)}"
                            step="0.01"
                            required
                            placeholder="0.00"
                        >

                        <small>
                            Puede ser un pago parcial o liquidar
                            todo el saldo.
                        </small>

                    </div>


                    <div class="field">

                        <label for="pagoMetodo">
                            Método de pago
                        </label>

                        <select
                            id="pagoMetodo"
                            required
                        >

                            <option value="transferencia">
                                Transferencia bancaria
                            </option>

                            <option value="deposito">
                                Depósito bancario
                            </option>

                            <option value="efectivo">
                                Efectivo
                            </option>

                            <option value="otro">
                                Otro
                            </option>

                        </select>

                    </div>


                    <div class="field">

                        <label for="pagoReferencia">
                            Referencia
                        </label>

                        <input
                            id="pagoReferencia"
                            type="text"
                            maxlength="150"
                            placeholder="Número de transferencia, depósito, etc."
                        >

                    </div>


                    <div class="field">

                        <label for="pagoObservaciones">
                            Observaciones
                        </label>

                        <textarea
                            id="pagoObservaciones"
                            rows="3"
                            maxlength="500"
                            placeholder="Información adicional..."
                        ></textarea>

                    </div>


                    <div
                        id="pagoSaldoPosterior"
                        class="pago-saldo-posterior"
                    >
                        Saldo después del pago: ${moneda(pendiente)}
                    </div>


                    <div class="config-actions">

                        <button
                            type="button"
                            class="btn-secundario"
                            onclick="cerrarModalPagoTienda()"
                        >
                            Cancelar
                        </button>


                        <button
                            type="submit"
                            class="btn-primary"
                        >
                            Confirmar pago
                        </button>

                    </div>


                </form>

            </div>

        </div>

    `;


    document.body.appendChild(modal);


    const inputMonto =
        document.getElementById("pagoMonto");

    const saldoPosterior =
        document.getElementById("pagoSaldoPosterior");


    inputMonto.addEventListener("input", () => {

        let monto = Number(inputMonto.value || 0);

        if (monto > pendiente) {
            monto = pendiente;
        }

        const saldo = Math.max(
            pendiente - monto,
            0
        );

        saldoPosterior.textContent =
            `Saldo después del pago: ${moneda(saldo)}`;

    });


    document
        .getElementById("formPagoTienda")
        .addEventListener(
            "submit",
            registrarPagoTienda
        );

};


window.cerrarModalPagoTienda = function() {

    const modal =
        document.getElementById("modalPagoTienda");

    if (modal) {
        modal.remove();
    }

};

async function registrarPagoTienda(evento) {

    evento.preventDefault();


    const tiendaId =
        document.getElementById("pagoTiendaId")?.value;

    const monto =
        Number(
            document.getElementById("pagoMonto")?.value || 0
        );

    const metodo =
        document.getElementById("pagoMetodo")?.value;

    const referencia =
        document.getElementById("pagoReferencia")?.value
            .trim() || "";

    const observaciones =
        document.getElementById("pagoObservaciones")?.value
            .trim() || "";


    if (!tiendaId) {

        mostrarNotificacion(
            "No se pudo identificar la tienda.",
            "error"
        );

        return;

    }


    if (!Number.isFinite(monto) || monto <= 0) {

        mostrarNotificacion(
            "Ingresa un monto válido.",
            "error"
        );

        return;

    }


    const movimientos =
        movimientosTiendasActuales.filter(
            mov => mov.tiendaId === tiendaId
        );


    let generado = 0;
    let pagado = 0;


    movimientos.forEach(mov => {

        const valor = Number(mov.monto || 0);

        if (mov.tipo === "comision") {
            generado += valor;
        }

        if (mov.tipo === "pago") {
            pagado += valor;
        }

    });


    const saldoAnterior = Math.max(
        generado - pagado,
        0
    );


    if (monto > saldoAnterior + 0.001) {

        mostrarNotificacion(
            `El pago no puede superar el saldo pendiente de ${moneda(saldoAnterior)}.`,
            "error"
        );

        return;

    }


    const saldoPosterior = Math.max(
        saldoAnterior - monto,
        0
    );


    if (
        (metodo === "transferencia" ||
         metodo === "deposito") &&
        !referencia
    ) {

        mostrarNotificacion(
            "Ingresa la referencia del pago bancario.",
            "error"
        );

        return;

    }


    const tiendaNombre =
        movimientos.find(
            mov => mov.tiendaNombre
        )?.tiendaNombre ||
        "Tienda";


    const referenciaMovimiento =
        doc(
            collection(
                db,
                "movimientosTiendas"
            )
        );


    const comprobanteNumero =
        generarNumeroComprobantePago(
            referenciaMovimiento.id
        );


    const datosPago = {

        tipo: "pago",

        estado: "confirmado",

        tiendaId,

        tiendaNombre,

        monto: Number(
            monto.toFixed(2)
        ),

        metodo,

        referencia,

        observaciones,

        saldoAnterior: Number(
            saldoAnterior.toFixed(2)
        ),

        saldoPosterior: Number(
            saldoPosterior.toFixed(2)
        ),

        comprobanteNumero,

        registradoPor:
            auth.currentUser?.uid || null,

        registradoPorEmail:
            auth.currentUser?.email || null,

        creadoEn:
            serverTimestamp(),

        actualizadoEn:
            serverTimestamp(),

        registradoEn:
            serverTimestamp()

    };


    try {

        const formulario =
            document.getElementById(
                "formPagoTienda"
            );


        const boton =
            formulario?.querySelector(
                'button[type="submit"]'
            );


        if (boton) {

            boton.disabled = true;

            boton.textContent =
                "Registrando...";

        }


        await setDoc(
            referenciaMovimiento,
            datosPago
        );


        cerrarModalPagoTienda();


        mostrarNotificacion(
            `Pago registrado correctamente. Comprobante ${comprobanteNumero}.`,
            "success"
        );


        // Crear representación local inmediata
        // para poder descargar el comprobante
        // sin esperar al onSnapshot.

        const movimientoPago = {

            id: referenciaMovimiento.id,

            ...datosPago,

            creadoEn: new Date(),

            actualizadoEn: new Date(),

            registradoEn: new Date()

        };


        // Actualizar visualmente
        renderizarCarteras();


        // Abrir comprobante
        // después de guardar el movimiento.

        setTimeout(() => {

            mostrarComprobantePago(
                movimientoPago
            );

        }, 250);


    } catch (error) {

        console.error(
            "Error registrando pago:",
            error
        );


        mostrarNotificacion(
            "No fue posible registrar el pago.",
            "error"
        );

    }

}

function generarNumeroComprobantePago(idMovimiento) {

    const ahora = new Date();

    const fecha =
        ahora.getFullYear().toString() +
        String(
            ahora.getMonth() + 1
        ).padStart(2, "0") +
        String(
            ahora.getDate()
        ).padStart(2, "0");


    const sufijo =
        String(idMovimiento)
            .slice(-6)
            .toUpperCase();


    return `PG-${fecha}-${sufijo}`;

}

// =========================================================
// COMPROBANTE OFICIAL DE PAGO
// =========================================================

window.mostrarComprobantePago = function(movimiento) {

    if (!movimiento) {

        mostrarNotificacion(
            "No se encontró la información del pago.",
            "error"
        );

        return;

    }


    const fecha = convertirFecha(
        movimiento.registradoEn ||
        movimiento.creadoEn
    );


    const fechaTexto = fecha
        ? fecha.toLocaleString("es-MX", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
        : new Date().toLocaleString("es-MX");


    const modalAnterior =
        document.getElementById(
            "modalComprobantePago"
        );


    if (modalAnterior) {
        modalAnterior.remove();
    }


    const modal =
        document.createElement("div");


    modal.id =
        "modalComprobantePago";

    modal.className =
        "modal";

    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    modal.innerHTML = `

        <div
            class="modal-contenido comprobante-modal"
        >

            <div class="modal-cabecera">

                <div>

                    <h3>
                        Comprobante de pago
                    </h3>

                    <p>
                        Pago registrado correctamente
                    </p>

                </div>


                <button
                    type="button"
                    class="modal-cerrar"
                    onclick="cerrarComprobantePago()"
                    aria-label="Cerrar"
                >
                    ×
                </button>

            </div>


            <div class="modal-cuerpo">


                <div
                    id="comprobantePagoDocumento"
                    class="comprobante-documento"
                >

                    <div class="comprobante-marca">

                        <div class="comprobante-logo">
                            M
                        </div>

                        <div>

                            <strong>
                                MOTI GO
                            </strong>

                            <span>
                                Comprobante de pago
                            </span>

                        </div>

                    </div>


                    <div class="comprobante-folio">

                        <span>
                            FOLIO
                        </span>

                        <strong>
                            ${escaparHTMLAdmin(
                                movimiento.comprobanteNumero ||
                                "SIN FOLIO"
                            )}
                        </strong>

                    </div>


                    <div class="comprobante-estado">
                        ✓ PAGO CONFIRMADO
                    </div>


                    <div class="comprobante-separador"></div>


                    <div class="comprobante-seccion">

                        <span class="comprobante-etiqueta">
                            TIENDA
                        </span>

                        <strong>
                            ${escaparHTMLAdmin(
                                movimiento.tiendaNombre ||
                                "Tienda"
                            )}
                        </strong>

                    </div>


                    <div class="comprobante-seccion">

                        <span class="comprobante-etiqueta">
                            FECHA DE REGISTRO
                        </span>

                        <strong>
                            ${escaparHTMLAdmin(
                                fechaTexto
                            )}
                        </strong>

                    </div>


                    <div class="comprobante-total">

                        <span>
                            PAGO RECIBIDO
                        </span>

                        <strong>
                            ${moneda(
                                movimiento.monto
                            )}
                        </strong>

                    </div>


                    <div class="comprobante-grid">


                        <div>

                            <span>
                                Método
                            </span>

                            <strong>
                                ${escaparHTMLAdmin(
                                    obtenerNombreMetodoPago(
                                        movimiento.metodo
                                    )
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Referencia
                            </span>

                            <strong>
                                ${
                                    movimiento.referencia
                                    ? escaparHTMLAdmin(
                                        movimiento.referencia
                                    )
                                    : "Sin referencia"
                                }
                            </strong>

                        </div>


                    </div>


                    <div class="comprobante-saldos">


                        <div>

                            <span>
                                Saldo anterior
                            </span>

                            <strong>
                                ${moneda(
                                    movimiento.saldoAnterior
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Pago aplicado
                            </span>

                            <strong>
                                ${moneda(
                                    movimiento.monto
                                )}
                            </strong>

                        </div>


                        <div class="saldo-final">

                            <span>
                                Saldo pendiente
                            </span>

                            <strong>
                                ${moneda(
                                    movimiento.saldoPosterior
                                )}
                            </strong>

                        </div>


                    </div>


                    ${
                        movimiento.observaciones

                        ? `

                            <div class="comprobante-observaciones">

                                <span>
                                    Observaciones
                                </span>

                                <p>
                                    ${escaparHTMLAdmin(
                                        movimiento.observaciones
                                    )}
                                </p>

                            </div>

                        `

                        : ""
                    }


                    <div class="comprobante-separador"></div>


                    <div class="comprobante-footer">

                        <p>
                            Este comprobante acredita el registro
                            del pago realizado a MOTI GO.
                        </p>

                        <span>
                            ${escaparHTMLAdmin(
                                movimiento.registradoPorEmail ||
                                "Administrador MOTI GO"
                            )}
                        </span>

                    </div>


                </div>


                <div class="comprobante-acciones">


                    <button
                        type="button"
                        class="btn-secundario"
                        onclick="cerrarComprobantePago()"
                    >
                        Cerrar
                    </button>


                    <button
                        type="button"
                        class="btn-secundario"
                        onclick="descargarComprobantePago()"
                    >
                        📥 Descargar
                    </button>


                    <button
                        type="button"
                        class="btn-primary"
                        onclick="imprimirComprobantePago()"
                    >
                        🖨 Imprimir / PDF
                    </button>


                </div>


            </div>

        </div>

    `;


    document.body.appendChild(modal);


    window.comprobantePagoActual =
        movimiento;

};


window.cerrarComprobantePago = function() {

    const modal =
        document.getElementById(
            "modalComprobantePago"
        );

    if (modal) {
        modal.remove();
    }

    window.comprobantePagoActual =
        null;

};

function obtenerNombreMetodoPago(metodo) {

    const nombres = {

        transferencia:
            "Transferencia bancaria",

        deposito:
            "Depósito bancario",

        efectivo:
            "Efectivo",

        otro:
            "Otro"

    };


    return nombres[metodo] ||
        metodo ||
        "No especificado";

}

window.descargarComprobantePago = function() {

    const movimiento =
        window.comprobantePagoActual;


    if (!movimiento) {

        mostrarNotificacion(
            "No hay comprobante para descargar.",
            "error"
        );

        return;

    }


    const fecha =
        convertirFecha(
            movimiento.registradoEn ||
            movimiento.creadoEn
        );


    const fechaTexto = fecha
        ? fecha.toLocaleString("es-MX", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
        : new Date().toLocaleString("es-MX");


    const html = `

<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<title>
Comprobante ${movimiento.comprobanteNumero}
</title>

<style>

body {
    margin: 0;
    padding: 30px;
    background: #f3f4f6;
    font-family: Arial, sans-serif;
    color: #17251f;
}

.comprobante {
    max-width: 650px;
    margin: auto;
    background: white;
    padding: 35px;
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(0,0,0,.08);
}

.marca {
    display: flex;
    align-items: center;
    gap: 14px;
}

.logo {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: #17251f;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
}

.marca strong {
    display: block;
    font-size: 24px;
}

.marca span {
    color: #68756f;
    font-size: 13px;
}

.folio {
    margin-top: 30px;
    padding: 15px;
    background: #f4f7f5;
    border-radius: 10px;
}

.folio span {
    display: block;
    font-size: 11px;
    color: #68756f;
}

.folio strong {
    font-size: 18px;
}

.estado {
    margin-top: 15px;
    font-weight: bold;
}

.linea {
    height: 1px;
    background: #e5e7eb;
    margin: 25px 0;
}

.campo {
    margin-bottom: 18px;
}

.campo span {
    display: block;
    font-size: 11px;
    color: #68756f;
    margin-bottom: 5px;
}

.campo strong {
    font-size: 15px;
}

.total {
    margin: 25px 0;
    padding: 20px;
    border-radius: 12px;
    background: #f4f7f5;
}

.total span {
    display: block;
    font-size: 12px;
}

.total strong {
    display: block;
    margin-top: 6px;
    font-size: 30px;
}

.saldos {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
}

.saldo {
    padding: 14px;
    background: #f7f7f7;
    border-radius: 10px;
}

.saldo span {
    display: block;
    font-size: 11px;
    color: #68756f;
}

.saldo strong {
    display: block;
    margin-top: 6px;
}

.footer {
    margin-top: 30px;
    color: #68756f;
    font-size: 12px;
    text-align: center;
}

@media print {

    body {
        background: white;
        padding: 0;
    }

    .comprobante {
        box-shadow: none;
        max-width: none;
    }

}

</style>

</head>

<body>

<div class="comprobante">

    <div class="marca">

        <div class="logo">
            M
        </div>

        <div>

            <strong>
                MOTI GO
            </strong>

            <span>
                Comprobante oficial de pago
            </span>

        </div>

    </div>


    <div class="folio">

        <span>
            FOLIO
        </span>

        <strong>
            ${escaparHTMLAdmin(
                movimiento.comprobanteNumero
            )}
        </strong>

    </div>


    <div class="estado">
        ✓ PAGO CONFIRMADO
    </div>


    <div class="linea"></div>


    <div class="campo">

        <span>
            TIENDA
        </span>

        <strong>
            ${escaparHTMLAdmin(
                movimiento.tiendaNombre
            )}
        </strong>

    </div>


    <div class="campo">

        <span>
            FECHA
        </span>

        <strong>
            ${escaparHTMLAdmin(
                fechaTexto
            )}
        </strong>

    </div>


    <div class="total">

        <span>
            PAGO RECIBIDO
        </span>

        <strong>
            ${moneda(
                movimiento.monto
            )}
        </strong>

    </div>


    <div class="campo">

        <span>
            MÉTODO DE PAGO
        </span>

        <strong>
            ${escaparHTMLAdmin(
                obtenerNombreMetodoPago(
                    movimiento.metodo
                )
            )}
        </strong>

    </div>


    <div class="campo">

        <span>
            REFERENCIA
        </span>

        <strong>
            ${
                movimiento.referencia
                ? escaparHTMLAdmin(
                    movimiento.referencia
                )
                : "Sin referencia"
            }
        </strong>

    </div>


    <div class="saldos">


        <div class="saldo">

            <span>
                Saldo anterior
            </span>

            <strong>
                ${moneda(
                    movimiento.saldoAnterior
                )}
            </strong>

        </div>


        <div class="saldo">

            <span>
                Pago
            </span>

            <strong>
                ${moneda(
                    movimiento.monto
                )}
            </strong>

        </div>


        <div class="saldo">

            <span>
                Saldo pendiente
            </span>

            <strong>
                ${moneda(
                    movimiento.saldoPosterior
                )}
            </strong>

        </div>


    </div>


    ${
        movimiento.observaciones

        ? `

            <div class="linea"></div>

            <div class="campo">

                <span>
                    OBSERVACIONES
                </span>

                <strong>
                    ${escaparHTMLAdmin(
                        movimiento.observaciones
                    )}
                </strong>

            </div>

        `

        : ""
    }


    <div class="linea"></div>


    <div class="footer">

        Este comprobante acredita el registro
        del pago realizado a MOTI GO.

        <br><br>

        ${escaparHTMLAdmin(
            movimiento.registradoPorEmail ||
            "Administrador MOTI GO"
        )}

    </div>

</div>

</body>

</html>

    `;


    const blob =
        new Blob(
            [html],
            {
                type: "text/html;charset=utf-8"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const enlace =
        document.createElement("a");


    enlace.href = url;

    enlace.download =
        `MOTIGO-${movimiento.comprobanteNumero}.html`;


    document.body.appendChild(
        enlace
    );


    enlace.click();

    enlace.remove();


    URL.revokeObjectURL(url);


    mostrarNotificacion(
        "Comprobante descargado correctamente.",
        "success"
    );

};

window.imprimirComprobantePago = function() {

    const documento =
        document.getElementById(
            "comprobantePagoDocumento"
        );


    if (!documento) {

        mostrarNotificacion(
            "No se encontró el comprobante.",
            "error"
        );

        return;

    }


    const ventana =
        window.open(
            "",
            "_blank",
            "width=800,height=900"
        );


    if (!ventana) {

        mostrarNotificacion(
            "El navegador bloqueó la ventana del comprobante.",
            "error"
        );

        return;

    }


    ventana.document.write(`

        <!DOCTYPE html>

        <html lang="es">

        <head>

            <meta charset="UTF-8">

            <title>
                Comprobante MOTI GO
            </title>

            <style>

                body {
                    margin: 0;
                    padding: 30px;
                    background: #f3f4f6;
                    font-family: Arial, sans-serif;
                    color: #17251f;
                }

                .hoja {
                    max-width: 650px;
                    margin: auto;
                    background: white;
                    padding: 35px;
                    border-radius: 16px;
                }

                @media print {

                    body {
                        background: white;
                        padding: 0;
                    }

                    .hoja {
                        max-width: none;
                        padding: 20px;
                    }

                }

            </style>

        </head>

        <body>

            <div class="hoja">

                ${documento.innerHTML}

            </div>

            <script>

                window.onload = function() {

                    setTimeout(
                        function() {
                            window.print();
                        },
                        300
                    );

                };

            <\/script>

        </body>

        </html>

    `);


    ventana.document.close();

};
/* =========================================================
   CONFIGURACIÓN
========================================================= */

async function cargarConfiguracion() {

    try {

        const referencia =
            doc(
                db,
                "configuracion",
                "motigo"
            );


        const snapshot =
            await getDoc(
                referencia
            );


        if (
            snapshot.exists()
        ) {

            configuracionMOTI = {

                ...configuracionMOTI,

                ...snapshot.data()

            };

        }


        cargarValoresConfiguracion();

    }
    catch (error) {

        console.error(
            "Error cargando configuración:",
            error
        );

    }

}


/* =========================================================
   PREPARAR CONFIGURACIÓN
========================================================= */

function prepararConfiguracion() {

    cargarValoresConfiguracion();

    configurarNavegacionConfiguracion();

}


/* =========================================================
   CARGAR CAMPOS
========================================================= */

function cargarValoresConfiguracion() {

    const campos = {

        tarifaBase:
            "tarifaBase",

        precioKm:
            "precioKm",

        tiendaAdicional:
            "tiendaAdicional",

        minimoRepartidor:
            "minimoRepartidor",

        maximoRepartidor:
            "maximoRepartidor"

    };


    Object.entries(
        campos
    ).forEach(
        ([propiedad, id]) => {

            const elemento =
                document.getElementById(
                    id
                );

            if (elemento) {

                elemento.value =
                    configuracionMOTI[
                        propiedad
                    ];

            }

        }
    );

}


/* =========================================================
   NAVEGACIÓN CONFIGURACIÓN
========================================================= */

function configurarNavegacionConfiguracion() {

    const botones =
        document.querySelectorAll(
            ".config-nav button"
        );


    if (!botones.length) {
        return;
    }


    botones.forEach(
        (boton, indice) => {

            if (
                boton.dataset.configurado
            ) {
                return;
            }


            boton.dataset.configurado =
                "true";


            boton.addEventListener(
                "click",
                () => {

                    botones.forEach(
                        elemento =>
                            elemento.classList.remove(
                                "active"
                            )
                    );

                    boton.classList.add(
                        "active"
                    );


                    const texto =
                        boton.textContent
                            .trim()
                            .toLowerCase();


                    renderizarSubconfiguracion(
                        texto
                    );

                }
            );

        }
    );

}


/* =========================================================
   SUBCONFIGURACIÓN
========================================================= */

function renderizarSubconfiguracion(
    texto
) {

    const layout =
        document.querySelector(
            "#view-configuracion .config-layout"
        );


    if (!layout) {
        return;
    }


    if (
        texto.includes(
            "tiendas"
        )
    ) {

        mostrarConfigTiendas(
            layout
        );

        return;

    }


    if (
        texto.includes(
            "pagos"
        )
    ) {

        mostrarConfigPagos(
            layout
        );

        return;

    }


    if (
        texto.includes(
            "notificaciones"
        )
    ) {

        mostrarConfigNotificaciones(
            layout
        );

        return;

    }


    mostrarConfigEntregas(
        layout
    );

}


/* =========================================================
   CONFIG ENTREGAS
========================================================= */

function mostrarConfigEntregas(
    layout
) {

    const contenido =
        layout.children[1];

    if (!contenido) {
        return;
    }


    contenido.innerHTML = `

        <h3 class="config-section-title">
            Tarifas de entregas
        </h3>

        <p class="config-description">
            Estos valores serán utilizados por
            el sistema de cálculo de comisión
            del repartidor.
        </p>


        <div class="form-grid">

            <div class="field">

                <label for="tarifaBase">
                    Tarifa base
                </label>

                <input
                    id="tarifaBase"
                    type="number"
                    min="0"
                    step="1"
                    value="${configuracionMOTI.tarifaBase}"
                >

                <small>
                    Importe inicial de cada entrega.
                </small>

            </div>


            <div class="field">

                <label for="precioKm">
                    Precio por kilómetro
                </label>

                <input
                    id="precioKm"
                    type="number"
                    min="0"
                    step="1"
                    value="${configuracionMOTI.precioKm}"
                >

                <small>
                    Se aplica a la distancia tarifable.
                </small>

            </div>


            <div class="field">

                <label for="tiendaAdicional">
                    Tienda adicional
                </label>

                <input
                    id="tiendaAdicional"
                    type="number"
                    min="0"
                    step="1"
                    value="${configuracionMOTI.tiendaAdicional}"
                >

                <small>
                    Cargo por cada tienda adicional.
                </small>

            </div>


            <div class="field">

                <label for="minimoRepartidor">
                    Comisión mínima
                </label>

                <input
                    id="minimoRepartidor"
                    type="number"
                    min="0"
                    step="1"
                    value="${configuracionMOTI.minimoRepartidor}"
                >

                <small>
                    Nunca será inferior a este importe.
                </small>

            </div>


            <div class="field">

                <label for="maximoRepartidor">
                    Comisión máxima
                </label>

                <input
                    id="maximoRepartidor"
                    type="number"
                    min="0"
                    step="1"
                    value="${configuracionMOTI.maximoRepartidor}"
                >

                <small>
                    Límite superior.
                </small>

            </div>

        </div>


        <div class="config-actions">

            <span
                class="save-status"
                id="estadoConfiguracion"
            >
                Configuración cargada.
            </span>

            <button
                id="btnGuardarTarifas"
                class="btn-primary"
                type="button"
            >
                Guardar configuración
            </button>

        </div>

    `;


    configurarGuardarTarifas();

}


/* =========================================================
   CONFIG TIENDAS
========================================================= */

function mostrarConfigTiendas(
    layout
) {

    const contenido =
        layout.children[1];

    if (!contenido) {
        return;
    }


    contenido.innerHTML = `

        <h3 class="config-section-title">
            Comisiones de tiendas
        </h3>

        <p class="config-description">
            Define la comisión que MOTI GO recibe
            de las ventas y la participación que
            corresponde a los fundadores.
        </p>


        <div class="form-grid">

            <div class="field">

                <label for="comisionTiendaPorcentaje">
                    Comisión MOTI
                </label>

                <div class="config-input-suffix">

                    <input
                        id="comisionTiendaPorcentaje"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value="${
                            configuracionMOTI
                                .comisionTiendaPorcentaje
                        }"
                    >

                    <span>
                        %
                    </span>

                </div>

                <small>
                    Comisión que MOTI GO genera
                    sobre las ventas de la tienda.
                </small>

            </div>


            <div class="field">

                <label for="comisionFundadorPorcentaje">
                    Participación de fundadores
                </label>

                <div class="config-input-suffix">

                    <input
                        id="comisionFundadorPorcentaje"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value="${
                            configuracionMOTI
                                .comisionFundadorPorcentaje
                        }"
                    >

                    <span>
                        %
                    </span>

                </div>

                <small>
                    Porcentaje de la comisión de tienda
                    que corresponde a los fundadores.
                </small>

            </div>

        </div>


        <div class="admin-info-box">

            <strong>
                Ejemplo
            </strong>

            <p>
                Si una venta es de $200 y la comisión
                es del 10 %, MOTI genera $20.
                Si la participación de fundadores
                es del 100 %, los fundadores tendrán
                derecho a esos $20 una vez que MOTI
                haya recibido el pago de la tienda.
            </p>

        </div>


        <div class="config-actions">

            <span
                class="save-status"
                id="estadoConfiguracionTiendas"
            >
                Configuración actual.
            </span>

            <button
                id="btnGuardarComisionTienda"
                class="btn-primary"
                type="button"
            >
                Guardar configuración
            </button>

        </div>

    `;


    document
        .getElementById(
            "btnGuardarComisionTienda"
        )
        ?.addEventListener(
            "click",
            guardarComisionTienda
        );

}


/* =========================================================
   CONFIG PAGOS
========================================================= */

function mostrarConfigPagos(
    layout
) {

    const contenido =
        layout.children[1];

    if (!contenido) {
        return;
    }


    contenido.innerHTML = `

        <h3 class="config-section-title">
            Pagos
        </h3>

        <p class="config-description">
            Reglas de pago utilizadas por MOTI GO.
        </p>


        <div class="admin-config-options">

            <div class="admin-config-option">

                <div>

                    <strong>
                        Mandaditos
                    </strong>

                    <p>
                        Actualmente opera con pago
                        en efectivo al realizar
                        la compra.
                    </p>

                </div>

                <span class="admin-config-badge">
                    EFECTIVO
                </span>

            </div>


            <div class="admin-config-option">

                <div>

                    <strong>
                        Marketplace
                    </strong>

                    <p>
                        Los pagos electrónicos
                        pertenecerán al módulo
                        independiente de Marketplace.
                    </p>

                </div>

                <span class="admin-config-badge">
                    SEPARADO
                </span>

            </div>

        </div>

    `;

}


/* =========================================================
   CONFIG NOTIFICACIONES
========================================================= */

function mostrarConfigNotificaciones(
    layout
) {

    const contenido =
        layout.children[1];

    if (!contenido) {
        return;
    }


    contenido.innerHTML = `

        <h3 class="config-section-title">
            Notificaciones
        </h3>

        <p class="config-description">
            Preparación para administrar las
            comunicaciones del sistema.
        </p>


        <div class="admin-config-options">

            <div class="admin-config-option">

                <div>

                    <strong>
                        Nuevos pedidos
                    </strong>

                    <p>
                        Notificar cuando exista
                        una nueva solicitud.
                    </p>

                </div>

                <span class="admin-config-badge">
                    PREPARADO
                </span>

            </div>


            <div class="admin-config-option">

                <div>

                    <strong>
                        Incidencias
                    </strong>

                    <p>
                        Preparado para reportes
                        administrativos.
                    </p>

                </div>

                <span class="admin-config-badge">
                    PREPARADO
                </span>

            </div>

        </div>

    `;

}


/* =========================================================
   GUARDAR TARIFAS
========================================================= */

function configurarGuardarTarifas() {

    const boton =
        document.getElementById(
            "btnGuardarTarifas"
        );


    const estado =
        document.getElementById(
            "estadoConfiguracion"
        );


    if (!boton) {
        return;
    }


    boton.addEventListener(
        "click",
        guardarTarifas
    );


    [
        "tarifaBase",
        "precioKm",
        "tiendaAdicional",
        "minimoRepartidor",
        "maximoRepartidor"
    ]
        .forEach(
            id => {

                document
                    .getElementById(id)
                    ?.addEventListener(
                        "input",
                        () => {

                            if (estado) {

                                estado.textContent =
                                    "Cambios pendientes de guardar.";

                            }

                        }
                    );

            }
        );

}


/* =========================================================
   GUARDAR TARIFAS FIREBASE
========================================================= */

async function guardarTarifas() {

    const tarifaBase =
        Number(
            document.getElementById(
                "tarifaBase"
            )?.value
        );


    const precioKm =
        Number(
            document.getElementById(
                "precioKm"
            )?.value
        );


    const tiendaAdicional =
        Number(
            document.getElementById(
                "tiendaAdicional"
            )?.value
        );


    const minimoRepartidor =
        Number(
            document.getElementById(
                "minimoRepartidor"
            )?.value
        );


    const maximoRepartidor =
        Number(
            document.getElementById(
                "maximoRepartidor"
            )?.value
        );


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

        mostrarNotificacion(
            "La comisión máxima no puede ser menor que la mínima.",
            "advertencia"
        );

        return;

    }


    try {

        const boton =
            document.getElementById(
                "btnGuardarTarifas"
            );


        if (boton) {

            boton.disabled =
                true;

            boton.textContent =
                "Guardando...";

        }


        await setDoc(
            doc(
                db,
                "configuracion",
                "motigo"
            ),
            {

                tarifaBase,

                precioKm,

                tiendaAdicional,

                minimoRepartidor,

                maximoRepartidor,

                comisionTiendaPorcentaje:
                    configuracionMOTI
                        .comisionTiendaPorcentaje,

                actualizadoPor:
                    auth.currentUser?.uid ||
                    null,

                actualizadoEn:
                    serverTimestamp()

            },
            {
                merge: true
            }
        );


        configuracionMOTI = {

            ...configuracionMOTI,

            tarifaBase,
            precioKm,
            tiendaAdicional,
            minimoRepartidor,
            maximoRepartidor

        };


        mostrarNotificacion(
            "Las tarifas fueron guardadas correctamente en Firebase.",
            "exito"
        );


        const estado =
            document.getElementById(
                "estadoConfiguracion"
            );


        if (estado) {

            estado.textContent =
                "Configuración guardada correctamente.";

        }

    }
    catch (error) {

        console.error(
            "Error guardando tarifas:",
            error
        );


        mostrarNotificacion(
            "No se pudo guardar la configuración.",
            "error"
        );

    }
    finally {

        const boton =
            document.getElementById(
                "btnGuardarTarifas"
            );

        if (boton) {

            boton.disabled =
                false;

            boton.textContent =
                "Guardar configuración";

        }

    }

}


/* =========================================================
   GUARDAR COMISIÓN TIENDA
========================================================= */

async function guardarComisionTienda() {

    const campo =
        document.getElementById(
            "comisionTiendaPorcentaje"
        );


    const campoFundador =
        document.getElementById(
            "comisionFundadorPorcentaje"
        );


    if (
        !campo ||
        !campoFundador
    ) {
        return;
    }


    const porcentaje =
        Number(
            campo.value
        );


    const porcentajeFundador =
        Number(
            campoFundador.value
        );


    if (
        !Number.isFinite(porcentaje) ||
        porcentaje < 0 ||
        porcentaje > 100
    ) {

        mostrarNotificacion(
            "La comisión de tiendas debe estar entre 0 % y 100 %.",
            "advertencia"
        );

        return;

    }


    if (
        !Number.isFinite(porcentajeFundador) ||
        porcentajeFundador < 0 ||
        porcentajeFundador > 100
    ) {

        mostrarNotificacion(
            "La participación de fundadores debe estar entre 0 % y 100 %.",
            "advertencia"
        );

        return;

    }


    try {

        const boton =
            document.getElementById(
                "btnGuardarComisionTienda"
            );


        if (boton) {

            boton.disabled =
                true;

            boton.textContent =
                "Guardando...";

        }


        await setDoc(
            doc(
                db,
                "configuracion",
                "motigo"
            ),
            {

                tarifaBase:
                    configuracionMOTI
                        .tarifaBase,

                precioKm:
                    configuracionMOTI
                        .precioKm,

                tiendaAdicional:
                    configuracionMOTI
                        .tiendaAdicional,

                minimoRepartidor:
                    configuracionMOTI
                        .minimoRepartidor,

                maximoRepartidor:
                    configuracionMOTI
                        .maximoRepartidor,

                comisionTiendaPorcentaje:
                    porcentaje,

                comisionFundadorPorcentaje:
                    porcentajeFundador,

                actualizadoPor:
                    auth.currentUser?.uid ||
                    null,

                actualizadoEn:
                    serverTimestamp()

            },
            {
                merge: true
            }
        );


        configuracionMOTI = {

            ...configuracionMOTI,

            comisionTiendaPorcentaje:
                porcentaje,

            comisionFundadorPorcentaje:
                porcentajeFundador

        };


        mostrarNotificacion(
            "La configuración de comisiones fue guardada correctamente.",
            "exito"
        );


        const estado =
            document.getElementById(
                "estadoConfiguracionTiendas"
            );


        if (estado) {

            estado.textContent =
                "Configuración guardada correctamente.";

        }

    }
    catch (error) {

        console.error(
            "Error guardando configuración de comisiones:",
            error
        );


        mostrarNotificacion(
            "No se pudo guardar la configuración de comisiones.",
            "error"
        );

    }
    finally {

        const boton =
            document.getElementById(
                "btnGuardarComisionTienda"
            );


        if (boton) {

            boton.disabled =
                false;

            boton.textContent =
                "Guardar configuración";

        }

    }

}


/* =========================================================
   RESUMEN
========================================================= */

function actualizarResumen() {

    const vista =
        document.getElementById(
            "view-inicio"
        );


    if (!vista) {
        return;
    }


    const tarjetas =
        vista.querySelectorAll(
            ".stat"
        );


    if (tarjetas.length < 4) {
        return;
    }


    const hoy =
        new Date();


    const pedidosHoy =
        pedidosActuales.filter(
            pedido => {

                const fecha =
                    convertirFecha(
                        pedido.creadoEn
                    );

                if (!fecha) {
                    return false;
                }

                return (
                    fecha.getDate() ===
                    hoy.getDate() &&

                    fecha.getMonth() ===
                    hoy.getMonth() &&

                    fecha.getFullYear() ===
                    hoy.getFullYear()
                );

            }
        );


    const ventasHoy =
        pedidosHoy.reduce(
            (total, pedido) =>
                total +
                Number(
                    pedido.subtotal ||
                    pedido.totalProductos ||
                    0
                ),
            0
        );


    const ingresosMOTI =
        pedidosHoy.reduce(
            (total, pedido) =>
                total +
                Number(
                    pedido.comisionTienda ||
                    0
                ),
            0
        );


    const valores = [

        pedidosHoy.length,

        repartidoresActuales.filter(
            repartidor =>
                repartidor.activo !== false
        ).length,

        moneda(
            ventasHoy
        ),

        moneda(
            ingresosMOTI
        )

    ];


    tarjetas.forEach(
        (tarjeta, indice) => {

            const valor =
                tarjeta.querySelector(
                    ".stat-value"
                );

            if (valor) {

                valor.textContent =
                    valores[indice];

            }

        }
    );

}


/* =========================================================
   CONVERTIR FECHA FIREBASE
========================================================= */

function convertirFecha(
    valor
) {

    if (!valor) {
        return null;
    }


    if (
        typeof valor.toDate ===
        "function"
    ) {

        return valor.toDate();

    }


    if (
        valor instanceof Date
    ) {

        return valor;

    }


    if (
        typeof valor ===
        "string" ||
        typeof valor ===
        "number"
    ) {

        const fecha =
            new Date(valor);

        return Number.isNaN(
            fecha.getTime()
        )
            ? null
            : fecha;

    }


    if (
        valor.seconds
    ) {

        return new Date(
            valor.seconds * 1000
        );

    }


    return null;

}


/* =========================================================
   UTILIDAD VACÍO
========================================================= */

function crearVacio(
    icono,
    titulo,
    texto
) {

    return `

        <div class="admin-empty">

            <div class="admin-empty-icon">
                ${icono}
            </div>

            <h3>
                ${escaparHTMLAdmin(
                    titulo
                )}
            </h3>

            <p>
                ${escaparHTMLAdmin(
                    texto
                )}
            </p>

        </div>

    `;

}


/* =========================================================
   INVITACIONES — MODAL
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


if (btnNuevaTienda) {

    btnNuevaTienda.addEventListener(
        "click",
        abrirModalNuevaTienda
    );

}


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
   CÓDIGO INVITACIÓN
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

        codigo +=
            caracteres[
                Math.floor(
                    Math.random() *
                    caracteres.length
                )
            ];

    }


    return codigo;

}


/* =========================================================
   QR
========================================================= */

function generarQRInvitacion(
    enlaceRegistro
) {

    const contenedor =
        document.getElementById(
            "qrInvitacionTienda"
        );


    if (!contenedor) {
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
            "No se pudo preparar el QR.",
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


    try {

        btnGenerarInvitacion.disabled =
            true;

        btnGenerarInvitacion.textContent =
            "Generando...";


        let codigo;
        let referencia;
        let snapshot;
        let intentos = 0;


        do {

            codigo =
                generarCodigoInvitacion();


            referencia =
                doc(
                    db,
                    "invitacionesTiendas",
                    codigo
                );


            snapshot =
                await getDoc(
                    referencia
                );


            intentos++;

        }
        while (
            snapshot.exists() &&
            intentos < 5
        );


        if (
            snapshot.exists()
        ) {

            throw new Error(
                "No se pudo generar un código único."
            );

        }


        await setDoc(
            referencia,
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


        contenidoInvitacionTienda.innerHTML = `

            <div class="invitacion-generada">

                <div class="invitacion-exito">
                    ✓ Invitación generada
                </div>


                <div class="invitacion-bloque">

                    <span class="invitacion-label">
                        Código
                    </span>

                    <strong class="invitacion-codigo">
                        ${codigo}
                    </strong>

                </div>


                <div class="invitacion-bloque">

                    <span class="invitacion-label">
                        Enlace
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
                        directamente el registro.
                    </p>

                </div>


                <div class="invitacion-acciones">

                    <button
                        type="button"
                        class="btn-principal"
                        id="btnCopiarInvitacion"
                    >
                        Copiar enlace
                    </button>


                    <button
                        type="button"
                        class="btn-secundario"
                        id="btnDescargarQR"
                    >
                        Descargar QR
                    </button>

                </div>


                <div class="invitacion-aviso">

                    🔒 Esta invitación es de un solo uso.

                </div>

            </div>

        `;


        generarQRInvitacion(
            enlaceRegistro
        );


        document
            .getElementById(
                "btnCopiarInvitacion"
            )
            ?.addEventListener(
                "click",
                async () => {

                    try {

                        await navigator.clipboard.writeText(
                            enlaceRegistro
                        );

                        mostrarNotificacion(
                            "Enlace copiado correctamente.",
                            "exito"
                        );

                    }
                    catch (error) {

                        mostrarNotificacion(
                            "No se pudo copiar el enlace.",
                            "error"
                        );

                    }

                }
            );


        document
            .getElementById(
                "btnDescargarQR"
            )
            ?.addEventListener(
                "click",
                () => {

                    descargarQRInvitacion(
                        codigo
                    );

                }
            );


        mostrarNotificacion(
            "La invitación fue generada correctamente.",
            "exito"
        );

    }
    catch (error) {

        console.error(
            "Error creando invitación:",
            error
        );


        mostrarNotificacion(
            "No se pudo crear la invitación.",
            "error"
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


if (btnGenerarInvitacion) {

    btnGenerarInvitacion.addEventListener(
        "click",
        crearInvitacionTienda
    );

}


/* =========================================================
   AUTENTICACIÓN
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
               INICIAR DATOS
            ------------------------------------------------- */

            escucharTiendas();

            escucharUsuarios();

            escucharPedidos();

            escucharMovimientosTiendas();

            await cargarConfiguracion();

            actualizarResumen();

        }
        catch (error) {

            console.error(
                "Error verificando administrador:",
                error
            );


            mostrarNotificacion(
                "No se pudo verificar tu cuenta administrativa.",
                "error"
            );


            try {

                await signOut(
                    auth
                );

            }
            catch (errorLogout) {

                console.error(
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
   INICIO
========================================================= */

mostrarVista(
    "inicio"
);


console.log(
    "🚀 MOTI GO ADMIN: panel iniciado."
);
