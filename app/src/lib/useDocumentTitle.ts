import { useEffect } from 'react';

const HOME_TITLE = 'Petanque21st — Full-Stack Developer';

/** Sets document.title to `<title> — Petanque21st`; an empty title restores the home title. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — Petanque21st` : HOME_TITLE;
    return () => {
      document.title = HOME_TITLE;
    };
  }, [title]);
}
