import { supabase, mostrarModal } from './script.js';

const mesInput = () => document.getElementById('mesSelect');
const operadorInput = () => document.getElementById('operadorSelect');
const btnExportar = () => document.getElementById('btnExportar');

document.addEventListener('DOMContentLoaded', () => {
  const btn = btnExportar();
  if (btn) btn.addEventListener('click', exportarExcel);
});

async function exportarExcel() {
  const mesValor = mesInput()?.value;
  const operadorValor = operadorInput()?.value;

  if (!mesValor) {
    alert('Por favor selecciona un mes.');
    return;
  }

  const [anio, mes] = mesValor.split('-');
  const inicio = `${anio}-${mes}-01`;
  const fin = new Date(anio, mes, 0).toISOString().split('T')[0];

  let query = supabase.from('inspecciones').select('*').gte('fecha', inicio).lte('fecha', fin);
  if (operadorValor && operadorValor !== 'Todos') {
    query = query.eq('responsable', operadorValor);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    alert(error ? 'Error al obtener los datos.' : 'No se encontraron registros.');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte');

  const logoUrl = 'https://i.postimg.cc/W48hdkrt/LOGOX-removebg-preview.png';
  const logoBase64 = await fetch(logoUrl)
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        })
    );

  const logoId = workbook.addImage({ base64: logoBase64, extension: 'png' });
  worksheet.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 60 } });

  worksheet.getCell('I1').value = 'F-OPESEG-045';
  worksheet.getCell('I1').alignment = { vertical: 'middle', horizontal: 'right' };
  worksheet.getCell('I1').font = { bold: true, size: 13 };

  worksheet.mergeCells('A2:I2');
  worksheet.getCell('A2').value = 'REGISTRO DE FALTAS O INCORRECCIONES DE UNIDADES';
  worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A2').font = { bold: true, size: 14 };

  worksheet.addRow([]);

  const headers = ['FECHA', 'HORA', 'EMPRESA', 'PLACA', 'CHOFER', 'LUGAR', 'INCORRECCIONES', 'RESPONSABLE', 'OBSERVACIONES'];
  worksheet.addRow(headers);

  data.forEach((r) => {
    worksheet.addRow([
      r.fecha || '',
      r.hora || '',
      r.empresa || '',
      r.placa || '',
      r.chofer || '',
      r.lugar || '',
      r.incorreccion || '',
      r.responsable || '',
      r.observaciones || '',
    ]);
  });

  worksheet.columns.forEach((col) => {
    col.width = 18;
  });

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const cellAddress = cell.address;
      const excluirBordes = rowNumber === 1 || cellAddress === 'I1' || (rowNumber === 2 && colNumber >= 1 && colNumber <= 9);

      if (!cell.value) cell.value = '';

      if (!excluirBordes) {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }

      if (rowNumber === 4) {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEEFF' } };
      }
    });
  });

  const operadorNombre = operadorValor === 'Todos' ? 'Todos' : operadorValor.replace(/\s+/g, '_');
  const nombreArchivo = `reporte_${operadorNombre}_${anio}_${mes}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), nombreArchivo);

  mostrarModal('success', 'Reporte generado y descargado exitosamente.');
}
