import { adminDb, FieldValue, logServerActivity } from '@/lib/server/admin';
import { requireUser, methodNotAllowed } from '@/lib/server/auth';
import { graphRequest, FacebookApiError, describeFacebookError } from '@/lib/server/facebook';
import { getActivePage } from '@/lib/server/page';

export function validRules(rules) {
  return (
    Array.isArray(rules) &&
    rules.length > 0 &&
    rules.length <= 20 &&
    rules.every(
      (r) =>
        r &&
        Array.isArray(r.keywords) &&
        r.keywords.some((k) => String(k).trim()) &&
        typeof r.reply === 'string' &&
        r.reply.trim() &&
        r.reply.length <= 2000
    )
  );
}

// POST /api/facebook/autoreply { enabled: boolean }
// Gufungura: isinyisha paji kuri webhook ya "feed" ya Facebook. Gufunga: iyikuraho.
export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  const decoded = await requireUser(req, res);
  if (!decoded) return undefined;
  const uid = decoded.uid;

  const { enabled } = req.body || {};
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'Ubusabe ntibwemewe.' });

  try {
    const db = adminDb();
    const settingsRef = db.collection('autoReplySettings').doc(uid);
    const settingsSnap = await settingsRef.get();

    const page = await getActivePage(db, uid);

    if (!enabled) {
      if (!page.error) {
        await graphRequest(`${page.pageId}/subscribed_apps`, { method: 'DELETE', token: page.token }).catch(() => {});
      }
      if (settingsSnap.exists) {
        await settingsRef.update({ enabled: false, updatedAt: FieldValue.serverTimestamp() });
      }
      await logServerActivity(uid, 'auto_reply_disabled', 'Yahagaritse gusubiza ubwayo.');
      return res.status(200).json({ ok: true, enabled: false });
    }

    if (page.error) return res.status(page.error.status).json(page.error.body);
    if (!process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
      return res.status(500).json({
        error: 'Seriveri ntiramera neza: harabura FACEBOOK_WEBHOOK_VERIFY_TOKEN. Reba README.',
        code: 'not_configured',
      });
    }
    if (!settingsSnap.exists || !validRules(settingsSnap.data().rules)) {
      return res.status(400).json({ error: 'Banza ubike nibura itegeko rimwe ryuzuye (amagambo n\'igisubizo).' });
    }

    await graphRequest(`${page.pageId}/subscribed_apps`, {
      method: 'POST',
      token: page.token,
      params: { subscribed_fields: 'feed' },
    });
    await settingsRef.update({ enabled: true, updatedAt: FieldValue.serverTimestamp() });
    await logServerActivity(uid, 'auto_reply_enabled', 'Yatangiye gusubiza ubwayo.');
    return res.status(200).json({ ok: true, enabled: true });
  } catch (err) {
    console.error('[facebook/autoreply]', err.name, err.message);
    if (err instanceof FacebookApiError) {
      const info = describeFacebookError(err);
      const hint =
        info.kind === 'permission'
          ? " Gusinyisha paji kuri webhook bisaba uburenganzira pages_manage_metadata (reba README: FACEBOOK_SCOPES), hanyuma wongere uhuze paji."
          : '';
      return res.status(info.status).json({ error: info.message + hint, code: info.kind });
    }
    return res.status(500).json({ error: 'Habaye ikosa ku seriveri.' });
  }
}
