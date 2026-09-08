# 🐰 RiseBunny — Top.gg Entegrasyon Rehberi (v3.0)

> **Durum (v3.0):** Botunuz Top.gg'de onay BEKLİYOR, bot ID `1540401487581020252`.
> Bu rehber, bekleme sırasında hazırlanıp onaydan sonra anında devreye girecek üç özelliği
> (Auto Stats, Vote Rewards, Leaderboards) adım adım anlatır.
> **Stack:** Node.js (discord.js v14) + Express + `@top-gg/sdk` **v4** (v1 API).
>
> **Bot ↔ site entegrasyonu:** site `risebunny.vercel.app/risebunny` olarak devrede
> (`risebunny.html` + `js/risebunny.js`).
> Widget'lar canlı, simülasyon verileri yerleşik; gerçek veri bot webhook'undan gelir.
>
> **v3 değişiklikleri:** SDK v4'te `AutoPoster` KALDIRILDI ve `Webhook.middleware()`
> YOKTUR — bot.js artık manuel `postMetrics` + dual (v1 HMAC / v0 legacy) webhook
> kullanır. Gizli admin: footer 5-tık + 3 yanlış hakkı (bkz. §11).

---

## 0) Özet Tablo — Onay Beklerken Çalışır mı?

| Özellik | Onay beklerken çalışır mı? | Neden? | Bot ID |
|---|---|---|---|
| API token'ı almak | ✅ **EVET** | Token, bot sayfasının sahibine (sana) düzenleme erişimiyle birlikte verilir; onayla ilgisi yoktur. | `1540401487581020252` |
| Auto Stats (sunucu sayısı gönderme) | ✅ **EVET** | `POST /bots/{id}/stats` uç noktası bot sayfası varolduğu sürece çalışır. Onaydan sonra liste sayfasında görünür olur. | `1540401487581020252` |
| Vote Webhook (oy bildirimi) | ⚠️ **KİSMEN** | Webhook ayarlanabilir + **\"Test\" butonu** ile test eventi gönderilir (`\"type\":\"test\"`). Ama bot onaylanmadığı için oy sayfası herkese açık olmadığından **gerçek oy akışı** onay sonrası başlar. | `1540401487581020252` |
| Leaderboard API (kendi sitende) | ✅ **EVET** | Tamamen kendi botun + kendi veritabanınla ilgili; Top.gg onayıyla hiçbir ilgisi yok. | — |

**Sonuç:** Üçünü de şimdi kurup test edebilirsin; sadece "gerçek oy" akışı
onaydan sonra başlar. Top.gg webhook panelindeki **"Send Test"** butonu
seni onaysız test etmenin resmi yoludur.

> **Bot ID Notu (2026):** RiseBunny botu Top.gg'de `1540401487581020252` ID ile
> listelenmiştir. Sitesindeki widget'lar ve rehber örnekleri bu ID'ye göre çalışır.
> Eğer başka bir bot listesinden (DBL, discordbots.group) aynı ID ile entegre
> edersen, buradaki ID değişir — değistiginde `TOPGG_BOT_ID` ve tüm widget
> URL'lerini aynı anda güncelle.

---

## 1) Top.gg API Token'ı — Nereden ve Nasıl Alınır?

1. `https://top.gg` sayfasına Discord hesabınla giriş yap.
2. (Onay bekliyorsan) bot sayfanı aç → sağ üstteki **Edit** (⚙️) butonuna tıkla.
   → Bot zaten kayıtlı olduğu için düzenleme sayfası **onay beklerken de** erişilebilir.
3. Sol menüden **Webhooks** sekmesini aç.
4. **Authorization** bölümünde **"Click to reveal"** ile token'ı gör.
   Format: `eyJhbGciOi...` gibi uzun bir JWT değil, rastgele bir secret string'idir.
5. Token'ı **kimseyle paylaşma**; bot dashboard'ına giren herkes görebilir —
   şüphelenirsen aynı panelden **Regenerate** et.
6. Aynı sekmede:
   - **Webhook URL**: `https://risebunny.vercel.app/api/topgg/vote` (veya bot sunucun)
   - **Webhook Authorization (secret)**: kendi ürettiğin güçlü bir secret, ör. `openssl rand -hex 32`

> **Onay beklerken alınabilir mi?** → **Evet.** Token bot sayfasına bağlıdır,
> sayfa onay sürecinde sana açık kalır. Sadece bot onaylanana kadar
> arama/listelemede görünmez.

Bot ID'nin `https://top.gg/bot/1540401487581020252` olduğunu unutma —
bu ID hem sitesindeki widget'larda hem de API çağrılarında kullanılır.

**`.env` dosyan (bot):**

```env
DISCORD_BOT_TOKEN=botunun-discord-tokeni

# Top.gg
TOPGG_BOT_ID=1540401487581020252
TOPGG_TOKEN=topgg_panelden_aldigin_token
TOPGG_WEBHOOK_SECRET=openssl_rand_hex_32_ile_urettigin_secret
TOPGG_WEBHOOK_URL=https://risebunny.vercel.app/api/topgg/vote

# (Opsiyonel) Vote ödülü ayarları
TOPGG_REWARD_MONEY=1000
TOPGG_REWARD_XP=150
TOPGG_REWARD_ROLE_ID=
```

---

## 2) NPM Paketleri

| Özellik | Paket | Not |
|---|---|---|
| Auto Stats | `@top-gg/sdk` | `Api` sınıfı stats gönderir; `AutoPoster` 30dk'da bir otomatik yollar. |
| Vote Webhook | `@top-gg/sdk` | `Webhook` Express middleware'i imza doğrulamayı yapar. (Elle `crypto.timingSafeEqual` da gösteriyoruz.) |
| Leaderboards | `express`, `cors` + DB sürücün | Bot zaten Express kullanıyorsa sadece `cors` gerekebilir. |
| Test aracı | `ngrok` (dev) veya Vercel URL | Webhook'u dışarıdan test etmek için. |

```bash
npm install @top-gg/sdk express cors dotenv
# botun çalıştığı dizinde (dc bot dizininde)
```

> **⚠️ SDK v4 notu:** `topgg-autoposter` paketi ve `AutoPoster` sınıfı ARTIK YOKTUR.
> Stats için `Api.postMetrics({ serverCount })` + kendi `setInterval`'in kullanılır.
> Webhook için `webhook.middleware()` YOKTUR — `webhook.listener()` (sadece v1) veya
> aşağıdaki gibi manuel dual (v1+v0) handler kullanılır. bot.js'de manuel dual
> handler kurulu + `express.json()` global DEĞİLDİR (webhook ham body ister).

---

## 3) Özellik 1 — Otomatik Sunucu Sayısı (Auto Stats, her 30 dk)

Botun `bot.js` içinde @top-gg/sdk **v4** `Api.postMetrics` kullanılır.
Bot ID `1540401487581020252` sabit. (SDK v4'te `AutoPoster` yoktur.)

```js
// bot.js içinde (kurulu haliyle özet)
const { Api } = require('@top-gg/sdk');
const TOPGG_BOT_ID = process.env.TOPGG_BOT_ID || '1540401487581020252';
let topggApi = null;
if (process.env.TOPGG_TOKEN && !process.env.TOPGG_TOKEN.includes('panelden')) {
  topggApi = new Api(process.env.TOPGG_TOKEN); // v1 → Bearer token
}

async function postStats(reason) {
  if (!topggApi) return; // tokensız sessiz geç (crash yok)
  const guildCount = client.guilds.cache.size;
  await topggApi.postMetrics({ serverCount: guildCount }); // v1 metrik
  console.log(`[TopGG] Stats gönderildi ✓ (${guildCount} sunucu)`);
}
client.once('ready', () => {
  postStats('ready');
  setInterval(() => postStats('30dk'), 30 * 60 * 1000);
});
// guildCreate/guildDelete sonrası debounce ile ek tazeleme (60 sn)
```

> **Shard'lı bot:** `postMetrics({ serverCount, shardCount })` kullan.
> **Limit:** 15 dk'dan sık gönderim 429 getirir; 30 dk ideal.
> **Referans:** https://docs.top.gg/api/v0/bots.md → `POST /bots/:id/stats`
> (v0) yerine v1 `PATCH /projects/@me/metrics` kullanılır.

---

## 4) Özellik 2 — Oy Verenleri Ödüllendirme (Vote Webhook)

### 4a. Sunucu tarafı (Express + dual imza doğrulama)

Botun `bot.js` içinde zaten `express()` mevcut. Webhook endpoint'i aynı Express
uygulamasında **manuel dual handler** olarak kurulu (SDK v4 `listener()` sadece
v1 destekler; v0 paneller için legacy dalı da vardır):

```js
// bot.js içinde (kurulu haliyle özet — ham body gerekir, global express.json YOK)
const crypto = require('crypto');
const votePath = new URL(process.env.TOPGG_WEBHOOK_URL).pathname; // /api/topgg/vote

app.post(votePath, async (req, res) => {
  const raw = await readRaw(req); // ham body (2 MB limit)

  // ── v1 (docs.top.gg → Webhooks → Signature verification) ──
  // header: x-topgg-signature: t={unix},v1={hmac(sha256, "{t}.{rawBody}", secret)}
  const sig = req.headers['x-topgg-signature'];
  if (sig) {
    /* HMAC doğrula (timingSafeEqual) → body.type:
       "webhook.test" → 204 (ödül YOK) | "vote.create" → giveReward() → 204 */
  }

  // ── v0 legacy: Authorization: <secret> + JSON { user, type, isWeekend } ──
  /* timingSafeEqual(auth, secret) → type "test" → 204, yoksa giveReward() → 204 */
});
```

> **Neden global `express.json()` yok?** v1 HMAC, **ham body** üzerinden hesaplanır;
> JSON parser stream'i tüketirse imza bozulur. bot.js'de parser route-lokaldir.
> **Referans:** https://docs.top.gg/webhooks/overview.md

### 4b. Ödül mantığı (discord.js ile)

```js
const { Client } = require('discord.js');
const client = new Client({ intents: [] }); // mevcut botunla aynı client'ı kullan

async function giveReward(userId, multiplier) {
  // 1) Veritabanına oy kaydı (tekrar istismarı önler — bkz. 4c)
  const canGet = await db.markVoteIfAllowed(userId); // 12 saat cooldown
  if (!canGet) return console.log('[Vote] cooldown — ödül yok');

  // 2) ROL ver (ör: "Oy Veren" rolü ID: process.env.TOPGG_REWARD_ROLE_ID)
  const guild = client.guilds.cache.get(process.env.MAIN_GUILD_ID); // varsa
  if (guild) {
    const roleId = process.env.TOPGG_REWARD_ROLE_ID;
    if (roleId) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member) await member.roles.add(roleId).catch(() => {});
    }
  }

  // 3) EKONOMİ ÖDÜLÜ — botun kendi DB'sine (croxydb):
  const money = (process.env.TOPGG_REWARD_MONEY || 1000) * multiplier;
  const xp = (process.env.TOPGG_REWARD_XP || 150) * multiplier;
  db.add(`para_${userId}`, money);
  db.add(`xp_${userId}`, xp);

  // 4) DM ile haber ver (DM kapalıysa sus)
  const member = await client.users.fetch(userId).catch(() => null);
  member?.send(
    `🥕 Oyun için teşekkürler! +${money.toLocaleString()} para ve +${xp} XP kazandın (12 saat sonra tekrar).`
  ).catch(() => {});

  console.log(`[Vote] Ödül verildi: ${userId} ×${multiplier}`);
}
```

### 4c. Tekrar-oy istismarı koruması (cooldown)

```js
// vote_cooldown: { userId, lastVoteAt } — croxydb ile basit key/value
async function markVoteIfAllowed(userId) {
  const key = `vote_${userId}`;
  const now = Date.now();
  const last = Number(db.fetch(key) || 0);
  if (now - last < 12 * 3600 * 1000) return false; // 12 saat (Top.gg kuralı)
  db.set(key, now);
  return true;
}
```

> **Neden cooldown?** Top.gg 12 saatte bir oy'e izin verir ama webhook yeniden
> gönderilebilir değildir; yine de kendi DB'nde tek kayıt + timestamp tutmak
> hem istismarı hem de tekrar ödülü kesin engeller.

---

## 5) Özellik 3 — Liderlik Tablosu API'si (Web sitesi için)

Bot veritabanındaki en zengin / en yüksek seviyeli kullanıcıları
`risebunny.vercel.app/risebunny` üzerinde göstermek için bir **herkese açık JSON API** kur.

### 5a. Bot tarafı: Express API + caching

```js
// bot.js içinde (app.listen üstüne veya ayrı export)
const cors = require('cors');
app.use('/api/leaderboard', cors({
  origin: ['https://risebunny.vercel.app', 'http://localhost:3000'],
  methods: ['GET'],
  allowedHeaders: ['Content-Type']
}));

// ── ÖNBELLEK: 5 dakika boyunca DB'ye gidilmez ──
const cache = new Map(); // key: "rich"|"level", value: { data, at }
const TTL = 5 * 60 * 1000;

async function getTop(kind) {
  const hit = cache.get(kind);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  // DB sorgusu (croxydb key/value, kendi şemana göre): örnek olarak
  // economy para ve xp key'lerini okuryazur.
  // Gerçek bir SQL/ORM varsa buraya kendi query'ini yaz.
  const rich = db.rows ? [] : Object.keys(db.data || {})
    .filter(k => k.startsWith('para_'))
    .map(k => ({ id: k.replace('para_', ''), value: db.fetch(k) || 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

  const level = Object.keys(db.data || {})
    .filter(k => k.startsWith('seviye_'))
    .map(k => ({ id: k.replace('seviye_', ''), value: db.fetch(k) || 1 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

  const rows = kind === 'rich' ? rich : level;

  // Discord ID → isim çözümü
  const data = await Promise.all(rows.map(async r => ({
    id: r.id,
    name: client.users.cache.get(r.id)?.username
          ?? (await client.users.fetch(r.id).catch(() => null))?.username
          ?? 'Unknown',
    value: r.value,
  })));

  cache.set(kind, { data, at: Date.now() });
  return data;
}

app.get('/api/leaderboard/:kind', async (req, res) => {
  const kind = req.params.kind === 'rich' ? 'rich'
             : req.params.kind === 'level' ? 'level' : null;
  if (!kind) return res.status(400).json({ error: 'kind=rich|level' });
  res.json({ kind, updated: new Date().toISOString(), data: await getTop(kind) });
});
```

### 5b. Web sitesi tarafı: `risebunny.html` içinde fetch

`risebunny.html` leaderboard bölümünde 3 katmanlı okuma yapar
(`js/risebunny.js` → `loadBoard`):

```js
// 1) Bot Express (VPS'te çalışıyorsa public URL'i LEADERBOARD_URLS'e ekle)
fetch('https://BOTUN-VPS-URLIN/api/leaderboard/rich')
// 2) Vercel serverless → Firestore `leaderboard/rich` (api/leaderboard/[kind].js)
fetch('https://risebunny.vercel.app/api/leaderboard/rich')
// 3) Hiçbiri yoksa → yerleşik simülasyon (10 isimlik tablo)
```

> **Note:** Bot sunucusu `app.listen(process.env.PORT || 8000)` diye başlıyor.
> Eğer bot VPS/Railway'da çalışıyorsa, leaderboard endpoint'i o sunucunun
> public IP / domain'inden erişilir. Vercel serverless fonksiyon olarak da yazılabilir
> (bkz. 9. Dağıtım Notları).

### 5c. Firestore varyantı (site zaten Firebase kullanıyor)

Bot, **Firebase Admin SDK** ile yazar (`firebase-admin`):

```js
// bot tarafında (firebase-admin kurulu olmalı)
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(), // veya serviceAccountKey
  databaseURL: 'https://gen-lang-client-0590499912.firebaseio.com'
});

// Oy verisi geldikçe leaderboard koleksiyonuna yaz
async function writeLeaderboard(kind, topData) {
  await admin.firestore().collection('leaderboard')
    .doc(kind).set({ data: topData.map(u => ({ name: u.name, value: u.value })) }, { merge: true });
}
```

Web tarafı `db.collection('leaderboard').doc('rich')` okur —
`firestore.rules`'ta zaten `allow read: if true` + `write: if false`
bıraktık (bkz. `firestore.rules` → `match /leaderboard/`).
Bot sunucusuz yazdığı için rules'ı hiçbir ziyaretçi değiştiremez.

---

## 6) Webhook Güvenliği — İmza Doğrulama (özet)

1. Top.gg panelinde bir **Webhook Authorization secret** ayarla (`openssl rand -hex 32`).
2. Her istekte `Authorization` header'ı ile gelir.
3. **`crypto.timingSafeEqual`** ile karşılaştır (== kullanma! timing attack).
4. Sırrı `.env`'de tut, git'e ASLA commit etme (`.gitignore`: `.env`).
5. URL'i gizli tutma çabası yerine **imzayı** güçlü tut — URL bilinse bile
   secret olmadan sahte oy gönderilemez.
6. HTTP durum: başarılı işlemlerde `204` dön; 401'de işlem yapma ve logla.

---

## 7) Test Yöntemleri

| Ne | Nasıl |
|---|---|
| Stats gönderimi | Botu çalıştır, konsolda `[TopGG] Sunucu sayısı gönderildi: N` bekle; 30 dk sonra tekrar. Ayrıca `https://top.gg/bot/1540401487581020252` panelden sayının güncellendiğini gör. |
| Webhook (onaysızken) | Top.gg → bot sayfa → Webhooks → **"Send Test"** → sunucunda `"type":"test"` kaydı düşmeli. (Gerçek ödül vermez.) |
| Webhook (lokal) | `ngrok http 8000` → URL'i panele yapıştır → Test'e bas → terminalde POST'u gör. |
| İmza doğrulama | `curl -H "Authorization: yanlis_secret" -d '{}' http://localhost:8000/api/topgg/vote` → **401** dönMELI. |
| Vote cooldown | Testte aynı kullanıcıya 2. istek → ödül verilmemeli (db'de 12 saat). |
| Leaderboard API | `curl http://localhost:8000/api/leaderboard/rich` → JSON; 5 dk içinde 2. istek → aynı cache (DB sorgu sayacı artmamalı). |
| Rate limit | Stats'ı 15 dk'dan sık yollarsan Top.gg 429 döner — 30 dk kullan. |

---

## 8) Bot ↔ Site Entegrasyonu — `risebunny.vercel.app/risebunny`

### 8a. Site tarafı: `risebunny.html`

- `risebunny.html` (`/risebunny`) botu tanıtır: hero + davet/oy butonları,
  **canlı top.gg widget'ları** (servers + upvotes, ID `1540401487581020252`),
  istatistik kartları, 8 özellik kartı (gerçek komut kategorileri),
  **komut simülatörü** (`r!yardım`, `r!param`...), moderasyon demosu,
  **liderlik tablosu** (rich|level sekmeli), 3 adımlı oylama + ödül simülasyonu,
  entegrasyon durumu ve mini SSS.
- Sayfanın altındaki istatistikler bot çevrimdışıyken **simülasyon** modunda çalışır:
  - Server count simülasyonu: `sim.servers` her 18 saniyede bir artabilir.
  - Oy sayısı simülasyonu: `sim.votes` her 18 saniyede bir artabilir.
  - top.gg herkese açık bot endpoint'inden gerçek sayı gelirse simülasyon
    otomatik canlıya döner (`data-live="1"`).
- Gerçek veri gelince (bot webhook + AutoStats), widget'lar ve istatistikler
  **gerçek veriyle** yenilenecek. Şu anki simülasyon sadece test/görsel amaçlıdır.

### 8b. Bot tarafı: veri akışı

1. **AutoStats → `POST /bots/1540401487581020252/stats`** → Top.gg panelindeki
   sunucu sayısı widget'ı güncellenir.
2. **Vote Webhook (`/api/topgg/vote`) → bot `giveReward()`** → oy verenlere
   rol + para + XP + DM.
3. **Leaderboard API (`/api/leaderboard/:kind`) → site `risebunny.html`**
   → en zengin / en yüksek seviyeli kullanıcılar listelenir.

### 8c. Widget URL'leri (site kodlarında)

```html
<!-- Sunucu sayısı widget'ı -->
<img src="https://top.gg/api/widget/servers/1540401487581020252.svg" alt="Sunucu sayısı">

<!-- Oy sayısı widget'ı -->
<img src="https://top.gg/api/widget/upvotes/1540401487581020252.svg" alt="Oy sayısı">
```

> Bu widget'lar **sadece görsel özet** verir. Gerçek oy akışı botun
> `/api/topgg/vote` endpoint'inden gelir ve simülasyon sayacını etkilemez
> (gerçek veri gelince simülasyon sayacı real veriye atanacaktır).

---

## 9) Dağıtım Notları

- **Express sunucusu** statik Vercel sitesinde çalışmaz; bot sunucusunda
  (VPS / Railway / Render / Fly.io) çalıştır ve `risebunny.vercel.app`
  üzerinden CORS ile eriş. Alternatif: Vercel **serverless function**
  (`api/topgg/vote.js`) olarak yaz — `express.json()` yerine
  `export default function handler(req, res)` kullan.

- Vercel serverless varyantı:

  ```js
  // api/topgg/vote.js (Vercel'de)
  import crypto from 'crypto';
  export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const a = Buffer.from(req.headers.authorization || '', 'utf8');
    const b = Buffer.from(process.env.TOPGG_WEBHOOK_SECRET, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
      return res.status(401).end();
    // TODO: bot DB'sine kuyruk yaz (Upstash Redis / Firestore Admin SDK)
    res.status(204).end();
  }
  ```

- **Secrets:** Vercel → Project Settings → Environment Variables'a
  `TOPGG_WEBHOOK_SECRET`, `TOPGG_TOKEN` ekle.
- `TOPGG_BOT_ID=1540401487581020252` sabit kalacak (bot ID değişmez).

---

## 10) Kontrol Listesi (checklist)

- [ ] Top.gg → Webhooks → token + secret ayarlandı
- [ ] `.env` dosyası git'e eklenmedi (`.gitignore`)
- [ ] `@top-gg/sdk` v4 yüklendi (`npm install @top-gg/sdk`)
- [ ] `postMetrics` 30 dk'da bir yolluyor (log: `[TopGG] Stats gönderildi ✓`)
- [ ] Webhook v1 HMAC (`x-topgg-signature`) + v0 `Authorization` ikisi de doğrulanıyor
- [ ] Yanlış secret ile 401/403 dönüyor (curl testi)
- [ ] Test vote (`webhook.test` / `type: "test"`) ödül vermiyor
- [ ] Vote cooldown 12 saat DB'de çalışıyor
- [ ] Leaderboard API 5 dk cache + CORS sadece kendi domain
- [ ] `TOPGG_BOT_ID=1540401487581020252` doğru ayarlandı
- [ ] Sitesindeki widget'lar `1540401487581020252` ID ile çalışıyor
- [ ] `risebunny.html` (`/risebunny`) canlı ve bilgilendirme yapıyor
- [ ] Onaydan sonra: gerçek oy akışı + "oy ver" butonu sitesinde (`https://top.gg/bot/1540401487581020252/vote`)

---

## 11) Gizli Admin — Footer 5-Tık + 3 Yanlış Hakkı

Admin paneli arama motorlarında ve URL tahminlerinde görünmez:

1. **Sunucu katmanı (`vercel.json`):** `/admin`, `/admin.html`, `/yonetim`,
   `/panel`, `/dashboard`, `/login`, `/giris`, `/wp-admin` → hepsi `404.html`'e
   rewrite olur. `admin.html` ayrıca `noindex, nofollow` + `no-store` header'ı alır.
2. **İstemci kapısı (`rb-gateway.js` + `firebase-config.js`):** jetonsuz
   `admin.html` açılışı 404 gövdesiyle değiştirilir. Overlay, gerçek 404 ile
   **birebir aynıdır ve adminle ilgili hiçbir ipucu vermez.**
3. **Tek giriş yolu:** ana sayfa + `/risebunny` footer'ına (`#foot-base`) **5 tık**
   (2,5 sn penceresi) → 5 dk geçerli tek kullanımlık jeton
   (`rb_admin_token` + `rb_admin_time`) → `admin.html`.
4. **Yanlış hakkı: 3.** `js/admin.js` → `MAX_ATTEMPTS = 3`. 3. hatalı girişte
   cihaz Firestore `bans` koleksiyonuna yazılır ve kalsa bile panel 404'e düşer.
   Kalan hak login ekranında (`#login-attempts`) yazılır: `Kalan deneme: X / 3`.
5. **Arama dışı:** `robots.txt` tüm admin varyantlarını `Disallow` eder,
   `sitemap.xml` admin içermez, `admin.html` zaten `noindex` meta taşır.

Bu rehber `docs/TOPGG-REHBERI.md` olarak projede saklanır. 🐰
