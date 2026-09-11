/** Site olay günlüğü → bot sahip-log aynası. Girişli kullanıcıdan gelir. */
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
  if (!s) return res.status(401).json({ error: 'unauthorized' });
  const body = await readJson(req);
  const baslik = String(body.baslik || '🌐 Site Olayı').slice(0, 100);
  const metin = String(body.metin || '').slice(0, 1500);
  if (!metin) return res.status(400).json({ error: 'eksik alan' });
  const base = botBase();
  if (!base || !process.env.BOT_API_SECRET) return res.json({ ok: true, mirror: false });
  try {
    await fetch(`${base}/api/log`, {
      method: 'POST',
      headers: { ...botHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ baslik, metin, kim: s.username || s.id })
    });
  } catch {}
  res.json({ ok: true, mirror: true });
}
