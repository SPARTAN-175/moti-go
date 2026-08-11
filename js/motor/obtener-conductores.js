import { db }
from "../firebase-config.js";

import {

    collection,

    query,

    where,

    getDocs

}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


export async function obtenerConductores(){

    const consulta = query(

        collection(db,"usuarios"),

        where("tipo","==","conductor"),

        where("estadoServicio","==","disponible")

    );

    const snapshot = await getDocs(

        consulta

    );

    const conductores = [];

    snapshot.forEach(

        doc=>{

            conductores.push({

                id:doc.id,

                ...doc.data()

            });

        }

    );


    console.log(conductores);
    return conductores;

}
