import { auth, db }
from "./firebase-config.js";

import {
    onAuthStateChanged,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const BLOQUEO_PERFIL_MS =
    24 * 60 * 60 * 1000;


let usuarioActual = null;
let datosUsuario = null;
let localidadesDisponibles = [];

/* =========================================================
   LOCALIDADES — AUTOCOMPLETADO
   MISMO SISTEMA UTILIZADO EN MOTI
========================================================= */

let localidadSeleccionadaPerfil = null;


/* =========================================================
   NORMALIZAR TEXTO PARA BÚSQUEDA DE LOCALIDADES
========================================================= */

function normalizarTextoPerfil(texto = "") {

    return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}


/* =========================================================
   PREPARAR BÚSQUEDA DE LOCALIDADES
========================================================= */

function prepararBusquedaLocalidadPerfil() {

    const campo =
        document.getElementById(
            "editarLocalidad"
        );


    if (!campo) {

        console.warn(
            "⚠️ MOTI GO: no existe #editarLocalidad"
        );

        return;

    }


    /*
       Si el HTML ya tiene un <datalist>
       con este ID, lo reemplazamos por
       una lista visual propia.

       Esto es importante porque el sistema
       de MOTI utiliza una lista dinámica,
       no el desplegable nativo del navegador.
    */

    let lista =
        document.getElementById(
            "listaLocalidadesPerfil"
        );


    if (
        lista &&
        lista.tagName &&
        lista.tagName.toLowerCase() ===
            "datalist"
    ) {

        const nuevaLista =
            document.createElement(
                "div"
            );

        nuevaLista.id =
            "listaLocalidadesPerfil";

        lista.replaceWith(
            nuevaLista
        );

        lista =
            nuevaLista;

    }


    /*
       Si por alguna razón todavía no existe,
       la creamos.
    */

    if (!lista) {

        lista =
            document.createElement(
                "div"
            );

        lista.id =
            "listaLocalidadesPerfil";


        const padre =
            campo.parentElement;


        if (padre) {

            padre.appendChild(
                lista
            );

        }

    }


    /*
       Estilos de la lista.
    */

    lista.style.display =
        "none";

    lista.style.position =
        "absolute";

    lista.style.left =
        "0";

    lista.style.right =
        "0";

    lista.style.top =
        "calc(100% + 5px)";

    lista.style.zIndex =
        "99999";

    lista.style.background =
        "#ffffff";

    lista.style.border =
        "1px solid #dfe5eb";

    lista.style.borderRadius =
        "12px";

    lista.style.boxShadow =
        "0 10px 25px rgba(0,0,0,.10)";

    lista.style.maxHeight =
        "240px";

    lista.style.overflowY =
        "auto";


    /*
       El padre necesita posición relativa
       para que la lista quede justo debajo
       del campo.
    */

    const padre =
        campo.parentElement;


    if (padre) {

        const posicion =
            getComputedStyle(
                padre
            ).position;


        if (
            posicion ===
            "static"
        ) {

            padre.style.position =
                "relative";

        }

    }


    /*
       No utilizamos el datalist nativo.
    */

    campo.removeAttribute(
        "list"
    );


    /*
       Evitar registrar el evento
       más de una vez.
    */

    if (
        campo.dataset.motiLocalidadPreparada ===
        "true"
    ) {

        return;

    }


    campo.dataset.motiLocalidadPreparada =
        "true";


    /*
       Buscar mientras escribe.
    */

    campo.addEventListener(
        "input",
        buscarLocalidadesPerfil
    );


    /*
       Cerrar resultados al perder el foco.
    */

    campo.addEventListener(
        "blur",
        () => {

            setTimeout(
                () => {

                    if (lista) {

                        lista.style.display =
                            "none";

                    }

                },
                180
            );

        }
    );


    /*
       Si ya existe una localidad en el perfil,
       recuperar sus datos.
    */

    if (
        campo.value.trim()
    ) {

        cargarLocalidadActualPerfil(
            campo.value.trim()
        );

    }

}


/* =========================================================
   BUSCAR LOCALIDADES
========================================================= */

async function buscarLocalidadesPerfil() {

    const campo =
        document.getElementById(
            "editarLocalidad"
        );

    const lista =
        document.getElementById(
            "listaLocalidadesPerfil"
        );


    if (!campo || !lista) {

        return;

    }


    const textoOriginal =
        campo.value.trim();


    const texto =
        normalizarTextoPerfil(
            textoOriginal
        );


    /*
       Al modificar el texto,
       la selección anterior deja de ser válida.
    */

    localidadSeleccionadaPerfil =
        null;


    delete campo.dataset.localidadId;
    delete campo.dataset.localidadNombre;
    delete campo.dataset.localidadLatitud;
    delete campo.dataset.localidadLongitud;


    /*
       Con menos de 2 caracteres
       no hacemos búsqueda.
    */

    if (
        texto.length < 2
    ) {

        lista.innerHTML =
            "";

        lista.style.display =
            "none";

        return;

    }


    lista.innerHTML =
        "";

    lista.style.display =
        "none";


    try {

        console.log(
            "📍 MOTI GO: buscando localidad:",
            textoOriginal
        );


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "destinos"
                )
            );


        const encontrados =
            [];


        snapshot.forEach(
            destinoDoc => {

                const destino =
                    destinoDoc.data();


                const nombre =
                    String(
                        destino.nombre ||
                        ""
                    ).trim();


                const municipio =
                    String(
                        destino.municipio ||
                        ""
                    ).trim();


                if (
                    destino.activo ===
                    false
                ) {

                    return;

                }


                if (
                    normalizarTextoPerfil(
                        municipio
                    ) !==
                    normalizarTextoPerfil(
                        "Ostuacán"
                    )
                ) {

                    return;

                }


                if (
                    normalizarTextoPerfil(
                        nombre
                    ).includes(
                        texto
                    )
                ) {

                    encontrados.push({

                        id:
                            destinoDoc.id,

                        ...destino

                    });

                }

            }
        );


        encontrados.sort(
            (a, b) =>
                String(
                    a.nombre ||
                    ""
                ).localeCompare(
                    String(
                        b.nombre ||
                        ""
                    ),
                    "es",
                    {
                        sensitivity:
                            "base"
                    }
                )
        );


        localidadesDisponibles =
            encontrados;


        if (
            encontrados.length ===
            0
        ) {

            console.log(
                "📍 MOTI GO: no se encontraron localidades para:",
                textoOriginal
            );

            return;

        }


        encontrados
            .slice(
                0,
                10
            )
            .forEach(
                destino => {

                    const item =
                        document.createElement(
                            "button"
                        );


                    item.type =
                        "button";


                    item.className =
                        "item-destino";


                    item.textContent =
                        destino.nombre;


                    item.style.display =
                        "block";

                    item.style.width =
                        "100%";

                    item.style.padding =
                        "13px 15px";

                    item.style.cursor =
                        "pointer";

                    item.style.fontFamily =
                        "inherit";

                    item.style.fontSize =
                        "14px";

                    item.style.fontWeight =
                        "500";

                    item.style.color =
                        "#172033";

                    item.style.textAlign =
                        "left";

                    item.style.border =
                        "0";

                    item.style.borderBottom =
                        "1px solid #f0f2f4";

                    item.style.background =
                        "#ffffff";


                    item.addEventListener(
                        "mouseenter",
                        () => {

                            item.style.background =
                                "#f3f8f5";

                        }
                    );


                    item.addEventListener(
                        "mouseleave",
                        () => {

                            item.style.background =
                                "#ffffff";

                        }
                    );


                    /*
                       Evitar que el blur del
                       input cierre la lista
                       antes de seleccionar.
                    */

                    item.addEventListener(
                        "mousedown",
                        event => {

                            event.preventDefault();

                        }
                    );


                    item.addEventListener(
                        "click",
                        () => {

                            seleccionarLocalidadPerfil(
                                destino
                            );

                        }
                    );


                    lista.appendChild(
                        item
                    );

                }
            );


        lista.style.display =
            "block";


        console.log(
            "📍 MOTI GO: resultados encontrados:",
            encontrados.length
        );

    }
    catch (error) {

        console.error(
            "❌ MOTI GO: error buscando localidades:",
            error
        );


        lista.innerHTML =
            "";

        lista.style.display =
            "none";

    }

}


/* =========================================================
   SELECCIONAR LOCALIDAD
========================================================= */

function seleccionarLocalidadPerfil(
    destino
) {

    const campo =
        document.getElementById(
            "editarLocalidad"
        );

    const lista =
        document.getElementById(
            "listaLocalidadesPerfil"
        );


    if (!campo) {

        return;

    }


    localidadSeleccionadaPerfil =
        destino;


    campo.value =
        destino.nombre ||
        "";


    campo.dataset.localidadId =
        destino.id ||
        "";


    campo.dataset.localidadNombre =
        destino.nombre ||
        "";


    campo.dataset.localidadLatitud =
        destino.latitud ??
        destino.latitude ??
        "";


    campo.dataset.localidadLongitud =
        destino.longitud ??
        destino.longitude ??
        "";


    /*
       Dejamos también el destino
       en localidadesDisponibles para
       que el guardado actual del perfil
       pueda encontrarlo.
    */

    localidadesDisponibles = [
        destino
    ];


    if (lista) {

        lista.innerHTML =
            "";

        lista.style.display =
            "none";

    }


    console.log(
        "📍 MOTI GO: localidad seleccionada:",
        destino
    );

}


/* =========================================================
   RECUPERAR LOCALIDAD ACTUAL
========================================================= */

async function cargarLocalidadActualPerfil(
    nombreLocalidad
) {

    if (
        !nombreLocalidad
    ) {

        return;

    }


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "destinos"
                )
            );


        const nombreBuscado =
            normalizarTextoPerfil(
                nombreLocalidad
            );


        const encontrada =
            snapshot.docs.find(
                destinoDoc => {

                    const destino =
                        destinoDoc.data();


                    return (
                        destino.activo !== false &&
                        normalizarTextoPerfil(
                            destino.municipio
                        ) ===
                        normalizarTextoPerfil(
                            "Ostuacán"
                        ) &&
                        normalizarTextoPerfil(
                            destino.nombre
                        ) ===
                        nombreBuscado
                    );

                }
            );


        if (
            encontrada
        ) {

            const destino = {

                id:
                    encontrada.id,

                ...encontrada.data()

            };


            localidadSeleccionadaPerfil =
                destino;


            localidadesDisponibles = [
                destino
            ];


            const campo =
                document.getElementById(
                    "editarLocalidad"
                );


            if (campo) {

                campo.dataset.localidadId =
                    destino.id ||
                    "";

                campo.dataset.localidadNombre =
                    destino.nombre ||
                    "";

                campo.dataset.localidadLatitud =
                    destino.latitud ??
                    destino.latitude ??
                    "";

                campo.dataset.localidadLongitud =
                    destino.longitud ??
                    destino.longitude ??
                    "";

            }

        }

    }
    catch (error) {

        console.error(
            "❌ MOTI GO: no se pudo recuperar la localidad actual:",
            error
        );

    }

}


/* =========================================================
   INICIAR AUTOCOMPLETADO
========================================================= */

function iniciarAutocompletadoLocalidadPerfil() {

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            prepararBusquedaLocalidadPerfil,
            {
                once:
                    true
            }
        );

    }
    else {

        prepararBusquedaLocalidadPerfil();

    }

}


iniciarAutocompletadoLocalidadPerfil();


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
   AUTENTICACIÓN
========================================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            console.warn(
                "MOTI GO: no hay usuario autenticado."
            );

            return;

        }


        usuarioActual = user;


        console.log(
            "MOTI GO: usuario autenticado:",
            user.uid
        );


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
            await getDoc(
                referencia
            );


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


        console.log(
            "MOTI GO: perfil cargado correctamente."
        );

    }
    catch (error) {

        console.error(
            "MOTI GO: error cargando perfil:",
            error
        );


        mostrarMensaje(
            "No se pudo cargar la información de tu perfil."
        );

    }

}


/* =========================================================
   MOSTRAR PERFIL
========================================================= */

function renderizarPerfil(
    user,
    datos
) {

    const nombre =
        datos.nombre ||
        user.displayName ||
        "Usuario";


    const email =
        datos.email ||
        user.email ||
        "Sin correo";


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
            email;

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
   OBTENER FECHA ÚLTIMA EDICIÓN
========================================================= */

function obtenerFechaUltimaEdicion(
    datos
) {

    const valor =
        datos?.ultimaActualizacionPerfil;


    if (!valor) {

        return null;

    }


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
   FORMATEAR TIEMPO
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
   ACTUALIZAR ESTADO VISUAL
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


    if (texto) {

        if (estado.bloqueado) {

            texto.textContent =
                `Por seguridad, podrás volver a modificar tus datos personales en aproximadamente ${formatearTiempo(estado.restante)}.`;

        }
        else {

            texto.textContent =
                "Puedes actualizar tu información personal. Después de guardar cambios tendrás un periodo de espera de 24 horas.";

        }

    }


    if (btnEditarPerfil) {

        btnEditarPerfil.disabled =
            estado.bloqueado;

        if (estado.bloqueado) {

            btnEditarPerfil.title =
                "La edición está temporalmente bloqueada.";

        }
        else {

            btnEditarPerfil.title =
                "Editar información";

        }

    }

}


/* =========================================================
   EDITAR PERFIL
========================================================= */

if (btnEditarPerfil) {

    btnEditarPerfil.addEventListener(
        "click",
        () => {

            console.log(
                "MOTI GO: botón Editar presionado."
            );


            if (!datosUsuario) {

                mostrarMensaje(
                    "La información todavía está cargando."
                );

                return;

            }


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


            const campoNombre =
                document.getElementById(
                    "editarNombre"
                );

            const campoTelefono =
                document.getElementById(
                    "editarTelefono"
                );

            const campoMunicipio =
                document.getElementById(
                    "editarMunicipio"
                );

            const campoLocalidad =
                document.getElementById(
                    "editarLocalidad"
                );


            if (campoNombre) {

                campoNombre.value =
                    datosUsuario.nombre ||
                    "";

            }


            if (campoTelefono) {

                campoTelefono.value =
                    datosUsuario.telefono ||
                    "";

            }


            if (campoMunicipio) {

                campoMunicipio.value =
                    datosUsuario.municipio ||
                    "Ostuacán";

            }


            if (campoLocalidad) {

                campoLocalidad.value =
                    datosUsuario.localidad ||
                    "";

            }


            abrirModal(
                modalEditarPerfil
            );

        }
    );

}


/* =========================================================
   GUARDAR CAMBIOS DE PERFIL
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
                    "La edición de información está temporalmente bloqueada."
                );

                return;

            }


            const nombre =
                document.getElementById(
                    "editarNombre"
                )?.value.trim();


            const telefono =
                document.getElementById(
                    "editarTelefono"
                )?.value.trim();


            const municipio =
                document.getElementById(
                    "editarMunicipio"
                )?.value.trim();


            const localidad =
                document.getElementById(
                    "editarLocalidad"
                )?.value.trim();


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
            const localidadEncontrada =
    localidadesDisponibles.find(
        destino =>
            String(
                destino.nombre ||
                ""
            ).trim()
                .toLowerCase() ===
            localidad.toLowerCase()
    );


if (!localidadEncontrada) {

    mostrarMensaje(
        "Selecciona una localidad válida de la lista."
    );

    document
        .getElementById(
            "editarLocalidad"
        )
        ?.focus();

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

        municipio:
            municipio ||
            "Ostuacán",

        localidad:
            localidadEncontrada.nombre,

        localidadId:
            localidadEncontrada.id,

        localidadLatitud:
            localidadEncontrada.latitud ??
            localidadEncontrada.latitude ??
            null,

        localidadLongitud:
            localidadEncontrada.longitud ??
            localidadEncontrada.longitude ??
            null,

        ultimaActualizacionPerfil:
            serverTimestamp()

    }
);


                datosUsuario = {

    ...datosUsuario,

    nombre,

    telefono,

    municipio:
        municipio ||
        "Ostuacán",

    localidad:
        localidadEncontrada.nombre,

    localidadId:
        localidadEncontrada.id,

    localidadLatitud:
        localidadEncontrada.latitud ??
        localidadEncontrada.latitude ??
        null,

    localidadLongitud:
        localidadEncontrada.longitud ??
        localidadEncontrada.longitude ??
        null,

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


                formEditarPerfil.reset();


                mostrarMensaje(
                    "Tu información se actualizó correctamente."
                );

            }
            catch (error) {

                console.error(
                    "MOTI GO: error actualizando perfil:",
                    error
                );


                mostrarMensaje(
                    "No se pudieron guardar los cambios."
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

            console.log(
                "MOTI GO: botón Cambiar contraseña presionado."
            );


            if (!usuarioActual) {

                mostrarMensaje(
                    "No hay una sesión activa."
                );

                return;

            }


            const formulario =
                document.getElementById(
                    "formPassword"
                );


            if (formulario) {

                formulario.reset();

            }


            abrirModal(
                modalPassword
            );

        }
    );

}


/* =========================================================
   PROCESAR CAMBIO DE CONTRASEÑA
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
                )?.value;


            const nueva =
                document.getElementById(
                    "passwordNueva"
                )?.value;


            const confirmacion =
                document.getElementById(
                    "passwordConfirmacion"
                )?.value;


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
                    "Las nuevas contraseñas no coinciden."
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


                formPassword.reset();


                mostrarMensaje(
                    "Contraseña actualizada correctamente."
                );


            }
            catch (error) {

                console.error(
                    "MOTI GO: error cambiando contraseña:",
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


                if (
                    error.code ===
                    "auth/weak-password"
                ) {

                    mostrarMensaje(
                        "La nueva contraseña no es suficientemente segura."
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

            console.log(
                "MOTI GO: botón Recuperar contraseña presionado."
            );


            const email =
                usuarioActual?.email ||
                datosUsuario?.email;


            if (!email) {

                mostrarMensaje(
                    "Tu cuenta no tiene un correo electrónico disponible."
                );

                return;

            }


            try {

                await sendPasswordResetEmail(
                    auth,
                    email
                );


                mostrarMensaje(
                    `Enviamos un enlace de recuperación a ${email}.`
                );

            }
            catch (error) {

                console.error(
                    "MOTI GO: error enviando recuperación:",
                    error
                );


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

            console.log(
                "MOTI GO: botón Términos presionado."
            );


            abrirModal(
                modalTerminos
            );

        }
    );

}


/* =========================================================
   CERRAR MODAL EDITAR
========================================================= */

document
    .getElementById(
        "cerrarModalEditar"
    )
    ?.addEventListener(
        "click",
        () => {

            cerrarModal(
                modalEditarPerfil
            );

        }
    );


document
    .getElementById(
        "cancelarEditarPerfil"
    )
    ?.addEventListener(
        "click",
        () => {

            cerrarModal(
                modalEditarPerfil
            );

        }
    );


/* =========================================================
   CERRAR MODAL PASSWORD
========================================================= */

document
    .getElementById(
        "cerrarModalPassword"
    )
    ?.addEventListener(
        "click",
        () => {

            cerrarModal(
                modalPassword
            );

        }
    );


document
    .getElementById(
        "cancelarPassword"
    )
    ?.addEventListener(
        "click",
        () => {

            cerrarModal(
                modalPassword
            );

        }
    );


/* =========================================================
   CERRAR MODAL TÉRMINOS
========================================================= */

document
    .getElementById(
        "cerrarModalTerminos"
    )
    ?.addEventListener(
        "click",
        () => {

            cerrarModal(
                modalTerminos
            );

        }
    );


document
    .getElementById(
        "cerrarTerminos"
    )
    ?.addEventListener(
        "click",
        () => {

            cerrarModal(
                modalTerminos
            );

        }
    );


/* =========================================================
   CERRAR MODALES AL TOCAR FONDO
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
