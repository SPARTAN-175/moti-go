export function asignarViaje(

    conductor,

    viaje

){

    console.log("");

    console.log("================================");

    console.log("🎉 VIAJE ASIGNADO");

    console.log("================================");

    console.log(

        "Conductor:",

        conductor.nombre

    );

    console.log(

        "Destino:",

        viaje.destino

    );

    console.log(

        "Tipo:",

        viaje.tipoViaje

    );

    console.log("");

    return{

        asignado:true,

        conductor

    };

}
