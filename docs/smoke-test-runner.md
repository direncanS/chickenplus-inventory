# Smoke Test Runner Guide — FAZ A

Bu rehber `docs/smoke-test.md` testlerini pratikte nasil calistiracaginizi adim adim anlatir. Sonuclar bu rehbere degil, **smoke-test.md**'deki `Durum`/`Not` kolonlarina yazilir.

## Icindekiler

- [1. Test Ortami On Kontrol](#1-test-ortami-on-kontrol)
- [2. Arac ve Pencere Duzeni](#2-arac-ve-pencere-duzeni)
- [3. Fixture Verisi Kurulumu (A-P03b)](#3-fixture-verisi-kurulumu-a-p03b)
- [4. Session A1: Altyapi + Auth + Staff (28 test)](#4-session-a1-altyapi--auth--staff-28-test)
- [5. Session A2: Checklist Yasam Dongusu (26 test)](#5-session-a2-checklist-yasam-dongusu-26-test)
- [6. Session A3: Orders + Suppliers + Mapping (31 test)](#6-session-a3-orders--suppliers--mapping-31-test)
- [7. Session A4: Export + Responsive + States (22 test)](#7-session-a4-export--responsive--states-22-test)
- [8. Session A5: RLS + Integrity + Audit (22 test)](#8-session-a5-rls--integrity--audit-22-test)
- [9. Sonuc Kaydi ve Commit Kurali](#9-sonuc-kaydi-ve-commit-kurali)
- [Ek A: SQL Sorgu Katalogu](#ek-a-sql-sorgu-katalogu)
- [Ek B: FAZ B/C Operasyonel Notlar](#ek-b-faz-bc-operasyonel-notlar)

Not: Son sertlestirmelerle deaktive kullanici davranisi degisti:
- A5-19b: Deaktive kullanici app sayfalarina giderse `/deactivated` sayfasina yonlenir; veri render edilmez.
- A5-20: Deaktive kullanici yeniden login olabilir ama uygulamaya girince `/deactivated` sayfasina yonlenir.

---

## 1. Test Ortami On Kontrol

Asagidaki her maddeyi isaretle. Herhangi biri eksikse teste baslama.

- [ ] `.env.local` 3 degisken set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `npm run build` — 0 hata
- [ ] `npm run lint` — 0 hata
- [ ] `npm run type-check` — 0 hata
- [ ] `npm run test` — tum testler gecer
- [ ] Supabase Auth'ta 2 test kullanici (email + sifre) olusturuldu
- [ ] Supabase Dashboard > Auth > Providers > Email: "Confirm email" **OFF** (veya SMTP gercekten calisiyor)
- [ ] Seed yuklendi (`supabase db reset` veya `seed.sql` manuel calistirma)
- [ ] Seed dogrulamasi:
  ```sql
  SELECT COUNT(*) FROM storage_locations; -- 7
  SELECT COUNT(*) FROM categories;        -- 16
  SELECT COUNT(*) FROM products WHERE is_active = true; -- 126
  ```
- [ ] Fixture verisi yuklendi (Bolum 3'e bak)
- [ ] Git commit hash not edildi: `_____________________`

---

## 2. Arac ve Pencere Duzeni

| Arac | Amac | Ne Zaman |
|------|------|----------|
| Browser Profil 1 (admin) | Birincil test | Tum session'lar |
| Browser Profil 2 / Incognito (staff) | Staff kisitlama testleri | A1, A2, A3, A5 |
| Supabase Dashboard (Table Editor + SQL Editor + Auth > Policies) | Veri/RLS/constraint kontrol | Tum session'lar |
| DevTools (Network, Console, Sources, Device Mode) | Responsive, leak check, debug | A4, A5 |
| Editor: `docs/smoke-test.md` | Sonuc kaydi | Tum session'lar |

**Pratik ipucu**: Admin ve staff icin iki ayri Chrome profili kullanin. Surekli login/logout'tan kurtarir ve paralel test yapmayi kolaylastirir.

---

## 3. Fixture Verisi Kurulumu (A-P03b)

Seed'de supplier ve mapping **yoktur**. Asagidaki SQL'leri Supabase SQL Editor'da sirayla calistirin.

### 3.1 Supplier Olusturma

```sql
INSERT INTO suppliers (name) VALUES
  ('Metro Test'),
  ('Transgourmet Test'),
  ('Backer Test')
ON CONFLICT (name) DO NOTHING;
```

> **NOT**: `Lieferdienst Test` burada **yoktur**. A3-19 testinde UI'dan olusturulacak.

### 3.2 Product-Supplier Mapping Olusturma

```sql
INSERT INTO product_suppliers (product_id, supplier_id, is_preferred) VALUES
  ((SELECT id FROM products WHERE name = 'Cola'),      (SELECT id FROM suppliers WHERE name = 'Metro Test'),        true),
  ((SELECT id FROM products WHERE name = 'Pommesbox'), (SELECT id FROM suppliers WHERE name = 'Metro Test'),        true),
  ((SELECT id FROM products WHERE name = 'Cola'),      (SELECT id FROM suppliers WHERE name = 'Transgourmet Test'), false),
  ((SELECT id FROM products WHERE name = 'Pommes'),    (SELECT id FROM suppliers WHERE name = 'Backer Test'),       false),
  ((SELECT id FROM products WHERE name = 'Mayo 10kg'), (SELECT id FROM suppliers WHERE name = 'Backer Test'),       false)
ON CONFLICT (product_id, supplier_id) DO NOTHING;
```

**Ozet**: Metro Test 2 preferred, Transgourmet Test 1 secondary, Backer Test 2 secondary = **5 mapping, 2 preferred**

### 3.3 Dogrulama

```sql
-- Toplam mapping sayisi: 5
SELECT COUNT(*) AS total_mappings FROM product_suppliers;

-- Preferred mapping sayisi: 2
SELECT COUNT(*) AS preferred_count FROM product_suppliers WHERE is_preferred = true;

-- Rotezwiebel mapping'siz olmali (0 sonuc)
SELECT ps.*
FROM product_suppliers ps
JOIN products p ON ps.product_id = p.id
WHERE p.name = 'Rotezwiebel';

-- Tum mapping detaylari
SELECT p.name AS product, s.name AS supplier, ps.is_preferred
FROM product_suppliers ps
JOIN products p ON ps.product_id = p.id
JOIN suppliers s ON ps.supplier_id = s.id
ORDER BY s.name, p.name;
```

**Beklenen sonuc**: 5 mapping, 2 preferred (Cola→Metro, Pommesbox→Metro), Rotezwiebel icin 0 kayit.

---

## 4. Session A1: Altyapi + Auth + Staff (28 test)

### Baslamadan once
- Admin ve staff browser profilleri acik
- Supabase Dashboard acik (Table Editor + SQL Editor)
- `docs/smoke-test.md` editorunuzde acik

### A1-01 ~ A1-06b: Altyapi ve Seed Dogrulama (8 test)

**Yontem**: `[SQL]` + `[UI]`

1. **A1-01** `[UI]`: Supabase Table Editor'da 11 tabloyu say: `profiles`, `storage_locations`, `categories`, `products`, `suppliers`, `product_suppliers`, `checklists`, `checklist_items`, `orders`, `order_items`, `audit_log`
2. **A1-01b** `[UI]`: Supabase Dashboard > Auth > Policies. 11 tablonun hepsinde RLS acik. `profiles`, `checklists`, `orders`, `suppliers` tablolarinda en az SELECT + UPDATE policy var
3. **A1-02** `[SQL]`: Supabase SQL Editor'da calistir:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
   ORDER BY routine_name;
   ```
   `rpc_bootstrap_admin`, `rpc_create_checklist_with_snapshot`, `rpc_create_order_with_items`, `rpc_update_order_delivery` mevcut olmali
4. **A1-02b** `[SQL]` + `[UI]`: `handle_new_user`, `get_user_role`, `update_updated_at_column` var mi kontrol et
5. **A1-03** `[SQL]`: `SELECT COUNT(*) FROM storage_locations;` → 7
6. **A1-04** `[SQL]`: `SELECT COUNT(*) FROM categories;` → 16
7. **A1-05** `[SQL]`: `SELECT COUNT(*) FROM products WHERE is_active = true;` → 126
8. **A1-06** `[SQL]`: Spot-check:
   ```sql
   SELECT name, unit, min_stock, min_stock_max FROM products
   WHERE name IN ('Cola', 'Pommesbox', 'Rotezwiebel');
   ```
9. **A1-06b** `[SQL]`:
   ```sql
   -- Pommesbox min/max kontrolu
   SELECT name, min_stock, min_stock_max FROM products WHERE name = 'Pommesbox';
   -- Beklenen: min_stock=3, min_stock_max=4

   -- Cola FK zinciri
   SELECT p.name, c.name AS category, sl.code AS storage
   FROM products p
   JOIN categories c ON p.category_id = c.id
   JOIN storage_locations sl ON p.storage_location_id = sl.id
   WHERE p.name = 'Cola';
   -- Beklenen: category='Getranke', storage='D'
   ```

### A1-07 ~ A1-19: Auth ve Middleware (13 test)

**Yontem**: `[UI]`

1. **A1-07**: Cikis yap (veya incognito), browser'da `/` ac → `/login`'e yonlenmeli
2. **A1-08**: Admin adayi email/sifre ile login → `/dashboard` veya `/setup`
3. **A1-09** `[SQL]`: Login sonrasi profiles tablosunu kontrol:
   ```sql
   SELECT id, display_name, role, is_active FROM profiles;
   ```
   Yeni kullanici `staff` rolunde, `is_active = true`
4. **A1-10**: Ilk kullanici (henuz admin yok) → `/setup` acilir, "Als Admin einrichten" butonu gorunur
5. **A1-11**: Setup butonuna tikla → profil `admin` olur. SQL ile dogrula:
   ```sql
   SELECT role FROM profiles WHERE id = '<admin_user_id>';
   -- Beklenen: 'admin'
   SELECT action FROM audit_log ORDER BY created_at DESC LIMIT 1;
   -- Beklenen: 'admin_bootstrapped'
   ```
6. **A1-12**: Ikinci kullaniciyi login yaptir, `/setup`'a gonder → setup formu gorunmez, `/dashboard`'a yonlenir
7. **A1-13**: Admin email/sifre ile login → `/dashboard`
8. **A1-14**: Settings > "Abmelden" → session kapanir, `/login`
9. **A1-15**: Session yok, `/dashboard` → `/login`'e redirect
10. **A1-16**: Session yok, `/checklist` → `/login`'e redirect
11. **A1-17**: Session yok, `/suppliers` → `/login`'e redirect
12. **A1-18**: Auth edilmis admin, `/login`'e git → `/dashboard`'a redirect
13. **A1-19**: Auth edilmis kullanici, admin var, `/setup`'a git → `/dashboard`'a redirect

### A1-20 ~ A1-25: Staff Kisitlamalari (6 test)

**Yontem**: `[UI]`

> Staff browser profiline gecin.

1. **A1-20**: Staff adayi login → staff profil olusur, `/dashboard` acilir
2. **A1-21**: Staff navigasyonu: Dashboard, Kontrolle, Bestellungen, Archiv, Einstellungen gorunur
3. **A1-22**: Staff > Suppliers sayfasi → "Neuer Lieferant" butonu **yok**; edit/deactivate aksiyonlari **yok**
4. **A1-23**: Staff > Suppliers → Zugewiesene Produkte bolumu render **edilmez**
5. **A1-24**: Staff, completed checklist → "Erneut offnen" butonu **yok**
6. **A1-25**: Staff > Orders → "Stornieren" butonu hicbir order'da **yok**

> **NOT**: A1-24 ve A1-25'teki "direct Server Action cagrisi" kismi A5 session'inda runtime olarak test edilecektir.

---

## 5. Session A2: Checklist Yasam Dongusu (26 test)

### Baslamadan once
- Admin profili acik
- Staff profili A2-17b ve A2-22 icin hazir
- Supabase SQL Editor acik (veri dogrulama icin)

### A2-01 ~ A2-04: Olusturma ve Kisitlamalar (4 test)

**Yontem**: `[UI]` + `[SQL]`

1. **A2-01** `[UI]`: Admin veya staff → Kontrolle > yeni checklist olustur. Dogru ISO hafta numarasi gorunmeli
2. **A2-02** `[SQL]`:
   ```sql
   SELECT COUNT(*) FROM checklist_items
   WHERE checklist_id = (SELECT id FROM checklists ORDER BY created_at DESC LIMIT 1);
   -- Beklenen: 126
   ```
3. **A2-03** `[UI]`: Aktif checklist varken ikinci olusturma denemesi → "Es gibt bereits eine aktive Kontrollliste" benzeri hata
4. **A2-04** `[UI]`: Haftayi tamamlayip ayni hafta icinde tekrar create → duplicate week hatasi (UNIQUE iso_year + iso_week)

### A2-05 ~ A2-14: Stok Girisi ve Hesaplama (10 test)

**Yontem**: `[UI]`

1. **A2-05**: Yeni checklist → `draft` badge/durumu gorunur
2. **A2-06**: `Cola` icin stock `8` gir → checklist status `in_progress` olur; dashboard badge guncellenir
3. **A2-07**: `Rotezwiebel` icin stock `24.5` gir, 2 sn bekle, sayfayi yenile → `24.5` korunur
4. **A2-08**: `Cola`: min_stock=10, current_stock=8 → `Fehlt = 2`
5. **A2-09**: `Pommesbox`: min=3, max=4, stock=1 → checklist'te `Fehlt = 2` (max(0, 3-1)). **NOT**: max_stock siparis onerisinde kullanilir, checklist'te degil
6. **A2-10**: Herhangi bir item, `-1` gir → validation engeli; deger kaydedilmez
7. **A2-11**: Checkbox tikla, sayfayi yenile → checked durumu korunur
8. **A2-12**: Stock degistir, 800ms+ bekle → autosave calisir, ayrica save butonu gerekmez
9. **A2-13**: `Pommesbox`, Fehlt=2 iken manual `3` gir → `is_missing_overridden = true`. Sayfayi yenileyince `3` kalir
10. **A2-14**: Override'i kaldir → hesaplanan missing (2) geri doner

### A2-15 ~ A2-17b: Tamamlama (4 test)

**Yontem**: `[UI]`

> **ONEMLI**: A2-17b icin tum 126 item'in checked olmasi gerekir; stock alanlari bos kalabilir. Elle isaretlemek uzun surer; **once A2-01~A2-16 testlerini manuel tamamlayin**, sonra kalan item'lari Ek A'daki bulk-fill SQL ile checked yapin.

1. **A2-15**: Birkac item unchecked birak, "Abschliessen" tikla → reddedilir
2. **A2-16**: Birkac item stock bos birak ama hepsini checked yap → "Abschliessen" → status `completed`
3. **A2-17**: Tum 126 item checked → "Abschliessen" → status `completed`
4. **A2-17b**: Staff session ile aktif checklist'i tamamla; response hizli donmeli, siparis hazirligi arkaplanda devam etmeli

   **Arka plan**: `completeChecklist` user client (RLS'e tabi) ile `SET status='completed'` yapar; completion sonrasi siparis olusturma ayni request'te beklenmez, `after()` ile arkaplanda calisir.

   **Test adimi**:
   - Admin ile checklist'i reopen et (veya yeni checklist olustur)
   - Tum item'lari checked yap (bulk-fill SQL kullanilabilir — Ek A); stock alanlari bos kalabilir
   - Staff profiline gec
   - "Abschliessen" tikla

   **Sonuc**:
   - **PASS**: Staff basariyla tamamlayabiliyor; checklist hizli sekilde `completed` oluyor ve siparis hazirligi arkaplanda devam ediyor
   - **FAIL**: Staff tamamlayamiyor veya completion hissedilir sekilde gecikiyor → tamamlama, RLS veya background order generation akisi yeniden incelenmeli

   > **UYARI**: Bulk-fill SQL yalnizca A2-01~A2-16 testleri manuel olarak tamamlandiktan sonra calistirilmali. Erken kullanim onceki testlerin verisini kirletir.

### A2-18 ~ A2-25: Tamamlanmis Checklist ve Arsiv (8 test)

**Yontem**: `[UI]`

1. **A2-18**: Completed checklist → read-only gorunum, tamamlandi metni
2. **A2-19**: Completed checklist'te input degistirme denemesi → inputlar disabled
3. **A2-20**: Page reload → read-only devam eder
4. **A2-21**: Admin > "Erneut offnen" → status `in_progress`, itemlar editable
5. **A2-22**: Staff profiline gec > completed checklist → "Erneut offnen" butonu **yok**
6. **A2-23**: Admin reopen sonrasi item degistir → degisiklik kaydolur
7. **A2-24**: Archive sayfasi → completed checklist gorunur, hafta/yil, tamamlanma tarihi, detay/export aksiyonlari
8. **A2-25**: Archive detay → item verileri, stok, missing degerleri checklist ile tutarli

---

## 6. Session A3: Orders + Suppliers + Mapping (31 test)

### Baslamadan once
- A-P03b fixture tamamlanmis (Bolum 3)
- A2'de olusturulan checklist'te en az su stok degerleri girilmis olmali (siparis onerileri icin):
  - `Cola` stock = `8` (min=10 → missing=2)
  - `Pommesbox` stock = `1` (min=3 → missing=2)
  - `Rotezwiebel` stock = `20` (min=25 → missing=5)
- Completed checklist mevcut (A2'den)
- Admin ve staff profilleri acik

### A3-01 ~ A3-07: Siparis Onerileri (7 test)

**Yontem**: `[UI]`

1. **A3-01**: Completed checklist sonrasi siparis onerilerini goruntule → yalnizca `missing_amount_final > 0` olan itemlar listelenir
2. **A3-02**: `Cola` icin `Metro Test` preferred → oneri Metro Test altinda toplanir
3. **A3-03**: Metro Test'i gecici deaktive et:
   - Admin > Suppliers > Metro Test > deaktive et
   - Onerilere don → Cola ve Pommesbox `Nicht zugewiesen` grubunda
   - Metro Test'i tekrar aktive et (geri don)
4. **A3-04**: `Rotezwiebel` (mapping'siz) → `Nicht zugewiesen` grubunda
5. **A3-05**: `Pommesbox`: stock=1, min=3, max=4 → siparis onerisi `3` (max(0, 4-1))
6. **A3-06**: `Cola`: stock=8, min=10, max=null → siparis onerisi `2` (max(0, 10-8))
7. **A3-07**: Ayni urun icin zaten acik order varsa → uyari/badge gorunur

### A3-08 ~ A3-18: Siparis Yasam Dongusu (11 test)

**Yontem**: `[UI]`

1. **A3-08**: Mapped supplier grubundan siparis olustur → draft order yaratilir
2. **A3-08b**: Farkli supplier grubundan ikinci siparis olustur → ikinci draft order; birinci etkilenmez
3. **A3-09**: Order number → `ORD-YYYY-WXX-SEQ` formati (ornek: `ORD-2026-W14-1`)
4. **A3-10**: Orders sayfasi → open orders altinda listelenir
5. **A3-11**: Draft order > opsiyonel `Bestellt` checkbox + `Bestellte Menge` gir > "Als bestellt markieren" → status `ordered`, girilen actual miktarlar read-only kalir
6. **A3-12**: En az 2 itemli order, 1 item delivered isaretle → status `partially_delivered`
7. **A3-13**: Tum itemlari delivered isaretle → status `delivered`
8. **A3-14**: Fully delivered order → delivery tarihi gorunur
9. **A3-15**: Admin, draft order > "Stornieren" → status `cancelled`
10. **A3-16**: Admin, ordered veya partially_delivered order → cancel basarili
11. **A3-17**: Admin, delivered order → cancel reddedilir veya buton gorunmez

### A3-18: Staff Cancel Engeli

**Yontem**: `[UI]`

- Staff profiline gec > Orders → "Stornieren" butonu hicbir order'da gorunmez

### A3-19 ~ A3-29: Supplier CRUD ve Mapping (11 test)

**Yontem**: `[UI]`

1. **A3-19**: Admin > Suppliers > "Neuer Lieferant" > isim: `Lieferdienst Test` → supplier olusur
2. **A3-20**: `Lieferdienst Test` ismiyle tekrar create → unique constraint hatasi
3. **A3-21**: Contact, phone, email, address guncelle, sayfayi yenile → degerler korunur
4. **A3-22**: Acik siparisi olmayan supplier'i deactivate → `inactive` olur, badge gorunur
5. **A3-23**: Acik siparisi olan supplier'i deactivate → hata doner; supplier aktif kalir
6. **A3-24**: Inactive supplier → siparis onerisinde gorulmez, urunler Nicht zugewiesen'e duser
7. **A3-25**: Admin > `Lieferdienst Test` > Produkt hinzufugen > `Rotezwiebel` → mapping olusur
8. **A3-26**: `Cola` icin ikinci supplier'i preferred yap → eski preferred temizlenir; tek preferred kalir
9. **A3-27**: Var olan mapping > kaldir → mapping silinir
10. **A3-28**: Inactive supplier → mapping bolumu render edilmez
11. **A3-29**: Staff profiline gec → supplier CRUD ve mapping yazma aksiyonlari yok; UI gorunmez

### A3-30: Staff Supplier Read Erisimi

**Yontem**: `[UI]` + `[KOD INCELEME]`

- Staff session ile `getSupplierProducts` / `getAvailableProducts` cagrisi yetki hatasi ile reddedilir.
- UI mapping bolumu staff'a gizli kalir; server action katmani da ikinci savunma hattidir.

---

## 7. Session A4: Export + Responsive + States (22 test)

### Baslamadan once
- Completed ve archived checklist mevcut (A2'den)
- Chrome DevTools hazir (Device Mode, Network tab)
- Admin ve staff profilleri acik

### A4-01 ~ A4-06: Export (6 test)

1. **A4-01** `[UI]`: Completed checklist → export → dosya adi `Bestandskontrolle_KW03_YYYY.xlsx` (hafta numarasi degisir)
2. **A4-02** `[UI]`: Excel dosyasi ac → baslik + `Produkt / Einheit / Mindestbestand / Bestand / Fehlt / Kategorie` kolonlari
3. **A4-03** `[UI]`: Excel'de satirlar storage location → category → product sirasinda
4. **A4-04** `[UI]`: `Pommesbox` (min=3, max=4) → Mindestbestand alaninda `3-4` benzeri aralik
5. **A4-05** `[SQL]` + `[UI]`: Formula injection testi:
   ```sql
   -- 1. Onceki product_name'i not al
   SELECT id, product_name FROM checklist_items
   WHERE product_name = 'Cola'
   AND checklist_id = (SELECT id FROM checklists WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1)
   LIMIT 1;

   -- 2. Injection uygula
   UPDATE checklist_items SET product_name = '=SUM(1,1)'
   WHERE product_name = 'Cola'
   AND checklist_id = (SELECT id FROM checklists WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1);
   ```
   Export al → Excel'de formula calismaz, metin olarak (bas karakter `'` ile) gelir.
   ```sql
   -- 3. Restore
   UPDATE checklist_items SET product_name = 'Cola'
   WHERE product_name = '=SUM(1,1)'
   AND checklist_id = (SELECT id FROM checklists WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1);
   ```
6. **A4-06** `[UI]` + `[KOD INCELEME]`: Unauth export korumasi:
   - Logout yap, export URL'ini browser'da ac → HTTP 401
   - Veya: `curl -v https://<domain>/api/export/<checklistId>`
   - **NOT**: Koruma middleware'den degil, `src/app/api/export/[checklistId]/route.ts:17-19` icerisinden

### A4-07 ~ A4-12: Responsive (6 test)

**Yontem**: `[UI]` (Chrome DevTools Device Mode)

1. **A4-07**: iPhone SE 375px → tum sayfalarda yatay tasma yok
2. **A4-08**: iPhone 13 390px → 6 nav item gorunur ve tiklanabilir
3. **A4-09**: Android buyuk 414px → bottom nav icerigi kapatmaz
4. **A4-10**: 375/390px checklist → stock, missing, checkbox alanlari rahat kullanilir
5. **A4-11**: 375/390px orders → kartlar ve butonlar ekrana sigar
6. **A4-12**: 375/390px suppliers → kartlar ve mapping satirlari tasmaz

### A4-13 ~ A4-20: Loading, Error ve Empty States (8 test)

**Yontem**: `[UI]`

1. **A4-13**: DevTools > Network > Slow 3G → dashboard loading skeleton gorunur
2. **A4-14**: Slow 3G → checklist loading skeleton gorunur
3. **A4-15**: Slow 3G → orders loading skeleton gorunur
4. **A4-16**: Kontrollu hata (Supabase gecici durdur) → hata ekrani + "Erneut versuchen" butonu
5. **A4-17**: Aktif checklist yok → olusturma CTA'si gorunur
6. **A4-18**: Hic order yok → bos durum metni
7. **A4-19**: Hic supplier yok, admin user → CTA ile bos durum
8. **A4-20**: Completed checklist yok → bos durum metni

### A4-21 ~ A4-22: Settings ve Accessibility (2 test)

**Yontem**: `[UI]`

1. **A4-21**: Admin → "Administrator"; Staff → "Mitarbeiter". Email gorunur; logout calisir
2. **A4-22**: Dialog ac/kapat (Escape, Tab) → keyboard focus trap calisir; sr-only close label ("Schliessen"); durum gosterimi renk + metin birlikte

---

## 8. Session A5: RLS + Integrity + Audit (22 test)

### Baslamadan once
- Admin ve staff profilleri acik
- Supabase SQL Editor acik
- A2 tamamlanmis (completed checklist mevcut)
- A3 tamamlanmis (draft ve diger status'lu order'lar mevcut)
- A-P03b fixture yuklenmis

### A5-01 ~ A5-05: Yetkilendirme Dogrulama (Pragmatik Iki Katmanli)

**smoke-test.md ile runner guide arasindaki anlamsal fark:**

smoke-test.md bu maddeleri "direct Server Action cagrisi" olarak tanimliyor. Ancak mevcut projede browser/console uzerinden guvenilir runtime Server Action replay yontemi yoktur (Next.js Server Action'lari internal routing ve opaque action ID kullanir). Bu nedenle A5-01~A5-05 maddeleri pratikte **iki parcali pragmatik dogrulama** olarak kosulur:

- **Uygulama katmani guard'lari** → `[KOD INCELEME]` ile
- **Veritabani katmani RLS davranisi** → `[SQL]` gercek runtime probe ile

Bu, literal "runtime direct Server Action call" degil, **ayni riski kapsayan pragmatik dogrulama**dir.

**Onemli**: Tek basina RLS policy metni okumak `[SQL]` PASS sayilmaz. `[SQL]` PASS icin gercek probe (staff yetkisiyle INSERT/UPDATE denemesi yapilip sonucun gorulmesi) gerekir.

---

#### RLS Probe Preamble (Session Basinda Bir Kez)

A5 session basinda, **normal role ile** (preamble set etmeden) staff UUID'yi bulun:

```sql
SELECT id FROM profiles WHERE role = 'staff' LIMIT 1;
-- Sonucu not edin. Ornek: '550e8400-e29b-41d4-a716-446655440000'
-- Bu degeri asagidaki probe'larda <STAFF_UUID> yerine koyun.
```

**Her probe oncesi zorunlu preamble:**
```sql
SET SESSION ROLE authenticated;
SET request.jwt.claims TO '{"role":"authenticated","sub":"<STAFF_UUID>"}';
```

**Her probe sonrasi zorunlu cleanup:**
```sql
RESET ROLE;
RESET request.jwt.claims;
```

**`[SQL]` PASS kriterleri:**
- Policy metni okumak tek basina PASS degildir
- Gercek INSERT/UPDATE denemesi yapilmis olmali
- Probe, staff kimligiyle (preamble ile) calistirilmis olmali
- Beklenen sonuc: RLS nedeniyle red
  - INSERT probe'lari: "row-level security" iceren hata mesaji
  - UPDATE probe'lari: RLS hatasi veya `0 rows affected` (USING kosulu satiri gizler)

**Probe operasyonel kurallar:**
1. **Precheck zorunlu**: UPDATE probe'lari ve bagimlilikli INSERT probe'lari icin hedef kayit/bagimlilik dogrulamasi zorunludur. Hedef kayit yokken `0 rows affected` → yalanci PASS. Precheck basarisizsa: `Durum = FAIL`, `Not = SETUP FAIL: <neden>`, oturumu durdur.
2. **Rerun-safety**: INSERT probe'lari oncesi eski probe kayitlarini temizle.
3. **Beklenmedik basari**: Probe basarili olursa → `RESET ROLE; RESET request.jwt.claims;` → normal role ile degisikligi geri al → testi `FAIL` olarak kaydet.

---

#### A5-01: Staff direct supplier create reddedilir

**`[KOD INCELEME]` Uygulama guard'i**
- Dosya: `src/app/(app)/suppliers/actions.ts:20`
- PASS kriteri: `profile.role !== 'admin'` guard mevcut ve unauthorized durumda hata donuyor

**`[SQL]` RLS runtime probe**
- Policy: `suppliers_insert` (schema.sql:349-351)

```sql
-- Rerun cleanup (onceki probe'dan kalan kayit varsa — normal role ile)
DELETE FROM suppliers WHERE name = '__RLS_PROBE_SUPPLIER__';

-- Preamble
SET SESSION ROLE authenticated;
SET request.jwt.claims TO '{"role":"authenticated","sub":"<STAFF_UUID>"}';

-- Probe
INSERT INTO suppliers (name) VALUES ('__RLS_PROBE_SUPPLIER__');
-- Beklenen: RLS hatasi (row-level security iceren hata mesaji)

-- Beklenmedik basari durumunda:
-- RESET ROLE;
-- RESET request.jwt.claims;
-- DELETE FROM suppliers WHERE name = '__RLS_PROBE_SUPPLIER__';
-- Test FAIL olarak kaydedilir

-- Normal cleanup
RESET ROLE;
RESET request.jwt.claims;
```

**Sonuc**: Her iki katman PASS → test PASS. Herhangi biri FAIL → test FAIL.

---

#### A5-02: Staff direct supplier update/deactivate reddedilir

**`[KOD INCELEME]` Uygulama guard'i**
- Dosya: `src/app/(app)/suppliers/actions.ts:71`
- PASS kriteri: `profile.role !== 'admin'` guard mevcut

**`[SQL]` RLS runtime probe**
- Policy: `suppliers_update` (schema.sql:353-356)

```sql
-- Precheck (normal role ile — hedef kaydi dogrula + mevcut degeri not et)
SELECT id, name, contact_name FROM suppliers WHERE name = 'Metro Test' LIMIT 1;
-- Kayit bulunamazsa: Durum=FAIL, Not='SETUP FAIL: Metro Test supplier bulunamadi', oturumu durdur
-- Sonuc: id ve contact_name degerini not edin (restore icin)

-- Preamble
SET SESSION ROLE authenticated;
SET request.jwt.claims TO '{"role":"authenticated","sub":"<STAFF_UUID>"}';

-- Probe
UPDATE suppliers SET contact_name = '__RLS_PROBE_CONTACT__'
  WHERE id = (SELECT id FROM suppliers WHERE name = 'Metro Test' LIMIT 1);
-- Beklenen: 0 rows affected (USING filtreler, staff admin degil → satir gorulmez)
-- PASS: hedef kayit precheck ile dogrulandi VE 0 rows affected

-- Beklenmedik basari durumunda (1 row affected):
-- RESET ROLE;
-- RESET request.jwt.claims;
-- Eski deger NULL ise:
--   UPDATE suppliers SET contact_name = NULL
--     WHERE id = (SELECT id FROM suppliers WHERE name = 'Metro Test' LIMIT 1);
-- Eski deger dolu ise:
--   UPDATE suppliers SET contact_name = '<eski_text_deger>'
--     WHERE id = (SELECT id FROM suppliers WHERE name = 'Metro Test' LIMIT 1);
-- Not: NULL degeri tirnaksiz, text degeri tirnakli (tek tirnaklar '' olarak escape edilir)
-- Test FAIL olarak kaydedilir

-- Normal cleanup
RESET ROLE;
RESET request.jwt.claims;
```

**NOT**: Bu policy'de USING kosulu staff icin FALSE doner; PostgreSQL UPDATE satirini "goremez" ve `0 rows affected` doner (hata degil). Bu YALNIZCA precheck ile hedef kayit mevcutken PASS sayilir.

---

#### A5-03: Staff direct mapping degisikligi reddedilir

**`[KOD INCELEME]` Uygulama guard'i**
- `setProductSupplier` → `src/app/(app)/suppliers/actions.ts:134`
- `removeProductSupplier` → `src/app/(app)/suppliers/actions.ts:235`
- PASS kriteri: Her iki fonksiyonda `profile.role !== 'admin'` guard mevcut

**`[SQL]` RLS runtime probe**
- Policy: `product_suppliers_insert` (schema.sql:365-367)

```sql
-- Precheck (normal role ile — bagimliliklari dogrula)
SELECT id FROM products WHERE name = 'Rotezwiebel' LIMIT 1;
-- Bulunamazsa: Durum=FAIL, Not='SETUP FAIL: Rotezwiebel urun bulunamadi', oturumu durdur
SELECT id FROM suppliers WHERE name = 'Metro Test' LIMIT 1;
-- Bulunamazsa: Durum=FAIL, Not='SETUP FAIL: Metro Test supplier bulunamadi (A-P03b fixture eksik)', oturumu durdur

-- Rerun cleanup (onceki probe'dan kalan kayit varsa — normal role ile)
DELETE FROM product_suppliers
  WHERE product_id = (SELECT id FROM products WHERE name = 'Rotezwiebel' LIMIT 1)
    AND supplier_id = (SELECT id FROM suppliers WHERE name = 'Metro Test' LIMIT 1);

-- Preamble
SET SESSION ROLE authenticated;
SET request.jwt.claims TO '{"role":"authenticated","sub":"<STAFF_UUID>"}';

-- Probe
INSERT INTO product_suppliers (product_id, supplier_id, is_preferred) VALUES (
  (SELECT id FROM products WHERE name = 'Rotezwiebel' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'Metro Test' LIMIT 1),
  false
);
-- Beklenen: RLS hatasi (row-level security iceren hata mesaji)
-- Not: Rotezwiebel-Metro mapping fixture'da yoktur, A3 verisiyle karismaz

-- Beklenmedik basari durumunda:
-- RESET ROLE;
-- RESET request.jwt.claims;
-- DELETE FROM product_suppliers
--   WHERE product_id = (SELECT id FROM products WHERE name = 'Rotezwiebel' LIMIT 1)
--     AND supplier_id = (SELECT id FROM suppliers WHERE name = 'Metro Test' LIMIT 1);
-- Test FAIL olarak kaydedilir

-- Normal cleanup
RESET ROLE;
RESET request.jwt.claims;
```

---

#### A5-04: Staff direct checklist reopen reddedilir

**`[KOD INCELEME]` Uygulama guard'i**
- Dosya: `src/app/(app)/checklist/actions.ts:218`
- PASS kriteri: `profile.role !== 'admin'` guard mevcut

**`[SQL]` RLS runtime probe**
- Policy: `checklists_update` (schema.sql:385-394)

```sql
-- Precheck (normal role ile — completed checklist varligini dogrula)
SELECT id, status FROM checklists WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1;
-- Bulunamazsa: Durum=FAIL, Not='SETUP FAIL: completed checklist bulunamadi (A2 tamamlanmadan A5-04 yapilamaz)', oturumu durdur
-- Sonuc: id degerini not edin (restore icin)

-- Preamble
SET SESSION ROLE authenticated;
SET request.jwt.claims TO '{"role":"authenticated","sub":"<STAFF_UUID>"}';

-- Probe
UPDATE checklists SET status = 'in_progress'
  WHERE id = (SELECT id FROM checklists WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1);
-- Beklenen: 0 rows affected (USING: completed + staff → FALSE, satir gorulmez)
-- PASS: hedef kayit precheck ile dogrulandi VE 0 rows affected

-- Beklenmedik basari durumunda (1 row affected):
-- RESET ROLE;
-- RESET request.jwt.claims;
-- UPDATE checklists SET status = 'completed' WHERE id = '<precheck_id>';
-- Test FAIL olarak kaydedilir
-- NOT: status alanini probe eder; beklenmedik basarida hemen restore edilmelidir

-- Normal cleanup
RESET ROLE;
RESET request.jwt.claims;
```

**NOT**: USING kosulu `status != 'completed' OR get_user_role() = 'admin'`. Staff icin: `completed != completed` → FALSE, `admin` → FALSE → toplam FALSE. Satir gorulmez, `0 rows affected`.

---

#### A5-05: Staff direct order cancel reddedilir

**`[KOD INCELEME]` Uygulama guard'i**
- Dosya: `src/app/(app)/orders/actions.ts:205`
- PASS kriteri: `profile.role !== 'admin'` guard, cancel senaryosunda mevcut

**`[SQL]` RLS runtime probe**
- Policy: `orders_update` (schema.sql:428-433) — explicit WITH CHECK yok, PostgreSQL USING'i new row'a da uygular

```sql
-- Precheck (normal role ile — draft order varligini dogrula)
SELECT id, status FROM orders WHERE status = 'draft' ORDER BY created_at DESC LIMIT 1;
-- Bulunamazsa: Durum=FAIL, Not='SETUP FAIL: draft order bulunamadi (A3 tamamlanmadan A5-05 yapilamaz)', oturumu durdur
-- Sonuc: id degerini not edin (restore icin)

-- Preamble
SET SESSION ROLE authenticated;
SET request.jwt.claims TO '{"role":"authenticated","sub":"<STAFF_UUID>"}';

-- Probe
UPDATE orders SET status = 'cancelled'
  WHERE id = (SELECT id FROM orders WHERE status = 'draft' ORDER BY created_at DESC LIMIT 1);
-- Beklenen: USING old row: draft NOT IN (delivered, cancelled) → TRUE (satir gorulur)
-- Ancak implicit WITH CHECK: new row status='cancelled' IN (delivered, cancelled) → TRUE
-- VE get_user_role() = 'admin' → FALSE (staff)
-- Sonuc: WITH CHECK basarisiz, RLS hatasi

-- Beklenmedik basari durumunda (1 row affected):
-- RESET ROLE;
-- RESET request.jwt.claims;
-- UPDATE orders SET status = 'draft' WHERE id = '<precheck_id>';
-- Test FAIL olarak kaydedilir
-- NOT: sonraki order testlerinin kirlenmemesi icin hemen restore edilmelidir

-- Normal cleanup
RESET ROLE;
RESET request.jwt.claims;
```

**Onemli fark**: `cancelOrder` Server Action **tum** staff iptallerini `profile.role !== 'admin'` ile reddeder. RLS ise farkli granularitede: staff `draft→ordered` degisikligini yapabilir (normal is akisi), ama `→cancelled` veya `→delivered` degisikligini bloklar. Cancel senaryosunda her iki katman da bloklar.

**Ek UI dogrulamasi**: A1-22~A1-25 zaten staff'in UI'da bu butonlari goremedigini test eder. A5-01~05 bunun uzerine arka kapidan erisilemedigi teyit eder.

---

### A5-06 ~ A5-08: Audit ve Guvenlik (3 test)

1. **A5-06** `[SQL]`: Staff session ile audit_log SELECT:
   ```sql
   SET SESSION ROLE authenticated;
   SET request.jwt.claims TO '{"role":"authenticated","sub":"<STAFF_UUID>"}';
   SELECT * FROM audit_log LIMIT 5;
   -- Beklenen: bos sonuc veya RLS hatasi
   RESET ROLE;
   RESET request.jwt.claims;
   ```

2. **A5-07** `[SQL]`: Admin session ile audit_log:
   ```sql
   SET SESSION ROLE authenticated;
   SET request.jwt.claims TO '{"role":"authenticated","sub":"<ADMIN_UUID>"}';
   SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10;
   -- Beklenen: audit satirlari okunabilir
   RESET ROLE;
   RESET request.jwt.claims;
   ```

3. **A5-08** `[UI]`: DevTools Sources tab'da `SUPABASE_SERVICE_ROLE_KEY` arayun; Network tab'da tum response body'lerde arayun → hicbir yerde gorunmemeli

### A5-09 ~ A5-13: Constraint Dogrulama (5 test)

**Yontem**: `[SQL]`

1. **A5-09**: Checklist unique week:
   ```sql
   INSERT INTO checklists (iso_year, iso_week, status, created_by)
   VALUES (
     (SELECT iso_year FROM checklists LIMIT 1),
     (SELECT iso_week FROM checklists LIMIT 1),
     'draft',
     (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
   );
   -- Beklenen: UNIQUE constraint hatasi
   ```

2. **A5-10**: Single active checklist:
   ```sql
   INSERT INTO checklists (iso_year, iso_week, status, created_by)
   VALUES (2099, 1, 'draft', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1));
   -- Beklenen: partial unique index hatasi (eger zaten draft/in_progress varsa)
   -- Temizlik (basarili olursa):
   DELETE FROM checklists WHERE iso_year = 2099 AND iso_week = 1;
   ```

3. **A5-11**: Supplier unique name:
   ```sql
   INSERT INTO suppliers (name) VALUES ('Metro Test');
   -- Beklenen: UNIQUE constraint hatasi
   ```

4. **A5-12** `[UI]`: Ayni hafta icinde birden fazla order olustur → her biri benzersiz `ORD-*` numara alir

5. **A5-13**: Tek preferred supplier:
   ```sql
   INSERT INTO product_suppliers (product_id, supplier_id, is_preferred) VALUES (
     (SELECT id FROM products WHERE name = 'Cola' LIMIT 1),
     (SELECT id FROM suppliers WHERE name = 'Backer Test' LIMIT 1),
     true
   );
   -- Beklenen: partial unique index hatasi (Cola zaten Metro Test'e preferred)
   -- Temizlik (basarili olursa):
   DELETE FROM product_suppliers
     WHERE product_id = (SELECT id FROM products WHERE name = 'Cola' LIMIT 1)
       AND supplier_id = (SELECT id FROM suppliers WHERE name = 'Backer Test' LIMIT 1);
   ```

### A5-14a ~ A5-14b: Open-Order Supplier Guard (2 test)

1. **A5-14a** `[UI]`: Admin session + acik siparisi olan supplier + deaktive et → "Offene Bestellungen" hatasi. **Admin session kullanilmali** (staff zaten `updateSupplier`'da role check'te reddedilir)

2. **A5-14b** `[SQL]`: Service role ile UPDATE:
   ```sql
   -- Bu sorgu service role ile (normal session, preamble yok) calistirilir
   UPDATE suppliers SET is_active = false
     WHERE id = (SELECT supplier_id FROM orders WHERE status IN ('draft', 'ordered', 'partially_delivered') LIMIT 1);
   -- Beklenen: UPDATE basarili (DB constraint/trigger yok)
   -- Bu bilinen mimari sinir: koruma yalnizca uygulama katmaninda

   -- Restore:
   UPDATE suppliers SET is_active = true
     WHERE id = (SELECT supplier_id FROM orders WHERE status IN ('draft', 'ordered', 'partially_delivered') LIMIT 1);
   ```

### A5-15 ~ A5-16: Audit Log Dogrulama (2 test)

**Yontem**: `[SQL]`

```sql
-- A5-15: Checklist audit loglari
SELECT action, entity_type, created_at FROM audit_log
WHERE entity_type = 'checklist'
ORDER BY created_at DESC;
-- Beklenen: checklist_created, checklist_completed, checklist_exported, checklist_reopened

-- A5-16: Order ve supplier audit loglari
SELECT action, entity_type, created_at FROM audit_log
WHERE entity_type IN ('order', 'supplier')
ORDER BY created_at DESC;
-- Beklenen: order_created, order_status_changed, order_delivered, supplier_created, supplier_deactivated
```

### A5-17: ISO Week Sinir Durumu

**Yontem**: `[UI]` + `[SQL]`

Aralik sonu / Ocak basi tarihinde checklist olustur. Ornek: 29 Aralik 2025 = ISO 2026-W01.

```sql
SELECT iso_year, iso_week FROM checklists ORDER BY created_at DESC LIMIT 1;
-- Beklenen: ISO 8601 degerlerine uygun
```

### A5-18: Performance Sanity

**Yontem**: `[UI]`

126 item checklist ile normal kullanim. Sayfa yukleme kabul edilebilir; autosave debounce (800ms) calisir; Network tab'da duplicate write gorunmez.

### A5-19 ~ A5-20: Deaktive Kullanici (3 test)

1. **A5-19** `[SQL]` + `[UI]`:
   ```sql
   -- 1. Aktif kullanici ile login yap (baska browser'da)
   -- 2. SQL ile deaktive et:
   UPDATE profiles SET is_active = false WHERE role = 'staff';
   ```
   Staff session'dan Server Action cagir (checklist item update, order create vb.) → `getActiveProfile()` null doner, istek reddedilir.
   ```sql
   -- 3. Restore:
   UPDATE profiles SET is_active = true WHERE role = 'staff';
   ```

2. **A5-19b** `[UI]`: Deaktive kullanici dashboard, checklist, orders, suppliers sayfalarini ac → sayfalar render edilir, veri gorunur (sayfa katmaninda is_active gate'i yok). Bilinen sinir.

3. **A5-20** `[UI]`: Deaktive kullanici logout edip tekrar login → login basarili ama islem yapamaz.

---

## 9. Sonuc Kaydi ve Commit Kurali

### Her test sonrasi
- `smoke-test.md`'de ilgili testin `Durum` kolonunu `PASS` / `FAIL` / `SKIP` yap
- Her `FAIL`'e `Not` kolonunda issue numarasi veya aciklama yaz
- Precheck basarisizligi: `Durum = FAIL`, `Not = SETUP FAIL: <neden>`

### Her session sonunda commit
```
test(smoke): FAZ A - Session A1 results
test(smoke): FAZ A - Session A2 results
test(smoke): FAZ A - Session A3 results
test(smoke): FAZ A - Session A4 results
test(smoke): FAZ A - Session A5 results
```

### Blocker kurali
Herhangi bir `[BLOCKER]` test `FAIL` → dur, duzelt, sonraki session'a gecme. SETUP FAIL dahil.

---

## Ek A: SQL Sorgu Katalogu

Bu bolumde tum session'larda kullanilan SQL'ler tek yerde toplanmistir.

### Seed Dogrulama

```sql
SELECT COUNT(*) FROM storage_locations;  -- 7
SELECT COUNT(*) FROM categories;         -- 16
SELECT COUNT(*) FROM products WHERE is_active = true; -- 126
```

### Fixture Kurulum (A-P03b)

```sql
-- Supplier olusturma
INSERT INTO suppliers (name) VALUES
  ('Metro Test'), ('Transgourmet Test'), ('Backer Test')
ON CONFLICT (name) DO NOTHING;

-- Mapping olusturma
INSERT INTO product_suppliers (product_id, supplier_id, is_preferred) VALUES
  ((SELECT id FROM products WHERE name = 'Cola'),      (SELECT id FROM suppliers WHERE name = 'Metro Test'),        true),
  ((SELECT id FROM products WHERE name = 'Pommesbox'), (SELECT id FROM suppliers WHERE name = 'Metro Test'),        true),
  ((SELECT id FROM products WHERE name = 'Cola'),      (SELECT id FROM suppliers WHERE name = 'Transgourmet Test'), false),
  ((SELECT id FROM products WHERE name = 'Pommes'),    (SELECT id FROM suppliers WHERE name = 'Backer Test'),       false),
  ((SELECT id FROM products WHERE name = 'Mayo 10kg'), (SELECT id FROM suppliers WHERE name = 'Backer Test'),       false)
ON CONFLICT (product_id, supplier_id) DO NOTHING;
```

### Fixture Dogrulama

```sql
SELECT COUNT(*) AS total_mappings FROM product_suppliers;              -- 5
SELECT COUNT(*) AS preferred FROM product_suppliers WHERE is_preferred = true; -- 2

SELECT p.name, s.name AS supplier, ps.is_preferred
FROM product_suppliers ps
JOIN products p ON ps.product_id = p.id
JOIN suppliers s ON ps.supplier_id = s.id
ORDER BY s.name, p.name;
```

### Bulk-Fill Checklist Items (A2-17b Hizlandirma)

> **UYARI**: Yalnizca A2-01~A2-16 testleri manuel olarak tamamlandiktan sonra calistirilmali. Erken kullanim manuel test verisini kirletir.

```sql
-- Kalan item'lari checked yap (stock opsiyoneldir)
UPDATE checklist_items SET
  is_checked = true
WHERE checklist_id = (SELECT id FROM checklists WHERE status IN ('draft', 'in_progress') ORDER BY created_at DESC LIMIT 1)
  AND is_checked = false;

-- Dogrulama: unchecked item kalmamis olmali
SELECT COUNT(*) AS remaining
FROM checklist_items
WHERE checklist_id = (SELECT id FROM checklists WHERE status IN ('draft', 'in_progress') ORDER BY created_at DESC LIMIT 1)
  AND is_checked = false;
-- Beklenen: 0
```

### Constraint Test INSERT'leri (A5)

```sql
-- A5-09: Duplicate week
INSERT INTO checklists (iso_year, iso_week, status, created_by)
VALUES (
  (SELECT iso_year FROM checklists LIMIT 1),
  (SELECT iso_week FROM checklists LIMIT 1),
  'draft',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
);

-- A5-10: Second active checklist
INSERT INTO checklists (iso_year, iso_week, status, created_by)
VALUES (2099, 1, 'draft', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1));

-- A5-11: Duplicate supplier name
INSERT INTO suppliers (name) VALUES ('Metro Test');

-- A5-13: Duplicate preferred
INSERT INTO product_suppliers (product_id, supplier_id, is_preferred) VALUES (
  (SELECT id FROM products WHERE name = 'Cola' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'Backer Test' LIMIT 1),
  true
);
```

### Audit Log Inceleme

```sql
SELECT action, entity_type, entity_id, user_id, created_at, details
FROM audit_log
ORDER BY created_at DESC
LIMIT 20;
```

### Kullanici Deaktive / Reaktive (A5-19)

```sql
-- Deaktive
UPDATE profiles SET is_active = false WHERE role = 'staff';

-- Reaktive
UPDATE profiles SET is_active = true WHERE role = 'staff';
```

### Formula Injection Test + Restore (A4-05)

```sql
-- Injection
UPDATE checklist_items SET product_name = '=SUM(1,1)'
WHERE product_name = 'Cola'
  AND checklist_id = (SELECT id FROM checklists WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1);

-- Restore
UPDATE checklist_items SET product_name = 'Cola'
WHERE product_name = '=SUM(1,1)'
  AND checklist_id = (SELECT id FROM checklists WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1);
```

### Temizlik Sorgulari

```sql
-- Test supplier silme (tum test'ler bittikten sonra)
-- Once mapping'leri sil
DELETE FROM product_suppliers
WHERE supplier_id IN (SELECT id FROM suppliers WHERE name LIKE '%Test%');

-- Sonra supplier'lari sil (acik order yoksa)
DELETE FROM suppliers WHERE name LIKE '%Test%';

-- RLS probe artiklari
DELETE FROM suppliers WHERE name = '__RLS_PROBE_SUPPLIER__';
DELETE FROM product_suppliers
WHERE product_id = (SELECT id FROM products WHERE name = 'Rotezwiebel' LIMIT 1)
  AND supplier_id IN (SELECT id FROM suppliers WHERE name = 'Metro Test' LIMIT 1);
```

---

## Ek B: FAZ B/C Operasyonel Notlar

### FAZ B: Pilot Kullanici Onboarding

1. Supabase Auth'ta pilot kullanici hesaplari olusturun (email + guclu sifre)
2. Admin kullanici icin `profiles.role = 'admin'` set edin
3. Pilot kullanicilara temel akisi gosterin: login → checklist olustur → stok gir → tamamla → siparis olustur → teslimat isaretle
4. Feedback kanali acin (shared doc, chat, issue board)
5. Ilk 1-2 hafta gunluk check-in: audit_log + Vercel logs
6. Her hafta: checklist/order verileri ile manuel surec karsilastirmasi

### FAZ C: Golge Mod

1. **Discrepancy log sablonu**: Her hafta karsilastirma tablosu doldurun:

   | Urun | Manuel Miktar | Uygulama Miktari | Fark | Olasi Sebep |
   |------|---------------|------------------|------|-------------|
   |      |               |                  |      |             |

2. 2-4 hafta paralel calistirin; farklar kabul edilebilir seviyeye dustugunde go/no-go karari verin
3. Haftalik izleme: audit_log anomali, Vercel 5xx, auth sorunlari

### Go/No-Go Referansi

smoke-test.md'deki C3-01~C3-12 kriterlerine ve Final Karar tablosuna bakin:
- **GO**: Tum BLOCKER PASS, NON-BLOCKER FAIL ≤ 3
- **GO WITH LIMITATIONS**: Tum BLOCKER PASS, 4-8 NON-BLOCKER FAIL (veri/auth disinda)
- **NO-GO**: Herhangi bir BLOCKER FAIL veya 9+ NON-BLOCKER FAIL
