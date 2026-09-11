/** Veri silme talebi → bot sahip-log aynası (onay/ret butonlu). */
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
  const docId = String(body.docId || '').slice(0, 60);
  const kapsam = ['bot', 'site', 'ikisi'].includes(body.kapsam) ? body.kapsam : 'ikisi';
  if (!docId) return res.status(400).json({ error: 'eksik alan' });
  const base = botBase();
  if (!base || !process.env.BOT_API_SECRET) return res.status(503).json({ error: 'bot çevrimdışı' });
  try {
    const r = await fetch(`${base}/api/deletion/request`, {
      method: 'POST',
      headers: { ...botHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId, discordId: s.id, username: s.username || '', kapsam })
    });
    const j = await r.json().catch(() => ({}));
    return res.status(r.status).json(j);
  } catch {
    return res.status(503).json({ error: 'bot çevrimdışı' });
  }
}
