/* ============================================================================
   REGISTROS.JS — Tabla Global de Incidencias TPP
   - Conexión real a Supabase
   - Búsqueda por placa
   - Barra de progreso
   - Navegación SPA (sidebar-loader)
   ============================================================================ */

import { supabase } from "../utils/supabase.js";
import {
  calcularProgresoInforme,
  obtenerEstadoListado,
} from "../dashboard/progreso.js";

/* ===============================
   VARIABLES
   =============================== */
let incidencias = [];
const tablaBody = document.querySelector("#tabla-registros tbody");
const inputBuscar = document.getElementById("buscarPlaca");

/* ===============================
   CARGAR DATOS DESDE SUPABASE
   =============================== */
async function cargarIncidencias() {
  const { data, error } = await supabase
    .from("incidencias")
    .select("*")
    .order("fecha_informe", { ascending: false });

  if (error) {
    console.error("❌ Error cargando incidencias:", error);
    incidencias = [];
    return;
  }

  incidencias = data;
}

/* ===============================
   FILTRO POR PLACA
   =============================== */
function aplicarFiltro(texto) {
  const filtro = texto.toLowerCase();

  const filtradas = incidencias.filter((inc) =>
    (inc.campos?.placa || "").toLowerCase().includes(filtro)
  );

  renderTabla(filtradas);
}

/* ===============================
   RENDER TABLA GLOBAL
   =============================== */
function renderTabla(lista) {
  if (!tablaBody) return;

  tablaBody.innerHTML = "";

  if (lista.length === 0) {
    tablaBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4 text-gray-500">
                    No hay registros para mostrar
                </td>
            </tr>`;
    return;
  }

  lista.forEach((inc) => {
    const estado = obtenerEstadoListado(inc);
    const tr = document.createElement("tr");
    tr.className = "hover:bg-gray-50 transition";

    tr.innerHTML = `
            <td class="px-3 py-2 text-sm">${inc.fecha_informe || "-"}</td>
            <td class="px-3 py-2 text-sm">${inc.tipo_incidencia || "-"}</td>
            <td class="px-3 py-2 text-sm">${inc.campos?.placa || "-"}</td>
            <td class="px-3 py-2 text-sm">${inc.campos?.contenedor || "-"}</td>

            <!-- Progreso -->
            <td class="px-3 py-2">
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="h-2 rounded-full ${
                      estado.color
                    }" style="width:${estado.porcentaje}%"></div>
                </div>
                <span class="text-xs text-gray-600">${estado.porcentaje}%</span>
            </td>

            <!-- Estado -->
            <td class="px-3 py-2 text-sm font-semibold ${
              estado.estado === "COMPLETO" ? "text-green-600" : "text-amber-600"
            }">
                ${estado.estado}
            </td>

            <!-- Acciones -->
            <td class="px-3 py-2 text-sm flex gap-2">
                <button class="ver-btn px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
                        data-id="${inc.id}">
                    Ver / Editar
                </button>
            </td>
        `;

    tablaBody.appendChild(tr);
  });

  activarBotones();
}

/* ===============================
   ACCIONES DE FILA
   =============================== */
function activarBotones() {
  document.querySelectorAll(".ver-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      abrirIncidencia(id);
    });
  });
}

/* ===============================
   NAVEGACIÓN A ver-incidencia.html
   =============================== */
function abrirIncidencia(id) {
  const url = `./html/ver-incidencia.html?id=${encodeURIComponent(id)}`;

  window.dispatchEvent(new CustomEvent("sidebar:navigate", { detail: url }));
}

/* ===============================
   EXPORTACIÓN (SI NECESITAS LUEGO)
   =============================== */
export function obtenerDatosTabla() {
  return incidencias.map((inc) => {
    const prog = calcularProgresoInforme(inc);

    return {
      fecha_informe: inc.fecha_informe,
      tipo: inc.tipo_incidencia,
      placa: inc.campos?.placa,
      contenedor: inc.campos?.contenedor,
      progreso: prog.porcentaje,
      estado: prog.estado,
    };
  });
}

/* ===============================
   INICIO
   =============================== */
async function initRegistros() {
  await cargarIncidencias();
  renderTabla(incidencias);

  if (inputBuscar) {
    inputBuscar.addEventListener("input", () => {
      aplicarFiltro(inputBuscar.value.trim());
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRegistros);
} else {
  initRegistros();
}
