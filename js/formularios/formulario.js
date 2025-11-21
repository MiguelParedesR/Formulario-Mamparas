/* ============================================================================
   FORMULARIO MODULAR PARA INCIDENCIAS TPP
   - Integración completa con Supabase (insert + Storage)
   - Campos dinámicos por tipo de incidencia
   - Barra de progreso
   - Anexos (Storage) + registro JSON
   - Borradores y guardado completo
   ============================================================================ */

import { supabase } from "../utils/supabase.js";
import { subirAnexo } from "../utils/storage.js";

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
   2. MAPA DE CAMPOS POR TIPO
   =============================== */
const CAMPOS_TIPO = {
  CABLE: [
    "fecha",
    "hora",
    "direccion",
    "gps",
    "backup_foto",
    "ocurrencias",
    "paradas",
    "velocidad",
  ],

  MERCADERIA: [
    "fecha",
    "hora",
    "direccion",
    "gps",
    "custodia_foto",
    "ocurrencias",
    "paradas",
    "velocidad",
  ],

  CHOQUE: [
    "fecha",
    "hora",
    "direccion",
    "gps",
    "custodia_foto",
    "ocurrencias",
    "paradas",
    "velocidad",
    "unidades_involucradas",
  ],

  SINIESTRO: [
    "fecha",
    "hora",
    "direccion",
    "gps",
    "custodia_foto",
    "ocurrencias",
    "paradas",
    "velocidad",
    "unidades_involucradas",
  ],
};

/* ===============================
   3. GENERADOR DE INPUTS DINÁMICOS
   =============================== */
function generarCamposHechos(tipo) {
  hechosDinamicos.innerHTML = "";

  const campos = CAMPOS_TIPO[tipo];
  if (!campos) return;

  campos.forEach((campo) => {
    const div = document.createElement("div");
    div.className = "space-y-1";

    const label = document.createElement("label");
    label.className = "block text-xs font-medium text-gray-700";
    label.textContent = formatearLabel(campo);

    let input;

    // Input archivo
    if (campo.includes("foto") || campo === "gps") {
      input = document.createElement("input");
      input.type = "file";
      input.accept = campo.includes("foto") ? "image/*" : ".xlsx,.xls,.csv";
    }

    // Campos textarea
    else if (campo === "ocurrencias" || campo === "paradas") {
      input = document.createElement("textarea");
      input.rows = 2;
      input.className =
        "w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500";
    }

    // Fecha / hora / texto
    else {
      input = document.createElement("input");
      input.type = campo === "fecha" ? "date" : "text";
    }

    input.id = campo;
    input.name = campo;
    if (!input.className)
      input.className =
        "w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500";

    div.appendChild(label);
    div.appendChild(input);
    hechosDinamicos.appendChild(div);
  });

  recalcularProgreso();
}

function formatearLabel(campo) {
  return campo
    .replace(/_/g, " ")
    .replace("gps", "Reporte GPS (Excel)")
    .replace("backup foto", "Reporte Backup Puerto (Foto)")
    .replace("custodia foto", "Reporte Custodia (Foto)")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/* ===============================
   4. DETECTAR TIPO DESDE URL
   =============================== */
function detectarTipoDesdeURL() {
  const url = new URL(window.location.href);
  const tipoParam = url.searchParams.get("tipo");

  if (tipoParam && CAMPOS_TIPO[tipoParam]) {
    tipoIncidenciaSelect.value = tipoParam;
    actualizarTipo(tipoParam);
  }
}

/* ===============================
   5. ACTUALIZAR TIPO
   =============================== */
function actualizarTipo(tipo) {
  if (!CAMPOS_TIPO[tipo]) return;

  switch (tipo) {
    case "CABLE":
      asuntoInput.value = "Sustracción de cable contenedor RH";
      break;
    case "MERCADERIA":
      asuntoInput.value = "Sustracción de mercadería";
      break;
    case "CHOQUE":
      asuntoInput.value = "Choque de unidad";
      break;
    case "SINIESTRO":
      asuntoInput.value = "Siniestro";
      break;
  }

  tipoDescripcion.textContent = `Formulario basado en plantilla oficial: ${asuntoInput.value}`;

  generarCamposHechos(tipo);
}

/* ===============================
   6. CALCULAR PROGRESO
   =============================== */
function recalcularProgreso() {
  const tipo = tipoIncidenciaSelect.value;
  if (!tipo) return;

  const campos = CAMPOS_TIPO[tipo];
  let llenos = 0;

  campos.forEach((campo) => {
    const el = document.getElementById(campo);
    if (!el) return;

    if (el.type === "file") {
      if (el.files.length > 0) llenos++;
    } else {
      if (el.value.trim() !== "") llenos++;
    }
  });

  const progreso = Math.round((llenos / campos.length) * 100);

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
  const files = anexosInput.files;
  if (!files.length) return [];

  const resultados = [];

  for (const file of files) {
    const path = await subirAnexo(id, file);
    resultados.push({
      nombre: file.name,
      path,
      url: `${
        supabase.storage.from("incidencias-anexos").getPublicUrl(path).data
          .publicUrl
      }`,
    });
  }

  return resultados;
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
  CAMPOS_TIPO[tipo].forEach((campo) => {
    const el = document.getElementById(campo);

    if (!el) return;

    if (el.type === "file") {
      campos[campo] = null; // se subirá después
    } else {
      campos[campo] = el.value;
    }
  });

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
    alert("❌ Error guardando incidencia");
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

  alert("✅ Informe guardado correctamente");
}

/* ===============================
   9. EVENTOS
   =============================== */
tipoIncidenciaSelect.addEventListener("change", () => {
  actualizarTipo(tipoIncidenciaSelect.value);
  recalcularProgreso();
});

hechosDinamicos.addEventListener("input", recalcularProgreso);
analisisInput.addEventListener("input", recalcularProgreso);
conclusionesInput.addEventListener("input", recalcularProgreso);
recomendacionesInput.addEventListener("input", recalcularProgreso);

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
  alert("Exportación Word lista en Fase 2");
});

/* ===============================
   10. INICIALIZACIÓN
   =============================== */
detectarTipoDesdeURL();
