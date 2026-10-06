export function buscarConductores(

conductores

){

return conductores.filter(
    conductor =>
        conductor.estadoServicio === "disponible"
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
