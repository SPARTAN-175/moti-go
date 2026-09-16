import { auth, db }
from "./firebase-config.js";

import {
    onAuthStateChanged,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    sendPasswordResetEmail
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const BLOQUEO_PERFIL_MS =
    24 * 60 * 60 * 1000;


let usuarioActual = null;
let datosUsuario = null;


/* =========================================================
   ELEMENTOS
========================================================= */

const profileInitial =
    document.getElementById("profileInitial");

const profileName =
    document.getElementById("profileName");

const infoName =
    document.getElementById("infoName");

const infoEmail =
    document.getElementById("infoEmail");

const infoPhone =
    document.getElementById("infoPhone");

const infoMunicipio =
    document.getElementById("infoMunicipio");

const infoLocalidad =
    document.getElementById("infoLocalidad");

const btnEditarPerfil =
    document.getElementById("btnEditarPerfil");

const btnCambiarPassword =
    document.getElementById("btnCambiarPassword");

const btnRecuperarPassword =
    document.getElementById("btnRecuperarPassword");

const btnTerminos =
    document.getElementById("btnTerminos");


/* =========================================================
   MODALES
========================================================= */

const modalEditarPerfil =
    document.getElementById("modalEditarPerfil");

const modalPassword =
    document.getElementById("modalPassword");

const modalTerminos =
    document.getElementById("modalTerminos");


/* =========================================================
   UTILIDADES
========================================================= */

function abrirModal(modal) {

    if (!modal) return;

    modal.hidden = false;

    document.body.style.overflow = "hidden";
}


function cerrarModal(modal) {

    if (!modal) return;

    modal.hidden = true;

    document.body.style.overflow = "";
}


function mostrarMensaje(mensaje) {

    alert(mensaje);
}


/* =========================================================
   INICIAL
========================================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) return;

        usuarioActual = user;

        await cargarPerfil(user);

    }
);


/* =========================================================
   CARGAR PERFIL
========================================================= */

async function cargarPerfil(user) {

    try {

        const referencia =
            doc(
                db,
                "usuarios",
                user.uid
            );


        const snapshot =
            await getDoc(referencia);


        if (!snapshot.exists()) {

            throw new Error(
                "No existe el perfil del usuario."
            );

        }


        datosUsuario =
            snapshot.data();


        renderizarPerfil(
            user,
            datosUsuario
        );


        actualizarEstadoEdicion(
            datosUsuario
        );

    }
    catch (error) {

        console.error(
            "❌ MOTI GO - Error cargando perfil:",
            error
        );

        mostrarMensaje(
            "No se pudo cargar tu información."
        );

    }

}


/* =========================================================
   RENDER PERFIL
========================================================= */

function renderizarPerfil(
    user,
    datos
) {

    const nombre =
        datos.nombre ||
        user.displayName ||
        "Usuario";


    const inicial =
        nombre
            .trim()
            .charAt(0)
            .toUpperCase();


    if (profileInitial) {

        profileInitial.textContent =
            inicial || "U";

    }


    if (profileName) {

        profileName.textContent =
            nombre;

    }


    if (infoName) {

        infoName.textContent =
            nombre;

    }


    if (infoEmail) {

        infoEmail.textContent =
            datos.email ||
            user.email ||
            "Sin correo";

    }


    if (infoPhone) {

        infoPhone.textContent =
            datos.telefono ||
            "Sin teléfono";

    }


    if (infoMunicipio) {

        infoMunicipio.textContent =
            datos.municipio ||
            "Ostuacán";

    }


    if (infoLocalidad) {

        infoLocalidad.textContent =
            datos.localidad ||
            "Sin localidad";

    }

}


/* =========================================================
   BLOQUEO EDICIÓN
========================================================= */

function obtenerFechaUltimaEdicion(
    datos
) {

    const valor =
        datos?.ultimaActualizacionPerfil;


    if (!valor) return null;


    if (
        typeof valor.toMillis ===
        "function"
    ) {

        return valor.toMillis();

    }


    if (
        typeof valor.toDate ===
        "function"
    ) {

        return valor.toDate().getTime();

    }


    if (
        valor instanceof Date
    ) {

        return valor.getTime();

    }


    if (
        typeof valor === "number"
    ) {

        return valor;

    }


    if (
        typeof valor === "string"
    ) {

        const fecha =
            new Date(valor).getTime();

        return Number.isFinite(fecha)
            ? fecha
            : null;

    }


    return null;

}


/* =========================================================
   ESTADO DE EDICIÓN
========================================================= */

function obtenerEstadoEdicion(
    datos
) {

    const ultima =
        obtenerFechaUltimaEdicion(
            datos
        );


    if (!ultima) {

        return {
            bloqueado: false,
            restante: 0
        };

    }


    const transcurrido =
        Date.now() - ultima;


    const restante =
        BLOQUEO_PERFIL_MS -
        transcurrido;


    return {

        bloqueado:
            restante > 0,

        restante:
            Math.max(
                0,
                restante
            )

    };

}


/* =========================================================
   TEXTO BLOQUEO
========================================================= */

function formatearTiempo(
    milisegundos
) {

    const minutos =
        Math.ceil(
            milisegundos /
            60000
        );


    const horas =
        Math.floor(
            minutos / 60
        );


    const mins =
        minutos % 60;


    if (horas > 0) {

        return `${horas} h ${mins} min`;

    }


    return `${mins} min`;

}


/* =========================================================
   ACTUALIZAR AVISO
========================================================= */

function actualizarEstadoEdicion(
    datos
) {

    const aviso =
        document.getElementById(
            "perfilEdicionAviso"
        );


    const texto =
        document.getElementById(
            "perfilEdicionAvisoTexto"
        );


    const estado =
        obtenerEstadoEdicion(
            datos
        );


    if (!aviso || !texto) return;


    if (estado.bloqueado) {

        texto.textContent =
            `La información personal podrá volver a modificarse en aproximadamente ${formatearTiempo(estado.restante)}.`;


        if (btnEditarPerfil) {

            btnEditarPerfil.disabled =
                true;

            btnEditarPerfil.title =
                "La edición está temporalmente bloqueada.";

        }

    }
    else {

        texto.textContent =
            "Puedes actualizar tu información personal cuando sea necesario. Después de guardar, habrá un periodo de espera de 24 horas.";

        if (btnEditarPerfil) {

            btnEditarPerfil.disabled =
                false;

            btnEditarPerfil.title =
                "Editar información";

        }

    }

}


/* =========================================================
   ABRIR EDITAR PERFIL
========================================================= */

if (btnEditarPerfil) {

    btnEditarPerfil.addEventListener(
        "click",
        () => {

            const estado =
                obtenerEstadoEdicion(
                    datosUsuario
                );


            if (estado.bloqueado) {

                mostrarMensaje(
                    `Por seguridad, podrás volver a modificar tus datos en aproximadamente ${formatearTiempo(estado.restante)}.`
                );

                return;

            }


            document.getElementById(
                "editarNombre"
            ).value =
                datosUsuario.nombre ||
                "";


            document.getElementById(
                "editarTelefono"
            ).value =
                datosUsuario.telefono ||
                "";


            document.getElementById(
                "editarMunicipio"
            ).value =
                datosUsuario.municipio ||
                "Ostuacán";


            document.getElementById(
                "editarLocalidad"
            ).value =
                datosUsuario.localidad ||
                "";


            abrirModal(
                modalEditarPerfil
            );

        }
    );

}


/* =========================================================
   GUARDAR PERFIL
========================================================= */

const formEditarPerfil =
    document.getElementById(
        "formEditarPerfil"
    );


if (formEditarPerfil) {

    formEditarPerfil.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (!usuarioActual) {

                mostrarMensaje(
                    "No hay una sesión activa."
                );

                return;

            }


            const estado =
                obtenerEstadoEdicion(
                    datosUsuario
                );


            if (estado.bloqueado) {

                mostrarMensaje(
                    "La información todavía está temporalmente bloqueada."
                );

                return;

            }


            const nombre =
                document.getElementById(
                    "editarNombre"
                ).value.trim();


            const telefono =
                document.getElementById(
                    "editarTelefono"
                ).value.trim();


            const municipio =
                document.getElementById(
                    "editarMunicipio"
                ).value.trim();


            const localidad =
                document.getElementById(
                    "editarLocalidad"
                ).value.trim();


            if (!nombre) {

                mostrarMensaje(
                    "Escribe tu nombre."
                );

                return;

            }


            if (!telefono) {

                mostrarMensaje(
                    "Escribe tu teléfono."
                );

                return;

            }


            if (!localidad) {

                mostrarMensaje(
                    "Escribe tu localidad."
                );

                return;

            }


            try {

                const referencia =
                    doc(
                        db,
                        "usuarios",
                        usuarioActual.uid
                    );


                await updateDoc(
                    referencia,
                    {

                        nombre,

                        telefono,

                        municipio,

                        localidad,

                        ultimaActualizacionPerfil:
                            serverTimestamp()

                    }
                );


                datosUsuario = {

                    ...datosUsuario,

                    nombre,

                    telefono,

                    municipio,

                    localidad,

                    ultimaActualizacionPerfil:
                        Date.now()

                };


                renderizarPerfil(
                    usuarioActual,
                    datosUsuario
                );


                actualizarEstadoEdicion(
                    datosUsuario
                );


                cerrarModal(
                    modalEditarPerfil
                );


                mostrarMensaje(
                    "Tu información se actualizó correctamente."
                );

            }
            catch (error) {

                console.error(
                    "❌ Error actualizando perfil:",
                    error
                );


                mostrarMensaje(
                    "No se pudo actualizar la información."
                );

            }

        }
    );

}


/* =========================================================
   CAMBIAR CONTRASEÑA
========================================================= */

if (btnCambiarPassword) {

    btnCambiarPassword.addEventListener(
        "click",
        () => {

            if (!usuarioActual) {

                mostrarMensaje(
                    "No hay una sesión activa."
                );

                return;

            }


            document.getElementById(
                "formPassword"
            )?.reset();


            abrirModal(
                modalPassword
            );

        }
    );

}


/* =========================================================
   FORMULARIO CONTRASEÑA
========================================================= */

const formPassword =
    document.getElementById(
        "formPassword"
    );


if (formPassword) {

    formPassword.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (!usuarioActual) {

                mostrarMensaje(
                    "No hay una sesión activa."
                );

                return;

            }


            const actual =
                document.getElementById(
                    "passwordActual"
                ).value;


            const nueva =
                document.getElementById(
                    "passwordNueva"
                ).value;


            const confirmacion =
                document.getElementById(
                    "passwordConfirmacion"
                ).value;


            if (!actual) {

                mostrarMensaje(
                    "Escribe tu contraseña actual."
                );

                return;

            }


            if (nueva.length < 8) {

                mostrarMensaje(
                    "La nueva contraseña debe tener al menos 8 caracteres."
                );

                return;

            }


            if (nueva !== confirmacion) {

                mostrarMensaje(
                    "Las contraseñas nuevas no coinciden."
                );

                return;

            }


            if (!usuarioActual.email) {

                mostrarMensaje(
                    "Tu cuenta no tiene un correo electrónico válido."
                );

                return;

            }


            try {

                const credencial =
                    EmailAuthProvider.credential(
                        usuarioActual.email,
                        actual
                    );


                await reauthenticateWithCredential(
                    usuarioActual,
                    credencial
                );


                await updatePassword(
                    usuarioActual,
                    nueva
                );


                cerrarModal(
                    modalPassword
                );


                mostrarMensaje(
                    "Tu contraseña se actualizó correctamente."
                );


                formPassword.reset();

            }
            catch (error) {

                console.error(
                    "❌ Error cambiando contraseña:",
                    error
                );


                if (
                    error.code ===
                    "auth/invalid-credential" ||
                    error.code ===
                    "auth/wrong-password"
                ) {

                    mostrarMensaje(
                        "La contraseña actual es incorrecta."
                    );

                    return;

                }


                if (
                    error.code ===
                    "auth/requires-recent-login"
                ) {

                    mostrarMensaje(
                        "Por seguridad, vuelve a iniciar sesión e inténtalo nuevamente."
                    );

                    return;

                }


                mostrarMensaje(
                    "No se pudo cambiar la contraseña."
                );

            }

        }
    );

}


/* =========================================================
   RECUPERAR CONTRASEÑA
========================================================= */

if (btnRecuperarPassword) {

    btnRecuperarPassword.addEventListener(
        "click",
        async () => {

            const email =
                usuarioActual?.email ||
                datosUsuario?.email;


            if (!email) {

                mostrarMensaje(
                    "Tu cuenta todavía no tiene un correo electrónico disponible."
                );

                return;

            }


            try {

                await sendPasswordResetEmail(
                    auth,
                    email
                );


                mostrarMensaje(
                    `Enviamos un enlace para recuperar tu contraseña a ${email}.`
                );

            }
            catch (error) {

                console.error(
                    "❌ Error enviando recuperación:",
                    error
                );


                if (
                    error.code ===
                    "auth/invalid-email"
                ) {

                    mostrarMensaje(
                        "El correo electrónico de tu cuenta no es válido."
                    );

                    return;

                }


                mostrarMensaje(
                    "No se pudo enviar el correo de recuperación."
                );

            }

        }
    );

}


/* =========================================================
   TÉRMINOS
========================================================= */

if (btnTerminos) {

    btnTerminos.addEventListener(
        "click",
        () => {

            abrirModal(
                modalTerminos
            );

        }
    );

}


/* =========================================================
   CERRAR MODALES
========================================================= */

document
    .getElementById(
        "cerrarModalEditar"
    )
    ?.addEventListener(
        "click",
        () => cerrarModal(
            modalEditarPerfil
        )
    );


document
    .getElementById(
        "cancelarEditarPerfil"
    )
    ?.addEventListener(
        "click",
        () => cerrarModal(
            modalEditarPerfil
        )
    );


document
    .getElementById(
        "cerrarModalPassword"
    )
    ?.addEventListener(
        "click",
        () => cerrarModal(
            modalPassword
        )
    );


document
    .getElementById(
        "cancelarPassword"
    )
    ?.addEventListener(
        "click",
        () => cerrarModal(
            modalPassword
        )
    );


document
    .getElementById(
        "cerrarModalTerminos"
    )
    ?.addEventListener(
        "click",
        () => cerrarModal(
            modalTerminos
        )
    );


document
    .getElementById(
        "cerrarTerminos"
    )
    ?.addEventListener(
        "click",
        () => cerrarModal(
            modalTerminos
        )
    );


/* =========================================================
   CERRAR HACIENDO CLICK FUERA
========================================================= */

[
    modalEditarPerfil,
    modalPassword,
    modalTerminos
]
.forEach(
    modal => {

        if (!modal) return;


        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    modal
                ) {

                    cerrarModal(
                        modal
                    );

                }

            }
        );

    }
);
