/**
 * Vercel Serverless — Leaderboard okuma
 *
 * GET /api/leaderboard/rich  → en zengin 10
 * GET /api/leaderboard/level → en yüksek seviye 10
 *
 * Veri önceliği:
 *  1) Bot `/api/leaderboard/:kind` (BOT_API_URL tanımlıysa — 5 dk önbellekli GERÇEK veri)
 *  2) Firestore `leaderboard/{rich|level}`
 *  3) Boş liste (site simülasyona düşer, 500 YOK)
 */
const PROJECT = 'gen-lang-client-0590499912';
const API_KEY = 'AIzaSyAq5Nafl9aI2TabzGsj5J9ij6lNwyfTguM';

function parseValue(v) {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(parseValue);
  if ('mapValue' in v)
    return Object.fromEntries(
      Object.entries(v.mapValue.fields || {}).map(([k, val]) => [k, parseValue(val)])
    );
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://risebunny.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const kind = req.query.kind === 'level' ? 'level' : req.query.kind === 'rich' ? 'rich' : null;
  if (!kind) return res.status(400).json({ error: 'kind=rich|level' });

  // 1) Bot canlıysa GERÇEK veri buradan gelir
  const botBase = (process.env.BOT_API_URL || '').replace(/\/+$/, '');
  if (botBase) {
    try {
      const headers = {};
      if (process.env.BOT_API_SECRET) headers['x-bot-secret'] = process.env.BOT_API_SECRET;
      const br = await fetch(`${botBase}/api/leaderboard/${kind}`, { headers });
      if (br.ok) {
        const bj = await br.json();
        if (bj.data && bj.data.length)
          return res.json({ kind, updated: new Date().toISOString(), data: bj.data.slice(0, 50), source: 'bot' });
      }
    } catch {}
  }

  // 2) Firestore yedeği
  try {
    const url =
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/leaderboard/${kind}?key=${API_KEY}`;
    // API anahtarı siteye kısıtlıysa Referer şart → ekle
    const r = await fetch(url, { headers: { Referer: 'https://risebunny.vercel.app/' } });
    if (r.status === 404) return res.json({ kind, updated: new Date().toISOString(), data: [], source: 'empty' });
    if (!r.ok) throw new Error(`firestore ${r.status}`);
    const doc = await r.json();
    const data = parseValue(doc.fields?.data) || [];
    return res.json({ kind, updated: new Date().toISOString(), data: data.slice(0, 50), source: 'firestore' });
  } catch (e) {
    // Anahtar/izin sorunu sayfayı 500'e düşürmesin → boş liste, site simülasyona düşer
    return res.json({ kind, updated: new Date().toISOString(), data: [], source: 'unavailable' });
  }
}
