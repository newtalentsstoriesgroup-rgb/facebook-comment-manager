import { adminDb, FieldValue, logServerActivity } from '@/lib/server/admin';
import { requireUser, methodNotAllowed } from '@/lib/server/auth';
import { graphRequest, FacebookApiError, describeFacebookError } from '@/lib/server/facebook';
import { getActivePage } from '@/lib/server/page';
import { takeRateSlot } from '@/lib/server/limits';

const MAX_PER_MINUTE = 5;

// POST /api/facebook/reply { commentId, message, confirm: true }
// Isubiza igitekerezo KIMWE cy'umuntu nka Paji. Buri gitekerezo gisubizwa rimwe gusa.
export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  const decoded = await requireUser(req, res);
  if (!decoded) return undefined;
  const uid = decoded.uid;

  const { commentId, message, confirm } = req.body || {};
  if (confirm !== true) return res.status(400).json({ error: 'Kwemeza kohereza birakenewe.' });
  if (typeof commentId !== 'string' || !/^\d+(_\d+)?$/.test(commentId)) {
    return res.status(400).json({ error: "ID y'igitekerezo ntiyemewe." });
  }
  const text = String(message || '').trim();
  if (!text || text.length > 8000) {
    return res.status(400).json({ error: "Igisubizo kigomba kuba kitari ubusa kandi kitarenga inyuguti 8000." });
  }

  let db;
  try {
    db = adminDb();
  } catch {
    return res.status(500).json({ error: 'Seriveri ntiramera neza. Reba README.' });
  }

  try {
    const page = await getActivePage(db, uid);
    if (page.error) return res.status(page.error.status).json(page.error.body);

    const slot = await takeRateSlot(db, uid, { field: 'replyStamps', max: MAX_PER_MINUTE, windowMs: 60 * 1000 });
    if (!slot.ok) {
      res.setHeader('Retry-After', String(slot.wait));
      return res.status(429).json({
        error: `Wageze ku mupaka w'ibisubizo ${MAX_PER_MINUTE} ku munota. Ongera ugerageze nyuma y'amasegonda ${slot.wait}.`,
        code: 'rate_limit',
      });
    }

    // Kwirinda gusubiza kabiri: document y'ikimenyetso ifite ID y'igitekerezo.
    const logRef = db.collection('replyLogs').doc(commentId);
    try {
      await logRef.create({
        userId: uid,
        commentId,
        source: 'manual',
        status: 'pending',
        message: text.slice(0, 500),
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      if (err.code === 6 || /ALREADY_EXISTS/.test(err.message)) {
        return res.status(409).json({ error: 'Iki gitekerezo cyamaze gusubizwa.', code: 'duplicate' });
      }
      throw err;
    }

    try {
      const result = await graphRequest(`${commentId}/comments`, {
        method: 'POST',
        token: page.token,
        params: { message: text },
      });
      await logRef.update({ status: 'replied', replyId: String(result.id) });
      await logServerActivity(uid, 'reply_sent', `Yasubije igitekerezo: ${text.slice(0, 80)}`);
      return res.status(200).json({ ok: true, replyId: String(result.id) });
    } catch (err) {
      await logRef.delete().catch(() => {}); // kugira ngo ashobore kongera kugerageza
      if (!(err instanceof FacebookApiError)) throw err;
      const info = describeFacebookError(err);
      console.error('[facebook/reply] Graph error', err.code, err.subcode, err.message);
      if (info.kind === 'expired') await page.accountRef.update({ connectionStatus: 'expired' });
      return res.status(info.status).json({ error: info.message, code: info.kind });
    }
  } catch (err) {
    console.error('[facebook/reply]', err.name, err.message);
    return res.status(500).json({ error: 'Habaye ikosa ku seriveri. Ongera ugerageze.' });
  }
}
