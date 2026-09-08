/** Site kuponu: bot /api/coupon/redeem'e iletir. Kullanıcı Discord girişli olmalı. */
import { getSession, botHeaders, botBase } from './_session.js';

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
  const s = getSession(req);
  if (!s) return res.status(401).json({ error: 'Önce Discord ile giriş yapmalısın (kupon site-şartlı).' });
  const body = await readJson(req);
  const kod = String(body.kod || '').toUpperCase().trim();
  if (!kod) return res.status(400).json({ error: 'Kupon kodu gir.' });

  const base = botBase();
  if (!base || !process.env.BOT_API_SECRET)
    return res.status(503).json({ error: 'Bot çevrimdışı — kupon şu an kullanılamıyor.' });
  try {
    const r = await fetch(`${base}/api/coupon/redeem`, {
      method: 'POST',
      headers: { ...botHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: s.id, kod })
    });
    const j = await r.json().catch(() => ({}));
    return res.status(r.status).json(j);
  } catch {
    return res.status(503).json({ error: 'Bot çevrimdışı — kupon şu an kullanılamıyor.' });
  }
}
