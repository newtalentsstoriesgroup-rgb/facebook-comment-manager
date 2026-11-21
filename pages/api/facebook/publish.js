import { adminDb, FieldValue, logServerActivity } from '@/lib/server/admin';
import { requireUser, methodNotAllowed } from '@/lib/server/auth';
import { decrypt } from '@/lib/server/crypto';
import { graphRequest, FacebookApiError, describeFacebookError } from '@/lib/server/facebook';

const MAX_PER_MINUTE = 5; // umupaka w'ibitekerezo ku munota ku mukoresha (kwirinda spam)
const WINDOW_MS = 60 * 1000;
const LOCK_MS = 30 * 1000;
const MAX_TEXT = 8000;

// Ifata "umwanya" w'itangazwa: igenzura umupaka kandi ikabuza gutangaza kabiri icyarimwe.
async function acquireSlot(db, uid, commentId) {
  const ref = db.collection('rateLimits').doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const data = snap.exists ? snap.data() : {};
    const stamps = (data.stamps || []).filter((t) => now - t < WINDOW_MS);
    const locks = {};
    Object.entries(data.locks || {}).forEach(([k, t]) => {
      if (now - t < LOCK_MS) locks[k] = t;
    });

    if (locks[commentId]) return { ok: false, reason: 'in_progress' };
    if (stamps.length >= MAX_PER_MINUTE) {
      const wait = Math.max(1, Math.ceil((WINDOW_MS - (now - stamps[0])) / 1000));
      return { ok: false, reason: 'rate_limit', wait };
    }
    stamps.push(now);
    locks[commentId] = now;
    tx.set(ref, { ...data, stamps, locks });
    return { ok: true };
  });
}

async function releaseSlot(db, uid, commentId) {
  try {
    await db
      .collection('rateLimits')
      .doc(uid)
      .set({ locks: { [commentId]: FieldValue.delete() } }, { merge: true });
  } catch (err) {
    console.error('[publish] release', err.message);
  }
}

// Facebook ikeneye ID nka "PAGEID_POSTID". Iyo ID ifite imibare gusa twongeraho ID ya paji.
function buildTarget(rawPostId, pageId) {
  const id = String(rawPostId || '').trim();
  if (!/^\d+(_\d+)?$/.test(id)) {
    return {
      error:
        'ID y\'inyandiko ntiyemewe. Hindura inyandiko ushyiremo ID y\'imibare (urugero 1234567890 cyangwa PAGEID_POSTID).',
    };
  }
  if (id.includes('_')) {
    if (id.split('_')[0] !== pageId) {
      return { error: 'Iyi nyandiko ntiri iya paji wahujwe. Gutangaza bikorwa kuri paji wahujwe gusa.' };
    }
    return { target: id };
  }
  return { target: `${pageId}_${id}` };
}

// POST /api/facebook/publish  { commentId, confirm: true }
// Itangaza igitekerezo KIMWE cyemejwe kuri Facebook binyuze muri Graph API.
export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  const decoded = await requireUser(req, res);
  if (!decoded) return undefined;
  const uid = decoded.uid;

  const { commentId, confirm } = req.body || {};
  if (confirm !== true) {
    return res.status(400).json({ error: 'Kwemeza gutangaza birakenewe.' });
  }
  if (typeof commentId !== 'string' || !/^[A-Za-z0-9]{1,64}$/.test(commentId)) {
    return res.status(400).json({ error: 'ID y\'igitekerezo ntiyemewe.' });
  }

  let db;
  try {
    db = adminDb();
  } catch (err) {
    return res.status(500).json({ error: 'Seriveri ntiramera neza. Reba README.' });
  }

  let locked = false;
  try {
    const commentRef = db.collection('comments').doc(commentId);
    const commentSnap = await commentRef.get();
    if (!commentSnap.exists || commentSnap.data().userId !== uid) {
      return res.status(404).json({ error: 'Igitekerezo ntikibonetse.' });
    }
    const comment = commentSnap.data();

    if (comment.status !== 'approved') {
      return res.status(409).json({ error: 'Igitekerezo kigomba kuba cyemejwe mbere yo gutangazwa.' });
    }
    const text = String(comment.text || '').trim();
    if (!text || text.length > MAX_TEXT) {
      return res.status(400).json({ error: 'Umwandiko w\'igitekerezo ntiwemewe.' });
    }

    const postSnap = await db.collection('posts').doc(String(comment.postId)).get();
    if (!postSnap.exists || postSnap.data().userId !== uid) {
      return res.status(404).json({ error: 'Inyandiko y\'iki gitekerezo ntikibonetse.' });
    }
    const post = postSnap.data();

    const [tokensSnap, accountSnap] = await Promise.all([
      db.collection('facebookTokens').doc(uid).get(),
      db.collection('facebookAccounts').doc(uid).get(),
    ]);
    const active = tokensSnap.exists ? tokensSnap.data().activePage : null;
    if (!active || !accountSnap.exists) {
      return res.status(400).json({ error: 'Banza uhuze paji ya Facebook mu igenamiterere.', code: 'not_connected' });
    }
    if (accountSnap.data().connectionStatus !== 'connected') {
      return res.status(401).json({
        error: 'Ihuza rya Facebook ryarangiye. Ongera uryubake mu igenamiterere.',
        code: 'expired',
      });
    }

    const { target, error: targetError } = buildTarget(post.postId, active.id);
    if (targetError) return res.status(400).json({ error: targetError, code: 'invalid_post' });

    // Kwirinda spam: ntitwemera gutangaza umwandiko umwe inshuro nyinshi ku nyandiko imwe.
    const published = await db
      .collection('comments')
      .where('userId', '==', uid)
      .where('postId', '==', String(comment.postId))
      .where('status', '==', 'published')
      .get();
    if (published.docs.some((d) => String(d.data().text || '').trim() === text)) {
      return res.status(409).json({
        error: 'Igitekerezo gisa n\'iki cyamaze gutangazwa kuri iyi nyandiko. Ntikizongera gutangazwa kugira ngo hirindwe spam.',
        code: 'duplicate',
      });
    }

    const slot = await acquireSlot(db, uid, commentId);
    if (!slot.ok) {
      if (slot.reason === 'in_progress') {
        return res.status(409).json({ error: 'Iki gitekerezo kiri gutangazwa. Tegereza.', code: 'in_progress' });
      }
      res.setHeader('Retry-After', String(slot.wait));
      return res.status(429).json({
        error: `Wageze ku mupaka w'ibitekerezo ${MAX_PER_MINUTE} ku munota. Ongera ugerageze nyuma y'amasegonda ${slot.wait}.`,
        code: 'rate_limit',
      });
    }
    locked = true;

    let result;
    try {
      const pageToken = decrypt(active.token);
      result = await graphRequest(`${target}/comments`, {
        method: 'POST',
        token: pageToken,
        params: { message: text },
      });
    } catch (err) {
      if (!(err instanceof FacebookApiError)) throw err;
      const info = describeFacebookError(err);
      console.error('[facebook/publish] Graph error', err.code, err.subcode, err.message);

      if (info.kind === 'expired') {
        await accountSnap.ref.update({ connectionStatus: 'expired' });
      }
      // Rate limit ya Facebook si ikosa ry'igitekerezo: gisigara "cyemejwe" ngo kongere kugeragezwa.
      if (info.kind !== 'rate_limit') {
        await commentRef.update({
          status: 'failed',
          errorMessage: info.message.slice(0, 900),
          updatedAt: FieldValue.serverTimestamp(),
        });
        await logServerActivity(uid, 'comment_failed', `Gutangaza byanze: ${info.message}`.slice(0, 480));
      }
      return res.status(info.status).json({ error: info.message, code: info.kind });
    }

    try {
      await commentRef.update({
        status: 'published',
        publishedAt: FieldValue.serverTimestamp(),
        facebookCommentId: String(result.id),
        errorMessage: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('[facebook/publish] byatangajwe ariko ntibyabitswe', commentId, result.id, err.message);
      return res.status(500).json({
        error: `Igitekerezo cyatangajwe kuri Facebook (ID: ${result.id}) ariko ntigishoboye kubikwa. Ntukongere kugitangaza.`,
      });
    }

    await logServerActivity(uid, 'comment_published', `Yatangaje igitekerezo kuri Facebook (${post.title || post.postUrl})`);
    return res.status(200).json({ ok: true, facebookCommentId: String(result.id) });
  } catch (err) {
    console.error('[facebook/publish]', err.name, err.message);
    return res.status(500).json({ error: 'Habaye ikosa ku seriveri. Ongera ugerageze.' });
  } finally {
    if (locked) await releaseSlot(db, uid, commentId);
  }
}
