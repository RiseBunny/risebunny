/** Forum yanıt bildirimi → bot DM aynası. Girişli kullanıcıdan gelir. */
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
  const userIds = Array.isArray(body.userIds) ? body.userIds.map(String).slice(0, 20) : [];
  const title = String(body.title || '🔔 Bildirim').slice(0, 100);
  const text = String(body.text || '').slice(0, 500);
  const url = String(body.url || '').slice(0, 200);
  if (!userIds.length || !text) return res.status(400).json({ error: 'eksik alan' });
  const base = botBase();
  if (!base || !process.env.BOT_API_SECRET) return res.json({ ok: true, mirror: false });
  try {
    await fetch(`${base}/api/notify`, {
      method: 'POST',
      headers: { ...botHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds, title, text, url })
    });
  } catch {}
  res.json({ ok: true, mirror: true });
}
