import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { I18nProvider } from '@/i18n/I18nContext';
import ProjectsPage from './ProjectsPage';

const admin = vi.hoisted(() => ({ projects: vi.fn(), reorderProjects: vi.fn() }));
vi.mock('@/lib/api', async (orig) => {
  const real = await orig<typeof import('@/lib/api')>();
  return { ...real, api: { admin } };
});
// jsdom has no layout, so real sensors cannot compute drop targets: capture onDragEnd and call it.
const dnd = vi.hoisted(() => ({ onDragEnd: null as null | ((e: unknown) => Promise<void>) }));
vi.mock('@dnd-kit/core', async (orig) => {
  const real = await orig<typeof import('@dnd-kit/core')>();
  return {
    ...real,
    DndContext: (props: { onDragEnd: (e: unknown) => Promise<void>; children: React.ReactNode }) => {
      dnd.onDragEnd = props.onDragEnd;
      return <>{props.children}</>;
    },
  };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const p = (id: number, slug: string) => ({
  id, slug, nameEn: slug, nameTh: '', descEn: '', descTh: '', tags: [], metric: '', repoUrl: '', demoUrl: '',
  flagship: false, published: true, sortOrder: id, createdAt: '', updatedAt: '',
});

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <MemoryRouter><ProjectsPage /></MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  admin.projects.mockResolvedValue({ items: [p(1, 'alpha'), p(2, 'beta'), p(3, 'gamma')] });
});

async function moveFirstDown() {
  await screen.findByRole('button', { name: /alpha/ });
  await act(() => dnd.onDragEnd!({ active: { id: 1 }, over: { id: 2 } }));
}

it('reorders with the keyboard and sends all ids in the new order', async () => {
  admin.reorderProjects.mockResolvedValue(undefined);
  setup();
  await moveFirstDown();
  await waitFor(() => expect(admin.reorderProjects).toHaveBeenCalledTimes(1));
  expect(admin.reorderProjects.mock.calls[0][0]).toEqual([2, 1, 3]);
});

it('toasts and refetches when the reorder fails', async () => {
  admin.reorderProjects.mockRejectedValue(new Error('boom'));
  setup();
  await moveFirstDown();
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  await waitFor(() => expect(admin.projects.mock.calls.length).toBeGreaterThanOrEqual(2));
});
