import { useI18n } from '@/i18n/I18nContext';

export type EditLang = 'en' | 'th';

interface LangTabsProps {
  value: EditLang;
  onChange: (l: EditLang) => void;
  /** True when the TH fields are empty: the TH tab shows a `*` marker. */
  thEmpty?: boolean;
  /** Languages whose fields currently carry a server error: the tab shows a `!` marker. */
  errorLangs?: EditLang[];
}

export default function LangTabs({ value, onChange, thEmpty, errorLangs = [] }: LangTabsProps) {
  const { t } = useI18n();
  return (
    <div role="tablist" aria-label={t.admin.lang.label} className="flex gap-2 font-mono text-sm">
      {(['en', 'th'] as const).map((l) => (
        <button
          key={l}
          type="button"
          role="tab"
          aria-selected={value === l}
          onClick={() => onChange(l)}
          title={l === 'th' && thEmpty ? t.admin.lang.thMissing : undefined}
          className={value === l ? 'text-ansi-bright-cyan' : 'text-text-dim hover:text-text'}
        >
          [ {l.toUpperCase()}
          {l === 'th' && thEmpty ? '*' : ''}
          {errorLangs.includes(l) ? '!' : ''} ]
        </button>
      ))}
    </div>
  );
}
