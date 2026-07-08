# Chickenplus API Specification

## Server Action Pattern

Tum Server Action'lar ayni pattern'i izler:

```
1. Auth check:    supabase.auth.getUser() -> user yoksa error
2. Profile check: getActiveProfile(supabase, userId) -> inactive ise error
3. Role check:    Gerekirse admin kontrolu
4. Validation:    Zod schema.parse(input)
5. Business logic: Supabase query / RPC call
6. Audit log:     logAudit({ userId, action, entityType, entityId, details })
7. Revalidation:  revalidatePath() (sadece structural changes)
8. Response:      { success, data? } veya { error, fieldErrors? }
```

---

## Checklist Actions

**Dosya:** `src/app/(app)/checklist/actions.ts`

### createChecklist()
- **Input:** Yok (hafta otomatik hesaplanir)
- **Output:** `{ success: true, checklistId }` | `{ error }`
- **Yetki:** Tum roller (admin + staff)
- **RPC:** `rpc_create_checklist_with_snapshot(p_iso_year, p_iso_week, p_created_by)`
- **Hata durumlari:**
  - `active_checklist_exists`: Aktif checklist zaten var
  - `duplicate_week`: Bu hafta icin checklist zaten olusturulmus
- **Revalidation:** `/checklist`, `/dashboard`

### updateChecklistItem(input)
- **Input:** `{ checklistItemId: UUID, currentStock?: number|null, isChecked?: boolean, isMissingOverridden?: boolean, missingAmountFinal?: number|null }`
- **Output:** `{ success: true, data: ChecklistItem }` | `{ error, fieldErrors? }`
- **Yetki:** Tum roller
- **Kisitlar:**
  - Completed checklist guncellenemez
  - `missing_amount_calculated` server tarafinda hesaplanir (client input kabul edilmez)
  - Draft -> in_progress otomatik gecis
- **Revalidation:** Yok (auto-save, revalidate yapilmaz)

### completeChecklist(input)
- **Input:** `{ checklistId: UUID }`
- **Output:** `{ success: true, orderGenerationStatus: 'pending' }` | `{ error }`
- **Yetki:** Tum roller
- **Kisitlar:**
  - Tum item'lar checked olmali
  - `current_stock` tamamlamada zorunlu degildir
- **Arkaplan isleri:** Tamamlama sonrasi otomatik siparis olusturma `after()` ile arkaplanda baslatilir; completion response'u bunu beklemez
- **Revalidation:** `/checklist`, `/dashboard`

### reopenChecklist(input)
- **Input:** `{ checklistId: UUID }`
- **Output:** `{ success: true }` | `{ error }`
- **Yetki:** Sadece admin
- **Kisitlar:** Sadece completed checklist yeniden acilabilir
- **Revalidation:** `/checklist`, `/dashboard`

---

## Order Actions

**Dosya:** `src/app/(app)/orders/actions.ts`

### generateOrderSuggestions(checklistId)
- **Input:** `checklistId: string`
- **Output:** `{ success: true, data: SuggestionGroup[] }` | `{ error }`
- **Yetki:** Tum roller
- **Mantik:**
  1. `missing_amount_final > 0` olan checklist item'lari al
  2. Her urun icin preferred supplier bul
  3. Mevcut acik siparisleri kontrol et (draft, ordered, partially_delivered)
  4. Preferred supplier'a gore grupla (yoksa "Nicht zugewiesen")
  5. `suggestedOrderQuantity()` ile siparis miktarini hesapla
- **Donus formati:**
  ```typescript
  {
    supplierId: string,
    supplierName: string,
    items: [{
      productId, productName, quantity, unit, hasOpenOrder
    }]
  }[]
  ```

### createOrder(input)
- **Input:** `{ supplierId: UUID, checklistId: UUID, items: [{ productId: UUID, quantity: number, unit: string }] }`
- **Output:** `{ success: true, orderNumber }` | `{ error }`
- **Yetki:** Tum roller
- **RPC:** `rpc_create_order_with_items(p_supplier_id, p_checklist_id, p_created_by, p_items)`
- **Kisitlar:** Supplier aktif olmali, en az 1 item
- **Revalidation:** `/orders`, `/dashboard`

### updateOrderStatus(input)
- **Input:** `{ orderId: UUID, status?: 'ordered'|'cancelled', orderedItems?: [{ orderItemId: UUID, isOrdered: boolean, orderedQuantity: number|null }], itemDeliveries?: [{ orderItemId: UUID, isDelivered: boolean }], notes?: string }`
- **Output:** `{ success: true, status? }` | `{ error }`
- **Yetki:**
  - Cancel: sadece admin
  - Mark ordered: tum roller
  - Item deliveries: tum roller
- **Kisitlar:**
  - Cancel: delivered/cancelled siparisler iptal edilemez
  - Mark ordered: sadece draft siparisler
  - `orderedItems` verilirse draft order item metadata'si kaydedilip ayni istekte status `ordered` yapilir
- **RPC (ordered items):** `rpc_update_order_items_ordered(p_order_id, p_ordered_items, p_mark_ordered)`
- **RPC (deliveries):** `rpc_update_order_delivery(p_order_id, p_item_deliveries)`
- **Revalidation:** `/orders`

### updateOrderItems(input)
- **Input:** `{ orderId: UUID, orderedItems: [{ orderItemId: UUID, isOrdered: boolean, orderedQuantity: number|null }] }`
- **Output:** `{ success: true }` | `{ error }`
- **Yetki:** Tum roller
- **Kisitlar:**
  - Sadece draft siparisler
  - `orderedQuantity` sadece `isOrdered = true` iken ve `> 0` oldugunda gecerli
- **RPC:** `rpc_update_order_items_ordered(p_order_id, p_ordered_items, false)`
- **Revalidation:** `/orders`

---

## Supplier Actions

**Dosya:** `src/app/(app)/suppliers/actions.ts`

### createSupplier(input)
- **Input:** `{ name, contactName?, phone?, email?, address? }`
- **Output:** `{ success: true }` | `{ error }`
- **Yetki:** Sadece admin
- **Kisitlar:** Unique supplier name
- **Revalidation:** `/suppliers`

### updateSupplier(input)
- **Input:** `{ supplierId: UUID, name?, contactName?, phone?, email?, address?, isActive? }`
- **Output:** `{ success: true }` | `{ error }`
- **Yetki:** Sadece admin
- **Kisitlar:** Deactivation icin acik siparis kontrolu
- **Revalidation:** `/suppliers`

### setProductSupplier(input)
- **Input:** `{ productId: UUID, supplierId: UUID, isPreferred?: boolean, unitPrice?: number|null }`
- **Output:** `{ success: true }` | `{ error }`
- **Yetki:** Sadece admin
- **Mantik:** Yeni preferred secildiginde eski preferred otomatik dusurulur
- **Revalidation:** `/suppliers`

### getSupplierProducts(supplierId)
- **Input:** `supplierId: string`
- **Output:** `{ success: true, data: ProductSupplier[] }` | `{ error }`
- **Yetki:** Sadece admin

### getAvailableProducts(supplierId)
- **Input:** `supplierId: string`
- **Output:** `{ success: true, data: Product[] }` | `{ error }`
- **Yetki:** Sadece admin

### removeProductSupplier(productId, supplierId)
- **Input:** `productId: string, supplierId: string`
- **Output:** `{ success: true }` | `{ error }`
- **Yetki:** Sadece admin
- **Revalidation:** `/suppliers`

---

## API Routes

### GET /api/export/[checklistId]
- **Amac:** Checklist'i Excel dosyasi olarak indir
- **Auth:** Supabase session cookie
- **Basarili response:**
  - Status: 200
  - Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - Content-Disposition: `attachment; filename="Bestandskontrolle_KWXX_YYYY.xlsx"`
- **Hata response'lari:**
  - 401: Oturum acilmamis
  - 404: Checklist bulunamadi veya item'lar yok
  - 500: Export islemi basarisiz

---

## RPC Functions

**Dosya:** `supabase/migrations/20250101000002_rpc_functions.sql`

### rpc_bootstrap_admin(user_id)
- Ilk kullaniciyi admin yapar
- Zaten admin varsa basarisiz olur

### rpc_create_checklist_with_snapshot(p_iso_year, p_iso_week, p_created_by)
- Checklist olusturur ve tum aktif urunleri snapshot olarak ekler
- Atomik islem (transaction)
- Donus: `{ success, checklist_id, item_count }`

### rpc_create_order_with_items(p_supplier_id, p_checklist_id, p_created_by, p_items)
- Siparis olusturur, benzersiz siparis numarasi uretir (ORD-YYYY-WXX-SEQ)
- Conflict retry loop ile numara cakismasi cozer
- Donus: `{ success, order_id, order_number }`

### rpc_update_order_delivery(p_order_id, p_item_deliveries)
- Item teslimat durumlarini gunceller
- Tum item'lar teslim edildiyse otomatik delivered, kismen ise partially_delivered
- Donus: `{ success, order_id, status, delivered_items, total_items }`

---

## Hesaplama Fonksiyonlari

**Dosya:** `src/lib/utils/calculations.ts`

### calculateMissing(currentStock, minStock)
- `max(0, minStock - currentStock)`
- null girislerde 0 doner

### isBelowMinimum(currentStock, minStock)
- `currentStock < minStock`
- null girislerde false doner

### suggestedOrderQuantity(currentStock, minStock, minStockMax)
- `max(0, target - currentStock)` where `target = minStockMax ?? minStock`
- null girislerde 0 doner
