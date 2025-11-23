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
import { uploadFiles } from "../utils/storage.js";
import { generarDocxIncidencia } from "../formularios/generador-docx.js";

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
  const filtro = texto.toLowerCase();
  if (!filtro) return [...lista];

  return lista.filter((inc) => {
    const extra = obtenerValorExtra(inc);
    const placa = (extra.placa || "").toLowerCase();
    const contenedor = (extra.contenedor || "").toLowerCase();
    return placa.includes(filtro) || contenedor.includes(filtro);
  });
}

function renderTabla(lista) {
  if (!tablaBody) return;

  tablaBody.innerHTML = "";

  if (!lista.length) {
    tablaBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4 text-gray-500">
                    No hay registros para mostrar
                </td>
            </tr>`;
    return;
  }

  lista.forEach((inc) => {
    const estado = obtenerEstadoListado(inc);
    const extra = obtenerValorExtra(inc);

    const tr = document.createElement("tr");
    tr.className = "hover:bg-gray-50 transition";

    tr.innerHTML = `
            <td class="px-3 py-2 text-sm">${inc.fecha_informe || "-"}</td>
            <td class="px-3 py-2 text-sm">${inc.tipo_incidencia || "-"}</td>
            <td class="px-3 py-2 text-sm">${extra.placa || "-"}</td>
            <td class="px-3 py-2 text-sm">${extra.contenedor || "-"}</td>

            <td class="px-3 py-2">
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="h-2 rounded-full ${estado.color
      }" style="width:${estado.porcentaje}%"></div>
                </div>
                <span class="text-xs text-gray-600">${estado.porcentaje}%</span>
            </td>

            <td class="px-3 py-2 text-sm font-semibold ${estado.estado === "COMPLETO" ? "text-green-600" : "text-amber-600"
      }">
                ${estado.estado}
            </td>

            <td class="px-3 py-2 text-sm flex gap-2">
                <button class="ver-btn px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 shadow"
                        data-id="${inc.id}">
                    Ver / Editar
                </button>
            </td>
        `;

    tablaBody.appendChild(tr);
  });

  activarBotones();
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

  const baseClasses =
    "w-full rounded-xl border-gray-300 shadow-sm text-sm px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 transition";

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

  if (!incidenciaActual.anexos || incidenciaActual.anexos.length === 0) {
    modalAnexosLista.innerHTML =
      '<p class="text-sm text-gray-500">No hay anexos cargados.</p>';
    return;
  }

  modalAnexosLista.innerHTML = incidenciaActual.anexos
    .map(
      (a) => `
        <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
          <a href="${a.url}" target="_blank" class="text-indigo-600 underline text-sm">${a.name}</a>
        </div>
      `
    )
    .join("");
}

function toggleModal(show) {
  if (!modalOverlay || !modalPanel) return;
  if (show) {
    modalOverlay.classList.remove("hidden", "opacity-0");
    modalOverlay.classList.add("flex");
    modalPanel.classList.remove("scale-95", "opacity-0");
    modalPanel.classList.add("scale-100", "opacity-100");
  } else {
    modalOverlay.classList.add("hidden");
    modalOverlay.classList.remove("flex");
    modalOverlay.classList.add("opacity-0");
    modalPanel.classList.add("scale-95", "opacity-0");
    modalPanel.classList.remove("scale-100", "opacity-100");
    modalAnexosInput.value = "";
    if (modalFeedback) modalFeedback.className = "hidden";
  }
}

function sincronizarIncidenciaDesdeModal() {
  incidenciaActual.campos = incidenciaActual.campos || {};

  incidenciaActual.asunto = modalInputs.asunto.value;
  incidenciaActual.dirigido_a = modalInputs.dirigidoA.value;
  incidenciaActual.remitente = modalInputs.remitente.value;
  incidenciaActual.fecha_informe = modalInputs.fecha.value;
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
  if (!incidenciaActual) return { porcentaje: 0 };
  sincronizarIncidenciaDesdeModal();

  const progreso = calcularProgresoInforme(incidenciaActual);

  if (modalProgressBar && modalProgressLabel) {
    modalProgressBar.style.width = `${progreso.porcentaje}%`;

    if (progreso.porcentaje < 50)
      modalProgressBar.className =
        "h-2 rounded-full bg-red-500 transition-all duration-300";
    else if (progreso.porcentaje < 100)
      modalProgressBar.className =
        "h-2 rounded-full bg-amber-500 transition-all duration-300";
    else
      modalProgressBar.className =
        "h-2 rounded-full bg-green-600 transition-all duration-300";

    modalProgressLabel.textContent = `${progreso.porcentaje}%`;
  }

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
    "text-sm px-3 py-2 rounded-lg " +
    (tipo === "success"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-rose-50 text-rose-700");
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
