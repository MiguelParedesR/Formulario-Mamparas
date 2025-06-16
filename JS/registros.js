import { supabase, mostrarModal, subirImagen } from '../script.js';

// Elementos del DOM
const form = document.getElementById('form-inspeccion');
const btnAgregarDetalle = document.getElementById('btnAgregarDetalle');
btnAgregarDetalle.textContent = 'DETALLE';
const btnGuardarDetalle = document.getElementById('btnGuardarDetalle');
const detalleModal = document.getElementById('detalleModal');
const contenidoDetalle = document.getElementById('contenidoDetalle');
const inputDetalle = document.getElementById('detalle');
const selectIncorreccion = document.getElementById('incorreccion');
const cerrarDetalleModal = document.getElementById('cerrarDetalleModal');
const campoPlaca = document.getElementById('placa');

let tipoDetalle = '';
let datosPrevios = null;

// Mostrar el modal según la opción seleccionada
btnAgregarDetalle.addEventListener('click', () => {
  const valor = selectIncorreccion.value;
  if (!valor) {
    alert('Primero seleccione el tipo de incorrección.');
    return;
  }

  tipoDetalle = valor;
  mostrarFormularioDetalle(valor);

  try {
    const detalleActual = JSON.parse(inputDetalle.value || '{}');
    setTimeout(() => {
      if (detalleActual.tipo === 'Mampara') {
        document.getElementById('sepLateral').value = detalleActual.separacion_lateral_central || '';
        document.getElementById('alturaMampara').value = detalleActual.altura_mampara || '';
        cargarImagenPreview('fotoPanoramicaPreview', detalleActual.foto_panoramica_unidad);
        cargarImagenPreview('fotoAlturaPreview', detalleActual.foto_altura_mampara);
        cargarImagenPreview('fotoLateralPreview', detalleActual.foto_lateral_central);
      } else {
        document.getElementById('observacionTexto').value = detalleActual.observacion_texto || '';
        cargarImagenPreview('fotoObservacionPreview', detalleActual.foto_observacion);
      }
    }, 100);
  } catch (e) {
    console.warn('No se pudo cargar detalle previo:', e);
  }

  detalleModal.style.display = 'flex';
  detalleModal.classList.add('zoomIn');
});

// Mostrar formulario según tipo
function mostrarFormularioDetalle(tipo) {
  if (tipo === 'Mampara') {
    contenidoDetalle.innerHTML = `
      <label>Separación Lateral Central (cm):</label>
      <input type="number" id="sepLateral" />
      <label>Altura de Mampara (cm):</label>
      <input type="number" id="alturaMampara" />
      <label>Foto Panorámica de Unidad:</label>
      <input type="file" id="fotoPanoramica" accept="image/*" />
      <img id="fotoPanoramicaPreview" class="preview-img" />
      <label>Foto Altura de Mampara:</label>
      <input type="file" id="fotoAltura" accept="image/*" />
      <img id="fotoAlturaPreview" class="preview-img" />
      <label>Foto Lateral Central:</label>
      <input type="file" id="fotoLateral" accept="image/*" />
      <img id="fotoLateralPreview" class="preview-img" />
    `;
  } else {
    contenidoDetalle.innerHTML = `
      <label>Observaciones:</label>
      <textarea id="observacionTexto"></textarea>
      <label>Foto de Observación:</label>
      <input type="file" id="fotoObservacion" accept="image/*" />
      <img id="fotoObservacionPreview" class="preview-img" />
    `;
  }
}

// Cargar imagen en una etiqueta <img>
function cargarImagenPreview(id, url) {
  const img = document.getElementById(id);
  if (img && url) {
    img.src = url;
    img.style.display = 'block';
    img.style.maxHeight = '150px';
    img.style.margin = '5px 0';
  }
}

// Guardar datos del modal
btnGuardarDetalle.addEventListener('click', async () => {
  let detalle = {};

  if (tipoDetalle === 'Mampara') {
    const sep = document.getElementById('sepLateral').value;
    const alt = document.getElementById('alturaMampara').value;
    const foto1 = document.getElementById('fotoPanoramica').files[0];
    const foto2 = document.getElementById('fotoAltura').files[0];
    const foto3 = document.getElementById('fotoLateral').files[0];

    let url1 = document.getElementById('fotoPanoramicaPreview')?.src || '';
    let url2 = document.getElementById('fotoAlturaPreview')?.src || '';
    let url3 = document.getElementById('fotoLateralPreview')?.src || '';

    if (foto1) url1 = await subirImagen('panoramica', foto1);
    if (foto2) url2 = await subirImagen('altura', foto2);
    if (foto3) url3 = await subirImagen('lateral', foto3);

    if (!sep || !alt || !url1 || !url2 || !url3) {
      alert('Completa todos los campos y asegúrate de subir imágenes válidas.');
      return;
    }

    detalle = {
      tipo: 'Mampara',
      separacion_lateral_central: sep,
      altura_mampara: alt,
      foto_panoramica_unidad: url1,
      foto_altura_mampara: url2,
      foto_lateral_central: url3
    };
  } else {
    const observacion = document.getElementById('observacionTexto').value;
    const foto = document.getElementById('fotoObservacion').files[0];
    let url = document.getElementById('fotoObservacionPreview')?.src || '';
    if (foto) url = await subirImagen('observacion', foto);

    detalle = {
      tipo: 'Otro',
      observacion_texto: observacion,
      foto_observacion: url || ''
    };
  }

  inputDetalle.value = JSON.stringify(detalle);
  detalleModal.style.display = 'none';
  detalleModal.classList.remove('zoomIn');
});

// Ocultar modal
window.addEventListener('click', (e) => {
  if (e.target === detalleModal) {
    detalleModal.style.display = 'none';
    detalleModal.classList.remove('zoomIn');
  }
});
cerrarDetalleModal?.addEventListener('click', () => {
  detalleModal.style.display = 'none';
  detalleModal.classList.remove('zoomIn');
});

// Validar placa duplicada
campoPlaca.addEventListener('blur', async () => {
  const placaIngresada = campoPlaca.value.trim().toUpperCase();
  if (!placaIngresada) return;

  const { data, error } = await supabase
    .from('inspecciones')
    .select('*')
    .eq('placa', placaIngresada)
    .in('incorreccion', ['Mampara', 'Cola de Pato', 'Pernos', 'Otros']);

  if (error) {
    console.error('Error al consultar placa:', error);
    return;
  }

  if (data.length > 0) {
    datosPrevios = data[0];
    const confirmacion = confirm(`Ya existe una inspección previa para esta placa con tipo "${datosPrevios.incorreccion}".\n¿Deseas registrar nuevamente con los mismos datos?`);
    if (confirmacion) {
      rellenarFormulario(datosPrevios);
    } else {
      datosPrevios = null;
    }
  }
});

// Rellenar formulario si se elige reusar datos
function rellenarFormulario(datos) {
  document.getElementById('empresa').value = datos.empresa;
  document.getElementById('chofer').value = datos.chofer;
  document.getElementById('lugar').value = datos.lugar;
  document.getElementById('incorreccion').value = datos.incorreccion;
  document.getElementById('responsable').value = datos.responsable;
  document.getElementById('observaciones').value = datos.observaciones;
  document.getElementById('detalle').value = datos.detalle;
  btnAgregarDetalle.style.display = "block";
}

// Enviar formulario
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  // Validación para Mampara
  if (data.incorreccion === 'Mampara' && !data.detalle) {
    alert('Debes completar el detalle obligatorio para Mampara.');
    return;
  }

  // Procesar campo 'detalle'
  try {
    const detalle = JSON.parse(data.detalle || '{}');
    if (detalle.tipo === 'Mampara') {
      data.separacion_central = detalle.separacion_lateral_central || null;
      data.altura_mampara = detalle.altura_mampara || null;
      data.foto_unidad = detalle.foto_panoramica_unidad || null;
      data.medida_central = detalle.foto_lateral_central || null;
      data.medida_altura = detalle.foto_altura_mampara || null;
    } else {
      data.observaciones = detalle.observacion_texto || null;
      data.foto_observacion = detalle.foto_observacion || null;
    }
  } catch (err) {
    console.error('Error al parsear detalle:', err);
  }

  try {
    const { error } = await supabase.from('inspecciones').insert([data]);
    if (error) {
      mostrarModal('error', 'No se pudo registrar.');
    } else {
      form.reset();
      inputDetalle.value = '';
      mostrarModal('success', '✅ Registro exitoso');
    }
  } catch (err) {
    mostrarModal('error', 'Error inesperado.');
  }
});

// Mostrar botón DETALLE según selección
selectIncorreccion.addEventListener("change", () => {
  const seleccion = selectIncorreccion.value;
  if (["Mampara", "Cola de Pato", "Pernos", "Otros"].includes(seleccion)) {
    btnAgregarDetalle.style.display = "block";
  } else {
    btnAgregarDetalle.style.display = "none";
  }
});
