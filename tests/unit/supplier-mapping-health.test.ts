import { describe, expect, it } from 'vitest';
import {
  getSupplierMappingIssues,
  type SupplierMappingHealthProduct,
} from '@/components/suppliers/supplier-mapping-health';

function product(
  overrides: Partial<SupplierMappingHealthProduct>
): SupplierMappingHealthProduct {
  return {
    id: 'product-1',
    name: 'Cola',
    is_active: true,
    storage_locations: {
      code: 'D',
      name: 'Depo',
      sort_order: 1,
    },
    categories: {
      name: 'Getränke',
      sort_order: 1,
    },
    product_suppliers: [],
    ...overrides,
  };
}

describe('getSupplierMappingIssues', () => {
  it('flags active products without a preferred supplier', () => {
    const issues = getSupplierMappingIssues([product({ product_suppliers: [] })]);

    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('missing');
  });

  it('flags products whose preferred supplier is inactive', () => {
    const issues = getSupplierMappingIssues([
      product({
        product_suppliers: [
          {
            supplier_id: 'supplier-1',
            is_preferred: true,
            suppliers: { id: 'supplier-1', name: 'Old Supplier', is_active: false },
          },
        ],
      }),
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('inactive');
  });

  it('flags products with multiple preferred suppliers', () => {
    const issues = getSupplierMappingIssues([
      product({
        product_suppliers: [
          {
            supplier_id: 'supplier-1',
            is_preferred: true,
            suppliers: { id: 'supplier-1', name: 'Metro', is_active: true },
          },
          {
            supplier_id: 'supplier-2',
            is_preferred: true,
            suppliers: { id: 'supplier-2', name: 'Diyar', is_active: true },
          },
        ],
      }),
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('duplicate');
  });

  it('ignores inactive products and healthy active products', () => {
    const issues = getSupplierMappingIssues([
      product({ id: 'inactive', is_active: false }),
      product({
        id: 'healthy',
        product_suppliers: [
          {
            supplier_id: 'supplier-1',
            is_preferred: true,
            suppliers: { id: 'supplier-1', name: 'Metro', is_active: true },
          },
        ],
      }),
    ]);

    expect(issues).toHaveLength(0);
  });
});
