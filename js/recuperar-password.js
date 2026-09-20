import { auth } from "./firebase-config.js";

import {
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


const formulario =
    document.getElementById("recoveryForm");

const campoEmail =
    document.getElementById("email");

const botonRecuperar =
    document.getElementById("btnRecuperar");

const mensaje =
    document.getElementById("recoveryMessage");


function mostrarMensaje(texto, tipo) {

    if (!mensaje) return;

    mensaje.textContent = texto;
    mensaje.className =
        `recovery-message ${tipo}`;
}


function correoValido(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}


formulario?.addEventListener(
    "submit",
    async (evento) => {

        evento.preventDefault();

        const email =
            String(campoEmail?.value || "")
                .trim()
                .toLowerCase();

        mostrarMensaje("", "");

        if (!correoValido(email)) {

            mostrarMensaje(
                "Ingresa un correo electrónico válido.",
                "error"
            );

            campoEmail?.focus();
            return;
        }

        botonRecuperar.disabled = true;
        botonRecuperar.textContent =
            "Enviando enlace...";

        try {

            await sendPasswordResetEmail(
                auth,
                email
            );

            mostrarMensaje(
                "Listo. Revisa tu correo electrónico y sigue el enlace para crear una nueva contraseña. Si no lo encuentras, revisa también la carpeta de spam o correo no deseado.",
                "success"
            );

            formulario.reset();

        } catch (error) {

            console.error(
                "MOTI GO: error al enviar recuperación de contraseña:",
                error
            );

            let texto =
                "No se pudo enviar el enlace de recuperación. Inténtalo nuevamente.";

            if (
                error?.code === "auth/invalid-email"
            ) {

                texto =
                    "El correo electrónico no tiene un formato válido.";

            } else if (
                error?.code === "auth/user-not-found"
            ) {

                texto =
                    "No encontramos una cuenta asociada a ese correo electrónico.";

            } else if (
                error?.code === "auth/too-many-requests"
            ) {

                texto =
                    "Se realizaron demasiados intentos. Espera un momento y vuelve a intentarlo.";

            }

            mostrarMensaje(
                texto,
                "error"
            );

        } finally {

            botonRecuperar.disabled = false;
            botonRecuperar.textContent =
                "Enviar enlace de recuperación";

        }
    }
);
