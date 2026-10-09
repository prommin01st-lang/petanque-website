/** Server timestamps are fixed-width UTC ISO strings; show them as "YYYY-MM-DD HH:MM:SS". */
export function fmtTime(iso: string): string {
  return iso ? iso.replace('T', ' ').slice(0, 19) : '';
}

/** Locale-aware date + time for display (Thai uses the th-TH locale). */
export function fmtLocal(iso: string, lang: 'en' | 'th'): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}
