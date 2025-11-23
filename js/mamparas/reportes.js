// 🚫 NO BORRAR — Bloque restaurado/corregido del módulo Mamparas
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

const LOGO_TPP_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAHgAAAAoCAYAAABQ0GJ1AAAACXBIWXMAAA7EAAAOxAGVKw4bAAABO0lEQVR4nO2ZQQ6DIBRFv62bPopqKgkl0vv/5xpoE2mR7BncpsbR9f7D78AyDDpwHDCCCAAAIIIIAAAggg8HyD+S1yujkvyMXR0SNEEUu5h0b5GN1fWG0EBH7gYCU+iNgtmybzBept0D81Wp9aI1NgZmviTHtONc8FwMB7yuC1ZgBlt1mAWW22YBdbdpgF1t2mAXW8W8zci6pN86hVY9WnXgdQbPvDU2C7j4+AFWiYX/gqfLPjAf64mvMbVUWWdR3Gp0ZjoaAVp2LzYzj2mL4es9vq+7O42h8Du8LwC2MKa79HRhN6VYXBk80ts1omS9X575+cJCLuvkekA81VdI8N3V4LmAh2YnrOB+hd4B4DhoDBIYAwSGAMMhgDBIYAwSGAMFhgLhhUZ15YGoa7czO/0ohrY/PCujQAAAAASUVORK5CYII=";

function setExportButtonState(cargando) {
  const btn = document.getElementById("btnExportarExcel");
  if (!btn) return;

  if (cargando) {
    if (!btn.dataset.originalLabel) {
      btn.dataset.originalLabel = btn.innerHTML;
    }
    btn.disabled = true;
    btn.classList.add("opacity-60", "cursor-not-allowed");
    btn.innerHTML = `
      <span class="flex items-center gap-2">
        <span class="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
        Generando...
      </span>
    `;
  } else {
    btn.disabled = false;
    btn.classList.remove("opacity-60", "cursor-not-allowed");
    if (btn.dataset.originalLabel) {
      btn.innerHTML = btn.dataset.originalLabel;
    }
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

    if (Array.isArray(data)) {
      operadores = [
        ...new Set(
          data
            .map((r) => (r?.responsable || "").trim())
            .filter((valor) => valor && valor.length > 0)
        ),
      ];
    }
  } catch (err) {
    console.error("Error cargando operadores:", err.message || err);
  }

  if (!operadores.length) {
    operadores = [...OPERADORES_REFERENCIA];
  } else {
    const faltantes = OPERADORES_REFERENCIA.filter((op) => !operadores.includes(op));
    operadores = [...operadores, ...faltantes];
  }

  operadores.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  select.innerHTML = `
    <option value="Todos">Todos (sin filtro)</option>
    ${operadores.map((op) => `<option value="${op}">${op}</option>`).join("")}
  `;
}

function obtenerUltimoDiaMes(year, month) {
  const ultimoDia = new Date(Number(year), Number(month), 0).getDate();
  return String(ultimoDia).padStart(2, "0");
}

function aplicarMesActual() {
  const mesInput = document.getElementById("mes");
  if (!mesInput) return;
  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  mesInput.value = mesActual;
}

function construirEncabezadoExcel(sheet, filtros) {
  const logoId = sheet.workbook.addImage({
    base64: LOGO_TPP_BASE64,
    extension: "png",
  });

  sheet.mergeCells("A1:B4");
  sheet.addImage(logoId, "A1:B4");

  sheet.mergeCells("C1:J1");
  sheet.getCell("C1").value = "Terminales Portuarios Peruanos S.A.";
  sheet.getCell("C1").font = { size: 16, bold: true, color: { argb: "FF1F2937" } };

  sheet.mergeCells("C2:J2");
  sheet.getCell("C2").value = "Reporte de inspecciones del m\u00F3dulo Mamparas";
  sheet.getCell("C2").font = { size: 12, color: { argb: "FF4B5563" } };

  sheet.mergeCells("C3:J3");
  sheet.getCell("C3").value = `Mes: ${filtros.mesEtiqueta}`;
  sheet.getCell("C3").font = { size: 11 };

  sheet.mergeCells("C4:J4");
  sheet.getCell("C4").value = `Operador: ${filtros.operadorEtiqueta}`;
  sheet.getCell("C4").font = { size: 11 };
}

function formatearCabecera(sheet, rowIndex, totalColumnas) {
  const headerRow = sheet.getRow(rowIndex);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4338CA" },
  };
  headerRow.height = 22;

  for (let i = 1; i <= totalColumnas; i += 1) {
    const column = sheet.getColumn(i);
    column.width = [12, 10, 24, 12, 20, 14, 18, 20, 24, 20][i - 1] || 18;
    column.alignment = { vertical: "middle", wrapText: true };
    column.border = {
      top: { style: "thin", color: { argb: "FFE5E7EB" } },
      left: { style: "thin", color: { argb: "FFE5E7EB" } },
      bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      right: { style: "thin", color: { argb: "FFE5E7EB" } },
    };
  }

  sheet.autoFilter = {
    from: { row: rowIndex, column: 1 },
    to: { row: rowIndex, column: totalColumnas },
  };
}

function obtenerResumenDetalle(detalle) {
  if (!detalle) return "-";
  try {
    const parsed = typeof detalle === "string" ? JSON.parse(detalle || "{}") : detalle;
    return parsed?.tipo || "-";
  } catch {
    return "-";
  }
}

async function generarExcel(data, filtros) {
  const ExcelLib = window.ExcelJS || ExcelJS;
  const saveAsFn = window.saveAs || saveAs;

  if (!ExcelLib || !saveAsFn) {
    mostrarModal("error", "No se pudo cargar las librer\u00EDas de exportaci\u00F3n.");
    return;
  }

  const workbook = new ExcelLib.Workbook();
  workbook.creator = "Terminales Portuarios Peruanos";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Reporte Mamparas");
  construirEncabezadoExcel(sheet, filtros);

  const encabezados = [
    "FECHA",
    "HORA",
    "EMPRESA",
    "PLACA",
    "CHOFER",
    "LUGAR",
    "INCORRECCION",
    "RESPONSABLE",
    "OBSERVACIONES",
    "DETALLE",
  ];

  const headerRowIndex = 6;
  sheet.getRow(headerRowIndex).values = encabezados;
  formatearCabecera(sheet, headerRowIndex, encabezados.length);

  let rowPointer = headerRowIndex + 1;
  data.forEach((registro) => {
    const fila = sheet.getRow(rowPointer);
    fila.values = [
      registro.fecha || "",
      registro.hora || "",
      registro.empresa || "",
      registro.placa || "",
      registro.chofer || "",
      registro.lugar || "",
      registro.incorreccion || "",
      registro.responsable || "",
      registro.observaciones || "",
      obtenerResumenDetalle(registro.detalle),
    ];
    fila.height = 18;
    rowPointer += 1;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const nombreArchivo = `reporte_mamparas_${filtros.mesArchivo}_${filtros.operadorArchivo}.xlsx`;
  saveAsFn(new Blob([buffer]), nombreArchivo);
}

async function exportarExcel() {
  const mes = document.getElementById("mes")?.value;
  const operador = document.getElementById("operador")?.value;

  if (!mes) {
    mostrarModal("error", "Seleccione un mes para generar el reporte.");
    return;
  }

  setExportButtonState(true);
  const [anio, numMes] = mes.split("-");
  const ultimoDia = obtenerUltimoDiaMes(anio, numMes);

  let query = supabase
    .from("inspecciones")
    .select("*")
    .gte("fecha", `${anio}-${numMes}-01`)
    .lte("fecha", `${anio}-${numMes}-${ultimoDia}`)
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true });

  if (operador && operador !== "Todos") {
    query = query.eq("responsable", operador);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error al obtener registros:", error.message);
    mostrarModal("error", "Error al obtener los datos.");
    setExportButtonState(false);
    return;
  }

  if (!data || !data.length) {
    mostrarModal("error", "No hay registros para el filtro seleccionado.");
    setExportButtonState(false);
    return;
  }

  const filtros = {
    mesEtiqueta: `${numMes}/${anio}`,
    operadorEtiqueta: operador || "Todos",
    mesArchivo: `${anio}_${numMes}`,
    operadorArchivo: (operador || "todos").replace(/\s+/g, "_").toLowerCase(),
  };

  try {
    await generarExcel(data, filtros);
    mostrarModal("success", "Reporte generado y descargado exitosamente.");
  } catch (err) {
    console.error("Error generando el Excel:", err);
    mostrarModal("error", "Ocurri\u00F3 un error al generar el archivo.");
  } finally {
    setExportButtonState(false);
  }
}

function initReportes() {
  if (initReportes.iniciado) return;
  const boton = document.getElementById("btnExportarExcel");
  if (!boton) return;

  initReportes.iniciado = true;
  aplicarMesActual();
  cargarOperadores();
  boton.addEventListener("click", exportarExcel);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initReportes);
} else {
  initReportes();
}

// 🚫 NO BORRAR — QA Mamparas
console.log("QA Mamparas: archivo restaurado");
