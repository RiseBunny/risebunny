/**
 * Vercel Serverless — Top.gg Vote Webhook (YEDEK alıcı)
 *
 * Birincil alıcı botun kendi Express endpoint'idir (bot.js → /api/topgg/vote).
 * Bu fonksiyon, bot çevrimdışıyken top.gg panelinde webhook URL'i olarak
 * kullanılabilir: imzayı doğrular, 204 döner, top.gg retry'e düşmez.
 *
 * Kurulum: Vercel → Project Settings → Environment Variables:
 *   TOPGG_WEBHOOK_SECRET = top.gg panelindeki webhook secret (whs_... veya v0 secret)
 *
 * docs.top.gg → Webhooks → Signature verification (v1 HMAC-SHA256).
 */
import crypto from 'node:crypto';

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  return ba.length > 0 && ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

async function readRaw(req) {
  const chunks = [];
  for await (const c of req) {
    chunks.push(c);
    if (Buffer.concat(chunks).length > 2 * 1024 * 1024) throw new Error('body too large');
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const secret = process.env.TOPGG_WEBHOOK_SECRET || '';
  if (!secret) return res.status(500).json({ error: 'webhook secret not configured' });

  let raw;
  try {
    raw = await readRaw(req);
  } catch {
    return res.status(400).json({ error: 'malformed request' });
  }

  // ── v1 (HMAC: x-topgg-signature: t=...,v1=...) ──
  const sigHeader = req.headers['x-topgg-signature'];
  if (sigHeader) {
    const sig = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;
    const parts = Object.fromEntries(String(sig).split(',').map((p) => p.split('=')));
    if (!parts.t || !parts.v1) return res.status(422).json({ error: 'invalid signature format' });
    if (Math.abs(Date.now() - parseInt(parts.t, 10) * 1000) > 30000)
      return res.status(403).json({ error: 'timestamp outside window' });
    const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${raw}`).digest('hex');
    if (!timingSafeEqual(expected, parts.v1)) return res.status(403).json({ error: 'invalid signature' });
    let body;
    try {
      body = JSON.parse(raw.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'malformed json' });
    }
    // test event'i ödülsüz karşılanır; gerçek oylar bot çevrimiçiyken işlenir
    console.log(`[topgg-vote] v1 ${body.type} alındı (serverless yedek)`);
    return res.status(204).end();
  }

  // ── v0 legacy (Authorization header) ──
  const auth = req.headers.authorization || '';
  if (!timingSafeEqual(auth, secret)) return res.status(401).json({ error: 'unauthorized' });
  console.log('[topgg-vote] v0 oy alındı (serverless yedek)');
  return res.status(204).end();
}
