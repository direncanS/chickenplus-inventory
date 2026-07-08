# Deployment Guide

## Prerequisites

- **Node.js** 20+ (LTS)
- **Supabase** projesi (hosted veya self-hosted)
- **Vercel** hesabi (onerilen) veya Node.js destekli hosting

## Environment Variables

| Degisken | Aciklama | Nerede |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Client + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Server only |

## Deploy Adimlari

### 1. Supabase Hazirlik

```bash
# Supabase CLI ile migration uygula
npx supabase link --project-ref <project-ref>
npx supabase db push

# Seed data yukle (sadece ilk deploy)
# Supabase Dashboard > SQL Editor > seed.sql icerigini calistir
```

**Kontrol:** Migration sonrasi public SQL function setinin guncel oldugunu dogrula:
- `rpc_bootstrap_admin`
- `rpc_create_checklist_with_snapshot`
- `rpc_create_order_with_items`
- `rpc_update_order_delivery`
- `rpc_update_order_items_ordered`
- `rpc_update_checklist_items_batch`
- `rpc_finalize_suggestion_group`
- `rpc_cleanup_old_data` (maintenance)

### 2. Vercel Deploy

```bash
# Vercel CLI ile
npx vercel --prod

# Veya GitHub entegrasyonu ile otomatik deploy
```

**Environment Variables:** Vercel Dashboard > Settings > Environment Variables'a 3 env var ekle.

### 3. Auth Ayarlari ve Ilk Admin Olusturma

#### Auth Provisioning Modeli: Manuel

Bu uygulama internal tool olarak tasarlanmistir. Kullanici kaydi (signup) uygulama icinde **yoktur**.

**Supabase Dashboard > Auth > Settings / Providers > Email:**
- **Allow new users to sign up** = **OFF** (public signup kapali)
- **Confirm email** = **OFF** (SMTP yoksa login bloklanmasin)

**Kullanici olusturma:** Supabase Dashboard > Auth > Users > "Add user" ile manuel olusturulur.
`handle_new_user` trigger otomatik olarak `staff` rolunde profil olusturur.

#### Ilk Admin Bootstrap

1. Supabase Dashboard > Auth > Users > "Add user" ile ilk kullaniciyi olusturun
2. Uygulamada bu kullanici ile login yapin
3. Henuz admin yoksa `/setup` sayfasi acilir
4. "Als Admin einrichten" butonuna tiklayin
5. Ilk kullanici admin olarak bootstrap edilir

**Not:** `rpc_bootstrap_admin` sadece henuz admin yokken calisir. Sonraki admin atamalari mevcut admin tarafindan `profiles` tablosu uzerinden yapilir.

### 4. Post-Deploy Dogrulama

`docs/smoke-test.md` kontrol listesindeki maddeleri gercek ortamda PASS/FAIL olarak dogrulayin:
- Login/logout
- Checklist lifecycle (olustur -> guncelle -> tamamla -> gerekirse yeniden ac)
- Siparis akisi (arkaplan draft order'lar, suggestion group tamamlamasi, ordered/delivery lifecycle)
- Excel export
- Admin/staff yetki ayrimi
- Mobile gorunum

## Rollback

### Uygulama Rollback
- **Vercel:** Dashboard > Deployments > onceki deployment'a "Promote to Production"
- **Manual:** `git revert` ile geri al, yeniden deploy et

### Veritabani Rollback
- Supabase migration'lar geri alinamaz (down migration destegi yok)
- Sorun olursa yeni migration ile duzeltme yapilir
- **Kritik:** Production'da `seed.sql` calistirilMAZ

## Known Limitations

### Supabase Type Infrastructure
- `src/types/supabase.ts` uretilmedi
- Supabase client'lar generic `Database` type parametresi kullanmiyor
- `src/types/database.ts` manual type tanimlari ile calisiliyor
- **Etki:** Bazi sorgu sonuclarinda TypeScript inference sinirli, `any` cast gerekebilir

### Integration Test Kapsami
- Integration testler agirlikla mock stratejisi kullanir
- Is mantigi dogrulansa da gercek DB interaction'lari tam kapsanmaz
- **Etki:** RLS policy, trigger ve RPC runtime davranislari icin manual smoke test halen gereklidir

### Smoke Test
- `docs/smoke-test.md` canli davranisa gore guncel tutulur, ancak PASS/FAIL kayitlari ortam bazlidir
- **Etki:** Production oncesi checklist yeniden kosulmadan eski PASS notlarina guvenilmemelidir

### Mevcut `any` Kullanimi
- `src/lib/utils/transform.ts` icinde Supabase `!inner` join type inference workaround'lari bulunur
- **Etki:** Type safety sinirli, runtime'da dogru calisiyor

### Mobile Viewport Dogrulama
- Gercek cihaz testi ayrica yapilmalidir
- **Etki:** Code review tek basina son operasyonel onay yerine gecmez
