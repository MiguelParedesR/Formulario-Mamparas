/* ============================================================================
   FORMULARIO MODULAR PARA INCIDENCIAS TPP
   - Tipo recibido desde dashboard / sidebar (URL ?tipo=)
   - Asunto autogenerado + campo extra junto al asunto
   - Seccion de hechos con numerado automatico
   - Barra de progreso
   - Anexos (Storage) + registro JSON
   - Guardado en Supabase con trazas de payload/response
   ============================================================================ */

import { supabase } from "../utils/supabase.js";
import { uploadFiles } from "../utils/storage.js";

const ASUNTOS = {
  CABLE: "SUSTRACCION DE CABLE RH",
  MERCADERIA: "SUSTRACCION DE MERCADERIA",
  CHOQUE: "CHOQUE DE UNIDAD",
  SINIESTRO: "SINIESTRO",
};

// Elementos base
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

const progressBar = document.getElementById("progressBar");
const progressLabel = document.getElementById("progressLabel");

let tipoSeleccionado = null;
const extraRefs = { contenedor: null, placa: null };

function detectarTipoDesdeURL() {
  const url = new URL(window.location.href);
  const tipoParam = url.searchParams.get("tipo")?.toUpperCase();
  if (!tipoParam || !ASUNTOS[tipoParam]) return null;
  return tipoParam;
}

function configurarTipo(tipo) {
  tipoSeleccionado = tipo;
  asuntoInput.value = ASUNTOS[tipoSeleccionado];
  tipoDescripcion.textContent = `Plantilla cargada: ${ASUNTOS[tipoSeleccionado]}`;
  renderCamposExtra(tipoSeleccionado);
  recalcularProgreso();
}

function renderCamposExtra(tipo) {
  if (!campoExtraContainer) return;

  campoExtraContainer.innerHTML = "";
  extraRefs.contenedor = null;
  extraRefs.placa = null;

  const baseClasses =
    "w-full rounded-xl border-gray-300 shadow-sm text-sm px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 transition";

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

    const wrapper = document.createElement("div");
    wrapper.className = "space-y-2";
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    campoExtraContainer.appendChild(wrapper);
  } else if (tipo === "CHOQUE") {
    const label = document.createElement("label");
    label.className = "text-sm font-semibold text-gray-700";
    label.textContent = "Placa de unidad";

    const input = document.createElement("input");
    input.id = "placaUnidad";
    input.placeholder = "PLACA DE UNIDAD";
    input.className = baseClasses;
    extraRefs.placa = input;
    input.addEventListener("input", recalcularProgreso);

    const wrapper = document.createElement("div");
    wrapper.className = "space-y-2";
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    campoExtraContainer.appendChild(wrapper);
  } else if (tipo === "SINIESTRO") {
    const contLabel = document.createElement("label");
    contLabel.className = "text-sm font-semibold text-gray-700";
    contLabel.textContent = "Contenedor";

    const contInput = document.createElement("input");
    contInput.id = "contenedorSiniestro";
    contInput.placeholder = "CONTENEDOR";
    contInput.className = baseClasses;
    extraRefs.contenedor = contInput;

    const placaLabel = document.createElement("label");
    placaLabel.className = "text-sm font-semibold text-gray-700";
    placaLabel.textContent = "Placa de unidad";

    const placaInput = document.createElement("input");
    placaInput.id = "placaSiniestro";
    placaInput.placeholder = "PLACA DE UNIDAD";
    placaInput.className = baseClasses;
    extraRefs.placa = placaInput;

    contInput.addEventListener("input", recalcularProgreso);
    placaInput.addEventListener("input", recalcularProgreso);

    const grid = document.createElement("div");
    grid.className = "grid grid-cols-1 md:grid-cols-2 gap-4";

    const contWrap = document.createElement("div");
    contWrap.className = "space-y-2";
    contWrap.appendChild(contLabel);
    contWrap.appendChild(contInput);

    const placaWrap = document.createElement("div");
    placaWrap.className = "space-y-2";
    placaWrap.appendChild(placaLabel);
    placaWrap.appendChild(placaInput);

    grid.appendChild(contWrap);
    grid.appendChild(placaWrap);
    campoExtraContainer.appendChild(grid);
  }
}

function obtenerValorExtra() {
  const valorExtra = { contenedor: null, placa: null };

  if (tipoSeleccionado === "CABLE" || tipoSeleccionado === "MERCADERIA") {
    valorExtra.contenedor = extraRefs.contenedor?.value?.trim() || null;
  } else if (tipoSeleccionado === "CHOQUE") {
    valorExtra.placa = extraRefs.placa?.value?.trim() || null;
  } else if (tipoSeleccionado === "SINIESTRO") {
    valorExtra.contenedor = extraRefs.contenedor?.value?.trim() || null;
    valorExtra.placa = extraRefs.placa?.value?.trim() || null;
  }

  return valorExtra;
}

function recalcularProgreso() {
  const camposBase = [
    asuntoInput,
    dirigidoAInput,
    remitenteInput,
    fechaInformeInput,
    hechosInput,
    analisisInput,
    conclusionesInput,
    recomendacionesInput,
  ].filter(Boolean);

  if (tipoSeleccionado === "CABLE" || tipoSeleccionado === "MERCADERIA") {
    if (extraRefs.contenedor) camposBase.push(extraRefs.contenedor);
  } else if (tipoSeleccionado === "CHOQUE") {
    if (extraRefs.placa) camposBase.push(extraRefs.placa);
  } else if (tipoSeleccionado === "SINIESTRO") {
    if (extraRefs.contenedor) camposBase.push(extraRefs.contenedor);
    if (extraRefs.placa) camposBase.push(extraRefs.placa);
  }

  let llenos = 0;
  camposBase.forEach((el) => {
    if (el.value && el.value.trim() !== "") llenos++;
  });

  let total = camposBase.length;

  const anexosSeleccionados = anexosInput?.files?.length || 0;
  if (anexosSeleccionados > 0) {
    llenos += 1;
    total += 1;
  }

  const progreso = total === 0 ? 0 : Math.round((llenos / total) * 100);

  progressLabel.textContent = progreso + "%";

  let color = "bg-red-500";
  if (progreso >= 100) color = "bg-green-500";
  else if (progreso >= 50) color = "bg-amber-500";

  progressBar.style.width = progreso + "%";
  progressBar.className = `h-2 rounded-full transition-all duration-300 ${color}`;
}

async function procesarAnexos(id) {
  const files = Array.from(anexosInput.files);
  if (!files.length) return [];

  try {
    const uploaded = await uploadFiles(id, files);

    return uploaded.map((file) => ({
      name: file.name || "anexo",
      path: file.path,
      url: file.url,
    }));
  } catch (err) {
    console.error("Error subiendo anexos:", err);
    alert(
      err?.message ||
        "No se pudieron subir los anexos. Verifica el bucket de Storage en Supabase."
    );
    return [];
  }
}

function validarCamposExtra() {
  const valorExtra = obtenerValorExtra();

  if (
    (tipoSeleccionado === "CABLE" || tipoSeleccionado === "MERCADERIA") &&
    !valorExtra.contenedor
  ) {
    alert("Completa la serie del contenedor.");
    return false;
  }

  if (tipoSeleccionado === "CHOQUE" && !valorExtra.placa) {
    alert("Completa la placa de la unidad.");
    return false;
  }

  if (
    tipoSeleccionado === "SINIESTRO" &&
    (!valorExtra.contenedor || !valorExtra.placa)
  ) {
    alert("Completa contenedor y placa de la unidad.");
    return false;
  }

  return true;
}

async function guardarIncidencia(estado = "BORRADOR") {
  if (!tipoSeleccionado) {
    alert("No se pudo detectar el tipo de incidencia desde la navegacion.");
    return;
  }

  if (!validarCamposExtra()) return;

  const valorExtra = obtenerValorExtra();

  const dirigido_a = dirigidoAInput.value;
  const remitente = remitenteInput.value;
  const fecha_informe = fechaInformeInput.value;

  const analisis = analisisInput.value;
  const conclusiones = conclusionesInput.value;
  const recomendaciones = recomendacionesInput.value;
  const hechos = hechosInput?.value || "";

  const progreso = parseInt(progressLabel.textContent);

  const payload = {
    tipo_incidencia: tipoSeleccionado,
    asunto: asuntoInput.value,
    dirigido_a,
    remitente,
    fecha_informe,
    analisis,
    conclusiones,
    recomendaciones,
    campos: {
      valorExtra,
      hechos,
    },
    progreso,
    estado,
  };

  console.log("Supabase insert payload:", payload);

  const { data, error } = await supabase
    .from("incidencias")
    .insert([payload])
    .select()
    .single();

  console.log("Supabase insert response:", { data, error });

  if (error) {
    console.error(error);
    alert("Error guardando incidencia");
    return;
  }

  const anexosProcesados = await procesarAnexos(data.id);

  if (anexosProcesados.length > 0) {
    const anexosPayload = { anexos: anexosProcesados };
    console.log("Supabase anexos update payload:", anexosPayload);

    const { data: updateData, error: updateError } = await supabase
      .from("incidencias")
      .update(anexosPayload)
      .eq("id", data.id)
      .select()
      .single();

    console.log("Supabase anexos update response:", {
      data: updateData,
      error: updateError,
    });
  }

  alert("Informe guardado correctamente");
}

[
  dirigidoAInput,
  remitenteInput,
  fechaInformeInput,
  hechosInput,
  analisisInput,
  conclusionesInput,
  recomendacionesInput,
].forEach((el) => el?.addEventListener("input", recalcularProgreso));

anexosInput?.addEventListener("change", recalcularProgreso);

document
  .getElementById("btnGuardarBorrador")
  .addEventListener("click", (e) => {
    e.preventDefault();
    guardarIncidencia("BORRADOR");
  });

document
  .getElementById("btnGuardarCompleto")
  .addEventListener("click", (e) => {
    e.preventDefault();
    guardarIncidencia("COMPLETO");
  });

document.getElementById("btnVolverDashboard").addEventListener("click", () => {
  window.dispatchEvent(
    new CustomEvent("sidebar:navigate", {
      detail: "./index.html",
    })
  );
});

document.getElementById("btnExportarWord").addEventListener("click", () => {
  alert("Exportacion Word lista en Fase 2");
});

function setupNumberedTextarea(el) {
  if (!el) return;
  if (!el.value.trim()) {
    el.value = "1. ";
    el.setSelectionRange(el.value.length, el.value.length);
  }

  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const before = el.value.slice(0, start);
      const lineNumber = before.split(/\n/).length + 1;
      const insert = `\n${lineNumber}. `;
      const after = el.value.slice(end);
      const newValue = before + insert + after;
      el.value = newValue;
      const pos = before.length + insert.length;
      el.setSelectionRange(pos, pos);
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

const tipoDetectado = detectarTipoDesdeURL();
if (tipoDetectado) {
  configurarTipo(tipoDetectado);
} else {
  tipoDescripcion.textContent =
    "Selecciona el tipo desde el dashboard o la barra lateral.";
}

setupNumberedTextarea(hechosInput);
setupNumberedTextarea(analisisInput);
setupNumberedTextarea(conclusionesInput);
setupNumberedTextarea(recomendacionesInput);
