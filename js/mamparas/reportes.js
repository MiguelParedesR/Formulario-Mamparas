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

  select.innerHTML = '<option value="">Cargando operadores...</option>';

  const { data, error } = await supabase.from("inspecciones").select("responsable");
  let operadores = [];

  if (!error && data) {
    operadores = [
      ...new Set(
        data
          .map((r) => (r?.responsable || "").trim())
          .filter((valor) => valor && valor.length > 0)
      ),
    ];
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

function initReportes() {
  cargarOperadores();

  const btn = document.getElementById("btnExportarExcel");
  if (btn && !btn.dataset.listenerAttached) {
    btn.addEventListener("click", exportarExcel);
    btn.dataset.listenerAttached = "true";
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initReportes);
} else {
  initReportes();
}

// 🚫 NO BORRAR — Exportación Excel funcional
async function exportarExcel() {
  const mes = document.getElementById("mes")?.value;
  const operador = document.getElementById("operador")?.value;

  if (!mes) {
    mostrarModal("error", "Seleccione un mes para generar el reporte.");
    return;
  }

  setExportButtonState(true);

  const [anio, numMes] = mes.split("-");

  let query = supabase
    .from("inspecciones")
    .select("*")
    .gte("fecha", `${anio}-${numMes}-01`)
    .lte("fecha", `${anio}-${numMes}-31`);

  if (operador && operador !== "Todos") {
    query = query.eq("responsable", operador);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    mostrarModal("error", error ? "Error al obtener los datos." : "No hay registros para el filtro seleccionado.");
    setExportButtonState(false);
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Reporte");

  sheet.addRow([
    "FECHA",
    "HORA",
    "EMPRESA",
    "PLACA",
    "CHOFER",
    "LUGAR",
    "INCORRECCION",
    "RESPONSABLE",
    "OBSERVACIONES",
  ]);

  data.forEach((r) => {
    sheet.addRow([
      r.fecha,
      r.hora,
      r.empresa,
      r.placa,
      r.chofer,
      r.lugar,
      r.incorreccion,
      r.responsable,
      r.observaciones,
    ]);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `reporte_${anio}_${numMes}.xlsx`);

  setExportButtonState(false);
  mostrarModal("success", "Reporte generado y descargado exitosamente.");
}

console.log("QA Mamparas: archivo corregido");
