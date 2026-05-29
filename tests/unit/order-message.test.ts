import { describe, expect, it } from 'vitest';
import {
  buildMailtoUrl,
  buildOrderMessage,
  buildWhatsAppUrl,
  getShareableOrderItems,
  normalizePhoneForWhatsApp,
} from '@/lib/utils/order-message';

const items = [
  {
    productName: 'Cola',
    suggestedQuantity: 10,
    orderedQuantity: 8,
    unit: 'koli',
    isOrdered: true,
  },
  {
    productName: 'Fanta',
    suggestedQuantity: 5,
    orderedQuantity: null,
    unit: 'koli',
    isOrdered: false,
  },
];

describe('order message helpers', () => {
  it('shares ordered items first', () => {
    expect(getShareableOrderItems(items).map((item) => item.productName)).toEqual(['Cola']);
  });

  it('falls back to all items when nothing is marked ordered', () => {
    expect(
      getShareableOrderItems(items.map((item) => ({ ...item, isOrdered: false }))).map(
        (item) => item.productName
      )
    ).toEqual(['Cola', 'Fanta']);
  });

  it('builds a readable order message', () => {
    const message = buildOrderMessage({
      orderNumber: 'ORD-123',
      supplierName: 'Metro',
      isoYear: 2026,
      isoWeek: 22,
      items,
    });

    expect(message).toContain('Hallo Metro');
    expect(message).toContain('Bestellung ORD-123 - KW 22/2026');
    expect(message).toContain('- Cola: 8 koli');
    expect(message).not.toContain('Fanta');
  });

  it('normalizes phone numbers for WhatsApp', () => {
    expect(normalizePhoneForWhatsApp('+43 660 123 456')).toBe('43660123456');
    expect(normalizePhoneForWhatsApp('0043 660 123 456')).toBe('43660123456');
  });

  it('builds WhatsApp and mail links', () => {
    expect(buildWhatsAppUrl('Hallo', '+43 660 123')).toBe(
      'https://wa.me/43660123?text=Hallo'
    );
    expect(buildMailtoUrl({ email: 'a@b.at', subject: 'S', body: 'B' })).toBe(
      'mailto:a@b.at?subject=S&body=B'
    );
  });
});
