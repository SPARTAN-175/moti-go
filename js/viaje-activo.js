import { auth, db }
from "./firebase-config.js";

import {
    doc,
    getDoc,
    updateDoc,
    onSnapshot,
    increment
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


// =====================================================
// VARIABLES
// =====================================================

let viajeActual = null;
let viajeId = null;

let map = null;

let conductorMarker = null;
let pasajeroMarker = null;

let rutaControl = null;

let listenerMovimiento = false;
let listenerPedido = null;


// =====================================================
// ICONOS
// =====================================================

const motoIcon = L.icon({

    iconUrl:
        "../assets/icons/mototaxi.svg",

    iconSize: [42, 42],

    iconAnchor: [21, 21],

    popupAnchor: [0, -18]

});


const pasajeroIcon = L.icon({

    iconUrl:
        "../assets/icons/pasajero.svg",

    iconSize: [40, 40],

    iconAnchor: [20, 20],

    popupAnchor: [0, -18]

});


const destinoIcon = L.icon({

    iconUrl:
        "../assets/icons/destino.svg",

    iconSize: [38, 38],

    iconAnchor: [19, 19]

});


// =====================================================
// INICIO
// =====================================================

onAuthStateChanged(

    auth,

    async (user) => {

        if (!user) {

            volverAlDashboard();

            return;

        }


        try {

            const usuarioRef =
                doc(
                    db,
                    "usuarios",
                    user.uid
                );


            const usuarioSnap =
                await getDoc(
                    usuarioRef
                );


            if (
                !usuarioSnap.exists()
            ) {

                volverAlDashboard();

                return;

            }


            const usuario =
                usuarioSnap.data();


            const viajeActivo =
                usuario.viajeActivo;


            const pedidoId =
                typeof viajeActivo === "string"
                    ? viajeActivo
                    : viajeActivo?.pedidoId;


            console.log(
                "🚗 MOTI GO: pedido activo:",
                pedidoId
            );


            if (!pedidoId) {

                console.warn(
                    "⚠️ MOTI GO: no existe pedido activo."
                );

                volverAlDashboard();

                return;

            }


            viajeId =
                pedidoId;


            escucharPedidoActivo(
                pedidoId
            );


            escucharMovimientoConductor();

        }

        catch (error) {

            console.error(
                "❌ MOTI GO: error iniciando viaje activo:",
                error
            );

            volverAlDashboard();

        }

    }

);


// =====================================================
// ESCUCHAR PEDIDO EN TIEMPO REAL
// =====================================================

function escucharPedidoActivo(
    pedidoId
) {

    if (listenerPedido) {

        listenerPedido();

        listenerPedido = null;

    }


    listenerPedido =
        onSnapshot(

            doc(
                db,
                "pedidos",
                pedidoId
            ),

            async (snapshot) => {

                if (
                    !snapshot.exists()
                ) {

                    console.warn(
                        "⚠️ MOTI GO: el pedido ya no existe."
                    );

                    manejarCancelacion();

                    return;

                }


                viajeActual = {

                    id:
                        snapshot.id,

                    ...snapshot.data()

                };


                console.log(
                    "🔄 MOTI GO: pedido actualizado:",
                    viajeActual
                );


                // =====================================
                // PEDIDO CANCELADO
                // =====================================

                if (
                    viajeActual.estado ===
                    "cancelado"
                ) {

                    manejarCancelacion();

                    return;

                }


                // =====================================
                // PEDIDO ENTREGADO
                // =====================================

                if (
                    viajeActual.estado ===
                    "entregado"
                ) {

                    actualizarInterfaz();

                    return;

                }


                actualizarInterfaz();


                await actualizarDatosVisuales();

            },

            (error) => {

                console.error(
                    "❌ MOTI GO: error escuchando pedido:",
                    error
                );

            }

        );

}


// =====================================================
// ACTUALIZAR DATOS VISUALES
// =====================================================

async function actualizarDatosVisuales() {

    if (!viajeActual) {
        return;
    }


    const nombreCliente =
        viajeActual.clienteNombre ||
        "Cliente";


    document.getElementById(
        "nombrePasajero"
    ).textContent =
        nombreCliente;


    const ubicacionEntrega =
        viajeActual.ubicacionEntrega ||
        viajeActual.destino ||
        {};


    const localidad =
        ubicacionEntrega.localidad ||
        viajeActual.localidad ||
        "Destino de entrega";


    const referencia =
        ubicacionEntrega.referencia ||
        viajeActual.referencia ||
        viajeActual.observaciones ||
        "-";


    document.getElementById(
        "destinoViaje"
    ).textContent =
        localidad;


    document.getElementById(
        "referenciaViaje"
    ).textContent =
        referencia;


    try {

        await cargarMapa();

    }

    catch (error) {

        console.error(
            "⚠️ MOTI GO: error actualizando mapa:",
            error
        );

    }

}


// =====================================================
// INTERFAZ
// =====================================================

function actualizarInterfaz() {

    if (!viajeActual) {
        return;
    }


    const estado =
        document.getElementById(
            "estadoViaje"
        );


    const boton =
        document.getElementById(
            "btnAccion"
        );


    boton.disabled = false;


    switch (
        viajeActual.estado
    ) {

        case "asignado":

            estado.textContent =
                "Pedido asignado";

            boton.textContent =
                "Iniciar recorrido";

            break;


        case "en_camino":

            estado.textContent =
                "En camino al cliente";

            boton.textContent =
                "Llegué al cliente";

            break;


        case "esperando_cliente":

            estado.textContent =
                "Esperando al cliente";

            boton.textContent =
                "Iniciar entrega";

            break;


        case "en_entrega":

            estado.textContent =
                "Entrega en curso";

            boton.textContent =
                "Finalizar entrega";

            break;


        case "entregado":

            estado.textContent =
                "Pedido entregado";

            boton.textContent =
                "Pedido entregado";

            boton.disabled =
                true;

            break;


        case "cancelado":

            estado.textContent =
                "Pedido cancelado";

            boton.textContent =
                "Pedido cancelado";

            boton.disabled =
                true;

            break;


        default:

            estado.textContent =
                "Pedido asignado";

            boton.textContent =
                "Iniciar recorrido";

            break;

    }

}


// =====================================================
// BOTÓN PRINCIPAL
// =====================================================

document
    .getElementById(
        "btnAccion"
    )
    .addEventListener(
        "click",
        ejecutarAccion
    );


// =====================================================
// ACCIONES DEL VIAJE
// =====================================================

async function ejecutarAccion() {

    if (!viajeActual) {
        return;
    }


    console.log(
        "🛵 MOTI GO: acción:",
        viajeActual.estado
    );


    switch (
        viajeActual.estado
    ) {

        case "asignado":

            await cambiarEstado(
                "en_camino"
            );

            break;


        case "en_camino":

            await cambiarEstado(
                "esperando_cliente"
            );

            break;


        case "esperando_cliente":

            await cambiarEstado(
                "en_entrega"
            );

            break;


        case "en_entrega":

            await finalizarViaje();

            break;


        default:

            console.warn(
                "⚠️ MOTI GO: estado sin acción:",
                viajeActual.estado
            );

    }

}


// =====================================================
// CAMBIAR ESTADO
// =====================================================

async function cambiarEstado(
    nuevoEstado
) {

    if (!viajeId) {
        return;
    }


    try {

        console.log(
            "🔄 MOTI GO: cambiando estado:",
            viajeActual.estado,
            "→",
            nuevoEstado
        );


        await updateDoc(

            doc(
                db,
                "pedidos",
                viajeId
            ),

            {

                estado:
                    nuevoEstado

            }

        );


        console.log(
            "✅ MOTI GO: estado actualizado:",
            nuevoEstado
        );

    }

    catch (error) {

        console.error(
            "❌ MOTI GO: error cambiando estado:",
            error
        );


        alert(
            "No se pudo actualizar el estado del pedido."
        );

    }

}


// =====================================================
// CARGAR MAPA
// =====================================================

async function cargarMapa() {

    if (!viajeActual) {
        return;
    }


    const usuarioSnap =
        await getDoc(

            doc(
                db,
                "usuarios",
                auth.currentUser.uid
            )

        );


    if (
        !usuarioSnap.exists()
    ) {
        return;
    }


    const conductor =
        usuarioSnap.data();


    const conductorLat =
        Number(
            conductor.latitud
        );


    const conductorLng =
        Number(
            conductor.longitud
        );


    if (
        !Number.isFinite(
            conductorLat
        ) ||
        !Number.isFinite(
            conductorLng
        )
    ) {

        console.warn(
            "⚠️ MOTI GO: ubicación del repartidor no disponible."
        );

        return;

    }


    const ubicacionEntrega =
        viajeActual.ubicacionEntrega ||
        {};
    


    const pasajeroLat =
        Number(
            ubicacionEntrega.latitud ??
            viajeActual.latitud
        );


    const pasajeroLng =
        Number(
            ubicacionEntrega.longitud ??
            viajeActual.longitud
        );

    console.log(
    "🗺️ MOTI GO - UBICACIÓN ENTREGA:",
    ubicacionEntrega
);

console.log(
    "🗺️ MOTI GO - COORDENADAS REPARTIDOR:",
    conductorLat,
    conductorLng
);

console.log(
    "🗺️ MOTI GO - COORDENADAS CLIENTE:",
    pasajeroLat,
    pasajeroLng
);


    if (
        !Number.isFinite(
            pasajeroLat
        ) ||
        !Number.isFinite(
            pasajeroLng
        )
    ) {

        console.warn(
            "⚠️ MOTI GO: ubicación del cliente no disponible."
        );

        return;

    }


    const conductorPos = [

        conductorLat,
        conductorLng

    ];


    const pasajeroPos = [

        pasajeroLat,
        pasajeroLng

    ];


    if (!map) {

        map =
            L.map(
                "map"
            );


        L.tileLayer(

            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

            {

                maxZoom: 19,

                attribution:
                    "© OpenStreetMap"

            }

        ).addTo(map);

    }


    if (
        conductorMarker
    ) {

        map.removeLayer(
            conductorMarker
        );

    }


    if (
        pasajeroMarker
    ) {

        map.removeLayer(
            pasajeroMarker
        );

    }


    conductorMarker =
        L.marker(

            conductorPos,

            {

                icon:
                    motoIcon

            }

        )
        .addTo(map)
        .bindPopup(
            "Tú"
        );


    let destinoPos =
        pasajeroPos;


    let icono =
        pasajeroIcon;


    let texto =
        viajeActual.clienteNombre ||
        "Cliente";


    if (
        viajeActual.estado ===
        "en_entrega"
    ) {

        const destinoLat =
            Number(
                viajeActual.destinoLatitud
            );


        const destinoLng =
            Number(
                viajeActual.destinoLongitud
            );


        if (
            Number.isFinite(
                destinoLat
            ) &&
            Number.isFinite(
                destinoLng
            )
        ) {

            destinoPos = [

                destinoLat,
                destinoLng

            ];

            icono =
                destinoIcon;

            texto =
                "Destino";

        }

    }


    pasajeroMarker =
        L.marker(

            destinoPos,

            {

                icon:
                    icono

            }

        )
        .addTo(map)
        .bindPopup(
            texto
        );


    dibujarRuta(

        conductorPos,
        destinoPos

    );


    const grupo =
        L.featureGroup([

            conductorMarker,
            pasajeroMarker

        ]);


    map.fitBounds(

        grupo.getBounds(),

        {

            padding:
                [40, 40]

        }

    );

}


// =====================================================
// ESCUCHAR UBICACIÓN DEL REPARTIDOR
// =====================================================

function escucharMovimientoConductor() {

    if (
        listenerMovimiento
    ) {
        return;
    }


    listenerMovimiento =
        true;


    onSnapshot(

        doc(
            db,
            "usuarios",
            auth.currentUser.uid
        ),

        (snapshot) => {

            const datos =
                snapshot.data();


            if (
                !datos ||
                !map
            ) {
                return;
            }


            const lat =
                Number(
                    datos.latitud
                );


            const lng =
                Number(
                    datos.longitud
                );


            if (
                !Number.isFinite(lat) ||
                !Number.isFinite(lng)
            ) {
                return;
            }


            const nuevaPos = [

                lat,
                lng

            ];


            if (
                !conductorMarker
            ) {

                conductorMarker =
                    L.marker(

                        nuevaPos,

                        {
                            icon:
                                motoIcon
                        }

                    )
                    .addTo(map)
                    .bindPopup(
                        "Tú"
                    );

            }

            else {

                conductorMarker.setLatLng(
                    nuevaPos
                );

            }


            let destinoRuta = null;


            if (
                viajeActual
            ) {

                const ubicacionEntrega =
                    viajeActual.ubicacionEntrega ||
                    {};


                if (
                    viajeActual.estado ===
                    "en_entrega"
                ) {

                    const latDestino =
                        Number(
                            viajeActual.destinoLatitud
                        );


                    const lngDestino =
                        Number(
                            viajeActual.destinoLongitud
                        );


                    if (
                        Number.isFinite(
                            latDestino
                        ) &&
                        Number.isFinite(
                            lngDestino
                        )
                    ) {

                        destinoRuta = [

                            latDestino,
                            lngDestino

                        ];

                    }

                }


                if (
                    !destinoRuta
                ) {

                    const latCliente =
                        Number(
                            ubicacionEntrega.latitud ??
                            viajeActual.latitud
                        );


                    const lngCliente =
                        Number(
                            ubicacionEntrega.longitud ??
                            viajeActual.longitud
                        );


                    if (
                        Number.isFinite(
                            latCliente
                        ) &&
                        Number.isFinite(
                            lngCliente
                        )
                    ) {

                        destinoRuta = [

                            latCliente,
                            lngCliente

                        ];

                    }

                }

            }


            if (
                destinoRuta
            ) {

                dibujarRuta(

                    nuevaPos,
                    destinoRuta

                );

            }

        }

    );

}


// =====================================================
// DIBUJAR RUTA
// =====================================================

function dibujarRuta(
    origen,
    destino
) {

    if (
        !map ||
        !origen ||
        !destino
    ) {
        return;
    }


    if (!rutaControl) {

        rutaControl =
            L.Routing.control({

                waypoints: [

                    L.latLng(
                        origen[0],
                        origen[1]
                    ),

                    L.latLng(
                        destino[0],
                        destino[1]
                    )

                ],

                showAlternatives:
                    false,

                collapsible:
                    true,

                routeWhileDragging:
                    false,

                addWaypoints:
                    false,

                draggableWaypoints:
                    false,

                fitSelectedRoutes:
                    false,

                show:
                    false,

                createMarker:
                    () => null,

                lineOptions: {

                    styles: [{

                        color:
                            viajeActual?.tipoViaje ===
                            "especial"
                                ? "#f97316"
                                : "#16a34a",

                        weight: 6,

                        opacity: 0.9

                    }]

                }

            })
            .addTo(map);


        rutaControl.on(

            "routesfound",

            function (e) {

                const ruta =
                    e.routes[0];


                if (!ruta) {
                    return;
                }


                const distancia =
                    (
                        ruta.summary.totalDistance /
                        1000
                    ).toFixed(1);


                const tiempo =
                    Math.ceil(

                        ruta.summary.totalTime /
                        60

                    );


                const distanceElement =
                    document.getElementById(
                        "distanceText"
                    );


                const timeElement =
                    document.getElementById(
                        "timeText"
                    );


                if (
                    distanceElement
                ) {

                    distanceElement.textContent =
                        distancia + " km";

                }


                if (
                    timeElement
                ) {

                    timeElement.textContent =
                        tiempo + " min";

                }

            }

        );

    }

    else {

        rutaControl.setWaypoints([

            L.latLng(
                origen[0],
                origen[1]
            ),

            L.latLng(
                destino[0],
                destino[1]
            )

        ]);

    }

}


// =====================================================
// FINALIZAR ENTREGA
// =====================================================

async function finalizarViaje() {

    if (!viajeId) {
        return;
    }


    try {

        await updateDoc(

            doc(
                db,
                "pedidos",
                viajeId
            ),

            {

                estado:
                    "entregado",

                fechaFinalizacion:
                    new Date()

            }

        );


        console.log(
            "✅ MOTI GO: pedido marcado como entregado."
        );


        await updateDoc(

            doc(
                db,
                "usuarios",
                auth.currentUser.uid
            ),

            {

                estadoServicio:
                    "disponible",

                viajeActivo:
                    null,

                viajesHoy:
                    increment(1),

                viajesTotales:
                    increment(1)

            }

        );


        console.log(
            "✅ MOTI GO: repartidor liberado."
        );


        window.location.replace(
            "dashboard-repartidor.html"
        );

    }

    catch (error) {

        console.error(
            "❌ MOTI GO: error finalizando entrega:",
            error
        );


        alert(
            "No se pudo finalizar la entrega."
        );

    }

}


// =====================================================
// PEDIDO CANCELADO
// =====================================================

async function manejarCancelacion() {

    console.warn(
        "🚨 MOTI GO: el pedido fue cancelado."
    );


    alert(
        "El cliente canceló este pedido."
    );


    try {

        await updateDoc(

            doc(
                db,
                "usuarios",
                auth.currentUser.uid
            ),

            {

                estadoServicio:
                    "disponible",

                viajeActivo:
                    null

            }

        );

    }

    catch (error) {

        console.error(
            "❌ MOTI GO: error liberando repartidor:",
            error
        );

    }


    volverAlDashboard();

}


// =====================================================
// VOLVER AL DASHBOARD
// =====================================================

function volverAlDashboard() {

    if (
        listenerPedido
    ) {

        listenerPedido();

        listenerPedido =
            null;

    }


    window.location.replace(
        "dashboard-repartidor.html"
    );

}
