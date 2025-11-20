/* ============================================================
   generador-docx.js – FASE 2 (Exportación DOCX Moderna)
   ------------------------------------------------------------
   - Crea informe Word .docx con imágenes incrustadas
   - Funciona con browser + PWA (sin backend)
   - Usa Supabase Storage (URL → Base64 → DOCX)
   - Totalmente compatible con formulario.js
   ============================================================ */

import { getFileBase64 } from "../utils/storage.js";

export async function generarDocxIncidencia(incidencia) {
  try {
    mostrarModalCarga();

    const templateURL = "/assets/templates/informe-base.docx";
    const templateBinary = await cargarDocx(templateURL);

    const zip = new window.PizZip(templateBinary);
    const doc = new window.docxtemplater().loadZip(zip);

    // =====================================================
    //  MAPEO DE CAMPOS GENERALES DEL INFORME
    // =====================================================
    const datos = {
      asunto: incidencia.asunto,
      tipo: incidencia.tipo_incidencia,
      dirigidoA: incidencia.dirigido_a,
      remitente: incidencia.remitente,
      fechaInforme: incidencia.fecha_informe,

      // Texto del cuerpo
      analisis: incidencia.analisis || "",
      conclusiones: incidencia.conclusiones || "",
      recomendaciones: incidencia.recomendaciones || "",

      // Campos dinámicos dentro de "campos" JSONB
      ...expandirCamposJSON(incidencia.campos || {}),

      // Se usará un array para mostrar imágenes en el documento
      imagenes: [],
    };

    // =====================================================
    //  PROCESAR ANEXOS (IMÁGENES)
    // =====================================================
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

    // =====================================================
    //  INYECTAR DATOS EN LA PLANTILLA
    // =====================================================
    doc.setData(datos);

    try {
      doc.render();
    } catch (err) {
      console.error("Error al renderizar DOCX:", err);
      alert("❌ Ocurrió un error al generar el documento.");
      return;
    }

    // =====================================================
    //  EXPORTAR ARCHIVO
    // =====================================================
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
    console.error("Error general exportando DOCX:", error);
    ocultarModalCarga();
    alert("❌ Error creando el archivo Word.");
  }
}

/* ============================================================
   CARGAR PLANTILLA DOCX COMO BINARY
   ============================================================ */
async function cargarDocx(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("No se pudo cargar plantilla Word");
  return await response.arrayBuffer();
}

/* ============================================================
   EXPANDIR CAMPOS DINÁMICOS (campos JSONB)
   ============================================================ */
function expandirCamposJSON(json) {
  const plano = {};
  for (const key in json) {
    plano[key] = json[key] || "";
  }
  return plano;
}

/* ============================================================
   EXTENSIÓN A PARTIR DE MIME TYPE
   ============================================================ */
function obtenerExtension(mime) {
  if (!mime) return "png";
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("png")) return "png";
  return "png";
}

/* ============================================================
   DESCARGAR ARCHIVO DOCX
   ============================================================ */
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

/* ============================================================
   MODALES (Opcional)
   ============================================================ */
function mostrarModalCarga() {
  console.log("📄 Generando archivo DOCX...");
}

function ocultarModalCarga() {
  console.log("✔ DOCX generado");
}
