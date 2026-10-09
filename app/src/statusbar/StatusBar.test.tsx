import type { ReactNode } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { I18nProvider } from '@/i18n/I18nContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ShellProvider from '@/shell/ShellProvider';
import StatusBar from './StatusBar';

vi.mock('@/shell/QuakeShell', () => ({ default: ({ open }: { open: boolean }) => (open ? <div data-testid="shell" /> : null) }));

function wrap(path: string, extra?: ReactNode) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider><MemoryRouter initialEntries={[path]}>
        <ShellProvider><StatusBar />{extra}</ShellProvider>
      </MemoryRouter></I18nProvider>
    </QueryClientProvider>
  );
}
const renderBar = (path = '/') => render(wrap(path));

it('marks the active window with *', () => {
  renderBar('/blog/x');
  expect(screen.getByRole('button', { name: /4:blog\*/ })).toHaveAttribute('aria-current', 'true');
});

it('clicking a window navigates home to that section', async () => {
  function Loc() { const l = useLocation(); return <div data-testid="loc">{l.pathname + l.hash}</div>; }
  render(wrap('/blog/x', <Loc />));
  await userEvent.click(screen.getByRole('button', { name: /3:skills/ }));
  expect(screen.getByTestId('loc')).toHaveTextContent('/#skills');
});

it('toggles the shell, reflects state and returns focus to the status-bar button', async () => {
  renderBar('/');
  const open = screen.getByRole('button', { name: /open shell/i });
  expect(open).toHaveAttribute('aria-pressed', 'false');
  // fireEvent.click does not focus the button (as in Safari/Firefox), so focus return must use the explicit opener.
  fireEvent.click(open);
  expect(await screen.findByTestId('shell')).toBeInTheDocument();
  const close = screen.getByRole('button', { name: /close shell/i });
  expect(close).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(close);
  expect(screen.queryByTestId('shell')).toBeNull();
  await waitFor(() => expect(screen.getByRole('button', { name: /open shell/i })).toHaveFocus());
});

it('switches language', async () => {
  renderBar('/');
  await userEvent.click(screen.getByRole('button', { name: /^TH$/ }));
  expect(document.documentElement.lang).toBe('th');
});
