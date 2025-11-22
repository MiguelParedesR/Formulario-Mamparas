/* ============================================================
   generador-docx.js — Exportación DOCX
   - Convierte la incidencia a un documento .docx usando docxtemplater
   - Descarga en el cliente (PWA)
   ============================================================ */

import { getFileBase64 } from "../utils/storage.js";

export async function generarDocxIncidencia(incidencia) {
  try {
    mostrarModalCarga();

    const templateURL = "/assets/templates/informe-base.docx";
    const templateBinary = await cargarDocx(templateURL);

    const zip = new window.PizZip(templateBinary);
    const doc = new window.docxtemplater().loadZip(zip);

    const datos = {
      asunto: incidencia.asunto,
      tipo: incidencia.tipo_incidencia,
      dirigidoA: incidencia.dirigido_a,
      remitente: incidencia.remitente,
      fechaInforme: incidencia.fecha_informe,
      analisis: incidencia.analisis || "",
      conclusiones: incidencia.conclusiones || "",
      recomendaciones: incidencia.recomendaciones || "",
      ...expandirCamposJSON(incidencia.campos || {}),
      imagenes: [],
    };

    if (incidencia.anexos && Array.isArray(incidencia.anexos)) {
      for (const archivo of incidencia.anexos) {
        if (!archivo.url) continue;
        const base64 = await getFileBase64(archivo.url);
        datos.imagenes.push({
          data: base64.split(",")[1],
          extension: obtenerExtension(archivo.mime),
        });
      }
    }

    doc.setData(datos);
    doc.render();

    const output = doc
      .getZip()
      .generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    descargarDOCX(output, `informe-${incidencia.id}.docx`);
    ocultarModalCarga();
  } catch (error) {
    console.error("Error exportando DOCX:", error);
    ocultarModalCarga();
    alert("Error creando el archivo Word.");
  }
}

async function cargarDocx(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("No se pudo cargar plantilla Word");
  return await response.arrayBuffer();
}

function expandirCamposJSON(json) {
  const plano = {};
  for (const key in json) {
    plano[key] = json[key] || "";
  }
  return plano;
}

function obtenerExtension(mime) {
  if (!mime) return "png";
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("png")) return "png";
  return "png";
}

function descargarDOCX(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function mostrarModalCarga() {
  console.log("Generando archivo DOCX...");
}

function ocultarModalCarga() {
  console.log("DOCX generado");
}
