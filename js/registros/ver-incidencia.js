/* ============================================================================
   ver-incidencia.js — Vista Individual de Incidencia TPP
   ------------------------------------------------------
   ✔ Carga desde Supabase
   ✔ Actualiza campos en vivo
   ✔ Guarda cambios (UPDATE)
   ✔ Maneja anexos (Supabase Storage)
   ✔ Actualiza barra de progreso
   ✔ Exporta a Word (DOCX)
   ✔ SPA con sidebar-loader
============================================================================ */

import { supabase } from "../utils/supabase.js";
import {
  calcularProgresoInforme,
  actualizarBarraProgreso,
} from "../dashboard/progreso.js";
import { uploadFiles } from "../utils/storage.js";
import { generarDocxIncidencia } from "../formularios/generador-docx.js";

/* ===============================
   VARIABLES
   =============================== */
let incidenciaActual = null;
let incidenciaId = null;

/* ===============================
   INICIO
   =============================== */
document.addEventListener("DOMContentLoaded", async () => {
  incidenciaId = obtenerIdDesdeURL();

  if (!incidenciaId) {
    mostrarMensaje("ID inválido", "error");
    return;
  }

  await cargarIncidencia();

  if (!incidenciaActual) {
    mostrarMensaje("No se encontró la incidencia", "error");
    return;
  }

  pintarDatosEnFormulario();
  actualizarBarraConIncidencia();
  activarEventos();
});

/* ===============================
   OBTENER ID DESDE URL
   =============================== */
function obtenerIdDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

/* ===============================
   CARGAR INCIDENCIA DESDE SUPABASE
   =============================== */
async function cargarIncidencia() {
  const { data, error } = await supabase
    .from("incidencias")
    .select("*")
    .eq("id", incidenciaId)
    .single();

  if (error) {
    console.error("❌ Error cargando incidencia:", error);
    incidenciaActual = null;
    return;
  }

  incidenciaActual = data;
}

/* ===============================
   PINTAR DATOS EN EL FORMULARIO
   =============================== */
function pintarDatosEnFormulario() {
  // Campos directos
  asignar("tipoIncidencia", incidenciaActual.tipo_incidencia);
  asignar("asunto", incidenciaActual.asunto);
  asignar("dirigidoA", incidenciaActual.dirigido_a);
  asignar("remitente", incidenciaActual.remitente);
  asignar("fechaInforme", incidenciaActual.fecha_informe);
  asignar("analisis", incidenciaActual.analisis);
  asignar("conclusiones", incidenciaActual.conclusiones);
  asignar("recomendaciones", incidenciaActual.recomendaciones);

  // Campos dinámicos ("campos" JSONB)
  if (incidenciaActual.campos) {
    for (const key in incidenciaActual.campos) {
      asignar(key, incidenciaActual.campos[key]);
    }
  }

  // Anexos
  const contenedor = document.getElementById("listaAnexos");

  if (contenedor && incidenciaActual.anexos?.length > 0) {
    contenedor.innerHTML = incidenciaActual.anexos
      .map(
        (a) => `
                <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <a href="${a.url}" target="_blank" class="text-blue-600 underline text-sm">${a.name}</a>
                </div>
            `
      )
      .join("");
  }
}

function asignar(id, valor) {
  const input = document.getElementById(id);
  if (!input) return;
  if (input.type === "file") return;
  input.value = valor || "";
}

/* ===============================
   ACTUALIZAR BARRA DE PROGRESO
   =============================== */
function actualizarBarraConIncidencia() {
  const progreso = calcularProgresoInforme(incidenciaActual);
  actualizarBarraProgreso(progreso.porcentaje);
}

/* ===============================
   EVENTOS
   =============================== */
function activarEventos() {
  const form = document.getElementById("form-ver-incidencia");
  const btnGuardar = document.getElementById("btnGuardarCambios");
  const btnExportar = document.getElementById("btnExportarWord");
  const archivoInput = document.getElementById("anexos");

  if (form) {
    form.addEventListener("input", registrarCambios);
  }

  if (btnGuardar) {
    btnGuardar.addEventListener("click", guardarCambios);
  }

  if (btnExportar) {
    btnExportar.addEventListener("click", () =>
      generarDocxIncidencia(incidenciaActual)
    );
  }

  if (archivoInput) {
    archivoInput.addEventListener("change", manejarAnexos);
  }
}

/* ===============================
   REGISTRAR CAMBIOS EN VIVO
   =============================== */
function registrarCambios(e) {
  const campo = e.target.id;
  const valor = e.target.value;

  if (!campo) return;

  if (incidenciaActual.campos && campo in incidenciaActual.campos) {
    incidenciaActual.campos[campo] = valor;
  } else {
    incidenciaActual[campo] = valor;
  }

  actualizarBarraConIncidencia();
}

/* ===============================
   MANEJO DE ANEXOS (STORAGE)
   =============================== */
async function manejarAnexos(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  if (!incidenciaActual.anexos) incidenciaActual.anexos = [];

  const uploaded = await uploadFiles(incidenciaActual.id, files);

  uploaded.forEach((file) => {
    incidenciaActual.anexos.push({
      name: file.name,
      url: file.url,
    });
  });

  actualizarBarraConIncidencia();
}

/* ===============================
   GUARDAR CAMBIOS (UPDATE SUPABASE)
   =============================== */
async function guardarCambios() {
  const progreso = calcularProgresoInforme(incidenciaActual).porcentaje;
  const estado = progreso >= 100 ? "COMPLETO" : "BORRADOR";

  const payload = {
    tipo_incidencia: incidenciaActual.tipo_incidencia,
    asunto: incidenciaActual.asunto,
    dirigido_a: incidenciaActual.dirigidoA || incidenciaActual.dirigido_a,
    remitente: incidenciaActual.remitente,
    fecha_informe:
      incidenciaActual.fechaInforme || incidenciaActual.fecha_informe,
    analisis: incidenciaActual.analisis,
    conclusiones: incidenciaActual.conclusiones,
    recomendaciones: incidenciaActual.recomendaciones,
    campos: incidenciaActual.campos,
    anexos: incidenciaActual.anexos,
    progreso,
    estado,
  };

  const { error } = await supabase
    .from("incidencias")
    .update(payload)
    .eq("id", incidenciaActual.id);

  if (error) {
    console.error("❌ Error guardando:", error);
    mostrarMensaje("Error guardando los cambios.", "error");
    return;
  }

  mostrarMensaje("Cambios guardados correctamente.", "success");
  actualizarBarraConIncidencia();
}

/* ===============================
   FEEDBACK UI
   =============================== */
function mostrarMensaje(texto, tipo) {
  const modal = document.getElementById("feedbackModalVer");
  const msg = document.getElementById("feedbackMessageVer");

  if (!modal || !msg) return;

  msg.textContent = texto;
  msg.className = tipo === "success" ? "text-green-700" : "text-red-700";

  modal.style.display = "flex";
  setTimeout(() => (modal.style.display = "none"), 2000);
}
