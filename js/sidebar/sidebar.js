// ============================================================================
// SIDEBAR.JS – VERSION FINAL PRODUCCIÓN TPP
// Integrado con:
// - sidebar.html (toggle universal + interno + collapse)
// - sidebar.css (floating, collapsed, mobile, flyout)
// - sidebar-loader.js
// - SPA (loadPartial)
// ============================================================================

export async function initSidebar(
    containerSelector = "#sidebar-container",
    options = {}
) {

    const htmlPath = options.htmlPath ?? "../../html/base/sidebar.html";
    const mainSelector = "#dashboardContent";
    const DESKTOP_BREAK = 1024;

    // --------------------------------------------------------------------------------
    // Localizar contenedor
    // --------------------------------------------------------------------------------
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error("❌ initSidebar: No existe #sidebar-container.");
        return;
    }

    // Si no existe sidebar → lo carga (normalmente sidebar-loader lo hace)
    if (!container.querySelector("#sidebar")) {
        try {
            const resp = await fetch(htmlPath);
            container.insertAdjacentHTML("afterbegin", await resp.text());
        } catch (e) {
            console.error("❌ Error cargando sidebar.html:", e);
            return;
        }
    }

    // --------------------------------------------------------------------------------
    // Referencias reales (100% matching con tu sidebar.html)
    // --------------------------------------------------------------------------------
    const sidebar = container.querySelector("#sidebar");
    const toggleFloating = container.querySelector("#sidebarUniversalToggle");
    const toggleInternal = container.querySelector("#sidebarInternalToggle");
    const collapseBtn = container.querySelector("#collapseBtn");
    const mainContainer = document.querySelector(mainSelector);

    if (!sidebar || !toggleFloating || !toggleInternal || !collapseBtn) {
        console.error("❌ initSidebar: No se encontraron todos los toggles.");
        return;
    }

    // ------------------------------------------------------------
    // UTILIDADES
    // ------------------------------------------------------------
    const isDesktop = () => window.innerWidth >= DESKTOP_BREAK;

    function adjustContentMargin() {
        if (isDesktop()) {
            mainContainer.style.marginLeft =
                sidebar.classList.contains("collapsed") ? "70px" : "250px";
        } else {
            mainContainer.style.marginLeft = "0px";
        }
    }

    // ------------------------------------------------------------
    // BEHAVIOR: MOBILE SLIDE
    // ------------------------------------------------------------
    function openMobile() {
        sidebar.classList.add("show");
        document.body.classList.remove("sidebar-hidden");
    }

    function closeMobile() {
        sidebar.classList.remove("show");
        document.body.classList.add("sidebar-hidden");
    }

    // Floating toggle siempre abre el sidebar
    toggleFloating.addEventListener("click", openMobile);

    // Internal toggle (cuando sidebar está visible)
    toggleInternal.addEventListener("click", closeMobile);

    // ------------------------------------------------------------
    // BEHAVIOR: DESKTOP COLLAPSE
    // ------------------------------------------------------------
    collapseBtn.addEventListener("click", () => {
        const collapsed = sidebar.classList.toggle("collapsed");
        if (collapsed) document.body.classList.add("sidebar-collapsed");
        else document.body.classList.remove("sidebar-collapsed");
        adjustContentMargin();
    });

    // ------------------------------------------------------------
    // SUBMENÚS – Modo B (independientes)
    // ------------------------------------------------------------
    const menuRoot = sidebar.querySelector(".menu");

    function toggleSubmenu(node) {
        node.classList.toggle("active");
        const submenu = node.querySelector(".submenu");

        if (!submenu) return;

        if (node.classList.contains("active")) {
            submenu.style.display = "block";
            submenu.style.maxHeight = submenu.scrollHeight + "px";
            submenu.style.opacity = "1";
        } else {
            submenu.style.maxHeight = "0px";
            submenu.style.opacity = "0";
            setTimeout(() => {
                if (!node.classList.contains("active")) {
                    submenu.style.display = "none";
                }
            }, 300);
        }
    }

    // Flyout for collapsed desktop
    function openFlyout(li) {
        if (!isDesktop() || !sidebar.classList.contains("collapsed")) return;

        const old = document.querySelector(".sidebar-flyout");
        if (old) old.remove();

        const submenu = li.querySelector(".submenu");
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

        setTimeout(() => {
            document.addEventListener("click", function close(ev) {
                if (!fly.contains(ev.target) && !li.contains(ev.target)) {
                    fly.remove();
                    document.removeEventListener("click", close);
                }
            });
        }, 30);
    }

    // Attach listeners
    menuRoot.querySelectorAll(":scope > li").forEach(li => {
        const link = li.querySelector(".menu-link");
        const submenu = li.querySelector(".submenu");

        if (!link) return;

        // Enlace directo con navegación SPA
        if (!submenu) {
            link.addEventListener("click", e => {
                const href = link.getAttribute("href");
                if (href && href.endsWith(".html")) {
                    e.preventDefault();
                    loadPartial(href);
                }
            });
            return;
        }

        // Enlace con submenú
        link.addEventListener("click", e => {
            e.preventDefault();

            if (isDesktop() && sidebar.classList.contains("collapsed")) {
                openFlyout(li);
            } else {
                toggleSubmenu(li);
            }
        });
    });

    // ------------------------------------------------------------
    // SPA — loadPartial
    // ------------------------------------------------------------
    async function loadPartial(href) {
        try {
            const req = await fetch(href, { cache: "no-cache" });
            const html = await req.text();
            const dom = new DOMParser().parseFromString(html, "text/html");

            const main = dom.querySelector("main");
            if (main) mainContainer.innerHTML = main.innerHTML;

            document.title = dom.querySelector("title")?.textContent || "TPP";

            highlightActive(href);
            adjustContentMargin();

            history.pushState({ href }, "", href);
        } catch (err) {
            console.error("❌ loadPartial error:", err);
        }
    }

    // ------------------------------------------------------------
    // ACTIVE LINK
    // ------------------------------------------------------------
    function highlightActive(href) {
        sidebar.querySelectorAll(".menu-link").forEach(a =>
            a.classList.remove("active-link")
        );

        const item = sidebar.querySelector(`a[href="${href}"]`);
        if (item) item.classList.add("active-link");
    }

    // ------------------------------------------------------------
    // CLICK FUERA PARA CERRAR EN MÓVIL
    // ------------------------------------------------------------
    document.addEventListener("click", ev => {
        if (isDesktop()) return;

        if (!sidebar.contains(ev.target) && !toggleFloating.contains(ev.target)) {
            closeMobile();
        }
    });

    // ------------------------------------------------------------
    // RESIZE
    // ------------------------------------------------------------
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

    // ------------------------------------------------------------
    // INIT FINAL
    // ------------------------------------------------------------
    sidebar.classList.add("show");
    document.body.classList.remove("sidebar-hidden");
    adjustContentMargin();
}
