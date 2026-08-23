import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/** Export an array of flat objects to an .xlsx file. */
export function exportToExcel(rows: Record<string, unknown>[], fileName: string): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/** Export an array of flat objects to a .csv file. */
export function exportToCsv(rows: Record<string, unknown>[], fileName: string): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${fileName}.csv`);
}

/** Export a titled table to a PDF using jspdf-autotable. */
export function exportTableToPdf(
  title: string,
  head: string[],
  body: (string | number)[][],
  fileName: string,
): jsPDF {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  autoTable(doc, {
    head: [head],
    body,
    startY: 26,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [27, 42, 74] },
  });
  doc.save(`${fileName}.pdf`);
  return doc;
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
