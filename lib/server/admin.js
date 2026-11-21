// SERIVERI GUSA. Firebase Admin SDK ikoreshwa mu pages/api/* gusa kugira ngo
// ibimenyetso bya Facebook (tokens) bibikwe ahatagera abakoresha (rules zibuza client).
// Ntabwo ari "admin system" y'abakoresha: nta ruhare (role) rw'abakoresha ruriho.
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT ntiyashyizweho kuri seriveri.');
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    try {
      json = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT ntabwo ari JSON yemewe (cyangwa base64 yayo).');
    }
  }
  if (json.private_key) json.private_key = json.private_key.replace(/\\n/g, '\n');
  return json;
}

export function getAdminApp() {
  const existing = getApps();
  if (existing.length) return existing[0];
  return initializeApp({ credential: cert(readServiceAccount()) });
}

export const adminDb = () => getFirestore(getAdminApp());
export const adminAuth = () => getAuth(getAdminApp());
export { FieldValue };

export async function logServerActivity(userId, action, description) {
  try {
    await adminDb()
      .collection('activityLogs')
      .add({
        userId,
        action,
        description: String(description || '').slice(0, 500),
        createdAt: FieldValue.serverTimestamp(),
      });
  } catch (err) {
    console.error('[activity] byanze kwandikwa', err.message);
  }
}
