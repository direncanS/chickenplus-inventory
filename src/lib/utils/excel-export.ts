import ExcelJS from 'exceljs';

/**
 * Sanitize cell value to prevent formula injection.
 * Prefixes dangerous characters with a single quote.
 */
export function sanitizeExcelValue(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;

  const str = String(value);
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

interface ExportChecklistItem {
  productName: string;
  minStockSnapshot: number | null;
  minStockMaxSnapshot: number | null;
  currentStock: string | null;
  isMissing: boolean;
  unit: string;
  categoryName: string;
  storageName: string;
}

interface ExportData {
  isoYear: number;
  isoWeek: number;
  weekStartDate?: string;
  weekEndDate?: string;
  items: ExportChecklistItem[];
  storageLocations: { name: string; sortOrder: number }[];
}

const COLORS = {
  primary: 'FFBF462C',
  primaryLight: 'FFF6E1D8',
  storageBar: 'FFFFE9D6',
  categoryBar: 'FFFAF3EB',
  missingTint: 'FFFECACA',   // red-200 — gesättigt, klar als Warnung lesbar
  missingText: 'FFB91C1C',   // red-700
  missingBorder: 'FFDC2626', // red-600 — sichtbarer linker Balken
  borderGray: 'FFD8CFC4',
  textMuted: 'FF7C6F66',
  white: 'FFFFFFFF',
};

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

/**
 * Generate Excel workbook for a checklist.
 * 3 Spalten (Produkt · Aktueller Bestand · Fehlt), gruppiert nach Storage/Category‑Bars.
 * A4 portrait, fit‑to‑width, Footer mit Seitenzahl.
 */
export async function generateChecklistExcel(
  data: ExportData
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Chickenplus Bestandskontrolle';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`KW ${data.isoWeek} ${data.isoYear}`, {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4, header: 0.2, footer: 0.2 },
      printTitlesRow: '3:4',
    },
    headerFooter: {
      oddFooter: '&L&"Aptos,Italic"&9Chickenplus Bestandskontrolle&R&"Aptos,Italic"&9Seite &P / &N',
    },
  });

  sheet.columns = [
    { width: 46 }, // Produkt
    { width: 22 }, // Aktueller Bestand
    { width: 10 }, // Fehlt
  ];

  // ---------- Title bar (row 1) ----------
  sheet.mergeCells('A1:C1');
  const titleCell = sheet.getCell('A1');
  const titleSuffix = data.weekStartDate && data.weekEndDate
    ? (() => {
        const [, sm, sd] = data.weekStartDate.split('-');
        const [, em, ed] = data.weekEndDate.split('-');
        return `${sd}.${sm}-${ed}.${em}.${data.isoYear}`;
      })()
    : String(data.isoYear);
  titleCell.value = `Bestandskontrolle  ·  KW ${data.isoWeek}  ·  ${titleSuffix}`;
  titleCell.font = { size: 16, bold: true, color: { argb: COLORS.white } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
  sheet.getRow(1).height = 28;

  // ---------- Summary line (row 2) ----------
  const totalCount = data.items.length;
  const checkedCount = data.items.filter((item) => item.currentStock !== null && item.currentStock !== '').length;
  const missingCount = data.items.filter((item) => item.isMissing).length;

  sheet.mergeCells('A2:C2');
  const summaryCell = sheet.getCell('A2');
  summaryCell.value = `Positionen: ${totalCount}    ·    Erfasst: ${checkedCount}    ·    Fehlt: ${missingCount}`;
  summaryCell.font = { size: 10, italic: true, color: { argb: COLORS.textMuted } };
  summaryCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  summaryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryLight } };
  sheet.getRow(2).height = 18;

  sheet.addRow([]); // spacer row 3

  // ---------- Header row (row 4) ----------
  const headerRow = sheet.addRow(['Produkt', 'Aktueller Bestand', 'Fehlt']);
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
  const sortedLocations = [...data.storageLocations].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  for (const location of sortedLocations) {
    const locationItems = data.items.filter(
      (item) => item.storageName === location.name
    );

    if (locationItems.length === 0) continue;

    // Storage location bar
    const locRow = sheet.addRow([location.name.toUpperCase()]);
    locRow.height = 20;
    locRow.font = { bold: true, size: 11, color: { argb: COLORS.primary } };
    locRow.alignment = { vertical: 'middle', indent: 1 };
    sheet.mergeCells(`A${locRow.number}:C${locRow.number}`);
    locRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.storageBar } };
    });

    // Group by category within location (für Body‑Gruppierung, nicht als eigene Spalte)
    const categories = [...new Set(locationItems.map((i) => i.categoryName))];

    for (const category of categories) {
      const categoryItems = locationItems.filter(
        (i) => i.categoryName === category
      );

      if (category && category !== 'Allgemein') {
        const catRow = sheet.addRow([`  ${category}`]);
        catRow.height = 16;
        catRow.font = { bold: true, italic: true, size: 9, color: { argb: COLORS.textMuted } };
        catRow.alignment = { vertical: 'middle', indent: 1 };
        sheet.mergeCells(`A${catRow.number}:C${catRow.number}`);
        catRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.categoryBar } };
        });
      }

      for (const item of categoryItems) {
        const dataRow = sheet.addRow([
          sanitizeExcelValue(item.productName),
          sanitizeExcelValue(formatStockCell(item.currentStock, item.unit)),
          item.isMissing ? '✓' : '',
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
        });

        if (item.isMissing) {
          dataRow.eachCell((cell, col) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.missingTint } };
            if (col === 1) {
              cell.border = {
                ...cell.border,
                left: { style: 'thick', color: { argb: COLORS.missingBorder } },
              };
            }
          });
          dataRow.getCell(1).font = { size: 10, bold: true, color: { argb: COLORS.missingText } };
          dataRow.getCell(3).font = { size: 11, bold: true, color: { argb: COLORS.missingText } };
        }
      }
    }
  }

  // ---------- Footer summary row ----------
  sheet.addRow([]);
  const totalsRow = sheet.addRow([
    'Gesamt',
    `${checkedCount} / ${totalCount}`,
    String(missingCount),
  ]);
  totalsRow.height = 20;
  totalsRow.font = { bold: true, size: 10, color: { argb: COLORS.primary } };
  totalsRow.alignment = { vertical: 'middle', indent: 1 };
  totalsRow.eachCell((cell, col) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryLight } };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.primary } },
    };
    if (col === 2 || col === 3) {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });

  return workbook;
}
