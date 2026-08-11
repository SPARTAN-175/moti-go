import { db }
from "./firebase-config.js";

import {

    collection,
    getDocs,
    doc,
    updateDoc

}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

async function actualizarConductores(){

    try{

        const snapshot =

        await getDocs(

            collection(
                db,
                "usuarios"
            )

        );

        let contador = 0;

        for(const documento of snapshot.docs){

            const datos = documento.data();

            if(datos.tipo !== "conductor"){

                continue;

            }

            await updateDoc(

                doc(
                    db,
                    "usuarios",
                    documento.id
                ),

                {

                    viajesHoy: 0,

                    viajesTotales: 0

                }

            );

            contador++;

            console.log(

                "✔ Actualizado:",

                datos.nombre

            );

        }

        console.log(

            "🚖 Conductores actualizados:",

            contador

        );

        alert(

            "Proceso terminado."

        );

    }

    catch(error){

        console.error(error);

    }

}

actualizarConductores();
