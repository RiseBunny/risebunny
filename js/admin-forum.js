/*! RiseBunny — Admin Forum Yönetimi (SECURE v3 — creds/şifre kasası kaldırıldı) */
(function () {
'use strict';
var tok = sessionStorage.getItem('rb_admin_token');
var tim = parseInt(sessionStorage.getItem('rb_admin_time') || '0', 10);
if (!(tok && (Date.now() - tim < 15 * 60 * 1000))) return;

function waitFB(cb, n) {
  if (window.firebase && window.firebaseConfig) return cb();
  if ((n || 0) > 100) return;
  setTimeout(function () { waitFB(cb, (n || 0) + 1); }, 100);
}

waitFB(function () {
  if (!firebase.apps.length) { try { firebase.initializeApp(window.firebaseConfig); } catch (e) { return; } }
  var db = firebase.firestore();
  var ADMIN_UID = 'oblLBCNGXEYF8plKq8KUr3m6o4f1';

  var FU = [];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function inject() {
    var btn = document.querySelector('[data-tab="forum"]');
    var sec = document.querySelector('[data-panel="forum"]');
    if (!btn || !sec) {
      var tabs = document.querySelectorAll('.tab');
      if (!tabs.length) return setTimeout(inject, 300);
      btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'tab'; btn.setAttribute('data-tab', 'forum');
      btn.innerHTML = '<i class="fa-solid fa-users-gear"></i> Forum';
      tabs[tabs.length - 1].parentNode.appendChild(btn);

      sec = document.createElement('section');
      sec.className = 'tab-panel'; sec.setAttribute('data-panel', 'forum');
      sec.innerHTML = '<h2>🐰 Forum Kullanıcıları</h2>' +
        '<p style="color:var(--muted);font-size:13px">Yetki · BAN · <b style="color:var(--err)">HESAP SİL</b> · 🧹 toplu temizlik — <b>şifreler artık saklanmaz</b> (güvenlik gereği)</p>' +
        '<button type="button" id="fu-purge" class="btn btn-outline btn-sm danger" style="margin:6px 0">🧹 KALINTI TEMİZLİĞİ — kurucu hariç TÜM hesapları sil</button>' +
        '<input type="text" id="fu-search" placeholder="🔍 Kullanıcı ara..." style="width:100%;margin:10px 0;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:#fff;color:var(--text);outline:none">' +
        '<div id="forum-users"><div class="msg-empty">Yükleniyor...</div></div>';
      var panels = document.querySelectorAll('.tab-panel');
      panels[panels.length - 1].parentNode.appendChild(sec);
    }
    if (btn.__bound) return; btn.__bound = true;
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function (x) { x.classList.remove('active'); });
      btn.classList.add('active'); sec.classList.add('active');
      load();
    });
    var srch = sec.querySelector('#fu-search');
    if (srch) srch.addEventListener('input', function (e) { render(e.target.value); });
    var prg = sec.querySelector('#fu-purge');
    if (prg) prg.addEventListener('click', purgeAll);
  }

  function load() {
    var box = document.getElementById('forum-users'); if (!box) return;
    box.innerHTML = '<div class="msg-empty">Yükleniyor...</div>';
    db.collection('users').get().then(function (r) {
      FU = []; r.forEach(function (d) { var u = d.data(); u.uid = d.id; FU.push(u); });
      render('');
    }).catch(function (e) { box.innerHTML = '<div class="msg-empty">Hata: ' + esc(e.message) + '</div>'; });
  }

  function render(q) {
    var box = document.getElementById('forum-users'); if (!box) return;
    q = (q || '').toLowerCase();
    var list = FU.filter(function (u) { return (u.username || '').toLowerCase().indexOf(q) > -1; });
    box.innerHTML = list.length ? list.map(function (u) {
      return '<div class="admin-row" data-fuid="' + u.uid + '" style="margin-bottom:12px">' +
        '<div class="row-header"><div class="row-title"><b>👤 ' + esc(u.username) + '</b>' + (u.banned ? ' 🚫' : '') + ' <span style="opacity:.6;font-size:12px">(' + esc(u.role || 'member') + ')</span></div></div>' +
        '<div class="row-controls" style="margin-top:8px">' +
          '<select class="fu-role" style="padding:8px;border-radius:8px;background:#0e1219;color:#fff;border:1px solid #2a3348">' + ['member', 'vip', 'moderator', 'developer', 'kurucu'].map(function (r) { return '<option' + (r === u.role ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select>' +
          '<button type="button" class="btn btn-outline btn-sm fu-ban">' + (u.banned ? '✅ Ban Kaldır' : '🚫 BAN') + '</button>' +
          '<button type="button" class="btn btn-outline btn-sm danger fu-del">🗑 HESABI SİL</button>' +
        '</div></div>';
    }).join('') : '<div class="msg-empty">Kullanıcı yok.</div>';

    box.querySelectorAll('.admin-row[data-fuid]').forEach(function (row) {
      var uid = row.getAttribute('data-fuid');
      var u = null; FU.forEach(function (x) { if (x.uid === uid) u = x; });
      row.querySelector('.fu-role').addEventListener('change', function (e) {
        db.collection('users').doc(uid).update({ role: e.target.value }).then(function () { alert('✅ Yetki güncellendi.'); load(); });
      });
      row.querySelector('.fu-ban').addEventListener('click', function () {
        db.collection('users').doc(uid).update({ banned: !u.banned }).then(function () { alert(u.banned ? '✅ Ban kaldırıldı.' : '🚫 BANlandı.'); load(); });
      });
      row.querySelector('.fu-del').addEventListener('click', function () {
        if (!confirm('"' + u.username + '" silinsin mi? (Firestore verileri; Auth kaydı Console\'dan silinir)')) return;
        doDelete(uid).then(function () { alert('✅ Forum verileri silindi.'); load(); });
      });
    });
  }

  /* ── Ortak silme (users + konular + yorumlar — creds yolu yok) ── */
  function doDelete(uid) {
    return Promise.all([
      db.collection('threads').where('authorId', '==', uid).get(),
      db.collection('posts').where('authorId', '==', uid).get()
    ]).then(function (snaps) {
      var b = db.batch();
      snaps[0].forEach(function (d) { b.delete(d.ref); });
      snaps[1].forEach(function (d) { b.delete(d.ref); });
      b.delete(db.collection('users').doc(uid));
      return b.commit();
    });
  }

  /* ── 🧹 TOPLU TEMİZLİK: kurucu/admin hariç HER ŞEY ── */
  function purgeAll() {
    if (!confirm('KURUCU hariç TÜM forum hesapları, konuları ve yorumları silinecek. Emin misin?')) return;
    if (!confirm('SON UYARI: GERİ ALINAMAZ! Devam edilsin mi?')) return;
    db.collection('users').get().then(function (snap) {
      var chain = Promise.resolve();
      snap.forEach(function (d) {
        if (d.id === ADMIN_UID) return;
        chain = chain.then(function () { return doDelete(d.id).catch(function () {}); });
      });
      return chain;
    }).then(function () {
      db.collection('activity').add({ action: 'forum_purge', detail: 'Toplu temizlik yapıldı', createdAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(function () {});
      alert('✅ Temizlik tamamlandı.'); load();
    });
  }

  inject();
});
})();
