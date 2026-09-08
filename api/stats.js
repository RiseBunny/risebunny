/** Canlı sayılar: top.gg (tokenla) → bot /api/stats → yoksa null (site simülasyonda kalır). */
import { botBase } from './_session.js';

const BOT_ID = process.env.TOPGG_BOT_ID || '1540401487581020252';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=60');
  const out = { servers: null, users: null, votes: null, live: false };

  // 1) top.gg v0 (sunucu + oy sayıları) — TOPGG_TOKEN sunucuda, asla cliente inmez
  const tok = process.env.TOPGG_TOKEN || '';
  if (tok && !tok.includes('panelden')) {
    try {
      const [st, bot] = await Promise.all([
        fetch(`https://top.gg/api/bots/${BOT_ID}/stats`, { headers: { Authorization: tok } }),
        fetch(`https://top.gg/api/bots/${BOT_ID}`, { headers: { Authorization: tok } })
      ]);
      if (st.ok) {
        const sj = await st.json().catch(() => ({}));
        if (sj.server_count != null) { out.servers = sj.server_count; out.live = true; }
      }
      if (bot.ok) {
        const bj = await bot.json().catch(() => ({}));
        if (bj.monthlyPoints != null) { out.votes = bj.monthlyPoints; out.live = true; }
      }
      if (out.live) return res.json({ ...out, updated: new Date().toISOString() });
    } catch {}
  }

  // 2) Bot doğrudan (üye sayısı dahil)
  const base = botBase();
  if (base) {
    try {
      const r = await fetch(`${base}/api/stats`);
      if (r.ok) {
        const j = await r.json();
        if (j.servers != null) {
          out.servers = j.servers; out.users = j.users ?? null; out.live = true;
          return res.json({ ...out, updated: new Date().toISOString() });
        }
      }
    } catch {}
  }

  res.json({ ...out, updated: new Date().toISOString() });
}
