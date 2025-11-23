/* ============================================================================
   GENERADOR DOCX — FORMULARIOS TPP
   Versión final estable (2025)
   - Usa tu plantilla real: informe-base.docx
   - Inserta datos dinámicos del formulario
   - Inserta anexos (imágenes + PDF → ícono)
   - Renderiza y descarga el Word final
============================================================================ */

import PizZip from "https://cdn.jsdelivr.net/npm/pizzip@3.1.4/+esm";
import Docxtemplater from "https://esm.sh/docxtemplater@3.67.5";
import ImageModule from "https://esm.sh/docxtemplater-image-module@3.1.0";
import { getFileBase64 } from "../utils/storage.js";

/* ----------------------------------------------------------
   1) Cargar plantilla Word como ArrayBuffer
---------------------------------------------------------- */
async function loadTemplate() {
  const url = "/assets/templates/informe-base.docx";

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo cargar plantilla (${res.status}): ${url}`);
  }

  return new Uint8Array(await res.arrayBuffer());
}

/* ----------------------------------------------------------
   2) Conversión Base64 → ArrayBuffer
---------------------------------------------------------- */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64.split(",")[1]);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/* ----------------------------------------------------------
   3) Reducción automática de imágenes (Word tiene límites)
---------------------------------------------------------- */
function resizeBase64Image(base64, maxWidth = 850) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      if (img.width <= maxWidth) {
        return resolve(base64);
      }

      const canvas = document.createElement("canvas");
      const scale = maxWidth / img.width;

      canvas.width = maxWidth;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");

      const temp = new Image();
      temp.onload = () => {
        ctx.drawImage(temp, 0, 0, canvas.width, canvas.height);
        const resized = canvas.toDataURL("image/jpeg", 0.9);
        resolve(resized);
      };
      temp.src = base64;
    };

    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

/* ----------------------------------------------------------
   4) Convertir y procesar ANEXOS
---------------------------------------------------------- */
async function preprocessAnexos(anexos = []) {
  const result = [];

  for (const item of anexos) {
    const ext = item.name?.toLowerCase() || "";

    // PDF → icono
    if (ext.endsWith(".pdf")) {
      result.push(await pdfIconBase64());
      continue;
    }

    try {
      const base64 = await getFileBase64(item.url);
      const resized = await resizeBase64Image(base64, 850);
      result.push(resized);
    } catch {
      result.push(""); // fallback
    }
  }

  return result;
}

/* ----------------------------------------------------------
   5) Icono PDF en base64 (para insertar en Word)
---------------------------------------------------------- */
async function pdfIconBase64() {
  return (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA" +
    "AAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE" +
    "0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
  );
}

/* ----------------------------------------------------------
   6) Normalización de saltos de línea
---------------------------------------------------------- */
function normalizeMultiline(text = "") {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "\n");
}

/* ----------------------------------------------------------
   7) Render principal
---------------------------------------------------------- */
async function renderWord(context) {
  const templateBinary = await loadTemplate();
  const zip = new PizZip(templateBinary);

  const imageModule = new ImageModule({
    getImage: (tagValue) => base64ToArrayBuffer(tagValue),
    getSize: () => [520, 360],
  });

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    modules: [imageModule],
  });

  doc.setData(context);

  try {
    doc.render();
  } catch (err) {
    console.error("❌ Error renderizando DOCX:", err);
    throw err;
  }

  const output = doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  triggerDownload(output, `Informe_${Date.now()}.docx`);
}

/* ----------------------------------------------------------
   8) Descargar archivo final
---------------------------------------------------------- */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ----------------------------------------------------------
   9) Función principal pública
---------------------------------------------------------- */
async function generateWordFinal(payload) {
  console.log("QA DOCX: Generando Word con payload:", payload);

  const {
    asunto,
    valorExtra = {},
    dirigido_a,
    remitente,
    fecha_informe,
    hechos,
    analisis,
    conclusiones,
    recomendaciones,
    anexos = [],
  } = payload;

  const anexosProcesados = await preprocessAnexos(anexos);

  const context = {
    ASUNTO: asunto || "",
    SERIE_CONTENEDOR: valorExtra?.contenedor || "",
    PLACA_UNIDAD: valorExtra?.placa || "",
    DIRIGIDO_A: dirigido_a || "",
    REMITENTE: remitente || "",
    FECHA_INFORME: fecha_informe || "",
    HECHOS: normalizeMultiline(hechos || ""),
    ANALISIS: normalizeMultiline(analisis || ""),
    CONCLUSIONES: normalizeMultiline(conclusiones || ""),
    RECOMENDACIONES: normalizeMultiline(recomendaciones || ""),
    TABLA_ANEXOS: anexosProcesados,
  };
  
  await renderWord(context);
}

console.log("QA DOCX: generador-docx.js cargado correctamente");

async function generarDocxIncidencia(incidencia = {}) {
  const campos = incidencia.campos || {};
  const valorExtra =
    campos.valorExtra || {
      contenedor: campos.contenedor || "",
      placa: campos.placa || "",
    };

  const payload = {
    asunto: incidencia.asunto || "",
    valorExtra,
    dirigido_a: incidencia.dirigido_a || "",
    remitente: incidencia.remitente || "",
    fecha_informe: incidencia.fecha_informe || "",
    hechos: campos.hechos || "",
    analisis: incidencia.analisis || "",
    conclusiones: incidencia.conclusiones || "",
    recomendaciones: incidencia.recomendaciones || "",
    anexos: Array.isArray(incidencia.anexos) ? incidencia.anexos : [],
  };

  await generateWordFinal(payload);
}

export { generateWordFinal, generarDocxIncidencia };

console.log("QA DOCX: generador-docx.js cargado correctamente");


