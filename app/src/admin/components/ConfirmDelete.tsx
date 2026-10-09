import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useI18n } from '@/i18n/I18nContext';

interface ConfirmDeleteProps {
  slug: string;
  onConfirm: () => void;
}

export default function ConfirmDelete({ slug, onConfirm }: ConfirmDeleteProps) {
  const { t } = useI18n();
  const [typed, setTyped] = useState('');
  const c = t.admin.confirmDelete;
  return (
    <AlertDialog onOpenChange={(o) => !o && setTyped('')}>
      <AlertDialogTrigger asChild>
        <button type="button" className="btn-danger-outline">
          {c.button}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-surface border-hud-border font-mono">
        <AlertDialogHeader>
          <AlertDialogTitle>{c.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {c.body} <code className="text-ansi-bright-cyan">{slug}</code>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <input
          aria-label={c.input}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="input-hud"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>{c.cancel}</AlertDialogCancel>
          <AlertDialogAction className="btn-danger-outline" disabled={typed !== slug} onClick={onConfirm}>
            {c.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
