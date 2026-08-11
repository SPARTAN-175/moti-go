import { auth, db } from "./firebase-config.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {

    doc,
    updateDoc

}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const btnLogout =
document.getElementById("btnLogout");

if(btnLogout){

    btnLogout.addEventListener(
        "click",
        async (e) => {

            e.preventDefault();

            try{

    const user = auth.currentUser;

    if(user){

        await updateDoc(

            doc(
                db,
                "usuarios",
                user.uid
            ),

            {

                estadoServicio:"no_disponible",

                viajeActivo:null

            }

        );

    }

    await signOut(auth);

    window.location.href =
    "login.html";

}
            catch(error){

                console.error(error);

                alert(
                    "No se pudo cerrar sesión."
                );

            }

        }
    );

}
