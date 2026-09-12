import { auth, db } from "./firebase-config.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// =====================================================
// MOTI GO — DASHBOARD DEL REPARTIDOR
// Este archivo controla únicamente la interfaz y los datos
// del panel. El motor operativo de pedidos permanece en
// moti-go-repartidor.js.
// =====================================================

const $ = id => document.getElementById(id);

const statusButton = $("statusButton");
const statusDescription = $("statusDescription");
const statusIndicator = $("statusIndicator");
const statusToggle = $("statusToggle");
const activeTripCard = $("activeTripCard");
const activePassenger = $("activePassenger");
const activeDestination = $("activeDestination");
const activeStatus = $("activeStatus");
const continueTrip = $("continueTrip");
const userName = $("userName");
const sideUserName = $("sideUserName");
const todayOrders = $("todayOrders");
const todayEarnings = $("todayEarnings");
const walletBalance = $("walletBalance");
const walletEarnings = $("walletEarnings");
const walletFees = $("walletFees");
const todayDate = $("todayDate");

const sideMenu = $("sideMenu");
const menuOverlay = $("menuOverlay");
const openMenu = $("openMenu");
const closeMenu = $("closeMenu");

let currentState = "disponible";
let usuarioDatos = null;
let pedidosActuales = [];
let movimientosFundador = [];
let unsubscribePedidos = null;
let unsubscribeUsuario = null;
let unsubscribeFundador = null;

function dinero(valor) {
    const n = Number(valor) || 0;
    return n.toLocaleString("es-MX", { style:"currency", currency:"MXN" });
}

function escapar(valor) {
    return String(valor ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

function fechaDe(valor) {
    if (!valor) return null;
    if (typeof valor?.toDate === "function") return valor.toDate();
    if (valor instanceof Date) return valor;
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? null : d;
}

function fechaTexto(valor) {
    const d = fechaDe(valor);
    if (!d) return "Fecha no disponible";
    return d.toLocaleString("es-MX", {
        day:"2-digit", month:"short", year:"numeric",
        hour:"2-digit", minute:"2-digit"
    });
}

function esHoy(valor) {
    const d = fechaDe(valor);
    if (!d) return false;
    const hoy = new Date();
    return d.getFullYear() === hoy.getFullYear() &&
           d.getMonth() === hoy.getMonth() &&
           d.getDate() === hoy.getDate();
}

function obtenerFechaPedido(pedido) {
    return pedido.fechaFinalizacion || pedido.actualizadoEn || pedido.creadoEn || pedido.fechaCreacion;
}

function obtenerGananciaEntrega(pedido) {
    const c = pedido?.comisiones?.repartidor;
    if (c && typeof c === "object") return Number(c.monto) || 0;
    if (c !== undefined) return Number(c) || 0;
    return Number(pedido?.costoEntrega) || 0;
}

function esEntregado(pedido) {
    return String(pedido?.estado || "").toLowerCase() === "entregado";
}

function estadoBonito(estado) {
    const mapa = {
        solicitud_repartidor:"Solicitud",
        asignado:"Asignado",
        en_camino_tienda:"En camino a tienda",
        en_tienda:"En tienda",
        en_camino_cliente:"En camino al cliente",
        entregado:"Entregado",
        cancelado:"Cancelado",
        pendiente:"Pendiente"
    };
    return mapa[estado] || String(estado || "Sin estado");
}

// =====================================================
// MENÚ — TODO SIN CAMBIAR DE PÁGINA
// =====================================================

function abrirMenu() {
    if (!sideMenu) return;
    sideMenu.classList.add("open");
    menuOverlay?.classList.add("open");
    document.body.classList.add("menu-open");
}

function cerrarMenu() {
    sideMenu?.classList.remove("open");
    menuOverlay?.classList.remove("open");
    document.body.classList.remove("menu-open");
}

openMenu?.addEventListener("click", abrirMenu);
closeMenu?.addEventListener("click", cerrarMenu);
menuOverlay?.addEventListener("click", cerrarMenu);

document.querySelectorAll("[data-view]").forEach(boton => {
    boton.addEventListener("click", event => {
        event.preventDefault();
        const vista = boton.dataset.view;
        mostrarVista(vista);
    });
});

function mostrarVista(nombre) {
    const ids = ["pedidos","cartera","ganancias","zonas","historial","perfil"];
    ids.forEach(id => {
        const el = $("view-" + id);
        if (el) el.hidden = id !== nombre;
    });

    document.querySelectorAll(".side-link[data-view]").forEach(b => {
        b.classList.toggle("active", b.dataset.view === nombre);
    });

    if (nombre === "pedidos") renderPedidos();
    if (nombre === "cartera") renderCartera();
    if (nombre === "ganancias") renderGanancias();
    if (nombre === "zonas") renderZonas();
    if (nombre === "historial") renderHistorial();
    if (nombre === "perfil") renderPerfil();

    cerrarMenu();
    window.scrollTo({ top:0, behavior:"smooth" });
}

// =====================================================
// ESTADO REAL
// =====================================================

function actualizarVistaEstado() {
    if (!statusButton || !statusIndicator) return;

    statusButton.classList.remove("status-green","status-gray","status-yellow");
    statusIndicator.classList.remove("available","unavailable","busy");

    if (currentState === "ocupado") {
        statusButton.textContent = "Ocupado";
        statusDescription.textContent = "Tienes un pedido activo";
        statusButton.classList.add("status-yellow");
        statusIndicator.classList.add("busy");
        return;
    }

    if (currentState === "no_disponible") {
        statusButton.textContent = "No disponible";
        statusDescription.textContent = "No estás recibiendo pedidos";
        statusButton.classList.add("status-gray");
        statusIndicator.classList.add("unavailable");
        return;
    }

    currentState = "disponible";
    statusButton.textContent = "Disponible";
    statusDescription.textContent = "Estás recibiendo pedidos";
    statusButton.classList.add("status-green");
    statusIndicator.classList.add("available");
}

function obtenerPedidoActivoId(datos) {
    const viaje = datos?.viajeActivo;
    if (typeof viaje === "string") return viaje;
    if (viaje && typeof viaje === "object") return viaje.pedidoId || null;
    return null;
}

async function actualizarEstadoDesdeUsuario(datos) {
    const activo = obtenerPedidoActivoId(datos);
    currentState = activo ? "ocupado" : (datos.estadoServicio || "disponible");
    actualizarVistaEstado();

    if (activo) {
        const snap = await getDoc(doc(db,"pedidos",activo));
        if (snap.exists()) {
            mostrarPedidoActivo({id:snap.id,...snap.data()});
        }
    } else if (activeTripCard) {
        activeTripCard.style.display = "none";
    }
}

async function cambiarDisponibilidad() {
    if (!auth.currentUser || currentState === "ocupado") return;
    const nuevo = currentState === "disponible" ? "no_disponible" : "disponible";
    try {
        await updateDoc(doc(db,"usuarios",auth.currentUser.uid), { estadoServicio:nuevo });
    } catch (error) {
        console.error("Error cambiando disponibilidad:",error);
        alert("No se pudo cambiar tu disponibilidad.");
    }
}

statusToggle?.addEventListener("click", cambiarDisponibilidad);

function mostrarPedidoActivo(pedido) {
    if (!activeTripCard) return;
    activeTripCard.style.display = "block";
    if (activePassenger) activePassenger.textContent = pedido.clienteNombre || pedido.nombreCliente || "Cliente MOTI GO";
    if (activeDestination) activeDestination.textContent = pedido.destino?.localidad || pedido.ubicacionEntrega?.localidad || pedido.ubicacionEntrega?.direccion || "Ubicación registrada";
    if (activeStatus) activeStatus.textContent = estadoBonito(pedido.estado);
}

continueTrip?.addEventListener("click", () => {
    // La pantalla operativa del viaje sigue siendo la original y no se modifica.
    window.location.href = "viaje-activo.html";
});

// =====================================================
// DATOS EN TIEMPO REAL
// =====================================================

function escucharUsuario(uid) {
    unsubscribeUsuario?.();
    unsubscribeUsuario = onSnapshot(doc(db,"usuarios",uid), async snap => {
        if (!snap.exists()) return;
        usuarioDatos = snap.data();
        const nombre = usuarioDatos.nombre || auth.currentUser?.displayName || "Repartidor";
        if (userName) userName.textContent = `Hola ${nombre}`;
        if (sideUserName) sideUserName.textContent = nombre;
        await actualizarEstadoDesdeUsuario(usuarioDatos);
        escucharMovimientosFundador(uid);
        actualizarResumenInicio();
        renderPerfil();
        renderZonas();
        renderCartera();
        renderGanancias();
    }, error => console.error("Error escuchando usuario:",error));
}

function escucharPedidos(uid) {
    unsubscribePedidos?.();
    const q = query(collection(db,"pedidos"), where("repartidorId","==",uid));
    unsubscribePedidos = onSnapshot(q, snap => {
        pedidosActuales = snap.docs.map(d => ({id:d.id,...d.data()}));
        pedidosActuales.sort((a,b) => (fechaDe(obtenerFechaPedido(b))?.getTime() || 0) - (fechaDe(obtenerFechaPedido(a))?.getTime() || 0));
        actualizarResumenInicio();
        renderPedidos();
        renderHistorial();
        renderGanancias();
    }, error => console.error("Error escuchando pedidos del repartidor:",error));
}

function escucharMovimientosFundador(uid) {
    unsubscribeFundador?.();
    if (usuarioDatos?.esFundador !== true) {
        movimientosFundador = [];
        renderGanancias();
        return;
    }
    const q = query(collection(db,"movimientosTiendas"), where("fundadorId","==",uid));
    unsubscribeFundador = onSnapshot(q, snap => {
        movimientosFundador = snap.docs.map(d => ({id:d.id,...d.data()}));
        renderGanancias();
    }, error => {
        console.warn("No se pudieron leer movimientos de fundador:",error);
        movimientosFundador = [];
    });
}

// =====================================================
// RESUMEN DEL INICIO — DATOS REALES DE PEDIDOS
// =====================================================

function actualizarResumenInicio() {
    const hoy = pedidosActuales.filter(p => esHoy(obtenerFechaPedido(p)));
    const entregadosHoy = hoy.filter(esEntregado);
    const gananciasHoy = entregadosHoy.reduce((t,p) => t + obtenerGananciaEntrega(p),0);

    if (todayOrders) todayOrders.textContent = entregadosHoy.length;
    if (todayEarnings) todayEarnings.textContent = dinero(gananciasHoy);

    // El saldo/cartera existente se muestra como dato almacenado; no se recalcula ni se muta aquí.
    const saldo = Number(usuarioDatos?.saldoCartera) || 0;
    const ganancias = Number(usuarioDatos?.gananciasTotales) || 0;
    const comisiones = Number(usuarioDatos?.comisionesTotales) || 0;
    if (walletBalance) walletBalance.textContent = dinero(saldo);
    if (walletEarnings) walletEarnings.textContent = dinero(ganancias);
    if (walletFees) walletFees.textContent = dinero(comisiones);
}

// =====================================================
// PEDIDOS
// =====================================================

function renderPedidos() {
    const cont = $("ordersList");
    if (!cont) return;
    if (!pedidosActuales.length) {
        cont.innerHTML = `<div class="empty-state">Todavía no tienes pedidos asignados.</div>`;
        return;
    }

    cont.innerHTML = pedidosActuales.map(p => {
        const estado = String(p.estado || "").toLowerCase();
        const clase = estado === "cancelado" ? "cancelled" : (estado === "entregado" ? "" : "pending");
        const ganancia = obtenerGananciaEntrega(p);
        const codigoValidado = p.codigoValidado === true || p.entregaConfirmada === true;
        const folio = p.folio || p.id;
        const destino = p.destino?.localidad || p.ubicacionEntrega?.localidad || p.ubicacionEntrega?.direccion || "Destino registrado";
        return `
            <article class="dashboard-card">
                <div class="dashboard-card-head">
                    <div>
                        <strong>${escapar(folio)}</strong><br>
                        <small>${escapar(fechaTexto(obtenerFechaPedido(p)))}</small>
                    </div>
                    <span class="status-pill ${clase}">${escapar(estadoBonito(p.estado))}</span>
                </div>
                <p>📍 ${escapar(destino)}</p>
                <div class="dashboard-card-row">
                    <span class="muted">Ganancia de entrega: <strong>${dinero(ganancia)}</strong></span>
                    ${codigoValidado ? '<span class="status-pill">✓ Código validado</span>' : '<span class="muted">Código no validado</span>'}
                </div>
                <div style="margin-top:12px;display:flex;justify-content:flex-end;">
                    <button type="button" class="ticket-button" data-ticket="${escapar(p.id)}">Ver ticket</button>
                </div>
            </article>`;
    }).join("");

    cont.querySelectorAll("[data-ticket]").forEach(btn => btn.addEventListener("click", () => {
        const pedido = pedidosActuales.find(p => p.id === btn.dataset.ticket);
        if (pedido) abrirTicket(pedido);
    }));
}

// =====================================================
// HISTORIAL
// =====================================================

function renderHistorial() {
    const cont = $("historyList");
    if (!cont) return;
    const historial = pedidosActuales.filter(esEntregado);
    if (!historial.length) {
        cont.innerHTML = `<div class="empty-state">Aún no tienes entregas completadas.</div>`;
        return;
    }
    cont.innerHTML = historial.map(p => `
        <article class="dashboard-card">
            <div class="dashboard-card-head">
                <div><strong>${escapar(p.folio || p.id)}</strong><br><small>${escapar(fechaTexto(p.fechaFinalizacion || p.actualizadoEn))}</small></div>
                <strong>${dinero(obtenerGananciaEntrega(p))}</strong>
            </div>
            <p>${escapar(p.destino?.localidad || p.ubicacionEntrega?.localidad || p.ubicacionEntrega?.direccion || "Entrega completada")}</p>
            <div class="dashboard-card-row">
                <span class="muted">${p.codigoValidado === true ? "Código de entrega validado" : "Entrega registrada"}</span>
                <button type="button" class="ticket-button" data-ticket="${escapar(p.id)}">Ver comprobante</button>
            </div>
        </article>`).join("");
    cont.querySelectorAll("[data-ticket]").forEach(btn => btn.addEventListener("click", () => {
        const p = pedidosActuales.find(x => x.id === btn.dataset.ticket);
        if (p) abrirTicket(p);
    }));
}

// =====================================================
// GANANCIAS
// =====================================================

function renderGanancias() {
    const summary = $("earningsSummary");
    const list = $("earningsList");
    if (!summary || !list) return;

    const entregados = pedidosActuales.filter(esEntregado);
    const total = entregados.reduce((t,p)=>t+obtenerGananciaEntrega(p),0);
    const hoy = entregados.filter(p=>esHoy(p.fechaFinalizacion || p.actualizadoEn)).reduce((t,p)=>t+obtenerGananciaEntrega(p),0);

    summary.innerHTML = `
        <div class="financial-box"><span>Total por entregas</span><strong>${dinero(total)}</strong></div>
        <div class="financial-box"><span>Entregas completadas</span><strong>${entregados.length}</strong></div>
        <div class="financial-box"><span>Ganancia de hoy</span><strong>${dinero(hoy)}</strong></div>
        <div class="financial-box"><span>Promedio por entrega</span><strong>${dinero(entregados.length ? total/entregados.length : 0)}</strong></div>`;

    if (!entregados.length) list.innerHTML = `<div class="empty-state">No hay ganancias de entregas registradas todavía.</div>`;
    else list.innerHTML = entregados.map(p=>`
        <article class="dashboard-card">
            <div class="dashboard-card-head">
                <div><strong>${escapar(p.folio || p.id)}</strong><br><small>${escapar(fechaTexto(p.fechaFinalizacion || p.actualizadoEn))}</small></div>
                <strong>${dinero(obtenerGananciaEntrega(p))}</strong>
            </div>
            <p>Entrega confirmada mediante el pedido registrado.</p>
        </article>`).join("");

    const founder = $("founderView");
    if (!founder) return;
    if (usuarioDatos?.esFundador !== true) {
        founder.hidden = true;
        founder.innerHTML = "";
        return;
    }

    founder.hidden = false;
    const pedidosFundador = entregados.filter(p => p.esFundador === true && (p.fundadorId === auth.currentUser?.uid || p.repartidorId === auth.currentUser?.uid));
    const generadoPedidos = pedidosFundador.reduce((t,p)=>t + Number(p.comisiones?.fundador?.monto || 0),0);
    const generadoMov = movimientosFundador.reduce((t,m)=>t + Number(m.participacionFundador || 0),0);
    const generado = Math.max(generadoPedidos, generadoMov);
    const cobrado = movimientosFundador.filter(m => ["cobrado","pagado"].includes(String(m.estado||"").toLowerCase())).reduce((t,m)=>t+Number(m.participacionFundador||0),0);
    const pendiente = Math.max(0, generado - cobrado);

    founder.innerHTML = `
        <span class="section-label">PARTICIPACIÓN COMO FUNDADOR</span>
        <h3>Participación separada de tus ganancias por entrega</h3>
        <div class="founder-row"><span>Generada</span><strong>${dinero(generado)}</strong></div>
        <div class="founder-row"><span>Cobrada por MOTI</span><strong>${dinero(cobrado)}</strong></div>
        <div class="founder-row"><span>Pendiente de cobro/pago</span><strong>${dinero(pendiente)}</strong></div>
        <div class="founder-row"><span>Ganancias por entregas</span><strong>${dinero(total)}</strong></div>`;
}

// =====================================================
// CARTERA
// =====================================================

function renderCartera() {
    const cont = $("walletViewContent");
    if (!cont) return;
    const saldo = Number(usuarioDatos?.saldoCartera) || 0;
    const ganancias = Number(usuarioDatos?.gananciasTotales) || 0;
    const comisiones = Number(usuarioDatos?.comisionesTotales) || 0;
    cont.innerHTML = `
        <div class="financial-summary-grid">
            <div class="financial-box"><span>Saldo disponible</span><strong>${dinero(saldo)}</strong></div>
            <div class="financial-box"><span>Ganancias almacenadas</span><strong>${dinero(ganancias)}</strong></div>
            <div class="financial-box"><span>Comisiones MOTI</span><strong>${dinero(comisiones)}</strong></div>
            <div class="financial-box"><span>Entregas completadas</span><strong>${pedidosActuales.filter(esEntregado).length}</strong></div>
        </div>
        <div class="dashboard-card">
            <strong>Importante</strong>
            <p>Esta vista muestra los valores que actualmente existen en tu cuenta. Las ganancias de cada entrega se toman del campo financiero guardado en el pedido; el panel no inventa ni modifica movimientos.</p>
        </div>`;
}

// =====================================================
// ZONAS
// =====================================================

function renderZonas() {
    const cont = $("zonesContent");
    if (!cont) return;
    const d = usuarioDatos || {};
    const zonas = Array.isArray(d.zonas) ? d.zonas : (Array.isArray(d.zonasReparto) ? d.zonasReparto : []);
    const municipio = d.municipio || "Ostuacán";
    const localidad = d.localidad || d.zona || "No especificada";
    const radio = d.radioServicio ?? d.radioKm ?? null;

    cont.innerHTML = `
        <div class="zone-card">
            <div class="zone-main">
                <div class="zone-icon"><span class="material-symbols-outlined">location_on</span></div>
                <div><h3>${escapar(localidad)}</h3><p>${escapar(municipio)}${radio !== null ? ` · Radio ${escapar(radio)} km` : ""}</p></div>
            </div>
            ${zonas.length ? `<ul class="zone-list">${zonas.map(z=>`<li>${escapar(typeof z === "string" ? z : (z.nombre || z.localidad || JSON.stringify(z)))}</li>`).join("")}</ul>` : `<p style="margin-top:16px;">No hay una lista de zonas adicionales configurada en tu cuenta.</p>`}
        </div>`;
}

// =====================================================
// PERFIL
// =====================================================

function renderPerfil() {
    const cont = $("profileContent");
    if (!cont) return;
    const d = usuarioDatos || {};
    const nombre = d.nombre || auth.currentUser?.displayName || "Repartidor";
    if ($("profileViewName")) $("profileViewName").textContent = nombre;
    const filas = [
        ["Nombre", nombre],
        ["Correo", d.email || auth.currentUser?.email || "—"],
        ["Teléfono", d.telefono || "—"],
        ["Municipio", d.municipio || "—"],
        ["Localidad", d.localidad || "—"],
        ["Placa", d.placa || "—"],
        ["Estado", estadoBonito(currentState)],
        ["Fundador", d.esFundador === true ? "Sí" : "No"]
    ];
    cont.innerHTML = filas.map(([a,b])=>`<div class="profile-row"><span>${escapar(a)}</span><strong>${escapar(b)}</strong></div>`).join("");
}

// =====================================================
// TICKET / COMPROBANTE
// =====================================================

function abrirTicket(pedido) {
    document.getElementById("motiGoDashboardTicket")?.remove();
    const productos = Array.isArray(pedido.productos) ? pedido.productos : [];
    const items = productos.map(p => `
        <div class="ticket-item">
            <span>${escapar(p.cantidad || 0)} × ${escapar(p.nombre || "Producto")}</span>
            <strong>${dinero(Number(p.importe) || ((Number(p.precio)||0)*(Number(p.cantidad)||0)))}</strong>
        </div>`).join("") || `<div class="empty-state">No hay productos detallados en este pedido.</div>`;
    const subtotal = Number(pedido.subtotal) || 0;
    const entrega = Number(pedido.costoEntrega) || 0;
    const total = Number(pedido.total) || subtotal + entrega;
    const modal = document.createElement("div");
    modal.id = "motiGoDashboardTicket";
    modal.className = "ticket-modal";
    modal.innerHTML = `
        <div class="ticket-sheet">
            <div class="ticket-sheet-head">
                <div><span class="section-label">MOTI GO · COMPROBANTE</span><h3>${escapar(pedido.folio || pedido.id)}</h3><small>${escapar(fechaTexto(pedido.creadoEn || pedido.fechaFinalizacion))}</small></div>
                <button type="button" class="ticket-close" id="closeDashboardTicket">×</button>
            </div>
            <div class="ticket-secret"><span>CÓDIGO DE ENTREGA</span><strong>${escapar(pedido.codigoEntrega || "------")}</strong></div>
            <div class="ticket-items">${items}</div>
            <div class="ticket-totals">
                <div class="ticket-total"><span>Subtotal</span><strong>${dinero(subtotal)}</strong></div>
                <div class="ticket-total"><span>Entrega</span><strong>${dinero(entrega)}</strong></div>
                <div class="ticket-total final"><span>Total</span><strong>${dinero(total)}</strong></div>
            </div>
            <p style="margin:16px 0 0;color:var(--go-muted);font-size:11px;">${pedido.codigoValidado === true ? "✓ Código de entrega validado." : "El código solo debe utilizarse para confirmar la entrega."}</p>
        </div>`;
    document.body.appendChild(modal);
    $("closeDashboardTicket")?.addEventListener("click",()=>modal.remove());
    modal.addEventListener("click",e=>{ if(e.target===modal) modal.remove(); });
}

// =====================================================
// INICIO
// =====================================================

const ahora = new Date();
if (todayDate) todayDate.textContent = ahora.toLocaleDateString("es-MX",{day:"numeric",month:"short"});

onAuthStateChanged(auth, user => {
    if (!user) return;
    escucharUsuario(user.uid);
    escucharPedidos(user.uid);
    actualizarResumenInicio();
});

// Inicio es la vista visible. Las demás permanecen ocultas.
["pedidos","cartera","ganancias","zonas","historial","perfil"].forEach(id=>{ if($("view-"+id)) $("view-"+id).hidden=true; });
