import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateChecklistExcel } from '@/lib/utils/excel-export';
import { logAudit } from '@/lib/utils/audit';
import { logger } from '@/lib/utils/logger';
import { de } from '@/i18n/de';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ checklistId: string }> }
) {
  const { checklistId } = await params;

  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: de.export.notLoggedIn }, { status: 401 });
    }

    // Fetch checklist
    const { data: checklist } = await supabase
      .from('checklists')
      .select('id, iso_year, iso_week, status')
      .eq('id', checklistId)
      .single();

    if (!checklist) {
      return NextResponse.json({ error: de.export.checklistNotFound }, { status: 404 });
    }

    // Fetch items with product details
    const { data: items } = await supabase
      .from('checklist_items')
      .select(`
        product_name,
        min_stock_snapshot,
        min_stock_max_snapshot,
        current_stock,
        missing_amount_final,
        products!inner(
          unit,
          sort_order,
          storage_locations!inner(name, sort_order),
          categories!inner(name, sort_order)
        )
      `)
      .eq('checklist_id', checklistId);

    if (!items) {
      return NextResponse.json({ error: de.export.noItems }, { status: 404 });
    }

    // Fetch storage locations for ordering
    const { data: storageLocations } = await supabase
      .from('storage_locations')
      .select('name, sort_order')
      .order('sort_order');

    // Transform items for export
    // Supabase types nested !inner joins as arrays but they're single objects at runtime
    const unwrap = <T,>(v: T | T[]): T => (Array.isArray(v) ? v[0] : v);

    const exportItems = items.map((item) => {
      const product = unwrap(item.products as Record<string, unknown> | Record<string, unknown>[]) as {
        unit: string | null;
        sort_order: number;
        storage_locations: { name: string; sort_order: number } | { name: string; sort_order: number }[];
        categories: { name: string; sort_order: number } | { name: string; sort_order: number }[];
      };
      const storage = unwrap(product.storage_locations);
      const category = unwrap(product.categories);
      return {
        productName: item.product_name as string,
        minStockSnapshot: item.min_stock_snapshot as number | null,
        minStockMaxSnapshot: item.min_stock_max_snapshot as number | null,
        currentStock: item.current_stock as number | null,
        missingAmountFinal: item.missing_amount_final as number | null,
        unit: (product.unit ?? '') as string,
        categoryName: category.name as string,
        storageName: storage.name as string,
      };
    });

    const workbook = await generateChecklistExcel({
      isoYear: checklist.iso_year,
      isoWeek: checklist.iso_week,
      items: exportItems,
      storageLocations: (storageLocations ?? []).map((loc) => ({
        name: loc.name as string,
        sortOrder: loc.sort_order as number,
      })),
    });

    const buffer = await workbook.xlsx.writeBuffer();

    // Audit log (best-effort, don't block export)
    logAudit({
      userId: user.id,
      action: 'checklist_exported',
      entityType: 'checklist',
      entityId: checklistId,
      details: { isoYear: checklist.iso_year, isoWeek: checklist.iso_week },
    }).catch((err) => {
      logger.error('Export audit log failed', {
        checklistId,
        error: err instanceof Error ? err.message : 'Unknown',
      });
    });

    const filename = `Bestandskontrolle_KW${String(checklist.iso_week).padStart(2, '0')}_${checklist.iso_year}.xlsx`;

    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    logger.error('Export failed', {
      checklistId,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return NextResponse.json({ error: de.export.failed }, { status: 500 });
  }
}
