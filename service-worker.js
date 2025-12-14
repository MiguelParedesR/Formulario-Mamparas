const CACHE_NAME = "tpp-v44";

// Archivos que intentaremos cachear si existen:
const STATIC_ASSETS = [
  "/css/global.css",
  "/css/tailwind.css",
  "/css/dashboard/dashboard.css",
  "/css/estilos-sidebar/sidebar.css",
  "/js/sidebar/sidebar-loader.js",
  "/js/sidebar/sidebar.js",
  "/js/libs/docxtemplater-image-module.js",
  "/js/dashboard.js",
  "/manifest.json",
  "/favicon.ico",
];

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
    })()
  );

  self.skipWaiting();
});

// ============================================================================
// ACTIVATE - Limpieza de caches antiguos
// ============================================================================
self.addEventListener("activate", (event) => {
  console.log("[SW] Activado");

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log("[SW] Eliminando cache viejo:", key);
            return caches.delete(key);
          })
      )
    )
  );

  self.clients.claim();
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

// ============================================================================
// LOG
// ============================================================================
console.log("[SW] Modo Seguro TPP activo");

