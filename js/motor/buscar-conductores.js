export function buscarConductores(conductores = []) {
    return conductores.filter(conductor => {
        const lat = Number(conductor.latitud);
        const lng = Number(conductor.longitud);
        return conductor.estadoServicio === "disponible"
            && conductor.ubicacionActiva === true
            && Number.isFinite(lat)
            && Number.isFinite(lng)
            && lat >= -90 && lat <= 90
            && lng >= -180 && lng <= 180;
    });
}
