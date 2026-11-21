import { auth } from '@/lib/firebaseClient';

// Hamagara API za /api/* wohereza Firebase ID token kugira ngo seriveri yemeze uwo ari we.
export async function apiFetch(path, { method = 'GET', body } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Ntabwo winjiye.');
  const token = await user.getIdToken();

  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    // igisubizo kitari JSON
  }
  if (!res.ok) {
    const err = new Error(data.error || 'Habaye ikosa kuri seriveri.');
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}
