// ðŸš« NO BORRAR â€” Bloque restaurado/corregido del mÃ³dulo Mamparas
import { supabase } from "../utils/supabase.js";
export { supabase };

const STORAGE_BUCKET = "mamparas";
const VALIDACION_PLACA_DELAY = 450;
const MIN_PLACA_LENGTH = 5;

let actualizarEmpresaPersonalizadaFn = null;
let actualizarBotonDetalleFn = null;

const toggleHidden = (el, hidden) => {
  if (!el) return;
  el.classList.toggle("hidden", hidden);
};

const showModalOverlay = (el) => {
  if (!el) return;
  el.classList.remove("hidden");
  el.classList.add("flex");
};

const hideModalOverlay = (el) => {
  if (!el) return;
  el.classList.add("hidden");
  el.classList.remove("flex");
};

const bindEscClose = (modal, handler) => {
  if (!modal || typeof handler !== "function") return;
  const listener = (ev) => {
    if (ev.key === "Escape" && !modal.classList.contains("hidden")) handler();
  };
  document.addEventListener("keydown", listener);
  return listener;
};

const feedbackCloseBtn = document.querySelector("[data-close-feedback]");
if (feedbackCloseBtn) {
  feedbackCloseBtn.addEventListener("click", () =>
    hideModalOverlay(document.getElementById("feedbackModal"))
  );
}

export function mostrarModal(tipo, mensaje) {
  const feedbackModal = document.getElementById("feedbackModal");
  const loader = document.getElementById("loadingAnimation");
  const msg = document.getElementById("feedbackMessage");
  if (!feedbackModal || !loader || !msg) return;

  showModalOverlay(feedbackModal);
  toggleHidden(loader, false);
  toggleHidden(msg, true);

  setTimeout(() => {
    toggleHidden(loader, true);
    toggleHidden(msg, false);
    msg.textContent = mensaje;
    const colorClass = tipo === "error" ? "text-red-600" : "text-green-600";
    msg.className = `message text-sm font-medium ${colorClass}`;
  }, 500);

  setTimeout(() => {
    hideModalOverlay(feedbackModal);
  }, 4500);
}

const feedbackModalEl = document.getElementById("feedbackModal");
if (feedbackModalEl) {
  feedbackModalEl.addEventListener("click", (ev) => {
    if (ev.target === feedbackModalEl) hideModalOverlay(feedbackModalEl);
  });
}

function cerrarTodosLosModales() {
  document
    .querySelectorAll(".modal-overlay, #modalPreview, #feedbackModal, #modalPlacaExistente, #detalleModal")
    .forEach((modal) => modal.classList.add("hidden"));
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^\w.\-]/g, "_");
}

export async function subirImagen(nombreCampo, archivo) {
  if (!archivo) return null;

  if (archivo.size > 50 * 1024 * 1024) {
    alert("La imagen excede los 50MB permitidos.");
    return null;
  }

  if (!archivo.type.startsWith("image/")) {
    alert("Solo se permiten archivos de imagen.");
    return null;
  }

  const nombreLimpio = sanitizeFileName(archivo.name.toLowerCase());
  const rutaArchivo = `imagenes/${nombreCampo}-${Date.now()}-${nombreLimpio}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(rutaArchivo, archivo, { contentType: archivo.type, upsert: false });

  if (error) {
    console.error("Error al subir la imagen:", error.message);
    mostrarModal("error", "Error al subir una imagen.");
    return null;
  }

  const { data, error: errorUrl } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(rutaArchivo);
  if (errorUrl) {
    console.error("Error obteniendo URL p\u00FAblica:", errorUrl.message);
    mostrarModal("error", "No se pudo obtener la URL p\u00FAblica.");
    return null;
  }

  return data.publicUrl;
}

async function subirDetalleJSONArchivo(detalle, placa) {
  try {
    const jsonString = JSON.stringify(detalle, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const ruta = `detalles/${placa || "sinplaca"}-${Date.now()}.json`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(ruta, blob, { contentType: "application/json", upsert: false });

    if (error) throw error;

    const { data, error: errorUrl } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(ruta);
    if (errorUrl) throw errorUrl;

    return {
      bucket: STORAGE_BUCKET,
      path: ruta,
      publicUrl: data?.publicUrl || "",
    };
  } catch (error) {
    console.error("Error al subir el detalle JSON:", error.message || error);
    return null;
  }
}

export async function getImageBase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error al cargar imagen: ${url}`);
    const arrayBuffer = await response.arrayBuffer();
    return arrayBufferToBase64(arrayBuffer);
  } catch (error) {
    console.error("Error al convertir imagen a Base64:", error);
    return null;
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes));
}

function parseDetalleJSON(detalleJSON) {
  if (!detalleJSON) return null;
  if (typeof detalleJSON === "object") return detalleJSON;
  if (typeof detalleJSON !== "string") return null;
  try {
    return JSON.parse(detalleJSON);
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

export async function guardarInspeccion(datosFormulario, detalleJSON) {
  const detalleObj = parseDetalleJSON(detalleJSON);
  const detalleDatos = detalleObj?.datos || {};
  const detalleImagenes = detalleObj?.imagenes || {};
  const esMampara = detalleObj?.tipo === "Mampara";
  const separacionCentralRaw = esMampara
    ? detalleDatos.separacion_lateral_central ?? detalleDatos.separacion_central ?? null
    : null;
  const alturaMamparaRaw = esMampara ? detalleDatos.altura_mampara ?? null : null;

  const separacionCentral = normalizarNumero(separacionCentralRaw);
  const alturaMampara = normalizarNumero(alturaMamparaRaw);
  const medidaCentral = esMampara ? formatearMedidaTexto(separacionCentralRaw) : null;
  const medidaAltura = esMampara ? formatearMedidaTexto(alturaMamparaRaw) : null;

  const fotoUnidad = esMampara ? detalleImagenes.foto_panoramica_unidad || null : null;
  const fotoObservacion = esMampara
    ? detalleImagenes.foto_altura_mampara || null
    : detalleImagenes.foto_observacion || null;

  const registro = {
    fecha: datosFormulario.fecha,
    hora: datosFormulario.hora,
    responsable: datosFormulario.responsable,
    empresa: datosFormulario.empresa,
    placa: datosFormulario.placa,
    chofer: datosFormulario.chofer,
    lugar: datosFormulario.lugar,
    incorreccion: datosFormulario.incorreccion,
    observaciones: datosFormulario.observaciones,
    separacion_central: separacionCentral,
    medida_altura: medidaAltura,
    medida_central: medidaCentral,
    altura_mampara: alturaMampara,
    foto_unidad: fotoUnidad,
    foto_observacion: fotoObservacion,
    detalle: detalleJSON,
  };

  const { error } = await supabase.from("inspecciones").insert([registro]);
  if (error) {
    console.error("Error al registrar inspecci\u00F3n:", error.message);
    mostrarModal("error", "Error al registrar la inspecci\u00F3n.");
    return false;
  }

  mostrarModal("success", "Inspecci\u00F3n registrada correctamente.");
  return true;
}

function obtenerInput(id) {
  return document.getElementById(id);
}

function generarCampoImagen(label, inputId, previewId) {
  return `
    <div class="space-y-1">
      <label class="text-sm font-semibold text-gray-700">
        ${label} <span class="text-red-500">*</span>
      </label>
      <input
        type="file"
        id="${inputId}"
        accept="image/*"
        class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        data-preview-target="${previewId}"
        data-preview-name="${label}"
      />
      <div id="${previewId}" class="flex flex-wrap gap-3 hidden" data-preview-container></div>
    </div>
  `;
}

function generarDetalleMamparaMarkup() {
  return `
    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-1">
          <label class="text-sm font-semibold text-gray-700">
            Separaci&oacute;n lateral (cm) <span class="text-red-500">*</span>
          </label>
          <input
            id="sepCentral"
            type="number"
            min="0"
            step="0.01"
            class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            placeholder="Ej. 25"
          />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-semibold text-gray-700">
            Altura de mampara (cm) <span class="text-red-500">*</span>
          </label>
          <input
            id="alturaMampara"
            type="number"
            min="0"
            step="0.01"
            class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            placeholder="Ej. 180"
          />
        </div>
      </div>
      ${generarCampoImagen("Foto panor&aacute;mica", "fotoPanoramica", "previewPanoramica")}
      ${generarCampoImagen("Foto de la altura", "fotoAltura", "previewAltura")}
      ${generarCampoImagen("Foto lateral", "fotoLateral", "previewLateral")}
    </div>
  `;
}

function generarDetalleOtrosMarkup() {
  return `
    <div class="space-y-4">
      <div class="space-y-1">
        <label class="text-sm font-semibold text-gray-700">
          Observaci&oacute;n <span class="text-red-500">*</span>
        </label>
        <textarea
          id="observacionTexto"
          rows="4"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder="Describe la observaci&oacute;n encontrada"
        ></textarea>
      </div>
      ${generarCampoImagen("Foto de la observaci&oacute;n", "fotoObservacion", "previewObservacion")}
    </div>
  `;
}

function generarContenidoModal(tipo) {
  const cont = document.getElementById("contenidoDetalle");
  if (!cont) return;

  cont.innerHTML = tipo === "Mampara" ? generarDetalleMamparaMarkup() : generarDetalleOtrosMarkup();
  registrarPrevisualizaciones(cont);
  toggleDetalleAlert(false);
  limpiarDetalleModal();
}

function registrarPrevisualizaciones(root) {
  const inputs = root.querySelectorAll('input[type="file"][data-preview-target]');
  inputs.forEach((input) => {
    input.addEventListener("change", () => actualizarPreviewInput(input));
  });
}

function actualizarPreviewInput(input) {
  const previewId = input.dataset.previewTarget;
  const preview = previewId ? document.getElementById(previewId) : null;
  if (!preview) return;

  preview.innerHTML = "";
  const files = Array.from(input.files || []);

  if (!files.length) {
    preview.classList.add("hidden");
    return;
  }

  preview.classList.remove("hidden");

  files.forEach((file) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "w-20 h-20 rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:scale-105 transition";
      button.innerHTML = `<img src="${reader.result}" alt="${input.dataset.previewName || "Imagen"}" class="w-full h-full object-cover" />`;
      button.addEventListener("click", () => abrirPreviewImagenModal(reader.result));
      preview.appendChild(button);
    };
    reader.readAsDataURL(file);
  });
}

function abrirPreviewImagenModal(src) {
  const modal = document.getElementById("modalPreview");
  const img = document.getElementById("previewImagen");
  if (!modal || !img || !src) return;

  img.src = src;
  modal.classList.add("flex");
  modal.classList.remove("hidden");
  document.addEventListener("keydown", escCloseHandler);
  modal.addEventListener("click", outsideClickHandler);
}

function cerrarModalPreview() {
  const modal = document.getElementById("modalPreview");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.removeEventListener("keydown", escCloseHandler);
  modal.removeEventListener("click", outsideClickHandler);
}

function escCloseHandler(e) {
  if (e.key === "Escape") cerrarModalPreview();
}

function outsideClickHandler(e) {
  if (e.target?.id === "modalPreview") cerrarModalPreview();
}

function initPreviewModal() {
  const modal = document.getElementById("modalPreview");
  const btnClose = modal?.querySelector("button[onclick='cerrarModalPreview()']");
  if (!modal || !btnClose) return;

  btnClose.addEventListener("click", cerrarModalPreview);
}

function toggleDetalleAlert(show, message) {
  const alerta = document.getElementById("detalleAlert");
  if (!alerta) return;

  if (show) {
    alerta.textContent = message || "Completa los campos marcados con * antes de continuar.";
    alerta.classList.remove("hidden");
  } else {
    alerta.classList.add("hidden");
  }
}

function limpiarDetalleModal() {
  const cont = document.getElementById("contenidoDetalle");
  if (!cont) return;

  cont.querySelectorAll("input, textarea").forEach((input) => {
    if (input.type === "file") {
      input.value = "";
      const previewId = input.dataset.previewTarget;
      if (previewId) {
        const preview = document.getElementById(previewId);
        if (preview) {
          preview.innerHTML = "";
          preview.classList.add("hidden");
        }
      }
    } else {
      input.value = "";
    }
  });
  toggleDetalleAlert(false);
}

function mostrarDetalleGuardadoAviso(visible) {
  const aviso = document.getElementById("detalleGuardadoAviso");
  if (!aviso) return;
  aviso.classList.toggle("hidden", !visible);
}

function renderGaleriaMamparas(detalle) {
  const cont = document.getElementById("galeriaMamparas");
  if (!cont) return;

  cont.innerHTML = "";

  const imagenes = detalle?.imagenes;
  if (!imagenes || !Object.keys(imagenes).length) {
    const empty = document.createElement("p");
    empty.className = "text-sm text-gray-500";
    empty.textContent = "Sin evidencias registradas aun.";
    cont.appendChild(empty);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "grid grid-cols-2 gap-3";

  Object.values(imagenes).forEach((url) => {
    if (!url) return;
    const item = document.createElement("div");
    item.className =
      "rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer";
    item.innerHTML = `<img src="${url}" alt="Evidencia" class="w-full h-24 object-cover" />`;
    item.addEventListener("click", () => abrirPreviewImagenModal(url));
    grid.appendChild(item);
  });

  if (!grid.childElementCount) {
    const empty = document.createElement("p");
    empty.className = "text-sm text-gray-500";
    empty.textContent = "Sin evidencias registradas aun.";
    cont.appendChild(empty);
    return;
  }

  cont.appendChild(grid);
}

async function guardarDetalleJSON() {
  const incorreccion = obtenerInput("incorreccion");
  const detalleModal = document.getElementById("detalleModal");
  const campoDetalle = obtenerInput("detalle");
  if (!incorreccion || !campoDetalle || !detalleModal) return;

  const tipo = incorreccion.value;
  if (!tipo) {
    toggleDetalleAlert(true, "Selecciona un tipo de incorrecci\u00F3n.");
    return;
  }

  const detalle = {
    tipo,
    datos: {},
    imagenes: {},
    timestamp: new Date().toISOString(),
  };

  if (tipo === "Mampara") {
    const sepCentral = obtenerInput("sepCentral")?.value.trim();
    const alturaMampara = obtenerInput("alturaMampara")?.value.trim();
    const fotoPanoramica = obtenerInput("fotoPanoramica")?.files?.[0];
    const fotoAltura = obtenerInput("fotoAltura")?.files?.[0];
    const fotoLateral = obtenerInput("fotoLateral")?.files?.[0];

    const faltantes = [];
    if (!sepCentral) faltantes.push("la separaci\u00F3n lateral");
    if (!alturaMampara) faltantes.push("la altura");
    if (!fotoPanoramica) faltantes.push("la foto panor\u00E1mica");
    if (!fotoAltura) faltantes.push("la foto de altura");
    if (!fotoLateral) faltantes.push("la foto lateral");

    if (faltantes.length) {
      toggleDetalleAlert(true, `Completa ${faltantes.join(", ")}.`);
      return;
    }

    const fotoPanoramicaUrl = await subirImagen("panoramica", fotoPanoramica);
    const fotoAlturaUrl = await subirImagen("altura", fotoAltura);
    const fotoLateralUrl = await subirImagen("lateral", fotoLateral);

    if (!fotoPanoramicaUrl || !fotoAlturaUrl || !fotoLateralUrl) {
      toggleDetalleAlert(true, "Hubo un problema al subir las im\u00E1genes. Intenta nuevamente.");
      return;
    }

    detalle.datos = {
      separacion_lateral_central: sepCentral,
      altura_mampara: alturaMampara,
    };
    detalle.imagenes = {
      foto_panoramica_unidad: fotoPanoramicaUrl,
      foto_altura_mampara: fotoAlturaUrl,
      foto_lateral_central: fotoLateralUrl,
    };
  } else {
    const observacionTexto = obtenerInput("observacionTexto")?.value.trim();
    const fotoObservacion = obtenerInput("fotoObservacion")?.files?.[0];
    const faltantes = [];
    if (!observacionTexto) faltantes.push("la descripci\u00F3n");
    if (!fotoObservacion) faltantes.push("la foto de observaci\u00F3n");

    if (faltantes.length) {
      toggleDetalleAlert(true, `Completa ${faltantes.join(" y ")}.`);
      return;
    }

    const fotoObservacionUrl = await subirImagen("observacion", fotoObservacion);
    if (!fotoObservacionUrl) {
      toggleDetalleAlert(true, "No se pudo subir la foto de la observaci\u00F3n.");
      return;
    }

    detalle.datos = {
      observacion_texto: observacionTexto,
    };
    detalle.imagenes = {
      foto_observacion: fotoObservacionUrl,
    };
  }

  toggleDetalleAlert(false);

  const placa = (obtenerInput("placa")?.value || "sinplaca").trim().toUpperCase();
  const jsonMeta = await subirDetalleJSONArchivo(detalle, placa);
  if (jsonMeta) {
    detalle.json_storage = jsonMeta;
  }

  campoDetalle.value = JSON.stringify(detalle);
  mostrarDetalleGuardadoAviso(true);
  renderGaleriaMamparas(detalle);
  hideModalOverlay(detalleModal);
  mostrarModal("success", "Detalle guardado correctamente.");
}

function initDetalleModal() {
  const btnDetalle = document.getElementById("btnAgregarDetalle");
  const incorreccion = obtenerInput("incorreccion");
  const detalleModal = document.getElementById("detalleModal");
  const cerrarModal = document.getElementById("cerrarDetalleModal");
  const btnGuardarDetalle = document.getElementById("btnGuardarDetalle");
  const btnLimpiarDetalle = document.getElementById("btnLimpiarDetalle");
  if (!btnDetalle || !incorreccion || !detalleModal) return;

  btnDetalle.addEventListener("click", () => {
    if (!incorreccion.value) return;
    generarContenidoModal(incorreccion.value);
    showModalOverlay(detalleModal);
  });

  if (cerrarModal) {
    cerrarModal.addEventListener("click", () => hideModalOverlay(detalleModal));
  }
  bindEscClose(detalleModal, () => hideModalOverlay(detalleModal));

  if (btnGuardarDetalle) {
    btnGuardarDetalle.addEventListener("click", guardarDetalleJSON);
  }

  if (btnLimpiarDetalle) {
    btnLimpiarDetalle.addEventListener("click", (event) => {
      event.preventDefault();
      limpiarDetalleModal();
    });
  }

  detalleModal.addEventListener("click", (event) => {
    if (event.target === detalleModal) {
      hideModalOverlay(detalleModal);
    }
  });
}

function initDetalleTrigger() {
  const incorreccion = obtenerInput("incorreccion");
  const btnDetalle = document.getElementById("btnAgregarDetalle");
  const detalleInput = obtenerInput("detalle");
  if (!incorreccion || !btnDetalle || !detalleInput) return;

  actualizarBotonDetalleFn = () => {
    const tieneValor = Boolean(incorreccion.value);
    toggleHidden(btnDetalle, !tieneValor);
    if (!tieneValor) {
      detalleInput.value = "";
      mostrarDetalleGuardadoAviso(false);
      renderGaleriaMamparas(null);
    }
  };

  incorreccion.addEventListener("change", actualizarBotonDetalleFn);
  actualizarBotonDetalleFn();
}

function autocompletarFechaHora() {
  const fecha = obtenerInput("fecha");
  const hora = obtenerInput("hora");
  const ahora = new Date();
  if (fecha) {
    fecha.value = ahora.toISOString().split("T")[0];
  }
  if (hora) {
    hora.value = ahora.toTimeString().slice(0, 5);
  }
}

function initEmpresaPersonalizada() {
  const empresa = obtenerInput("empresa");
  const nuevaEmpresa = obtenerInput("nueva_empresa");
  if (!empresa || !nuevaEmpresa) return;

  actualizarEmpresaPersonalizadaFn = () => {
    const usarCampo = empresa.value === "otra";
    toggleHidden(nuevaEmpresa, !usarCampo);
    nuevaEmpresa.required = usarCampo;
    if (!usarCampo) {
      nuevaEmpresa.value = "";
    } else {
      nuevaEmpresa.focus();
    }
  };

  empresa.addEventListener("change", actualizarEmpresaPersonalizadaFn);
  actualizarEmpresaPersonalizadaFn();
}

async function consultarPlacaDia(placa) {
  const hoy = new Date();
  const fechaHoy = hoy.toISOString().split("T")[0];

  try {
    const { data, error } = await supabase
      .from("inspecciones")
      .select("*")
      .eq("placa", placa)
      .eq("fecha", fechaHoy)
      .order("hora", { ascending: false })
      .limit(1);

    if (error) throw error;

    if (data && data.length) {
      mostrarModalPlaca(data[0], placa);
    } else {
      ocultarModalPlaca();
    }
  } catch (error) {
    console.error("Error validando placa:", error.message || error);
  }
}

function crearFilaTabla(label, value) {
  return `
    <tr>
      <th class="text-left text-gray-500 text-xs uppercase tracking-wide py-1 pr-3">${label}</th>
      <td class="text-sm text-gray-800 py-1">${value || "-"}</td>
    </tr>
  `;
}

function mostrarModalPlaca(registro, placa) {
  const modal = document.getElementById("modalPlacaExistente");
  const contenido = document.getElementById("placaModalContenido");
  const placaDuplicada = document.getElementById("placaDuplicada");
  if (!modal || !contenido || !placaDuplicada) return;

  placaDuplicada.textContent = placa;

  let detalle = {};
  try {
    detalle =
      typeof registro.detalle === "string" ? JSON.parse(registro.detalle || "{}") : registro.detalle || {};
  } catch {
    detalle = {};
  }

  const filas = [
    crearFilaTabla("Fecha", registro.fecha),
    crearFilaTabla("Hora", registro.hora),
    crearFilaTabla("Responsable", registro.responsable),
    crearFilaTabla("Lugar", registro.lugar),
    crearFilaTabla("Observaciones", registro.observaciones),
    crearFilaTabla("Detalle registrado", detalle?.tipo || "-"),
  ];

  contenido.innerHTML = filas.join("");
  showModalOverlay(modal);
}

function ocultarModalPlaca() {
  const modal = document.getElementById("modalPlacaExistente");
  hideModalOverlay(modal);
}

function initModalPlacaListeners() {
  const modal = document.getElementById("modalPlacaExistente");
  const btnCerrar = document.getElementById("cerrarModalPlaca");
  const btnCancelar = document.getElementById("btnCancelarPlaca");
  const btnContinuar = document.getElementById("btnContinuarPlaca");
  const placaInput = obtenerInput("placa");
  if (!modal) return;

  const cerrar = (limpiar) => {
    hideModalOverlay(modal);
    if (limpiar && placaInput) {
      placaInput.value = "";
      placaInput.focus();
    } else if (placaInput) {
      placaInput.focus();
    }
  };

  if (btnCerrar) btnCerrar.addEventListener("click", () => cerrar(false));
  if (btnContinuar) btnContinuar.addEventListener("click", () => cerrar(false));
  if (btnCancelar) btnCancelar.addEventListener("click", () => cerrar(true));

  modal.addEventListener("click", (event) => {
    if (event.target === modal) cerrar(false);
  });
  bindEscClose(modal, () => cerrar(false));
}

function initValidacionPlaca() {
  const placaInput = obtenerInput("placa");
  if (!placaInput) return;

  let debounceId = null;
  let ultimoValorConsultado = "";

  placaInput.addEventListener("input", () => {
    placaInput.value = placaInput.value.toUpperCase().trim();
    const valor = placaInput.value.replace(/\s+/g, "");

    if (valor.length < MIN_PLACA_LENGTH) {
      ultimoValorConsultado = "";
      if (debounceId) clearTimeout(debounceId);
      ocultarModalPlaca();
      return;
    }

    if (debounceId) clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      if (valor === ultimoValorConsultado) return;
      ultimoValorConsultado = valor;
      consultarPlacaDia(valor);
    }, VALIDACION_PLACA_DELAY);
  });
}

function initFormulario() {
  const form = document.getElementById("form-inspeccion");
  if (!form) {
    // console.warn("initMamparasForm: formulario no encontrado, se omite inicializaci\u00F3n.");
    return;
  }

  cerrarTodosLosModales();
  autocompletarFechaHora();
  initEmpresaPersonalizada();
  initDetalleTrigger();
  initDetalleModal();
  initPreviewModal();
  initModalPlacaListeners();
  initValidacionPlaca();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (typeof form.reportValidity === "function" && !form.reportValidity()) {
      return;
    }

    const detalleCampo = obtenerInput("detalle");
    if (!detalleCampo || !detalleCampo.value) {
      mostrarModal("error", "Debes registrar el detalle antes de guardar.");
      return;
    }

    const empresa = obtenerInput("empresa");
    const nuevaEmpresa = obtenerInput("nueva_empresa");
    const empresaValor =
      empresa?.value === "otra" ? (nuevaEmpresa?.value || "").trim() : empresa?.value || "";

    if (empresa?.value === "otra" && !empresaValor) {
      mostrarModal("error", "Ingresa el nombre de la empresa.");
      nuevaEmpresa?.focus();
      return;
    }

    const datos = {
      fecha: obtenerInput("fecha")?.value || "",
      hora: obtenerInput("hora")?.value || "",
      responsable: obtenerInput("responsable")?.value || "",
      empresa: empresaValor,
      placa: (obtenerInput("placa")?.value || "").trim().toUpperCase(),
      chofer: obtenerInput("chofer")?.value || "",
      lugar: obtenerInput("lugar")?.value || "",
      incorreccion: obtenerInput("incorreccion")?.value || "",
      observaciones: obtenerInput("observaciones")?.value || "",
    };

    if (!datos.placa) {
      mostrarModal("error", "Ingresa la placa del veh\u00EDculo.");
      obtenerInput("placa")?.focus();
      return;
    }

    const exito = await guardarInspeccion(datos, detalleCampo.value);
    if (exito) {
      form.reset();
      detalleCampo.value = "";
      mostrarDetalleGuardadoAviso(false);
      cerrarTodosLosModales();
      autocompletarFechaHora();
      actualizarEmpresaPersonalizadaFn?.();
      actualizarBotonDetalleFn?.();
      renderGaleriaMamparas(null);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFormulario);
} else {
  initFormulario();
}

// ðŸš« NO BORRAR â€” QA Mamparas
console.log("QA Mamparas: archivo restaurado");
