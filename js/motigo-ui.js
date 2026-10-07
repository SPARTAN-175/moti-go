// =====================================================
// MOTI GO — INTERFAZ GLOBAL DE NOTIFICACIONES
// Reemplaza alert/confirm/prompt nativos por una interfaz
// propia de la aplicación.
// =====================================================

let modalActual = null;

function crearContenedorUI() {
    let contenedor = document.getElementById("motiGoUIRoot");

    if (contenedor) {
        return contenedor;
    }

    contenedor = document.createElement("div");
    contenedor.id = "motiGoUIRoot";
    contenedor.className = "motigo-ui-root";
    document.body.appendChild(contenedor);

    return contenedor;
}

function cerrarModalUI(resultado) {
    const modal = modalActual;

    if (!modal) {
        return;
    }

    modalActual = null;

    modal.classList.add("motigo-ui-saliendo");

    setTimeout(() => {
        modal.remove();
    }, 160);

    if (typeof modal._resolver === "function") {
        modal._resolver(resultado);
    }
}

function mostrarDialogoMotiGo({
    titulo = "MOTI GO",
    mensaje = "",
    tipo = "info",
    acciones = [
        {
            texto: "Entendido",
            valor: true,
            clase: "motigo-ui-btn-principal"
        }
    ],
    input = null
} = {}) {
    if (modalActual) {
        modalActual.remove();
        modalActual = null;
    }

    const root = crearContenedorUI();

    const modal = document.createElement("div");
    modal.className = "motigo-ui-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    const iconos = {
        exito: "✓",
        error: "!",
        advertencia: "!",
        info: "i",
        pregunta: "?"
    };

    const icono = iconos[tipo] || iconos.info;

    const caja = document.createElement("div");
    caja.className = `motigo-ui-dialog motigo-ui-${tipo}`;

    const contenido = document.createElement("div");
    contenido.className = "motigo-ui-contenido";

    const iconoEl = document.createElement("div");
    iconoEl.className = "motigo-ui-icono";
    iconoEl.textContent = icono;
    iconoEl.setAttribute("aria-hidden", "true");

    const texto = document.createElement("div");
    texto.className = "motigo-ui-texto";

    const tituloEl = document.createElement("h3");
    tituloEl.textContent = titulo;

    const mensajeEl = document.createElement("p");
    mensajeEl.textContent = mensaje;

    texto.appendChild(tituloEl);
    texto.appendChild(mensajeEl);

    contenido.appendChild(iconoEl);
    contenido.appendChild(texto);

    caja.appendChild(contenido);

    let inputEl = null;

    if (input) {
        inputEl = document.createElement("input");
        inputEl.className = "motigo-ui-input";
        inputEl.type = input.type || "text";
        inputEl.placeholder = input.placeholder || "";
        inputEl.value = input.value || "";
        inputEl.maxLength = input.maxLength || 120;
        inputEl.autocomplete = "off";
        caja.appendChild(inputEl);
    }

    const accionesEl = document.createElement("div");
    accionesEl.className = "motigo-ui-acciones";

    acciones.forEach(accion => {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className =
            accion.clase ||
            "motigo-ui-btn-secundario";

        boton.textContent = accion.texto;

        boton.addEventListener("click", () => {
            let valor = accion.valor;

            if (inputEl && accion.valor === "__INPUT__") {
                valor = inputEl.value;
            }

            cerrarModalUI(valor);
        });

        accionesEl.appendChild(boton);
    });

    caja.appendChild(accionesEl);
    modal.appendChild(caja);
    root.appendChild(modal);

    modalActual = modal;

    return new Promise(resolve => {
        modal._resolver = resolve;

        requestAnimationFrame(() => {
            modal.classList.add("motigo-ui-visible");

            if (inputEl) {
                inputEl.focus();
                inputEl.select();
            }
        });

        modal.addEventListener("click", evento => {
            if (evento.target === modal && input === null) {
                const accionCancelar = acciones.find(
                    accion => accion.valor === false ||
                              accion.valor === null
                );

                if (accionCancelar) {
                    cerrarModalUI(accionCancelar.valor);
                }
            }
        });

        modal.addEventListener("keydown", evento => {
            if (evento.key === "Escape") {
                const accionCancelar = acciones.find(
                    accion => accion.valor === false ||
                              accion.valor === null
                );

                if (accionCancelar) {
                    cerrarModalUI(accionCancelar.valor);
                }
            }

            if (evento.key === "Enter" && inputEl) {
                const accionAceptar = acciones.find(
                    accion => accion.valor === "__INPUT__"
                );

                if (accionAceptar) {
                    cerrarModalUI(inputEl.value);
                }
            }
        });
    });
}

function clasificarNotificacionMotiGo(mensaje) {
    const texto = String(mensaje ?? "").toLowerCase();

    if (/(correctamente|éxito|exito|guardad[oa]|actualizad[oa]|enviamos|terminado)/i.test(texto)) {
        return { tipo: "exito", titulo: "Listo" };
    }

    if (/(error|no pudimos|no se pudo|no encontramos|incorrect[oa]|inválid[oa]|invalido|falló|fallo)/i.test(texto)) {
        return { tipo: "error", titulo: "Algo salió mal" };
    }

    if (/(debes|debe|selecciona|completa|completar|no hay|ya no|no disponible|no existe|cuidado|24 horas|contraseña)/i.test(texto)) {
        return { tipo: "advertencia", titulo: "Revisa esto" };
    }

    return { tipo: "info", titulo: "MOTI GO" };
}

window.motiGoNotificar = function (
    mensaje,
    opciones = {}
) {
    const mensajeTexto = String(mensaje ?? "");
    const sugerencia = clasificarNotificacionMotiGo(mensajeTexto);

    return mostrarDialogoMotiGo({
        titulo:
            opciones.titulo ||
            sugerencia.titulo,
        mensaje:
            mensajeTexto,
        tipo:
            opciones.tipo ||
            sugerencia.tipo
    });
};

window.motiGoConfirm = function (
    mensaje,
    opciones = {}
) {
    return mostrarDialogoMotiGo({
        titulo:
            opciones.titulo ||
            "Confirmar acción",
        mensaje:
            String(mensaje ?? ""),
        tipo:
            opciones.tipo ||
            "pregunta",
        acciones: [
            {
                texto: "Cancelar",
                valor: false,
                clase: "motigo-ui-btn-secundario"
            },
            {
                texto: opciones.confirmarTexto || "Confirmar",
                valor: true,
                clase: "motigo-ui-btn-principal"
            }
        ]
    });
};

window.motiGoPrompt = function (
    mensaje,
    opciones = {}
) {
    return mostrarDialogoMotiGo({
        titulo:
            opciones.titulo ||
            "MOTI GO",
        mensaje:
            String(mensaje ?? ""),
        tipo:
            opciones.tipo ||
            "info",
        input: {
            type:
                opciones.type ||
                "text",
            placeholder:
                opciones.placeholder ||
                "",
            value:
                opciones.value ||
                "",
            maxLength:
                opciones.maxLength ||
                120
        },
        acciones: [
            {
                texto: "Cancelar",
                valor: null,
                clase: "motigo-ui-btn-secundario"
            },
            {
                texto: opciones.confirmarTexto || "Guardar",
                valor: "__INPUT__",
                clase: "motigo-ui-btn-principal"
            }
        ]
    });
};

// -----------------------------------------------------
// Sustituir alert nativo globalmente.
// Devuelve inmediatamente para conservar el flujo
// síncrono existente de validaciones.
// -----------------------------------------------------

window.alert = function (mensaje) {
    window.motiGoNotificar(mensaje);
};

// -----------------------------------------------------
// Evitar selección accidental de textos de la interfaz.
// Los campos editables conservan selección normal.
// -----------------------------------------------------

function instalarProteccionSeleccion() {
    if (document.getElementById("motigo-ui-styles")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "motigo-ui-styles";

    style.textContent = `
        html,
        body,
        body * {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            user-select: none !important;
            -webkit-touch-callout: none !important;
        }

        input,
        textarea,
        select,
        [contenteditable="true"],
        [contenteditable=""],
        input *,
        textarea *,
        select * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: default !important;
        }

        button,
        a,
        img,
        svg {
            -webkit-user-select: none !important;
            user-select: none !important;
            -webkit-touch-callout: none !important;
        }

        img,
        svg {
            -webkit-user-drag: none !important;
        }

        .motigo-ui-root,
        .motigo-ui-root * {
            box-sizing: border-box;
        }

        .motigo-ui-root {
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            pointer-events: none;
            font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont,
                "Segoe UI", sans-serif;
        }

        .motigo-ui-overlay {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(15, 23, 42, .46);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            opacity: 0;
            pointer-events: auto;
            transition: opacity .16s ease;
        }

        .motigo-ui-overlay.motigo-ui-visible {
            opacity: 1;
        }

        .motigo-ui-dialog {
            width: min(430px, 100%);
            border: 1px solid rgba(15, 23, 42, .08);
            border-radius: 22px;
            background: #ffffff;
            box-shadow: 0 24px 70px rgba(15, 23, 42, .22);
            padding: 22px;
            transform: translateY(10px) scale(.98);
            transition: transform .16s ease;
        }

        .motigo-ui-visible .motigo-ui-dialog {
            transform: translateY(0) scale(1);
        }

        .motigo-ui-saliendo {
            opacity: 0 !important;
        }

        .motigo-ui-saliendo .motigo-ui-dialog {
            transform: translateY(8px) scale(.98);
        }

        .motigo-ui-contenido {
            display: flex;
            gap: 14px;
            align-items: flex-start;
        }

        .motigo-ui-icono {
            width: 42px;
            height: 42px;
            flex: 0 0 42px;
            display: grid;
            place-items: center;
            border-radius: 14px;
            background: #eaf7f1;
            color: #16845b;
            font-size: 21px;
            font-weight: 800;
        }

        .motigo-ui-error .motigo-ui-icono {
            background: #fff0f0;
            color: #c0392b;
        }

        .motigo-ui-advertencia .motigo-ui-icono {
            background: #fff7df;
            color: #a66a00;
        }

        .motigo-ui-pregunta .motigo-ui-icono {
            background: #eef4ff;
            color: #3567b8;
        }

        .motigo-ui-texto {
            min-width: 0;
        }

        .motigo-ui-texto h3 {
            margin: 1px 0 5px;
            color: #172033;
            font-size: 17px;
            line-height: 1.25;
            font-weight: 750;
        }

        .motigo-ui-texto p {
            margin: 0;
            color: #667085;
            font-size: 14px;
            line-height: 1.55;
            white-space: pre-line;
        }

        .motigo-ui-input {
            width: 100%;
            margin-top: 18px;
            min-height: 46px;
            padding: 11px 13px;
            border: 1px solid #d7dee8;
            border-radius: 12px;
            outline: none;
            background: #fff;
            color: #172033;
            font: inherit;
            user-select: text !important;
            -webkit-user-select: text !important;
        }

        .motigo-ui-input:focus {
            border-color: #16845b;
            box-shadow: 0 0 0 3px rgba(22, 132, 91, .11);
        }

        .motigo-ui-acciones {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 22px;
        }

        .motigo-ui-acciones button {
            min-height: 42px;
            padding: 0 17px;
            border: 0;
            border-radius: 12px;
            font: inherit;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
        }

        .motigo-ui-btn-principal {
            background: #16845b;
            color: #fff;
            box-shadow: 0 7px 18px rgba(22, 132, 91, .18);
        }

        .motigo-ui-btn-principal:hover {
            filter: brightness(.96);
        }

        .motigo-ui-btn-secundario {
            background: #f2f4f7;
            color: #344054;
        }

        @media (max-width: 520px) {
            .motigo-ui-overlay {
                align-items: flex-end;
                padding: 12px;
            }

            .motigo-ui-dialog {
                border-radius: 20px;
                padding: 19px;
            }

            .motigo-ui-acciones button {
                flex: 1;
            }
        }
    `;

    document.head.appendChild(style);
}

function iniciarMotiGoUI() {
    if (!document.body) {
        document.addEventListener(
            "DOMContentLoaded",
            iniciarMotiGoUI,
            { once: true }
        );
        return;
    }

    instalarProteccionSeleccion();
    crearContenedorUI();
}

iniciarMotiGoUI();
