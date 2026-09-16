import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* =========================================================
   MOTI GO — REGISTRO PASAJERO
   Correo real + localidades Firebase + contraseña visible
========================================================= */

const MUNICIPIO_MOTIGO = "Ostuacán";
let localidadesDisponibles = [];

const formRegistro = document.getElementById("registroForm");
const nombreInput = document.getElementById("nombre");
const telefonoInput = document.getElementById("telefono");
const emailInput = document.getElementById("email");
const municipioInput = document.getElementById("municipio");
const localidadInput = document.getElementById("localidad");
const passwordInput = document.getElementById("password");
const confirmarPasswordInput = document.getElementById("confirmPassword");
const listaLocalidades = document.getElementById("listaLocalidades");
const botonRegistro = document.getElementById("btnRegistro");
const passwordStrength = document.getElementById("passwordStrength");
const terminosInput = document.getElementById("terminos");
const sugerenciasLocalidad = document.getElementById("sugerenciasLocalidad");

function mostrarMensaje(mensaje) {
    alert(mensaje);
}

function normalizarTexto(valor) {
    return String(valor || "").trim().toLowerCase();
}

function escaparTexto(valor) {
    return String(valor || "").trim();
}

function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function evaluarSeguridadPassword(password) {
    const tieneLongitud = password.length >= 8;
    const tieneMayuscula = /[A-ZÁÉÍÓÚÑ]/.test(password);
    const tieneMinuscula = /[a-záéíóúñ]/.test(password);
    const tieneNumero = /\d/.test(password);
    const tieneSimbolo = /[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/.test(password);

    const requisitos = [
        tieneLongitud,
        tieneMayuscula,
        tieneMinuscula,
        tieneNumero,
        tieneSimbolo
    ];

    const cumplidos = requisitos.filter(Boolean).length;

    if (!passwordStrength) return { cumplidos, requisitos };

    if (!password) {
        passwordStrength.textContent = "";
        passwordStrength.className = "password-strength";
        return { cumplidos, requisitos };
    }

    if (cumplidos <= 2) {
        passwordStrength.textContent = "Seguridad: débil";
        passwordStrength.className = "password-strength weak";
    } else if (cumplidos < 5) {
        passwordStrength.textContent = "Seguridad: media";
        passwordStrength.className = "password-strength medium";
    } else {
        passwordStrength.textContent = "Seguridad: fuerte ✓";
        passwordStrength.className = "password-strength strong";
    }

    return { cumplidos, requisitos };
}

/* =========================================================
   OJITO — MOSTRAR / OCULTAR CONTRASEÑA
========================================================= */

document.querySelectorAll("[data-password-target]").forEach((boton) => {
    boton.addEventListener("click", () => {
        const id = boton.dataset.passwordTarget;
        const input = document.getElementById(id);
        const icono = boton.querySelector(".material-symbols-outlined");

        if (!input) return;

        const mostrar = input.type === "password";
        input.type = mostrar ? "text" : "password";

        boton.setAttribute(
            "aria-label",
            mostrar ? "Ocultar contraseña" : "Mostrar contraseña"
        );
        boton.setAttribute(
            "title",
            mostrar ? "Ocultar contraseña" : "Mostrar contraseña"
        );

        if (icono) {
            icono.textContent = mostrar ? "visibility_off" : "visibility";
        }
    });
});

if (passwordInput) {
    passwordInput.addEventListener("input", () => {
        evaluarSeguridadPassword(passwordInput.value);
    });
}

/* =========================================================
   MUNICIPIO
========================================================= */

if (municipioInput) {
    municipioInput.value = MUNICIPIO_MOTIGO;
    municipioInput.readOnly = true;
}

/* =========================================================
   LOCALIDADES
========================================================= */

async function cargarLocalidades() {
    if (!listaLocalidades) return;

    console.log("📍 MOTI GO: cargando localidades del municipio...");

    try {
        const snapshot = await getDocs(collection(db, "destinos"));

        localidadesDisponibles = [];

        snapshot.forEach((docSnap) => {
            const datos = docSnap.data() || {};

            if (
                datos.activo === false ||
                normalizarTexto(datos.municipio) !== normalizarTexto(MUNICIPIO_MOTIGO)
            ) {
                return;
            }

            const nombre = escaparTexto(
                datos.nombre || datos.localidad || datos.nombreLocalidad
            );

            if (!nombre) return;

            const latitud = Number(datos.latitud);
            const longitud = Number(datos.longitud);

            localidadesDisponibles.push({
                id: docSnap.id,
                nombre,
                latitud: Number.isFinite(latitud) ? latitud : null,
                longitud: Number.isFinite(longitud) ? longitud : null
            });
        });

        localidadesDisponibles.sort((a, b) =>
            a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
        );

        if (listaLocalidades) {
            listaLocalidades.innerHTML = "";
            localidadesDisponibles.forEach((localidad) => {
                const option = document.createElement("option");
                option.value = localidad.nombre;
                listaLocalidades.appendChild(option);
            });
        }

        console.log(
            "📍 MOTI GO: localidades disponibles:",
            localidadesDisponibles.length
        );
    } catch (error) {
        console.error("❌ MOTI GO: error cargando localidades:", error);
        localidadesDisponibles = [];
        listaLocalidades.innerHTML = "";
    }
}

function escaparHtmlLocalidad(valor) {
    return String(valor || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function resaltarCoincidencia(nombre, termino) {
    const texto = escaparHtmlLocalidad(nombre);
    const limpio = normalizarTexto(termino);
    if (!limpio) return texto;

    const indice = normalizarTexto(nombre).indexOf(limpio);
    if (indice < 0) return texto;

    const inicio = escaparHtmlLocalidad(nombre.slice(0, indice));
    const medio = escaparHtmlLocalidad(nombre.slice(indice, indice + termino.length));
    const fin = escaparHtmlLocalidad(nombre.slice(indice + termino.length));
    return `${inicio}<strong>${medio}</strong>${fin}`;
}

function cerrarSugerenciasLocalidad() {
    if (!sugerenciasLocalidad) return;
    sugerenciasLocalidad.classList.remove("visible");
    sugerenciasLocalidad.innerHTML = "";
    localidadInput?.setAttribute("aria-expanded", "false");
}

function mostrarSugerenciasLocalidad() {
    if (!localidadInput || !sugerenciasLocalidad) return;

    const termino = normalizarTexto(localidadInput.value);
    const resultados = localidadesDisponibles
        .filter((localidad) => {
            if (!termino) return true;
            return normalizarTexto(localidad.nombre).includes(termino);
        })
        .slice(0, 8);

    sugerenciasLocalidad.innerHTML = "";

    if (!resultados.length) {
        sugerenciasLocalidad.innerHTML = '<div class="localidad-sin-resultados">No encontramos esa localidad en Ostuacán.</div>';
        sugerenciasLocalidad.classList.add("visible");
        localidadInput.setAttribute("aria-expanded", "true");
        return;
    }

    resultados.forEach((localidad) => {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "localidad-sugerencia";
        boton.setAttribute("role", "option");
        boton.innerHTML = `📍 ${resaltarCoincidencia(localidad.nombre, localidadInput.value)}`;

        boton.addEventListener("mousedown", (event) => {
            event.preventDefault();
            localidadInput.value = localidad.nombre;
            cerrarSugerenciasLocalidad();
        });

        sugerenciasLocalidad.appendChild(boton);
    });

    sugerenciasLocalidad.classList.add("visible");
    localidadInput.setAttribute("aria-expanded", "true");
}

if (localidadInput) {
    localidadInput.addEventListener("input", () => {
        const seleccion = obtenerLocalidadSeleccionada(localidadInput.value);
        if (!seleccion) {
            localidadInput.dataset.localidadId = "";
        }
        mostrarSugerenciasLocalidad();
    });

    localidadInput.addEventListener("focus", mostrarSugerenciasLocalidad);

    localidadInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            cerrarSugerenciasLocalidad();
        }
    });

    document.addEventListener("click", (event) => {
        if (!localidadInput.contains(event.target) && !sugerenciasLocalidad?.contains(event.target)) {
            cerrarSugerenciasLocalidad();
        }
    });
}

function obtenerLocalidadSeleccionada(valor) {
    const buscada = normalizarTexto(valor);

    return localidadesDisponibles.find(
        (localidad) => normalizarTexto(localidad.nombre) === buscada
    ) || null;
}

cargarLocalidades();

/* =========================================================
   REGISTRO
========================================================= */

if (formRegistro) {
    formRegistro.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nombre = escaparTexto(nombreInput?.value);
        const telefono = escaparTexto(telefonoInput?.value);
        const email = escaparTexto(emailInput?.value).toLowerCase();
        const localidad = escaparTexto(localidadInput?.value);
        const password = passwordInput?.value || "";
        const confirmarPassword = confirmarPasswordInput?.value || "";

        if (!nombre) {
            mostrarMensaje("Escribe tu nombre completo.");
            nombreInput?.focus();
            return;
        }

        if (!telefono) {
            mostrarMensaje("Escribe tu número de teléfono.");
            telefonoInput?.focus();
            return;
        }

        if (!email || !validarEmail(email)) {
            mostrarMensaje("Escribe un correo electrónico real y válido.");
            emailInput?.focus();
            return;
        }

        if (!localidad) {
            mostrarMensaje("Selecciona tu localidad.");
            localidadInput?.focus();
            return;
        }

        const localidadSeleccionada = obtenerLocalidadSeleccionada(localidad);

        if (!localidadSeleccionada) {
            mostrarMensaje(
                "Selecciona una localidad válida de la lista. Si la lista aparece vacía, revisa los permisos de Firestore para la colección destinos."
            );
            localidadInput?.focus();
            return;
        }

        const seguridad = evaluarSeguridadPassword(password);

        if (
            password.length < 8 ||
            seguridad.cumplidos < 5
        ) {
            mostrarMensaje(
                "Crea una contraseña segura: mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo."
            );
            passwordInput?.focus();
            return;
        }

        if (password !== confirmarPassword) {
            mostrarMensaje("Las contraseñas no coinciden.");
            confirmarPasswordInput?.focus();
            return;
        }

        if (!terminosInput?.checked) {
            mostrarMensaje("Debes aceptar los Términos y Condiciones de MOTI GO para crear tu cuenta.");
            terminosInput?.focus();
            return;
        }

        if (password === email || password === telefono) {
            mostrarMensaje("Por seguridad, no uses tu correo ni tu número telefónico como contraseña.");
            passwordInput?.focus();
            return;
        }

        if (botonRegistro) {
            botonRegistro.disabled = true;
            botonRegistro.dataset.textoOriginal = botonRegistro.textContent;
            botonRegistro.textContent = "Creando cuenta...";
        }

        try {
            console.log("👤 MOTI GO: creando cuenta de pasajero...");

            const resultado = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            const user = resultado.user;

            await setDoc(
                doc(db, "usuarios", user.uid),
                {
                    nombre,
                    telefono,
                    email: user.email || email,
                    municipio: MUNICIPIO_MOTIGO,
                    localidad: localidadSeleccionada.nombre,
                    localidadId: localidadSeleccionada.id,
                    localidadLatitud: localidadSeleccionada.latitud,
                    localidadLongitud: localidadSeleccionada.longitud,
                    tipo: "cliente",
                    terminosVersion: "1.0",
                    terminosAceptadosEn: serverTimestamp(),
                    passwordTemporal: false,
                    fechaRegistro: serverTimestamp(),
                    latitud: null,
                    longitud: null,
                    viajeActivo: null,
                    estadoServicio: "no_disponible"
                },
                { merge: true }
            );

            try {
                await sendEmailVerification(user);
                console.log("📧 MOTI GO: correo de verificación enviado.");
            } catch (errorVerificacion) {
                console.warn(
                    "⚠️ MOTI GO: no se pudo enviar la verificación:",
                    errorVerificacion
                );
            }

            console.log("✅ MOTI GO: pasajero registrado correctamente:", user.uid);

            mostrarMensaje(
                "¡Cuenta creada correctamente! Te enviamos un correo para verificar tu dirección."
            );

            window.location.href = "./dashboard-cliente.html";
        } catch (error) {
            console.error("❌ MOTI GO: error registrando pasajero:", error);

            if (error.code === "auth/email-already-in-use") {
                mostrarMensaje(
                    "Ese correo electrónico ya está registrado. Intenta iniciar sesión o utiliza otro correo."
                );
            } else if (error.code === "auth/invalid-email") {
                mostrarMensaje("El correo electrónico no es válido.");
            } else if (error.code === "auth/weak-password") {
                mostrarMensaje("Firebase rechazó la contraseña por ser demasiado débil.");
            } else if (error.code === "auth/network-request-failed") {
                mostrarMensaje("No se pudo conectar con Firebase. Revisa tu conexión a internet e inténtalo nuevamente.");
            } else {
                mostrarMensaje("No se pudo crear la cuenta. Revisa la consola para conocer el detalle.");
            }
        } finally {
            if (botonRegistro) {
                botonRegistro.disabled = false;
                botonRegistro.textContent =
                    botonRegistro.dataset.textoOriginal || "Crear cuenta";
            }
        }
    });
}

console.log("🧑‍💻 MOTI GO — REGISTRO PASAJERO CARGADO.");
