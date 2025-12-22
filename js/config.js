// Ruta base autocalculada para funcionar en raiz o en GitHub Pages.
// Si necesitas forzarla manualmente, define window.BASE_PATH_OVERRIDE antes de cargar este archivo.

const REPO_BASE = "/Formulario-Mamparas";

const normalizeBase = (path = "") => {
  if (!path) return "";
  const trimmed = path.trim().replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const detectBasePath = () => {
  if (typeof window === "undefined") return normalizeBase(REPO_BASE);

  const override = window.BASE_PATH_OVERRIDE || window.__BASE_PATH_OVERRIDE__;
  if (override) return normalizeBase(override);

  const { protocol, hostname, pathname } = window.location;
  if (protocol === "file:") return "";

  if (hostname.endsWith("github.io")) {
    return normalizeBase(REPO_BASE);
  }

  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return "";

  const repoName = REPO_BASE.replace(/^\//, "");
  if (segments[0] === repoName) {
    return normalizeBase(REPO_BASE);
  }

  const last = segments[segments.length - 1];
  const isFile = /\.[a-zA-Z0-9]+$/.test(last);
  const baseSegments = isFile ? segments.slice(0, -1) : segments;

  if (!baseSegments.length) return "";

  return normalizeBase(`/${baseSegments[0]}`);
};

const BASE_PATH = detectBasePath();

const asset = (path = "") => {
  if (!path) return BASE_PATH || "";
  if (
    /^(https?:)?\/\//i.test(path) ||
    path.startsWith("data:") ||
    path.startsWith("mailto:") ||
    path.startsWith("tel:")
  ) {
    return path;
  }

  const cleaned = path.replace(/^\/+/, "");
  if (!BASE_PATH) return `./${cleaned}`;

  return `${BASE_PATH}/${cleaned}`;
};

const withBase = asset;

if (typeof window !== "undefined") {
  window.BASE_PATH = BASE_PATH;
  window.asset = asset;
  window.withBase = withBase;
}

export { BASE_PATH, asset, withBase };
