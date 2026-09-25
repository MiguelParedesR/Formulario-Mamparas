let gallery = [];
let activeIndex = 0;
let keyHandlerBound = false;

const DETAIL_ID = "mampara-modal";
const VIEWER_ID = "mampara-carrusel";

const safeText = (value, fallback = "—") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const formatMeasure = (value, unit = "cm") => {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? `${n} ${unit}` : String(value);
};

const normalizeImages = (images) =>
  (Array.isArray(images) ? images : []).map((img) => ({
    key: img?.key || "",
    label: safeText(img?.label, "Foto"),
    url: img?.url ? String(img.url) : "",
  }));

function closeViewer() {
  document.getElementById(VIEWER_ID)?.remove();
}

function closeDetail() {
  closeViewer();
  document.getElementById(DETAIL_ID)?.remove();
  unbindKeyboard();
}

function bindKeyboard() {
  if (keyHandlerBound) return;
  document.addEventListener("keydown", onKeydown);
  keyHandlerBound = true;
}

function unbindKeyboard() {
  if (!keyHandlerBound) return;
  document.removeEventListener("keydown", onKeydown);
  keyHandlerBound = false;
}

function onKeydown(event) {
  const viewer = document.getElementById(VIEWER_ID);
  if (event.key === "Escape") {
    if (viewer) closeViewer();
    else closeDetail();
    return;
  }
  if (!viewer || gallery.length < 2) return;
  if (event.key === "ArrowLeft") move(-1);
  if (event.key === "ArrowRight") move(1);
}

function createMetric(label, value) {
  const wrap = document.createElement("div");
  wrap.className = "mampara-detail-metric";

  const k = document.createElement("span");
  k.textContent = label;
  const v = document.createElement("strong");
  v.textContent = value;

  wrap.append(k, v);
  return wrap;
}

function createThumbnail(img, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = img.url ? "mampara-photo-card" : "mampara-photo-card is-empty";
  button.disabled = !img.url;

  const media = document.createElement("div");
  media.className = "mampara-photo-media";

  if (img.url) {
    const image = document.createElement("img");
    image.src = img.url;
    image.alt = img.label;
    image.loading = "lazy";
    media.appendChild(image);
  } else {
    const empty = document.createElement("span");
    empty.innerHTML = '<i class="fas fa-image"></i>';
    media.appendChild(empty);
  }

  const caption = document.createElement("div");
  caption.className = "mampara-photo-caption";
  caption.textContent = img.url ? img.label : `${img.label} · sin foto`;

  button.append(media, caption);
  if (img.url) button.addEventListener("click", () => openViewer(index));
  return button;
}

function buildDetail(payload) {
  const overlay = document.createElement("div");
  overlay.id = DETAIL_ID;
  overlay.className = "mampara-detail-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const panel = document.createElement("section");
  panel.className = "mampara-detail-panel";

  const header = document.createElement("header");
  header.className = "mampara-detail-header";

  const copy = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "ui-eyebrow";
  eyebrow.textContent = "Detalle de inspección";
  const title = document.createElement("h2");
  title.textContent = safeText(payload?.tipo, "Mampara");
  const subtitle = document.createElement("p");
  subtitle.textContent = "Medidas registradas y evidencia fotográfica asociada.";
  copy.append(eyebrow, title, subtitle);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "mampara-detail-close";
  close.setAttribute("aria-label", "Cerrar detalle");
  close.innerHTML = '<i class="fas fa-xmark"></i>';
  close.addEventListener("click", closeDetail);

  header.append(copy, close);

  const metrics = document.createElement("div");
  metrics.className = "mampara-detail-metrics";
  metrics.append(
    createMetric("Tipo", safeText(payload?.tipo, "Mampara")),
    createMetric("Separación lateral", formatMeasure(payload?.separacion)),
    createMetric("Altura de mampara", formatMeasure(payload?.altura))
  );

  const gallerySection = document.createElement("section");
  gallerySection.className = "mampara-detail-gallery";

  const galleryHead = document.createElement("div");
  galleryHead.className = "mampara-detail-gallery-head";
  const ghTitle = document.createElement("h3");
  ghTitle.textContent = "Evidencias";
  const ghCount = document.createElement("span");
  const available = gallery.filter((item) => item.url).length;
  ghCount.textContent = `${available} de ${gallery.length} disponibles`;
  galleryHead.append(ghTitle, ghCount);

  const grid = document.createElement("div");
  grid.className = "mampara-photo-grid";
  gallery.forEach((img, index) => grid.appendChild(createThumbnail(img, index)));

  gallerySection.append(galleryHead, grid);
  panel.append(header, metrics, gallerySection);
  overlay.appendChild(panel);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeDetail();
  });

  return overlay;
}

function openViewer(index) {
  if (!gallery[index]?.url) return;
  activeIndex = index;
  closeViewer();

  const overlay = document.createElement("div");
  overlay.id = VIEWER_ID;
  overlay.className = "mampara-viewer";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const top = document.createElement("div");
  top.className = "mampara-viewer-top";

  const meta = document.createElement("div");
  const label = document.createElement("strong");
  label.id = "mampara-viewer-label";
  const counter = document.createElement("span");
  counter.id = "mampara-viewer-counter";
  meta.append(label, counter);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "mampara-viewer-close";
  close.setAttribute("aria-label", "Cerrar visor");
  close.innerHTML = '<i class="fas fa-xmark"></i>';
  close.addEventListener("click", closeViewer);
  top.append(meta, close);

  const stage = document.createElement("div");
  stage.className = "mampara-viewer-stage";

  const image = document.createElement("img");
  image.id = "mampara-viewer-image";
  stage.appendChild(image);

  if (gallery.filter((item) => item.url).length > 1) {
    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "mampara-viewer-nav is-prev";
    prev.setAttribute("aria-label", "Foto anterior");
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.addEventListener("click", () => move(-1));

    const next = document.createElement("button");
    next.type = "button";
    next.className = "mampara-viewer-nav is-next";
    next.setAttribute("aria-label", "Foto siguiente");
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.addEventListener("click", () => move(1));
    stage.append(prev, next);
  }

  const strip = document.createElement("div");
  strip.className = "mampara-viewer-strip";
  gallery.forEach((item, idx) => {
    if (!item.url) return;
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.dataset.index = String(idx);
    thumb.className = "mampara-viewer-thumb";
    const img = document.createElement("img");
    img.src = item.url;
    img.alt = item.label;
    thumb.appendChild(img);
    thumb.addEventListener("click", () => {
      activeIndex = idx;
      updateViewer();
    });
    strip.appendChild(thumb);
  });

  overlay.append(top, stage, strip);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeViewer();
  });
  document.body.appendChild(overlay);
  updateViewer();
}

function availableIndices() {
  return gallery.map((item, i) => (item.url ? i : -1)).filter((i) => i >= 0);
}

function move(direction) {
  const indices = availableIndices();
  if (indices.length < 2) return;
  const currentPos = Math.max(0, indices.indexOf(activeIndex));
  activeIndex = indices[(currentPos + direction + indices.length) % indices.length];
  updateViewer();
}

function updateViewer() {
  const item = gallery[activeIndex];
  if (!item?.url) return;

  const image = document.getElementById("mampara-viewer-image");
  const label = document.getElementById("mampara-viewer-label");
  const counter = document.getElementById("mampara-viewer-counter");
  if (image) {
    image.src = item.url;
    image.alt = item.label;
  }
  if (label) label.textContent = item.label;

  const indices = availableIndices();
  const position = indices.indexOf(activeIndex) + 1;
  if (counter) counter.textContent = `${position} / ${indices.length}`;

  document.querySelectorAll(".mampara-viewer-thumb").forEach((thumb) => {
    thumb.classList.toggle("is-active", Number(thumb.dataset.index) === activeIndex);
  });
}

export function mostrarDetalleMampara(payload) {
  closeDetail();
  gallery = normalizeImages(payload?.imagenes);
  activeIndex = availableIndices()[0] ?? 0;
  document.body.appendChild(buildDetail(payload));
  bindKeyboard();
}
