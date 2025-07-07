// script.js actualizado con guardado correcto de campos

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(
  'https://qjefbngewwthawycvutl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZWZibmdld3d0aGF3eWN2dXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjA2MTUsImV4cCI6MjA2MTY5NjYxNX0.q4J3bF6oC7x9dhW5cwHr-qtqSSqI_8ju7fHvyfO_Sh0'
);

export function mostrarModal(tipo, mensaje) {
  const feedbackModal = document.getElementById('feedbackModal');
  const loader = document.getElementById('loadingAnimation');
  const msg = document.getElementById('feedbackMessage');

  feedbackModal.style.display = 'flex';
  loader.style.display = 'block';
  msg.style.display = 'none';

  setTimeout(() => {
    loader.style.display = 'none';
    msg.style.display = 'block';
    msg.textContent = mensaje;
    msg.className = `message ${tipo}`;
  }, 2000);

  setTimeout(() => {
    feedbackModal.style.display = 'none';
  }, 5000);
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^\w.\-]/g, '_');
}

export async function subirImagen(nombreCampo, archivo) {
  if (archivo.size > 50 * 1024 * 1024) {
    alert("La imagen excede los 50MB permitidos.");
    return;
  }

  if (!archivo.type.startsWith('image/')) {
    alert("Solo se permiten archivos de imagen.");
    return;
  }

  const nombreLimpio = sanitizeFileName(archivo.name);
  const nombreArchivo = `${nombreCampo}-${Date.now()}-${nombreLimpio}`;

  const { error } = await supabase.storage.from('mamparas').upload(nombreArchivo, archivo);
  if (error) {
    mostrarModal('error', '😢 Lo sentimos, ocurrió un error al subir la imagen.');
    return;
  }

  const { data, error: errorUrl } = supabase.storage.from('mamparas').getPublicUrl(nombreArchivo);
  if (errorUrl) {
    mostrarModal('error', '❌ No se pudo obtener la URL pública de la imagen.');
    return;
  }

  return data.publicUrl;
}

export async function getImageBase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
    const arrayBuffer = await response.arrayBuffer();
    return arrayBufferToBase64(arrayBuffer);
  } catch (error) {
    console.error('Error al obtener la imagen en base64:', error);
    return null;
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes));
}

// Función para guardar inspección correctamente
export async function guardarInspeccion(datosFormulario, detalleJSON) {
  // Validación y conversión de campos numéricos
  if (detalleJSON?.tipo === 'Mampara') {
    detalleJSON.separacion_lateral_central = detalleJSON.separacion_lateral_central
      ? parseFloat(detalleJSON.separacion_lateral_central)
      : null;
    detalleJSON.altura_mampara = detalleJSON.altura_mampara
      ? parseFloat(detalleJSON.altura_mampara)
      : null;
  }

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
    detalle: detalleJSON,
    separacion_central: '',
    medida_altura: '',
    medida_central: '',
    altura_mampara: '',
    foto_unidad: '',
    foto_observacion: ''
  };

  if (detalleJSON?.tipo === 'Mampara') {
    registro.separacion_central = detalleJSON.separacion || '';
    registro.medida_altura = detalleJSON.altura || '';
    registro.altura_mampara = detalleJSON.altura || '';
    registro.foto_unidad = detalleJSON.fotoPanoramica || '';
    registro.medida_central = detalleJSON.separacion || '';
  }

  if (detalleJSON?.observacion) {
    registro.observaciones = detalleJSON.observacion;
  }

  if (detalleJSON?.fotoObservacion) {
    registro.foto_observacion = detalleJSON.fotoObservacion;
  }

  const { error } = await supabase.from('inspecciones').insert([registro]);

  if (error) {
    console.error('❌ Error al guardar inspección:', error.message);
    mostrarModal('error', '❌ Error al registrar.');
  } else {
    mostrarModal('success', '✅ Inspección registrada correctamente.');
  }
}
