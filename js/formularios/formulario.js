import { supabase } from "../utils/supabase.js";
import { uploadFiles } from "../utils/storage.js";
import { generateWordFinal } from "./generador-docx.js";
import { withBase } from "../config.js";
import { calcularProgresoInforme } from "../dashboard/progreso.js";
import { obtenerCamposCable } from "./campos-cable.js";
import { obtenerCamposMercaderia } from "./campos-mercaderia.js";
import { obtenerCamposChoque } from "./campos-choque.js";
import { obtenerCamposSiniestro } from "./campos-siniestro.js";

const ASUNTOS = {
  CABLE: "SUSTRACCION DE CABLE RH",
  MERCADERIA: "SUSTRACCION DE MERCADERIA",
  CHOQUE: "CHOQUE DE UNIDAD",
  SINIESTRO: "SINIESTRO",
};

const VALID_ANEXO_FORMATS = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "application/pdf",
]);

const VALID_ANEXO_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "pdf"]);
const MAX_ANEXOS = 30;
const MAX_ANEXO_BYTES = 12 * 1024 * 1024;

const tipoDescripcion = document.getElementById("tipoDescripcion");
const asuntoInput = document.getElementById("asunto");
const campoExtraContainer = document.getElementById("campoExtraContainer");
const camposOperativosContainer = document.getElementById("camposOperativosContainer");
const dirigidoAInput = document.getElementById("dirigidoA");
const remitenteInput = document.getElementById("remitente");
const fechaInformeInput = document.getElementById("fechaInforme");
const introduccionInput = document.getElementById("introduccion");
const hechosInput = document.getElementById("hechos");
const analisisInput = document.getElementById("analisis");
const conclusionesInput = document.getElementById("conclusiones");
const recomendacionesInput = document.getElementById("recomendaciones");
const anexosInput = document.getElementById("anexos");
const dropZoneAnexos = document.getElementById("dropZoneAnexos");
const anexosPreview = document.getElementById("anexosPreview");
const btnSubirAnexos = document.getElementById("btnSubirAnexos");
const progressBar = document.getElementById("progressBar");
const progressLabel = document.getElementById("progressLabel");
const formStatus = document.getElementById("formStatus");
const evidenceCountText = document.getElementById("evidenceCountText");
const btnGuardarBorrador = document.getElementById("btnGuardarBorrador");
const btnGuardarCompleto = document.getElementById("btnGuardarCompleto");
const btnExportarWord = document.getElementById("btnExportarWord");
const modalOverlay = document.getElementById("modalPreview");
const modalImage = document.getElementById("previewImagen");
const previewNombre = document.getElementById("previewNombre");
const previewMeta = document.getElementById("previewMeta");

let tipoSeleccionado = null;
let anexosArchivos = [];
let guardando = false;
const extraRefs = { contenedor: null, placa: null };
const operationalRefs = new Map();

function detectarTipoDesdeURL() {
  const tipo = new URL(window.location.href).searchParams.get("tipo")?.toUpperCase();
  return tipo && ASUNTOS[tipo] ? tipo : null;
}

function prellenarFechaInforme() {
  if (!fechaInformeInput || fechaInformeInput.value) return;
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  fechaInformeInput.value = local.toISOString().slice(0, 10);
}

function tieneContenidoReal(valor = "") {
  return String(valor)
    .split("\n")
    .map((linea) => linea.replace(/^\s*\d+[.)-]?\s*/, "").trim())
    .some(Boolean);
}

function mostrarEstadoFormulario(tipo, mensaje, elemento = null) {
  if (formStatus) {
    formStatus.className = `form-status form-status--${tipo} is-visible`;
    formStatus.textContent = mensaje;
  }

  if (elemento) {
    elemento.setAttribute?.("aria-invalid", "true");
    elemento.focus?.({ preventScroll: true });
    elemento.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }
}

function limpiarEstadoFormulario() {
  if (formStatus) {
    formStatus.className = "form-status";
    formStatus.textContent = "";
  }
}

function limpiarInvalidos() {
  document.querySelectorAll('#form-incidencia [aria-invalid="true"]').forEach((el) => {
    el.removeAttribute("aria-invalid");
  });
}

function actualizarEstadoBotonesGuardado(ocupado) {
  [btnGuardarBorrador, btnGuardarCompleto].forEach((btn) => {
    if (!btn) return;
    btn.disabled = ocupado;
    btn.classList.toggle("opacity-60", ocupado);
  });
}

function configurarTipo(tipo) {
  tipoSeleccionado = tipo;

  if (asuntoInput) asuntoInput.value = ASUNTOS[tipo] || "";
  if (tipoDescripcion) {
    tipoDescripcion.textContent = `Plantilla activa: ${ASUNTOS[tipo]}`;
  }

  renderCamposExtra(tipo);
  renderCamposOperativos(tipo);
  recalcularProgreso();
}

function crearFieldWrapper(labelText, input) {
  const wrapper = document.createElement("div");
  wrapper.className = "tpp-field";

  const label = document.createElement("label");
  label.htmlFor = input.id;
  label.textContent = labelText;

  wrapper.append(label, input);
  return wrapper;
}

function crearInputExtra(id, label, placeholder, maxLength) {
  const input = document.createElement("input");
  input.id = id;
  input.type = "text";
  input.placeholder = placeholder;
  input.maxLength = maxLength;
  input.autocomplete = "off";
  input.className = "tpp-control uppercase";
  input.style.textTransform = "uppercase";
  input.addEventListener("input", () => {
    input.value = input.value.toUpperCase();
    input.removeAttribute("aria-invalid");
    limpiarEstadoFormulario();
    recalcularProgreso();
  });

  return { input, wrapper: crearFieldWrapper(label, input) };
}

function renderCamposExtra(tipo) {
  if (!campoExtraContainer) return;

  campoExtraContainer.innerHTML = "";
  extraRefs.contenedor = null;
  extraRefs.placa = null;

  if (tipo === "CABLE" || tipo === "MERCADERIA") {
    const { input, wrapper } = crearInputExtra(
      "serieContenedor",
      "Serie del contenedor",
      "SERIE DEL CONTENEDOR",
      20
    );
    extraRefs.contenedor = input;
    campoExtraContainer.appendChild(wrapper);
    return;
  }

  if (tipo === "CHOQUE") {
    const { input, wrapper } = crearInputExtra(
      "placaUnidad",
      "Placa de unidad",
      "PLACA DE UNIDAD",
      8
    );
    extraRefs.placa = input;
    campoExtraContainer.appendChild(wrapper);
    return;
  }

  if (tipo === "SINIESTRO") {
    const contenedor = crearInputExtra(
      "contenedorSiniestro",
      "Contenedor",
      "CONTENEDOR",
      20
    );
    const placa = crearInputExtra(
      "placaSiniestro",
      "Placa de unidad",
      "PLACA DE UNIDAD",
      8
    );

    extraRefs.contenedor = contenedor.input;
    extraRefs.placa = placa.input;
    campoExtraContainer.append(contenedor.wrapper, placa.wrapper);
  }
}

function obtenerConfiguracionOperativa(tipo) {
  if (tipo === "CABLE") return obtenerCamposCable();
  if (tipo === "MERCADERIA") return obtenerCamposMercaderia();
  if (tipo === "CHOQUE") return obtenerCamposChoque();
  if (tipo === "SINIESTRO") return obtenerCamposSiniestro();
  return [];
}

function renderCamposOperativos(tipo) {
  if (!camposOperativosContainer) return;

  camposOperativosContainer.innerHTML = "";
  operationalRefs.clear();

  const campos = obtenerConfiguracionOperativa(tipo);

  if (!campos.length) {
    const empty = document.createElement("p");
    empty.className = "tpp-help";
    empty.textContent = "Este tipo no tiene campos operativos adicionales.";
    camposOperativosContainer.appendChild(empty);
    return;
  }

  campos.forEach((config) => {
    const wrapper = document.createElement("div");
    wrapper.className = "tpp-field";

    const label = document.createElement("label");
    label.htmlFor = `operativo-${config.id}`;
    label.textContent = config.label + (config.required ? " *" : "");

    let control;

    if (config.type === "textarea") {
      control = document.createElement("textarea");
      control.rows = 3;
    } else {
      control = document.createElement("input");
      control.type = config.type || "text";
    }

    control.id = `operativo-${config.id}`;
    control.dataset.operationalKey = config.id;
    control.required = Boolean(config.required);
    if (config.placeholder) control.placeholder = config.placeholder;
    if (config.accept && control.type === "file") control.accept = config.accept;

    if (control.type === "number") {
      control.min = "0";
      control.step = "0.01";
    }

    if (control.type === "file") {
      control.className = "tpp-control";
      const help = document.createElement("p");
      help.className = "tpp-help";
      help.textContent = config.accept?.includes("image")
        ? "Archivo fotográfico complementario."
        : "Archivo de respaldo operativo.";
      wrapper.append(label, control, help);
    } else {
      control.className = "tpp-control";
      wrapper.append(label, control);
    }

    control.addEventListener("input", () => {
      control.removeAttribute("aria-invalid");
      limpiarEstadoFormulario();
    });
    control.addEventListener("change", () => {
      control.removeAttribute("aria-invalid");
      limpiarEstadoFormulario();
      recalcularProgreso();
    });

    operationalRefs.set(config.id, { config, control });
    camposOperativosContainer.appendChild(wrapper);
  });
}

function obtenerValorExtra() {
  return {
    contenedor: extraRefs.contenedor?.value?.trim() || null,
    placa: extraRefs.placa?.value?.trim() || null,
  };
}

function obtenerDatosOperativos() {
  const resultado = {};

  operationalRefs.forEach(({ config, control }, key) => {
    if (config.type === "file") {
      const file = control.files?.[0] || null;
      resultado[key] = file
        ? {
            name: file.name,
            type: file.type,
            size: file.size,
          }
        : null;
    } else {
      resultado[key] = control.value?.trim?.() || "";
    }
  });

  return resultado;
}

function obtenerArchivosOperativos() {
  const archivos = [];

  operationalRefs.forEach(({ config, control }, key) => {
    if (config.type !== "file") return;
    const file = control.files?.[0];
    if (!file) return;

    archivos.push({
      id: `operativo-${key}`,
      file,
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file),
      descripcion: config.label,
      operational: true,
    });
  });

  return archivos;
}

function construirIncidenciaLocal({ anexos = null } = {}) {
  const valorExtra = obtenerValorExtra();
  const anexosParaProgreso =
    anexos ??
    [
      ...anexosArchivos,
      ...Array.from(operationalRefs.values())
        .filter(({ config, control }) => config.type === "file" && control.files?.length)
        .map(({ config, control }) => ({
          name: control.files[0].name,
          descripcion: config.label,
        })),
    ];

  return {
    tipo_incidencia: tipoSeleccionado,
    asunto: asuntoInput?.value || "",
    dirigido_a: dirigidoAInput?.value || "",
    remitente: remitenteInput?.value || "",
    fecha_informe: fechaInformeInput?.value || null,
    analisis: analisisInput?.value || "",
    conclusiones: conclusionesInput?.value || "",
    recomendaciones: recomendacionesInput?.value || "",
    campos: {
      valorExtra,
      introduccion: introduccionInput?.value || "",
      hechos: hechosInput?.value || "",
      datosOperativos: obtenerDatosOperativos(),
    },
    anexos: anexosParaProgreso,
  };
}

function recalcularProgreso() {
  const progreso = calcularProgresoInforme(construirIncidenciaLocal());

  if (progressLabel) progressLabel.textContent = `${progreso.porcentaje}%`;
  if (progressBar) progressBar.style.width = `${progreso.porcentaje}%`;

  const cantidad =
    anexosArchivos.length +
    Array.from(operationalRefs.values()).filter(
      ({ config, control }) => config.type === "file" && control.files?.length
    ).length;

  if (evidenceCountText) {
    evidenceCountText.textContent = cantidad
      ? `${cantidad} archivo(s) preparado(s)`
      : "Sin archivos cargados";
  }

  actualizarEstadoBotonWord();
  return progreso;
}

function esFormatoPermitido(file) {
  const mime = file.type?.toLowerCase?.() || "";
  if (mime && VALID_ANEXO_FORMATS.has(mime)) return true;
  const ext = file.name?.split(".").pop()?.toLowerCase();
  return ext ? VALID_ANEXO_EXTENSIONS.has(ext) : false;
}

function sincronizarInputAnexos() {
  if (!anexosInput || typeof DataTransfer === "undefined") return;

  const transfer = new DataTransfer();
  anexosArchivos.forEach((item) => transfer.items.add(item.file));
  anexosInput.files = transfer.files;
}

function renderGaleriaAnexos() {
  if (!anexosPreview) return;
  anexosPreview.innerHTML = "";

  if (!anexosArchivos.length) {
    const empty = document.createElement("div");
    empty.className = "form-status form-status--info";
    empty.textContent = "Las evidencias que agregues aparecerán aquí.";
    anexosPreview.appendChild(empty);
    return;
  }

  anexosArchivos.forEach((item, index) => {
    const isPdf =
      item.type === "application/pdf" ||
      String(item.name || "").toLowerCase().endsWith(".pdf");

    const card = document.createElement("article");
    card.className = "evidence-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", isPdf ? `Abrir ${item.name}` : `Ver ${item.name}`);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "media-close";
    removeBtn.style.cssText =
      "top:6px!important;right:6px!important;width:28px!important;height:28px!important;font-size:14px!important";
    removeBtn.setAttribute("aria-label", `Eliminar ${item.name}`);
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      eliminarAnexo(item.id);
    });
    card.appendChild(removeBtn);

    if (isPdf) {
      const pdf = document.createElement("div");
      pdf.style.cssText =
        "height:130px;display:grid;place-items:center;background:#f5f5f7;color:#b42318;font-size:28px";
      pdf.innerHTML = '<i class="fa-regular fa-file-pdf" aria-hidden="true"></i>';
      card.appendChild(pdf);
    } else {
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = item.descripcion || item.name || `Evidencia ${index + 1}`;
      img.loading = "lazy";
      card.appendChild(img);
    }

    const footer = document.createElement("div");
    footer.className = "evidence-card__footer";

    const name = document.createElement("span");
    name.className = "evidence-card__name";
    name.textContent = item.name;
    name.title = item.name;
    footer.appendChild(name);

    if (item.descripcion) {
      const description = document.createElement("span");
      description.className = "tpp-help";
      description.textContent = item.descripcion;
      footer.appendChild(description);
    }

    card.appendChild(footer);

    const abrir = () => {
      if (isPdf) window.open(item.url, "_blank", "noopener,noreferrer");
      else abrirModalPreview(item.url);
    };

    card.addEventListener("click", abrir);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        abrir();
      }
    });

    anexosPreview.appendChild(card);
  });
}

function agregarAnexos(files) {
  if (!files?.length) return;

  limpiarEstadoFormulario();

  const disponibles = MAX_ANEXOS - anexosArchivos.length;
  if (disponibles <= 0) {
    mostrarEstadoFormulario("warning", `Solo se permiten ${MAX_ANEXOS} evidencias por informe.`);
    return;
  }

  const permitidos = [];
  const rechazados = [];
  const demasiadoGrandes = [];

  files.forEach((file) => {
    if (file.size > MAX_ANEXO_BYTES) {
      demasiadoGrandes.push(file.name);
    } else if (esFormatoPermitido(file)) {
      permitidos.push(file);
    } else {
      rechazados.push(file.name);
    }
  });

  if (rechazados.length) {
    mostrarEstadoFormulario(
      "warning",
      `Formato no permitido: ${rechazados.join(", ")}.`
    );
  }

  if (demasiadoGrandes.length) {
    mostrarEstadoFormulario(
      "warning",
      `Se omitieron archivos mayores a 12 MB: ${demasiadoGrandes.join(", ")}.`
    );
  }

  const seleccion = permitidos.slice(0, disponibles);

  seleccion.forEach((file) => {
    anexosArchivos.push({
      id: crypto.randomUUID?.() || `anexo-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file),
      descripcion: "",
    });
  });

  if (permitidos.length > seleccion.length) {
    mostrarEstadoFormulario(
      "warning",
      `Se alcanzó el máximo de ${MAX_ANEXOS} evidencias.`
    );
  }

  sincronizarInputAnexos();
  renderGaleriaAnexos();
  recalcularProgreso();
}

function eliminarAnexo(id) {
  const index = anexosArchivos.findIndex((item) => item.id === id);
  if (index < 0) return;

  const [removed] = anexosArchivos.splice(index, 1);
  if (removed?.url) URL.revokeObjectURL(removed.url);

  sincronizarInputAnexos();
  renderGaleriaAnexos();
  recalcularProgreso();
}

function setupAnexosSection() {
  if (!anexosInput) return;

  btnSubirAnexos?.addEventListener("click", () => anexosInput.click());

  anexosInput.addEventListener("change", (event) => {
    agregarAnexos(Array.from(event.target.files || []));
    anexosInput.value = "";
  });

  if (!dropZoneAnexos) return;

  const activate = (event) => {
    event.preventDefault();
    dropZoneAnexos.classList.add("drop-zone--active");
  };

  const deactivate = (event) => {
    event.preventDefault();
    dropZoneAnexos.classList.remove("drop-zone--active");
  };

  ["dragenter", "dragover"].forEach((type) =>
    dropZoneAnexos.addEventListener(type, activate)
  );
  ["dragleave", "drop"].forEach((type) =>
    dropZoneAnexos.addEventListener(type, deactivate)
  );

  dropZoneAnexos.addEventListener("drop", (event) => {
    event.preventDefault();
    agregarAnexos(Array.from(event.dataTransfer?.files || []));
  });
}

function abrirModalPreview(src) {
  if (!src || !modalOverlay || !modalImage) return;

  const anexo = anexosArchivos.find((item) => item.url === src);
  modalImage.src = src;
  modalImage.alt = anexo?.descripcion || anexo?.name || "Evidencia ampliada";

  if (previewNombre) previewNombre.textContent = anexo?.name || "Evidencia";
  if (previewMeta) {
    previewMeta.textContent =
      anexo?.descripcion || "Vista completa · usa Esc para cerrar";
  }

  const footer = modalOverlay.querySelector(".media-lightbox__footer");
  let editor = footer?.querySelector("#modalDescripcionAnexo");

  if (footer && !editor) {
    editor = document.createElement("div");
    editor.id = "modalDescripcionAnexo";
    editor.style.cssText = "display:flex;gap:8px;align-items:flex-start;flex:1";

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Descripción breve de la evidencia…";

    const save = document.createElement("button");
    save.type = "button";
    save.className = "tpp-btn tpp-btn--primary";
    save.textContent = "Guardar descripción";

    editor.append(textarea, save);
    footer.appendChild(editor);
  }

  if (editor) {
    const textarea = editor.querySelector("textarea");
    const save = editor.querySelector("button");

    if (textarea) textarea.value = anexo?.descripcion || "";

    if (save) {
      save.disabled = !anexo;
      save.onclick = () => {
        if (!anexo || !textarea) return;
        anexo.descripcion = textarea.value.trim();
        if (previewMeta) previewMeta.textContent = anexo.descripcion || "Vista completa";
        renderGaleriaAnexos();
      };
    }
  }

  modalOverlay.classList.remove("hidden");
  modalOverlay.classList.add("flex");
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", escCloseHandler);
  modalOverlay.addEventListener("click", outsideClickHandler);
}

function cerrarModalPreview() {
  if (!modalOverlay) return;
  modalOverlay.classList.add("hidden");
  modalOverlay.classList.remove("flex");
  document.body.style.overflow = "";
  modalImage?.removeAttribute("src");
  document.removeEventListener("keydown", escCloseHandler);
  modalOverlay.removeEventListener("click", outsideClickHandler);
}

function escCloseHandler(event) {
  if (event.key === "Escape") cerrarModalPreview();
}

function outsideClickHandler(event) {
  if (event.target === modalOverlay) cerrarModalPreview();
}

window.cerrarModalPreview = cerrarModalPreview;

function validarCamposExtra({ notificar = true } = {}) {
  const extra = obtenerValorExtra();
  let mensaje = "";
  let elemento = null;

  if ((tipoSeleccionado === "CABLE" || tipoSeleccionado === "MERCADERIA") && !extra.contenedor) {
    mensaje = "Completa la serie del contenedor.";
    elemento = extraRefs.contenedor;
  } else if (tipoSeleccionado === "CHOQUE" && !extra.placa) {
    mensaje = "Completa la placa de la unidad.";
    elemento = extraRefs.placa;
  } else if (tipoSeleccionado === "SINIESTRO" && (!extra.contenedor || !extra.placa)) {
    mensaje = "Completa el contenedor y la placa de la unidad.";
    elemento = !extra.contenedor ? extraRefs.contenedor : extraRefs.placa;
  }

  if (mensaje && notificar) {
    mostrarEstadoFormulario("warning", mensaje, elemento);
  }

  return !mensaje;
}

function validarFormularioCompleto() {
  limpiarInvalidos();

  const requeridos = [
    [fechaInformeInput, "Selecciona la fecha del informe.", false],
    [introduccionInput, "Completa la introducción.", true],
    [hechosInput, "Completa la sección de hechos.", true],
    [analisisInput, "Completa el análisis.", true],
    [conclusionesInput, "Completa las conclusiones.", true],
    [recomendacionesInput, "Completa las recomendaciones.", true],
  ];

  for (const [campo, mensaje, esTexto] of requeridos) {
    if (!campo) continue;

    const valido = esTexto
      ? tieneContenidoReal(campo.value)
      : String(campo.value || "").trim() !== "";

    if (!valido) {
      mostrarEstadoFormulario("warning", mensaje, campo);
      return false;
    }
  }

  if (!validarCamposExtra()) return false;

  for (const { config, control } of operationalRefs.values()) {
    if (!config.required) continue;

    const completo =
      config.type === "file"
        ? Boolean(control.files?.length)
        : String(control.value || "").trim() !== "";

    if (!completo) {
      mostrarEstadoFormulario(
        "warning",
        `Completa el campo operativo “${config.label}”.`,
        control
      );
      return false;
    }
  }

  const archivosOperativos = Array.from(operationalRefs.values()).some(
    ({ config, control }) => config.type === "file" && control.files?.length
  );

  if (!anexosArchivos.length && !archivosOperativos) {
    mostrarEstadoFormulario(
      "warning",
      "Agrega al menos una evidencia antes de guardar el informe como completo.",
      dropZoneAnexos
    );
    return false;
  }

  return true;
}

function obtenerFuentesArchivo() {
  const fuentes = anexosArchivos.map((item) => ({
    file: item.file,
    descripcion: item.descripcion || "",
    name: item.name,
  }));

  operationalRefs.forEach(({ config, control }) => {
    if (config.type !== "file") return;
    const file = control.files?.[0];
    if (!file) return;
    fuentes.push({
      file,
      descripcion: config.label,
      name: file.name,
    });
  });

  return fuentes;
}

async function procesarAnexos(idRegistro) {
  const fuentes = obtenerFuentesArchivo();
  if (!fuentes.length) return [];

  const uploaded = await uploadFiles(
    idRegistro,
    fuentes.map((item) => item.file)
  );

  return uploaded.map((file, index) => ({
    name: file.name || fuentes[index]?.name || "anexo",
    path: file.path,
    url: file.url,
    descripcion: fuentes[index]?.descripcion || "",
  }));
}

async function guardarIncidencia(estadoSolicitado = "BORRADOR") {
  if (guardando) return;

  limpiarEstadoFormulario();
  limpiarInvalidos();

  if (!tipoSeleccionado) {
    mostrarEstadoFormulario(
      "error",
      "No se detectó el tipo de incidencia. Vuelve al inicio y selecciona una plantilla."
    );
    return;
  }

  const esCompleto = estadoSolicitado === "COMPLETO";
  if (esCompleto && !validarFormularioCompleto()) return;

  guardando = true;
  actualizarEstadoBotonesGuardado(true);
  mostrarEstadoFormulario(
    "info",
    esCompleto ? "Guardando informe y evidencias…" : "Guardando borrador…"
  );

  try {
    const base = construirIncidenciaLocal({ anexos: [] });
    const progresoSinAnexos = calcularProgresoInforme(base);

    const payloadInicial = {
      tipo_incidencia: base.tipo_incidencia,
      asunto: base.asunto,
      dirigido_a: base.dirigido_a,
      remitente: base.remitente,
      fecha_informe: base.fecha_informe,
      analisis: base.analisis,
      conclusiones: base.conclusiones,
      recomendaciones: base.recomendaciones,
      campos: base.campos,
      progreso: progresoSinAnexos.porcentaje,
      estado: "BORRADOR",
    };

    const { data, error } = await supabase
      .from("incidencias")
      .insert([payloadInicial])
      .select()
      .single();

    if (error) throw error;

    const anexos = await procesarAnexos(data.id);
    const finalLocal = construirIncidenciaLocal({ anexos });
    const progresoFinal = calcularProgresoInforme(finalLocal);
    const estadoFinal =
      esCompleto && progresoFinal.porcentaje === 100 ? "COMPLETO" : "BORRADOR";

    const { error: updateError } = await supabase
      .from("incidencias")
      .update({
        anexos,
        progreso: progresoFinal.porcentaje,
        estado: estadoFinal,
      })
      .eq("id", data.id);

    if (updateError) throw updateError;

    mostrarEstadoFormulario(
      "success",
      estadoFinal === "COMPLETO"
        ? "Informe guardado correctamente como completo."
        : "Borrador guardado. Puedes continuar completándolo después."
    );
  } catch (error) {
    console.error("Error guardando incidencia:", error);
    mostrarEstadoFormulario(
      "error",
      error?.message || "No se pudo guardar el informe. Revisa la conexión e inténtalo nuevamente."
    );
  } finally {
    guardando = false;
    actualizarEstadoBotonesGuardado(false);
  }
}

function setupNumberedTextarea(el) {
  if (!el) return;

  if (!el.value.trim()) {
    el.value = "1. ";
  }

  el.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const next = before.split("\n").length + 1;
    const insert = `\n${next}. `;

    el.value = before + insert + after;
    const cursor = before.length + insert.length;
    el.setSelectionRange(cursor, cursor);
    recalcularProgreso();
  });

  el.addEventListener("blur", () => {
    if (!el.value.trim()) {
      el.value = "1. ";
      recalcularProgreso();
    }
  });
}

function limpiarTextoParaWord(texto = "") {
  return String(texto || "")
    .replace(/\s+$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();
}

function obtenerAnexosWordLocales() {
  return obtenerFuentesArchivo().map(({ file, descripcion }) => ({
    name: file.name,
    url: URL.createObjectURL(file),
    type: file.type,
    descripcion,
  }));
}

async function armarPayloadWord() {
  const valorExtra = obtenerValorExtra();

  const payload = {
    asunto: asuntoInput?.value || "",
    valorExtra,
    dirigido_a: dirigidoAInput?.value || "",
    remitente: remitenteInput?.value || "",
    fecha_informe: fechaInformeInput?.value || "",
    introduccion: introduccionInput?.value || "",
    hechos: hechosInput?.value || "",
    analisis: analisisInput?.value || "",
    conclusiones: conclusionesInput?.value || "",
    recomendaciones: recomendacionesInput?.value || "",
    datosOperativos: obtenerDatosOperativos(),
    anexos: anexosArchivos.map((item) => ({
      name: item.name,
      url: item.url,
      type: item.type,
      descripcion: item.descripcion || "",
    })),
  };

  operationalRefs.forEach(({ config, control }) => {
    if (config.type !== "file") return;
    const file = control.files?.[0];
    if (!file) return;

    payload.anexos.push({
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
      descripcion: config.label,
    });
  });

  const id = new URL(window.location.href).searchParams.get("id");
  if (id) {
    const { data } = await supabase
      .from("incidencias")
      .select("anexos")
      .eq("id", id)
      .single();

    if (Array.isArray(data?.anexos)) {
      payload.anexos.push(...data.anexos);
    }
  }

  return payload;
}

function actualizarEstadoBotonWord() {
  if (!btnExportarWord || !progressLabel) return;

  const progreso = Number.parseInt(progressLabel.textContent || "0", 10);
  const habilitado = Number.isFinite(progreso) && progreso >= 40;

  btnExportarWord.disabled = !habilitado;
  btnExportarWord.classList.toggle("opacity-40", !habilitado);
}

btnGuardarBorrador?.addEventListener("click", (event) => {
  event.preventDefault();
  void guardarIncidencia("BORRADOR");
});

btnGuardarCompleto?.addEventListener("click", (event) => {
  event.preventDefault();
  void guardarIncidencia("COMPLETO");
});

document.getElementById("btnVolverDashboard")?.addEventListener("click", () => {
  window.dispatchEvent(
    new CustomEvent("sidebar:navigate", { detail: withBase("index.html") })
  );
});

btnExportarWord?.addEventListener("click", async () => {
  limpiarEstadoFormulario();

  try {
    mostrarEstadoFormulario("info", "Generando documento Word…");
    const payload = await armarPayloadWord();
    await generateWordFinal(payload);
    mostrarEstadoFormulario("success", "Documento Word generado correctamente.");
  } catch (error) {
    console.error("Error exportando Word:", error);
    mostrarEstadoFormulario("error", "No se pudo generar el documento Word.");
  }
});

[
  asuntoInput,
  dirigidoAInput,
  remitenteInput,
  fechaInformeInput,
  introduccionInput,
  hechosInput,
  analisisInput,
  conclusionesInput,
  recomendacionesInput,
].forEach((el) => {
  el?.addEventListener("input", () => {
    limpiarEstadoFormulario();
    el.removeAttribute("aria-invalid");
    recalcularProgreso();
  });
});

function resetFormularioParcial() {
  [introduccionInput, hechosInput, analisisInput, conclusionesInput, recomendacionesInput]
    .filter(Boolean)
    .forEach((el) => {
      el.value = "1. ";
    });

  anexosArchivos.forEach((item) => {
    if (item.url) URL.revokeObjectURL(item.url);
  });
  anexosArchivos = [];

  operationalRefs.forEach(({ control }) => {
    if (control.type === "file") control.value = "";
    else control.value = "";
  });

  renderGaleriaAnexos();
  recalcularProgreso();
  mostrarEstadoFormulario("info", "Se limpiaron las secciones editables del informe.");
}

window.resetFormularioParcial = resetFormularioParcial;

const tipoDetectado = detectarTipoDesdeURL();
if (tipoDetectado) {
  configurarTipo(tipoDetectado);
} else if (tipoDescripcion) {
  tipoDescripcion.textContent = "Selecciona un tipo de informe desde el inicio o el menú lateral.";
  mostrarEstadoFormulario(
    "warning",
    "No se detectó una plantilla válida para este informe."
  );
}

prellenarFechaInforme();

[introduccionInput, hechosInput, analisisInput, conclusionesInput, recomendacionesInput]
  .forEach(setupNumberedTextarea);

setupAnexosSection();
renderGaleriaAnexos();
recalcularProgreso();
