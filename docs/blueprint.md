# Chickenplus Bestandskontrolle - Blueprint

## 1. Proje Ozeti

Chickenplus Bestandskontrolle, bir restoran zinciri icin haftalik envanter kontrol ve siparis yonetim sistemidir. Personel haftalik kontrol listeleri olusturur, mevcut stoklari girer, eksik miktarlar otomatik hesaplanir ve tedarikcilere siparis onerileri uretilir.

**Hedef kullanicilar:** Restoran yoneticileri (admin) ve personel (staff)
**Dil:** Almanca (de-AT)
**Zaman dilimi:** Europe/Vienna, ISO hafta sistemi

## 2. Mimari

### Tech Stack
- **Frontend:** Next.js 16.2.1 App Router (React 19, Turbopack)
- **Backend:** Supabase PostgreSQL + Server Actions
- **UI:** shadcn/ui v4 (Base UI / @base-ui/react), Tailwind CSS v4
- **Auth:** Supabase Auth (email/password)
- **Validasyon:** Zod v4
- **Export:** ExcelJS
- **Test:** Vitest
- **Loglama:** Custom logger utility (INFO/ERROR/DEBUG)

### Katmanli Mimari
```
Browser (React Client Components)
    |
Next.js Server Actions ('use server')
    |-- Auth check (supabase.auth.getUser)
    |-- Profile check (getActiveProfile)
    |-- Zod validation
    |-- Business logic
    |-- Supabase query / RPC call
    |-- Audit log (admin client)
    |-- revalidatePath (structural changes only)
    |
Supabase PostgreSQL
    |-- RLS policies (second defense line)
    |-- RPC functions (atomic multi-step ops)
    |-- Triggers (updated_at, profile creation)
```

### Dizin Yapisi
```
src/
  app/
    (app)/              # Authenticated routes (layout with sidebar/bottom-nav)
      dashboard/        # Ana panel
      checklist/        # Kontrol listesi
      orders/           # Siparisler
      suppliers/        # Tedarikciler
      archive/          # Arsiv
      settings/         # Ayarlar
    api/export/         # Excel export route
    login/              # Login sayfasi
    setup/              # Admin bootstrap
  components/
    ui/                 # shadcn/ui components
    layout/             # Sidebar, bottom-nav
    checklist/          # Checklist-specific components
    orders/             # Order-specific components
    suppliers/          # Supplier-specific components
  lib/
    supabase/           # Client factories (server, client, admin)
    utils/              # Calculations, date, audit, logger, excel-export, transform
    validations/        # Zod schemas (checklist, order, supplier)
    constants/          # App constants, enums
  types/                # TypeScript type definitions
  i18n/                 # German translations (de.ts)
  hooks/                # Client-side hooks
supabase/
  migrations/           # SQL schema + RPC functions
  seed.sql              # Reference data (126 products)
tests/
  unit/                 # Pure function tests
  integration/          # Business flow tests
  e2e/                  # End-to-end (planned)
```

## 3. Veri Modeli

### Entity-Relationship
```
profiles (1) --< checklists (1) --< checklist_items (M) >-- products (1)
                 checklists (1) --< orders (M) >-- suppliers (1)
                                    orders (1) --< order_items (M) >-- products (1)
                 products (M) >--< suppliers (M)  [via product_suppliers]
                 products (M) >-- categories (1) >-- storage_locations (1)
                 audit_log (standalone, immutable)
```

### Tablolar

| Tablo | Amac | Onemli Kisitlar |
|-------|------|-----------------|
| `profiles` | Kullanici hesaplari | role: admin/staff, is_active |
| `storage_locations` | Depolama alanlari (7 adet) | Unique code |
| `categories` | Urun kategorileri (16 adet) | Unique per storage_location |
| `products` | Urunler (126 adet) | min_stock, min_stock_max, unit, is_active |
| `suppliers` | Tedarikciler | Unique name, is_active |
| `product_suppliers` | Urun-tedarikci eslestirmesi | Unique (product, supplier), tek preferred per product |
| `checklists` | Haftalik kontrol listeleri | Unique (iso_year, iso_week), tek aktif |
| `checklist_items` | Kontrol listesi kalemleri | Snapshot values, calculated + final missing |
| `orders` | Siparisler | Unique order_number, status lifecycle |
| `order_items` | Siparis kalemleri | quantity > 0, is_delivered |
| `audit_log` | Degisiklik kaydi | Immutable, admin-readable |

### Enum Tipleri
- **user_role:** admin, staff
- **checklist_status:** draft, in_progress, completed
- **order_status:** draft, ordered, partially_delivered, delivered, cancelled
- **unit_type:** koli, karton, kiste, pack, stueck, flasche, kg, kuebel

## 4. Feature Haritasi

### Checklist Lifecycle
```
[Olustur] -> draft -> [Ilk guncelleme] -> in_progress -> [Tamamla] -> completed
                                                              |
                                                    [Yeniden Ac (admin)] -> in_progress
```

### Order Lifecycle
```
[Olustur] -> draft -> [Siparis Ver] -> ordered -> [Teslimat] -> partially_delivered / delivered
                  \                                    |
                   -> [Iptal (admin)] -> cancelled <---/
```

### Temel Ozellikler
1. **Dashboard:** Aktif checklist ozeti, siparis sayaci
2. **Checklist:** Haftalik envanter kontrolu, auto-save, eksik miktar hesaplama
3. **Orders:** Otomatik siparis onerileri (preferred supplier gruplama), siparis olusturma
4. **Suppliers:** Tedarikci CRUD, urun-tedarikci eslestirme (admin)
5. **Archive:** Tamamlanmis kontrol listeleri arsivi
6. **Export:** Excel indirme (Bestandskontrolle_KWXX_YYYY.xlsx)
7. **Settings:** Profil goruntuleme, logout

## 5. MVP Kapsam Kilidi

### Dahil
- Haftalik checklist olusturma ve yonetim
- Stok girisi ve eksik miktar hesaplama (override destegi)
- Siparis onerileri ve siparis olusturma
- Tedarikci yonetimi ve urun eslestirme
- Excel export
- Admin/staff yetki ayrimi
- Audit log
- Loading, error, empty state'ler
- Almanca i18n

### Kapsam Disi
- PWA, offline sync, push notifications
- Real-time multi-user sync
- PIN login, barcode, invoice parsing
- Advanced analytics, smart suggestions
- Product/user admin UI
- Vercel cron jobs
