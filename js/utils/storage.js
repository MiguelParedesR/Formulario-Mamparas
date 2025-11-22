/* ============================================================================
   storage.js - Manejo de archivos en Supabase Storage
   ---------------------------------------------------
   - uploadFiles(idIncidencia, files)
   - sanitizeFileName(name)
   - getBase64(file)
   - getRemoteBase64(url)
============================================================================ */

import { supabase } from "./supabase.js";

const INCIDENCIAS_BUCKET =
  (typeof window !== "undefined" && window.INCIDENCIAS_BUCKET) ||
  (typeof window !== "undefined" &&
    window.APP_CONFIG &&
    window.APP_CONFIG.incidenciasBucket) ||
  "incidencias";

/* --------------------------------------------
   Normaliza nombres
-------------------------------------------- */
function sanitizeFileName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "_");
}

/* --------------------------------------------
   Convertir archivo local a Base64
-------------------------------------------- */
export function getBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

/* --------------------------------------------
   Convertir archivo remoto a Base64 (para DOCX)
-------------------------------------------- */
export async function getRemoteBase64(url) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";

  bytes.forEach((b) => (binary += String.fromCharCode(b)));

  return `data:application/octet-stream;base64,${btoa(binary)}`;
}

// Alias para compatibilidad con generador-docx
export async function getFileBase64(url) {
  return getRemoteBase64(url);
}

/* --------------------------------------------
   Validar acceso al bucket
-------------------------------------------- */
async function ensureBucketAvailable(bucket) {
  const { error } = await supabase.storage.from(bucket).list("", { limit: 1 });

  if (!error) return;

  const message = error.message || "No se pudo acceder al bucket.";
  const lower = message.toLowerCase();

  if (lower.includes("not found")) {
    throw new Error(
      `El bucket "${bucket}" no existe o no es accesible con la anon key. ` +
        `Verifica el nombre exacto en Storage o define window.INCIDENCIAS_BUCKET antes de cargar los scripts.`
    );
  }

  throw new Error(
    `No se pudo acceder al bucket "${bucket}". Revisa las politicas de Storage. Detalle: ${message}`
  );
}

/* --------------------------------------------
   Subida de archivos
-------------------------------------------- */
export async function uploadFiles(idIncidencia, files) {
  if (!files || !files.length) return [];

  const bucket = INCIDENCIAS_BUCKET;
  await ensureBucketAvailable(bucket);

  const carpeta = `${idIncidencia}`;
  const resultados = [];

  for (const file of files) {
    const cleanName = sanitizeFileName(file.name);
    const ruta = `${carpeta}/${Date.now()}-${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(ruta, file);

    if (uploadError) {
      throw new Error(
        `No se pudo subir ${file.name}: ${uploadError.message || "error desconocido"}`
      );
    }

    const { data, error: urlError } = supabase.storage.from(bucket).getPublicUrl(ruta);

    if (urlError) {
      throw new Error(
        `Archivo subido pero sin URL publica (${file.name}): ${urlError.message || "sin detalle"}`
      );
    }

    resultados.push({
      name: cleanName,
      url: data.publicUrl,
      path: ruta,
    });
  }

  return resultados;
}
