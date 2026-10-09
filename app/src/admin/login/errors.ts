import { ApiError } from '@/lib/api';

/* ------------------------------------------------------------------ */
/*  Login error mapping — stores keys (not strings) so text follows    */
/*  the current language.                                              */
/* ------------------------------------------------------------------ */

import { BY_CODE, errorText, toAdminError, type AdminError, type AdminErrorKey } from '../errors';

export type LoginErrorKey = AdminErrorKey;
export type LoginError = AdminError;
export { errorText };
export const toLoginError = toAdminError;

/** Maps a `?error=` query value from the GitHub callback to a known error, or null. */
export function queryError(value: string | null): LoginError | null {
  if (value === 'github_not_linked' || value === 'github_failed') return { key: BY_CODE[value] };
  return null;
}

/** True when the password-stage session is gone (expired) and the user must start over. */
export function isSessionExpired(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401 && err.code === 'unauthorized';
}
