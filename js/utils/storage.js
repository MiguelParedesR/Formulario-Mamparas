/* ============================================================================
   STORAGE.JS — HÍBRIDO COMPLETO (TPP PRODUCCIÓN)
   ---------------------------------------------------
   ✔ Subida de archivos por lote
   ✔ Conversión base64 local y remota (para DOCX/PDF)
   ✔ Sanitización avanzada de nombres (elimina acentos)
   ✔ Validación dinámica del bucket desde window.APP_CONFIG
   ✔ inferMimeFromUrl para archivos sin headers
   ✔ Compatible con módulos existentes: formularios, mamparas, reportes
   ✔ Mantiene retrocompatibilidad 100% con tu proyecto actual
============================================================================ */

import { supabase } from "./supabase.js";

/* ============================================================================
   1) DEFINICIÓN DEL BUCKET (DINÁMICO + FALLBACK)
============================================================================ */

const BUCKET =
  (typeof window !== "undefined" && window.INCIDENCIAS_BUCKET) ||
  (typeof window !== "undefined" &&
    window.APP_CONFIG &&
    window.APP_CONFIG.incidenciasBucket) ||
  "incidencias";

/* ============================================================================
   2) NORMALIZACIÓN DE NOMBRES — SANITIZACIÓN AVANZADA
============================================================================ */

function sanitizeFileName(name = "") {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita acentos
    .replace(/[^\w.\-]/g, "_")       // Forzar caracteres permitidos
    .replace(/\s+/g, "_")            // Quitar espacios
    .toLowerCase();
}

/* ============================================================================
   3) CONVERTIR ARCHIVO LOCAL A BASE64 (DOCX/PDF)
============================================================================ */

export function getBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

/* ============================================================================
   4) CONVERTIR ARCHIVO REMOTO A BASE64 (DOCX/PDF)
============================================================================ */

export async function getRemoteBase64(url) {
  if (!url) throw new Error("URL no válida para convertir a Base64.");

  const res = await fetch(url);

  if (!res.ok)
    throw new Error(`No se pudo obtener el archivo remoto: ${res.status}`);

  const contentType =
    res.headers.get("content-type") || inferMimeFromUrl(url) || "application/octet-stream";

  const buffer = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);

  return `data:${contentType};base64,${base64}`;
}

// Alias para compatibilidad histórica
export async function getFileBase64(url) {
  return getRemoteBase64(url);
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

function inferMimeFromUrl(url = "") {
  const cleanUrl = url.split("?")[0];
  const ext = (cleanUrl.split(".").pop() || "").toLowerCase();

  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "pdf":
      return "application/pdf";
    default:
      return null;
  }
}

/* ============================================================================
   5) VALIDAR QUE EL BUCKET EXISTE Y SE PUEDE LEER
============================================================================ */

async function ensureBucketAvailable(bucket) {
  const { error } = await supabase.storage.from(bucket).list("", { limit: 1 });

  if (!error) return;

  const msg = (error.message || "").toLowerCase();

  if (msg.includes("not found")) {
    throw new Error(
      `El bucket "${bucket}" no existe. Verifica el nombre en Supabase o configura window.INCIDENCIAS_BUCKET.`
    );
  }

  throw new Error(`No se pudo acceder al bucket "${bucket}": ${error.message}`);
}

/* ============================================================================
   6) SUBIR UN SOLO ARCHIVO
============================================================================ */

export async function uploadFile(registroId, file) {
  if (!file) throw new Error("Archivo vacío.");

  const cleanName = sanitizeFileName(file.name || "archivo");
  const path = `${registroId}/${Date.now()}-${cleanName}`;

  // Subir archivo
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      upsert: false,
    });

  if (uploadError)
    throw new Error(
      `No se pudo subir ${cleanName}: ${uploadError.message || "Error desconocido"}`
    );

  // Obtener URL pública
  const { data, error: urlError } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  if (urlError)
    throw new Error(
      `Archivo subido pero sin URL pública (${cleanName}): ${urlError.message}`
    );

  return {
    name: cleanName,
    path,
    url: data.publicUrl,
  };
}

/* ============================================================================
   7) SUBIR VARIOS ARCHIVOS (LOTE SEGURO)
============================================================================ */

export async function uploadFiles(registroId, files = []) {
  if (!files.length) return [];

  await ensureBucketAvailable(BUCKET);

  const results = [];

  for (const file of files) {
    try {
      const res = await uploadFile(registroId, file);
      results.push(res);
    } catch (err) {
      console.warn(`⚠️ No se subió archivo: ${file?.name}`, err.message);
    }
  }

  return results;
}

console.log("📦 storage.js (HÍBRIDO TPP) cargado correctamente");
