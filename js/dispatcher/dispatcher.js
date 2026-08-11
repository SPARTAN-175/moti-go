import {

    enviarGrupo

}

from "./enviar-grupo.js";

import {

    esperar

}

from "./temporizador.js";


// =====================================
// CONFIGURACIÓN
// =====================================

const TIEMPO_ESPERA = 5;


// =====================================
// DISPATCHER
// =====================================

export async function iniciarDispatcher(

    grupos

){

    console.clear();

    console.log("");

    console.log("🚖 MOTI DISPATCHER");

    console.log("============================");

    console.log("");

    for(

        let i = 0;

        i < grupos.length;

        i++

    ){

        const grupo = grupos[i];

        enviarGrupo(

            grupo,

            i+1

        );

        console.log(

            `⏳ Esperando ${TIEMPO_ESPERA} segundos...`

        );

        await esperar(

            TIEMPO_ESPERA

        );

        console.log(

            "❌ Ningún conductor aceptó."

        );

        console.log("");

    }

    console.log("");

    console.log(

        "🏁 Todos los grupos fueron notificados."

    );

}
