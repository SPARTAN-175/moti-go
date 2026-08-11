export async function esperarRespuesta(

    grupo

){

    console.log("");

    console.log("📲 Esperando respuesta de los conductores...");

    await new Promise(

        resolve=>setTimeout(

            resolve,

            3000

        )

    );

    // ==================================
    // SIMULACIÓN
    // ==================================

    for(const conductor of grupo){

        if(conductor.aceptaViaje){

            console.log(

                `✅ ${conductor.nombre} aceptó el viaje.`

            );

            return conductor;

        }

        console.log(

            `❌ ${conductor.nombre} rechazó el viaje.`

        );

    }

    return null;

}
