// ðŸš« NO BORRAR â€” Bloque restaurado/corregido del mÃ³dulo Mamparas
import { supabase } from "../utils/supabase.js";
export { supabase };

const STORAGE_BUCKET = "mamparas";
const VALIDACION_PLACA_DELAY = 450;
const MAX_PLACA_LENGTH = 6;
const MIN_PLACA_LENGTH = MAX_PLACA_LENGTH;

let actualizarEmpresaPersonalizadaFn = null;
let actualizarBotonDetalleFn = null;
let registroPlacaDetectado = null;
let placaIgnorada = "";
let detallePrefill = null;
let placaPrefill = "";
let formularioInicializado = null;
let fechaHoraListenerActivo = false;
let actualizarEstadoFormularioFn = null;
let estadoPlacaExterno = null;

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
  const inline = document.getElementById("mamparasFeedback");
  if (inline) {
    inline.textContent = mensaje;
    inline.dataset.tone = tipo === "error" ? "error" : "success";
    inline.classList.add("is-visible");
    if (tipo !== "error") {
      window.setTimeout(() => inline.classList.remove("is-visible"), 4200);
    }
    return;
  }

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
  }, 300);

  setTimeout(() => hideModalOverlay(feedbackModal), 4200);
}

const FIELD_RULES = {
  placa: {
    message: "6 caracteres alfanuméricos",
    invalid: "Ingresa una placa de 6 caracteres alfanuméricos.",
    valid: () => /^[A-Z0-9]{6}$/.test(normalizarPlaca(obtenerInput("placa")?.value || "")),
  },
  empresa: {
    message: "Selecciona la empresa transportista",
    invalid: "Selecciona una empresa.",
    valid: () => {
      const empresa = obtenerInput("empresa");
      if (!empresa?.value) return false;
      if (empresa.value !== "otra") return true;
      return Boolean((obtenerInput("nueva_empresa")?.value || "").trim());
    },
  },
  chofer: {
    message: "Nombre del conductor",
    invalid: "Ingresa el nombre del conductor.",
    valid: () => Boolean((obtenerInput("chofer")?.value || "").trim()),
  },
  lugar: {
    message: "Ubicación de la inspección",
    invalid: "Selecciona el lugar de la inspección.",
    valid: () => Boolean(obtenerInput("lugar")?.value),
  },
  incorreccion: {
    message: "Al seleccionar se habilitan medidas y fotografías",
    invalid: "Selecciona el tipo de incorrección.",
    valid: () => Boolean(obtenerInput("incorreccion")?.value),
  },
  responsable: {
    message: "Responsable de la inspección",
    invalid: "Selecciona al responsable.",
    valid: () => Boolean(obtenerInput("responsable")?.value),
  },
  observaciones: {
    message: "Contexto operativo observado",
    invalid: "Selecciona la operación observada.",
    valid: () => Boolean(obtenerInput("observaciones")?.value),
  },
};

function setFieldVisualState(id, { marcarInvalido = false } = {}) {
  const rule = FIELD_RULES[id];
  const wrapper = document.querySelector(`[data-required-field="${id}"]`);
  const message = document.getElementById(`${id}FieldMessage`);
  if (!rule || !wrapper) return false;

  const valid = Boolean(rule.valid());
  const touched = wrapper.dataset.touched === "1";

  wrapper.classList.remove("is-error", "is-warning", "is-complete");

  if (id === "placa" && valid && estadoPlacaExterno?.message) {
    wrapper.classList.add(estadoPlacaExterno.tone === "warning" ? "is-warning" : "is-complete");
    if (message) message.textContent = estadoPlacaExterno.message;
    return valid;
  }

  if (valid) {
    wrapper.classList.add("is-complete");
    if (message) message.textContent = rule.message;
    return true;
  }

  if (touched || marcarInvalido) {
    wrapper.classList.add("is-error");
    if (message) message.textContent = rule.invalid;
  } else if (message) {
    message.textContent = rule.message;
  }
  return false;
}

function parseDetalleActual() {
  const raw = obtenerInput("detalle")?.value || "";
  return parseDetalleJSON(raw) || null;
}

function contarEvidenciasDetalle(detalle) {
  if (!detalle?.imagenes || typeof detalle.imagenes !== "object") return 0;
  return Object.values(detalle.imagenes).filter(Boolean).length;
}

function actualizarEstadoFormulario({ marcarInvalidos = false } = {}) {
  const form = document.getElementById("form-inspeccion");
  if (!form) return false;

  const fieldStatus = Object.fromEntries(
    Object.keys(FIELD_RULES).map((id) => [id, setFieldVisualState(id, { marcarInvalido })])
  );

  const detalle = parseDetalleActual();
  const detalleListo = Boolean(detalle && form.dataset.detailDirty !== "1");
  const evidenciaCount = contarEvidenciasDetalle(detalle);

  const unitComplete = fieldStatus.placa;
  const operationComplete = fieldStatus.empresa && fieldStatus.chofer && fieldStatus.lugar;
  const findingComplete =
    fieldStatus.incorreccion && fieldStatus.responsable && fieldStatus.observaciones;
  const evidenceComplete = detalleListo;

  const steps = [
    ["unit", unitComplete],
    ["operation", operationComplete],
    ["finding", findingComplete],
    ["evidence", evidenceComplete],
  ];
  const firstIncomplete = steps.findIndex(([, complete]) => !complete);

  steps.forEach(([name, complete], index) => {
    const el = document.querySelector(`.v3-step[data-step="${name}"]`);
    if (!el) return;
    el.classList.remove("is-current", "is-complete", "is-pending");
    el.removeAttribute("aria-current");

    const badge = el.querySelector("b");
    if (complete) {
      el.classList.add("is-complete");
      if (badge) badge.textContent = "✓";
    } else {
      el.classList.add(index === firstIncomplete ? "is-current" : "is-pending");
      if (index === firstIncomplete) el.setAttribute("aria-current", "step");
      if (badge) badge.textContent = String(index + 1);
    }
  });

  const completeCount =
    Object.values(fieldStatus).filter(Boolean).length + (evidenceComplete ? 1 : 0);
  const total = Object.keys(FIELD_RULES).length + 1;

  const countEl = document.getElementById("validationCount");
  const textEl = document.getElementById("validationText");
  if (countEl) countEl.textContent = `${completeCount} de ${total} requisitos completos`;

  let summary = "Completa los campos para habilitar el registro.";
  if (fieldStatus.incorreccion && !detalleListo) {
    summary = form.dataset.detailDirty === "1"
      ? "Guarda las medidas y evidencias actualizadas."
      : "Completa y guarda las medidas y evidencias.";
  } else if (completeCount === total) {
    summary = "Inspección lista para registrar.";
  }
  if (textEl) textEl.textContent = summary;

  const btnRegistrar = document.getElementById("btnRegistrarInspeccion");
  const allComplete = completeCount === total;
  if (btnRegistrar) {
    btnRegistrar.disabled = !allComplete;
    btnRegistrar.setAttribute("aria-disabled", String(!allComplete));
  }

  const badge = document.getElementById("detalleStateBadge");
  if (badge) {
    badge.classList.remove("is-pending", "is-ready", "is-dirty");
    if (!fieldStatus.incorreccion) {
      badge.textContent = "Pendiente";
      badge.classList.add("is-pending");
    } else if (detalleListo) {
      badge.textContent = "Listo";
      badge.classList.add("is-ready");
    } else {
      badge.textContent = "Por guardar";
      badge.classList.add("is-dirty");
    }
  }

  const evidenceCountEl = document.getElementById("evidenceStateCount");
  if (evidenceCountEl) evidenceCountEl.textContent = String(evidenciaCount);

  return allComplete;
}

function initEstadoFormulario() {
  const form = document.getElementById("form-inspeccion");
  if (!form) return;

  form.dataset.detailDirty = obtenerInput("detalle")?.value ? "0" : "1";

  Object.keys(FIELD_RULES).forEach((id) => {
    const input = obtenerInput(id);
    const wrapper = document.querySelector(`[data-required-field="${id}"]`);
    if (!input || !wrapper) return;

    const touch = () => {
      wrapper.dataset.touched = "1";
      actualizarEstadoFormulario();
    };
    input.addEventListener("change", touch);
    input.addEventListener("input", () => actualizarEstadoFormulario());
    input.addEventListener("blur", touch);
  });

  const nuevaEmpresa = obtenerInput("nueva_empresa");
  if (nuevaEmpresa) {
    nuevaEmpresa.addEventListener("input", () => {
      const wrapper = document.querySelector('[data-required-field="empresa"]');
      if (wrapper) wrapper.dataset.touched = "1";
      actualizarEstadoFormulario();
    });
  }

  const detailContainer = document.getElementById("contenidoDetalle");
  if (detailContainer) {
    const markDirty = (event) => {
      if (!event.target.matches("input, textarea, select")) return;
      form.dataset.detailDirty = "1";
      mostrarDetalleGuardadoAviso(false);
      actualizarEstadoFormulario();
    };
    detailContainer.addEventListener("input", markDirty);
    detailContainer.addEventListener("change", markDirty);
  }

  actualizarEstadoFormularioFn = actualizarEstadoFormulario;
  actualizarEstadoFormulario();
}

export function mostrarModalCorreo(datosFormulario = {}, detalleJSON, options = {}) {
  cerrarTodosLosModales();
  const { onFinalizar, onCancelar } = options || {};

  const escapeHtml = (valor) =>
    String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const textoSeguro = (valor, fallback = "--") => {
    const texto = String(valor ?? "").trim();
    return texto ? texto : fallback;
  };

  const resolverHoraTexto = (horaValor, timestamp) => {
    const horaRaw = String(horaValor ?? "").trim();
    if (/^\d{1,2}:\d{2}/.test(horaRaw)) return horaRaw.slice(0, 5);
    const fecha = timestamp ? new Date(timestamp) : null;
    if (fecha && !Number.isNaN(fecha.getTime())) {
      return fecha.toTimeString().slice(0, 5);
    }
    return new Date().toTimeString().slice(0, 5);
  };

  const obtenerSaludo = (horaTexto) => {
    const match = /^(\d{1,2}):(\d{2})/.exec(horaTexto || "");
    let totalMinutos = null;
    if (match) {
      const horas = Number(match[1]);
      const minutos = Number(match[2]);
      if (Number.isFinite(horas) && Number.isFinite(minutos)) {
        totalMinutos = horas * 60 + minutos;
      }
    }
    if (!Number.isFinite(totalMinutos)) {
      const ahora = new Date();
      totalMinutos = ahora.getHours() * 60 + ahora.getMinutes();
    }

    if (totalMinutos >= 300 && totalMinutos <= 719) return "Buenos d\u00EDas";
    if (totalMinutos >= 720 && totalMinutos <= 1079) return "Buenas tardes";
    return "Buenas noches";
  };

  const detalleBruto = detalleJSON ?? datosFormulario?.detalle ?? null;
  const detalleObj =
    parseDetalleJSON(detalleBruto) ||
    (detalleBruto && typeof detalleBruto === "object" ? detalleBruto : {});
  const detalleDatos = detalleObj?.datos || {};
  const detalleImagenes = detalleObj?.imagenes || {};

  const tipo = textoSeguro(detalleObj?.tipo || datosFormulario?.incorreccion || "Mampara");
  const tipoUpper = String(tipo).toUpperCase();
  const placa = textoSeguro(datosFormulario?.placa, "--");
  const empresa = textoSeguro(datosFormulario?.empresa, "--");
  const horaRegistro = resolverHoraTexto(datosFormulario?.hora, detalleObj?.timestamp);
  const saludo = obtenerSaludo(horaRegistro);
  const esMampara = tipoUpper === "MAMPARA";

  const separacionRegistro =
    formatearMedidaTexto(
      detalleDatos.separacion_lateral_central ??
        detalleDatos.separacion_central ??
        detalleObj?.separacion_lateral_central ??
        detalleObj?.separacion_central ??
        datosFormulario?.separacion_central ??
        ""
    ) || "--";
  const alturaRegistro =
    formatearMedidaTexto(
      detalleDatos.altura_mampara ??
        detalleObj?.altura_mampara ??
        datosFormulario?.altura_mampara ??
        ""
    ) || "--";
  const observacionTexto = textoSeguro(
    detalleDatos.observacion_texto ??
      detalleObj?.observacion_texto ??
      datosFormulario?.observaciones ??
      "",
    "--"
  );

  const asunto = `UT ${placa} NO CUMPLE ESTANDAR DE SEGURIDAD // ${tipoUpper}`;

  const imagenesCorreo = esMampara
    ? [
        {
          label: "Foto panoramica",
          labelHtml: "Foto panor&aacute;mica",
          url:
            detalleImagenes.foto_panoramica_unidad ??
            detalleObj?.foto_panoramica_unidad ??
            datosFormulario?.foto_unidad ??
            "",
        },
        {
          label: "Foto altura",
          labelHtml: "Foto altura",
          url:
            detalleImagenes.foto_altura_mampara ??
            detalleObj?.foto_altura_mampara ??
            datosFormulario?.foto_observacion ??
            "",
        },
        {
          label: "Foto lateral",
          labelHtml: "Foto lateral",
          url:
            detalleImagenes.foto_lateral_central ??
            detalleObj?.foto_lateral_central ??
            "",
        },
      ]
    : [
        {
          label: "Foto observacion",
          labelHtml: "Foto observaci&oacute;n",
          url:
            detalleImagenes.foto_observacion ??
            detalleObj?.foto_observacion ??
            datosFormulario?.foto_observacion ??
            "",
        },
      ];

  const imagenesDisponibles = [];
  const thumbnailWidth = 120;
  const thumbnailHeight = 80;

  const imagenesCards = imagenesCorreo
    .map((img, idx) => {
      let index = -1;
      if (img.url) {
        imagenesDisponibles.push(img);
        index = imagenesDisponibles.length - 1;
      }
      const habilitada = index >= 0;
      const dataAttr = habilitada ? `data-correo-img=\"${index}\"` : "aria-disabled=\"true\"";
      const claseEstado = habilitada
        ? "cursor-pointer hover:shadow-md hover:ring-2 hover:ring-indigo-500"
        : "cursor-not-allowed opacity-60";
      const wrapperStyle = `width:${thumbnailWidth}px;height:${thumbnailHeight}px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;`;
      const contenido = habilitada
        ? `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(
            img.label
          )}" width="${thumbnailWidth}" height="${thumbnailHeight}" border="0" style="display:block;width:${thumbnailWidth}px;height:${thumbnailHeight}px;object-fit:cover;border:0;outline:none;text-decoration:none;" loading="lazy" />`
        : `<div style="${wrapperStyle}display:flex;align-items:center;justify-content:center;font-size:11px;color:#9ca3af;">Sin foto</div>`;
      const card = habilitada
        ? `<a href="${escapeHtml(
            img.url
          )}" target="_blank" rel="noopener noreferrer" class="${claseEstado}" ${dataAttr} style="${wrapperStyle}display:inline-block;text-decoration:none;">${contenido}</a>`
        : contenido;
      const cellPadding = idx < imagenesCorreo.length - 1 ? "12px" : "0";

      return `
        <td style="padding-right:${cellPadding};vertical-align:top;">
          <div style="font-size:12px;font-weight:600;color:#4b5563;margin-bottom:6px;text-align:center;">
            ${img.labelHtml}
          </div>
          ${card}
        </td>
      `;
    })
    .join("");

  const bloqueEstandar = esMampara
    ? `
      <div class="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
        <p class="text-xs uppercase tracking-[0.2em] text-red-600 font-semibold">
          EST\u00C1NDAR ESTABLECIDO
        </p>
        <ul class="text-sm text-gray-700 space-y-1">
          <li>Altura de mampara: 1.80 m</li>
          <li>Distancia de mampara en toda su extensi&oacute;n al contenedor: 0.15 m</li>
          <li>Mampara sin ventanas o huecos</li>
        </ul>
      </div>
    `
    : "";

  const observacionSection =
    !esMampara && observacionTexto !== "--"
      ? `
        <div class="space-y-2">
          <p class="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">
            Observaci&oacute;n registrada
          </p>
          <p class="text-sm text-gray-700">${escapeHtml(observacionTexto)}</p>
        </div>
      `
      : "";

  const modalId = "modalCorreo";
  document.getElementById(modalId)?.remove();

  const overlay = document.createElement("div");
  overlay.id = modalId;
  overlay.className =
    "modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm px-4 py-6 animate-fade";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 sm:p-8 relative animate-scale">
      <button
        type="button"
        class="absolute top-4 right-4 z-20 inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 bg-white text-gray-800 text-2xl leading-none shadow-md hover:bg-gray-50"
        data-close
        aria-label="Cerrar"
      >&times;</button>

      <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 12px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-right: 44px;">
          <div class="space-y-1" style="flex: 1 1 auto; min-width: 0;">
            <p class="text-xs uppercase tracking-[0.2em] text-indigo-500 font-semibold">Correo</p>
            <h3 class="text-lg font-semibold text-gray-900">
              ASUNTO: <span data-correo-asunto>${escapeHtml(asunto)}</span>
            </h3>
          </div>
          <button
            type="button"
            class="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50"
            style="width: auto; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap;"
            data-copy-subject
          >
            Copiar asunto
          </button>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; padding-right: 44px; margin-top: 12px;">
        <button
          type="button"
          class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-md hover:bg-indigo-700"
          style="width: auto; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap;"
          data-copy
        >
          Copiar cuerpo
        </button>
      </div>

      <div class="mt-4 max-h-[70vh] overflow-y-auto pr-1 text-sm text-gray-700">
        <div class="space-y-6" data-correo-body>
          <div class="space-y-2">
          <p>Estimado Sr. Juan Murga,</p>
          <p>${saludo}.</p>
          <p>
            Informo que, siendo las <strong>${escapeHtml(
              horaRegistro
            )}</strong> horas, la unidad de placa
            <strong>${escapeHtml(placa)} &ndash; ${escapeHtml(empresa)}</strong> se hace presente con la siguiente observaci&oacute;n.
          </p>
          <p>
            No cumple con los est&aacute;ndares establecidos para la
            <strong>${escapeHtml(tipoUpper)}</strong>:
          </p>
          </div>

          ${bloqueEstandar}
          ${observacionSection}

          
          <div class="space-y-2">
          <p class="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">
            MEDIDAS REGISTRADAS EN INSPECCI&Oacute;N
          </p>
          <div class="space-y-1 text-sm text-gray-700">
            <p>Altura de mampara: <span class="font-semibold">${escapeHtml(alturaRegistro)}</span></p>
            <p>
              Separaci&oacute;n lateral central:
              <span class="font-semibold">${escapeHtml(separacionRegistro)}</span>
            </p>
          </div>
          </div>

          <div class="space-y-3">
          <p class="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">
            IM&Aacute;GENES REGISTRADAS
          </p>
          <div style="overflow-x:auto;padding-bottom:8px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr>
                ${imagenesCards}
              </tr>
            </table>
          </div>
          </div>
        </div>
      </div>

      <div
        class="mt-6"
        style="display: flex; justify-content: flex-end; gap: 12px; flex-wrap: wrap; margin-top: 16px;"
        data-final-actions
      >
        <button
          type="button"
          class="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50"
          data-cancelar
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-md hover:bg-indigo-700"
          data-finalizar
        >
          Finalizar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const cerrar = (notificarCancelacion = true) => {
    overlay.remove();
    document.removeEventListener("keydown", handleEsc);
    if (notificarCancelacion && typeof onCancelar === "function") {
      onCancelar();
    }
  };

  const handleEsc = (event) => {
    if (event.key === "Escape") cerrar(true);
  };

  document.addEventListener("keydown", handleEsc);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target.closest("[data-close]")) {
      cerrar(true);
      return;
    }

    const btn = event.target.closest("[data-correo-img]");
    if (btn) {
      event.preventDefault();
      const index = Number(btn.dataset.correoImg);
      const imagen = imagenesDisponibles[index];
      if (imagen?.url) {
        abrirPreviewImagenModal(imagen.url);
      }
    }
  });

  const copySubjectBtn = overlay.querySelector("[data-copy-subject]");
  const copyBtn = overlay.querySelector("[data-copy]");
  const accionesFinales = overlay.querySelector("[data-final-actions]");
  const btnFinalizar = overlay.querySelector("[data-finalizar]");
  const btnCancelar = overlay.querySelector("[data-cancelar]");
  let accionesVisibles = false;

  const mostrarAccionesFinales = () => {
    if (accionesVisibles) return;
    accionesVisibles = true;
    accionesFinales?.classList.remove("hidden");
  };

  if (btnCancelar) {
    btnCancelar.addEventListener("click", () => cerrar(true));
  }

  if (btnFinalizar) {
    btnFinalizar.addEventListener("click", async () => {
      if (!btnFinalizar || btnFinalizar.disabled) return;
      const labelOriginal = btnFinalizar.textContent;
      btnFinalizar.disabled = true;
      btnFinalizar.classList.add("opacity-60", "cursor-not-allowed");
      btnFinalizar.textContent = "Guardando...";

      let exito = true;
      if (typeof onFinalizar === "function") {
        try {
          exito = await onFinalizar();
        } catch {
          exito = false;
        }
      }

      if (exito !== false) {
        cerrar(false);
        return;
      }

      btnFinalizar.disabled = false;
      btnFinalizar.classList.remove("opacity-60", "cursor-not-allowed");
      btnFinalizar.textContent = labelOriginal;
    });
  }

  if (copySubjectBtn) {
    const originalLabel = copySubjectBtn.textContent;
    copySubjectBtn.addEventListener("click", async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(asunto);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = asunto;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          textarea.remove();
        }

        copySubjectBtn.textContent = "Copiado";
        setTimeout(() => {
          copySubjectBtn.textContent = originalLabel;
        }, 1800);
      } catch (err) {
        copySubjectBtn.textContent = "Error al copiar";
        setTimeout(() => {
          copySubjectBtn.textContent = originalLabel;
        }, 1800);
      }
    });
  }

  if (copyBtn) {
    const originalLabel = copyBtn.textContent;
    copyBtn.addEventListener("click", async () => {
      const cuerpo = overlay.querySelector("[data-correo-body]");
      if (!cuerpo) return;
      const textoPlano = cuerpo.innerText.trim();
      const html = cuerpo.innerHTML.trim();

      try {
        if (navigator.clipboard?.write && window.ClipboardItem) {
          const item = new ClipboardItem({
            "text/plain": new Blob([textoPlano], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          });
          await navigator.clipboard.write([item]);
        } else {
          const selection = window.getSelection();
          const ranges = [];
          if (selection) {
            for (let i = 0; i < selection.rangeCount; i += 1) {
              ranges.push(selection.getRangeAt(i));
            }
            selection.removeAllRanges();
          }

          const range = document.createRange();
          range.selectNodeContents(cuerpo);
          selection?.addRange(range);

          const copied = document.execCommand("copy");
          selection?.removeAllRanges();

          if (ranges.length) {
            ranges.forEach((storedRange) => selection?.addRange(storedRange));
          }

          if (!copied) {
            if (navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(textoPlano);
            } else {
              const textarea = document.createElement("textarea");
              textarea.value = textoPlano;
              textarea.style.position = "fixed";
              textarea.style.opacity = "0";
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand("copy");
              textarea.remove();
            }
          }
        }

        copyBtn.textContent = "Copiado";
        setTimeout(() => {
          copyBtn.textContent = originalLabel;
        }, 1800);
      } catch (err) {
        copyBtn.textContent = "Error al copiar";
        setTimeout(() => {
          copyBtn.textContent = originalLabel;
        }, 1800);
      } finally {
        mostrarAccionesFinales();
      }
    });
  }
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

function normalizarPlaca(valor) {
  return String(valor || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export async function subirImagen(nombreCampo, archivo) {
  if (!archivo) return null;

  if (archivo.size > 12 * 1024 * 1024) {
    mostrarModal("error", "La imagen supera el límite de 12 MB.");
    return null;
  }

  if (!archivo.type.startsWith("image/")) {
    mostrarModal("error", "Solo se permiten archivos de imagen.");
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

  const fechaHoraLocal = obtenerFechaHoraLocal();

  const registro = {
    fecha: datosFormulario.fecha || fechaHoraLocal.fecha,
    hora: datosFormulario.hora || fechaHoraLocal.hora,
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
  const placaActual = normalizarPlaca(obtenerInput("placa")?.value || "");
  const usarPrefill = detallePrefill && detallePrefill.tipo === tipo && placaPrefill === placaActual;
  limpiarDetalleModal({ clearStored: !usarPrefill });
  if (usarPrefill) {
    aplicarPrefillEnModal(detallePrefill);
  }
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

if (typeof window !== "undefined") {
  window.cerrarModalPreview = cerrarModalPreview;
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
    alerta.classList.add("is-visible");
  } else {
    alerta.classList.add("hidden");
    alerta.classList.remove("is-visible");
  }
}

function limpiarDetalleModal({ clearStored = true } = {}) {
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

  if (clearStored) {
    const detalleCampo = obtenerInput("detalle");
    if (detalleCampo) detalleCampo.value = "";
    const form = document.getElementById("form-inspeccion");
    if (form) form.dataset.detailDirty = "1";
    renderGaleriaMamparas(null);
    mostrarDetalleGuardadoAviso(false);
  }
  toggleDetalleAlert(false);
  actualizarEstadoFormularioFn?.();
}

function mostrarDetalleGuardadoAviso(visible) {
  const aviso = document.getElementById("detalleGuardadoAviso");
  const badge = document.getElementById("detalleStateBadge");
  if (aviso) {
    aviso.classList.toggle("hidden", !visible);
    aviso.classList.toggle("is-visible", visible);
  }
  if (badge && visible) {
    badge.textContent = "Listo";
    badge.classList.remove("is-pending", "is-dirty");
    badge.classList.add("is-ready");
  }
}

function renderGaleriaMamparas(detalle) {
  const cont = document.getElementById("galeriaMamparas");
  const countEl = document.getElementById("evidenceStateCount");
  if (!cont) return;

  cont.innerHTML = "";
  const imagenes = detalle?.imagenes && typeof detalle.imagenes === "object"
    ? detalle.imagenes
    : {};
  const disponibles = Object.entries(imagenes).filter(([, url]) => Boolean(url));

  if (countEl) countEl.textContent = String(disponibles.length);

  if (!disponibles.length) {
    const empty = document.createElement("div");
    empty.className = "evidence-empty compact";
    empty.innerHTML = "<strong>Sin evidencias</strong><span>Las fotografías guardadas aparecerán aquí.</span>";
    cont.appendChild(empty);
    actualizarEstadoFormularioFn?.();
    return;
  }

  const labels = {
    foto_panoramica_unidad: "Panorámica",
    foto_altura_mampara: "Altura",
    foto_lateral_central: "Lateral",
    foto_observacion: "Observación",
  };

  disponibles.forEach(([key, url]) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "evidence-card";
    item.setAttribute("data-evidence-card", "1");
    item.setAttribute("aria-label", `Abrir evidencia ${labels[key] || "fotográfica"}`);

    const img = document.createElement("img");
    img.src = url;
    img.alt = labels[key] || "Evidencia de inspección";
    img.loading = "lazy";

    const caption = document.createElement("div");
    caption.className = "evidence-caption";
    caption.textContent = labels[key] || "Evidencia";

    item.appendChild(img);
    item.appendChild(caption);
    item.addEventListener("click", () => abrirPreviewImagenModal(url));
    cont.appendChild(item);
  });

  actualizarEstadoFormularioFn?.();
}

async function guardarDetalleJSON() {
  const incorreccion = obtenerInput("incorreccion");
  const campoDetalle = obtenerInput("detalle");
  const form = document.getElementById("form-inspeccion");
  const btnGuardar = document.getElementById("btnGuardarDetalle");
  if (!incorreccion || !campoDetalle || !form) return false;

  const tipo = incorreccion.value;
  if (!tipo) {
    toggleDetalleAlert(true, "Selecciona un tipo de incorrección.");
    return false;
  }

  const detalle = {
    tipo,
    datos: {},
    imagenes: {},
    timestamp: new Date().toISOString(),
  };

  const stored = parseDetalleJSON(campoDetalle.value);
  const prefill =
    detallePrefill && detallePrefill.tipo === tipo
      ? detallePrefill
      : stored && stored.tipo === tipo
        ? stored
        : null;
  const prefillDatos = prefill?.datos || {};
  const prefillImagenes = prefill?.imagenes || {};

  if (btnGuardar) {
    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando...";
  }

  try {
    if (tipo === "Mampara") {
      const sepCentralInput = obtenerInput("sepCentral")?.value.trim();
      const alturaMamparaInput = obtenerInput("alturaMampara")?.value.trim();
      const fotoPanoramica = obtenerInput("fotoPanoramica")?.files?.[0];
      const fotoAltura = obtenerInput("fotoAltura")?.files?.[0];
      const fotoLateral = obtenerInput("fotoLateral")?.files?.[0];

      const sepCentral =
        sepCentralInput || prefillDatos.separacion_lateral_central || prefillDatos.separacion_central || "";
      const alturaMampara = alturaMamparaInput || prefillDatos.altura_mampara || "";
      const fotoPanoramicaBase = fotoPanoramica || prefillImagenes.foto_panoramica_unidad;
      const fotoAlturaBase = fotoAltura || prefillImagenes.foto_altura_mampara;
      const fotoLateralBase = fotoLateral || prefillImagenes.foto_lateral_central;

      const faltantes = [];
      if (!sepCentral) faltantes.push("la separación lateral");
      if (!alturaMampara) faltantes.push("la altura");
      if (!fotoPanoramicaBase) faltantes.push("la foto panorámica");
      if (!fotoAlturaBase) faltantes.push("la foto de altura");
      if (!fotoLateralBase) faltantes.push("la foto lateral");

      if (faltantes.length) {
        toggleDetalleAlert(true, `Completa ${faltantes.join(", ")}.`);
        return false;
      }

      const fotoPanoramicaUrl = fotoPanoramica
        ? await subirImagen("panoramica", fotoPanoramica)
        : prefillImagenes.foto_panoramica_unidad;
      const fotoAlturaUrl = fotoAltura
        ? await subirImagen("altura", fotoAltura)
        : prefillImagenes.foto_altura_mampara;
      const fotoLateralUrl = fotoLateral
        ? await subirImagen("lateral", fotoLateral)
        : prefillImagenes.foto_lateral_central;

      if (!fotoPanoramicaUrl || !fotoAlturaUrl || !fotoLateralUrl) {
        toggleDetalleAlert(true, "No se pudieron guardar todas las fotografías.");
        return false;
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
      const observacionInput = obtenerInput("observacionTexto")?.value.trim();
      const fotoObservacion = obtenerInput("fotoObservacion")?.files?.[0];
      const observacionTexto = observacionInput || prefillDatos.observacion_texto || "";
      const fotoObservacionBase = fotoObservacion || prefillImagenes.foto_observacion;
      const faltantes = [];

      if (!observacionTexto) faltantes.push("la descripción");
      if (!fotoObservacionBase) faltantes.push("la foto de observación");
      if (faltantes.length) {
        toggleDetalleAlert(true, `Completa ${faltantes.join(" y ")}.`);
        return false;
      }

      const fotoObservacionUrl = fotoObservacion
        ? await subirImagen("observacion", fotoObservacion)
        : prefillImagenes.foto_observacion;
      if (!fotoObservacionUrl) {
        toggleDetalleAlert(true, "No se pudo guardar la fotografía.");
        return false;
      }

      detalle.datos = { observacion_texto: observacionTexto };
      detalle.imagenes = { foto_observacion: fotoObservacionUrl };
    }

    toggleDetalleAlert(false);

    const placa = (obtenerInput("placa")?.value || "sinplaca").trim().toUpperCase();
    const jsonMeta = await subirDetalleJSONArchivo(detalle, placa);
    if (jsonMeta) detalle.json_storage = jsonMeta;

    campoDetalle.value = JSON.stringify(detalle);
    form.dataset.detailDirty = "0";
    mostrarDetalleGuardadoAviso(true);
    renderGaleriaMamparas(detalle);
    detallePrefill = detalle;
    placaPrefill = normalizarPlaca(obtenerInput("placa")?.value || "");
    actualizarEstadoFormularioFn?.();
    return true;
  } finally {
    if (btnGuardar) {
      btnGuardar.disabled = false;
      btnGuardar.textContent = "Guardar detalle";
    }
  }
}

function initDetalleModal() {
  const incorreccion = obtenerInput("incorreccion");
  const btnGuardarDetalle = document.getElementById("btnGuardarDetalle");
  const btnLimpiarDetalle = document.getElementById("btnLimpiarDetalle");
  const detailContainer = document.getElementById("contenidoDetalle");
  if (!incorreccion || !detailContainer) return;

  if (btnGuardarDetalle) {
    btnGuardarDetalle.addEventListener("click", (event) => {
      event.preventDefault();
      void guardarDetalleJSON();
    });
  }

  if (btnLimpiarDetalle) {
    btnLimpiarDetalle.addEventListener("click", (event) => {
      event.preventDefault();
      limpiarDetalleModal();
      detallePrefill = null;
      placaPrefill = "";
      const form = document.getElementById("form-inspeccion");
      if (form) form.dataset.detailDirty = "1";
      actualizarEstadoFormularioFn?.();
    });
  }
}

function initDetalleTrigger() {
  const incorreccion = obtenerInput("incorreccion");
  const detalleInput = obtenerInput("detalle");
  const acciones = document.getElementById("detalleActions");
  const title = document.getElementById("detalleInlineTitle");
  const hint = document.getElementById("detalleInlineHint");
  const form = document.getElementById("form-inspeccion");
  if (!incorreccion || !detalleInput) return;

  actualizarBotonDetalleFn = () => {
    const tipo = incorreccion.value;
    const tieneValor = Boolean(tipo);
    toggleHidden(acciones, !tieneValor);

    if (!tieneValor) {
      detalleInput.value = "";
      if (form) form.dataset.detailDirty = "1";
      const cont = document.getElementById("contenidoDetalle");
      if (cont) {
        cont.innerHTML =
          '<div class="inline-detail-empty"><span>Selecciona una incorrección</span><small>Las medidas y fotografías aparecerán aquí.</small></div>';
      }
      if (title) title.textContent = "Medidas y evidencia";
      if (hint) hint.textContent = "Selecciona una incorrección para mostrar los campos requeridos.";
      mostrarDetalleGuardadoAviso(false);
      renderGaleriaMamparas(null);
      actualizarEstadoFormularioFn?.();
      return;
    }

    if (title) {
      title.textContent = tipo === "Mampara" ? "Medidas de Mampara" : `Detalle de ${tipo}`;
    }
    if (hint) {
      hint.textContent =
        tipo === "Mampara"
          ? "Referencia: separación 15 cm · altura 180 cm · 3 fotografías obligatorias."
          : "Describe el hallazgo y agrega una fotografía obligatoria.";
    }

    generarContenidoModal(tipo);
    if (form && !detalleInput.value) form.dataset.detailDirty = "1";
    actualizarEstadoFormularioFn?.();
  };

  incorreccion.addEventListener("change", () => {
    const stored = parseDetalleJSON(detalleInput.value);
    if (stored && stored.tipo !== incorreccion.value) {
      detalleInput.value = "";
      detallePrefill = null;
      placaPrefill = "";
    }
    if (form) form.dataset.detailDirty = "1";
    actualizarBotonDetalleFn();
  });

  actualizarBotonDetalleFn();
}

function autocompletarFechaHora() {
  const fecha = obtenerInput("fecha");
  const hora = obtenerInput("hora");
  const { fecha: fechaLocal, hora: horaLocal } = obtenerFechaHoraLocal();
  if (fecha) {
    forzarValorInput(fecha, fechaLocal, true);
  }
  if (hora) {
    forzarValorInput(hora, horaLocal, false);
  }
}

function obtenerFechaHoraLocal() {
  const ahora = new Date();
  const offsetMs = ahora.getTimezoneOffset() * 60000;
  const local = new Date(ahora.getTime() - offsetMs);
  return {
    fecha: local.toISOString().slice(0, 10),
    hora: ahora.toTimeString().slice(0, 5),
  };
}

function forzarValorInput(input, value, usarFecha) {
  if (!input || !value) return;
  const eraReadOnly = input.readOnly;
  input.readOnly = false;
  input.value = value;
  input.setAttribute("value", value);
  if (usarFecha && !input.value) {
    input.valueAsDate = new Date(`${value}T00:00:00`);
  }
  input.readOnly = eraReadOnly;
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

async function consultarPlacaExistente(placa) {
  const placaRaw = String(placa || "").toUpperCase().trim();
  const placaNormalizada = normalizarPlaca(placaRaw);

  if (placaNormalizada.length !== MAX_PLACA_LENGTH) return;

  const placaConGuion =
    placaNormalizada.slice(0, 3) + "-" + placaNormalizada.slice(3);
  const placaConEspacio =
    placaNormalizada.slice(0, 3) + " " + placaNormalizada.slice(3);

  const posibles = [
    placaRaw,
    placaNormalizada,
    placaConGuion,
    placaConEspacio,
  ].filter((valor, index, arr) => valor && arr.indexOf(valor) === index);

  try {
    estadoPlacaExterno = {
      tone: "info",
      message: "Validando antecedentes...",
    };
    actualizarEstadoFormularioFn?.();

    // Mantener compatibilidad con registros históricos: la versión estable
    // del formulario leía el registro completo. No restringir columnas aquí
    // hasta validar el esquema real de producción.
    let query = supabase.from("inspecciones").select("*");

    const filtro = posibles
      .map((valor) => "placa.ilike." + valor)
      .join(",");

    if (filtro) query = query.or(filtro);

    let { data, error } = await query
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false })
      .limit(10);

    if (error) throw error;

    let coincidencia = (data || []).find(
      (registro) => normalizarPlaca(registro?.placa) === placaNormalizada
    );

    // Fallback para formatos históricos no previstos, por ejemplo espacios,
    // puntos u otros separadores entre caracteres.
    if (!coincidencia) {
      const patronFlexible =
        "%" + placaNormalizada.split("").join("%") + "%";

      const fallback = await supabase
        .from("inspecciones")
        .select("*")
        .ilike("placa", patronFlexible)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false })
        .limit(25);

      if (fallback.error) throw fallback.error;

      coincidencia = (fallback.data || []).find(
        (registro) => normalizarPlaca(registro?.placa) === placaNormalizada
      );
    }

    // Evita que una respuesta antigua abra un registro después de que el
    // usuario ya cambió la placa.
    const placaActual = normalizarPlaca(obtenerInput("placa")?.value || "");
    if (placaActual !== placaNormalizada) return;

    if (coincidencia) {
      registroPlacaDetectado = coincidencia;
      estadoPlacaExterno = {
        tone: "warning",
        message: "Placa existente. Puedes reutilizar los datos del último registro.",
      };
      actualizarEstadoFormularioFn?.();
      mostrarModalPlaca(coincidencia, placaNormalizada);
      return;
    }

    registroPlacaDetectado = null;
    estadoPlacaExterno = {
      tone: "success",
      message: "Placa nueva. No se encontraron antecedentes.",
    };
    actualizarEstadoFormularioFn?.();
    ocultarModalPlaca();
  } catch (error) {
    registroPlacaDetectado = null;
    estadoPlacaExterno = {
      tone: "error",
      message: "No se pudo validar la placa. Intenta nuevamente.",
    };
    actualizarEstadoFormularioFn?.();
    console.error("Error validando placa:", error.message || error);
  }
}

function construirDetalleDesdeRegistro(registro) {
  const detalleObj = parseDetalleJSON(registro?.detalle) || {};
  const datos = detalleObj?.datos || {};
  const imagenes = detalleObj?.imagenes || {};
  const tipo = detalleObj?.tipo || registro?.incorreccion || "Mampara";

  const separacion =
    datos.separacion_lateral_central ??
    datos.separacion_central ??
    detalleObj.separacion_lateral_central ??
    detalleObj.separacion_central ??
    registro?.separacion_central ??
    null;
  const altura =
    datos.altura_mampara ??
    detalleObj.altura_mampara ??
    registro?.altura_mampara ??
    null;

  return {
    tipo,
    datos: {
      separacion_lateral_central: separacion,
      altura_mampara: altura,
      observacion_texto:
        datos.observacion_texto ?? detalleObj.observacion_texto ?? registro?.observaciones ?? "",
    },
    imagenes: {
      foto_panoramica_unidad:
        imagenes.foto_panoramica_unidad ??
        detalleObj.foto_panoramica_unidad ??
        registro?.foto_unidad ??
        null,
      foto_altura_mampara:
        imagenes.foto_altura_mampara ??
        detalleObj.foto_altura_mampara ??
        registro?.foto_observacion ??
        null,
      foto_lateral_central:
        imagenes.foto_lateral_central ?? detalleObj.foto_lateral_central ?? null,
      foto_observacion:
        imagenes.foto_observacion ?? detalleObj.foto_observacion ?? registro?.foto_observacion ?? null,
    },
  };
}

function mostrarModalPlaca(registro, placa) {
  const modal = document.getElementById("modalPlacaExistente");
  const placaDuplicada = document.getElementById("placaDuplicada");
  const tipoIncorreccion = document.getElementById("tipoIncorreccion");
  if (!modal || !placaDuplicada || !tipoIncorreccion) return;

  placaDuplicada.textContent = placa;
  const detalleBase = construirDetalleDesdeRegistro(registro);
  tipoIncorreccion.textContent = detalleBase.tipo || registro?.incorreccion || "-";
  showModalOverlay(modal);
}

function renderPreviewDesdeUrl(previewId, url, label) {
  const preview = document.getElementById(previewId);
  if (!preview) return;

  preview.innerHTML = "";
  if (!url) {
    preview.classList.add("hidden");
    return;
  }

  preview.classList.remove("hidden");
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "w-20 h-20 rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:scale-105 transition";
  button.innerHTML = `<img src="${url}" alt="${label || "Imagen"}" class="w-full h-full object-cover" />`;
  button.addEventListener("click", () => abrirPreviewImagenModal(url));
  preview.appendChild(button);
}

function aplicarPrefillEnModal(detalleBase) {
  if (!detalleBase) return;

  if (detalleBase.tipo === "Mampara") {
    const sepInput = obtenerInput("sepCentral");
    const alturaInput = obtenerInput("alturaMampara");
    if (sepInput && detalleBase.datos.separacion_lateral_central !== null) {
      sepInput.value = detalleBase.datos.separacion_lateral_central;
    }
    if (alturaInput && detalleBase.datos.altura_mampara !== null) {
      alturaInput.value = detalleBase.datos.altura_mampara;
    }
    renderPreviewDesdeUrl("previewPanoramica", detalleBase.imagenes.foto_panoramica_unidad, "Foto panoramica");
    renderPreviewDesdeUrl("previewAltura", detalleBase.imagenes.foto_altura_mampara, "Foto altura");
    renderPreviewDesdeUrl("previewLateral", detalleBase.imagenes.foto_lateral_central, "Foto lateral");
    return;
  }

  const obsInput = obtenerInput("observacionTexto");
  if (obsInput && detalleBase.datos.observacion_texto) {
    obsInput.value = detalleBase.datos.observacion_texto;
  }
  renderPreviewDesdeUrl("previewObservacion", detalleBase.imagenes.foto_observacion, "Foto observacion");
}

function aplicarRegistroFormulario(registro) {
  if (!registro) return;

  const detalleBase = construirDetalleDesdeRegistro(registro);
  const detallePayload = {
    tipo: detalleBase.tipo || registro?.incorreccion || "Otros",
    datos: detalleBase.datos || {},
    imagenes: detalleBase.imagenes || {},
    timestamp: new Date().toISOString(),
  };

  const placaInput = obtenerInput("placa");
  if (placaInput && registro.placa) placaInput.value = String(registro.placa).toUpperCase();

  const empresaInput = obtenerInput("empresa");
  const nuevaEmpresa = obtenerInput("nueva_empresa");
  const empresaValor = (registro.empresa || "").trim();
  if (empresaInput) {
    const opciones = Array.from(empresaInput.options || []).map((option) => option.value);
    if (empresaValor && opciones.includes(empresaValor)) {
      empresaInput.value = empresaValor;
      if (nuevaEmpresa) nuevaEmpresa.value = "";
    } else if (empresaValor) {
      empresaInput.value = "otra";
      if (nuevaEmpresa) nuevaEmpresa.value = empresaValor;
    }
    actualizarEmpresaPersonalizadaFn?.();
  }

  const setSelectValue = (selectId, value) => {
    const select = obtenerInput(selectId);
    if (!select || value === null || value === undefined || value === "") return;
    const existe = Array.from(select.options || []).some((option) => option.value === value);
    if (existe) select.value = value;
  };

  setSelectValue("lugar", registro.lugar);
  setSelectValue("responsable", registro.responsable);
  setSelectValue("observaciones", registro.observaciones);

  const choferInput = obtenerInput("chofer");
  if (choferInput && registro.chofer) choferInput.value = registro.chofer;

  detallePrefill = detallePayload;
  placaPrefill = normalizarPlaca(placaInput?.value || registro.placa || "");

  const incorreccionInput = obtenerInput("incorreccion");
  if (incorreccionInput) {
    const opciones = Array.from(incorreccionInput.options || []).map((option) => option.value);
    const tipo =
      opciones.includes(detallePayload.tipo)
        ? detallePayload.tipo
        : opciones.includes(registro?.incorreccion)
          ? registro?.incorreccion
          : "Otros";
    incorreccionInput.value = tipo;
    incorreccionInput.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const detalleCampo = obtenerInput("detalle");
  if (detalleCampo) detalleCampo.value = JSON.stringify(detallePayload);

  const form = document.getElementById("form-inspeccion");
  if (form) form.dataset.detailDirty = "0";

  aplicarPrefillEnModal(detallePayload);
  renderGaleriaMamparas(detallePayload);
  mostrarDetalleGuardadoAviso(true);
  toggleDetalleAlert(false);
  actualizarEstadoFormularioFn?.();
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

  const cerrar = ({ ignorar = false, limpiarPrefill = false } = {}) => {
    hideModalOverlay(modal);
    if (ignorar && placaInput) {
      placaIgnorada = normalizarPlaca(placaInput.value || "");
    }
    if (limpiarPrefill) {
      detallePrefill = null;
      placaPrefill = "";
      registroPlacaDetectado = null;
    }
    placaInput?.focus();
  };

  if (btnCerrar) btnCerrar.addEventListener("click", () => cerrar({ ignorar: true, limpiarPrefill: true }));
  if (btnCancelar) btnCancelar.addEventListener("click", () => cerrar({ ignorar: true, limpiarPrefill: true }));
  if (btnContinuar) {
    btnContinuar.addEventListener("click", () => {
      cerrar({ ignorar: true });
      aplicarRegistroFormulario(registroPlacaDetectado);
    });
  }

  modal.addEventListener("click", (event) => {
    if (event.target === modal) cerrar({ ignorar: true, limpiarPrefill: true });
  });
  bindEscClose(modal, () => cerrar({ ignorar: true, limpiarPrefill: true }));
}

function initValidacionPlaca() {
  const placaInput = obtenerInput("placa");
  if (!placaInput) return;

  let debounceId = null;
  let ultimoValorConsultado = "";

  placaInput.addEventListener("input", () => {
    let valorNormalizado = normalizarPlaca(placaInput.value);
    if (valorNormalizado.length > MAX_PLACA_LENGTH) {
      valorNormalizado = valorNormalizado.slice(0, MAX_PLACA_LENGTH);
    }
    if (placaInput.value !== valorNormalizado) {
      placaInput.value = valorNormalizado;
    }

    if (placaPrefill && valorNormalizado !== placaPrefill) {
      detallePrefill = null;
      placaPrefill = "";
    }

    if (valorNormalizado && valorNormalizado !== placaIgnorada) {
      placaIgnorada = "";
    }

    estadoPlacaExterno = null;
    actualizarEstadoFormularioFn?.();

    if (valorNormalizado.length < MIN_PLACA_LENGTH) {
      ultimoValorConsultado = "";
      if (debounceId) clearTimeout(debounceId);
      registroPlacaDetectado = null;
      placaIgnorada = "";
      ocultarModalPlaca();
      return;
    }

    if (placaIgnorada && valorNormalizado === placaIgnorada) {
      if (debounceId) clearTimeout(debounceId);
      ocultarModalPlaca();
      return;
    }

    if (debounceId) clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      if (valorNormalizado === ultimoValorConsultado) return;
      ultimoValorConsultado = valorNormalizado;
      consultarPlacaExistente(valorNormalizado);
    }, VALIDACION_PLACA_DELAY);
  });
}

function initFormulario() {
  const form = document.getElementById("form-inspeccion");
  if (!form) {
    // console.warn("initMamparasForm: formulario no encontrado, se omite inicializaci\u00F3n.");
    return;
  }

  if (form.dataset.mamparasInit === "1") return;
  form.dataset.mamparasInit = "1";
  formularioInicializado = form;
  cerrarTodosLosModales();
  autocompletarFechaHora();
  setTimeout(autocompletarFechaHora, 0);
  setTimeout(autocompletarFechaHora, 200);
  setTimeout(autocompletarFechaHora, 800);
  const fechaInput = obtenerInput("fecha");
  const horaInput = obtenerInput("hora");
  fechaInput?.addEventListener("focus", autocompletarFechaHora);
  horaInput?.addEventListener("focus", autocompletarFechaHora);
  if (!fechaHoraListenerActivo) {
    window.addEventListener("focus", autocompletarFechaHora);
    fechaHoraListenerActivo = true;
  }
  initEmpresaPersonalizada();
  initDetalleTrigger();
  initDetalleModal();
  initPreviewModal();
  initModalPlacaListeners();
  initValidacionPlaca();
  initEstadoFormulario();

  let procesandoRegistro = false;

  const procesarRegistro = async () => {
    if (procesandoRegistro) return;

    const listo = actualizarEstadoFormulario({ marcarInvalidos: true });
    if (!listo) {
      mostrarModal("error", "Completa los campos marcados y guarda las medidas y evidencias antes de registrar.");
      const primerError = form.querySelector(".v3-field.is-error input, .v3-field.is-error select");
      primerError?.focus();
      return;
    }

    autocompletarFechaHora();

    const detalleCampo = obtenerInput("detalle");
    if (!detalleCampo || !detalleCampo.value || form.dataset.detailDirty === "1") {
      mostrarModal("error", "Guarda las medidas y evidencias antes de registrar.");
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
      fecha: obtenerInput("fecha")?.value || obtenerFechaHoraLocal().fecha,
      hora: obtenerInput("hora")?.value || obtenerFechaHoraLocal().hora,
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

    mostrarModalCorreo(datos, detalleCampo.value, {
      onFinalizar: async () => {
        if (procesandoRegistro) return false;
        procesandoRegistro = true;
        const btnRegistrar = document.getElementById("btnRegistrarInspeccion");
        if (btnRegistrar) btnRegistrar.disabled = true;

        try {
          const exito = await guardarInspeccion(datos, detalleCampo.value);
          if (exito) {
          form.reset();
          detalleCampo.value = "";
          mostrarDetalleGuardadoAviso(false);
          cerrarTodosLosModales();
          autocompletarFechaHora();
          actualizarEmpresaPersonalizadaFn?.();
          if (form) form.dataset.detailDirty = "1";
          actualizarBotonDetalleFn?.();
          renderGaleriaMamparas(null);
          estadoPlacaExterno = null;
          registroPlacaDetectado = null;
          placaIgnorada = "";
          detallePrefill = null;
          placaPrefill = "";
          }
          return exito;
        } finally {
          procesandoRegistro = false;
          actualizarEstadoFormularioFn?.();
        }
      },
    });
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    procesarRegistro();
  });

  const btnRegistrar =
    form.querySelector("#btnRegistrarInspeccion") ||
    form.querySelector("button[type='submit']");
  if (btnRegistrar) {
    btnRegistrar.addEventListener("click", (event) => {
      event.preventDefault();
      procesarRegistro();
    });
  }
}

function esperarFormulario() {
  const form = document.getElementById("form-inspeccion");
  if (form) {
    initFormulario();
    return;
  }

  const observer = new MutationObserver(() => {
    if (document.getElementById("form-inspeccion")) {
      observer.disconnect();
      initFormulario();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 8000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", esperarFormulario);
} else {
  esperarFormulario();
}

// ðŸš« NO BORRAR â€” QA Mamparas
console.log("QA Mamparas: archivo restaurado");
