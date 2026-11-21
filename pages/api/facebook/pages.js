import { adminDb, FieldValue, logServerActivity } from '@/lib/server/admin';
import { requireUser, methodNotAllowed } from '@/lib/server/auth';
import { decrypt, encrypt } from '@/lib/server/crypto';
import { graphRequest, FacebookApiError, describeFacebookError } from '@/lib/server/facebook';

// GET  /api/facebook/pages            -> urutonde rw'amapaji (id + izina gusa, nta token)
// POST /api/facebook/pages {pageId}   -> gutoranya paji yo gukoresha
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res, 'GET, POST');

  const decoded = await requireUser(req, res);
  if (!decoded) return undefined;
  const uid = decoded.uid;

  try {
    const db = adminDb();
    const tokensRef = db.collection('facebookTokens').doc(uid);
    const snap = await tokensRef.get();
    const data = snap.exists ? snap.data() : {};
    const pages = data.pages || [];

    if (req.method === 'GET') {
      return res.status(200).json({ pages: pages.map((p) => ({ id: p.id, name: p.name })) });
    }

    const { pageId } = req.body || {};
    const page = pages.find((p) => p.id === String(pageId));
    if (!page) {
      return res.status(400).json({ error: 'Paji ntiyabonetse. Ongera utangire guhuza na Facebook.' });
    }

    const pageToken = decrypt(page.token);
    // Kugenzura ko token ikora koko
    await graphRequest(page.id, { token: pageToken, params: { fields: 'id,name' } });

    await tokensRef.set(
      {
        userId: uid,
        activePage: { id: page.id, name: page.name, token: encrypt(pageToken) },
        pages: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await db.collection('facebookAccounts').doc(uid).set({
      userId: uid,
      pageId: page.id,
      pageName: page.name,
      connectionStatus: 'connected',
      connectedAt: FieldValue.serverTimestamp(),
    });

    await logServerActivity(uid, 'facebook_connected', `Yahuje paji ya Facebook: ${page.name}`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[facebook/pages]', err.name, err.message);
    if (err instanceof FacebookApiError) {
      const info = describeFacebookError(err);
      return res.status(info.status).json({ error: info.message, code: info.kind });
    }
    return res.status(500).json({ error: 'Habaye ikosa ku seriveri.' });
  }
}
