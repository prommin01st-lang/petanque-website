import { useI18n } from '@/i18n/I18nContext';
import { AsciiDivider, Prompt } from '@/components/term';

export default function Footer() {
  const { t } = useI18n();

  const socials = [
    { key: 'github', label: t.footer.github, href: 'https://github.com/prommin01st-lang', external: true },
    { key: 'linkedin', label: t.footer.linkedin, href: 'https://linkedin.com/in/prommin-l', external: true },
    { key: 'rss', label: t.footer.rss, href: '/rss.xml', external: false },
  ];

  return (
    <footer
      className="relative z-10 pointer-events-auto px-4 sm:px-6 md:px-10 pt-6 pb-8 font-mono"
      style={{
        backgroundColor: 'rgba(12, 12, 12, 0.88)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div className="max-w-6xl mx-auto">
        <AsciiDivider char="=" />

        <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Prompt command="exit" />
          <ul className="list-none p-0 m-0 flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
            {socials.map((s) => (
              <li key={s.key}>
                <a
                  href={s.href}
                  className="link-neon"
                  {...(s.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {`[ ${s.label} ]`}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:justify-between gap-2 text-[12px] text-text-dim">
          <span>
            © {new Date().getFullYear()} {t.footer.copyright} <span className="text-hud-border">·</span> {t.footer.subtitle}
          </span>
          <span>
            {t.footer.builtWith} <span className="text-ansi-bright-magenta">Go</span> &amp;{' '}
            <span className="text-ansi-bright-blue">React</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
