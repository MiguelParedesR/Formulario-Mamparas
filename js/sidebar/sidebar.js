// ============================================================================
// SIDEBAR.JS — SPA + Sidebar persistente para TPP
// ============================================================================
// ✔ Mobile slide
// ✔ Collapse desktop
// ✔ Flyout para modo colapsado
// ✔ Submenús independientes
// ✔ Router SPA con loadPartial()
// ✔ Resaltado automático del enlace activo
// ✔ Expansión automática del submenú correcto
// ✔ Seguro, limpio y compatible con producción
// ============================================================================

import { BASE_PATH } from "../config.js";
import {
  applySidebarVisualState,
  loadSidebarState,
  saveSidebarState,
  syncContentLayout,
} from "./sidebar-state.js";

const MAIN_SELECTOR = "#dashboardContent";
const DESKTOP_BREAK = 1024;
const PRELOADED_STYLES = new Set(
  Array.from(document.querySelectorAll("link[rel='stylesheet']")).map((l) =>
    new URL(l.href, window.location.href).href
  )
);

/**
  // Inicializacin automatica
 */
export async function initSidebar(
  containerSelector = "#sidebar-container",
  options = {}
) {
  const basePath = options.basePath ?? BASE_PATH ?? "";
  const loadedStyles = new Set(PRELOADED_STYLES);

  const withBasePath = (path = "") => {
    if (!path) return basePath || "";
    if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:") || path.startsWith("mailto:")) return path;

    const normalized = path.startsWith("/") ? path : `/${path}`;
    if (basePath && (normalized === basePath || normalized.startsWith(`${basePath}/`))) {
      return normalized;
    }

    const prefix = basePath || "";
    return `${prefix}${normalized}`;
  };

  const htmlPath = withBasePath(options.htmlPath ?? "html/base/sidebar.html");
  const enableRouting = options.enableRouting !== false;

  const container = document.querySelector(containerSelector);
  const mainContainer = document.querySelector(MAIN_SELECTOR);

  if (!container) {
    console.error("⚠️ initSidebar: No existe #sidebar-container.");
    return;
  }

  if (!mainContainer) {
    console.error("⚠️ initSidebar: No existe #dashboardContent.");
    return;
  }

  // Inyectar HTML si aún no está cargado
  if (!container.querySelector("#sidebar")) {
    try {
      const res = await fetch(htmlPath, { cache: "no-cache" });
      container.innerHTML = await res.text();
    } catch (e) {
      console.error("⚠️ Error cargando sidebar.html:", e);
      return;
    }
  }

  const sidebar = container.querySelector("#sidebar");
  const toggleBtn = container.querySelector("#sidebarToggle");
  const backdrop = container.querySelector("#sidebarBackdrop");
  const menuRoot = sidebar.querySelector(".menu");

  if (!sidebar || !toggleBtn) {
    console.error("⚠️ initSidebar: Faltan elementos del sidebar.");
    return;
  }

  function normalizeMenuLinks(root) {
    if (!root) return;

    root.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || /^(https?:)?\/\//i.test(href)) return;
      link.setAttribute("href", withBasePath(href));
    });
  }

  normalizeMenuLinks(sidebar);

  function ensureViewStyles(doc, baseHref) {
    const links = doc?.querySelectorAll?.("link[rel='stylesheet']") || [];

    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;

      const fullHref = new URL(
        href,
        baseHref || window.location.href
      ).href;
      if (loadedStyles.has(fullHref)) return;

      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = fullHref;
      document.head.appendChild(style);
      loadedStyles.add(fullHref);
    });

    // Preserve inline <style> blocks from views loaded via SPA.
    const inlineStyles = doc?.querySelectorAll?.("style") || [];
    inlineStyles.forEach((styleNode) => {
      const cssText = styleNode.textContent?.trim();
      if (!cssText) return;

      const exists = Array.from(
        document.querySelectorAll("style[data-spa-inline-style]")
      ).some((node) => node.textContent?.trim() === cssText);

      if (exists) return;

      const inline = document.createElement("style");
      inline.setAttribute("data-spa-inline-style", "1");
      inline.textContent = cssText;
      document.head.appendChild(inline);
    });
  }

  let isNavigating = false;

  // Responsive
  const checkDesktopView = () => window.innerWidth >= DESKTOP_BREAK;

  let sidebarState = loadSidebarState();
  sidebarState.open = sidebarState.open !== false;
  sidebarState.mode = sidebarState.mode === "collapsed" ? "collapsed" : "expanded";

  // On desktop the sidebar should always be visible (avoid hidden state bleed).
  if (checkDesktopView()) {
    sidebarState = { ...sidebarState, open: true };
  }

  function adjustContentMargin() {
    syncContentLayout(sidebarState, mainContainer);
  }

  const syncBackdrop = () => {
    if (!backdrop) return;
    const desktopMode = checkDesktopView();
    const showBackdrop = !desktopMode && sidebarState.open;
    backdrop.classList.toggle("is-active", showBackdrop);
    backdrop.setAttribute("aria-hidden", showBackdrop ? "false" : "true");
  };

  const syncToggleLabel = () => {
    if (!toggleBtn) return;
    const label = sidebarState.open ? "Cerrar menu" : "Mostrar menu";
    toggleBtn.setAttribute("aria-label", label);
  };

  const applySidebarState = () => {
    applySidebarVisualState(sidebar, sidebarState, mainContainer);
    syncBackdrop();
    syncToggleLabel();
    saveSidebarState(sidebarState);
  };

  // Mobile/Desktop open/close
  const openSidebar = () => {
    sidebarState = { ...sidebarState, open: true, mode: "expanded" };
    applySidebarState();
  };

  const closeSidebar = () => {
    sidebarState = { ...sidebarState, open: false };
    applySidebarState();
  };

  // Unified toggle (single control for desktop/mobile).
  toggleBtn.addEventListener("click", () => {
    if (checkDesktopView()) {
      const nextMode = sidebarState.mode === "collapsed" ? "expanded" : "collapsed";
      sidebarState = { ...sidebarState, mode: nextMode, open: true };
      applySidebarState();
      return;
    }

    if (sidebarState.open) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  backdrop?.addEventListener("click", closeSidebar);

  // Submenús
  function syncOpenSubmenuHeights(start) {
    let node = start?.parentElement;
    while (node) {
      if (node.classList?.contains("submenu")) {
        node.style.maxHeight = node.scrollHeight + "px";
      }
      node = node.parentElement;
    }
  }

  function setSubmenuState(li, open) {
    li.classList.toggle("active", open);

    const submenu = li.querySelector(":scope > .submenu");
    if (!submenu) return;

    // If opening, close sibling submenus at the same level to ensure only one open
    if (open) {
      const parentList = li.parentElement;
      if (parentList) {
        Array.from(parentList.children)
          .filter((c) => c !== li && c.classList && c.classList.contains("has-submenu"))
          .forEach((sib) => setSubmenuState(sib, false));
      }
    }

    // Smooth open/close with CSS transitions
    const TRANSITION_TIMEOUT = 350; // ms fallback

    const doOpen = () => {
      submenu.style.removeProperty("display");
      submenu.style.display = "block";
      // Start from collapsed
      submenu.style.overflow = "hidden";
      submenu.style.maxHeight = "0px";
      submenu.style.opacity = "0";

      // Force layout then expand
      requestAnimationFrame(() => {
        submenu.style.transition = "max-height 0.28s ease, opacity 0.18s ease";
        submenu.style.maxHeight = submenu.scrollHeight + "px";
        submenu.style.opacity = "1";
      });
    };

    const doClose = () => {
      submenu.style.transition = "max-height 0.28s ease, opacity 0.18s ease";
      submenu.style.maxHeight = "0px";
      submenu.style.opacity = "0";

      const cleanup = () => {
        submenu.style.display = "none";
        submenu.style.removeProperty("transition");
        submenu.style.removeProperty("max-height");
        submenu.style.removeProperty("opacity");
        submenu.style.removeProperty("overflow");
        submenu.removeEventListener("transitionend", onEnd);
      };

      const onEnd = (ev) => {
        if (ev.target === submenu) cleanup();
      };

      submenu.addEventListener("transitionend", onEnd);
      // Fallback cleanup
      setTimeout(cleanup, TRANSITION_TIMEOUT);
    };

    const syncHeights = () => syncOpenSubmenuHeights(submenu);

    if (open) {
      doOpen();
      // Keep parent heights in sync after animation to avoid clipped submenus.
      requestAnimationFrame(syncHeights);
      setTimeout(syncHeights, TRANSITION_TIMEOUT);
    } else {
      doClose();
      setTimeout(syncHeights, TRANSITION_TIMEOUT);
    }
  }

  function toggleSubmenu(li) {
    setSubmenuState(li, !li.classList.contains("active"));
  }

  function bindMenuEvents(root, { isFlyout = false } = {}) {
    if (!root) return;

    // Click en submenús
    root.querySelectorAll(".has-submenu > .menu-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();

        const li = link.parentElement;
        // Only treat direct children of .menu as top-level (avoids nested submenu misfires).
        const isTopLevel = li.parentElement === menuRoot;

        const openFlyoutMode =
          isTopLevel &&
          !isFlyout &&
          checkDesktopView() &&
          sidebar.classList.contains("collapsed");

        if (openFlyoutMode) {
          openFlyout(li);
        } else {
          toggleSubmenu(li);
        }
      });
    });

    // Navegación SPA
    root
      .querySelectorAll(".submenu-link, .menu-link")
      .forEach((link) => {
        const href = link.getAttribute("href");
        const parent = link.parentElement;

        if (parent.classList.contains("has-submenu")) return;

        if (href && href.includes(".html")) {
          link.addEventListener("click", (e) => {
            e.preventDefault();
            loadPartial(href);
            if (!checkDesktopView()) {
              closeSidebar();
            }
          });
        }
      });
  }

  // Flyout (desplegable lateral)
  function openFlyout(li) {
    if (!checkDesktopView() || !sidebar.classList.contains("collapsed")) return;

    const old = document.querySelector(".sidebar-flyout");
    if (old) old.remove();

    const submenu = li.querySelector(":scope > .submenu");
    if (!submenu) return;

    const rect = li.getBoundingClientRect();
    const sideRect = sidebar.getBoundingClientRect();

    const fly = document.createElement("div");
    fly.className = "sidebar-flyout";
    fly.style.position = "fixed";
    fly.style.top = `${rect.top}px`;
    fly.style.left = `${sideRect.right}px`;

    const clone = submenu.cloneNode(true);
    clone.style.display = "block";
    clone.style.maxHeight = "none";

    fly.appendChild(clone);
    document.body.appendChild(fly);

    bindMenuEvents(fly, { isFlyout: true });

    // Cerrar al hacer clic fuera
    setTimeout(() => {
      document.addEventListener("click", function close(ev) {
        if (!fly.contains(ev.target) && !li.contains(ev.target)) {
          fly.remove();
          document.removeEventListener("click", close);
        }
      });
    }, 30);
  }

  // Marcar enlace activo
  const normalizeForMatch = (value) => {
    if (!value) return null;
    try {
      const parsed = new URL(withBasePath(value), window.location.origin);
      return parsed.pathname + parsed.search;
    } catch {
      return value;
    }
  };

  function highlightActive(href) {
    sidebar
      .querySelectorAll(".menu-link, .submenu-link")
      .forEach((a) => a.classList.remove("active-link"));

    const targetHref = normalizeForMatch(href);
    if (!targetHref) return;

    const allLinks = Array.from(
      sidebar.querySelectorAll(".menu-link, .submenu-link")
    );

    // Prefer exact match (including query params) to avoid activating wrong submenu.
    let target = allLinks.find((link) => {
      const linkHref = normalizeForMatch(link.getAttribute("href"));
      return linkHref && linkHref === targetHref;
    });

    if (!target) {
      target = allLinks.find((link) => {
        const linkHref = normalizeForMatch(link.getAttribute("href"));
        if (!linkHref) return false;
        return linkHref.split("?")[0] === targetHref.split("?")[0];
      });
    }

    if (!target) return;

    target.classList.add("active-link");

    let node = target.parentElement;

    while (node) {
      if (node.classList?.contains("has-submenu")) {
        setSubmenuState(node, true);
      }
      node = node.parentElement;
    }
  }

  // Expande submenus segun ruta
  function expandSubmenuByHref(href) {
    if (!href) return;

    const url = new URL(withBasePath(href), window.location.origin);
    const tipo = url.searchParams.get("tipo");

    const mapTipo = {
      CABLE: "cable",
      MERCADERIA: "mercaderia",
      CHOQUE: "choque",
      SINIESTRO: "siniestro",
    };

    let targetLi = null;

    // Por tipo= en la URL
    if (tipo && mapTipo[tipo]) {
      targetLi = sidebar.querySelector(`li[data-submenu="${mapTipo[tipo]}"]`);
    }

    // Por módulo Mamparas
    else if (url.pathname.includes("formulario-mamparas")) {
      targetLi = sidebar.querySelector(`li[data-submenu="mamparas"]`);
    }

    if (targetLi) {
      setSubmenuState(targetLi, true);

      const parent = targetLi.closest('li[data-submenu="incidencias"]');
      if (parent) setSubmenuState(parent, true);
    }
  }

  // Ejecutar scripts de vistas SPA
  async function executeScripts(scripts, baseHref) {
    for (const script of scripts) {
      const src = script.getAttribute("src");
      const type = script.getAttribute("type");
      const s = document.createElement("script");

      if (type) s.type = type;

      if (src) {
        const normalizedSrc = new URL(
          src,
          baseHref || window.location.href
        ).href;
        const cacheBust = normalizedSrc.includes("?") ? "&" : "?";
        s.src = `${normalizedSrc}${cacheBust}_=${Date.now()}`;

        await new Promise((resolve, reject) => {
          s.onload = resolve;
          s.onerror = reject;
          document.body.appendChild(s);
        });

        s.remove();
      } else {
        s.textContent = script.textContent;
        document.body.appendChild(s);
        s.remove();
      }
    }
  }

  // Normaliza ruta
  function normalizeHref(href) {
    const hrefWithBasePath = withBasePath(href);
    const parsed = new URL(hrefWithBasePath, window.origin);

    const stateUrl = new URL(window.location.href);
    const viewValue =
      parsed.pathname.replace(basePath || "", "") || "/";

    stateUrl.searchParams.set("view", viewValue);

    parsed.searchParams.forEach((v, k) => stateUrl.searchParams.set(k, v));

    return {
      href: parsed.href,
      fetchUrl: parsed.href,
      stateUrl,
      menuHref: parsed.pathname + parsed.search,
      sameOrigin: parsed.origin === window.location.origin,
    };
  }
  // Cargar vistas SPA
  async function loadPartial(href, { push = true } = {}) {
    if (!enableRouting || !href || isNavigating) return;

    const target = normalizeHref(href);

    if (!target.sameOrigin) {
      window.location.href = target.href;
      return;
    }

    try {
      isNavigating = true;

      const req = await fetch(target.fetchUrl, { cache: "no-cache" });
      if (!req.ok) throw new Error(`HTTP ${req.status}`);

      const html = await req.text();
      const dom = new DOMParser().parseFromString(html, "text/html");

      const main = dom.querySelector("main");
      if (!main) throw new Error("No se encontro <main> en la vista cargada.");

      ensureViewStyles(dom, target.fetchUrl);

      // Scripts de vista
      const scripts = [...dom.querySelectorAll("script")];
      scripts.forEach((s) => s.remove());

      mainContainer.innerHTML = main.innerHTML;
      mainContainer.scrollTo(0, 0);

      if (push) {
        history.pushState(
          { href: target.menuHref },
          "",
          target.stateUrl.toString()
        );
      }

      await executeScripts(scripts, target.fetchUrl);

      const title = dom.querySelector("title")?.textContent;
      if (title) document.title = title;

      highlightActive(target.menuHref);
      expandSubmenuByHref(target.menuHref);
      adjustContentMargin();
    } catch (e) {
      console.error("loadPartial error:", e);
      window.location.href = target.href;
    } finally {
      isNavigating = false;
    }
  }
  function hrefFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");

    if (!view) return null;

    params.delete("view");
    const search = params.toString();

    return search ? `${view}?${search}` : view;
  }

  // Bind menú
  if (menuRoot) {
    bindMenuEvents(menuRoot);
  }

  window.addEventListener("sidebar:state-sync", (ev) => {
    if (!ev.detail) return;
    sidebarState = { ...sidebarState, ...ev.detail };
    applySidebarState();
  });

  // Eventos del router SPA
  window.addEventListener("sidebar:navigate", (ev) => {
    if (ev.detail) loadPartial(ev.detail);
  });

  window.addEventListener("popstate", (ev) => {
    const href = ev.state?.href || hrefFromLocation();
    if (href) loadPartial(href, { push: false });
  });

  // Cerrar en mobile
  document.addEventListener("click", (ev) => {
    if (!checkDesktopView() && sidebarState.open) {
      if (
        !sidebar.contains(ev.target) &&
        !toggleBtn.contains(ev.target)
      ) {
        closeSidebar();
      }
    }
  });

  // Ajuste en resize
  window.addEventListener("resize", () => {
    if (checkDesktopView()) {
      sidebarState = { ...sidebarState, open: true };
    } else {
      sidebarState = { ...sidebarState, open: false };
    }
    applySidebarState();
  });

  // Inicialización automática
  const initialHref = hrefFromLocation();

  if (initialHref) {
    loadPartial(initialHref, { push: false });
  } else {
    const homeHref = withBasePath("index.html");
    highlightActive(homeHref);
    expandSubmenuByHref(homeHref);
  }

  applySidebarState();
}
