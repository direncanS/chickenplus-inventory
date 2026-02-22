import { describe, it, expect } from 'vitest';
import { updateChecklistItemSchema, completeChecklistSchema, reopenChecklistSchema } from '@/lib/validations/checklist';
import { createSupplierSchema, updateSupplierSchema, productSupplierSchema } from '@/lib/validations/supplier';
import { createOrderSchema, updateOrderStatusSchema } from '@/lib/validations/order';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';
const validUUID2 = '660e8400-e29b-41d4-a716-446655440001';

// ── updateChecklistItemSchema ──

describe('updateChecklistItemSchema', () => {
  it('accepts valid input', () => {
    const result = updateChecklistItemSchema.safeParse({
      checklistItemId: validUUID,
      currentStock: 5,
      isChecked: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts null currentStock', () => {
    const result = updateChecklistItemSchema.safeParse({
      checklistItemId: validUUID,
      currentStock: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative currentStock', () => {
    const result = updateChecklistItemSchema.safeParse({
      checklistItemId: validUUID,
      currentStock: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID', () => {
    const result = updateChecklistItemSchema.safeParse({
      checklistItemId: 'not-a-uuid',
      currentStock: 5,
    });
    expect(result.success).toBe(false);
  });

  it('accepts zero currentStock', () => {
    const result = updateChecklistItemSchema.safeParse({
      checklistItemId: validUUID,
      currentStock: 0,
    });
    expect(result.success).toBe(true);
  });
});

// ── createSupplierSchema ──

describe('createSupplierSchema', () => {
  it('accepts valid input', () => {
    const result = createSupplierSchema.safeParse({
      name: 'Test Lieferant',
      phone: '+43 123 456',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createSupplierSchema.safeParse({
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty email string', () => {
    const result = createSupplierSchema.safeParse({
      name: 'Test',
      email: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = createSupplierSchema.safeParse({
      name: 'Test',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });
});

// ── updateSupplierSchema ──

describe('updateSupplierSchema', () => {
  it('accepts valid update with supplierId', () => {
    const result = updateSupplierSchema.safeParse({
      supplierId: validUUID,
      name: 'Updated Name',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing supplierId', () => {
    const result = updateSupplierSchema.safeParse({
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('accepts isActive toggle', () => {
    const result = updateSupplierSchema.safeParse({
      supplierId: validUUID,
      isActive: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email in update', () => {
    const result = updateSupplierSchema.safeParse({
      supplierId: validUUID,
      email: 'bad-email',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty email in update', () => {
    const result = updateSupplierSchema.safeParse({
      supplierId: validUUID,
      email: '',
    });
    expect(result.success).toBe(true);
  });
});

// ── productSupplierSchema ──

describe('productSupplierSchema', () => {
  it('accepts valid input with defaults', () => {
    const result = productSupplierSchema.safeParse({
      productId: validUUID,
      supplierId: validUUID2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPreferred).toBe(false);
    }
  });

  it('accepts preferred flag', () => {
    const result = productSupplierSchema.safeParse({
      productId: validUUID,
      supplierId: validUUID2,
      isPreferred: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid unit price', () => {
    const result = productSupplierSchema.safeParse({
      productId: validUUID,
      supplierId: validUUID2,
      unitPrice: 12.50,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative unit price', () => {
    const result = productSupplierSchema.safeParse({
      productId: validUUID,
      supplierId: validUUID2,
      unitPrice: -5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid productId', () => {
    const result = productSupplierSchema.safeParse({
      productId: 'not-uuid',
      supplierId: validUUID2,
    });
    expect(result.success).toBe(false);
  });

  it('accepts null unit price', () => {
    const result = productSupplierSchema.safeParse({
      productId: validUUID,
      supplierId: validUUID2,
      unitPrice: null,
    });
    expect(result.success).toBe(true);
  });
});

// ── createOrderSchema ──

describe('createOrderSchema', () => {
  it('accepts valid input', () => {
    const result = createOrderSchema.safeParse({
      supplierId: validUUID,
      checklistId: validUUID,
      items: [
        { productId: validUUID, quantity: 5, unit: 'koli' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty items', () => {
    const result = createOrderSchema.safeParse({
      supplierId: validUUID,
      checklistId: validUUID,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero quantity', () => {
    const result = createOrderSchema.safeParse({
      supplierId: validUUID,
      checklistId: validUUID,
      items: [
        { productId: validUUID, quantity: 0, unit: 'koli' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative quantity', () => {
    const result = createOrderSchema.safeParse({
      supplierId: validUUID,
      checklistId: validUUID,
      items: [
        { productId: validUUID, quantity: -1, unit: 'koli' },
      ],
    });
    expect(result.success).toBe(false);
  });
});

// ── updateOrderStatusSchema ──

describe('updateOrderStatusSchema', () => {
  it('accepts status ordered', () => {
    const result = updateOrderStatusSchema.safeParse({
      orderId: validUUID,
      status: 'ordered',
    });
    expect(result.success).toBe(true);
  });

  it('accepts status cancelled', () => {
    const result = updateOrderStatusSchema.safeParse({
      orderId: validUUID,
      status: 'cancelled',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateOrderStatusSchema.safeParse({
      orderId: validUUID,
      status: 'delivered',
    });
    expect(result.success).toBe(false);
  });

  it('accepts item deliveries', () => {
    const result = updateOrderStatusSchema.safeParse({
      orderId: validUUID,
      itemDeliveries: [
        { orderItemId: validUUID, isDelivered: true },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid orderId', () => {
    const result = updateOrderStatusSchema.safeParse({
      orderId: 'not-uuid',
      status: 'ordered',
    });
    expect(result.success).toBe(false);
  });

  it('accepts notes', () => {
    const result = updateOrderStatusSchema.safeParse({
      orderId: validUUID,
      notes: 'Delivery note',
    });
    expect(result.success).toBe(true);
  });

  it('rejects notes over 1000 characters', () => {
    const result = updateOrderStatusSchema.safeParse({
      orderId: validUUID,
      notes: 'a'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

// ── completeChecklistSchema ──

describe('completeChecklistSchema', () => {
  it('accepts valid checklistId', () => {
    const result = completeChecklistSchema.safeParse({
      checklistId: validUUID,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid checklistId', () => {
    const result = completeChecklistSchema.safeParse({
      checklistId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing checklistId', () => {
    const result = completeChecklistSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ── reopenChecklistSchema ──

describe('reopenChecklistSchema', () => {
  it('accepts valid checklistId', () => {
    const result = reopenChecklistSchema.safeParse({
      checklistId: validUUID,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid checklistId', () => {
    const result = reopenChecklistSchema.safeParse({
      checklistId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});
