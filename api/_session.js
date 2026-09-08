/** Oturum yardımcısı: HMAC imzalı cookie (rb_session). Sır SADECE Vercel env'de. */
import crypto from 'node:crypto';

const COOKIE = 'rb_session';
const TTL = 7 * 24 * 3600 * 1000;

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}
function secret() { return process.env.SESSION_SECRET || ''; }

export function signSession(payload) {
  const data = b64url(JSON.stringify({ ...payload, exp: Date.now() + TTL }));
  const sig = b64url(crypto.createHmac('sha256', secret()).update(data).digest());
  return `${data}.${sig}`;
}

export function verifySession(token) {
  try {
    if (!secret() || !token || !token.includes('.')) return null;
    const [data, sig] = token.split('.');
    const exp = b64url(crypto.createHmac('sha256', secret()).update(data).digest());
    const a = Buffer.from(exp, 'utf8'), b = Buffer.from(sig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const p = JSON.parse(unb64url(data));
    if (!p.exp || p.exp < Date.now() || !p.id) return null;
    return p;
  } catch { return null; }
}

export function readCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

export function getSession(req) {
  return verifySession(readCookies(req)[COOKIE]);
}

export function setSession(res, payload) {
  const v = signSession(payload);
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(v)}; Path=/; Max-Age=${TTL / 1000}; HttpOnly; SameSite=Lax; Secure`);
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`);
}

export function safeNext(v) {
  const s = String(v || '/risebunny');
  return s.startsWith('/') && !s.startsWith('//') ? s : '/risebunny';
}

export function botHeaders() {
  return { 'x-bot-secret': process.env.BOT_API_SECRET || '' };
}

export function botBase() {
  return (process.env.BOT_API_URL || '').replace(/\/+$/, '');
}
