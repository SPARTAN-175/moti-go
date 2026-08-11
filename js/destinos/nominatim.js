export async function buscarEnNominatim(texto){

    if(!texto || texto.trim()===""){

        return [];

    }

    try{

        const url=

        "https://nominatim.openstreetmap.org/search?"

        +

        new URLSearchParams({

            q:texto,

            format:"json",

            addressdetails:1,

            limit:5,

            countrycodes:"mx"

        });

        const respuesta=

        await fetch(

            url,

            {

                headers:{

                    "Accept":"application/json"

                }

            }

        );

        const datos=

        await respuesta.json();

        return datos.map(

            lugar=>({

                id:lugar.place_id,

                nombre:lugar.display_name,

                latitud:Number(

                    lugar.lat

                ),

                longitud:Number(

                    lugar.lon

                )

            })

        );

    }

    catch(error){

        console.error(error);

        return [];

    }

}
