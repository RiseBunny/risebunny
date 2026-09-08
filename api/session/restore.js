/** Oturum geri yükleme (forum → site yönü): Firebase ID token doğrulanır,
 *  e-posta `d<ID>@discord.risebunny.local` kalıbındaysa Discord oturumu basılır.
 *  Böylece forumda bağlı kullanıcı risebunny'de tekrar giriş yapmaz. */
import crypto from 'node:crypto';

const FB_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyAq5Nafl9aI2TabzGsj5J9ij6lNwyfTguM';

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const body = await readJson(req);
  const idToken = String(body.idToken || '');
  if (!idToken) return res.status(400).json({ error: 'token yok' });
  try {
    // Token'ı Google'a doğrulat
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FB_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    if (!r.ok) return res.status(401).json({ error: 'geçersiz oturum' });
    const j = await r.json();
    const email = j.users?.[0]?.email || '';
    const m = /^d(\d+)@discord\.risebunny\.local$/.exec(email);
    if (!m) return res.status(403).json({ error: 'discord köprüsü değil' });
    const id = m[1];
    // İsim için bota sor (yoksa genel ad)
    let username = 'Üye', avatar = null;
    const base = (process.env.BOT_API_URL || '').replace(/\/+$/, '');
    if (base && process.env.BOT_API_SECRET) {
      try {
        const br = await fetch(`${base}/api/user/${id}`, { headers: { 'x-bot-secret': process.env.BOT_API_SECRET } });
        if (br.ok) {
          const bj = await br.json();
          username = bj.username || username;
        }
      } catch {}
    }
    const data = Buffer.from(JSON.stringify({
      id, username, avatar, email: '',
      exp: Date.now() + 7 * 24 * 3600 * 1000
    })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const sig = crypto.createHmac('sha256', process.env.SESSION_SECRET || '').update(data).digest('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    if (!process.env.SESSION_SECRET) return res.status(500).json({ error: 'oturum sırrı yok' });
    res.setHeader('Set-Cookie', `rb_session=${encodeURIComponent(data + '.' + sig)}; Path=/; Max-Age=${7 * 24 * 3600}; HttpOnly; SameSite=Lax; Secure`);
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'hata' });
  }
}
