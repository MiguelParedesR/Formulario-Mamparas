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

const MAIN_SELECTOR = "#dashboardContent";
const DESKTOP_BREAK = 1024;

/**
 * Inicializa el sidebar SPA
 */
export async function initSidebar(
  containerSelector = "#sidebar-container",
  options = {}
) {
  const htmlPath = options.htmlPath ?? "/html/base/sidebar.html";
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
  const toggleFloating = container.querySelector("#sidebarUniversalToggle");
  const toggleInternal = container.querySelector("#sidebarInternalToggle");
  const collapseBtn = container.querySelector("#collapseBtn");
  const menuRoot = sidebar.querySelector(".menu");

  if (!sidebar || !toggleFloating || !toggleInternal || !collapseBtn) {
    console.error("⚠️ initSidebar: Faltan elementos del sidebar.");
    return;
  }

  let isNavigating = false;

  // Responsive
  const isDesktop = () => window.innerWidth >= DESKTOP_BREAK;

  function adjustContentMargin() {
    if (!mainContainer) return;

    if (isDesktop()) {
      mainContainer.style.marginLeft = sidebar.classList.contains("collapsed")
        ? "70px"
        : "250px";
    } else {
      mainContainer.style.marginLeft = "0px";
    }
  }

  // Mobile open/close
  function openMobile() {
    sidebar.classList.add("show");
    document.body.classList.remove("sidebar-hidden");
  }

  function closeMobile() {
    sidebar.classList.remove("show");
    document.body.classList.add("sidebar-hidden");
  }

  toggleFloating.addEventListener("click", openMobile);
  toggleInternal.addEventListener("click", closeMobile);

  // Collapse desktop
  collapseBtn.addEventListener("click", () => {
    const collapsed = sidebar.classList.toggle("collapsed");

    if (collapsed) document.body.classList.add("sidebar-collapsed");
    else document.body.classList.remove("sidebar-collapsed");

    adjustContentMargin();
  });

  // Submenús
  function setSubmenuState(li, open) {
    li.classList.toggle("active", open);

    const submenu = li.querySelector(":scope > .submenu");
    if (!submenu) return;

    submenu.style.display = open ? "block" : "none";
    submenu.style.maxHeight = open ? submenu.scrollHeight + "px" : "0px";
    submenu.style.opacity = open ? "1" : "0";
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
        const isTopLevel = li.closest(".menu") === menuRoot;

        const openFlyoutMode =
          isTopLevel &&
          !isFlyout &&
          isDesktop() &&
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
          });
        }
      });
  }

  // Flyout (desplegable lateral)
  function openFlyout(li) {
    if (!isDesktop() || !sidebar.classList.contains("collapsed")) return;

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
  function highlightActive(href) {
    sidebar
      .querySelectorAll(".menu-link, .submenu-link")
      .forEach((a) => a.classList.remove("active-link"));

    if (!href) return;

    let target = sidebar.querySelector(`a[href="${href}"]`);

    if (!target) {
      const base = href.split("?")[0];
      target = sidebar.querySelector(`a[href="${base}"]`);
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

  // Expande submenú según ruta
  function expandSubmenuByHref(href) {
    if (!href) return;

    const url = new URL(href, window.location.origin);
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
  async function executeScripts(scripts) {
    for (const script of scripts) {
      const src = script.getAttribute("src");
      const type = script.getAttribute("type");
      const s = document.createElement("script");

      if (type) s.type = type;

      if (src) {
        const cacheBust = src.includes("?") ? "&" : "?";
        s.src = `${src}${cacheBust}_=${Date.now()}`;

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
    const parsed = new URL(
      href,
      window.location.origin + window.location.pathname
    );

    const relativePath = parsed.pathname + parsed.search;
    const stateUrl = new URL(window.location.href);
    stateUrl.searchParams.set("view", parsed.pathname);

    parsed.searchParams.forEach((v, k) => stateUrl.searchParams.set(k, v));

    return {
      href: parsed.href,
      fetchUrl: parsed.href,
      stateUrl,
      menuHref: relativePath,
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

      await executeScripts(scripts);

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
    if (!isDesktop()) {
      if (
        !sidebar.contains(ev.target) &&
        !toggleFloating.contains(ev.target)
      ) {
        closeMobile();
      }
    }
  });

  // Ajuste en resize
  window.addEventListener("resize", adjustContentMargin);

  // Inicialización automática
  const initialHref = hrefFromLocation();

  if (initialHref) {
    loadPartial(initialHref, { push: false });
  } else {
    highlightActive("/index.html");
    expandSubmenuByHref("/index.html");
  }

  if (isDesktop()) {
    sidebar.classList.add("show");
  } else {
    closeMobile();
  }

  adjustContentMargin();
}
