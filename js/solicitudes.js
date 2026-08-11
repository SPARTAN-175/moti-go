import { db }
from "./firebase-config.js";

import {
    collection,
    query,
    where,
    getDocs,
    orderBy
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const container =
document.getElementById(
    "solicitudesContainer"
);

async function cargarSolicitudes(){

    try{

        const q =
query(
    collection(
        db,
        "solicitudes"
    ),

    where(
        "estado",
        "==",
        "pendiente"
    ),

    orderBy(
        "fecha",
        "desc"
    )

);

        const snapshot =
        await getDocs(q);

        if(snapshot.empty){

            container.innerHTML = `
                <p>
                    No hay solicitudes pendientes
                </p>
            `;

            return;

        }

        container.innerHTML = "";

        snapshot.forEach((docu) => {

            const datos =
            docu.data();

            container.innerHTML += `

            <div class="request-card local">

                <div class="trip-badge">

                    ${datos.tipoViaje.toUpperCase()}

                </div>

                <div class="request-section">

                    <span class="label">

                        Pasajero

                    </span>

                    <strong>

                        ${datos.nombrePasajero || "-"}

                    </strong>

                </div>

                <div class="request-section">

                    <span class="label">

                        Destino

                    </span>

                    <strong>

                        ${datos.destino || "-"}

                    </strong>

                </div>

                <div class="request-section">

                    <span class="label">

                        Observaciones

                    </span>

                    <strong>

                        ${datos.observaciones || "-"}

                    </strong>

                </div>

                <div class="actions">

    <button
        class="location-btn"
        onclick="window.open(
        'https://www.google.com/maps?q=${datos.latitud},${datos.longitud}'
        )">

        Ver ubicación

    </button>

    <button
        class="accept-btn">

        Aceptar

    </button>

</div>

            </div>

            `;

        });

    }
    catch(error){

        console.error(error);

        container.innerHTML = `
            <p>
                Error al cargar solicitudes
            </p>
        `;

    }

}

cargarSolicitudes();
