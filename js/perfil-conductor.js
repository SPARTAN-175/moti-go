import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  doc, getDoc, updateDoc, collection, getDocs,
  query, where, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const BLOQUEO_PERFIL_MS = 24 * 60 * 60 * 1000;
let usuarioActual = null;
let datosUsuario = null;
let localidadesDisponibles = [];
let localidadSeleccionada = null;
let listenerValoraciones = null;
const $ = id => document.getElementById(id);

function normalizar(texto = "") {
  return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function abrirModal(modal) { if (!modal) return; modal.hidden = false; document.body.classList.add("modal-abierto"); }
function cerrarModal(modal) { if (!modal) return; modal.hidden = true; if (![...document.querySelectorAll(".modal-overlay")].some(m => !m.hidden)) document.body.classList.remove("modal-abierto"); }

async function cargarLocalidades() {
  try {
    const snap = await getDocs(collection(db, "destinos"));
    localidadesDisponibles = snap.docs.map(d => ({ id:d.id, ...d.data() }))
      .filter(d => d.activo !== false && normalizar(d.municipio || "") === normalizar("Ostuacán"))
      .sort((a,b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));
    console.log("MOTI GO: localidades disponibles en perfil de repartidor:", localidadesDisponibles.length);
  } catch (e) { console.error("MOTI GO: no se pudieron cargar las localidades:", e); }
}

function prepararLocalidad() {
  const input = $("editarLocalidad"), box = $("listaLocalidadesPerfilConductor");
  if (!input || !box || input.dataset.preparado === "true") return;
  input.dataset.preparado = "true";
  input.addEventListener("input", () => {
    localidadSeleccionada = null;
    box.innerHTML = "";
    const texto = normalizar(input.value);
    if (texto.length < 2) { box.hidden = true; return; }
    const resultados = localidadesDisponibles.filter(d => normalizar(d.nombre || "").includes(texto)).slice(0,8);
    if (!resultados.length) { box.innerHTML = '<div class="localidad-empty">No se encontraron localidades.</div>'; box.hidden = false; return; }
    resultados.forEach(destino => {
      const item = document.createElement("button"); item.type="button"; item.className="localidad-option"; item.textContent=destino.nombre;
      item.addEventListener("mousedown", e => e.preventDefault());
      item.addEventListener("click", () => {
        localidadSeleccionada = destino; input.value = destino.nombre; box.innerHTML=""; box.hidden=true;
        $("mensajeLocalidadPerfil").textContent = `Localidad seleccionada: ${destino.nombre}`;
      });
      box.appendChild(item);
    });
    box.hidden = false;
  });
  input.addEventListener("blur", () => setTimeout(() => { box.hidden = true; }, 180));
}

function render(datos) {
  const nombre = datos.nombre || usuarioActual?.displayName || "Repartidor";
  $("profileInitial").textContent = nombre.trim().charAt(0).toUpperCase() || "R";
  $("profileName").textContent = nombre; $("infoName").textContent=nombre;
  $("infoEmail").textContent = datos.email || usuarioActual?.email || "Sin correo";
  $("infoPhone").textContent = datos.telefono || "Sin teléfono";
  $("infoMunicipio").textContent = datos.municipio || "Ostuacán";
  $("infoLocalidad").textContent = datos.localidad || "Sin localidad configurada";
  $("infoPlaca").textContent = datos.placa || "Sin placa";
  const estado=datos.estadoServicio||"disponible"; $("serviceStatus").textContent=estado==="en_viaje"?"En viaje":estado==="no_disponible"?"No disponible":"Disponible";
}

function actualizarValoracion(promedio, cantidad) {
  const p = Number(promedio)||0; const c=Number(cantidad)||0;
  $("perfilRepartidorPromedio").textContent = c ? p.toFixed(1) : "0.0";
  $("perfilRepartidorCantidad").textContent = c ? `${c} ${c===1?"calificación":"calificaciones"}` : "Sin calificaciones";
  const fill=$("perfilRepartidorEstrellasRelleno"); if(fill) fill.style.width=`${Math.max(0,Math.min(100,(p/5)*100))}%`;
}

function escucharValoraciones(uid) {
  if (listenerValoraciones) listenerValoraciones();
  const q=query(collection(db,"pedidos"),where("repartidorId","==",uid));
  listenerValoraciones=onSnapshot(q,snap=>{
    let suma=0,cantidad=0; snap.forEach(d=>{ const p=d.data()||{}; if(p.estado!=="entregado" || p.entregaConfirmada!==true)return; const e=Number(p.calificacionRepartidor?.estrellas ?? p.valoracionRepartidor?.estrellas); if(Number.isFinite(e)&&e>=1&&e<=5){suma+=e;cantidad++;}});
    actualizarValoracion(cantidad?suma/cantidad:0,cantidad);
  },e=>console.error("MOTI GO: no se pudieron cargar las valoraciones:",e));
}

async function cargarPerfil(user) { const snap=await getDoc(doc(db,"usuarios",user.uid)); if(!snap.exists()) throw new Error("No existe el perfil del repartidor."); datosUsuario=snap.data(); render(datosUsuario); escucharValoraciones(user.uid); }

function abrirEditar() {
  if(!datosUsuario)return; const ultima=datosUsuario.ultimaActualizacionPerfil; const t=ultima?.toMillis?ultima.toMillis():new Date(ultima||0).getTime();
  if(t && Date.now()-t<BLOQUEO_PERFIL_MS){ alert("Puedes volver a modificar tu información después de 24 horas de la última actualización."); return; }
  $("editarNombre").value=datosUsuario.nombre||""; $("editarTelefono").value=datosUsuario.telefono||""; $("editarLocalidad").value=datosUsuario.localidad||""; $("editarPlaca").value=datosUsuario.placa||"";
  localidadSeleccionada=datosUsuario.localidadId?{id:datosUsuario.localidadId,nombre:datosUsuario.localidad,latitud:datosUsuario.localidadLatitud,longitud:datosUsuario.localidadLongitud}:null; $("mensajeLocalidadPerfil").textContent=localidadSeleccionada?`Localidad actual: ${localidadSeleccionada.nombre}`:"Selecciona una localidad."; abrirModal($("modalEditarPerfil"));
}

async function guardarPerfil() {
  if(!usuarioActual)return; const nombre=$("editarNombre").value.trim(), telefono=$("editarTelefono").value.trim(), placa=$("editarPlaca").value.trim();
  if(!nombre||!telefono||!placa){alert("Completa nombre, teléfono y placa.");return;}
  const loc=localidadSeleccionada || localidadesDisponibles.find(d=>normalizar(d.nombre)===normalizar($("editarLocalidad").value)); if(!loc){alert("Selecciona una localidad válida.");return;}
  await updateDoc(doc(db,"usuarios",usuarioActual.uid),{nombre,telefono,placa,municipio:"Ostuacán",localidad:loc.nombre,localidadId:loc.id,localidadLatitud:Number(loc.latitud??loc.latitude??0),localidadLongitud:Number(loc.longitud??loc.longitude??0),ultimaActualizacionPerfil:serverTimestamp()});
  datosUsuario={...datosUsuario,nombre,telefono,placa,municipio:"Ostuacán",localidad:loc.nombre,localidadId:loc.id,localidadLatitud:Number(loc.latitud??loc.latitude??0),localidadLongitud:Number(loc.longitud??loc.longitude??0),ultimaActualizacionPerfil:new Date()}; render(datosUsuario); cerrarModal($("modalEditarPerfil")); alert("Información actualizada correctamente.");
}

async function cambiarPassword(){
  const actual=$("passwordActualConductor").value,nueva=$("passwordNuevaConductor").value,nueva2=$("passwordNueva2Conductor").value; if(!actual||!nueva||!nueva2){alert("Completa todos los campos.");return;} if(nueva!==nueva2){alert("Las contraseñas no coinciden.");return;} if(nueva.length<8){alert("La nueva contraseña debe tener al menos 8 caracteres.");return;}
  try{const cred=EmailAuthProvider.credential(usuarioActual.email,actual);await reauthenticateWithCredential(usuarioActual,cred);await updatePassword(usuarioActual,nueva); $("passwordActualConductor").value=$("passwordNuevaConductor").value=$("passwordNueva2Conductor").value=""; cerrarModal($("modalPasswordConductor")); alert("Contraseña actualizada correctamente.");}catch(e){console.error(e);alert(e.code==="auth/invalid-credential"||e.code==="auth/wrong-password"?"La contraseña actual es incorrecta.":"No se pudo actualizar la contraseña.");}
}

async function recuperarPassword(){ if(!usuarioActual?.email){alert("No hay un correo electrónico asociado a esta cuenta.");return;} try{await sendPasswordResetEmail(auth,usuarioActual.email);alert(`Enviamos un enlace de recuperación a ${usuarioActual.email}.`);}catch(e){console.error(e);alert("No se pudo enviar el correo de recuperación.");} }

$("btnEditarPerfil")?.addEventListener("click",abrirEditar); $("btnGuardarPerfil")?.addEventListener("click",()=>guardarPerfil().catch(e=>{console.error(e);alert("No se pudieron guardar los cambios.");})); $("btnCerrarEditarPerfil")?.addEventListener("click",()=>cerrarModal($("modalEditarPerfil"))); $("btnCambiarPassword")?.addEventListener("click",()=>abrirModal($("modalPasswordConductor"))); $("btnGuardarPasswordConductor")?.addEventListener("click",cambiarPassword); $("btnCerrarPasswordConductor")?.addEventListener("click",()=>cerrarModal($("modalPasswordConductor"))); $("btnCerrarPasswordConductor2")?.addEventListener("click",()=>cerrarModal($("modalPasswordConductor"))); $("btnRecuperarPassword")?.addEventListener("click",recuperarPassword);
$("editarLocalidad")?.addEventListener("focus",()=>{if(!localidadesDisponibles.length)cargarLocalidades();});
prepararLocalidad(); cargarLocalidades();
onAuthStateChanged(auth,async user=>{if(!user)return; usuarioActual=user; console.log("MOTI GO: usuario autenticado:",user.uid); try{await cargarPerfil(user);console.log("MOTI GO: perfil cargado correctamente.");}catch(e){console.error("MOTI GO: error cargando perfil:",e);alert("No se pudo cargar la información de tu perfil.");}});
