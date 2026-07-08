# Chickenplus Business Rules

## 1. Checklist Kurallari

### Olusturma
- Ayni anda yalnizca **1 aktif checklist** olabilir (`draft` veya `in_progress`)
- Her `(iso_year, iso_week)` cifti icin yalnizca **1 checklist** olusturulabilir
- Checklist olusturulurken tum aktif urunler **snapshot** olarak kopyalanir (`product_name`, `min_stock_snapshot`, `min_stock_max_snapshot`)
- Checklist tarihi kullanicidan gelir; hafta hesaplamasi **ISO 8601** standardina gore yapilir (Europe/Vienna)
- Tum roller (admin + staff) checklist olusturabilir

### Status Gecisleri
```text
draft -> [ilk item guncelleme] -> in_progress -> [tamamla] -> completed
                                              |
                                    [yeniden ac (admin)] -> in_progress
```

- **draft -> in_progress:** Ilk checklist item guncellemesinde otomatik
- **in_progress -> completed:** Tum item'lar checked olmali; stock girisi opsiyoneldir
- **completed -> in_progress:** Sadece admin (`reopenChecklist`)

### Item Guncelleme
- `current_stock` kullanici tarafindan **serbest metin** olarak girilir
- `is_missing` kullanici tarafindan `F` toggle'i ile manuel olarak isaretlenir
- `is_checked` kullanici tarafindan checkbox ile isaretlenir
- UI debounce'lu batch autosave kullanir; blur, complete, reopen ve internal navigation unmount anlarinda best-effort flush vardir
- Completed checklist'te guncelleme **yapilamaz**
- Auto-save pattern: `revalidatePath` cagirilmaz; narrow mutation response doner

### Tamamlama Kontrolleri
- **Tum item'lar** `is_checked = true` olmali
- `current_stock` tamamlamada zorunlu degildir; export ve arsiv verisi olarak kalir
- Checklist tamamlaninca siparis olusturma arkaplanda baslatilir; tamamlama istegi bunu beklemez
- Eksik checked varsa hata doner; tamamlama kabul edilmez

## 2. Siparis Kurallari

### Checklist Tamamlama Sonrasi Arkaplan Draft Siparisleri
1. Completed checklist'teki `is_missing = true` item'lar taranir
2. Her urun icin **aktif preferred supplier** aranir
3. Ayni checklist icin acik siparisi olmayan urunler supplier bazli gruplanir
4. Bu supplier gruplari icin arkaplanda **draft order** olusturulur
5. Preferred supplier'i olmayan veya inactive supplier'e bagli urunler arkaplan draft order'a girmez

### Siparis Onerileri
1. Orders sayfasi, en son checklist `draft`, `in_progress` veya `completed` durumunda olsa bile suggestion uretebilir
2. Suggestion kaynagi: `is_missing = true` ve `is_ordered = false` olan checklist item'lar
3. Ayni checklist icin acik order'da bulunan urunler suggestion'a tekrar girmez
4. Her urun icin **preferred supplier** aranir (`product_suppliers.is_preferred = true`)
5. Preferred supplier **aktif** degilse veya yoksa urun `Nicht zugeordnet` grubuna duser
6. Suggestion quantity/placeholder degeri `min_stock_max_snapshot ?? min_stock_snapshot ?? 1` hedefinden turetilir ve pozitif tam sayiya yuvarlanir; mevcut stock farkindan hesaplanmaz
7. Suggestion group `Abschliessen` akisi:
   - Supplier bagliysa checklist-side ordered capture kaydi + gercek `ordered` order olusturma atomik olarak birlikte yapilir
   - `Nicht zugeordnet` grubunda supplier order yaratilmadan sadece checklist-side ordered capture kaydi tutulur

### Siparis Numarasi
- Format: `ORD-{YYYY}-W{XX}-{SEQ}`
- Yil ve hafta: Checklist'in `iso_year` ve `iso_week` degerlerinden
- `SEQ`: O hafta icin siradaki numara (1'den baslar)
- Conflict retry loop ile benzersizlik garanti edilir

### Status Gecisleri
```text
draft -> [siparis ver] -> ordered -> [teslimat] -> partially_delivered / delivered
  \                      |
   -> [iptal (admin)] -> cancelled <- [iptal (admin)] <-/
```

- **draft -> ordered:** Tum roller yapabilir
- **ordered -> partially_delivered:** Bazi item'lar teslim edildiginde otomatik
- **ordered/partially_delivered -> delivered:** Tum item'lar teslim edildiginde otomatik
- **draft/ordered/partially_delivered -> cancelled:** Sadece admin
- **delivered -> cancelled:** Yapilamaz
- **cancelled -> herhangi biri:** Yapilamaz

### Teslimat ve Gercek Siparis Miktari
- Item bazinda teslimat takibi (`order_items.is_delivered`)
- Draft sipariste item bazinda opsiyonel `is_ordered` + `ordered_quantity` kaydi tutulabilir
- `quantity` onerilen miktardir; `ordered_quantity` gercek verilen miktari temsil eder
- `ordered_quantity` yalnizca `is_ordered = true` iken kaydedilir; UI tarafinda bos veya pozitif tam sayi olarak kullanilir
- Tum item'lar teslim edildiginde `orders.delivered_at` set edilir
- Kismen teslim: status `partially_delivered` olur
- Delivery RPC'si item bazli guncellemeyi atomik yapar

### Siparis Kisitlamalari
- Supplier **aktif** olmali
- En az **1 item** olmali
- Item `quantity > 0` olmali
- Inactive supplier'a siparis olusturulamaz

## 3. Tedarikci Kurallari

### Yonetim
- Sadece **admin** tedarikci olusturabilir, duzenleyebilir, devre disi birakabilir
- Staff kullanicilari tedarikci listesini gorebilir ama duzenleyemez
- Tedarikci isimleri **unique** olmali

### Devre Disi Birakma
- Acik siparisi olan tedarikci uygulama katmaninda devre disi birakilamaz
- Inactive tedarikci siparis hedefi olamaz
- Inactive tedarikci product-supplier mapping UI'inda gorunmez

### Urun-Tedarikci Eslestirme
- Bir urun **birden fazla** tedarikciye atanabilir (many-to-many)
- Her urun icin yalnizca **1 preferred supplier** olabilir
- Yeni preferred secildiginde eski preferred otomatik duser
- Sadece **aktif** urunler ve **aktif** tedarikciler eslestirilebilir
- Eslestirme yonetimi sadece admin icin gorunur ve erisilebilir

## 4. Yetki Kurallari

### Rol Tanimi
| Islem | Admin | Staff |
|-------|-------|-------|
| Checklist olusturma | Evet | Evet |
| Checklist item guncelleme | Evet | Evet |
| Checklist tamamlama | Evet | Evet |
| Checklist yeniden acma | Evet | Hayir |
| Siparis olusturma | Evet | Evet |
| Siparis verme (`ordered`) | Evet | Evet |
| Siparis iptal | Evet | Hayir |
| Teslimat guncelleme | Evet | Evet |
| Tedarikci CRUD | Evet | Hayir |
| Urun-tedarikci eslestirme | Evet | Hayir |
| Excel export | Evet | Evet |
| Audit log goruntuleme | Evet | Hayir |

### Yetki Uygulama Katmanlari
1. **Server Actions:** Birincil savunma hatti - auth + profile + role kontrolleri
2. **RLS Policies:** Ikincil savunma hatti - veritabani seviyesinde erisim kontrolu
3. **UI:** Yetkisiz islemler icin butonlar/bolumler render edilmez (guvenlik UI'da degil server'da uygulanir)

## 5. Hesaplama Kurallari

### Checklist Missing Durumu
- Kullanici her item icin `F` toggle'i ile `is_missing` degerini manuel belirler
- Mevcut checklist ekraninda numeric missing hesaplamasi yapilmaz
- Legacy `missing_amount_*` alanlari veritabaninda kalmis olabilir, ancak checklist davranisinin kaynagi artik `is_missing` boolean'idir

### Suggestion Quantity / Placeholder
```text
target = min_stock_max_snapshot ?? min_stock_snapshot ?? 1
suggested_quantity = ceil(target), minimum 1
```

- Bu deger Orders suggestion ve bazi draft-order alanlarinda placeholder/onerilen miktar olarak kullanilir
- Mevcut implementasyonda current stock farki hesaba katilmaz

### Gercek Siparis Miktari
- Draft order item'larinda ve suggestion-finalize akisinda operator opsiyonel `ordered_quantity` girebilir
- Girilirse pozitif tam sayi olmalidir
- Girilmezse `null` kalabilir; yine de `is_ordered = true` kaydi tutulabilir

## 6. Export Kurallari

### Excel Export
- Dosya adi: `Bestandskontrolle_KWXX_YYYY.xlsx`
- Gruplama: Storage location -> Category -> Product
- Satirlar: `Produkt`, `Einheit`, `Mindestbestand`, `Bestand`, `Fehlt`, `Kategorie`
- `Fehlt` kolonu numeric deger degil, `Ja` / `Nein` olarak export edilir
- Formula injection korunmasi: `=`, `+`, `-`, `@` ile baslayan degerler sanitize edilir
- `Mindestbestand`: `min_stock_max` varsa aralik olarak gosterilir (ornegin `5-10`)

## 7. Audit Log
- Tum onemli islemler kaydedilir
- Kayitlar **degistirilemez** (immutable)
- Service role ile yazilir (RLS bypass)
- Sadece admin goruntuleyebilir
- Kaydedilen baslica islemler:
  - `checklist_created`, `checklist_completed`, `checklist_exported`, `checklist_reopened`
  - `order_created`, `order_status_changed`, `order_delivered`
  - `supplier_created`, `supplier_deactivated`
  - `admin_bootstrapped`
