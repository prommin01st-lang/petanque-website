import { useState } from 'react';
import { useI18n } from '@/i18n/I18nContext';

interface RecoveryCodesProps {
  codes: string[];
  onContinue: () => void;
}

export default function RecoveryCodes({ codes, onContinue }: RecoveryCodesProps) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const text = codes.join('\n') + '\n';

  function copy() {
    if (!navigator.clipboard?.writeText) {
      setCopyState('failed');
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => setCopyState('copied'))
      .catch(() => setCopyState('failed'));
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-sm text-text-dim m-0">{t.admin.login.codesHint}</p>
      <ul className="grid grid-cols-2 gap-2 m-0 p-0 list-none">
        {codes.map((c) => (
          <li key={c}>
            <code className="block border border-hud-border px-2 py-1 text-center text-warn">{c}</code>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3 text-sm">
        <button type="button" onClick={copy} className="text-link hover:underline">
          [{t.admin.login.copy}]
        </button>
        <button type="button" onClick={download} className="text-link hover:underline">
          [{t.admin.login.download}]
        </button>
        {copyState !== 'idle' && (
          <span role="status" className={copyState === 'copied' ? 'text-ansi-bright-green' : 'text-danger'}>
            {copyState === 'copied' ? t.admin.login.copied : t.admin.login.copyFailed}
          </span>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        {t.admin.login.saved}
      </label>
      <button type="button" className="btn-neon" disabled={!saved} onClick={onContinue}>
        {t.admin.login.continue}
      </button>
    </div>
  );
}
