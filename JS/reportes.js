import { supabase } from '../script.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-reportes');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); // Evita que se recargue la página
      await exportarExcel();
    });
  } else {
    console.error('Formulario no encontrado.');
  }
});

async function exportarExcel() {
  const mesInput = document.getElementById('mes')?.value;
  const operadorInput = document.getElementById('operador')?.value;

  if (!mesInput) {
    alert('📅 Por favor selecciona un mes.');
    return;
  }

  const [año, mes] = mesInput.split('-');
  const inicio = `${año}-${mes}-01`;
  const fin = new Date(año, mes, 0).toISOString().split('T')[0]; // Último día del mes

  let query = supabase.from('inspecciones').select('*')
    .gte('fecha', inicio)
    .lte('fecha', fin);

  if (operadorInput !== '') {
    query = query.eq('responsable', operadorInput);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error consultando registros:', error.message);
    alert('Error al obtener los datos.');
    return;
  }

  if (!data || data.length === 0) {
    alert('⚠️ No se encontraron registros para los filtros seleccionados.');
    return;
  }

  // ✅ Formato final para exportar: 9 columnas específicas
  const registros = data.map(r => ({
    Fecha: r.fecha || '',
    Hora: r.hora || '',
    Empresa: r.empresa || '',
    Placa: r.placa || '',
    Chofer: r.chofer || '',
    Lugar: r.lugar || '',
    Incorrecciones: r.incorreccion || '',
    Responsable: r.responsable || '',
    Observaciones: r.observacion || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(registros);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');

  const operadorNombre = operadorInput === '' ? 'Todos' : operadorInput.replace(/\s+/g, '_');
  const nombreArchivo = `reporte_${operadorNombre}_${año}_${mes}.xlsx`;

  XLSX.writeFile(workbook, nombreArchivo);
}
