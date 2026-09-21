import { auth, db } from "./firebase-config.js";
import {
    onAuthStateChanged,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const BLOQUEO_PERFIL_MS = 24 * 60 * 60 * 1000;
let usuarioActual = null;
let datosUsuario = null;
let localidadesDisponibles = [];
let localidadSeleccionada = null;
let listenerValoraciones = null;

const $ = id => document.getElementById(id);

function normalizar(texto = "") {
    return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

async function cargarLocalidades() {
    try {
        const snap = await getDocs(collection(db, "destinos"));
        localidadesDisponibles = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(d =>
                d.activo !== false &&
                normalizar(d.municipio || "") === normalizar("Ostuacán")
            )
            .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));
        console.log("MOTI GO: localidades disponibles en perfil de repartidor:", localidadesDisponibles.length);
    } catch (error) {
        console.error("MOTI GO: no se pudieron cargar las localidades:", error);
    }
}

function prepararLocalidad() {
    const input = $("editarLocalidad");
    const box = $("listaLocalidadesPerfilConductor");
    if (!input || !box) return;

    input.addEventListener("input", () => {
        const texto = normalizar(input.value);
        localidadSeleccionada = null;
        box.innerHTML = "";

        if (texto.length < 2) {
            box.style.display = "none";
            return;
        }

        const resultados = localidadesDisponibles
            .filter(d => normalizar(d.nombre || "").includes(texto))
            .slice(0, 8);

        if (!resultados.length) {
            box.innerHTML = '<div class="localidad-sin-resultados">No se encontraron localidades.</div>';
            box.style.display = "block";
            return;
        }

        resultados.forEach(destino => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "localidad-opcion-conductor";
            button.textContent = destino.nombre || "Localidad";
            button.addEventListener("mousedown", event => event.preventDefault());
            button.addEventListener("click", () => {
                localidadSeleccionada = destino;
                input.value = destino.nombre || "";
                box.innerHTML = "";
                box.style.display = "none";
                $("mensajeLocalidadPerfil").textContent = `Localidad seleccionada: ${destino.nombre}`;
            });
            box.appendChild(button);
        });

        box.style.display = "block";
    });

    input.addEventListener("blur", () => {
        setTimeout(() => {
            box.style.display = "none";
        }, 180);
    });
}

function obtenerPromedioDesdePedido(pedido) {
    const valor = pedido?.calificacionRepartidor?.estrellas ?? pedido?.valoracionRepartidor?.estrellas;
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 1 && numero <= 5 ? numero : null;
}

async function cargarValoraciones(uid) {
    if (!uid) return;

    if (listenerValoraciones) {
        listenerValoraciones();
        listenerValoraciones = null;
    }

    try {
        const pedidosQuery = query(
            collection(db, "pedidos"),
            where("repartidorId", "==", uid)
        );
        const snapshot = await getDocs(pedidosQuery);
        let suma = 0;
        let cantidad = 0;

        snapshot.forEach(docSnap => {
            const pedido = docSnap.data() || {};
            if (pedido.estado !== "entregado" || pedido.entregaConfirmada !== true) return;
            const estrellas = obtenerPromedioDesdePedido(pedido);
            if (estrellas !== null) {
                suma += estrellas;
                cantidad += 1;
            }
        });

        const promedio = cantidad ? suma / cantidad : 0;
        renderizarValoracion(promedio, cantidad);
    } catch (error) {
        console.error("MOTI GO: no se pudieron cargar las valoraciones:", error);
        renderizarValoracion(0, 0);
    }
}

function renderizarValoracion(promedio, cantidad) {
    const promedioEl = $("perfilRepartidorPromedio");
    const cantidadEl = $("perfilRepartidorCantidad");
    const relleno = $("perfilRepartidorEstrellasRelleno");
    const estrellas = $("perfilRepartidorEstrellas");

    const valor = Number(promedio) || 0;
    const porcentaje = Math.max(0, Math.min(100, (valor / 5) * 100));

    if (promedioEl) promedioEl.textContent = cantidad ? valor.toFixed(1) : "—";
    if (cantidadEl) cantidadEl.textContent = cantidad === 1 ? "1 calificación" : `${cantidad} calificaciones`;
    if (relleno) relleno.style.width = `${porcentaje}%`;
    if (estrellas) estrellas.setAttribute("aria-label", cantidad ? `${valor.toFixed(1)} de 5 estrellas` : "Sin calificaciones");
}

function render(datos) {
    const nombre = datos.nombre || "Repartidor";
    $("profileName").textContent = nombre;
    $("infoName").textContent = nombre;
    $("infoEmail").textContent = datos.email || usuarioActual?.email || "-";
    $("infoPhone").textContent = datos.telefono || "-";
    $("infoMunicipio").textContent = datos.municipio || "Ostuacán";
    $("infoLocalidad").textContent = datos.localidad || "Sin localidad configurada";
    $("infoPlaca").textContent = datos.placa || "-";

    const estado = datos.estadoServicio || "disponible";
    const el = $("serviceStatus");
    if (el) {
        el.textContent = estado === "en_viaje" ? "En viaje" : estado === "no_disponible" ? "No disponible" : "Disponible";
    }
}

async function cargarPerfil(user) {
    usuarioActual = user;
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (!snap.exists()) return;
    datosUsuario = snap.data();
    render(datosUsuario);
    await cargarValoraciones(user.uid);
}

function abrirEditar() {
    if (!datosUsuario) return;

    const ultima = datosUsuario.ultimaActualizacionPerfil;
    const timestamp = ultima?.toMillis ? ultima.toMillis() : new Date(ultima || 0).getTime();
    if (timestamp && Date.now() - timestamp < BLOQUEO_PERFIL_MS) {
        window.motiGoNotificar("Puedes volver a modificar tu información después de 24 horas de la última actualización.");
        return;
    }

    $("editarNombre").value = datosUsuario.nombre || "";
    $("editarTelefono").value = datosUsuario.telefono || "";
    $("editarLocalidad").value = datosUsuario.localidad || "";
    $("editarPlaca").value = datosUsuario.placa || "";
    $("mensajeLocalidadPerfil").textContent = datosUsuario.localidad ? `Localidad actual: ${datosUsuario.localidad}` : "Selecciona una localidad.";

    localidadSeleccionada = datosUsuario.localidadId
        ? {
            id: datosUsuario.localidadId,
            nombre: datosUsuario.localidad,
            latitud: datosUsuario.localidadLatitud,
            longitud: datosUsuario.localidadLongitud
        }
        : null;

    $("modalEditarPerfil").style.display = "block";
}

async function guardarPerfil() {
    const nombre = $("editarNombre").value.trim();
    const telefono = $("editarTelefono").value.trim();
    const placa = $("editarPlaca").value.trim();
    const localidadTexto = $("editarLocalidad").value.trim();

    if (!nombre || !telefono || !placa || !localidadTexto) {
        window.motiGoNotificar("Completa nombre, teléfono, localidad y placa.");
        return;
    }

    const loc = localidadSeleccionada || localidadesDisponibles.find(
        destino => normalizar(destino.nombre) === normalizar(localidadTexto)
    );

    if (!loc) {
        window.motiGoNotificar("Selecciona una localidad válida de la lista.");
        return;
    }

    const ahora = new Date();
    const datosActualizados = {
        nombre,
        telefono,
        placa,
        municipio: "Ostuacán",
        localidad: loc.nombre,
        localidadId: loc.id,
        localidadLatitud: Number(loc.latitud ?? loc.latitude ?? 0),
        localidadLongitud: Number(loc.longitud ?? loc.longitude ?? 0),
        ultimaActualizacionPerfil: ahora
    };

    await updateDoc(doc(db, "usuarios", usuarioActual.uid), datosActualizados);
    datosUsuario = { ...datosUsuario, ...datosActualizados };
    render(datosUsuario);
    $("modalEditarPerfil").style.display = "none";
    window.motiGoNotificar("Información actualizada correctamente.");
}

function abrirPassword() {
    ["passwordActualConductor", "passwordNuevaConductor", "passwordNueva2Conductor"].forEach(id => {
        if ($(id)) $(id).value = "";
    });
    $("modalPasswordConductor").style.display = "block";
}

async function cambiarPassword() {
    const actual = $("passwordActualConductor").value;
    const nueva = $("passwordNuevaConductor").value;
    const nueva2 = $("passwordNueva2Conductor").value;

    if (!actual || !nueva || !nueva2) {
        window.motiGoNotificar("Completa todos los campos.");
        return;
    }
    if (nueva !== nueva2) {
        window.motiGoNotificar("Las contraseñas no coinciden.");
        return;
    }
    if (nueva.length < 6) {
        window.motiGoNotificar("La nueva contraseña debe tener al menos 6 caracteres.");
        return;
    }

    try {
        if (!usuarioActual?.email) {
            window.motiGoNotificar("Tu cuenta no tiene un correo electrónico válido para cambiar la contraseña.");
            return;
        }
        const cred = EmailAuthProvider.credential(usuarioActual.email, actual);
        await reauthenticateWithCredential(usuarioActual, cred);
        await updatePassword(usuarioActual, nueva);
        window.motiGoNotificar("Contraseña actualizada correctamente.");
        $("modalPasswordConductor").style.display = "none";
    } catch (error) {
        console.error("MOTI GO: error cambiando contraseña:", error);
        if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
            window.motiGoNotificar("La contraseña actual es incorrecta.");
        } else if (error.code === "auth/requires-recent-login") {
            window.motiGoNotificar("Por seguridad, vuelve a iniciar sesión y después intenta cambiar la contraseña nuevamente.");
        } else {
            window.motiGoNotificar("No se pudo actualizar la contraseña.");
        }
    }
}

async function recuperarPassword() {
    const email = usuarioActual?.email || datosUsuario?.email;
    if (!email) {
        window.motiGoNotificar("No encontramos un correo electrónico asociado a esta cuenta.");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        window.motiGoNotificar(`Enviamos un enlace para restablecer tu contraseña a ${email}.`);
    } catch (error) {
        console.error("MOTI GO: error enviando recuperación:", error);
        window.motiGoNotificar("No se pudo enviar el enlace de recuperación. Verifica que tu correo sea válido.");
    }
}

$("btnEditarPerfil")?.addEventListener("click", event => {
    event.preventDefault();
    abrirEditar();
});
$("btnGuardarPerfil")?.addEventListener("click", () => guardarPerfil().catch(error => {
    console.error("MOTI GO: error guardando perfil:", error);
    window.motiGoNotificar("No se pudieron guardar los cambios.");
}));
$("btnCerrarEditarPerfil")?.addEventListener("click", () => $("modalEditarPerfil").style.display = "none");
$("btnCerrarEditarPerfilSecundario")?.addEventListener("click", () => $("modalEditarPerfil").style.display = "none");
$("btnCambiarPassword")?.addEventListener("click", event => {
    event.preventDefault();
    abrirPassword();
});
$("btnGuardarPasswordConductor")?.addEventListener("click", cambiarPassword);
$("btnCerrarPasswordConductor")?.addEventListener("click", () => $("modalPasswordConductor").style.display = "none");
$("btnCerrarPasswordConductorSecundario")?.addEventListener("click", () => $("modalPasswordConductor").style.display = "none");
$("btnRecuperarPassword")?.addEventListener("click", event => {
    event.preventDefault();
    recuperarPassword();
});

$("editarLocalidad")?.addEventListener("focus", async () => {
    if (!localidadesDisponibles.length) await cargarLocalidades();
});

prepararLocalidad();
cargarLocalidades();

onAuthStateChanged(auth, async user => {
    if (!user) return;
    console.log("MOTI GO: usuario autenticado:", user.uid);
    try {
        await cargarPerfil(user);
    } catch (error) {
        console.error("MOTI GO: error cargando perfil:", error);
    }
});
