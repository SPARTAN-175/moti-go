import { db } from "./firebase-config.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// =====================================================
// ELEMENTOS
// =====================================================

const storeSelect =
    document.getElementById("storeSelect");

const catalogFile =
    document.getElementById("catalogFile");

const uploadZone =
    document.getElementById("uploadZone");

const selectedFile =
    document.getElementById("selectedFile");

const selectedFileName =
    document.getElementById("selectedFileName");

const selectedFileSize =
    document.getElementById("selectedFileSize");

const removeFile =
    document.getElementById("removeFile");

const btnProcesarCatalogo =
    document.getElementById(
        "btnProcesarCatalogo"
    );


// =====================================================
// ESTADO
// =====================================================

let archivoSeleccionado = null;


// =====================================================
// CARGAR TIENDAS
// =====================================================

async function cargarTiendas() {

    if (!storeSelect) {
        return;
    }


    try {

        console.log(
            "🏪 Cargando tiendas..."
        );


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "tiendas"
                )
            );


        storeSelect.innerHTML = `
            <option value="">
                Selecciona una tienda
            </option>
        `;


        let totalTiendas = 0;


        snapshot.forEach(
            (docSnap) => {

                const tienda =
                    docSnap.data();


                // Solo mostrar tiendas activas

                if (
                    tienda.activa !== true
                ) {

                    return;

                }


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    docSnap.id;


                option.textContent =
                    tienda.nombre ||
                    docSnap.id;


                storeSelect.appendChild(
                    option
                );


                totalTiendas++;

            }
        );


        console.log(
            `🏪 Tiendas disponibles: ${totalTiendas}`
        );


        actualizarEstadoBoton();


    }
    catch (error) {

        console.error(
            "❌ Error cargando tiendas:",
            error
        );


        storeSelect.innerHTML = `
            <option value="">
                No se pudieron cargar las tiendas
            </option>
        `;

    }

}


// =====================================================
// SELECCIONAR TIENDA
// =====================================================

if (storeSelect) {

    storeSelect.addEventListener(
        "change",
        () => {

            actualizarEstadoBoton();

        }
    );

}


// =====================================================
// SELECCIONAR ARCHIVO
// =====================================================

if (catalogFile) {

    catalogFile.addEventListener(
        "change",
        () => {

            const archivo =
                catalogFile.files[0];


            if (!archivo) {

                limpiarArchivo();

                return;

            }


            seleccionarArchivo(
                archivo
            );

        }
    );

}


// =====================================================
// PROCESAR ARCHIVO SELECCIONADO
// =====================================================

function seleccionarArchivo(
    archivo
) {

    const nombre =
        archivo.name.toLowerCase();


    const extensionValida =

        nombre.endsWith(".xlsx") ||

        nombre.endsWith(".csv");


    if (!extensionValida) {

        alert(
            "Selecciona un archivo Excel (.xlsx) o CSV (.csv)."
        );


        limpiarArchivo();

        return;

    }


    archivoSeleccionado =
        archivo;


    if (selectedFileName) {

        selectedFileName.textContent =
            archivo.name;

    }


    if (selectedFileSize) {

        selectedFileSize.textContent =
            formatearTamaño(
                archivo.size
            );

    }


    if (selectedFile) {

        selectedFile.style.display =
            "flex";

    }


    if (uploadZone) {

        uploadZone.style.display =
            "none";

    }


    actualizarEstadoBoton();


    console.log(
        "📄 Archivo seleccionado:",
        archivo.name
    );

}


// =====================================================
// ELIMINAR ARCHIVO
// =====================================================

if (removeFile) {

    removeFile.addEventListener(
        "click",
        () => {

            limpiarArchivo();

        }
    );

}


function limpiarArchivo() {

    archivoSeleccionado =
        null;


    if (catalogFile) {

        catalogFile.value =
            "";

    }


    if (selectedFile) {

        selectedFile.style.display =
            "none";

    }


    if (uploadZone) {

        uploadZone.style.display =
            "flex";

    }


    actualizarEstadoBoton();

}


// =====================================================
// DRAG & DROP
// =====================================================

if (uploadZone) {

    uploadZone.addEventListener(
        "dragover",
        (event) => {

            event.preventDefault();

            uploadZone.classList.add(
                "dragover"
            );

        }
    );


    uploadZone.addEventListener(
        "dragleave",
        () => {

            uploadZone.classList.remove(
                "dragover"
            );

        }
    );


    uploadZone.addEventListener(
        "drop",
        (event) => {

            event.preventDefault();


            uploadZone.classList.remove(
                "dragover"
            );


            const archivo =
                event.dataTransfer.files[0];


            if (!archivo) {
                return;
            }


            seleccionarArchivo(
                archivo
            );

        }
    );

}


// =====================================================
// ACTIVAR BOTÓN
// =====================================================

function actualizarEstadoBoton() {

    if (!btnProcesarCatalogo) {
        return;
    }


    const tiendaSeleccionada =
        storeSelect &&
        storeSelect.value;


    const puedeProcesar =

        tiendaSeleccionada &&

        archivoSeleccionado;


    btnProcesarCatalogo.disabled =
        !puedeProcesar;

}


// =====================================================
// BOTÓN PROCESAR
// =====================================================

if (btnProcesarCatalogo) {

    btnProcesarCatalogo.addEventListener(
        "click",
        () => {

            if (
                !archivoSeleccionado
            ) {

                return;

            }


            if (
                !storeSelect.value
            ) {

                return;

            }


            console.log(
                "🚀 Preparado para procesar:"
            );


            console.log(
                "Tienda:",
                storeSelect.value
            );


            console.log(
                "Archivo:",
                archivoSeleccionado.name
            );


            /*
                TODAVÍA NO LEEMOS EL EXCEL.

                En el siguiente paso agregaremos
                el lector de XLSX/CSV.
            */


            alert(
                "La tienda y el archivo están listos. El lector del catálogo lo agregaremos en el siguiente paso."
            );

        }
    );

}


// =====================================================
// FORMATO DE TAMAÑO
// =====================================================

function formatearTamaño(
    bytes
) {

    if (
        bytes === 0
    ) {

        return "0 KB";

    }


    const kb =
        bytes / 1024;


    if (
        kb < 1024
    ) {

        return `${kb.toFixed(1)} KB`;

    }


    const mb =
        kb / 1024;


    return `${mb.toFixed(1)} MB`;

}


// =====================================================
// INICIO
// =====================================================

cargarTiendas();


console.log(
    "📦 MOTI - ADMINISTRADOR DE CATÁLOGO INICIADO"
);
