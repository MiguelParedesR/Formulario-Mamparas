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
import { navigateTo } from "../utils/navigation.js";

/**
 * Navega a formulario.html con parámetro ?tipo=
 * @param {string} tipo  Ej: "CABLE", "MERCADERIA", "CHOQUE", "SINIESTRO"
 */
export function navigateToFormulario(tipo) {
  if (!tipo) return;
  navigateTo(`html/formulario.html?tipo=${encodeURIComponent(tipo)}`);
}


/**
 * Navega correctamente al módulo de Mamparas
 * (ruta real del proyecto)
 */
export function navigateToMamparas() {
  navigateTo("html/formulario-mamparas/registro.html");
}


// ============================================================================
// LOG DE CONFIRMACIÓN
// ============================================================================
console.log("✅ dashboard.js cargado correctamente");
