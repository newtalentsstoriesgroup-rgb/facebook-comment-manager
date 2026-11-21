// SERIVERI GUSA. Gufunga (AES-256-GCM) tokens no gusinya "state" ya OAuth.
import crypto from 'crypto';

function secretKey() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error('TOKEN_ENCRYPTION_KEY ntiyashyizweho cyangwa ni ngufi cyane (byibura inyuguti 16).');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString('base64')).join('.');
}

export function decrypt(payload) {
  const [iv, tag, enc] = String(payload).split('.').map((p) => Buffer.from(p, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

const sign = (body) =>
  crypto.createHmac('sha256', secretKey()).update(`fcm-oauth-state:${body}`).digest('base64url');

export function signState(payload, ttlMs = 10 * 60 * 1000) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlMs })).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifyState(state) {
  try {
    const [body, sig] = String(state).split('.');
    if (!body || !sig) return null;
    const expected = sign(body);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
