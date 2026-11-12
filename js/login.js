import { auth, db } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const btnLogin =
    document.getElementById("btnLogin");

let loginAttemptInProgress = false;

// Si el usuario vuelve accidentalmente a la pantalla de acceso, recuperamos
// la sesión persistida por Firebase y lo enviamos a su panel.
onAuthStateChanged(auth, async (user) => {
    if (!user || loginAttemptInProgress) return;
    try {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        if (!snap.exists()) return;
        const perfil = snap.data();
        if (perfil.passwordTemporal) { window.location.replace("cambiar-password.html"); return; }
        if (perfil.tipo === "cliente") window.location.replace("dashboard-cliente.html");
        else if (perfil.tipo === "repartidor") window.location.replace("dashboard-repartidor.html");
        else if (perfil.tipo === "negocio") window.location.replace("dashboard-negocio.html");
        else if (perfil.tipo === "admin") window.location.replace("../admin/dashboard-admin.html");
    } catch (error) { console.warn("No se pudo recuperar el perfil de la sesión:", error); }
});


btnLogin.addEventListener(
    "click",
    iniciarSesion
);


// Mostrar / ocultar contraseña
const togglePassword =
    document.getElementById("togglePassword");

if (togglePassword) {
    togglePassword.addEventListener("click", () => {
        const password = document.getElementById("password");
        const icon = togglePassword.querySelector(".material-symbols-outlined");

        if (!password) return;

        const mostrar = password.type === "password";
        password.type = mostrar ? "text" : "password";

        if (icon) {
            icon.textContent = mostrar ? "visibility_off" : "visibility";
        }

        togglePassword.setAttribute(
            "aria-label",
            mostrar ? "Ocultar contraseña" : "Mostrar contraseña"
        );
        togglePassword.setAttribute(
            "title",
            mostrar ? "Ocultar contraseña" : "Mostrar contraseña"
        );
    });
}


async function iniciarSesion() {

    const email =
        document.getElementById("email").value.trim().toLowerCase();

    const password =
        document.getElementById("password").value;


    // ============================
    // VALIDACIÓN
    // ============================

    if (!email || !password) {

        window.motiGoNotificar(
            "Completa todos los campos."
        );

        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {

        window.motiGoNotificar(
            "Ingresa un correo electrónico válido."
        );

        return;
    }


    loginAttemptInProgress = true;

    try {

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

            window.motiGoNotificar(
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
        "../admin/dashboard-admin.html";

    return;
}


// ============================
// NEGOCIO
// ============================

if (
    usuario.tipo === "negocio"
) {

    console.log(
        "Redirigiendo a dashboard negocio"
    );


    window.location.href =
        "dashboard-negocio.html";


    return;
}


        // ============================
        // TIPO DESCONOCIDO
        // ============================

        window.motiGoNotificar(
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

            window.motiGoNotificar(
                "Correo electrónico o contraseña incorrectos."
            );

            return;
        }


        window.motiGoNotificar(
            "No se pudo iniciar sesión. Inténtalo nuevamente."
        );

    } finally {
        loginAttemptInProgress = false;
    }

}
