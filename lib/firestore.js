import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { searchItems } from '@/lib/utils';

const BATCH_SIZE = 400;

export const withId = (snap) => ({ id: snap.id, ...snap.data({ serverTimestamps: 'estimate' }) });

// ---------- CREATE ----------
export async function createDocument(col, uid, data) {
  const ref = await addDoc(collection(db, col), {
    ...data,
    userId: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// ---------- READ ----------
export async function readDocument(col, id) {
  const snap = await getDoc(doc(db, col, id));
  return snap.exists() ? withId(snap) : null;
}

export async function readUserDocuments(col, uid, extraConstraints = []) {
  const q = query(collection(db, col), where('userId', '==', uid), ...extraConstraints);
  const snap = await getDocs(q);
  return snap.docs.map(withId);
}

// ---------- UPDATE ----------
export async function updateDocument(col, id, data) {
  await updateDoc(doc(db, col, id), { ...data, updatedAt: serverTimestamp() });
}

export async function batchUpdate(col, ids, data) {
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    ids.slice(i, i + BATCH_SIZE).forEach((id) => {
      batch.update(doc(db, col, id), { ...data, updatedAt: serverTimestamp() });
    });
    await batch.commit();
  }
}

// ---------- DELETE ----------
export async function deleteDocument(col, id) {
  await deleteDoc(doc(db, col, id));
}

export async function batchDelete(col, ids) {
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    ids.slice(i, i + BATCH_SIZE).forEach((id) => batch.delete(doc(db, col, id)));
    await batch.commit();
  }
}

// ---------- SEARCH ----------
// Firestore nta full-text search ifite; dushakisha mu byamaze gukurwa (client-side).
export function searchDocuments(items, term, fields) {
  return searchItems(items, term, fields);
}

// ---------- PAGINATION (cursor-based) ----------
export async function fetchUserPage(
  col,
  uid,
  { pageSize = 20, cursor = null, orderField = 'createdAt', direction = 'desc' } = {}
) {
  const constraints = [
    where('userId', '==', uid),
    orderBy(orderField, direction),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(pageSize),
  ];
  const snap = await getDocs(query(collection(db, col), ...constraints));
  return {
    items: snap.docs.map(withId),
    cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
    hasMore: snap.docs.length === pageSize,
  };
}

// ---------- REAL-TIME ----------
export function subscribeToUserDocuments(col, uid, onData, onError) {
  const q = query(collection(db, col), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(withId)),
    (err) => {
      console.error(`[${col}]`, err);
      onError?.(err);
    }
  );
}

export function subscribeToUserDocumentsOrdered(
  col,
  uid,
  { orderField = 'createdAt', direction = 'desc', max = 10 } = {},
  onData,
  onError
) {
  const q = query(
    collection(db, col),
    where('userId', '==', uid),
    orderBy(orderField, direction),
    limit(max)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(withId)),
    (err) => {
      console.error(`[${col}]`, err);
      onError?.(err);
    }
  );
}

export function subscribeToDocument(col, id, onData, onError) {
  return onSnapshot(
    doc(db, col, id),
    (snap) => onData(snap.exists() ? withId(snap) : null),
    (err) => {
      console.error(`[${col}/${id}]`, err);
      onError?.(err);
    }
  );
}
