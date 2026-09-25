/* ============================================================================
   REGISTROS.JS - Tabla Global + Modal Ver/Editar
   - Lista incidencias (filtradas por tipo desde la URL)
   - Modal Tailwind con fade + scale + blur
   - Edicion completa + anexos + exportacion Word
   - Supabase con trazas de payload/response
   ============================================================================ */

import { supabase } from "../utils/supabase.js";
import {
  calcularProgresoInforme,
  obtenerEstadoListado,
} from "../dashboard/progreso.js";
import "../mamparas/detalle-modal.js";
import { uploadFiles } from "../utils/storage.js";
import { generarDocxIncidencia } from "../formularios/generador-docx.js";
import { getSidebarOffset, positionModal, watchModalPosition } from "../utils/helpers.js";

let incidencias = [];
let incidenciaActual = null;
let busquedaActual = "";

const tablaBody = document.querySelector("#tabla-registros tbody");
const inputBuscar = document.getElementById("buscarPlaca");
const tipoFiltro =
  new URL(window.location.href).searchParams.get("tipo")?.toUpperCase() ||
  null;

// Modal
const modalOverlay = document.getElementById("verEditarModal");
const modalPanel = document.getElementById("verEditarPanel");
const modalForm = document.getElementById("formModalIncidencia");
const modalClose = document.getElementById("modalClose");
const modalGuardar = document.getElementById("modalGuardarCambios");
const modalExportar = document.getElementById("modalExportarWord");
const modalExtraContainer = document.getElementById("modalCampoExtra");
const modalProgressBar = document.getElementById("modalProgressBar");
const modalProgressLabel = document.getElementById("modalProgressLabel");
const modalAnexosLista = document.getElementById("modalListaAnexos");
const modalAnexosInput = document.getElementById("modalAnexos");
const modalFeedback = document.getElementById("modalFeedback");
const modalFeedbackText = document.getElementById("modalFeedbackText");

const modalInputs = {
  tipo: document.getElementById("modalTipo"),
  asunto: document.getElementById("modalAsunto"),
  dirigidoA: document.getElementById("modalDirigidoA"),
  remitente: document.getElementById("modalRemitente"),
  fecha: document.getElementById("modalFecha"),
  introduccion: document.getElementById("modalIntroduccion"),
  hechos: document.getElementById("modalHechos"),
  analisis: document.getElementById("modalAnalisis"),
  conclusiones: document.getElementById("modalConclusiones"),
  recomendaciones: document.getElementById("modalRecomendaciones"),
};

const modalExtraRefs = { contenedor: null, placa: null };

function obtenerValorExtra(inc) {
  const campos = inc?.campos || {};
  if (campos.valorExtra) return campos.valorExtra;
  return {
    contenedor: campos.contenedor || null,
    placa: campos.placa || null,
  };
}

async function cargarIncidencias() {
  let query = supabase
    .from("incidencias")
    .select("*")
    .order("fecha_informe", { ascending: false });

  if (tipoFiltro) {
    query = query.eq("tipo_incidencia", tipoFiltro);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error cargando incidencias:", error);
    incidencias = [];
    return;
  }

  incidencias = data || [];
}

function filtrarPorBusqueda(lista, texto) {
  const filtro = String(texto || "").trim().toLowerCase();
  if (!filtro) return [...lista];

  return lista.filter((inc) => {
    const extra = obtenerValorExtra(inc);
    const valores = [
      extra.placa,
      extra.contenedor,
      inc.tipo_incidencia,
      inc.asunto,
      inc.remitente,
      inc.dirigido_a,
      inc.fecha_informe,
    ];
    return valores.some((valor) => String(valor || "").toLowerCase().includes(filtro));
  });
}

function renderTabla(lista) {
  if (!tablaBody) return;

  tablaBody.innerHTML = "";

  if (!lista.length) {
    renderEmptyTableMessage(tablaBody);
    return;
  }

  lista.forEach((inc) => {
    const estado = obtenerEstadoListado(inc);
    const extra = obtenerValorExtra(inc);

    const tr = createIncidentRow(inc, estado, extra);

    tablaBody.appendChild(tr);
  });

  activarBotones();
}

/**
 * Centralized function to render empty table message
 * @param {HTMLElement} tableBody - The table body element
 */
function renderEmptyTableMessage(tableBody) {
  tableBody.innerHTML = `
    <tr>
      <td colspan="8" class="text-center py-4 text-gray-500">
        No hay registros para mostrar
      </td>
    </tr>`;
}

/**
 * Centralized function to create table row for an incident
 * @param {Object} incident - The incident data
 * @param {Object} state - The state of the incident
 * @param {Object} extra - Extra data for the incident
 * @returns {HTMLTableRowElement} The table row element
 */
function createIncidentRow(incident, state, extra) {
  const tr = document.createElement("tr");

  const tone =
    state.estado === "COMPLETO"
      ? { label: "Completo", fg: "#067647", bg: "#ecfdf3" }
      : { label: "Borrador", fg: "#9a6700", bg: "#fffaeb" };

  tr.innerHTML = `
    <td>${incident.fecha_informe || "-"}</td>
    <td><strong>${incident.tipo_incidencia || "-"}</strong></td>
    <td>${extra.placa || "-"}</td>
    <td>${extra.contenedor || "-"}</td>
    <td>
      <div style="min-width:120px">
        <div class="report-progress__track">
          <div style="height:100%;width:${state.porcentaje}%;border-radius:999px;background:#0a66c2"></div>
        </div>
        <span class="tpp-help">${state.porcentaje}%</span>
      </div>
    </td>
    <td>
      <span style="display:inline-flex;padding:5px 8px;border-radius:999px;background:${tone.bg};color:${tone.fg};font-size:11px;font-weight:700">
        ${tone.label}
      </span>
    </td>
    <td>
      <button class="ver-btn tpp-btn" data-id="${incident.id}" type="button">
        Ver / Editar
      </button>
    </td>
  `;

  return tr;
}

function activarBotones() {
  document.querySelectorAll(".ver-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (id) abrirModalIncidencia(id);
    });
  });
}

async function abrirModalIncidencia(id) {
  incidenciaActual =
    incidencias.find((i) => String(i.id) === String(id)) || (await fetchIncidencia(id));

  if (!incidenciaActual) {
    mostrarFeedback("No se encontro la incidencia solicitada.", "error");
    return;
  }

  const extraCompat = obtenerValorExtra(incidenciaActual);
  incidenciaActual.campos = incidenciaActual.campos || {};
  incidenciaActual.campos.valorExtra = {
    contenedor: extraCompat.contenedor || null,
    placa: extraCompat.placa || null,
  };
  incidenciaActual.anexos = incidenciaActual.anexos || [];

  ensureModalPositioning();
  pintarModal();
  toggleModal(true);
}

async function fetchIncidencia(id) {
  const { data, error } = await supabase
    .from("incidencias")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error cargando incidencia:", error);
    return null;
  }
  return data;
}

function pintarModal() {
  modalInputs.tipo.value = incidenciaActual.tipo_incidencia || "";
  modalInputs.asunto.value = incidenciaActual.asunto || "";
  modalInputs.dirigidoA.value = incidenciaActual.dirigido_a || "";
  modalInputs.remitente.value = incidenciaActual.remitente || "";
  modalInputs.fecha.value = incidenciaActual.fecha_informe || "";
  if (modalInputs.introduccion) {
    modalInputs.introduccion.value = incidenciaActual.campos.introduccion || "";
  }
  modalInputs.hechos.value = incidenciaActual.campos.hechos || "";
  modalInputs.analisis.value = incidenciaActual.analisis || "";
  modalInputs.conclusiones.value = incidenciaActual.conclusiones || "";
  modalInputs.recomendaciones.value = incidenciaActual.recomendaciones || "";

  renderCamposExtraModal(
    incidenciaActual.tipo_incidencia,
    incidenciaActual.campos.valorExtra
  );
  renderAnexosModal();
  actualizarBarraModal();
  setupNumberedTextarea(modalInputs.introduccion);
  setupNumberedTextarea(modalInputs.hechos);
  setupNumberedTextarea(modalInputs.analisis);
  setupNumberedTextarea(modalInputs.conclusiones);
  setupNumberedTextarea(modalInputs.recomendaciones);
}

function renderCamposExtraModal(tipo, valorExtra = {}) {
  if (!modalExtraContainer) return;

  modalExtraContainer.innerHTML = "";
  modalExtraRefs.contenedor = null;
  modalExtraRefs.placa = null;

  const baseClasses = "tpp-control uppercase";

  if (tipo === "CABLE" || tipo === "MERCADERIA") {
    modalExtraContainer.innerHTML = `
      <div class="space-y-2">
        <label class="text-sm font-semibold text-gray-700">Serie del contenedor</label>
        <input id="modalSerieContenedor" class="${baseClasses}" placeholder="SERIE DEL CONTENEDOR" value="${valorExtra.contenedor || ""
      }"/>
      </div>
    `;
    modalExtraRefs.contenedor = document.getElementById("modalSerieContenedor");
  } else if (tipo === "CHOQUE") {
    modalExtraContainer.innerHTML = `
      <div class="space-y-2">
        <label class="text-sm font-semibold text-gray-700">Placa de unidad</label>
        <input id="modalPlacaUnidad" class="${baseClasses}" placeholder="PLACA DE UNIDAD" value="${valorExtra.placa || ""
      }"/>
      </div>
    `;
    modalExtraRefs.placa = document.getElementById("modalPlacaUnidad");
  } else if (tipo === "SINIESTRO") {
    modalExtraContainer.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-sm font-semibold text-gray-700">Contenedor</label>
          <input id="modalContenedorSiniestro" class="${baseClasses}" placeholder="CONTENEDOR" value="${valorExtra.contenedor || ""
      }"/>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-semibold text-gray-700">Placa de unidad</label>
          <input id="modalPlacaSiniestro" class="${baseClasses}" placeholder="PLACA DE UNIDAD" value="${valorExtra.placa || ""
      }"/>
        </div>
      </div>
    `;
    modalExtraRefs.contenedor = document.getElementById("modalContenedorSiniestro");
    modalExtraRefs.placa = document.getElementById("modalPlacaSiniestro");
  }

  [modalExtraRefs.contenedor, modalExtraRefs.placa]
    .filter(Boolean)
    .forEach((el) => el.addEventListener("input", actualizarBarraModal));
}

function renderAnexosModal() {
  if (!modalAnexosLista) return;
  modalAnexosLista.innerHTML = "";

  const anexos = Array.isArray(incidenciaActual?.anexos) ? incidenciaActual.anexos : [];
  if (!anexos.length) {
    modalAnexosLista.innerHTML =
      '<div class="form-status form-status--info">No hay anexos cargados.</div>';
    return;
  }

  anexos.forEach((anexo, index) => {
    const nombre = anexo?.name || `Anexo ${index + 1}`;
    const url = anexo?.url || "";
    const isImage = /\.(png|jpe?g|webp)(\?|$)/i.test(url) || /\.(png|jpe?g|webp)$/i.test(nombre);
    const isPdf = /\.pdf(\?|$)/i.test(url) || /\.pdf$/i.test(nombre);

    const item = document.createElement("a");
    item.href = url || "#";
    item.target = "_blank";
    item.rel = "noopener noreferrer";
    item.className = "evidence-card";
    item.style.textDecoration = "none";
    item.title = nombre;

    if (isImage && url) {
      item.innerHTML = `
        <img src="${url}" alt="${nombre}" loading="lazy" />
        <span class="evidence-card__footer"><span class="evidence-card__name">${nombre}</span></span>
      `;
    } else {
      item.innerHTML = `
        <span style="height:110px;display:grid;place-items:center;background:#f5f5f7;color:${isPdf ? "#b42318" : "#55565a"};font-size:26px">
          <i class="fa-regular ${isPdf ? "fa-file-pdf" : "fa-file"}"></i>
        </span>
        <span class="evidence-card__footer"><span class="evidence-card__name">${nombre}</span></span>
      `;
    }

    if (!url) {
      item.removeAttribute("href");
      item.removeAttribute("target");
    }

    modalAnexosLista.appendChild(item);
  });
}

function toggleModal(show) {
  if (!modalOverlay || !modalPanel) return;
  if (show) {
    modalOverlay.classList.remove("hidden", "opacity-0");
    modalOverlay.classList.add("flex");
    modalPanel.classList.remove("scale-95", "opacity-0");
    modalPanel.classList.add("scale-100", "opacity-100");
    document.body.style.overflow = "hidden";
  } else {
    modalOverlay.classList.add("hidden");
    modalOverlay.classList.remove("flex");
    modalOverlay.classList.add("opacity-0");
    modalPanel.classList.add("scale-95", "opacity-0");
    modalPanel.classList.remove("scale-100", "opacity-100");
    document.body.style.overflow = "";
    if (modalAnexosInput) modalAnexosInput.value = "";
    if (modalFeedback) modalFeedback.className = "hidden";
  }
}

// Ensure modal is positioned to avoid overlapping the sidebar (attach once)
let modalPositioningAttached = false;
function ensureModalPositioning() {
  if (!modalOverlay) return;
  if (modalPositioningAttached) return;
  try {
    positionModal(modalOverlay);
    watchModalPosition(modalOverlay);
    modalPositioningAttached = true;
  } catch (err) {
    console.warn("No se pudo aplicar posicionamiento del modal:", err);
  }
}

function sincronizarIncidenciaDesdeModal() {
  incidenciaActual.campos = incidenciaActual.campos || {};

  incidenciaActual.asunto = modalInputs.asunto.value;
  incidenciaActual.dirigido_a = modalInputs.dirigidoA.value;
  incidenciaActual.remitente = modalInputs.remitente.value;
  incidenciaActual.fecha_informe = modalInputs.fecha.value;
  incidenciaActual.campos.introduccion = modalInputs.introduccion?.value || "";
  incidenciaActual.campos.hechos = modalInputs.hechos.value;
  incidenciaActual.analisis = modalInputs.analisis.value;
  incidenciaActual.conclusiones = modalInputs.conclusiones.value;
  incidenciaActual.recomendaciones = modalInputs.recomendaciones.value;

  incidenciaActual.campos.valorExtra = {
    contenedor: modalExtraRefs.contenedor?.value?.trim() || null,
    placa: modalExtraRefs.placa?.value?.trim() || null,
  };
}

function actualizarBarraModal() {
  if (!incidenciaActual) return { porcentaje: 0, estado: "BORRADOR" };
  sincronizarIncidenciaDesdeModal();

  const progreso = calcularProgresoInforme(incidenciaActual);

  if (modalProgressBar) {
    modalProgressBar.style.width = `${progreso.porcentaje}%`;
    modalProgressBar.style.background =
      progreso.porcentaje === 100 ? "#067647" : progreso.porcentaje >= 50 ? "#d89a00" : "#b42318";
  }
  if (modalProgressLabel) modalProgressLabel.textContent = `${progreso.porcentaje}%`;

  return progreso;
}

function actualizarIncidenciaLocal(actualizada) {
  const idx = incidencias.findIndex((i) => i.id === actualizada.id);
  if (idx !== -1) {
    incidencias[idx] = actualizada;
  }
}

async function guardarCambiosModal() {
  if (!incidenciaActual) return;

  const progreso = actualizarBarraModal();
  const estado = progreso.porcentaje >= 100 ? "COMPLETO" : "BORRADOR";

  const payload = {
    tipo_incidencia: incidenciaActual.tipo_incidencia,
    asunto: incidenciaActual.asunto,
    dirigido_a: incidenciaActual.dirigido_a,
    remitente: incidenciaActual.remitente,
    fecha_informe: incidenciaActual.fecha_informe,
    analisis: incidenciaActual.analisis,
    conclusiones: incidenciaActual.conclusiones,
    recomendaciones: incidenciaActual.recomendaciones,
    campos: incidenciaActual.campos,
    anexos: incidenciaActual.anexos,
    progreso: progreso.porcentaje,
    estado,
  };

  console.log("Supabase update payload:", payload);

  const { data, error } = await supabase
    .from("incidencias")
    .update(payload)
    .eq("id", incidenciaActual.id)
    .select()
    .single();

  console.log("Supabase update response:", { data, error });

  if (error) {
    console.error(error);
    mostrarFeedback("Error guardando los cambios.", "error");
    return;
  }

  incidenciaActual = data;
  actualizarIncidenciaLocal(data);
  renderTabla(filtrarPorBusqueda(incidencias, busquedaActual));
  mostrarFeedback("Cambios guardados correctamente.", "success");
  toggleModal(false);
}

async function manejarAnexosModal(e) {
  if (!incidenciaActual) return;
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  let uploaded = [];
  try {
    uploaded = await uploadFiles(incidenciaActual.id, files);
  } catch (err) {
    console.error("Error subiendo anexos:", err);
    mostrarFeedback(
      err?.message ||
      "No se pudieron subir los anexos. Revisa el bucket de Storage en Supabase.",
      "error"
    );
    modalAnexosInput.value = "";
    return;
  }

  if (!uploaded.length) {
    mostrarFeedback("No se subieron archivos (respuesta vacia).", "error");
    modalAnexosInput.value = "";
    return;
  }

  uploaded.forEach((file) => {
    incidenciaActual.anexos.push({
      name: file.name || "anexo",
      url: file.url,
      path: file.path,
    });
  });

  const anexosPayload = { anexos: incidenciaActual.anexos };
  console.log("Supabase update anexos payload:", anexosPayload);

  const { data, error } = await supabase
    .from("incidencias")
    .update(anexosPayload)
    .eq("id", incidenciaActual.id)
    .select()
    .single();

  console.log("Supabase update anexos response:", { data, error });

  if (error) {
    console.error(error);
    mostrarFeedback("Error subiendo anexos.", "error");
    return;
  }

  incidenciaActual = { ...incidenciaActual, ...data };
  actualizarIncidenciaLocal(incidenciaActual);
  renderAnexosModal();
  actualizarBarraModal();
  renderTabla(filtrarPorBusqueda(incidencias, busquedaActual));
}

function mostrarFeedback(texto, tipo = "info") {
  if (!modalFeedback || !modalFeedbackText) return;
  modalFeedbackText.textContent = texto;
  modalFeedback.className =
    tipo === "success"
      ? "form-status form-status--success is-visible"
      : tipo === "error"
        ? "form-status form-status--error is-visible"
        : "form-status form-status--info is-visible";
}

function bindEventosModal() {
  if (modalClose) {
    modalClose.addEventListener("click", () => toggleModal(false));
  }
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (ev) => {
      if (ev.target === modalOverlay) toggleModal(false);
    });
  }
  if (modalGuardar) {
    modalGuardar.addEventListener("click", (e) => {
      e.preventDefault();
      guardarCambiosModal();
    });
  }
  if (modalExportar) {
    modalExportar.addEventListener("click", () => {
      if (incidenciaActual) generarDocxIncidencia(incidenciaActual);
    });
  }
  if (modalForm) {
    modalForm.addEventListener("input", actualizarBarraModal);
  }
  if (modalAnexosInput) {
    modalAnexosInput.addEventListener("change", manejarAnexosModal);
  }
}

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
      el.value = before + insert + after;
      const pos = before.length + insert.length;
      el.setSelectionRange(pos, pos);
      actualizarBarraModal();
    }
  });

  el.addEventListener("blur", () => {
    if (!el.value.trim()) {
      el.value = "1. ";
      actualizarBarraModal();
    }
  });
}

export function obtenerDatosTabla() {
  return incidencias.map((inc) => {
    const prog = calcularProgresoInforme(inc);
    const extra = obtenerValorExtra(inc);

    return {
      fecha_informe: inc.fecha_informe,
      tipo: inc.tipo_incidencia,
      placa: extra.placa,
      contenedor: extra.contenedor,
      progreso: prog.porcentaje,
      estado: prog.estado,
    };
  });
}

async function initRegistros() {
  await cargarIncidencias();
  renderTabla(filtrarPorBusqueda(incidencias, busquedaActual));
  bindEventosModal();

  if (inputBuscar) {
    inputBuscar.addEventListener("input", () => {
      busquedaActual = inputBuscar.value.trim();
      renderTabla(filtrarPorBusqueda(incidencias, busquedaActual));
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRegistros);
} else {
  initRegistros();
}
