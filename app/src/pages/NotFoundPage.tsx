import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { AsciiBox, Prompt } from '@/components/term';

export function NotFoundContent() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  return (
    <section className="min-h-[100dvh] flex items-center justify-center px-4 sm:px-6 pt-16 pointer-events-none">
      <AsciiBox title={t.notFound.title} className="max-w-xl w-full">
        <div className="px-1 py-2 md:px-3 font-mono space-y-2 break-all">
          <Prompt command={pathname} />
          <h1 className="text-danger text-base font-normal break-all">
            bash: {pathname}: {t.notFound.body}
          </h1>
          <Link to="/" className="link-neon inline-block mt-4">
            <span className="text-ansi-bright-green">$</span> {t.notFound.home}
          </Link>
        </div>
      </AsciiBox>
    </section>
  );
}

export default function NotFoundPage() {
  return <NotFoundContent />;
}
