import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { TerminalWindow, ErrorLine, LoadingBar } from '@/components/term';
import { api, ApiError, setCsrfToken } from '@/lib/api';
import { useI18n } from '@/i18n/I18nContext';
import { errorText, toAdminError, BY_CODE } from '../errors';
import RecoveryCodes from '../login/RecoveryCodes';
import { fmtTime } from '../time';
import { clearDrafts } from '../posts/useAutosave';
import useMe from '../useMe';
import ChangePassword from './ChangePassword';

/* ------------------------------------------------------------------ */
/*  OAuth redirect guard                                               */
/* ------------------------------------------------------------------ */

/** Only follow an http(s) authorize URL (plain http only in dev); anything else throws → generic error. */
function safeRedirect(url: string): string {
  const { protocol } = new URL(url);
  if (protocol === 'https:' || (import.meta.env.DEV && protocol === 'http:')) return url;
  throw new Error(`refusing to redirect to ${protocol} URL`);
}

/* ------------------------------------------------------------------ */
/*  Inline TOTP step-up prompt                                         */
/* ------------------------------------------------------------------ */

interface StepUpProps {
  hint: string;
  onSubmit: (code: string) => Promise<void>;
  onCancel: () => void;
}

function StepUp({ hint, onSubmit, onCancel }: StepUpProps) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReturnType<typeof toAdminError> | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(code.trim());
    } catch (err) {
      setError(toAdminError(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2 text-sm">
      <p className="m-0 font-body text-text-dim">{hint}</p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-text-dim">{t.admin.settings.codeLabel}</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            className="input-hud w-32"
          />
        </label>
        <button type="submit" disabled={busy || !code.trim()} className="text-ansi-bright-green hover:underline disabled:text-text-dim">
          [{busy ? t.admin.settings.working : t.admin.settings.confirm}]
        </button>
        <button type="button" onClick={onCancel} className="text-text-dim hover:underline">
          [{t.admin.settings.cancel}]
        </button>
      </div>
      {error && <p role="alert" className="m-0 text-danger">ERR: {errorText(error, t)}</p>}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

type Prompt = 'regenerate' | 'link' | 'unlink' | null;

export default function SettingsPage() {
  const { t } = useI18n();
  const s = t.admin.settings;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: me } = useMe();
  const providers = useQuery({ queryKey: ['providers'], queryFn: api.auth.providers });
  const sessions = useQuery({ queryKey: ['admin', 'sessions'], queryFn: api.auth.sessions });
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [logoutFailed, setLogoutFailed] = useState(false);

  // GitHub callback feedback: show once, then strip the query string.
  const handled = useRef(false);
  useEffect(() => {
    if (handled.current) return;
    const error = params.get('error');
    const linked = params.get('linked');
    if (!error && !linked) return;
    handled.current = true;
    if (linked === '1') toast.success(s.linked);
    const key = error ? BY_CODE[error] : undefined;
    if (error) toast.error(key ? t.admin.errors[key] : t.common.error);
    navigate('/admin/settings', { replace: true });
  }, [params, navigate, s.linked, t]);

  const revoke = useMutation({
    mutationFn: (id: string) => api.auth.revokeSession(id),
    onSuccess: () => {
      toast.success(s.revoked);
      void qc.invalidateQueries({ queryKey: ['admin', 'sessions'] });
    },
    onError: (err) => toast.error(`${s.revokeFailed}: ${errorText(toAdminError(err), t)}`),
  });

  async function logoutEverywhere() {
    setLogoutFailed(false);
    try {
      await api.auth.logoutAll();
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) {
        setLogoutFailed(true);
        return;
      }
    }
    setCsrfToken(null);
    clearDrafts();
    qc.clear();
    navigate('/admin/login', { replace: true });
  }

  async function regenerate(code: string) {
    const res = await api.auth.regenerateRecovery(code);
    setPrompt(null);
    setCodes(res.recoveryCodes);
  }

  async function link(code: string) {
    const res = await api.auth.linkGitHub(code);
    window.location.assign(safeRedirect(res.url));
  }

  async function unlink(code: string) {
    await api.auth.unlinkGitHub(code);
    setPrompt(null);
    toast.success(s.unlinked);
    await qc.invalidateQueries({ queryKey: ['me'] });
  }

  const btn = 'text-link hover:underline';

  return (
    <div className="flex flex-col gap-6 font-mono">
      <h1 className="m-0 text-lg text-ansi-bright-cyan">{s.title}</h1>

      <TerminalWindow title={s.account} user="admin">
        {me && (
          <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-text-dim">{s.username}</dt>
            <dd className="m-0">{me.username}</dd>
            <dt className="text-text-dim">{s.authMethod}</dt>
            <dd className="m-0">{t.admin.method[me.authMethod]}</dd>
          </dl>
        )}
      </TerminalWindow>

      <ChangePassword />

      <TerminalWindow title={s.twoFactor} user="admin">
        <div className="flex flex-col gap-3 text-sm">
          <p className="m-0">
            {me?.totpEnabled ? <span className="text-ansi-bright-green">✓ {s.enabled}</span> : <span className="text-text-dim">{s.disabled}</span>}
          </p>
          {codes ? (
            <div className="flex flex-col gap-2">
              <p className="m-0 text-ansi-bright-cyan">{s.newCodes}</p>
              <RecoveryCodes codes={codes} onContinue={() => setCodes(null)} />
            </div>
          ) : prompt === 'regenerate' ? (
            <StepUp hint={s.regenerateHint} onSubmit={regenerate} onCancel={() => setPrompt(null)} />
          ) : (
            <div>
              <button type="button" className={btn} onClick={() => setPrompt('regenerate')}>[{s.regenerate}]</button>
            </div>
          )}
        </div>
      </TerminalWindow>

      {providers.data?.github && me && (
        <TerminalWindow title={s.github} user="admin">
          <div className="flex flex-col gap-3 text-sm">
            {me.githubLogin ? (
              <>
                <p className="m-0">{s.linkedAs} <span className="text-ansi-bright-green">@{me.githubLogin}</span></p>
                {prompt === 'unlink' ? (
                  <StepUp hint={s.unlinkHint} onSubmit={unlink} onCancel={() => setPrompt(null)} />
                ) : (
                  <div><button type="button" className="text-danger hover:underline" onClick={() => setPrompt('unlink')}>[{s.unlink}]</button></div>
                )}
              </>
            ) : (
              <>
                <p className="m-0 text-text-dim">{s.notLinked}</p>
                {prompt === 'link' ? (
                  <StepUp hint={s.linkHint} onSubmit={link} onCancel={() => setPrompt(null)} />
                ) : (
                  <div><button type="button" className={btn} onClick={() => setPrompt('link')}>[{s.link}]</button></div>
                )}
              </>
            )}
          </div>
        </TerminalWindow>
      )}

      <TerminalWindow title={s.sessions} user="admin">
        <div className="flex flex-col gap-3 text-sm">
          {sessions.isPending && <LoadingBar label={t.common.loading} />}
          {sessions.isError && (
            <ErrorLine error={sessions.error} onRetry={() => void sessions.refetch()} retryLabel={t.common.retry} fallbackMessage={t.common.error} />
          )}
          {sessions.data && (sessions.data.items.length === 0 ? (
            <p className="m-0 text-text-dim">{s.noSessions}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="text-text-dim">
                    <th scope="col" className="w-4 px-2 py-1 font-normal"><span className="sr-only">{s.current}</span></th>
                    {(['ip', 'agent', 'method', 'created', 'expires'] as const).map((c) => (
                      <th key={c} scope="col" className="whitespace-nowrap px-2 py-1 font-normal">{s.cols[c]}</th>
                    ))}
                    <th scope="col" className="px-2 py-1"><span className="sr-only">{s.revoke}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.data.items.map((x) => (
                    <tr key={x.id} className="border-t border-hud-border">
                      <td className="px-2 py-1 text-ansi-bright-green" title={x.current ? s.current : undefined}>{x.current ? '*' : ''}</td>
                      <td className="whitespace-nowrap px-2 py-1">{x.ip}</td>
                      <td className="max-w-[16rem] truncate px-2 py-1 text-text-dim" title={x.userAgent}>{x.userAgent}</td>
                      <td className="px-2 py-1">{x.authMethod}</td>
                      <td className="whitespace-nowrap px-2 py-1 text-text-dim">{fmtTime(x.createdAt)}</td>
                      <td className="whitespace-nowrap px-2 py-1 text-text-dim">{fmtTime(x.expiresAt)}</td>
                      <td className="px-2 py-1">
                        {!x.current && (
                          <button type="button" className="text-danger hover:underline disabled:text-text-dim" disabled={revoke.isPending} onClick={() => revoke.mutate(x.id)}>
                            [{s.revoke}]
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <div>
            <button type="button" className="text-danger hover:underline" onClick={() => void logoutEverywhere()}>[{s.logoutAll}]</button>
          </div>
          {logoutFailed && <p role="alert" className="m-0 text-danger">ERR: {s.logoutAllFailed}</p>}
        </div>
      </TerminalWindow>
    </div>
  );
}
