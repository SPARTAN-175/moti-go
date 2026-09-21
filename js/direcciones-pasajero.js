import { auth, db } from "./firebase-config.js";

import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


// =====================================================
// MOTI GO — MIS DIRECCIONES
// =====================================================

let usuarioActual = null;
let direccionEditandoId = null;
let tipoDireccionActual = "casa";

let mapaDireccion = null;
let marcadorDireccion = null;

let coordenadaLatitud = null;
let coordenadaLongitud = null;

let direcciones = [];


// =====================================================
// ELEMENTOS
// =====================================================

const lista =
    document.getElementById("direccionesLista");

const estado =
    document.getElementById("direccionesEstado");

const modal =
    document.getElementById("modalDireccion");

const modalTitulo =
    document.getElementById("direccionModalTitulo");

const inputNombre =
    document.getElementById("direccionNombre");

const inputLocalidad =
    document.getElementById("direccionLocalidad");

const inputReferencia =
    document.getElementById("direccionReferencia");

const inputPredeterminada =
    document.getElementById("direccionPredeterminada");

const coordenadasTexto =
    document.getElementById("coordenadasDireccion");


// =====================================================
// UTILIDADES
// =====================================================

function escaparHTML(valor) {

    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function nombreTipo(tipo) {

    if (tipo === "trabajo") return "Trabajo";
    if (tipo === "otro") return "Otro";

    return "Casa";

}


function iconoTipo(tipo) {

    if (tipo === "trabajo") return "work";
    if (tipo === "otro") return "location_on";

    return "home";

}


function coordenadasValidas(lat, lng) {

    return (
        Number.isFinite(Number(lat)) &&
        Number.isFinite(Number(lng)) &&
        Number(lat) >= -90 &&
        Number(lat) <= 90 &&
        Number(lng) >= -180 &&
        Number(lng) <= 180
    );

}


function guardarDestinoSeleccionado(direccion) {

    const destino = {
        tipo: "guardada",
        direccionId: direccion.id,
        nombre: direccion.nombre || nombreTipo(direccion.tipo),
        tipoDireccion: direccion.tipo || "otro",
        localidad: direccion.localidad || "",
        referencia: direccion.referencia || "",
        latitud: Number(direccion.latitud),
        longitud: Number(direccion.longitud)
    };

    sessionStorage.setItem(
        "motiGoDestinoSeleccionado",
        JSON.stringify(destino)
    );

    window.location.href =
        "dashboard-cliente.html";

}


function usarUbicacionActual() {

    if (!("geolocation" in navigator)) {

        window.motiGoNotificar(
            "Este dispositivo no permite obtener la ubicación."
        );

        return;

    }

    const boton =
        document.getElementById("btnUsarUbicacionActual");

    if (boton) {

        boton.disabled = true;
        boton.textContent = "Obteniendo...";

    }

    navigator.geolocation.getCurrentPosition(

        position => {

            const lat =
                position.coords.latitude;

            const lng =
                position.coords.longitude;

            const localidad =
                usuarioActual?.localidad ||
                usuarioActual?.municipio ||
                "";

            const referencia =
                usuarioActual?.referencia ||
                "";

            const destino = {

                tipo: "actual",

                nombre: "Mi ubicación actual",

                localidad,

                referencia,

                latitud: lat,

                longitud: lng

            };

            sessionStorage.setItem(
                "motiGoDestinoSeleccionado",
                JSON.stringify(destino)
            );

            window.location.href =
                "dashboard-cliente.html";

        },

        error => {

            console.error(
                "❌ MOTI GO: error obteniendo GPS:",
                error
            );

            window.motiGoNotificar(
                "No pudimos obtener tu ubicación. Activa el GPS y permite el acceso a la ubicación."
            );

            if (boton) {

                boton.disabled = false;
                boton.textContent = "Usar GPS";

            }

        },

        {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 12000
        }

    );

}


// =====================================================
// MAPA
// =====================================================

function inicializarMapa() {

    if (mapaDireccion) return;

    const elemento =
        document.getElementById("mapaDireccion");

    if (!elemento || !window.L) return;

    const latInicial =
        Number(usuarioActual?.latitud);

    const lngInicial =
        Number(usuarioActual?.longitud);

    const tieneInicial =
        coordenadasValidas(
            latInicial,
            lngInicial
        );

    const centro =
        tieneInicial
            ? [latInicial, lngInicial]
            : [17.184, -93.390];

    mapaDireccion =
        L.map(
            elemento,
            {
                zoomControl: true,
                scrollWheelZoom: false
            }
        ).setView(
            centro,
            tieneInicial ? 17 : 14
        );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }
    ).addTo(
        mapaDireccion
    );

    mapaDireccion.on(
        "click",
        evento => {

            establecerCoordenadas(
                evento.latlng.lat,
                evento.latlng.lng,
                true
            );

        }
    );

    if (tieneInicial) {

        establecerCoordenadas(
            latInicial,
            lngInicial,
            false
        );

    }

}


function establecerCoordenadas(
    lat,
    lng,
    centrar
) {

    if (!coordenadasValidas(lat, lng)) {

        return;

    }

    coordenadaLatitud =
        Number(lat);

    coordenadaLongitud =
        Number(lng);

    if (!mapaDireccion) return;

    if (!marcadorDireccion) {

        marcadorDireccion =
            L.marker(
                [
                    coordenadaLatitud,
                    coordenadaLongitud
                ],
                {
                    draggable: true
                }
            ).addTo(
                mapaDireccion
            );

        marcadorDireccion.on(
            "dragend",
            evento => {

                const posicion =
                    evento.target.getLatLng();

                establecerCoordenadas(
                    posicion.lat,
                    posicion.lng,
                    false
                );

            }
        );

    }
    else {

        marcadorDireccion.setLatLng(
            [
                coordenadaLatitud,
                coordenadaLongitud
            ]
        );

    }

    if (centrar) {

        mapaDireccion.setView(
            [
                coordenadaLatitud,
                coordenadaLongitud
            ],
            Math.max(
                mapaDireccion.getZoom(),
                17
            )
        );

    }

    coordenadasTexto.textContent =
        `GPS guardado: ${coordenadaLatitud.toFixed(6)}, ${coordenadaLongitud.toFixed(6)}`;

}


// =====================================================
// MODAL
// =====================================================

function abrirModalDireccion(direccion = null) {

    direccionEditandoId =
        direccion?.id || null;

    tipoDireccionActual =
        direccion?.tipo || "casa";

    modalTitulo.textContent =
        direccion
            ? "Editar dirección"
            : "Nueva dirección";

    inputNombre.value =
        direccion?.nombre ||
        nombreTipo(tipoDireccionActual);

    inputLocalidad.value =
        direccion?.localidad ||
        usuarioActual?.localidad ||
        usuarioActual?.municipio ||
        "";

    inputReferencia.value =
        direccion?.referencia ||
        "";

    inputPredeterminada.checked =
        direccion
            ? direccion.predeterminada === true
            : direcciones.length === 0;

    seleccionarTipoVisual(
        tipoDireccionActual
    );

    const lat =
        Number(
            direccion?.latitud ??
            usuarioActual?.latitud
        );

    const lng =
        Number(
            direccion?.longitud ??
            usuarioActual?.longitud
        );

    coordenadaLatitud =
        coordenadasValidas(lat, lng)
            ? lat
            : null;

    coordenadaLongitud =
        coordenadasValidas(lat, lng)
            ? lng
            : null;

    modal.classList.add("activo");
    modal.setAttribute("aria-hidden", "false");

    setTimeout(
        () => {

            inicializarMapa();

            if (
                coordenadasValidas(
                    coordenadaLatitud,
                    coordenadaLongitud
                )
            ) {

                establecerCoordenadas(
                    coordenadaLatitud,
                    coordenadaLongitud,
                    true
                );

            }

            if (mapaDireccion) {

                mapaDireccion.invalidateSize();

            }

        },
        80
    );

}


function cerrarModalDireccion() {

    modal.classList.remove("activo");
    modal.setAttribute("aria-hidden", "true");

    direccionEditandoId =
        null;

}


function seleccionarTipoVisual(tipo) {

    tipoDireccionActual =
        tipo;

    document
        .querySelectorAll(
            ".tipo-direccion"
        )
        .forEach(
            boton => {

                boton.classList.toggle(
                    "activo",
                    boton.dataset.tipo === tipo
                );

            }
        );

    if (
        !direccionEditandoId &&
        (
            !inputNombre.value ||
            inputNombre.value === "Casa" ||
            inputNombre.value === "Trabajo" ||
            inputNombre.value === "Otro"
        )
    ) {

        inputNombre.value =
            nombreTipo(tipo);

    }

}


// =====================================================
// CARGAR
// =====================================================

async function cargarDirecciones() {

    if (!usuarioActual) return;

    estado.textContent =
        "Cargando tus direcciones...";

    try {

        const ref =
            collection(
                db,
                "usuarios",
                usuarioActual.uid,
                "direcciones"
            );

        const snapshot =
            await getDocs(ref);

        direcciones =
            snapshot.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );

        direcciones.sort(
            (a, b) => {

                if (
                    a.predeterminada === true &&
                    b.predeterminada !== true
                ) return -1;

                if (
                    a.predeterminada !== true &&
                    b.predeterminada === true
                ) return 1;

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

        renderizarDirecciones();

    }
    catch (error) {

        console.error(
            "❌ MOTI GO: no se pudieron cargar las direcciones:",
            error
        );

        estado.textContent =
            "No pudimos cargar tus direcciones.";

    }

}


function renderizarDirecciones() {

    if (!direcciones.length) {

        estado.textContent =
            "Todavía no tienes direcciones guardadas.";

        lista.innerHTML = `
            <div class="direcciones-vacio">
                <div class="direcciones-vacio-icon">
                    <span class="material-symbols-outlined">location_off</span>
                </div>

                <strong>Aún no tienes lugares guardados</strong>

                <p>
                    Guarda tu casa, trabajo o cualquier lugar donde quieras recibir tus pedidos.
                </p>

                <button
                    type="button"
                    id="btnCrearPrimeraDireccion"
                    class="btn-guardar-direccion"
                >
                    <span class="material-symbols-outlined">add_location_alt</span>
                    Guardar mi primera dirección
                </button>
            </div>
        `;

        document
            .getElementById("btnCrearPrimeraDireccion")
            ?.addEventListener(
                "click",
                () => abrirModalDireccion()
            );

        return;

    }

    estado.textContent =
        `${direcciones.length} ${direcciones.length === 1 ? "dirección guardada" : "direcciones guardadas"}`;

    lista.innerHTML =
        direcciones.map(
            direccion => {

                const predeterminada =
                    direccion.predeterminada === true;

                return `
                    <article
                        class="direccion-card ${predeterminada ? "predeterminada" : ""}"
                        data-direccion-id="${escaparHTML(direccion.id)}"
                    >

                        <div class="direccion-card-top">

                            <div class="direccion-card-icon">
                                <span class="material-symbols-outlined">
                                    ${iconoTipo(direccion.tipo)}
                                </span>
                            </div>

                            <div class="direccion-card-main">

                                <div class="direccion-card-title-row">
                                    <strong>
                                        ${escaparHTML(
                                            direccion.nombre ||
                                            nombreTipo(direccion.tipo)
                                        )}
                                    </strong>

                                    ${
                                        predeterminada
                                            ? `
                                                <span class="direccion-default-badge">
                                                    Predeterminada
                                                </span>
                                            `
                                            : ""
                                    }

                                </div>

                                <span class="direccion-card-location">
                                    ${escaparHTML(
                                        direccion.localidad ||
                                        "Ubicación guardada"
                                    )}
                                </span>

                                <p>
                                    ${escaparHTML(
                                        direccion.referencia ||
                                        "Sin referencia adicional."
                                    )}
                                </p>

                            </div>

                        </div>

                        <div class="direccion-card-gps">
                            <span class="material-symbols-outlined">location_on</span>
                            ${Number(direccion.latitud).toFixed(6)},
                            ${Number(direccion.longitud).toFixed(6)}
                        </div>

                        <div class="direccion-card-actions">

                            <button
                                type="button"
                                class="btn-usar-direccion"
                                data-action="usar"
                                data-id="${escaparHTML(direccion.id)}"
                            >
                                <span class="material-symbols-outlined">check_circle</span>
                                Usar para entrega
                            </button>

                            <button
                                type="button"
                                class="btn-editar-direccion"
                                data-action="editar"
                                data-id="${escaparHTML(direccion.id)}"
                            >
                                <span class="material-symbols-outlined">edit</span>
                                Editar
                            </button>

                            <button
                                type="button"
                                class="btn-eliminar-direccion"
                                data-action="eliminar"
                                data-id="${escaparHTML(direccion.id)}"
                            >
                                <span class="material-symbols-outlined">delete</span>
                            </button>

                        </div>

                    </article>
                `;

            }
        ).join("");

    lista
        .querySelectorAll("[data-action]")
        .forEach(
            boton => {

                boton.addEventListener(
                    "click",
                    async () => {

                        const direccion =
                            direcciones.find(
                                item =>
                                    item.id ===
                                    boton.dataset.id
                            );

                        if (!direccion) return;

                        if (
                            boton.dataset.action ===
                            "usar"
                        ) {

                            guardarDestinoSeleccionado(
                                direccion
                            );

                            return;

                        }

                        if (
                            boton.dataset.action ===
                            "editar"
                        ) {

                            abrirModalDireccion(
                                direccion
                            );

                            return;

                        }

                        if (
                            boton.dataset.action ===
                            "eliminar"
                        ) {

                            await eliminarDireccion(
                                direccion
                            );

                        }

                    }
                );

            }
        );

}


// =====================================================
// GUARDAR
// =====================================================

async function guardarDireccion() {

    const nombre =
        inputNombre.value
            .trim()
            .slice(0, 40);

    const localidad =
        inputLocalidad.value
            .trim()
            .slice(0, 80);

    const referencia =
        inputReferencia.value
            .trim()
            .slice(0, 180);

    if (!nombre) {

        window.motiGoNotificar(
            "Escribe un nombre para esta dirección."
        );

        inputNombre.focus();

        return;

    }

    if (!coordenadasValidas(
        coordenadaLatitud,
        coordenadaLongitud
    )) {

        window.motiGoNotificar(
            "Selecciona la ubicación exacta en el mapa o usa el GPS."
        );

        return;

    }

    const boton =
        document.getElementById(
            "btnGuardarDireccion"
        );

    boton.disabled = true;
    boton.classList.add("guardando");

    try {

        const base = {

            nombre,

            tipo:
                tipoDireccionActual,

            localidad,

            referencia,

            latitud:
                Number(coordenadaLatitud),

            longitud:
                Number(coordenadaLongitud),

            predeterminada:
                inputPredeterminada.checked === true,

            actualizadoEn:
                serverTimestamp()

        };

        const coleccion =
            collection(
                db,
                "usuarios",
                usuarioActual.uid,
                "direcciones"
            );

        if (base.predeterminada) {

            for (const direccion of direcciones) {

                if (
                    direccion.predeterminada === true &&
                    direccion.id !== direccionEditandoId
                ) {

                    await updateDoc(
                        doc(
                            db,
                            "usuarios",
                            usuarioActual.uid,
                            "direcciones",
                            direccion.id
                        ),
                        {
                            predeterminada: false,
                            actualizadoEn: serverTimestamp()
                        }
                    );

                }

            }

        }

        if (direccionEditandoId) {

            await updateDoc(
                doc(
                    db,
                    "usuarios",
                    usuarioActual.uid,
                    "direcciones",
                    direccionEditandoId
                ),
                base
            );

        }
        else {

            await addDoc(
                coleccion,
                {
                    ...base,
                    creadoEn: serverTimestamp()
                }
            );

        }

        cerrarModalDireccion();

        await cargarDirecciones();

    }
    catch (error) {

        console.error(
            "❌ MOTI GO: error guardando dirección:",
            error
        );

        window.motiGoNotificar(
            "No pudimos guardar la dirección. Intenta nuevamente."
        );

    }
    finally {

        boton.disabled = false;
        boton.classList.remove("guardando");

    }

}


// =====================================================
// ELIMINAR
// =====================================================

async function eliminarDireccion(direccion) {

    const confirmar =
        await window.motiGoConfirm(
            `¿Eliminar "${direccion.nombre || "esta dirección"}"?`,
            { titulo: "Eliminar dirección" }
        );

    if (!confirmar) return;

    try {

        await deleteDoc(
            doc(
                db,
                "usuarios",
                usuarioActual.uid,
                "direcciones",
                direccion.id
            )
        );

        const eraPredeterminada =
            direccion.predeterminada === true;

        await cargarDirecciones();

        if (
            eraPredeterminada &&
            direcciones.length
        ) {

            const siguiente =
                direcciones[0];

            await updateDoc(
                doc(
                    db,
                    "usuarios",
                    usuarioActual.uid,
                    "direcciones",
                    siguiente.id
                ),
                {
                    predeterminada: true,
                    actualizadoEn: serverTimestamp()
                }
            );

            await cargarDirecciones();

        }

    }
    catch (error) {

        console.error(
            "❌ MOTI GO: error eliminando dirección:",
            error
        );

        window.motiGoNotificar(
            "No pudimos eliminar la dirección."
        );

    }

}


// =====================================================
// EVENTOS
// =====================================================

document
    .getElementById("btnNuevaDireccion")
    ?.addEventListener(
        "click",
        () => abrirModalDireccion()
    );

document
    .getElementById("btnNuevaDireccionHeader")
    ?.addEventListener(
        "click",
        () => abrirModalDireccion()
    );

document
    .getElementById("btnUsarUbicacionActual")
    ?.addEventListener(
        "click",
        usarUbicacionActual
    );

document
    .getElementById("btnCerrarDireccion")
    ?.addEventListener(
        "click",
        cerrarModalDireccion
    );

document
    .getElementById("btnCancelarDireccion")
    ?.addEventListener(
        "click",
        cerrarModalDireccion
    );

document
    .querySelector(
        ".direccion-modal-backdrop"
    )
    ?.addEventListener(
        "click",
        cerrarModalDireccion
    );

document
    .getElementById("btnGuardarDireccion")
    ?.addEventListener(
        "click",
        guardarDireccion
    );

document
    .getElementById("btnGPSModal")
    ?.addEventListener(
        "click",
        () => {

            if (!("geolocation" in navigator)) {

                window.motiGoNotificar(
                    "Este dispositivo no permite obtener la ubicación."
                );

                return;

            }

            const boton =
                document.getElementById(
                    "btnGPSModal"
                );

            boton.disabled = true;

            navigator.geolocation.getCurrentPosition(

                position => {

                    establecerCoordenadas(
                        position.coords.latitude,
                        position.coords.longitude,
                        true
                    );

                    boton.disabled = false;

                },

                error => {

                    console.error(
                        error
                    );

                    window.motiGoNotificar(
                        "No pudimos obtener tu ubicación actual."
                    );

                    boton.disabled = false;

                },

                {
                    enableHighAccuracy: true,
                    maximumAge: 5000,
                    timeout: 12000
                }

            );

        }
    );


document
    .querySelectorAll(
        ".tipo-direccion"
    )
    .forEach(
        boton => {

            boton.addEventListener(
                "click",
                () => {

                    seleccionarTipoVisual(
                        boton.dataset.tipo
                    );

                }
            );

        }
    );


// =====================================================
// AUTH
// =====================================================

onAuthStateChanged(
    auth,
    async user => {

        if (!user) return;

        usuarioActual = {
            uid: user.uid
        };

        try {

            const usuarioSnap =
                await import(
                    "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"
                ).then(
                    firestore =>
                        firestore.getDoc(
                            firestore.doc(
                                db,
                                "usuarios",
                                user.uid
                            )
                        )
                );

            if (usuarioSnap.exists()) {

                usuarioActual = {
                    uid: user.uid,
                    ...usuarioSnap.data()
                };

            }

        }
        catch (error) {

            console.error(
                "❌ MOTI GO: no se pudo cargar el perfil:",
                error
            );

        }

        await cargarDirecciones();

    }
);
