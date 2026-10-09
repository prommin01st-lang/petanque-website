import { useEffect } from 'react';

const HOME_TITLE = 'Prommin L. — Full-Stack Developer';

/** Sets document.title to `<title> — Prommin L.`; an empty title restores the home title. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — Prommin L.` : HOME_TITLE;
    return () => {
      document.title = HOME_TITLE;
    };
  }, [title]);
}
