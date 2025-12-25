import { supabase } from '../utils/supabase.js';
import { mostrarDetalleMampara } from './detalle-modal.js';

const TABLA_ID = 'tabla-registros';
const BUSCAR_PLACA_ID = 'buscarPlaca';

const renderFila = (registro) => {
  // Using single quotes for the JSON string to avoid issues with double quotes in the data
  const registroDataString = JSON.stringify(registro).replace(/"/g, '&quot;');

  return `
    <tr class="odd:bg-gray-50 even:bg-white text-gray-700 text-sm leading-relaxed">
      <td class="px-3 py-2">${registro.fecha || '-'}</td>
      <td class="px-3 py-2">${registro.hora || '-'}</td>
      <td class="px-3 py-2">${registro.empresa || '-'}</td>
      <td class="px-3 py-2 font-semibold text-gray-900">${registro.placa || '-'}</td>
      <td class="px-3 py-2">${registro.chofer || '-'}</td>
      <td class="px-3 py-2">${registro.lugar || '-'}</td>
      <td class="px-3 py-2">${registro.incorreccion || '-'}</td>
      <td class="px-3 py-2">${registro.responsable || '-'}</td>
      <td class="px-3 py-2 text-center">
        <button
          type="button"
          class="btn-ver-detalle flex items-center justify-center w-10 h-10 rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          data-registro='${registroDataString}'
          title="Ver detalle"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5.5C7.5 5.5 3.73 8.11 2 12c1.73 3.89 5.5 6.5 10 6.5s8.27-2.61 10-6.5c-1.73-3.89-5.5-6.5-10-6.5Zm0 10.44A3.94 3.94 0 1 1 15.94 12 3.94 3.94 0 0 1 12 15.94Zm0-6.38A2.44 2.44 0 1 0 14.44 12 2.44 2.44 0 0 0 12 9.56Z" fill="currentColor"/>
          </svg>
        </button>
      </td>
    </tr>
  `;
};

const cargarRegistros = async () => {
  const cuerpo = document.getElementById(TABLA_ID);
  if (!cuerpo) return;

  cuerpo.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-gray-500">Cargando registros...</td></tr>`;

  const { data, error } = await supabase
    .from('inspecciones')
    .select('*')
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false });

  if (error) {
    console.error('Error al cargar registros:', error.message);
    cuerpo.innerHTML = '<tr><td colspan="9" class="py-3 text-center text-red-600">Error al cargar los datos.</td></tr>';
    return;
  }

  if (!data || !data.length) {
    cuerpo.innerHTML = '<tr><td colspan="9" class="py-3 text-center text-gray-500">No hay registros disponibles.</td></tr>';
    return;
  }

  cuerpo.innerHTML = data.map(renderFila).join('');
};

const activarFiltroPlaca = () => {
  const input = document.getElementById(BUSCAR_PLACA_ID);
  if (!input) return;

  input.addEventListener('input', function () {
    const filtro = this.value.trim().toUpperCase();
    const filas = document.querySelectorAll(`#${TABLA_ID} tr`);

    filas.forEach((fila) => {
      const celdaPlaca = fila.cells?.[3];
      if (!celdaPlaca) return;
      const coincide = celdaPlaca.textContent.toUpperCase().includes(filtro);
      fila.style.display = coincide ? '' : 'none';
    });
  });
};

const initRegistros = () => {
  const tabla = document.getElementById(TABLA_ID);
  if (!tabla) {
    return;
  }

  cargarRegistros();
  activarFiltroPlaca();

  document.body.addEventListener('click', (event) => {
    const boton = event.target.closest('.btn-ver-detalle');
    if (boton && boton.dataset.registro) {
        try {
            const registro = JSON.parse(boton.dataset.registro.replace(/&quot;/g, '"'));
            mostrarDetalleMampara(registro);
        } catch(e) {
            console.error('Error parsing registro data from button:', e);
        }
    }
  });
};

initRegistros();