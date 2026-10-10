import { useEffect } from 'react';
import { useI18n } from '@/i18n/I18nContext';

/** Sets document.title to `<title> — Petanque21st`; an empty title restores the home title. */
export function useDocumentTitle(title: string) {
  const { t } = useI18n();
  const homeTitle = t.seo.homeTitle;
  useEffect(() => {
    document.title = title ? `${title} — Petanque21st` : homeTitle;
    return () => {
      document.title = homeTitle;
    };
  }, [title, homeTitle]);
}
