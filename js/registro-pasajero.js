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

    // Validaciones

    if(
        !nombre ||
        !telefono ||
        !municipio ||
        !localidad ||
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

        // Email interno para Firebase

        const email =
        `${telefono}@moti.app`;

        // Crear usuario Authentication

        const cred =
        await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        const uid =
        cred.user.uid;

        // Guardar en Firestore

        await setDoc(
            doc(db, "usuarios", uid),
            {

                nombre,

                telefono,

                municipio,

                localidad,

                tipo: "pasajero",

                passwordTemporal: false,

                fechaRegistro:
                new Date().toISOString(),

                latitud: null,

                longitud: null

            }
        );

        alert(
            "Cuenta creada correctamente."
        );

        window.location.href =
        "dashboard-pasajero.html";

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
