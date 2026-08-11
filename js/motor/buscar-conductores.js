export function buscarConductores(

conductores

){

return conductores.filter(

conductor=>

conductor.estadoServicio===

"disponible"

);

}
