export type UrlClass = { kind: 'internal'; path: string } | { kind: 'external'; url: string } | { kind: 'reject' };

// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x1f\x7f]/;
// eslint-disable-next-line no-control-regex
const CONTROL_ALL = /[\x00-\x1f\x7f]/g;

/**
 * The single gate for every URL the shell opens, navigates to or prints as an OSC-8 link.
 * Internal: a same-site path (`/…`, never `//…` or `/\…`). External: absolute http(s) only.
 * Everything else — javascript:, data:, mailto:, protocol-relative, malformed, control chars — is rejected.
 */
export function classifyUrl(raw: string): UrlClass {
  if (typeof raw !== 'string' || raw === '' || CONTROL.test(raw)) return { kind: 'reject' };
  if (raw.startsWith('/')) {
    if (raw[1] === '/' || raw[1] === '\\') return { kind: 'reject' };
    return { kind: 'internal', path: raw };
  }
  if (!/^https?:\/\//i.test(raw)) return { kind: 'reject' };
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { kind: 'reject' };
    return { kind: 'external', url: u.href };
  } catch {
    return { kind: 'reject' };
  }
}

/** Removes C0 controls and DEL, so untrusted text cannot inject or terminate escape sequences. */
export const stripControl = (s: string) => s.replace(CONTROL_ALL, '');
