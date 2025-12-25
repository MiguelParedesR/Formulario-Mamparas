import { supabase } from "../utils/supabase.js";
import { mostrarDetalleMampara } from "./detalle-modal.js";

const TABLA_ID = "tabla-registros";
const BUSCAR_PLACA_ID = "buscarPlaca";

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
    imagenes: [
      {
        key: "panoramica",
        label: "Foto panoramica",
        labelHtml: "Foto panor&aacute;mica",
        url: fotoPanoramica,
      },
      {
        key: "altura",
        label: "Foto altura",
        labelHtml: "Foto altura",
        url: fotoAltura,
      },
      {
        key: "lateral",
        label: "Foto lateral",
        labelHtml: "Foto lateral",
        url: fotoLateral,
      },
    ],
  };
};

const renderFila = (registro) => {
  const registroDataString = JSON.stringify(registro || {}).replace(/"/g, "&quot;");
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
          class="btn-ver-detalle flex items-center justify-center w-10 h-10 rounded-full text-white shadow-md ring-1 ring-black/10 focus-visible:outline-none focus-visible:ring-2 transition hover:opacity-90"
          data-registro="${registroDataString}"
          title="Ver detalle"
          aria-label="Ver detalle"
          style="background-color: #0b1a2a; border: 1px solid rgba(15,23,42,0.35);"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5.5C7.5 5.5 3.73 8.11 2 12c1.73 3.89 5.5 6.5 10 6.5s8.27-2.61 10-6.5c-1.73-3.89-5.5-6.5-10-6.5Zm0 10.44A3.94 3.94 0 1 1 15.94 12 3.94 3.94 0 0 1 12 15.94Zm0-6.38A2.44 2.44 0 1 0 14.44 12 2.44 2.44 0 0 0 12 9.56Z" fill="currentColor"/>
          </svg>
        </button>
      </td>
    </tr>
  `;
};

const cargarRegistros = async () => {
  const cuerpo = document.getElementById(TABLA_ID);
  if (!cuerpo) return;

  cuerpo.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-gray-500">Cargando registros...</td></tr>';

  const { data, error } = await supabase
    .from("inspecciones")
    .select("*")
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false });

  if (error) {
    console.error("Error al cargar registros:", error.message);
    cuerpo.innerHTML = '<tr><td colspan="9" class="py-3 text-center text-red-600">Error al cargar los datos.</td></tr>';
    return;
  }

  if (!data || !data.length) {
    cuerpo.innerHTML = '<tr><td colspan="9" class="py-3 text-center text-gray-500">No hay registros disponibles.</td></tr>';
    return;
  }

  cuerpo.innerHTML = data.map(renderFila).join("");
};

const activarFiltroPlaca = () => {
  const input = document.getElementById(BUSCAR_PLACA_ID);
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
};

const initRegistros = () => {
  const tabla = document.getElementById(TABLA_ID);
  if (!tabla) return;

  cargarRegistros();
  activarFiltroPlaca();

  document.body.addEventListener("click", (event) => {
    const boton = event.target.closest(".btn-ver-detalle");
    if (!boton?.dataset?.registro) return;

    try {
      const registro = JSON.parse(boton.dataset.registro.replace(/&quot;/g, '"'));
      const payload = construirPayloadDetalle(registro);
      mostrarDetalleMampara(payload);
    } catch (error) {
      console.error("Error parsing registro data from button:", error);
    }
  });
};

initRegistros();
