(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function esc(s) { if (s === undefined || s === null) return ''; return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function getSec() { try { return JSON.parse(localStorage.getItem('rb_sec_v1') || 'null') || { attempts: 0, banned: false }; } catch (e) { return { attempts: 0, banned: false }; } }
  function setSec(s) { try { localStorage.setItem('rb_sec_v1', JSON.stringify(s)); } catch (e) {} }
  function getDeviceId() { var id = localStorage.getItem('rb_device_id'); if (!id) { id = 'd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); localStorage.setItem('rb_device_id', id); } return id; }
  function show404() { fetch('404.html').then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (h) { document.open(); document.write(h); document.close(); }).catch(function () { document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#ffffff;color:#111827;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:20px"><div><h1 style="font-size:4rem;font-weight:800;letter-spacing:-.03em;margin:0">404</h1><p style="color:#6b7280;margin:10px 0 26px">Page Not Found</p><a href="index.html" style="color:#2563eb;text-decoration:none;font-weight:600">← Back to Home</a></div></div>'; }); }
  function toast(msg, type) { type = type || 'success'; var ic = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' }; var el = document.createElement('div'); el.className = 'toast toast-' + type; el.innerHTML = '<i class="fa-solid ' + (ic[type] || 'fa-circle-info') + '"></i><span>' + msg + '</span>'; var w = $('#toast-wrap'); if (w) w.appendChild(el); requestAnimationFrame(function () { el.classList.add('show'); }); setTimeout(function () { el.classList.remove('show'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 350); }, 4200); }
  /* Admin erişimi: SADECE bu iki kişi.
     - Firebase UID listesi + Discord köprü e-postaları (d<ID>@discord.risebunny.local).
     - Köprü şifresi HMAC ile üretildiği için o e-postayla SADECE gerçek Discord
       sahibi girebilir; e-posta kontrolü güvenlidir. */
  var ADMIN_UIDS = ['oblLBCNGXEYF8plKq8KUr3m6o4f1', '1310366324731547798'];
  var ADMIN_DISCORD = ['985126554306773063', '1310366324731547798'];
  function isAdminUser(u) {
    if (!u) return false;
    if (ADMIN_UIDS.indexOf(u.uid) > -1) return true;
    var em = String(u.email || '').toLowerCase();
    for (var i = 0; i < ADMIN_DISCORD.length; i++) {
      if (em === 'd' + ADMIN_DISCORD[i] + '@discord.risebunny.local') return true;
    }
    return false;
  }
  window.RB_IS_ADMIN = isAdminUser;
  var db = null, auth = null, fconf = window.firebaseConfig || null;
  if (window.firebase && fconf && fconf.projectId) { try { if (!firebase.apps.length) firebase.initializeApp(fconf); auth = firebase.auth(); db = firebase.firestore(); } catch (e) { db = null; } }
  if (!db || !auth) { show404(); return; }
  /* Gizli giriş: footer 5-tık jetonu + 5 dk tazelik şart.
     /admin, /admin.html vb. doğrudan denemeler buraya jetonsuz gelir → 404.
     Yanlış şifre hakkı: 3 (üç). 3. hatada cihaz Firestore 'bans'a yazılır. */
  var MAX_ATTEMPTS = 3;
  var TOKEN_TTL = 5 * 60 * 1000;
  var viaDiscord = /[?&]login=ok/.test(location.search);
  var hasToken = false;
  try {
    hasToken = sessionStorage.getItem('rb_admin_token') === '1' &&
      (Date.now() - (parseInt(sessionStorage.getItem('rb_admin_time') || '0', 10) || 0)) < TOKEN_TTL;
  } catch (e) { hasToken = false; }
  if (!hasToken && !viaDiscord) { show404(); return; }
  sessionStorage.removeItem('rb_admin_token');
  sessionStorage.removeItem('rb_admin_time');
  var DEVICE_ID = getDeviceId();
  var config = {}, products = [], faqs = [], features = [], translations = { en: {}, tr: {} }, banner = {}, messages = [], logs = [], currentIconInput = null;
  function logAction(a, d) { db.collection('activity').add({ action: a, detail: d || '', createdAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(function () {}); }
  function failAttempt(email) {
    var s = getSec(); s.attempts = (s.attempts || 0) + 1;
    if (s.attempts >= MAX_ATTEMPTS) {
      s.banned = true; setSec(s);
      sessionStorage.removeItem('rb_admin_token'); sessionStorage.removeItem('rb_admin_time');
      db.collection('bans').doc(DEVICE_ID).set({ email: email || 'bilinmiyor', deviceId: DEVICE_ID, attempts: s.attempts, banned: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(function () {});
      showLogin(); toast('Çok fazla başarısız deneme! Cihaz kısıtlandı.', 'error'); updateAttemptsHint(); return;
    }
    setSec(s); toast('Hatalı giriş! Kalan deneme: ' + (MAX_ATTEMPTS - s.attempts), 'error'); updateAttemptsHint();
  }
  function updateAttemptsHint() {
    var h = document.getElementById('login-attempts');
    if (!h) return;
    var s = getSec();
    var left = Math.max(0, MAX_ATTEMPTS - (s.attempts || 0));
    h.textContent = s.banned ? 'Bu cihaz kısıtlandı.' : ('Kalan deneme hakkı: ' + left + ' / ' + MAX_ATTEMPTS);
  }
  function showLogin() { var a = $('#auth-screen'); if (a) a.hidden = false; var p = $('#panel'); if (p) p.hidden = true; updateAttemptsHint(); }
  function showPanel() { var a = $('#auth-screen'); if (a) a.hidden = true; var p = $('#panel'); if (p) p.hidden = false; loadAll(); }
  function boot() {
    auth.onAuthStateChanged(function (user) {
      if (user && !isAdminUser(user)) {
        auth.signOut();
        try { history.replaceState(null, '', 'admin.html'); } catch (e) {}
        show404();
        return;
      }
      if (!user) { showLogin(); return; }
      try { history.replaceState(null, '', 'admin.html'); } catch (e2) {}
      sessionStorage.setItem('rb_admin_token', '1');
      sessionStorage.setItem('rb_admin_time', String(Date.now()));
      var e = $('#user-email'); if (e) e.textContent = user.email || '';
      showPanel();
    });
    var lf = $('#login-form');
    if (lf) lf.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('#login-email').value.trim().toLowerCase();
      auth.signInWithEmailAndPassword(email, $('#login-pass').value).then(function (r) {
        if (!isAdminUser(r.user)) { auth.signOut(); failAttempt(email); return; }
        setSec({ attempts: 0, banned: false });
        toast('Giriş başarılı', 'success'); logAction('login', 'Admin giriş yaptı');
      }).catch(function () { failAttempt(email); });
    });
    var lo = $('#btn-logout');
    if (lo) lo.addEventListener('click', function () { sessionStorage.removeItem('rb_admin_token'); sessionStorage.removeItem('rb_admin_time'); auth.signOut().then(function () { window.location.replace('index.html'); }); });
    $$('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.tab').forEach(function (x) { x.classList.remove('active'); });
        $$('.tab-panel').forEach(function (x) { x.classList.remove('active'); });
        btn.classList.add('active');
        var p = document.querySelector('[data-panel="' + btn.getAttribute('data-tab') + '"]');
        if (p) p.classList.add('active');
        var tb = btn.getAttribute('data-tab');
        if (tb === 'messages') loadMessages();
        if (tb === 'logs') loadLogs();
        if (tb === 'dashboard') loadDashboard();
        if (tb === 'bans') loadBans();
      });
    });
    var rb = $('#btn-refresh-bans'); if (rb) rb.addEventListener('click', loadBans);
    var rm = $('#btn-refresh-messages'); if (rm) rm.addEventListener('click', loadMessages);
  }
  db.collection('bans').doc(DEVICE_ID).get().then(function (snap) {
    if (snap.exists) { show404(); return; }
    if (getSec().banned) setSec({ attempts: 0, banned: false });
    boot();
  }).catch(function () { if (getSec().banned) { show404(); return; } boot(); });
  function loadAll() {
    Promise.all([
      db.collection('config').doc('site').get().catch(function () { return null; }),
      db.collection('products').get().catch(function () { return null; }),
      db.collection('faq').get().catch(function () { return null; }),
      db.collection('features').get().catch(function () { return null; }),
      db.collection('translations').doc('site').get().catch(function () { return null; }),
      db.collection('banner').doc('main').get().catch(function () { return null; }),
      db.collection('activity').orderBy('createdAt', 'desc').limit(20).get().catch(function () { return null; })
    ]).then(function (r) {
      if (r[0] && r[0].exists) config = r[0].data();
      products = []; if (r[1]) r[1].forEach(function (d) { var p = d.data(); p.id = d.id; products.push(p); });
      faqs = []; if (r[2]) r[2].forEach(function (d) { var f = d.data(); f.id = d.id; faqs.push(f); });
      features = []; if (r[3]) r[3].forEach(function (d) { var f = d.data(); f.id = d.id; features.push(f); });
      if (r[4] && r[4].exists) translations = r[4].data();
      if (r[5] && r[5].exists) banner = r[5].data();
      logs = []; if (r[6]) r[6].forEach(function (d) { var l = d.data(); l.id = d.id; logs.push(l); });
      buildAll();
    }).catch(function () { buildAll(); });
  }
  function buildAll() { buildGeneral(); buildProducts(); buildFAQ(); buildFeatures(); buildBanner(); buildTranslations(); loadDashboard(); }
  function buildGeneral() {
    $('#inp-lang').value = config.defaultLang || 'en';
    $('#inp-email').value = config.fallbackEmail || '';
    $('#inp-logo').value = config.logo || '';
    $('#soc-discord').value = (config.social && config.social.discord) || '';
    $('#soc-telegram').value = (config.social && config.social.telegram) || '';
    $('#soc-youtube').value = (config.social && config.social.youtube) || '';
    $('#soc-tiktok').value = (config.social && config.social.tiktok) || '';
  }
  var sg = $('#btn-save-general');
  if (sg) sg.addEventListener('click', function () {
    config = { defaultLang: $('#inp-lang').value, fallbackEmail: $('#inp-email').value.trim(), logo: $('#inp-logo').value.trim(), social: { discord: $('#soc-discord').value.trim(), telegram: $('#soc-telegram').value.trim(), youtube: $('#soc-youtube').value.trim(), tiktok: $('#soc-tiktok').value.trim() } };
    db.collection('config').doc('site').set(config).then(function () { toast('Genel ayarlar kaydedildi', 'success'); logAction('update_general', 'Genel ayarlar güncellendi'); }).catch(function (e) { toast('Hata: ' + e.message, 'error'); });
  });
  var lf2 = $('#logo-file');
  if (lf2) lf2.addEventListener('change', function () { if (!lf2.files[0]) return; uploadImage(lf2.files[0]).then(function (url) { $('#inp-logo').value = url; toast('Logo yüklendi', 'success'); }).catch(function (e) { toast('Hata: ' + e.message, 'error'); }); });
  function compressImage(file, maxDim, q) {
    return new Promise(function (res, rej) {
      var rd = new FileReader();
      rd.onload = function () {
        var img = new Image();
        img.onload = function () {
          var sc = Math.min(1, maxDim / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * sc)); c.height = Math.max(1, Math.round(img.height * sc));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', q));
        };
        img.onerror = rej; img.src = rd.result;
      };
      rd.onerror = rej; rd.readAsDataURL(file);
    });
  }
  function uploadImage(file) {
    toast('Görsel sıkıştırılıyor…', 'info');
    var st = [[1200, 0.85], [900, 0.78], [700, 0.7], [520, 0.62]];
    function at(i) {
      return compressImage(file, st[i][0], st[i][1]).then(function (d) {
        if (d.length <= 900000 || i === st.length - 1) { if (d.length > 950000) throw new Error('Görsel çok büyük'); toast('Görsel hazır ✓', 'success'); return d; }
        return at(i + 1);
      });
    }
    return at(0);
  }
  var COLORS = ['#7c3aed', '#a855f7', '#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
  function colorRowHTML(cur) {
    return '<div class="color-row"><span class="color-label">Renk:</span>' + COLORS.map(function (c) { return '<button type="button" class="swatch' + ((cur || '') === c ? ' sel' : '') + '" data-color="' + c + '" style="background:' + c + '"></button>'; }).join('') + '<input type="color" class="color-custom" value="' + (cur || '#06b6d4') + '"></div>';
  }
  function bindColor(row) {
    var hid = row.querySelector('.p-color, .v-color'); if (!hid) return;
    row.querySelectorAll('.swatch').forEach(function (sw) {
      sw.addEventListener('click', function () {
        row.querySelectorAll('.swatch').forEach(function (x) { x.classList.remove('sel'); });
        sw.classList.add('sel'); hid.value = sw.getAttribute('data-color');
        var cu = row.querySelector('.color-custom'); if (cu) cu.value = sw.getAttribute('data-color');
      });
    });
    var cu = row.querySelector('.color-custom');
    if (cu) cu.addEventListener('change', function () { row.querySelectorAll('.swatch').forEach(function (x) { x.classList.remove('sel'); }); hid.value = cu.value; });
  }
  var ICON_LIST = ['fa-solid fa-cube', 'fa-solid fa-box', 'fa-solid fa-gem', 'fa-solid fa-star', 'fa-solid fa-heart', 'fa-solid fa-bolt', 'fa-solid fa-lightbulb', 'fa-solid fa-rocket', 'fa-solid fa-flame', 'fa-solid fa-crown', 'fa-solid fa-shield-halved', 'fa-solid fa-layer-group', 'fa-solid fa-users', 'fa-solid fa-gamepad', 'fa-solid fa-robot', 'fa-solid fa-code', 'fa-solid fa-terminal', 'fa-solid fa-server', 'fa-solid fa-database', 'fa-solid fa-cloud', 'fa-solid fa-globe', 'fa-solid fa-chart-line', 'fa-solid fa-gauge-high', 'fa-solid fa-wand-magic-sparkles', 'fa-solid fa-palette', 'fa-brands fa-discord', 'fa-brands fa-github', 'fa-brands fa-youtube', 'fa-brands fa-x-twitter', 'fa-brands fa-instagram', 'fa-brands fa-apple', 'fa-brands fa-android', 'fa-brands fa-java', 'fa-brands fa-python'];
  function openIconPicker() {
    var m = $('#icon-picker'), g = $('#icon-grid'); if (!m || !g) return;
    g.innerHTML = ICON_LIST.map(function (ic, i) { return '<button type="button" class="icon-item" data-icon="' + ic + '" style="--c:' + COLORS[i % COLORS.length] + '"><i class="' + ic + '"></i><span>' + ic.replace(/^fa-(solid|brands)\s/, '') + '</span></button>'; }).join('');
    m.classList.add('open');
    g.querySelectorAll('.icon-item').forEach(function (b) {
      b.addEventListener('click', function () { if (currentIconInput) currentIconInput.value = b.getAttribute('data-icon'); m.classList.remove('open'); toast('İkon seçildi', 'info'); });
    });
  }
  var ipc = $('#icon-picker-close'); if (ipc) ipc.addEventListener('click', function () { $('#icon-picker').classList.remove('open'); });
  var ipm = $('#icon-picker'); if (ipm) ipm.addEventListener('click', function (e) { if (e.target === ipm) ipm.classList.remove('open'); });
  function buildProducts() {
    products.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var c = $('#product-rows'); if (!c) return;
    c.innerHTML = products.length === 0 ? '<p class="msg-empty">Henüz ürün yok.</p>' : products.map(productRow).join('');
    bindProductEvents();
  }
  function productRow(p) {
    var st = [['dev', 'Geliştirmede'], ['project', 'Proje'], ['active', 'Aktif']].map(function (s) { return '<option value="' + s[0] + '"' + (p.status === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('');
    return '<div class="admin-row" data-pid="' + p.id + '"><div class="row-header"><div class="row-title"><input type="text" class="p-name" value="' + esc(p.name || '') + '" placeholder="Ürün adı"></div><input type="number" class="p-order" value="' + (p.order || 0) + '" style="width:64px"></div>' +
      '<div class="row-controls"><input type="text" class="p-platform" value="' + esc(p.platform || '') + '" placeholder="Platform"><select class="p-status">' + st + '</select></div>' +
      '<div class="download-highlight">' +
        '<label><i class="fa-solid fa-link"></i> Get It / İndirme URL\'si (Site ana sayfasındaki Get It butonunun yönlendireceği link):</label>' +
        '<div style="display:flex;gap:8px;align-items:center"><input type="text" class="p-download" value="' + esc(p.download || '') + '" placeholder="https://...">' +
        '<button type="button" class="btn btn-outline btn-sm p-test-dl"><i class="fa-solid fa-arrow-up-right-from-square"></i> Test Et</button></div>' +
      '</div>' +
      '<div class="row-controls" style="margin-top:8px"><label class="btn btn-glow btn-sm" style="justify-content:center"><i class="fa-solid fa-upload"></i> Görsel Yükle<input type="file" class="p-file" accept="image/*" hidden></label><input type="text" class="p-image" value="' + esc(p.image || '') + '" placeholder="Görsel (yükleyince otomatik dolar)" readonly></div>' +
      '<div class="row-controls" style="margin-top:8px;grid-template-columns:1fr auto"><input type="text" class="p-icon" value="' + esc(p.icon || 'fa-solid fa-box') + '" readonly><button type="button" class="btn btn-glow btn-sm p-pick-icon"><i class="fa-solid fa-palette"></i> İkon Seç</button></div>' +
      '<input type="hidden" class="p-color" value="' + esc(p.color || '') + '">' + colorRowHTML(p.color) +
      '<div class="row-controls" style="margin-top:8px"><textarea class="p-desc-en" rows="2" placeholder="Açıklama (EN)">' + esc((p.desc && p.desc.en) || '') + '</textarea><textarea class="p-desc-tr" rows="2" placeholder="Açıklama (TR)">' + esc((p.desc && p.desc.tr) || '') + '</textarea></div>' +
      '<div class="row-controls" style="margin-top:8px"><textarea class="p-feat-en" rows="3" placeholder="Özellikler (EN)">' + esc(((p.features && p.features.en) || []).join('\n')) + '</textarea><textarea class="p-feat-tr" rows="3" placeholder="Özellikler (TR)">' + esc(((p.features && p.features.tr) || []).join('\n')) + '</textarea></div>' +
      '<div class="row-actions"><button type="button" class="btn btn-primary btn-sm p-save"><i class="fa-solid fa-floppy-disk"></i> Kaydet</button><button type="button" class="btn btn-outline btn-sm danger p-delete"><i class="fa-solid fa-trash"></i> Sil</button></div></div>';
  }
  function bindProductEvents() {
    $$('.admin-row[data-pid]').forEach(function (row) {
      row.querySelector('.p-file').addEventListener('change', function () { var f = row.querySelector('.p-file').files[0]; if (!f) return; uploadImage(f).then(function (url) { row.querySelector('.p-image').value = url; }).catch(function (e) { toast('Hata: ' + e.message, 'error'); }); });
      row.querySelector('.p-pick-icon').addEventListener('click', function () { currentIconInput = row.querySelector('.p-icon'); openIconPicker(); });
      var testBtn = row.querySelector('.p-test-dl');
      if (testBtn) testBtn.addEventListener('click', function () {
        var url = row.querySelector('.p-download').value.trim();
        if (url) window.open(url, '_blank', 'noopener');
        else toast('Lütfen önce geçerli bir Get It linki girin', 'error');
      });
      bindColor(row);
      row.querySelector('.p-save').addEventListener('click', function () {
        var pid = row.getAttribute('data-pid');
        var iconVal = row.querySelector('.p-icon').value.trim() || 'fa-solid fa-box';
        db.collection('products').doc(pid).set({ name: row.querySelector('.p-name').value.trim(), platform: row.querySelector('.p-platform').value.trim(), status: row.querySelector('.p-status').value, order: parseInt(row.querySelector('.p-order').value, 10) || 0, image: row.querySelector('.p-image').value.trim(), download: row.querySelector('.p-download').value.trim(), color: row.querySelector('.p-color').value || '#06b6d4', icon: iconVal, pIcon: iconVal, desc: { en: row.querySelector('.p-desc-en').value, tr: row.querySelector('.p-desc-tr').value }, features: { en: row.querySelector('.p-feat-en').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean), tr: row.querySelector('.p-feat-tr').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean) }, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }).then(function () { toast('Ürün kaydedildi', 'success'); logAction('update_product', 'Ürün güncellendi: ' + row.querySelector('.p-name').value); loadAll(); }).catch(function (e) { toast('Hata: ' + e.message, 'error'); });
      });
      row.querySelector('.p-delete').addEventListener('click', function () {
        if (!confirm('Silinsin mi?')) return;
        db.collection('products').doc(row.getAttribute('data-pid')).delete().then(function () { toast('Ürün silindi', 'success'); logAction('delete_product', 'Ürün silindi'); loadAll(); }).catch(function (e) { toast('Hata: ' + e.message, 'error'); });
      });
    });
    var ap = $('#btn-add-product');
    if (ap) ap.addEventListener('click', function () {
      var name = prompt('Yeni ürün adı:'); if (!name) return;
      var id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
      db.collection('products').doc(id).set({ name: name, platform: 'Platform', status: 'dev', order: products.length, image: '', download: '', color: '#06b6d4', icon: 'fa-solid fa-box', pIcon: 'fa-solid fa-box', desc: { en: '', tr: '' }, features: { en: [], tr: [] }, createdAt: firebase.firestore.FieldValue.serverTimestamp() }).then(function () { toast('Ürün oluşturuldu', 'success'); logAction('add_product', 'Yeni ürün: ' + name); loadAll(); }).catch(function (e) { toast('Hata: ' + e.message, 'error'); });
    });
  }
  function buildFAQ() {
    faqs.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var c = $('#faq-rows'); if (!c) return;
    c.innerHTML = faqs.length === 0 ? '<p class="msg-empty">Henüz FAQ yok.</p>' : faqs.map(function (f, i) {
      return '<div class="admin-row" data-fid="' + f.id + '"><div class="row-header"><div class="row-title">Soru #' + (i + 1) + '</div><input type="number" class="f-order" value="' + (f.order || i) + '" style="width:64px"></div>' +
        '<div class="row-controls"><input type="text" class="f-q-en" value="' + esc((f.q && f.q.en) || '') + '" placeholder="Soru (EN)"><input type="text" class="f-q-tr" value="' + esc((f.q && f.q.tr) || '') + '" placeholder="Soru (TR)"></div>' +
        '<div class="row-controls" style="margin-top:8px"><textarea class="f-a-en" rows="2" placeholder="Cevap (EN)">' + esc((f.a && f.a.en) || '') + '</textarea><textarea class="f-a-tr" rows="2" placeholder="Cevap (TR)">' + esc((f.a && f.a.tr) || '') + '</textarea></div>' +
        '<div class="row-actions"><button type="button" class="btn btn-primary btn-sm f-save"><i class="fa-solid fa-floppy-disk"></i> Kaydet</button><button type="button" class="btn btn-outline btn-sm danger f-delete"><i class="fa-solid fa-trash"></i> Sil</button></div></div>';
    }).join('');
    $$('.admin-row[data-fid]').forEach(function (row) {
      row.querySelector('.f-save').addEventListener('click', function () {
        db.collection('faq').doc(row.getAttribute('data-fid')).set({ order: parseInt(row.querySelector('.f-order').value, 10) || 0, q: { en: row.querySelector('.f-q-en').value, tr: row.querySelector('.f-q-tr').value }, a: { en: row.querySelector('.f-a-en').value, tr: row.querySelector('.f-a-tr').value }, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }).then(function () { toast('FAQ kaydedildi', 'success'); logAction('update_faq', 'FAQ güncellendi'); loadAll(); }).catch(function (e) { toast('Hata: ' + e.message, 'error'); });
      });
      row.querySelector('.f-delete').addEventListener('click', function () {
        if (!confirm('Silinsin mi?')) return;
        db.collection('faq').doc(row.getAttribute('data-fid')).delete().then(function () { toast('Silindi', 'success'); logAction('delete_faq', 'FAQ silindi'); loadAll(); }).catch(function (e) { toast('Hata: ' + e.message, 'error'); });
      });
    });
    var af = $('#btn-add-faq');
    if (af) af.addEventListener('click', function () {
      var id = 'f-' + Date.now().toString(36);
      db.collection('faq').doc(id).set({ order: faqs.length, q: { en: '', tr: '' }, a: { en: '', tr: '' }, createdAt: firebase.firestore.FieldValue.serverTimestamp() }).then(function () { toast('Yeni FAQ eklendi', 'success'); logAction('add_faq', 'Yeni FAQ'); loadAll(); }).catch(function (e) { toast('Hata: ' + e.message, 'error'); });
    });
  }
  function buildFeatures() {
    features.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var c = $('#feature-rows'); if (!c) return;
    c.innerHTML = features.length === 0 ? '<p class="msg-empty">Henüz özellik yok.</p>' : features.map(function (f, i) {
      return '<div class="admin-row" data-vid="' + f.id + '"><div class="row-header"><div class="row-title">Özellik #' + (i + 1) + '</div><input type="number" class="v-order" value="' + (f.order || i) + '" style="width:64px"></div>' +
        '<div class="row-controls" style="grid-template-columns:1fr auto"><input type="text" class="v-icon" value="' + esc(f.icon || 'fa-solid fa-star') + '" readonly><button type="button" class="btn btn-glow btn-sm v-pick-icon"><i class="fa-solid fa-palette"></i> İkon Seç</button></div>' +
        '<input type="hidden" class="v-color" value="' + esc(f.color || '') + '">' + colorRowHTML(f.color) +
        '<div class="row-controls" style="margin-top:8px"><input type="text" class="v-t-en" value="' + esc((f.title && f.title.en) || '') + '" placeholder="Başlık (EN)"><input type="text" class="v-t-tr" value="' + esc((f.title && f.title.tr) || '') + '" placeholder="Başlık (TR)"></div>' +
        '<div class="row-controls" style="margin-top:8px"><textarea class="v-d-en" rows="2" placeholder="Açıklama (EN)">' + esc((f.desc && f.desc.en) || '') + '</textarea><textarea class="v-d-tr" rows="2" placeholder="Açıklama (TR)">' + esc((f.desc && f.desc.tr) || '') + '</textarea></div>' +
        '<div class="row-actions"><button type="button" class="btn btn-primary btn-sm v-save"><i class="fa-solid fa-floppy-disk"></i> Kaydet</button><button type="button" class="btn btn-outline btn-sm danger v-delete"><i class="fa-solid fa-trash"></i> Sil</button></div></div>';
    }).join('');
    $$('.admin-row[data-vid]').forEach(function (row) {
      row.querySelector('.v-pick-icon').addEventListener('click', function () { currentIconInput = row.querySelector('.v-icon'); openIconPicker(); });
      bindColor(row);
      row.querySelector('.v-save').addEventListener('click', function () {
        db.collection('features').doc(row.getAttribute('data-vid')).set({ order: parseInt(row.querySelector('.v-order').value, 10) || 0, icon: row.querySelector('.v-icon').value.trim() || 'fa-solid fa-star', color: row.querySelector('.v-color').value || '#06b6d4', title: { en: row.querySelector('.v-t-en').value, tr: row.querySelector('.v-t-tr').value }, desc: { en: row.querySelector('.v-d-en').value, tr: row.querySelector('.v-d-tr').value }, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }).then(function () { toast('Özellik kaydedildi', 'success'); logAction('update_feature', 'Özellik güncellendi'); loadAll(); }).catch(function (e) { toast('Hata: ' + e.message, 'error'); });
      });
      row.querySelector('.v-delete').addEventListener('click', function () {
        if (!confirm('Silinsin mi?')) return;
        db.collection('features').doc(row.getAttribute('data-vid')).delete().then(function () { toast('Silindi', 'success'); logAction('delete_feature', 'Özellik silindi'); loadAll(); }).catch(function (e) { toast('Hata: ' + e.message, 'error'); });
      });
    });
    var av = $('#btn-add-feature');
    if (av) av.addEventListener('click', function () {
      var id = 'v-' + Date.now().toString(36);
      db.collection('features').doc(id).set({ order: features.length, icon: 'fa-solid fa-star', color: '#06b6d4', title: { en: '', tr: '' }, desc: { en: '', tr: '' }, createdAt: firebase.firestore.FieldValue.serverTimestamp() }).then(function () { toast('Yeni özellik eklendi', 'success'); logAction('add_feature', 'Yeni özellik'); loadAll(); }).catch(function (e) { toast('Hata: ' + e.message, 'error'); });
    });
  }
  function buildBanner() {
    $('#banner-enabled').checked = !!banner.enabled;
    $('#banner-type').value = banner.type || 'info';
    $('#banner-en').value = (banner.text && banner.text.en) || '';
    $('#banner-tr').value = (banner.text && banner.text.tr) || '';
    $('#banner-link').value = banner.link || '';
  }
  var sb = $('#btn-save-banner');
  if (sb) sb.addEventListener('click', function () {
    banner = { enabled: $('#banner-enabled').checked, type: $('#banner-type').value, text: { en: $('#banner-en').value, tr: $('#banner-tr').value }, link: $('#banner-link').value.trim(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    db.collection('banner').doc('main').set(banner).then(function () { toast('Banner kaydedildi', 'success'); logAction('update_banner', 'Banner güncellendi'); }).catch(function (e) { toast('Hata: ' + e.message, 'error'); });
  });
  var TRANS_KEYS = ['nav_home', 'nav_products', 'nav_about', 'nav_faq', 'nav_contact', 'hero_badge', 'hero_title', 'hero_sub', 'hero_desc', 'btn_explore', 'btn_learn', 'prod_title', 'prod_sub', 'view_details', 'status_dev', 'status_project', 'status_active', 'feat_title', 'feat_sub', 'about_title', 'about_p1', 'about_p2', 'eco_title', 'eco_sub', 'faq_title', 'contact_title', 'contact_sub', 'discord_title', 'discord_desc', 'lbl_name', 'lbl_email', 'lbl_subject', 'lbl_message', 'ph_name', 'ph_email', 'ph_subject', 'ph_message', 'btn_send', 'btn_sending', 'form_success', 'form_mailto', 'form_note', 'footer_slogan', 'footer_nav', 'footer_legal', 'footer_contact', 'privacy', 'terms', 'copyright', 'modal_features', 'btn_community', 'btn_download', 'btn_download_now', 'stat_cycle', 'stat_free', 'stat_excuses', 'stat_ideas'];
  function buildTranslations() {
    if (!translations.en) translations.en = {}; if (!translations.tr) translations.tr = {};
    var g = $('#trans-grid'); if (!g) return;
    g.innerHTML = TRANS_KEYS.map(function (k) {
      return '<div class="trans-key">' + k + '</div><div class="trans-row"><textarea rows="2" class="tr-en" data-key="' + k + '" placeholder="English">' + esc(translations.en[k] || '') + '</textarea><textarea rows="2" class="tr-tr" data-key="' + k + '" placeholder="Türkçe">' + esc(translations.tr[k] || '') + '</textarea></div>';
    }).join('');
  }
  var st2 = $('#btn-save-trans');
  if (st2) st2.addEventListener('click', function () {
    var en = {}, tr = {};
    $$('.tr-en').forEach(function (el) { var v = el.value.trim(); if (v) en[el.getAttribute('data-key')] = v; });
    $$('.tr-tr').forEach(function (el) { var v = el.value.trim(); if (v) tr[el.getAttribute('data-key')] = v; });
    translations = { en: en, tr: tr };
    db.collection('translations').doc('site').set(translations).then(function () { toast('Çeviriler kaydedildi', 'success'); logAction('update_translations', 'Çeviriler güncellendi'); }).catch(function (e) { toast('Hata: ' + e.message, 'error'); });
  });
  function loadMessages() {
    var l = $('#messages-list'); if (!l) return;
    l.innerHTML = '<div class="msg-empty">Yükleniyor...</div>';
    db.collection('messages').orderBy('createdAt', 'desc').limit(100).get().then(function (snap) {
      messages = []; snap.forEach(function (d) { var m = d.data(); m.id = d.id; messages.push(m); });
      if (messages.length === 0) { l.innerHTML = '<div class="msg-empty">Henüz mesaj yok.</div>'; return; }
      l.innerHTML = messages.map(function (m) {
        var dt = new Date(m.createdAt || 0);
        return '<div class="msg-item"><div class="msg-header"><span class="msg-sender">' + esc(m.name || '?') + ' &lt;' + esc(m.email || '?') + '&gt;</span><span class="msg-date">' + dt.toLocaleString('tr-TR') + '</span></div><div class="msg-subject">' + esc(m.subject || '(konu yok)') + '</div><div class="msg-body">' + esc(m.message || '') + '</div><div class="row-actions" style="margin-top:10px"><button type="button" class="btn btn-outline btn-sm danger msg-del" data-mid="' + m.id + '"><i class="fa-solid fa-trash"></i> Sil</button></div></div>';
      }).join('');
      $$('.msg-del').forEach(function (b) {
        b.addEventListener('click', function () {
          if (!confirm('Mesaj silinsin mi?')) return;
          db.collection('messages').doc(b.getAttribute('data-mid')).delete().then(function () { toast('Silindi', 'success'); loadMessages(); }).catch(function (e) { toast('Hata: ' + e.message, 'error'); });
        });
      });
    }).catch(function (e) { l.innerHTML = '<div class="msg-empty">Mesajlar yüklenemedi: ' + esc(e.message) + '</div>'; });
  }
  function loadBans() {
    var l = $('#bans-list'); if (!l) return;
    l.innerHTML = '<div class="msg-empty">Yükleniyor...</div>';
    db.collection('bans').get().then(function (snap) {
      if (snap.empty) { l.innerHTML = '<div class="msg-empty">Banlı kullanıcı yok 🎉</div>'; return; }
      var rows = []; snap.forEach(function (d) { var b = d.data(); b.id = d.id; rows.push(b); });
      rows.sort(function (a, b) { var ta = (a.createdAt && a.createdAt.toMillis) ? a.createdAt.toMillis() : 0; var tb = (b.createdAt && b.createdAt.toMillis) ? b.createdAt.toMillis() : 0; return tb - ta; });
      l.innerHTML = rows.map(function (b) {
        var dt = (b.createdAt && b.createdAt.toDate) ? b.createdAt.toDate().toLocaleString('tr-TR') : '-';
        return '<div class="msg-item"><div class="msg-header"><span class="msg-sender"><i class="fa-solid fa-user-slash" style="color:var(--err)"></i> ' + esc(b.email || 'bilinmiyor') + '</span><span class="msg-date">' + dt + '</span></div><div class="msg-subject">Cihaz ID: ' + esc(b.deviceId || b.id) + '</div><div class="msg-body">Hatalı deneme: ' + (b.attempts || 3) + ' — Durum: BANLI</div><div class="row-actions" style="margin-top:10px"><button type="button" class="btn btn-primary btn-sm ban-unban" data-bid="' + b.id + '"><i class="fa-solid fa-user-check"></i> Banı Kaldır</button></div></div>';
      }).join('');
      $$('.ban-unban').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('Emin misiniz? Bu kullanıcının banı kaldırılacak.')) return;
          db.collection('bans').doc(btn.getAttribute('data-bid')).delete().then(function () { toast('Ban kaldırıldı ✅', 'success'); logAction('unban', 'Ban kaldırıldı: ' + btn.getAttribute('data-bid')); loadBans(); }).catch(function (e) { toast('Hata: ' + e.message, 'error'); });
        });
      });
    }).catch(function (e) { l.innerHTML = '<div class="msg-empty">Banlar yüklenemedi: ' + esc(e.message) + '</div>'; });
  }
  function loadLogs() {
    var l = $('#logs-list'); if (!l) return;
    l.innerHTML = '<div class="log-empty">Yükleniyor...</div>';
    db.collection('activity').orderBy('createdAt', 'desc').limit(100).get().then(function (snap) {
      logs = []; snap.forEach(function (d) { var x = d.data(); x.id = d.id; logs.push(x); });
      if (logs.length === 0) { l.innerHTML = '<div class="log-empty">Aktivite yok.</div>'; return; }
      var icons = { login: 'fa-right-to-bracket', update_general: 'fa-sliders', update_product: 'fa-box', add_product: 'fa-box-open', delete_product: 'fa-trash', update_faq: 'fa-circle-question', add_faq: 'fa-plus', delete_faq: 'fa-trash', update_feature: 'fa-star', add_feature: 'fa-plus', delete_feature: 'fa-trash', update_banner: 'fa-bullhorn', update_translations: 'fa-language', unban: 'fa-user-check' };
      l.innerHTML = logs.map(function (x) {
        var d = (x.createdAt && x.createdAt.toDate) ? x.createdAt.toDate() : new Date();
        return '<div class="log-item"><i class="fa-solid ' + (icons[x.action] || 'fa-circle') + '"></i><span><b>' + esc(x.action) + '</b>: ' + esc(x.detail || '') + '</span><span class="log-date">' + d.toLocaleString('tr-TR') + '</span></div>';
      }).join('');
    }).catch(function (e) { l.innerHTML = '<div class="log-empty">Log yüklenemedi: ' + esc(e.message) + '</div>'; });
  }
  var cl = $('#btn-clear-logs');
  if (cl) cl.addEventListener('click', function () {
    if (!confirm('Tüm log silinsin mi?')) return;
    db.collection('activity').get().then(function (snap) { var batch = db.batch(); snap.forEach(function (d) { batch.delete(d.ref); }); return batch.commit(); }).then(function () { toast('Log temizlendi', 'success'); loadLogs(); }).catch(function (e) { toast('Hata: ' + e.message, 'error'); });
  });
  function loadDashboard() {
    var p = $('#stat-products'); if (p) p.textContent = products.length;
    var f = $('#stat-faq'); if (f) f.textContent = faqs.length;
    var ft = $('#stat-features'); if (ft) ft.textContent = features.length;
    db.collection('messages').get().then(function (snap) { var m = $('#stat-messages'); if (m) m.textContent = snap.size; }).catch(function () { var m = $('#stat-messages'); if (m) m.textContent = '?'; });
    db.collection('activity').orderBy('createdAt', 'desc').limit(5).get().then(function (snap) {
      var items = []; snap.forEach(function (d) { items.push(d.data()); });
      var icons = { login: 'fa-right-to-bracket', update_product: 'fa-box', add_product: 'fa-box-open', delete_product: 'fa-trash', update_faq: 'fa-circle-question', update_feature: 'fa-star', update_banner: 'fa-bullhorn', update_general: 'fa-sliders', update_translations: 'fa-language', unban: 'fa-user-check' };
      var r = $('#recent-logs'); if (!r) return;
      r.innerHTML = items.length === 0 ? '<div class="log-empty">Aktivite yok.</div>' : items.map(function (x) { var d = (x.createdAt && x.createdAt.toDate) ? x.createdAt.toDate() : new Date(); return '<div class="log-item"><i class="fa-solid ' + (icons[x.action] || 'fa-circle') + '"></i><span>' + esc(x.detail || x.action) + '</span><span class="log-date">' + d.toLocaleString('tr-TR') + '</span></div>'; }).join('');
    }).catch(function () { var r = $('#recent-logs'); if (r) r.innerHTML = '<div class="log-empty">Aktivite yüklenemedi.</div>'; });
  }
  /* ══════════ FORUM KULLANICI YÖNETİMİ — v17: creds/şifre yolu kaldırıldı ══════════ */
(function initForumTab() {
  if (!db || !auth) return;
  var FU = [];

  function mount() {
    var tabs = $$('.tab');
    if (!tabs.length) return setTimeout(mount, 300);
    if (document.querySelector('[data-tab="forum"]')) return;
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'tab'; btn.setAttribute('data-tab', 'forum');
    btn.innerHTML = '<i class="fa-solid fa-users-gear"></i> Forum';
    tabs[tabs.length - 1].parentNode.appendChild(btn);
    var sec = document.createElement('section');
    sec.className = 'tab-panel'; sec.setAttribute('data-panel', 'forum');
    sec.innerHTML = '<h2>🐰 Forum Kullanıcıları</h2>' +
      '<p style="color:#9ca3af;font-size:13px">Yetki verme, BAN ve <b style="color:#ff6b6d">HESAP SİLME</b>. Şifreler artık saklanmaz/değiştirilmez (güvenlik).</p>' +
      '<input type="text" id="fu-search" placeholder="🔍 Kullanıcı ara..." style="width:100%;margin:10px 0;padding:10px 12px;border-radius:10px;border:1px solid #2a3348;background:#0e1219;color:#fff;outline:none">' +
      '<div id="forum-users"><div class="msg-empty">Yükleniyor...</div></div>';
    $$('.tab-panel').slice(-1)[0].parentNode.appendChild(sec);
    btn.addEventListener('click', function () {
      $$('.tab').forEach(function (x) { x.classList.remove('active'); });
      $$('.tab-panel').forEach(function (x) { x.classList.remove('active'); });
      btn.classList.add('active'); sec.classList.add('active');
      loadForumUsers();
    });
    sec.querySelector('#fu-search').addEventListener('input', function (e) { renderForumUsers(e.target.value); });
  }

  function loadForumUsers() {
    var box = $('#forum-users'); if (!box) return;
    box.innerHTML = '<div class="msg-empty">Yükleniyor...</div>';
    db.collection('users').get().then(function (r) {
      FU = []; r.forEach(function (d) { var u = d.data(); u.uid = d.id; FU.push(u); });
      renderForumUsers('');
    }).catch(function (e) { box.innerHTML = '<div class="msg-empty">Hata: ' + esc(e.message) + '</div>'; });
  }

  function renderForumUsers(q) {
    var box = $('#forum-users'); if (!box) return;
    q = (q || '').toLowerCase();
    var list = FU.filter(function (u) { return (u.username || '').toLowerCase().indexOf(q) > -1; });
    box.innerHTML = list.length ? list.map(function (u) {
      return '<div class="admin-row" data-fuid="' + u.uid + '" style="margin-bottom:12px">' +
        '<div class="row-header"><div class="row-title"><b>👤 ' + esc(u.username) + '</b>' + (u.banned ? ' 🚫' : '') + ' <span style="opacity:.6;font-size:12px">(' + esc(u.role || 'member') + ')</span></div></div>' +
        '<div class="row-controls" style="margin-top:8px">' +
          '<select class="fu-role" style="padding:8px;border-radius:8px;background:#0e1219;color:#fff;border:1px solid #2a3348">' + ['member', 'vip', 'moderator', 'developer', 'kurucu'].map(function (r) { return '<option' + (r === u.role ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select>' +
          '<button type="button" class="btn btn-outline btn-sm fu-ban">' + (u.banned ? '✅ Ban Kaldır' : '🚫 BAN') + '</button>' +
          '<button type="button" class="btn btn-outline btn-sm danger fu-del">🗑 Hesabı Sil</button>' +
        '</div></div>';
    }).join('') : '<div class="msg-empty">Kullanıcı yok.</div>';

    $$('.admin-row[data-fuid]', box).forEach(function (row) {
      var uid = row.getAttribute('data-fuid');
      var u = null; FU.forEach(function (x) { if (x.uid === uid) u = x; });
      row.querySelector('.fu-role').addEventListener('change', function (e) {
        db.collection('users').doc(uid).update({ role: e.target.value }).then(function () {
          toast('Yetki güncellendi', 'success'); logAction('forum_role', u.username + ' → ' + e.target.value); loadForumUsers();
        });
      });
      row.querySelector('.fu-ban').addEventListener('click', function () {
        db.collection('users').doc(uid).update({ banned: !u.banned }).then(function () {
          toast(u.banned ? 'Ban kaldırıldı ✅' : 'BANlandı 🚫', 'success'); logAction('forum_ban', u.username); loadForumUsers();
        });
      });
      row.querySelector('.fu-del').addEventListener('click', function () { forumDelete(uid, u.username); });
    });
  }

  /* 🗑 HESABI SİL — Firestore verileri (Auth kaydı Firebase Console'dan silinir) */
  function forumDelete(uid, username) {
    if (!confirm('"' + username + '" hesabının TÜM forum verileri silinecek. Emin misin?')) return;
    if (!confirm('SON UYARI: Geri alınamaz! Devam edilsin mi?')) return;
    var cleanFirestore = function () {
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
    };
    cleanFirestore().then(function () {
      toast('✅ Forum verileri silindi (Auth kaydı: Firebase Console → Authentication)', 'success'); logAction('forum_delete', username); loadForumUsers();
    }).catch(function (e) { toast('Hata: ' + e.message, 'error'); loadForumUsers(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
})();
