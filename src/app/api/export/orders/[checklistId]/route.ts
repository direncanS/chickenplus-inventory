import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getActiveProfile } from '@/lib/supabase/auth-helpers';
import { getOrderSuggestions } from '@/lib/server/order-suggestions';
import { generateOrdersExcel } from '@/lib/utils/order-excel-export';
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

    const profile = await getActiveProfile(supabase, user.id);
    if (!profile) {
      return NextResponse.json({ error: de.auth.accountDeactivated }, { status: 403 });
    }

    const { data: checklist } = await supabase
      .from('checklists')
      .select('id, iso_year, iso_week, week_start_date, week_end_date, status')
      .eq('id', checklistId)
      .single();

    if (!checklist) {
      return NextResponse.json({ error: de.export.checklistNotFound }, { status: 404 });
    }

    const suggestions = await getOrderSuggestions(supabase, checklistId);

    const workbook = await generateOrdersExcel({
      isoYear: checklist.iso_year,
      isoWeek: checklist.iso_week,
      weekStartDate: checklist.week_start_date ?? undefined,
      weekEndDate: checklist.week_end_date ?? undefined,
      groups: suggestions.map((group) => ({
        supplierName: group.supplierName,
        items: group.items.map((item) => ({
          productName: item.productName,
          currentStock: item.currentStock,
          unit: item.unit,
        })),
      })),
    });

    const buffer = await workbook.xlsx.writeBuffer();

    logAudit({
      userId: user.id,
      action: 'orders_exported',
      entityType: 'checklist',
      entityId: checklistId,
      details: { isoYear: checklist.iso_year, isoWeek: checklist.iso_week },
    }).catch((err) => {
      logger.error('Orders export audit log failed', {
        checklistId,
        error: err instanceof Error ? err.message : 'Unknown',
      });
    });

    const filename = (() => {
      if (checklist.week_start_date && checklist.week_end_date) {
        const start = new Date(checklist.week_start_date + 'T12:00:00');
        const end = new Date(checklist.week_end_date + 'T12:00:00');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
        const sd = start.getDate();
        const ed = end.getDate();
        const em = months[end.getMonth()];
        const ey = end.getFullYear();
        return `Bestellvorschlaege_KW${String(checklist.iso_week).padStart(2, '0')}_${sd}-${ed}${em}${ey}.xlsx`;
      }
      return `Bestellvorschlaege_KW${String(checklist.iso_week).padStart(2, '0')}_${checklist.iso_year}.xlsx`;
    })();

    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    logger.error('Orders export failed', {
      checklistId,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return NextResponse.json({ error: de.export.failed }, { status: 500 });
  }
}
