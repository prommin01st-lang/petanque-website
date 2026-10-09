import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '@/i18n/I18nContext';
import CommandPalette, { parseCommand } from './CommandPalette';

const admin = vi.hoisted(() => ({ projects: vi.fn(), posts: vi.fn() }));
vi.mock('@/lib/api', async (orig) => {
  const real = await orig<typeof import('@/lib/api')>();
  return { ...real, api: { admin } };
});

const ctx = { projects: [{ id: 3, slug: 'kanban' }], posts: [{ id: 9, slug: 'hello' }, { id: 10, slug: 'kanban' }] };

it.each([
  ['new post', { to: '/admin/posts/new' }],
  ['  NEW Project ', { to: '/admin/projects/new' }],
  ['edit kanban', { to: '/admin/projects/3' }],
  ['edit hello', { to: '/admin/posts/9' }],
  ['goto media', { to: '/admin/media' }],
  ['audit', { to: '/admin/audit' }],
  ['logout', { action: 'logout' }],
  ['edit nope', null],
  ['rm -rf /', null],
])('%s', (input, expected) => expect(parseCommand(input, ctx)).toEqual(expected));

function setup() {
  admin.projects.mockResolvedValue({ items: [{ id: 3, slug: 'kanban' }] });
  admin.posts.mockResolvedValue({ items: [{ id: 9, slug: 'hello' }] });
  const onNavigate = vi.fn();
  const onLogout = vi.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <CommandPalette onNavigate={onNavigate} onLogout={onLogout} />
      </I18nProvider>
    </QueryClientProvider>,
  );
  return { onNavigate, onLogout };
}

it('toggles with Ctrl+K and fetches lists lazily', async () => {
  const user = userEvent.setup();
  setup();
  expect(admin.projects).not.toHaveBeenCalled();
  await user.keyboard('{Control>}k{/Control}');
  expect(await screen.findByRole('combobox')).toBeInTheDocument();
  await waitFor(() => expect(admin.projects).toHaveBeenCalled());
  await user.keyboard('{Control>}k{/Control}');
  await waitFor(() => expect(screen.queryByRole('combobox')).not.toBeInTheDocument());
});

it('runs a typed command through onNavigate', async () => {
  const user = userEvent.setup();
  const { onNavigate } = setup();
  await user.keyboard('{Control>}k{/Control}');
  await user.type(await screen.findByRole('combobox'), 'edit hello{Enter}');
  await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('/admin/posts/9'));
});

it('selects a suggestion with arrows and Enter', async () => {
  const user = userEvent.setup();
  const { onNavigate } = setup();
  await user.keyboard('{Control>}k{/Control}');
  await user.type(await screen.findByRole('combobox'), 'goto m{ArrowDown}{Enter}');
  await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('/admin/media'));
});

it('shows an error for unknown commands and logs out', async () => {
  const user = userEvent.setup();
  const { onLogout } = setup();
  await user.keyboard('{Control>}k{/Control}');
  const box = await screen.findByRole('combobox');
  await user.type(box, 'rm -rf /{Enter}');
  expect(await screen.findByRole('alert')).toHaveTextContent('ERR: command not found: rm -rf /');
  await user.clear(box);
  await user.type(box, 'logout{Enter}');
  await waitFor(() => expect(onLogout).toHaveBeenCalled());
});

it('ArrowUp from no selection selects the last suggestion', async () => {
  const user = userEvent.setup();
  setup();
  await user.keyboard('{Control>}k{/Control}');
  const input = await screen.findByRole('combobox');
  await screen.findByText('edit hello'); // lists loaded: the suggestion count is final
  await user.keyboard('{ArrowUp}');
  const options = screen.getAllByRole('option');
  expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true');
  expect(input).toHaveAttribute('aria-activedescendant', `palette-opt-${options.length - 1}`);
  await user.keyboard('{ArrowDown}');
  expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
});
