import { supabase } from "../utils/supabase.js";
import { mostrarDetalleMampara } from "./detalle-modal.js";

const TABLA_ID = "tabla-registros";
const BUSCAR_PLACA_ID = "buscarPlaca";
let registros = [];
let filtroActual = "";

const statusEl = () => document.getElementById("mamparasRecordsStatus");

function mostrarEstado(tipo, mensaje) {
  const el = statusEl();
  if (!el) return;
  el.className = `form-status form-status--${tipo} is-visible`;
  el.textContent = mensaje;
}

function ocultarEstado() {
  const el = statusEl();
  if (!el) return;
  el.className = "form-status";
  el.textContent = "";
}

const normalizarUrl = (valor) => {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  if (!texto || texto === "null" || texto === "undefined") return null;
  return texto;
};

const parseDetalle = (detalle) => {
  if (!detalle) return null;
  if (typeof detalle === "object") return detalle;
  if (typeof detalle !== "string") return null;
  try {
    return JSON.parse(detalle);
  } catch {
    return null;
  }
};

const construirPayloadDetalle = (registro) => {
  const detalleObj = parseDetalle(registro?.detalle) || {};
  const datos = detalleObj?.datos || {};
  const imagenesDetalle = detalleObj?.imagenes || {};
  const tipo = registro?.incorreccion || detalleObj?.tipo || "Mampara";
  const esMampara = String(tipo).toUpperCase() === "MAMPARA";

  const fotoPanoramica =
    normalizarUrl(registro?.foto_unidad) ||
    normalizarUrl(detalleObj.foto_panoramica_unidad) ||
    normalizarUrl(imagenesDetalle.foto_panoramica_unidad) ||
    normalizarUrl(detalleObj.foto_unidad);

  const fotoAltura =
    normalizarUrl(detalleObj.foto_altura_mampara) ||
    normalizarUrl(imagenesDetalle.foto_altura_mampara) ||
    (esMampara ? normalizarUrl(registro?.foto_observacion) : null);

  const fotoLateral =
    normalizarUrl(detalleObj.foto_lateral_central) ||
    normalizarUrl(imagenesDetalle.foto_lateral_central) ||
    normalizarUrl(detalleObj.foto_lateral) ||
    normalizarUrl(imagenesDetalle.foto_lateral);

  const fotoObservacion =
    normalizarUrl(detalleObj.foto_observacion) ||
    normalizarUrl(imagenesDetalle.foto_observacion) ||
    (!esMampara ? normalizarUrl(registro?.foto_observacion) : null);

  const imagenes = esMampara
    ? [
        { key: "panoramica", label: "Foto panorámica", url: fotoPanoramica },
        { key: "altura", label: "Foto de altura", url: fotoAltura },
        { key: "lateral", label: "Foto lateral", url: fotoLateral },
      ]
    : [{ key: "observacion", label: "Foto de observación", url: fotoObservacion }];

  return {
    tipo,
    separacion: esMampara
      ? registro?.separacion_central ??
        detalleObj.separacion_lateral_central ??
        detalleObj.separacion_central ??
        datos.separacion_lateral_central ??
        datos.separacion_central ??
        null
      : null,
    altura: esMampara
      ? registro?.altura_mampara ??
        detalleObj.altura_mampara ??
        datos.altura_mampara ??
        null
      : null,
    observacion: !esMampara
      ? datos.observacion_texto ?? detalleObj.observacion_texto ?? registro?.observaciones ?? ""
      : "",
    imagenes,
  };
};

function escapeHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const renderFila = (registro) => {
  const id = String(registro?.id ?? "");
  return `
    <tr>
      <td>${escapeHtml(registro.fecha || "-")}</td>
      <td>${escapeHtml(registro.hora || "-")}</td>
      <td>${escapeHtml(registro.empresa || "-")}</td>
      <td><strong>${escapeHtml(registro.placa || "-")}</strong></td>
      <td>${escapeHtml(registro.chofer || "-")}</td>
      <td>${escapeHtml(registro.lugar || "-")}</td>
      <td>${escapeHtml(registro.incorreccion || "-")}</td>
      <td>${escapeHtml(registro.responsable || "-")}</td>
      <td>
        <button type="button" class="btn-ver-detalle tpp-btn" data-id="${escapeHtml(id)}">
          <i class="fa-regular fa-eye" aria-hidden="true"></i>
          Ver detalle
        </button>
      </td>
    </tr>
  `;
};

function filtrarRegistros() {
  const filtro = filtroActual.trim().toUpperCase();
  const lista = filtro
    ? registros.filter((registro) => String(registro?.placa || "").toUpperCase().includes(filtro))
    : registros;

  renderRegistros(lista);

  if (filtro && !lista.length) {
    mostrarEstado("warning", `No se encontraron inspecciones para la placa “${filtroActual}”.`);
  } else {
    ocultarEstado();
  }
}

function renderRegistros(lista) {
  const cuerpo = document.getElementById(TABLA_ID);
  if (!cuerpo) return;

  if (!lista.length) {
    cuerpo.innerHTML =
      '<tr><td colspan="9" style="padding:28px;text-align:center;color:#6e6e73">No hay registros disponibles.</td></tr>';
    return;
  }

  cuerpo.innerHTML = lista.map(renderFila).join("");
}

const cargarRegistros = async () => {
  const cuerpo = document.getElementById(TABLA_ID);
  if (!cuerpo) return;

  cuerpo.innerHTML =
    '<tr><td colspan="9" style="padding:28px;text-align:center;color:#6e6e73">Cargando registros…</td></tr>';
  mostrarEstado("info", "Consultando inspecciones…");

  const { data, error } = await supabase
    .from("inspecciones")
    .select("*")
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false });

  if (error) {
    console.error("Error al cargar registros:", error.message);
    registros = [];
    renderRegistros([]);
    mostrarEstado("error", "No se pudieron cargar los registros. Revisa la conexión e inténtalo nuevamente.");
    return;
  }

  registros = Array.isArray(data) ? data : [];
  filtrarRegistros();

  if (!registros.length) {
    mostrarEstado("info", "Aún no existen inspecciones registradas.");
  }
};

const activarFiltroPlaca = () => {
  const input = document.getElementById(BUSCAR_PLACA_ID);
  if (!input) return;

  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
    filtroActual = input.value;
    filtrarRegistros();
  });
};

const initRegistros = () => {
  const tabla = document.getElementById(TABLA_ID);
  if (!tabla || tabla.dataset.bound === "1") return;
  tabla.dataset.bound = "1";

  void cargarRegistros();
  activarFiltroPlaca();

  tabla.addEventListener("click", (event) => {
    const boton = event.target.closest(".btn-ver-detalle");
    const id = boton?.dataset?.id;
    if (!id) return;

    const registro = registros.find((item) => String(item?.id ?? "") === String(id));
    if (!registro) {
      mostrarEstado("error", "No se pudo encontrar el registro seleccionado.");
      return;
    }

    mostrarDetalleMampara(construirPayloadDetalle(registro));
  });
};

initRegistros();
