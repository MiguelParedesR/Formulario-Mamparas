// ============================================================================
//  SIDEBAR-LOADER.JS — Version Final Producción TPP
// ============================================================================

// RUTAS CORRECTAS DESDE /index.html
const SIDEBAR_HTML = "./html/base/sidebar.html";
const SIDEBAR_JS   = "./js/sidebar/sidebar.js";
const SIDEBAR_CSS  = "./css/estilos-sidebar/sidebar.css";

const FONT_AWESOME =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css";

// ----------------------------------------------------------
function ensureCss(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

// ----------------------------------------------------------
async function injectSidebarHTML() {
  const container = document.getElementById("sidebar-container");

  if (!container) {
    console.error("❌ sidebar-loader: No existe #sidebar-container.");
    return;
  }

  if (document.getElementById("sidebar")) return;

  try {
    const r = await fetch(SIDEBAR_HTML, { cache: "no-cache" });
    container.innerHTML = await r.text();
  } catch (err) {
    console.error("❌ Error cargando sidebar.html:", err);
  }
}

// ----------------------------------------------------------
async function initSidebarJS() {
  try {
    const mod = await import(SIDEBAR_JS);
    const initSidebar = mod.initSidebar || mod.default;

    if (typeof initSidebar !== "function") {
      console.error("❌ initSidebar no encontrado en sidebar.js");
      return;
    }

    await initSidebar("#sidebar-container", {
      htmlPath: SIDEBAR_HTML,
      enableRouting: true,
    });

  } catch (err) {
    console.error("❌ sidebar-loader: error importando sidebar.js:", err);
  }
}

// ----------------------------------------------------------
(async function loadSidebar() {
  ensureCss(SIDEBAR_CSS);
  ensureCss(FONT_AWESOME);

  await injectSidebarHTML();
  await initSidebarJS();
})();
