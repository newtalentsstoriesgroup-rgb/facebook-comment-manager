import crypto from 'crypto';
import { adminDb, FieldValue } from '@/lib/server/admin';
import { requireUser, methodNotAllowed } from '@/lib/server/auth';
import { signState } from '@/lib/server/crypto';
import {
  OAUTH_DIALOG_URL,
  SCOPES,
  getRedirectUri,
  missingEnv,
} from '@/lib/server/facebook';

// POST /api/facebook/connect
// Isubiza URL ya Facebook OAuth. Client ihita iyoherezaho umukoresha.
export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  const missing = missingEnv();
  if (missing.length) {
    return res.status(500).json({
      error: `Seriveri ntiramera neza. Harabura: ${missing.join(', ')}.`,
      code: 'not_configured',
    });
  }

  const decoded = await requireUser(req, res);
  if (!decoded) return undefined;

  try {
    const nonce = crypto.randomBytes(16).toString('hex');
    await adminDb()
      .collection('facebookTokens')
      .doc(decoded.uid)
      .set(
        { userId: decoded.uid, pendingNonce: nonce, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

    const state = signState({ uid: decoded.uid, nonce });
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      redirect_uri: getRedirectUri(req),
      state,
      scope: SCOPES.join(','),
      response_type: 'code',
    });
    return res.status(200).json({ url: `${OAUTH_DIALOG_URL}?${params.toString()}` });
  } catch (err) {
    console.error('[facebook/connect]', err.message);
    return res.status(500).json({ error: 'Ntibyashobotse gutangira guhuza na Facebook.' });
  }
}
