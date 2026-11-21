import { adminDb, FieldValue, logServerActivity } from '@/lib/server/admin';
import { requireUser, methodNotAllowed } from '@/lib/server/auth';
import { decrypt } from '@/lib/server/crypto';
import { graphRequest } from '@/lib/server/facebook';

// POST /api/facebook/disconnect — isiba tokens zose z'umukoresha n'ihuza rya paji.
export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  const decoded = await requireUser(req, res);
  if (!decoded) return undefined;

  try {
    const db = adminDb();
    const accountRef = db.collection('facebookAccounts').doc(decoded.uid);
    const accountSnap = await accountRef.get();
    const pageName = accountSnap.exists ? accountSnap.data().pageName : '';

    // Hagarika gusubiza ubwayo no gukuraho webhook (ntibihagarika gutandukanya iyo binaniwe).
    const tokensSnap = await db.collection('facebookTokens').doc(decoded.uid).get();
    const active = tokensSnap.exists ? tokensSnap.data().activePage : null;
    if (active) {
      try {
        await graphRequest(`${active.id}/subscribed_apps`, { method: 'DELETE', token: decrypt(active.token) });
      } catch (err) {
        console.error('[facebook/disconnect] unsubscribe', err.message);
      }
    }
    const settingsRef = db.collection('autoReplySettings').doc(decoded.uid);
    if ((await settingsRef.get()).exists) {
      await settingsRef.update({ enabled: false, updatedAt: FieldValue.serverTimestamp() });
    }

    await db.collection('facebookTokens').doc(decoded.uid).delete();
    await accountRef.delete();

    await logServerActivity(
      decoded.uid,
      'facebook_disconnected',
      `Yatandukanyije paji ya Facebook${pageName ? `: ${pageName}` : ''}`
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[facebook/disconnect]', err.message);
    return res.status(500).json({ error: 'Ntibyashobotse gutandukanya Facebook.' });
  }
}
