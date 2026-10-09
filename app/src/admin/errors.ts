import { ApiError } from '@/lib/api';
import type { Translations } from '@/i18n/translations';

export type AdminErrorKey = keyof Translations['admin']['errors'];
export type AdminError = { key: AdminErrorKey } | { text: string } | { generic: true };

export const BY_CODE: Record<string, AdminErrorKey> = {
  invalid_credentials: 'invalidCredentials',
  invalid_code: 'invalidCode',
  rate_limited: 'rateLimited',
  unauthorized: 'sessionExpired',
  github_not_linked: 'githubNotLinked',
  github_failed: 'githubFailed',
  github_in_use: 'githubInUse',
  csrf_failed: 'sessionExpired',
  too_large: 'tooLarge',
  totp_already_enabled: 'totpAlreadyEnabled',
  totp_not_set_up: 'totpNotSetUp',
  invalid_state: 'githubFailed',
};

/** Stores keys (not strings) so text follows the current language. */
export function toAdminError(err: unknown): AdminError {
  if (!(err instanceof ApiError)) return { generic: true };
  if (err.status === 429) return { key: 'rateLimited' };
  if (err.status === 0) return { key: 'network' };
  if (err.code === 'internal') return { generic: true };
  const key = BY_CODE[err.code];
  return key ? { key } : { text: err.message };
}

export function errorText(e: AdminError, t: Translations): string {
  if ('key' in e) return t.admin.errors[e.key];
  if ('text' in e) return e.text;
  return t.common.error;
}

/**
 * Maps a server validation/conflict error onto form fields. Returns true when handled
 * (field errors were set). Extends the code → message mapping in the toAdminError mapping above.
 * Lives outside Field.tsx because a non-component export there breaks react-refresh lint.
 */
export function applyServerErrors(
  err: unknown,
  setErrors: (f: Record<string, string>) => void,
  t: Translations,
): boolean {
  if (!(err instanceof ApiError)) return false;
  if (err.code === 'slug_taken') {
    setErrors({ slug: t.admin.errors.slugTaken });
    return true;
  }
  if (err.fields && Object.keys(err.fields).length > 0) {
    setErrors(err.fields);
    return true;
  }
  return false;
}
