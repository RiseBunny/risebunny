/** Silme talebi durumu (bot croxydb aynası). Sadece kendi talebini görebilir. */
import { getSession, botHeaders, botBase } from '../_session.js';

export default async function handler(req, res) {
  const s = getSession(req);
  if (!s) return res.status(401).json({ error: 'unauthorized' });
  const docId = String((req.query && req.query.doc) || '').slice(0, 60);
  if (!docId) return res.status(400).json({ error: 'eksik alan' });
  const base = botBase();
  if (!base || !process.env.BOT_API_SECRET) return res.json({ durum: 'bekliyor' });
  try {
    const r = await fetch(`${base}/api/deletion/status?doc=${encodeURIComponent(docId)}&user=${encodeURIComponent(s.id)}`, {
      headers: botHeaders()
    });
    const j = await r.json().catch(() => ({}));
    if (j.discordId && j.discordId !== s.id) return res.status(403).json({ error: 'forbidden' });
    return res.json({ durum: j.durum || 'bekliyor', sebep: j.sebep || '' });
  } catch {
    return res.json({ durum: 'bekliyor' });
  }
}
