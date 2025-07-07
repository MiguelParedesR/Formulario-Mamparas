// registros.js COMPLETO Y ACTUALIZADO

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
  detalleModal.style.display = 'flex';
  detalleModal.classList.add('zoomIn');
});

// Mostrar el formulario dentro del modal según tipo
function mostrarFormularioDetalle(tipo) {
  if (tipo === 'Mampara') {
    contenidoDetalle.innerHTML = `
      <label>Separación Lateral Central (cm):</label>
      <input type="number" id="sepLateral" value="${datos?.separacion_lateral_central || ''}" />
      <label>Altura de Mampara (cm):</label>
      <input type="number" id="alturaMampara" value="${datos?.altura_mampara || ''}" />
      <label>Foto Panorámica de Unidad:</label>
      <input type="file" id="fotoPanoramica" accept="image/*" />
      <label>Foto Altura de Mampara:</label>
      <input type="file" id="fotoAltura" accept="image/*" />
      <label>Foto Lateral Central:</label>
      <input type="file" id="fotoLateral" accept="image/*" />
    `;
  } else {
    contenidoDetalle.innerHTML = `
      <label>Observaciones:</label>
      <textarea id="observacionTexto">${datos?.observacion_texto || ''}</textarea>
      <label>Foto de Observación:</label>
      <input type="file" id="fotoObservacion" accept="image/*" />
    `;
  }
}

// Guardar los datos del modal en campo oculto
btnGuardarDetalle.addEventListener('click', async () => {
  let detalle = {};

  if (tipoDetalle === 'Mampara') {
    const sep = document.getElementById('sepLateral').value;
    const alt = document.getElementById('alturaMampara').value;
    const foto1 = document.getElementById('fotoPanoramica').files[0];
    const foto2 = document.getElementById('fotoAltura').files[0];
    const foto3 = document.getElementById('fotoLateral').files[0];

    if (!sep || !alt || !foto1 || !foto2 || !foto3) {
      alert('Completa todos los campos y sube las imágenes de Mampara.');
      return;
    }

    const url1 = await subirImagen('panoramica', foto1);
    const url2 = await subirImagen('altura', foto2);
    const url3 = await subirImagen('lateral', foto3);

    detalle = {
      tipo: 'Mampara',
      separacion_lateral_central: Number(sep),        // ✅ Convertido a número
      altura_mampara: Number(alt),                    // ✅ Convertido a número
      foto_panoramica_unidad: url1,
      foto_altura_mampara: url2,
      foto_lateral_central: url3
    };
  } else {
    const observacion = document.getElementById('observacionTexto').value;

    if (!observacion.trim()) {
      alert('Por favor ingrese una observación.');    // ✅ Validación adicional
      return;
    }

    const foto = document.getElementById('fotoObservacion').files[0];
    let url = '';
    if (foto) {
      url = await subirImagen('observacion', foto);
    }
    detalle = {
      tipo: 'Otro',
      observacion_texto: observacion,
      foto_observacion: url
    };
  }

  inputDetalle.value = JSON.stringify(detalle);
  detalleModal.style.display = 'none';
  detalleModal.classList.remove('zoomIn');
  mostrarModal('success', '✅ Detalle guardado exitosamente.');
});

// Ocultar modal
window.addEventListener('click', (e) => {
  if (e.target === detalleModal) {
    detalleModal.style.display = 'none';
    detalleModal.classList.remove('zoomIn');
  }
});

// Botón para cerrar el modal (icono ×)
if (cerrarDetalleModal) {
  cerrarDetalleModal.addEventListener('click', () => {
    detalleModal.style.display = 'none';
    detalleModal.classList.remove('zoomIn');
  });
}

// Enviar datos del formulario a Supabase
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  // Validación adicional para Mampara
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
    await guardarInspeccion(data, JSON.parse(data.detalle));
    form.reset();
    inputDetalle.value = '';
    contenidoDetalle.innerHTML = ''; // ✅ Limpia miniaturas del modal
  } catch (err) {
    console.error(err);
    mostrarModal('error', '❌ Error inesperado al guardar.');
  }
});

// Mostrar botón de "Agregar Detalle" solo si se selecciona una opción válida
selectIncorreccion.addEventListener("change", () => {
  const seleccion = selectIncorreccion.value;
  if (["Mampara", "Cola de Pato", "Pernos", "Otros"].includes(seleccion)) {
    btnAgregarDetalle.style.display = "block";
  } else {
    btnAgregarDetalle.style.display = "none";
  }
});

// Mostrar input si elige 'otra empresa'
document.getElementById('empresa').addEventListener('change', function () {
  const campoTexto = document.getElementById('nueva_empresa');
  campoTexto.style.display = this.value === 'otra' ? 'block' : 'none';
});

// Autocompletar fecha y hora
window.addEventListener('DOMContentLoaded', () => {
  const fechaInput = document.getElementById('fecha');
  const horaInput = document.getElementById('hora');
  const ahora = new Date();
  fechaInput.value = ahora.toISOString().split('T')[0];
  horaInput.value = ahora.toTimeString().slice(0, 5);
});
