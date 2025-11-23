// 🚫 NO BORRAR — Bloque restaurado/corregido del módulo Mamparas
import { supabase } from "./script.js";

function renderFila(registro) {
  const registroCodificado = encodeURIComponent(JSON.stringify(registro || {}));
  return `
    <tr class="odd:bg-gray-50 even:bg-white text-gray-700 text-sm leading-relaxed">
      <td class="px-3 py-2">${registro.fecha || "-"}</td>
      <td class="px-3 py-2">${registro.hora || "-"}</td>
      <td class="px-3 py-2">${registro.empresa || "-"}</td>
      <td class="px-3 py-2 font-semibold text-gray-900">${registro.placa || "-"}</td>
      <td class="px-3 py-2">${registro.chofer || "-"}</td>
      <td class="px-3 py-2">${registro.lugar || "-"}</td>
      <td class="px-3 py-2">${registro.incorreccion || "-"}</td>
      <td class="px-3 py-2">${registro.responsable || "-"}</td>
      <td class="px-3 py-2 text-center">
        <button
          type="button"
          class="btn-ver-detalle inline-flex items-center justify-center min-h-[36px] w-10 h-10 bg-blue-600 text-white rounded-full text-base hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Ver registro"
          data-registro="${registroCodificado}"
        >
          <i class="fas fa-eye"></i>
        </button>
      </td>
    </tr>
  `;
}

async function cargarRegistros() {
  const cuerpo = document.getElementById("tabla-registros");
  if (!cuerpo) return;

  cuerpo.innerHTML = `
    <tr>
      <td colspan="9" class="text-center py-4 text-gray-500">Cargando registros...</td>
    </tr>
  `;

  const { data, error } = await supabase
    .from("inspecciones")
    .select("*")
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false });

  if (error) {
    console.error("Error al cargar registros:", error.message);
    cuerpo.innerHTML =
      '<tr><td colspan="9" class="py-3 text-center text-red-600">Error al cargar los datos.</td></tr>';
    return;
  }

  if (!data || !data.length) {
    cuerpo.innerHTML =
      '<tr><td colspan="9" class="py-3 text-center text-gray-500">No hay registros disponibles.</td></tr>';
    return;
  }

  cuerpo.innerHTML = data.map(renderFila).join("");
}

function activarFiltroPlaca() {
  const input = document.getElementById("buscarPlaca");
  if (!input) return;

  input.addEventListener("input", function () {
    const filtro = this.value.trim().toUpperCase();
    const filas = document.querySelectorAll("#tabla-registros tr");

    filas.forEach((fila) => {
      const celdaPlaca = fila.cells?.[3];
      if (!celdaPlaca) return;
      const coincide = celdaPlaca.textContent.toUpperCase().includes(filtro);
      fila.style.display = coincide ? "" : "none";
    });
  });
}

function manejarClickDetalle(evento) {
  const boton = evento.target.closest(".btn-ver-detalle");
  if (!boton) return;

  const data = boton.getAttribute("data-registro");
  if (!data) return;

  try {
    const registro = JSON.parse(decodeURIComponent(data));
    if (typeof window.mostrarDetalle === "function") {
      window.mostrarDetalle(registro);
    }
  } catch (error) {
    console.error("Error al interpretar el registro seleccionado:", error);
  }
}

function initListado() {
  if (initListado.iniciado) return;
  const tabla = document.getElementById("tabla-registros");
  if (!tabla) return;

  initListado.iniciado = true;
  cargarRegistros();
  activarFiltroPlaca();
  document.addEventListener("click", manejarClickDetalle);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initListado);
} else {
  initListado();
}

// 🚫 NO BORRAR — QA Mamparas
console.log("QA Mamparas: archivo restaurado");
