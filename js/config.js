// Ruta base autocalculada para funcionar en raiz o en GitHub Pages.
// Si necesitas forzarla manualmente, define window.BASE_PATH_OVERRIDE antes de cargar este archivo.

const normalizeBase = (path = "") => {
  if (!path) return "";
  const trimmed = path.trim().replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const detectBasePath = () => {
  if (typeof window === "undefined") return "";

  const override = window.BASE_PATH_OVERRIDE || window.__BASE_PATH_OVERRIDE__;
  if (override) return normalizeBase(override);

  const segments = window.location.pathname.split("/").filter(Boolean);
  if (!segments.length) return "";

  const last = segments[segments.length - 1];
  const isFile = /\.[a-zA-Z0-9]+$/.test(last);
  const baseSegments = isFile ? segments.slice(0, -1) : segments;

  if (!baseSegments.length) return "";

  // GitHub Pages expone la app bajo /REPO/, por eso tomamos solo el primer segmento.
  return normalizeBase(`/${baseSegments[0]}`);
};

const BASE_PATH = detectBasePath();

const withBase = (path = "") => {
  if (!path) return BASE_PATH || "";
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;

  const normalized = path.startsWith("/") ? path : `/${path}`;
  const prefix = BASE_PATH || "";

  if (prefix && (normalized === prefix || normalized.startsWith(`${prefix}/`))) {
    return normalized;
  }

  return `${prefix}${normalized}`;
};

if (typeof window !== "undefined") {
  window.BASE_PATH = BASE_PATH;
  window.withBase = withBase;
}

export { BASE_PATH, withBase };
