/*! RiseBunny — Discord oturumu (site + forum + admin ortak, v2)
   Sorumlulukları:
   1) /api/me okur → RBSession (kullanıcı, fb köprüsü, bot verisi)
   2) [data-auth-slot] header butonlarını boyar (risebunny/rubidium)
   3) Forum: #rb-nav-user yanına Discord rozeti; oturum varsa eski login butonunu gizler
   4) ForumFirebase köprüsü: Discord oturumu → Firebase otomatik giriş (yazma yetkisi)
   5) Forum→site SSO geri yükleme: Firebase oturumu varsa çerezi basar
   6) Çıkış: çerez temizliği + Firebase signOut + reload
   NOT: ES module DEĞİL (script type=module olmadan yüklenebilir). */
(function () {
'use strict';
function $(s, c) { return (c || document).querySelector(s); }
function $all(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

window.RBSession = { loading: true, ok: false, user: null, fb: null, game: null, botOnline: false };

function loginBtnHTML() {
  return '<a class="btn sm solid" href="/api/auth/discord/start?next=/risebunny" style="white-space:nowrap"><i class="fa-brands fa-discord"></i><span>Discord ile Giriş</span></a>';
}
function chipHTML(u) {
  return '<span class="rb-discord-chip">'
    + '<a href="/risebunny#hesabim" title="Hesabım"><img src="' + u.avatar + '" alt=""></a>'
    + '<a href="#" class="rb-logout" title="Çıkış"><i class="fa-solid fa-right-from-bracket"></i></a>'
    + '</span>';
}

/* Çıkış: cookie sil + Firebase signOut + reload (link'ler fetch üzerinden çalışır) */
document.addEventListener('click', function (e) {
  var a = e.target.closest ? e.target.closest('a.rb-logout, #btn-logout2, a[href*="/api/me?logout=1"]') : null;
  if (!a) return;
  e.preventDefault();
  try { localStorage.removeItem('rb_discord'); } catch (err) {}
  try {
    if (window.firebase && firebase.apps && firebase.apps.length && firebase.auth) {
      firebase.auth().signOut().catch(function () {});
    }
  } catch (err2) {}
  fetch('/api/me?logout=1').then(function () { location.reload(); }).catch(function () { location.reload(); });
});

/* Forum→site yönü: Discord çerezi yok ama Firebase oturumu varsa geri yükle */
var __restoring = false;
function restoreFromFirebase() {
  if (__restoring) return;
  try {
    if (!window.firebase || !firebase.auth || !firebase.apps || !firebase.apps.length) return;
    var u = firebase.auth().currentUser;
    if (!u) return;
    __restoring = true;
    u.getIdToken().then(function (tok) {
      return fetch('/api/session/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: tok }) });
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.ok) location.reload();
      else __restoring = false;
    }).catch(function () { __restoring = false; });
  } catch (e) { __restoring = false; }
}

/* Site→forum yönü: Discord çerezi varsa Firebase'e otomatik gir (yazma yetkisi için) */
function forumBridge(s) {
  try {
    if (!s.ok || !s.fb || !s.fb.email || !s.fb.pw) return;
    var isForum = !!document.getElementById('rb-nav-user') || location.pathname.indexOf('forum') > -1;
    var isAdmin = /admin\.html/.test(location.pathname);
    var isAccount = /risebunny(\.html)?$/.test(location.pathname) || !!document.getElementById('acc-box');
    if (!isForum && !isAdmin && !isAccount) return;
    if (!window.firebase || !firebase.auth) return;
    if (!firebase.apps.length) {
      if (!window.firebaseConfig) return;
      try { firebase.initializeApp(window.firebaseConfig); } catch (e2) { return; }
    }
    var au = firebase.auth();
    if (au.currentUser) return;
    au.signInWithEmailAndPassword(s.fb.email, s.fb.pw).then(function () {
      setTimeout(function () { location.reload(); }, 400);
    }).catch(function () {});
  } catch (e) {}
}

function paint() {
  var s = window.RBSession;
  $all('[data-auth-slot]').forEach(function (el) {
    el.innerHTML = s.ok ? chipHTML(s.user) : loginBtnHTML();
  });
  // Forum: Discord rozeti (forum.js'in kendi nav'ının KARDEŞİ olarak)
  var nav = document.getElementById('rb-nav-user');
  if (nav && !document.getElementById('rb-discord-slot')) {
    var sp = document.createElement('span');
    sp.id = 'rb-discord-slot';
    sp.style.cssText = 'display:inline-flex;align-items:center;margin-right:8px';
    nav.parentNode.insertBefore(sp, nav);
  }
  var fs = document.getElementById('rb-discord-slot');
  if (fs) fs.innerHTML = s.ok
    ? '<a href="/risebunny#hesabim" class="rb-dbtn" title="Hesabım"><img src="' + s.user.avatar + '" alt=""><span>' + s.user.username.replace(/[<>&"]/g, '') + '</span></a>'
    : '<a href="/api/auth/discord/start?next=/risebunny" class="rb-dbtn" title="Discord ile giriş"><i class="fa-brands fa-discord"></i><span>Discord</span></a>';
  // Forumda eski giriş butonu: oturum varsa gizle, yoksa Discord'a yönlendir
  if (document.getElementById('rb-nav-user')) {
    $all('a.rb-loginbtn').forEach(function (b) {
      if (s.ok) { b.style.display = 'none'; }
      else {
        b.setAttribute('href', '/api/auth/discord/start?next=/risebunny');
        b.innerHTML = '<i class="fa-brands fa-discord"></i> Discord ile Giriş';
      }
    });
  }
  try { window.dispatchEvent(new CustomEvent('rb-session', { detail: s })); } catch (e) {}
}

fetch('/api/me').then(function (r) { return r.ok ? r.json() : { ok: false }; })
  .then(function (j) {
    window.RBSession = {
      loading: false, ok: !!j.ok, user: j.user || null,
      fb: j.fb || null, game: j.game || null, botOnline: !!j.botOnline
    };
    if (j.ok && j.user) {
      try { localStorage.setItem('rb_discord', JSON.stringify({ id: j.user.id, username: j.user.username })); } catch (e) {}
    } else {
      restoreFromFirebase();
    }
    paint();
    forumBridge(window.RBSession);
  })
  .catch(function () { window.RBSession.loading = false; paint(); });

var css = '.rb-discord-chip{display:inline-flex;align-items:center;gap:8px}'
  + '.rb-discord-chip img{width:32px;height:32px;border-radius:50%;display:block;border:2px solid #5865F2}'
  + '.rb-discord-chip .rb-logout{color:#6b7280;font-size:.9rem}'
  + '.rb-dbtn{display:inline-flex;align-items:center;gap:7px;padding:6px 12px 6px 6px;border:1px solid #e5e7eb;border-radius:999px;font-size:.8rem;font-weight:600;color:#111827;background:#fff;text-decoration:none}'
  + '.rb-dbtn img{width:26px;height:26px;border-radius:50%;display:block}'
  + '.rb-dbtn i{color:#5865F2;font-size:1rem;margin-left:4px}';
var st = document.createElement('style');
st.textContent = css;
(document.head || document.documentElement).appendChild(st);
})();
