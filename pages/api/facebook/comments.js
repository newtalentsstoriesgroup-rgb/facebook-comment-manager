import { adminDb } from '@/lib/server/admin';
import { requireUser, methodNotAllowed } from '@/lib/server/auth';
import { graphRequest, FacebookApiError, describeFacebookError } from '@/lib/server/facebook';
import { getActivePage, buildTarget } from '@/lib/server/page';

// GET /api/facebook/comments?postDocId=XXXX
// Isomera ibitekerezo by'abantu ku nyandiko yawe (kugira ngo ubisubize).
export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');

  const decoded = await requireUser(req, res);
  if (!decoded) return undefined;
  const uid = decoded.uid;

  const postDocId = String(req.query.postDocId || '');
  if (!/^[A-Za-z0-9]{1,64}$/.test(postDocId)) {
    return res.status(400).json({ error: "ID y'inyandiko ntiyemewe." });
  }

  try {
    const db = adminDb();
    const postSnap = await db.collection('posts').doc(postDocId).get();
    if (!postSnap.exists || postSnap.data().userId !== uid) {
      return res.status(404).json({ error: 'Inyandiko ntiyabonetse.' });
    }

    const page = await getActivePage(db, uid);
    if (page.error) return res.status(page.error.status).json(page.error.body);

    const { target, error } = buildTarget(postSnap.data().postId, page.pageId);
    if (error) return res.status(400).json({ error, code: 'invalid_post' });

    const data = await graphRequest(`${target}/comments`, {
      token: page.token,
      params: {
        fields: 'id,message,created_time,from{id,name}',
        filter: 'toplevel',
        order: 'reverse_chronological',
        limit: 50,
      },
    });

    const comments = (data.data || [])
      .filter((c) => !c.from || String(c.from.id) !== page.pageId)
      .map((c) => ({
        id: String(c.id),
        message: c.message || '',
        createdTime: c.created_time || null,
        fromName: c.from?.name || '',
      }));

    return res.status(200).json({ comments });
  } catch (err) {
    console.error('[facebook/comments]', err.name, err.message);
    if (err instanceof FacebookApiError) {
      const info = describeFacebookError(err);
      if (info.kind === 'expired') {
        const acc = adminDb().collection('facebookAccounts').doc(uid);
        await acc.update({ connectionStatus: 'expired' }).catch(() => {});
      }
      const hint =
        info.kind === 'permission'
          ? ' Gusoma ibitekerezo by\'abandi bishobora gusaba uburenganzira bwa Facebook bwongeyeho (reba README: FACEBOOK_SCOPES).'
          : '';
      return res.status(info.status).json({ error: info.message + hint, code: info.kind });
    }
    return res.status(500).json({ error: 'Habaye ikosa ku seriveri.' });
  }
}
