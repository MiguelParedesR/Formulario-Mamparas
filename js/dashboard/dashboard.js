// ============================================================================
// DASHBOARD.JS — NAVEGACIÓN SPA PARA TARJETAS DEL DASHBOARD TPP
// ============================================================================
//
// ✔ Controla navegación desde el dashboard a los módulos
// ✔ Compatible con SPA (sidebar-loader.js)
// ✔ No recarga la página
// ✔ No afecta otros módulos
// ✔ Código limpio, estable y sin dependencias externas
// ============================================================================


import { withBase } from "../config.js";

/**
 * Navega a formulario.html con parámetro ?tipo=
 * @param {string} tipo  Ej: "CABLE", "MERCADERIA", "CHOQUE", "SINIESTRO"
 */
export function navigateToFormulario(tipo) {
  if (!tipo) return;

  const url = withBase(`html/formulario.html?tipo=${encodeURIComponent(tipo)}`);

  console.log(`➡️ Navegando a: ${url}`);

  window.dispatchEvent(
    new CustomEvent("sidebar:navigate", { detail: url })
  );
}


/**
 * Navega correctamente al módulo de Mamparas
 * (ruta real del proyecto)
 */
export function navigateToMamparas() {
  const url = withBase("html/formulario-mamparas/registro.html");

  console.log(`➡️ Navegando a: ${url}`);

  window.dispatchEvent(
    new CustomEvent("sidebar:navigate", { detail: url })
  );
}


// ============================================================================
// LOG DE CONFIRMACIÓN
// ============================================================================
console.log("✅ dashboard.js cargado correctamente");
