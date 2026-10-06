import { auth, db, storage } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

const MAX_SIZE = 3 * 1024 * 1024;
let usuarioActual = null;
let tipoCuenta = null;
let tiendaId = null;
const $all = selector => [...document.querySelectorAll(selector)];

function mostrarUrl(url) {
    $all("[data-foto-perfil-preview]").forEach(img => {
        img.hidden = !url;
        if (url) img.src = url; else img.removeAttribute("src");
    });
    $all(".motigo-photo-fallback").forEach(el => el.style.display = url ? "none" : "");
}

async function obtenerReferencia() {
    if (!usuarioActual) return null;
    if (tipoCuenta === "negocio") {
        if (!tiendaId) return null;
        return ref(storage, `tiendas/${tiendaId}/logo/perfil`);
    }
    return ref(storage, `usuarios/${usuarioActual.uid}/perfil/fotoPerfil`);
}

async function cargarFoto() {
    try {
        const referencia = await obtenerReferencia();
        if (!referencia) return;
        mostrarUrl(await getDownloadURL(referencia));
    } catch (error) {
        if (error?.code !== "storage/object-not-found") console.warn("MOTI GO: no se pudo cargar la foto de perfil:", error);
        mostrarUrl("");
    }
}

async function subirFoto(file) {
    if (!file || !usuarioActual) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        window.motiGoNotificar?.("Solo puedes subir imágenes JPG, PNG o WEBP.");
        return;
    }
    if (file.size > MAX_SIZE) {
        window.motiGoNotificar?.("La imagen no puede superar 3 MB.");
        return;
    }
    try {
        const referencia = await obtenerReferencia();
        if (!referencia) {
            window.motiGoNotificar?.("No se pudo determinar dónde guardar la foto.");
            return;
        }
        $all("[data-foto-perfil-trigger]").forEach(btn => btn.disabled = true);
        await uploadBytes(referencia, file, { contentType: file.type, customMetadata: { subidoPor: usuarioActual.uid, tipoCuenta: tipoCuenta || "usuario" } });
        mostrarUrl(await getDownloadURL(referencia));
        window.motiGoNotificar?.(tipoCuenta === "negocio" ? "Logo actualizado correctamente." : "Foto de perfil actualizada correctamente.");
    } catch (error) {
        console.error("MOTI GO: error subiendo foto de perfil:", error);
        window.motiGoNotificar?.("No se pudo guardar la imagen. Intenta nuevamente.");
    } finally {
        $all("[data-foto-perfil-trigger]").forEach(btn => btn.disabled = false);
    }
}

function prepararControles() {
    $all("[data-foto-perfil-trigger]").forEach(btn => {
        if (btn.dataset.fotoPerfilListo === "1") return;
        btn.dataset.fotoPerfilListo = "1";
        btn.addEventListener("click", () => {
            const input = btn.closest(".motigo-photo-wrap")?.querySelector("[data-foto-perfil-input]") || document.querySelector("[data-foto-perfil-input]");
            input?.click();
        });
    });
    $all("[data-foto-perfil-input]").forEach(input => {
        if (input.dataset.fotoPerfilListo === "1") return;
        input.dataset.fotoPerfilListo = "1";
        input.addEventListener("change", () => { const file = input.files?.[0]; input.value = ""; if (file) subirFoto(file); });
    });
}

onAuthStateChanged(auth, async user => {
    if (!user) return;
    usuarioActual = user;
    try {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        const datos = snap.exists() ? snap.data() : {};
        tipoCuenta = datos.tipo || "cliente";
        tiendaId = datos.tiendaId || null;
        await cargarFoto();
    } catch (error) {
        console.error("MOTI GO: error preparando foto de perfil:", error);
    }
    prepararControles();
});
