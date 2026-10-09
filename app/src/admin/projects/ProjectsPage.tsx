import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { ErrorLine, LoadingBar } from '@/components/term';
import { api } from '@/lib/api';
import type { AdminProject } from '@/lib/types';
import { useI18n } from '@/i18n/I18nContext';

const KEY = ['admin', 'projects'];

export default function ProjectsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: KEY, queryFn: api.admin.projects });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorder = useMutation({
    mutationFn: (ids: number[]) => api.admin.reorderProjects(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
    onError: () => {
      toast.error(t.admin.projects.reorderFailed);
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });

  async function onDragEnd(e: DragEndEvent) {
    if (reorder.isPending) return;
    const items = q.data?.items;
    if (!items || !e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((p) => p.id === e.active.id);
    const to = items.findIndex((p) => p.id === e.over!.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(items, from, to);
    await qc.cancelQueries({ queryKey: KEY });
    qc.setQueryData(KEY, { items: next });
    reorder.mutate(next.map((p) => p.id));
  }

  const c = t.admin.projects.cols;
  return (
    <div className="flex flex-col gap-4 font-mono">
      <div className="flex items-center justify-between">
        <h1 className="m-0 text-lg text-ansi-bright-cyan">{t.admin.projects.title}</h1>
        <Link to="/admin/projects/new" className="btn-neon">{t.admin.projects.new}</Link>
      </div>
      {q.isPending && <LoadingBar label={t.common.loading} />}
      {q.isError && (
        <ErrorLine error={q.error} onRetry={() => q.refetch()} retryLabel={t.common.retry} fallbackMessage={t.common.error} />
      )}
      {q.data && q.data.items.length === 0 && <p className="text-sm text-text-dim">{t.admin.projects.empty}</p>}
      {q.data && q.data.items.length > 0 && (
        <div className="overflow-x-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-dim">
                  <th className="w-8" />
                  <th className="w-10">{c.order}</th>
                  <th>{c.slug}</th>
                  <th>{c.name}</th>
                  <th>{c.tags}</th>
                  <th>{c.status}</th>
                </tr>
              </thead>
              <tbody>
                <SortableContext items={q.data.items.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                  {q.data.items.map((p, i) => (
                    <Row key={p.id} project={p} index={i + 1} />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        </div>
      )}
    </div>
  );
}

function Row({ project: p, index }: { project: AdminProject; index: number }) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className="border-t border-hud-border"
    >
      <td>
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label={`${t.admin.projects.drag}: ${p.slug}`}
          className="cursor-grab px-1 text-text-dim hover:text-ansi-bright-cyan"
          {...attributes}
          {...listeners}
        >
          ::
        </button>
      </td>
      <td className="text-text-dim">{index}</td>
      <td>
        <Link to={`/admin/projects/${p.id}`} className="link-neon">{p.slug}</Link>
      </td>
      <td>{p.nameEn}</td>
      <td className="text-text-dim">{p.tags.join(', ')}</td>
      <td>
        {p.flagship && <span className="text-warn" title={t.admin.projects.flagship}>★ </span>}
        <span className={p.published ? 'text-ansi-bright-green' : 'text-text-dim'}>
          {p.published ? t.admin.projects.pub : t.admin.projects.hidden}
        </span>
      </td>
    </tr>
  );
}
