// 🚫 NO BORRAR — Bloque restaurado/corregido del módulo Mamparas
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* ================================
   🔵 CONFIGURACIÓN SUPABASE
   ================================ */
export const supabase = createClient(
  "https://qjefbngewwthawycvutl.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZWZibmdld3d0aGF3eWN2dXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjA2MTUsImV4cCI6MjA2MTY5NjYxNX0.q4J3bF6oC7x9dhW5cwHr-qtqSSqI_8ju7fHvyfO_Sh0"
);

/* ================================
   🔵 MODAL DE FEEDBACK
   ================================ */
export function mostrarModal(tipo, mensaje) {
  const feedbackModal = document.getElementById("feedbackModal");
  const loader = document.getElementById("loadingAnimation");
  const msg = document.getElementById("feedbackMessage");

  if (!feedbackModal || !loader || !msg) return;

  feedbackModal.style.display = "flex";
  loader.style.display = "block";
  msg.style.display = "none";

  setTimeout(() => {
    loader.style.display = "none";
    msg.style.display = "block";
    msg.textContent = mensaje;
    msg.className = `message ${tipo}`;
  }, 2000);

  setTimeout(() => {
    feedbackModal.style.display = "none";
  }, 5000);
}

/* ================================
   🔵 SANITIZADO DE NOMBRE DE ARCHIVO
   ================================ */
function sanitizeFileName(fileName) {
  return fileName.replace(/[^\w.\-]/g, "_");
}

/* ================================
   🔵 SUBIDA DE IMAGENES A SUPABASE
   ================================ */
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

  const nombreLimpio = sanitizeFileName(archivo.name);
  const nombreArchivo = `${nombreCampo}-${Date.now()}-${nombreLimpio}`;

  const { error } = await supabase.storage
    .from("mamparas")
    .upload(nombreArchivo, archivo);

  if (error) {
    mostrarModal("error", "Error al subir la imagen.");
    return null;
  }

  const { data, error: errorUrl } = supabase.storage
    .from("mamparas")
    .getPublicUrl(nombreArchivo);

  if (errorUrl) {
    mostrarModal("error", "No se pudo obtener la URL pública.");
    return null;
  }

  return data.publicUrl;
}

/* ================================
   🔵 OBTENER IMAGEN BASE64
   ================================ */
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

/* ================================
   🔵 GUARDAR INSPECCIÓN
   ================================ */
export async function guardarInspeccion(datosFormulario, detalleJSON) {
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
    detalle: detalleJSON
  };

  const { error } = await supabase.from("inspecciones").insert([registro]);

  if (error) {
    console.error("Error al guardar inspección:", error.message);
    mostrarModal("error", "Error al registrar.");
  } else {
    mostrarModal("success", "Inspección registrada correctamente.");
  }
}

/* ================================
   🔵 GENERAR DETALLE MAMPARA
   ================================ */
function generarDetalleMampara(contenido) {
  contenido.innerHTML = `
    <label>Separación lateral central</label>
    <input id="sepCentral" type="number">

    <label>Altura de mampara</label>
    <input id="alturaMampara" type="number">

    <label>Foto panorámica</label>
    <input id="fotoPanoramica" type="file" accept="image/*">

    <label>Foto altura</label>
    <input id="fotoAltura" type="file" accept="image/*">

    <label>Foto lateral</label>
    <input id="fotoLateral" type="file" accept="image/*">
  `;
}

/* ================================
   🔵 GENERAR DETALLE OTRO
   ================================ */
function generarDetalleOtro(contenido) {
  contenido.innerHTML = `
    <label>Descripción</label>
    <textarea id="observacionTexto"></textarea>

    <label>Foto observación</label>
    <input id="fotoObservacion" type="file" accept="image/*">
  `;
}

/* ================================
   🔵 GENERAR CONTENIDO DEL MODAL
   ================================ */
function generarContenidoModal(tipo) {
  const cont = document.getElementById("contenidoDetalle");
  if (!cont) return;

  if (tipo === "Mampara") generarDetalleMampara(cont);
  else generarDetalleOtro(cont);
}

/* ================================
   🔵 LISTENER PARA INCORRECCIÓN
   ================================ */
function initListenersDetalle() {
  const incorreccion = document.getElementById("incorreccion");
  const btnDetalle = document.getElementById("btnAgregarDetalle");
  const detalleModal = document.getElementById("detalleModal");

  if (!incorreccion || !btnDetalle) return;

  incorreccion.addEventListener("change", () => {
    const tipo = incorreccion.value;
    btnDetalle.style.display = tipo ? "inline-flex" : "none";
  });

  btnDetalle.addEventListener("click", () => {
    const tipo = incorreccion.value;
    generarContenidoModal(tipo);
    detalleModal.style.display = "flex";
  });
}

/* ================================
   🔵 GUARDAR DETALLE JSON
   ================================ */
async function guardarDetalleJSON() {
  const incorreccion = document.getElementById("incorreccion");
  const tipo = incorreccion.value;

  const detalleModal = document.getElementById("detalleModal");
  const campoDetalle = document.getElementById("detalle");

  let detalle = {};

  if (tipo === "Mampara") {
    const sepCentral = document.getElementById("sepCentral");
    const alturaMampara = document.getElementById("alturaMampara");
    const fotoPanoramica = document.getElementById("fotoPanoramica");
    const fotoAltura = document.getElementById("fotoAltura");
    const fotoLateral = document.getElementById("fotoLateral");

    detalle = {
      tipo,
      separacion_lateral_central: sepCentral.value,
      altura_mampara: alturaMampara.value,
      foto_panoramica_unidad: await subirImagen("panoramica", fotoPanoramica.files[0]),
      foto_altura_mampara: await subirImagen("altura", fotoAltura.files[0]),
      foto_lateral_central: await subirImagen("lateral", fotoLateral.files[0]),
    };
  } else {
    const observacionTexto = document.getElementById("observacionTexto");
    const fotoObservacion = document.getElementById("fotoObservacion");

    detalle = {
      tipo,
      observacion_texto: observacionTexto.value,
      foto_observacion: await subirImagen("observacion", fotoObservacion.files[0]),
    };
  }

  campoDetalle.value = JSON.stringify(detalle);
  detalleModal.style.display = "none";

  mostrarModal("success", "Detalle guardado correctamente.");
}

/* ================================
   🔵 INICIALIZACIÓN DEL FORMULARIO
   ================================ */
export function initMamparasForm() {

  const form = document.getElementById("form-inspeccion");
  const fecha = document.getElementById("fecha");
  const hora = document.getElementById("hora");
  const empresa = document.getElementById("empresa");
  const nuevaEmpresa = document.getElementById("nueva_empresa");
  const cerrarModal = document.getElementById("cerrarDetalleModal");

  if (fecha) fecha.value = new Date().toISOString().split("T")[0];
  if (hora) hora.value = new Date().toTimeString().slice(0, 5);

  initListenersDetalle();

  document.getElementById("btnGuardarDetalle").onclick = guardarDetalleJSON;

  empresa.addEventListener("change", () => {
    nuevaEmpresa.style.display = empresa.value === "otra" ? "block" : "none";
  });

  cerrarModal.addEventListener("click", () => {
    document.getElementById("detalleModal").style.display = "none";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const datos = {
      fecha: fecha.value,
      hora: hora.value,
      empresa: empresa.value === "otra" ? nuevaEmpresa.value : empresa.value,
      placa: document.getElementById("placa").value,
      chofer: document.getElementById("chofer").value,
      lugar: document.getElementById("lugar").value,
      responsable: document.getElementById("responsable").value,
      observaciones: document.getElementById("observaciones").value,
      incorreccion: document.getElementById("incorreccion").value
    };

    const detalleJSON = JSON.parse(document.getElementById("detalle").value || "{}");

    console.log("DEBUG Registro a insertar:", datos);
    await guardarInspeccion(datos, detalleJSON);
  });

  console.log("QA Mamparas: archivo corregido");
}

/* ================================
   🔵 AUTO-EJECUCIÓN
   ================================ */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMamparasForm);
} else {
  initMamparasForm();
}
