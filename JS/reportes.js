import { supabase } from '../script.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-reportes');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await exportarExcel();
    });
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
  const fin = new Date(año, mes, 0).toISOString().split('T')[0];

  let query = supabase.from('inspecciones').select('*')
    .gte('fecha', inicio)
    .lte('fecha', fin);

  if (operadorInput !== '') {
    query = query.eq('responsable', operadorInput);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    alert(error ? 'Error al obtener los datos.' : '⚠️ No se encontraron registros.');
    return;
  }

  // Crear libro y hoja
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte');

  // Logo desde URL
  const logoUrl = 'https://i.postimg.cc/W48hdkrt/LOGOX-removebg-preview.png';
  const logoBase64 = await fetch(logoUrl).then(res => res.blob()).then(blob => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });
  });

  const logoId = workbook.addImage({
    base64: logoBase64,
    extension: 'png'
  });

  worksheet.addImage(logoId, {
    tl: { col: 0, row: 0 },
    ext: { width: 150, height: 60 }
  });

  // Título centrado
  worksheet.mergeCells('A1', 'I1');
  worksheet.getCell('A1').value = 'REGISTRO DE FALTAS O INCORRECCIONES DE UNIDADES';
  worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A1').font = { bold: true, size: 14 };

  // Código arriba a la derecha
  worksheet.mergeCells('I1');
  worksheet.getCell('I1').value = 'F-OPESEG-045';
  worksheet.getCell('I1').alignment = { vertical: 'middle', horizontal: 'right' };
  worksheet.getCell('I1').font = { italic: true, size: 12 };

  // Espacio visual
  worksheet.addRow([]);

  // Encabezados
  const headers = [
    'Fecha', 'Hora', 'Empresa', 'Placa', 'Chofer',
    'Lugar', 'Incorrecciones', 'Responsable', 'Observaciones'
  ];
  worksheet.addRow(headers);

  // Datos
  data.forEach(r => {
    worksheet.addRow([
      r.fecha || '',
      r.hora || '',
      r.empresa || '',
      r.placa || '',
      r.chofer || '',
      r.lugar || '',
      r.incorreccion || '',
      r.responsable || '',
      r.observaciones || ''
    ]);
  });

  // Estilos de la tabla
  worksheet.columns.forEach(col => {
    col.width = 18;
  });

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      if (rowNumber === 3) {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDDEEFF' }
        };
      }
    });
  });

  // Descargar
  const operadorNombre = operadorInput === '' ? 'Todos' : operadorInput.replace(/\s+/g, '_');
  const nombreArchivo = `reporte_${operadorNombre}_${año}_${mes}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), nombreArchivo);
}
