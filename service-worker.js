const detectBasePath = () => {
  const segments = self.location.pathname.split("/").filter(Boolean);
  if (!segments.length) return "";
  const last = segments[segments.length - 1];
  const isFile = /\.[a-z0-9]+$/i.test(last);
  const baseSegments = isFile ? segments.slice(0, -1) : segments;
  return baseSegments.length ? `/${baseSegments[0]}` : "";
};

const BASE_PATH = detectBasePath();
const asset = (path = "") => {
  const cleaned = path.replace(/^\/+/, "");
  return BASE_PATH ? `${BASE_PATH}/${cleaned}` : cleaned;
};

const VERSION = "v7.143";
const CACHE_NAME = `CCTV-${VERSION}${BASE_PATH ? `-${BASE_PATH.replace(/\//g, "-")}` : ""}`;

const STATIC_ASSETS = [
  "CSS/global.css",
  "CSS/tailwind.css",
  "CSS/dashboard/dashboard.css",
  "CSS/apple-redesign.css",
  "CSS/estilos-sidebar/sidebar.css",
  "CSS/styles.css",
  "js/sidebar/sidebar-loader.js",
  "js/sidebar/sidebar.js",
  "js/mamparas/reportes.js",
  "js/libs/docxtemplater-image-module.js",
  "js/dashboard/dashboard.js",
  "manifest.json",
  "favicon.ico",
].map(asset);

const STATIC_FILE_REGEX = /\.(css|js|png|jpg|jpeg|svg|webp|ico)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const url of STATIC_ASSETS) {
        try {
          const res = await fetch(url, { cache: "no-cache" });
          if (res.ok) await cache.put(url, res.clone());
        } catch {
          // Los assets opcionales no bloquean la instalación.
        }
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: "no-cache" });
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!["http:", "https:"].includes(url.protocol)) return;
  if (url.origin !== self.location.origin) return;
  if (url.href.includes("supabase.co")) return;

  const isHtml =
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html");

  if (isHtml || /\.(js|css)$/i.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (STATIC_FILE_REGEX.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

console.log("[SW] TPP cache strategy v7.143 active");
