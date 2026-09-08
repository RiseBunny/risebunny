/** Discord ile giriş — 2. adım: kodu tokene çevir, oturumu mühürle, /risebunny'e at.
 * Ek: e-posta alınır, Firebase köprü hesabı hazırlanır (forum kimliği),
 * e-posta bot DB'ye yazılır. */
import crypto from 'node:crypto';
import { setSession, safeNext } from '../../_session.js';

const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1540401487581020252';
const FB_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyAq5Nafl9aI2TabzGsj5J9ij6lNwyfTguM';

function fbCreds(discordId) {
  const pw = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'gecici')
    .update('fb:' + discordId).digest('hex');
  return { email: `d${discordId}@discord.risebunny.local`, pw };
}

async function ensureFirebaseUser(email, pw) {
  try {
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FB_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw, returnSecureToken: false })
    });
  } catch {}
  // EMAIL_EXISTS dahil her sonuç OK (şifre deterministik olduğu için eşleşir)
}

function linkBot(userId, username, email) {
  const base = (process.env.BOT_API_URL || '').replace(/\/+$/, '');
  if (!base || !process.env.BOT_API_SECRET) return;
  fetch(`${base}/api/discord/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bot-secret': process.env.BOT_API_SECRET },
    body: JSON.stringify({ userId, username, email: email || '' })
  }).catch(() => {});
}

export default async function handler(req, res) {
  const { code, state } = req.query || {};
  const next = safeNext(state ? Buffer.from(String(state), 'base64url').toString('utf8') : '/risebunny');
  if (!code) return res.redirect(302, '/risebunny?login=hata');
  const secret = process.env.DISCORD_CLIENT_SECRET || '';
  if (!secret) return res.status(500).send('DISCORD_CLIENT_SECRET tanımlı değil (Vercel Environment Variables).');

  const host = req.headers.host || 'risebunny.vercel.app';
  const redirect = `https://${host}/api/auth/discord/callback`;
  try {
    const tok = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: secret,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: redirect
      })
    });
    if (!tok.ok) throw new Error('token exchange failed');
    const tj = await tok.json();
    const me = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tj.access_token}` }
    });
    if (!me.ok) throw new Error('user fetch failed');
    const u = await me.json();
    const fb = fbCreds(String(u.id));
    await ensureFirebaseUser(fb.email, fb.pw);
    linkBot(String(u.id), u.username, u.email || '');
    setSession(res, {
      id: String(u.id), username: u.username, avatar: u.avatar,
      email: u.email || '', fbEmail: fb.email, fbPw: fb.pw
    });
    return res.redirect(302, next + (next.includes('?') ? '&' : '?') + 'login=ok');
  } catch (e) {
    return res.redirect(302, '/risebunny?login=hata');
  }
}
