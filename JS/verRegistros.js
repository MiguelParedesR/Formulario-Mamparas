import { supabase } from '../script.js';

window.addEventListener('DOMContentLoaded', async () => {
  await cargarRegistros();
});

async function cargarRegistros() {
  const tabla = document.querySelector('#tabla-registros tbody');
  tabla.innerHTML = '';

  const { data, error } = await supabase
    .from('inspecciones')
    .select('*')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error al cargar registros:', error.message);
    tabla.innerHTML = '<tr><td colspan="10">Error al cargar datos</td></tr>';
    return;
  }

  if (data.length === 0) {
    tabla.innerHTML = '<tr><td colspan="10">No hay registros disponibles</td></tr>';
    return;
  }

  data.forEach((registro) => {
    const fila = document.createElement('tr');
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
      <td><button onclick='mostrarDetalle(${JSON.stringify(typeof registro.detalle === "string" ? JSON.parse(registro.detalle) : registro.detalle)})'>👁️</button></td>
    `;
    tabla.appendChild(fila);
  });
}

window.mostrarDetalle = function (detalle) {
  const modal = document.getElementById('detalleModal');
  const contenido = document.getElementById('detalleCompleto');

  if (!detalle || typeof detalle !== 'object') {
    contenido.innerHTML = '<p>Sin detalle disponible.</p>';
    modal.style.display = 'flex';
    return;
  }
  if (detalle.tipo === 'Mampara') {
    contenido.innerHTML = `
      <table class="detalle-tabla">
        <tr><th>Tipo</th><td>${detalle.tipo}</td></tr>
        <tr><th>Separación Lateral Central</th><td>${detalle.separacion} cm</td></tr>
        <tr><th>Altura de Mampara</th><td>${detalle.altura} cm</td></tr>
        <tr><th>Foto Panorámica</th><td><img src="${detalle.fotoPanoramica}" class="miniatura" onclick="verImagenAmpliada('${detalle.fotoPanoramica}')"></td></tr>
        <tr><th>Foto Altura</th><td><img src="${detalle.fotoAltura}" class="miniatura" onclick="verImagenAmpliada('${detalle.fotoAltura}')"></td></tr>
        <tr><th>Foto Lateral</th><td><img src="${detalle.fotoLateral}" class="miniatura" onclick="verImagenAmpliada('${detalle.fotoLateral}')"></td></tr>
      </table>
    `;
  }  else {
    contenido.innerHTML = `
      <table class="detalle-tabla">
        <tr><th>Tipo</th><td>${detalle.tipo}</td></tr>
        <tr><th>Observación</th><td>${detalle.observacion || '—'}</td></tr>
        <tr><th>Foto</th><td>${detalle.fotoObservacion ? `<img src="${detalle.fotoObservacion}" class="miniatura" onclick="verImagenAmpliada('${detalle.fotoObservacion}')">` : '—'}</td></tr>
      </table>
    `;
  }

  modal.style.display = 'flex';
};


window.verImagenAmpliada = function (url) {
  const ampliado = document.createElement('div');
  ampliado.className = 'imagen-ampliada';
  ampliado.innerHTML = `
    <div class="imagen-wrapper">
      <img src="${url}" />
      <span class="cerrar-img" onclick="this.parentElement.parentElement.remove()">✖</span>
    </div>
  `;
  document.body.appendChild(ampliado);
};


window.cerrarDetalle = function () {
  document.getElementById('detalleModal').style.display = 'none';
};

window.ampliarImagen = function (url) {
  document.getElementById('imagenGrande').src = url;
  document.getElementById('imagenAmpliada').style.display = 'block';
};

window.cerrarImagen = function () {
  document.getElementById('imagenAmpliada').style.display = 'none';
};
document.getElementById("buscarPlaca").addEventListener("input", function () {
  const filtro = this.value.toUpperCase();
  const filas = document.querySelectorAll("#tabla-registros tbody tr");

  filas.forEach(fila => {
    const celdaPlaca = fila.cells[3]; // 4ta columna = Placa
    if (celdaPlaca && celdaPlaca.textContent.toUpperCase().includes(filtro)) {
      fila.style.display = "";
    } else {
      fila.style.display = "none";
    }
  });
});
    