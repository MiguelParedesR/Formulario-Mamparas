// QA Mamparas - NO BORRAR - Bloque restaurado/corregido del modulo Mamparas
import { supabase } from "./script.js";

const TABLA_ID = "tabla-registros";
const BTN_SELECTOR = ".btn-ver-detalle";
const TEXTO_SIN_DETALLE = "Sin detalle registrado.";
const PLACEHOLDER = "--";
const MODAL_ID = "modalVerDetalle";
const PREVIEW_MODAL_ID = "modalDetallePreview";
const PREVIEW_IMG_ID = "modalDetallePreviewImg";

const MODAL_HTML = `
  <div id="modalVerDetalle" class="fixed inset-0 bg-black/60 hidden items-center justify-center px-4 z-50">
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-6 sm:p-8 border border-gray-100 relative max-h-[85vh] overflow-hidden">
      <div class="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
        <div class="space-y-1">
          <p class="text-xs uppercase tracking-[0.35em] text-indigo-500 font-semibold">Detalle</p>
          <h3 class="text-xl font-semibold text-gray-900">Detalle de Inspecci&oacute;n</h3>
          <p class="text-sm text-gray-500">Revisi&oacute;n completa con medidas y evidencias.</p>
        </div>
        <div class="flex items-center gap-2">
          <span id="detalleModalTipoBadge" class="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">--</span>
          <button type="button" data-close-modal="modalVerDetalle" class="text-gray-400 hover:text-gray-700 text-2xl leading-none">
            &times;
          </button>
        </div>
      </div>
      <div class="space-y-6 overflow-y-auto pr-1 max-h-[65vh]">
        <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section class="space-y-3">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-[0.3em]">Datos generales</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p class="text-[11px] uppercase tracking-[0.2em] text-gray-500">Fecha</p>
                <p id="detalleModalFecha" class="text-sm font-semibold text-gray-900">--</p>
              </div>
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p class="text-[11px] uppercase tracking-[0.2em] text-gray-500">Hora</p>
                <p id="detalleModalHora" class="text-sm font-semibold text-gray-900">--</p>
              </div>
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p class="text-[11px] uppercase tracking-[0.2em] text-gray-500">Placa</p>
                <p id="detalleModalPlaca" class="text-sm font-semibold text-gray-900">--</p>
              </div>
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p class="text-[11px] uppercase tracking-[0.2em] text-gray-500">Empresa</p>
                <p id="detalleModalEmpresa" class="text-sm font-semibold text-gray-900">--</p>
              </div>
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p class="text-[11px] uppercase tracking-[0.2em] text-gray-500">Chofer</p>
                <p id="detalleModalChofer" class="text-sm font-semibold text-gray-900">--</p>
              </div>
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p class="text-[11px] uppercase tracking-[0.2em] text-gray-500">Lugar</p>
                <p id="detalleModalLugar" class="text-sm font-semibold text-gray-900">--</p>
              </div>
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p class="text-[11px] uppercase tracking-[0.2em] text-gray-500">Responsable</p>
                <p id="detalleModalOperador" class="text-sm font-semibold text-gray-900">--</p>
              </div>
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 sm:col-span-2">
                <p class="text-[11px] uppercase tracking-[0.2em] text-gray-500">Observaciones</p>
                <p id="detalleModalObservaciones" class="text-sm text-gray-800">--</p>
              </div>
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 sm:col-span-2">
                <p class="text-[11px] uppercase tracking-[0.2em] text-gray-500">Incorreccion</p>
                <p id="detalleModalTipo" class="text-sm font-semibold text-gray-900">--</p>
              </div>
            </div>
          </section>
          <section class="space-y-3">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-[0.3em]">Detalle tecnico</p>
            <div class="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
              <p id="detalleModalTexto" class="text-sm text-gray-700 leading-relaxed">Sin detalle</p>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="rounded-lg bg-slate-50 border border-slate-200 p-2">
                  <p class="text-[10px] uppercase tracking-[0.2em] text-slate-500">Separacion central</p>
                  <p id="detalleModalSeparacion" class="text-sm font-semibold text-slate-900">--</p>
                </div>
                <div class="rounded-lg bg-slate-50 border border-slate-200 p-2">
                  <p class="text-[10px] uppercase tracking-[0.2em] text-slate-500">Medida central</p>
                  <p id="detalleModalMedidaCentral" class="text-sm font-semibold text-slate-900">--</p>
                </div>
                <div class="rounded-lg bg-slate-50 border border-slate-200 p-2">
                  <p class="text-[10px] uppercase tracking-[0.2em] text-slate-500">Altura mampara</p>
                  <p id="detalleModalAltura" class="text-sm font-semibold text-slate-900">--</p>
                </div>
                <div class="rounded-lg bg-slate-50 border border-slate-200 p-2">
                  <p class="text-[10px] uppercase tracking-[0.2em] text-slate-500">Medida altura</p>
                  <p id="detalleModalMedidaAltura" class="text-sm font-semibold text-slate-900">--</p>
                </div>
              </div>
              <div class="rounded-lg bg-slate-50 border border-slate-200 p-2">
                <p class="text-[10px] uppercase tracking-[0.2em] text-slate-500">Observacion</p>
                <p id="detalleModalObservacionTexto" class="text-sm text-slate-700">--</p>
              </div>
            </div>
          </section>
        </div>
        <section class="space-y-3">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-[0.3em]">Evidencias</p>
          <div id="detalleModalImagenes" class="grid grid-cols-2 sm:grid-cols-3 gap-3 min-h-[90px]"></div>
        </section>
      </div>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <button type="button" data-close-modal="modalVerDetalle" class="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-md hover:bg-indigo-700">
          Cerrar
        </button>
      </div>
    </div>
  </div>
`;

const PREVIEW_MODAL_HTML = `
  <div id="modalDetallePreview" class="fixed inset-0 bg-black/70 hidden items-center justify-center px-4 z-[60]">
    <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-4 sm:p-6">
      <button type="button" data-close-preview class="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl leading-none">
        &times;
      </button>
      <img
        id="modalDetallePreviewImg"
        src=""
        alt="Vista ampliada"
        class="w-full max-h-[70vh] object-contain rounded-xl bg-slate-50"
      />
      <p class="text-xs text-center text-gray-500 mt-3">Vista ampliada</p>
    </div>
  </div>
`;

let listenerRegistrado = false;
let escapeListenerRegistrado = false;

function crearBotonVerDetalle(registroCodificado) {
  return `
    <button
      type="button"
      class="btn-ver-detalle flex items-center justify-center w-10 h-10 rounded-full text-white text-base font-semibold shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
      data-registro="${registroCodificado}"
      aria-label="Ver detalle completo"
      aria-haspopup="dialog"
      title="Ver detalle"
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

function manejarClickDetalle(evento) {
  const boton = evento.target.closest(BTN_SELECTOR);
  if (!boton) return;

  const data = boton.getAttribute("data-registro");
  if (!data) return;

  try {
    const registro = JSON.parse(decodeURIComponent(data));
    console.log("QA Mamparas: click detectado en boton Ver", registro?.placa || registro);
    const modalPayload = prepararRegistroParaModal(registro);
    ensureModalEstructura();
    if (typeof window.mostrarDetalleMamparaTabla === "function") {
      window.mostrarDetalleMamparaTabla(modalPayload);
    } else if (typeof window.mostrarDetalle === "function") {
      window.mostrarDetalle(modalPayload);
    } else {
      console.warn("mostrarDetalleMamparaTabla no esta disponible.");
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
  ensureModalEstructura();
  cargarRegistros();
  activarFiltroPlaca();
  vincularDelegadoClicks();
}

function parseDetalle(detalle) {
  if (!detalle) return null;
  if (typeof detalle === "object") return detalle;
  if (typeof detalle !== "string") return null;
  try {
    return JSON.parse(detalle);
  } catch {
    return null;
  }
}

function normalizarNumero(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number.parseFloat(valor);
  return Number.isFinite(numero) ? numero : null;
}

function formatearMedidaTexto(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const texto = String(valor).trim();
  if (!texto) return null;
  return /cm$/i.test(texto) ? texto : `${texto} cm`;
}

function tieneValor(valor) {
  return !(valor === null || valor === undefined || valor === "");
}

function valorPreferido(valor, fallback) {
  return tieneValor(valor) ? valor : fallback;
}

function textoSeguro(valor, fallback = PLACEHOLDER) {
  return tieneValor(valor) ? String(valor) : fallback;
}

function formatearNumero(valor, unidad) {
  if (!tieneValor(valor)) return PLACEHOLDER;
  const numero = Number.parseFloat(valor);
  if (Number.isFinite(numero)) {
    return unidad ? `${numero} ${unidad}` : `${numero}`;
  }
  return String(valor);
}

function prepararRegistroParaModal(registro) {
  const detalleObj = parseDetalle(registro?.detalle);
  const datos = detalleObj?.datos || {};
  const imagenesDetalle = detalleObj?.imagenes || {};
  const textoDetalle = detalleObj
    ? generarTextoDetalle(detalleObj)
    : typeof registro?.detalle === "string"
      ? registro.detalle
      : TEXTO_SIN_DETALLE;

  const separacionRaw = datos.separacion_lateral_central ?? datos.separacion_central;
  const separacionCentral = valorPreferido(registro?.separacion_central, normalizarNumero(separacionRaw));
  const alturaMampara = valorPreferido(registro?.altura_mampara, normalizarNumero(datos.altura_mampara));
  const medidaCentral = valorPreferido(registro?.medida_central, formatearMedidaTexto(separacionRaw));
  const medidaAltura = valorPreferido(registro?.medida_altura, formatearMedidaTexto(datos.altura_mampara));
  const observacionTexto = tieneValor(datos.observacion_texto) ? datos.observacion_texto : null;

  const fotoUnidad =
    registro?.foto_unidad ||
    imagenesDetalle.foto_panoramica_unidad ||
    imagenesDetalle.foto_lateral_central ||
    imagenesDetalle.foto_altura_mampara ||
    null;
  const fotoObservacion = registro?.foto_observacion || imagenesDetalle.foto_observacion || null;

  const imagenes = [fotoUnidad, fotoObservacion, ...Object.values(imagenesDetalle || {})].filter(Boolean);
  const imagenesUnicas = [...new Set(imagenes)];
  const tipoDetalle = registro?.incorreccion || detalleObj?.tipo || "";

  return {
    ...registro,
    incorreccion: tipoDetalle,
    detalle: textoDetalle || TEXTO_SIN_DETALLE,
    separacion_central: separacionCentral,
    medida_central: medidaCentral,
    altura_mampara: alturaMampara,
    medida_altura: medidaAltura,
    observacion_texto: observacionTexto,
    imagenes: imagenesUnicas,
  };
}

function generarTextoDetalle(detalleObj) {
  if (!detalleObj) return null;
  const { tipo, datos = {} } = detalleObj;

  if (tipo === "Mampara") {
    const partes = [
      "Mampara detectada.",
      datos.separacion_lateral_central ? `Separacion central: ${datos.separacion_lateral_central} cm.` : "",
      datos.altura_mampara ? `Altura: ${datos.altura_mampara} cm.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return partes || TEXTO_SIN_DETALLE;
  }

  if (datos.observacion_texto) {
    return `${tipo || "Observacion"}: ${datos.observacion_texto}`;
  }

  return typeof detalleObj === "string" ? detalleObj : TEXTO_SIN_DETALLE;
}

function modalVisible(id) {
  const modal = document.getElementById(id);
  return modal && !modal.classList.contains("hidden");
}

function mostrarModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function ocultarModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function configurarEscapeGlobal() {
  if (escapeListenerRegistrado) return;
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (modalVisible(PREVIEW_MODAL_ID)) {
      cerrarPreviewImagen();
      return;
    }
    if (modalVisible(MODAL_ID)) {
      ocultarModal(MODAL_ID);
    }
  });
  escapeListenerRegistrado = true;
}

function configurarModalDetalle() {
  const modal = document.getElementById(MODAL_ID);
  if (!modal || modal.dataset.ready) return;

  modal.dataset.ready = "true";
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      ocultarModal(MODAL_ID);
    }
  });
  modal.querySelectorAll(`[data-close-modal='${MODAL_ID}']`).forEach((btn) => {
    btn.addEventListener("click", () => ocultarModal(MODAL_ID));
  });
  configurarEscapeGlobal();
}

function configurarModalPreview() {
  const modal = document.getElementById(PREVIEW_MODAL_ID);
  if (!modal || modal.dataset.ready) return;

  modal.dataset.ready = "true";
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      cerrarPreviewImagen();
    }
  });
  modal.querySelectorAll("[data-close-preview]").forEach((btn) => {
    btn.addEventListener("click", cerrarPreviewImagen);
  });
  configurarEscapeGlobal();
}

function ensurePreviewModal() {
  if (!document.getElementById(PREVIEW_MODAL_ID)) {
    document.body.insertAdjacentHTML("beforeend", PREVIEW_MODAL_HTML);
  }
  configurarModalPreview();
}

function ensureModalEstructura() {
  if (!document.getElementById(MODAL_ID)) {
    document.body.insertAdjacentHTML("beforeend", MODAL_HTML);
  }
  ensurePreviewModal();
  configurarModalDetalle();
}

function abrirPreviewImagen(url) {
  if (!url) return;
  ensurePreviewModal();
  const modal = document.getElementById(PREVIEW_MODAL_ID);
  const img = document.getElementById(PREVIEW_IMG_ID);
  if (!modal || !img) return;
  img.src = url;
  mostrarModal(PREVIEW_MODAL_ID);
}

function cerrarPreviewImagen() {
  const img = document.getElementById(PREVIEW_IMG_ID);
  if (img) img.src = "";
  ocultarModal(PREVIEW_MODAL_ID);
}

function asegurarCierreModalGenerico() {
  if (typeof window.cerrarModal === "function") return;
  window.cerrarModal = function (id) {
    ocultarModal(id);
  };
}

if (!window.mostrarDetalleMamparaTabla) {
  window.mostrarDetalleMamparaTabla = function (registro) {
    ensureModalEstructura();
    const modal = document.getElementById(MODAL_ID);
    const textoDetalle = document.getElementById("detalleModalTexto");
    const fecha = document.getElementById("detalleModalFecha");
    const hora = document.getElementById("detalleModalHora");
    const placa = document.getElementById("detalleModalPlaca");
    const empresa = document.getElementById("detalleModalEmpresa");
    const chofer = document.getElementById("detalleModalChofer");
    const lugar = document.getElementById("detalleModalLugar");
    const operador = document.getElementById("detalleModalOperador");
    const observaciones = document.getElementById("detalleModalObservaciones");
    const tipo = document.getElementById("detalleModalTipo");
    const tipoBadge = document.getElementById("detalleModalTipoBadge");
    const separacion = document.getElementById("detalleModalSeparacion");
    const medidaCentral = document.getElementById("detalleModalMedidaCentral");
    const altura = document.getElementById("detalleModalAltura");
    const medidaAltura = document.getElementById("detalleModalMedidaAltura");
    const observacionTexto = document.getElementById("detalleModalObservacionTexto");
    const imagenesContainer = document.getElementById("detalleModalImagenes");

    if (
      !modal ||
      !textoDetalle ||
      !fecha ||
      !hora ||
      !placa ||
      !empresa ||
      !chofer ||
      !lugar ||
      !operador ||
      !observaciones ||
      !tipo ||
      !imagenesContainer ||
      !separacion ||
      !medidaCentral ||
      !altura ||
      !medidaAltura ||
      !observacionTexto
    ) {
      console.error("QA Mamparas: elementos del modal no disponibles.");
      return;
    }

    textoDetalle.textContent = textoSeguro(registro?.detalle, TEXTO_SIN_DETALLE);
    fecha.textContent = textoSeguro(registro?.fecha);
    hora.textContent = textoSeguro(registro?.hora);
    placa.textContent = textoSeguro(registro?.placa);
    empresa.textContent = textoSeguro(registro?.empresa);
    chofer.textContent = textoSeguro(registro?.chofer);
    lugar.textContent = textoSeguro(registro?.lugar);
    operador.textContent = textoSeguro(registro?.responsable);
    observaciones.textContent = textoSeguro(registro?.observaciones);
    tipo.textContent = textoSeguro(registro?.incorreccion);
    if (tipoBadge) {
      tipoBadge.textContent = textoSeguro(registro?.incorreccion);
    }

    separacion.textContent = formatearNumero(registro?.separacion_central, "cm");
    medidaCentral.textContent = textoSeguro(registro?.medida_central);
    altura.textContent = formatearNumero(registro?.altura_mampara, "cm");
    medidaAltura.textContent = textoSeguro(registro?.medida_altura);
    observacionTexto.textContent = textoSeguro(registro?.observacion_texto);

    imagenesContainer.innerHTML = "";
    const imagenes = Array.isArray(registro?.imagenes) ? registro.imagenes : [];
    if (!imagenes.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-gray-500 col-span-full";
      empty.textContent = "No hay evidencias cargadas.";
      imagenesContainer.appendChild(empty);
    } else {
      imagenes.forEach((url, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className =
          "group relative w-full h-28 rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition";
        button.innerHTML = `<img src="${url}" alt="Evidencia ${index + 1}" class="w-full h-full object-cover transition duration-200 group-hover:scale-105" loading="lazy" />`;
        button.addEventListener("click", () => abrirPreviewImagen(url));
        imagenesContainer.appendChild(button);
      });
    }

    mostrarModal(MODAL_ID);
  };
}

asegurarCierreModalGenerico();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initListado);
} else {
  initListado();
}

console.log("QA Mamparas: archivo restaurado");
