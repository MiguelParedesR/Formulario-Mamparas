// 🚫 NO BORRAR — Bloque restaurado/corregido del módulo Mamparas
import { supabase, mostrarModal } from "./script.js";

/* ======================================================
   🔵 CARGAR OPERADORES ÚNICOS DESDE SUPABASE
   ====================================================== */
async function cargarOperadores() {
  const { data, error } = await supabase.from("inspecciones").select("responsable");

  if (error) {
    console.error("Error cargando operadores:", error.message);
    return;
  }

  const operadores = [...new Set((data || []).map(r => r.responsable).filter(Boolean))];

  const select = document.getElementById("operador");
  if (!select) return;

  select.innerHTML = `
    <option value="Todos">Todos</option>
    ${operadores.map(op => `<option value="${op}">${op}</option>`).join("")}
  `;
}

document.addEventListener("DOMContentLoaded", cargarOperadores);

/* ======================================================
   🔵 EXPORTAR A EXCEL
   ====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnExportarExcel");
  if (btn) btn.addEventListener("click", exportarExcel);
});

/* ======================================================
   🔵 CREACIÓN DE EXCEL SEGÚN FILTRO
   ====================================================== */
async function exportarExcel() {
  const mes = document.getElementById("mes")?.value;
  const operador = document.getElementById("operador")?.value;

  if (!mes) {
    alert("Seleccione un mes.");
    return;
  }

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
    alert(error ? "Error al obtener los datos." : "No hay registros.");
    return;
  }

  /* -----------------------------
     Crear Excel
     ----------------------------- */
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
    "OBSERVACIONES"
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
      r.observaciones
    ]);
  });

  /* -----------------------------
     DESCARGAR EXCEL
     ----------------------------- */
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer]),
    `reporte_${anio}_${numMes}.xlsx`
  );

  mostrarModal("success", "Reporte generado y descargado exitosamente.");
}

console.log("QA Mamparas: archivo corregido");
