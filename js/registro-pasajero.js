import { auth, db }
from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================================================
   MOTI GO — REGISTRO PASAJERO
   Correo real + localidades desde Firebase
========================================================= */

const MUNICIPIO_MOTIGO = "Ostuacán";

let localidadesDisponibles = [];


/* =========================================================
   ELEMENTOS
========================================================= */

const formRegistro =
    document.getElementById("registroForm");

const nombreInput =
    document.getElementById("nombre");

const telefonoInput =
    document.getElementById("telefono");

const emailInput =
    document.getElementById("email");

const municipioInput =
    document.getElementById("municipio");

const localidadInput =
    document.getElementById("localidad");

const passwordInput =
    document.getElementById("password");

const confirmarPasswordInput =
    document.getElementById("confirmarPassword");

const listaLocalidades =
    document.getElementById("listaLocalidades");


/* =========================================================
   UTILIDADES
========================================================= */

function mostrarMensaje(mensaje) {
    alert(mensaje);
}


function normalizarTexto(valor) {

    return String(valor || "")
        .trim()
        .toLowerCase();

}


function validarEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
        .test(email);

}


function escaparTexto(valor) {

    return String(valor || "").trim();

}


/* =========================================================
   CARGAR LOCALIDADES DESDE FIREBASE
========================================================= */

async function cargarLocalidades() {

    if (!listaLocalidades) {

        console.warn(
            "⚠️ MOTI GO: no existe #listaLocalidades en el formulario."
        );

        return;
    }


    try {

        console.log(
            "📍 MOTI GO: cargando localidades del municipio..."
        );


        const snapshot =
            await getDocs(
                collection(db, "destinos")
            );


        localidadesDisponibles = [];


        snapshot.forEach((docSnap) => {

            const datos =
                docSnap.data() || {};


            if (
                datos.activo === false ||
                normalizarTexto(datos.municipio) !==
                    normalizarTexto(MUNICIPIO_MOTIGO)
            ) {

                return;

            }


            const nombre =
                escaparTexto(
                    datos.nombre ||
                    datos.localidad ||
                    datos.nombreLocalidad
                );


            if (!nombre) return;


            localidadesDisponibles.push({

                id:
                    docSnap.id,

                nombre,

                latitud:
                    Number.isFinite(
                        Number(datos.latitud)
                    )
                        ? Number(datos.latitud)
                        : null,

                longitud:
                    Number.isFinite(
                        Number(datos.longitud)
                    )
                        ? Number(datos.longitud)
                        : null

            });

        });


        /* ---------------------------------------------
           ORDENAR ALFABÉTICAMENTE
        --------------------------------------------- */

        localidadesDisponibles.sort(
            (a, b) =>
                a.nombre.localeCompare(
                    b.nombre,
                    "es",
                    {
                        sensitivity: "base"
                    }
                )
        );


        listaLocalidades.innerHTML = "";


        /* ---------------------------------------------
           CREAR OPCIONES DEL AUTOCOMPLETADO
        --------------------------------------------- */

        localidadesDisponibles.forEach(
            (localidad) => {

                const option =
                    document.createElement("option");


                option.value =
                    localidad.nombre;


                listaLocalidades.appendChild(
                    option
                );

            }
        );


        console.log(
            "📍 MOTI GO: localidades disponibles:",
            localidadesDisponibles.length
        );

    }
    catch (error) {

        console.error(
            "❌ MOTI GO: error cargando localidades:",
            error
        );


        localidadesDisponibles = [];


        if (listaLocalidades) {

            listaLocalidades.innerHTML = "";

        }

    }

}


/* =========================================================
   OBTENER LOCALIDAD SELECCIONADA
========================================================= */

function obtenerLocalidadSeleccionada(valor) {

    const buscada =
        normalizarTexto(valor);


    return localidadesDisponibles.find(
        localidad =>
            normalizarTexto(
                localidad.nombre
            ) === buscada
    ) || null;

}


/* =========================================================
   MUNICIPIO
========================================================= */

if (municipioInput) {

    municipioInput.value =
        MUNICIPIO_MOTIGO;

    municipioInput.readOnly =
        true;

}


/* =========================================================
   INICIALIZACIÓN
========================================================= */

cargarLocalidades();


/* =========================================================
   REGISTRO DEL PASAJERO
========================================================= */

if (formRegistro) {

    formRegistro.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            /* -----------------------------------------
               LEER FORMULARIO
            ----------------------------------------- */

            const nombre =
                escaparTexto(
                    nombreInput?.value
                );


            const telefono =
                escaparTexto(
                    telefonoInput?.value
                );


            const email =
                escaparTexto(
                    emailInput?.value
                ).toLowerCase();


            const municipio =
                MUNICIPIO_MOTIGO;


            const localidad =
                escaparTexto(
                    localidadInput?.value
                );


            const password =
                passwordInput?.value ||
                "";


            const confirmarPassword =
                confirmarPasswordInput?.value ||
                "";


            /* -----------------------------------------
               VALIDAR NOMBRE
            ----------------------------------------- */

            if (!nombre) {

                mostrarMensaje(
                    "Escribe tu nombre completo."
                );

                return;

            }


            /* -----------------------------------------
               VALIDAR TELÉFONO
            ----------------------------------------- */

            if (!telefono) {

                mostrarMensaje(
                    "Escribe tu número de teléfono."
                );

                return;

            }


            /* -----------------------------------------
               VALIDAR CORREO
            ----------------------------------------- */

            if (!email) {

                mostrarMensaje(
                    "Escribe un correo electrónico real y válido."
                );

                return;

            }


            if (!validarEmail(email)) {

                mostrarMensaje(
                    "El correo electrónico no parece válido. Revísalo e inténtalo nuevamente."
                );

                return;

            }


            /* -----------------------------------------
               VALIDAR LOCALIDAD
            ----------------------------------------- */

            if (!localidad) {

                mostrarMensaje(
                    "Selecciona tu localidad."
                );

                return;

            }


            const localidadSeleccionada =
                obtenerLocalidadSeleccionada(
                    localidad
                );


            if (!localidadSeleccionada) {

                mostrarMensaje(
                    "Selecciona una localidad válida de la lista."
                );


                localidadInput?.focus();

                return;

            }


            /* -----------------------------------------
               VALIDAR CONTRASEÑA
            ----------------------------------------- */

            if (password.length < 8) {

                mostrarMensaje(
                    "La contraseña debe tener al menos 8 caracteres."
                );

                return;

            }


            if (
                password !==
                confirmarPassword
            ) {

                mostrarMensaje(
                    "Las contraseñas no coinciden."
                );

                return;

            }


            /* -----------------------------------------
               EVITAR DOBLE ENVÍO
            ----------------------------------------- */

            const botonSubmit =
                formRegistro.querySelector(
                    'button[type="submit"]'
                );


            if (botonSubmit) {

                botonSubmit.disabled =
                    true;


                botonSubmit.dataset.textoOriginal =
                    botonSubmit.textContent;


                botonSubmit.textContent =
                    "Creando cuenta...";

            }


            try {

                console.log(
                    "👤 MOTI GO: creando cuenta de pasajero..."
                );


                /* =====================================
                   FIREBASE AUTH
                   CORREO REAL
                ===================================== */

                const resultado =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    resultado.user;


                /* =====================================
                   CREAR PERFIL EN FIRESTORE
                ===================================== */

                const referenciaUsuario =
                    doc(
                        db,
                        "usuarios",
                        user.uid
                    );


                await setDoc(
                    referenciaUsuario,
                    {

                        nombre,

                        telefono,

                        email:
                            user.email ||
                            email,

                        municipio,

                        localidad:
                            localidadSeleccionada.nombre,

                        localidadId:
                            localidadSeleccionada.id,

                        localidadLatitud:
                            localidadSeleccionada.latitud,

                        localidadLongitud:
                            localidadSeleccionada.longitud,

                        tipo:
                            "cliente",

                        passwordTemporal:
                            false,

                        fechaRegistro:
                            serverTimestamp(),

                        latitud:
                            null,

                        longitud:
                            null,

                        viajeActivo:
                            null,

                        estadoServicio:
                            "no_disponible"

                    },
                    {
                        merge: true
                    }
                );


                /* =====================================
                   VERIFICACIÓN DEL CORREO
                ===================================== */

                try {

                    await sendEmailVerification(
                        user
                    );


                    console.log(
                        "📧 MOTI GO: correo de verificación enviado."
                    );

                }
                catch (errorVerificacion) {

                    console.warn(
                        "⚠️ MOTI GO: no se pudo enviar la verificación:",
                        errorVerificacion
                    );

                }


                console.log(
                    "✅ MOTI GO: pasajero registrado correctamente:",
                    user.uid
                );


                mostrarMensaje(
                    "¡Cuenta creada correctamente! Te enviamos un correo para verificar tu dirección."
                );


                /* =====================================
                   IR AL DASHBOARD
                ===================================== */

                window.location.href =
                    "./dashboard-cliente.html";


            }
            catch (error) {

                console.error(
                    "❌ MOTI GO: error registrando pasajero:",
                    error
                );


                /* =====================================
                   ERRORES DE FIREBASE AUTH
                ===================================== */

                if (
                    error.code ===
                    "auth/email-already-in-use"
                ) {

                    mostrarMensaje(
                        "Ese correo electrónico ya está registrado. Intenta iniciar sesión o utiliza otro correo."
                    );

                    return;

                }


                if (
                    error.code ===
                    "auth/invalid-email"
                ) {

                    mostrarMensaje(
                        "El correo electrónico no es válido."
                    );

                    return;

                }


                if (
                    error.code ===
                    "auth/weak-password"
                ) {

                    mostrarMensaje(
                        "La contraseña es demasiado débil. Usa al menos 8 caracteres."
                    );

                    return;

                }


                if (
                    error.code ===
                    "auth/network-request-failed"
                ) {

                    mostrarMensaje(
                        "No se pudo conectar con el servicio. Revisa tu conexión a internet e inténtalo nuevamente."
                    );

                    return;

                }


                if (
                    error.code ===
                    "permission-denied"
                ) {

                    mostrarMensaje(
                        "La cuenta se creó, pero no fue posible guardar todos los datos del perfil. Revisa las reglas de Firestore."
                    );

                    return;

                }


                mostrarMensaje(
                    "No se pudo crear la cuenta. Inténtalo nuevamente."
                );

            }
            finally {

                if (botonSubmit) {

                    botonSubmit.disabled =
                        false;


                    botonSubmit.textContent =
                        botonSubmit.dataset.textoOriginal ||
                        "Crear cuenta";

                }

            }

        }
    );

}


/* =========================================================
   AUTOCOMPLETADO / VALIDACIÓN LOCALIDAD
========================================================= */

if (localidadInput) {

    localidadInput.addEventListener(
        "input",
        () => {

            const valor =
                normalizarTexto(
                    localidadInput.value
                );


            const encontrada =
                localidadesDisponibles.find(
                    localidad =>
                        normalizarTexto(
                            localidad.nombre
                        ) === valor
                );


            if (
                valor &&
                encontrada
            ) {

                localidadInput.dataset.localidadId =
                    encontrada.id;

            }
            else {

                delete localidadInput.dataset.localidadId;

            }

        }
    );

}


/* =========================================================
   LOG
========================================================= */

console.log(
    "🧑‍💻 MOTI GO — REGISTRO PASAJERO CARGADO."
);
