export const MAX_COMMENT_LENGTH = 8000; // Imbibi Facebook yemera
export const MAX_BULK_COMMENTS = 50;

const FB_HOST = /^(?:[a-z0-9-]+\.)*(facebook\.com|fb\.com|fb\.watch|fb\.me)$/i;

export function isValidFacebookUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return FB_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

// Ugerageza kuvana ID y'inyandiko mu ihuza rya Facebook. Iyo bidashobotse isubiza ''.
export function extractPostId(value) {
  if (!isValidFacebookUrl(value)) return '';
  try {
    const url = new URL(value.trim());
    const params = url.searchParams;
    const path = url.pathname;

    const storyFbid = params.get('story_fbid');
    if (storyFbid) {
      const pageId = params.get('id');
      return pageId ? `${pageId}_${storyFbid}` : storyFbid;
    }
    const fbid = params.get('fbid');
    if (fbid) return fbid;

    const patterns = [
      /\/posts\/([A-Za-z0-9_]+)/,
      /\/permalink\/(\d+)/,
      /\/videos\/(?:[^/]+\/)?(\d+)/,
      /\/reel\/(\d+)/,
      /\/photos\/(?:[^/]+\/)*(\d{6,})/,
      /\/activity\/(\d+)/,
    ];
    for (const re of patterns) {
      const m = path.match(re);
      if (m) return m[1];
    }
    const v = params.get('v');
    if (v && /^\d+$/.test(v)) return v;
    return '';
  } catch {
    return '';
  }
}

export function validatePost({ postUrl, title, description }) {
  const errors = {};
  if (!postUrl || !postUrl.trim()) {
    errors.postUrl = 'Andika ihuza ry\'inyandiko ya Facebook.';
  } else if (!isValidFacebookUrl(postUrl)) {
    errors.postUrl = 'Ihuza ntiryemewe. Rigomba kuba ihuza rya facebook.com.';
  } else if (postUrl.trim().length > 2048) {
    errors.postUrl = 'Ihuza ni rirerire cyane.';
  }
  if ((title || '').length > 300) errors.title = 'Umutwe ntugomba kurenza inyuguti 300.';
  if ((description || '').length > 2000)
    errors.description = 'Ibisobanuro ntibigomba kurenza inyuguti 2000.';
  return errors;
}

export function validateCommentText(text) {
  const t = (text || '').trim();
  if (!t) return 'Igitekerezo ntigishobora kuba ubusa.';
  if (t.length > MAX_COMMENT_LENGTH)
    return `Igitekerezo ntigishobora kurenza inyuguti ${MAX_COMMENT_LENGTH}.`;
  return '';
}

export function isNumericFacebookId(id) {
  return /^\d+(_\d+)?$/.test(String(id || ''));
}

export function authErrorMessage(error) {
  const code = error?.code || '';
  const map = {
    'auth/invalid-email': 'Imeri ntiyanditse neza.',
    'auth/user-not-found': 'Nta konti ifite iyi meri.',
    'auth/wrong-password': 'Ijambobanga ritari ryo.',
    'auth/invalid-credential': 'Imeri cyangwa ijambobanga ntibyo.',
    'auth/invalid-login-credentials': 'Imeri cyangwa ijambobanga ntibyo.',
    'auth/email-already-in-use': 'Iyi meri isanzwe ikoreshwa.',
    'auth/weak-password': 'Ijambobanga rigomba kuba rifite nibura inyuguti 6.',
    'auth/too-many-requests': 'Wagerageje inshuro nyinshi. Ongera ugerageze nyuma y\'akanya.',
    'auth/network-request-failed': 'Nta murongo wa interineti. Ongera ugerageze.',
    'auth/user-disabled': 'Iyi konti yahagaritswe.',
    'auth/requires-recent-login': 'Ongera winjire kugira ngo ukore ibi.',
  };
  return map[code] || 'Habaye ikosa. Ongera ugerageze.';
}
