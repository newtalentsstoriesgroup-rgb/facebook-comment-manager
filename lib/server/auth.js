// SERIVERI GUSA. Kwemeza ko usaba ari umukoresha wa Firebase (ID token muri Authorization header).
import { adminAuth } from '@/lib/server/admin';

export async function requireUser(req, res) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    res.status(401).json({ error: 'Ntabwo winjiye.' });
    return null;
  }
  try {
    return await adminAuth().verifyIdToken(match[1]);
  } catch (err) {
    if (/FIREBASE_SERVICE_ACCOUNT/.test(err.message)) {
      res.status(500).json({ error: 'Seriveri ntiramera neza (FIREBASE_SERVICE_ACCOUNT). Reba README.' });
    } else {
      res.status(401).json({ error: 'Kwinjira kwarangiye. Ongera winjire.' });
    }
    return null;
  }
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed);
  return res.status(405).json({ error: 'Uburyo ntibwemewe.' });
}
