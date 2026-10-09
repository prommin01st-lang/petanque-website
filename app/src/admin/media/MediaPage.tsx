import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ErrorLine, LoadingBar } from '@/components/term';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { api } from '@/lib/api';
import type { MediaItem } from '@/lib/types';
import { useI18n } from '@/i18n/I18nContext';
import { errorText, toAdminError } from '@/admin/errors';
import { mediaMarkdown } from './markdown';
import { ACCEPT, useUpload } from './useUpload';

const KEY = ['admin', 'media'];

function kb(n: number) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

export default function MediaPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const m = t.admin.media;
  const q = useQuery({ queryKey: KEY, queryFn: api.admin.media });
  const { uploadFiles, uploading } = useUpload();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [target, setTarget] = useState<MediaItem | null>(null);

  const del = useMutation({
    mutationFn: (id: number) => api.admin.deleteMedia(id),
    onSuccess: () => {
      toast.success(m.deleted);
      void qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (err) => {
      const e = toAdminError(err);
      toast.error(`${m.deleteFailed}: ${errorText(e, t)}`);
    },
  });

  function pick(list: FileList | null) {
    if (list && list.length > 0) void uploadFiles(Array.from(list));
    if (input.current) input.current.value = '';
  }

  async function copy(item: MediaItem) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('no clipboard');
      await navigator.clipboard.writeText(mediaMarkdown(item));
      toast.success(m.copied);
    } catch {
      toast.error(m.copyFailed);
    }
  }

  return (
    <div className="flex flex-col gap-4 font-mono">
      <h1 className="m-0 text-lg text-ansi-bright-cyan">{m.title}</h1>
      <div
        data-testid="dropzone"
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setOver(false);
        }}
        onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
        className={`flex flex-col items-center gap-1 border border-dashed p-6 text-sm ${over ? 'border-ansi-bright-cyan text-ansi-bright-cyan' : 'border-hud-border text-text-dim'}`}
      >
        <p className="m-0">
          {uploading ? m.uploading : m.drop}{' '}
          {!uploading && (
            <button type="button" className="link-neon" onClick={() => input.current?.click()}>{m.choose}</button>
          )}
        </p>
        <p className="m-0 text-xs">{m.hint}</p>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT}
          aria-label={m.choose}
          className="hidden"
          disabled={uploading}
          onChange={(e) => pick(e.target.files)}
        />
      </div>

      {q.isPending && <LoadingBar label={t.common.loading} />}
      {q.isError && (
        <ErrorLine error={q.error} onRetry={() => q.refetch()} retryLabel={t.common.retry} fallbackMessage={t.common.error} />
      )}
      {q.data && q.data.items.length === 0 && <p className="text-sm text-text-dim">{m.empty}</p>}
      {q.data && q.data.items.length > 0 && (
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-4">
          {q.data.items.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 border border-hud-border p-2 text-xs">
              <img src={item.url} alt={item.originalName} loading="lazy" className="aspect-square w-full bg-surface object-contain" />
              <span className="truncate" title={item.filename}>{item.filename}</span>
              <span className="text-text-dim">{item.width}×{item.height} · {kb(item.size)}</span>
              <div className="flex justify-between">
                <button type="button" className="link-neon" onClick={() => void copy(item)}>{m.copyMd}</button>
                <button type="button" className="text-danger" onClick={() => setTarget(item)}>{m.delete}</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent className="bg-surface border-hud-border font-mono">
          <AlertDialogHeader>
            <AlertDialogTitle>{m.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.deleteBody} <code className="text-ansi-bright-cyan">{target?.filename}</code>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => target && del.mutate(target.id)}>{m.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
