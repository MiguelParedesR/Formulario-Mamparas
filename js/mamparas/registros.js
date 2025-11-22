// 🚫 NO BORRAR — Bloque restaurado/corregido del módulo Mamparas
import { supabase } from "./script.js";

/* ========================================
   🔵 RENDERIZAR UNA FILA DE LA TABLA
   ======================================== */
function renderFila(reg) {
  const detalleObj =
    typeof reg.detalle === "string"
      ? JSON.parse(reg.detalle || "{}")
      : reg.detalle || {};

  return `
    <tr class="hover:bg-gray-100 transition">
        <td>${reg.fecha || ""}</td>
        <td>${reg.hora || ""}</td>
        <td>${reg.empresa || ""}</td>
        <td>${reg.placa || ""}</td>
        <td>${reg.chofer || ""}</td>
        <td>${reg.lugar || ""}</td>
        <td>${reg.incorreccion || ""}</td>
        <td>${reg.responsable || ""}</td>

        <td>
            <button 
              class="px-3 py-1 bg-indigo-600 text-white rounded text-xs"
              onclick='mostrarDetalle(${JSON.stringify(detalleObj)})'>
              Ver
            </button>
        </td>
    </tr>
  `;
}

/* ========================================
   🔵 CARGAR REGISTROS DESDE SUPABASE
   ======================================== */
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

/* ========================================
   🔵 FILTRO POR PLACA
   ======================================== */
function activarFiltroPlaca() {
  const input = document.getElementById("buscarPlaca");
  if (!input) return;

  input.addEventListener("input", function () {
    const filtro = this.value.toUpperCase();
    const filas = document.querySelectorAll("#tabla-registros tr");

    filas.forEach((fila) => {
      const celda = fila.cells[3];
      fila.style.display =
        celda && celda.textContent.toUpperCase().includes(filtro)
          ? ""
          : "none";
    });
  });
}

/* ========================================
   🔵 INICIALIZACIÓN
   ======================================== */
function initListado() {
  cargarRegistros();
  activarFiltroPlaca();
  console.log("QA Mamparas: archivo corregido");
}

/* ========================================
   🔵 AUTO-EJECUCIÓN
   ======================================== */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initListado);
} else {
  initListado();
}
