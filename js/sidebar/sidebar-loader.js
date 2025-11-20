// ============================================================================
// SIDEBAR-LOADER v3 — PRODUCCIÓN TPP
// Lógica 100% estable para SPA + Sidebar persistente
// ============================================================================

// 🔥 RUTAS DEFINITIVAS (basadas en tu estructura real)
const SIDEBAR_HTML = "./html/base/sidebar.html"; // ahora desde el index sí funciona
const SIDEBAR_JS = "/js/sidebar/sidebar.js";
const SIDEBAR_CSS = "./css/estilos-sidebar/sidebar.css";

const FONT_AWESOME =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css";

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
  if (!container) return console.error("❌ No existe #sidebar-container");

  // Evitar duplicado
  if (container.querySelector("#sidebar")) return;

  try {
    const res = await fetch(SIDEBAR_HTML, { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    const html = await res.text();
    container.innerHTML = html;
  } catch (err) {
    console.error("❌ Error cargando sidebar.html:", err);
  }
}

// ============================================================================
//  Importar sidebar.js y ejecutar initSidebar()
// ============================================================================
async function initSidebarJS() {
  try {
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

    console.log("✅ Sidebar inicializado correctamente");
  } catch (err) {
    console.error("❌ Error importando sidebar.js:", err);
  }
}

// ============================================================================
//  LÓGICA PRINCIPAL (auto-ejecutable)
// ============================================================================
(async function loadSidebar() {
  // Cargar estilos
  ensureCss(FONT_AWESOME);
  ensureCss(SIDEBAR_CSS);

  // Insertar sidebar
  await injectSidebarHTML();

  // Inicializar lógica JS
  await initSidebarJS();
})();
