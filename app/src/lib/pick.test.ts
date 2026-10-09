import { pick } from './pick';

describe('pick', () => {
  it('returns the requested language', () => {
    expect(pick({ en: 'Hello', th: 'สวัสดี' }, 'th')).toBe('สวัสดี');
  });
  it('falls back to English when Thai is empty', () => {
    expect(pick({ en: 'Hello', th: '' }, 'th')).toBe('Hello');
  });
});
