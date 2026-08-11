export function seleccionarGrupos(

    conductores,

    tamanoGrupo = 3

){

    const grupos = [];

    for(

        let i = 0;

        i < conductores.length;

        i += tamanoGrupo

    ){

        grupos.push(

            conductores.slice(

                i,

                i + tamanoGrupo

            )

        );

    }

    return grupos;

}
