// =========================================================
// MOTI GO
// MOTOR DE COMISIONES
// =========================================================
//
// IMPORTANTE:
//
// Este archivo NO asigna repartidores.
// Este archivo NO modifica pedidos existentes.
// Este archivo NO modifica el dispatcher.
//
// Su única responsabilidad es:
//
// 1. Leer la configuración financiera.
// 2. Calcular tarifa de entrega.
// 3. Calcular comisión de cada tienda.
// 4. Calcular participación del fundador.
// 5. Devolver una fotografía congelable de la
//    configuración aplicada al pedido.
//
// =========================================================

import {
    db
} from "./firebase-config.js";


import {
    doc,
    getDoc
} from
"https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// =========================================================
// VALORES PREDETERMINADOS
// =========================================================
//
// Solamente funcionan como respaldo si todavía no existe
// configuración en Firebase.
//
// La configuración real debe salir de:
// configuracion/motigo
//
// =========================================================

const CONFIGURACION_PREDETERMINADA = {

    tarifaBase:
        8,

    precioKm:
        2,

    tiendaAdicional:
        4,

    minimoRepartidor:
        10,

    maximoRepartidor:
        60,

    comisionTiendaPorcentaje:
    10,

    comisionFundadorPorcentaje:
        100

};


// =========================================================
// LEER CONFIGURACIÓN GENERAL
// =========================================================

export async function obtenerConfiguracionComisiones() {

    try {

        const referencia =
            doc(
                db,
                "configuracion",
                "motigo"
            );


        const snapshot =
            await getDoc(
                referencia
            );


        if (
            !snapshot.exists()
        ) {

            console.warn(
                "⚠️ MOTI GO: no existe configuración financiera. Se usarán valores predeterminados."
            );


            return {
                ...CONFIGURACION_PREDETERMINADA
            };

        }


        const datos =
            snapshot.data();


        return {

            ...CONFIGURACION_PREDETERMINADA,

            ...datos

        };

    }
    catch (error) {

        console.error(
            "❌ MOTI GO: error leyendo configuración de comisiones:",
            error
        );


        return {
            ...CONFIGURACION_PREDETERMINADA
        };

    }

}


// =========================================================
// NORMALIZAR NÚMERO
// =========================================================

function numeroSeguro(
    valor,
    respaldo = 0
) {

    const numero =
        Number(
            valor
        );


    if (
        !Number.isFinite(
            numero
        )
    ) {

        return respaldo;

    }


    return numero;

}


// =========================================================
// REDONDEAR PESOS
// =========================================================

function redondearPeso(
    valor
) {

    return Math.round(
        numeroSeguro(
            valor
        )
    );

}


// =========================================================
// REDONDEAR DISTANCIA PARA TARIFA
// =========================================================
//
// La distancia interna puede tener decimales.
//
// Para cobrar:
//
// 1.1 km → 2 km
// 2.0 km → 2 km
// 2.01 km → 3 km
//
// =========================================================

function redondearKilometros(
    distanciaKm
) {

    const distancia =
        numeroSeguro(
            distanciaKm
        );


    if (
        distancia <= 0
    ) {

        return 0;

    }


    return Math.ceil(
        distancia
    );

}


// =========================================================
// CALCULAR TARIFA DE ENTREGA
// =========================================================

export function calcularTarifaEntrega(
    {
        distanciaKm,
        numeroTiendas,
        configuracion =
            CONFIGURACION_PREDETERMINADA
    }
) {

    const distancia =
        numeroSeguro(
            distanciaKm
        );


    const tiendas =
        Math.max(
            1,
            Math.floor(
                numeroSeguro(
                    numeroTiendas,
                    1
                )
            )
        );


    const kmTarificados =
        redondearKilometros(
            distancia
        );


    let tarifa =

        numeroSeguro(
            configuracion.tarifaBase
        )

        +

        (
            kmTarificados *
            numeroSeguro(
                configuracion.precioKm
            )
        );


    if (
        tiendas > 1
    ) {

        tarifa +=
            (
                tiendas - 1
            )
            *
            numeroSeguro(
                configuracion.tiendaAdicional
            );

    }


    tarifa =
        Math.max(
            tarifa,
            numeroSeguro(
                configuracion.minimoRepartidor
            )
        );


    tarifa =
        Math.min(
            tarifa,
            numeroSeguro(
                configuracion.maximoRepartidor
            )
        );


    return {

        distanciaKm:
            Number(
                distancia.toFixed(
                    2
                )
            ),

        distanciaKmTarificada:
            kmTarificados,

        numeroTiendas:
            tiendas,

        tarifaBase:
            redondearPeso(
                configuracion.tarifaBase
            ),

        precioKm:
            redondearPeso(
                configuracion.precioKm
            ),

        tiendaAdicional:
            redondearPeso(
                configuracion.tiendaAdicional
            ),

        minimo:
            redondearPeso(
                configuracion.minimoRepartidor
            ),

        maximo:
            redondearPeso(
                configuracion.maximoRepartidor
            ),

        monto:
            redondearPeso(
                tarifa
            )

    };

}


// =========================================================
// OBTENER COMISIÓN DE UNA TIENDA
// =========================================================
//
// Si la tienda tiene:
//
// comisionTiendaPorcentaje
//
// usamos ese valor.
//
// Si todavía no tiene configuración propia,
// usamos el valor global predeterminado.
//
// =========================================================

export function obtenerPorcentajeComisionTienda(
    tienda,
    configuracion
) {

    const porcentajeIndividual =
        Number(
            tienda?.comisionTiendaPorcentaje
        );


    if (
        Number.isFinite(
            porcentajeIndividual
        ) &&
        porcentajeIndividual >= 0
    ) {

        return porcentajeIndividual;

    }


    return numeroSeguro(
    configuracion.comisionTiendaPorcentaje,
    CONFIGURACION_PREDETERMINADA.comisionTiendaPorcentaje
);

}


// =========================================================
// CALCULAR COMISIÓN DE TIENDA
// =========================================================

export function calcularComisionTienda(
    subtotalTienda,
    tienda,
    configuracion
) {

    const subtotal =
        numeroSeguro(
            subtotalTienda
        );


    const porcentaje =
        obtenerPorcentajeComisionTienda(
            tienda,
            configuracion
        );


    const monto =
        subtotal *
        (
            porcentaje /
            100
        );


    return {

        tiendaId:
            tienda?.id ||
            tienda?.tiendaId ||
            "",

        tiendaNombre:
            tienda?.nombre ||
            tienda?.nombreTienda ||
            "Tienda",

        subtotal:
            Number(
                subtotal.toFixed(
                    2
                )
            ),

        porcentaje:
            Number(
                porcentaje.toFixed(
                    2
                )
            ),

        monto:
            Number(
                monto.toFixed(
                    2
                )
            ),

        estado:
            "pendiente_cobro_tienda"

    };

}


// =========================================================
// CALCULAR PARTICIPACIÓN DEL FUNDADOR
// =========================================================
//
// IMPORTANTE:
//
// Esto NO incluye la tarifa de entrega.
//
// La tarifa de entrega ya la cobra físicamente
// el repartidor al cliente.
//
// Aquí solamente calculamos la participación del
// fundador sobre la comisión que MOTI genera a la tienda.
//
// =========================================================

export function calcularParticipacionFundador(
    comisionTienda,
    esFundador,
    configuracion
) {

    const montoComision =
        numeroSeguro(
            comisionTienda?.monto
        );


    if (
        !esFundador
    ) {

        return {

            aplica:
                false,

            porcentaje:
                0,

            monto:
                0,

            estado:
                "no_aplica"

        };

    }


    const porcentaje =
        numeroSeguro(
            configuracion.comisionFundadorPorcentaje,
            CONFIGURACION_PREDETERMINADA.comisionFundadorPorcentaje
        );


    const monto =
        montoComision *
        (
            porcentaje /
            100
        );


    return {

        aplica:
            true,

        porcentaje:
            Number(
                porcentaje.toFixed(
                    2
                )
            ),

        monto:
            Number(
                monto.toFixed(
                    2
                )
            ),

        estado:
            "pendiente_cobro_tienda"

    };

}


// =========================================================
// MOTOR COMPLETO DE COMISIONES
// =========================================================
//
// recibe:
//
// distanciaKm
// tiendas
// esFundador
//
// Cada tienda debe traer:
//
// {
//     id,
//     nombre,
//     subtotal
// }
//
// =========================================================

export async function calcularComisionesPedido(
    {
        distanciaKm,
        tiendas = [],
        esFundador = false
    }
) {

    const configuracion =
        await obtenerConfiguracionComisiones();


    const tarifaEntrega =
        calcularTarifaEntrega({

            distanciaKm,

            numeroTiendas:
                tiendas.length,

            configuracion

        });


    const comisionesTiendas =
        [];


    let totalComisionesTiendas =
        0;


    let totalFundador =
        0;


    tiendas.forEach(
        tienda => {

            const comision =
                calcularComisionTienda(

                    tienda.subtotal,

                    tienda,

                    configuracion

                );


            const fundador =
                calcularParticipacionFundador(

                    comision,

                    esFundador,

                    configuracion

                );


            const resultado = {

                ...comision,

                fundador

            };


            comisionesTiendas.push(
                resultado
            );


            totalComisionesTiendas +=
                comision.monto;


            totalFundador +=
                fundador.monto;

        }
    );


    return {

        tarifaEntrega,

        comisionesTiendas,

        resumen: {

            totalComisionesTiendas:
                Number(
                    totalComisionesTiendas.toFixed(
                        2
                    )
                ),

            totalFundador:
                Number(
                    totalFundador.toFixed(
                        2
                    )
                )

        },

        configuracionAplicada: {

            tarifaBase:
                numeroSeguro(
                    configuracion.tarifaBase
                ),

            precioKm:
                numeroSeguro(
                    configuracion.precioKm
                ),

            tiendaAdicional:
                numeroSeguro(
                    configuracion.tiendaAdicional
                ),

            minimoRepartidor:
                numeroSeguro(
                    configuracion.minimoRepartidor
                ),

            maximoRepartidor:
                numeroSeguro(
                    configuracion.maximoRepartidor
                ),

            comisionTiendaPorcentaje:
    numeroSeguro(
        configuracion.comisionTiendaPorcentaje
    ),

            comisionFundadorPorcentaje:
                numeroSeguro(
                    configuracion.comisionFundadorPorcentaje
                )

        }

    };

}


// =========================================================
// PRUEBA RÁPIDA EN CONSOLA
// =========================================================
//
// Podemos utilizar:
//
// window.probarMotorComisiones()
//
// =========================================================

window.probarMotorComisiones =
async function() {

    const resultado =
        await calcularComisionesPedido({

            distanciaKm:
                2.4,

            tiendas: [

                {

                    id:
                        "tienda_001",

                    nombre:
                        "Tienda de Prueba",

                    subtotal:
                        200,

                    comisionTiendaPorcentaje:
                        10

                }

            ],

            esFundador:
                true

        });


    console.log(
        "🧮 MOTI GO — RESULTADO MOTOR DE COMISIONES:",
        resultado
    );


    return resultado;

};


console.log(
    "🧮 MOTI GO — MOTOR DE COMISIONES CARGADO."
);
