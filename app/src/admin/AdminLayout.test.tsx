import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '@/i18n/I18nContext';
import AdminLayout from './AdminLayout';
import { useDirtyGuard } from './dirtyGuard';

const auth = vi.hoisted(() => ({ me: vi.fn(), logout: vi.fn() }));
vi.mock('@/lib/api', async (orig) => {
  const real = await orig<typeof import('@/lib/api')>();
  return { ...real, api: { auth } };
});

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/admin/posts']}>
          <Routes>
            <Route path="/admin/login" element={<p>login page</p>} />
            <Route element={<AdminLayout />}>
              <Route path="/admin/posts" element={<p>posts page</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  auth.me.mockResolvedValue({ username: 'admin', githubLogin: null, totpEnabled: true, authMethod: 'password', csrfToken: 'tok' });
});

it('stays in place and shows an error when logout fails server-side', async () => {
  const { ApiError } = await import('@/lib/api');
  auth.logout.mockRejectedValue(new ApiError(500, 'internal', 'boom'));
  setup();
  await userEvent.click(screen.getByRole('button', { name: /logout/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/logout failed/i);
  expect(screen.getByText('posts page')).toBeInTheDocument();
  expect(screen.queryByText('login page')).not.toBeInTheDocument();
});

it('goes to the login page when the session is already gone (401)', async () => {
  const { ApiError } = await import('@/lib/api');
  auth.logout.mockRejectedValue(new ApiError(401, 'unauthorized', 'Login required.'));
  setup();
  await userEvent.click(screen.getByRole('button', { name: /logout/i }));
  expect(await screen.findByText('login page')).toBeInTheDocument();
});

it('goes to the login page after a successful logout and drops autosaved post drafts', async () => {
  auth.logout.mockResolvedValue(undefined);
  localStorage.setItem('draft:post:new', '{}');
  localStorage.setItem('draft:post:4', '{}');
  localStorage.setItem('other', 'keep');
  setup();
  await userEvent.click(screen.getByRole('button', { name: /logout/i }));
  expect(await screen.findByText('login page')).toBeInTheDocument();
  expect(localStorage.getItem('draft:post:new')).toBeNull();
  expect(localStorage.getItem('draft:post:4')).toBeNull();
  expect(localStorage.getItem('other')).toBe('keep');
});

function DirtyEditor() {
  useDirtyGuard(true, 'discard?');
  return <p>dirty editor</p>;
}

it('asks before leaving a dirty editor through the sidebar', async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/admin/posts']}>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route path="/admin/posts" element={<DirtyEditor />} />
              <Route path="/admin/projects" element={<p>projects page</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
  await userEvent.click(screen.getByRole('link', { name: /projects/i }));
  expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /stay/i }));
  expect(screen.getByText('dirty editor')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('link', { name: /projects/i }));
  await userEvent.click(await screen.findByRole('button', { name: /discard changes/i }));
  expect(await screen.findByText('projects page')).toBeInTheDocument();
});

it('lets modified clicks on sidebar links through even when dirty', async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/admin/posts']}>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route path="/admin/posts" element={<DirtyEditor />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
  const link = screen.getByRole('link', { name: /projects/i });
  const ev = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true, button: 0 });
  await act(async () => {
    link.dispatchEvent(ev);
  });
  expect(ev.defaultPrevented).toBe(false); // browser handles it (new tab)
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});
