import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import {
  createDocument,
  updateDocument,
  deleteDocument,
  batchUpdate,
  batchDelete,
  subscribeToUserDocuments,
} from '@/lib/firestore';
import { logActivity } from '@/lib/activity';
import { apiFetch } from '@/lib/api';

export const COMMENTS = 'comments';

const short = (text) => (text.length > 60 ? `${text.slice(0, 60)}…` : text);

const baseFields = (postId, text, status) => ({
  postId,
  text: text.trim(),
  status,
  approvedAt: null,
  publishedAt: null,
  facebookCommentId: null,
  errorMessage: null,
});

// ---------- CREATE ----------
export async function createComment(uid, { postId, text, status = 'draft' }) {
  const id = await createDocument(COMMENTS, uid, baseFields(postId, text, status));
  await logActivity(uid, 'comment_created', `Yongeyeho igitekerezo: ${short(text)}`);
  return id;
}

export async function createManyComments(uid, { postId, texts }) {
  const clean = texts.map((t) => t.trim()).filter(Boolean);
  for (let i = 0; i < clean.length; i += 400) {
    const batch = writeBatch(db);
    clean.slice(i, i + 400).forEach((text) => {
      batch.set(doc(collection(db, COMMENTS)), {
        ...baseFields(postId, text, 'draft'),
        userId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
  await logActivity(uid, 'comment_created', `Yongeyeho ibitekerezo ${clean.length} icyarimwe`);
  return clean.length;
}

export async function duplicateComment(uid, comment) {
  const id = await createDocument(
    COMMENTS,
    uid,
    baseFields(comment.postId, comment.text, 'draft')
  );
  await logActivity(uid, 'comment_duplicated', `Yakoporoye igitekerezo: ${short(comment.text)}`);
  return id;
}

// ---------- UPDATE ----------
// Iyo wahinduye igitekerezo cyari cyemejwe, cyangwa cyanzwe/cyananiranye, gisubira kuba inyandikorugero.
export async function updateComment(uid, comment, { postId, text }) {
  const textChanged = text.trim() !== comment.text;
  const patch = { postId, text: text.trim() };
  if (['approved', 'rejected', 'failed'].includes(comment.status) && textChanged) {
    patch.status = 'draft';
    patch.approvedAt = null;
    patch.errorMessage = null;
  }
  await updateDocument(COMMENTS, comment.id, patch);
  await logActivity(uid, 'comment_updated', `Yahinduye igitekerezo: ${short(text)}`);
}

export async function submitForApproval(uid, comment) {
  await updateDocument(COMMENTS, comment.id, { status: 'pending', errorMessage: null });
  await logActivity(uid, 'comment_submitted', `Yohereje igitekerezo kwemezwa: ${short(comment.text)}`);
}

export async function approveComment(uid, comment) {
  await updateDocument(COMMENTS, comment.id, {
    status: 'approved',
    approvedAt: serverTimestamp(),
    errorMessage: null,
  });
  await logActivity(uid, 'comment_approved', `Yemeje igitekerezo: ${short(comment.text)}`);
}

export async function rejectComment(uid, comment) {
  await updateDocument(COMMENTS, comment.id, { status: 'rejected', approvedAt: null });
  await logActivity(uid, 'comment_rejected', `Yanze igitekerezo: ${short(comment.text)}`);
}

// Gusubiza igitekerezo cyananiranye mu "cyemejwe" kugira ngo kongere kugeragezwa.
export async function retryComment(uid, comment) {
  await updateDocument(COMMENTS, comment.id, {
    status: 'approved',
    approvedAt: serverTimestamp(),
    errorMessage: null,
  });
  await logActivity(uid, 'comment_retry', `Yongeye kugerageza igitekerezo: ${short(comment.text)}`);
}

export async function bulkApprove(uid, comments) {
  const eligible = comments.filter((c) => ['draft', 'pending', 'rejected'].includes(c.status));
  if (!eligible.length) return 0;
  await batchUpdate(
    COMMENTS,
    eligible.map((c) => c.id),
    { status: 'approved', approvedAt: serverTimestamp(), errorMessage: null }
  );
  await logActivity(uid, 'comment_approved', `Yemeje ibitekerezo ${eligible.length} icyarimwe`);
  return eligible.length;
}

// ---------- DELETE ----------
export async function deleteComment(uid, comment) {
  await deleteDocument(COMMENTS, comment.id);
  await logActivity(uid, 'comment_deleted', `Yasibye igitekerezo: ${short(comment.text)}`);
}

export async function bulkDeleteDrafts(uid, comments) {
  const drafts = comments.filter((c) => c.status === 'draft');
  if (!drafts.length) return 0;
  await batchDelete(
    COMMENTS,
    drafts.map((c) => c.id)
  );
  await logActivity(uid, 'comment_deleted', `Yasibye inyandikorugero ${drafts.length}`);
  return drafts.length;
}

// ---------- PUBLISH (seriveri ni yo ihamagara Facebook) ----------
export function publishComment(commentId) {
  return apiFetch('/api/facebook/publish', {
    method: 'POST',
    body: { commentId, confirm: true },
  });
}

// ---------- REAL-TIME ----------
export const subscribeComments = (uid, onData, onError) =>
  subscribeToUserDocuments(COMMENTS, uid, onData, onError);
