import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const btnRegistro = document.getElementById("btnRegistroConductor");

if (btnRegistro) {
    btnRegistro.addEventListener("click", registrarRepartidor);
}

async function registrarRepartidor() {
    const nombre = document.getElementById("nombre")?.value.trim() || "";
    const telefono = document.getElementById("telefono")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim().toLowerCase() || "";
    const placa = document.getElementById("placa")?.value.trim() || "";
    const password = document.getElementById("password")?.value || "";
    const confirmPassword = document.getElementById("confirmPassword")?.value || "";
    const mayorEdad = document.getElementById("mayorEdad")?.checked === true;
    const informacion = document.getElementById("informacion")?.checked === true;
    const terminos = document.getElementById("terminos")?.checked === true;

    if (!nombre || !telefono || !email || !placa || !password || !confirmPassword) {
        alert("Completa todos los campos.");
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
        alert("Ingresa un correo electrónico válido.");
        document.getElementById("email")?.focus();
        return;
    }

    if (password !== confirmPassword) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    if (password.length < 6) {
        alert("La contraseña debe tener al menos 6 caracteres.");
        return;
    }

    if (!mayorEdad) {
        alert("Debes declarar que eres mayor de edad para registrarte como repartidor.");
        return;
    }

    if (!informacion) {
        alert("Debes confirmar que la información proporcionada es correcta.");
        return;
    }

    if (!terminos) {
        alert("Debes leer y aceptar los Términos y Condiciones para Repartidores.");
        return;
    }

    btnRegistro.disabled = true;
    const textoOriginal = btnRegistro.textContent;
    btnRegistro.textContent = "Creando cuenta...";

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;
        const fechaAceptacion = new Date().toISOString();

        await setDoc(doc(db, "usuarios", uid), {
            nombre,
            telefono,
            email,
            municipio: "Ostuacán",
            localidad: "",
            localidadId: null,
            localidadLatitud: null,
            localidadLongitud: null,
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
            declaracionesRegistro: {
                mayorEdad: true,
                informacionCorrecta: true
            },
            terminosRepartidorAceptados: true,
            versionTerminosRepartidor: "1.0",
            fechaAceptacionTerminosRepartidor: fechaAceptacion,
            fechaRegistro: fechaAceptacion
        });

        try {
            await sendEmailVerification(cred.user);
        } catch (verificationError) {
            console.warn("MOTI GO: no se pudo enviar el correo de verificación:", verificationError);
        }

        alert("Solicitud enviada correctamente. Revisa tu correo para verificar tu cuenta.");
        window.location.href = "conductor-pendiente.html";
    } catch (error) {
        console.error("Error registrando repartidor:", error);

        if (error.code === "auth/email-already-in-use") {
            alert("Ese correo electrónico ya está registrado. Usa otro correo o recupera tu contraseña.");
        } else if (error.code === "auth/weak-password") {
            alert("La contraseña debe tener al menos 6 caracteres.");
        } else {
            alert("No se pudo crear la cuenta.");
        }
    } finally {
        btnRegistro.disabled = false;
        btnRegistro.textContent = textoOriginal;
    }
}
