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
| `TOPGG_TOKEN` | top.gg panelindeki token | Canlı sunucu/oy sayıları için (yoksa simülasyon) |
| `TOPGG_BOT_ID` | `1540401487581020252` | Varsayılanı kodda var |
| `FIREBASE_API_KEY` | Firebase web anahtarı | Forum köprü hesabı için (varsayılanı kodda var) |

Kaydet → **Redeploy** (env değişikliği yeniden dağıtım ister).

> **Firebase Console:** Authentication → Sign-in method → **E-posta/Şifre SAĞLAYICISI AÇIK** olmalı
> (forum Discord köprüsü buradan hesap açar). Kapalıysa giriş `login=hata` ile döner.

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

## 6) Sahip komutları (bot üzerinden site yönetimi)

- `r!bakım [sebep]` → butonlu panel: **🤖 Bot bakımı** + **🌐 Site bakımı** aç/kapat.
  Site bayrağı bot DB'de tutulur, site `/api/status` üzerinden okur.
- `r!mağaza-yönet` → ürün seç (menü) → **Fiyat Değiştir** (sohbete sayı yaz) /
  **Göster-Gizle**. Değişiklik site mağazasına anında yansır; gizli ürün alınamaz.
- `r!kupon` → tam butonlu panel (süre butonları: 1sa–1yıl/süresiz). Süresi dolan
  kuponlar 5 dk'da bir otomatik silinir. `r!kodoluştur liste|sil <kod>` de durur.
- `r!siterol @a @b` → rol seç menüsü (kurucu hariç) → çoklu rol verme + DM + log.
  Kullananlar: sahip + `1310366324731547798`.
- `r!hatırlat <süre> <metin>` → **premium** komut; esnek süre (10dk/2 hafta/3 ay),
  DM embed hatırlatma, restart-safe. `liste` / `sil <no>`.
- İkisi de yalnızca **sahip ID** (`U.SAHIP_ID`) kullanabilir; site admin paneli
  ayrıca Firebase admin UID ile korunur.

## 7) Owner-log + Forum log bağlantıları

- Site 05 iletişim formu → `/api/contact` → bot `#owner-log` kanalına embed düşer
  (bot çevrimdışıysa form yine kaydedilir, log atlanır).
- Site mağaza satışı + pazar satışı + `r!pet al` → owner-log'a embed/satır düşer.
- VIP bitimi: 60 sn süpürücü yakalar → owner-log + kullanıcıya **DM (embed)** atılır.
- **Forum log:** forumdaki giriş/konu/yanıt/silme/rol/ban/kilit adımları Firestore
  `sitelog` koleksiyonuna yazılır → admin panelde **Forum Log** sekmesi listeler →
  aynı anda `/api/log` üzerinden bot `#owner-log` kanalına embed aynalanır.
  Gerekli: bot `.env`'de `BOT_API_SECRET`, `OWNER_LOG` kanal ID'si (`utils.js`).

## 8) Tek oturum (SSO) + Rastgele Paket

## 9) Forum bildirimleri + çeviri + site kategorisi

- Yanıt gelince **yazar + o konuya daha önce yorum yazanlar** site çanına düşer
  (`notifications`) ve Discord ID'si kayıtlı olanlara **bot DM** atar
  (`/api/notify` → butonlu embed).
- Konu görünümünde **🔕 Bildirimleri Kapat / 🔔 Aç** butonu (kullanıcı bazlı,
  `stats.mutedThreads` içinde tutulur, rules değişikliği gerekmez).
- Discord ID eşleşmesi: `heal()` artık `d<ID>@discord.risebunny.local` e-postasından
  `discordId` alanını profil belgesine yazar (rules `create` anahtar kısıtı yok).
- Her paylaşımda **🌐 çeviri** butonu: metni o anki arayüz diline çevirir
  (anahtarsız MyMemory, 450 karakter, ikinci tık kapatır).
- Bot yardım menüsünde **🔗 Site** kategorisi: `siterol`, `kodkullan`, `kodoluştur`.
  Tüm komutlar kategori denetiminden geçti (bayat `kuponoluştur` kaydı silindi).

## 9) Gerçek liderlik verisi + veri kaybı önlemi (bot tarafı)

**Neden tablo simde kalıyordu:** site, Firestore'daki `leaderboard/*` belgelerini
okur ama oraya yazan yoktu (botun Admin SDK'sı yok). Çözüm: bot 10 dk'da bir
kendi Firebase hesabıyla yazar.

1. Firebase Console → **Authentication → Add user:**
   e-posta `bot@discord.risebunny.local` + güçlü şifre.
2. `firestore.rules` içindeki leaderboard kuralı bu e-postayı doğrular —
   rules dosyasını publish et (zaten eklendi).
3. Bot `.env`: `FIREBASE_BOT_EMAIL=bot@discord.risebunny.local` +
   `FIREBASE_BOT_SIFRE=<şifre>` → restart. Logda `[FB] leaderboard/rich senkron ✓`
   görünmeli; 10 dk sonra site tabloları canlanır (önbellek 5 dk).

**Render'da veri sıfırlanması:** ücretsiz Render diski geçicidir (ephemeral) —
her restart/deploy DB dosyasını siler. Kalıcı çözüm: Render Disk (ücretli) veya
VPS. Geçici güvence: `r!yedek` (DB dosyasını DM'e gönderir) +
`r!yedek-yükle` (dosya ekiyle geri yükler). Önemli değişiklik öncesi yedek al.

- Giriş tek noktadan: Discord (forumda form yok; `#/login` otomatik Discord'a atar).
- risebunny → forum: çerez → Firebase otomatik giriş. Forum → risebunny:
  Firebase token `/api/session/restore` ile çereze çevrilir, tekrar giriş gerekmez.
- Premiumu aktif kullanıcı premiumu tekrar alamaz (403 + buton kilitli).
- 🎁 Rastgele Paket 150K: **sadece pet** — %40 tekli, %40 çiftli, %20 üçlü.
  Sonuç ekranda + DM'de (embed), DB'ye işlenir.
- Canlı veri zinciri: `/api/stats` (top.gg → bot) + `/api/leaderboard` (bot → Firestore).
  İkisi de `BOT_API_URL` ister; yoksa simülasyon + ekranda sebebi yazar.

## 10) Güvenlik notları

- `rb_session` HttpOnly + Secure + imzalı (client tarafı okuyamaz/değiştiremez).
- Fiyat hilesi imkânsız: tarayıcıdan gelen fiyat değil, botun `SHOP_CATALOG`'u geçerli.
- Ödeme cüzdan+banka toplamından; yetersizse `402`.
- Secret şüphesinde: Discord portalden **Regenerate**, Vercel + bot `.env`'i güncelle, redeploy.

## 11) Admin panel, report ve veri silme akışları

- **Admin panel:** yalnızca 2 kişi (sahip UID + `1310366324731547798`), **sadece Discord ile giriş** (mail formu kaldırıldı).
- **Report:** forumda 🚩 → moderatör `#/mod` panelinde Reddet / Sil / Kurucuya / Ban İste. Ban onayları admin panel **Forum Üyeleri** sekmesindeki kuyruktan Onayla/Reddet ile işler.
- **Veri silme:** site Hesabım → kapsam seç → çift onay → Firestore talebi + bot bildirimi → sahip Discord'da **Emin misin?** onayından sonra bot verileri silinir, site verileri kullanıcının tarayıcısında silinir, sonuç DM ile bildirilir.
- **İlk kullanım onayı:** `dil` + `yardım` hariç tüm komutlar `onay_<id>` ister; dil panelindeki **Kaydet ve Kabul Et** ile verilir, docs/gizlilik/şartlar linkleri paneldedir.
- **Yedek:** `r!yedek` tam snapshot alır (önceki snapshot silinir — tek aktif yedek), `r!yedek-yükle [+dosya | son]` geri yükler.
