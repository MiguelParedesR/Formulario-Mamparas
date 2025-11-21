// ============================================================================
// DASHBOARD.JS — NAVEGACIÓN SPA PARA TARJETAS DEL DASHBOARD TPP
// ============================================================================
//
// Este archivo controla la navegación desde las tarjetas del dashboard
// hacia el resto de módulos, usando el router SPA manejado por sidebar.js.
//
// ✔ NO recarga la página
// ✔ Llama al evento `sidebar:navigate`
// ✔ Compatible con producción
// ✔ Sin dependencias externas
// ============================================================================


/**
 * Navega a formulario.html con parámetro ?tipo=
 * @param {string} tipo  Ej: "CABLE", "MERCADERIA", "CHOQUE", "SINIESTRO"
 */
export function navigateToFormulario(tipo) {
    if (!tipo) return;

    const url = `./html/formulario.html?tipo=${encodeURIComponent(tipo)}`;

    console.log(`➡️ Navegando a: ${url}`);

    window.dispatchEvent(
        new CustomEvent("sidebar:navigate", { detail: url })
    );
}


/**
 * Navega al módulo de mamparas
 */
export function navigateToMamparas() {
    const url = "./html/mamparas.html";

    console.log(`➡️ Navegando a: ${url}`);

    window.dispatchEvent(
        new CustomEvent("sidebar:navigate", { detail: url })
    );
}


// ============================================================================
// LOG DE CONFIRMACIÓN
// ============================================================================
console.log("✅ dashboard.js cargado correctamente");
