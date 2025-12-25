import { positionModal, watchModalPosition } from "../utils/helpers.js";

let carruselImagenes = [];
let carruselIndice = 0;
let limpiarDetalleOffset = null;
let limpiarCarruselOffset = null;
let escListenerActivo = false;

const MODAL_ID = "mampara-modal";
const CARRUSEL_ID = "mampara-carrusel";
const DARK_BUTTON_BASE =
  "rounded-full text-white shadow-lg flex items-center justify-center transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/60";
const DARK_BUTTON_STYLE = "background-color: #0b1a2a; border: 1px solid rgba(255,255,255,0.22);";

const textoSeguro = (valor, fallback = "--") => {
  if (valor === null || valor === undefined || valor === "") return fallback;
  return String(valor);
};

const formatearNumero = (valor, unidad) => {
  if (valor === null || valor === undefined || valor === "") return "--";
  const numero = Number.parseFloat(valor);
  if (Number.isFinite(numero)) {
    return unidad ? `${numero} ${unidad}` : `${numero}`;
  }
  return String(valor);
};

const aplicarOffsetSidebar = (overlay) => {
  if (!overlay) return () => {};
  // Keep overlay aligned with sidebar open/collapsed state (avoid SPA overlap).
  positionModal(overlay);
  const cleanup = watchModalPosition(overlay);
  return typeof cleanup === "function" ? cleanup : () => {};
};

const normalizarImagenes = (imagenes) => {
  if (!Array.isArray(imagenes)) return [];
  return imagenes.map((img) => ({
    key: img?.key || "",
    label: img?.label || "Foto",
    labelHtml: img?.labelHtml || img?.label || "Foto",
    url: img?.url || "",
  }));
};

const construirMiniaturas = (imagenes) => {
  const disponibles = [];
  const indices = imagenes.map((img) => {
    if (img.url) {
      disponibles.push(img);
      return disponibles.length - 1;
    }
    return -1;
  });

  const html = imagenes
    .map((img, idx) => {
      const habilitada = Boolean(img.url);
      const carouselIndex = indices[idx];
      const dataAttr = `data-carousel-index="${carouselIndex}"`;
      const disabledAttr = habilitada ? "" : 'disabled aria-disabled="true"';
      const claseBase =
        "w-full h-28 rounded-xl border border-gray-200 shadow-sm overflow-hidden transition";
      const claseHover = habilitada
        ? "cursor-pointer hover:shadow-md hover:ring-2 hover:ring-blue-500"
        : "cursor-not-allowed opacity-60";
      const contenido = habilitada
        ? `<img src="${img.url}" alt="${textoSeguro(img.label)}" class="w-full h-full object-cover" loading="lazy" />`
        : `<div class="w-full h-full flex items-center justify-center text-xs text-gray-400">Sin foto</div>`;

      return `
        <div class="text-center" style="flex: 1 1 0; min-width: 180px;">
          <button type="button" class="${claseBase} ${claseHover}" ${dataAttr} ${disabledAttr}>
            ${contenido}
          </button>
          <p class="text-xs font-semibold text-gray-600 mt-2">${img.labelHtml}</p>
        </div>
      `;
    })
    .join("");

  return { html, disponibles };
};

export function mostrarDetalleMampara(payload) {
  cerrarModales();

  const tipo = textoSeguro(payload?.tipo, "Mampara");
  const separacion = formatearNumero(payload?.separacion, "cm");
  const altura = formatearNumero(payload?.altura, "cm");
  const imagenes = normalizarImagenes(payload?.imagenes);
  const { html: miniaturasHtml, disponibles } = construirMiniaturas(imagenes);

  carruselImagenes = disponibles;
  carruselIndice = 0;

  const overlay = document.createElement("div");
  overlay.id = MODAL_ID;
  overlay.className =
    "fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6 animate-fade";
  overlay.style.zIndex = "1800";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 sm:p-8 relative animate-grow" style="padding-top: 3.75rem;">
      <button
        type="button"
        class="${DARK_BUTTON_BASE} absolute top-4 right-4 w-10 h-10 text-xl leading-none z-10"
        data-close
        aria-label="Cerrar"
        style="${DARK_BUTTON_STYLE}"
      >&times;</button>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p class="text-[11px] uppercase tracking-[0.2em] text-gray-500">Tipo</p>
          <p class="text-lg font-semibold text-gray-900">${tipo}</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p class="text-[11px] uppercase tracking-[0.2em] text-gray-500">Separaci&oacute;n lateral central</p>
          <p class="text-lg font-semibold text-gray-900">${separacion}</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p class="text-[11px] uppercase tracking-[0.2em] text-gray-500">Altura de mampara</p>
          <p class="text-lg font-semibold text-gray-900">${altura}</p>
        </div>
      </div>

      <div class="mt-6">
        <div class="flex flex-nowrap gap-4 overflow-x-auto pb-2">
          ${miniaturasHtml}
        </div>
      </div>
    </div>
  `;

  const container = document.getElementById("mampara-detalle-modal-container") || document.body;
  container.appendChild(overlay);
  limpiarDetalleOffset = aplicarOffsetSidebar(overlay);
  registrarEscape();

  overlay.addEventListener("click", (event) => {
    if (event.target.closest("[data-close]") || event.target === overlay) {
      cerrarModales();
      return;
    }

    const btn = event.target.closest("[data-carousel-index]");
    if (!btn) return;
    const nextIndex = Number(btn.dataset.carouselIndex);
    if (Number.isFinite(nextIndex) && nextIndex >= 0) {
      abrirCarrusel(nextIndex);
    }
  });
}

const abrirCarrusel = (indiceInicial) => {
  if (!carruselImagenes.length) return;

  carruselIndice = Math.max(0, Math.min(indiceInicial, carruselImagenes.length - 1));
  const mostrarControles = carruselImagenes.length > 1;

  const overlay = document.createElement("div");
  overlay.id = CARRUSEL_ID;
  overlay.className =
    "fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 py-6 animate-fade";
  overlay.style.zIndex = "1900";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const arrowHidden = mostrarControles ? "" : "opacity-0 pointer-events-none";

  overlay.innerHTML = `
    <div class="relative w-full max-w-5xl mx-auto">
      <button
        type="button"
        class="${DARK_BUTTON_BASE} absolute top-3 right-3 w-11 h-11 text-2xl leading-none z-10"
        data-close
        aria-label="Cerrar"
        style="${DARK_BUTTON_STYLE}"
      >&times;</button>
      <div class="flex items-center justify-center gap-4 sm:gap-6">
        <button
          type="button"
          class="${DARK_BUTTON_BASE} w-12 h-12 text-2xl leading-none flex-shrink-0 ${arrowHidden}"
          data-prev
          aria-label="Anterior"
          style="${DARK_BUTTON_STYLE}"
        >
          &#10094;
        </button>
        <img
          id="mampara-carrusel-img"
          src="${carruselImagenes[carruselIndice].url}"
          alt="${textoSeguro(carruselImagenes[carruselIndice].label)}"
          class="max-h-[75vh] max-w-[80vw] object-contain rounded-2xl bg-black/30 shadow-2xl transition-opacity duration-300"
        />
        <button
          type="button"
          class="${DARK_BUTTON_BASE} w-12 h-12 text-2xl leading-none flex-shrink-0 ${arrowHidden}"
          data-next
          aria-label="Siguiente"
          style="${DARK_BUTTON_STYLE}"
        >
          &#10095;
        </button>
      </div>
      <p id="mampara-carrusel-label" class="text-center text-sm text-gray-200 mt-4">
        ${carruselImagenes[carruselIndice].labelHtml}
      </p>
    </div>
  `;

  document.body.appendChild(overlay);
  limpiarCarruselOffset = aplicarOffsetSidebar(overlay);
  registrarEscape();

  overlay.addEventListener("click", (event) => {
    if (event.target.closest("[data-close]") || event.target === overlay) {
      cerrarCarrusel();
      return;
    }

    if (event.target.closest("[data-prev]")) {
      moverCarrusel(-1);
    }
    if (event.target.closest("[data-next]")) {
      moverCarrusel(1);
    }
  });
};

const moverCarrusel = (direccion) => {
  if (!carruselImagenes.length) return;
  carruselIndice = (carruselIndice + direccion + carruselImagenes.length) % carruselImagenes.length;
  actualizarCarrusel();
};

const actualizarCarrusel = () => {
  const img = document.getElementById("mampara-carrusel-img");
  const label = document.getElementById("mampara-carrusel-label");
  if (!img) return;

  const siguiente = carruselImagenes[carruselIndice];
  img.classList.add("opacity-0");

  window.setTimeout(() => {
    img.src = siguiente.url || "";
    img.alt = textoSeguro(siguiente.label);
    if (label) label.innerHTML = siguiente.labelHtml;
    img.classList.remove("opacity-0");
  }, 120);
};

const cerrarModales = () => {
  document.getElementById(MODAL_ID)?.remove();
  cerrarCarrusel();
  limpiarDetalleOffset?.();
  limpiarDetalleOffset = null;
  removerEscape();
};

const cerrarCarrusel = () => {
  document.getElementById(CARRUSEL_ID)?.remove();
  limpiarCarruselOffset?.();
  limpiarCarruselOffset = null;
};

const escListener = (event) => {
  if (event.key !== "Escape") return;
  if (document.getElementById(CARRUSEL_ID)) {
    cerrarCarrusel();
    return;
  }
  cerrarModales();
};

const registrarEscape = () => {
  if (escListenerActivo) return;
  document.addEventListener("keydown", escListener);
  escListenerActivo = true;
};

const removerEscape = () => {
  if (!escListenerActivo) return;
  document.removeEventListener("keydown", escListener);
  escListenerActivo = false;
};
