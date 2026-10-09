import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { translations } from '@/i18n/translations';
import { errorText, toAdminError } from './errors';

const text = (code: string, status = 400, lang: 'en' | 'th' = 'en') =>
  errorText(toAdminError(new ApiError(status, code, `server: ${code}`)), translations[lang]);

describe('toAdminError', () => {
  it('maps csrf_failed to the session-expired message', () => {
    expect(text('csrf_failed', 403)).toBe(translations.en.admin.errors.sessionExpired);
  });

  it('maps internal to the generic error', () => {
    expect(text('internal', 500)).toBe(translations.en.common.error);
    expect(text('internal', 500, 'th')).toBe(translations.th.common.error);
  });

  it.each([
    ['too_large', 413, 'tooLarge'],
    ['totp_already_enabled', 409, 'totpAlreadyEnabled'],
    ['totp_not_set_up', 409, 'totpNotSetUp'],
    ['invalid_state', 400, 'githubFailed'],
  ] as const)('maps %s to a translated key', (code, status, key) => {
    expect(text(code, status)).toBe(translations.en.admin.errors[key]);
    expect(text(code, status, 'th')).toBe(translations.th.admin.errors[key]);
    expect(translations.th.admin.errors[key]).not.toBe(translations.en.admin.errors[key]);
  });

  it('keeps server text for unknown codes', () => {
    expect(text('something_else')).toBe('server: something_else');
  });
});
