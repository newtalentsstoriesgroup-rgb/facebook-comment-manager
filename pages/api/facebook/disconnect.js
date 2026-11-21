import { adminDb, logServerActivity } from '@/lib/server/admin';
import { requireUser, methodNotAllowed } from '@/lib/server/auth';

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
