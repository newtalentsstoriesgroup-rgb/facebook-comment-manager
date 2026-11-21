import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { fetchUserPage, subscribeToUserDocumentsOrdered } from '@/lib/firestore';

export const ACTIVITY = 'activityLogs';

// Andika igikorwa mu mateka. Ntihagomba guhagarika igikorwa nyamukuru iyo kinaniwe.
export async function logActivity(userId, action, description) {
  try {
    await addDoc(collection(db, ACTIVITY), {
      userId,
      action,
      description: String(description || '').slice(0, 500),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[activity] byanze kwandikwa', err);
  }
}

// Bisaba index: activityLogs (userId ASC, createdAt DESC) — reba firestore.indexes.json
export function subscribeActivity(uid, max, onData, onError) {
  return subscribeToUserDocumentsOrdered(
    ACTIVITY,
    uid,
    { orderField: 'createdAt', direction: 'desc', max },
    onData,
    onError
  );
}

export function fetchActivityPage(uid, cursor, pageSize = 20) {
  return fetchUserPage(ACTIVITY, uid, { cursor, pageSize });
}
