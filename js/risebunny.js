/*! RiseBunny Bot page — tanıtım + simülasyon + top.gg entegrasyonu (v1) */
(function () {
'use strict';
var $ = function (s, c) { return (c || document).querySelector(s); };
var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
var BOT_ID = '1540401487581020252';
var LEADERBOARD_URLS = [
  'https://risebunny.vercel.app/api/leaderboard/',
  'http://localhost:8000/api/leaderboard/'
];

var LANG = 'tr';
try { LANG = localStorage.getItem('rb-lang') || 'tr'; } catch (e) {}
if (LANG !== 'tr' && LANG !== 'en') LANG = 'tr';

function setLang(l) {
  LANG = (l === 'en') ? 'en' : 'tr';
  try { localStorage.setItem('rb-lang', LANG); } catch (e) {}
  document.documentElement.lang = LANG;
  $$('[data-tr]').forEach(function (el) {
    var v = el.getAttribute(LANG === 'tr' ? 'data-tr' : 'data-en');
    if (v !== null) el.textContent = v;
  });
  var ph = $('#sim-in');
  if (ph) ph.placeholder = LANG === 'tr' ? 'r!yardım yaz ve Enter\'a bas…' : 'Type r!help and hit Enter…';
  $$('.lang-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-lang') === LANG); });
}
$$('.lang-btn').forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); }); });

/* footer 5-tık → gizli admin (tüm sayfalarda aynı davranış) */
(function secretEntry() {
  var foot = document.getElementById('foot-base');
  if (!foot) return;
  var taps = 0, timer = null;
  foot.addEventListener('click', function () {
    taps++;
    clearTimeout(timer);
    timer = setTimeout(function () { taps = 0; }, 2500);
    if (taps >= 5) {
      taps = 0;
      try {
        sessionStorage.setItem('rb_admin_token', '1');
        sessionStorage.setItem('rb_admin_time', String(Date.now()));
      } catch (e) {}
      window.location.href = 'admin.html';
    }
  });
})();

/* burger */
var burger = $('#burger'), navLinks = $('#nav-links');
if (burger && navLinks) burger.addEventListener('click', function () {
  var open = navLinks.classList.toggle('open');
  burger.setAttribute('aria-expanded', open ? 'true' : 'false');
});

/* ── 1) İstatistik simülasyonu (gerçek veri varsa onunla değişir) ── */
var sim = { servers: 128, users: 18400, votes: 342 };
function fmt(n) { return Number(n || 0).toLocaleString(LANG === 'tr' ? 'tr-TR' : 'en-US'); }
function paintStats(src) {
  $('#st-servers').textContent = fmt(sim.servers);
  $('#st-users').textContent = fmt(sim.users);
  $('#st-votes').textContent = fmt(sim.votes);
  var tag = src === 'live' ? (LANG === 'tr' ? '● canlı' : '● live') : (LANG === 'tr' ? '○ simülasyon' : '○ simulation');
  ['st-servers-src', 'st-users-src', 'st-votes-src'].forEach(function (id) { var e = document.getElementById(id); if (e) e.textContent = tag; });
}
paintStats('sim');
setInterval(function () {
  sim.servers += Math.random() < 0.3 ? 1 : 0;
  sim.users += Math.floor(Math.random() * 9);
  sim.votes += Math.random() < 0.4 ? 1 : 0;
  paintStats(document.body.getAttribute('data-live') === '1' ? 'live' : 'sim');
}, 18000);
/* gerçek top.gg istatistiği (herkese açık, tokensız): bot detay endpoint'i */
fetch('https://top.gg/api/bots/' + BOT_ID, { headers: {} }).then(function (r) {
  if (!r.ok) throw 0;
  return r.json();
}).then(function (d) {
  if (d && (d.server_count || d.monthlyPoints || d.points)) {
    if (d.server_count) sim.servers = d.server_count;
    if (d.monthlyPoints) sim.votes = d.monthlyPoints;
    document.body.setAttribute('data-live', '1');
    paintStats('live');
  }
}).catch(function () { /* simülasyonda kal */ });

/* ── 2) Özellik kartları (botun gerçek kategorileri) ── */
var FEATS = [
  { i: '🛡️', t: { tr: 'Moderasyon', en: 'Moderation' }, d: { tr: 'ban, kick, mute, uyarı, sil — modlog destekli 10 komut.', en: 'ban, kick, mute, warn, purge — 10 commands with modlog.' }, c: 'r!ban @kullanıcı spam' },
  { i: '📝', t: { tr: 'Yapay Zeka Kayıt', en: 'AI Registration' }, d: { tr: 'İsim + yaş sorar, rolü otomatik verir, tag ekler.', en: 'Asks name + age, assigns roles automatically with tag.' }, c: 'r!k-kayıt-kanal #kayıt' },
  { i: '💰', t: { tr: 'Ekonomi (34 komut)', en: 'Economy (34 commands)' }, d: { tr: 'para, market, kasa, blackjack, slot, soygun, meslek, banka.', en: 'wallet, market, crates, blackjack, slots, heist, jobs, bank.' }, c: 'r!param • r!günlük-ödül' },
  { i: '🔒', t: { tr: 'Koruma (19 komut)', en: 'Protection (19 commands)' }, d: { tr: 'ban/rol/kanal koruma, reklam + küfür + spam engel, raid kalkanı.', en: 'ban/role/channel guard, ad + swear + spam filter, raid shield.' }, c: 'r!raid-koruma aç' },
  { i: '🎉', t: { tr: 'Çekiliş', en: 'Giveaways' }, d: { tr: 'Şartlı çekiliş: rol + davet koşulu, otomatik yeniden çekim.', en: 'Conditional giveaways: role + invite gates, auto re-roll.' }, c: 'r!çekiliş-şart rol @üye' },
  { i: '🏆', t: { tr: 'Seviye + XP', en: 'Levels + XP' }, d: { tr: 'Mesaj başına XP, seviye rolleri ve para ödülü.', en: 'XP per message, level roles and cash rewards.' }, c: 'r!seviye' },
  { i: '⭐', t: { tr: 'Abone Sistemi', en: 'Subscriber System' }, d: { tr: 'Abone rol akışı, yetkili + log kanalı ile tam takip.', en: 'Subscriber role flow with staff + log channel tracking.' }, c: 'r!abone @kullanıcı' },
  { i: '🎫', t: { tr: 'Ticket + Davet', en: 'Tickets + Invites' }, d: { tr: 'Destek ticket paneli, davet sıralaması ve rütbe ödülleri.', en: 'Support ticket panel, invite leaderboard and rank rewards.' }, c: 'r!ticketayarla #destek' }
];
$('#feat-grid').innerHTML = FEATS.map(function (f) {
  return '<div class="feat-card"><div class="fi">' + f.i + '</div><h3>' + (LANG === 'tr' ? f.t.tr : f.t.en) + '</h3><p>' +
    (LANG === 'tr' ? f.d.tr : f.d.en) + '</p><code>' + f.c + '</code></div>';
}).join('');

/* ── 3) Komut simülatörü ── */
var SIM = [
  { k: ['r!yardım', 'r!help', 'r!yardim'], t: '📚 **RiseBunny Yardım** — 17 kategori, 162 komut.\n🛡️ moderasyon • 📝 kayıt • 💰 ekonomi • 🔒 koruma • 🎉 çekiliş\nÖrn: `r!param` bakiyeni gösterir.' },
  { k: ['r!param', 'r!para', 'r!balance'], t: '💸 Bakiyen: **12.450** para • 🏦 Banka: **30.000**\nİpucu: `r!günlük-ödül` ile her gün bonus al.' },
  { k: ['r!günlük', 'r!günlük-ödül', 'r!gunluk', 'r!daily'], t: '🎁 Günlük ödül: **+2.500** 💸 + **+40** XP!\nYarın yine gel, seri bozulmasın 🔥' },
  { k: ['r!seviye', 'r!level', 'r!rank'], t: '🏆 Seviye **7** • XP **3.240 / 4.000**\nSonraki ödül: **5.000** 💸 (Seviye 8)' },
  { k: ['r!ping'], t: '🏓 Pong! **42ms** • API **67ms**' },
  { k: ['r!davet', 'r!invite', 'r!link'], t: '🔗 Davet: discord.com/oauth2/… (buton yukarıda 👆)\nDestek sunucusu çok yakında!' },
  { k: ['r!oy', 'r!vote'], t: '⬆️ Oy ver: top.gg/bot/' + BOT_ID + '/vote\nÖdül: **+1.000** 💸 + **+150** XP (12 saatte bir)' },
  { k: ['r!market'], t: '🛒 Market: 🐾 Pet (5.000) • 🎣 Olta (2.000) • 🍀 Şans (7.500)\nAlmak için: `r!satın-al pet` (simülasyon)' },
  { k: ['r!kasa'], t: '📦 Kasanı açtın: **+1.200** 💸 çıktı! 🎉' },
  { k: ['r!zar', 'r!zarat', 'r!dice'], t: '🎲 Zar: **5** — şanslı günündesin!' },
  { k: ['r!slot'], t: '🎰 | 🍒 | ⭐ | 🍒 | — az kalsın! Tekrar dene.' },
  { k: ['r!afk'], t: '💤 AFK modundasın. Döndüğünde seni bekliyor olacağız.' },
  { k: ['r!avatar', 'r!pp'], t: '🖼️ Avatarın: (simülasyonda görsel yok, Discord’da tam boy açılır)' },
  { k: ['r!istatistik', 'r!stats', 'r!botbilgi'], t: '🤖 RiseBunny • 162 komut • 17 kategori\n📡 Gecikme 42ms • ⬆️ Oy: top.gg/bot/' + BOT_ID }
];
function simReply(raw) {
  var q = String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!q) return null;
  for (var i = 0; i < SIM.length; i++) {
    for (var j = 0; j < SIM[i].k.length; j++) {
      if (q === SIM[i].k[j] || q.indexOf(SIM[i].k[j] + ' ') === 0) return SIM[i].t;
    }
  }
  if (q[0] !== 'r' && q[0] !== '!') return LANG === 'tr' ? 'Komutlar `r!` ile başlar. `r!yardım` dene 👆' : 'Commands start with `r!`. Try `r!help` 👆';
  return LANG === 'tr'
    ? 'Böyle bir komut bulamadım 🤔 `r!yardım` yazarak 162 komuta göz at.'
    : 'No such command 🤔 Type `r!help` to browse all 162 commands.';
}
var simLog = $('#sim-log');
function addMsg(who, text, isBot, scroll) {
  var wrap = document.createElement('div');
  wrap.className = 'dmsg';
  var av = document.createElement('span');
  av.className = 'da' + (isBot ? ' bot' : '');
  if (isBot) {
    var ai = document.createElement('img');
    ai.src = 'images/bot.png'; ai.alt = 'RiseBunny Bot'; ai.loading = 'lazy';
    av.appendChild(ai);
  } else {
    av.textContent = (who || 'S').slice(0, 1).toUpperCase();
  }
  var body = document.createElement('div');
  body.className = 'db';
  var nm = document.createElement('div');
  nm.className = 'dn';
  nm.textContent = who + ' ';
  if (isBot) { var tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = 'BOT'; nm.appendChild(tag); }
  var tx = document.createElement('div');
  tx.className = 'dt' + (isBot ? ' embed' : '');
  tx.textContent = text;
  body.appendChild(nm); body.appendChild(tx);
  wrap.appendChild(av); wrap.appendChild(body);
  simLog.appendChild(wrap);
  /* Açılıştaki karşılama mesajı sayfayı aşağı KAYDIRMAZ — hero'da başlanır.
     Yalnızca kullanıcı yazdıktan sonra ve simülatör ekrandaysa yaklaşılır. */
  if (scroll) wrap.scrollIntoView({ block: 'nearest' });
}
addMsg('RiseBunny', LANG === 'tr' ? 'Selam! 👋 `r!yardım` yazarak başla.' : 'Hey! 👋 Start with `r!help`.', true);
var HINTS = ['r!yardım', 'r!param', 'r!günlük-ödül', 'r!seviye', 'r!market', 'r!oy'];
$('#sim-hints').innerHTML = '';
HINTS.forEach(function (h) {
  var b = document.createElement('button');
  b.type = 'button'; b.textContent = h;
  b.addEventListener('click', function () { $('#sim-in').value = h; $('#sim-form').dispatchEvent(new Event('submit', { cancelable: true })); });
  $('#sim-hints').appendChild(b);
});
$('#sim-form').addEventListener('submit', function (e) {
  e.preventDefault();
  var inp = $('#sim-in');
  var v = inp.value;
  if (!v.trim()) return;
  addMsg(LANG === 'tr' ? 'Sen' : 'You', v, false, true);
  inp.value = '';
  setTimeout(function () {
    var r = simReply(v);
    addMsg('RiseBunny', r, true, true);
  }, 450);
});

/* ── 4) Moderasyon replay ── */
function replayMod() {
  var toxic = document.querySelector('#mod-demo .feed-line.toxic');
  var badge = $('#ban-badge');
  var sys = document.querySelector('#mod-demo .feed-line.sys');
  if (!toxic || !badge) return;
  var txt = toxic.querySelector('.txt');
  toxic.classList.remove('struck'); badge.classList.remove('show');
  if (sys) sys.style.opacity = '0.5';
  if (txt) txt.textContent = 'reklam: bedava-nitro.xyz';
  void toxic.offsetWidth;
  setTimeout(function () {
    toxic.classList.add('struck');
    if (txt) txt.textContent = LANG === 'tr' ? 'reklam silindi ✗' : 'ad removed ✗';
    if (sys) sys.style.opacity = '1';
  }, 750);
  setTimeout(function () { badge.classList.add('show'); }, 1700);
}
var rb1 = $('#btn-replay-mod');
if (rb1) rb1.addEventListener('click', replayMod);
setTimeout(replayMod, 1400);

/* ── 5) Leaderboard: bot API → Firestore → simülasyon (Zengin 10 + Level 10) ── */
var SIM_NAMES = ['Nova', 'BunnyQueen', 'Kaya', 'Mira', 'Efe', 'Luna', 'Aras', 'Zeyno', 'Pofuduk', 'Rüzgar'];
function simBoard(kind) {
  return SIM_NAMES.map(function (n, i) {
    return { name: n + (kind === 'rich' ? '' : '_TTV'), value: kind === 'rich' ? (95000 - i * 7311) : (28 - i * 2) };
  });
}
function paintBoard(elId, rows, kind) {
  var list = document.getElementById(elId);
  if (!list) return;
  list.innerHTML = '';
  rows.slice(0, 10).forEach(function (r, i) {
    var div = document.createElement('div');
    div.className = 'lb-row';
    var rk = document.createElement('span'); rk.className = 'rk'; rk.textContent = (i + 1) + '.';
    var nm = document.createElement('b'); nm.textContent = r.name || 'Unknown';
    var vl = document.createElement('span'); vl.className = 'vl';
    vl.textContent = kind === 'rich' ? Number(r.value || 0).toLocaleString(LANG === 'tr' ? 'tr-TR' : 'en-US') + ' 💸' : 'Lv ' + r.value;
    div.appendChild(rk); div.appendChild(nm); div.appendChild(vl);
    list.appendChild(div);
  });
}
function lbNote(srcKey) {
  var src = $('#lb-src');
  if (!src) return;
  src.textContent = srcKey === 'live-bot' ? (LANG === 'tr' ? '● bot API — canlı (5 dk önbellek)' : '● bot API — live (5-min cache)')
    : srcKey === 'live-db' ? (LANG === 'tr' ? '● site veritabanı — canlı' : '● site database — live')
    : (LANG === 'tr' ? '○ simülasyon — bot çevrimdışı' : '○ simulation — bot offline');
}
function loadBoard(kind, elId) {
  paintBoard(elId, simBoard(kind), kind);
  lbNote('sim');
  var tried = 0;
  function tryNext() {
    if (tried >= LEADERBOARD_URLS.length) { tryFirestore(); return; }
    var url = LEADERBOARD_URLS[tried++] + kind;
    fetch(url).then(function (r) {
      if (!r.ok) throw 0;
      return r.json();
    }).then(function (d) {
      if (d && d.data && d.data.length) { paintBoard(elId, d.data, kind); lbNote('live-bot'); }
      else tryFirestore();
    }).catch(tryNext);
  }
  function tryFirestore() {
    try {
      if (window.firebase && window.firebaseConfig && window.firebaseConfig.projectId) {
        if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
        firebase.firestore().collection('leaderboard').doc(kind).get().then(function (s) {
          if (s.exists && s.data() && s.data().data && s.data().data.length) { paintBoard(elId, s.data().data, kind); lbNote('live-db'); }
        }).catch(function () {});
      }
    } catch (e) {}
  }
  tryNext();
}
loadBoard('rich', 'lb-rich');
loadBoard('level', 'lb-level');

/* ── 6) Oy simülasyonu ── */
var sv = $('#btn-sim-vote');
if (sv) sv.addEventListener('click', function () {
  var box = $('#vote-sim');
  box.hidden = false;
  var weekend = [0, 6].indexOf(new Date().getDay()) > -1;
  var m = weekend ? 2 : 1;
  $('#vote-sim-text').textContent = '🥕 Oyun için teşekkürler! +' + (1000 * m).toLocaleString('tr-TR') + ' para ve +' + (150 * m) + ' XP kazandın (12 saat sonra tekrar).' + (weekend ? ' Hafta sonu 2×! 🎉' : '');
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

/* ── 7) Mini FAQ ── */
var FAQ = [
  { q: { tr: 'Bot ücretsiz mi?', en: 'Is the bot free?' }, a: { tr: 'Evet, tüm komutlar ücretsiz. Premium sadece ekstra kotalar açar.', en: 'Yes, all commands are free. Premium only unlocks extra quotas.' } },
  { q: { tr: 'Nasıl davet ederim?', en: 'How do I invite it?' }, a: { tr: 'Yukarıdaki "Botu Davet Et" butonu yeterli — yönetici yetkisi gerekir.', en: '"Invite the Bot" button above is enough — admin permission required.' } },
  { q: { tr: 'Oy ödülünü nasıl alırım?', en: 'How do I get the vote reward?' }, a: { tr: 'top.gg’de oy ver, webhook botuna iletir, para + XP otomatik yatar (12 saat cooldown).', en: 'Vote on top.gg, the webhook tells your bot, money + XP land automatically (12h cooldown).' } }
];
var fl = $('#sss-list');
if (fl) {
  fl.innerHTML = '';
  FAQ.forEach(function (f) {
    var item = document.createElement('div'); item.className = 'faq-item';
    var q = document.createElement('button'); q.type = 'button'; q.className = 'faq-q';
    q.appendChild(document.createTextNode(LANG === 'tr' ? f.q.tr : f.q.en));
    var ic = document.createElement('i'); ic.className = 'fa-solid fa-plus'; q.appendChild(ic);
    var a = document.createElement('div'); a.className = 'faq-a';
    var w = document.createElement('div'); var pp = document.createElement('p');
    pp.textContent = LANG === 'tr' ? f.a.tr : f.a.en;
    w.appendChild(pp); a.appendChild(w);
    q.addEventListener('click', function () { item.classList.toggle('open'); });
    item.appendChild(q); item.appendChild(a); fl.appendChild(item);
  });
}

/* ── 8) Hesabım & Mağaza (Discord oturumu) ── */
function fmtN(n) { return Number(n || 0).toLocaleString(LANG === 'tr' ? 'tr-TR' : 'en-US'); }
function paintAccount(s) {
  var box = $('#acc-box');
  if (!box) return;
  if (!s || !s.ok) {
    box.innerHTML = '<div class="acc-card"><div style="flex:1;min-width:220px"><div class="an">' +
      (LANG === 'tr' ? 'Henüz giriş yapmadın' : 'Not signed in') + '</div><p class="lb-note">' +
      (LANG === 'tr' ? 'Discord hesabınla giriş yap, bot cüzdanın burada görünsün.' : 'Sign in with Discord to see your bot wallet here.') +
      '</p></div><a class="btn solid" href="/api/auth/discord/start?next=/risebunny"><i class="fa-brands fa-discord"></i><span>Discord ile Giriş</span></a></div>';
    var sh = $('#shop-box');
    if (sh) sh.hidden = true;
    return;
  }
  var g = s.game;
  var html = '<div class="acc-card"><img src="' + s.user.avatar + '" alt=""><div style="flex:1;min-width:220px"><div class="an">' +
    s.user.username.replace(/[<>&"]/g, '') + '</div>';
  if (!s.botOnline || !g) {
    html += '<p class="lb-note">' + (LANG === 'tr' ? 'Bot çevrimdışı — bakiye şu an görünmüyor.' : 'Bot offline — balance unavailable right now.') + '</p>';
  } else {
    html += '<div class="acc-stats">'
      + '<span class="acc-stat">💸<b>' + fmtN(g.total) + '</b>' + (LANG === 'tr' ? 'Toplam' : 'Total') + '</span>'
      + '<span class="acc-stat">🏆<b>Lv ' + g.level + '</b>' + fmtN(g.xp) + ' XP</span>'
      + '<span class="acc-stat">💎<b>' + (g.premium.active ? ('✓ ' + g.premium.daysLeft + (LANG === 'tr' ? ' gün' : 'd')) : '—') + '</b>Premium</span>'
      + '<span class="acc-stat">🐾<b>' + (g.pets ? g.pets.length : 0) + '</b>Pet</span>'
      + '</div>';
  }
  html += '</div><a class="btn line sm" href="/api/me?logout=1" id="btn-logout2"><i class="fa-solid fa-right-from-bracket"></i><span>' + (LANG === 'tr' ? 'Çıkış' : 'Logout') + '</span></a></div>';
  box.innerHTML = html;
  var lo = $('#btn-logout2');
  if (lo) lo.addEventListener('click', function (e) { e.preventDefault(); fetch('/api/me?logout=1').then(function () { location.reload(); }); });
  loadShop(s.botOnline);
}
function loadShop(botOnline) {
  var sh = $('#shop-box');
  if (!sh) return;
  sh.hidden = false;
  var grid = $('#shop-grid');
  grid.innerHTML = '<p class="lb-note">…</p>';
  fetch('/api/shop/catalog').then(function (r) { return r.json(); }).then(function (j) {
    grid.innerHTML = '';
    (j.items || []).forEach(function (it) {
      var card = document.createElement('div');
      card.className = 'shop-card';
      var parts = String(it.ad).split(' ');
      var emoji = parts[0], name = parts.slice(1).join(' ');
      card.innerHTML = '<div class="emoji">' + emoji + '</div><h4>' + name.replace(/[<>&"]/g, '') + '</h4>'
        + '<div class="price">' + fmtN(it.fiyat) + ' 💸</div>'
        + (it.premiumGerek ? '<p class="lb-note">💎 premium gerekli</p>' : '');
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'btn solid sm';
      btn.textContent = LANG === 'tr' ? 'Satın Al' : 'Buy';
      btn.disabled = !botOnline && !window.RBSession.ok;
      btn.addEventListener('click', function () { buyItem(it, btn); });
      card.appendChild(btn);
      grid.appendChild(card);
    });
    if (!botOnline) {
      var n = document.createElement('p');
      n.className = 'lb-note';
      n.textContent = LANG === 'tr' ? 'Bot çevrimdışı — satın alma şu an kapalı, fiyatlar bilgi amaçlı.' : 'Bot offline — buying disabled, prices informational.';
      grid.appendChild(n);
    }
  }).catch(function () { grid.innerHTML = ''; });
}
function buyItem(it, btn) {
  btn.disabled = true;
  fetch('/api/shop/buy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: it.id }) })
    .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
    .then(function (res) {
      if (res.j.ok) {
        alert('✅ ' + res.j.ad + ' alındı! (-' + fmtN(res.j.fiyat) + ' 💸)');
        fetch('/api/me').then(function (r) { return r.json(); }).then(function (j2) {
          window.RBSession = { loading: false, ok: !!j2.ok, user: j2.user || null, game: j2.game || null, botOnline: !!j2.botOnline };
          paintAccount(window.RBSession);
        }).catch(function () {});
      } else {
        alert('⚠️ ' + (res.j.error || 'Hata'));
      }
      btn.disabled = false;
    })
    .catch(function () { alert('⚠️ Mağazaya ulaşılamadı.'); btn.disabled = false; });
}
if (window.RBSession && !window.RBSession.loading) paintAccount(window.RBSession);
window.addEventListener('rb-session', function (e) { paintAccount(e.detail); });

setLang(LANG);
})();
