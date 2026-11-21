import { adminDb, FieldValue } from '@/lib/server/admin';
import { encrypt, verifyState } from '@/lib/server/crypto';
import { getRedirectUri, graphRequest, missingEnv } from '@/lib/server/facebook';

// GET /api/facebook/callback?code=...&state=...
// Facebook ihamagara aha nyuma y'uko umukoresha yemeye. Dukura tokens z'amapaji,
// tukazibika zifunze (encrypted) muri facebookTokens/{uid} — ahatagerwa na client.
export default async function handler(req, res) {
  const redirect = (query) => res.redirect(302, `/settings?${query}`);

  if (req.method !== 'GET') return res.status(405).end();

  try {
    if (missingEnv().length) return redirect('fb_error=not_configured');

    const { code, state, error } = req.query;
    const payload = verifyState(String(state || ''));
    if (!payload) return redirect('fb_error=invalid_state');

    const ref = adminDb().collection('facebookTokens').doc(payload.uid);
    const snap = await ref.get();
    if (!snap.exists || snap.data().pendingNonce !== payload.nonce) {
      return redirect('fb_error=invalid_state');
    }
    // state imwe ikoreshwa rimwe gusa
    await ref.set({ pendingNonce: FieldValue.delete() }, { merge: true });

    if (error || !code) return redirect('fb_error=denied');

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    // 1) code -> short-lived user token
    const short = await graphRequest('oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: getRedirectUri(req),
        code: String(code),
      },
    });

    // 2) short-lived -> long-lived user token
    const long = await graphRequest('oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: short.access_token,
      },
    });

    // 3) Page access tokens (zivuye kuri long-lived token ntizirangira)
    const accounts = await graphRequest('me/accounts', {
      token: long.access_token,
      params: { fields: 'id,name,access_token', limit: 100 },
    });

    const pages = (accounts.data || [])
      .filter((p) => p.access_token)
      .map((p) => ({ id: String(p.id), name: p.name, token: encrypt(p.access_token) }));

    // Token y'umukoresha ntibikwa; hasigara iz'amapaji gusa, zifunze.
    await ref.set(
      { userId: payload.uid, pages, pagesFetchedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    if (!pages.length) return redirect('fb_error=no_pages');
    return redirect('fb=select');
  } catch (err) {
    // Ntitwandika tokens mu mabuye (logs).
    console.error('[facebook/callback]', err.name, err.message);
    return redirect('fb_error=failed');
  }
}
