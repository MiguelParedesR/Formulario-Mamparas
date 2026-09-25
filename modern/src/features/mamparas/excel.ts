import ExcelJS from "exceljs";
import type { MamparaReportRow } from "../../domain/mamparas";

export async function buildFOPESEG045(rows: MamparaReportRow[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Terminales Portuarios Peruanos";
  const sheet = workbook.addWorksheet("Reporte");

  sheet.mergeCells("A1:B1");
  sheet.getCell("A1").value = "TPP";
  sheet.getCell("A1").font = { bold: true, size: 20, name: "Arial" };

  sheet.getCell("I1").value = "F-OPESEG-045";
  sheet.getCell("I1").font = { bold: true, size: 13, name: "Arial" };
  sheet.getCell("I1").alignment = { horizontal: "right", vertical: "middle" };

  sheet.mergeCells("A2:I2");
  sheet.getCell("A2").value = "REGISTRO DE FALTAS O INCORRECCIONES DE UNIDADES";
  sheet.getCell("A2").font = { bold: true, size: 14, name: "Arial" };
  sheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  sheet.getRow(4).values = ["FECHA","HORA","EMPRESA","PLACA","CHOFER","LUGAR","INCORRECCIONES","RESPONSABLE","OBSERVACIONES"];

  rows.forEach((item, index) => {
    sheet.getRow(index + 5).values = [
      item.fecha,item.hora,item.empresa,item.placa,item.chofer,item.lugar,item.incorreccion,item.responsable,item.observaciones,
    ];
  });

  const widths = [13,11,24,13,24,18,25,22,34];
  sheet.columns.forEach((column,index) => { column.width = widths[index] ?? 18; });

  for (let rowNumber=4; rowNumber<=rows.length+4; rowNumber+=1) {
    sheet.getRow(rowNumber).eachCell({ includeEmpty:true }, (cell) => {
      cell.font = { name:"Arial", size:rowNumber===4?10:9, bold:rowNumber===4 };
      cell.alignment = { vertical:"middle", horizontal:rowNumber===4?"center":"left", wrapText:true };
      cell.border = {
        top:{style:"thin",color:{argb:"FF808080"}},
        left:{style:"thin",color:{argb:"FF808080"}},
        bottom:{style:"thin",color:{argb:"FF808080"}},
        right:{style:"thin",color:{argb:"FF808080"}},
      };
      if (rowNumber===4) cell.fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FFDDEEFF"} };
    });
  }

  sheet.views = [{ state:"frozen", ySplit:4 }];
  sheet.autoFilter = { from:"A4", to:"I4" };
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
