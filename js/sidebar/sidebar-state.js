const STORAGE_KEY = "tpp:sidebar-state";
const LEGACY_HIDDEN_KEY = "sidebar-hidden";

const DEFAULT_STATE = {
  mode: "expanded", // expanded | collapsed
  open: true, // visible
};

function persistHiddenFlag(open) {
  try {
    localStorage.setItem(LEGACY_HIDDEN_KEY, open ? "0" : "1");
  } catch (error) {
    console.warn("No se pudo guardar el flag legacy del sidebar:", error);
  }
}

export function loadSidebarState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const legacyHidden = localStorage.getItem(LEGACY_HIDDEN_KEY) === "1";
    const mode = stored?.mode === "collapsed" ? "collapsed" : "expanded";
    const open =
      typeof stored?.open === "boolean" ? stored.open : !legacyHidden;

    return { ...DEFAULT_STATE, ...stored, mode, open };
  } catch (error) {
    console.warn("No se pudo leer el estado del sidebar:", error);
    const legacyHidden = localStorage.getItem(LEGACY_HIDDEN_KEY) === "1";
    return { ...DEFAULT_STATE, open: !legacyHidden };
  }
}

export function saveSidebarState(state) {
  try {
    const payload = {
      mode: state.mode === "collapsed" ? "collapsed" : "expanded",
      open: state.open !== false,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    persistHiddenFlag(payload.open);
  } catch (error) {
    console.warn("No se pudo guardar el estado del sidebar:", error);
  }
}

export function syncContentLayout(state, mainContainer = document.querySelector("#dashboardContent")) {
  const target =
    mainContainer ||
    document.querySelector("#dashboardContent") ||
    document.querySelector("main");
  if (!target) return;

  const isDesktop = window.innerWidth >= 1024;
  const isCollapsed = state.mode === "collapsed";
  const isOpen = state.open !== false;

  // NOTE: Keep the push layout only on desktop to avoid mobile squeeze.
  if (!isDesktop || !isOpen) {
    target.style.setProperty("margin-left", "0px", "important");
    target.style.setProperty("width", "100%", "important");
    return;
  }

  const rootStyles = getComputedStyle(document.documentElement);
  const expandedWidth = rootStyles.getPropertyValue("--sidebar-width")?.trim() || "250px";
  const collapsedWidth = rootStyles.getPropertyValue("--sidebar-width-collapsed")?.trim() || "72px";
  const sideWidth = isCollapsed ? collapsedWidth : expandedWidth;

  // IMPORTANT: keep !important to override global main resets (prevents overlay).
  target.style.setProperty("margin-left", sideWidth, "important");
  target.style.setProperty("width", `calc(100% - ${sideWidth})`, "important");
}

export function applySidebarVisualState(
  sidebar,
  state,
  mainContainer = document.querySelector("#dashboardContent")
) {
  const isOpen = state.open !== false;
  const isCollapsed = state.mode === "collapsed";

  if (sidebar) {
    sidebar.classList.toggle("show", isOpen);
    // NOTE: ui-sidebar-active controls off-canvas transform; keep in sync.
    sidebar.classList.toggle("ui-sidebar-active", isOpen);
    sidebar.classList.toggle("collapsed", isCollapsed);
  }

  document.body.classList.toggle("sidebar-hidden", !isOpen);
  document.body.classList.toggle("sidebar-open", isOpen);
  document.body.classList.toggle("sidebar-collapsed", isOpen && isCollapsed);

  syncRestoreButton(document.getElementById("sidebarRespawn"), !isOpen);
  syncContentLayout(state, mainContainer);
}

export function toggleCollapsed(sidebar, state, open, mainContainer) {
  const next = {
    ...state,
    mode: state.mode === "collapsed" ? "expanded" : "collapsed",
    open,
  };
  applySidebarVisualState(sidebar, next, mainContainer);
  saveSidebarState(next);
  return next;
}

export function setSidebarOpen(sidebar, state, open, mainContainer) {
  const next = { ...state, open };
  applySidebarVisualState(sidebar, next, mainContainer);
  saveSidebarState(next);
  return next;
}

export function createRestoreButton() {
  const btn = document.createElement("button");
  btn.id = "sidebarRespawn";
  btn.type = "button";
  btn.className = "sidebar-respawn";
  btn.setAttribute("aria-label", "Mostrar men\u00fa lateral");
  btn.innerHTML = '<i class="fas fa-bars text-base"></i>';
  return btn;
}

export function createDesktopToggle() {
  const btn = document.createElement("button");
  btn.id = "sidebarDesktopToggle";
  btn.type = "button";
  btn.className = "sidebar-desktop-toggle";
  btn.setAttribute("aria-label", "Expandir men\u00fa lateral");
  btn.innerHTML = '<i class="fas fa-arrow-right text-base"></i>';
  return btn;
}

export function syncRestoreButton(btn, visible = true) {
  if (!btn) return;
  btn.classList.toggle("hidden", !visible);
  btn.style.display = visible ? "inline-flex" : "none";
}

export function shouldShowDesktopToggle(isDesktop, state) {
  if (!isDesktop) return false;
  return state.open && state.mode === "collapsed";
}

export function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const mainContainer = document.querySelector("#dashboardContent");
  const current = loadSidebarState();
  const next = { ...current, open: !current.open };
  applySidebarVisualState(sidebar, next, mainContainer);
  saveSidebarState(next);
  window.dispatchEvent(new CustomEvent("sidebar:state-sync", { detail: next }));
  return next;
}

export function initializeSidebarState() {
  const state = loadSidebarState();
  const sidebar = document.getElementById("sidebar");
  const mainContainer = document.querySelector("#dashboardContent");
  applySidebarVisualState(sidebar, state, mainContainer);
}
