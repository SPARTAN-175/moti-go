import { auth, db }
from "./firebase-config.js";

import {
    onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) return;

        try {

            const docRef =
                doc(
                    db,
                    "usuarios",
                    user.uid
                );


            const docSnap =
                await getDoc(docRef);


            if (docSnap.exists()) {

                const datos =
                    docSnap.data();


                // =====================================
                // NOMBRE EN EL MENÚ LATERAL
                // =====================================

                const sideUserName =
                    document.getElementById(
                        "sideUserName"
                    );


                if (sideUserName) {

                    sideUserName.textContent =
                        `Hola ${datos.nombre} 👋`;

                }


                // =====================================
                // COMPATIBILIDAD
                // =====================================
                // Si alguna otra página todavía utiliza
                // #userName, seguirá funcionando.

                const userName =
                    document.getElementById(
                        "userName"
                    );


                if (userName) {

                    userName.textContent =
                        `Hola ${datos.nombre} 👋`;

                }

            }

        }
        catch (error) {

            console.error(
                "Error obteniendo datos del usuario:",
                error
            );

        }

    }
);
