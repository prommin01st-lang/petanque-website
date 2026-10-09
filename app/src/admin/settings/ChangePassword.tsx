import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TerminalWindow } from '@/components/term';
import { api, ApiError } from '@/lib/api';
import { useI18n } from '@/i18n/I18nContext';
import { errorText, toAdminError, type AdminError } from '../errors';
import Field from '../components/Field';

const MIN_LEN = 12;

type Fields = Partial<Record<'newPassword' | 'confirm', string>>;

/** Settings card: change the admin password (current password + new twice + TOTP code). */
export default function ChangePassword() {
  const { t } = useI18n();
  const s = t.admin.settings;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<Fields>({});
  const [error, setError] = useState<AdminError | null>(null);

  function reset() {
    setOpen(false);
    setCurrent('');
    setNext('');
    setConfirm('');
    setCode('');
    setFields({});
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const f: Fields = {};
    if (next.length < MIN_LEN) f.newPassword = s.passwordTooShort;
    else if (next === current) f.newPassword = s.passwordSame;
    else if (next !== confirm) f.confirm = s.passwordMismatch;
    setFields(f);
    if (Object.keys(f).length > 0) return;
    setBusy(true);
    try {
      await api.auth.changePassword({ currentPassword: current, newPassword: next, code: code.trim() });
      toast.success(s.passwordChanged);
      void qc.invalidateQueries({ queryKey: ['admin', 'sessions'] });
      reset();
    } catch (err) {
      setCode('');
      if (err instanceof ApiError && err.fields.newPassword) setFields({ newPassword: err.fields.newPassword });
      else setError(toAdminError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <TerminalWindow title={s.password} user="admin">
      {open ? (
        <form onSubmit={(e) => void submit(e)} className="flex max-w-md flex-col gap-3 text-sm" noValidate>
          <p className="m-0 font-body text-text-dim">{s.passwordHint}</p>
          <Field label={s.currentPassword}>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" autoFocus className="input-hud" />
          </Field>
          <Field label={s.newPassword} error={fields.newPassword}>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" className="input-hud" />
          </Field>
          <Field label={s.confirmPassword} error={fields.confirm}>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className="input-hud" />
          </Field>
          <Field label={s.codeLabel}>
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" className="input-hud w-32" />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy || !current || !next || !code.trim()} className="text-ansi-bright-green hover:underline disabled:text-text-dim">
              [{busy ? s.working : s.confirm}]
            </button>
            <button type="button" onClick={reset} className="text-text-dim hover:underline">[{s.cancel}]</button>
          </div>
          {error && <p role="alert" className="m-0 text-danger">ERR: {errorText(error, t)}</p>}
        </form>
      ) : (
        <button type="button" className="text-sm text-link hover:underline" onClick={() => setOpen(true)}>[{s.changePassword}]</button>
      )}
    </TerminalWindow>
  );
}
