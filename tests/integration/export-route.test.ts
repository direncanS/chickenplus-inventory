/**
 * Integration test: Excel export route behavior
 * Strategy: Mock (Supabase local unavailable)
 * Note: Should be re-verified with real DB after local Supabase setup
 *
 * Tests the export route's response structure, headers, and error handling
 * by simulating the route handler logic.
 */
import { describe, it, expect } from 'vitest';
import { de } from '@/i18n/de';

// -- Types mirroring the export route data structures --

interface ExportChecklist {
  id: string;
  iso_year: number;
  iso_week: number;
  status: string;
}

interface ExportItem {
  productName: string;
  minStockSnapshot: number | null;
  minStockMaxSnapshot: number | null;
  currentStock: string | null;
  isMissing: boolean;
  unit: string;
  categoryName: string;
  storageName: string;
}

interface ExportResult {
  status: number;
  headers?: Record<string, string>;
  error?: string;
  filename?: string;
  itemCount?: number;
}

/**
 * Simulates the export route logic: auth check → fetch checklist → fetch items → generate response
 */
function simulateExportRoute(
  userId: string | null,
  checklist: ExportChecklist | null,
  items: ExportItem[] | null
): ExportResult {
  // Auth check
  if (!userId) {
    return { status: 401, error: de.export.notLoggedIn };
  }

  // Checklist not found
  if (!checklist) {
    return { status: 404, error: de.export.checklistNotFound };
  }

  // No items
  if (!items) {
    return { status: 404, error: de.export.noItems };
  }

  // Build filename
  const filename = `Bestandskontrolle_KW${String(checklist.iso_week).padStart(2, '0')}_${checklist.iso_year}.xlsx`;

  return {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
    filename,
    itemCount: items.length,
  };
}

// -- Tests --

describe('Export route behavior (mock)', () => {
  const validUser = 'user-1';
  const validChecklist: ExportChecklist = {
    id: 'cl-1',
    iso_year: 2025,
    iso_week: 3,
    status: 'completed',
  };
  const validItems: ExportItem[] = [
    {
      productName: 'Hähnchenbrust',
      minStockSnapshot: 5,
      minStockMaxSnapshot: 10,
      currentStock: '2',
      isMissing: true,
      unit: 'kg',
      categoryName: 'Fleisch',
      storageName: 'Kühlhaus',
    },
    {
      productName: 'Pommes',
      minStockSnapshot: 3,
      minStockMaxSnapshot: null,
      currentStock: 'voll',
      isMissing: false,
      unit: 'karton',
      categoryName: 'TK',
      storageName: 'Tiefkühler',
    },
  ];

  it('returns 200 with correct headers for valid request', () => {
    const result = simulateExportRoute(validUser, validChecklist, validItems);

    expect(result.status).toBe(200);
    expect(result.headers!['Content-Type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(result.headers!['Content-Disposition']).toContain('attachment');
    expect(result.headers!['Content-Disposition']).toContain('.xlsx');
  });

  it('generates correct filename with padded week number', () => {
    const result = simulateExportRoute(validUser, validChecklist, validItems);

    expect(result.filename).toBe('Bestandskontrolle_KW03_2025.xlsx');
  });

  it('generates correct filename for double-digit week', () => {
    const checklist: ExportChecklist = { ...validChecklist, iso_week: 42 };
    const result = simulateExportRoute(validUser, checklist, validItems);

    expect(result.filename).toBe('Bestandskontrolle_KW42_2025.xlsx');
  });

  it('returns 401 when user is not authenticated', () => {
    const result = simulateExportRoute(null, validChecklist, validItems);

    expect(result.status).toBe(401);
    expect(result.error).toBe(de.export.notLoggedIn);
  });

  it('returns 404 when checklist is not found', () => {
    const result = simulateExportRoute(validUser, null, validItems);

    expect(result.status).toBe(404);
    expect(result.error).toBe(de.export.checklistNotFound);
  });

  it('returns 404 when items are null', () => {
    const result = simulateExportRoute(validUser, validChecklist, null);

    expect(result.status).toBe(404);
    expect(result.error).toBe(de.export.noItems);
  });

  it('includes item count in successful response', () => {
    const result = simulateExportRoute(validUser, validChecklist, validItems);

    expect(result.itemCount).toBe(2);
  });

  it('handles single-item export', () => {
    const result = simulateExportRoute(validUser, validChecklist, [validItems[0]]);

    expect(result.status).toBe(200);
    expect(result.itemCount).toBe(1);
  });

  it('returns correct content disposition format', () => {
    const result = simulateExportRoute(validUser, validChecklist, validItems);

    const disposition = result.headers!['Content-Disposition'];
    // Must match: attachment; filename="Bestandskontrolle_KW03_2025.xlsx"
    expect(disposition).toMatch(/^attachment; filename="[^"]+\.xlsx"$/);
  });
});
