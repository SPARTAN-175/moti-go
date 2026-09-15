import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
 
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// =========================================
// ELEMENTOS
// =========================================

const statusButton =
    document.getElementById("statusButton");

const statusDescription =
    document.getElementById("statusDescription");

const statusIndicator =
    document.getElementById("statusIndicator");

const statusToggle =
    document.getElementById("statusToggle");

const requestPopup =
    document.getElementById("requestPopup");

const requestContent =
    document.getElementById("requestContent");

const activeTripCard =
    document.getElementById("activeTripCard");

const activePassenger =
    document.getElementById("activePassenger");

const activeDestination =
    document.getElementById("activeDestination");

const activeStatus =
    document.getElementById("activeStatus");

const continueTrip =
    document.getElementById("continueTrip");

const userName =
    document.getElementById("userName");

const sideUserName =
    document.getElementById("sideUserName");

const todayOrders =
    document.getElementById("todayOrders");

const todayEarnings =
    document.getElementById("todayEarnings");

const walletBalance =
    document.getElementById("walletBalance");

const walletEarnings =
    document.getElementById("walletEarnings");

const walletFees =
    document.getElementById("walletFees");

const todayDate =
    document.getElementById("todayDate");


// =========================================
// MENU LATERAL
// =========================================

const sideMenu =
    document.getElementById("sideMenu");

const menuOverlay =
    document.getElementById("menuOverlay");

const openMenu =
    document.getElementById("openMenu");

const closeMenu =
    document.getElementById("closeMenu");


function abrirMenu() {

    sideMenu.classList.add("open");

    menuOverlay.classList.add("open");

}


function cerrarMenu() {

    sideMenu.classList.remove("open");

    menuOverlay.classList.remove("open");

}


openMenu.addEventListener(
    "click",
    abrirMenu
);


closeMenu.addEventListener(
    "click",
    cerrarMenu
);


menuOverlay.addEventListener(
    "click",
    cerrarMenu
);

// =========================================================
// NAVEGACIÓN INTERNA DEL DASHBOARD
// =========================================================

const homeView =
    document.getElementById(
        "homeView"
    );

const singlePageViews =
    document.getElementById(
        "singlePageViews"
    );


document
    .querySelectorAll(
        "[data-view]"
    )
    .forEach(
        boton => {

            boton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    const vista =
                        boton.dataset.view;


                    // =====================================
                    // INICIO
                    // =====================================

                    if (
                        vista ===
                        "inicio"
                    ) {

                        if (homeView) {
                            homeView.hidden =
                                false;
                        }

                        if (singlePageViews) {
                            singlePageViews.hidden =
                                true;
                        }

                        cerrarMenu();

                        return;
                    }


                    // =====================================
                    // VISTA INTERNA
                    // =====================================

                    if (singlePageViews) {

                        singlePageViews.hidden =
                            false;

                    }


                    if (homeView) {

                        homeView.hidden =
                            true;

                    }


                    document
                        .querySelectorAll(
                            ".dashboard-view"
                        )
                        .forEach(
                            vistaElemento => {

                                vistaElemento.hidden =
                                    true;

                            }
                        );


                    const vistaSeleccionada =
                        document.getElementById(
                            `view-${vista}`
                        );


                    if (
                        vistaSeleccionada
                    ) {

                        vistaSeleccionada.hidden =
                            false;

                    }


                    // =====================================
                    // CARGAS ESPECÍFICAS
                    // =====================================

                    if (
                        vista ===
                        "pedidos"
                    ) {

                        iniciarPedidosDisponibles();

                    }


                    if (
                        vista ===
                        "ganancias"
                    ) {

                        iniciarVistaGanancias();

                    }


                    if (
                        vista ===
                        "historial"
                    ) {

                        iniciarVistaHistorial();

                    }


                    cerrarMenu();

                }
            );

        }
    );

// =========================================
// ESTADO
// =========================================

let currentState = null;
let listenerUsuario = null;

// =========================================
// SOLICITUD ACTUAL
// =========================================

let ultimaSolicitud = null;

let temporizador = null;

let segundosRestantes = 15;

let listenerSolicitud = null;

let listenerSolicitudes = null;


// =========================================
// FECHA
// =========================================

const ahora = new Date();

todayDate.textContent =
    ahora.toLocaleDateString(
        "es-MX",
        {
            day: "numeric",
            month: "short"
        }
    );


// =========================================
// CONTINUAR PEDIDO / VIAJE
// =========================================

continueTrip.addEventListener(
    "click",
    () => {

        window.location.href =
            "viaje-activo.html";

    }
);


// =========================================
// BOTONES DEL POPUP
// =========================================

requestContent.addEventListener(
    "click",
    (event) => {

        if (
            event.target.classList.contains(
                "accept-trip"
            )
        ) {

            aceptarSolicitud(
                ultimaSolicitud
            );

        }


        if (
            event.target.classList.contains(
                "reject-trip"
            )
        ) {

            rechazarSolicitud(
                ultimaSolicitud
            );

        }

    }
);


// =========================================
// PERFIL DEL REPARTIDOR
// =========================================

function renderizarPerfilRepartidor(datos) {
    const nombre = datos?.nombre || "Repartidor";
    const correo = datos?.email || "Sin correo";
    const telefono = datos?.telefono || datos?.celular || "No registrado";
    const localidad = datos?.localidad || datos?.municipio || "No registrada";
    const valoracion = datos?.valoracionRepartidor || {};
    const promedio = Number(valoracion.promedio) || 0;
    const cantidad = Number(valoracion.cantidad) || 0;
    const estrellas = cantidad > 0 ? Array.from({ length: 5 }, (_, indice) => indice < Math.round(promedio) ? "★" : "☆").join("") : "☆☆☆☆☆";

    const elementos = {
        nombre: document.getElementById("perfilRepartidorNombre"),
        correo: document.getElementById("perfilRepartidorCorreo"),
        telefono: document.getElementById("perfilRepartidorTelefono"),
        localidad: document.getElementById("perfilRepartidorLocalidad"),
        promedio: document.getElementById("perfilRepartidorPromedio"),
        estrellas: document.getElementById("perfilRepartidorEstrellas"),
        cantidad: document.getElementById("perfilRepartidorCantidad")
    };

    if (elementos.nombre) elementos.nombre.textContent = nombre;
    if (elementos.correo) elementos.correo.textContent = correo;
    if (elementos.telefono) elementos.telefono.textContent = telefono;
    if (elementos.localidad) elementos.localidad.textContent = localidad;
    if (elementos.promedio) elementos.promedio.textContent = promedio.toFixed(1);
    if (elementos.estrellas) elementos.estrellas.textContent = estrellas;
    if (elementos.cantidad) elementos.cantidad.textContent = cantidad === 0 ? "Sin valoraciones todavía" : cantidad === 1 ? "1 valoración recibida" : `${cantidad} valoraciones recibidas`;
}


// =========================================
// AUTENTICACIÓN
// =========================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {
            return;
        }


        try {

            const docRef =
                doc(
                    db,
                    "usuarios",
                    user.uid
                );


            const docSnap =
                await getDoc(
                    docRef
                );


            if (!docSnap.exists()) {
                return;
            }


            const datos =
                docSnap.data();


            renderizarPerfilRepartidor(datos);


            // =============================
            // NOMBRE
            // =============================

            const nombre =
                datos.nombre ||
                "Repartidor";


            if (userName) {

                userName.textContent =
                    `Hola ${nombre}`;

            }


            if (sideUserName) {

                sideUserName.textContent =
                    nombre;

            }


// =========================================
// ESTADO REAL DEL REPARTIDOR
// =========================================

const viajeActivo =
    datos.viajeActivo;


const pedidoActivoId =
    viajeActivo &&
    typeof viajeActivo === "object"
        ? viajeActivo.pedidoId
        : (
            typeof viajeActivo === "string"
                ? viajeActivo
                : null
        );


const tieneViajeActivo =
    typeof pedidoActivoId === "string" &&
    pedidoActivoId.trim() !== "";

console.log(
    "🔎 MOTI GO: comprobando viaje activo:",
    {
        estadoServicio:
            datos.estadoServicio,

        viajeActivo:
            datos.viajeActivo,

        pedidoActivoId:
            pedidoActivoId,

        tieneViajeActivo:
            tieneViajeActivo
    }
);


const nuevoEstado =
    tieneViajeActivo
        ? "ocupado"
        : (
            datos.estadoServicio ||
            "disponible"
        );


currentState =
    nuevoEstado;


console.log(
    "🔄 MOTI GO: estado inicial calculado:",
    currentState,
    "viajeActivo:",
    datos.viajeActivo
);


actualizarVista();


escucharEstadoRepartidor(
    user
);


            // =============================
            // ESTADÍSTICAS
            // =============================

            cargarEstadisticas();


            /*/ =============================
            // CARTERA
            // =============================

            cargarCartera(
                datos
            );*/


            // =============================
            // VIAJE ACTIVO
            // =============================

            await verificarViajeActivo();


            // =============================
            // SOLICITUDES
            // =============================

            if (
                currentState ===
                "disponible"
            ) {

                escucharSolicitudes();

            }


            // =============================
            // CAMBIO DE ESTADO
            // =============================

            statusToggle.addEventListener(
                "click",
                async () => {

                    if (
                    currentState ===
                    "ocupado"
                    ) {

                    return;

                    }


                    const nuevoEstado =
                        currentState ===
                        "disponible"
                            ? "no_disponible"
                            : "disponible";


                    currentState =
                        nuevoEstado;


                    await updateDoc(
                        docRef,
                        {
                            estadoServicio:
                                currentState
                        }
                    );


                    actualizarVista();


                    if (
                        currentState ===
                        "disponible"
                    ) {

                        escucharSolicitudes();

                    }
                    else {

                        detenerEscuchaSolicitudes();

                    }

                }
            );

        }
        catch (error) {

            console.error(
                "Error cargando dashboard:",
                error
            );

        }

    }
);

// =========================================
// ESCUCHAR ESTADO DEL REPARTIDOR
// =========================================

function escucharEstadoRepartidor(
    user
) {

    if (
        listenerUsuario
    ) {

        listenerUsuario();

        listenerUsuario =
            null;

    }


    const usuarioRef =
        doc(
            db,
            "usuarios",
            user.uid
        );


    listenerUsuario =
        onSnapshot(

            usuarioRef,

            snapshot => {

                if (
                    !snapshot.exists()
                ) {

                    return;

                }


                const datos =
                    snapshot.data();


                renderizarPerfilRepartidor(datos);


// =========================================
// DETERMINAR ESTADO REAL DEL REPARTIDOR
// =========================================

const viajeActivo =
    datos.viajeActivo;


const tieneViajeActivo =
    viajeActivo &&
    typeof viajeActivo ===
        "object" &&
    viajeActivo.pedidoId;


const nuevoEstado =
    tieneViajeActivo
        ? "ocupado"
        : (
            datos.estadoServicio ||
            "disponible"
        );


                const estadoAnterior =
                    currentState;


                currentState =
                    nuevoEstado;


                console.log(
                    "🔄 MOTI GO: estado del repartidor actualizado:",
                    currentState
                );


                actualizarVista();


                // =================================
                // SI ESTÁ OCUPADO
                // =================================

                if (
                    currentState ===
                    "ocupado"
                ) {

                    detenerEscuchaSolicitudes();


                    verificarViajeActivo();

                }


                // =================================
                // SI ESTÁ DISPONIBLE
                // =================================

                if (
                    currentState ===
                    "disponible"
                ) {

                    escucharSolicitudes();

                }


                // =================================
                // SI ESTÁ NO DISPONIBLE
                // =================================

                if (
                    currentState ===
                    "no_disponible"
                ) {

                    detenerEscuchaSolicitudes();

                }


                if (
                    estadoAnterior !==
                    currentState
                ) {

                    console.log(
                        "🔄 MOTI GO: cambio de estado:",
                        estadoAnterior,
                        "→",
                        currentState
                    );

                }

            },

            error => {

                console.error(
                    "❌ MOTI GO: error escuchando estado del repartidor:",
                    error
                );

            }

        );

}

// =========================================
// VISTA DEL ESTADO
// =========================================

function actualizarVista() {

    statusButton.classList.remove(
        "status-green",
        "status-gray",
        "status-yellow"
    );


    if (
        currentState ===
        "disponible"
    ) {

        statusButton.textContent =
            "Disponible";


        statusDescription.textContent =
            "Estás recibiendo pedidos";


        statusButton.classList.add(
            "status-green"
        );


        statusIndicator.style.background =
            "var(--go-green)";

        return;

    }


    if (
        currentState ===
        "no_disponible"
    ) {

        statusButton.textContent =
            "No disponible";


        statusDescription.textContent =
            "No estás recibiendo pedidos";


        statusButton.classList.add(
            "status-gray"
        );


        statusIndicator.style.background =
            "#64706a";

        return;

    }


   if (
    currentState ===
    "ocupado"
) {

    statusButton.textContent =
        "Ocupado";


    statusDescription.textContent =
        "Tienes un pedido activo";


    statusButton.classList.add(
        "status-yellow"
    );


    statusIndicator.style.background =
        "var(--go-warning)";

    return;

}
}


// =========================================
// ESTADÍSTICAS REALES DE HOY
// =========================================

let listenerEstadisticas = null;


function cargarEstadisticas() {

    const user = auth.currentUser;

    if (!user) {
        return;
    }


    // =========================================
    // EVITAR DUPLICAR LISTENER
    // =========================================

    if (listenerEstadisticas) {

        listenerEstadisticas();

        listenerEstadisticas = null;

    }


    const uid = user.uid;


    // =========================================
    // FECHA DE HOY
    // =========================================

    const ahora = new Date();


    const inicioHoy = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate(),
        0,
        0,
        0,
        0
    );


    const finHoy = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate(),
        23,
        59,
        59,
        999
    );


    // =========================================
    // PEDIDOS DEL REPARTIDOR
    // =========================================

    const pedidosRef =
        collection(
            db,
            "pedidos"
        );


    const q =
        query(
            pedidosRef,
            where(
                "repartidorId",
                "==",
                uid
            )
        );


    listenerEstadisticas =
        onSnapshot(
            q,

            (snapshot) => {

                let pedidosHoy = 0;

                let gananciasHoy = 0;


                snapshot.forEach(
                    (pedidoDoc) => {

                        const pedido =
                            pedidoDoc.data();


                        // =================================
                        // SOLO PEDIDOS ENTREGADOS
                        // =================================

                        if (
                            pedido.estado !==
                            "entregado"
                        ) {
                            return;
                        }


                        // =================================
                        // ENTREGA CONFIRMADA
                        // =================================

                        if (
                            pedido.entregaConfirmada !==
                            true
                        ) {
                            return;
                        }


                        // =================================
                        // FECHA DE FINALIZACIÓN
                        // =================================

                        let fechaFinalizacion =
                            null;


                        if (
                            pedido.fechaFinalizacion &&
                            typeof pedido.fechaFinalizacion.toDate ===
                                "function"
                        ) {

                            fechaFinalizacion =
                                pedido.fechaFinalizacion.toDate();

                        }
                        else if (
                            pedido.fechaFinalizacion
                        ) {

                            fechaFinalizacion =
                                new Date(
                                    pedido.fechaFinalizacion
                                );

                        }


                        // =================================
                        // SIN FECHA = NO CONTAR
                        // =================================

                        if (
                            !fechaFinalizacion ||
                            isNaN(
                                fechaFinalizacion.getTime()
                            )
                        ) {

                            return;

                        }


                        // =================================
                        // SOLO HOY
                        // =================================

                        if (
                            fechaFinalizacion < inicioHoy ||
                            fechaFinalizacion > finHoy
                        ) {

                            return;

                        }


                        // =================================
                        // CONTAR PEDIDO
                        // =================================

                        pedidosHoy++;


                        // =================================
                        // GANANCIA DEL REPARTIDOR
                        // =================================

                        const gananciaRepartidor =
                            Number(
                                pedido
                                    .comisiones
                                    ?.repartidor
                                    ?.monto
                            ) || 0;


                        gananciasHoy +=
                            gananciaRepartidor;

                    }
                );


                // =========================================
                // MOSTRAR PEDIDOS
                // =========================================

                if (todayOrders) {

                    todayOrders.textContent =
                        pedidosHoy;

                }


                // =========================================
                // MOSTRAR GANANCIAS
                // =========================================

                if (todayEarnings) {

                    todayEarnings.textContent =
                        formatearDinero(
                            gananciasHoy
                        );

                }


                console.log(
                    "📊 MOTI GO — DATOS REALES DE HOY",
                    {
                        repartidorId: uid,
                        pedidosEncontrados:
                            snapshot.size,
                        pedidosHoy:
                            pedidosHoy,
                        gananciasHoy:
                            gananciasHoy
                    }
                );

            },

            (error) => {

                console.error(
                    "❌ MOTI GO — Error obteniendo estadísticas:",
                    error
                );

            }
        );

}


// =========================================
// CARTERA
// =========================================

/*function cargarCartera(
    datos
) {

    const saldo =
        datos.saldoCartera ??
        0;


    const ganancias =
        datos.gananciasTotales ??
        0;


    const comisiones =
        datos.comisionesTotales ??
        0;


    walletBalance.textContent =
        formatearDinero(
            saldo
        );


    walletEarnings.textContent =
        formatearDinero(
            ganancias
        );


    walletFees.textContent =
        formatearDinero(
            comisiones
        );

}*/


// =========================================
// FORMATO DINERO
// =========================================

function formatearDinero(
    cantidad
) {

    const numero =
        Number(cantidad) || 0;


    return numero.toLocaleString(
        "es-MX",
        {
            style: "currency",
            currency: "MXN"
        }
    );

}


// =========================================
// SOLICITUDES EN TIEMPO REAL
// =========================================

function escucharSolicitudes() {

    if (listenerSolicitudes) {
        return;
    }


    const user =
        auth.currentUser;


    if (!user) {
        return;
    }


    const uid =
        user.uid;


    const q =
        query(

            collection(
                db,
                "solicitudes"
            ),

            where(
                "conductorId",
                "==",
                uid
            ),

            where(
                "estado",
                "==",
                "pendiente"
            ),

            orderBy(
                "fechaSolicitud",
                "desc"
            ),

            limit(1)

        );


    listenerSolicitudes =
        onSnapshot(

            q,

            (snapshot) => {

                if (
                    snapshot.empty
                ) {

                    requestPopup.style.display =
                        "none";


                    ultimaSolicitud =
                        null;


                    return;

                }


                const solicitud =
                    snapshot.docs[0];


                if (
                    ultimaSolicitud ===
                    solicitud.id
                ) {

                    return;

                }


                ultimaSolicitud =
                    solicitud.id;


                mostrarPopup(
                    solicitud.id,
                    solicitud.data()
                );


                iniciarTemporizador(
                    solicitud.id
                );

            },

            (error) => {

                console.error(
                    "Error escuchando solicitudes:",
                    error
                );

            }

        );

}


// =========================================
// DETENER LISTENER
// =========================================

function detenerEscuchaSolicitudes() {

    if (listenerSolicitudes) {

        listenerSolicitudes();

        listenerSolicitudes =
            null;

    }

}


// =========================================
// MOSTRAR POPUP
// =========================================

function mostrarPopup(
    id,
    datos
) {

    const tipoViaje =
        datos.tipoViaje ===
        "especial"
            ? "ESPECIAL"
            : "LOCAL";


    let hora = "";


    if (
        datos.fechaSolicitud &&
        datos.fechaSolicitud.toDate
    ) {

        hora =
            datos.fechaSolicitud
                .toDate()
                .toLocaleTimeString(
                    "es-MX",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );

    }


    requestContent.innerHTML = `

        <div class="popup-local">

            <h3>
                Nuevo pedido
            </h3>

            <div class="trip-badge">
                ${tipoViaje}
            </div>

            <p>

                <strong>
                    ${datos.nombrePasajero || "Cliente"}
                </strong>

            </p>

            ${
                hora
                    ? `
                    <p class="popup-time">
                        ${hora}
                    </p>
                    `
                    : ""
            }

            <p>

                <strong>
                    Destino
                </strong>

                <br>

                ${datos.destino || "-"}

            </p>

            <p>

                <strong>
                    Referencia
                </strong>

                <br>

                ${datos.observaciones || "-"}

            </p>


            <div class="popup-actions">

                <button
                    class="reject-trip"
                    type="button">

                    Rechazar

                </button>


                <button
                    class="accept-trip"
                    type="button">

                    Aceptar

                </button>

            </div>

        </div>

    `;


    requestPopup.style.display =
        "block";


    // =============================
    // ESCUCHAR CAMBIOS DEL PEDIDO
    // =============================

    if (listenerSolicitud) {

        listenerSolicitud();

    }


    listenerSolicitud =
        onSnapshot(

            doc(
                db,
                "solicitudes",
                id
            ),

            (docSnap) => {

                if (
                    !docSnap.exists()
                ) {

                    return;

                }


                const solicitud =
                    docSnap.data();


                if (
                    solicitud.estado !==
                    "pendiente"
                ) {

                    clearInterval(
                        temporizador
                    );


                    requestPopup.style.display =
                        "none";


                    ultimaSolicitud =
                        null;


                    if (
                        listenerSolicitud
                    ) {

                        listenerSolicitud();

                        listenerSolicitud =
                            null;

                    }

                }

            },

            (error) => {

                console.error(
                    "Error escuchando pedido:",
                    error
                );

            }

        );

}


// =========================================
// ACEPTAR
// =========================================

async function aceptarSolicitud(
    id
) {

    if (!id) {
        return;
    }


    try {

        const user =
            auth.currentUser;


        if (!user) {
            return;
        }


        clearInterval(
            temporizador
        );


        await updateDoc(

            doc(
                db,
                "solicitudes",
                id
            ),

            {

                estado:
                    "aceptada",

                conductorId:
                    user.uid,

                fechaAceptacion:
                    serverTimestamp()

            }

        );


        await updateDoc(

            doc(
                db,
                "usuarios",
                user.uid
            ),

            {

                estadoServicio:
                    "en_viaje",

                viajeActivo:
                    id

            }

        );


        requestPopup.style.display =
            "none";


        window.location.href =
            "viaje-activo.html";

    }
    catch (error) {

        console.error(
            "Error aceptando pedido:",
            error
        );


        alert(
            "No se pudo aceptar el pedido."
        );

    }

}


// =========================================
// TEMPORIZADOR
// =========================================

function iniciarTemporizador(
    solicitudId
) {

    clearInterval(
        temporizador
    );


    segundosRestantes =
        15;


    temporizador =
        setInterval(

            () => {

                segundosRestantes--;


                if (
                    segundosRestantes < 0
                ) {

                    clearInterval(
                        temporizador
                    );


                    rechazarSolicitud(
                        solicitudId
                    );

                }

            },

            1000

        );

}


// =========================================
// RECHAZAR
// =========================================

async function rechazarSolicitud(
    id
) {

    if (!id) {
        return;
    }


    clearInterval(
        temporizador
    );


    try {

        const solicitudRef =
            doc(
                db,
                "solicitudes",
                id
            );


        const solicitudSnap =
            await getDoc(
                solicitudRef
            );


        if (
            !solicitudSnap.exists()
        ) {

            return;

        }


        const solicitud =
            solicitudSnap.data();


        const lista =
            solicitud.conductoresEvaluados ||
            [];


        let indice =
            solicitud.indiceConductor ||
            0;


        indice++;


        // =============================
        // NO HAY MÁS CANDIDATOS
        // =============================

        if (
            indice >=
            lista.length
        ) {

            await updateDoc(

                solicitudRef,

                {
                    estado:
                        "rechazada"
                }

            );


            requestPopup.style.display =
                "none";


            ultimaSolicitud =
                null;


            return;

        }


        // =============================
        // SIGUIENTE REPARTIDOR
        // =============================

        const siguienteId =
            lista[indice];


        const siguienteSnap =
            await getDoc(

                doc(
                    db,
                    "usuarios",
                    siguienteId
                )

            );


        if (
            !siguienteSnap.exists()
        ) {

            return;

        }


        const siguiente =
            siguienteSnap.data();


        await updateDoc(

            solicitudRef,

            {

                conductorId:
                    siguienteId,

                nombreConductor:
                    siguiente.nombre,

                placa:
                    siguiente.placa,

                indiceConductor:
                    indice,

                estado:
                    "pendiente"

            }

        );


        requestPopup.style.display =
            "none";


        ultimaSolicitud =
            null;

    }
    catch (error) {

        console.error(
            "Error reasignando pedido:",
            error
        );


        alert(
            "No se pudo reasignar el pedido."
        );

    }

}


// =========================================
// VIAJE ACTIVO
// =========================================

async function verificarViajeActivo() {

    const user =
        auth.currentUser;


    if (!user) {
        return;
    }

// =========================================
// POR DEFECTO: OCULTAR PEDIDO ACTIVO
// =========================================

if (activeTripCard) {
    activeTripCard.style.display = "none";
}
    

    try {

        const usuarioDoc =
            await getDoc(

                doc(
                    db,
                    "usuarios",
                    user.uid
                )

            );


        if (
            !usuarioDoc.exists()
        ) {

            return;

        }


        const usuario =
            usuarioDoc.data();


        if (!usuario.viajeActivo) {

    if (activeTripCard) {
        activeTripCard.style.display = "none";
    }

    return;
}


       // =========================================
// VIAJE ACTIVO — COMPATIBILIDAD MOTI GO
// =========================================

const viajeActivo =
    usuario.viajeActivo;


// MOTI GO guarda viajeActivo como:
// {
//     pedidoId: "...",
//     estado: "asignado",
//     iniciadoEn: Timestamp
// }

const pedidoId =
    typeof viajeActivo === "string"
        ? viajeActivo
        : viajeActivo?.pedidoId;


if (
    !pedidoId
) {

    console.warn(
        "⚠️ MOTI GO: viajeActivo existe pero no contiene pedidoId válido:",
        viajeActivo
    );


    if (activeTripCard) {
    activeTripCard.style.display = "block";
}


    return;

}


const viajeDoc =
    await getDoc(

        doc(
            db,
            "pedidos",
            pedidoId
        )

    );

        if (
            !viajeDoc.exists()
        ) {

            activeTripCard.style.display =
                "none";

            return;

        }


       const viaje =
    viajeDoc.data();


activePassenger.textContent =
    viaje.clienteNombre ||
    viaje.nombrePasajero ||
    "Cliente";


activeDestination.textContent =
    viaje.destino?.localidad ||
    viaje.destino?.direccion ||
    viaje.destino ||
    "Destino";


activeStatus.textContent =
    viaje.estado ||
    viajeActivo.estado ||
    "En curso";


activeTripCard.style.display =
    "block";
    }
    catch (error) {

        console.error(
            "Error verificando pedido activo:",
            error
        );

    }

}

// =========================================================
// PEDIDOS DISPONIBLES PARA ESTE REPARTIDOR
// =========================================================

let listenerPedidosDisponibles =
    null;


function iniciarPedidosDisponibles() {

    const user =
        auth.currentUser;


    if (!user) {
        return;
    }


    if (
        listenerPedidosDisponibles
    ) {

        listenerPedidosDisponibles();

        listenerPedidosDisponibles =
            null;

    }


    const uid =
        user.uid;


    const pedidosQuery =
        query(
            collection(
                db,
                "pedidos"
            ),

            where(
                "estado",
                "==",
                "solicitud_repartidor"
            ),

            where(
                "repartidorId",
                "==",
                uid
            )
        );


    listenerPedidosDisponibles =
        onSnapshot(

            pedidosQuery,

            snapshot => {

                const pedidos =
                    snapshot.docs.map(
                        pedidoDoc => ({
                            id:
                                pedidoDoc.id,

                            ...pedidoDoc.data()
                        })
                    );


                renderizarPedidosDisponibles(
                    pedidos
                );


                console.log(
                    "📦 MOTI GO — pedidos disponibles para este repartidor:",
                    pedidos.length
                );

            },

            error => {

                console.error(
                    "❌ MOTI GO — error cargando pedidos disponibles:",
                    error
                );

            }

        );

}

// =========================================================
// RENDERIZAR PEDIDOS DISPONIBLES
// =========================================================

function renderizarPedidosDisponibles(
    pedidos
) {

    const container =
        document.getElementById(
            "pedidosContainer"
        );

        // =================================================
    // CONTADOR
    // =================================================

    const contador =
        document.getElementById(
            "pedidosDisponiblesCount"
        );

    if (contador) {

        contador.textContent =
            pedidos.length;

    }


    // =================================================
    // APLICAR FILTRO
    // =================================================

    let pedidosFiltrados =
        Array.isArray(pedidos)
            ? [...pedidos]
            : [];


    if (
        filtroPedidosActual ===
        "una"
    ) {

        pedidosFiltrados =
            pedidosFiltrados.filter(
                pedido => {

                    const tiendas =
                        Array.isArray(
                            pedido.tiendas
                        )
                            ? pedido.tiendas.length
                            : 0;

                    return tiendas === 1;

                }
            );

    }


    if (
        filtroPedidosActual ===
        "varias"
    ) {

        pedidosFiltrados =
            pedidosFiltrados.filter(
                pedido => {

                    const tiendas =
                        Array.isArray(
                            pedido.tiendas
                        )
                            ? pedido.tiendas.length
                            : 0;

                    return tiendas > 1;

                }
            );

    }


    pedidos =
        pedidosFiltrados;
    


    if (!container) {
        return;
    }


    // =========================================
    // SIN PEDIDOS
    // =========================================

    if (
        !pedidos ||
        pedidos.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-state-icon">
                    ✓
                </div>

                <strong>
                    No hay pedidos disponibles
                </strong>

                <p>
                    Cuando el sistema te asigne
                    una nueva solicitud aparecerá aquí.
                </p>

            </div>

        `;

        return;
    }


    // =========================================
    // PEDIDOS
    // =========================================

    container.innerHTML =
        pedidos
            .map(
                pedido => {

                    const productos =
                        Array.isArray(
                            pedido.productos
                        )
                            ? pedido.productos.length
                            : 0;


                    const tiendas =
                        Array.isArray(
                            pedido.tiendas
                        )
                            ? pedido.tiendas.length
                            : 0;


                    const ganancia =
                        Number(
                            pedido
                                .comisiones
                                ?.repartidor
                                ?.monto
                        ) || 0;


                    const folio =
                        pedido.folio ||
                        pedido.id;


                    return `

                        <div class="dashboard-card">

                            <div class="dashboard-card-title">

                                <strong>
                                    Pedido ${escaparTexto(
                                        folio
                                    )}
                                </strong>

                                <span class="badge badge-warning">
                                    Nueva solicitud
                                </span>

                            </div>


                            <div class="pedido-info">

                                <div class="pedido-info-item">

                                    <span>
                                        Productos
                                    </span>

                                    <strong>
                                        ${productos}
                                    </strong>

                                </div>


                                <div class="pedido-info-item">

                                    <span>
                                        Tiendas
                                    </span>

                                    <strong>
                                        ${tiendas}
                                    </strong>

                                </div>


                                <div class="pedido-info-item">

                                    <span>
                                        Total cliente
                                    </span>

                                    <strong>
                                        ${formatearDinero(
                                            pedido.total
                                        )}
                                    </strong>

                                </div>


                                <div class="pedido-info-item">

                                    <span>
                                        Tu ganancia
                                    </span>

                                    <strong class="text-success">
                                        ${formatearDinero(
                                            ganancia
                                        )}
                                    </strong>

                                </div>

                            </div>


                            <div class="pedido-total">

                                <span>
                                    Esperando respuesta
                                </span>

                                <strong>
                                    ${formatearDinero(
                                        ganancia
                                    )}
                                </strong>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


// =========================================================
// FILTROS DE PEDIDOS
// =========================================================

document
    .querySelectorAll(
        "[data-pedidos-filter]"
    )
    .forEach(
        boton => {

            boton.addEventListener(
                "click",
                () => {

                    filtroPedidosActual =
                        boton.dataset.pedidosFilter;

                    // -----------------------------
                    // ACTIVAR BOTÓN
                    // -----------------------------

                    document
                        .querySelectorAll(
                            "[data-pedidos-filter]"
                        )
                        .forEach(
                            elemento => {

                                elemento.classList.toggle(
                                    "active",
                                    elemento === boton
                                );

                            }
                        );


                    // -----------------------------
                    // VOLVER A CARGAR
                    // -----------------------------

                    iniciarPedidosDisponibles();

                }
            );

        }
    );


// =========================================================
// ESCAPAR TEXTO
// =========================================================

function escaparTexto(
    valor
) {

    return String(
        valor ?? ""
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

// =========================================================
// FILTROS DEL DASHBOARD
// =========================================================

let filtroPedidosActual = "todos";

let filtroGananciasActual = "todos";


// =========================================================
// VISTA DE GANANCIAS
// =========================================================

let listenerGanancias =
    null;


function iniciarVistaGanancias() {

    const user =
        auth.currentUser;


    if (!user) {
        return;
    }


    if (
        listenerGanancias
    ) {

        listenerGanancias();

        listenerGanancias =
            null;

    }


    const uid =
        user.uid;


    const pedidosQuery =
        query(
            collection(
                db,
                "pedidos"
            ),

            where(
                "repartidorId",
                "==",
                uid
            )
        );


    listenerGanancias =
        onSnapshot(

            pedidosQuery,

            snapshot => {

                const pedidos =
                    snapshot.docs
                        .map(
                            pedidoDoc => ({
                                id:
                                    pedidoDoc.id,

                                ...pedidoDoc.data()
                            })
                        )
                        .filter(
                            pedido =>
                                pedido.estado ===
                                    "entregado" &&

                                pedido.entregaConfirmada ===
                                    true
                        );


                pedidos.sort(
                    (
                        a,
                        b
                    ) => {

                        const fechaA =
                            obtenerFecha(
                                a.fechaFinalizacion
                            );

                        const fechaB =
                            obtenerFecha(
                                b.fechaFinalizacion
                            );


                        return (
                            fechaB -
                            fechaA
                        );

                    }
                );


                // =========================================================
// APLICAR FILTRO DE GANANCIAS
// =========================================================

function aplicarFiltroGanancias(
    pedidos
) {

    if (
        !Array.isArray(pedidos)
    ) {

        return [];

    }


    if (
        filtroGananciasActual ===
        "todos"
    ) {

        return pedidos;

    }


    const ahora =
        new Date();


    const inicioHoy =
        new Date(
            ahora.getFullYear(),
            ahora.getMonth(),
            ahora.getDate(),
            0,
            0,
            0,
            0
        );


    let inicioPeriodo;


    if (
        filtroGananciasActual ===
        "hoy"
    ) {

        inicioPeriodo =
            inicioHoy;

    }


    if (
        filtroGananciasActual ===
        "7dias"
    ) {

        inicioPeriodo =
            new Date(
                ahora
            );

        inicioPeriodo.setDate(
            inicioPeriodo.getDate() - 6
        );

        inicioPeriodo.setHours(
            0,
            0,
            0,
            0
        );

    }


    if (
        filtroGananciasActual ===
        "30dias"
    ) {

        inicioPeriodo =
            new Date(
                ahora
            );

        inicioPeriodo.setDate(
            inicioPeriodo.getDate() - 29
        );

        inicioPeriodo.setHours(
            0,
            0,
            0,
            0
        );

    }


    return pedidos.filter(
        pedido => {

            const fecha =
                obtenerFecha(
                    pedido.fechaFinalizacion
                );

            return fecha >= inicioPeriodo;

        }
    );

}
                
                
                renderizarGanancias(
    aplicarFiltroGanancias(
        pedidos
    )
);


                console.log(
                    "💰 MOTI GO — movimientos de ganancias:",
                    pedidos.length
                );

            },

            error => {

                console.error(
                    "❌ MOTI GO — error cargando ganancias:",
                    error
                );

            }

        );

}

// =========================================================
// OBTENER FECHA
// =========================================================

function obtenerFecha(
    valor
) {

    if (
        valor &&
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


    if (valor) {

        const fecha =
            new Date(
                valor
            );


        if (
            !isNaN(
                fecha.getTime()
            )
        ) {

            return fecha;

        }

    }


    return new Date(0);

}

// =========================================================
// RENDERIZAR GANANCIAS
// =========================================================
function renderizarGanancias(
    pedidos
) {

    const container =
        document.getElementById(
            "gananciasContainer"
        );

    if (!container) {
        return;
    }


    // =========================================================
    // CALCULAR GANANCIAS
    // =========================================================

    let gananciasEntregasTotal = 0;
    let gananciasFundadorTotal = 0;


    pedidos.forEach(
        pedido => {

            // -------------------------------------------------
            // GANANCIA POR ENTREGA
            // -------------------------------------------------

            const gananciaEntrega =
                Number(
                    pedido
                        .comisiones
                        ?.repartidor
                        ?.monto
                ) || 0;


            // -------------------------------------------------
            // PARTICIPACIÓN COMO FUNDADOR
            // -------------------------------------------------

            const gananciaFundador =
                Number(
                    pedido
                        .comisiones
                        ?.fundador
                        ?.monto
                ) || 0;


            gananciasEntregasTotal +=
                gananciaEntrega;


            gananciasFundadorTotal +=
                gananciaFundador;

        }
    );


    // =========================================================
    // GANANCIAS TOTALES
    //
    // Entregas + participación como fundador
    // =========================================================

    const gananciasTotales =
        gananciasEntregasTotal +
        gananciasFundadorTotal;


    // =========================================================
    // RESUMEN PRINCIPAL
    // =========================================================

    const total =
        document.getElementById(
            "gananciasTotal"
        );

    if (total) {

        total.textContent =
            formatearDinero(
                gananciasTotales
            );

    }


    // =========================================================
    // GANANCIAS POR ENTREGAS
    // =========================================================

    const gananciasEntregas =
        document.getElementById(
            "gananciasEntregas"
        );

    if (gananciasEntregas) {

        gananciasEntregas.textContent =
            formatearDinero(
                gananciasEntregasTotal
            );

    }


    // =========================================================
    // GANANCIAS DE FUNDADOR
    // =========================================================

    let bloqueFundador =
        document.getElementById(
            "gananciasFundador"
        );


    if (!bloqueFundador) {

        const hero =
            document.querySelector(
                ".earnings-hero"
            );


        if (hero) {

            bloqueFundador =
                document.createElement(
                    "div"
                );

            bloqueFundador.id =
                "gananciasFundador";

            bloqueFundador.className =
                "ganancias-fundador-resumen";


            hero.appendChild(
                bloqueFundador
            );

        }

    }


    if (bloqueFundador) {

        if (
            gananciasFundadorTotal > 0
        ) {

            bloqueFundador.style.display =
                "block";


            bloqueFundador.innerHTML = `

                <div class="ganancias-fundador-icon">
                    👑
                </div>

                <div class="ganancias-fundador-info">

                    <strong>
                        Generado como fundador
                    </strong>

                    <span>
                        Participación acumulada
                    </span>

                </div>

                <div class="ganancias-fundador-monto">
                    ${formatearDinero(
                        gananciasFundadorTotal
                    )}
                </div>

            `;

        } else {

            bloqueFundador.style.display =
                "none";

        }

    }


    // =========================================================
    // PERIODO — ENTREGA
    // =========================================================

    const gananciasPeriodoEntregas =
        document.getElementById(
            "gananciasPeriodoEntregas"
        );

    if (gananciasPeriodoEntregas) {

        gananciasPeriodoEntregas.textContent =
            formatearDinero(
                gananciasEntregasTotal
            );

    }


    // =========================================================
    // PERIODO — TOTAL
    // =========================================================

    const gananciasPeriodoTotal =
        document.getElementById(
            "gananciasPeriodoTotal"
        );

    if (gananciasPeriodoTotal) {

        gananciasPeriodoTotal.textContent =
            formatearDinero(
                gananciasFundadorTotal
            );

    }


    // =========================================================
    // AGRUPAR POR DÍA
    // =========================================================

    const grupos =
        {};


    pedidos.forEach(
        pedido => {

            const fecha =
                obtenerFecha(
                    pedido.fechaFinalizacion
                );


            const clave =
                fecha
                    .toISOString()
                    .slice(
                        0,
                        10
                    );


            if (
                !grupos[clave]
            ) {

                grupos[clave] = {

                    fecha,

                    pedidos: [],

                    totalEntregas: 0,

                    totalFundador: 0,

                    total: 0

                };

            }


            const gananciaEntrega =
                Number(
                    pedido
                        .comisiones
                        ?.repartidor
                        ?.monto
                ) || 0;


            const gananciaFundador =
                Number(
                    pedido
                        .comisiones
                        ?.fundador
                        ?.monto
                ) || 0;


            grupos[
                clave
            ].pedidos.push(
                pedido
            );


            grupos[
                clave
            ].totalEntregas +=
                gananciaEntrega;


            grupos[
                clave
            ].totalFundador +=
                gananciaFundador;


            grupos[
                clave
            ].total +=
                gananciaEntrega +
                gananciaFundador;

        }
    );


    const dias =
        Object.values(
            grupos
        ).sort(
            (
                a,
                b
            ) =>
                b.fecha -
                a.fecha
        );


    // =========================================================
    // CONTENEDOR DE MOVIMIENTOS
    // =========================================================

    let movimientos =
        document.getElementById(
            "gananciasMovimientos"
        );


    if (!movimientos) {

        movimientos =
            document.createElement(
                "div"
            );

        movimientos.id =
            "gananciasMovimientos";

        movimientos.className =
            "dashboard-card";


        container.appendChild(
            movimientos
        );

    }


    // =========================================================
    // SIN MOVIMIENTOS
    // =========================================================

    if (
        dias.length === 0
    ) {

        movimientos.innerHTML = `

            <div class="dashboard-card-title">

                <strong>
                    Movimientos
                </strong>

            </div>


            <div class="empty-state">

                <div class="empty-state-icon">
                    $
                </div>

                <strong>
                    Aún no tienes ganancias
                </strong>

                <p>
                    Tus entregas completadas
                    aparecerán aquí.
                </p>

            </div>

        `;

        return;

    }


    // =========================================================
    // GENERAR MOVIMIENTOS
    // =========================================================

    let html = `

        <div class="dashboard-card-title">

            <strong>
                Movimientos
            </strong>

        </div>

    `;


    dias.forEach(
        grupo => {

            html += `

                <div
                    class="ganancia-movimiento"
                    style="
                        margin-top:12px;
                        padding-top:12px;
                        border-top:1px solid #f0f1f3;
                    "
                >

                    <div
                        class="ganancia-movimiento-info"
                    >

                        <strong>
                            ${formatearFechaGanancia(
                                grupo.fecha
                            )}
                        </strong>

                        <span>
                            ${grupo.pedidos.length}
                            ${
                                grupo.pedidos.length === 1
                                    ? " entrega"
                                    : " entregas"
                            }
                        </span>

                    </div>


                    <div
                        class="ganancia-monto"
                    >
                        ${formatearDinero(
                            grupo.total
                        )}
                    </div>

                </div>

            `;


            grupo.pedidos.forEach(
                pedido => {

                    const gananciaEntrega =
                        Number(
                            pedido
                                .comisiones
                                ?.repartidor
                                ?.monto
                        ) || 0;


                    const gananciaFundador =
                        Number(
                            pedido
                                .comisiones
                                ?.fundador
                                ?.monto
                        ) || 0;


                    const folio =
                        pedido.folio ||
                        pedido.id;


                    const fecha =
                        obtenerFecha(
                            pedido.fechaFinalizacion
                        );


                    html += `

                        <div
                            class="ganancia-movimiento"
                        >

                            <div
                                class="ganancia-movimiento-info"
                            >

                                <strong>
                                    Pedido ${escaparTexto(
                                        folio
                                    )}
                                </strong>


                                <span>
                                    Entrega completada ·
                                    ${fecha.toLocaleTimeString(
                                        "es-MX",
                                        {
                                            hour:
                                                "2-digit",

                                            minute:
                                                "2-digit"
                                        }
                                    )}
                                </span>

                            </div>


                            <div
                                class="ganancia-monto text-success"
                            >

                                ${
                                    gananciaEntrega > 0
                                        ? `+${formatearDinero(
                                            gananciaEntrega
                                        )}`
                                        : ""
                                }

                                ${
                                    gananciaFundador > 0
                                        ? `<br>
                                           <small>
                                               👑 +${formatearDinero(
                                                   gananciaFundador
                                               )}
                                           </small>`
                                        : ""
                                }

                            </div>

                        </div>

                    `;

                }
            );

        }
    );


    movimientos.innerHTML =
        html;

}
// =========================================================
// FECHA PARA GANANCIAS
// =========================================================

function formatearFechaGanancia(
    fecha
) {

    return fecha.toLocaleDateString(
        "es-MX",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );

}


// =========================================================
// FILTROS DE GANANCIAS
// =========================================================

document
    .querySelectorAll(
        "[data-ganancias-filter]"
    )
    .forEach(
        boton => {

            boton.addEventListener(
                "click",
                () => {

                    filtroGananciasActual =
                        boton.dataset.gananciasFilter;


                    document
                        .querySelectorAll(
                            "[data-ganancias-filter]"
                        )
                        .forEach(
                            elemento => {

                                elemento.classList.toggle(
                                    "active",
                                    elemento === boton
                                );

                            }
                        );


                    // Volver a solicitar los datos
                    iniciarVistaGanancias();

                }
            );

        }
    );


// =========================================================
// VISTA HISTORIAL
// =========================================================

let listenerHistorial = null;
let historialPedidosCache = [];
let filtroHistorialActual = "todos";


function iniciarVistaHistorial() {

    const user = auth.currentUser;

    if (!user) {
        return;
    }

    if (listenerHistorial) {
        listenerHistorial();
        listenerHistorial = null;
    }

    const uid = user.uid;

    const pedidosQuery = query(
        collection(db, "pedidos"),
        where("repartidorId", "==", uid)
    );

    listenerHistorial = onSnapshot(
        pedidosQuery,
        snapshot => {

            historialPedidosCache = snapshot.docs
                .map(pedidoDoc => ({
                    id: pedidoDoc.id,
                    ...pedidoDoc.data()
                }))
                .filter(pedido => {

                    const estado =
                        normalizarEstadoHistorial(
                            pedido.estado
                        );

                    return (
                        estado === "entregado" ||
                        estado === "cancelado"
                    );

                });

            historialPedidosCache.sort(
                (a, b) =>
                    obtenerFechaHistorial(b) -
                    obtenerFechaHistorial(a)
            );

            renderizarHistorial();

        },
        error => {

            console.error(
                "❌ MOTI GO — error cargando historial:",
                error
            );

            const container =
                document.getElementById(
                    "historialContainer"
                );

            if (container) {

                container.innerHTML = `
                    <div class="historial-vacio historial-error">

                        <div class="historial-vacio-icono">
                            <span class="material-symbols-outlined">
                                error_outline
                            </span>
                        </div>

                        <strong>
                            No se pudo cargar el historial
                        </strong>

                        <p>
                            Intenta nuevamente en unos momentos.
                        </p>

                    </div>
                `;

            }

        }
    );

}


function normalizarEstadoHistorial(estado) {

    const valor =
        String(estado || "")
            .trim()
            .toLowerCase();

    if (
        valor === "entregado" ||
        valor === "completado" ||
        valor === "completed"
    ) {

        return "entregado";

    }

    if (
        valor === "cancelado" ||
        valor === "cancelada" ||
        valor === "cancelled" ||
        valor === "canceled" ||
        valor === "rechazado" ||
        valor === "rechazada"
    ) {

        return "cancelado";

    }

    return valor;

}


function obtenerFechaHistorial(pedido) {

    const fecha =
        pedido.fechaFinalizacion ||
        pedido.fechaCancelacion ||
        pedido.updatedAt ||
        pedido.actualizadoEn ||
        pedido.createdAt ||
        pedido.creadoEn ||
        pedido.fechaSolicitud;

    return obtenerFecha(fecha);

}


function obtenerGananciaHistorial(pedido) {

    return Number(
        pedido
            .comisiones
            ?.repartidor
            ?.monto
    ) || 0;

}


function aplicarFiltroHistorial(pedidos) {

    if (
        filtroHistorialActual ===
        "completados"
    ) {

        return pedidos.filter(
            pedido =>
                normalizarEstadoHistorial(
                    pedido.estado
                ) === "entregado"
        );

    }

    if (
        filtroHistorialActual ===
        "cancelados"
    ) {

        return pedidos.filter(
            pedido =>
                normalizarEstadoHistorial(
                    pedido.estado
                ) === "cancelado"
        );

    }

    return pedidos;

}


function renderizarHistorial() {

    const container =
        document.getElementById(
            "historialContainer"
        );

    const totalEntregas =
        document.getElementById(
            "historialTotalEntregas"
        );

    const totalGanancias =
        document.getElementById(
            "historialTotalGanancias"
        );

    if (!container) {
        return;
    }

    // El resumen siempre representa las entregas
    // completadas y confirmadas.
    const completados =
        historialPedidosCache.filter(
            pedido =>
                normalizarEstadoHistorial(
                    pedido.estado
                ) === "entregado" &&
                pedido.entregaConfirmada === true
        );

    const ganancias =
        completados.reduce(
            (total, pedido) =>
                total +
                obtenerGananciaHistorial(pedido),
            0
        );

    if (totalEntregas) {
        totalEntregas.textContent =
            completados.length;
    }

    if (totalGanancias) {
        totalGanancias.textContent =
            formatearDinero(ganancias);
    }

    const pedidos =
        aplicarFiltroHistorial(
            historialPedidosCache
        );

    if (!pedidos.length) {

        const mensaje =
            filtroHistorialActual === "cancelados"
                ? "No tienes pedidos cancelados"
                : filtroHistorialActual === "completados"
                    ? "Aún no tienes entregas completadas"
                    : "Aún no tienes actividad";

        const descripcion =
            filtroHistorialActual === "cancelados"
                ? "Los pedidos cancelados que correspondan a tu cuenta aparecerán aquí."
                : "Tus entregas realizadas aparecerán aquí.";

        container.innerHTML = `
            <div class="historial-vacio">

                <div class="historial-vacio-icono">
                    <span class="material-symbols-outlined">
                        history
                    </span>
                </div>

                <strong>
                    ${mensaje}
                </strong>

                <p>
                    ${descripcion}
                </p>

            </div>
        `;

        return;
    }

    container.innerHTML =
        pedidos
            .map(renderizarItemHistorial)
            .join("");

}


function renderizarItemHistorial(pedido) {

    const estado =
        normalizarEstadoHistorial(
            pedido.estado
        );

    const completado =
        estado === "entregado";

    const fecha =
        obtenerFechaHistorial(pedido);

    const folio =
        pedido.folio ||
        pedido.id;

    const ganancia =
        obtenerGananciaHistorial(pedido);

    const tiendas =
        Array.isArray(pedido.tiendas)
            ? pedido.tiendas
            : [];

    const numeroTiendas =
        tiendas.length ||
        (
            Array.isArray(pedido.productos)
                ? new Set(
                    pedido.productos
                        .map(
                            producto =>
                                producto.tiendaId
                        )
                        .filter(Boolean)
                ).size
                : 0
        );

    const textoTiendas =
        numeroTiendas > 0
            ? `${numeroTiendas} ${
                numeroTiendas === 1
                    ? "tienda"
                    : "tiendas"
            }`
            : "Pedido";

    const hora =
        fecha.getTime() > 0
            ? fecha.toLocaleTimeString(
                "es-MX",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )
            : "--:--";

    const fechaTexto =
        fecha.getTime() > 0
            ? fecha.toLocaleDateString(
                "es-MX",
                {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                }
            )
            : "Fecha no disponible";

    const estadoTexto =
        completado
            ? "Completado"
            : "Cancelado";

    const icono =
        completado
            ? "done"
            : "close";

    const claseEstado =
        completado
            ? "historial-estado-completado"
            : "historial-estado-cancelado";

    return `
        <article class="historial-item">

            <div class="historial-icon ${claseEstado}">
                <span class="material-symbols-outlined">
                    ${icono}
                </span>
            </div>

            <div class="historial-info">

                <strong>
                    Pedido ${escaparTexto(folio)}
                </strong>

                <span>
                    ${escaparTexto(fechaTexto)}
                    · ${hora}
                    · ${escaparTexto(textoTiendas)}
                </span>

                <small class="${claseEstado}">
                    ${estadoTexto}
                </small>

            </div>

            <div class="historial-monto">

                ${
                    completado
                        ? `+${formatearDinero(ganancia)}`
                        : "—"
                }

            </div>

        </article>
    `;

}


// =========================================================
// FILTROS DEL HISTORIAL
// =========================================================

document
    .querySelectorAll(
        "[data-historial-filter]"
    )
    .forEach(
        boton => {

            boton.addEventListener(
                "click",
                () => {

                    filtroHistorialActual =
                        boton.dataset.historialFilter;

                    document
                        .querySelectorAll(
                            "[data-historial-filter]"
                        )
                        .forEach(
                            elemento => {

                                elemento.classList.toggle(
                                    "active",
                                    elemento === boton
                                );

                            }
                        );

                    renderizarHistorial();

                }
            );

        }
    );

