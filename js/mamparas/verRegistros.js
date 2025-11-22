import { supabase } from './script.js';

async function cargarRegistros() {
  const cuerpo = document.getElementById('tabla-registros');
  if (!cuerpo) return;

  cuerpo.innerHTML = '';

  const { data, error } = await supabase
    .from('inspecciones')
    .select('*')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error al cargar registros:', error.message);
    cuerpo.innerHTML = '<tr><td colspan="10">Error al cargar datos</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="10">No hay registros disponibles</td></tr>';
    return;
  }

  data.forEach((registro) => {
    const fila = document.createElement('tr');
    const detalleObj = typeof registro.detalle === 'string' ? JSON.parse(registro.detalle || '{}') : (registro.detalle || {});
    fila.innerHTML = `
      <td>${registro.fecha || ''}</td>
      <td>${registro.hora || ''}</td>
      <td>${registro.empresa || ''}</td>
      <td>${registro.placa || ''}</td>
      <td>${registro.chofer || ''}</td>
      <td>${registro.lugar || ''}</td>
      <td>${registro.incorreccion || ''}</td>
      <td>${registro.responsable || ''}</td>
      <td>${registro.observaciones || ''}</td>
      <td><button class="px-2 py-1 text-indigo-600 underline text-xs" onclick='mostrarDetalle(${JSON.stringify(detalleObj)})'>Ver</button></td>
    `;
    cuerpo.appendChild(fila);
  });
}

async function initVerRegistros() {
  await cargarRegistros();

  const buscarPlacaInput = document.getElementById('buscarPlaca');
  if (buscarPlacaInput) {
    buscarPlacaInput.addEventListener('input', function () {
      const filtro = this.value.toUpperCase();
      const filas = document.querySelectorAll('#tabla-registros tr');

      filas.forEach((fila) => {
        const celdaPlaca = fila.cells[3];
        if (celdaPlaca && celdaPlaca.textContent.toUpperCase().includes(filtro)) {
          fila.style.display = '';
        } else {
          fila.style.display = 'none';
        }
      });
    });
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initVerRegistros);
} else {
  initVerRegistros();
}

window.mostrarDetalle = function (detalle) {
  const modal = document.getElementById('detalleModal');
  const contenido = document.getElementById('detalleContenido');

  if (!modal || !contenido) return;

  if (!detalle || typeof detalle !== 'object') {
    contenido.innerHTML = '<tr><td>Sin detalle disponible.</td></tr>';
    modal.style.display = 'flex';
    return;
  }

  const rows = Object.entries(detalle).map(
    ([key, value]) => `<tr><th style="text-transform:capitalize">${key}</th><td>${value || ''}</td></tr>`
  );

  contenido.innerHTML = rows.join('');
  modal.style.display = 'flex';
};

window.cerrarDetalle = function () {
  const modal = document.getElementById('detalleModal');
  if (modal) modal.style.display = 'none';
};

window.verImagenAmpliada = function (url) {
  const img = document.getElementById('imagenAmpliadaSrc');
  const modal = document.getElementById('imagenAmpliada');
  if (img && modal) {
    img.src = url;
    modal.style.display = 'flex';
  }
};

window.cerrarImagenAmpliada = function () {
  const modal = document.getElementById('imagenAmpliada');
  if (modal) modal.style.display = 'none';
};
