import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const btnRegistro =
    document.getElementById("btnRegistro");


btnRegistro.addEventListener(
    "click",
    registrarUsuario
);


async function registrarUsuario() {

    const nombre =
        document.getElementById("nombre").value.trim();

    const telefono =
        document.getElementById("telefono").value.trim();

    const municipio =
        document.getElementById("municipio").value.trim();

    const localidad =
        document.getElementById("localidad").value.trim();

    const password =
        document.getElementById("password").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;


    // ============================
    // VALIDACIONES
    // ============================

    if (
        !nombre ||
        !telefono ||
        !municipio ||
        !localidad ||
        !password ||
        !confirmPassword
    ) {

        alert(
            "Completa todos los campos."
        );

        return;
    }


    if (password !== confirmPassword) {

        alert(
            "Las contraseñas no coinciden."
        );

        return;
    }


    if (password.length < 6) {

        alert(
            "La contraseña debe tener al menos 6 caracteres."
        );

        return;
    }


    try {

        // ============================
        // EMAIL INTERNO DE FIREBASE
        // ============================

        const email =
            `${telefono}@motigo.app`;


        // ============================
        // CREAR CUENTA
        // ============================

        const cred =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


        const uid =
            cred.user.uid;


        // ============================
        // PERFIL DEL CLIENTE
        // ============================

        await setDoc(
            doc(
                db,
                "usuarios",
                uid
            ),
            {

                nombre,

                telefono,

                municipio,

                localidad,

                // NUEVO ROL MOTI GO
                tipo: "cliente",

                passwordTemporal: false,

                fechaRegistro:
                    new Date().toISOString(),

                latitud: null,

                longitud: null

            }
        );


        // ============================
        // ÉXITO
        // ============================

        alert(
            "¡Cuenta creada correctamente! Bienvenido a MOTI GO."
        );


        window.location.href =
            "dashboard-cliente.html";


    }
    catch (error) {

        console.error(error);


        if (
            error.code ===
            "auth/email-already-in-use"
        ) {

            alert(
                "Ya existe una cuenta registrada con este número telefónico."
            );

            return;
        }


        if (
            error.code ===
            "auth/invalid-phone-number"
        ) {

            alert(
                "Verifica el número telefónico."
            );

            return;
        }


        if (
            error.code ===
            "auth/weak-password"
        ) {

            alert(
                "La contraseña es demasiado débil."
            );

            return;
        }


        alert(
            "No se pudo crear la cuenta."
        );

    }

}
