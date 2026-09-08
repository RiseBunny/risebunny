/*! RiseBunny Forum v17 — security hardened (creds kaldırıldı, XSS esc, lang sync) */

const L = {
  tr:{ login:"Giriş / Kayıt", logout:"Çıkış", ident:"Kullanıcı adı", pass:"Şifre", enter:"Giriş Yap",
    cats:"Kategoriler", newThread:"＋ Yeni Konu", title:"Konu başlığı", content:"Mesajın...", send:"Gönder",
    reply:"Yanıt yaz...", replies:"yanıt", views:"görüntülenme", locked:"🔒 Yoruma kapalı", pinned:"📌 Sabit",
    admin:"⚙️ Yetkili Paneli", users:"Kullanıcılar", threads:"Konular", ban:"BAN", unban:"BAN Kaldır", del:"Sil",
    lock:"Kilitle", unlock:"Kilidi Aç", pin:"Sabitle", unpin:"Sabitleme", noPerm:"🚫 Bu bölüme erişim yetkin yok.",
    notFound:"404 — Sayfa Bulunamadı", empty:"Henüz konu yok. İlk konuyu sen aç! 🐰", vip:"VIP Forum",
    back:"← Geri", soon:"🐰 Duyurular için giriş yap veya bekle!", seed:"🌱 Varsayılan Kategorileri Tohumla",
    attach:"📷 Resim", addCat:"＋ Kategori Ekle", notif:"Bildirimler", readAll:"✓ Tümünü Okundu Say",
    search:"🔍 Kullanıcı ara...", maxThread:"🚫 Spam koruması: üyeler en fazla 2 konu açabilir.",
    catLocked:"🔒 Kategori kilitli — sadece yetkililer yazabilir", guestOnly:"🔐 Bu bölüm için giriş yapmalısın.",
    noNotif:"🔔 Bildirim yok.", delAcc:"🗑 Hesabı Sil" },
  en:{ login:"Login / Register", logout:"Logout", ident:"Username", pass:"Password", enter:"Sign in",
    cats:"Categories", newThread:"＋ New Thread", title:"Thread title", content:"Your message...", send:"Send",
    reply:"Write a reply...", replies:"replies", views:"views", locked:"🔒 Locked", pinned:"📌 Pinned",
    admin:"⚙️ Staff Panel", users:"Users", threads:"Threads", ban:"BAN", unban:"Unban", del:"Delete",
    lock:"Lock", unlock:"Unlock", pin:"Pin", unpin:"Unpin", noPerm:"🚫 You lack permission.",
    notFound:"404 — Not Found", empty:"No threads yet. Start the first! 🐰", vip:"VIP Forum",
    back:"← Back", soon:"🐰 Sign in to see more!", seed:"🌱 Seed Default Categories",
    attach:"📷 Image", addCat:"＋ Add Category", notif:"Notifications", readAll:"✓ Mark All Read",
    search:"🔍 Search user...", maxThread:"🚫 Anti-spam: members can open max 2 threads.",
    catLocked:"🔒 Category locked — staff only", guestOnly:"🔐 Sign in to view this section.",
    noNotif:"🔔 No notifications.", delAcc:"🗑 Delete Account" }
};
let lang = localStorage.getItem("rb-lang") || "tr";
const t = k => (L[lang] && L[lang][k]) || L.tr[k] || k;
window.rbSetLang = l => {
  lang = (l === "en") ? "en" : "tr";
  try { localStorage.setItem("rb-lang", lang); } catch (e) {}
  const bTr = document.getElementById("flang-tr"), bEn = document.getElementById("flang-en");
  if (bTr) bTr.classList.toggle("active", lang === "tr");
  if (bEn) bEn.classList.toggle("active", lang === "en");
  route();
};

const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const badge = r => { const b = RBAuth.BADGE[r] || RBAuth.BADGE.member;
  return `<span class="rb-badge" data-role="${r}">${b.icon}<i>${esc(b[lang]||b.tr)}</i></span>`; };
const fmt = ts => ts && ts.seconds ? new Date(ts.seconds*1000)
  .toLocaleString(lang=="tr"?"tr-TR":"en-GB",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const secs = ts => (ts && ts.seconds) || 0;
const rel = ts => { if (!ts || !ts.seconds) return "—";
  const d = Math.floor(Date.now()/1000 - ts.seconds);
  if (d < 60) return "az önce"; if (d < 3600) return Math.floor(d/60)+" dk önce";
  if (d < 86400) return Math.floor(d/3600)+" sa önce"; return Math.floor(d/86400)+" gün önce"; };
const view = () => document.getElementById("view");
const CUR = () => RBAuth.CURRENT();
const myW = () => RBAuth.myWeight();
const adminUnlocked = () => sessionStorage.getItem("rb_fadmin") === "1";

const canView = c => { const u = CUR();
  if (!u) return c.guest === true || c.slug === "duyurular";
  return (c.minWeight||0) <= myW(); };
const canPost = c => { const u = CUR(); if (!u) return false;
  return myW() >= (c.postWeight != null ? c.postWeight : (c.minWeight||0)) && (!c.locked || myW() >= 3); };

function showErr(e) { const v = document.getElementById("view");
  if (v) v.innerHTML = '<div class="rb-empty">⚠️ Hata: ' + (e && e.message ? e.message : e) + '</div>'; }
window.addEventListener("error", e => showErr(e.message || e.error));
window.addEventListener("unhandledrejection", e => { console.error("[RB]", e.reason); });

function show404() {
  if (window.__rb404) return window.__rb404();
  fetch('404.html').then(r => { if (!r.ok) throw 0; return r.text(); }).then(h => { document.open(); document.write(h); document.close(); })
  .catch(() => { document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#050507;color:#fff"><h1 style="font-size:5rem;margin:0">404</h1><p style="color:#9ca3af">Page Not Found</p></div>'; });
}

/* ── Ek CSS ── */
(function injectCSS(){
  const s = document.createElement('style');
  s.textContent = '.rb-postimg{max-width:100%;border-radius:12px;margin-top:10px;border:1px solid var(--line)}' +
    '.rb-attach{display:flex;align-items:center;gap:8px}.rb-prev{width:52px;height:52px;object-fit:cover;border-radius:10px;border:1px solid var(--line)}' +
    '.rb-bell{position:relative;flex:none;width:38px;height:38px;border-radius:50%;border:1px solid var(--line);background:var(--card);cursor:pointer;font-size:16px}' +
    '.rb-belln{position:absolute;top:-4px;right:-4px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:var(--err);color:#fff;font:800 10px/17px system-ui;font-style:normal;text-align:center}' +
    '.rb-notif{display:flex;gap:12px;align-items:flex-start;padding:14px;margin-bottom:10px;background:var(--card);border:1px solid var(--line);border-radius:14px;cursor:pointer;transition:.2s}' +
    '.rb-notif:hover{border-color:var(--acc)}.rb-notif.unread{border-color:rgba(139,92,246,.5);background:linear-gradient(135deg,rgba(139,92,246,.08),transparent)}' +
    '.rb-notif .ni{font-size:20px}.rb-notif p{margin:0;font-size:13.5px}.rb-notif small{color:var(--dim)}' +
    '.rb-search{width:100%;margin-bottom:12px;background:#0e1219;border:1px solid var(--line);border-radius:12px;color:var(--txt);padding:11px 14px;outline:none}' +
    '.rb-search:focus{border-color:var(--acc)}' +
    '.rb-ulink{cursor:pointer;text-decoration:underline dotted}.rb-ulink:hover{color:var(--acc)}' +
    '.rb-udetail h3{margin:18px 0 8px;font-size:15px}.rb-udetail small{color:var(--dim)}' +
    '.rb-rowclick{cursor:pointer}.rb-rowclick:hover{border-color:rgba(139,92,246,.5)}';
  document.head.appendChild(s);
})();

/* ── Görsel sıkıştırma ── */
function compressImage(file, maxDim, q) {
  return new Promise(function (res, rej) {
    const rd = new FileReader();
    rd.onload = function () {
      const img = new Image();
      img.onload = function () {
        const sc = Math.min(1, maxDim / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * sc)); c.height = Math.max(1, Math.round(img.height * sc));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', q));
      };
      img.onerror = rej; img.src = rd.result;
    };
    rd.onerror = rej; rd.readAsDataURL(file);
  });
}
async function pickImage(file) {
  const st = [[700,0.7],[520,0.6],[420,0.5]];
  for (let i=0;i<st.length;i++){
    const d = await compressImage(file, st[i][0], st[i][1]);
    if (d.length <= 400000 || i === st.length-1) {
      if (d.length > 450000) throw new Error("Görsel çok büyük");
      return d;
    }
  }
}
function bindFile(inputId, prevId, xId) {
  const f = document.getElementById(inputId);
  if (!f) return;
  f.addEventListener("change", async () => {
    if (!f.files[0]) return;
    try {
      window.__rbImg = await pickImage(f.files[0]);
      const pv = document.getElementById(prevId); if (pv) { pv.src = window.__rbImg; pv.hidden = false; }
      const x = document.getElementById(xId); if (x) x.hidden = false;
    } catch (e) { console.error(e); }
  });
}

/* ── Bildirim ── */
function notifyUser(userId, type, text, threadId) {
  if (!userId) return Promise.resolve();
  return db.collection("notifications").add({ userId, type, text, threadId: threadId || "",
    from: CUR() ? CUR().username : "system", read: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(()=>{});
}
function bellCount() {
  const u = CUR(); if (!u) return;
  db.collection("notifications").where("userId","==",u.uid).where("read","==",false).get()
    .then(s => { const el = document.getElementById("rb-bell-n");
      if (el) { el.hidden = s.size === 0; el.textContent = s.size > 9 ? "9+" : s.size; } }).catch(()=>{});
}

/* ── v16: profil onarımı + buton garantisi + son giriş tazeleme ── */
/* rules: username ^[a-z0-9_]+$ (3-20) — e-posta ön-ekini temizlemeden yazmak DENY yer. */
function cleanUname(raw) {
  let u = String(raw || "uye").toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "").slice(0, 20);
  if (u.length < 3) u = (u + "uye").slice(0, 20);
  if (u.length < 3) u = "uye" + Math.floor(Math.random() * 900 + 100);
  return u;
}
function heal() {
  if (typeof db === 'undefined' || typeof auth === 'undefined') return setTimeout(heal, 300);
  auth.onAuthStateChanged(async u => {
    if (!u) return;
    try {
      const ref = db.collection("users").doc(u.uid);
      const s = await ref.get();
      if (!s.exists) {
        // Discord ile gelenlerde Discord adı tercih edilir (sanitize edilir)
        let disc = null;
        try { disc = JSON.parse(localStorage.getItem("rb_discord") || "null"); } catch (e2) {}
        const uname = cleanUname(((disc && disc.username) || (u.email || ("uye" + u.uid.slice(0,6)))).split("@")[0]);
        await ref.set({ username: uname, role: "member",
          avatar:"", banned:false, stats:{threads:0,posts:0,likes:0},
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastLogin: firebase.firestore.FieldValue.serverTimestamp() }).catch(async () => {
            await ref.set({ username: cleanUname(uname + Math.floor(Math.random()*90+10)), role:"member", avatar:"", banned:false,
              stats:{threads:0,posts:0,likes:0},
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              lastLogin: firebase.firestore.FieldValue.serverTimestamp() });
          });
        location.reload();
      }
    } catch (e) {}
  });
}
function ensureBtn() {
  let n = 0;
  (function run(){
    n++;
    document.querySelectorAll('.rb-cathead').forEach(ch => {
      if (ch.querySelector('.rb-fab') || ch.querySelector('.rb-btn')) return;
      const slug = decodeURIComponent((location.hash.split('/')[2] || ''));
      const u = CUR();
      const a = document.createElement('a'); a.className = 'rb-btn';
      a.href = u ? '#/new/' + encodeURIComponent(slug) : '#/login';
      a.textContent = '＋ Yeni Konu'; ch.appendChild(a);
    });
    if (n < 20) setTimeout(run, 1200);
  })();
}
function touchLastLogin() {
  const u = CUR(); if (!u) return;
  const k = "rb_ll_" + u.uid;
  if (sessionStorage.getItem(k)) return;
  sessionStorage.setItem(k, "1");
  db.collection("users").doc(u.uid).update({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() }).catch(()=>{});
}

/* ── Navbar ─ */
function nav() {
  const u = CUR();
  const box = document.getElementById("rb-nav-user"); if (!box) return;
  box.innerHTML = u
    ? `${myW()>=2 ? `<a class="rb-navvip" href="#/c/vip" title="${t("vip")}">⭐</a>` : ""}
       <button class="rb-bell" onclick="location.hash='#/notif'" title="${t("notif")}">🔔<i id="rb-bell-n" class="rb-belln" hidden></i></button>
       <a class="rb-userchip" href="#/u/${esc(u.username)}">${badge(u.role)}<b>${esc(u.username)}</b></a>
       ${myW()>=3 && adminUnlocked() ? `<a class="rb-navadmin" href="#/admin" title="${t("admin")}">⚙️</a>` : ""}
       <button class="rb-navexit" onclick="RB.logout()" title="${t("logout")}">⎋</button>`
    : `<a class="rb-loginbtn" href="#/login">🐰 ${t("login")}</a>`;
  bellCount();
}

/* ── Router ── */
function route() {
  try {
    nav();
    const cu = CUR();
    if (cu && cu.banned) { RB.logout(); return show404(); }
    const h = (location.hash || "#/").split("/");
    const page = h[1] || "", arg = decodeURIComponent(h[2] || "");
    if (page === "")        return renderHome();
    if (page === "c")       return renderCategory(arg);
    if (page === "t")       return renderThread(arg);
    if (page === "u")       return renderProfile(arg);
    if (page === "new")     return renderNew(arg);
    if (page === "login")   return renderLogin();
    if (page === "notif")   return renderNotif();
    if (page === "admin") {
      if (!adminUnlocked() || myW() < 3)
        return view().innerHTML = `<div class="rb-empty">${t("notFound")}</div>`;
      return renderAdmin();
    }
    view().innerHTML = `<div class="rb-empty">${t("notFound")}</div>`;
  } catch (e) { showErr(e); }
}

/* ── Tohum ── */
async function seedCats() {
  const cats = [
    { slug:"duyurular", icon:"📢", order:1, minWeight:0, postWeight:3, guest:true, name:{tr:"Duyurular",en:"Announcements"}, desc:{tr:"Resmi RiseBunny duyuruları — sadece yetkililer yazar",en:"Official news — staff only writes"} },
    { slug:"minecraft", icon:"⛏️", order:2, minWeight:1, name:{tr:"Minecraft",en:"Minecraft"}, desc:{tr:"Rubidium & client",en:"Rubidium & client"} },
    { slug:"vip", icon:"⭐", order:3, minWeight:2, name:{tr:"VIP Forum",en:"VIP Lounge"}, desc:{tr:"Sadece VIP+",en:"VIP+ only"} }
  ];
  const b = db.batch();
  cats.forEach(c => b.set(db.collection("categories").doc(c.slug), { ...c, stats:{threads:0,posts:0} }));
  ["genel","staff"].forEach(s => b.delete(db.collection("categories").doc(s)));
  await b.commit().catch(async () => {
    for (const c of cats) await db.collection("categories").doc(c.slug).set({ ...c, stats:{threads:0,posts:0} }).catch(()=>{});
    await db.collection("categories").doc("genel").delete().catch(()=>{});
    await db.collection("categories").doc("staff").delete().catch(()=>{});
  });
}

/* ── Ana sayfa (canlı sayaç) ── */
async function renderHome() {
  let snap = await db.collection("categories").get();
  let cats = []; snap.forEach(d => cats.push({ slug: d.id, ...d.data() }));
  if (!cats.length && myW() >= 5) { await seedCats();
    snap = await db.collection("categories").get(); cats = []; snap.forEach(d => cats.push({ slug: d.id, ...d.data() })); }
  if (myW() >= 5) {
    const dy = cats.find(c => c.slug === "duyurular");
    if (dy && dy.guest !== true)
      await db.collection("categories").doc("duyurular").update({ guest: true, postWeight: 3 }).catch(()=>{});
  }
  const counts = {};
  try {
    const all = await db.collection("threads").get();
    all.forEach(d => { const cid = d.data().categoryId; counts[cid] = (counts[cid]||0) + 1; });
  } catch (e) {}
  cats.sort((a,b) => (a.order||0) - (b.order||0));
  let cards = "";
  cats.forEach(c => {
    if (!canView(c)) return;
    cards += `<a class="rb-card" href="#/c/${esc(c.slug)}">
      <div class="rb-icon">${esc(c.icon||"💬")}</div>
      <div class="rb-info"><h3>${esc((c.name&&c.name[lang])||(c.name&&c.name.tr)||c.slug)}
        ${(c.minWeight||0)>=2?"🔒":""}${c.locked?"🔐":""}</h3>
        <p>${esc((c.desc&&c.desc[lang])||(c.desc&&c.desc.tr)||"")}</p></div>
      <div class="rb-stats"><div class="rb-stat"><b>${counts[c.slug]||0}</b><span>${t("threads")}</span></div></div></a>`;
  });
  view().innerHTML = `<div class="forum-wrap"><h2 class="rb-h2">${t("cats")}</h2>
    ${cards || `<div class="rb-empty">${t("soon")}</div>`}</div>`;
}

/* ── Konu listesi ── */
async function renderCategory(slug) {
  const cd = await db.collection("categories").doc(slug).get();
  if (!cd.exists || !canView(cd.data()))
    return view().innerHTML = `<div class="forum-wrap"><a class="rb-back" href="#/">${t("back")}</a><div class="rb-empty">${CUR()?t("noPerm"):t("guestOnly")}</div></div>`;
  const c = cd.data();
  const snap = await db.collection("threads").where("categoryId","==",slug).get();
  const list = []; snap.forEach(d => list.push({ id: d.id, ...d.data() }));
  list.sort((a,b) => (b.pinned?1:0)-(a.pinned?1:0) || secs(b.lastPostAt)-secs(a.lastPostAt));
  view().innerHTML = `<div class="forum-wrap">
    <a class="rb-back" href="#/">${t("back")}</a>
    <div class="rb-cathead"><span class="rb-icon">${esc(c.icon||"💬")}</span>
      <h2>${esc((c.name&&c.name[lang])||c.slug)}</h2></div>
    ${myW()>=3 ? `<div class="rb-modbar"><button class="rb-ghost" onclick="RB.lockCat('${esc(slug)}',${!c.locked})">${c.locked?t("unlock"):t("lock")} 🗂️</button></div>` : ""}
    ${c.locked ? `<div class="rb-empty" style="padding:10px 0">${t("catLocked")}</div>` : ""}
    ${list.map(th => `<a class="rb-card" href="#/t/${th.id}">
      <div class="rb-info"><h3>${th.pinned?`<em class="rb-pin">${t("pinned")}</em> `:""}${th.locked?`<em class="rb-lock">${t("locked")}</em> `:""}${esc(th.title)}</h3>
        <p>${badge(th.authorRole||"member")} <b>${esc(th.authorName)}</b> · ${fmt(th.createdAt)}</p></div>
      <div class="rb-stats"><div class="rb-stat"><b>${th.replies||0}</b><span>${t("replies")}</span></div>
      <div class="rb-stat"><b>${th.views||0}</b><span>${t("views")}</span></div></div></a>`).join("") || `<div class="rb-empty">${t("empty")}</div>`}
    ${canPost(c) ? `<a class="rb-fab" href="#/new/${esc(slug)}" title="${t("newThread")}">＋</a>` : ""}</div>`;
}

/* ── Konu + yanıtlar (tekil görüntülenme) ── */
async function renderThread(id) {
  const td = await db.collection("threads").doc(id).get();
  if (!td.exists) return view().innerHTML = `<div class="forum-wrap"><a class="rb-back" href="#/">${t("back")}</a><div class="rb-empty">${t("notFound")}</div></div>`;
  const th = td.data();
  const cd = await db.collection("categories").doc(th.categoryId).get();
  const c = cd.exists ? cd.data() : {};
  if (!canView(c)) return view().innerHTML = `<div class="forum-wrap"><a class="rb-back" href="#/">${t("back")}</a><div class="rb-empty">${CUR()?t("noPerm"):t("guestOnly")}</div></div>`;
  const u0 = CUR();
  let countIt = false;
  if (u0) countIt = !(th.viewedBy || []).includes(u0.uid);
  else countIt = sessionStorage.getItem("rb_seen_" + id) !== "1";
  if (countIt) {
    const up = { views: firebase.firestore.FieldValue.increment(1) };
    if (u0) up.viewedBy = firebase.firestore.FieldValue.arrayUnion(u0.uid);
    db.collection("threads").doc(id).update(up).catch(()=>{});
    if (!u0) sessionStorage.setItem("rb_seen_" + id, "1");
  }
  const ps = await db.collection("posts").where("threadId","==",id).get();
  const arr = []; ps.forEach(d => arr.push({ id: d.id, ...d.data() }));
  arr.sort((a,b) => secs(a.createdAt) - secs(b.createdAt));
  let posts = ""; arr.forEach(p => {
    posts += `<div class="rb-post"><div class="rb-posthead">${badge(p.authorRole||"member")}
      <b>${esc(p.authorName)}</b><span class="rb-time">${fmt(p.createdAt)}${p.edited?" ✏️":""}</span></div>
      <div class="rb-postbody">${esc(p.content).replace(/\n/g,"<br>")}</div>
      ${p.image ? `<img class="rb-postimg" src="${esc(p.image)}" alt="" loading="lazy">` : ""}
      ${myW()>=3 ? `<button class="rb-ghost" onclick="RB.delPost('${p.id}')">${t("del")}</button>` : ""}</div>`;
  });
  const cp = canPost(c);
  view().innerHTML = `<div class="forum-wrap">
    <a class="rb-back" href="#/c/${esc(th.categoryId)}">${t("back")}</a>
    <div class="rb-threadhead"><h2>${esc(th.title)}</h2>
      <p>${badge(th.authorRole||"member")} <b>${esc(th.authorName)}</b> · ${fmt(th.createdAt)}
      ${th.locked ? ` · <em class="rb-lock">${t("locked")}</em>` : ""}</p>
      ${myW()>=3 ? `<div class="rb-modbar">
        <button class="rb-ghost" onclick="RB.lock('${id}',${!th.locked})">${th.locked?t("unlock"):t("lock")}</button>
        <button class="rb-ghost" onclick="RB.pin('${id}',${!th.pinned})">${th.pinned?t("unpin"):t("pin")}</button>
        <button class="rb-ghost rb-danger" onclick="RB.delThread('${id}')">${t("del")}</button></div>` : ""}</div>
    <div class="rb-post rb-op"><div class="rb-postbody">${esc(th.content).replace(/\n/g,"<br>")}</div>
      ${th.image ? `<img class="rb-postimg" src="${esc(th.image)}" alt="" loading="lazy">` : ""}</div>
    ${posts}
    ${CUR() && cp && ((CUR() && !th.locked) || myW() >= 3) ? `<div class="rb-replybox"><textarea id="replyBox" placeholder="${t("reply")}"></textarea>
      ${myW()>=3 ? `<div class="rb-attach"><label class="rb-ghost">${t("attach")}<input type="file" id="replyFile" accept="image/*" hidden></label><img id="replyPrev" class="rb-prev" hidden><button class="rb-ghost rb-danger" id="replyImgX" hidden onclick="RB.clearImg('replyPrev','replyImgX')">✕</button></div>` : ""}
      <button class="rb-btn" onclick="RB.reply('${id}','${esc(th.categoryId)}',${th.minWeight||0})">${t("send")}</button></div>`
    : CUR() ? `<div class="rb-empty">${th.locked ? t("locked") : t("catLocked")}</div>`
    : `<div style="text-align:center"><a class="rb-btn" href="#/login">${t("login")}</a></div>`}</div>`;
  bindFile("replyFile", "replyPrev", "replyImgX");
}

/* ── Yeni konu ── */
async function renderNew(slug) {
  if (!CUR()) return renderLogin();
  view().innerHTML = `<div class="forum-wrap"><a class="rb-back" href="#/c/${esc(slug)}">${t("back")}</a>
    <div class="rb-form"><h2>${t("newThread")}</h2><input id="ntTitle" placeholder="${t("title")}" maxlength="90">
    <textarea id="ntBody" rows="5" placeholder="${t("content")}"></textarea>
    ${myW()>=3 ? `<div class="rb-attach"><label class="rb-ghost">${t("attach")}<input type="file" id="ntFile" accept="image/*" hidden></label><img id="ntPrev" class="rb-prev" hidden><button class="rb-ghost rb-danger" id="ntImgX" hidden onclick="RB.clearImg('ntPrev','ntImgX')">✕</button></div>` : ""}
    <button class="rb-btn" onclick="RB.newThread('${esc(slug)}')">${t("send")}</button></div></div>`;
  bindFile("ntFile", "ntPrev", "ntImgX");
}

/* ── Bildirimler ── */
async function renderNotif() {
  const u = CUR(); if (!u) return renderLogin();
  let list = [];
  try {
    const snap = await db.collection("notifications").where("userId","==",u.uid).get();
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
  } catch (e) { console.error(e); }
  list.sort((a,b) => secs(b.createdAt) - secs(a.createdAt));
  const icons = { reply:"💬", role:"🎖️", system:"🐰" };
  view().innerHTML = `<div class="forum-wrap"><a class="rb-back" href="#/">${t("back")}</a>
    <h2 class="rb-h2">🔔 ${t("notif")}</h2>
    <div style="text-align:right;margin-bottom:10px"><button class="rb-ghost" onclick="RB.readAll()">${t("readAll")}</button></div>
    ${list.map(n => `<div class="rb-notif ${n.read?"":"unread"}" onclick="RB.openNotif('${n.id}','${esc(n.threadId||"")}')">
      <span class="ni">${icons[n.type]||"🐰"}</span>
      <div><p>${esc(n.text)}</p><small>${esc(n.from||"")} · ${fmt(n.createdAt)}</small></div></div>`).join("") || `<div class="rb-empty">${t("noNotif")}</div>`}</div>`;
}

/* ── Profil (v16: staff'a sil butonu) ── */
async function renderProfile(username) {
  const s = await db.collection("users").where("username","==",username).get();
  if (s.empty) return view().innerHTML = `<div class="forum-wrap"><a class="rb-back" href="#/">${t("back")}</a><div class="rb-empty">${t("notFound")}</div></div>`;
  let u = null, uid = ""; s.forEach(d => { u = d.data(); uid = d.id; });
  view().innerHTML = `<div class="forum-wrap"><a class="rb-back" href="#/">${t("back")}</a>
    <div class="rb-profile">
    <div class="rb-avatar">${esc((u.username||"?")[0].toUpperCase())}</div>
    <h2>${esc(u.username)} ${badge(u.role)}</h2>
    <div class="rb-stats"><div class="rb-stat"><b>${(u.stats&&u.stats.threads)||0}</b><span>${t("threads")}</span></div>
    <div class="rb-stat"><b>${(u.stats&&u.stats.posts)||0}</b><span>${t("replies")}</span></div></div>
    ${myW()>=3 && uid !== (CUR()&&CUR().uid) ? `<div class="rb-modbar" style="justify-content:center">
      <select onchange="RB.setRole('${uid}',this.value)">${Object.keys(RBAuth.WEIGHT).map(r=>`<option ${r===u.role?"selected":""}>${r}</option>`).join("")}</select>
      <button class="rb-ghost rb-danger" onclick="RB.ban('${uid}',${!u.banned})">${u.banned?t("unban"):t("ban")}</button>
      <button class="rb-ghost rb-danger" onclick="RB.delAccount('${uid}','${esc(u.username)}')">${t("delAcc")}</button></div>` : ""}
  </div></div>`;
}

/* ── Giriş (yalnızca Discord — eski kullanıcı adı/şifre formu kaldırıldı) ── */
function renderLogin() {
  view().innerHTML = `<div class="forum-wrap"><div class="rb-form" style="text-align:center">
    <h2>🐰 ${t("login")}</h2>
    <p style="opacity:.75;font-size:.9rem">${esc((window.RB_T && window.RB_T.discordOnly) || "Tek giriş yöntemi: Discord hesabın.")}</p>
    <a class="rb-btn" href="/api/auth/discord/start?next=/risebunny" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none"><i class="fa-brands fa-discord"></i> Discord ile Giriş</a>
    <p id="authMsg" class="rb-msg"></p></div></div>`;
}

/* ── Yetkili Paneli ── */
let ADM_USERS = [];
async function renderAdmin() {
  view().innerHTML = `<div class="forum-wrap"><a class="rb-back" href="#/">${t("back")}</a>
    <h2 class="rb-h2">${t("admin")}</h2>
    <div class="rb-admtabs">
      <button class="rb-at active" data-at="users">👥 ${t("users")}</button>
      <button class="rb-at" data-at="threads">💬 ${t("threads")}</button>
      <button class="rb-at" data-at="cats">🗂️ ${t("cats")}</button>
    </div>
    <div id="adm-body"><div class="rb-empty">🐰...</div></div></div>`;
  document.querySelectorAll(".rb-at").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".rb-at").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    admSection(b.getAttribute("data-at"));
  }));
  admSection("users");
}
async function admSection(kind) {
  const body = document.getElementById("adm-body"); if (!body) return;
  body.innerHTML = '<div class="rb-empty">🐰...</div>';
  if (kind === "users") {
    const us = await db.collection("users").get();
    ADM_USERS = []; us.forEach(d => ADM_USERS.push({ uid: d.id, ...d.data() }));
    body.innerHTML = `<input class="rb-search" id="adm-search" placeholder="${t("search")}" oninput="RB.filterUsers(this.value)"><div id="adm-users"></div>`;
    RB.filterUsers("");
  }
  if (kind === "threads") {
    const th = await db.collection("threads").get();
    let rows = ""; th.forEach(d => { const x = d.data();
      rows += `<div class="rb-row"><b>${esc(x.title)}</b>
        <button class="rb-ghost" onclick="RB.lock('${d.id}',${!x.locked})">${x.locked?t("unlock"):t("lock")}</button>
        <button class="rb-ghost" onclick="RB.pin('${d.id}',${!x.pinned})">${x.pinned?t("unpin"):t("pin")}</button>
        <button class="rb-ghost rb-danger" onclick="RB.delThread('${d.id}')">${t("del")}</button></div>`;
    });
    body.innerHTML = rows || '<div class="rb-empty">—</div>';
  }
  if (kind === "cats") {
    const snap = await db.collection("categories").get();
    let rows = ""; snap.forEach(d => { const c = d.data();
      rows += `<div class="rb-row"><b>${esc(c.icon||"💬")} ${esc((c.name&&c.name.tr)||d.id)}</b>
        <span class="rb-badge" data-role="${(c.minWeight||0)>=3?"moderator":(c.minWeight||0)===2?"vip":"member"}">W:${c.minWeight||0}</span>
        <button class="rb-ghost" onclick="RB.lockCat('${esc(d.id)}',${!c.locked})">${c.locked?t("unlock"):t("lock")}</button>
        <button class="rb-ghost rb-danger" onclick="RB.delCat('${esc(d.id)}')">${t("del")}</button></div>`;
    });
    body.innerHTML = rows + (myW()>=5 ? `<div class="rb-admform">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input id="nc-slug" placeholder="slug (orn. valorant)" style="flex:1;min-width:120px">
        <input id="nc-icon" placeholder="🎮" style="width:70px">
        <select id="nc-weight"><option value="0">Herkese (0)</option><option value="1">Üye (1)</option><option value="2">VIP (2)</option><option value="3">Staff (3)</option></select>
        <select id="nc-postw"><option value="-1">Yazma: kategoriyle aynı</option><option value="3">Yazma: sadece Mod+</option></select>
      </div>
      <input id="nc-tr" placeholder="İsim (TR)"><input id="nc-en" placeholder="Name (EN)">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="rb-btn" onclick="RB.addCat()">${t("addCat")}</button>
        <button class="rb-ghost" onclick="RB.seed()">${t("seed")}</button>
      </div></div>` : "");
  }
}

/* ══════════ AKSİYONLAR ══════════ */
const RB = {};
RB.clearImg = (prevId, xId) => { window.__rbImg = "";
  const p = document.getElementById(prevId); if (p) p.hidden = true;
  const x = document.getElementById(xId); if (x) x.hidden = true; };

/* ── v17 GÜVENLİK: HESABI SİL — plaintext şifre kasası (creds) tamamen kaldırıldı.
       Auth hesabı Firebase Admin SDK (sunucu) tarafında silinmeli; burada
       yalnızca Firestore verileri temizlenir. ── */
RB.delAccount = (uid, username) => {
  if (CUR() && CUR().uid === uid) return alert("⚠️ Kendi hesabını silemezsin.");
  if (!confirm('"' + username + '" hesabının TÜM forum verileri silinecek. Emin misin?')) return;
  if (!confirm('SON UYARI: Bu işlem GERİ ALINAMAZ. Devam edilsin mi?')) return;
  const clean = async () => {
    const [th, po] = await Promise.all([
      db.collection('threads').where('authorId','==',uid).get(),
      db.collection('posts').where('authorId','==',uid).get()
    ]);
    const b = db.batch();
    th.forEach(d => b.delete(d.ref));
    po.forEach(d => b.delete(d.ref));
    b.delete(db.collection('users').doc(uid));
    await b.commit();
  };
  clean().then(() => { alert('✅ Forum verileri silindi. (Auth hesabı için: Firebase Console → Authentication → kullanıcıyı sil)'); admSection('users'); })
    .catch(e => alert('⚠️ Hata: ' + ((e && e.message) || e)));
};

/* ── v16: kullanıcı listesi — BAN yanında 🗑 ── */
RB.filterUsers = q => {
  q = (q||"").toLowerCase();
  const box = document.getElementById("adm-users"); if (!box) return;
  const list = ADM_USERS.filter(u => (u.username||"").toLowerCase().includes(q));
  box.innerHTML = list.map(u => `<div class="rb-row rb-rowclick" onclick="RB.userDetail('${u.uid}')">
    <b class="rb-ulink">👁 ${esc(u.username)}${u.banned?' 🚫':''}</b> ${badge(u.role)}
    <span style="display:flex;gap:8px;align-items:center;flex-wrap:wrap" onclick="event.stopPropagation()">
      <select onchange="RB.setRole('${u.uid}',this.value)">${Object.keys(RBAuth.WEIGHT).map(r=>`<option ${r===u.role?"selected":""}>${r}</option>`).join("")}</select>
      <button class="rb-ghost rb-danger" onclick="RB.ban('${u.uid}',${!u.banned})">${u.banned?t("unban"):t("ban")}</button>
      <button class="rb-ghost rb-danger" onclick="RB.delAccount('${u.uid}','${esc(u.username)}')">${t("delAcc")}</button>
    </span></div>`).join("") || '<div class="rb-empty">—</div>';
};

/* ── v17 GÜVENLİK: şifre görüntüleme kaldırıldı (creds koleksiyonu silindi) ── */
RB.userDetail = async uid => {
  const body = document.getElementById("adm-body"); if (!body) return;
  body.innerHTML = '<div class="rb-empty">🐰...</div>';
  try {
    const ud = await db.collection("users").doc(uid).get();
    if (!ud.exists) return admSection("users");
    const u = ud.data();
    const th = await db.collection("threads").where("authorId","==",uid).get();
    const threads = []; th.forEach(d => threads.push(d.data()));
    threads.sort((a,b) => secs(b.createdAt) - secs(a.createdAt));
    const po = await db.collection("posts").where("authorId","==",uid).get();
    const posts = []; po.forEach(d => posts.push(d.data()));
    posts.sort((a,b) => secs(b.createdAt) - secs(a.createdAt));
    body.innerHTML = `<div class="rb-udetail">
      <button class="rb-back" onclick="RB.admUsersBack()">← ${t("users")}</button>
      <div class="rb-profile" style="text-align:left">
        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
          <div class="rb-avatar" style="margin:0">${esc((u.username||"?")[0].toUpperCase())}</div>
          <div><h2 style="margin:0">${esc(u.username)} ${badge(u.role)}</h2>
          <small>UID: ${esc(uid)}${u.banned?" · 🚫 BANLI":""}</small></div>
        </div>
        <div class="rb-stats" style="justify-content:flex-start;margin:14px 0">
          <div class="rb-stat"><b>${(u.stats&&u.stats.threads)||0}</b><span>${t("threads")}</span></div>
          <div class="rb-stat"><b>${(u.stats&&u.stats.posts)||0}</b><span>${t("replies")}</span></div>
        </div>
        <p style="color:var(--dim);font-size:12px">📅 Kayıt (SABİT): ${fmt(u.createdAt)}<br>🕐 Son giriş: ${fmt(u.lastLogin)} · ${rel(u.lastLogin)}</p>
        <div class="rb-modbar">
          <select onchange="RB.setRole('${uid}',this.value)">${Object.keys(RBAuth.WEIGHT).map(r=>`<option ${r===u.role?"selected":""}>${r}</option>`).join("")}</select>
          <button class="rb-ghost rb-danger" onclick="RB.ban('${uid}',${!u.banned})">${u.banned?t("unban"):t("ban")}</button>
          <button class="rb-ghost rb-danger" onclick="RB.delAccount('${uid}','${esc(u.username)}')">${t("delAcc")}</button>
        </div>
        <h3>💬 Konuları (${threads.length})</h3>
        ${threads.slice(0,10).map(x=>`<div class="rb-row"><b>${esc(x.title)}</b><small>${fmt(x.createdAt)}</small></div>`).join("")||'<div class="rb-empty">—</div>'}
        <h3>📝 Son Yorumları (${posts.length})</h3>
        ${posts.slice(0,10).map(x=>`<div class="rb-row"><b style="font-weight:500">${esc((x.content||"").slice(0,90))}</b><small>${fmt(x.createdAt)}</small></div>`).join("")||'<div class="rb-empty">—</div>'}
      </div></div>`;
  } catch (e) { showErr(e); }
};
RB.admUsersBack = () => admSection("users");
RB.readAll = async () => {
  const u = CUR(); if (!u) return;
  try {
    const snap = await db.collection("notifications").where("userId","==",u.uid).where("read","==",false).get();
    const b = db.batch(); snap.forEach(d => b.update(d.ref, { read: true }));
    await b.commit();
  } catch (e) { console.error(e); }
  route();
};
RB.openNotif = async (id, threadId) => {
  await db.collection("notifications").doc(id).update({ read: true }).catch(()=>{});
  if (threadId) location.hash = "#/t/" + threadId; else route();
};
RB.logout = async () => { sessionStorage.removeItem("rb_fadmin"); await RBAuth.logout(); location.hash = "#/"; };
RB.doLogin = async () => {
  const m = document.getElementById("authMsg");
  try {
    await RBAuth.smartLogin(document.getElementById("authId").value, document.getElementById("authPw").value);
    const u = CUR();
    if (u && myW() >= 3 && sessionStorage.getItem("rb_ftap") === "1") {
      sessionStorage.removeItem("rb_ftap");
      sessionStorage.setItem("rb_fadmin", "1");
      location.hash = "#/admin";
      return;
    }
    location.hash = "#/";
  } catch (e) { m.textContent = typeof e === "string" ? e : (e.message || "Hata!"); }
};
RB.seed = async () => { await seedCats(); admSection("cats"); };
RB.addCat = async () => {
  const slug = (document.getElementById("nc-slug").value||"").trim().toLowerCase().replace(/[^a-z0-9-]+/g,"-");
  if (!slug) return;
  const pw = parseInt(document.getElementById("nc-postw").value,10);
  await db.collection("categories").doc(slug).set({
    slug, icon: document.getElementById("nc-icon").value || "💬", order: 99,
    minWeight: parseInt(document.getElementById("nc-weight").value,10) || 0,
    ...(pw >= 0 ? { postWeight: pw } : {}), guest: false,
    name: { tr: document.getElementById("nc-tr").value || slug, en: document.getElementById("nc-en").value || slug },
    desc: { tr: "", en: "" }, stats: { threads: 0, posts: 0 }
  });
  admSection("cats");
};
RB.delCat = async id => { if (!confirm("?")) return; await db.collection("categories").doc(id).delete(); admSection("cats"); };
RB.lockCat = (slug,v) => db.collection("categories").doc(slug).update({ locked: v }).then(route);
RB.reply = async (tid, cat, mw) => {
  try {
    const txt = (document.getElementById("replyBox").value || "").trim();
    if (!txt && !window.__rbImg) return;
    const u = CUR(); if (!u) return;
    const cd = await db.collection("categories").doc(cat).get();
    const c = cd.exists ? cd.data() : {};
    if (!canPost(c)) return alert(t("noPerm"));
    const td = await db.collection("threads").doc(tid).get();
    if (!td.exists) return;
    const th = td.data();
    if (th.locked && myW() < 3) return alert(t("locked"));
    await db.collection("posts").add({ threadId:tid, categoryId:cat, minWeight:mw,
      content:txt, image: window.__rbImg || "", authorId:u.uid, authorName:u.username, authorRole:u.role,
      edited:false, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    window.__rbImg = "";
    await db.collection("threads").doc(tid).update({
      replies: firebase.firestore.FieldValue.increment(1),
      lastPostAt: firebase.firestore.FieldValue.serverTimestamp() });
    db.collection("users").doc(u.uid).update({ "stats.posts": firebase.firestore.FieldValue.increment(1) }).catch(()=>{});
    db.collection("categories").doc(cat).update({ "stats.posts": firebase.firestore.FieldValue.increment(1) }).catch(()=>{});
    if (th.authorId !== u.uid) notifyUser(th.authorId, "reply", `${u.username} "${th.title}" konusuna yanıt yazdı`, tid);
    route();
  } catch (e) { alert("⚠️ Yanıt gönderilemedi:\n" + ((e && e.message) || e)); }
};
RB.newThread = async slug => {
  try {
    const title = (document.getElementById("ntTitle").value || "").trim();
    const body  = (document.getElementById("ntBody").value || "").trim();
    if (!title || !body) return;
    const u = CUR(); if (!u) return;
    const cd = await db.collection("categories").doc(slug).get();
    const c = cd.exists ? cd.data() : {};
    if (!canPost(c)) return alert(t("noPerm"));
    if (myW() < 3) {
      const mine = await db.collection("threads").where("authorId","==",u.uid).get();
      if (mine.size >= 2) return alert(t("maxThread"));
    }
    await db.collection("threads").add({ title, content:body, categoryId:slug,
      image: window.__rbImg || "", minWeight:(c.minWeight||0), authorId:u.uid, authorName:u.username, authorRole:u.role,
      locked:false, pinned:false, views:0, viewedBy:[], replies:0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastPostAt: firebase.firestore.FieldValue.serverTimestamp() });
    window.__rbImg = "";
    db.collection("users").doc(u.uid).update({ "stats.threads": firebase.firestore.FieldValue.increment(1) }).catch(()=>{});
    location.hash = "#/c/" + slug;
  } catch (e) { alert("⚠️ Konu açılamadı:\n" + ((e && e.message) || e)); }
};
RB.lock = (id,v) => db.collection("threads").doc(id).update({ locked:v }).then(route);
RB.pin  = (id,v) => db.collection("threads").doc(id).update({ pinned:v }).then(route);
RB.delThread = async id => {
  if (!confirm("?")) return;
  const ps = await db.collection("posts").where("threadId","==",id).get();
  const b = db.batch();
  ps.forEach(p => b.delete(p.ref));
  b.delete(db.collection("threads").doc(id));
  await b.commit().catch(async () => {
    ps.forEach(async p => await p.ref.delete());
    await db.collection("threads").doc(id).delete();
  });
  location.hash = "#/";
};
RB.delPost = async id => {
  const pd = await db.collection("posts").doc(id).get();
  if (!pd.exists) return;
  const p = pd.data();
  const b = db.batch();
  b.delete(pd.ref);
  try { b.update(db.collection("threads").doc(p.threadId), { replies: firebase.firestore.FieldValue.increment(-1) }); } catch (e) {}
  await b.commit().catch(() => pd.ref.delete());
  route();
};
RB.setRole = (uid,role) => db.collection("users").doc(uid).update({ role }).then(() =>
  notifyUser(uid, "role", `Yetkin güncellendi → ${role}`)).then(route);
RB.ban = (uid,banned) => db.collection("users").doc(uid).update({ banned }).then(route);
window.RB = RB;

/* ── Footer 5-tık: sadece yetkili ── */
function setupFooterTap() {
  const f = document.querySelector(".rb-footer");
  if (!f) return;
  let taps = 0, timer = null;
  f.addEventListener("click", () => {
    const u = CUR();
    if (!u || myW() < 3) return;
    taps++; clearTimeout(timer);
    timer = setTimeout(() => taps = 0, 2000);
    if (taps >= 5) {
      taps = 0;
      sessionStorage.setItem("rb_fadmin", "1");
      location.hash = "#/admin";
    }
  });
}

/* ── Başlat ── */
function boot() {
  try {
    if (typeof db === 'undefined' || typeof RBAuth === 'undefined') {
      boot.n = (boot.n || 0) + 1;
      if (boot.n > 50) { view().innerHTML = '<div class="rb-empty">⚠️ Firebase yüklenemedi!</div>'; return; }
      return setTimeout(boot, 100);
    }
    heal(); ensureBtn();
    const f = document.querySelector(".rb-footer");
    if (f && f.getAttribute("data-v") !== "16") { f.setAttribute("data-v","16"); f.innerHTML = f.innerHTML.replace(/v\d+<\/b>/,"v16</b>"); if (!/v16/.test(f.innerHTML)) f.innerHTML += ' · <b style="color:#8b5cf6">v16</b>'; }
    RBAuth.onAuth(function () { touchLastLogin(); route(); });
    window.addEventListener("hashchange", route);
    setupFooterTap();
    route();
  } catch (e) { showErr(e); }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
