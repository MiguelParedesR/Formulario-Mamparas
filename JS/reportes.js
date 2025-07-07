// reportes.js

import { supabase, mostrarModal } from '../script.js';

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

  if (operadorInput && operadorInput !== 'Todos') {
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

// Fila 1: código a la derecha (I1)
worksheet.getCell('I1').value = 'F-OPESEG-045';
worksheet.getCell('I1').alignment = { vertical: 'middle', horizontal: 'right' };
worksheet.getCell('I1').font = { bold: true, size: 13 };

// Fila 2: título centrado (fusionando A2:I2)
worksheet.mergeCells('A2:I2');
worksheet.getCell('A2').value = 'REGISTRO DE FALTAS O INCORRECCIONES DE UNIDADES';
worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
worksheet.getCell('A2').font = { bold: true, size: 14 };

// Espacio visual en fila 3
worksheet.addRow([]);


  // Encabezados
  const headers = [
    'FECHA', 'HORA', 'EMPRESA', 'PLACA', 'CHOFER',
    'LUGAR', 'INCORRECCIONES', 'RESPONSABLE', 'OBSERVACIONES'
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

  // Estilos
  worksheet.columns.forEach(col => {
    col.width = 18;
  });

  worksheet.eachRow((row, rowNumber) => {
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const cellAddress = cell.address;

    const excluirBordes =
      rowNumber === 1 || // ← EXCLUYE BORDES EN TODA LA FILA 1
      cellAddress === 'I1' ||
      (rowNumber === 2 && colNumber >= 1 && colNumber <= 9);

    // Forzar valor explícito si está vacío
    if (!cell.value) {
      cell.value = '';
    }

    if (!excluirBordes) {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }

    // Estilo especial para encabezado (fila 4)
    if (rowNumber === 4) {
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
  const operadorNombre = operadorInput === 'Todos' ? 'Todos' : operadorInput.replace(/\s+/g, '_');
  const nombreArchivo = `reporte_${operadorNombre}_${año}_${mes}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), nombreArchivo);

  // Mostrar confirmación
  mostrarModal('success', '✅ Reporte generado y descargado exitosamente.');
}
