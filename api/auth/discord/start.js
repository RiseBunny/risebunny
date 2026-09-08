/** Discord ile giriş — 1. adım: Discord authorize sayfasına yönlendir. */
import { safeNext } from '../../_session.js';

const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1540401487581020252';

export default async function handler(req, res) {
  const host = req.headers.host || 'risebunny.vercel.app';
  const redirect = `https://${host}/api/auth/discord/callback`;
  const next = safeNext(req.query.next);
  const url = new URL('https://discord.com/api/oauth2/authorize');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', redirect);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify email');
  url.searchParams.set('state', Buffer.from(next).toString('base64url'));
  res.writeHead(302, { Location: url.toString() });
  res.end();
}
