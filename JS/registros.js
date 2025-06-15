// registros.js COMPLETO Y ACTUALIZADO

import { supabase, mostrarModal, subirImagen } from '../script.js';

// Elementos del DOM
const form = document.getElementById('form-inspeccion');
const btnAgregarDetalle = document.getElementById('btnAgregarDetalle');
const btnGuardarDetalle = document.getElementById('btnGuardarDetalle');
const detalleModal = document.getElementById('detalleModal');
const contenidoDetalle = document.getElementById('contenidoDetalle');
const inputDetalle = document.getElementById('detalle');
const selectIncorreccion = document.getElementById('incorreccion');
const cerrarDetalleModal = document.getElementById('cerrarDetalleModal');

let tipoDetalle = ''; // Para diferenciar qué tipo de formulario mostrar

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
      <input type="number" id="sepLateral" />
      <label>Altura de Mampara (cm):</label>
      <input type="number" id="alturaMampara" />
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
      <textarea id="observacionTexto"></textarea>
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
      separacion_lateral_central: sep,
      altura_mampara: alt,
      foto_panoramica_unidad: url1,
      foto_altura_mampara: url2,
      foto_lateral_central: url3
    };
  } else {
    const observacion = document.getElementById('observacionTexto').value;
    const foto = document.getElementById('fotoObservacion').files[0];
    let url = '';
    if (foto) {
      url = await subirImagen('observacion', foto);
    }
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

// Ocultar modal si se hace clic fuera
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

// Mostrar botón de "Agregar Detalle" solo si se selecciona una opción válida
selectIncorreccion.addEventListener("change", () => {
  const seleccion = selectIncorreccion.value;
  if (["Mampara", "Cola de Pato", "Pernos", "Otros"].includes(seleccion)) {
    btnAgregarDetalle.style.display = "block";
  } else {
    btnAgregarDetalle.style.display = "none";
  }
});
