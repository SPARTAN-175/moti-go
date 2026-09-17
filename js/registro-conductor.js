import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    setDoc,
    collection,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const MUNICIPIO_MOTIGO = "Ostuacán";
const VERSION_TERMINOS_REPARTIDOR = "1.0";

let localidadesDisponibles = [];
let localidadSeleccionada = null;

const campoLocalidad = document.getElementById("localidad");
const listaLocalidades = document.getElementById("listaLocalidades");
const btnRegistro = document.getElementById("btnRegistroConductor");

function normalizarTexto(texto = "") {
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

async function cargarLocalidades() {
    try {
        const snapshot = await getDocs(collection(db, "destinos"));

        localidadesDisponibles = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(d =>
                d.activo !== false &&
                normalizarTexto(d.municipio) === normalizarTexto(MUNICIPIO_MOTIGO) &&
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
            "MOTI GO: localidades disponibles para registro:",
            localidadesDisponibles.length
        );
    } catch (error) {
        console.error(
            "MOTI GO: no se pudieron cargar las localidades:",
            error
        );
    }
}

function ocultarListaLocalidades() {
    if (!listaLocalidades) return;
    listaLocalidades.style.display = "none";
    listaLocalidades.innerHTML = "";
}

function mostrarResultadosLocalidad(texto) {
    if (!listaLocalidades || !campoLocalidad) return;

    const termino = normalizarTexto(texto);

    if (termino.length < 2) {
        ocultarListaLocalidades();
        return;
    }

    const resultados = localidadesDisponibles
        .filter(destino =>
            normalizarTexto(destino.nombre).includes(termino)
        )
        .slice(0, 8);

    if (!resultados.length) {
        listaLocalidades.innerHTML =
            `<div class="moti-localidad-empty">No encontramos una localidad con ese nombre.</div>`;
        listaLocalidades.style.display = "block";
        return;
    }

    listaLocalidades.innerHTML = resultados.map(destino => `
        <button
            type="button"
            class="moti-localidad-item"
            data-localidad-id="${escaparHTML(destino.id)}">
            ${escaparHTML(destino.nombre)}
        </button>
    `).join("");

    listaLocalidades.style.display = "block";

    listaLocalidades
        .querySelectorAll(".moti-localidad-item")
        .forEach(boton => {
            boton.addEventListener("click", () => {
                const destino = localidadesDisponibles.find(
                    item => item.id === boton.dataset.localidadId
                );

                if (!destino) return;

                localidadSeleccionada = destino;
                campoLocalidad.value = destino.nombre;
                ocultarListaLocalidades();
                validarBotonRegistro();
            });
        });
}

function validarBotonRegistro() {
    if (!btnRegistro) return;

    const datosCompletos =
        document.getElementById("nombre")?.value.trim() &&
        document.getElementById("telefono")?.value.trim() &&
        document.getElementById("email")?.value.trim() &&
        campoLocalidad?.value.trim() &&
        document.getElementById("placa")?.value.trim() &&
        document.getElementById("password")?.value &&
        document.getElementById("confirmPassword")?.value &&
        document.getElementById("mayorEdad")?.checked &&
        document.getElementById("informacion")?.checked &&
        document.getElementById("terminos")?.checked &&
        localidadSeleccionada;

    btnRegistro.disabled = !datosCompletos;
}

if (campoLocalidad) {
    campoLocalidad.addEventListener("input", () => {
        localidadSeleccionada = null;
        mostrarResultadosLocalidad(campoLocalidad.value);
        validarBotonRegistro();
    });

    campoLocalidad.addEventListener("focus", () => {
        if (campoLocalidad.value.trim().length >= 2) {
            mostrarResultadosLocalidad(campoLocalidad.value);
        }
    });
}

document.addEventListener("click", event => {
    if (
        campoLocalidad &&
        listaLocalidades &&
        !campoLocalidad.contains(event.target) &&
        !listaLocalidades.contains(event.target)
    ) {
        ocultarListaLocalidades();
    }
});

[
    "nombre",
    "telefono",
    "email",
    "placa",
    "password",
    "confirmPassword",
    "mayorEdad",
    "informacion",
    "terminos"
].forEach(id => {
    const elemento = document.getElementById(id);
    if (!elemento) return;
    elemento.addEventListener("input", validarBotonRegistro);
    elemento.addEventListener("change", validarBotonRegistro);
});

async function registrarRepartidor() {
    const nombre = document.getElementById("nombre").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const municipio = document.getElementById("municipio").value.trim();
    const localidad = campoLocalidad.value.trim();
    const placa = document.getElementById("placa").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!nombre || !telefono || !email || !municipio || !localidad ||
        !placa || !password || !confirmPassword) {
        alert("Completa todos los campos.");
        return;
    }

    if (!document.getElementById("mayorEdad").checked) {
        alert("Debes declarar que eres mayor de edad para solicitar el registro.");
        return;
    }

    if (!document.getElementById("informacion").checked) {
        alert("Debes confirmar que la información proporcionada es correcta.");
        return;
    }

    if (!document.getElementById("terminos").checked) {
        alert("Debes aceptar los Términos y Condiciones y el Aviso de Privacidad.");
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
        alert("Ingresa un correo electrónico válido.");
        document.getElementById("email").focus();
        return;
    }

    if (!localidadSeleccionada ||
        normalizarTexto(localidadSeleccionada.nombre) !== normalizarTexto(localidad)) {
        alert("Selecciona una localidad válida de la lista.");
        campoLocalidad.focus();
        return;
    }

    if (password !== confirmPassword) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    if (password.length < 8) {
        alert("La contraseña debe tener al menos 8 caracteres.");
        return;
    }

    btnRegistro.disabled = true;
    btnRegistro.textContent = "Enviando solicitud...";

    try {
        const cred = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        const uid = cred.user.uid;

        await setDoc(doc(db, "usuarios", uid), {
            nombre,
            telefono,
            email,
            municipio,
            localidad: localidadSeleccionada.nombre,
            localidadId: localidadSeleccionada.id,
            localidadLatitud:
                localidadSeleccionada.latitud ??
                localidadSeleccionada.latitude ??
                null,
            localidadLongitud:
                localidadSeleccionada.longitud ??
                localidadSeleccionada.longitude ??
                null,
            placa,
            tipo: "repartidor",
            estado: "pendiente",
            estadoServicio: "disponible",
            verificado: false,
            beta: true,
            passwordTemporal: false,
            latitud: null,
            longitud: null,
            viajesHoy: 0,
            viajesTotales: 0,
            terminosRepartidorAceptados: true,
            versionTerminosRepartidor: VERSION_TERMINOS_REPARTIDOR,
            fechaAceptacionTerminosRepartidor: serverTimestamp(),
            avisoPrivacidadAceptado: true,
            fechaAceptacionPrivacidad: serverTimestamp(),
            fechaRegistro: serverTimestamp(),
            ultimaActualizacionPerfil: null
        });

        try {
            await sendEmailVerification(cred.user);
        } catch (verificationError) {
            console.warn(
                "MOTI GO: no se pudo enviar el correo de verificación:",
                verificationError
            );
        }

        alert(
            "Solicitud enviada correctamente. Tu cuenta quedó registrada y será revisada. Revisa también tu correo electrónico."
        );

        window.location.href = "conductor-pendiente.html";

    } catch (error) {
        console.error("MOTI GO: error registrando repartidor:", error);

        if (error.code === "auth/email-already-in-use") {
            alert("Ese correo electrónico ya está registrado. Usa otro correo o recupera tu contraseña.");
        } else if (error.code === "auth/invalid-email") {
            alert("El correo electrónico no es válido.");
        } else if (error.code === "auth/weak-password") {
            alert("La contraseña debe tener al menos 8 caracteres.");
        } else {
            alert("No se pudo crear la cuenta. Inténtalo nuevamente.");
        }
    } finally {
        btnRegistro.textContent = "Solicitar registro";
        validarBotonRegistro();
    }
}

if (btnRegistro) {
    btnRegistro.addEventListener("click", registrarRepartidor);
}

cargarLocalidades();
validarBotonRegistro();