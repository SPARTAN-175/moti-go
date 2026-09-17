import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential, updatePassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const BLOQUEO_PERFIL_MS = 24 * 60 * 60 * 1000;
let usuarioActual = null;
let datosUsuario = null;
let localidadesDisponibles = [];
let localidadSeleccionada = null;

const $ = id => document.getElementById(id);

async function cargarLocalidades() {
    try {
        const snap = await getDocs(collection(db, "destinos"));
        localidadesDisponibles = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.activo !== false && String(d.municipio || "").toLowerCase() === "ostuacán".toLowerCase()).sort((a,b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));
        console.log("MOTI GO: localidades disponibles en perfil de repartidor:", localidadesDisponibles.length);
    } catch (e) { console.error("MOTI GO: no se pudieron cargar las localidades:", e); }
}
function normalizar(texto="") { return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function prepararLocalidad() {
    const input = $("editarLocalidad"); if (!input) return;
    input.addEventListener("input", async () => {
        const texto = normalizar(input.value); const box = $("listaLocalidadesPerfilConductor"); if (!box) return;
        box.innerHTML = ""; localidadSeleccionada = null;
        if (texto.length < 2) return;
        const resultados = localidadesDisponibles.filter(d => normalizar(d.nombre).includes(texto)).slice(0, 8);
        resultados.forEach(destino => {
            const b = document.createElement("button"); b.type="button"; b.textContent=destino.nombre; b.style.cssText="display:block;width:100%;text-align:left;padding:10px;border:1px solid #e2e8f0;background:#fff;cursor:pointer";
            b.addEventListener("click", () => { localidadSeleccionada=destino; input.value=destino.nombre; box.innerHTML=""; $("mensajeLocalidadPerfil").textContent=`Localidad seleccionada: ${destino.nombre}`; }); box.appendChild(b);
        });
        if (!resultados.length) box.innerHTML='<div style="padding:10px;color:#64748b">No se encontraron localidades.</div>';
    });
}

function render(datos) {
    $("profileName").textContent=datos.nombre||"-"; $("infoName").textContent=datos.nombre||"-"; $("infoPhone").textContent=datos.telefono||"-"; $("infoMunicipio").textContent=datos.municipio||"Ostuacán"; $("infoLocalidad").textContent=datos.localidad||"Sin localidad configurada"; $("infoPlaca").textContent=datos.placa||"-";
    const estado=datos.estadoServicio||"disponible", el=$("serviceStatus"); if(el) el.textContent=estado==="en_viaje"?"En viaje":estado==="no_disponible"?"No disponible":"Disponible";
}
async function cargarPerfil(user){ usuarioActual=user; const snap=await getDoc(doc(db,"usuarios",user.uid)); if(!snap.exists()) return; datosUsuario=snap.data(); render(datosUsuario); }
function abrirEditar(){ if(!datosUsuario)return; const ultima=datosUsuario.ultimaActualizacionPerfil; const t=ultima?.toMillis?ultima.toMillis():new Date(ultima||0).getTime(); if(t && Date.now()-t<BLOQUEO_PERFIL_MS){ alert("Puedes volver a modificar tu información después de 24 horas de la última actualización."); return; } $("editarNombre").value=datosUsuario.nombre||""; $("editarTelefono").value=datosUsuario.telefono||""; $("editarLocalidad").value=datosUsuario.localidad||""; $("editarPlaca").value=datosUsuario.placa||""; localidadSeleccionada=datosUsuario.localidadId?{id:datosUsuario.localidadId,nombre:datosUsuario.localidad,latitud:datosUsuario.localidadLatitud,longitud:datosUsuario.localidadLongitud}:null; $("modalEditarPerfil").style.display="block"; }
async function guardarPerfil(){ const nombre=$("editarNombre").value.trim(), telefono=$("editarTelefono").value.trim(), placa=$("editarPlaca").value.trim(); if(!nombre||!telefono||!placa){alert("Completa nombre, teléfono y placa.");return;} const loc=localidadSeleccionada || localidadesDisponibles.find(d=>normalizar(d.nombre)===normalizar($("editarLocalidad").value)); if(!loc){alert("Selecciona una localidad válida.");return;} await updateDoc(doc(db,"usuarios",usuarioActual.uid),{nombre,telefono,placa,municipio:"Ostuacán",localidad:loc.nombre,localidadId:loc.id,localidadLatitud:Number(loc.latitud??loc.latitude??0),localidadLongitud:Number(loc.longitud??loc.longitude??0),ultimaActualizacionPerfil:new Date()}); datosUsuario={...datosUsuario,nombre,telefono,placa,municipio:"Ostuacán",localidad:loc.nombre,localidadId:loc.id,localidadLatitud:Number(loc.latitud??loc.latitude??0),localidadLongitud:Number(loc.longitud??loc.longitude??0),ultimaActualizacionPerfil:new Date()}; render(datosUsuario); $("modalEditarPerfil").style.display="none"; alert("Información actualizada correctamente."); }
async function cambiarPassword(){ const actual=$("passwordActualConductor").value,nueva=$("passwordNuevaConductor").value,nueva2=$("passwordNueva2Conductor").value; if(!actual||!nueva||!nueva2){alert("Completa todos los campos.");return;} if(nueva!==nueva2){alert("Las contraseñas no coinciden.");return;} if(nueva.length<6){alert("La nueva contraseña debe tener al menos 6 caracteres.");return;} try{const cred=EmailAuthProvider.credential(usuarioActual.email,actual);await reauthenticateWithCredential(usuarioActual,cred);await updatePassword(usuarioActual,nueva);alert("Contraseña actualizada correctamente.");$("modalPasswordConductor").style.display="none";}catch(e){console.error(e);alert(e.code==="auth/wrong-password"?"La contraseña actual es incorrecta.":"No se pudo actualizar la contraseña.");}}
$("btnEditarPerfil")?.addEventListener("click",e=>{e.preventDefault();abrirEditar();}); $("btnGuardarPerfil")?.addEventListener("click",()=>guardarPerfil().catch(e=>{console.error(e);alert("No se pudieron guardar los cambios.");})); $("btnCerrarEditarPerfil")?.addEventListener("click",()=>$("modalEditarPerfil").style.display="none"); $("btnCambiarPassword")?.addEventListener("click",e=>{e.preventDefault();$("modalPasswordConductor").style.display="block";}); $("btnGuardarPasswordConductor")?.addEventListener("click",cambiarPassword); $("btnCerrarPasswordConductor")?.addEventListener("click",()=>$("modalPasswordConductor").style.display="none");
$("editarLocalidad")?.addEventListener("focus",()=>{if(!localidadesDisponibles.length)cargarLocalidades();});
prepararLocalidad(); cargarLocalidades();
onAuthStateChanged(auth, async user=>{if(!user)return; console.log("MOTI GO: usuario autenticado:",user.uid); try{await cargarPerfil(user);}catch(e){console.error("MOTI GO: error cargando perfil:",e);}});
