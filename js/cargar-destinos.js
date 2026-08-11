import { db }
from "./firebase-config.js";

import {

doc,
setDoc

}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const btn =
document.getElementById(
"btnCargar"
);

const log =
document.getElementById(
"log"
);


// ===========================
// LISTA DE DESTINOS
// ===========================

const destinos = [

{
id:"ostuacan",
nombre:"Ostuacán",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.405591,
longitud:-93.337136,
tipo:"oficial",
activo:true
},

{
id:"amacoite_1ra_seccion",
nombre:"Amacoíte 1ra. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.508221,
longitud:-93.498209,
tipo:"oficial",
activo:true
},

{
id:"antonio_leon",
nombre:"Antonio León",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.410662,
longitud:-93.476789,
tipo:"oficial",
activo:true
},

{
id:"catedral_2da_seccion",
nombre:"Catedral 2da. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.429279,
longitud:-93.351962,
tipo:"oficial",
activo:true
},

{
id:"catedral_de_chiapas",
nombre:"Catedral de Chiapas",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.441057,
longitud:-93.296661,
tipo:"oficial",
activo:true
},

{
id:"copano_1ra_seccion",
nombre:"Copano 1ra. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.477784,
longitud:-93.393041,
tipo:"oficial",
activo:true
},

{
id:"cuauhtemoc",
nombre:"Cuauhtémoc",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.313168,
longitud:-93.451812,
tipo:"oficial",
activo:true
},

{
id:"laguna_abajo",
nombre:"Laguna Abajo",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.396287,
longitud:-93.327877,
tipo:"oficial",
activo:true
},

{
id:"laguna_arriba",
nombre:"Laguna Arriba",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.369831,
longitud:-93.295362,
tipo:"oficial",
activo:true
},

{
id:"la_laja",
nombre:"La Laja",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.383862,
longitud:-93.370276,
tipo:"oficial",
activo:true
},

{
id:"maspac_abajo_1ra_seccion",
nombre:"Maspac Abajo 1ra. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.397605,
longitud:-93.354833,
tipo:"oficial",
activo:true
},

{
id:"maspac_arriba_3ra_seccion",
nombre:"Maspac Arriba 3ra. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.354391,
longitud:-93.334674,
tipo:"oficial",
activo:true
},

{
id:"muspac",
nombre:"Muspac",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.423949,
longitud:-93.410756,
tipo:"oficial",
activo:true
},

{
id:"paraiso_1ra_seccion",
nombre:"Paraíso 1ra. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.488291,
longitud:-93.308293,
tipo:"oficial",
activo:true
},

{
id:"penitas_el_mico",
nombre:"Peñitas el Mico",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.460747,
longitud:-93.434908,
tipo:"oficial",
activo:true
},

{
id:"plan_de_ayala",
nombre:"Plan de Ayala",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.473983,
longitud:-93.486818,
tipo:"oficial",
activo:true
},

{
id:"playa_de_piedra_1ra_seccion",
nombre:"Playa de Piedra 1ra. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.543060,
longitud:-93.479392,
tipo:"oficial",
activo:true
},

{
id:"playa_larga_1ra_seccion",
nombre:"Playa Larga 1ra. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.382820,
longitud:-93.455746,
tipo:"oficial",
activo:true
},

{
id:"playa_larga_3ra_seccion",
nombre:"Playa Larga 3ra. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.355943,
longitud:-93.479202,
tipo:"oficial",
activo:true
},

{
id:"nuevo_sayula",
nombre:"Nuevo Sayula",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.390565,
longitud:-93.415942,
tipo:"oficial",
activo:true
},

{
id:"tanchichal",
nombre:"Tanchichal",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.407291,
longitud:-93.305760,
tipo:"oficial",
activo:true
},

{
id:"xochimilco_reymundo_enriquez",
nombre:"Xochimilco (Reymundo Enríquez)",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.390195,
longitud:-93.304718,
tipo:"oficial",
activo:true
},

{
id:"paraiso_3ra_seccion",
nombre:"Paraíso 3ra. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.473564,
longitud:-93.313289,
tipo:"oficial",
activo:true
},

{
id:"copano_2da_seccion",
nombre:"Copano 2da. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.497063,
longitud:-93.404593,
tipo:"oficial",
activo:true
},

{
id:"playa_de_piedra_2da_seccion",
nombre:"Playa de Piedra 2da. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.568485,
longitud:-93.423139,
tipo:"oficial",
activo:true
},

{
id:"lazaro_cardenas",
nombre:"Lázaro Cárdenas",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.337791,
longitud:-93.370434,
tipo:"oficial",
activo:true
},

{
id:"el_llano",
nombre:"El Llano",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.404478,
longitud:-93.386526,
tipo:"oficial",
activo:true
},

{
id:"catedral_1ra_seccion",
nombre:"Catedral 1ra. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.426016,
longitud:-93.324998,
tipo:"oficial",
activo:true
},

{
id:"paraiso_2da_seccion",
nombre:"Paraíso 2da. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.463784,
longitud:-93.350854,
tipo:"oficial",
activo:true
},

{
id:"juan_del_grijalva",
nombre:"Juan del Grijalva",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.364542,
longitud:-93.381284,
tipo:"oficial",
activo:true
},

{
id:"lindavista",
nombre:"Lindavista",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.473694,
longitud:-93.479145,
tipo:"oficial",
activo:true
},

{
id:"bajo_amacoite",
nombre:"Bajo Amacoíte",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.522677,
longitud:-93.494083,
tipo:"oficial",
activo:true
},

{
id:"nuevo_guadalupe_victoria",
nombre:"Nuevo Guadalupe Victoria",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.406690,
longitud:-93.530725,
tipo:"oficial",
activo:true
},

{
id:"penitas",
nombre:"Peñitas",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.463988,
longitud:-93.479315,
tipo:"oficial",
activo:true
},

{
id:"nuevo_xochimilco",
nombre:"Nuevo Xochimilco",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.454834,
longitud:-93.368543,
tipo:"oficial",
activo:true
},

{
id:"alto_amacoite_2da_seccion",
nombre:"Alto Amacoite 2da. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.436064,
longitud:-93.519451,
tipo:"oficial",
activo:true
},

{
id:"alto_amacoite_3ra_seccion",
nombre:"Alto Amacoíte 3ra. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.414715,
longitud:-93.499894,
tipo:"oficial",
activo:true
},

{
id:"nuevo_emiliano_zapata",
nombre:"Nuevo Emiliano Zapata",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.453651,
longitud:-93.474030,
tipo:"oficial",
activo:true
},

{
id:"la_pena_1ra_seccion",
nombre:"La Peña 1ra. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.511148,
longitud:-93.462340,
tipo:"oficial",
activo:true
},

{
id:"la_pena_2da_seccion",
nombre:"La Peña 2da. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.527970,
longitud:-93.435486,
tipo:"oficial",
activo:true
},

{
id:"nuevo_penitas",
nombre:"Nuevo Peñitas",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.454530,
longitud:-93.457505,
tipo:"oficial",
activo:true
},

{
id:"la_pena_3ra_seccion",
nombre:"La Peña 3ra. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.516113,
longitud:-93.414038,
tipo:"oficial",
activo:true
},

{
id:"loma_bonita",
nombre:"Loma Bonita",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.362831,
longitud:-93.462141,
tipo:"oficial",
activo:true
},

{
id:"el_triunfo",
nombre:"El Triunfo",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.346601,
longitud:-93.350996,
tipo:"oficial",
activo:true
},

{
id:"laguna_la_campana",
nombre:"Laguna la Campana",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.364011,
longitud:-93.326907,
tipo:"oficial",
activo:true
},

{
id:"salomon_gonzalez_blanco",
nombre:"Salomón González Blanco",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.394691,
longitud:-93.409273,
tipo:"oficial",
activo:true
},

{
id:"altamira",
nombre:"Altamira",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.440795,
longitud:-93.348708,
tipo:"oficial",
activo:true
},

{
id:"las_amarillas",
nombre:"Las Amarillas",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.324884,
longitud:-93.420996,
tipo:"oficial",
activo:true
},

{
id:"penitas_el_mico_2",
nombre:"Peñitas el Mico",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.470539,
longitud:-93.456966,
tipo:"oficial",
activo:true
},

{
id:"el_bocacio",
nombre:"El Bocacio",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.489759,
longitud:-93.500046,
tipo:"oficial",
activo:true
},

{
id:"candelaria",
nombre:"Candelaria",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.488176,
longitud:-93.417994,
tipo:"oficial",
activo:true
},

{
id:"el_carmen",
nombre:"El Carmen",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.440807,
longitud:-93.330554,
tipo:"oficial",
activo:true
},

{
id:"el_chamizal",
nombre:"El Chamizal",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.471992,
longitud:-93.344864,
tipo:"oficial",
activo:true
},

{
id:"el_cinco",
nombre:"El Cinco",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.426769,
longitud:-93.349710,
tipo:"oficial",
activo:true
},

{
id:"el_coconal",
nombre:"El Coconal",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.506217,
longitud:-93.498045,
tipo:"oficial",
activo:true
},

{
id:"la_providencia",
nombre:"La Providencia",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.459833,
longitud:-93.504322,
tipo:"oficial",
activo:true
},

{
id:"la_conformidad",
nombre:"La Conformidad",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.450070,
longitud:-93.488051,
tipo:"oficial",
activo:true
},

{
id:"dolores",
nombre:"Dolores",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.451315,
longitud:-93.403214,
tipo:"oficial",
activo:true
},

{
id:"la_esperanza",
nombre:"La Esperanza",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.433433,
longitud:-93.308888,
tipo:"oficial",
activo:true
},

{
id:"la_espuela",
nombre:"La Espuela",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.521920,
longitud:-93.450845,
tipo:"oficial",
activo:true
},

{
id:"la_gloria",
nombre:"La Gloria",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.542344,
longitud:-93.428826,
tipo:"oficial",
activo:true
},

{
id:"grano_de_oro",
nombre:"Grano de Oro",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.485159,
longitud:-93.498755,
tipo:"oficial",
activo:true
},

{
id:"grano_de_oro_2",
nombre:"Grano de Oro",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.427002,
longitud:-93.350720,
tipo:"oficial",
activo:true
},

{
id:"la_herradura",
nombre:"La Herradura",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.446510,
longitud:-93.359461,
tipo:"oficial",
activo:true
},

{
id:"la_ilusion",
nombre:"La Ilusión",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.528309,
longitud:-93.443696,
tipo:"oficial",
activo:true
},

{
id:"el_limon",
nombre:"El Limón",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.450541,
longitud:-93.492277,
tipo:"oficial",
activo:true
},

{
id:"novillero",
nombre:"Novillero",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.433228,
longitud:-93.350106,
tipo:"oficial",
activo:true
},

{
id:"la_perseverancia",
nombre:"La Perseverancia",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.452058,
longitud:-93.387700,
tipo:"oficial",
activo:true
},

{
id:"san_antolin",
nombre:"San Antolin",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.484463,
longitud:-93.498504,
tipo:"oficial",
activo:true
},

{
id:"el_refugio",
nombre:"El Refugio",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.450938,
longitud:-93.482646,
tipo:"oficial",
activo:true
},

{
id:"el_refugio_2",
nombre:"El Refugio",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.508751,
longitud:-93.491649,
tipo:"oficial",
activo:true
},

{
id:"el_rosario",
nombre:"El Rosario",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.494558,
longitud:-93.500008,
tipo:"oficial",
activo:true
},

{
id:"san_antonio_los_potrillos",
nombre:"San Antonio los Potrillos",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.523685,
longitud:-93.447316,
tipo:"oficial",
activo:true
},

{
id:"san_antonio",
nombre:"San Antonio",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.525121,
longitud:-93.482258,
tipo:"oficial",
activo:true
},

{
id:"san_jose",
nombre:"San José",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.449118,
longitud:-93.496587,
tipo:"oficial",
activo:true
},

{
id:"san_lorenzo",
nombre:"San Lorenzo",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.423397,
longitud:-93.354021,
tipo:"oficial",
activo:true
},

{
id:"san_miguel",
nombre:"San Miguel",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.460799,
longitud:-93.349259,
tipo:"oficial",
activo:true
},

{
id:"san_miguel_2",
nombre:"San Miguel",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.425614,
longitud:-93.349590,
tipo:"oficial",
activo:true
},

{
id:"buenos_aires",
nombre:"Buenos Aires",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.536753,
longitud:-93.435809,
tipo:"oficial",
activo:true
},

{
id:"santa_rosa",
nombre:"Santa Rosa",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.459224,
longitud:-93.384656,
tipo:"oficial",
activo:true
},

{
id:"san_gregorio",
nombre:"San Gregorio",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.453912,
longitud:-93.356634,
tipo:"oficial",
activo:true
},

{
id:"el_nuevo_amanecer",
nombre:"El Nuevo Amanecer",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.502370,
longitud:-93.499934,
tipo:"oficial",
activo:true
},

{
id:"maspac_arriba_2da_seccion",
nombre:"Maspac Arriba 2da. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.378613,
longitud:-93.345721,
tipo:"oficial",
activo:true
},

{
id:"el_carmen_2",
nombre:"El Carmen",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.450227,
longitud:-93.394651,
tipo:"oficial",
activo:true
},

{
id:"la_florida_kilometro_37",
nombre:"La Florida (Kilómetro 37)",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.398920,
longitud:-93.533353,
tipo:"oficial",
activo:true
},

{
id:"el_polvorin",
nombre:"El Polvorín",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.485983,
longitud:-93.499013,
tipo:"oficial",
activo:true
},

{
id:"mauro_hernandez_perez",
nombre:"Mauro Hernández Pérez",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.389492,
longitud:-93.540848,
tipo:"oficial",
activo:true
},

{
id:"nueva_esperanza_san_rosendo",
nombre:"Nueva Esperanza (San Rosendo)",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.418512,
longitud:-93.395987,
tipo:"oficial",
activo:true
},

{
id:"san_lorenzo_2",
nombre:"San Lorenzo",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.468138,
longitud:-93.395465,
tipo:"oficial",
activo:true
},

{
id:"el_progreso",
nombre:"El Progreso",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.358447,
longitud:-93.353836,
tipo:"oficial",
activo:true
},

{
id:"los_milagros",
nombre:"Los Milagros",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.482113,
longitud:-93.405158,
tipo:"oficial",
activo:true
},

{
id:"san_jose_el_porvenir",
nombre:"San José el Porvenir",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.382271,
longitud:-93.289566,
tipo:"oficial",
activo:true
},

{
id:"los_altos_de_playa_larga",
nombre:"Los Altos de Playa Larga",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.301100,
longitud:-93.387998,
tipo:"oficial",
activo:true
},

{
id:"nuevo_milenio",
nombre:"Nuevo Milenio",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.409013,
longitud:-93.327828,
tipo:"oficial",
activo:true
},

{
id:"benito_juarez",
nombre:"Benito Juárez",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.419265,
longitud:-93.384782,
tipo:"oficial",
activo:true
},

{
id:"licenciado_pablo_salazar_mendiguchia",
nombre:"Licenciado Pablo Salazar Mendiguchia",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.417624,
longitud:-93.386582,
tipo:"oficial",
activo:true
},

{
id:"nuevo_ixtacomitan",
nombre:"Nuevo Ixtacomitán",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.441654,
longitud:-93.388769,
tipo:"oficial",
activo:true
},

{
id:"pobladores_de_pichucalco",
nombre:"Pobladores de Pichucalco",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.444348,
longitud:-93.406259,
tipo:"oficial",
activo:true
},

{
id:"nuevo_juan_del_grijalva",
nombre:"Nuevo Juan del Grijalva",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.426957,
longitud:-93.372070,
tipo:"oficial",
activo:true
},

{
id:"nueva_alianza",
nombre:"Nueva Alianza",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.409245,
longitud:-93.329365,
tipo:"oficial",
activo:true
},

{
id:"explanada_san_judas_tadeo",
nombre:"Explanada San Judas Tadeo",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.360455,
longitud:-93.317599,
tipo:"oficial",
activo:true
},

{
id:"anexo_la_pena_2da_seccion",
nombre:"Anexo la Peña 2da. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.565763,
longitud:-93.409253,
tipo:"oficial",
activo:true
},

{
id:"la_candelaria",
nombre:"La Candelaria",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.456117,
longitud:-93.390623,
tipo:"oficial",
activo:true
},

{
id:"anexo_paraiso_2da_seccion_los_cruces",
nombre:"Anexo Paraíso 2da. Sección los Cruces",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.448355,
longitud:-93.335913,
tipo:"oficial",
activo:true
},

{
id:"anexo_catedral_1ra_seccion",
nombre:"Anexo Catedral 1ra. Sección",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.438283,
longitud:-93.343406,
tipo:"oficial",
activo:true
},

{
id:"los_cruzes",
nombre:"Los Cruzes",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.366946,
longitud:-93.448660,
tipo:"oficial",
activo:true
},

{
id:"anexo_loma_bonita",
nombre:"Anexo Loma Bonita",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.345935,
longitud:-93.470762,
tipo:"oficial",
activo:true
},

{
id:"la_pigua",
nombre:"La Pigua",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.372600,
longitud:-93.399190,
tipo:"oficial",
activo:true
},

{
id:"anexo_antonio_leon",
nombre:"Anexo Antonio León",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.422728,
longitud:-93.455846,
tipo:"oficial",
activo:true
},

{
id:"san_agustin",
nombre:"San Agustín",
municipio:"Ostuacán",
estado:"Chiapas",
latitud:17.470431,
longitud:-93.506396,
tipo:"oficial",
activo:true
}
];
// ===========================
// CARGAR
// ===========================

btn.addEventListener(

"click",

cargarDestinos

);


async function cargarDestinos(){

log.textContent="";

for(const destino of destinos){

await setDoc(

doc(

db,

"destinos",

destino.id

),

destino

);

log.textContent +=

"✔ "

+

destino.nombre

+

"\n";

}

log.textContent +=

"\n\n✅ CARGA FINALIZADA";

}
