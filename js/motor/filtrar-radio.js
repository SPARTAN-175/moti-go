export function filtrarRadio(

    conductores

){

    const radios = [

        300,

        500,

        1000,

        2000,

        5000

    ];

    for(const radio of radios){

        const encontrados =

        conductores.filter(

            conductor=>

                conductor.distancia<=radio

        );

        if(

            encontrados.length>=3

        ){

            return{

                radio,

                conductores:encontrados

            };

        }

    }

    return{

        radio:"Sin límite",

        conductores

    };

}
