import { db }
from "../firebase-config.js";

import {

    collection,
    getDocs

}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


export async function cargarDestinos(){

    try{

        const snapshot =

        await getDocs(

            collection(

                db,

                "destinosEspeciales"

            )

        );

        const destinos=[];

        snapshot.forEach(

            doc=>{

                destinos.push({

                    id:doc.id,

                    ...doc.data()

                });

            }

        );

        return destinos;

    }

    catch(error){

        console.error(error);

        return [];

    }

}
