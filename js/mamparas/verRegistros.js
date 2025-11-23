// 🚫 NO BORRAR — Bloque restaurado/corregido del módulo Mamparas

function crearFila(label, value) {
  return `
    <tr>
      <th class="text-left text-gray-500 text-xs uppercase tracking-wide py-1 pr-3">${label}</th>
      <td class="text-sm text-gray-800 py-1">${value || "-"}</td>
    </tr>
  `;
}

function normalizarDetalle(detalle) {
  if (!detalle) return {};
  if (typeof detalle === "string") {
    try {
      return JSON.parse(detalle || "{}");
    } catch (error) {
      console.error("Detalle inv\u00E1lido:", error);
      return {};
    }
  }
  return detalle;
}

function crearMiniatura(url, etiqueta) {
  if (!url) return "";
  return `
    <button
      type="button"
      class="w-24 h-24 rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:scale-105 transition"
      onclick="verImagenAmpliada('${url}')"
    >
      <img src="${url}" alt="${etiqueta}" class="w-full h-full object-cover" loading="lazy" />
    </button>
  `;
}

window.mostrarDetalle = function (registro) {
  const modal = document.getElementById("detalleModal");
  const general = document.getElementById("detalleGeneral");
  const detalleTabla = document.getElementById("detalleContenido");
  const contImagenes = document.getElementById("detalleImagenes");

  if (!modal || !general || !detalleTabla || !contImagenes) return;

  const det = normalizarDetalle(registro?.detalle);
  const generalRows = [
    crearFila("Fecha", registro?.fecha),
    crearFila("Hora", registro?.hora),
    crearFila("Empresa", registro?.empresa),
    crearFila("Placa", registro?.placa),
    crearFila("Chofer", registro?.chofer),
    crearFila("Lugar", registro?.lugar),
    crearFila("Incorrecci\u00F3n", registro?.incorreccion),
    crearFila("Responsable", registro?.responsable),
    crearFila("Observaciones", registro?.observaciones),
  ];

  general.innerHTML = generalRows.join("");

  if (!det || !det.tipo) {
    detalleTabla.innerHTML = crearFila("Detalle", "Sin informaci\u00F3n registrada.");
    contImagenes.innerHTML = "";
    modal.style.display = "flex";
    modal.classList.remove("hidden");
    return;
  }

  if (det.tipo === "Mampara") {
    detalleTabla.innerHTML = [
      crearFila("Tipo de detalle", det.tipo),
      crearFila("Separaci\u00F3n lateral (cm)", det?.datos?.separacion_lateral_central),
      crearFila("Altura de mampara (cm)", det?.datos?.altura_mampara),
    ].join("");
  } else {
    detalleTabla.innerHTML = [
      crearFila("Tipo de detalle", det.tipo),
      crearFila("Observaci\u00F3n", det?.datos?.observacion_texto),
    ].join("");
  }

  const imagenes = det?.imagenes || {};
  const miniaturas = Object.entries(imagenes)
    .map(([clave, url]) => crearMiniatura(url, clave))
    .filter(Boolean)
    .join("");

  contImagenes.innerHTML = miniaturas || '<p class="text-sm text-gray-500">No hay evidencias cargadas.</p>';

  modal.style.display = "flex";
  modal.classList.remove("hidden");
};

window.verImagenAmpliada = function (url) {
  const modal = document.getElementById("imagenAmpliada");
  const img = document.getElementById("imagenAmpliadaSrc");
  if (!modal || !img) return;
  img.src = url;
  modal.style.display = "flex";
  modal.classList.remove("hidden");
};

window.cerrarDetalle = function () {
  const modal = document.getElementById("detalleModal");
  if (modal) {
    modal.style.display = "none";
  }
};

window.cerrarImagenAmpliada = function () {
  const modal = document.getElementById("imagenAmpliada");
  if (modal) modal.style.display = "none";
};

// 🚫 NO BORRAR — QA Mamparas
console.log("QA Mamparas: archivo restaurado");
