/** Oturum + bot verisi: { user, game|null }. Bot çevrimdışıysa game=null. */
import { getSession, clearSession, botHeaders, botBase } from '../_session.js';

export default async function handler(req, res) {
  const s = getSession(req);
  if (!s) return res.status(401).json({ ok: false });
  if (req.query.logout === '1') {
    clearSession(res);
    return res.json({ ok: false });
  }
  const out = {
    ok: true,
    user: {
      id: s.id,
      username: s.username,
      avatar: s.avatar
        ? `https://cdn.discordapp.com/avatars/${s.id}/${s.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(s.id) >> 22n) % 6}.png`
    },
    game: null,
    botOnline: false
  };
  const base = botBase();
  if (base && process.env.BOT_API_SECRET) {
    try {
      const r = await fetch(`${base}/api/user/${encodeURIComponent(s.id)}`, { headers: botHeaders() });
      if (r.ok) {
        out.game = await r.json();
        out.botOnline = true;
      }
    } catch {}
  }
  res.json(out);
}
