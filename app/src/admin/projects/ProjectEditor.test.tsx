import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '@/i18n/I18nContext';
import { ApiError } from '@/lib/api';
import ProjectEditor from './ProjectEditor';

const admin = vi.hoisted(() => ({
  projects: vi.fn(), createProject: vi.fn(), updateProject: vi.fn(), deleteProject: vi.fn(), reorderProjects: vi.fn(),
}));
vi.mock('@/lib/api', async (orig) => {
  const real = await orig<typeof import('@/lib/api')>();
  return { ...real, api: { admin } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function setup(entry: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/admin/projects/new" element={<ProjectEditor />} />
            <Route path="/admin/projects/:id" element={<ProjectEditor />} />
            <Route path="/admin/projects" element={<p>list</p>} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

it('creates a project with an auto slug and shows field errors from the server', async () => {
  admin.createProject
    .mockRejectedValueOnce(new ApiError(422, 'validation_failed', 'x', { repoUrl: 'must be an http(s) URL' }))
    .mockResolvedValueOnce({ id: 1 });
  setup('/admin/projects/new');
  await userEvent.type(screen.getByLabelText(/^name/i), 'Flow Forge');
  expect(screen.getByLabelText(/slug/i)).toHaveValue('flow-forge');
  await userEvent.type(screen.getByLabelText(/repo url/i), 'ftp://x');
  await userEvent.click(screen.getByRole('button', { name: /save/i }));
  expect(await screen.findByText(/must be an http\(s\) URL/)).toBeInTheDocument();
  await userEvent.clear(screen.getByLabelText(/repo url/i));
  await userEvent.click(screen.getByRole('button', { name: /save/i }));
  await waitFor(() => expect(admin.createProject).toHaveBeenCalledTimes(2));
  expect(admin.createProject.mock.calls[1][0]).toMatchObject({ slug: 'flow-forge', nameEn: 'Flow Forge', repoUrl: '' });
  expect(await screen.findByText('list')).toBeInTheDocument();
});

it('keeps a manually edited slug', async () => {
  setup('/admin/projects/new');
  await userEvent.type(screen.getByLabelText(/slug/i), 'custom');
  await userEvent.type(screen.getByLabelText(/^name/i), 'Other Name');
  expect(screen.getByLabelText(/slug/i)).toHaveValue('custom');
});

it('maps slug_taken to the slug field', async () => {
  admin.createProject.mockRejectedValueOnce(new ApiError(409, 'slug_taken', 'x'));
  setup('/admin/projects/new');
  await userEvent.type(screen.getByLabelText(/^name/i), 'Dup');
  await userEvent.click(screen.getByRole('button', { name: /save/i }));
  expect(await screen.findByText(/slug is already in use/i)).toBeInTheDocument();
});

it('requires the exact slug before deleting an existing project', async () => {
  admin.projects.mockResolvedValue({
    items: [{ id: 7, slug: 'old-one', nameEn: 'Old', nameTh: '', descEn: '', descTh: '', tags: ['go'], metric: '', repoUrl: '', demoUrl: '', flagship: false, published: true, sortOrder: 1, createdAt: '', updatedAt: '' }],
  });
  admin.deleteProject.mockResolvedValue(undefined);
  setup('/admin/projects/7');
  await userEvent.click(await screen.findByRole('button', { name: /^\[delete\]$/ }));
  const confirm = screen.getByRole('button', { name: /confirm delete/i });
  expect(confirm).toBeDisabled();
  await userEvent.type(screen.getByLabelText(/slug confirmation/i), 'old-one');
  expect(confirm).toBeEnabled();
  await userEvent.click(confirm);
  await waitFor(() => expect(admin.deleteProject).toHaveBeenCalledWith(7));
  expect(await screen.findByText('list')).toBeInTheDocument();
  expect(screen.queryByText(/project not found/i)).not.toBeInTheDocument();
});

it('switches to the language tab holding a server error and shows it', async () => {
  admin.createProject.mockRejectedValueOnce(new ApiError(422, 'validation_failed', 'x', { descTh: 'too long in thai' }));
  setup('/admin/projects/new');
  await userEvent.type(screen.getByLabelText(/^name/i), 'Thai Err');
  await userEvent.click(screen.getByRole('button', { name: /save/i }));
  expect(await screen.findByText(/too long in thai/)).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /TH/ })).toHaveAttribute('aria-selected', 'true');
});
