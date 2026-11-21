// SERIVERI GUSA. Ifasha gufata paji ya Facebook ikora y'umukoresha no kubaka ID y'inyandiko.
import { decrypt } from '@/lib/server/crypto';

export async function getActivePage(db, uid) {
  const [tokensSnap, accountSnap] = await Promise.all([
    db.collection('facebookTokens').doc(uid).get(),
    db.collection('facebookAccounts').doc(uid).get(),
  ]);
  const active = tokensSnap.exists ? tokensSnap.data().activePage : null;
  if (!active || !accountSnap.exists) {
    return {
      error: { status: 400, body: { error: 'Banza uhuze paji ya Facebook mu igenamiterere.', code: 'not_connected' } },
    };
  }
  if (accountSnap.data().connectionStatus !== 'connected') {
    return {
      error: {
        status: 401,
        body: { error: 'Ihuza rya Facebook ryarangiye. Ongera uryubake mu igenamiterere.', code: 'expired' },
      },
    };
  }
  return { pageId: active.id, pageName: active.name, token: decrypt(active.token), accountRef: accountSnap.ref };
}

// Facebook ikeneye ID nka "PAGEID_POSTID".
export function buildTarget(rawPostId, pageId) {
  const id = String(rawPostId || '').trim();
  if (!/^\d+(_\d+)?$/.test(id)) {
    return {
      error:
        "ID y'inyandiko ntiyemewe. Hindura inyandiko ushyiremo ID y'imibare (urugero 1234567890 cyangwa PAGEID_POSTID).",
    };
  }
  if (id.includes('_')) {
    if (id.split('_')[0] !== pageId) {
      return { error: 'Iyi nyandiko ntiri iya paji wahujwe.' };
    }
    return { target: id };
  }
  return { target: `${pageId}_${id}` };
}

export const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';
