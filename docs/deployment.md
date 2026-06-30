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

**Kontrol:** Migration sonrasi 4 RPC fonksiyonunun yuklendigini dogrula:
- `rpc_bootstrap_admin`
- `rpc_create_checklist_with_snapshot`
- `rpc_create_order_with_items`
- `rpc_update_order_delivery`

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

**Supabase Dashboard > Auth > Settings:**
- **Allow new users to sign up** = **OFF** (public signup kapali)
- **Confirm email** = **OFF** (Email provider ayarlarindan; SMTP yoksa login bloklar)

**Kullanici olusturma:** Supabase Dashboard > Auth > Users > "Add user" ile manuel olusturulur.
`handle_new_user` trigger otomatik olarak `staff` rolunde profil olusturur.

#### Ilk Admin Bootstrap

1. Supabase Dashboard > Auth > Users > "Add user" ile ilk kullaniciyi olusturun
2. Uygulamada bu kullanici ile login yapin
3. `/setup` sayfasi acilir (henuz admin yok)
4. "Als Admin einrichten" butonuna tiklayin
5. Ilk kullanici admin olarak bootstrap edilir

**Not:** `rpc_bootstrap_admin` sadece henuz admin yokken calisir. Birden fazla admin olusturmak icin mevcut admin profiles tablosundan role degistirir.

### 4. Post-Deploy Dogrulama

`docs/smoke-test.md` kontrol listesindeki tum maddeleri gercek ortamda PASS/FAIL olarak dogrulayin:
- Login/logout
- Checklist lifecycle (olustur → guncelle → tamamla)
- Siparis akisi (oneri → olustur → siparis ver → teslimat)
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

### Supabase Type Infrastructure (Session 7)
- `src/types/supabase.ts` uretilmedi (Supabase instance baglantisi yoktu)
- Supabase client'lar generic `Database` type parametresi kullanmiyor
- `src/types/database.ts` manual type tanimlari ile calisiliyor
- **Etki:** Sorgu sonuclarinda TypeScript inference sinirli, `any` cast gerekebilir
- **Cozum:** Supabase instance baglaninca `npx supabase gen types typescript` calistirilmali

### Integration Test Kapsami (Session 8)
- Integration testler mock stratejisi kullanildi (Supabase local yoktu)
- Is mantigi dogrulandi ancak gercek DB interaction'lari test edilmedi
- **Etki:** RLS policy, trigger ve RPC fonksiyon davranislari unit test kapsaminda degil
- **Cozum:** Supabase local kuruldugunda mock testler gercek DB testlerine donusturulmeli

### Smoke Test (Session 10)
- Tum UI smoke testler NOT RUN (Supabase instance ve browser ortami yoktu)
- **Etki:** Runtime UI davranisi production oncesi dogrulanmadi
- **Cozum:** Production deploy sonrasi tum smoke test maddeleri gercek ortamda dogrulanmali

### Mevcut `any` Kullanimi
- `src/lib/utils/transform.ts` (3 adet): Supabase `!inner` join type inference workaround
- **Etki:** Type safety sinirli, runtime'da dogru calisiyor
- **Cozum:** Session 7 type infrastructure kurulunca giderilebilir

### Mobile Viewport Dogrulama (Session 4)
- Gercek cihaz veya DevTools responsive mode testi yapilamadi
- Code review ile layout uygunlugu dogrulandi
- **Cozum:** Production'da gercek mobil cihazlarda test edilmeli
