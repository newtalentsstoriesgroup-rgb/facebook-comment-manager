export const cn = (...classes) => classes.filter(Boolean).join(' ');

export function toDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(ts) {
  const d = toDate(ts);
  if (!d) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(ts) {
  const d = toDate(ts);
  if (!d) return '—';
  const seconds = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (seconds < 60) return 'ubu nyine';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `iminota ${minutes} ishize`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `amasaha ${hours} ashize`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `iminsi ${days} ishize`;
  return formatDate(ts);
}

export function sortByDateDesc(items, field = 'createdAt') {
  return [...items].sort((a, b) => {
    const da = toDate(a[field])?.getTime() || 0;
    const db = toDate(b[field])?.getTime() || 0;
    return db - da;
  });
}

export function searchItems(items, term, fields) {
  const t = (term || '').trim().toLowerCase();
  if (!t) return items;
  return items.filter((item) =>
    fields.some((f) => String(item[f] ?? '').toLowerCase().includes(t))
  );
}

export function paginate(items, page, size) {
  return items.slice((page - 1) * size, page * size);
}

export function pageCount(total, size) {
  return Math.max(1, Math.ceil(total / size));
}

// Amazina n'amabara y'imiterere y'ibitekerezo (Kinyarwanda)
export const STATUS_META = {
  draft: {
    label: 'Inyandikorugero',
    cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  pending: {
    label: 'Itegereje',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  approved: {
    label: 'Cyemejwe',
    cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  published: {
    label: 'Cyatangajwe',
    cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  rejected: {
    label: 'Cyanzwe',
    cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  },
  failed: {
    label: 'Cyananiranye',
    cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
};

export const STATUS_KEYS = Object.keys(STATUS_META);

export function countByStatus(comments) {
  const counts = { total: comments.length };
  STATUS_KEYS.forEach((s) => {
    counts[s] = 0;
  });
  comments.forEach((c) => {
    if (counts[c.status] !== undefined) counts[c.status] += 1;
  });
  return counts;
}
