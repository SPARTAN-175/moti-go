export function enviarGrupo(

    grupo,

    numeroGrupo

){

    console.log("");

    console.log(

        "========================"

    );

    console.log(

        `📤 ENVIANDO GRUPO ${numeroGrupo}`

    );

    console.log(

        "========================"

    );

    grupo.forEach(

        conductor=>{

            console.log(

                "🚖",

                conductor.nombre,

                "-",

                conductor.puntaje,

                "pts"

            );

        }

    );

    console.log("");

}
