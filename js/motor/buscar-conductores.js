export function buscarConductores(

conductores

){

return conductores.filter(

conductor=>

conductor.estadoServicio===

"disponible"

&&

conductor.ubicacionActiva===true

&&

Number.isFinite(
    Number(conductor.latitud)
)

&&

Number.isFinite(
    Number(conductor.longitud)
)

);

}
