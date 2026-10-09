import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/i18n/I18nContext';
import Navbar from './Navbar';
import ShellProvider from '@/shell/ShellProvider';

vi.mock('@/shell/QuakeShell', () => ({ default: ({ open }: { open: boolean }) => (open ? <div data-testid="shell" /> : null) }));

/** Exposes the router's navigate (e.g. to simulate browser back/forward). */
const nav: { current: NavigateFunction | null } = { current: null };
function NavigateProbe() {
  const navigate = useNavigate();
  useEffect(() => {
    nav.current = navigate;
  }, [navigate]);
  return null;
}

function renderNavbar() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/']}>
        <ShellProvider>
          <NavigateProbe />
          <Navbar onToggleFx={() => {}} />
          <main>page</main>
        </ShellProvider>
      </MemoryRouter>
    </I18nProvider>,
  );
}

const overlay = () => document.getElementById('mobile-menu') as HTMLElement;

describe('Navbar mobile menu', () => {
  it('moves focus in, makes the page inert and locks scroll while open', async () => {
    const user = userEvent.setup();
    renderNavbar();
    const button = screen.getByRole('button', { name: '[ menu ]' });
    expect(button).toHaveAttribute('aria-controls', 'mobile-menu');
    expect(overlay()).not.toBeVisible();

    await user.click(button);

    expect(overlay()).toBeVisible();
    expect(within(overlay()).getByRole('link', { name: /about/i })).toHaveFocus();
    expect(screen.getByRole('main', { hidden: true })).toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('Escape closes it and returns focus to the menu button', async () => {
    const user = userEvent.setup();
    renderNavbar();
    await user.click(screen.getByRole('button', { name: '[ menu ]' }));

    await user.keyboard('{Escape}');

    expect(overlay()).not.toBeVisible();
    const button = screen.getByRole('button', { name: '[ menu ]' });
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('main')).not.toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('');
  });

  it('activating a link closes it and returns focus to the menu button', async () => {
    const user = userEvent.setup();
    renderNavbar();
    await user.click(screen.getByRole('button', { name: '[ menu ]' }));

    await user.click(within(overlay()).getByRole('link', { name: /blog/i }));

    expect(overlay()).not.toBeVisible();
    expect(screen.getByRole('button', { name: '[ menu ]' })).toHaveFocus();
  });

  it('closes when the route changes without a menu click (e.g. browser back)', async () => {
    const user = userEvent.setup();
    renderNavbar();
    await user.click(screen.getByRole('button', { name: '[ menu ]' }));
    expect(overlay()).toBeVisible();

    act(() => {
      void nav.current!('/blog');
    });

    expect(overlay()).not.toBeVisible();
    expect(screen.getByRole('main')).not.toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('');
  });

  it('closes when the viewport grows past the md breakpoint', async () => {
    let listener: ((e: { matches: boolean }) => void) | null = null;
    vi.stubGlobal('matchMedia', (query: string) => ({
      media: query,
      matches: false,
      addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => {
        listener = fn;
      },
      removeEventListener: () => {
        listener = null;
      },
    }));
    const user = userEvent.setup();
    renderNavbar();
    await user.click(screen.getByRole('button', { name: '[ menu ]' }));
    expect(overlay()).toBeVisible();

    act(() => listener?.({ matches: true }));

    expect(overlay()).not.toBeVisible();
    vi.unstubAllGlobals();
  });
});

describe('Navbar shell button', () => {
  it('opens the shell, reflects aria-pressed and closes it again', async () => {
    const user = userEvent.setup();
    renderNavbar();
    const [btn] = screen.getAllByRole('button', { name: 'Open shell' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveTextContent('[ >_ shell ]');
    await user.click(btn);
    expect(await screen.findByTestId('shell')).toBeInTheDocument();
    const [pressed] = screen.getAllByRole('button', { name: 'Close shell' });
    expect(pressed).toHaveAttribute('aria-pressed', 'true');
    await user.click(pressed);
    expect(screen.queryByTestId('shell')).toBeNull();
  });
});

describe('Navbar with the shell', () => {
  it('clicking a section link closes an open shell', async () => {
    const user = userEvent.setup();
    renderNavbar();
    await user.click(screen.getByRole('button', { name: /open shell/i, hidden: false }));
    expect(await screen.findByTestId('shell')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: /main/i });
    await user.click(within(nav).getAllByRole('link', { name: /about/i })[0]);
    expect(screen.queryByTestId('shell')).toBeNull();
  });
});
