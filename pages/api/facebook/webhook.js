import crypto from 'crypto';
import { adminDb, FieldValue, logServerActivity } from '@/lib/server/admin';
import { decrypt } from '@/lib/server/crypto';
import { graphRequest, FacebookApiError, describeFacebookError } from '@/lib/server/facebook';
import { takeRateSlot } from '@/lib/server/limits';
import { firstName } from '@/lib/server/page';

// Tugomba gusoma "raw body" kugira ngo dusuzume umukono wa Facebook (X-Hub-Signature-256).
export const config = { api: { bodyParser: false } };

const MAX_EVENTS = 20;

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function validSignature(raw, header) {
  const secret = process.env.FACEBOOK_APP_SECRET;
  if (!secret || !header) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(raw).digest('hex')}`;
  const a = Buffer.from(String(header));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function handleComment(pageId, v) {
  const commentId = String(v.comment_id || '');
  if (!/^\d+(_\d+)?$/.test(commentId)) return;
  // Ntitusubiza ibitekerezo bya Paji ubwayo, cyangwa ibisubizo (replies) — ibitekerezo bya mbere gusa.
  if (!v.from || String(v.from.id) === String(pageId)) return;
  if (v.parent_id && v.post_id && String(v.parent_id) !== String(v.post_id)) return;
  const message = String(v.message || '').trim().toLowerCase();
  if (!message) return;

  const db = adminDb();
  const acc = await db
    .collection('facebookAccounts')
    .where('pageId', '==', String(pageId))
    .where('connectionStatus', '==', 'connected')
    .limit(1)
    .get();
  if (acc.empty) return;
  const uid = acc.docs[0].data().userId;

  const settingsSnap = await db.collection('autoReplySettings').doc(uid).get();
  if (!settingsSnap.exists) return;
  const settings = settingsSnap.data();
  if (settings.enabled !== true) return;

  // Dusubiza gusa ku nyandiko umukoresha yongeyeho muri porogaramu.
  const postFull = String(v.post_id || '');
  const suffix = postFull.split('_').pop();
  const posts = await db
    .collection('posts')
    .where('userId', '==', uid)
    .where('postId', 'in', [...new Set([postFull, suffix].filter(Boolean))])
    .limit(1)
    .get();
  if (posts.empty) return;

  const rule = (settings.rules || []).find(
    (r) =>
      typeof r.reply === 'string' &&
      r.reply.trim() &&
      Array.isArray(r.keywords) &&
      r.keywords.some((k) => String(k).trim() && message.includes(String(k).trim().toLowerCase()))
  );
  if (!rule) return;

  // Igitekerezo kimwe gisubizwa rimwe gusa.
  const logRef = db.collection('replyLogs').doc(commentId);
  try {
    await logRef.create({
      userId: uid,
      commentId,
      source: 'auto',
      status: 'pending',
      ruleId: String(rule.id || ''),
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    if (err.code === 6 || /ALREADY_EXISTS/.test(err.message)) return;
    throw err;
  }

  // Umupaka mu isaha (kwirinda spam)
  const maxPerHour = Math.min(20, Math.max(1, Number(settings.maxPerHour) || 5));
  const slot = await takeRateSlot(db, uid, { field: 'autoStamps', max: maxPerHour, windowMs: 60 * 60 * 1000 });
  if (!slot.ok) {
    await logRef.update({ status: 'skipped', error: 'Umupaka w\'isaha wagezweho.' });
    return;
  }

  const reply = String(rule.reply)
    .replace(/\{izina\}/gi, firstName(v.from.name))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);
  if (!reply) {
    await logRef.update({ status: 'skipped', error: 'Igisubizo ni ubusa.' });
    return;
  }

  const tokensSnap = await db.collection('facebookTokens').doc(uid).get();
  const active = tokensSnap.exists ? tokensSnap.data().activePage : null;
  if (!active || String(active.id) !== String(pageId)) {
    await logRef.update({ status: 'failed', error: 'Paji ntihuje.' });
    return;
  }

  try {
    const result = await graphRequest(`${commentId}/comments`, {
      method: 'POST',
      token: decrypt(active.token),
      params: { message: reply },
    });
    await logRef.update({ status: 'replied', replyId: String(result.id), message: reply.slice(0, 500) });
    await logServerActivity(uid, 'auto_reply', `Yasubije ubwayo igitekerezo cya ${v.from.name || 'umuntu'}.`);
  } catch (err) {
    if (!(err instanceof FacebookApiError)) throw err;
    const info = describeFacebookError(err);
    console.error('[webhook] Graph error', err.code, err.message);
    if (info.kind === 'expired') await acc.docs[0].ref.update({ connectionStatus: 'expired' });
    await logRef.update({ status: 'failed', error: info.message.slice(0, 400) });
  }
}

export default async function handler(req, res) {
  // Kugenzura webhook (Meta ihamagara rimwe igihe uyishyiraho)
  if (req.method === 'GET') {
    const token = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;
    if (token && req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === token) {
      return res.status(200).send(String(req.query['hub.challenge'] || ''));
    }
    return res.status(403).end();
  }
  if (req.method !== 'POST') return res.status(405).end();

  let raw;
  try {
    raw = await readRaw(req);
  } catch {
    return res.status(400).end();
  }
  if (!validSignature(raw, req.headers['x-hub-signature-256'])) {
    return res.status(401).end();
  }

  let body;
  try {
    body = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.status(400).end();
  }
  if (body.object !== 'page') return res.status(200).send('IGNORED');

  let processed = 0;
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const v = change.value || {};
      if (change.field !== 'feed' || v.item !== 'comment' || v.verb !== 'add') continue;
      if (processed >= MAX_EVENTS) break;
      processed += 1;
      try {
        await handleComment(entry.id, v);
      } catch (err) {
        console.error('[webhook] byanze', err.name, err.message);
      }
    }
  }
  // Facebook ikeneye 200 vuba; iyo itabonye igerageza kongera kohereza.
  return res.status(200).send('EVENT_RECEIVED');
}
