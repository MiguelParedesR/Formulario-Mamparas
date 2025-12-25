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
const CORE_STYLES = [
  withBase("CSS/tailwind.css"),
  withBase("CSS/global.css"),
  withBase("CSS/dashboard/dashboard.css"),
  withBase("CSS/styles.css"),
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

    // ----- Unificación de botón único y creación de proxies -----
    // Elegimos un botón primario visible que use el id esperado por sidebar.js: #sidebarUniversalToggle
    // Si ya existe uno, lo usamos; si no, lo creamos dentro de la cabecera (.logo) si es posible.
    let primaryBtn = container.querySelector("#sidebarUniversalToggle");
    const logo = container.querySelector(".logo") || container;

    if (!primaryBtn) {
      primaryBtn = document.createElement("button");
      primaryBtn.id = "sidebarUniversalToggle";
      primaryBtn.className = "sidebar-toggle-floating";
      primaryBtn.innerHTML = '<i class="fas fa-bars"></i>';
      // Insertar al inicio de la cabecera para evitar desplazamientos
      logo.insertBefore(primaryBtn, logo.firstChild);
    }

    // Asegurarnos que el botón primario sea visible y único
    primaryBtn.style.display = "inline-flex";
    primaryBtn.classList.remove("hidden");

    // Lista de IDs que `initSidebar` espera. Creamos proxies ocultos que reenviarán clicks al primary button
    const requiredProxyIds = [
      "sidebarInternalToggle",
      "collapseBtn",
      "sidebarRespawn",
      "sidebarDesktopToggle",
      "sidebarToggle" // mantener compatibilidad con posibles referencias
    ];

    requiredProxyIds.forEach((id) => {
      let el = container.querySelector(`#${id}`) || document.getElementById(id);
      if (el) {
        // Si existe y no es el primary, ocultarlo para evitar botones visibles duplicados
        if (el !== primaryBtn) {
          el.style.display = "none";
          el.classList?.add?.("hidden");
        }
        // No añadimos forwarding desde el proxy al primary aquí — lo haremos después de initSidebar
      } else {
        // Crear proxy oculto en el body para que `sidebar.js` pueda encontrar el elemento por ID
        const proxy = document.createElement("button");
        proxy.id = id;
        proxy.style.display = "none";
        proxy.className = "hidden";
        document.body.appendChild(proxy);
      }
    });

    // Finalmente, asegurar que haya exactamente un visible que controle la apertura/cierre
    // (primaryBtn ya está visible). Ocultamos otros toggles si quedan.
    const otherToggles = container.querySelectorAll("#sidebarToggle, #sidebarInternalToggle, #collapseBtn");
    otherToggles.forEach((btn) => {
      if (btn !== primaryBtn) {
        btn.style.display = "none";
        btn.classList?.add?.("hidden");
      }
    });

    console.log("✅ sidebar cargado correctamente y unificado en un único botón de interacción");
  } catch (err) {
    console.error("❌ Error cargando sidebar.html", err);
  }
}

function createButton(id) {
  const button = document.createElement("button");
  button.id = id;
  button.style.display = "none"; // Ocultar por defecto hasta que sea necesario
  document.body.appendChild(button);
  return button;
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

// Después de inicializar `sidebar.js`, unificar los botones: el primary visible reenviará clicks
// a los proxies/elementos que `sidebar.js` haya inicializado (para que sus listeners se ejecuten).
function unifyButtonsPostInit() {
  try {
    const container = document.getElementById("sidebar-container");
    if (!container) return;

    const primary = container.querySelector("#sidebarUniversalToggle");
    if (!primary) return;

    // Asegurar estilo visible consistente (evitar que media queries lo oculten)
    primary.style.display = "inline-flex";
    primary.style.position = primary.style.position || "fixed";
    primary.style.top = primary.style.top || "16px";
    primary.style.left = primary.style.left || "16px";
    primary.style.zIndex = primary.style.zIndex || "2100";

    const targetIds = [
      "sidebarDesktopToggle",
      "sidebarRespawn",
      "sidebarInternalToggle",
      "collapseBtn",
      "sidebarToggle",
    ];

    const targets = targetIds
      .map((id) => document.getElementById(id) || container.querySelector(`#${id}`))
      .filter(Boolean);

    // Evitar doble registro
    if (primary.__unify_attached__) return;

    primary.addEventListener("click", (e) => {
      // Reenviar el click a todos los targets para que sus listeners (creados por sidebar.js)
      // respondan normalmente. Disparamos el evento de forma síncrona.
      targets.forEach((t) => {
        try {
          t.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        } catch (err) {
          // ignore
        }
      });
    });

    primary.__unify_attached__ = true;
  } catch (err) {
    console.error("❌ unifyButtonsPostInit error", err);
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
        ensureCss(SIDEBAR_CSS),
      ]);

      await injectSidebarHTML();
      await initSidebarJS();
      // Unificar botones después de que `sidebar.js` haya inicializado sus listeners
      unifyButtonsPostInit();

      window.__SIDEBAR_LOADED__ = true;
      console.log("✅ sidebar-loader inicializado correctamente");
    })().catch((err) => {
      console.error("❌ Error iniciando sidebar-loader:", err);
    });
  }

  return sidebarBootstrapPromise;
})();