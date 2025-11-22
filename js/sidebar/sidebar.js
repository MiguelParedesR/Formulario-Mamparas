// ============================================================================
// SIDEBAR.JS - SPA + Sidebar persistente
//  - Mobile slide + toggles
//  - Collapse desktop + flyout
//  - Submenus independientes
//  - Navegacion SPA con loadPartial()
//  - Resaltado de enlace activo
//  - Cierre al hacer click fuera y resize seguro
// ============================================================================

const MAIN_SELECTOR = "#dashboardContent";
const DESKTOP_BREAK = 1024;

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

  if (!container.querySelector("#sidebar")) {
    try {
      const resp = await fetch(htmlPath, { cache: "no-cache" });
      container.insertAdjacentHTML("afterbegin", await resp.text());
    } catch (e) {
      console.error("⚠️ Error cargando sidebar.html:", e);
      return;
    }
  }

  const sidebar = container.querySelector("#sidebar");
  const toggleFloating = container.querySelector("#sidebarUniversalToggle");
  const toggleInternal = container.querySelector("#sidebarInternalToggle");
  const collapseBtn = container.querySelector("#collapseBtn");
  const menuRoot = sidebar?.querySelector(".menu");

  if (!sidebar || !toggleFloating || !toggleInternal || !collapseBtn) {
    console.error("⚠️ initSidebar: No se encontraron los toggles requeridos.");
    return;
  }

  let isNavigating = false;

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

  collapseBtn.addEventListener("click", () => {
    const collapsed = sidebar.classList.toggle("collapsed");
    if (collapsed) document.body.classList.add("sidebar-collapsed");
    else document.body.classList.remove("sidebar-collapsed");
    adjustContentMargin();
  });

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

    root.querySelectorAll(".has-submenu > .menu-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const li = link.parentElement;
        const isTopLevel = li.closest(".menu") === menuRoot;
        const shouldOpenFlyout =
          isTopLevel &&
          !isFlyout &&
          isDesktop() &&
          sidebar.classList.contains("collapsed");

        if (shouldOpenFlyout) {
          openFlyout(li);
        } else {
          toggleSubmenu(li);
        }
      });
    });

    root.querySelectorAll(".submenu-link, .menu-link").forEach((link) => {
      const li = link.parentElement;
      if (li?.classList.contains("has-submenu")) return;

      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href");
        if (!href || !href.includes(".html")) return;

        e.preventDefault();
        loadPartial(href);
      });
    });
  }

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

    setTimeout(() => {
      document.addEventListener("click", function close(ev) {
        if (!fly.contains(ev.target) && !li.contains(ev.target)) {
          fly.remove();
          document.removeEventListener("click", close);
        }
      });
    }, 30);
  }

  function highlightActive(href) {
    sidebar
      .querySelectorAll(".menu-link, .submenu-link")
      .forEach((a) => a.classList.remove("active-link"));

    if (!href) return;

    let target = sidebar.querySelector(`a[href="${href}"]`);
    if (!target) {
      const pathOnly = href.split("?")[0];
      target = sidebar.querySelector(`a[href="${pathOnly}"]`);
    }
    if (!target) return;

    target.classList.add("active-link");

    let node = target.parentElement;
    while (node) {
      if (node.classList?.contains?.("has-submenu")) {
        setSubmenuState(node, true);
      }
      node = node.parentElement;
    }
  }

  function expandSubmenuByHref(href) {
    if (!href) return;
    const url = new URL(href, window.location.origin);
    const params = url.searchParams;
    const tipo = params.get("tipo");

    const mapTipo = {
      CABLE: "cable",
      MERCADERIA: "mercaderia",
      CHOQUE: "choque",
      SINIESTRO: "siniestro",
    };

    let targetLi = null;

    if (tipo && mapTipo[tipo]) {
      targetLi = sidebar.querySelector(`li[data-submenu="${mapTipo[tipo]}"]`);
    } else if (url.pathname.includes("/mamparas")) {
      targetLi = sidebar.querySelector(`li[data-submenu="mamparas"]`);
    }

    if (targetLi) {
      setSubmenuState(targetLi, true);
      const parent = targetLi.closest('li[data-submenu="incidencias"]');
      if (parent) setSubmenuState(parent, true);
    }
  }

  async function executeScripts(scripts) {
    for (const script of scripts) {
      const srcAttr = script.getAttribute("src");
      const typeAttr = script.getAttribute("type");
      const newScript = document.createElement("script");

      if (typeAttr) newScript.type = typeAttr;

      if (srcAttr) {
        const cacheBust = srcAttr.includes("?") ? "&" : "?";
        newScript.src = `${srcAttr}${cacheBust}_=${Date.now()}`;

        await new Promise((resolve, reject) => {
          newScript.onload = resolve;
          newScript.onerror = reject;
          document.body.appendChild(newScript);
        });
        newScript.remove();
      } else {
        newScript.textContent = script.textContent;
        document.body.appendChild(newScript);
        newScript.remove();
      }
    }
  }

  function buildStateUrl(targetUrl) {
    const navUrl = new URL(window.location.origin + window.location.pathname);
    navUrl.searchParams.set("view", targetUrl.pathname);
    targetUrl.searchParams.forEach((value, key) =>
      navUrl.searchParams.set(key, value)
    );
    return navUrl;
  }

  function normalizeHref(href) {
    const targetUrl = new URL(
      href,
      window.location.origin + window.location.pathname
    );
    const fetchUrl = `${targetUrl.pathname}${targetUrl.search}`;
    const stateUrl = buildStateUrl(targetUrl);
    const menuHref = `${targetUrl.pathname}${targetUrl.search}`;

    return { fetchUrl, stateUrl, menuHref };
  }

  async function loadPartial(href, { push = true } = {}) {
    if (!enableRouting || !href || isNavigating) return;

    const target = normalizeHref(href);

    try {
      isNavigating = true;
      const req = await fetch(target.fetchUrl, { cache: "no-cache" });
      if (!req.ok) throw new Error(`HTTP ${req.status}`);

      const html = await req.text();
      const dom = new DOMParser().parseFromString(html, "text/html");
      const scripts = Array.from(dom.querySelectorAll("script"));
      scripts.forEach((s) => s.remove());

      const main = dom.querySelector("main");

      if (!main) throw new Error("No se encontró <main> en la vista cargada.");

      mainContainer.innerHTML = main.innerHTML;
      mainContainer.scrollTo(0, 0);

      if (push) {
        history.pushState(
          { href: target.fetchUrl },
          "",
          target.stateUrl.toString()
        );
      }

      await executeScripts(scripts);
      const pageTitle = dom.querySelector("title")?.textContent;
      if (pageTitle) document.title = pageTitle;

      highlightActive(target.menuHref);
      expandSubmenuByHref(target.menuHref);
      adjustContentMargin();
    } catch (err) {
      console.error("⚠️ loadPartial error:", err);
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

  if (menuRoot) {
    bindMenuEvents(menuRoot);
  }

  window.addEventListener("sidebar:navigate", (ev) => {
    const href = ev.detail;
    if (href) loadPartial(href);
  });

  window.addEventListener("popstate", (ev) => {
    const href = ev.state?.href || hrefFromLocation();
    if (href) {
      loadPartial(href, { push: false });
    } else {
      highlightActive("/index.html");
    }
  });

  document.addEventListener("click", (ev) => {
    if (isDesktop()) return;
    if (!sidebar.contains(ev.target) && !toggleFloating.contains(ev.target)) {
      closeMobile();
    }
  });

  window.addEventListener("resize", () => {
    if (isDesktop()) {
      sidebar.classList.add("show");
      document.body.classList.remove("sidebar-hidden");
    } else {
      sidebar.classList.remove("collapsed");
      document.body.classList.remove("sidebar-collapsed");
    }
    adjustContentMargin();
  });

  const initialHref = hrefFromLocation();
  if (initialHref) {
    loadPartial(initialHref, { push: false });
  } else {
    highlightActive("/index.html");
    expandSubmenuByHref("/index.html");
  }

  if (isDesktop()) {
    sidebar.classList.add("show");
    document.body.classList.remove("sidebar-hidden");
  } else {
    closeMobile();
  }

  adjustContentMargin();
}
