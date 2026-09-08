/**
 * Vercel Serverless — Leaderboard okuma (bot çevrimdışıyken siteyi besler)
 *
 * GET /api/leaderboard/rich  → en zengin 10
 * GET /api/leaderboard/level → en yüksek seviye 10
 *
 * Veri önceliği: Firestore `leaderboard/{rich|level}` (bot Admin SDK ile yazar).
 * Burası dependency'siz çalışır: Firestore REST + herkese açık okuma
 * (firestore.rules → match /leaderboard/ → allow read: if true).
 * Kayıt yoksa boş liste döner; site (js/risebunny.js) simülasyona düşer.
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

  try {
    const url =
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/leaderboard/${kind}?key=${API_KEY}`;
    const r = await fetch(url);
    if (r.status === 404) return res.json({ kind, updated: new Date().toISOString(), data: [], source: 'empty' });
    if (!r.ok) throw new Error(`firestore ${r.status}`);
    const doc = await r.json();
    const data = parseValue(doc.fields?.data) || [];
    return res.json({ kind, updated: new Date().toISOString(), data: data.slice(0, 50), source: 'firestore' });
  } catch (e) {
    return res.status(500).json({ error: 'leaderboard hatası', detail: e.message });
  }
}
