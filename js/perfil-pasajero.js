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
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// =====================================================
// MOTI GO — PERFIL DEL CLIENTE
// =====================================================

// Periodo de protección para edición del perfil.
// Se establece en 24 horas para evitar cambios constantes.
const BLOQUEO_PERFIL_MS = 24 * 60 * 60 * 1000;

let usuarioActual = null;
let datosPerfil = null;


// =====================================================
// UTILIDADES
// =====================================================

function $(id) {
    return document.getElementById(id);
}

function abrirModal(id) {
    const modal = $(id);
    if (!modal) return;
    modal.classList.add("activo");
    modal.setAttribute("aria-hidden", "false");
}

function cerrarModal(id) {
    const modal = $(id);
    if (!modal) return;
    modal.classList.remove("activo");
    modal.setAttribute("aria-hidden", "true");
}

function escaparInicial(nombre) {
    const limpio = String(nombre || "").trim();
    return limpio ? limpio.charAt(0).toUpperCase() : "?";
}

function obtenerFechaBloqueo(datos) {
    const valor =
        datos?.ultimaActualizacionPerfil?.toMillis?.() ??
        (
            datos?.ultimaActualizacionPerfil
                ? new Date(datos.ultimaActualizacionPerfil).getTime()
                : 0
        );

    return Number(valor) || 0;
}

function perfilEstaBloqueado(datos) {
    const fecha = obtenerFechaBloqueo(datos);
    return fecha > 0 && Date.now() < fecha + BLOQUEO_PERFIL_MS;
}

function tiempoRestanteTexto(datos) {
    const fin = obtenerFechaBloqueo(datos) + BLOQUEO_PERFIL_MS;
    const restante = Math.max(0, fin - Date.now());

    const horas = Math.ceil(restante / (60 * 60 * 1000));

    if (horas >= 24) {
        const dias = Math.ceil(horas / 24);
        return `Podrás volver a editar tus datos aproximadamente en ${dias} día${dias === 1 ? "" : "s"}.`;
    }

    return `Podrás volver a editar tus datos aproximadamente en ${horas} hora${horas === 1 ? "" : "s"}.`;
}

function actualizarBloqueoVisual() {
    const bloqueado = perfilEstaBloqueado(datosPerfil);
    const aviso = $("perfilBloqueo");
    const boton = $("btnEditarPerfil");

    if (aviso) {
        aviso.hidden = !bloqueado;
        const texto = $("perfilBloqueoTexto");
        if (texto && bloqueado) {
            texto.textContent = tiempoRestanteTexto(datosPerfil);
        }
    }

    if (boton) {
        boton.disabled = bloqueado;
        boton.classList.toggle("bloqueado", bloqueado);
        boton.title = bloqueado
            ? tiempoRestanteTexto(datosPerfil)
            : "Editar información";
    }
}


// =====================================================
// RENDER PERFIL
// =====================================================

function renderizarPerfil(datos, user) {

    datosPerfil = datos || {};

    const nombre =
        datosPerfil.nombre ||
        user.displayName ||
        "Usuario MOTI GO";

    const correo =
        user.email ||
        datosPerfil.email ||
        "Sin correo registrado";

    const telefono =
        datosPerfil.telefono ||
        "No registrado";

    const municipio =
        datosPerfil.municipio ||
        "No registrado";

    const localidad =
        datosPerfil.localidad ||
        "No registrada";

    $("profileName").textContent = nombre;
    $("perfilCorreoHero").textContent = correo;

    $("infoName").textContent = nombre;
    $("infoPhone").textContent = telefono;
    $("infoMunicipio").textContent = municipio;
    $("infoLocalidad").textContent = localidad;
    $("infoEmail").textContent = correo;

    $("perfilAvatar").textContent =
        escaparInicial(nombre);

    $("editNombre").value =
        datosPerfil.nombre || user.displayName || "";

    $("editTelefono").value =
        datosPerfil.telefono || "";

    $("editMunicipio").value =
        datosPerfil.municipio || "";

    $("editLocalidad").value =
        datosPerfil.localidad || "";

    actualizarBloqueoVisual();
}


// =====================================================
// CARGAR PERFIL
// =====================================================

async function cargarPerfil(user) {

    usuarioActual = user;

    try {

        const ref =
            doc(
                db,
                "usuarios",
                user.uid
            );

        const snap =
            await getDoc(ref);

        const datos =
            snap.exists()
                ? snap.data()
                : {};

        renderizarPerfil(
            datos,
            user
        );

    }
    catch (error) {

        console.error(
            "❌ MOTI GO: error cargando perfil:",
            error
        );

        $("profileName").textContent =
            user.displayName || "Usuario MOTI GO";

        $("perfilCorreoHero").textContent =
            user.email || "Sin correo";

        $("infoEmail").textContent =
            user.email || "Sin correo";

    }

}


// =====================================================
// GUARDAR PERFIL
// =====================================================

async function guardarPerfil() {

    if (!usuarioActual) return;

    if (perfilEstaBloqueado(datosPerfil)) {

        alert(
            tiempoRestanteTexto(datosPerfil)
        );

        actualizarBloqueoVisual();

        return;

    }

    const nombre =
        $("editNombre").value.trim().slice(0, 100);

    const telefono =
        $("editTelefono").value.trim().slice(0, 20);

    const municipio =
        $("editMunicipio").value.trim().slice(0, 80);

    const localidad =
        $("editLocalidad").value.trim().slice(0, 80);

    if (!nombre) {

        alert(
            "Escribe tu nombre completo."
        );

        $("editNombre").focus();

        return;

    }

    const boton =
        $("btnGuardarPerfil");

    boton.disabled = true;

    try {

        const marca =
            serverTimestamp();

        await updateDoc(
            doc(
                db,
                "usuarios",
                usuarioActual.uid
            ),
            {
                nombre,
                telefono,
                municipio,
                localidad,
                ultimaActualizacionPerfil: marca,
                actualizadoEn: marca
            }
        );

        datosPerfil = {
            ...datosPerfil,
            nombre,
            telefono,
            municipio,
            localidad,
            ultimaActualizacionPerfil: {
                toMillis: () => Date.now()
            }
        };

        renderizarPerfil(
            datosPerfil,
            usuarioActual
        );

        cerrarModal(
            "modalEditarPerfil"
        );

        alert(
            "Tus datos se actualizaron correctamente. Por seguridad, la edición del perfil queda protegida temporalmente."
        );

    }
    catch (error) {

        console.error(
            "❌ MOTI GO: error actualizando perfil:",
            error
        );

        alert(
            "No pudimos actualizar tus datos. Intenta nuevamente."
        );

    }
    finally {

        boton.disabled = false;

    }

}


// =====================================================
// CAMBIAR CONTRASEÑA
// =====================================================

async function cambiarPassword() {

    if (!usuarioActual) return;

    const actual =
        $("passwordActual").value;

    const nueva =
        $("passwordNueva").value;

    const confirmar =
        $("passwordConfirmar").value;

    if (!actual || !nueva || !confirmar) {

        alert(
            "Completa todos los campos."
        );

        return;

    }

    if (nueva.length < 8) {

        alert(
            "La nueva contraseña debe tener al menos 8 caracteres."
        );

        return;

    }

    if (nueva !== confirmar) {

        alert(
            "La confirmación de contraseña no coincide."
        );

        return;

    }

    if (!usuarioActual.email) {

        alert(
            "Esta cuenta no tiene un correo electrónico disponible para realizar esta operación."
        );

        return;

    }

    const boton =
        $("btnGuardarPassword");

    boton.disabled = true;

    try {

        const credential =
            EmailAuthProvider.credential(
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

        $("passwordActual").value = "";
        $("passwordNueva").value = "";
        $("passwordConfirmar").value = "";

        cerrarModal(
            "modalPassword"
        );

        alert(
            "Tu contraseña se cambió correctamente."
        );

    }
    catch (error) {

        console.error(
            "❌ MOTI GO: error cambiando contraseña:",
            error
        );

        if (
            error.code ===
            "auth/invalid-credential"
        ) {

            alert(
                "La contraseña actual no es correcta."
            );

        }
        else if (
            error.code ===
            "auth/too-many-requests"
        ) {

            alert(
                "Se realizaron demasiados intentos. Intenta nuevamente más tarde."
            );

        }
        else {

            alert(
                "No pudimos cambiar la contraseña. Verifica tus datos e intenta nuevamente."
            );

        }

    }
    finally {

        boton.disabled = false;

    }

}


// =====================================================
// RECUPERACIÓN
// =====================================================

async function recuperarPassword() {

    if (!usuarioActual?.email) {

        alert(
            "No encontramos un correo electrónico asociado a esta cuenta."
        );

        return;

    }

    const confirmar =
        confirm(
            `Enviaremos un enlace de recuperación a:\n\n${usuarioActual.email}\n\n¿Deseas continuar?`
        );

    if (!confirmar) return;

    try {

        await sendPasswordResetEmail(
            auth,
            usuarioActual.email
        );

        alert(
            "Listo. Revisa tu correo para continuar con la recuperación de contraseña."
        );

    }
    catch (error) {

        console.error(
            "❌ MOTI GO: error enviando recuperación:",
            error
        );

        alert(
            "No pudimos enviar el correo de recuperación. Intenta nuevamente."
        );

    }

}


// =====================================================
// EVENTOS
// =====================================================

$("btnEditarPerfil")?.addEventListener(
    "click",
    () => {

        if (perfilEstaBloqueado(datosPerfil)) {

            alert(
                tiempoRestanteTexto(datosPerfil)
            );

            return;

        }

        abrirModal(
            "modalEditarPerfil"
        );

    }
);

$("btnGuardarPerfil")?.addEventListener(
    "click",
    guardarPerfil
);

$("btnCambiarPassword")?.addEventListener(
    "click",
    () => abrirModal("modalPassword")
);

$("btnGuardarPassword")?.addEventListener(
    "click",
    cambiarPassword
);

$("btnRecuperarPassword")?.addEventListener(
    "click",
    recuperarPassword
);

$("btnTerminos")?.addEventListener(
    "click",
    () => abrirModal("modalTerminos")
);

document
    .querySelectorAll(
        "[data-close-modal]"
    )
    .forEach(
        boton => {

            boton.addEventListener(
                "click",
                () => cerrarModal(
                    boton.dataset.closeModal
                )
            );

        }
    );

document
    .querySelectorAll(
        ".perfil-modal-backdrop"
    )
    .forEach(
        fondo => {

            fondo.addEventListener(
                "click",
                () => {

                    const modal =
                        fondo.closest(
                            ".perfil-modal"
                        );

                    if (modal) {
                        cerrarModal(
                            modal.id
                        );
                    }

                }
            );

        }
    );


// =====================================================
// AUTH
// =====================================================

onAuthStateChanged(
    auth,
    user => {

        if (!user) return;

        cargarPerfil(user);

    }
);
