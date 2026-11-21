// SERIVERI GUSA. Umupaka w'ibikorwa mu isaha/umunota ku mukoresha (kwirinda spam).
// Ibika mu rateLimits/{uid}; ntikora ku yindi mirima iri muri iyo document.

export async function takeRateSlot(db, uid, { field, max, windowMs }) {
  const ref = db.collection('rateLimits').doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const now = Date.now();
    const stamps = (data[field] || []).filter((t) => now - t < windowMs);
    if (stamps.length >= max) {
      const wait = Math.max(1, Math.ceil((windowMs - (now - stamps[0])) / 1000));
      return { ok: false, wait };
    }
    stamps.push(now);
    tx.set(ref, { ...data, [field]: stamps });
    return { ok: true };
  });
}
