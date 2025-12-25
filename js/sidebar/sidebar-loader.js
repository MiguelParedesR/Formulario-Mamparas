// ============================================================================
// SIDEBAR-LOADER — PRODUCCIÓN TPP
// v3 — Loader SPA + Sidebar persistente limpio y optimizado
// ============================================================================
//
// ✔ Carga e inyecta el sidebar.html en el contenedor correcto
// ✔ Evita duplicados y problemas con el SPA
// ✔ Aplica cache-busting para evitar archivos obsoletos
// ✔ Inicializa sidebar.js de forma segura
// ✔ No rompe otras vistas ni el flujo del proyecto
// ============================================================================

import { BASE_PATH, withBase } from "../config.js";

const SIDEBAR_HTML = withBase("html/base/sidebar.html");
const SIDEBAR_JS = withBase("js/sidebar/sidebar.js");
const SIDEBAR_CSS = withBase("CSS/estilos-sidebar/sidebar.css");
// Keep this order aligned with index.html to avoid cascade mismatches in SPA.
const CORE_STYLES = [
  withBase("CSS/tailwind.css"),
  SIDEBAR_CSS,
  withBase("CSS/global.css"),
  withBase("CSS/styles.css"),
  withBase("CSS/dashboard/dashboard.css"),
];

const FONT_AWESOME =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css";

let sidebarBootstrapPromise = null;

// ============================================================================
//  Inyección de CSS sin duplicar
// ============================================================================
async function ensureCss(href) {
  const normalizedHref = new URL(href, window.location.href).href;
  const alreadyLoaded = Array.from(
    document.querySelectorAll("link[rel='stylesheet']")
  ).some((link) => link.href === normalizedHref || link.getAttribute("href") === href);

  if (alreadyLoaded) return;

  const resolveRawFallback = () => {
    const user = window.location.hostname.split(".")[0];
    const repo = (window.BASE_PATH || "").replace(/^\//, "") || "Formulario-Mamparas";
    let filePath = href;
    if (filePath.startsWith(window.location.origin)) {
      filePath = filePath.replace(window.location.origin, "");
    }
    if (window.BASE_PATH && filePath.startsWith(window.BASE_PATH)) {
      filePath = filePath.replace(window.BASE_PATH, "");
    }
    return `https://raw.githubusercontent.com/${user}/${repo}/master${filePath}`;
  };

  const resolveCdnFallback = () => {
    if (href.includes("tailwind.css")) {
      return "https://cdn.jsdelivr.net/npm/tailwindcss@3.4.15/dist/tailwind.min.css";
    }
    return null;
  };

  let finalHref = href;

  try {
    const res = await fetch(normalizedHref, { method: "HEAD", cache: "no-store" });
    if (!res.ok) {
      finalHref = resolveRawFallback() || resolveCdnFallback() || href;
    }
  } catch {
    finalHref = resolveRawFallback() || resolveCdnFallback() || href;
  }

  // Si el fallback crudo también falla, último intento con CDN (solo tailwind)
  if (finalHref && finalHref !== href) {
    try {
      const check = await fetch(finalHref, { method: "HEAD", cache: "no-store" });
      if (!check.ok) {
        const cdn = resolveCdnFallback();
        if (cdn) finalHref = cdn;
      }
    } catch {
      const cdn = resolveCdnFallback();
      if (cdn) finalHref = cdn;
    }
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = finalHref;
  link.crossOrigin = "anonymous";

  document.head.appendChild(link);
}

// ============================================================================
//  Inserta el HTML del sidebar si no existe
// ============================================================================
async function injectSidebarHTML() {
  const container = document.getElementById("sidebar-container");

  if (!container) {
    console.error("❌ sidebar-loader: No existe #sidebar-container");
    return;
  }

  // Evita duplicado del sidebar
  if (container.querySelector("#sidebar")) {
    console.log("✅ sidebar ya cargado");
    return;
  }

  try {
    const response = await fetch(`${SIDEBAR_HTML}?v=${Date.now()}`, {
      cache: "no-cache",
    });

    if (!response.ok) {
      console.error("❌ No se pudo cargar sidebar.html");
      return;
    }

    container.innerHTML = await response.text();

    // Validar existencia del sidebar
    const sidebar = container.querySelector("#sidebar");
    if (!sidebar) {
      console.error("❌ sidebar-loader: Elementos clave faltantes en sidebar.html");
      return;
    }
    // Sidebar controls must be present to avoid duplicated or corrupted menu rendering.
    const requiredSelectors = ["#sidebarToggle", "#sidebarBackdrop"];

    const missing = requiredSelectors.filter(
      (selector) => !container.querySelector(selector)
    );

    if (missing.length) {
      console.error(
        "sidebar-loader: faltan controles del sidebar:",
        missing.join(", ")
      );
    } else {
      console.log("sidebar cargado correctamente (sin proxies)");
    }
  } catch (err) {
    console.error("❌ Error cargando sidebar.html", err);
  }
}


// ============================================================================
//  Importar sidebar.js y ejecutar initSidebar()
// ============================================================================
async function initSidebarJS() {
  try {
    const moduleUrl = new URL(SIDEBAR_JS, window.location.href);
    moduleUrl.searchParams.set("v", Date.now());
    const module = await import(moduleUrl.href);
    const initSidebar = module.initSidebar;

    if (typeof initSidebar !== "function") {
      console.error("❌ sidebar-loader: initSidebar() no encontrado");
      return;
    }

    // Iniciar sidebar SPA
    await initSidebar("#sidebar-container", {
      htmlPath: SIDEBAR_HTML,
      enableRouting: true,
      basePath: BASE_PATH,
    });
  } catch (err) {
    console.error("❌ Error cargando sidebar.js", err);
  }
}

// ============================================================================
//  Loader principal auto-ejecutable
// ============================================================================
(function loadSidebar() {
  // Evita múltiples cargas
  if (window.__SIDEBAR_LOADED__) return;

  if (!sidebarBootstrapPromise) {
    sidebarBootstrapPromise = (async () => {
      await Promise.all([
        ...CORE_STYLES.map((href) => ensureCss(href)),
        ensureCss(FONT_AWESOME),
      ]);

      await injectSidebarHTML();
      await initSidebarJS();

      window.__SIDEBAR_LOADED__ = true;
      console.log("✅ sidebar-loader inicializado correctamente");
    })().catch((err) => {
      console.error("❌ Error iniciando sidebar-loader:", err);
    });
  }

  return sidebarBootstrapPromise;
})();
