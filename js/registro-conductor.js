import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const btnRegistro =
    document.getElementById(
        "btnRegistroConductor"
    );


btnRegistro.addEventListener(
    "click",
    registrarRepartidor
);


async function registrarRepartidor() {

    const nombre =
        document.getElementById("nombre").value.trim();

    const telefono =
        document.getElementById("telefono").value.trim();

    const municipio =
        document.getElementById("municipio").value.trim();

    const localidad =
        document.getElementById("localidad").value.trim();

    const placa =
        document.getElementById("placa").value.trim();

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
        !placa ||
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
        // EMAIL INTERNO MOTI GO
        // ============================

        const email =
            `${telefono}@motigo.app`;


        // ============================
        // CREAR CUENTA AUTH
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
        // PERFIL DEL REPARTIDOR
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

                placa,

                // NUEVO ROL MOTI GO
                tipo: "repartidor",

                // Estado de aprobación
                estado: "pendiente",

                // Estado para el motor de asignación
                estadoServicio: "disponible",

                verificado: false,

                beta: true,

                passwordTemporal: false,

                latitud: null,

                longitud: null,

                // ======================
                // ESTADÍSTICAS
                // ======================

                viajesHoy: 0,

                viajesTotales: 0,

                fechaRegistro:
                    new Date().toISOString()

            }
        );


        // ============================
        // ÉXITO
        // ============================

        alert(
            "Solicitud enviada correctamente."
        );


        window.location.href =
            "conductor-pendiente.html";


    }
    catch (error) {

        console.error(
            "Error registrando repartidor:",
            error
        );


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
            "auth/weak-password"
        ) {

            alert(
                "La contraseña debe tener al menos 6 caracteres."
            );

            return;
        }


        alert(
            "No se pudo crear la cuenta."
        );

    }

}
