// 🚫 NO BORRAR — Bloque restaurado/corregido del módulo Mamparas
import { supabase } from "./script.js";

function renderFila(reg) {
  const detalleObj =
    typeof reg.detalle === "string" ? JSON.parse(reg.detalle || "{}") : reg.detalle || {};

  return `
    <tr class="odd:bg-gray-50 even:bg-white text-gray-700 text-sm sm:text-base leading-relaxed transition">
        <td class="px-4 py-2 min-w-[120px]">${reg.fecha || ""}</td>
        <td class="px-4 py-2 min-w-[120px]">${reg.hora || ""}</td>
        <td class="px-4 py-2 min-w-[100px] hidden sm:table-cell">${reg.empresa || ""}</td>
        <td class="px-4 py-2 min-w-[100px] font-semibold text-gray-900">${reg.placa || ""}</td>
        <td class="px-4 py-2 min-w-[180px]">${reg.chofer || ""}</td>
        <td class="px-4 py-2 min-w-[130px] hidden sm:table-cell">${reg.lugar || ""}</td>
        <td class="px-4 py-2 min-w-[130px] hidden sm:table-cell">${reg.incorreccion || ""}</td>
        <td class="px-4 py-2 min-w-[130px] hidden sm:table-cell">${reg.responsable || ""}</td>

        <td class="px-4 py-2 min-w-[80px] text-center">
            <button
              class="min-h-[36px] px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Ver registro"
              onclick='mostrarDetalle(${JSON.stringify(detalleObj)})'>
              Ver
            </button>
        </td>
    </tr>
  `;
}

async function cargarRegistros() {
  const cuerpo = document.getElementById("tabla-registros");
  if (!cuerpo) return;

  cuerpo.innerHTML = `
    <tr><td colspan="9" class="text-center py-4 text-gray-500">
      Cargando registros...
    </td></tr>
  `;

  const { data, error } = await supabase
    .from("inspecciones")
    .select("*")
    .order("fecha", { ascending: false });

  if (error) {
    console.error("Error al cargar registros:", error.message);
    cuerpo.innerHTML =
      '<tr><td colspan="9" class="py-3 text-center text-red-600">Error al cargar datos</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    cuerpo.innerHTML =
      '<tr><td colspan="9" class="py-3 text-center text-gray-500">No hay registros disponibles</td></tr>';
    return;
  }

  cuerpo.innerHTML = data.map(renderFila).join("");
}

function activarFiltroPlaca() {
  const input = document.getElementById("buscarPlaca");
  if (!input) return;

  input.addEventListener("input", function () {
    const filtro = this.value.toUpperCase();
    const filas = document.querySelectorAll("#tabla-registros tr");

    filas.forEach((fila) => {
      const celda = fila.cells[3];
      fila.style.display = celda && celda.textContent.toUpperCase().includes(filtro) ? "" : "none";
    });
  });
}

function initListado() {
  cargarRegistros();
  activarFiltroPlaca();
  console.log("QA Mamparas: archivo corregido");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initListado);
} else {
  initListado();
}
