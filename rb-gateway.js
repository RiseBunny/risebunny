/**
 * RiseBunny — rb-gateway.js
 *
 * Site tarafında, istenmeyen doğrudan URL'lerin (ör. /admin, /admin.html,
 * /yonetim, /panel, /risebunny-admin vs.) korunması için client-side bir
 * gate. Bu dosya, sayfanın yüklendiğinde çalışır ve eğer sayfadaki yol
 * "forbidden" listesinde ise, üstüne 404 overlay'ini çizer.
 *
 * Gerçek admin paneline giden tek yol:
 *   1) index.html altındaki footer "5 kere tıkla" akışı (app.js → secretEntry)
 *   2) sessionStorage içinde rb_admin_token=1 ile admin.html açılır
 *   3) admin.js içinde de token kontrolü var (hasToken → yoksa show404())
 *
 * Bu dosya, SPA benzeri navigasyonlarda (pushState/replaceState/popstate)
 * da koruma sağlar. Vercel tarafında da /admin(.*) → 404.html rewrite
 * vardır (vercel.json). Bu iki katman birlikte çalışır.
 */

(function () {
  'use strict';

  var FORBIDDEN = [
    '/admin',
    '/admin/',
    '/admin.html',
    '/yonetim',
    '/yonetim/',
    '/yonetim.html',
    '/panel',
    '/panel.html',
    '/dashboard',
    '/dashboard.html',
    '/login',
    '/login.html',
    '/giris',
    '/wp-admin',
    '/wp-admin/',
    '/risebunny-admin',
    '/risebunny-admin.html',
    '/risebunny-panel'
  ];

  function pathOnly(url) {
    var u = String(url || location.href).replace(/#[^#]*$/, '').replace(/\?.*$/, '');
    var m = u.match(/^[^:]+:\/\/[^/]+(\/[^?#]*)/);
    return m ? m[1].replace(/\/+$/, '') : '/';
  }

  function isForbidden(path) {
    var p = path.toLowerCase();
    for (var i = 0; i < FORBIDDEN.length; i++) {
      var f = FORBIDDEN[i].toLowerCase();
      if (p === f || p.indexOf(f + '/') === 0) {
        return true;
      }
    }
    return false;
  }

  function gate() {
    var currentPath = pathOnly(location.href);
    if (!isForbidden(currentPath)) return;

    var existing = document.getElementById('rb-gateway-404');
    if (existing) return;

    var wrap = document.createElement('div');
    wrap.id = 'rb-gateway-404';
    /* NOT: Bu overlay bilerek 404.html ile birebir aynı görünür ve
       admin paneline dair HİÇBİR ipucu vermez (footer sırrı sızmasın). */
    wrap.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999999;' +
      'background:#ffffff;color:#111827;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;text-align:center;padding:20px;' +
      'font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;' +
      'overflow:auto';

    var code = document.createElement('div');
    code.style.cssText = 'font-size:4rem;font-weight:800;letter-spacing:-0.03em;line-height:1;';
    code.textContent = '404';

    var title = document.createElement('p');
    title.style.cssText = 'color:#6b7280;margin:10px 0 26px;';
    title.textContent = 'Page Not Found';

    var back = document.createElement('a');
    back.href = 'index.html';
    back.textContent = '← Back to Home';
    back.style.cssText = 'color:#2563eb;text-decoration:none;font-weight:600;font-size:1rem';

    wrap.appendChild(code);
    wrap.appendChild(title);
    wrap.appendChild(back);
    document.documentElement.appendChild(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', gate);
  } else {
    gate();
  }

  if (typeof window.history !== 'undefined' && history.pushState) {
    history.pushState = (function (original) {
      return function () {
        var result = original.apply(this, arguments);
        gate();
        return result;
      };
    })(history.pushState);

    history.replaceState = (function (original) {
      return function () {
        var result = original.apply(this, arguments);
        gate();
        return result;
      };
    })(history.replaceState);

    window.addEventListener('popstate', gate);
  }
})();
