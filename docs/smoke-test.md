# Go-Live Readiness & Operational Safety Checklist

Bu dokuman Chickenplus Inventory uygulamasini kontrollu sekilde canli kullanima almak icin asamali dogrulama ve operasyonel guvenlik kontrol listesidir.

## Durum Kodlari

| Kod | Anlam |
|-----|-------|
| `PASS` | Test beklendigi gibi basariyla tamamlandi |
| `FAIL` | Test basarisiz; duzeltme gerekli, issue numarasi notlara yazilsin |
| `SKIP` | Bilincli olarak atlandi; nedeni notlarda zorunlu olarak yazilsin |
| `NOT RUN` | Henuz calistirilmadi |

## Oncelik Kodlari

| Kod | Anlam |
|-----|-------|
| `[BLOCKER]` | FAIL olursa faz FAIL olur; sonraki faza veya go-live'a gecilemez |
| `[NON-BLOCKER]` | FAIL olursa not alinir; go-live karari toplam riskle birlikte verilir |

## Global Kurallar

1. Herhangi bir fazda tek bir `[BLOCKER]` madde `FAIL` ise o faz `FAIL` sayilir ve sonraki faza gecilemez.
2. Her `FAIL` maddesi issue numarasi veya duzeltme linki ile kaydedilmelidir.
3. `SKIP` yalnizca bilincli karar varsa kullanilsin; nedeni zorunlu olarak yazilsin.
4. Her faz oncesi otomatik dogrulama komutlari calistirilmalidir (asagidaki tablo).
5. Herhangi bir faz sirasinda kod, migration, env veya config degisirse sonraki faza gecmeden once `type-check`, `lint`, `test` ve `build` yeniden calistirilmalidir.

## Auth Modeli Notu

Bu uygulama login-only UI'a sahiptir. `login/page.tsx` yalnizca `signInWithPassword()` kullanir; uygulama icerisinde kullanici kayit (signup) ekrani yoktur. Kullanicilar **Supabase Auth** seviyesinde olusturulur (Dashboard, API veya CLI). `handle_new_user` trigger'i auth.users'a INSERT oldugunda otomatik olarak `staff` rolunde profil olusturur. Ilk kullanici `/setup` sayfasindan admin rolune yukseltilir.

Bu dokumanda "kullanici olusturma" ifadesi her zaman Supabase Auth uzerinden hesap acmayi ifade eder; uygulama ici signup degildir.

## Varsayilan Test Verisi

| Alan | Deger |
|------|-------|
| Admin kullanici | Supabase Auth uzerinden olusturulmus ilk test kullanicisi |
| Staff kullanici | Supabase Auth uzerinden olusturulmus ikinci test kullanicisi |
| Ornek urunler | `Cola` (min 10), `Pommesbox` (min 3, max 4), `Rotezwiebel` |
| Ornek tedarikciler | `Metro Test`, `Transgourmet Test` (manuel olusturulacak; seed'de yok) |
| Nicht zugeordnet | Preferred supplier'i olmayan veya inactive supplier'e bagli urunlerin dustugu fallback grup; gercek bir supplier degil |
| Ornek cihazlar | Desktop Chrome, iPhone Safari 390px, Android Chrome 414px |
| Ornek tarih siniri | Aralik sonu / Ocak basi ISO week gecisi |

## Her Faz Oncesi Otomatik Dogrulama

| Faz | Komut / Kontrol | Beklenen Sonuc | Durum | Not |
|-----|------------------|----------------|-------|-----|
| A / B / C oncesi | `npm run type-check` | 0 hata | `PASS` | 0 hata |
| A / B / C oncesi | `npm run lint` | 0 hata | `PASS` | 0 hata |
| A / B / C oncesi | `npm run test` | Tum Vitest testleri gecer | `PASS` | Son test suiti gecti |
| A / B / C oncesi | `npm run build` | Production build basarili | `PASS` | Next.js 16.2.1 Turbopack |
| A oncesi | Supabase migrations uygulanmis | 11 tablo + 8 public SQL function mevcut | `PASS` | supabase db push basarili |
| A oncesi | Seed data yuklenmis | 7 storage location, 16 category, 126 product (suppliers seed'de yok) | `PASS` | SQL Editor ile yuklendi |
| B oncesi | Vercel/staging deploy | HTTPS erisimi var, env degiskenleri dogru | `NOT RUN` | |
| C oncesi | Monitoring / logs erisimi | Vercel logs + audit log erisilebilir | `NOT RUN` | |

---

## FAZ A: Kendi Kendine Test (Developer, staging ortami)

Amac: Uygulamayi gelistirici olarak, gercek Supabase ve gercek browser ile uctan uca dogrulamak.

### FAZ A On Kosullar (15 madde)

| ID | Oncelik | On Kosul | Veri / Kurulum | Beklenen Sonuc | Durum | Not |
|----|---------|----------|----------------|----------------|-------|-----|
| A-P01 | `[BLOCKER]` | Supabase staging project hazir | Hosted veya local remote project | Erisilebilir proje mevcut | `PASS` | chickenplus-staging, eu-central-1, ref: ivrhgfosktnyczlwqurj |
| A-P02 | `[BLOCKER]` | Tum migration'lar uygulanmis | `supabase/migrations/*.sql` | 11 tablo ve 8 public SQL function yuklu | `PASS` | supabase db push basarili |
| A-P03 | `[BLOCKER]` | Seed yuklenmis | `supabase/seed.sql` | 7 storage location, 16 category, 126 product yuklendi. NOT: Seed yalnizca bu 3 tabloyu icerir; `suppliers` ve `product_suppliers` tablolari seed'de YOKTUR | `PASS` | SQL Editor ile yuklendi |
| A-P03b | `[BLOCKER]` | Test supplier ve mapping verisi hazir | Manuel olusturma (Supabase Dashboard veya SQL) | En az 3 test supplier, 5+ product mapping, 1+ preferred mapping, 1+ mapping'siz urun mevcut. **Fixture**: `Metro Test` (preferred supplier: `Cola`, `Pommesbox`), `Transgourmet Test` (secondary: `Cola`), `Backer Test` (secondary: `Pommes`, `Mayo 10kg`). `Rotezwiebel` mapping'siz (unmapped, `Nicht zugeordnet` grubuna duser). `Lieferdienst Test` henuz yok (A3-19'da olusturulacak) | `PASS` | test-suppliers.sql ile yuklendi |
| A-P04 | `[BLOCKER]` | Vercel / staging env'leri set | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | App auth + DB baglantisi calisiyor | `NOT RUN` | |
| A-P04b | `[BLOCKER]` | Email confirmation ayari kontrol edildi | Supabase Dashboard > Auth > Providers > Email | "Confirm email" OFF veya SMTP gercekten calisiyor; Supabase Auth uzerinden olusturulan kullanici login yapabiliyor | `NOT RUN` | |
| A-P04c | `[BLOCKER]` | Auth provisioning modeli tanimli | Dokumante edilmis karar | Kullanici olusturma yontemi net: manual (Dashboard/API), invite, veya controlled signup. Secilen model yazili | `PASS` | Manuel model, docs/deployment.md'ye yazildi |
| A-P04d | `[BLOCKER]` | Production auth exposure kontrol edildi | Supabase Auth ayarlari | Internal tool icin public signup OFF; veya acik ise neden ve hangi ek korumalar oldugu yazili | `NOT RUN` | |
| A-P05 | `[BLOCKER]` | Deployment candidate commit sabitlenmis | Test edilecek branch/commit | Test boyunca kod sabit | `PASS` | cf55686, GitHub push basarili |
| A-P06 | `[BLOCKER]` | `type-check` temiz | `npm run type-check` | 0 hata | `PASS` | 0 hata |
| A-P07 | `[BLOCKER]` | `lint` temiz | `npm run lint` | 0 hata | `PASS` | 0 hata |
| A-P08 | `[BLOCKER]` | `test` temiz | `npm run test` | Tum testler gecer | `PASS` | Son test suiti gecti |
| A-P09 | `[BLOCKER]` | `build` temiz | `npm run build` | Production build basarili | `PASS` | Next.js 16.2.1 Turbopack |
| A-P10 | `[BLOCKER]` | Iki test hesabi hazir | Supabase Auth uzerinden 1 admin adayi + 1 staff adayi olusturuldu | Her iki kullanici login yapabiliyor | `NOT RUN` | |
| A-P11 | `[BLOCKER]` | Staging ve production env ayrilmis | Env degiskenleri karsilastirma | Staging ve prod farkli Supabase project'e bakar; preview deploy prod DB'ye yonlenmez; service role key yalnizca server'da | `NOT RUN` | |

### Session A1: Altyapi + Auth + Middleware + Staff Kisitlamalari (28 test)

| ID | Oncelik | Test | Veri | Beklenen Sonuc | Durum | Not |
|----|---------|------|------|----------------|-------|-----|
| A1-01 | `[BLOCKER]` | 11 tablo mevcut | Supabase Table Editor | `profiles`, `storage_locations`, `categories`, `products`, `suppliers`, `product_suppliers`, `checklists`, `checklist_items`, `orders`, `order_items`, `audit_log` gorunur | `NOT RUN` | |
| A1-01b | `[BLOCKER]` | Tum tablolarda RLS enabled ve policy mevcut | Supabase Dashboard > Auth > Policies | 11 tablonun hepsinde RLS acik; `profiles`, `checklists`, `orders`, `suppliers` tablolarinda en az 1 SELECT + 1 UPDATE policy mevcut | `NOT RUN` | |
| A1-02 | `[BLOCKER]` | Public SQL function seti mevcut | Supabase SQL / Functions list | `rpc_bootstrap_admin`, `rpc_create_checklist_with_snapshot`, `rpc_create_order_with_items`, `rpc_update_order_delivery`, `rpc_update_order_items_ordered`, `rpc_update_checklist_items_batch`, `rpc_finalize_suggestion_group`, `rpc_cleanup_old_data` gorunur | `NOT RUN` | |
| A1-02b | `[BLOCKER]` | Helper function ve trigger'lar mevcut | Supabase Functions / Triggers listesi | `handle_new_user` (auth.users AFTER INSERT trigger), `get_user_role` (STABLE SECURITY DEFINER), `update_updated_at_column` (timestamp trigger) gorunur ve aktif | `NOT RUN` | |
| A1-03 | `[BLOCKER]` | Storage location seed sayisi dogru | `SELECT COUNT(*) FROM storage_locations` | 7 kayit | `NOT RUN` | |
| A1-04 | `[BLOCKER]` | Category seed sayisi dogru | `SELECT COUNT(*) FROM categories` | 16 kayit | `NOT RUN` | |
| A1-05 | `[BLOCKER]` | Product seed sayisi dogru | `SELECT COUNT(*) FROM products WHERE is_active = true` | 126 aktif urun | `NOT RUN` | |
| A1-06 | `[NON-BLOCKER]` | Ornek urun seed spot-check | `Cola`, `Pommesbox`, `Rotezwiebel` sorgula | Birim ve min/max degerleri seed ile uyumlu | `NOT RUN` | |
| A1-06b | `[BLOCKER]` | Seed veri icerigi ve FK iliskileri dogru | `Pommesbox`: min_stock=3, min_stock_max=4. `Cola`: kategori FK -> `Getranke` -> storage `D`. Her urunun category_id gecerli bir categories kaydina isaret ediyor | Veri icerigi ve iliskiler tutarli | `NOT RUN` | |
| A1-07 | `[BLOCKER]` | Ana rota davranisi | Browser'da `/` ac, session yok | `/login`'e yonlenir | `NOT RUN` | |
| A1-08 | `[BLOCKER]` | Supabase Auth uzerinden olusturulan ilk kullanici login yapabiliyor | Admin adayi email/sifre ile login | `/dashboard` veya `/setup` acilir | `NOT RUN` | |
| A1-09 | `[BLOCKER]` | Profile auto-create trigger calisiyor | Login sonrasi `profiles` tablosunu kontrol et | Yeni kullanici `staff` rolunde, `is_active = true` profil kaydi almis | `NOT RUN` | |
| A1-10 | `[BLOCKER]` | Ilk kullanici `/setup` gorebiliyor | Auth edilmis ilk kullanici, henuz admin yok | Setup ekrani acilir, "Als Admin einrichten" butonu gorunur | `NOT RUN` | |
| A1-11 | `[BLOCKER]` | Admin bootstrap basarili | Setup butonuna tikla | Ilk kullanici `admin` olur; `profiles.role = 'admin'`; audit_log'da `admin_bootstrapped` kaydi olusur | `NOT RUN` | |
| A1-12 | `[BLOCKER]` | Ikinci bootstrap engelleniyor | Ikinci kullanici `/setup`'a gider | Admin zaten var; setup formu gorunmez, `/dashboard`'a yonlenir | `NOT RUN` | |
| A1-13 | `[BLOCKER]` | Login calisiyor | Admin email/sifre | `/dashboard` acilir | `NOT RUN` | |
| A1-14 | `[BLOCKER]` | Logout calisiyor | Settings > "Abmelden" | Session kapanir, `/login` acilir | `NOT RUN` | |
| A1-15 | `[BLOCKER]` | Unauth `/dashboard` redirect | Session yok, `/dashboard`'a git | `/login`'e yonlenir | `NOT RUN` | |
| A1-16 | `[BLOCKER]` | Unauth `/checklist` redirect | Session yok, `/checklist`'e git | `/login`'e yonlenir | `NOT RUN` | |
| A1-17 | `[BLOCKER]` | Unauth `/suppliers` redirect | Session yok, `/suppliers`'a git | `/login`'e yonlenir | `NOT RUN` | |
| A1-18 | `[NON-BLOCKER]` | Auth iken `/login` redirect | Auth edilmis admin, `/login`'e git | `/dashboard`'a yonlenir | `NOT RUN` | |
| A1-19 | `[NON-BLOCKER]` | Admin varken `/setup` redirect | Auth edilmis kullanici, admin zaten var | `/dashboard`'a yonlenir | `NOT RUN` | |
| A1-20 | `[BLOCKER]` | Supabase Auth uzerinden olusturulan ikinci kullanici login yapabiliyor | Staff adayi email/sifre ile login | Staff profil olusur, `/dashboard` acilir | `NOT RUN` | |
| A1-21 | `[NON-BLOCKER]` | Staff temel navigasyonu gorur | Staff oturumu | Dashboard, Kontrolle, Bestellungen, Archiv, Einstellungen gorunur | `NOT RUN` | |
| A1-22 | `[BLOCKER]` | Staff supplier CRUD goremez | Staff > Suppliers sayfasi | "Neuer Lieferant" butonu ve edit/deactivate aksiyonlari yok | `NOT RUN` | |
| A1-23 | `[BLOCKER]` | Staff mapping UI goremez | Staff > Suppliers sayfasi | Product mapping bolumu (Zugewiesene Produkte) render edilmez | `NOT RUN` | |
| A1-24 | `[BLOCKER]` | Staff checklist reopen yapamaz | Staff, completed checklist | "Erneut offnen" butonu yok; direct Server Action cagrisi yetki hatasi doner | `NOT RUN` | |
| A1-25 | `[BLOCKER]` | Staff order cancel yapamaz | Staff > Orders | "Stornieren" butonu yok; direct Server Action cagrisi yetki hatasi doner | `NOT RUN` | |

### Session A2: Checklist Yasam Dongusu (26 test)

| ID | Oncelik | Test | Veri | Beklenen Sonuc | Durum | Not |
|----|---------|------|------|----------------|-------|-----|
| A2-01 | `[BLOCKER]` | Yeni checklist olusturma | Admin veya staff, mevcut hafta | Checklist olusur, dogru ISO hafta numarasi gorunur | `NOT RUN` | |
| A2-02 | `[BLOCKER]` | Snapshot item sayisi dogru | Olusan checklist | 126 checklist item olusur (tum aktif urunler) | `NOT RUN` | |
| A2-03 | `[BLOCKER]` | Tek aktif checklist kurali | Aktif checklist varken ikinci olusturma denemesi | Reddedilir; "Es gibt bereits eine aktive Kontrollliste" benzeri hata | `NOT RUN` | |
| A2-04 | `[BLOCKER]` | Ayni hafta duplicate bloklaniyor | Haftayi tamamlayip ayni hafta icinde tekrar create | Duplicate week hatasi alinir (UNIQUE iso_year + iso_week) | `NOT RUN` | |
| A2-05 | `[NON-BLOCKER]` | Draft gorunumu dogru | Yeni checklist sayfasi | `draft` badge'i veya durumu gorunur | `NOT RUN` | |
| A2-06 | `[BLOCKER]` | Ilk item update draft->in_progress yapar | `Cola`, stock `8` gir | Checklist status `in_progress` olur; dashboard badge guncellenir | `NOT RUN` | |
| A2-07 | `[BLOCKER]` | Decimal stock autosave olur | `Rotezwiebel`, stock `24.5` gir, 2 saniye bekle, sayfayi yenile | Deger `24.5` olarak korunur | `NOT RUN` | |
| A2-08 | `[BLOCKER]` | Missing toggle kaydolur | `Cola` satirinda `F` toggle'ini ac, sayfayi yenile | `F` durumu korunur; current implementasyonda checklist missing durumu numeric hesap yerine manual `is_missing` ile tutulur | `NOT RUN` | |
| A2-09 | `[BLOCKER]` | Min/max bilgi satiri gorunur | `Pommesbox`: min=3, max=4 | Item alt bilgisinde `3-4` araligi ve birim gorunur | `NOT RUN` | |
| A2-10 | `[BLOCKER]` | Stock alani serbest metin kaydeder | Herhangi bir item, `-1` veya `2 Kiste` gibi bir deger gir | Deger metin olarak kaydolur; mevcut implementasyonda numeric validation yoktur | `NOT RUN` | |
| A2-11 | `[NON-BLOCKER]` | `is_checked` toggle kaydolur | Herhangi bir item checkbox'ini tikla, sayfayi yenile | Checked durumu korunur | `NOT RUN` | |
| A2-12 | `[NON-BLOCKER]` | Manual save gerekmiyor | Stock degisimi yap, 600ms+ bekle | Ayrica save butonu gerekmeksizin deger kaydolur (autosave) | `NOT RUN` | |
| A2-13 | `[BLOCKER]` | Missing toggle aktif kalir | `Pommesbox` icin `F` toggle'ini ac | Sayfayi yenileyince `is_missing = true` korunur | `NOT RUN` | |
| A2-14 | `[NON-BLOCKER]` | Missing toggle geri alinabilir | `F` toggle'ini tekrar kapat | Sayfayi yenileyince `is_missing = false` olur | `NOT RUN` | |
| A2-15 | `[BLOCKER]` | Tamamlama, unchecked item varken bloklanir | Birkac item unchecked birak, "Abschliessen" tikla | Reddedilir; hata mesaji goruntulenir | `NOT RUN` | |
| A2-16 | `[BLOCKER]` | Tamamlama, stock bos olsa da calisir | Birkac item stock bos birak ama hepsini checked yap, "Abschliessen" tikla | Checklist tamamlanir; `Bestand` opsiyoneldir | `NOT RUN` | |
| A2-17 | `[BLOCKER]` | Tum itemlar checked oldugunda checklist complete olur | Tum 126 item checked; stock alanlari dolu olmak zorunda degil | Status `completed` olur | `NOT RUN` | |
| A2-17b | `[BLOCKER]` | Staff kullanici checklist tamamlayabiliyor (runtime dogrulama) | Staff session ile aktif checklist'i tamamla; tum itemlar checked olsun, stock bos olabilir | Checklist tamamlanir; response hizli doner, otomatik siparis hazirligi arkaplanda devam eder | `NOT RUN` | |
| A2-18 | `[NON-BLOCKER]` | Completed badge / gorunum dogru | Completed checklist | Read-only durum ve tamamlandi metni gorunur | `NOT RUN` | |
| A2-19 | `[BLOCKER]` | Completed checklist read-only | Completed checklist'te input degistirme denemesi | Guncelleme yapilamaz; inputlar disabled | `NOT RUN` | |
| A2-20 | `[NON-BLOCKER]` | Refresh sonrasi read-only devam eder | Page reload | Tamamlanmis checklist editable olmaz | `NOT RUN` | |
| A2-21 | `[BLOCKER]` | Admin reopen calisir | Admin > Completed checklist > "Erneut offnen" | Status yeniden `in_progress` olur, itemlar editable | `NOT RUN` | |
| A2-22 | `[BLOCKER]` | Staff reopen yapamaz | Staff > Completed checklist | "Erneut offnen" butonu yok; direct istek yetki hatasi doner | `NOT RUN` | |
| A2-23 | `[NON-BLOCKER]` | Reopen sonrasi tekrar editable | Admin reopen sonra item degistir | Degisiklik kaydolur | `NOT RUN` | |
| A2-24 | `[BLOCKER]` | Arsiv listesi completed checklist'i gosterir | Archive sayfasi | Hafta/yil, tamamlanma tarihi ve detay/export aksiyonlari gorunur | `NOT RUN` | |
| A2-25 | `[BLOCKER]` | Archive detay sayfasi checklist ile uyumlu | Archive detay sayfasi | Item verileri, stock metni, `is_missing` ve `is_checked` durumlari checklist ile tutarli | `NOT RUN` | |

### Session A3: Orders + Suppliers + Mapping + Staff Kisitlamalari (31 test)

On Kosul: A-P03b tamamlanmis olmali (supplier ve mapping verisi hazir).

| ID | Oncelik | Test | Veri | Beklenen Sonuc | Durum | Not |
|----|---------|------|------|----------------|-------|-----|
| A3-01 | `[BLOCKER]` | Order suggestions sadece uygun missing itemlar icin gelir | Aktif checklist, missing items mevcut | Yalnizca `is_missing = true` ve `is_ordered = false` olan itemlar listelenir; acik order'daki urunler tekrar suggestion'a girmez | `NOT RUN` | |
| A3-02 | `[BLOCKER]` | Preferred supplier grouping calisir | `Cola` icin `Metro Test` preferred mapping | Oneri `Metro Test` altinda toplanir | `NOT RUN` | |
| A3-03 | `[BLOCKER]` | Inactive preferred supplier fallback | Preferred supplier'i inactive yap | Urun `Nicht zugeordnet` grubuna duser (fallback, gercek supplier degil) | `NOT RUN` | |
| A3-04 | `[BLOCKER]` | Mapping yoksa fallback | Mapping'siz urun (A-P03b'de hazirlanmis) | Urun `Nicht zugeordnet` grubuna duser | `NOT RUN` | |
| A3-05 | `[BLOCKER]` | Suggestion placeholder max stock snapshot kullanir | `Pommesbox`: min=3, max=4 | Suggestion satirindaki miktar placeholder'i / onerilen deger `4` olur | `NOT RUN` | |
| A3-06 | `[BLOCKER]` | Suggestion placeholder min stock snapshot kullanir (max yoksa) | `Cola`: min=10, max=null | Suggestion satirindaki miktar placeholder'i / onerilen deger `10` olur | `NOT RUN` | |
| A3-07 | `[NON-BLOCKER]` | Open order duplicate suggestion'a yeniden girmez | Ayni urun icin zaten acik order var | Urun yeni suggestion listesinde gorunmez | `NOT RUN` | |
| A3-08 | `[BLOCKER]` | Mapped supplier suggestion finalize edilir | Mapped supplier + secili item listesi | Checklist-side ordered capture kaydolur; supplier bagli `ordered` order olusur; secilen itemlar suggestion listesinden kalkar | `NOT RUN` | |
| A3-08b | `[BLOCKER]` | Ikinci supplier grubu bagimsiz finalize edilir | Farkli supplier grubundan ikinci suggestion finalize et | Ikinci supplier icin ayri order/capture olusur; birinci supplier etkilenmez | `NOT RUN` | |
| A3-09 | `[BLOCKER]` | Order number format dogru | Yeni order olustur | `ORD-YYYY-WXX-SEQ` formatinda benzersiz numara (ornek: `ORD-2026-W14-1`) | `NOT RUN` | |
| A3-10 | `[NON-BLOCKER]` | Olusan supplier order listede gorunur | Orders sayfasi | Open orders altinda uygun status ile listelenir (`draft` veya `ordered`) | `NOT RUN` | |
| A3-11 | `[BLOCKER]` | Draft order mark ordered calisir | Arkaplanda veya manuel olusmus draft order > opsiyonel `Bestellt` + `Bestellte Menge` gir, sonra "Als bestellt markieren" | Status `ordered` olur; girilen item-level siparis miktarlari korunur | `NOT RUN` | |
| A3-12 | `[BLOCKER]` | Partial delivery calisir | En az 2 itemli order, 1 item delivered isaretle | Status `partially_delivered` olur | `NOT RUN` | |
| A3-13 | `[BLOCKER]` | Full delivery calisir | Tum itemlari delivered isaretle | Status `delivered` olur | `NOT RUN` | |
| A3-14 | `[NON-BLOCKER]` | `delivered_at` timestamp dolu | Fully delivered order | Delivery tarihi gorunur | `NOT RUN` | |
| A3-15 | `[BLOCKER]` | Admin draft order cancel | Admin, draft order > "Stornieren" | Status `cancelled` olur | `NOT RUN` | |
| A3-16 | `[BLOCKER]` | Admin ordered/partial cancel | Admin, ordered veya partially_delivered order | Status `cancelled` olur | `NOT RUN` | |
| A3-17 | `[BLOCKER]` | Delivered order cancel edilemez | Admin, delivered order | Cancel reddedilir veya buton gorunmez | `NOT RUN` | |
| A3-18 | `[BLOCKER]` | Staff cancel goremez | Staff > Orders | "Stornieren" butonu hicbir order'da gorunmez | `NOT RUN` | |
| A3-19 | `[BLOCKER]` | Supplier create calisir (admin) | Admin > Suppliers > "Neuer Lieferant", isim: `Lieferdienst Test` | Supplier olusur | `NOT RUN` | |
| A3-20 | `[BLOCKER]` | Supplier duplicate name bloklanir | `Lieferdienst Test` ismiyle ikinci supplier create denemesi | Unique constraint hatasi; supplier olusmaz | `NOT RUN` | |
| A3-21 | `[NON-BLOCKER]` | Supplier edit kalici | Contact, phone, email, address guncelle, sayfayi yenile | Guncel degerler korunur | `NOT RUN` | |
| A3-22 | `[BLOCKER]` | Open order yokken supplier deactivate calisir | Acik siparisi olmayan supplier | `inactive` olur, badge gorunur | `NOT RUN` | |
| A3-23 | `[BLOCKER]` | Open order varken deactivate bloklanir | Acik siparisi olan supplier | Hata doner; supplier aktif kalir | `NOT RUN` | |
| A3-24 | `[BLOCKER]` | Inactive supplier order hedefi olamaz | Inactive supplier | Siparis onerisinde bu supplier altinda urun gruplanmaz; urunler `Nicht zugeordnet` grubuna duser | `NOT RUN` | |
| A3-25 | `[BLOCKER]` | Product mapping ekleme | Admin > `Lieferdienst Test` > Produkt hinzufugen > `Rotezwiebel` | Mapping olusur, supplier altinda gorunur | `NOT RUN` | |
| A3-26 | `[BLOCKER]` | Preferred atama onceki preferred'i temizler | `Cola` icin ikinci supplier'i preferred yap | Eski preferred duser; tek preferred supplier kalir | `NOT RUN` | |
| A3-27 | `[NON-BLOCKER]` | Product mapping silme | Var olan mapping > kaldir | Mapping silinir | `NOT RUN` | |
| A3-28 | `[NON-BLOCKER]` | Inactive supplier mapping UI gizler | Supplier inactive | Mapping bolumu render edilmez | `NOT RUN` | |
| A3-29 | `[BLOCKER]` | Staff supplier CRUD ve mapping yazma yapamaz | Staff > Suppliers; direct Server Action cagrisi | UI aksiyonlari yok; direct istek yetki hatasi doner | `NOT RUN` | |
| A3-30 | `[BLOCKER]` | Staff supplier mapping verisini dogrudan okuyamaz | Staff session ile `getSupplierProducts` / `getAvailableProducts` cagrisi | Server Action yetki hatasi doner; mapping verisi staff'a acilmaz | `NOT RUN` | |

### Session A4: Export + Responsive + Loading/Error/Empty States + Dashboard/Settings (22 test)

| ID | Oncelik | Test | Veri | Beklenen Sonuc | Durum | Not |
|----|---------|------|------|----------------|-------|-----|
| A4-01 | `[BLOCKER]` | Export filename dogru | Completed checklist, ornek week 3 | Dosya `Bestandskontrolle_KW03_YYYY.xlsx` olarak iner | `NOT RUN` | |
| A4-02 | `[BLOCKER]` | Export sheet basligi ve kolonlari dogru | Excel dosyasi ac | Baslik + `Produkt / Einheit / Mindestbestand / Bestand / Fehlt / Kategorie` kolonlari mevcut | `NOT RUN` | |
| A4-03 | `[BLOCKER]` | Export grouping dogru | Farkli depo alanlarindan urunler | Satirlar storage location -> category -> product sirasinda gelir | `NOT RUN` | |
| A4-04 | `[NON-BLOCKER]` | Export min-max aralik gosterir | `Pommesbox` (min=3, max=4) | Mindestbestand alaninda `3-4` benzeri aralik gorunur | `NOT RUN` | |
| A4-05 | `[BLOCKER]` | Formula injection sanitize edilir | SQL ile bir urunun product_name'ini `=SUM(1,1)` olarak guncelle, export al | Excel'de formula calismaz; metin olarak (bas karakter `'` ile) gelir | `NOT RUN` | |
| A4-06 | `[BLOCKER]` | Unauth export korumasi calisir | Logout iken export URL'ini dogrudan browser'da ac | HTTP 401 JSON response doner. NOT: Koruma middleware'den degil, route handler icerisinden enforce ediliyor (`src/app/api/export/[checklistId]/route.ts` line 17-19, auth.getUser() kontrolu) | `NOT RUN` | |
| A4-07 | `[BLOCKER]` | 375px checklist overflow yapmaz | Chrome DevTools > iPhone SE viewport | Tum sayfalarda yatay tasma yok | `NOT RUN` | |
| A4-08 | `[BLOCKER]` | 390px bottom nav kullanilabilir | Chrome DevTools > iPhone 13 viewport | 6 nav item gorunur ve tiklanabilir | `NOT RUN` | |
| A4-09 | `[NON-BLOCKER]` | 414px safe-area cakisma yapmaz | Chrome DevTools > Android buyuk viewport | Bottom nav icerigi kapatmaz | `NOT RUN` | |
| A4-10 | `[BLOCKER]` | Mobile checklist inputlari kullanilabilir | 375/390px checklist sayfasi | Stock, missing, checkbox alanlari rahat kullanilir; input'lar birbirine girmez | `NOT RUN` | |
| A4-11 | `[NON-BLOCKER]` | Mobile orders sayfasi overflow yapmaz | 375/390px orders | Kartlar ve butonlar ekrana sigar | `NOT RUN` | |
| A4-12 | `[NON-BLOCKER]` | Mobile suppliers sayfasi overflow yapmaz | 375/390px suppliers | Kartlar ve mapping satirlari tasmaz | `NOT RUN` | |
| A4-13 | `[NON-BLOCKER]` | Dashboard loading skeleton gorunur | Chrome DevTools > Network > Slow 3G | Dashboard loading state render edilir | `NOT RUN` | |
| A4-14 | `[NON-BLOCKER]` | Checklist loading skeleton gorunur | Slow 3G ile checklist sayfasi ac | Checklist loading state render edilir | `NOT RUN` | |
| A4-15 | `[NON-BLOCKER]` | Orders loading skeleton gorunur | Slow 3G ile orders sayfasi ac | Orders loading state render edilir | `NOT RUN` | |
| A4-16 | `[NON-BLOCKER]` | Error boundary retry akisi gorunur | Staging'de kontrollu hata olustur (ornek: Supabase'i gecici durdur) | Hata ekrani ve "Erneut versuchen" butonu cikar | `NOT RUN` | |
| A4-17 | `[NON-BLOCKER]` | Dashboard empty state dogru | Aktif checklist yok | Olusturma CTA'si gorunur | `NOT RUN` | |
| A4-18 | `[NON-BLOCKER]` | Orders empty state dogru | Hic order yok | Bos durum metni gorunur | `NOT RUN` | |
| A4-19 | `[NON-BLOCKER]` | Suppliers empty state dogru | Hic supplier yok, admin user | CTA ile bos durum gorunur | `NOT RUN` | |
| A4-20 | `[NON-BLOCKER]` | Archive empty state dogru | Completed checklist yok | Bos durum metni gorunur | `NOT RUN` | |
| A4-21 | `[NON-BLOCKER]` | Settings sayfasi dogru | Auth edilmis admin ve staff ayri ayri | Admin: "Administrator"; Staff: "Mitarbeiter". Email gorunur; logout calisir | `NOT RUN` | |
| A4-22 | `[BLOCKER]` | Accessibility sanity | Dialog ac/kapat (Escape, Tab), badge ve button label'lari kontrol et | Keyboard focus trap calisir; sr-only close label ("Schliessen") mevcut; durum gosterimi renk + metin birlikte | `NOT RUN` | |

### Session A5: RLS + Authorization + Data Integrity + Audit + ISO Week + Performance (22 test)

| ID | Oncelik | Test | Veri | Beklenen Sonuc | Durum | Not |
|----|---------|------|------|----------------|-------|-----|
| A5-01 | `[BLOCKER]` | Staff direct supplier create reddedilir | Staff session, direct Server Action cagrisi | Yetki hatasi doner; supplier olusmaz | `NOT RUN` | |
| A5-02 | `[BLOCKER]` | Staff direct supplier update/deactivate reddedilir | Staff session, direct Server Action cagrisi | Yetki hatasi doner | `NOT RUN` | |
| A5-03 | `[BLOCKER]` | Staff direct mapping degisikligi reddedilir | Staff session, direct Server Action cagrisi | Yetki hatasi doner | `NOT RUN` | |
| A5-04 | `[BLOCKER]` | Staff direct checklist reopen reddedilir | Staff session, direct Server Action cagrisi | Yetki hatasi doner | `NOT RUN` | |
| A5-05 | `[BLOCKER]` | Staff direct order cancel reddedilir | Staff session, direct Server Action cagrisi | Yetki hatasi doner | `NOT RUN` | |
| A5-06 | `[BLOCKER]` | Staff audit log goremez | Staff session, Supabase client ile `audit_log` SELECT | RLS engeller; bos sonuc veya hata doner | `NOT RUN` | |
| A5-07 | `[NON-BLOCKER]` | Admin audit log gorebilir | Admin session, Supabase client ile `audit_log` SELECT | Audit satirlari okunabilir | `NOT RUN` | |
| A5-08 | `[BLOCKER]` | Service role key client'a sizmaz | Browser DevTools > Network tab'da tum response'lari ara; Sources tab'da bundle'i ara | `SUPABASE_SERVICE_ROLE_KEY` degeri hicbir yerde gorunmez | `NOT RUN` | |
| A5-09 | `[BLOCKER]` | Checklist unique week constraint | Supabase SQL ile ayni `iso_year` + `iso_week` icin dogrudan INSERT dene | UNIQUE constraint hatasi; duplicate olusturulamaz | `NOT RUN` | |
| A5-10 | `[BLOCKER]` | Single active checklist constraint | Supabase SQL ile ikinci `draft`/`in_progress` checklist INSERT dene | Partial unique index hatasi; ikinci aktif checklist olusmaz | `NOT RUN` | |
| A5-11 | `[BLOCKER]` | Supplier unique name constraint | Supabase SQL ile ayni isimli supplier INSERT dene | UNIQUE constraint hatasi | `NOT RUN` | |
| A5-12 | `[BLOCKER]` | Order number uniqueness | Ayni hafta icinde birden fazla order olustur | Her biri benzersiz `ORD-*` numara alir; RPC retry loop calisir | `NOT RUN` | |
| A5-13 | `[BLOCKER]` | Tek preferred supplier constraint | Supabase SQL ile ayni product_id icin 2 `is_preferred=true` INSERT dene | Partial unique index hatasi; en fazla 1 preferred kalir | `NOT RUN` | |
| A5-14a | `[BLOCKER]` | Open-order supplier deactivate Server Action bloklar | Admin session + acik siparisi olan supplier + Server Action `updateSupplier(isActive=false)` cagrisi | "Offene Bestellungen" hatasi doner, supplier aktif kalir. Admin session kullanilmali cunku open-order guard'a ancak admin erisir (staff `updateSupplier`'da role check'te reddedilir) | `NOT RUN` | |
| A5-14b | `[NON-BLOCKER]` | Open-order supplier deactivate DB katmaninda korunmuyor | Supabase SQL/service-role ile acik siparisi olan supplier'i `is_active=false` UPDATE dene | UPDATE basarili olur (DB constraint/trigger yok). Bilinen mimari sinir: koruma yalnizca uygulama katmaninda; service role erisenler zaten trusted | `NOT RUN` | |
| A5-15 | `[NON-BLOCKER]` | Checklist audit loglari yazilir | create, complete, export, reopen islemleri yap | `audit_log`'da `checklist_created`, `checklist_completed`, `checklist_exported`, `checklist_reopened` kayitlari bulunur | `NOT RUN` | |
| A5-16 | `[NON-BLOCKER]` | Order ve supplier audit loglari yazilir | order create/status/deliver, supplier create/deactivate islemleri yap | `audit_log`'da `order_created`, `order_status_changed`, `order_delivered`, `supplier_created`, `supplier_deactivated` kayitlari bulunur | `NOT RUN` | |
| A5-17 | `[BLOCKER]` | ISO week sinir durumu dogru | Aralik sonu / Ocak basi tarihinde checklist olustur (ornek: 29 Aralik 2025 = ISO 2026-W01) | `iso_year` ve `iso_week` beklenen ISO 8601 degerleri alir | `NOT RUN` | |
| A5-18 | `[NON-BLOCKER]` | Performance sanity | 126 item checklist ile normal kullanim | Sayfa yukleme kabul edilebilir; autosave debounce (~600ms) ve internal-navigation best-effort flush calisir; duplicate write gorunmez | `NOT RUN` | |
| A5-19 | `[BLOCKER]` | Deaktive kullanici mutation testi | 1) Aktif kullanici ile login yap. 2) Supabase SQL ile `profiles` tablosunda `is_active = false` yap. 3) Server Action cagir (checklist item update, order create, vb.) | `getActiveProfile()` null doner, istek reddedilir; deaktive kullanici mutation yapamaz | `NOT RUN` | |
| A5-19b | `[BLOCKER]` | Deaktive kullanici sayfa erisim testi | Deaktive kullanici (A5-19 devami) dashboard, checklist, orders, suppliers sayfalarini ac | Kullanici `/deactivated` sayfasina yonlenir; uygulama sayfalari ve veri render edilmez | `NOT RUN` | |
| A5-20 | `[NON-BLOCKER]` | Deaktive kullanici sonrasi yeniden login denemesi | Deaktive kullanici logout edip tekrar login yapar | Login olabilir ama uygulamaya girince `/deactivated` sayfasina yonlenir; mutation ve veri erisimi yapamaz | `NOT RUN` | |

---

## FAZ B: Pilot Kullanim (1-2 guvenilir kullanici, 1-2 hafta)

Amac: Gercek kullanicilarla dusuk riskli pilot yapip, kafa karisikligi ve operasyonel eksikleri ortaya cikarmak.

### FAZ B On Kosullar (8 madde)

| ID | Oncelik | On Kosul | Veri / Kurulum | Beklenen Sonuc | Durum | Not |
|----|---------|----------|----------------|----------------|-------|-----|
| B-P01 | `[BLOCKER]` | Faz A tum BLOCKER maddeleri PASS | Faz A checklist | Acik BLOCKER kalmaz | `NOT RUN` | |
| B-P02 | `[BLOCKER]` | HTTPS deploy hazir | Vercel veya staging domain | Pilot kullanicilar erisebilir | `NOT RUN` | |
| B-P03 | `[BLOCKER]` | Pilot admin + staff hesaplari hazir | Supabase Auth uzerinden 1-2 guvenilir kullanici olusturuldu | Hesaplar login yapabiliyor, cihazlar hazir | `NOT RUN` | |
| B-P04 | `[NON-BLOCKER]` | Ilk veri seti gercege yakin | Supplier mapping, seed accuracy gozden gecirildi | Pilot anlamli veriyle yapilir | `NOT RUN` | |
| B-P05 | `[NON-BLOCKER]` | Feedback kanali hazir | Form, chat, sheet veya issue board | Tespitler kaybolmaz | `NOT RUN` | |
| B-P06 | `[BLOCKER]` | Destek / rollback penceresi planli | Ilk 1-2 hafta owner belirli | Sorunda hizli donus mumkun | `NOT RUN` | |
| B-P07 | `[NON-BLOCKER]` | Password reset / account recovery proseduru yazili | Dokumante edilmis runbook | Kullanici sifre unutursa ne yapilacagi, kim yapacagi net. Supabase Dashboard uzerinden sifirlama adimlari yazili | `NOT RUN` | |
| B-P08 | `[BLOCKER]` | Staging ve production env ayrilmis (Faz B prod'a deploy ise) | Env degiskenleri kontrolu | Staging ve prod farkli Supabase project'e bakar; pilot test verileri prod'a karismaz | `NOT RUN` | |

### Session B1: Onboarding (7 test)

| ID | Oncelik | Test | Veri | Beklenen Sonuc | Durum | Not |
|----|---------|------|------|----------------|-------|-----|
| B1-01 | `[BLOCKER]` | Pilot admin ilk login | Supabase Auth'ta olusturulmus admin kullanici | Yardimsiz giris yapabilir, dashboard acilir | `NOT RUN` | |
| B1-02 | `[BLOCKER]` | Pilot staff farkli cihazdan login | Staff kullanici, ikinci cihaz/browser | Session ve temel ekranlar calisir | `NOT RUN` | |
| B1-03 | `[NON-BLOCKER]` | Navigasyon anlasilabilirligi | Kullaniciya gorev ver: "Kontrol listesi ac" | 5 dakika icinde checklist ve orders bulunur | `NOT RUN` | |
| B1-04 | `[NON-BLOCKER]` | Role mantigi anlasilir | Admin + staff ayrimi | Kim ne yapabilir sorusu net cevaplanir | `NOT RUN` | |
| B1-05 | `[NON-BLOCKER]` | Mobil ilk izlenim kabul edilebilir | 390px veya 414px gercek cihaz | Kullanici temel akisi zorlanmadan kullanir | `NOT RUN` | |
| B1-06 | `[NON-BLOCKER]` | Onboarding sorunlari kaydedilir | Ekran goruntusu / not | Her kafa karisiklik noktasi kayda gecer | `NOT RUN` | |
| B1-07 | `[NON-BLOCKER]` | Gercek cihaz matrisi testi | iPhone Safari + Android Chrome + Desktop Chrome/Edge | Her cihaz/browser'da en az 1 tam akis (checklist olustur -> stok gir -> tamamla -> siparis olustur) sorunsuz tamamlanir | `NOT RUN` | |

### Session B2: Gercekci Haftalik Dongu (13 test)

| ID | Oncelik | Test | Veri | Beklenen Sonuc | Durum | Not |
|----|---------|------|------|----------------|-------|-----|
| B2-01 | `[BLOCKER]` | Haftalik checklist olusturulur | Pilot hafta | Checklist acilir, dogru KW numarasi | `NOT RUN` | |
| B2-02 | `[BLOCKER]` | 20+ temsilci item girilir | Icecek, dondurulmus, kg, min-max urunler | Veri girisi rahat ve dogru olur | `NOT RUN` | |
| B2-03 | `[NON-BLOCKER]` | En az 1 item manuel missing olarak isaretlenir | `Pommesbox` veya benzeri | `F` toggle mantigi anlasilir ve uygulanir | `NOT RUN` | |
| B2-04 | `[BLOCKER]` | Checklist tamamlanir | Tum itemlar gerekli kosullarda | Completed olur | `NOT RUN` | |
| B2-05 | `[BLOCKER]` | Suggestions uretilir | Completed checklist | Supplier bazli oneriler olusur | `NOT RUN` | |
| B2-06 | `[BLOCKER]` | En az 1 mapped supplier suggestion finalize edilir | Preferred supplier | Checklist-side ordered capture kaydolur ve supplier bagli `ordered` order olusur | `NOT RUN` | |
| B2-07 | `[NON-BLOCKER]` | En az 1 unassigned urun gorulur | Mapping'siz urun | `Nicht zugeordnet` grubunda gorunur | `NOT RUN` | |
| B2-08 | `[BLOCKER]` | En az 1 draft order `ordered` yapilir | Arkaplanda veya manuel olusmus draft order | Status `ordered` olur | `NOT RUN` | |
| B2-09 | `[BLOCKER]` | Kismi teslimat islenir | Siparis kalemlerinin bir kismi | `partially_delivered` olur | `NOT RUN` | |
| B2-10 | `[BLOCKER]` | Tam teslimat islenir | Tum kalemler delivered | `delivered` olur | `NOT RUN` | |
| B2-11 | `[BLOCKER]` | Export kullanilir | Completed checklist | Dosya indirilir ve paylasilabilir | `NOT RUN` | |
| B2-12 | `[BLOCKER]` | Manuel surecle karsilastirma | Mevcut haftalik proses (kagit/Excel) | Kritik veri farki cikmaz; farklar kayit altina alinir | `NOT RUN` | |
| B2-13 | `[NON-BLOCKER]` | Uzun session calismasi / token refresh | 1+ saat acik tab, sonra checklist item guncelle veya order olustur | Token refresh calisiyor; session dusmez; re-login gerekmez. Islem basariyla tamamlanir | `NOT RUN` | |

### Session B3: Geri Bildirim Toplama (9 soru)

| ID | Oncelik | Soru | Veri | Beklenen Sonuc | Durum | Not |
|----|---------|------|------|----------------|-------|-----|
| B3-01 | `[NON-BLOCKER]` | En zor adim neydi? | Pilot kullanici yorumu | Somut sikinti noktasi yazilir | `NOT RUN` | |
| B3-02 | `[NON-BLOCKER]` | Hangi terimler kafa karistirdi? | UI metinleri | Duzenlenecek etiketler belirlenir | `NOT RUN` | |
| B3-03 | `[NON-BLOCKER]` | Eksik ozellik var mi? | Serbest geri bildirim | Talep listesi olusur | `NOT RUN` | |
| B3-04 | `[NON-BLOCKER]` | Hangi veri yanlis / eksik geldi? | Order suggestions, archive, export | Veri hatalari listelenir | `NOT RUN` | |
| B3-05 | `[NON-BLOCKER]` | Performans yavas hissettirdi mi? | Sayfa / aksiyon bazli | Sikinti noktasi ve cihaz bilgisi kayit edilir | `NOT RUN` | |
| B3-06 | `[NON-BLOCKER]` | Hangi cihaz / browser kullanildi? | Kullanici bilgisi | Uyumsuzluk kaynaklari belirlenir | `NOT RUN` | |
| B3-07 | `[NON-BLOCKER]` | Uygulamaya ne kadar guveniyorsunuz? (1-10) | Puan | Guven skoru kaydedilir | `NOT RUN` | |
| B3-08 | `[NON-BLOCKER]` | Gercek is akisinda kullanir misiniz? | Evet/Hayir + neden | Adoption sinyali olusur | `NOT RUN` | |
| B3-09 | `[BLOCKER]` | Go-live blocker goruyor musunuz? | Evet/Hayir + aciklama | Kritik issue varsa acikca listelenir; Evet ise go-live FAIL | `NOT RUN` | |

---

## FAZ C: Gercek Is Akisinda Kullanim (2-4 hafta, paralel)

Amac: Mevcut manuel surecle paralel, kontrollu gercek kullanim yapip go/no-go karari vermek.

### FAZ C On Kosullar (8 madde)

| ID | Oncelik | On Kosul | Veri / Kurulum | Beklenen Sonuc | Durum | Not |
|----|---------|----------|----------------|----------------|-------|-----|
| C-P01 | `[BLOCKER]` | Faz B kritik feedback kapatildi | Pilot issue listesi | Acik BLOCKER konu kalmaz | `NOT RUN` | |
| C-P02 | `[BLOCKER]` | En az 1-2 temiz pilot hafta var | Pilot kayitlari | Veri kaybi veya ciddi hata yok | `NOT RUN` | |
| C-P03 | `[BLOCKER]` | Monitoring erisimi hazir | Audit log, Vercel logs | Izleme aktif; sorumlu kisi belirli | `NOT RUN` | |
| C-P04 | `[BLOCKER]` | Rollback plani sahipli ve test edilmis | Sorumlu kisiler + geri donus adimlari | Dry run yapilmis; Vercel'de onceki deployment'a promote adimlari biliniyor | `NOT RUN` | |
| C-P05 | `[NON-BLOCKER]` | Golge mod takvimi onayli | 2-4 haftalik plan | Paralel kullanim duzenli ilerler | `NOT RUN` | |
| C-P06 | `[BLOCKER]` | Backup ve restore drill tamamlandi | Supabase DB backup | Backup tarihi, restore edilen ortam, sorumlu kisi ve restore suresi kayitli; en az 1 kez staging'de restore denenmis | `NOT RUN` | |
| C-P07 | `[BLOCKER]` | Test data cleanup | Production DB kontrolu | Test supplier, test order, test user kalintilari temizlenmis; veya staging/prod ayirimi korunmus | `NOT RUN` | |
| C-P08 | `[NON-BLOCKER]` | Master data degisiklik proseduru yazili | Runbook dokumani | Supabase Dashboard uzerinden urun ekleme/cikarma, min_stock guncelleme, kullanici rolu degistirme, aktif/pasif yapma adimlari yazili; sorumlu kisi belirli | `NOT RUN` | |

### Session C1: Golge Mod (6 test)

| ID | Oncelik | Test | Veri | Beklenen Sonuc | Durum | Not |
|----|---------|------|------|----------------|-------|-----|
| C1-01 | `[BLOCKER]` | Ayni hafta manuel vs app checklist karsilastirmasi | Gercek hafta verisi | Item sayisi ve doldurulan kalemler uyusur | `NOT RUN` | |
| C1-02 | `[BLOCKER]` | Manuel missing isaretleri ve oneriler manuel surecle uyumlu | 10+ temsilci urun | Kritik sapma cikmaz | `NOT RUN` | |
| C1-03 | `[BLOCKER]` | Order onerileri manuel siparislerle uyumlu | Ayni hafta siparisleri | Kabul edilebilir fark disinda sapma olmaz | `NOT RUN` | |
| C1-04 | `[BLOCKER]` | Delivery kayitlari manuel teslimlerle uyumlu | Gercek teslimatlar | Status ve adetler dogru yansir | `NOT RUN` | |
| C1-05 | `[NON-BLOCKER]` | Export operasyonel olarak kullanisli | Gercek export dosyalari | Ekip tarafindan okunabilir ve paylasilabilir | `NOT RUN` | |
| C1-06 | `[BLOCKER]` | Tum farklar loglanir | Gunluk discrepancy log | Farklar siniflandirilmis olarak kayda gecer (urun, fark miktari, olasi sebep) | `NOT RUN` | |

### Session C2: Izleme (5 test)

| ID | Oncelik | Test | Veri | Beklenen Sonuc | Durum | Not |
|----|---------|------|------|----------------|-------|-----|
| C2-01 | `[BLOCKER]` | Audit log haftalik izleniyor | `audit_log` tablosu | Kritik aksiyonlar (create, complete, order, export) eksiksiz gorunur; beklenmedik islem yok | `NOT RUN` | |
| C2-02 | `[BLOCKER]` | Vercel / server loglari temiz | Vercel Dashboard > Functions > Logs | Tekrarlayan 5xx, auth hatasi veya RPC hatasi yok | `NOT RUN` | |
| C2-03 | `[NON-BLOCKER]` | Auth problemleri izleniyor | Supabase Auth logs | Kullanici bloklayan auth sorunu yok (expired sessions, failed logins) | `NOT RUN` | |
| C2-04 | `[NON-BLOCKER]` | Adoption metrikleri izleniyor | Haftalik checklist/order/export sayilari | Gercek kullanim artisi gorunur | `NOT RUN` | |
| C2-05 | `[NON-BLOCKER]` | Anomali / hotfix sureci olculuyor | Issue / fix kayitlari | Tespit -> cozum suresi makul seviyede | `NOT RUN` | |

### Session C3: Go / No-Go Karar Listesi (12 kriter)

| ID | Oncelik | Kriter | Veri | Beklenen Sonuc | Durum | Not |
|----|---------|--------|------|----------------|-------|-----|
| C3-01 | `[BLOCKER]` | Faz A tum BLOCKER maddeleri PASS | Faz A kayitlari | Tamam | `NOT RUN` | |
| C3-02 | `[BLOCKER]` | Kritik bug yok | Bug listesi | Acik Sev1/Sev2 issue yok | `NOT RUN` | |
| C3-03 | `[BLOCKER]` | Pilot kullanicilar devam etmeye istekli | B3 geribildirimi | Net red yok; B3-09 PASS | `NOT RUN` | |
| C3-04 | `[BLOCKER]` | Golge mod farklari kabul edilebilir | C1 discrepancy log | Kritik farklar kapatildi veya sebebi aciklandi | `NOT RUN` | |
| C3-05 | `[BLOCKER]` | Admin ve staff egitimi tamam | Kullanim kilavuzu / demo | Temel akislarda dis destek ihtiyaci dusuk | `NOT RUN` | |
| C3-06 | `[BLOCKER]` | Supplier mapping ve seed yeterince dogru | Gercek operasyon verisi ile karsilastirma | Siparis onerileri guvenilir; gercek ihtiyaclarla uyumlu | `NOT RUN` | |
| C3-07 | `[BLOCKER]` | Rollback plani test edildi | Dry run veya dokumante deneme | Geri donus adimlari net ve uygulanabilir | `NOT RUN` | |
| C3-08 | `[NON-BLOCKER]` | Backup / export yolu biliniyor | Ops owner | Veri cikarma yolu net | `NOT RUN` | |
| C3-09 | `[BLOCKER]` | Ilk hafta incident owner atanmis | Sorumlu kisi listesi | Incident owner, log bakma sorumlusu ve rollback karar vericisi belirli; ilk 48 saat izleme sorumlulusu atanmis | `NOT RUN` | |
| C3-10 | `[BLOCKER]` | Izleme log listesi tanimli | Monitoring plani | Izlenecek loglar net: audit_log, Supabase Auth logs, Vercel runtime logs | `NOT RUN` | |
| C3-11 | `[BLOCKER]` | Rollback tetikleyicileri tanimli | Yazili kriterler | Rollback kosullari yazili: tekrarlayan 5xx, login bloklandi, veri tutarsizligi, export hatasi | `NOT RUN` | |
| C3-12 | `[BLOCKER]` | Yazili go-live onayi verildi | Admin / owner karari | Asagidaki karar tablosunda secim yapildi | `NOT RUN` | |

---

## Final Karar

| Secim | Tanim | Kosul |
|-------|-------|-------|
| **GO** | Kagit/Excel sureci sonlandirilir; uygulama birincil sistem olur | Tum `[BLOCKER]` kriterler (C3-01 ~ C3-12) `PASS`; acik `[NON-BLOCKER]` FAIL sayisi ≤ 3 ve hicbiri veri butunlugu ile ilgili degil |
| **GO WITH LIMITATIONS** | Uygulama canli ama belirli kisitlamalarla kullanilir | Tum `[BLOCKER]` kriterler `PASS`; 4-8 `[NON-BLOCKER]` FAIL var ama hicbiri veri veya auth ile ilgili degil; kisitlamalar yazili ve kullanicilara bildirilmis |
| **NO-GO** | Uygulama canli kullanima uygun degil; once duzeltme gerekli | Herhangi bir `[BLOCKER]` kriter `FAIL`; veya 9+ `[NON-BLOCKER]` FAIL; veya veri butunlugu / auth ile ilgili `[NON-BLOCKER]` FAIL var |

| Alan | Deger |
|------|-------|
| Karar | |
| Tarih | |
| Karar veren | |
| Kisitlamalar (GO WITH LIMITATIONS ise) | |
| Sonraki adimlar (NO-GO ise) | |

---

## Kabul Edilebilir Bilinen Sinirlamalar

Bu maddeler tek basina go-live bloklamaz; ancak owner tarafindan bilincli olarak kabul edilmelidir.

1. **Supabase type infrastructure**: `src/types/supabase.ts` otomatik uretilmemis; manual type tanimlari (`src/types/database.ts`) kullaniliyor. Runtime'da dogru calisiyor.
2. **`transform.ts` any cast**: 3 adet `any` cast mevcut; Supabase `!inner` join type inference workaround. Unit testlerle dogrulandi.
3. **Integration testler mock**: Gercek DB interaction'lari test edilmedi; Faz A manual testlerle kapsamli dogrulama yapilacak.
4. **Real-time sync yok**: Birden fazla kullanici ayni anda calisirsa sayfa yenilemesi gerekir. Kucuk takim + haftalik dongu icin kabul edilebilir.
5. **Product/user admin UI yok**: Degisiklikler Supabase Dashboard uzerinden yapilir (C-P08 runbook'a bakiniz).
6. **PWA / offline destek yok**: Internet baglantisi gerekli.
7. **E2E test otomasyonu yok**: Faz A manual testlerle kapsamli dogrulama yapilacak.
8. **Down migration yok**: Supabase migration geri alinamaz; duzeltme yeni migration ile yapilir.
9. **Staff supplier mapping read erisimi server tarafinda kapali**: `getSupplierProducts` / `getAvailableProducts` Server Action'larinda admin role check vardir; UI gizleme ek savunma hattidir.
10. **Deaktive kullanici app erisimi bloklu**: App layout ve export route aktif profile zorlar; deaktive kullanici `/deactivated` sayfasina yonlenir.

## Go-Live Oncesi ZORUNLU Duzeltmeler

Bu maddeler tamamlanmadan gercek kullanim baslatilmasin.

1. Gercek Supabase baglantisi kurulup migrations ve env dogrulansin.
2. Seed verisinin operasyonel dogrulugu kontrol edilsin; eksik/yanlis urunler temizlensin.
3. Supplier verisi ve product mapping'leri olusturulsun (seed'de yok; manuel gerekli).
4. Preferred supplier atamalari tamamlansin (tum kritik urunlerin preferred supplier'i olsun).
5. Auth provisioning modeli kararlastirilsin ve dokumante edilsin (A-P04c).
6. Production'da public signup OFF yapilsin veya acik olmasinin nedeni yazili olsun (A-P04d).
7. Supabase email confirmation ayari kontrol edilsin; login'i bloklamayacak sekilde ayarlansin (A-P04b).
8. Faz A icindeki tum `[BLOCKER]` maddeler `PASS` olmadan Faz B/C veya go-live baslatilmasin.

## Faz Sonu Karar Kurali

1. **Kod degisikligi kurali**: Herhangi bir faz sirasinda kod, migration, env veya config degisirse sonraki faza gecmeden once `type-check`, `lint`, `test` ve `build` yeniden calistirilmalidir.
2. **Faz A sonunda**: Her `[BLOCKER]` madde `PASS` ise Faz B'ye gec.
3. **Faz B sonunda**: Pilot kullanicilar net blocker bildirmiyor (B3-09 PASS) ve veri dogrulugu kabul edilebilir ise Faz C'ye gec.
4. **Faz C sonunda**: Go/No-Go kriterlerinden (C3-01 ~ C3-12) `[BLOCKER]` olanlar `PASS` ise Final Karar tablosunu doldur.
5. **Herhangi bir fazda**: Kritik veri kaybi, auth problemi, yanlis siparis onerisi veya yetki acigi cikarsa `NO-GO` karari ver ve once duzelt.
6. **Ilk canli hafta feature freeze**: Go-live sonrasi ilk hafta yalnizca BLOCKER fix yapilir; yeni ozellik eklenmez.
7. **Rollback tetikleyicileri**: Asagidaki durumlardan herhangi biri olusursa manuel surece geri don:
   - Tekrarlayan 5xx hatalari (ayni endpoint'te 3+ kez)
   - Login tamamen bloke (kullanicilar giris yapamiyor)
   - Veri tutarsizligi (checklist/order verileri kayip veya bozuk)
   - Export hatasi (Excel dosya uretilemiyor)
