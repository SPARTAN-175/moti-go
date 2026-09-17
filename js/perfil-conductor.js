import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const BLOQUEO_PERFIL_MS = 24 * 60 * 60 * 1000;
const VERSION_TERMINOS_REPARTIDOR = "1.0";
const MUNICIPIO_MOTIGO = "Ostuacán";

let usuarioActual = null;
let datosUsuario = null;
let localidadesDisponibles = [];
let localidadSeleccionadaPerfil = null;

const $ = id => document.getElementById(id);

function normalizarTextoPerfil(texto = "") {
    return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function escaparHTML(texto = "") {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function mostrarModal(id) {
    const modal = $(id);
    if (modal) modal.hidden = false;
}

function ocultarModal(id) {
    const modal = $(id);
    if (modal) modal.hidden = true;
}

async function cargarLocalidadesPerfil() {
    try {
        const snapshot = await getDocs(collection(db, "destinos"));

        localidadesDisponibles = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(d =>
                d.activo !== false &&
                normalizarTextoPerfil(d.municipio) === normalizarTextoPerfil(MUNICIPIO_MOTIGO) &&
                String(d.nombre || "").trim()
            )
            .sort((a, b) =>
                String(a.nombre || "").localeCompare(
                    String(b.nombre || ""),
                    "es",
                    { sensitivity: "base" }
                )
            );

        console.log(
            "MOTI GO: localidades disponibles en perfil repartidor:",
            localidadesDisponibles.length
        );
    } catch (error) {
        console.error(
            "MOTI GO: no se pudieron cargar las localidades del perfil:",
            error
        );
    }
}

function ocultarResultadosLocalidad() {
    const lista = $("listaLocalidadesPerfil");
    if (!lista) return;
    lista.style.display = "none";
    lista.innerHTML = "";
}

function mostrarResultadosLocalidadPerfil(texto) {
    const campo = $("editarLocalidad");
    const lista = $("listaLocalidadesPerfil");

    if (!campo || !lista) return;

    const termino = normalizarTextoPerfil(texto);

    if (termino.length < 2) {
        ocultarResultadosLocalidad();
        return;
    }

    const resultados = localidadesDisponibles
        .filter(destino =>
            normalizarTextoPerfil(destino.nombre).includes(termino)
        )
        .slice(0, 8);

    if (!resultados.length) {
        lista.innerHTML =
            `<div class="rp-localidad-empty">No encontramos una localidad con ese nombre.</div>`;
        lista.style.display = "block";
        return;
    }

    lista.innerHTML = resultados.map(destino => `
        <button
            type="button"
            class="rp-localidad-item"
            data-localidad-id="${escaparHTML(destino.id)}">
            ${escaparHTML(destino.nombre)}
        </button>
    `).join("");

    lista.style.display = "block";

    lista.querySelectorAll(".rp-localidad-item").forEach(boton => {
        boton.addEventListener("click", () => {
            const destino = localidadesDisponibles.find(
                item => item.id === boton.dataset.localidadId
            );

            if (!destino) return;

            localidadSeleccionadaPerfil = destino;
            campo.value = destino.nombre;
            ocultarResultadosLocalidad();
        });
    });
}

function prepararBusquedaLocalidadPerfil() {
    const campo = $("editarLocalidad");
    if (!campo) return;

    campo.addEventListener("input", () => {
        localidadSeleccionadaPerfil = null;
        mostrarResultadosLocalidadPerfil(campo.value);
    });

    campo.addEventListener("focus", () => {
        if (campo.value.trim().length >= 2) {
            mostrarResultadosLocalidadPerfil(campo.value);
        }
    });

    document.addEventListener("click", event => {
        const lista = $("listaLocalidadesPerfil");
        if (
            lista &&
            !campo.contains(event.target) &&
            !lista.contains(event.target)
        ) {
            ocultarResultadosLocalidad();
        }
    });
}

function prepararElementos() {
    $("btnEditarPerfil")?.addEventListener("click", abrirEdicionPerfil);
    $("cerrarModalEditar")?.addEventListener("click", () => ocultarModal("modalEditarPerfil"));
    $("cancelarEditarPerfil")?.addEventListener("click", () => ocultarModal("modalEditarPerfil"));
    $("formEditarPerfil")?.addEventListener("submit", guardarPerfil);

    $("btnCambiarPassword")?.addEventListener("click", () => mostrarModal("modalPassword"));
    $("cerrarModalPassword")?.addEventListener("click", () => ocultarModal("modalPassword"));
    $("cancelarPassword")?.addEventListener("click", () => ocultarModal("modalPassword"));
    $("formPassword")?.addEventListener("submit", cambiarPassword);

    $("btnRecuperarPassword")?.addEventListener("click", recuperarPassword);

    $("btnTerminos")?.addEventListener("click", () => {
        $("versionTerminos").textContent =
            datosUsuario?.versionTerminosRepartidor ||
            VERSION_TERMINOS_REPARTIDOR;
        mostrarModal("modalTerminos");
    });

    $("cerrarModalTerminos")?.addEventListener("click", () => ocultarModal("modalTerminos"));
    $("cerrarTerminos")?.addEventListener("click", () => ocultarModal("modalTerminos"));

    document.querySelectorAll(".rp-modal").forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) modal.hidden = true;
        });
    });
}

async function cargarPerfil(user) {
    usuarioActual = user;

    console.log(
        "MOTI GO: usuario repartidor autenticado:",
        user.uid
    );

    try {
        const snap = await getDoc(doc(db, "usuarios", user.uid));

        if (!snap.exists()) {
            console.warn("MOTI GO: no existe el perfil del repartidor.");
            return;
        }

        datosUsuario = snap.data() || {};

        renderizarPerfil();
        prepararBusquedaLocalidadPerfil();
        await cargarLocalidadesPerfil();

        console.log("MOTI GO: perfil repartidor cargado correctamente.");
    } catch (error) {
        console.error(
            "MOTI GO: error cargando perfil de repartidor:",
            error
        );
    }
}

function renderizarPerfil() {
    const nombre = datosUsuario.nombre || "Repartidor";
    const email = datosUsuario.email || usuarioActual?.email || "—";

    $("profileName").textContent = nombre;
    $("profileEmail").textContent = email;
    $("profileInitial").textContent =
        nombre.trim().charAt(0).toUpperCase() || "R";

    $("infoName").textContent = nombre || "—";
    $("infoEmail").textContent = email || "—";
    $("infoPhone").textContent = datosUsuario.telefono || "—";
    $("infoMunicipio").textContent = datosUsuario.municipio || MUNICIPIO_MOTIGO;
    $("infoLocalidad").textContent = datosUsuario.localidad || "Sin registrar";
    $("infoPlaca").textContent = datosUsuario.placa || "Sin registrar";

    const estado = datosUsuario.estadoServicio || "disponible";
    const textos = {
        disponible: "Disponible",
        no_disponible: "No disponible",
        en_viaje: "En viaje"
    };

    $("serviceStatus").textContent =
        textos[estado] || estado;

    const estadoCuenta =
        datosUsuario.estado === "pendiente"
            ? "Registro en revisión"
            : "Cuenta activa";

    $("accountStatus").textContent = estadoCuenta;

    const nombreEdit = $("editarNombre");
    const telefonoEdit = $("editarTelefono");
    const municipioEdit = $("editarMunicipio");
    const localidadEdit = $("editarLocalidad");
    const placaEdit = $("editarPlaca");

    if (nombreEdit) nombreEdit.value = datosUsuario.nombre || "";
    if (telefonoEdit) telefonoEdit.value = datosUsuario.telefono || "";
    if (municipioEdit) municipioEdit.value = datosUsuario.municipio || MUNICIPIO_MOTIGO;
    if (localidadEdit) localidadEdit.value = datosUsuario.localidad || "";
    if (placaEdit) placaEdit.value = datosUsuario.placa || "";

    actualizarAvisoEdicion();
}

function obtenerFechaActualizacion() {
    const valor = datosUsuario?.ultimaActualizacionPerfil;

    if (!valor) return null;

    if (typeof valor.toDate === "function") {
        return valor.toDate();
    }

    if (valor instanceof Date) {
        return valor;
    }

    if (typeof valor === "string" || typeof valor === "number") {
        const fecha = new Date(valor);
        return Number.isNaN(fecha.getTime()) ? null : fecha;
    }

    return null;
}

function actualizarAvisoEdicion() {
    const aviso = $("perfilEdicionAvisoTexto");
    if (!aviso) return;

    const fecha = obtenerFechaActualizacion();

    if (!fecha) {
        aviso.textContent =
            "Puedes modificar tus datos personales. Después de guardar, habrá un periodo de 24 horas antes de volver a modificarlos.";
        return;
    }

    const disponibleEn =
        fecha.getTime() + BLOQUEO_PERFIL_MS;

    const restante =
        disponibleEn - Date.now();

    if (restante <= 0) {
        aviso.textContent =
            "Ya puedes volver a actualizar tu información.";
        return;
    }

    const horas = Math.ceil(restante / (60 * 60 * 1000));

    aviso.textContent =
        `Podrás volver a modificar tu información aproximadamente en ${horas} hora${horas === 1 ? "" : "s"}.`;
}

function puedeEditarPerfil() {
    const fecha = obtenerFechaActualizacion();

    if (!fecha) return true;

    return Date.now() >=
        fecha.getTime() + BLOQUEO_PERFIL_MS;
}

function abrirEdicionPerfil() {
    console.log("MOTI GO: botón Editar perfil repartidor presionado.");

    if (!puedeEditarPerfil()) {
        actualizarAvisoEdicion();
        alert(
            $("perfilEdicionAvisoTexto")?.textContent ||
            "Por seguridad, debes esperar antes de volver a modificar tu información."
        );
        return;
    }

    localidadSeleccionadaPerfil =
        localidadesDisponibles.find(
            destino =>
                normalizarTextoPerfil(destino.nombre) ===
                normalizarTextoPerfil(datosUsuario?.localidad || "")
        ) || null;

    mostrarModal("modalEditarPerfil");
}

async function guardarPerfil(event) {
    event.preventDefault();

    if (!usuarioActual || !puedeEditarPerfil()) {
        alert("Por seguridad, esta información no puede modificarse todavía.");
        return;
    }

    const nombre = $("editarNombre").value.trim();
    const telefono = $("editarTelefono").value.trim();
    const municipio = $("editarMunicipio").value.trim();
    const localidad = $("editarLocalidad").value.trim();
    const placa = $("editarPlaca").value.trim();

    if (!nombre || !telefono || !municipio || !localidad || !placa) {
        alert("Completa todos los campos.");
        return;
    }

    const localidadEncontrada =
        localidadSeleccionadaPerfil ||
        localidadesDisponibles.find(
            destino =>
                normalizarTextoPerfil(destino.nombre) ===
                normalizarTextoPerfil(localidad)
        );

    if (!localidadEncontrada) {
        alert("Selecciona una localidad válida de la lista.");
        $("editarLocalidad").focus();
        return;
    }

    try {
        await updateDoc(doc(db, "usuarios", usuarioActual.uid), {
            nombre,
            telefono,
            municipio: MUNICIPIO_MOTIGO,
            localidad: localidadEncontrada.nombre,
            localidadId: localidadEncontrada.id,
            localidadLatitud:
                localidadEncontrada.latitud ??
                localidadEncontrada.latitude ??
                null,
            localidadLongitud:
                localidadEncontrada.longitud ??
                localidadEncontrada.longitude ??
                null,
            placa,
            ultimaActualizacionPerfil: serverTimestamp()
        });

        datosUsuario = {
            ...datosUsuario,
            nombre,
            telefono,
            municipio: MUNICIPIO_MOTIGO,
            localidad: localidadEncontrada.nombre,
            localidadId: localidadEncontrada.id,
            localidadLatitud:
                localidadEncontrada.latitud ??
                localidadEncontrada.latitude ??
                null,
            localidadLongitud:
                localidadEncontrada.longitud ??
                localidadEncontrada.longitude ??
                null,
            placa,
            ultimaActualizacionPerfil: new Date()
        };

        renderizarPerfil();
        ocultarModal("modalEditarPerfil");

        alert("Tu información se actualizó correctamente.");
    } catch (error) {
        console.error(
            "MOTI GO: error actualizando perfil de repartidor:",
            error
        );
        alert("No se pudo actualizar tu información. Inténtalo nuevamente.");
    }
}

async function cambiarPassword(event) {
    event.preventDefault();

    if (!usuarioActual) return;

    const actual = $("passwordActual").value;
    const nueva = $("passwordNueva").value;
    const confirmacion = $("passwordConfirmacion").value;

    if (!actual || !nueva || !confirmacion) {
        alert("Completa todos los campos.");
        return;
    }

    if (nueva.length < 8) {
        alert("La nueva contraseña debe tener al menos 8 caracteres.");
        return;
    }

    if (nueva !== confirmacion) {
        alert("Las nuevas contraseñas no coinciden.");
        return;
    }

    try {
        const credential = EmailAuthProvider.credential(
            usuarioActual.email,
            actual
        );

        await reauthenticateWithCredential(
            usuarioActual,
            credential
        );

        await updatePassword(
            usuarioActual,
            nueva
        );

        $("formPassword").reset();
        ocultarModal("modalPassword");

        alert("Tu contraseña se actualizó correctamente.");
    } catch (error) {
        console.error(
            "MOTI GO: error cambiando contraseña:",
            error
        );

        if (
            error.code ===
            "auth/invalid-credential" ||
            error.code ===
            "auth/wrong-password"
        ) {
            alert("La contraseña actual no es correcta.");
        } else if (
            error.code ===
            "auth/requires-recent-login"
        ) {
            alert("Por seguridad, vuelve a iniciar sesión y después intenta cambiar la contraseña.");
        } else {
            alert("No se pudo cambiar la contraseña.");
        }
    }
}

async function recuperarPassword() {
    const email =
        usuarioActual?.email ||
        datosUsuario?.email;

    if (!email) {
        alert("No hay un correo electrónico válido asociado a esta cuenta.");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        alert(`Enviamos un enlace de recuperación a ${email}.`);
    } catch (error) {
        console.error(
            "MOTI GO: error enviando recuperación:",
            error
        );
        alert("No se pudo enviar el enlace de recuperación.");
    }
}

onAuthStateChanged(auth, async user => {
    if (!user) return;

    prepararElementos();
    await cargarPerfil(user);
});