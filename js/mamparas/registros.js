// 🚫 NO BORRAR — Bloque restaurado/corregido del módulo Mamparas
import { supabase } from "./script.js";

const TABLA_ID = "tabla-registros";
const BTN_SELECTOR = ".btn-ver-detalle";
const TEXTO_SIN_DETALLE = "Sin detalle registrado.";

const MODAL_HTML = `
  <div id="modalVerDetalle" class="fixed inset-0 bg-black/50 hidden items-center justify-center px-4 z-50">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 border border-gray-100">
      <div class="flex items-center justify-between border-b border-gray-200 pb-2">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-indigo-500 font-semibold">Detalle</p>
          <h3 class="text-lg font-semibold text-gray-900">Detalle de Inspección</h3>
        </div>
        <button data-close-modal="modalVerDetalle" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">
          &times;
        </button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
        <p><strong>Fecha:</strong> <span id="detalleModalFecha">--</span></p>
        <p><strong>Placa:</strong> <span id="detalleModalPlaca">--</span></p>
        <p><strong>Operador:</strong> <span id="detalleModalOperador">--</span></p>
        <p><strong>Incorrección:</strong> <span id="detalleModalTipo">--</span></p>
      </div>
      <div class="space-y-2">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-[0.3em]">Descripción</p>
        <p id="detalleModalTexto" class="text-gray-800 text-sm leading-relaxed">Sin detalle</p>
      </div>
      <div class="space-y-2">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-[0.3em]">Evidencias</p>
        <div id="detalleModalImagenes" class="imagenes-detalle flex flex-wrap gap-3 border border-dashed border-gray-200 rounded-2xl p-3 min-h-[90px]"></div>
      </div>
      <div class="flex justify-end pt-2">
        <button type="button" data-close-modal="modalVerDetalle" class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-md hover:bg-indigo-700">
          Cerrar
        </button>
      </div>
    </div>
  </div>
`;

function crearBotonVerDetalle(registroCodificado) {
  return `
    <button
      type="button"
      class="btn-ver-detalle flex items-center justify-center w-10 h-10 rounded-full text-white text-base font-semibold shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
      data-registro="${registroCodificado}"
      aria-label="Ver detalle completo"
      style="background-color:#2563eb;transition:background-color .2s ease,transform .2s ease;position:relative;z-index:10;"
      onmouseenter="this.style.backgroundColor='#1d4ed8';this.style.transform='scale(1.05)';"
      onmouseleave="this.style.backgroundColor='#2563eb';this.style.transform='scale(1)';"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 5.5C7.5 5.5 3.73 8.11 2 12c1.73 3.89 5.5 6.5 10 6.5s8.27-2.61 10-6.5c-1.73-3.89-5.5-6.5-10-6.5Zm0 10.44A3.94 3.94 0 1 1 15.94 12 3.94 3.94 0 0 1 12 15.94Zm0-6.38A2.44 2.44 0 1 0 14.44 12 2.44 2.44 0 0 0 12 9.56Z"
          fill="currentColor"
        />
      </svg>
    </button>
  `;
}

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
        ${crearBotonVerDetalle(registroCodificado)}
      </td>
    </tr>
  `;
}

async function cargarRegistros() {
  const cuerpo = document.getElementById(TABLA_ID);
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
  console.log(`QA Mamparas: tabla renderizada (${data.length} registros)`);
}

function activarFiltroPlaca() {
  const input = document.getElementById("buscarPlaca");
  if (!input) return;

  input.addEventListener("input", function () {
    const filtro = this.value.trim().toUpperCase();
    const filas = document.querySelectorAll(`#${TABLA_ID} tr`);

    filas.forEach((fila) => {
      const celdaPlaca = fila.cells?.[3];
      if (!celdaPlaca) return;
      const coincide = celdaPlaca.textContent.toUpperCase().includes(filtro);
      fila.style.display = coincide ? "" : "none";
    });
  });
}

let listenerRegistrado = false;

function manejarClickDetalle(evento) {
  const boton = evento.target.closest(BTN_SELECTOR);
  if (!boton) return;

  const data = boton.getAttribute("data-registro");
  if (!data) return;

  try {
    const registro = JSON.parse(decodeURIComponent(data));
    console.log("QA Mamparas: click detectado en botón Ver", registro?.placa || registro);
    const modalPayload = prepararRegistroParaModal(registro);
    ensureModalEstructura();
    if (typeof window.mostrarDetalleMamparaTabla === "function") {
      window.mostrarDetalleMamparaTabla(modalPayload);
    } else if (typeof window.mostrarDetalle === "function") {
      window.mostrarDetalle(modalPayload);
    } else {
      console.warn("mostrarDetalleMamparaTabla no está disponible.");
    }
  } catch (error) {
    console.error("Error al interpretar el registro seleccionado:", error);
  }
}

function vincularDelegadoClicks() {
  if (listenerRegistrado) return;
  document.addEventListener("click", manejarClickDetalle);
  listenerRegistrado = true;
  console.log("QA Mamparas: listener global para botones 'Ver' registrado.");
}

function initListado() {
  const tabla = document.getElementById(TABLA_ID);
  if (!tabla) return;

  if (initListado.iniciado) {
    tabla.innerHTML = "";
  }

  initListado.iniciado = true;
  cargarRegistros();
  activarFiltroPlaca();
  vincularDelegadoClicks();
}

function prepararRegistroParaModal(registro) {
  let textoDetalle = typeof registro.detalle === "string" ? registro.detalle : TEXTO_SIN_DETALLE;
  let imagenes = [];

  if (registro.detalle && typeof registro.detalle === "string") {
    try {
      const detalleObj = JSON.parse(registro.detalle);
      if (detalleObj && typeof detalleObj === "object") {
        textoDetalle = generarTextoDetalle(detalleObj) || textoDetalle;
        imagenes = Object.values(detalleObj.imagenes || {}).filter(Boolean);
      }
    } catch {
      // Mantener el texto original
    }
  }

  return {
    ...registro,
    detalle: textoDetalle || TEXTO_SIN_DETALLE,
    foto1: imagenes[0] || registro.foto1 || null,
    foto2: imagenes[1] || registro.foto2 || null,
  };
}

function generarTextoDetalle(detalleObj) {
  if (!detalleObj) return null;
  const { tipo, datos = {} } = detalleObj;

  if (tipo === "Mampara") {
    const partes = [
      "Mampara detectada.",
      datos.separacion_lateral_central ? `Separación lateral: ${datos.separacion_lateral_central} cm.` : "",
      datos.altura_mampara ? `Altura: ${datos.altura_mampara} cm.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return partes || TEXTO_SIN_DETALLE;
  }

  if (datos.observacion_texto) {
    return `${tipo || "Observación"}: ${datos.observacion_texto}`;
  }

  return typeof detalleObj === "string" ? detalleObj : TEXTO_SIN_DETALLE;
}

function ensureModalEstructura() {
  if (document.getElementById("modalVerDetalle")) return;
  document.body.insertAdjacentHTML("beforeend", MODAL_HTML);
  document.querySelectorAll("[data-close-modal='modalVerDetalle']").forEach((btn) => {
    btn.addEventListener("click", () => cerrarModal("modalVerDetalle"));
  });
}

function asegurarCierreModalGenerico() {
  if (typeof window.cerrarModal === "function") return;
  window.cerrarModal = function (id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("hidden");
    modal.style.display = "none";
  };
}

if (!window.mostrarDetalleMamparaTabla) {
  window.mostrarDetalleMamparaTabla = function (registro) {
    ensureModalEstructura();
    const modal = document.getElementById("modalVerDetalle");
    const textoDetalle = document.getElementById("detalleModalTexto");
    const fecha = document.getElementById("detalleModalFecha");
    const placa = document.getElementById("detalleModalPlaca");
    const operador = document.getElementById("detalleModalOperador");
    const tipo = document.getElementById("detalleModalTipo");
    const imagenesContainer = document.getElementById("detalleModalImagenes");

    if (!modal || !textoDetalle || !fecha || !placa || !operador || !tipo || !imagenesContainer) {
      console.error("QA Mamparas: elementos del modal no disponibles.");
      return;
    }

    imagenesContainer.innerHTML = "";
    textoDetalle.textContent = registro?.detalle || TEXTO_SIN_DETALLE;
    fecha.textContent = registro?.fecha || "–";
    placa.textContent = registro?.placa || "–";
    operador.textContent = registro?.responsable || "–";
    tipo.textContent = registro?.incorreccion || "–";

    [registro?.foto1, registro?.foto2]
      .filter(Boolean)
      .forEach((url) => {
        const img = document.createElement("img");
        img.src = url;
        img.alt = `Evidencia ${registro?.placa || ""}`;
        img.className =
          "imagen-detalle w-28 h-28 object-cover rounded-xl border border-gray-200 shadow-sm hover:scale-105 transition";
        imagenesContainer.appendChild(img);
      });

    modal.style.display = "flex";
    modal.classList.remove("hidden");
  };
}

asegurarCierreModalGenerico();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initListado);
} else {
  initListado();
}

// 🚫 NO BORRAR — QA Mamparas
console.log("QA Mamparas: archivo restaurado");
