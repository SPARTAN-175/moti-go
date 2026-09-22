// =====================================================
// MOTI GO - REPARTIDOR
// Sistema exclusivo para pedidos MOTI GO
// =====================================================

import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// =====================================================
// CONFIGURACIÓN
// =====================================================

const TIEMPO_SOLICITUD = 15;


// =====================================================
// ESTADO DEL MÓDULO
// =====================================================

let usuarioRepartidor = null;

let pedidoActual = null;

let escuchandoPedidos = false;

let solicitudesActivas = new Map();

let listenerEstadoRepartidor = null;
let listenerSolicitudesAsignadas = null;
let moduloRepartidorIniciado = false;

// =====================================================
// ESCUCHAR ESTADO DEL REPARTIDOR EN TIEMPO REAL
// =====================================================

function escucharEstadoRepartidor() {

    if (
        !usuarioRepartidor || !auth.currentUser
    ) {

        return;

    }


    if (
        listenerEstadoRepartidor
    ) {

        listenerEstadoRepartidor();

        listenerEstadoRepartidor =
            null;

    }


    const repartidorRef =
        doc(
            db,
            "usuarios",
            usuarioRepartidor.uid
        );


    listenerEstadoRepartidor =
        onSnapshot(
            repartidorRef,

            async snapshot => {

                if (
                    !snapshot.exists()
                ) {

                    return;

                }


                const datos =
                    snapshot.data();


                const viajeActivo =
                    datos.viajeActivo;


                // =================================================
                // SIN VIAJE
                // =================================================

                if (
                    !viajeActivo
                ) {

                    if (
                        pedidoActual
                    ) {

                        console.log(
                            "🟢 MOTI GO: viaje eliminado de Firebase. Limpiando estado local."
                        );

                    }


                    pedidoActual =
                        null;


                    return;

                }


                // =================================================
                // VIAJE ACTIVO
                // =================================================

                const pedidoId =
                    typeof viajeActivo === "string"
                        ? viajeActivo
                        : viajeActivo?.pedidoId;


                if (
                    !pedidoId
                ) {

                    pedidoActual =
                        null;

                    return;

                }


                // =================================================
                // EVITAR CONSULTA SI YA ES EL MISMO VIAJE
                // =================================================

                const pedidoActualId =
                    typeof pedidoActual === "string"
                        ? pedidoActual
                        : pedidoActual?.pedidoId;


                if (
                    pedidoActualId ===
                    pedidoId
                ) {

                    return;

                }


                console.log(
                    "🔄 MOTI GO: nuevo viaje activo detectado:",
                    pedidoId
                );


                await verificarViajeActivo();

            },

            error => {

                console.error(
                    "❌ MOTI GO: error escuchando estado del repartidor:",
                    error
                );

            }

        );

}
// =====================================================
// INICIO
// =====================================================

async function iniciarMotiGoRepartidor() {

    console.log(
        "🛵 MOTI GO - REPARTIDOR INICIANDO..."
    );


    const usuario =
        auth.currentUser;


    if (!usuario) {

        console.warn(
            "⚠️ MOTI GO: no hay repartidor autenticado."
        );

        return;

    }


    usuarioRepartidor =
        usuario;


    console.log(
        "👤 MOTI GO - REPARTIDOR:",
        usuarioRepartidor.uid
    );


await verificarViajeActivo();

escucharEstadoRepartidor();

escucharSolicitudesAsignadas();

}


// =====================================================
// VERIFICAR PEDIDO ACTIVO
// =====================================================

async function verificarViajeActivo() {

    if (
        !usuarioRepartidor
    ) {

        return null;

    }


    try {

        const repartidorRef =
            doc(
                db,
                "usuarios",
                usuarioRepartidor.uid
            );


        const snapshot =
            await getDoc(
                repartidorRef
            );


        if (
            !snapshot.exists()
        ) {

            pedidoActual =
                null;

            return null;

        }


        const datos =
            snapshot.data();


        const viajeActivo =
            datos.viajeActivo;


        // =================================================
        // NO HAY VIAJE ACTIVO
        // =================================================

        if (
            !viajeActivo
        ) {

            pedidoActual =
                null;


            console.log(
                "🟢 MOTI GO: repartidor sin viaje activo."
            );


            // Ocultar tarjeta si existe

            const activeTripCard =
                document.getElementById(
                    "motiGoActiveTrip"
                );


            if (
                activeTripCard
            ) {

                activeTripCard.style.display =
                    "none";

            }


            return null;

        }


        // =================================================
        // OBTENER ID DEL PEDIDO
        // =================================================

        const pedidoId =
            typeof viajeActivo === "string"
                ? viajeActivo
                : viajeActivo?.pedidoId;


        if (
            !pedidoId
        ) {

            console.warn(
                "⚠️ MOTI GO: viajeActivo no contiene pedidoId válido:",
                viajeActivo
            );


            pedidoActual =
                null;


            return null;

        }


        // =================================================
        // CONSULTAR EL PEDIDO REAL
        // =================================================

        const pedidoRef =
            doc(
                db,
                "pedidos",
                pedidoId
            );


        const pedidoSnapshot =
            await getDoc(
                pedidoRef
            );


        // =================================================
        // PEDIDO YA NO EXISTE
        // =================================================

        if (
            !pedidoSnapshot.exists()
        ) {

            console.warn(
                "⚠️ MOTI GO: el pedido del viaje ya no existe."
            );


            await limpiarViajeActivoRepartidor(
                repartidorRef,
                pedidoId,
                "pedido_inexistente"
            );


            return null;

        }


        const pedido =
            pedidoSnapshot.data();


        // =================================================
        // PEDIDO CANCELADO
        // =================================================

        if (
            pedido.estado ===
            "cancelado"
        ) {

            console.log(
                "❌ MOTI GO: el pedido fue cancelado. Liberando repartidor..."
            );


            await limpiarViajeActivoRepartidor(
                repartidorRef,
                pedidoId,
                "pedido_cancelado"
            );


            return null;

        }


        // =================================================
        // PEDIDO FINALIZADO
        // =================================================

        if (
            pedido.estado ===
            "entregado"
        ) {

            console.log(
                "✅ MOTI GO: el pedido ya fue entregado. Liberando repartidor..."
            );


            await limpiarViajeActivoRepartidor(
                repartidorRef,
                pedidoId,
                "pedido_entregado"
            );


            return null;

        }


        // =================================================
        // VIAJE REALMENTE ACTIVO
        // =================================================

        pedidoActual =
            viajeActivo;


        console.log(
            "🚗 MOTI GO: viaje activo confirmado:",
            pedidoId,
            pedido.estado
        );


        mostrarViajeActivo(
            viajeActivo
        );


        return viajeActivo;

    }
    catch (
        error
    ) {

        console.error(
            "❌ MOTI GO: error verificando viaje activo:",
            error
        );

        return null;

    }

}


// =====================================================
// LIMPIAR VIAJE ACTIVO DEL REPARTIDOR
// =====================================================

async function limpiarViajeActivoRepartidor(
    repartidorRef,
    pedidoId,
    motivo
) {

    try {

        await updateDoc(
            repartidorRef,
            {

                viajeActivo:
                    null,

                estadoServicio:
                    "disponible",

                actualizadoEn:
                    serverTimestamp(),

                viajeCanceladoEn:
                    serverTimestamp(),

                viajeCanceladoMotivo:
                    motivo

            }
        );


        pedidoActual =
            null;


        console.log(
            "🧹 MOTI GO: repartidor liberado automáticamente:",
            pedidoId,
            motivo
        );

    }
    catch (
        error
    ) {

        console.error(
            "❌ MOTI GO: no se pudo liberar automáticamente al repartidor:",
            error
        );

    }

}

// =====================================================
// ESCUCHAR SOLICITUDES ASIGNADAS
// =====================================================

function escucharSolicitudesAsignadas() {

    if (
        escuchandoPedidos
    ) {

        return;

    }


    if (
        !usuarioRepartidor
    ) {

        console.warn(
            "⚠️ MOTI GO: usuario repartidor no disponible."
        );

        return;

    }


    escuchandoPedidos =
        true;


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
                usuarioRepartidor.uid
            )

        );


    console.log(
        "👂 MOTI GO: escuchando solicitudes para:",
        usuarioRepartidor.uid
    );


    listenerSolicitudesAsignadas = onSnapshot(

        pedidosQuery,

        snapshot => {

            console.log(
                "📦 MOTI GO - SOLICITUDES PARA ESTE REPARTIDOR:",
                snapshot.size
            );


            snapshot.docChanges()
                .forEach(
                    cambio => {

                        const pedido = {

                            id:
                                cambio.doc.id,

                            ...cambio.doc.data()

                        };


                        // =================================
                        // NUEVA SOLICITUD
                        // =================================

                        if (
                            cambio.type ===
                            "added"
                        ) {

                            mostrarSolicitudPedido(
                                pedido
                            );

                        }


                        // =================================
                        // CAMBIO
                        // =================================

                        if (
                            cambio.type ===
                            "modified"
                        ) {

                            console.log(
                                "🔄 MOTI GO: solicitud actualizada:",
                                pedido.id
                            );

                        }


                        // =================================
                        // SOLICITUD RETIRADA
                        // =================================

                        if (
                            cambio.type ===
                            "removed"
                        ) {

                            console.log(
                                "↩️ MOTI GO: solicitud retirada:",
                                pedido.id
                            );


                            limpiarSolicitud(
                                pedido.id
                            );

                        }

                    }
                );

        },

        error => {

            if (!auth.currentUser) return;

            console.error(
                "❌ MOTI GO: error escuchando solicitudes:",
                error
            );

        }

    );

}


function detenerMotiGoRepartidor() {
    usuarioRepartidor = null;
    pedidoActual = null;
    escuchandoPedidos = false;

    if (listenerEstadoRepartidor) {
        listenerEstadoRepartidor();
        listenerEstadoRepartidor = null;
    }

    if (listenerSolicitudesAsignadas) {
        listenerSolicitudesAsignadas();
        listenerSolicitudesAsignadas = null;
    }

    solicitudesActivas.forEach((_, id) => limpiarSolicitud(id));
    solicitudesActivas.clear();

    console.log("🛵 MOTI GO: módulo repartidor detenido por cierre de sesión.");
}

window.addEventListener("moti-go:logout", detenerMotiGoRepartidor);

// =====================================================
// MAPA PROFESIONAL PARA LA SOLICITUD
// =====================================================

let motiGoLeafletPromise = null;

function cargarLeafletParaSolicitud() {

    if (
        window.L
    ) {
        return Promise.resolve(window.L);
    }

    if (
        motiGoLeafletPromise
    ) {
        return motiGoLeafletPromise;
    }

    motiGoLeafletPromise = new Promise((resolve, reject) => {

        if (!document.getElementById("motiGoLeafletCSS")) {
            const link = document.createElement("link");
            link.id = "motiGoLeafletCSS";
            link.rel = "stylesheet";
            link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
            document.head.appendChild(link);
        }

        const scriptExistente =
            document.getElementById("motiGoLeafletJS");

        if (scriptExistente) {
            scriptExistente.addEventListener("load", () => resolve(window.L));
            scriptExistente.addEventListener("error", reject);
            return;
        }

        const script = document.createElement("script");
        script.id = "motiGoLeafletJS";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.onload = () => resolve(window.L);
        script.onerror = reject;
        document.head.appendChild(script);

    }).catch(error => {

        console.error(
            "❌ MOTI GO: no se pudo cargar el mapa de la solicitud:",
            error
        );

        motiGoLeafletPromise = null;
        return null;

    });

    return motiGoLeafletPromise;
}


async function inicializarMapaSolicitud(
    mapaId,
    latitud,
    longitud
) {

    const L =
        await cargarLeafletParaSolicitud();

    if (!L) {
        return;
    }

    const contenedor =
        document.getElementById(mapaId);

    if (!contenedor || contenedor.dataset.mapaInicializado === "true") {
        return;
    }

    try {

        const mapa = L.map(
            contenedor,
            {
                zoomControl: false,
                attributionControl: true,
                dragging: true,
                scrollWheelZoom: false,
                doubleClickZoom: true,
                touchZoom: true,
                tap: true
            }
        ).setView(
            [latitud, longitud],
            17
        );

        L.control.zoom({
            position: "bottomright"
        }).addTo(mapa);

        L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
            {
                maxZoom: 20,
                attribution: '&copy; OpenStreetMap &copy; CARTO'
            }
        ).addTo(mapa);

        const icono = L.divIcon({
            className: "moti-go-marcador-entrega",
            html: `
                <div class="moti-go-marcador-punto">
                    <span class="material-symbols-outlined">
                        location_on
                    </span>
                </div>
            `,
            iconSize: [42, 42],
            iconAnchor: [21, 38],
            popupAnchor: [0, -36]
        });

        L.marker(
            [latitud, longitud],
            { icon: icono }
        )
            .addTo(mapa)
            .bindPopup("<strong>Entrega MOTI GO</strong><br>Ubicación del cliente");

        contenedor.dataset.mapaInicializado = "true";

        setTimeout(() => mapa.invalidateSize(), 80);

    } catch (error) {

        console.error(
            "❌ MOTI GO: error inicializando el mapa de entrega:",
            error
        );

    }
}


// =====================================================
// MOSTRAR SOLICITUD
// =====================================================

function mostrarSolicitudPedido(
    pedido
) {

    if (
        !pedido ||
        !pedido.id
    ) {
        return;
    }

    if (
        solicitudesActivas.has(
            pedido.id
        )
    ) {
        return;
    }

    console.log(
        "🔔 MOTI GO - NUEVA SOLICITUD:",
        pedido
    );

    const cantidadProductos =
        Array.isArray(pedido.productos)
            ? pedido.productos.reduce(
                (total, producto) =>
                    total + Number(producto.cantidad || 0),
                0
            )
            : 0;

    const cantidadTiendas =
        Array.isArray(pedido.tiendas)
            ? pedido.tiendas.length
            : Number(
                pedido.comisiones?.repartidor?.numeroTiendas || 0
            );

    const gananciaRepartidor =
        Number(
            pedido.comisiones?.repartidor?.monto ||
            0
        );

    const distanciaKm =
        Number(
            pedido.comisiones?.repartidor?.distanciaKm ||
            pedido.comisiones?.repartidor?.distanciaKmTarificada ||
            0
        );

    const distanciaTexto =
        Number.isFinite(distanciaKm) && distanciaKm > 0
            ? `${distanciaKm.toFixed(1)} km`
            : "No disponible";

    const destino =
        pedido.destino ||
        pedido.ubicacionEntrega ||
        {};

    const localidad =
        destino.localidad ||
        destino.nombre ||
        "Ubicación de entrega";

    const referencia =
        destino.referencia ||
        "Sin referencia adicional";

    const latitud = Number(destino.latitud);
    const longitud = Number(destino.longitud);

    const tieneCoordenadas =
        Number.isFinite(latitud) &&
        Number.isFinite(longitud);

    const mapaId =
        `motiGoMapaSolicitud_${pedido.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

    const overlay =
        document.createElement(
            "div"
        );

    overlay.className =
        "moti-go-solicitud-overlay";

    overlay.dataset.pedidoId =
        pedido.id;

    overlay.innerHTML = `

        <div class="moti-go-solicitud-modal">

            <div class="moti-go-solicitud-cabecera">

                <div class="moti-go-solicitud-icono">
                    <span class="material-symbols-outlined">
                        delivery_dining
                    </span>
                </div>

                <div class="moti-go-solicitud-cabecera-texto">
                    <span class="moti-go-solicitud-etiqueta">
                        NUEVA SOLICITUD
                    </span>

                    <div class="moti-go-solicitud-titulo">
                        Pedido MOTI GO
                    </div>

                    <div class="moti-go-solicitud-folio">
                        ${escaparHTML(
                            pedido.folio ||
                            pedido.id.slice(0, 8)
                        )}
                    </div>
                </div>

            </div>


            <div class="moti-go-solicitud-ganancia">

                <div>
                    <span class="material-symbols-outlined">
                        payments
                    </span>

                    <div>
                        <small>Tu ganancia por entrega</small>
                        <strong>
                            $${gananciaRepartidor.toFixed(2)}
                        </strong>
                    </div>
                </div>

                <span class="moti-go-solicitud-ganancia-badge">
                    Servicio
                </span>

            </div>


            <div class="moti-go-solicitud-destino">

                <div class="moti-go-solicitud-destino-titulo">
                    <span class="material-symbols-outlined">
                        location_on
                    </span>

                    <div>
                        <small>ENTREGA</small>
                        <strong>
                            ${escaparHTML(localidad)}
                        </strong>
                    </div>
                </div>

                <div class="moti-go-solicitud-referencia">
                    <span class="material-symbols-outlined">
                        info
                    </span>

                    <span>
                        ${escaparHTML(referencia)}
                    </span>
                </div>

                ${tieneCoordenadas ? `
                    <div class="moti-go-solicitud-mapa-contenedor">
                        <div class="moti-go-solicitud-mapa-titulo">
                            <span>
                                <span class="material-symbols-outlined">
                                    map
                                </span>
                                Ubicación de entrega
                            </span>
                            <small>GPS del cliente</small>
                        </div>

                        <div
                            id="${mapaId}"
                            class="moti-go-solicitud-mapa-real"
                            aria-label="Mapa de ubicación de entrega"
                        ></div>
                    </div>
                ` : `
                    <div class="moti-go-solicitud-mapa sin-ubicacion">
                        <span class="material-symbols-outlined">
                            location_off
                        </span>
                        Ubicación GPS no disponible
                    </div>
                `}

            </div>


            <div class="moti-go-solicitud-resumen">

                <div class="moti-go-solicitud-resumen-item">
                    <span class="material-symbols-outlined">
                        route
                    </span>

                    <div>
                        <small>Distancia</small>
                        <strong>
                            ${distanciaTexto}
                        </strong>
                    </div>
                </div>

                <div class="moti-go-solicitud-resumen-item">
                    <span class="material-symbols-outlined">
                        store
                    </span>

                    <div>
                        <small>Tiendas</small>
                        <strong>
                            ${cantidadTiendas}
                        </strong>
                    </div>
                </div>

                <div class="moti-go-solicitud-resumen-item">
                    <span class="material-symbols-outlined">
                        inventory_2
                    </span>

                    <div>
                        <small>Productos</small>
                        <strong>
                            ${cantidadProductos}
                        </strong>
                    </div>
                </div>

            </div>


            <div class="moti-go-solicitud-nota">
                <span class="material-symbols-outlined">
                    payments
                </span>

                <p>
                    El cobro de entrega corresponde a tu ganancia por este servicio.
                </p>
            </div>


            <div class="moti-go-solicitud-tiempo">

                <div class="moti-go-solicitud-tiempo-texto">
                    <span>
                        Responde antes de que termine el tiempo
                    </span>

                    <strong class="moti-go-contador">
                        ${TIEMPO_SOLICITUD}s
                    </strong>
                </div>

                <div class="moti-go-barra-tiempo">
                    <div
                        class="moti-go-barra-tiempo-progreso"
                    ></div>
                </div>

            </div>


            <div class="moti-go-solicitud-botones">

                <button
                    type="button"
                    class="moti-go-btn-rechazar"
                    data-accion="rechazar"
                >
                    <span class="material-symbols-outlined">
                        close
                    </span>
                    Rechazar
                </button>

                <button
                    type="button"
                    class="moti-go-btn-aceptar"
                    data-accion="aceptar"
                >
                    <span class="material-symbols-outlined">
                        check_circle
                    </span>
                    Aceptar pedido
                </button>

            </div>

        </div>

    `;

    document.body.appendChild(
        overlay
    );

    agregarEstilosSolicitud();

    if (
        tieneCoordenadas
    ) {
        inicializarMapaSolicitud(
            mapaId,
            latitud,
            longitud
        );
    }

    const botonAceptar =
        overlay.querySelector(
            '[data-accion="aceptar"]'
        );

    const botonRechazar =
        overlay.querySelector(
            '[data-accion="rechazar"]'
        );

    botonAceptar.addEventListener(
        "click",
        () => {
            aceptarPedido(pedido);
        }
    );

    botonRechazar.addEventListener(
        "click",
        () => {
            rechazarPedido(pedido);
        }
    );

    let segundos =
        TIEMPO_SOLICITUD;

    const contador =
        overlay.querySelector(
            ".moti-go-contador"
        );

    const barra =
        overlay.querySelector(
            ".moti-go-barra-tiempo-progreso"
        );

    const intervalo =
        setInterval(
            () => {
                segundos--;

                if (contador) {
                    contador.textContent =
                        `${Math.max(0, segundos)}s`;
                }

                if (barra) {
                    const porcentaje =
                        Math.max(
                            0,
                            (segundos /
                                TIEMPO_SOLICITUD) *
                            100
                        );

                    barra.style.width =
                        `${porcentaje}%`;
                }

                if (segundos <= 0) {
                    clearInterval(intervalo);
                    expirarSolicitud(pedido);
                }
            },
            1000
        );

    solicitudesActivas.set(
        pedido.id,
        {
            pedido,
            overlay,
            intervalo
        }
    );

}


// =====================================================
// EXPIRAR SOLICITUD
// =====================================================

function expirarSolicitud(
    pedido
) {

    if (
        !pedido ||
        !pedido.id
    ) {

        return;

    }


    console.log(
        "⌛ MOTI GO: solicitud expirada:",
        pedido.id
    );


    limpiarSolicitud(
        pedido.id
    );


    // IMPORTANTE:
    //
    // No modificamos el pedido desde aquí.
    //
    // El dispatcher es quien controla el
    // tiempo de cada candidato.
    //
    // Cuando cambie el estado de Firebase,
    // el listener retirará la solicitud.


    mostrarAvisoSolicitudExpirada();

}


// =====================================================
// ACEPTAR PEDIDO
// =====================================================

async function aceptarPedido(
    pedido
) {

    if (
        !pedido ||
        !pedido.id ||
        !usuarioRepartidor
    ) {

        return;

    }


    // =================================================
    // EVITAR DOS PEDIDOS ACTIVOS
    // =================================================

    if (
        pedidoActual
    ) {

        mostrarAviso(
            "Ya tienes un pedido activo.",
            "Finaliza el pedido actual antes de aceptar otro."
        );

        return;

    }


    try {

        console.log(
            "✅ MOTI GO: aceptando pedido:",
            pedido.id
        );


        const pedidoRef =
            doc(
                db,
                "pedidos",
                pedido.id
            );


        // =================================================
        // VERIFICAR NUEVAMENTE EL PEDIDO EN FIREBASE
        // =================================================

        const pedidoSnapshot =
            await getDoc(
                pedidoRef
            );


        if (
            !pedidoSnapshot.exists()
        ) {

            limpiarSolicitud(
                pedido.id
            );

            return;

        }


        const datosActuales =
            pedidoSnapshot.data();


        if (
            datosActuales.estado !==
            "solicitud_repartidor"
            ||
            datosActuales.repartidorId !==
            usuarioRepartidor.uid
        ) {

            mostrarAviso(
                "Solicitud no disponible",
                "Este pedido ya no está disponible."
            );


            limpiarSolicitud(
                pedido.id
            );


            return;

        }


        // =================================================
        // ACEPTAR
        // =================================================

        // =================================================
// IDENTIFICAR SI EL REPARTIDOR ES FUNDADOR
// =================================================

const repartidorRef =
    doc(
        db,
        "usuarios",
        usuarioRepartidor.uid
    );


const repartidorSnapshot =
    await getDoc(
        repartidorRef
    );


if (
    !repartidorSnapshot.exists()
) {

    throw new Error(
        "No se encontró el perfil del repartidor."
    );

}


const datosRepartidor =
    repartidorSnapshot.data();


const esFundador =
    datosRepartidor.esFundador === true;


// =================================================
// PREPARAR COMISIONES DEL FUNDADOR
// =================================================
//
// El porcentaje utilizado es el que quedó
// congelado dentro del pedido.
//
// NO usamos nuevamente la configuración actual,
// porque un pedido histórico no debe cambiar.
// =================================================

const comisionesActuales =
    datosActuales.comisiones &&
    typeof datosActuales.comisiones ===
        "object"

        ? datosActuales.comisiones

        : {};


const porcentajeFundador =
    Number(
        datosActuales
            .configuracionAplicada
            ?.comisionFundadorPorcentaje ??
        0
    );


const comisionesTiendas =
    Array.isArray(
        comisionesActuales.tiendas
    )
        ? comisionesActuales.tiendas.map(
            comision => {

                const montoComision =
                    Number(
                        comision.monto ||
                        0
                    );


                const montoFundador =
                    esFundador
                        ? Number(
                            (
                                montoComision *
                                porcentajeFundador /
                                100
                            ).toFixed(2)
                        )
                        : 0;


                return {

                    ...comision,

                    fundador: {

                        aplica:
                            esFundador,

                        porcentaje:
                            esFundador
                                ? porcentajeFundador
                                : 0,

                        monto:
                            montoFundador,

                        estado:
                            esFundador
                                ? "pendiente_cobro_tienda"
                                : "no_aplica"

                    }

                };

            }
        )
        : [];


const totalFundador =
    Number(
        comisionesTiendas
            .reduce(
                (
                    total,
                    comision
                ) => {

                    return (
                        total +
                        Number(
                            comision
                                .fundador
                                ?.monto ||
                            0
                        )
                    );

                },
                0
            )
            .toFixed(2)
    );


// =================================================
// ACEPTAR PEDIDO
// =================================================

await updateDoc(

    pedidoRef,

    {

        estado:
            "asignado",

        repartidorId:
            usuarioRepartidor.uid,

        repartidorNombre:
            usuarioRepartidor.displayName ||
            pedido.repartidorNombre ||
            "",

        // =========================================
        // IDENTIDAD FINANCIERA DEL REPARTIDOR
        // =========================================

        esFundador:
            esFundador,

        repartidorEsFundador:
            esFundador,

        fundadorId:
            esFundador
                ? usuarioRepartidor.uid
                : null,

        fundadorNombre:
            esFundador
                ? (
                    datosRepartidor.nombre ||
                    usuarioRepartidor.displayName ||
                    ""
                )
                : null,

        // =========================================
        // COMISIONES ACTUALIZADAS
        // =========================================

        comisiones: {

            ...comisionesActuales,

            tiendas:
                comisionesTiendas,

            fundador: {

                monto:
                    totalFundador,

                porcentaje:
                    esFundador
                        ? porcentajeFundador
                        : 0,

                estado:
                    esFundador
                        ? "pendiente_cobro_tienda"
                        : "no_aplica"

            }

        },

        fechaAsignacion:
            serverTimestamp(),

        actualizadoEn:
            serverTimestamp()

    }

);

       pedidoActual =
{
    id:
        pedido.id,

    ...datosActuales,

    estado:
        "asignado",

    repartidorId:
        usuarioRepartidor.uid,

    repartidorNombre:
        usuarioRepartidor.displayName ||
        pedido.repartidorNombre ||
        ""
};


        limpiarSolicitud(
            pedido.id
        );


        console.log(
            "🎉 MOTI GO - PEDIDO ACEPTADO:",
            pedido.id
        );


        console.log(
            "🛵 MOTI GO - REPARTIDOR ASIGNADO:",
            usuarioRepartidor.uid
        );


        // =================================================
        // GUARDAR VIAJE ACTIVO
        // =================================================

        try {

            const repartidorRef =
                doc(
                    db,
                    "usuarios",
                    usuarioRepartidor.uid
                );


            await updateDoc(

                repartidorRef,

                {

                    viajeActivo:
                        {

                            pedidoId:
                                pedido.id,

                            estado:
                                "asignado",

                            iniciadoEn:
                                serverTimestamp()

                        },

                    estadoServicio:
                        "ocupado",

                    actualizadoEn:
                        serverTimestamp()

                }

            );


            console.log(
                "📌 MOTI GO: viaje activo guardado."
            );

        }
        catch (
            errorViaje
        ) {

            console.error(
                "⚠️ MOTI GO: no se pudo guardar viaje activo:",
                errorViaje
            );

        }


        mostrarAviso(
            "Pedido aceptado",
            "El pedido ha sido asignado a ti."
        );

    }
    catch (
        error
    ) {

        console.error(
            "❌ MOTI GO - ERROR ACEPTANDO PEDIDO:",
            error
        );

    }

}


// =====================================================
// RECHAZAR PEDIDO
// =====================================================

async function rechazarPedido(
    pedido
) {

    if (
        !pedido ||
        !pedido.id ||
        !usuarioRepartidor
    ) {

        return;

    }


    try {

        console.log(
            "❌ MOTI GO: rechazando pedido:",
            pedido.id
        );


        const pedidoRef =
            doc(
                db,
                "pedidos",
                pedido.id
            );


        const pedidoSnapshot =
            await getDoc(
                pedidoRef
            );


        if (
            !pedidoSnapshot.exists()
        ) {

            limpiarSolicitud(
                pedido.id
            );

            return;

        }


        const datosActuales =
            pedidoSnapshot.data();


        if (
            datosActuales.estado !==
            "solicitud_repartidor"
            ||
            datosActuales.repartidorId !==
            usuarioRepartidor.uid
        ) {

            limpiarSolicitud(
                pedido.id
            );

            return;

        }


        await updateDoc(

            pedidoRef,

            {

                estado:
                    "pendiente_asignacion",

                repartidorId:
                    null,

                repartidorNombre:
                    null,

                solicitudRechazadaPor:
                    usuarioRepartidor.uid,

                solicitudRechazadaEn:
                    serverTimestamp(),

                actualizadoEn:
                    serverTimestamp()

            }

        );


        limpiarSolicitud(
            pedido.id
        );


        console.log(
            "↪️ MOTI GO: pedido rechazado, buscando siguiente repartidor."
        );

    }
    catch (
        error
    ) {

        console.error(
            "❌ MOTI GO - ERROR RECHAZANDO PEDIDO:",
            error
        );

    }

}


// =====================================================
// LIMPIAR SOLICITUD
// =====================================================

function limpiarSolicitud(
    pedidoId
) {

    const solicitud =
        solicitudesActivas.get(
            pedidoId
        );


    if (
        !solicitud
    ) {

        return;

    }


    if (
        solicitud.intervalo
    ) {

        clearInterval(
            solicitud.intervalo
        );

    }


    if (
        solicitud.overlay
    ) {

        solicitud.overlay.remove();

    }


    solicitudesActivas.delete(
        pedidoId
    );

}


// =====================================================
// VIAJE ACTIVO
// =====================================================

function mostrarViajeActivo(
    viaje
) {

    if (
        !viaje
    ) {

        return;

    }


    console.log(
        "🚗 MOTI GO: mostrando viaje activo:",
        viaje
    );


    // Por ahora dejamos el registro preparado.
    //
    // En el siguiente paso recuperaremos la
    // pantalla completa del viaje activo del MOTI
    // original.

}


// =====================================================
// AVISO
// =====================================================

function mostrarAviso(
    titulo,
    descripcion
) {

    const anterior =
        document.querySelector(
            ".moti-go-aviso"
        );


    if (
        anterior
    ) {

        anterior.remove();

    }


    const aviso =
        document.createElement(
            "div"
        );


    aviso.className =
        "moti-go-aviso";


    aviso.innerHTML = `

        <div class="moti-go-aviso-contenido">

            <span class="material-symbols-outlined">
                check_circle
            </span>

            <strong>
                ${escaparHTML(
                    titulo
                )}
            </strong>

            <p>
                ${escaparHTML(
                    descripcion
                )}
            </p>

        </div>

    `;


    document.body.appendChild(
        aviso
    );


    setTimeout(
        () => {

            aviso.classList.add(
                "moti-go-aviso-saliendo"
            );


            setTimeout(
                () => {

                    aviso.remove();

                },
                300
            );

        },
        2500
    );

}


// =====================================================
// AVISO SOLICITUD EXPIRADA
// =====================================================

function mostrarAvisoSolicitudExpirada() {

    mostrarAviso(
        "Solicitud expirada",
        "El tiempo para responder terminó."
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
// ESTILOS DE SOLICITUD
// =====================================================

function agregarEstilosSolicitud() {

    if (
        document.getElementById(
            "moti-go-estilos-solicitud"
        )
    ) {

        return;

    }


    const estilos =
        document.createElement(
            "style"
        );


    estilos.id =
        "moti-go-estilos-solicitud";


    estilos.textContent = `

        .moti-go-solicitud-overlay {

            position: fixed;

            inset: 0;

            z-index: 99999;

            display: flex;

            align-items: center;

            justify-content: center;

            padding: 20px;

            background:
                rgba(15, 23, 42, .58);

            backdrop-filter:
                blur(5px);

            animation:
                motiGoAparecer .22s ease;

        }


        .moti-go-solicitud-modal {

            width: min(
                430px,
                100%
            );

            background:
                #ffffff;

            border-radius:
                24px;

            padding:
                24px;

            box-shadow:
                0 20px 60px
                rgba(0,0,0,.25);

            font-family:
                system-ui,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                sans-serif;

        }


        .moti-go-solicitud-icono {

            width:
                62px;

            height:
                62px;

            margin:
                0 auto 14px;

            border-radius:
                20px;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            background:
                #e8f5e9;

            color:
                #16a34a;

        }


        .moti-go-solicitud-icono
        .material-symbols-outlined {

            font-size:
                32px;

        }


        .moti-go-solicitud-titulo {

            text-align:
                center;

            font-size:
                23px;

            font-weight:
                800;

            color:
                #111827;

        }


        .moti-go-solicitud-folio {

            text-align:
                center;

            margin-top:
                5px;

            font-size:
                13px;

            color:
                #6b7280;

        }


        .moti-go-solicitud-info {

            display:
                grid;

            grid-template-columns:
                1fr 1fr;

            gap:
                12px;

            margin-top:
                22px;

        }


        .moti-go-solicitud-dato {

            display:
                flex;

            align-items:
                center;

            gap:
                10px;

            padding:
                13px;

            border-radius:
                16px;

            background:
                #f8fafc;

        }


        .moti-go-solicitud-dato
        .material-symbols-outlined {

            font-size:
                25px;

            color:
                #475569;

        }


        .moti-go-solicitud-dato
        small {

            display:
                block;

            color:
                #64748b;

            font-size:
                11px;

        }


        .moti-go-solicitud-dato
        strong {

            display:
                block;

            margin-top:
                2px;

            color:
                #0f172a;

            font-size:
                17px;

        }


        .moti-go-solicitud-total {

            display:
                flex;

            align-items:
                center;

            justify-content:
                space-between;

            margin-top:
                14px;

            padding:
                16px;

            border-radius:
                16px;

            background:
                #f1f5f9;

        }


        .moti-go-solicitud-total span {

            font-size:
                13px;

            color:
                #64748b;

        }


        .moti-go-solicitud-total strong {

            font-size:
                22px;

            color:
                #111827;

        }


        .moti-go-solicitud-tiempo {

            margin-top:
                18px;

        }


        .moti-go-solicitud-tiempo-texto {

            display:
                flex;

            justify-content:
                space-between;

            align-items:
                center;

            font-size:
                12px;

            color:
                #64748b;

        }


        .moti-go-solicitud-tiempo-texto strong {

            font-size:
                18px;

            color:
                #111827;

        }


        .moti-go-barra-tiempo {

            height:
                7px;

            margin-top:
                8px;

            overflow:
                hidden;

            border-radius:
                99px;

            background:
                #e5e7eb;

        }


        .moti-go-barra-tiempo-progreso {

            width:
                100%;

            height:
                100%;

            border-radius:
                inherit;

            background:
                #16a34a;

            transition:
                width 1s linear;

        }


        .moti-go-solicitud-botones {

            display:
                grid;

            grid-template-columns:
                1fr 1.4fr;

            gap:
                10px;

            margin-top:
                22px;

        }


        .moti-go-solicitud-botones button {

            border:
                0;

            min-height:
                50px;

            border-radius:
                15px;

            font-size:
                14px;

            font-weight:
                750;

            cursor:
                pointer;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            gap:
                7px;

        }


        .moti-go-btn-rechazar {

            background:
                #f1f5f9;

            color:
                #475569;

        }


        .moti-go-btn-aceptar {

            background:
                #16a34a;

            color:
                #ffffff;

        }



        /* =============================================
           REDISEÑO PROFESIONAL - SOLICITUD
        ============================================== */

        .moti-go-solicitud-modal {
            width: min(470px, 100%);
            max-height: min(92vh, 760px);
            overflow-y: auto;
            padding: 22px;
            border-radius: 26px;
        }

        .moti-go-solicitud-cabecera {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .moti-go-solicitud-icono {
            flex: 0 0 58px;
            width: 58px;
            height: 58px;
            margin: 0;
            border-radius: 18px;
        }

        .moti-go-solicitud-cabecera-texto {
            min-width: 0;
            flex: 1;
        }

        .moti-go-solicitud-etiqueta {
            display: block;
            margin-bottom: 3px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .12em;
            color: #16a34a;
        }

        .moti-go-solicitud-titulo {
            text-align: left;
            font-size: 21px;
        }

        .moti-go-solicitud-folio {
            text-align: left;
            margin-top: 2px;
        }

        .moti-go-solicitud-ganancia {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-top: 18px;
            padding: 16px;
            border: 1px solid #dcfce7;
            border-radius: 18px;
            background: #f0fdf4;
        }

        .moti-go-solicitud-ganancia > div {
            display: flex;
            align-items: center;
            gap: 11px;
            min-width: 0;
        }

        .moti-go-solicitud-ganancia > div > .material-symbols-outlined {
            font-size: 28px;
            color: #16a34a;
        }

        .moti-go-solicitud-ganancia small,
        .moti-go-solicitud-destino small,
        .moti-go-solicitud-resumen-item small {
            display: block;
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: .05em;
        }

        .moti-go-solicitud-ganancia strong {
            display: block;
            margin-top: 1px;
            font-size: 25px;
            color: #15803d;
        }

        .moti-go-solicitud-ganancia-badge {
            padding: 6px 9px;
            border-radius: 999px;
            background: #dcfce7;
            color: #15803d;
            font-size: 10px;
            font-weight: 800;
            white-space: nowrap;
        }

        .moti-go-solicitud-destino {
            margin-top: 12px;
            padding: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 18px;
            background: #fff;
        }

        .moti-go-solicitud-destino-titulo {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .moti-go-solicitud-destino-titulo > .material-symbols-outlined {
            font-size: 27px;
            color: #ef4444;
        }

        .moti-go-solicitud-destino-titulo strong {
            display: block;
            margin-top: 2px;
            font-size: 16px;
            color: #0f172a;
        }

        .moti-go-solicitud-referencia {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin-top: 11px;
            padding-top: 11px;
            border-top: 1px solid #f1f5f9;
            color: #475569;
            font-size: 13px;
            line-height: 1.4;
        }

        .moti-go-solicitud-referencia .material-symbols-outlined {
            flex: 0 0 auto;
            font-size: 18px;
            color: #64748b;
        }

        .moti-go-solicitud-mapa-contenedor {
            margin-top: 12px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            background: #f8fafc;
        }

        .moti-go-solicitud-mapa-titulo {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 9px 11px;
            background: #ffffff;
            border-bottom: 1px solid #eef2f7;
        }

        .moti-go-solicitud-mapa-titulo > span {
            display: flex;
            align-items: center;
            gap: 6px;
            color: #0f172a;
            font-size: 11px;
            font-weight: 800;
        }

        .moti-go-solicitud-mapa-titulo .material-symbols-outlined {
            font-size: 17px;
            color: #16a34a;
        }

        .moti-go-solicitud-mapa-titulo small {
            color: #94a3b8;
            font-size: 9px;
            font-weight: 700;
            white-space: nowrap;
        }

        .moti-go-solicitud-mapa-real {
            width: 100%;
            height: 168px;
            background: #e2e8f0;
        }

        .moti-go-solicitud-mapa-real .leaflet-control-attribution {
            font-size: 8px;
        }

        .moti-go-solicitud-mapa-real .leaflet-control-zoom {
            margin-right: 8px;
            margin-bottom: 8px;
            border: 0;
            box-shadow: 0 4px 14px rgba(15,23,42,.18);
        }

        .moti-go-solicitud-mapa-real .leaflet-control-zoom a {
            width: 30px;
            height: 30px;
            line-height: 30px;
            color: #334155;
            font-weight: 800;
        }

        .moti-go-marcador-entrega {
            background: transparent;
            border: 0;
        }

        .moti-go-marcador-punto {
            width: 42px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            background: #16a34a;
            border: 3px solid #ffffff;
            box-shadow: 0 6px 18px rgba(15,23,42,.28);
        }

        .moti-go-marcador-punto .material-symbols-outlined {
            transform: rotate(45deg);
            color: #ffffff;
            font-size: 22px;
        }

        .moti-go-solicitud-mapa {
            display: flex;
            align-items: center;
            gap: 7px;
            margin-top: 12px;
            padding: 10px 12px;
            border-radius: 12px;
            background: #f8fafc;
            color: #2563eb;
            text-decoration: none;
            font-size: 12px;
            font-weight: 750;
        }

        .moti-go-solicitud-mapa .material-symbols-outlined {
            font-size: 18px;
        }

        .moti-go-solicitud-mapa .material-symbols-outlined:last-child {
            margin-left: auto;
            font-size: 16px;
        }

        .moti-go-solicitud-mapa.sin-ubicacion {
            color: #94a3b8;
        }

        .moti-go-solicitud-resumen {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-top: 12px;
        }

        .moti-go-solicitud-resumen-item {
            min-width: 0;
            padding: 12px 10px;
            border-radius: 15px;
            background: #f8fafc;
        }

        .moti-go-solicitud-resumen-item > .material-symbols-outlined {
            display: block;
            margin-bottom: 5px;
            font-size: 20px;
            color: #475569;
        }

        .moti-go-solicitud-resumen-item strong {
            display: block;
            margin-top: 2px;
            color: #0f172a;
            font-size: 15px;
        }

        .moti-go-solicitud-nota {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin-top: 12px;
            padding: 10px 12px;
            border-radius: 13px;
            background: #f8fafc;
            color: #64748b;
        }

        .moti-go-solicitud-nota .material-symbols-outlined {
            flex: 0 0 auto;
            margin-top: 1px;
            font-size: 18px;
            color: #64748b;
        }

        .moti-go-solicitud-nota p {
            margin: 0;
            font-size: 11px;
            line-height: 1.45;
        }

        .moti-go-solicitud-tiempo {
            margin-top: 15px;
        }

        .moti-go-solicitud-botones {
            margin-top: 17px;
        }

        @media (max-width: 480px) {
            .moti-go-solicitud-overlay {
                align-items: flex-end;
                padding: 10px;
            }

            .moti-go-solicitud-modal {
                width: 100%;
                max-height: 92vh;
                padding: 18px;
                border-radius: 24px;
            }

            .moti-go-solicitud-resumen {
                gap: 6px;
            }

            .moti-go-solicitud-resumen-item {
                padding: 10px 8px;
            }
        }

        .moti-go-solicitud-botones button:active {

            transform:
                scale(.98);

        }


        .moti-go-aviso {

            position:
                fixed;

            left:
                50%;

            bottom:
                24px;

            transform:
                translateX(-50%);

            z-index:
                100000;

            width:
                min(
                    380px,
                    calc(100% - 30px)
                );

            animation:
                motiGoSubir .25s ease;

        }


        .moti-go-aviso-contenido {

            display:
                flex;

            flex-direction:
                column;

            align-items:
                center;

            text-align:
                center;

            padding:
                18px;

            border-radius:
                18px;

            background:
                #ffffff;

            box-shadow:
                0 15px 45px
                rgba(0,0,0,.22);

        }


        .moti-go-aviso-contenido
        .material-symbols-outlined {

            font-size:
                30px;

            color:
                #16a34a;

        }


        .moti-go-aviso-contenido
        strong {

            margin-top:
                6px;

            color:
                #111827;

        }


        .moti-go-aviso-contenido
        p {

            margin:
                4px 0 0;

            color:
                #64748b;

            font-size:
                13px;

        }


        .moti-go-aviso-saliendo {

            opacity:
                0;

            transition:
                opacity .3s ease;

        }


        @keyframes motiGoAparecer {

            from {

                opacity:
                    0;

                transform:
                    scale(.97);

            }

            to {

                opacity:
                    1;

                transform:
                    scale(1);

            }

        }


        @keyframes motiGoSubir {

            from {

                opacity:
                    0;

                transform:
                    translate(
                        -50%,
                        20px
                    );

            }

            to {

                opacity:
                    1;

                transform:
                    translate(
                        -50%,
                        0
                    );

            }

        }


        @media (
            max-width: 480px
        ) {

            .moti-go-solicitud-modal {

                padding:
                    20px;

                border-radius:
                    22px;

            }


            .moti-go-solicitud-titulo {

                font-size:
                    21px;

            }

        }

    `;


    document.head.appendChild(
        estilos
    );

}


// =====================================================
// EXPONER FUNCIONES
// =====================================================

window.motiGoRepartidor = {

    iniciar:
        iniciarMotiGoRepartidor,

    aceptarPedido:
        aceptarPedido,

    rechazarPedido:
        rechazarPedido,

    verificarViajeActivo:
        verificarViajeActivo

};


// =====================================================
// INICIO AUTOMÁTICO
// =====================================================

auth.onAuthStateChanged(async (usuario) => {
    if (!usuario) {
        detenerMotiGoRepartidor();
        moduloRepartidorIniciado = false;
        return;
    }

    if (moduloRepartidorIniciado) return;
    moduloRepartidorIniciado = true;
    await iniciarMotiGoRepartidor();
});
