const CACHE_NAME = "tpp-pwa-v25";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/assets/logo.png",
  "/assets/templates/informe-base.docx",
  "/css/dashboard/dashboard.css",
  "/css/estilos-sidebar/sidebar.css",
  "/css/global.css",
  "/css/styles.css",
  "/css/tailwind.css",
  "/html/base/sidebar.html",
  "/html/formulario-mamparas/registro.html",
  "/html/formulario-mamparas/registros.html",
  "/html/formulario-mamparas/reportes.html",
  "/html/formulario.html",
  "/html/registros.html",
  "/js/config.js",
  "/js/dashboard/dashboard.js",
  "/js/dashboard/progreso.js",
  "/js/formularios/campos-cable.js",
  "/js/formularios/campos-choque.js",
  "/js/formularios/campos-mercaderia.js",
  "/js/formularios/campos-siniestro.js",
  "/js/formularios/formulario.js",
  "/js/formularios/generador-docx.js",
  "/js/mamparas/registros.js",
  "/js/mamparas/reportes.js",
  "/js/mamparas/script.js",
  "/js/mamparas/verRegistros.js",
  "/js/registros/registros.js",
  "/js/sidebar/sidebar-loader.js",
  "/js/sidebar/sidebar.js",
  "/js/utils/helpers.js",
  "/js/utils/modal.js",
  "/js/utils/storage.js",
  "/js/utils/supabase.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS_TO_CACHE);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => (key === CACHE_NAME ? Promise.resolve() : caches.delete(key)))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) {
    return;
  }

  const isHTML =
    request.destination === "document" ||
    request.headers.get("accept")?.includes("text/html") ||
    request.url.endsWith(".html");

  if (isHTML) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match("/index.html");
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}
