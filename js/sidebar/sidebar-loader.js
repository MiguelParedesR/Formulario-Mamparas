
// Rutas REALMENTE correctas desde index.html
const SIDEBAR_HTML = "../../html/base/sidebar.html";  // ✔ correcta
const SIDEBAR_JS   = "./sidebar.js";                  // ✔ corregida
const SIDEBAR_CSS  = "../../css/estilos-sidebar/sidebar.css";  // ✔ correcta

const FONT_AWESOME =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css";

/**
 * Inserta <link> CSS si no existe
 */
function ensureCss(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

/**
 * Inyecta el HTML del sidebar en el contenedor
 */
async function injectSidebarHTML() {
  const container = document.getElementById("sidebar-container");

  if (!container) {
    console.error("❌ sidebar-loader: #sidebar-container no existe.");
    return;
  }

  // si ya tiene sidebar → no volver a insertarlo
  if (document.getElementById("sidebar")) return;

  try {
    const res = await fetch(SIDEBAR_HTML, { cache: "no-cache" });
    if (!res.ok) throw new Error(`status ${res.status}`);

    const text = await res.text();
    container.innerHTML = text;
  } catch (err) {
    console.error("❌ sidebar-loader: Error cargando sidebar.html:", err);
  }
}

/**
 * Inicializa sidebar.js
 */
async function initSidebarJS() {
  try {
    const mod = await import(SIDEBAR_JS);
    const initSidebar = mod.initSidebar ?? mod.default;

    if (typeof initSidebar !== "function") {
      console.warn("⚠️ sidebar-loader: initSidebar() no encontrado.");
      return;
    }

    await initSidebar("#sidebar-container", {
      htmlPath: SIDEBAR_HTML,
      enableRouting: true,
    });

    console.log("✅ sidebar-loader: Sidebar inicializado.");
  } catch (err) {
    console.error("❌ sidebar-loader: error importando sidebar.js:", err);
  }
}

/**
 * Loader principal
 */
(async function loadSidebar() {
  // 1️⃣ Asegurar estilos
  ensureCss(SIDEBAR_CSS);
  ensureCss(FONT_AWESOME);

  // 2️⃣ Inyectar HTML
  await injectSidebarHTML();

  // 3️⃣ Inicializar lógica JS
  await initSidebarJS();
})();
