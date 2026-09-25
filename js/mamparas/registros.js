import { supabase } from "../utils/supabase.js";
import { mostrarDetalleMampara } from "./detalle-modal.js";

const TABLA_ID = "tabla-registros";
const BUSCAR_PLACA_ID = "buscarPlaca";
let registrosCache = [];

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

  const fotoPanoramica =
    normalizarUrl(registro?.foto_unidad) ||
    normalizarUrl(detalleObj.foto_panoramica_unidad) ||
    normalizarUrl(imagenesDetalle.foto_panoramica_unidad) ||
    normalizarUrl(detalleObj.foto_unidad);

  const fotoAltura =
    normalizarUrl(registro?.foto_observacion) ||
    normalizarUrl(detalleObj.foto_altura_mampara) ||
    normalizarUrl(imagenesDetalle.foto_altura_mampara) ||
    normalizarUrl(detalleObj.foto_observacion) ||
    normalizarUrl(imagenesDetalle.foto_observacion);

  const fotoLateral =
    normalizarUrl(detalleObj.foto_lateral_central) ||
    normalizarUrl(imagenesDetalle.foto_lateral_central) ||
    normalizarUrl(detalleObj.foto_lateral) ||
    normalizarUrl(imagenesDetalle.foto_lateral);

  return {
    tipo: registro?.incorreccion || detalleObj?.tipo || "Mampara",
    separacion:
      registro?.separacion_central ??
      detalleObj.separacion_lateral_central ??
      detalleObj.separacion_central ??
      datos.separacion_lateral_central ??
      datos.separacion_central ??
      null,
    altura:
      registro?.altura_mampara ??
      detalleObj.altura_mampara ??
      datos.altura_mampara ??
      null,
    meta: {
      placa: registro?.placa || "—",
      empresa: registro?.empresa || "—",
      fecha: registro?.fecha || "—",
      hora: registro?.hora || "—",
      chofer: registro?.chofer || "—",
      lugar: registro?.lugar || "—",
      responsable: registro?.responsable || "—",
      observaciones: registro?.observaciones || "—",
    },
    imagenes: [
      { key: "panoramica", label: "Foto panorámica", url: fotoPanoramica },
      { key: "altura", label: "Foto altura", url: fotoAltura },
      { key: "lateral", label: "Foto lateral", url: fotoLateral },
    ],
  };
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const renderFila = (registro, index) =>
  '<tr>' +
    '<td>' + escapeHtml(registro.fecha || "-") + '</td>' +
    '<td>' + escapeHtml(registro.hora || "-") + '</td>' +
    '<td>' + escapeHtml(registro.empresa || "-") + '</td>' +
    '<td><strong>' + escapeHtml(registro.placa || "-") + '</strong></td>' +
    '<td>' + escapeHtml(registro.chofer || "-") + '</td>' +
    '<td>' + escapeHtml(registro.lugar || "-") + '</td>' +
    '<td>' + escapeHtml(registro.incorreccion || "-") + '</td>' +
    '<td>' + escapeHtml(registro.responsable || "-") + '</td>' +
    '<td><button type="button" class="btn-ver-detalle" data-index="' + index + '" title="Ver detalle" aria-label="Ver detalle"><i class="fas fa-eye"></i></button></td>' +
  '</tr>';

const cargarRegistros = async () => {
  const cuerpo = document.getElementById(TABLA_ID);
  if (!cuerpo) return;

  cuerpo.innerHTML =
    '<tr><td colspan="9" style="text-align:center;padding:22px;color:#667085">Cargando registros...</td></tr>';

  const { data, error } = await supabase
    .from("inspecciones")
    .select("id,fecha,hora,empresa,placa,chofer,lugar,incorreccion,responsable,observaciones,separacion_central,altura_mampara,foto_unidad,foto_observacion,detalle")
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false });

  if (error) {
    console.error("Error al cargar registros:", error.message);
    registrosCache = [];
    cuerpo.innerHTML =
      '<tr><td colspan="9" style="text-align:center;padding:22px;color:#963c3c">No se pudieron cargar los registros.</td></tr>';
    return;
  }

  registrosCache = Array.isArray(data) ? data : [];
  if (!registrosCache.length) {
    cuerpo.innerHTML =
      '<tr><td colspan="9" style="text-align:center;padding:22px;color:#667085">No hay registros disponibles.</td></tr>';
    return;
  }

  cuerpo.innerHTML = registrosCache.map(renderFila).join("");
};

const activarFiltroPlaca = () => {
  const input = document.getElementById(BUSCAR_PLACA_ID);
  if (!input) return;

  input.addEventListener("input", function () {
    const filtro = this.value.trim().toUpperCase();
    const filas = document.querySelectorAll("#" + TABLA_ID + " tr");

    filas.forEach((fila) => {
      const celdaPlaca = fila.cells?.[3];
      if (!celdaPlaca) return;
      const coincide = celdaPlaca.textContent.toUpperCase().includes(filtro);
      fila.style.display = coincide ? "" : "none";
    });
  });
};

const initRegistros = () => {
  const tabla = document.getElementById(TABLA_ID);
  if (!tabla) return;

  void cargarRegistros();
  activarFiltroPlaca();

  document.body.addEventListener("click", (event) => {
    const boton = event.target.closest(".btn-ver-detalle");
    if (!boton) return;

    const index = Number(boton.dataset.index);
    const registro = registrosCache[index];
    if (!registro) return;

    mostrarDetalleMampara(construirPayloadDetalle(registro));
  });
};

initRegistros();
