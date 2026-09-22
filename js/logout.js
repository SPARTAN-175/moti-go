import { auth, db } from "./firebase-config.js";

import { signOut }
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { doc, updateDoc }
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const btnLogout = document.getElementById("btnLogout");

if (btnLogout) {
    btnLogout.addEventListener("click", async (e) => {
        e.preventDefault();
        if (btnLogout.dataset.loggingOut === "1") return;
        btnLogout.dataset.loggingOut = "1";
        btnLogout.style.pointerEvents = "none";

        // Detener listeners/GPS antes de perder la sesión.
        window.dispatchEvent(new CustomEvent("moti-go:logout"));

        const user = auth.currentUser;

        try {
            // Este cambio de estado es deseable, pero NUNCA debe impedir el signOut
            // si la red está lenta o Firestore rechaza la escritura.
            if (user) {
                const actualizacion = updateDoc(
                    doc(db, "usuarios", user.uid),
                    { estadoServicio: "no_disponible", viajeActivo: null }
                );

                await Promise.race([
                    actualizacion.catch((error) => {
                        console.warn("⚠️ MOTI GO: no se pudo actualizar el estado antes de salir:", error);
                    }),
                    new Promise(resolve => setTimeout(resolve, 2000))
                ]);
            }
        } finally {
            try {
                await signOut(auth);
            } catch (error) {
                console.error("❌ MOTI GO: error cerrando sesión:", error);
            }

            window.location.replace("login.html");
        }
    });
}
