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
  currentStock: number | null;
  missingAmountFinal: number | null;
  unit: string;
  categoryName: string;
  storageName: string;
}

interface ExportData {
  isoYear: number;
  isoWeek: number;
  items: ExportChecklistItem[];
  storageLocations: { name: string; sortOrder: number }[];
}

/**
 * Generate Excel workbook for a checklist.
 * Operational equivalent layout: same ordering, same columns, readable format.
 */
export async function generateChecklistExcel(
  data: ExportData
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Chickenplus Bestandskontrolle';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(
    `KW ${data.isoWeek} ${data.isoYear}`
  );

  // Title row
  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `Bestandskontrolle - KW ${data.isoWeek} / ${data.isoYear}`;
  titleCell.font = { size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  sheet.addRow([]);

  // Headers
  const headerRow = sheet.addRow([
    'Produkt',
    'Einheit',
    'Mindestbestand',
    'Bestand',
    'Fehlt',
    'Kategorie',
  ]);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    cell.border = {
      bottom: { style: 'thin' },
    };
  });

  // Column widths
  sheet.getColumn(1).width = 30;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 16;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 20;

  // Group items by storage location (maintaining sort order)
  const sortedLocations = [...data.storageLocations].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  for (const location of sortedLocations) {
    const locationItems = data.items.filter(
      (item) => item.storageName === location.name
    );

    if (locationItems.length === 0) continue;

    // Storage location header
    const locRow = sheet.addRow([location.name]);
    locRow.font = { bold: true, size: 12 };
    locRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD4EDDA' },
    };
    sheet.mergeCells(`A${locRow.number}:F${locRow.number}`);

    // Group by category within location
    const categories = [...new Set(locationItems.map((i) => i.categoryName))];

    for (const category of categories) {
      const categoryItems = locationItems.filter(
        (i) => i.categoryName === category
      );

      // Category subheader
      const catRow = sheet.addRow([`  ${category}`]);
      catRow.font = { bold: true, italic: true };
      catRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8F9FA' },
      };
      sheet.mergeCells(`A${catRow.number}:F${catRow.number}`);

      for (const item of categoryItems) {
        const minStockDisplay = item.minStockMaxSnapshot
          ? `${item.minStockSnapshot}-${item.minStockMaxSnapshot}`
          : item.minStockSnapshot !== null
            ? String(item.minStockSnapshot)
            : '';

        sheet.addRow([
          sanitizeExcelValue(item.productName),
          sanitizeExcelValue(item.unit),
          sanitizeExcelValue(minStockDisplay),
          item.currentStock,
          item.missingAmountFinal,
          sanitizeExcelValue(item.categoryName),
        ]);
      }
    }
  }

  return workbook;
}
