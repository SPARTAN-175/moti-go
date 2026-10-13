export function filtrarRadio(conductores) {
    // Radios máximos progresivos. Se elige el primer radio que tenga
    // al menos un repartidor; nunca se aceptan candidatos fuera de 5 km.
    const radios = [300, 500, 1000, 2000, 5000];

    for (const radio of radios) {
        const encontrados = conductores.filter(
            conductor => Number(conductor.distancia) <= radio
        );

        if (encontrados.length > 0) {
            return { radio, conductores: encontrados };
        }
    }

    return { radio: 5000, conductores: [] };
}
