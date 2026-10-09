import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { upload } from '@/lib/api';
import type { MediaItem } from '@/lib/types';
import { useI18n } from '@/i18n/I18nContext';
import { errorText, toAdminError } from '@/admin/errors';

export const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';
const TYPES = ACCEPT.split(',');
export const MAX_BYTES = 5 * 1024 * 1024;

/** Validates client-side, uploads sequentially, refreshes the media list. Failed files are skipped. */
export function useUpload() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const inFlight = useRef(0);

  const uploadFiles = useCallback(
    async (files: File[]): Promise<MediaItem[]> => {
      const m = t.admin.media;
      const done: MediaItem[] = [];
      inFlight.current += 1;
      setUploading(true);
      try {
        for (const f of files) {
          if (!TYPES.includes(f.type)) {
            toast.error(`${f.name}: ${m.badType}`);
            continue;
          }
          if (f.size > MAX_BYTES) {
            toast.error(`${f.name}: ${m.tooLarge}`);
            continue;
          }
          try {
            done.push(await upload(f));
          } catch (err) {
            const e = toAdminError(err);
            toast.error(`${f.name}: ${'generic' in e ? m.uploadFailed : errorText(e, t)}`);
          }
        }
      } finally {
        inFlight.current -= 1;
        if (inFlight.current === 0) setUploading(false);
        if (done.length > 0) {
          toast.success(`${m.uploaded}: ${done.length}`);
          void qc.invalidateQueries({ queryKey: ['admin', 'media'] });
        }
      }
      return done;
    },
    [t, qc],
  );

  return { uploadFiles, uploading };
}
