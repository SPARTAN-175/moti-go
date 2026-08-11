// ========================================
// TABLA DE CONDUCTORES
// ========================================

export function mostrarTabla(grupos){

    const tabla = document.getElementById(
        "tablaConductores"
    );

    tabla.innerHTML = "";

    grupos.forEach(

        (grupo, numeroGrupo)=>{

            grupo.forEach(

                (conductor, posicion)=>{

                    tabla.innerHTML += `

<tr>

<td>

Grupo ${numeroGrupo + 1}

<br>

<strong>${conductor.nombre}</strong>

</td>

<td>${conductor.estadoServicio}</td>

<td>${conductor.distancia} m</td>

<td>${conductor.puntaje}</td>

<td>${posicion + 1}</td>

</tr>

`;

                }

            );

        }

    );

}

// ========================================
// LOG DEL MOTOR
// ========================================

export function mostrarLog(log){

    document.getElementById(
        "log"
    ).textContent = log.join("\n");

}
