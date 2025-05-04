import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const ExcelJS = window.ExcelJS;

const supabase = createClient(
  'https://qjefbngewwthawycvutl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZWZibmdld3d0aGF3eWN2dXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjA2MTUsImV4cCI6MjA2MTY5NjYxNX0.q4J3bF6oC7x9dhW5cwHr-qtqSSqI_8ju7fHvyfO_Sh0'
);

const form = document.getElementById('formulario');
const tabla = document.querySelector('#tabla-registros tbody');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modalImage');
const closeModal = document.getElementById('closeModal');

closeModal.onclick = () => modal.style.display = 'none';

document.addEventListener('click', function (e) {
  if (e.target.tagName === 'IMG' && e.target.closest('#tabla-registros')) {
    modalImg.src = e.target.src;
    modal.style.display = 'block';
  }
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') modal.style.display = 'none';
});

function sanitizeFileName(fileName) {
  return fileName.replace(/[^\w.\-]/g, '_');
}

async function subirImagen(nombreCampo, archivo) {
  if (archivo.size > 50 * 1024 * 1024) {
    alert("La imagen excede los 50MB permitidos.");
    return;
  }

  const nombreLimpio = sanitizeFileName(archivo.name);
  const nombreArchivo = `${nombreCampo}-${Date.now()}-${nombreLimpio}`;

  const { error } = await supabase.storage.from('mamparas').upload(nombreArchivo, archivo);
  if (error) {
    mostrarModal('error', '😢 Lo sentimos, ocurrió un error. Recarga la página para intentarlo de nuevo.');
  }

  const { data: publicUrlData } = supabase.storage.from('mamparas').getPublicUrl(nombreArchivo);
  return publicUrlData.publicUrl;
}

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const datos = {
    fecha: document.getElementById('fecha').value,
    hora: document.getElementById('hora').value,
    operador: document.getElementById('operador').value.toUpperCase(),
    empresa: document.getElementById('empresa').value.toUpperCase(),
    placa: document.getElementById('placa').value.toUpperCase(),
    chofer: document.getElementById('chofer').value.toUpperCase(),
    separacion_lateral: parseFloat(document.getElementById('separacion_lateral').value),
    separacion_central: parseFloat(document.getElementById('separacion_central').value),
    altura_mampara: parseFloat(document.getElementById('altura_mampara').value),
    observacion: document.getElementById('observacion').value.toUpperCase(),
  };

  const unidad = document.getElementById('foto_unidad').files[0];
  const lateral = document.getElementById('medida_lateral').files[0];
  const altura = document.getElementById('medida_altura').files[0];
  const central = document.getElementById('medida_central').files[0];

  datos.foto_unidad = await subirImagen('foto_unidad', unidad);
  datos.medida_lateral = await subirImagen('lateral', lateral);
  datos.medida_altura = await subirImagen('altura', altura);
  datos.medida_central = await subirImagen('central', central);

  if (!datos.foto_unidad||!datos.medida_lateral || !datos.medida_altura || !datos.medida_central) return;

  const { error } = await supabase.from('registros').insert([datos]);
  if (error) return alert('Error: ' + error.message);
  mostrarModal('success', '✅ Registro guardado con éxito');
  form.reset();
  cargarRegistros();
});

async function cargarRegistros(filtro = '') {
  const { data, error } = await supabase
    .from('registros')
    .select('*')
    .ilike('placa', `${filtro}%`)
    .order('created_at', { ascending: false });

  if (error) return alert('Error al cargar datos');

  tabla.innerHTML = '';
  data.forEach(r => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${r.fecha}</td>
      <td>${r.hora}</td>
      <td>${r.operador}</td>
      <td>${r.empresa}</td>
      <td>${r.placa}</td>
      <td>${r.chofer}</td>
      <td>${r.separacion_lateral}</td>
      <td>${r.separacion_central}</td>
      <td>${r.altura_mampara}</td>
      <td><img src="${r.foto_unidad}" /></td>
      <td><img src="${r.medida_lateral}" /></td>
      <td><img src="${r.medida_altura}" /></td>
      <td><img src="${r.medida_central}" /></td>
      <td>${r.observacion}</td>
    `;
    tabla.appendChild(fila);
  });
}

document.addEventListener('DOMContentLoaded', () => cargarRegistros());

searchInput.addEventListener('input', () => {
  const filtro = searchInput.value.toUpperCase();
  cargarRegistros(filtro);
});

function mostrarModal(tipo, mensaje) {
  const modal = document.getElementById('feedbackModal');
  const loader = document.getElementById('loadingAnimation');
  const msg = document.getElementById('feedbackMessage');

  modal.style.display = 'flex';
  loader.style.display = 'block';
  msg.style.display = 'none';

  setTimeout(() => {
    loader.style.display = 'none';
    msg.style.display = 'block';
    msg.textContent = mensaje;
    msg.className = `message ${tipo}`;
  }, 2000);

  setTimeout(() => {
    modal.style.display = 'none';
  }, 5000);
}

// ✅ FUNCIONES PARA EXPORTACIÓN A EXCEL CON MINIATURAS
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('exportarExcel').addEventListener('click', exportarExcel);
});

async function exportarExcel() {
  const { data, error } = await supabase.from('registros').select('*');
  if (error) {
    alert('😢 Error al obtener los datos');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Registros');

  worksheet.columns = [
    { header: 'Fecha', key: 'fecha', width: 15 },
    { header: 'Hora', key: 'hora', width: 10 },
    { header: 'Operador', key: 'operador', width: 20 },
    { header: 'Empresa', key: 'empresa', width: 20 },
    { header: 'Placa', key: 'placa', width: 10 },
    { header: 'Chofer', key: 'chofer', width: 20 },
    { header: 'Foto Unidad ', key: 'foto_unidad', width: 15 },
    { header: 'Medida Lateral', key: 'medida_lateral', width: 15 },
    { header: 'Medida Central', key: 'medida_central', width: 15 },
    { header: 'Medida Altura', key: 'medida_altura', width: 15 },
    { header: 'Observación', key: 'observacion', width: 30 },
  ];

  for (const [index, row] of data.entries()) {
    const rowIndex = index + 2;

    worksheet.addRow({
      fecha: row.fecha,
      hora: row.hora,
      operador: row.operador,
      empresa: row.empresa,
      placa: row.placa,
      chofer: row.chofer,
      foto_unidad: '',
      medida_lateral: '',
      medida_central: '',
      medida_altura: '',
      observacion: row.observacion,
    });

    const imageFields = ['foto_unidad', 'medida_lateral', 'medida_central', 'medida_altura'];
    for (const [imgIndex, field] of imageFields.entries()) {
      const imageUrl = row[field];
      if (imageUrl) {
        const base64Image = await getImageBase64(imageUrl);
        const imageId = workbook.addImage({
          base64: base64Image,
          extension: 'jpeg',
        });
        worksheet.addImage(imageId, {
          tl: { col: 6 + imgIndex, row: rowIndex - 1 },
          ext: { width: 50, height: 50 },
        });
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'registros_mamparas.xlsx';
  link.click();
}

async function getImageBase64(url) {
  try {
    // Realizamos la solicitud de la imagen como un blob
    const response = await fetch(url);
    
    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${url}`);
    }

    // Convertimos la respuesta en un array buffer
    const arrayBuffer = await response.arrayBuffer();
    
    // Convertimos el array buffer en una cadena base64
    const base64 = arrayBufferToBase64(arrayBuffer);

    return base64;
  } catch (error) {
    console.error('Error al obtener la imagen en base64:', error);
    return null;
  }
}

// Función auxiliar para convertir el ArrayBuffer en una cadena base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}