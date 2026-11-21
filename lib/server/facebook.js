// SERIVERI GUSA. Gukorana na Meta Graph API.
import crypto from 'crypto';

export const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || 'v23.0';
export const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
export const OAUTH_DIALOG_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

// Uburenganzira busanzwe bwa Facebook Pages:
// - pages_show_list: kubona urutonde rw'amapaji
// - pages_read_engagement: gusoma inyandiko z'ipaji
// - pages_manage_engagement: gutangaza no gucunga ibitekerezo nka Paji
const DEFAULT_SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_manage_engagement'];
// Ushobora kubihindura ukoresheje FACEBOOK_SCOPES (atandukanyijwe n'akitso), urugero ukongeraho
// pages_manage_metadata (gusinyisha webhook ya "Gusubiza ubwayo") cyangwa pages_read_user_content.
// Koresha gusa ubwemererwa Meta yemera kuri app yawe, bitaba ukabona "Invalid Scopes".
export const SCOPES = process.env.FACEBOOK_SCOPES
  ? process.env.FACEBOOK_SCOPES.split(',').map((s) => s.trim()).filter(Boolean)
  : DEFAULT_SCOPES;

const REQUIRED_ENV = ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET', 'TOKEN_ENCRYPTION_KEY', 'FIREBASE_SERVICE_ACCOUNT'];

export function missingEnv() {
  return REQUIRED_ENV.filter((k) => !process.env[k]);
}

export function getRedirectUri(req) {
  if (process.env.FACEBOOK_REDIRECT_URI) return process.env.FACEBOOK_REDIRECT_URI;
  const proto = (req.headers['x-forwarded-proto'] || 'https').toString().split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}/api/facebook/callback`;
}

export class FacebookApiError extends Error {
  constructor(payload, status) {
    super(payload?.message || 'Facebook API error');
    this.name = 'FacebookApiError';
    this.code = payload?.code;
    this.subcode = payload?.error_subcode;
    this.status = status;
  }
}

const appSecretProof = (token) =>
  crypto.createHmac('sha256', process.env.FACEBOOK_APP_SECRET).update(token).digest('hex');

// Token ntishyirwa mu URL ya POST: ijya mu mubiri w'ubusabe.
export async function graphRequest(path, { method = 'GET', token, params = {} } = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) search.set(k, String(v));
  });
  if (token) {
    search.set('access_token', token);
    search.set('appsecret_proof', appSecretProof(token));
  }

  const url = `${GRAPH_URL}/${path.replace(/^\//, '')}`;
  const res =
    method === 'GET'
      ? await fetch(`${url}?${search.toString()}`)
      : await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: search.toString(),
        });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new FacebookApiError(data.error || { message: `HTTP ${res.status}` }, res.status);
  }
  return data;
}

// Guhindura amakosa ya Facebook mu butumwa bumvikana (Kinyarwanda).
export function describeFacebookError(err) {
  const { code } = err;
  if (code === 190) {
    return {
      kind: 'expired',
      status: 401,
      message: 'Ibimenyetso bya Facebook byarangiye cyangwa byavanyweho. Ongera uhuze paji yawe mu igenamiterere.',
    };
  }
  if ([4, 17, 32, 341, 613].includes(code)) {
    return {
      kind: 'rate_limit',
      status: 429,
      message: 'Facebook yagabanyije umubare w\'ibikorwa (rate limit). Ongera ugerageze nyuma y\'akanya.',
    };
  }
  if ([10, 200, 299].includes(code)) {
    return {
      kind: 'permission',
      status: 403,
      message: 'Paji nta burenganzira ifite bwo gutangaza kuri iyi nyandiko. Reba uburenganzira bwa porogaramu (pages_manage_engagement).',
    };
  }
  if (code === 100 || code === 33) {
    return {
      kind: 'invalid_post',
      status: 400,
      message: 'Facebook yanze: ID y\'inyandiko ntiyemewe, inyandiko yasibwe, cyangwa ntiri iya paji wahujwe.',
    };
  }
  if (code === 368) {
    return {
      kind: 'blocked',
      status: 403,
      message: 'Facebook yahagaritse by\'agateganyo iki gikorwa kubera amategeko y\'imikoreshereze.',
    };
  }
  return {
    kind: 'api_error',
    status: 502,
    message: `Facebook yasubije ikosa: ${err.message}`,
  };
}
