/* =========================================================
   MOTI GO — REGISTRO DE TIENDA
   registro-tienda.js
========================================================= */


/* =========================================================
   FIREBASE
========================================================= */

import {
    auth,
    db
} from "./js/firebase-config.js";


import {
    createUserWithEmailAndPassword
} from
"https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    runTransaction,
    serverTimestamp
} from
"https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================================================
   ELEMENTOS
========================================================= */

const estadoVerificacion =
    document.getElementById(
        "estadoVerificacion"
    );


const formRegistroTienda =
    document.getElementById(
        "formRegistroTienda"
    );


const registroExitoso =
    document.getElementById(
        "registroExitoso"
    );


const registroInvalido =
    document.getElementById(
        "registroInvalido"
    );


const mensajeInvitacionInvalida =
    document.getElementById(
        "mensajeInvitacionInvalida"
    );


const mensajeError =
    document.getElementById(
        "mensajeError"
    );


const btnRegistrar =
    document.getElementById(
        "btnRegistrar"
    );


const btnObtenerUbicacion =
    document.getElementById(
        "btnObtenerUbicacion"
    );


const estadoUbicacion =
    document.getElementById(
        "estadoUbicacion"
    );


const btnEntrarTienda =
    document.getElementById(
        "btnEntrarTienda"
    );


/* =========================================================
   CÓDIGO DE INVITACIÓN
========================================================= */

const parametros =
    new URLSearchParams(
        window.location.search
    );


const codigoInvitacion =
    parametros.get(
        "codigo"
    );


let datosInvitacion =
    null;


/* =========================================================
   MOSTRAR ERROR
========================================================= */

function mostrarError(
    mensaje
) {

    if (!mensajeError) {
        return;
    }


    mensajeError.textContent =
        mensaje;


    mensajeError.style.display =
        "block";

}


/* =========================================================
   OCULTAR ERROR
========================================================= */

function ocultarError() {

    if (!mensajeError) {
        return;
    }


    mensajeError.textContent =
        "";


    mensajeError.style.display =
        "none";

}


/* =========================================================
   ESCAPAR HTML
========================================================= */

function escaparHTML(
    texto
) {

    return String(
        texto ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   MOSTRAR INVITACIÓN INVÁLIDA
========================================================= */

function mostrarInvitacionInvalida(
    mensaje
) {

    if (estadoVerificacion) {

        estadoVerificacion.style.display =
            "none";

    }


    if (formRegistroTienda) {

        formRegistroTienda.style.display =
            "none";

    }


    if (registroInvalido) {

        registroInvalido.style.display =
            "block";

    }


    if (
        mensajeInvitacionInvalida &&
        mensaje
    ) {

        mensajeInvitacionInvalida.textContent =
            mensaje;

    }

}


/* =========================================================
   VERIFICAR INVITACIÓN
========================================================= */

async function verificarInvitacion() {

    if (!codigoInvitacion) {

        mostrarInvitacionInvalida(
            "No encontramos un código de invitación en este enlace."
        );

        return false;

    }


    try {

        const referencia =
            doc(
                db,
                "invitacionesTiendas",
                codigoInvitacion
            );


        const snapshot =
            await getDoc(
                referencia
            );


        if (!snapshot.exists()) {

            mostrarInvitacionInvalida(
                "La invitación no existe o el enlace es incorrecto."
            );

            return false;

        }


        const datos =
            snapshot.data();


        if (
            datos.estado !==
            "pendiente"
        ) {

            mostrarInvitacionInvalida(
                "Esta invitación ya fue utilizada y no puede volver a registrarse."
            );

            return false;

        }


        datosInvitacion = {

            id:
                snapshot.id,

            ...datos

        };


        if (estadoVerificacion) {

            estadoVerificacion.style.display =
                "none";

        }


        if (formRegistroTienda) {

            formRegistroTienda.style.display =
                "block";

        }


        console.log(
            "✅ MOTI GO REGISTRO: invitación válida:",
            codigoInvitacion
        );


        return true;

    }
    catch (error) {

        console.error(
            "❌ Error verificando invitación:",
            error
        );


        mostrarInvitacionInvalida(
            "No fue posible verificar la invitación. Intenta nuevamente."
        );


        return false;

    }

}


/* =========================================================
   OBTENER UBICACIÓN
========================================================= */

if (btnObtenerUbicacion) {

    btnObtenerUbicacion.addEventListener(
        "click",
        () => {

            if (
                !navigator.geolocation
            ) {

                if (estadoUbicacion) {

                    estadoUbicacion.textContent =
                        "Tu dispositivo no permite obtener la ubicación.";

                }

                return;

            }


            btnObtenerUbicacion.disabled =
                true;


            if (estadoUbicacion) {

                estadoUbicacion.textContent =
                    "Obteniendo ubicación...";

            }


            navigator.geolocation.getCurrentPosition(

                posicion => {

                    const latitud =
                        posicion.coords.latitude;


                    const longitud =
                        posicion.coords.longitude;


                    const campoLatitud =
                        document.getElementById(
                            "latitud"
                        );


                    const campoLongitud =
                        document.getElementById(
                            "longitud"
                        );


                    if (campoLatitud) {

                        campoLatitud.value =
                            latitud;

                    }


                    if (campoLongitud) {

                        campoLongitud.value =
                            longitud;

                    }


                    if (estadoUbicacion) {

                        estadoUbicacion.textContent =
                            "✓ Ubicación obtenida correctamente.";

                    }


                    btnObtenerUbicacion.disabled =
                        false;

                },

                error => {

                    console.error(
                        "Error obteniendo ubicación:",
                        error
                    );


                    if (estadoUbicacion) {

                        estadoUbicacion.textContent =
                            "No pudimos obtener tu ubicación. Puedes introducir las coordenadas manualmente.";

                    }


                    btnObtenerUbicacion.disabled =
                        false;

                },

                {

                    enableHighAccuracy:
                        true,

                    timeout:
                        15000,

                    maximumAge:
                        0

                }

            );

        }
    );

}


/* =========================================================
   OBTENER SIGUIENTE TIENDA ID
========================================================= */

async function obtenerSiguienteTiendaId() {

    const referenciaTiendas =
        collection(
            db,
            "tiendas"
        );


    const snapshot =
        await getDocs(
            referenciaTiendas
        );


    let mayorNumero =
        0;


    snapshot.forEach(
        documento => {

            const coincidencia =
                documento.id.match(
                    /^tienda_(\d+)$/
                );


            if (!coincidencia) {
                return;
            }


            const numero =
                Number(
                    coincidencia[1]
                );


            if (
                Number.isFinite(numero) &&
                numero > mayorNumero
            ) {

                mayorNumero =
                    numero;

            }

        }
    );


    const siguiente =
        mayorNumero + 1;


    return `tienda_${String(
        siguiente
    ).padStart(
        3,
        "0"
    )}`;

}


/* =========================================================
   CREAR REGISTRO
========================================================= */

if (formRegistroTienda) {

    formRegistroTienda.addEventListener(
        "submit",
        async evento => {

            evento.preventDefault();


            ocultarError();


            if (!datosInvitacion) {

                mostrarError(
                    "La invitación ya no está disponible."
                );

                return;

            }


            const nombre =
                document.getElementById(
                    "nombreTienda"
                ).value.trim();


            const tipo =
                document.getElementById(
                    "tipoTienda"
                ).value.trim();


            const municipio =
                document.getElementById(
                    "municipio"
                ).value.trim();


            const direccion =
                document.getElementById(
                    "direccion"
                ).value.trim();


            const latitud =
                Number(
                    document.getElementById(
                        "latitud"
                    ).value
                );


            const longitud =
                Number(
                    document.getElementById(
                        "longitud"
                    ).value
                );


            const correo =
                document.getElementById(
                    "correo"
                ).value.trim();


            const password =
                document.getElementById(
                    "password"
                ).value;


            const confirmarPassword =
                document.getElementById(
                    "confirmarPassword"
                ).value;


            /* -------------------------------------------------
               VALIDACIONES
            ------------------------------------------------- */

            if (
                !nombre ||
                !tipo ||
                !municipio ||
                !direccion
            ) {

                mostrarError(
                    "Completa todos los datos del negocio."
                );

                return;

            }


            if (
                !Number.isFinite(latitud) ||
                !Number.isFinite(longitud)
            ) {

                mostrarError(
                    "Necesitamos una ubicación válida para la tienda."
                );

                return;

            }


            if (
                latitud < -90 ||
                latitud > 90 ||
                longitud < -180 ||
                longitud > 180
            ) {

                mostrarError(
                    "Las coordenadas de ubicación no son válidas."
                );

                return;

            }


            if (
                password.length < 6
            ) {

                mostrarError(
                    "La contraseña debe tener al menos 6 caracteres."
                );

                return;

            }


            if (
                password !==
                confirmarPassword
            ) {

                mostrarError(
                    "Las contraseñas no coinciden."
                );

                return;

            }


            /* -------------------------------------------------
               PREPARAR BOTÓN
            ------------------------------------------------- */

            btnRegistrar.disabled =
                true;


            btnRegistrar.textContent =
                "Creando tienda...";


            try {

                /* ---------------------------------------------
                   CREAR CUENTA AUTH
                --------------------------------------------- */

                const credenciales =
                    await createUserWithEmailAndPassword(
                        auth,
                        correo,
                        password
                    );


                const usuario =
                    credenciales.user;


                console.log(
                    "✅ Cuenta Auth creada:",
                    usuario.uid
                );


                /* ---------------------------------------------
                   GENERAR TIENDA ID
                --------------------------------------------- */

                const tiendaId =
                    await obtenerSiguienteTiendaId();


                console.log(
                    "🏪 Nuevo tiendaId:",
                    tiendaId
                );


                const referenciaUsuario =
                    doc(
                        db,
                        "usuarios",
                        usuario.uid
                    );


                const referenciaTienda =
                    doc(
                        db,
                        "tiendas",
                        tiendaId
                    );


                const referenciaInvitacion =
                    doc(
                        db,
                        "invitacionesTiendas",
                        codigoInvitacion
                    );


                /* ---------------------------------------------
                   GUARDAR TODO
                --------------------------------------------- */

                await runTransaction(
                    db,
                    async transaction => {

                        const invitacionActual =
                            await transaction.get(
                                referenciaInvitacion
                            );


                        if (
                            !invitacionActual.exists()
                        ) {

                            throw new Error(
                                "INVITACION_NO_EXISTE"
                            );

                        }


                        const datosActuales =
                            invitacionActual.data();


                        if (
                            datosActuales.estado !==
                            "pendiente"
                        ) {

                            throw new Error(
                                "INVITACION_YA_USADA"
                            );

                        }


                        /* -------------------------------------
                           USUARIO
                        ------------------------------------- */

                        transaction.set(
                            referenciaUsuario,
                            {

                                tipo:
                                    "tienda",

                                tiendaId,

                                correo:
                                    correo,

                                nombre:
                                    nombre,

                                activo:
                                    true,

                                creadoEn:
                                    serverTimestamp()

                            }
                        );


                        /* -------------------------------------
                           TIENDA
                        ------------------------------------- */

                        transaction.set(
                            referenciaTienda,
                            {

                                nombre,

                                tipo,

                                municipio,

                                direccion,

                                latitud,

                                longitud,

                                activa:
                                    true,

                                creadoEn:
                                    serverTimestamp()

                            }
                        );


                        /* -------------------------------------
                           CONSUMIR INVITACIÓN
                        ------------------------------------- */

                        transaction.update(
                            referenciaInvitacion,
                            {

                                estado:
                                    "usado",

                                usadoEn:
                                    serverTimestamp(),

                                tiendaId

                            }
                        );

                    }
                );


                console.log(
                    "🎉 MOTI GO REGISTRO: tienda creada correctamente."
                );


                /* ---------------------------------------------
                   MOSTRAR ÉXITO
                --------------------------------------------- */

                if (formRegistroTienda) {

                    formRegistroTienda.style.display =
                        "none";

                }


                if (estadoVerificacion) {

                    estadoVerificacion.style.display =
                        "none";

                }


                if (registroExitoso) {

                    registroExitoso.style.display =
                        "block";

                }


                const datosTiendaCreada =
                    document.getElementById(
                        "datosTiendaCreada"
                    );


                if (datosTiendaCreada) {

                    datosTiendaCreada.innerHTML = `

                        <strong>
                            ${escaparHTML(
                                nombre
                            )}
                        </strong>

                        <br>

                        <span>
                            ID de tienda:
                            ${escaparHTML(
                                tiendaId
                            )}
                        </span>

                        <br>

                        <span>
                            Cuenta:
                            ${escaparHTML(
                                correo
                            )}
                        </span>

                    `;

                }


                /* ---------------------------------------------
                   ENTRAR A TIENDA
                --------------------------------------------- */

                if (btnEntrarTienda) {

                    btnEntrarTienda.addEventListener(
                        "click",
                        () => {

                            window.location.href =
                                "./tienda/dashboard-tienda.html";

                        }
                    );

                }

            }
            catch (error) {

                console.error(
                    "❌ Error creando tienda:",
                    error
                );


                let mensaje =
                    "No fue posible completar el registro.";


                if (
                    error.message ===
                    "INVITACION_NO_EXISTE"
                ) {

                    mensaje =
                        "La invitación ya no existe.";

                }
                else if (
                    error.message ===
                    "INVITACION_YA_USADA"
                ) {

                    mensaje =
                        "Esta invitación ya fue utilizada.";

                }
                else if (
                    error.code ===
                    "auth/email-already-in-use"
                ) {

                    mensaje =
                        "Ese correo electrónico ya está registrado.";

                }
                else if (
                    error.code ===
                    "auth/invalid-email"
                ) {

                    mensaje =
                        "El correo electrónico no es válido.";

                }
                else if (
                    error.code ===
                    "auth/weak-password"
                ) {

                    mensaje =
                        "La contraseña es demasiado débil.";

                }
                else if (
                    error.code ===
                    "permission-denied"
                ) {

                    mensaje =
                        "Firebase no permitió completar el registro. Debemos revisar las reglas de Firestore.";

                }


                mostrarError(
                    mensaje
                );


                btnRegistrar.disabled =
                    false;


                btnRegistrar.textContent =
                    "Crear mi tienda";

            }

        }
    );

}


/* =========================================================
   INICIAR
========================================================= */

verificarInvitacion();


console.log(
    "🚀 MOTI GO REGISTRO: página iniciada."
);
