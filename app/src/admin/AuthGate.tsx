import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorLine, LoadingBar } from '@/components/term';
import { useI18n } from '@/i18n/I18nContext';
import useMe from './useMe';

export default function AuthGate() {
  const { t } = useI18n();
  const location = useLocation();
  const me = useMe();

  if (me.isPending) {
    return (
      <div className="p-6">
        <LoadingBar label={t.common.loading} />
      </div>
    );
  }
  if (me.isError) {
    if (me.error.status === 401) return <Navigate to="/admin/login" replace state={{ from: location }} />;
    return (
      <div className="p-6">
        <ErrorLine error={me.error} onRetry={() => void me.refetch()} retryLabel={t.common.retry} fallbackMessage={t.common.error} />
      </div>
    );
  }
  return <Outlet />;
}
