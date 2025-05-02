import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

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

// 🔧 Función para sanitizar nombres de archivos
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
    observacion: document.getElementById('observacion').value.toUpperCase(),
  };

  const lateral = document.getElementById('medida_lateral').files[0];
  const altura = document.getElementById('medida_altura').files[0];
  const central = document.getElementById('medida_central').files[0];

  datos.medida_lateral = await subirImagen('lateral', lateral);
  datos.medida_altura = await subirImagen('altura', altura);
  datos.medida_central = await subirImagen('central', central);

  if (!datos.medida_lateral || !datos.medida_altura || !datos.medida_central) return;

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
  }, 2000); // Simula carga

  setTimeout(() => {
    modal.style.display = 'none';
  }, 5000); // Se oculta después de mostrar el mensaje
}
