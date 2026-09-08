/** Site bakım kapısı (tek kaynak): bot bayrağı + Firestore bakım belgesi. */
import { botBase } from './_session.js';

const PROJECT = 'gen-lang-client-0590499912';
const API_KEY = 'AIzaSyAq5Nafl9aI2TabzGsj5J9ij6lNwyfTguM';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=30');
  const out = { bakim: false, sebep: '', kaynak: 'yok' };

  // 1) Bot bayrağı (r!bakım → Site butonu)
  const base = botBase();
  if (base) {
    try {
      const r = await fetch(`${base}/api/site-status`);
      if (r.ok) {
        const j = await r.json();
        if (j.bakim) {
          out.bakim = true; out.sebep = j.sebep || ''; out.kaynak = 'bot';
          return res.json(out);
        }
      }
    } catch {}
  }

  // 2) Firestore bakım belgesi (admin paneli)
  try {
    const r = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/config/maintenance?key=${API_KEY}`,
      { headers: { Referer: 'https://risebunny.vercel.app/' } }
    );
    if (r.ok) {
      const doc = await r.json();
      const f = doc.fields || {};
      const active = f.active && (f.active.booleanValue === true || f.active.booleanValue === 'true');
      if (active) {
        const msg = f.message && f.message.mapValue && f.message.mapValue.fields;
        const tr = msg && msg.tr && msg.tr.stringValue;
        const en = msg && msg.en && msg.en.stringValue;
        out.bakim = true; out.sebep = tr || en || ''; out.kaynak = 'firestore';
      }
    }
  } catch {}
  res.json(out);
}
