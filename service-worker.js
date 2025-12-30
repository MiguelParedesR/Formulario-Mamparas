const detectBasePath = () => {
  const segments = self.location.pathname.split("/").filter(Boolean);
  if (!segments.length) return "";
  const last = segments[segments.length - 1];
  const isFile = /\.[a-z0-9]+$/i.test(last);
  const baseSegments = isFile ? segments.slice(0, -1) : segments;
  if (!baseSegments.length) return "";
  return `/${baseSegments[0]}`;
};

const BASE_PATH = detectBasePath();

const asset = (path = "") => {
  const cleaned = path.replace(/^\/+/, "");
  if (!BASE_PATH) return cleaned;
  return `${BASE_PATH}/${cleaned}`;
};

// Incremento de versión para forzar actualización del cache
const VERSION = "v7.135";
const CACHE_NAME = `CCTV-${VERSION}${BASE_PATH ? `-${BASE_PATH.replace(/\//g, "-")}` : ""}`;

// Archivos que intentaremos cachear si existen:
const STATIC_ASSETS = [
  "CSS/global.css",
  "CSS/tailwind.css",
  "CSS/dashboard/dashboard.css",
  "CSS/estilos-sidebar/sidebar.css",
  "CSS/styles.css",
  "js/sidebar/sidebar-loader.js",
  "js/sidebar/sidebar.js",
  "js/libs/docxtemplater-image-module.js",
  "js/dashboard/dashboard.js",
  "manifest.json",
  "favicon.ico",
].map(asset);

const STATIC_FILE_REGEX = /\.(css|js|png|jpg|jpeg|svg|webp|ico)$/i;

// ============================================================================
// INSTALL - Cachea solo los archivos que EXISTEN (modo seguro)
// ============================================================================
self.addEventListener("install", (event) => {
  console.log("[SW] Instalando...");

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      for (const url of STATIC_ASSETS) {
        try {
          const res = await fetch(url, { cache: "no-cache" });
          if (res.ok) {
            await cache.put(url, res.clone());
            console.log("[SW] Cacheado:", url);
          } else {
            console.warn("[SW] Archivo no existe, omitido:", url);
          }
        } catch (err) {
          console.warn("[SW] Error cacheando (omitido):", url);
        }
      }

      await self.skipWaiting();
    })()
  );
});

// ============================================================================
// ACTIVATE - Limpieza de caches antiguos
// ============================================================================
self.addEventListener("activate", (event) => {
  console.log("[SW] Activado");

  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log("[SW] Eliminando cache viejo:", key);
            return caches.delete(key);
          })
      );

      await self.clients.claim();
    })()
  );
});

// ============================================================================
// FETCH - Estrategia combinada
// ============================================================================
// - Network-first para HTML (SPA nunca se rompe)
// - Cache-first para CSS/JS/IMG
// - Ignoramos Supabase
// ============================================================================

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (
    req.method !== "GET" ||
    url.protocol !== "http:" && url.protocol !== "https:" ||
    url.origin !== self.location.origin ||
    url.href.includes("supabase.co")
  ) {
    return;
  }

  // Vista SPA: siempre desde red
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        const networkRes = await fetch(req);

        if (networkRes.ok && STATIC_FILE_REGEX.test(url.pathname)) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(req, networkRes.clone());
        }

        return networkRes;
      } catch (err) {
        return cached || Response.error();
      }
    })()
  );
});

// Forzar actualización de archivos críticos
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (STATIC_FILE_REGEX.test(req.url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(req);

        if (cachedResponse) {
          // Forzar actualización desde la red
          const networkResponse = await fetch(req);
          if (networkResponse.ok) {
            cache.put(req, networkResponse.clone());
            return networkResponse;
          }
          return cachedResponse;
        }

        return fetch(req);
      })()
    );
  }
});

// ============================================================================
// LOG
// ============================================================================
console.log("[SW] Modo Seguro TPP activo");
