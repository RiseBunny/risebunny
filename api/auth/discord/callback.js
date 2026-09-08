/** Discord ile giriş — 2. adım: kodu tokene çevir, oturumu mühürle, /risebunny'e at. */
import { setSession, safeNext } from '../../_session.js';

const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1540401487581020252';

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
    setSession(res, { id: String(u.id), username: u.username, avatar: u.avatar });
    return res.redirect(302, next + (next.includes('?') ? '&' : '?') + 'login=ok');
  } catch (e) {
    return res.redirect(302, '/risebunny?login=hata');
  }
}
