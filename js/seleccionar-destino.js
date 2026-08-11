let map;

let marcador = null;

let destinoLat = null;

let destinoLng = null;

// ======================
// CREAR MAPA
// ======================

map = L.map("map").setView(

    [17.4088035,-93.327078],

    16

);

// ======================
// GPS
// ======================

if("geolocation" in navigator){

    navigator.geolocation.getCurrentPosition(

        (position)=>{

            const lat =

            position.coords.latitude;

            const lng =

            position.coords.longitude;

            map.setView(

                [lat,lng],

                17

            );

            L.marker(

                [lat,lng]

            )

            .addTo(map)

            .bindPopup(

                "Tu ubicación"

            )

            .openPopup();

        },

        (error)=>{

            console.error(error);

            alert(

                "No fue posible obtener tu ubicación."

            );

        }

    );

}

L.tileLayer(

    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

    {

        attribution:"© OpenStreetMap"

    }

).addTo(map);



// ======================
// SELECCIONAR DESTINO
// ======================

const textoDestino =

document.getElementById(

"destinoSeleccionado"

);

const btnConfirmar =

document.getElementById(

"btnConfirmar"

);

map.on(

"click",

function(e){

    destinoLat =

    e.latlng.lat;

    destinoLng =

    e.latlng.lng;

    if(marcador){

        map.removeLayer(

            marcador

        );

    }

    marcador =

    L.marker(

        [

            destinoLat,

            destinoLng

        ]

    )

    .addTo(map)

    .bindPopup(

        "Destino"

    )

    .openPopup();

    textoDestino.textContent =

    `Destino seleccionado
    (${destinoLat.toFixed(6)},
    ${destinoLng.toFixed(6)})`;

    btnConfirmar.disabled =

    false;

});


// ======================
// CONFIRMAR DESTINO
// ======================

btnConfirmar.addEventListener(

"click",

()=>{

    sessionStorage.setItem(

        "destinoViaje",

        JSON.stringify({

            latitud: destinoLat,

            longitud: destinoLng

        })

    );

    window.location.href =

    "dashboard-pasajero.html";

});





