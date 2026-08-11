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
    registrarConductor
);


async function registrarConductor(){

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


    if(
        !nombre ||
        !telefono ||
        !municipio ||
        !localidad ||
        !placa ||
        !password ||
        !confirmPassword
    ){

        alert(
            "Completa todos los campos."
        );

        return;
    }

    if(password !== confirmPassword){

        alert(
            "Las contraseñas no coinciden."
        );

        return;
    }

    try{

        const email =
        `${telefono}@moti.app`;

        const cred =
        await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        const uid =
        cred.user.uid;

        await setDoc(
            doc(db, "usuarios", uid),
            {

                nombre,

                telefono,

                municipio,

                localidad,

                placa,

                tipo: "conductor",

                estado: "pendiente",

                estadoServicio: "disponible",

                verificado: false,

                beta: true,

                passwordTemporal: false,

                latitud: null,

                longitud: null,

// ======================
// ESTADÍSTICAS MOTI
// ======================

viajesHoy: 0,

viajesTotales: 0,

fechaRegistro:
new Date().toISOString()

            }
        );

        alert(
            "Solicitud enviada correctamente."
        );

        window.location.href =
        "conductor-pendiente.html";

    }
    catch(error){

    console.error(error);

    if(
        error.code ===
        "auth/email-already-in-use"
    ){

        alert(
            "Ya existe una cuenta registrada con este número telefónico."
        );

        return;

    }

    alert(
        "No se pudo crear la cuenta."
    );

    }

}
