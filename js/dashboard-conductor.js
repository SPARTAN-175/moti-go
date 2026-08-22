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


            // =============================
            // ESTADO
            // =============================

            currentState =
                datos.estadoServicio ||
                "disponible";


            actualizarVista();


            // =============================
            // ESTADÍSTICAS
            // =============================

            cargarEstadisticas(
                datos
            );


            // =============================
            // CARTERA
            // =============================

            cargarCartera(
                datos
            );


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
                        "en_viaje"
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


                const nuevoEstado =
                    datos.estadoServicio ||
                    "disponible";


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
        "en_viaje"
    ) {

        statusButton.textContent =
            "En entrega";


        statusDescription.textContent =
            "Tienes un pedido activo";


        statusButton.classList.add(
            "status-yellow"
        );


        statusIndicator.style.background =
            "var(--go-warning)";

    }

}


// =========================================
// ESTADÍSTICAS
// =========================================

function cargarEstadisticas(
    datos
) {

    const pedidos =
        datos.pedidosHoy ??
        datos.viajesHoy ??
        0;


    const ganancias =
        datos.gananciasHoy ??
        0;


    todayOrders.textContent =
        pedidos;


    todayEarnings.textContent =
        formatearDinero(
            ganancias
        );

}


// =========================================
// CARTERA
// =========================================

function cargarCartera(
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

}


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


        if (
            !usuario.viajeActivo
        ) {

            activeTripCard.style.display =
                "none";

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


    activeTripCard.style.display =
        "none";


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
