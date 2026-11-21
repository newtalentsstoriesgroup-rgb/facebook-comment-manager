import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { subscribeToDocument, subscribeToUserDocuments } from '@/lib/firestore';
import { logActivity } from '@/lib/activity';
import { apiFetch } from '@/lib/api';

export const MAX_RULES = 20;

// ---------- Gusubiza ibitekerezo by'abantu (byo ntibigarukira ku bwa Paji) ----------
export const fetchPostComments = (postDocId) =>
  apiFetch(`/api/facebook/comments?postDocId=${encodeURIComponent(postDocId)}`);

export const sendReply = (commentId, message) =>
  apiFetch('/api/facebook/reply', { method: 'POST', body: { commentId, message, confirm: true } });

// Ibisubizo byose (byohereje cyangwa ubwayo) — kugira ngo tumenye ibyamaze gusubizwa.
export const subscribeReplyLogs = (uid, onData, onError) =>
  subscribeToUserDocuments('replyLogs', uid, onData, onError);

// ---------- Auto reply ----------
export const subscribeAutoReplySettings = (uid, onData, onError) =>
  subscribeToDocument('autoReplySettings', uid, onData, onError);

export async function saveAutoReplyRules(uid, existing, { maxPerHour, rules }) {
  const ref = doc(db, 'autoReplySettings', uid);
  if (existing) {
    await updateDoc(ref, { maxPerHour, rules, updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, {
      userId: uid,
      enabled: false,
      maxPerHour,
      rules,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await logActivity(uid, 'auto_reply_rules', `Yabitse amategeko yo gusubiza ubwayo (${rules.length}).`);
}

export const setAutoReplyEnabled = (enabled) =>
  apiFetch('/api/facebook/autoreply', { method: 'POST', body: { enabled } });
