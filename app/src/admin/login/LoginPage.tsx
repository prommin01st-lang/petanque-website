import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams, type Location } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AsciiBox, Prompt } from '@/components/term';
import { useI18n } from '@/i18n/I18nContext';
import Field from '../components/Field';
import { ME_KEY } from '../useMe';
import RecoveryCodes from './RecoveryCodes';
import TotpSetup from './TotpSetup';
import { errorText, isSessionExpired, queryError, toLoginError, type LoginError } from './errors';

/* ------------------------------------------------------------------ */
/*  Login state machine: password -> totp | recovery | setup -> codes  */
/* ------------------------------------------------------------------ */

type Step = 'password' | 'totp' | 'recovery' | 'setup' | 'codes';

/** Only return to in-app admin locations (never back to the login page itself). */
function returnPath(state: unknown): string {
  const from = (state as { from?: Location } | null)?.from;
  if (!from || typeof from.pathname !== 'string') return '/admin';
  if (!from.pathname.startsWith('/admin') || from.pathname.startsWith('/admin/login')) return '/admin';
  return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`;
}

export default function LoginPage() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('password');
  const [error, setError] = useState<LoginError | null>(null);
  // Error passed back by the GitHub OAuth callback (?error=…); shown next to the GitHub button.
  const [githubError, setGithubError] = useState<LoginError | null>(() => queryError(params.get('error')));
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const providers = useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: () => api.auth.providers(),
    retry: false,
    staleTime: Infinity,
  });

  const stepTitle: Record<Step, string> = {
    password: t.admin.login.title,
    totp: t.admin.login.totpTitle,
    recovery: t.admin.login.recoveryTitle,
    setup: t.admin.login.setupTitle,
    codes: t.admin.login.codesTitle,
  };

  useEffect(() => {
    document.title = 'admin — login';
  }, []);

  function goto(next: Step, err: LoginError | null = null) {
    setStep(next);
    setError(err);
    setCode('');
  }

  const expired = useCallback(() => {
    setStep('password');
    setPassword('');
    setCode('');
    setError({ key: 'sessionExpired' });
  }, []);

  async function finish(to: string) {
    await queryClient.invalidateQueries({ queryKey: ME_KEY });
    navigate(to, { replace: true });
  }

  async function run(action: () => Promise<void>, onFail?: () => void) {
    setBusy(true);
    setError(null);
    setGithubError(null);
    try {
      await action();
    } catch (err) {
      if (step !== 'password' && isSessionExpired(err)) {
        expired();
      } else {
        setError(toLoginError(err));
        onFail?.();
      }
    } finally {
      setBusy(false);
    }
  }

  function submitPassword(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      const res = await api.auth.login(username, password);
      setPassword('');
      goto(res.next === 'totp_setup' ? 'setup' : 'totp');
    });
  }

  function submitTotp(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      await api.auth.totpVerify(code);
      await finish(returnPath(location.state));
    }, () => setCode(''));
  }

  function submitRecovery(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      await api.auth.recovery(code.trim());
      await finish(returnPath(location.state));
    }, () => setCode(''));
  }

  const onSetupVerified = useCallback((codes: string[]) => {
    if (codes.length === 0) {
      void queryClient.invalidateQueries({ queryKey: ME_KEY }).then(() => navigate('/admin', { replace: true }));
      return;
    }
    setRecoveryCodes(codes);
    setStep('codes');
  }, [navigate, queryClient]);

  const errText = error ? errorText(error, t) : null;
  const codeField = (label: string, otp: boolean) => (
    <Field label={label} error={errText}>
      <input
        className={`input-hud ${otp ? 'tracking-[0.3em]' : ''}`}
        value={code}
        onChange={(e) => setCode(otp ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)}
        {...(otp
          ? { inputMode: 'numeric' as const, autoComplete: 'one-time-code', pattern: '\\d{6}', maxLength: 6 }
          : { autoComplete: 'off', spellCheck: false, autoCapitalize: 'none' })}
        required
        autoFocus
      />
    </Field>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-4 py-10 font-mono">
      <div className="w-full max-w-md flex items-center justify-between gap-3">
        <Prompt user="admin" path="~/admin/login" />
        <span className="flex items-center gap-1 text-xs" role="group" aria-label={t.admin.language}>
          {(['en', 'th'] as const).map((l, i) => (
            <span key={l} className="flex items-center gap-1">
              {i > 0 && <span className="text-text-dim">|</span>}
              <button
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={lang === l ? 'text-ansi-bright-cyan' : 'text-text-dim hover:text-text'}
              >
                {l.toUpperCase()}
              </button>
            </span>
          ))}
        </span>
      </div>

      <AsciiBox title={stepTitle[step]} as="section" className="w-full max-w-md">
        {step === 'password' && (
          <form onSubmit={submitPassword} className="flex flex-col gap-3">
            <Field label={t.admin.login.username}>
              <input
                className="input-hud"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                autoFocus
              />
            </Field>
            <Field label={t.admin.login.password}>
              <input
                className="input-hud"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            {errText && (
              <p role="alert" className="font-mono text-xs text-danger m-0">
                ERR: {errText}
              </p>
            )}
            <button type="submit" className="btn-neon" disabled={busy}>
              {t.admin.login.submit}
            </button>
            {!providers.isPending && (githubError || providers.data?.github) && (
              <div className="flex flex-col gap-3">
                {providers.data?.github && (
                  <p className="text-center text-xs text-text-dim m-0">— {t.admin.login.or} —</p>
                )}
                {githubError && (
                  <p role="alert" className="font-mono text-xs text-danger m-0">
                    ERR: {errorText(githubError, t)}
                  </p>
                )}
                {providers.data?.github && (
                  <a href="/api/auth/github/start?mode=login" className="btn-neon-outline text-center">
                    {t.admin.login.github}
                  </a>
                )}
              </div>
            )}
          </form>
        )}

        {step === 'totp' && (
          <form onSubmit={submitTotp} className="flex flex-col gap-3">
            <p className="font-body text-sm text-text-dim m-0">{t.admin.login.totpHint}</p>
            {codeField(t.admin.login.code, true)}
            <button type="submit" className="btn-neon" disabled={busy}>
              {t.admin.login.verify}
            </button>
            <button type="button" className="text-sm text-link hover:underline self-start" onClick={() => goto('recovery')}>
              [{t.admin.login.useRecovery}]
            </button>
          </form>
        )}

        {step === 'recovery' && (
          <form onSubmit={submitRecovery} className="flex flex-col gap-3">
            <p className="font-body text-sm text-text-dim m-0">{t.admin.login.recoveryHint}</p>
            {codeField(t.admin.login.recoveryCode, false)}
            <button type="submit" className="btn-neon" disabled={busy}>
              {t.admin.login.verify}
            </button>
            <button type="button" className="text-sm text-link hover:underline self-start" onClick={() => goto('totp')}>
              [{t.admin.login.useTotp}]
            </button>
          </form>
        )}

        {step === 'setup' && <TotpSetup onVerified={onSetupVerified} onExpired={expired} />}

        {step === 'codes' && (
          <RecoveryCodes codes={recoveryCodes} onContinue={() => void finish('/admin')} />
        )}
      </AsciiBox>
    </div>
  );
}
