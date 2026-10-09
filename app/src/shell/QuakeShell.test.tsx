import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '@/i18n/I18nContext';
import * as spy from '@/hooks/useActiveSection';
import QuakeShell from './QuakeShell';

const fake = vi.hoisted(() => ({
  writes: [] as string[],
  input: null as null | ((d: string) => void),
  keyHandler: null as null | ((e: KeyboardEvent) => boolean),
  options: null as null | Record<string, unknown>,
  webLinks: null as null | ((e: MouseEvent, uri: string) => void),
  fail: 0,
}));
vi.mock('./loadXterm', () => ({
  loadXterm: async () => {
    if (fake.fail > 0) { fake.fail--; throw new Error('chunk'); }
    class Terminal {
      cols = 80; options: Record<string, unknown> = {}; unicode = { activeVersion: '' };
      constructor() { fake.options = this.options; }
      write(d: string) { fake.writes.push(d); }
      onData(cb: (d: string) => void) { fake.input = cb; return { dispose() {} }; }
      attachCustomKeyEventHandler(h: (e: KeyboardEvent) => boolean) { fake.keyHandler = h; }
      loadAddon() {} open() {} focus() {} clear() {} dispose() {}
    }
    class Addon { fit() {} dispose() {} }
    class WebLinksAddon extends Addon {
      constructor(cb?: (e: MouseEvent, uri: string) => void) { super(); fake.webLinks = cb ?? null; }
    }
    return { Terminal, FitAddon: Addon, WebLinksAddon, UnicodeGraphemesAddon: Addon };
  },
}));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: {
    projects: async () => ({ items: [{ slug: 'kanban', name: { en: 'Kanban', th: '' }, description: { en: 'd', th: '' }, tags: [], metric: '', repoUrl: '', demoUrl: '', flagship: true }] }),
    posts: async () => ({ items: [{ slug: 'hello', title: { en: 'Hello', th: '' }, excerpt: { en: '', th: '' }, tags: [], coverUrl: '', publishedAt: '2026-10-09T00:00:00.000Z' }], page: 1, perPage: 50, total: 1 }),
    post: async () => ({ slug: 'hello', title: { en: 'Hello', th: '' }, excerpt: { en: '', th: '' }, body: { en: '', th: '' }, tags: [], coverUrl: '', publishedAt: '2026-10-09T00:00:00.000Z' }),
  },
}));

function Loc() { const l = useLocation(); return <div data-testid="loc">{l.pathname}</div>; }
const out = () => fake.writes.join('');
function ui(onClose = vi.fn()) {
  render(<QueryClientProvider client={new QueryClient()}><I18nProvider><MemoryRouter initialEntries={['/']}>
    <Routes><Route path="*" element={<><QuakeShell open onClose={onClose} /><Loc /></>} /></Routes>
  </MemoryRouter></I18nProvider></QueryClientProvider>);
  return onClose;
}
beforeEach(() => { fake.writes = []; fake.input = null; fake.keyHandler = null; fake.options = null; fake.webLinks = null; fake.fail = 0; sessionStorage.clear(); });

it('shows the welcome banner and runs ls', async () => {
  ui();
  await waitFor(() => expect(out()).toContain("Welcome to petanque21st's shell."));
  fake.input!('ls\r');
  await waitFor(() => expect(out()).toContain('projects/'));
});
it('shows a retry line when xterm fails to load', async () => {
  fake.fail = 1; ui();
  expect(await screen.findByRole('alert')).toHaveTextContent('failed to load the terminal');
  fireEvent.click(screen.getByRole('button', { name: /retry/i }));
  await waitFor(() => expect(fake.input).not.toBeNull());
});
it('cd skills keeps the shell open and scrolls', async () => {
  const go = vi.spyOn(spy, 'goToSection').mockImplementation(() => {});
  const onClose = ui();
  await waitFor(() => expect(fake.input).not.toBeNull());
  fake.input!('cd skills\r');
  await waitFor(() => expect(go).toHaveBeenCalledWith('skills', expect.any(Function), '/'));
  expect(onClose).not.toHaveBeenCalled();
});
it('open post navigates and closes', async () => {
  const onClose = ui();
  await waitFor(() => expect(fake.input).not.toBeNull());
  fake.input!('open hello\r');
  await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/blog/hello'));
  expect(onClose).toHaveBeenCalled();
});
it('backtick on an empty line and Escape close the shell', async () => {
  const onClose = ui();
  await waitFor(() => expect(fake.input).not.toBeNull());
  fake.input!('`');
  expect(onClose).toHaveBeenCalledTimes(1);
  fake.input!('e');
  fake.input!('`'); // non-empty line: typed, not a close
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(fake.keyHandler!(new KeyboardEvent('keydown', { key: 'Escape' }))).toBe(false);
  expect(onClose).toHaveBeenCalledTimes(2);
});
it('loads saved history and persists new commands', async () => {
  localStorage.setItem('shell-history', JSON.stringify(['whoami']));
  ui();
  await waitFor(() => expect(fake.input).not.toBeNull());
  fake.input!('history\r');
  await waitFor(() => expect(out()).toContain('whoami'));
  expect(JSON.parse(localStorage.getItem('shell-history')!)).toEqual(['whoami', 'history']);
});
it('shows the welcome banner once per session', async () => {
  sessionStorage.setItem('shell-welcomed', '1');
  ui();
  await waitFor(() => expect(fake.input).not.toBeNull());
  await waitFor(() => expect(out()).toContain('guest@petanque21st'));
  expect(out()).not.toContain('Welcome');
});

describe('link handlers', () => {
  type Activate = { activate(e: MouseEvent, text: string): void };
  const handlers = () => [
    (u: string) => (fake.options!.linkHandler as Activate).activate(new MouseEvent('click'), u),
    (u: string) => fake.webLinks!(new MouseEvent('click'), u),
  ];

  it('never opens or navigates to javascript:, data: or protocol-relative URLs', async () => {
    const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
    const onClose = ui();
    await waitFor(() => expect(fake.webLinks).not.toBeNull());
    for (const h of handlers()) {
      for (const bad of ['javascript:alert(1)', 'data:text/html,x', '//evil.com']) h(bad);
    }
    expect(opened).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/$/);
  });

  it('navigates same-origin paths and opens https externally through both handlers', async () => {
    const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
    const onClose = ui();
    await waitFor(() => expect(fake.webLinks).not.toBeNull());
    const [osc8, web] = handlers();
    osc8('/blog/hello');
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/blog/hello'));
    web('/projects-x');
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/projects-x'));
    expect(onClose).toHaveBeenCalledTimes(2);
    osc8('https://github.com/x');
    web('https://example.com/a');
    expect(opened.mock.calls).toEqual([
      ['https://github.com/x', '_blank', 'noopener'],
      ['https://example.com/a', '_blank', 'noopener'],
    ]);
  });
});

describe('window buttons', () => {
  it('minimize collapses to the title bar and restores; maximize fills the viewport', async () => {
    ui();
    await waitFor(() => expect(fake.input).not.toBeNull());
    const panel = screen.getByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Minimize shell' }));
    expect(panel).toHaveAttribute('data-mode', 'minimized');
    fireEvent.click(screen.getByRole('button', { name: 'Minimize shell' }));
    expect(panel).toHaveAttribute('data-mode', 'normal');
    fireEvent.click(screen.getByRole('button', { name: 'Maximize shell' }));
    expect(panel).toHaveAttribute('data-mode', 'maximized');
    fireEvent.click(screen.getByRole('button', { name: 'Restore shell size' }));
    expect(panel).toHaveAttribute('data-mode', 'normal');
  });

  it('close button closes the shell', async () => {
    const onClose = ui();
    await waitFor(() => expect(fake.input).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Close shell' }));
    expect(onClose).toHaveBeenCalled();
  });
});
