export interface OrderMessageItem {
  productName: string;
  suggestedQuantity: number;
  orderedQuantity: number | null;
  unit: string;
  isOrdered: boolean;
}

export interface OrderMessageInput {
  orderNumber: string;
  supplierName: string;
  isoYear: number;
  isoWeek: number;
  items: OrderMessageItem[];
}

export function getShareableOrderItems(items: OrderMessageItem[]) {
  const orderedItems = items.filter((item) => item.isOrdered);
  return orderedItems.length > 0 ? orderedItems : items;
}

export function formatOrderMessageQuantity(item: OrderMessageItem) {
  const quantity = item.orderedQuantity ?? item.suggestedQuantity;
  return `${quantity} ${item.unit}`.trim();
}

export function buildOrderMessage(input: OrderMessageInput) {
  const items = getShareableOrderItems(input.items);
  const itemLines = items
    .map((item) => `- ${item.productName}: ${formatOrderMessageQuantity(item)}`)
    .join('\n');

  return [
    `Hallo ${input.supplierName},`,
    '',
    'bitte folgende Bestellung fuer Chickenplus vorbereiten:',
    `Bestellung ${input.orderNumber} - KW ${input.isoWeek}/${input.isoYear}`,
    '',
    itemLines,
    '',
    'Danke!',
  ].join('\n');
}

export function normalizePhoneForWhatsApp(phone: string | null | undefined) {
  const raw = phone?.trim() ?? '';
  if (!raw) return null;

  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits.slice(1).replace(/\D/g, '');
  if (digits.startsWith('00')) return digits.slice(2).replace(/\D/g, '');
  return digits.replace(/\D/g, '') || null;
}

export function buildWhatsAppUrl(message: string, phone?: string | null) {
  const normalizedPhone = normalizePhoneForWhatsApp(phone);
  const query = `text=${encodeURIComponent(message)}`;
  return normalizedPhone
    ? `https://wa.me/${normalizedPhone}?${query}`
    : `https://wa.me/?${query}`;
}

export function buildMailtoUrl({
  email,
  subject,
  body,
}: {
  email?: string | null;
  subject: string;
  body: string;
}) {
  const recipient = email?.trim() ?? '';
  const params = new URLSearchParams({
    subject,
    body,
  });
  return `mailto:${recipient}?${params.toString()}`;
}
