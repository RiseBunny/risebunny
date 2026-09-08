/*! RiseBunny — Discord oturumu (site + forum ortak). /api/me okur, slotları doldurur. */
(function () {
'use strict';
function $(s, c) { return (c || document).querySelector(s); }
function $all(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

window.RBSession = { loading: true, ok: false, user: null, game: null, botOnline: false };

function loginBtnHTML() {
  return '<a class="btn sm solid" href="/api/auth/discord/start?next=/risebunny" style="white-space:nowrap"><i class="fa-brands fa-discord"></i><span>Discord ile Giriş</span></a>';
}
function chipHTML(u) {
  return '<span class="rb-discord-chip">'
    + '<a href="/risebunny#hesabim" title="Hesabım"><img src="' + u.avatar + '" alt=""></a>'
    + '<a href="/api/me?logout=1" class="rb-logout" title="Çıkış"><i class="fa-solid fa-right-from-bracket"></i></a>'
    + '</span>';
}
// /api/me?logout=1 JSON döndürür; çıkışı link ile değil fetch ile yap (+ Firebase + yerel iz temizliği)
document.addEventListener('click', function (e) {
  var a = e.target.closest ? e.target.closest('a.rb-logout') : null;
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

function paint() {
  var s = window.RBSession;
  $all('[data-auth-slot]').forEach(function (el) {
    el.innerHTML = s.ok ? chipHTML(s.user) : loginBtnHTML();
  });
  // Forum: #rb-nav-user yanına Discord rozeti (forum.js nav() ezmesin diye KARDEŞ span)
  var nav = $('#rb-nav-user');
  if (nav && !$('#rb-discord-slot')) {
    var sp = document.createElement('span');
    sp.id = 'rb-discord-slot';
    sp.style.cssText = 'display:inline-flex;align-items:center;margin-right:8px';
    nav.parentNode.insertBefore(sp, nav);
  }
  var fs = $('#rb-discord-slot');
  if (fs) fs.innerHTML = s.ok
    ? '<a href="/risebunny#hesabim" class="rb-dbtn" title="Hesabım"><img src="' + s.user.avatar + '" alt=""><span>' + s.user.username.replace(/[<>&"]/g, '') + '</span></a>'
    : '<a href="/api/auth/discord/start?next=/risebunny" class="rb-dbtn" title="Discord ile giriş"><i class="fa-brands fa-discord"></i><span>Discord</span></a>';
  /* Forumda Discord oturumu varsa eski giriş butonunu gizle (köprü Firebase'e sokar) */
  if (s.ok && $('#rb-nav-user')) {
    $all('a.rb-loginbtn').forEach(function (b) { b.style.display = 'none'; });
  }
  try { window.dispatchEvent(new CustomEvent('rb-session', { detail: s })); } catch (e) {}
}

fetch('/api/me').then(function (r) { return r.ok ? r.json() : { ok: false }; })
  .then(function (j) {
    window.RBSession = { loading: false, ok: !!j.ok, user: j.user || null, fb: j.fb || null, game: j.game || null, botOnline: !!j.botOnline };
    if (j.ok && j.user) {
      try { localStorage.setItem('rb_discord', JSON.stringify({ id: j.user.id, username: j.user.username })); } catch (e) {}
    } else {
      // Ters yön SSO: Discord çerezi yok ama Firebase oturumu varsa geri yükle
      restoreFromFirebase();
    }
    paint();
    forumBridge(window.RBSession);
  })
  .catch(function () { window.RBSession.loading = false; paint(); });

/* Forum → site yönü: Firebase'de bağlı kullanıcı risebunny'de tekrar giriş yapmaz. */
var __restoring = false;
function restoreFromFirebase() {
  if (__restoring) return;
  try {
    if (!window.firebase || !firebase.auth) return;
    if (!firebase.apps.length) {
      if (!window.firebaseConfig) return;
      try { firebase.initializeApp(window.firebaseConfig); } catch (e2) { return; }
    }
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

/* Forum + Admin Firebase köprüsü: Discord oturumu varsa ilgili kimlik için
   Firebase'e de sok. (Forum yazma + bakım muafiyeti Firebase Auth ister;
   kimlik bilgileri /api/me'den, oturum sahibine özel gelir.) */
function forumBridge(s) {
  try {
    if (!s.ok || !s.fb || !s.fb.email) return;
    var isForum = !!document.getElementById('rb-nav-user') || location.pathname.indexOf('forum') > -1;
    var isAdmin = /admin\.html/.test(location.pathname);
    if (!isForum && !isAdmin) return;
    if (!window.firebase || !firebase.auth) return;
    if (!firebase.apps.length) {
      if (!window.firebaseConfig) return;
      firebase.initializeApp(window.firebaseConfig);
    }
    var au = firebase.auth();
    if (au.currentUser) return;
    au.signInWithEmailAndPassword(s.fb.email, s.fb.pw).then(function () {
      setTimeout(function () { location.reload(); }, 400);
    }).catch(function () {});
  } catch (e) {}
}

var css = '.rb-discord-chip{display:inline-flex;align-items:center;gap:8px}'
  + '.rb-discord-chip img{width:32px;height:32px;border-radius:50%;display:block;border:2px solid #5865F2}'
  + '.rb-discord-chip .rb-logout{color:var(--muted,#6b7280);font-size:.9rem}'
  + '.rb-dbtn{display:inline-flex;align-items:center;gap:7px;padding:6px 12px 6px 6px;border:1px solid var(--line,#e5e7eb);border-radius:999px;font-size:.8rem;font-weight:600;color:var(--ink,#111827);background:#fff;text-decoration:none}'
  + '.rb-dbtn img{width:26px;height:26px;border-radius:50%;display:block}'
  + '.rb-dbtn i{color:#5865F2;font-size:1rem;margin-left:4px}';
var st = document.createElement('style');
st.textContent = css;
(document.head || document.documentElement).appendChild(st);
})();
