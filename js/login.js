import { auth, db } from "./firebase-config.js";

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const btnLogin =
    document.getElementById("btnLogin");


btnLogin.addEventListener(
    "click",
    iniciarSesion
);


async function iniciarSesion() {

    const telefono =
        document.getElementById("telefono").value.trim();

    const password =
        document.getElementById("password").value;


    // ============================
    // VALIDACIÓN
    // ============================

    if (!telefono || !password) {

        alert(
            "Completa todos los campos."
        );

        return;
    }


    try {

        // ============================
        // EMAIL INTERNO MOTI GO
        // ============================

        const email =
            `${telefono}@motigo.app`;


        // ============================
        // AUTENTICACIÓN
        // ============================

        const cred =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        const uid =
            cred.user.uid;


        // ============================
        // PERFIL
        // ============================

        const docRef =
            doc(
                db,
                "usuarios",
                uid
            );


        const docSnap =
            await getDoc(docRef);


        if (!docSnap.exists()) {

            alert(
                "No se encontró el perfil del usuario."
            );

            return;
        }


        const usuario =
            docSnap.data();


        console.log(
            "Usuario MOTI GO:",
            usuario
        );


        // ============================
        // CAMBIO DE CONTRASEÑA
        // ============================

        if (usuario.passwordTemporal) {

            window.location.href =
                "cambiar-password.html";

            return;
        }


        // ============================
        // CLIENTE
        // ============================

        if (
            usuario.tipo === "cliente"
        ) {

            console.log(
                "Redirigiendo a dashboard cliente"
            );


            window.location.href =
                "dashboard-cliente.html";


            return;
        }


        // ============================
        // REPARTIDOR
        // ============================

        if (
            usuario.tipo === "repartidor"
        ) {

            await updateDoc(

                doc(
                    db,
                    "usuarios",
                    uid
                ),

                {

                    estadoServicio:
                        "disponible"

                }

            );


            window.location.href =
                "dashboard-repartidor.html";


            return;
        }


        // ============================
        // ADMIN
        // ============================

        if (
            usuario.tipo === "admin"
        ) {

            window.location.href =
                "dashboard-admin.html";


            return;
        }


        // ============================
        // TIPO DESCONOCIDO
        // ============================

        alert(
            "La cuenta no tiene un tipo de usuario válido."
        );

    }
    catch (error) {

        console.error(
            "Error de inicio de sesión:",
            error
        );


        if (
            error.code ===
            "auth/user-not-found" ||
            error.code ===
            "auth/wrong-password" ||
            error.code ===
            "auth/invalid-credential"
        ) {

            alert(
                "Teléfono o contraseña incorrectos."
            );

            return;
        }


        alert(
            "No se pudo iniciar sesión. Inténtalo nuevamente."
        );

    }

}
