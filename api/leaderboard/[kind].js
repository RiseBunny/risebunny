/**
 * Vercel Serverless — Leaderboard okuma
 *
 * GET /api/leaderboard/rich  → en zengin 10
 * GET /api/leaderboard/level → en yüksek seviye 10 (seviyesiralama.js / CroxyDB uyumlu)
 */
import { botBase, botHeaders } from '../_session.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://risebunny.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=60');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const kind = req.query.kind === 'level' ? 'level' : req.query.kind === 'rich' ? 'rich' : null;
  if (!kind) return res.status(400).json({ error: 'kind=rich|level' });

  // CroxyDB verisini tutan Bot API'sinden çekilir
  const base = botBase();
  if (base) {
    try {
      const br = await fetch(`${base}/api/leaderboard/${kind}`, { headers: botHeaders() });
      if (br.ok) {
        const bj = await br.json();
        if (bj.data && Array.isArray(bj.data)) {
          // CroxyDB seviyesiralama.js mantığı: En yüksek 10 kişi
          const top10 = bj.data.slice(0, 10);
          return res.json({
            kind,
            updated: new Date().toISOString(),
            data: top10,
            source: 'croxydb'
          });
        }
      }
    } catch (e) {
      // Bot çevrimdışıysa sessizce alt duruma düşer
    }
  }

  return res.json({ kind, updated: new Date().toISOString(), data: [], source: 'unavailable' });
}