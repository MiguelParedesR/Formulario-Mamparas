/* ============================================================
   generador-docx.js - Exportacion DOCX
   - Convierte la incidencia a un documento .docx usando docxtemplater
   - Descarga en el cliente (PWA)
   ============================================================ */

import { getFileBase64 } from "../utils/storage.js";

export async function generarDocxIncidencia(incidencia) {
  try {
    mostrarModalCarga();

    const templateURL = "/assets/templates/informe-base.docx";
    const templateBinary = await cargarDocx(templateURL);
    if (!templateBinary || templateBinary.byteLength === 0) {
      throw new Error(
        "La plantilla Word esta vacia o no se pudo cargar (/assets/templates/informe-base.docx)."
      );
    }

    const Docxtemplater = window.docxtemplater || window.Docxtemplater;
    const ImageModule = window.ImageModule;
    if (!window.PizZip || !Docxtemplater || !ImageModule) {
      throw new Error(
        "Faltan dependencias de docxtemplater/pizzip/image-module en la pagina."
      );
    }

    const zip = new window.PizZip(templateBinary);
    const imageModule = new ImageModule({
      centered: true,
      getImage(tagValue) {
        return base64ToArrayBuffer(tagValue?.data || tagValue);
      },
      getSize(img, tagValue) {
        const width = tagValue?.width || 600;
        const height = tagValue?.height || Math.round(width * 0.65);
        return [width, height];
      },
    });

    const doc = new Docxtemplater(zip, {
      modules: [imageModule],
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{", end: "}" },
    });

    const datos = await prepararDatosDocx(incidencia);

    doc.setData(datos);
    doc.render();

    const output = doc.getZip().generate({
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

async function prepararDatosDocx(incidencia) {
  const campos = incidencia.campos || {};
  const datos = {
    asunto: incidencia.asunto || "",
    tipo: incidencia.tipo_incidencia || "",
    dirigidoA: incidencia.dirigido_a || "",
    remitente: incidencia.remitente || "",
    fechaInforme: incidencia.fecha_informe || "",
    hechos: campos.hechos || "",
    analisis: incidencia.analisis || "",
    conclusiones: incidencia.conclusiones || "",
    recomendaciones: incidencia.recomendaciones || "",
    ...expandirCamposJSON(campos),
    imagenes: [],
  };

  datos.imagenes = await construirImagenes(incidencia.anexos || []);
  return datos;
}

async function construirImagenes(anexos = []) {
  const lista = [];
  for (const archivo of anexos) {
    if (!archivo?.url) continue;

    try {
      const base64Url = await getFileBase64(archivo.url);
      const dimensiones = await obtenerDimensionesDesdeBase64(base64Url);
      const normalizadas = normalizarDimensiones(dimensiones.width, dimensiones.height);

      lista.push({
        nombre: archivo.name || obtenerNombreArchivo(archivo.url),
        imagen: {
          data: limpiarBase64(base64Url),
          width: normalizadas.width,
          height: normalizadas.height,
        },
      });
    } catch (err) {
      console.warn("No se pudo procesar anexo para DOCX:", archivo, err);
    }
  }
  return lista;
}

async function cargarDocx(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("No se pudo cargar plantilla Word");
  return await response.arrayBuffer();
}

function expandirCamposJSON(json) {
  const plano = {};

  for (const key in json) {
    if (key === "valorExtra" && typeof json[key] === "object" && json[key] !== null) {
      const extra = json[key];
      plano.contenedor = extra.contenedor || "";
      plano.placa = extra.placa || "";
    } else {
      plano[key] = json[key] || "";
    }
  }

  return plano;
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

function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function limpiarBase64(dataUrl = "") {
  return dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
}

function obtenerNombreArchivo(url = "") {
  const cleanUrl = url.split("?")[0] || "";
  const partes = cleanUrl.split("/");
  return partes[partes.length - 1] || "anexo";
}

async function obtenerDimensionesDesdeBase64(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

function normalizarDimensiones(width, height, maxWidth = 600) {
  if (!width || !height) {
    return { width: maxWidth, height: Math.round(maxWidth * 0.6) };
  }

  if (width <= maxWidth) {
    return { width, height };
  }

  const ratio = maxWidth / width;
  return {
    width: maxWidth,
    height: Math.max(Math.round(height * ratio), 200),
  };
}
