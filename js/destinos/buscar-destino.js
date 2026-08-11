import {

    cargarDestinos

}
from "./cargar-destinos.js";


export async function buscarDestino(texto){

    const destinos =

    await cargarDestinos();

    return destinos.filter(

        destino=>

        destino.nombre

        .toLowerCase()

        .includes(

            texto.toLowerCase()

        )

    );

}
