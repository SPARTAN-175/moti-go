import { db } from "./firebase-config.js";

import {

    doc,

    getDoc

} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


async function leerUsuario() {

    try {

        const docRef =
        doc(db, "usuarios", "usuario_prueba");

        const docSnap =
        await getDoc(docRef);

        if (docSnap.exists()) {

            console.log(
                "🔥 Usuario encontrado:"
            );

            console.log(
                docSnap.data()
            );

        } else {

            console.log(
                "❌ Usuario no encontrado"
            );

        }

    } catch(error) {

        console.error(error);

    }

}

leerUsuario();
