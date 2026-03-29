# Chickenplus API Specification

## Server Action Pattern

Tum Server Action'lar ayni genel pattern'i izler:

```text
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

### createChecklist(input)
- **Input:** `{ checklistDate: 'YYYY-MM-DD' }`
- **Output:** `{ success: true, checklistId }` | `{ error }`
- **Yetki:** Tum roller (admin + staff)
- **RPC:** `rpc_create_checklist_with_snapshot(p_iso_year, p_iso_week, p_created_by, p_checklist_date)`
- **Kisitlar:**
  - Yalnizca mevcut ay icindeki tarih secilebilir
  - Ayni anda tek aktif checklist olabilir
  - Ayni ISO hafta icin ikinci checklist olusturulamaz
- **Revalidation:** `/checklist`, `/dashboard`

### updateChecklistItem(input)
- **Durum:** Legacy single-item action; mevcut UI'nin birincil yolu degildir
- **Input:** `{ checklistItemId: UUID, currentStock?: string|null, isMissing?: boolean, isChecked?: boolean }`
- **Output:** `{ success: true, data }` | `{ error, fieldErrors? }`
- **Yetki:** Tum roller
- **Kisitlar:**
  - Completed checklist guncellenemez
  - Draft -> in_progress otomatik gecis
  - `currentStock` serbest metin olarak kabul edilir
- **Revalidation:** Yok

### updateChecklistItemsBatch(input)
- **Durum:** Mevcut checklist UI'nin birincil save yolu
- **Input:**
  ```typescript
  {
    checklistId: UUID,
    items: Array<{
      checklistItemId: UUID,
      currentStock: string | null,
      isMissing: boolean,
      isChecked: boolean
    }>
  }
  ```
- **Output:** `{ success: true, updatedItemIds, checklistStatus }` | `{ error, failedItemIds?, errorCode? }`
- **Yetki:** Tum roller
- **RPC:** `rpc_update_checklist_items_batch(p_checklist_id, p_items)`
- **Kisitlar:**
  - Batch all-or-nothing davranir
  - Completed checklist batch update reddedilir
  - Item-checklist mismatch reddedilir
- **Revalidation:** Yok

### completeChecklist(input)
- **Input:** `{ checklistId: UUID }`
- **Output:** `{ success: true, orderGenerationStatus: 'pending' }` | `{ error }`
- **Yetki:** Tum roller
- **Kisitlar:**
  - Tum item'lar checked olmali
  - `current_stock` tamamlamada zorunlu degildir
- **Arkaplan isleri:** Tamamlama sonrasi otomatik draft order olusturma `after()` ile arkaplanda baslatilir; response bunu beklemez
- **Revalidation:** `/checklist`, `/dashboard`, `/orders`

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
  1. `is_missing = true` ve `is_ordered = false` olan checklist item'lari alir
  2. Ayni checklist icin acik order'larda bulunan urunleri listeden cikarir
  3. Preferred supplier bulur
  4. Aktif supplier'a gore gruplar; supplier yoksa/inactive ise `Nicht zugeordnet`
  5. Quantity/placeholder icin snapshot hedef seviyesini pozitif tam sayiya yuvarlar
- **Donus formati:**
  ```typescript
  {
    supplierId: string,
    supplierName: string,
    items: Array<{
      checklistItemId: string,
      productId: string,
      productName: string,
      quantity: number,
      unit: string,
      isOrdered: boolean,
      orderedQuantity: number | null
    }>
  }[]
  ```

### finalizeSuggestionGroup(input)
- **Input:**
  ```typescript
  {
    checklistId: UUID,
    supplierId: UUID | null,
    supplierName: string,
    items: Array<{
      checklistItemId: UUID,
      isOrdered: boolean,
      orderedQuantity: number | null
    }>
  }
  ```
- **Output:** `{ success: true }` | `{ error }`
- **Yetki:** Tum roller
- **RPC:** `rpc_finalize_suggestion_group(...)`
- **Davranis:**
  - `supplierId` doluysa checklist-side ordered capture + gercek `ordered` order creation atomik olarak birlikte yapilir
  - `supplierId = null` (`Nicht zugeordnet`) ise supplier order olusturulmadan checklist-side ordered capture kaydi tutulur
- **Revalidation:** `/orders`, `/dashboard`, `/reports`

### createOrder(input)
- **Input:**
  ```typescript
  {
    supplierId: UUID,
    checklistId: UUID,
    initialStatus?: 'draft' | 'ordered',
    items: Array<{
      productId: UUID,
      quantity: number,
      unit: string,
      isOrdered?: boolean,
      orderedQuantity?: number | null
    }>
  }
  ```
- **Output:** `{ success: true, orderNumber }` | `{ error }`
- **Yetki:** Tum roller
- **RPC:** `rpc_create_order_with_items(p_supplier_id, p_checklist_id, p_created_by, p_initial_status, p_items)`
- **Kisitlar:** Supplier aktif olmali, en az 1 item olmali
- **Revalidation:** `/orders`, `/dashboard`

### updateOrderItems(input)
- **Input:** `{ orderId: UUID, orderedItems: [{ orderItemId: UUID, isOrdered: boolean, orderedQuantity: number|null }] }`
- **Output:** `{ success: true }` | `{ error }`
- **Yetki:** Tum roller
- **Kisitlar:**
  - Sadece draft siparisler
  - `orderedQuantity` sadece `isOrdered = true` iken verilebilir
  - UI tarafinda tam sayi > 0 beklenir
- **RPC:** `rpc_update_order_items_ordered(p_order_id, p_ordered_items, false)`
- **Revalidation:** `/orders`

### updateOrderStatus(input)
- **Input:** `{ orderId: UUID, status?: 'ordered'|'cancelled', orderedItems?: [...], itemDeliveries?: [...], notes?: string }`
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
- **Kisitlar:** Deactivation icin acik siparis kontrolu uygulama katmaninda yapilir
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
  - 403: Kullanici deaktive
  - 404: Checklist bulunamadi veya item'lar yok
  - 500: Export islemi basarisiz

---

## RPC Functions

**Canli migration seti icindeki public SQL function'lar**

### App-facing
- `rpc_bootstrap_admin(user_id)`
  - Ilk kullaniciyi admin yapar
  - Zaten admin varsa basarisiz olur

- `rpc_create_checklist_with_snapshot(p_iso_year, p_iso_week, p_created_by, p_checklist_date)`
  - Checklist olusturur ve tum aktif urunleri snapshot olarak ekler
  - Atomik islem
  - Donus: `{ success, checklist_id, item_count }`

- `rpc_create_order_with_items(p_supplier_id, p_checklist_id, p_created_by, p_initial_status, p_items)`
  - Siparis olusturur, benzersiz siparis numarasi uretir (`ORD-YYYY-WXX-SEQ`)
  - Conflict retry loop ile numara cakismasi cozer
  - Donus: `{ success, order_id, order_number }`

- `rpc_update_order_delivery(p_order_id, p_item_deliveries)`
  - Item teslimat durumlarini gunceller
  - Tum item'lar teslim edildiyse otomatik delivered, kismen ise partially_delivered
  - Donus: `{ success, order_id, status, delivered_items, total_items }`

- `rpc_update_order_items_ordered(p_order_id, p_ordered_items, p_mark_ordered)`
  - Draft order item'larinin `is_ordered` / `ordered_quantity` metadata'sini yazar
  - `p_mark_ordered = true` ise ayni istekte order status'u `ordered` yapar

- `rpc_update_checklist_items_batch(p_checklist_id, p_items)`
  - Checklist item batch update yapar
  - Checklist tamamlandiysa veya item mismatch varsa tum batch'i reddeder

- `rpc_finalize_suggestion_group(...)`
  - Suggestion group finalize akisinda checklist-side ordered capture ile supplier order creation'i tek write boundary icinde yapar

### Maintenance
- `rpc_cleanup_old_data(p_months default 4)`
  - Eski checklist/order verisini temizlemek icin maintenance yardimci fonksiyonudur
  - Ana UI akislarinin parcası degildir

---

## Helper Notes

### Order suggestion quantity helper
- **Dosya:** `src/lib/utils/order-items.ts`
- `normalizeSuggestedOrderCount(value)`
  - Pozitif olmayan veya gecersiz degerlerde `1`
  - Gecerli degerlerde `ceil(value)` ve minimum `1`

### Excel export sanitization
- **Dosya:** `src/lib/utils/excel-export.ts`
- `sanitizeExcelValue(value)`
  - `=`, `+`, `-`, `@` ile baslayan hucreleri `'` prefix ile yazar
