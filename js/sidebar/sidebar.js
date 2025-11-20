// ============================================================================
// SIDEBAR.JS — VERSIÓN FINAL TPP (Optimizado + SPA + Collapse/Flyout/Overlay)
// ============================================================================
//
// ✔ Exclusivo para /tpp-incidencias/
// ✔ Integración con sidebar-loader.js
// ✔ Contenedor único SPA: #dashboardContent
// ✔ Animación collapse desktop (icon-only)
// ✔ Overlay mobile
// ✔ Submenús con acordeón
// ✔ Submenús flotantes en modo collapsed desktop (flyout)
// ✔ Routing parcial (loadPartial)
// ✔ highlight activo
// ✔ Roles Supabase (oculta items admin si userRole = operador)
// ============================================================================

export async function initSidebar(
  containerSelector = "#sidebar-container",
  options = {}
) {
  const htmlPath = options.htmlPath ?? "../../html/base/sidebar.html";
  const toggleSelector = options.toggleSelector ?? "#sidebarToggle";
  const collapseSelector = options.collapseSelector ?? "#collapseBtn";
  const mainSelector = "#dashboardContent";
  const DESKTOP_BREAK = 1024;

  const BODY_CLASS_SIDEBAR_COLLAPSED = "sidebar-collapsed";
  const BODY_CLASS_SIDEBAR_OPEN = "sidebar-open";

  // --------------------------------------------------
  // Resolver container
  // --------------------------------------------------
  let container = document.querySelector(containerSelector);
  if (!container) {
    console.warn("❌ No existe #sidebar-container. Abortando sidebar.js");
    return;
  }

  // --------------------------------------------------
  // Cargar HTML si no existía (lo hace loader, pero se refuerza)
  // --------------------------------------------------
  if (!container.querySelector("#sidebar")) {
    try {
      const resp = await fetch(htmlPath);
      const html = await resp.text();
      container.insertAdjacentHTML("afterbegin", html);
    } catch (err) {
      console.error("❌ Error cargando sidebar.html:", err);
      return;
    }
  }

  // --------------------------------------------------
  // Referencias UI
  // --------------------------------------------------
  const sidebar = container.querySelector("#sidebar");
  const toggleBtn = container.querySelector(toggleSelector);
  const collapseBtn = container.querySelector(collapseSelector);
  const mainContainer = document.querySelector(mainSelector);

  if (!sidebar || !mainContainer) {
    console.error(
      "❌ sidebar.js: faltan elementos clave (#sidebar o #dashboardContent)"
    );
    return;
  }

  // --------------------------------------------------
  // Utils
  // --------------------------------------------------
  const isDesktop = () => window.innerWidth >= DESKTOP_BREAK;

  function adjustContentMargin() {
    if (isDesktop()) {
      if (sidebar.classList.contains("collapsed")) {
        mainContainer.style.marginLeft = "80px";
      } else {
        mainContainer.style.marginLeft = "250px";
      }
    } else {
      mainContainer.style.marginLeft = "0px";
    }
  }

  // --------------------------------------------------
  // Collapse Desktop
  // --------------------------------------------------
  function applyCollapsedState(collapsed) {
    if (collapsed) {
      sidebar.classList.add("collapsed");
      document.body.classList.add(BODY_CLASS_SIDEBAR_COLLAPSED);

      sidebar.querySelectorAll(".menu .menu-link span").forEach((span) => {
        span.dataset.prevDisplay = span.style.display || "";
        span.style.display = "none";
      });

      sidebar.querySelectorAll(".submenu").forEach((sub) => {
        sub.dataset.prevDisplay = sub.style.display || "";
        sub.style.display = "none";
        sub.style.maxHeight = "0px";
      });
    } else {
      sidebar.classList.remove("collapsed");
      document.body.classList.remove(BODY_CLASS_SIDEBAR_COLLAPSED);

      sidebar.querySelectorAll(".menu .menu-link span").forEach((span) => {
        span.style.display = span.dataset.prevDisplay || "";
        delete span.dataset.prevDisplay;
      });

      sidebar.querySelectorAll(".submenu").forEach((sub) => {
        sub.style.display = sub.dataset.prevDisplay || "";
        delete sub.dataset.prevDisplay;
      });
    }

    adjustContentMargin();
  }

  // --------------------------------------------------
  // Overlay Mobile
  // --------------------------------------------------
  function toggleSidebarMobile() {
    sidebar.classList.toggle("show");

    if (sidebar.classList.contains("show")) {
      document.body.classList.add(BODY_CLASS_SIDEBAR_OPEN);
    } else {
      document.body.classList.remove(BODY_CLASS_SIDEBAR_OPEN);
    }

    adjustContentMargin();
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      if (isDesktop()) {
        const willCollapse = !sidebar.classList.contains("collapsed");
        applyCollapsedState(willCollapse);
      } else {
        toggleSidebarMobile();
      }
    });
  }

  // --------------------------------------------------
  // Collapse button desktop (arrow)
  // --------------------------------------------------
  if (collapseBtn) {
    collapseBtn.addEventListener("click", () => {
      const willCollapse = !sidebar.classList.contains("collapsed");
      applyCollapsedState(willCollapse);
    });
  }

  // --------------------------------------------------
  // Submenús (acordeón + flyout)
  // --------------------------------------------------
  const menuRoot = sidebar.querySelector(".menu");

  function closeAllSubmenus(exceptLi = null) {
    menuRoot.querySelectorAll(":scope > li").forEach((li) => {
      if (li !== exceptLi) li.classList.remove("active");
      const sub = li.querySelector(".submenu");
      if (sub) sub.style.maxHeight = "0px";
    });
  }

  function showFlyout(li) {
    const sub = li.querySelector(".submenu");
    if (!sub) return;

    const existing = document.querySelector(".sidebar-flyout");
    if (existing) existing.remove();

    const rect = li.getBoundingClientRect();
    const fly = document.createElement("div");
    fly.className = "sidebar-flyout";
    Object.assign(fly.style, {
      position: "fixed",
      top: `${rect.top}px`,
      left: `${sidebar.getBoundingClientRect().right}px`,
      minWidth: "200px",
      background: "#394862",
      color: "#fff",
      zIndex: 3000,
      padding: "8px 6px",
      borderRadius: "6px",
      boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
    });

    const clone = sub.cloneNode(true);
    clone.style.display = "block";
    clone.style.maxHeight = "max-content";

    fly.appendChild(clone);
    document.body.appendChild(fly);

    const close = (ev) => {
      if (!fly.contains(ev.target) && !li.contains(ev.target)) {
        fly.remove();
        document.removeEventListener("click", close);
      }
    };
    setTimeout(() => document.addEventListener("click", close), 30);
  }

  menuRoot.querySelectorAll(":scope > li").forEach((li) => {
    const link = li.querySelector(".menu-link");
    const submenu = li.querySelector(".submenu");

    if (!submenu) {
      // LINK NORMAL
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = link.getAttribute("href");
        if (target && target.endsWith(".html")) loadPartial(target);
      });
      return;
    }

    // LINK CON SUBMENÚ
    link.addEventListener("click", (e) => {
      e.preventDefault();

      if (sidebar.classList.contains("collapsed") && isDesktop()) {
        showFlyout(li);
        return;
      }

      const isActive = li.classList.contains("active");

      closeAllSubmenus(isActive ? null : li);

      li.classList.toggle("active");

      if (li.classList.contains("active")) {
        submenu.style.display = "block";
        submenu.style.maxHeight = submenu.scrollHeight + "px";
      } else {
        submenu.style.maxHeight = "0px";
      }
    });
  });

  // --------------------------------------------------
  // Routing parcial (SPA)
  // --------------------------------------------------
  async function loadPartial(href) {
    try {
      const res = await fetch(href, { cache: "no-cache" });
      const html = await res.text();

      const dom = new DOMParser().parseFromString(html, "text/html");
      const main = dom.querySelector("main");

      if (main) mainContainer.innerHTML = main.innerHTML;

      document.title = dom.querySelector("title")?.textContent || "TPP";

      highlightActive(href);
      adjustContentMargin();

      const synthetic = new Event("DOMContentLoaded");
      document.dispatchEvent(synthetic);

      history.pushState({ href }, "", href);
    } catch (err) {
      console.error("Error loadPartial:", err);
    }
  }

  // --------------------------------------------------
  // highlight link
  // --------------------------------------------------
  function highlightActive(href) {
    sidebar
      .querySelectorAll(".menu-link")
      .forEach((a) => a.classList.remove("active-link"));
    const item = sidebar.querySelector(`a[href="${href}"]`);
    if (item) item.classList.add("active-link");
  }

  // --------------------------------------------------
  // Click fuera → cerrar sidebar mobile
  // --------------------------------------------------
  document.addEventListener("click", (ev) => {
    if (!isDesktop()) {
      if (!sidebar.contains(ev.target) && !toggleBtn.contains(ev.target)) {
        sidebar.classList.remove("show");
        document.body.classList.remove(BODY_CLASS_SIDEBAR_OPEN);
      }
    }
  });

  // --------------------------------------------------
  // Resize
  // --------------------------------------------------
  window.addEventListener("resize", () => {
    if (isDesktop()) {
      sidebar.classList.add("show");
      document.body.classList.remove(BODY_CLASS_SIDEBAR_OPEN);
    }

    adjustContentMargin();
  });

  // --------------------------------------------------
  // Inicialización final
  // --------------------------------------------------
  adjustContentMargin();
  sidebar.classList.add("show");
}
