export function filtrarRutasEspeciales(

    conductores,

    viaje

){

    // Si el viaje no es especial,
    // todos participan.

    if(

        viaje.tipoViaje !== "especial"

    ){

        return conductores;

    }

    return conductores.filter(

        conductor=>{

            // Si el conductor no tiene rutas especiales,
            // usar un arreglo vacío.

            const rutas =

            conductor.rutasEspeciales || [];

            return rutas.some(

                ruta=>

                    ruta.destino === viaje.destino

                    &&

                    ruta.activo === true

            );

        }

    );

}
