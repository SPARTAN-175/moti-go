import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    setDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";



let localidadesDisponibles = [];

async function cargarLocalidades() {
    try {
        const snapshot = await getDocs(collection(db, "destinos"));
        localidadesDisponibles = snapshot.docs
            .map(d => ({ id:d.id, ...d.data() }))
            .filter(d => d.activo !== false && d.municipio === "Ostuacán")
            .sort((a,b) => String(a.nombre||"").localeCompare(String(b.nombre||""), "es"));

        const datalist = document.getElementById("listaLocalidades");
        if (datalist) {
            datalist.innerHTML = localidadesDisponibles
                .map(d => `<option value="${String(d.nombre||"").replace(/"/g,"&quot;")}"></option>`)
                .join("");
        }
    } catch (error) {
        console.error("MOTI GO: no se pudieron cargar las localidades:", error);
    }
}

cargarLocalidades();

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

    const email =
        document.getElementById("email").value.trim().toLowerCase();

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
        !email ||
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


    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {

        alert(
            "Ingresa un correo electrónico válido. Lo necesitarás para recuperar tu contraseña."
        );

        document.getElementById("email").focus();

        return;
    }


    const localidadSeleccionada =
        localidadesDisponibles.find(
            item => String(item.nombre || "").toLowerCase() === localidad.toLowerCase()
        );

    if (!localidadSeleccionada) {

        alert(
            "Selecciona una localidad válida de la lista."
        );

        document.getElementById("localidad").focus();

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

                email,

                municipio,

                localidad,

                localidadId:
                    localidadSeleccionada.id,

                localidadLatitud:
                    Number(localidadSeleccionada.latitud),

                localidadLongitud:
                    Number(localidadSeleccionada.longitud),

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
                "Ese correo electrónico ya está registrado. Usa otro correo o recupera tu contraseña."
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
