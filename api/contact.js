/** İletişim formu → sahip logu: önce Firestore/Formspree'ye yazılır (istemci),
 *  burası bota iletir (bot çevrimdışıysa sessiz geçilir, form etkilenmez). */
import { botHeaders, botBase } from './_session.js';

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
  const name = String(body.name || '').slice(0, 60);
  const email = String(body.email || '').slice(0, 120);
  const subject = String(body.subject || '').slice(0, 120);
  const message = String(body.message || '').slice(0, 2000);
  if (!name || !email.includes('@') || message.length < 3) return res.status(400).json({ error: 'eksik alan' });

  const base = botBase();
  if (base && process.env.BOT_API_SECRET) {
    try {
      await fetch(`${base}/api/contact`, {
        method: 'POST',
        headers: { ...botHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      });
    } catch {}
  }
  res.json({ ok: true });
}
