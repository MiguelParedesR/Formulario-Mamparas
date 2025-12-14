/* ============================================================================
   FORMULARIO DE INCIDENCIAS - TPP
   Arquitectura modular, limpia y preparada para SPA + Tailwind
   Compatible con formulario.html reconstruido
   ========================================================================= */

import { supabase } from "../utils/supabase.js";
import { uploadFiles } from "../utils/storage.js";
import { generateWordFinal } from "./generador-docx.js";
import { withBase } from "../config.js";

/* ---------------------------------------------------------------------------
   CONSTANTES DE PLANTILLA / TIPOS DE INCIDENCIA
--------------------------------------------------------------------------- */

const ASUNTOS = {
  CABLE: "SUSTRACCION DE CABLE RH",
  MERCADERIA: "SUSTRACCION DE MERCADERIA",
  CHOQUE: "CHOQUE DE UNIDAD",
  SINIESTRO: "SINIESTRO",
};

const VALID_ANEXO_FORMATS = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "application/pdf",
];

const VALID_ANEXO_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf"];
const MAX_ANEXOS = 10;

/* ---------------------------------------------------------------------------
   REFERENCIAS A ELEMENTOS DEL DOM
--------------------------------------------------------------------------- */

const tipoDescripcion = document.getElementById("tipoDescripcion");
const asuntoInput = document.getElementById("asunto");
const campoExtraContainer = document.getElementById("campoExtraContainer");

const dirigidoAInput = document.getElementById("dirigidoA");
const remitenteInput = document.getElementById("remitente");
const fechaInformeInput = document.getElementById("fechaInforme");

const hechosInput = document.getElementById("hechos");
const analisisInput = document.getElementById("analisis");
const conclusionesInput = document.getElementById("conclusiones");
const recomendacionesInput = document.getElementById("recomendaciones");

const anexosInput = document.getElementById("anexos");
const dropZoneAnexos = document.getElementById("dropZoneAnexos");
const anexosPreview = document.getElementById("anexosPreview");
const btnSubirAnexos = document.getElementById("btnSubirAnexos");

const progressBar = document.getElementById("progressBar");
const progressLabel = document.getElementById("progressLabel");

const lightboxOverlay = document.getElementById("lightboxOverlay");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxCloseBtn = document.getElementById("lightboxClose");

/* ---------------------------------------------------------------------------
   ESTADO DEL FORMULARIO
--------------------------------------------------------------------------- */

let tipoSeleccionado = null;
const extraRefs = { contenedor: null, placa: null };
let anexosArchivos = [];

/* ---------------------------------------------------------------------------
   DETECTAR TIPO DESDE LA URL (?tipo=)
--------------------------------------------------------------------------- */

function detectarTipoDesdeURL() {
  const url = new URL(window.location.href);
  const tipoParam = url.searchParams.get("tipo")?.toUpperCase();
  if (!tipoParam || !ASUNTOS[tipoParam]) return null;
  return tipoParam;
}

/* ---------------------------------------------------------------------------
   CONFIGURAR FORMULARIO AL CARGAR EL TIPO
--------------------------------------------------------------------------- */

function configurarTipo(tipo) {
  tipoSeleccionado = tipo;

  asuntoInput.value = ASUNTOS[tipoSeleccionado];
  tipoDescripcion.textContent = `Plantilla cargada: ${ASUNTOS[tipoSeleccionado]}`;

  renderCamposExtra(tipoSeleccionado);
  recalcularProgreso();
}
/* ---------------------------------------------------------------------------
   GENERAR CAMPOS EXTRA (Contenedor / Placa / Ambos)
--------------------------------------------------------------------------- */
function renderCamposExtra(tipo) {
  if (!campoExtraContainer) return;

  campoExtraContainer.innerHTML = "";
  extraRefs.contenedor = null;
  extraRefs.placa = null;

  const baseClasses =
    "w-full rounded-xl border-gray-300 shadow-sm text-sm px-3 py-2 " +
    "focus:ring-indigo-500 focus:border-indigo-500 transition";

  // CABLE / MERCADERIA → SOLO CONTENEDOR
  if (tipo === "CABLE" || tipo === "MERCADERIA") {
    const label = document.createElement("label");
    label.className = "text-sm font-semibold text-gray-700";
    label.textContent = "Serie del contenedor";

    const input = document.createElement("input");
    input.id = "serieContenedor";
    input.placeholder = "SERIE DEL CONTENEDOR";
    input.className = baseClasses;

    extraRefs.contenedor = input;
    input.addEventListener("input", recalcularProgreso);

    const wrap = document.createElement("div");
    wrap.className = "space-y-2";
    wrap.appendChild(label);
    wrap.appendChild(input);

    campoExtraContainer.appendChild(wrap);
    return;
  }

  // CHOQUE → SOLO PLACA
  if (tipo === "CHOQUE") {
    const label = document.createElement("label");
    label.className = "text-sm font-semibold text-gray-700";
    label.textContent = "Placa de unidad";

    const input = document.createElement("input");
    input.id = "placaUnidad";
    input.placeholder = "PLACA DE UNIDAD";
    input.className = baseClasses;

    extraRefs.placa = input;
    input.addEventListener("input", recalcularProgreso);

    const wrap = document.createElement("div");
    wrap.className = "space-y-2";
    wrap.appendChild(label);
    wrap.appendChild(input);

    campoExtraContainer.appendChild(wrap);
    return;
  }

  // SINIESTRO → CONTENEDOR + PLACA
  if (tipo === "SINIESTRO") {
    const contLbl = document.createElement("label");
    contLbl.className = "text-sm font-semibold text-gray-700";
    contLbl.textContent = "Contenedor";

    const contInput = document.createElement("input");
    contInput.id = "contenedorSiniestro";
    contInput.placeholder = "CONTENEDOR";
    contInput.className = baseClasses;

    const placaLbl = document.createElement("label");
    placaLbl.className = "text-sm font-semibold text-gray-700";
    placaLbl.textContent = "Placa de unidad";

    const placaInput = document.createElement("input");
    placaInput.id = "placaSiniestro";
    placaInput.placeholder = "PLACA DE UNIDAD";
    placaInput.className = baseClasses;

    extraRefs.contenedor = contInput;
    extraRefs.placa = placaInput;

    contInput.addEventListener("input", recalcularProgreso);
    placaInput.addEventListener("input", recalcularProgreso);

    const grid = document.createElement("div");
    grid.className = "grid grid-cols-1 md:grid-cols-2 gap-4";

    const w1 = document.createElement("div");
    w1.className = "space-y-2";
    w1.appendChild(contLbl);
    w1.appendChild(contInput);

    const w2 = document.createElement("div");
    w2.className = "space-y-2";
    w2.appendChild(placaLbl);
    w2.appendChild(placaInput);

    grid.appendChild(w1);
    grid.appendChild(w2);

    campoExtraContainer.appendChild(grid);
  }
}

/* ---------------------------------------------------------------------------
   OBTENER VALOR EXTRA (contenedor / placa)
--------------------------------------------------------------------------- */
function obtenerValorExtra() {
  const valor = { contenedor: null, placa: null };

  if (tipoSeleccionado === "CABLE" || tipoSeleccionado === "MERCADERIA") {
    valor.contenedor = extraRefs.contenedor?.value?.trim() || null;
  } else if (tipoSeleccionado === "CHOQUE") {
    valor.placa = extraRefs.placa?.value?.trim() || null;
  } else if (tipoSeleccionado === "SINIESTRO") {
    valor.contenedor = extraRefs.contenedor?.value?.trim() || null;
    valor.placa = extraRefs.placa?.value?.trim() || null;
  }

  return valor;
}

/* ---------------------------------------------------------------------------
   RECALCULAR PROGRESO DEL FORMULARIO
--------------------------------------------------------------------------- */
function recalcularProgreso() {
  const camposRequired = [
    asuntoInput,
    dirigidoAInput,
    remitenteInput,
    fechaInformeInput,
    hechosInput,
    analisisInput,
    conclusionesInput,
    recomendacionesInput,
  ];

  if (extraRefs.contenedor) camposRequired.push(extraRefs.contenedor);
  if (extraRefs.placa) camposRequired.push(extraRefs.placa);

  const total = camposRequired.length;
  let llenos = camposRequired.filter(
    (el) => el && el.value.trim() !== ""
  ).length;

  if (anexosArchivos.length > 0) llenos++;

  const progreso = Math.round((llenos / (total + 1)) * 100);
  progressLabel.textContent = progreso + "%";

  let color = "bg-red-500";
  if (progreso >= 100) color = "bg-green-500";
  else if (progreso >= 50) color = "bg-amber-500";

  progressBar.style.width = progreso + "%";
  progressBar.className = `h-2 rounded-full transition-all ${color}`;
}
/* ---------------------------------------------------------------------------
   VALIDAR FORMATO DE ARCHIVO
--------------------------------------------------------------------------- */
function esFormatoPermitido(file) {
  const mime = file.type?.toLowerCase?.() || "";
  if (mime && VALID_ANEXO_FORMATS.includes(mime)) return true;

  const ext = file.name?.split(".").pop()?.toLowerCase();
  return ext ? VALID_ANEXO_EXTENSIONS.includes(ext) : false;
}

/* ---------------------------------------------------------------------------
   SINCRONIZAR input[type=file] con DataTransfer
--------------------------------------------------------------------------- */
function sincronizarInputAnexos() {
  if (!anexosInput || typeof DataTransfer === "undefined") return;

  const dt = new DataTransfer();
  anexosArchivos.forEach((item) => dt.items.add(item.file));
  anexosInput.files = dt.files;
}

/* ---------------------------------------------------------------------------
   RENDER PREVIEW ANEXOS
--------------------------------------------------------------------------- */
function renderizarAnexosPreview() {
  anexosPreview.innerHTML = "";

  if (!anexosArchivos.length) {
    const msg = document.createElement("p");
    msg.className = "text-xs text-white/60 col-span-full text-center";
    msg.textContent = "Aún no has cargado evidencias.";
    anexosPreview.appendChild(msg);
    return;
  }

  anexosArchivos.forEach((item) => {
    const isPdf = item.type === "application/pdf" || item.name.toLowerCase().endsWith(".pdf");

    const card = document.createElement("div");
    card.className = "anexo-card cursor-pointer group relative";
    card.tabIndex = 0;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "anexo-remove";
    removeBtn.textContent = "❌";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      eliminarAnexo(item.id);
    });
    card.appendChild(removeBtn);

    if (isPdf) {
      card.classList.add("anexo-card--pdf");

      const icon = document.createElement("div");
      icon.className = "anexo-pdf-icon";
      icon.innerHTML = "<i class='fas fa-file-pdf'></i>";

      const name = document.createElement("p");
      name.className = "anexo-file-name";
      name.textContent = item.name;

      card.appendChild(icon);
      card.appendChild(name);
    } else {
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = item.name;
      img.className = "rounded-lg shadow-md object-cover";
      card.appendChild(img);
    }

    card.addEventListener("click", () => {
      if (isPdf) window.open(item.url, "_blank");
      else abrirLightbox(item.url);
    });

    anexosPreview.appendChild(card);
  });
}

/* ---------------------------------------------------------------------------
   AGREGAR ANEXOS
--------------------------------------------------------------------------- */
function agregarAnexos(files) {
  if (!files?.length) return;

  const disponibles = MAX_ANEXOS - anexosArchivos.length;
  if (disponibles <= 0) {
    return alert(`Solo se permiten ${MAX_ANEXOS} evidencias por informe.`);
  }

  const permitidos = [];
  const rechazados = [];

  files.forEach((file) => {
    if (esFormatoPermitido(file)) permitidos.push(file);
    else rechazados.push(file.name);
  });

  if (rechazados.length) {
    alert(`Formato no permitido: ${rechazados.join(", ")}`);
  }

  const seleccion = permitidos.slice(0, disponibles);

  seleccion.forEach((file) => {
    const entry = {
      id: crypto.randomUUID?.() || "anexo-" + Date.now(),
      file,
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file),
    };
    anexosArchivos.push(entry);
  });

  sincronizarInputAnexos();
  renderizarAnexosPreview();
  recalcularProgreso();
}

/* ---------------------------------------------------------------------------
   ELIMINAR ANEXO
--------------------------------------------------------------------------- */
function eliminarAnexo(id) {
  const idx = anexosArchivos.findIndex((x) => x.id === id);
  if (idx === -1) return;

  const removed = anexosArchivos.splice(idx, 1)[0];
  if (removed.url) URL.revokeObjectURL(removed.url);

  sincronizarInputAnexos();
  renderizarAnexosPreview();
  recalcularProgreso();
}

/* ---------------------------------------------------------------------------
   CONFIGURAR DROPZONE + INPUT FILE
--------------------------------------------------------------------------- */
function setupAnexosSection() {
  if (!anexosInput) return;

  btnSubirAnexos?.addEventListener("click", () => anexosInput.click());

  anexosInput.addEventListener("change", (e) => {
    agregarAnexos(Array.from(e.target.files || []));
    anexosInput.value = "";
  });

  if (!dropZoneAnexos) return;

  const activate = (e) => {
    e.preventDefault();
    dropZoneAnexos.classList.add("drop-zone--active");
  };

  const deactivate = (e) => {
    e.preventDefault();
    dropZoneAnexos.classList.remove("drop-zone--active");
  };

  ["dragenter", "dragover"].forEach((evt) =>
    dropZoneAnexos.addEventListener(evt, activate)
  );

  ["dragleave", "drop"].forEach((evt) =>
    dropZoneAnexos.addEventListener(evt, deactivate)
  );

  dropZoneAnexos.addEventListener("drop", (e) => {
    e.preventDefault();
    agregarAnexos(Array.from(e.dataTransfer.files || []));
  });
}

/* ---------------------------------------------------------------------------
   LIGHTBOX – Ver imagen ampliada
--------------------------------------------------------------------------- */
function lockBodyScroll() {
  if (!document.body.dataset.prevOverflow) {
    document.body.dataset.prevOverflow = document.body.style.overflow || "";
  }
  document.body.style.overflow = "hidden";
}

function unlockBodyScroll() {
  document.body.style.overflow = document.body.dataset.prevOverflow || "";
  delete document.body.dataset.prevOverflow;
}

function abrirLightbox(url) {
  if (!url || !lightboxOverlay || !lightboxImage) return;

  lightboxImage.src = url;
  lightboxOverlay.classList.remove("hidden");

  requestAnimationFrame(() => {
    lightboxOverlay.classList.add("active");
  });

  lightboxOverlay.setAttribute("aria-hidden", "false");

  lockBodyScroll();
  document.addEventListener("keydown", handleLightboxEsc);
}

function cerrarLightbox() {
  if (!lightboxOverlay) return;

  const end = () => {
    lightboxOverlay.classList.add("hidden");
    lightboxOverlay.removeEventListener("transitionend", end);
  };

  lightboxOverlay.classList.remove("active");
  lightboxOverlay.setAttribute("aria-hidden", "true");
  lightboxOverlay.addEventListener("transitionend", end);

  unlockBodyScroll();
  document.removeEventListener("keydown", handleLightboxEsc);
}

function handleLightboxEsc(e) {
  if (e.key === "Escape") cerrarLightbox();
}

lightboxCloseBtn?.addEventListener("click", cerrarLightbox);
lightboxOverlay?.addEventListener("click", (e) => {
  if (e.target === lightboxOverlay || e.target.hasAttribute("data-lightbox-dismiss")) {
    cerrarLightbox();
  }
});

window.abrirLightbox = abrirLightbox;
/* ============================================================================
   VALIDACIONES — Campos extra según tipo
============================================================================ */
function validarCamposExtra() {
  const extra = obtenerValorExtra();

  if ((tipoSeleccionado === "CABLE" || tipoSeleccionado === "MERCADERIA") &&
      !extra.contenedor) {
    alert("Completa la serie del contenedor.");
    return false;
  }

  if (tipoSeleccionado === "CHOQUE" && !extra.placa) {
    alert("Completa la placa de la unidad.");
    return false;
  }

  if (tipoSeleccionado === "SINIESTRO" &&
      (!extra.contenedor || !extra.placa)) {
    alert("Completa contenedor y placa.");
    return false;
  }

  return true;
}

/* ============================================================================
   SUBIR ANEXOS A SUPABASE STORAGE
============================================================================ */
async function procesarAnexos(idRegistro) {
  if (!anexosArchivos.length) return [];

  const files = anexosArchivos.map((x) => x.file);

  try {
    const uploaded = await uploadFiles(idRegistro, files);

    return uploaded.map((file) => ({
      name: file.name,
      path: file.path,
      url: file.url,
    }));
  } catch (err) {
    console.error(err);
    alert("Error al subir anexos.");
    return [];
  }
}

/* ============================================================================
   GUARDAR INCIDENCIA (BORRADOR O COMPLETO)
============================================================================ */
async function guardarIncidencia(estado = "BORRADOR") {
  if (!tipoSeleccionado) {
    alert("No se detectó el tipo de incidencia.");
    return;
  }

  if (!validarCamposExtra()) return;

  const valorExtra = obtenerValorExtra();

  const payload = {
    tipo_incidencia: tipoSeleccionado,
    asunto: asuntoInput.value,
    dirigido_a: dirigidoAInput.value,
    remitente: remitenteInput.value,
    fecha_informe: fechaInformeInput.value,
    analisis: analisisInput.value,
    conclusiones: conclusionesInput.value,
    recomendaciones: recomendacionesInput.value,
    campos: {
      valorExtra,
      hechos: hechosInput.value || "",
    },
    progreso: parseInt(progressLabel.textContent),
    estado,
  };

  console.log("Supabase payload:", payload);

  const { data, error } = await supabase
    .from("incidencias")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error(error);
    alert("Error guardando incidencia.");
    return;
  }

  // Subir anexos a Storage
  const anexos = await procesarAnexos(data.id);

  if (anexos.length > 0) {
    await supabase
      .from("incidencias")
      .update({ anexos })
      .eq("id", data.id);
  }

  alert("Informe guardado correctamente.");
}

/* ============================================================================
   EVENTOS — BOTONES PRINCIPALES
============================================================================ */
document.getElementById("btnGuardarBorrador")
  ?.addEventListener("click", (e) => {
    e.preventDefault();
    guardarIncidencia("BORRADOR");
  });

document.getElementById("btnGuardarCompleto")
  ?.addEventListener("click", (e) => {
    e.preventDefault();
    guardarIncidencia("COMPLETO");
  });

document.getElementById("btnVolverDashboard")
  ?.addEventListener("click", () => {
    window.dispatchEvent(
      new CustomEvent("sidebar:navigate", { detail: withBase("/index.html") })
    );
  });

/* ============================================================================
   NUMERACIÓN AUTOMÁTICA EN TEXTAREAS
============================================================================ */
function setupNumberedTextarea(el) {
  if (!el) return;

  // Inicializar si está vacío
  if (!el.value.trim()) {
    el.value = "1. ";
    el.setSelectionRange(el.value.length, el.value.length);
  }

  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const before = el.value.slice(0, el.selectionStart);
      const after = el.value.slice(el.selectionEnd);

      const nextLine = before.split("\n").length + 1;
      const insert = `\n${nextLine}. `;

      el.value = before + insert + after;

      const cursor = before.length + insert.length;
      el.setSelectionRange(cursor, cursor);

      recalcularProgreso();
    }
  });

  el.addEventListener("blur", () => {
    if (!el.value.trim()) {
      el.value = "1. ";
      recalcularProgreso();
    }
  });
}

/* ============================================================================
   INICIALIZAR FORMULARIO
============================================================================ */
const tipoDetectado = detectarTipoDesdeURL();

if (tipoDetectado) {
  configurarTipo(tipoDetectado);
} else {
  tipoDescripcion.textContent = "Seleccione el tipo en dashboard o sidebar.";
}

// Inicializar textareas numeradas
[hechosInput, analisisInput, conclusionesInput, recomendacionesInput]
  .forEach(setupNumberedTextarea);

// Inicializar anexos
setupAnexosSection();
renderizarAnexosPreview();

/* ============================================================================
   HELPERS INTERNOS — Normalización y limpieza
============================================================================ */

/**
 * Limpia texto para mejor compatibilidad con DOCX
 */
function limpiarTextoParaWord(texto = "") {
  if (!texto) return "";

  return texto
    .replace(/\s+$/g, "")        // quitar espacios al final
    .replace(/\n{3,}/g, "\n\n")  // evitar demasiados saltos
    .replace(/[^\S\r\n]+/g, " ") // normalizar espacios
    .trim();
}

/**
 * Convierte texto multilinea en array numerado (para Word)
 */
function procesarTextoNumerado(raw) {
  if (!raw) return [];

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Arma un objeto final ordenado para exportar a Word o guardar
 */
function armarPayloadFinal() {
  const valorExtra = obtenerValorExtra();

  return {
    tipo: tipoSeleccionado,
    asunto: limpiarTextoParaWord(asuntoInput.value),
    dirigido_a: limpiarTextoParaWord(dirigidoAInput.value),
    remitente: limpiarTextoParaWord(remitenteInput.value),
    fecha_informe: fechaInformeInput.value,
    analisis: procesarTextoNumerado(analisisInput.value),
    conclusiones: procesarTextoNumerado(conclusionesInput.value),
    recomendaciones: procesarTextoNumerado(recomendacionesInput.value),
    hechos: procesarTextoNumerado(hechosInput.value),
    extras: valorExtra,
    anexos: anexosArchivos.map((a) => ({
      name: a.name,
      type: a.type,
      localURL: a.url,
    })),
  };
}

/* ============================================================================
   🔗 EXPORTAR WORD — Integración oficial con generador-docx.js
============================================================================ */

/**
 * Construye el payload EXACTO requerido por generateWordFinal().
 * Incluye:
 *  - Campos visibles del formulario
 *  - Valores extra (según tipo)
 *  - Evidencias locales (sin guardar)
 *  - Evidencias ya guardadas en Supabase (si existe id)
 */
async function armarPayloadWord() {
  const valorExtra = obtenerValorExtra();

  const payload = {
    asunto: asuntoInput.value || "",
    valorExtra,
    dirigido_a: dirigidoAInput.value || "",
    remitente: remitenteInput.value || "",
    fecha_informe: fechaInformeInput.value || "",
    hechos: hechosInput.value || "",
    analisis: analisisInput.value || "",
    conclusiones: conclusionesInput.value || "",
    recomendaciones: recomendacionesInput.value || "",
    anexos: [],
  };

  // 1️⃣ anexos locales (no subidos aún)
  if (anexosArchivos?.length) {
    payload.anexos = anexosArchivos.map((a) => ({
      name: a.name,
      url: a.url,
      type: a.type,
    }));
  }

  // 2️⃣ anexos guardados en BD (si edición)
  const url = new URL(window.location.href);
  const id = url.searchParams.get("id");

  if (id) {
    const { data } = await supabase
      .from("incidencias")
      .select("anexos")
      .eq("id", id)
      .single();

    if (data?.anexos?.length) {
      payload.anexos.push(...data.anexos);
    }
  }

  return payload;
}

/* ============================================================================
   BOTÓN EXPORTAR → GENERAR WORD REAL
============================================================================ */

document.getElementById("btnExportarWord")
  .addEventListener("click", async () => {
    try {
      const payload = await armarPayloadWord();
      await generateWordFinal(payload);
    } catch (err) {
      console.error("❌ Error exportando Word:", err);
      alert("No se pudo generar el documento Word.");
    }
  });

/* ============================================================================
   BOTÓN EXPORTAR DESHABILITADO SEGÚN PROGRESO
============================================================================ */

function actualizarEstadoBotonWord() {
  const progreso = parseInt(progressLabel.textContent);
  const btn = document.getElementById("btnExportarWord");
  if (!btn) return;

  if (progreso < 40) {
    btn.disabled = true;
    btn.classList.add("opacity-40", "cursor-not-allowed");
  } else {
    btn.disabled = false;
    btn.classList.remove("opacity-40", "cursor-not-allowed");
  }
}

setInterval(actualizarEstadoBotonWord, 500);

/* ============================================================================
   AUTOSAVE (Modo pasivo, no interfiere)
============================================================================ */

let autosaveTimer = null;

function iniciarAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer);

  autosaveTimer = setTimeout(() => {
    console.log("🟡 AUTOSAVE READY (desactivado por ahora)");
  }, 2000);
}

[
  asuntoInput,
  dirigidoAInput,
  remitenteInput,
  fechaInformeInput,
  hechosInput,
  analisisInput,
  conclusionesInput,
  recomendacionesInput,
].forEach((el) => el?.addEventListener("input", iniciarAutosave));

/* ============================================================================
   RESET SUAVE
============================================================================ */

function resetFormularioParcial() {
  hechosInput.value = "1. ";
  analisisInput.value = "1. ";
  conclusionesInput.value = "1. ";
  recomendacionesInput.value = "1. ";

  anexosArchivos = [];
  renderizarAnexosPreview();
  recalcularProgreso();

  console.log("🔄 Formulario parcialmente restablecido.");
}

window.resetFormularioParcial = resetFormularioParcial;

/* ============================================================================
   🎉 FIN DEL ARCHIVO — FORMULARIO COMPLETO, LIMPIO Y FUNCIONAL
============================================================================ */
