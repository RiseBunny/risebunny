/*! RiseBunny core v6 — ban guard + MAINTENANCE GATE (all pages except admin.html) */
window.firebaseConfig = {
  apiKey: "AIzaSyAq5Nafl9aI2TabzGsj5J9ij6lNwyfTguM",
  authDomain: "gen-lang-client-0590499912.firebaseapp.com",
  projectId: "gen-lang-client-0590499912",
  storageBucket: "gen-lang-client-0590499912.firebasestorage.app",
  messagingSenderId: "203829901581",
  appId: "1:203829901581:web:66d532c52155db4aea9844"
};
window.ADMIN_UID = 'oblLBCNGXEYF8plKq8KUr3m6o4f1';

(function () {
'use strict';
if (window.__rbCoreLoaded) return; window.__rbCoreLoaded = true;
if (/admin\.html(\?|$)/.test(location.pathname)) {
  /* Gizli giriş kuralı: SADECE footer 5-tık jetonu + 5 dk tazelik.
     Doğrudan URL (/admin, /admin.html, /panel...) ile gelen herkes 404 görür. */
  var _tok = null, _tim = 0;
  try { _tok = sessionStorage.getItem('rb_admin_token'); _tim = parseInt(sessionStorage.getItem('rb_admin_time') || '0', 10) || 0; } catch (e) {}
  var _fresh = _tok === '1' && (Date.now() - _tim) < 5 * 60 * 1000;
  if (!_fresh) {
    try { sessionStorage.removeItem('rb_admin_token'); sessionStorage.removeItem('rb_admin_time'); } catch (e2) {}
    show404();
    return;
  }
}
var ADMIN_UID = window.ADMIN_UID;
var FORCE_PREVIEW = /[?&]mnt=1/.test(location.search);

function show404() {
  fetch('404.html').then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (h) {
    document.open(); document.write(h); document.close();
  }).catch(function () {
    document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#ffffff;color:#111827;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:20px"><div><h1 style="font-size:4rem;font-weight:800;letter-spacing:-.03em;margin:0">404</h1><p style="color:#6b7280;margin:10px 0 26px">Page Not Found</p><a href="index.html" style="color:#2563eb;text-decoration:none;font-weight:600">← Back to Home</a></div></div>';
  });
}
window.__rb404 = show404;

/* ── maintenance overlay (TR/EN, blocks everything) ── */
function showMaintenance(msg) {
  if (document.getElementById('rb-maintenance')) return;
  var lang = 'en';
  try { lang = localStorage.getItem('rb-lang') || 'tr'; } catch (e) {}
  if (lang !== 'tr' && lang !== 'en') lang = 'tr';
  var text = (msg && (msg[lang] || msg.tr || msg.en)) || 'Site geçici olarak bakımda. / Site is under maintenance.';
  var ov = document.createElement('div');
  ov.id = 'rb-maintenance';
  ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#07040f;color:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:24px;font-family:system-ui,sans-serif';
  var em = document.createElement('div');
  em.style.cssText = 'font-size:64px;animation:rbPulse 1.6s infinite';
  em.textContent = '🐰';
  var h = document.createElement('h1');
  h.style.cssText = 'margin:12px 0 4px;font-size:26px';
  h.textContent = lang === 'tr' ? '🔧 Bakım Modu' : '🔧 Maintenance';
  var p = document.createElement('p');
  p.style.cssText = 'color:#9ca3af;max-width:420px;line-height:1.6';
  p.textContent = text;
  var c = document.createElement('p');
  c.style.cssText = 'color:#4b5563;font-size:12px;margin-top:24px';
  c.textContent = '© 2026 RiseBunny';
  var st = document.createElement('style');
  st.textContent = '@keyframes rbPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}';
  ov.appendChild(em); ov.appendChild(h); ov.appendChild(p); ov.appendChild(c); ov.appendChild(st);
  (document.body || document.documentElement).appendChild(ov);
  try { document.body.style.overflow = 'hidden'; } catch (e) {}
}
function hideMaintenance() {
  var ov = document.getElementById('rb-maintenance');
  if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
  try { document.body.style.overflow = ''; } catch (e) {}
}

function run(app) {
  var db, auth = null;
  try { db = app.firestore(); } catch (e) { return; }
  try { if (app.auth) auth = app.auth(); } catch (e) { auth = null; }

  /* ban guard (needs auth SDK; skipped silently where absent) */
  if (auth) {
    try {
      auth.onAuthStateChanged(function (u) {
        if (!u) return;
        try {
          db.collection('users').doc(u.uid).get().then(function (s) {
            if (s.exists && s.data() && s.data().banned === true) show404();
          }).catch(function () {});
        } catch (e) {}
      });
    } catch (e) {}
  }

  /* maintenance gate: overlay FIRST, lift only for the real admin */
  function check(n) {
    var req;
    try { req = db.collection('config').doc('maintenance').get(); }
    catch (e) { if (n < 3) setTimeout(function () { check(n + 1); }, 1500); return; }
    req.then(function (s) {
      var d = (s && s.exists) ? s.data() : null;
      if ((!d || !d.active) && !FORCE_PREVIEW) return;
      showMaintenance(d && d.message);
      if (!auth) return; /* no auth SDK → stay in maintenance (safe side) */
      try {
        auth.onAuthStateChanged(function (u) {
          if (u && u.uid === ADMIN_UID) hideMaintenance();
          else showMaintenance(d && d.message);
        });
      } catch (e) {}
    }).catch(function () { if (n < 3) setTimeout(function () { check(n + 1); }, 1500); });
  }
  check(0);
}
function tick(n) {
  n = n || 0;
  if (window.firebase && window.firebase.firestore && firebase.apps.length) { run(firebase.app()); return; }
  if (n > 150) return;
  setTimeout(function () { tick(n + 1); }, 100);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { tick(0); }); else tick(0);
})();
