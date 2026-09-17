import { describe, expect, it } from 'vitest';
import { getAuditDisplay } from '@/lib/utils/audit-display';

describe('getAuditDisplay', () => {
  it('formats order creation with order number', () => {
    expect(
      getAuditDisplay({
        action: 'order_created',
        entityType: 'order',
        details: { orderNumber: 'ORD-123' },
      })
    ).toMatchObject({
      label: 'Bestellung erstellt',
      description: 'Bestellung ORD-123 wurde erstellt.',
      tone: 'success',
    });
  });

  it('formats product updates with product name', () => {
    expect(
      getAuditDisplay({
        action: 'product_updated',
        entityType: 'product',
        details: { name: 'Cola' },
      })
    ).toMatchObject({
      label: 'Produkt aktualisiert',
      description: 'Cola wurde aktualisiert.',
    });
  });

  it('falls back for unknown actions', () => {
    expect(
      getAuditDisplay({
        action: 'custom_event',
        entityType: 'system',
      })
    ).toMatchObject({
      label: 'custom event',
      description: 'system wurde aktualisiert.',
    });
  });
});
