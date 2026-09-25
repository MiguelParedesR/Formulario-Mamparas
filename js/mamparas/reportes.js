import { supabase, mostrarModal } from "./script.js";

const OPERADORES_REFERENCIA = [
  "Carlos Sanchez",
  "Francisco Elescano",
  "Hernan Luna",
  "Roger Castro",
  "Oscar Fernandez",
  "Miguel Paredes",
  "David Echaccaya",
  "Juan Quelopana",
  "Grover Munguia",
  "Ernesto Alfaro",
];

const LOGO_TPP_URL = "https://i.postimg.cc/W48hdkrt/LOGOX-removebg-preview.png";

function setReportStatus(tipo, mensaje) {
  const status = document.getElementById("reportStatus");
  if (!status) return;

  const styles = {
    info: "border-blue-200 bg-blue-50 text-blue-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    success: "border-green-200 bg-green-50 text-green-800",
    error: "border-red-200 bg-red-50 text-red-800",
  };

  status.className = `rounded-xl border px-4 py-3 text-sm ${styles[tipo] || styles.info}`;
  status.textContent = mensaje;
}

function clearReportStatus() {
  const status = document.getElementById("reportStatus");
  if (!status) return;
  status.className = "hidden rounded-xl border px-4 py-3 text-sm";
  status.textContent = "";
}

function setExportButtonState(cargando) {
  const btn = document.getElementById("btnExportarExcel");
  if (!btn) return;
  if (!btn.dataset.originalLabel) btn.dataset.originalLabel = btn.innerHTML;

  btn.disabled = cargando;
  btn.classList.toggle("opacity-60", cargando);
  btn.classList.toggle("cursor-not-allowed", cargando);
  btn.innerHTML = cargando
    ? '<span class="flex items-center gap-2"><span class="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>Generando...</span>'
    : btn.dataset.originalLabel;
}

async function cargarExcelJs() {
  if (window.ExcelJS) return window.ExcelJS;

  const existente = document.querySelector('script[data-exceljs-runtime="1"]');
  if (existente) {
    await new Promise((resolve, reject) => {
      if (window.ExcelJS) return resolve();
      existente.addEventListener("load", resolve, { once: true });
      existente.addEventListener("error", reject, { once: true });
    });
    if (window.ExcelJS) return window.ExcelJS;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
    script.dataset.exceljsRuntime = "1";
    script.onload = resolve;
    script.onerror = () => reject(new Error("No se pudo cargar ExcelJS"));
    document.head.appendChild(script);
  });

  if (!window.ExcelJS) throw new Error("ExcelJS no quedó disponible");
  return window.ExcelJS;
}

function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivo;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function cargarLogoValido(workbook, worksheet) {
  try {
    const response = await fetch(LOGO_TPP_URL, { cache: "force-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) throw new Error("La respuesta no es una imagen");

    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const base64 = btoa(binary);
    if (!base64 || base64.length % 4 !== 0) throw new Error("Logo con Base64 inválido");

    const extension = blob.type.includes("jpeg") ? "jpeg" : "png";
    const logoId = workbook.addImage({ base64, extension });
    worksheet.addImage(logoId, {
      tl: { col: 0.1, row: 0.1 },
      ext: { width: 150, height: 60 },
    });
    return true;
  } catch (error) {
    console.warn("Logo TPP omitido; el Excel continuará sin bloquearse:", error);
    worksheet.mergeCells("A1:B1");
    worksheet.getCell("A1").value = "TPP";
    worksheet.getCell("A1").font = { bold: true, size: 20, name: "Arial" };
    worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
    return false;
  }
}

async function cargarOperadores() {
  const select = document.getElementById("operador");
  if (!select) return;

  select.innerHTML = '<option value="Todos">Cargando operadores...</option>';
  let operadores = [];

  try {
    const { data, error } = await supabase.from("inspecciones").select("responsable");
    if (error) throw error;
    operadores = [...new Set(
      (Array.isArray(data) ? data : [])
        .map((r) => String(r?.responsable || "").trim())
        .filter(Boolean)
    )];
  } catch (error) {
    console.error("Error cargando operadores:", error?.message || error);
  }

  for (const operador of OPERADORES_REFERENCIA) {
    if (!operadores.includes(operador)) operadores.push(operador);
  }

  operadores.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  select.innerHTML =
    '<option value="Todos">Todos (sin filtro)</option>' +
    operadores.map((op) => `<option value="${op}">${op}</option>`).join("");
}

function aplicarMesActual() {
  const input = document.getElementById("mes");
  if (!input || input.value) return;
  const hoy = new Date();
  input.value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function ultimoDiaMes(anio, mes) {
  return String(new Date(Number(anio), Number(mes), 0).getDate()).padStart(2, "0");
}

async function aplicarFormatoCorporativo(worksheet, workbook, data) {
  await cargarLogoValido(workbook, worksheet);

  worksheet.getCell("I1").value = "F-OPESEG-045";
  worksheet.getCell("I1").alignment = { vertical: "middle", horizontal: "right" };
  worksheet.getCell("I1").font = { bold: true, size: 13, name: "Arial" };

  worksheet.mergeCells("A2:I2");
  worksheet.getCell("A2").value = "REGISTRO DE FALTAS O INCORRECCIONES DE UNIDADES";
  worksheet.getCell("A2").alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getCell("A2").font = { bold: true, size: 14, name: "Arial" };

  worksheet.getRow(1).height = 46;
  worksheet.getRow(2).height = 24;
  worksheet.getRow(3).height = 8;

  const headers = [
    "FECHA",
    "HORA",
    "EMPRESA",
    "PLACA",
    "CHOFER",
    "LUGAR",
    "INCORRECCIONES",
    "RESPONSABLE",
    "OBSERVACIONES",
  ];
  worksheet.getRow(4).values = headers;
  worksheet.getRow(4).height = 28;

  data.forEach((registro, index) => {
    const row = worksheet.getRow(index + 5);
    row.values = [
      registro.fecha || "",
      registro.hora || "",
      registro.empresa || "",
      registro.placa || "",
      registro.chofer || "",
      registro.lugar || "",
      registro.incorreccion || "",
      registro.responsable || "",
      registro.observaciones || "",
    ];
    row.height = 20;
  });

  const widths = [13, 11, 24, 13, 24, 18, 25, 22, 34];
  worksheet.columns.forEach((column, index) => {
    column.width = widths[index] || 18;
    column.alignment = { vertical: "middle", wrapText: true };
  });

  for (let rowNumber = 4; rowNumber <= data.length + 4; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = {
        name: "Arial",
        size: rowNumber === 4 ? 10 : 9,
        bold: rowNumber === 4,
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: rowNumber === 4 ? "center" : "left",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF808080" } },
        left: { style: "thin", color: { argb: "FF808080" } },
        bottom: { style: "thin", color: { argb: "FF808080" } },
        right: { style: "thin", color: { argb: "FF808080" } },
      };
      if (rowNumber === 4) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFDDEEFF" },
        };
      }
    });
  }

  worksheet.views = [{ state: "frozen", ySplit: 4 }];
  worksheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
  worksheet.autoFilter = { from: "A4", to: "I4" };
}

async function generarExcel(data, anio, mes, operador) {
  const ExcelJS = await cargarExcelJs();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Terminales Portuarios Peruanos";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Reporte");
  await aplicarFormatoCorporativo(worksheet, workbook, data);

  const operadorNombre =
    !operador || operador === "Todos"
      ? "Todos"
      : operador.replace(/[^a-zA-Z0-9_-]+/g, "_");

  const buffer = await workbook.xlsx.writeBuffer();
  descargarBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `reporte_${operadorNombre}_${anio}_${mes}.xlsx`
  );
}

async function exportarExcel() {
  clearReportStatus();

  const mesValor = document.getElementById("mes")?.value || "";
  const operador = document.getElementById("operador")?.value || "Todos";

  if (!mesValor) {
    const mensaje = "Seleccione un mes para generar el reporte.";
    setReportStatus("warning", mensaje);
    mostrarModal("error", mensaje);
    return;
  }

  setExportButtonState(true);
  setReportStatus("info", "Consultando registros y preparando el Excel...");

  try {
    const [anio, mes] = mesValor.split("-");
    const inicio = `${anio}-${mes}-01`;
    const fin = `${anio}-${mes}-${ultimoDiaMes(anio, mes)}`;

    let query = supabase
      .from("inspecciones")
      .select("fecha,hora,empresa,placa,chofer,lugar,incorreccion,responsable,observaciones")
      .gte("fecha", inicio)
      .lte("fecha", fin)
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });

    if (operador !== "Todos") query = query.eq("responsable", operador);

    const { data, error } = await query;
    if (error) throw error;

    if (!data?.length) {
      const mensaje = operador === "Todos"
        ? `No se encontraron registros para ${mes}/${anio}.`
        : `No se encontraron registros para ${operador} en ${mes}/${anio}.`;
      setReportStatus("warning", mensaje);
      mostrarModal("error", mensaje);
      return;
    }

    await generarExcel(data, anio, mes, operador);
    const mensaje = `Excel F-OPESEG-045 generado con ${data.length} registro(s).`;
    setReportStatus("success", mensaje);
    mostrarModal("success", mensaje);
  } catch (error) {
    console.error("Error generando Excel F-OPESEG-045:", error);
    const mensaje = error?.message
      ? `No se pudo generar el Excel: ${error.message}`
      : "No se pudo generar el Excel.";
    setReportStatus("error", mensaje);
    mostrarModal("error", mensaje);
  } finally {
    setExportButtonState(false);
  }
}

function initReportes() {
  const boton = document.getElementById("btnExportarExcel");
  if (!boton || boton.dataset.reportesBound === "1") return;

  boton.dataset.reportesBound = "1";
  aplicarMesActual();
  void cargarOperadores();
  boton.addEventListener("click", exportarExcel);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initReportes, { once: true });
} else {
  initReportes();
}
