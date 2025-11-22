/* ============================================================================
   FORMULARIO MODULAR PARA INCIDENCIAS TPP
   - Integracion completa con Supabase (insert + Storage)
   - Campos universales (sin dinamicos por tipo)
   - Barra de progreso
   - Anexos (Storage) + registro JSON
   - Borradores y guardado completo
   ============================================================================ */

import { supabase } from "../utils/supabase.js";
import { uploadFiles } from "../utils/storage.js";

/* ===============================
   1. CAPTURA DE ELEMENTOS HTML
   =============================== */
const tipoIncidenciaSelect = document.getElementById("tipoIncidencia");
const tipoDescripcion = document.getElementById("tipoDescripcion");

const asuntoInput = document.getElementById("asunto");
const dirigidoAInput = document.getElementById("dirigidoA");
const remitenteInput = document.getElementById("remitente");
const fechaInformeInput = document.getElementById("fechaInforme");

const hechosDinamicos = document.getElementById("hechosDinamicos");

const analisisInput = document.getElementById("analisis");
const conclusionesInput = document.getElementById("conclusiones");
const recomendacionesInput = document.getElementById("recomendaciones");

const anexosInput = document.getElementById("anexos");

const progressBar = document.getElementById("progressBar");
const progressLabel = document.getElementById("progressLabel");

/* ===============================
   4. DETECTAR TIPO DESDE URL
   =============================== */
function detectarTipoDesdeURL() {
  const url = new URL(window.location.href);
  const tipoParam = url.searchParams.get("tipo");

  if (!tipoParam) return;

  const optionExists = Array.from(tipoIncidenciaSelect?.options || []).some(
    (opt) => opt.value === tipoParam
  );

  if (!optionExists) return;

  tipoIncidenciaSelect.value = tipoParam;
  actualizarTipo(tipoParam);
}

/* ===============================
   5. ACTUALIZAR TIPO
   =============================== */
function actualizarTipo(tipo) {
  if (!tipo) return;

  switch (tipo) {
    case "CABLE":
      asuntoInput.value = "Sustraccion de cable contenedor RH";
      break;
    case "MERCADERIA":
      asuntoInput.value = "Sustraccion de mercaderia";
      break;
    case "CHOQUE":
      asuntoInput.value = "Choque de unidad";
      break;
    case "SINIESTRO":
      asuntoInput.value = "Siniestro";
      break;
  }

  tipoDescripcion.textContent = `Formulario basado en plantilla oficial: ${asuntoInput.value}`;
}

/* ===============================
   6. CALCULAR PROGRESO
   =============================== */
function recalcularProgreso() {
  const camposBase = [
    asuntoInput,
    dirigidoAInput,
    remitenteInput,
    fechaInformeInput,
    analisisInput,
    conclusionesInput,
    recomendacionesInput,
  ].filter(Boolean);

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

/* ===============================
   7. MANEJO DE ANEXOS (Storage)
   =============================== */
async function procesarAnexos(id) {
  const files = Array.from(anexosInput.files);
  if (!files.length) return [];

  const uploaded = await uploadFiles(id, files);

  return uploaded.map((file) => ({
    name: file.name || "anexo",
    path: file.path,
    url: file.url,
  }));
}

/* ===============================
   8. GUARDAR INCIDENCIA EN SUPABASE
   =============================== */
async function guardarIncidencia(estado = "BORRADOR") {
  const tipo = tipoIncidenciaSelect.value;
  if (!tipo) return alert("Seleccione un tipo de incidencia");

  // ========= CABECERA ==========
  const dirigido_a = dirigidoAInput.value;
  const remitente = remitenteInput.value;
  const fecha_informe = fechaInformeInput.value;

  // ========= CAMPOS (HECHOS) ========
  const campos = {};

  // ========= CUERPO ==========
  const analisis = analisisInput.value;
  const conclusiones = conclusionesInput.value;
  const recomendaciones = recomendacionesInput.value;

  // ========= PROGRESO ==========
  const progreso = parseInt(progressLabel.textContent);

  // ========= GUARDAR ==========
  const { data, error } = await supabase
    .from("incidencias")
    .insert([
      {
        tipo_incidencia: tipo,
        asunto: asuntoInput.value,
        dirigido_a,
        remitente,
        fecha_informe,
        analisis,
        conclusiones,
        recomendaciones,
        campos,
        progreso,
        estado,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error(error);
    alert("Error guardando incidencia");
    return;
  }

  // ========= SUBIR ANEXOS ==========
  const anexosProcesados = await procesarAnexos(data.id);

  if (anexosProcesados.length > 0) {
    await supabase
      .from("incidencias")
      .update({ anexos: anexosProcesados })
      .eq("id", data.id);
  }

  alert("Informe guardado correctamente");
}

/* ===============================
   9. EVENTOS
   =============================== */
tipoIncidenciaSelect.addEventListener("change", () => {
  actualizarTipo(tipoIncidenciaSelect.value);
  recalcularProgreso();
});

[dirigidoAInput, remitenteInput, fechaInformeInput, analisisInput, conclusionesInput, recomendacionesInput].forEach(
  (el) => el?.addEventListener("input", recalcularProgreso)
);

anexosInput?.addEventListener("change", recalcularProgreso);

document
  .getElementById("btnGuardarBorrador")
  .addEventListener("click", () => guardarIncidencia("BORRADOR"));

document
  .getElementById("btnGuardarCompleto")
  .addEventListener("click", () => guardarIncidencia("COMPLETO"));

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

/* ===============================
   10. INICIALIZACION
   =============================== */
detectarTipoDesdeURL();
recalcularProgreso();
