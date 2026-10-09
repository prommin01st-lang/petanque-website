import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { api } from '@/lib/api';
import { ErrorLine, LoadingBar } from '@/components/term';
import { useI18n } from '@/i18n/I18nContext';
import Field from '../components/Field';
import { errorText, isSessionExpired, toLoginError, type LoginError } from './errors';

interface TotpSetupProps {
  onVerified: (recoveryCodes: string[]) => void;
  /** Called when the password-stage session has expired; the user must log in again. */
  onExpired: () => void;
}

function groupSecret(secret: string): string {
  return (secret.match(/.{1,4}/g) ?? []).join(' ');
}

export default function TotpSetup({ onVerified, onExpired }: TotpSetupProps) {
  const { t } = useI18n();
  const setup = useQuery({
    queryKey: ['admin', 'totp-setup'],
    queryFn: () => api.auth.totpSetup(),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<LoginError | null>(null);
  const [busy, setBusy] = useState(false);

  const otpauthUrl = setup.data?.otpauthUrl;
  useEffect(() => {
    if (!otpauthUrl) return;
    let cancelled = false;
    QRCode.toDataURL(otpauthUrl, { margin: 1, width: 200 })
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [otpauthUrl]);

  const setupError = setup.error;
  useEffect(() => {
    if (isSessionExpired(setupError)) onExpired();
  }, [setupError, onExpired]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.auth.totpVerify(code);
      onVerified(res.recoveryCodes ?? []);
    } catch (err) {
      if (isSessionExpired(err)) return onExpired();
      setError(toLoginError(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  if (setup.isPending) return <LoadingBar label={t.common.loading} />;
  if (setup.isError) {
    return (
      <ErrorLine error={setup.error} onRetry={() => void setup.refetch()} retryLabel={t.common.retry} fallbackMessage={t.common.error} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-sm text-text-dim m-0">{t.admin.login.setupHint}</p>
      <div className="flex justify-center">
        {qr ? (
          <img src={qr} alt={t.admin.login.qrAlt} width={200} height={200} className="bg-white p-1" />
        ) : (
          <div className="w-[200px] h-[200px] border border-hud-border" aria-hidden="true" />
        )}
      </div>
      <p className="m-0 text-sm">
        <span className="text-text-dim">{t.admin.login.secret}: </span>
        <code data-testid="totp-secret" className="text-warn break-all select-all">
          {groupSecret(setup.data.secret)}
        </code>
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label={t.admin.login.code} error={error ? errorText(error, t) : null}>
          <input
            className="input-hud tracking-[0.3em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
          />
        </Field>
        <button type="submit" className="btn-neon" disabled={busy}>
          {t.admin.login.verify}
        </button>
      </form>
    </div>
  );
}
