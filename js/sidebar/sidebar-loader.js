// ============================================================================
// SIDEBAR-LOADER v3 — PRODUCCIÓN TPP
// Lógica estable para SPA + Sidebar persistente
// ============================================================================

const SIDEBAR_HTML = "/html/base/sidebar.html";
const SIDEBAR_JS = "/js/sidebar/sidebar.js";
const SIDEBAR_CSS = "/css/estilos-sidebar/sidebar.css";

const FONT_AWESOME =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css";

let sidebarBootstrapPromise = null;

// ============================================================================
//  Inyección de CSS sin duplicar
// ============================================================================
function ensureCss(href) {
  if (document.querySelector(`link[href='${href}']`)) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

// ============================================================================
//  Inserta el HTML del sidebar
// ============================================================================
async function injectSidebarHTML() {
  const container = document.getElementById("sidebar-container");
  if (!container) {
    console.error("❌ No existe #sidebar-container");
    return;
  }

  if (container.querySelector("#sidebar")) return;

  const res = await fetch(SIDEBAR_HTML, { cache: "no-cache" });
  if (!res.ok) throw new Error(res.status);

  container.innerHTML = await res.text();
}

// ============================================================================
//  Importar sidebar.js y ejecutar initSidebar()
// ============================================================================
async function initSidebarJS() {
  const module = await import(SIDEBAR_JS);
  const initSidebar = module.initSidebar;

  if (typeof initSidebar !== "function") {
    console.error("❌ initSidebar() no encontrado en sidebar.js");
    return;
  }

  await initSidebar("#sidebar-container", {
    htmlPath: SIDEBAR_HTML,
    enableRouting: true,
  });
}

// ============================================================================
//  LÓGICA PRINCIPAL (auto-ejecutable)
// ============================================================================
(function loadSidebar() {
  if (window.__SIDEBAR_LOADED__) return;

  if (!sidebarBootstrapPromise) {
    sidebarBootstrapPromise = (async () => {
      ensureCss(FONT_AWESOME);
      ensureCss(SIDEBAR_CSS);
      await injectSidebarHTML();
      await initSidebarJS();
      window.__SIDEBAR_LOADED__ = true;
    })().catch((err) => console.error("❌ Error iniciando sidebar:", err));
  }

  return sidebarBootstrapPromise;
})();
