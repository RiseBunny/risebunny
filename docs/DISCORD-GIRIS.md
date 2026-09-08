# 🔐 RiseBunny — Discord ile Giriş + Mağaza Kurulumu (v1.0)

Site + forumda **Discord ile Giriş** butonu, girişten sonra `/risebunny#hesabim`
yönlendirmesi, bot cüzdanının sitede görünmesi ve **indirimli premium/pet mağazası**.

Mimari: tarayıcı ↔ Vercel serverless (`/api/*`) ↔ bot Express.
**Sırlar asla tarayıcıya inmez** — hepsi Vercel Environment Variables + bot `.env`'de.

> Firebase `apiKey`'inin dosyalarda açık görünmesi **normaldir** (herkese açık
> anahtar; güvenlik Firestore rules + Auth ile sağlanır). Asla paylaşılmaması
> gerekenler: `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`, `BOT_API_SECRET`,
> `TOPGG_TOKEN`, `DISCORD_BOT_TOKEN`.

---

## 1) Discord Developer Portal (5 dk)

1. https://discord.com/developers/applications → botunun uygulaması (`1540401487581020252`)
2. **OAuth2 → Redirects → Add Another Redirect:**
   `https://risebunny.vercel.app/api/auth/discord/callback`
   (birebir aynı olmalı — sonda `/` yok)
3. **OAuth2 → Client Secret → Reset Secret → Copy** (bir kez görünür!)
4. Scope gerekmez (kodda `identify` isteniyor).

## 2) Vercel Environment Variables

Vercel → Project → Settings → Environment Variables (Production + Preview):

| Key | Değer | Açıklama |
|---|---|---|
| `DISCORD_CLIENT_ID` | `1540401487581020252` | Herkese açık, kodda varsayılanı var |
| `DISCORD_CLIENT_SECRET` | portalden kopyaladığın secret | ⚠️ kimseyle paylaşma |
| `SESSION_SECRET` | `openssl rand -hex 32` çıktısı | Oturum imza anahtarı |
| `BOT_API_URL` | `https://SENIN-BOT-SUNUCUN:8000` | Botun herkese açık adresi (yoksa boş bırak → mağaza/bakiye kapalı görünür) |
| `BOT_API_SECRET` | bot `.env`'indekiyle **aynı** | Bot-site paylaşılan sır |

Kaydet → **Redeploy** (env değişikliği yeniden dağıtım ister).

## 3) Bot `.env`

```env
BOT_API_SECRET=verceldekiyle-ayni-guclu-secret
PORT=8000
```

Bot yeniden başlat. Logda görmelisin:
`[Mağaza] :/api/user/:id + /api/shop hazır`

## 4) Akış

1. Sitede/forumda **Discord ile Giriş** → Discord izin ekranı
2. Onay → `/api/auth/discord/callback` → imzalı `rb_session` cookie → **`/risebunny#hesabim`**
3. `#hesabim`: avatar + isim + **cüzdan/banka/toplam + level/XP + premium + pet sayısı**
   (bot çevrimdışıyken "bot çevrimdışı" yazar, giriş yine çalışır)
4. **Mağaza** (`/api/shop/catalog` → bot canlıysa canlı fiyat, değilse sabit liste):
   - 💎 Premium 30 Gün — 250.000 💸
   - 🐰 Tavşan 72.000 • 🐶 Köpek 90.000 • 🐱 Kedi 135.000 • 🐠 Balık 162.000
     (bot fiyatlarının **~%10 altında**, siteye özel indirim)
   - 🦁 Aslan 315.000 • 🐅 Kaplan 342.000 (premium gerekli)
5. Satın Al → `/api/shop/buy` → bot **fiyatı kendi kataloğundan doğrular**,
   önce cüzdan sonra bankadan çeker, premium/pet'i işler.

## 5) Test

- `https://risebunny.vercel.app/api/auth/discord/start?next=/risebunny` → Discord'a atmalı
- Girişten sonra header'da avatar rozeti
- `r!param` ile bot bakiyesi ↔ sitedeki bakiye aynı olmalı
- Mağazadan ucuz pet al → bot logunda `[Mağaza] <id> satın aldı` görülmeli

## 6) Güvenlik notları

- `rb_session` HttpOnly + Secure + imzalı (client tarafı okuyamaz/değiştiremez).
- Fiyat hilesi imkânsız: tarayıcıdan gelen fiyat değil, botun `SHOP_CATALOG`'u geçerli.
- Ödeme cüzdan+banka toplamından; yetersizse `402`.
- Secret şüphesinde: Discord portalden **Regenerate**, Vercel + bot `.env`'i güncelle, redeploy.
