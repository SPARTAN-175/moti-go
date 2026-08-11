export function calcularPuntaje(conductores){

    conductores.forEach(

        conductor=>{

            let puntos = 0;

            // =====================
            // DISTANCIA
            // =====================

            if(conductor.distancia<=300){

                puntos +=100;

            }

            else if(conductor.distancia<=500){

                puntos +=80;

            }

            else if(conductor.distancia<=1000){

                puntos +=60;

            }

            else if(conductor.distancia<=2000){

                puntos +=40;

            }

            else{

                puntos +=20;

            }

            // =====================
// ROTACIÓN JUSTA
// =====================

const viajes =

conductor.viajesHoy || 0;

if(viajes===0){

    puntos +=60;

}

else if(viajes===1){

    puntos +=55;

}

else if(viajes===2){

    puntos +=50;

}

else if(viajes===3){

    puntos +=45;

}

else if(viajes===4){

    puntos +=40;

}

else if(viajes===5){

    puntos +=35;

}

else if(viajes===6){

    puntos +=30;

}

else if(viajes===7){

    puntos +=25;

}

else if(viajes===8){

    puntos +=20;

}

else if(viajes===9){

    puntos +=15;

}

else{

    puntos +=10;

}
            conductor.puntaje = puntos;

        }

    );

    return conductores;

}
