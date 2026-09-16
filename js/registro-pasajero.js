import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* =========================================================
   MOTI GO — REGISTRO PASAJERO
   Correo real + localidades Firebase + contraseña visible
========================================================= */

const formRegistro = document.getElementById("registroForm");
const nombreInput = document.getElementById("nombre");
const telefonoInput = document.getElementById("telefono");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmarPasswordInput = document.getElementById("confirmPassword");
const botonRegistro = document.getElementById("btnRegistro");
const passwordStrength = document.getElementById("passwordStrength");
const terminosInput = document.getElementById("terminos");

function escaparTexto(valor) {
    return String(valor || "").trim();
}

function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function evaluarSeguridadPassword(password) {
    const requisitos = [
        password.length >= 8,
        /[A-ZÁÉÍÓÚÑ]/.test(password),
        /[a-záéíóúñ]/.test(password),
        /\d/.test(password),
        /[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/.test(password)
    ];

    const cumplidos = requisitos.filter(Boolean).length;

    if (passwordStrength) {
        if (!password) {
            passwordStrength.textContent = "";
            passwordStrength.className = "password-strength";
        } else if (cumplidos <= 2) {
            passwordStrength.textContent = "Seguridad: débil";
            passwordStrength.className = "password-strength weak";
        } else if (cumplidos < 5) {
            passwordStrength.textContent = "Seguridad: media";
            passwordStrength.className = "password-strength medium";
        } else {
            passwordStrength.textContent = "Seguridad: fuerte ✓";
            passwordStrength.className = "password-strength strong";
        }
    }

    return { cumplidos, requisitos };
}

function mostrarMensaje(mensaje) {
    alert(mensaje);
}

// Mostrar u ocultar contraseña.
document.querySelectorAll("[data-password-target]").forEach((boton) => {
    boton.addEventListener("click", () => {
        const id = boton.dataset.passwordTarget;
        const input = document.getElementById(id);
        const icono = boton.querySelector(".material-symbols-outlined");

        if (!input) return;

        const mostrar = input.type === "password";
        input.type = mostrar ? "text" : "password";

        boton.setAttribute("aria-label", mostrar ? "Ocultar contraseña" : "Mostrar contraseña");
        boton.setAttribute("title", mostrar ? "Ocultar contraseña" : "Mostrar contraseña");

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
   REGISTRO
========================================================= */

if (formRegistro) {
    formRegistro.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nombre = escaparTexto(nombreInput?.value);
        const telefono = escaparTexto(telefonoInput?.value);
        const email = escaparTexto(emailInput?.value).toLowerCase();
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
