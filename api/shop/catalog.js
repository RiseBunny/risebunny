/** Mağaza kataloğu: bot açıksa canlı, kapalıysa sabit liste (fiyatlar botta doğrulanır). */
import { botHeaders, botBase } from '../_session.js';

const STATIC = [
  { id: 'premium_30', ad: '💎 Premium 30 Gün', fiyat: 250000, tip: 'premium', premiumGerek: false },
  { id: 'pet_tavsan', ad: '🐰 Tavşan', fiyat: 72000, tip: 'pet', premiumGerek: false },
  { id: 'pet_kopek', ad: '🐶 Köpek', fiyat: 90000, tip: 'pet', premiumGerek: false },
  { id: 'pet_kedi', ad: '🐱 Kedi', fiyat: 135000, tip: 'pet', premiumGerek: false },
  { id: 'pet_balik', ad: '🐠 Balık', fiyat: 162000, tip: 'pet', premiumGerek: false },
  { id: 'pet_aslan', ad: '🦁 Aslan', fiyat: 315000, tip: 'pet', premiumGerek: true },
  { id: 'pet_kaplan', ad: '🐅 Kaplan', fiyat: 342000, tip: 'pet', premiumGerek: true }
];

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
  const base = botBase();
  if (base && process.env.BOT_API_SECRET) {
    try {
      const r = await fetch(`${base}/api/shop`, { headers: botHeaders() });
      if (r.ok) {
        const j = await r.json();
        if (j.items?.length) return res.json({ items: j.items, live: true });
      }
    } catch {}
  }
  res.json({ items: STATIC, live: false });
}
