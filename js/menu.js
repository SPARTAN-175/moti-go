// =====================================================
// MENÚ LATERAL MOTI GO
// =====================================================

const menuButton =
    document.getElementById("menuButton");

const closeMenuButton =
    document.getElementById("closeMenuButton");

const sideMenu =
    document.getElementById("sideMenu");

const menuOverlay =
    document.getElementById("menuOverlay");


// =====================================================
// ABRIR MENÚ
// =====================================================

function abrirMenu() {

    if (!sideMenu || !menuOverlay) return;

    sideMenu.classList.add("active");

    menuOverlay.classList.add("active");

    document.body.classList.add("menu-open");

}


// =====================================================
// CERRAR MENÚ
// =====================================================

function cerrarMenu() {

    if (!sideMenu || !menuOverlay) return;

    sideMenu.classList.remove("active");

    menuOverlay.classList.remove("active");

    document.body.classList.remove("menu-open");

}


// =====================================================
// EVENTOS
// =====================================================

if (menuButton) {

    menuButton.addEventListener(
        "click",
        abrirMenu
    );

}


if (closeMenuButton) {

    closeMenuButton.addEventListener(
        "click",
        cerrarMenu
    );

}


if (menuOverlay) {

    menuOverlay.addEventListener(
        "click",
        cerrarMenu
    );

}


// =====================================================
// ESC PARA CERRAR
// =====================================================

document.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Escape") {

            cerrarMenu();

        }

    }
);
