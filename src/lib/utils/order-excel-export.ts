import ExcelJS from 'exceljs';

import { sanitizeExcelValue } from './excel-export';

export interface OrderExportItem {
  productName: string;
  currentStock: string | null;
  unit: string;
}

export interface OrderExportSupplierGroup {
  supplierName: string;
  items: OrderExportItem[];
}

export interface OrderExportData {
  isoYear: number;
  isoWeek: number;
  weekStartDate?: string;
  weekEndDate?: string;
  groups: OrderExportSupplierGroup[];
}

function formatStockCell(currentStock: string | null, unit: string): string {
  const trimmed = currentStock?.trim() ?? '';
  if (!trimmed) return '—';
  const lowerStock = trimmed.toLowerCase();
  const lowerUnit = unit.trim().toLowerCase();
  const alreadyHasUnit =
    lowerUnit.length > 0 &&
    (lowerStock === lowerUnit ||
      lowerStock.endsWith(' ' + lowerUnit) ||
      lowerStock.endsWith(' ' + lowerUnit + '.') ||
      lowerStock.endsWith(' ' + lowerUnit + 's'));
  return alreadyHasUnit || lowerUnit.length === 0 ? trimmed : `${trimmed} ${unit}`;
}

const COLORS = {
  primary: 'FFBF462C',
  primaryLight: 'FFF6E1D8',
  supplierBar: 'FFFFE9D6',
  borderGray: 'FFD8CFC4',
  inputBorder: 'FFBF462C',
  textMuted: 'FF7C6F66',
  zebraTint: 'FFFBF5EF',
  white: 'FFFFFFFF',
};

/**
 * Generate an Excel workbook for the current Bestellvorschläge.
 * Layout: single sheet, supplier group rows, empty Bestellmenge column for handwriting.
 * Page setup caps output at 3 A4 pages portrait, fit-to-width.
 */
export async function generateOrdersExcel(
  data: OrderExportData
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Chickenplus Bestandskontrolle';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`Bestellung KW ${data.isoWeek}`, {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 3,
      margins: { top: 0.35, bottom: 0.35, left: 0.35, right: 0.35, header: 0.2, footer: 0.2 },
      printTitlesRow: '3:4',
    },
    headerFooter: {
      oddFooter: '&L&"Aptos,Italic"&9Chickenplus Bestellvorschläge&R&"Aptos,Italic"&9Seite &P / &N',
    },
  });

  sheet.columns = [
    { width: 40 }, // Produkt
    { width: 20 }, // Bestand
    { width: 20 }, // Bestellmenge (leer)
    { width: 26 }, // Lieferant
  ];

  // ---------- Title bar (row 1) ----------
  sheet.mergeCells('A1:D1');
  const titleCell = sheet.getCell('A1');
  const titleSuffix = data.weekStartDate && data.weekEndDate
    ? (() => {
        const [, sm, sd] = data.weekStartDate.split('-');
        const [, em, ed] = data.weekEndDate.split('-');
        return `${sd}.${sm}-${ed}.${em}.${data.isoYear}`;
      })()
    : String(data.isoYear);
  titleCell.value = `Bestellvorschläge  ·  KW ${data.isoWeek}  ·  ${titleSuffix}`;
  titleCell.font = { size: 16, bold: true, color: { argb: COLORS.white } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
  sheet.getRow(1).height = 28;

  // ---------- Summary line (row 2) ----------
  const totalSuppliers = data.groups.length;
  const totalItems = data.groups.reduce((sum, g) => sum + g.items.length, 0);

  sheet.mergeCells('A2:D2');
  const summaryCell = sheet.getCell('A2');
  summaryCell.value = `Lieferanten: ${totalSuppliers}    ·    Positionen: ${totalItems}`;
  summaryCell.font = { size: 10, italic: true, color: { argb: COLORS.textMuted } };
  summaryCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  summaryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryLight } };
  sheet.getRow(2).height = 18;

  sheet.addRow([]); // spacer row 3

  // ---------- Header row (row 4) ----------
  const headerRow = sheet.addRow([
    'Produkt',
    'Aktueller Bestand',
    'Bestellmenge',
    'Lieferant',
  ]);
  headerRow.height = 22;
  headerRow.font = { bold: true, size: 10, color: { argb: COLORS.primary } };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryLight } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    cell.border = {
      top: { style: 'thin', color: { argb: COLORS.borderGray } },
      bottom: { style: 'medium', color: { argb: COLORS.primary } },
    };
  });
  headerRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };

  // ---------- Body rows ----------
  let zebra = false;

  for (const group of data.groups) {
    if (group.items.length === 0) continue;

    // Supplier bar — elegant serif font, left-aligned
    const supRow = sheet.addRow([group.supplierName]);
    supRow.height = 22;
    supRow.font = {
      name: 'Cambria',
      bold: true,
      italic: true,
      size: 13,
      color: { argb: COLORS.primary },
    };
    supRow.alignment = { vertical: 'middle', indent: 1 };
    sheet.mergeCells(`A${supRow.number}:D${supRow.number}`);
    supRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.supplierBar } };
      cell.border = {
        bottom: { style: 'thin', color: { argb: COLORS.primary } },
      };
    });

    for (const item of group.items) {
      const stockDisplay = formatStockCell(item.currentStock, item.unit);

      const dataRow = sheet.addRow([
        sanitizeExcelValue(item.productName),
        sanitizeExcelValue(stockDisplay),
        '', // Bestellmenge leer
        sanitizeExcelValue(group.supplierName),
      ]);
      dataRow.height = 16;
      dataRow.font = { size: 10 };
      dataRow.alignment = { vertical: 'middle', indent: 1 };

      dataRow.eachCell((cell, col) => {
        cell.border = {
          bottom: { style: 'hair', color: { argb: COLORS.borderGray } },
        };
        if (col === 2 || col === 3) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
        if (zebra && col !== 3) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraTint } };
        }
      });

      // Highlight Bestellmenge cell for handwriting
      const qtyCell = dataRow.getCell(3);
      qtyCell.border = {
        top: { style: 'thin', color: { argb: COLORS.inputBorder } },
        bottom: { style: 'thin', color: { argb: COLORS.inputBorder } },
        left: { style: 'thin', color: { argb: COLORS.inputBorder } },
        right: { style: 'thin', color: { argb: COLORS.inputBorder } },
      };
      qtyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.white } };

      zebra = !zebra;
    }

    zebra = false;
  }

  return workbook;
}
