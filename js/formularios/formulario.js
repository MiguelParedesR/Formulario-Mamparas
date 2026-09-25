/* ============================================================================
   FORMULARIO DE INCIDENCIAS - TPP
   Arquitectura modular, limpia y preparada para SPA + Tailwind
   Compatible con formulario.html reconstruido
   ========================================================================= */

import { supabase } from "../utils/supabase.js";
import { uploadFiles } from "../utils/storage.js";
import { generateWordFinal } from "./generador-docx.js";
import { withBase } from "../config.js";
import "../mamparas/detalle-modal.js";

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
const MAX_ANEXOS = 30;

/* ---------------------------------------------------------------------------
   REFERENCIAS A ELEMENTOS DEL DOM
--------------------------------------------------------------------------- */

const tipoDescripcion = document.getElementById("tipoDescripcion");
const asuntoInput = document.getElementById("asunto");
const campoExtraContainer = document.getElementById("campoExtraContainer");

const dirigidoAInput = document.getElementById("dirigidoA");
const remitenteInput = document.getElementById("remitente");
const fechaInformeInput = document.getElementById("fechaInforme");

const introduccionInput = document.getElementById("introduccion");
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
const formStatus = document.getElementById("formStatus");
const evidenceCountText = document.getElementById("evidenceCountText");
const btnGuardarBorrador = document.getElementById("btnGuardarBorrador");
const btnGuardarCompleto = document.getElementById("btnGuardarCompleto");
const btnExportarWord = btnExportarWord?.addEventListener("click", async () => {
  limpiarEstadoFormulario();
  try {
    const payload = await armarPayloadWord();
    mostrarEstadoFormulario("info", "Generando documento Word…");
    await generateWordFinal(payload);
    mostrarEstadoFormulario("success", "Documento Word generado correctamente.");
  } catch (error) {
    console.error("Error exportando Word:", error);
    mostrarEstadoFormulario("error", "No se pudo generar el documento Word.");
  }
});

function actualizarEstadoBotonWord() {
  if (!btnExportarWord || !progressLabel) return;
  const progreso = parseInt(progressLabel.textContent || "0", 10);
  const habilitado = progreso >= 40;
  btnExportarWord.disabled = !habilitado;
  btnExportarWord.classList.toggle("opacity-40", !habilitado);
}

/* ============================================================================
   AUTOSAVE (Modo pasivo, no interfiere)
============================================================================ */

let autosaveTimer = null;

function iniciarAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer);

  autosaveTimer = setTimeout(() => {
    console.log("ðŸŸ¡ AUTOSAVE READY (desactivado por ahora)");
  }, 2000);
}

[
  asuntoInput,
  dirigidoAInput,
  remitenteInput,
  fechaInformeInput,
  introduccionInput,
  hechosInput,
  analisisInput,
  conclusionesInput,
  recomendacionesInput,
].forEach((el) => {
  el?.addEventListener("input", () => {
    limpiarEstadoFormulario();
    el.removeAttribute("aria-invalid");
    iniciarAutosave();
    recalcularProgreso();
  });
});

/* ============================================================================
   RESET SUAVE
============================================================================ */

function resetFormularioParcial() {
  introduccionInput.value = "1. ";
  hechosInput.value = "1. ";
  analisisInput.value = "1. ";
  conclusionesInput.value = "1. ";
  recomendacionesInput.value = "1. ";

  anexosArchivos = [];
  renderizarAnexosPreview();
  recalcularProgreso();

  console.log("ðŸ”„ Formulario parcialmente restablecido.");
}

window.resetFormularioParcial = resetFormularioParcial;

/* ============================================================================
   FIN DEL ARCHIVO FORMULARIO COMPLETO, LIMPIO Y FUNCIONAL
============================================================================ */
