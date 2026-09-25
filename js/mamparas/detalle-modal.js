import { positionModal, watchModalPosition } from "../utils/helpers.js";

let carruselImagenes = [];
let carruselIndice = 0;
let limpiarDetalleOffset = null;
let limpiarCarruselOffset = null;
let escListenerActivo = false;

const MODAL_ID = "mampara-modal";
const CARRUSEL_ID = "mampara-carrusel";

const textoSeguro = (valor, fallback = "--") => {
  if (valor === null || valor === undefined || valor === "") return fallback;
  return String(valor);
};

const escapeHtml = (valor) =>
  textoSeguro(valor, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatearNumero = (valor, unidad) => {
  if (valor === null || valor === undefined || valor === "") return "--";
  const numero = Number.parseFloat(valor);
  if (Number.isFinite(numero)) return unidad ? `${numero} ${unidad}` : String(numero);
  return String(valor);
};

const aplicarOffsetSidebar = (overlay) => {
  if (!overlay) return () => {};
  positionModal(overlay);
  const cleanup = watchModalPosition(overlay);
  return typeof cleanup === "function" ? cleanup : () => {};
};

const normalizarImagenes = (imagenes) => {
  if (!Array.isArray(imagenes)) return [];
  return imagenes
    .map((img) => ({
      key: img?.key || "",
      label: img?.label || "Foto",
      url: img?.url || "",
    }))
    .filter((img) => img.url);
};

function construirGaleria(imagenes) {
  if (!imagenes.length) {
    return '<div class="form-status form-status--info">Este registro no tiene evidencias disponibles.</div>';
  }

  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px">
      ${imagenes.map((img,index) => `
        <button type="button" class="evidence-card" data-carousel-index="${index}" style="text-align:left">
          <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.label)}" loading="lazy" />
          <span class="evidence-card__footer">
            <span class="evidence-card__name">${escapeHtml(img.label)}</span>
          </span>
        </button>
      `).join("")}
    </div>
  `;
}

export function mostrarDetalleMampara(payload) {
  cerrarModales();

  const tipo = textoSeguro(payload?.tipo, "Mampara");
  const esMampara = tipo.toUpperCase() === "MAMPARA";
  const separacion = formatearNumero(payload?.separacion, "cm");
  const altura = formatearNumero(payload?.altura, "cm");
  const observacion = textoSeguro(payload?.observacion, "--");
  carruselImagenes = normalizarImagenes(payload?.imagenes);
  carruselIndice = 0;

  const overlay = document.createElement("div");
  overlay.id = MODAL_ID;
  overlay.className = "media-lightbox flex";
  overlay.style.zIndex = "7200";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", `Detalle de ${tipo}`);

  overlay.innerHTML = `
    <div class="media-lightbox__dialog" style="background:#fff;max-height:92vh;overflow:auto">
      <button type="button" class="media-close" data-close aria-label="Cerrar">×</button>

      <header style="padding:24px 26px 18px;border-bottom:1px solid #e1e2e5">
        <p class="tpp-eyebrow">Inspección registrada</p>
        <h2 style="margin:3px 0 5px;font-size:24px;letter-spacing:-.03em">${escapeHtml(tipo)}</h2>
        <p class="tpp-help">Revisa el detalle técnico y abre cualquier evidencia para verla a tamaño completo.</p>
      </header>

      <div style="padding:22px 26px 28px">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:20px">
          ${esMampara ? `
            <div class="inspection-action">
              <p class="tpp-eyebrow">Separación lateral</p>
              <h3 style="font-size:22px;margin-top:5px">${escapeHtml(separacion)}</h3>
            </div>
            <div class="inspection-action">
              <p class="tpp-eyebrow">Altura</p>
              <h3 style="font-size:22px;margin-top:5px">${escapeHtml(altura)}</h3>
            </div>
          ` : `
            <div class="inspection-action" style="grid-column:1/-1">
              <p class="tpp-eyebrow">Observación</p>
              <p style="margin:6px 0 0;line-height:1.55">${escapeHtml(observacion)}</p>
            </div>
          `}
        </div>

        <div class="inspection-column__head">
          <p class="tpp-eyebrow">Evidencias</p>
          <h2>Proyección fotográfica</h2>
        </div>
        ${construirGaleria(carruselImagenes)}
      </div>
    </div>
  `;

  const container = document.getElementById("mampara-detalle-modal-container") || document.body;
  container.appendChild(overlay);
  document.body.style.overflow = "hidden";
  limpiarDetalleOffset = aplicarOffsetSidebar(overlay);
  registrarEscape();

  overlay.addEventListener("click", (event) => {
    if (event.target.closest("[data-close]") || event.target === overlay) {
      cerrarModales();
      return;
    }
    const btn = event.target.closest("[data-carousel-index]");
    if (!btn) return;
    const index = Number(btn.dataset.carouselIndex);
    if (Number.isFinite(index)) abrirCarrusel(index);
  });
}

const abrirCarrusel = (indiceInicial) => {
  if (!carruselImagenes.length) return;

  carruselIndice = Math.max(0, Math.min(indiceInicial, carruselImagenes.length - 1));
  const overlay = document.createElement("div");
  overlay.id = CARRUSEL_ID;
  overlay.className = "media-lightbox flex";
  overlay.style.zIndex = "7400";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  overlay.innerHTML = `
    <div class="media-lightbox__dialog">
      <button type="button" class="media-close" data-close aria-label="Cerrar">×</button>
      <div class="media-stage" style="position:relative">
        <button type="button" data-prev class="media-close" aria-label="Anterior"
          style="left:12px!important;right:auto!important;top:50%!important;transform:translateY(-50%);display:${carruselImagenes.length > 1 ? "grid" : "none"}!important">‹</button>
        <img id="mampara-carrusel-img"
          src="${escapeHtml(carruselImagenes[carruselIndice].url)}"
          alt="${escapeHtml(carruselImagenes[carruselIndice].label)}" />
        <button type="button" data-next class="media-close" aria-label="Siguiente"
          style="top:50%!important;transform:translateY(-50%);display:${carruselImagenes.length > 1 ? "grid" : "none"}!important">›</button>
      </div>
      <div class="media-lightbox__footer">
        <strong id="mampara-carrusel-label">${escapeHtml(carruselImagenes[carruselIndice].label)}</strong>
        <span class="tpp-help" style="margin-left:auto">${carruselIndice + 1} / ${carruselImagenes.length}</span>
      </div>
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
    if (event.target.closest("[data-prev]")) moverCarrusel(-1);
    if (event.target.closest("[data-next]")) moverCarrusel(1);
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
  img.src = siguiente.url || "";
  img.alt = textoSeguro(siguiente.label);
  if (label) label.textContent = siguiente.label;
  const footerMeta = document.querySelector("#mampara-carrusel .media-lightbox__footer .tpp-help");
  if (footerMeta) footerMeta.textContent = `${carruselIndice + 1} / ${carruselImagenes.length}`;
};

const cerrarModales = () => {
  document.getElementById(MODAL_ID)?.remove();
  cerrarCarrusel();
  limpiarDetalleOffset?.();
  limpiarDetalleOffset = null;
  document.body.style.overflow = "";
  removerEscape();
};

const cerrarCarrusel = () => {
  document.getElementById(CARRUSEL_ID)?.remove();
  limpiarCarruselOffset?.();
  limpiarCarruselOffset = null;
};

const escListener = (event) => {
  if (event.key === "ArrowLeft" && document.getElementById(CARRUSEL_ID)) {
    moverCarrusel(-1);
    return;
  }
  if (event.key === "ArrowRight" && document.getElementById(CARRUSEL_ID)) {
    moverCarrusel(1);
    return;
  }
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
