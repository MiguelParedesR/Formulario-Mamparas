/* ============================================================================
   storage.js — Manejo de archivos en Supabase Storage
   ---------------------------------------------------
   ✔ uploadFiles(idIncidencia, files)
   ✔ sanitizeFileName(name)
   ✔ getBase64(file)
   ✔ getRemoteBase64(url)
============================================================================ */

import { supabase } from "./supabase.js";

/* --------------------------------------------
   Normaliza nombres
-------------------------------------------- */
function sanitizeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[áàäâ]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùüû]/g, "u")
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
   Subida de archivos
-------------------------------------------- */
export async function uploadFiles(idIncidencia, files) {
  const bucket = "incidencias";
  const carpeta = `${idIncidencia}`;

  const resultados = [];

  for (const file of files) {
    const cleanName = sanitizeFileName(file.name);
    const ruta = `${carpeta}/${Date.now()}-${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(ruta, file);

    if (uploadError) {
      console.error("❌ Error subiendo archivo:", uploadError);
      continue;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(ruta);

    resultados.push({
      name: cleanName,
      url: data.publicUrl,
      path: ruta,
    });
  }

  return resultados;
}
