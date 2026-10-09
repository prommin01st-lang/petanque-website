import { ApiError } from '@/lib/api';

interface ErrorLineProps {
  error: unknown;
  onRetry?: () => void;
  /** Localized strings (t.common.retry / t.common.error); English fallbacks keep the kit provider-free. */
  retryLabel?: string;
  fallbackMessage?: string;
}

export default function ErrorLine({ error, onRetry, retryLabel = 'retry', fallbackMessage = 'Something went wrong.' }: ErrorLineProps) {
  const code = error instanceof ApiError ? error.code : 'error';
  const message = error instanceof ApiError ? error.message : fallbackMessage;
  return (
    <p role="alert" className="font-mono text-sm text-danger m-0">
      <span>ERR: {code}: {message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="ml-3 text-link hover:underline">
          [{retryLabel}]
        </button>
      )}
    </p>
  );
}
