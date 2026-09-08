/** Oturum + bot verisi: { user, game|null }. Bot çevrimdışıysa game=null. */
import { getSession, clearSession, botHeaders, botBase } from '../_session.js';

/* Bozuk ID'de bile çökmeyen avatar çözümleyici (BigInt throw atabilir). */
function avatarUrl(id, hash) {
  if (hash) return `https://cdn.discordapp.com/avatars/${id}/${hash}.png?size=128`;
  try {
    return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(String(id)) >> 22n) % 6}.png`;
  } catch {
    return 'https://cdn.discordapp.com/embed/avatars/0.png';
  }
}

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
      avatar: avatarUrl(s.id, s.avatar)
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
