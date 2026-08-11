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


async function iniciarSesion(){

    const telefono =
    document.getElementById("telefono").value.trim();

    const password =
    document.getElementById("password").value;

    if(!telefono || !password){

        alert(
            "Completa todos los campos."
        );

        return;
    }

    try{

        const email =
        `${telefono}@moti.app`;

        const cred =
        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const uid =
        cred.user.uid;

        const docRef =
        doc(db, "usuarios", uid);

        const docSnap =
        await getDoc(docRef);

        if(!docSnap.exists()){

            alert(
                "Usuario no encontrado."
            );

            return;
        }

        const usuario =
        docSnap.data();

        console.log(usuario);

        if(usuario.passwordTemporal){

            window.location.href =
            "cambiar-password.html";

            return;
        }

        if(usuario.tipo === "pasajero"){

            console.log(
            "Redirigiendo a dashboard pasajero"
            );
            window.location.href =
            "dashboard-pasajero.html";

            return;
        }

       if(usuario.tipo === "conductor"){

    await updateDoc(

        doc(
            db,
            "usuarios",
            uid
        ),

        {

            estadoServicio:"disponible"

        }

    );

    window.location.href =
    "dashboard-conductor.html";

    return;

}

    }
    catch(error){

        console.error(error);

        alert(
            "Teléfono o contraseña incorrectos."
        );

    }

}
