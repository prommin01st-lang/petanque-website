import type { Language } from '@/i18n/translations';
import type { Localized } from './types';

export function pick(l: Localized, lang: Language): string {
  return l[lang] || l.en;
}
