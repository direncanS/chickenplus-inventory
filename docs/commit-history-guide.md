# Chickenplus Inventory — commit geçmişi rehberi

**Dönem:** 30 Haziran–12 Ekim 2026 · **Kaynak:** `main`, `11903c9`

Bu takvim, mevcut geliştirmeleri anlamlı teslimatlar halinde düzenleyen bir öneridir; gerçek çalışma tarihlerini göstermez. Kaynak commitlerin tarihleri 15 Şubat–10 Ekim 2026 arasındadır. Bu rehber Git geçmişini değiştirmez.

## Önerilen teslimat sırası

Her satır tek bir amacı temsil eder. Aynı amaca ait takip düzeltmeleri o teslimatın kapsamına dahil edilmiştir. Kaynak sütunu mevcut işi incelemek içindir; önerilen commitlerle bire bir eşleşmek zorunda değildir.

| Önerilen tarih | Commit mesajı | Kapsam | Kaynak |
| --- | --- | --- | --- |
| 30.06.2026 | `feat: set up inventory app with authentication and database` | Uygulama iskeleti, oturum modeli, veritabanı şeması, temel ekranlar ve kurulum doğrulaması. | `da4d832`, `e76afba`, `b9b8c10`, `c1c9eca`, `4ee9453` |
| 04.07.2026 | `fix: validate sessions and checklist actions consistently` | Kimlik doğrulama ve kontrol listesi işlemlerindeki ilk güvenilirlik düzeltmeleri. | `0d2da49` |
| 08.07.2026 | `feat: add inventory reports with period selection` | Dönem seçimi, rapor metrikleri, grafikler ve rapor içgörüleri. | `edf68b9`, `2bdc32f` |
| 13.07.2026 | `feat: complete checklists and track resulting orders` | Kontrol tamamlama, sipariş önerilerine geçiş ve oluşan siparişlerin takibi. | `ce1f7ad` |
| 17.07.2026 | `feat: manage inventory checks by calendar week` | Günlük modelden haftalık modele geçiş, haftaya bağlı dashboard akışı ve hafta düzeltmeleri. | `63981a5`, `d31ed9e`, `d5c6199`, `5af5ef6` |
| 22.07.2026 | `feat: group products by supplier and flag missing mappings` | Ürün–tedarikçi eşleştirmeleri, sipariş gruplaması ve eksik eşleştirmelerin görünürlüğü. | `85eba0b`, `08478b8` |
| 27.07.2026 | `feat: add packaging products to active checklists` | Bowl ve kapak ürünlerinin kataloğa eklenmesi; açık listelerin yeni ürünlerle tamamlanması. | `b309ab1`, `4152b66` |
| 31.07.2026 | `feat: schedule recurring orders on a calendar` | Rutin sipariş takvimi ve tekrar eden siparişlerin yönetimi. | `ccc9b1b` |
| 05.08.2026 | `feat: make checklist and order screens usable on mobile` | İlk mobil yerleşim, daha kompakt satırlar ve sipariş ekranındaki temel düzenlemeler. | `41b6b87` |
| 10.08.2026 | `feat: manage products and their stock settings` | Ürün ekleme/düzenleme, aktiflik durumu ve ürün ayarlarının listelere yansıması. | `cfdd8d5` |
| 14.08.2026 | `fix: preserve stock notes in order suggestions` | Serbest metin stok notlarının ve önerilen sipariş miktarlarının doğru işlenmesi. | `04ae45d` |
| 19.08.2026 | `feat: organize order review and fulfilment actions` | Sipariş çalışma ekranı; inceleme ve işlem durumlarının tek akışta yönetimi. | `52b4391` |
| 24.08.2026 | `feat: prepare supplier order messages for sharing` | Tedarikçiye göre paylaşılabilir sipariş metinlerinin hazırlanması. | `d52d8dc` |
| 28.08.2026 | `feat: filter checklist products quickly` | Güncel listedeki ürünlere hızlı ulaşmayı sağlayan filtreleme akışı. | `14bb058` |
| 02.09.2026 | `feat: browse archived checklists with filters` | Geçmiş kayıtlar arasında seçim ve arşiv filtreleri. Güncel liste filtrelerinden ayrı bir kullanım akışı. | `e1329ec` |
| 07.09.2026 | `feat: show recent inventory activity` | Yapılan işlemleri takip etmek için etkinlik zaman çizelgesi. | `4751f17` |
| 12.09.2026 | `fix: make checklist editing resilient to connection loss` | Bağlantı kesildiğinde düzenleme ve kaydetme akışının daha güvenilir olması. | `ce7c0d9` |
| 17.09.2026 | `feat: export inventory and order lists to Excel` | Sipariş önerilerinin stok bilgileriyle dışa aktarımı, markalı dosya düzeni ve kontrol listesinin Excel çıktısı. | `f3fc98f`, `9c4ad1b`, `71769f5` |
| 22.09.2026 | `perf: reduce data waterfalls and navigation refreshes` | Paralel veri sorguları, tekrar eden yenilemelerin kaldırılması, tedarikçi önbelleği, oturum bilgisinin yeniden kullanımı ve streaming sınırları. Altı ayrı performans adımı tek teslimatta toplanır. | `8e1eee7`, `4688279`, `aa48ed4`, `952f624`, `d5958cd`, `006e65f`, `7cfaba8` |
| 27.09.2026 | `feat: prioritize current inventory work on the dashboard` | Canlı sayılar, devam edilecek işin öne çıkarılması, hızlı erişim ve dashboard sadeleştirmeleri. Tekrarlanan dashboard düzenlemeleri tek başlıkta toplanır. | `3fddc99`, `765379a`, `9c4ad1b`, `0a63c99`, `97bee5a` |
| 02.10.2026 | `fix: handle database outages without trusting stale sessions` | Supabase erişilemediğinde oturum doğrulamasının güvenli davranması ve bekleme süresinin sınırlandırılması. | `2ab02a2` |
| 06.10.2026 | `feat: add mobile search and keyboard-aware stock entry` | Ürün arama, depo seçimi, tek ürün görünümü, Enter ile ilerleme ve klavye açıldığında alanın görünür kalması. Önceki mobil satır düzeninin üzerine gelen somut yeni işlevler. | `737b150` |
| 09.10.2026 | `refactor: unify inventory typography and page layouts` | Tipografi, renkler, sayfa hiyerarşisi, gezinme ve form düzenlerinin ortak bir görsel sistemde birleştirilmesi. Genel arayüz rötuşları ayrı commitler olarak tekrarlanmaz. | `58e3d71`, `64b9d9b` |
| 10.10.2026 | `fix: serve the brand logo without a login redirect` | Herkese açık logo dosyasının auth yönlendirmesine takılmaması; korumalı yolların korunması. | `3bcfa2d` |
| 12.10.2026 | `feat: reorganize storage locations and inventory products` | Üç ürünün depoya taşınması, üç yeni ürün, beş ürünün aktif katalogdan kaldırılması ve Mutfak bölümünün kapatılması. Ürün kimlikleri, tedarikçiler ve geçmiş kayıtlar korunur. | `2398838`; migration canlı veritabanına uygulandı. |
| 12.10.2026 | `fix: keep the missing-stock action clearly red in dark mode` | Seçili “Fehlt” için kırmızı dolgu, beyaz metin ve açık/koyu görünümde belirgin durum. Ürün veri değişikliğinden bağımsız bir arayüz düzeltmesi. | `58596ce`; `checklist-item-row.tsx`. |

## Commit sınırları

- Her commit, tek başına incelenebilir ve geri alınabilir bir değişiklik taşımalı. Gerekli test ve migration aynı değişikliğe dahil edilmeli.
- Aynı ekranın ardışık boşluk, renk veya başlık rötuşları ayrı teslimatlar olarak sayılmamalı. İlgili görsel sistem değişikliğinde birleştirilmeli.
- Aynı yavaşlık sorununa ait sorgu ve yenileme düzeltmeleri performans teslimatında toplanmalı. Ayrı bir commit ancak başka bir sorunu çözüyor ve ölçülebilir bir kapsam taşıyorsa kullanılmalı.
- `minor fixes`, `update`, `cleanup`, `final version` gibi kapsamı anlaşılmayan mesajlar kullanılmamalı.
- Merge, sürüm hazırlığı, üretim senkronizasyonu ve yalnızca kontrol noktası olan commitler bu takvimde yeni özellik gibi sayılmamalı.
- Takvimdeki boş günler doldurulmak zorunda değil. Boş commit veya değişikliksiz yeniden kaydetme yapılmamalı.

## Son iki teslimatın durumu

**Ürün düzenlemesi:** `supabase/seed.sql` ile `supabase/migrations/20261012205714_reorganize_inventory_locations.sql` birlikte değerlendirilir. Canlı veride üç yeni ürün ve üç taşıma doğrulandı; tamamlanan kontrol ve sipariş kayıtlarının sayıları korundu. Minimum stok ve birim belirtilmeyen yeni ürünlerde bu değerler boş bırakıldı.

**Fehlt düzeltmesi:** `src/components/checklist/checklist-item-row.tsx`. Birim testleri geçti; stok, eksik ve kontrol işaretlerinin bağımsız davranışı korundu.

Bu iki teslimat `2398838` ve `58596ce` commitleriyle kaydedildi. IBM Plex / Sütun düzeni ise yalnızca önizleme aşamasında; kaynak uygulamaya geçirilmeden tamamlanan iş olarak bu takvime eklenmedi.

## İnceleme ve kayıt

Kaynak kapsamını görmek için:

```powershell
git show --stat <kaynak-hash>
git show <kaynak-hash> -- <dosya-yolu>
```

Yeni bir değişikliği kaydederken:

```powershell
git diff
git add -p
git diff --cached
git diff --cached --check
git commit -m "Kapsamı açıklayan commit mesajı"
```

Commit mesajına araç etiketi, otomatik yazar eki veya gereksiz bir kapanış cümlesi eklenmemeli; mevcut yazar bilgisi kullanılmalı. Yeni commitler, gerçekten kaydedildikleri tarihle oluşturulmalı. Bu rehber bir push veya yayımlanmış geçmişi yeniden yazma işlemi içermez.
