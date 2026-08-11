import { db }
from "../firebase-config.js";

import {

    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp

}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


export async function guardarDestino(destino){

    try{

        // ===========================
        // ¿YA EXISTE?
        // ===========================

        const consulta = query(

            collection(

                db,

                "destinosEspeciales"

            ),

            where(

                "nombre",

                "==",

                destino.nombre

            )

        );

        const resultado =

        await getDocs(

            consulta

        );

        if(!resultado.empty){

            const existente =

            resultado.docs[0];

            return{

                id:existente.id,

                ...existente.data()

            };

        }

        // ===========================
        // CREAR NUEVO
        // ===========================

        const docRef =

        await addDoc(

            collection(

                db,

                "destinosEspeciales"

            ),

            {

                nombre:destino.nombre,

                latitud:destino.latitud,

                longitud:destino.longitud,

                activo:true,

                fechaCreacion:

                serverTimestamp()

            }

        );

        return{

            id:docRef.id,

            ...destino

        };

    }

    catch(error){

        console.error(error);

        return null;

    }

}
