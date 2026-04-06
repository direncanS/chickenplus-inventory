# Chickenplus Business Rules

## 1. Checklist Kurallari

### Olusturma
- Ayni anda yalnizca **1 aktif checklist** olabilir (draft veya in_progress)
- Her (iso_year, iso_week) cifti icin yalnizca **1 checklist** olusturulabilir
- Checklist olusturulurken tum aktif urunler **snapshot** olarak kopyalanir (min_stock, min_stock_max, product_name)
- Hafta hesaplamasi **ISO 8601** standardina goredir (Europe/Vienna timezone)
- Tum roller (admin + staff) checklist olusturabilir

### Status Gecisleri
```
draft ──[ilk item guncelleme]--> in_progress ──[tamamla]--> completed
                                                    |
                                          [yeniden ac (admin)]--> in_progress
```
- **draft → in_progress:** Ilk checklist item guncellemesinde otomatik
- **in_progress → completed:** Tum item'lar checked olmali; stock girisi opsiyoneldir
- **completed → in_progress:** Sadece admin (reopenChecklist)

### Item Guncelleme
- `current_stock` kullanici tarafindan girilir (>= 0 veya null)
- `missing_amount_calculated` **server tarafinda** hesaplanir: `max(0, min_stock - current_stock)`
- `missing_amount_final`:
  - Normal: `missing_amount_calculated` ile ayni
  - Override: Kullanici farkli bir deger girebilir (`is_missing_overridden = true`)
- Completed checklist'te guncelleme **yapilamaz**
- Auto-save pattern: `revalidatePath` cagirilmaz (performans icin)

### Tamamlama Kontrolleri
- **Tum item'lar** `is_checked = true` olmali
- `current_stock` tamamlamada zorunlu degildir; export ve raporlama verisi olarak kalir
- Checklist tamamlaninca siparis olusturma arkaplanda baslatilir; tamamlanma islemi bunu beklemez
- Eksik checked varsa hata doner, tamamlama kabul edilmez

## 2. Siparis Kurallari

### Siparis Onerileri
1. `missing_amount_final > 0` olan checklist item'lari alinir
2. Her urun icin **preferred supplier** aranir (`product_suppliers` tablosu, `is_preferred = true`)
3. Preferred supplier **aktif** degilse urun "Nicht zugewiesen" grubuna duser
4. Preferred supplier **yoksa** urun "Nicht zugewiesen" grubuna duser
5. Mevcut acik siparisler kontrol edilir (draft, ordered, partially_delivered)
6. Acik siparisi olan urunler `hasOpenOrder = true` olarak isaretlenir
7. Siparis miktari: `suggestedOrderQuantity(current_stock, min_stock, min_stock_max)`

### Siparis Numarasi
- Format: `ORD-{YYYY}-W{XX}-{SEQ}`
- Yil ve hafta: Checklist'in iso_year ve iso_week degerlerinden
- SEQ: O hafta icin siradaki numara (1'den baslar)
- Conflict retry loop ile benzersizlik garanti edilir

### Status Gecisleri
```
draft ──[siparis ver]--> ordered ──[teslimat]--> partially_delivered / delivered
  \                        |
   ──[iptal (admin)]──> cancelled <──[iptal (admin)]──/
```

- **draft → ordered:** Tum roller yapabilir
- **ordered → partially_delivered:** Bazi item'lar teslim edildiginde otomatik
- **ordered/partially_delivered → delivered:** Tum item'lar teslim edildiginde otomatik
- **draft/ordered/partially_delivered → cancelled:** Sadece admin
- **delivered → cancelled:** Yapilamaz
- **cancelled → herhangi biri:** Yapilamaz

### Teslimat
- Item bazinda teslimat takibi (`order_items.is_delivered`)
- Draft sipariste item bazinda opsiyonel `is_ordered` + `ordered_quantity` kaydi tutulabilir
- `quantity` onerilen miktardir; `ordered_quantity` gercek verilen miktari temsil eder
- `ordered_quantity` yalnizca `is_ordered = true` iken kaydedilir
- Tum item'lar teslim edildiginde `orders.delivered_at` set edilir
- Kismen teslim: status `partially_delivered` olur
- RPC fonksiyonu atomik guncelleme yapar

### Siparis Kisitlamalari
- Supplier **aktif** olmali
- En az **1 item** olmali
- Item quantity > 0
- Inactive supplier'a siparis olusturulamaz

## 3. Tedarikci Kurallari

### Yonetim
- Sadece **admin** tedarikci olusturabilir, duzenleyebilir, devre disi birakabilir
- Staff kullanicilari tedarikci listesini gorebilir ama duzenleyemez
- Tedarikci isimleri **unique** olmali

### Devre Disi Birakma
- Acik siparisi olan tedarikci devre disi birakilamaz
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
| Siparis verme (ordered) | Evet | Evet |
| Siparis iptal | Evet | Hayir |
| Teslimat guncelleme | Evet | Evet |
| Tedarikci CRUD | Evet | Hayir |
| Urun-tedarikci eslestirme | Evet | Hayir |
| Excel export | Evet | Evet |
| Audit log goruntuleme | Evet | Hayir |

### Yetki Uygulama Katmanlari
1. **Server Actions:** Birincil savunma hatti - auth + profile + role kontrolleri
2. **RLS Policies:** Ikincil savunma hatti - veritabani seviyesinde erisim kontrolu
3. **UI:** Yetkisiz islemler icin butonlar/bolumler render edilmez (ama guvenlik UI'da degil server'da)

## 5. Hesaplama Kurallari

### Eksik Miktar
```
missing_amount_calculated = max(0, min_stock_snapshot - current_stock)
```
- Her zaman server tarafinda hesaplanir
- Client'tan gelen deger kabul edilmez

### Siparis Miktari
```
target = min_stock_max_snapshot ?? min_stock_snapshot
suggested_quantity = max(0, target - current_stock)
```
- `min_stock_max` varsa hedef olarak kullanilir (stogu max seviyeye cikar)
- Yoksa `min_stock` hedef olarak kullanilir (stogu min seviyeye cikar)

### Override
- Kullanici `missing_amount_final` degerini manual olarak degistirebilir
- `is_missing_overridden = true` yapilir
- `missing_amount_calculated` her zaman hesaplanir ve saklanir (referans icin)

## 6. Export Kurallari

### Excel Export
- Dosya adi: `Bestandskontrolle_KWXX_YYYY.xlsx`
- Gruplama: Storage location → Category → Product
- Satirlar: Produkt, Einheit, Mindestbestand, Bestand, Fehlt, Kategorie
- Formula injection korunmasi: `=`, `+`, `-`, `@` ile baslayan degerler sanitize edilir
- Mindestbestand: `min_stock_max` varsa aralik olarak gosterilir (ornegin "5-10")

## 7. Audit Log
- Tum onemli islemler kaydedilir
- Kayitlar **degistirilemez** (immutable)
- Service role ile yazilir (RLS bypass)
- Sadece admin goruntuleyebilir
- Kaydedilen islemler:
  - checklist_created, checklist_completed, checklist_exported, checklist_reopened
  - order_created, order_status_changed, order_delivered
  - supplier_created, supplier_deactivated
  - admin_bootstrapped
