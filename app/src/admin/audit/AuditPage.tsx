import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ErrorLine, LoadingBar } from '@/components/term';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/I18nContext';
import { fmtTime } from '../time';

export default function AuditPage() {
  const { t } = useI18n();
  const a = t.admin.audit;
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['admin', 'audit', page], queryFn: () => api.admin.audit(page), placeholderData: (prev) => prev });
  const lastPage = q.data ? Math.max(1, Math.ceil(q.data.total / q.data.perPage)) : 1;

  return (
    <div className="flex flex-col gap-4 font-mono">
      <h1 className="m-0 text-lg text-ansi-bright-cyan">{a.title}</h1>
      {q.isPending && <LoadingBar label={t.common.loading} />}
      {q.isError && <ErrorLine error={q.error} onRetry={() => void q.refetch()} retryLabel={t.common.retry} fallbackMessage={t.common.error} />}
      {q.data && (q.data.items.length === 0 ? (
        <p className="m-0 text-sm text-text-dim">{a.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="text-text-dim">
                {(['time', 'action', 'entity', 'id', 'ip'] as const).map((c) => (
                  <th key={c} scope="col" className="whitespace-nowrap px-2 py-1 font-normal">{a.cols[c]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.data.items.map((e) => (
                <tr key={e.id} className="border-t border-hud-border">
                  <td className="whitespace-nowrap px-2 py-1 text-text-dim">{fmtTime(e.createdAt)}</td>
                  <td className="px-2 py-1 text-ansi-bright-green">{e.action}</td>
                  <td className="px-2 py-1">{e.entity}</td>
                  <td className="px-2 py-1">{e.entityId}</td>
                  <td className="px-2 py-1 text-text-dim">{e.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <div className="flex items-center gap-4 text-sm">
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="text-link hover:underline disabled:text-text-dim disabled:no-underline">
          [{a.prev}]
        </button>
        <span className="text-text-dim">{a.page} {page}/{lastPage}</span>
        <button type="button" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} className="text-link hover:underline disabled:text-text-dim disabled:no-underline">
          [{a.next}]
        </button>
      </div>
    </div>
  );
}
