vi.mock('./QuakeShell', () => ({ default: ({ open }: { open: boolean }) => (open ? <div data-testid="shell" /> : null) }));
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShellProvider from './ShellProvider';
import { useShell } from './useShell';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/i18n/I18nContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function Opener() {
  const s = useShell();
  return <button onClick={(e) => s.openShell(e.currentTarget)}>opener</button>;
}
function renderP(extra?: ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider>
        <MemoryRouter>
          <ShellProvider>
            <Opener />
            {extra}
          </ShellProvider>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

// QuakeShell is React.lazy, so the first open resolves asynchronously (findBy instead of getBy).
it('backtick toggles the shell', async () => {
  renderP();
  fireEvent.keyDown(window, { key: '`' });
  expect(await screen.findByTestId('shell')).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByTestId('shell')).toBeNull();
  fireEvent.keyDown(window, { key: '`' });
  expect(await screen.findByTestId('shell')).toBeInTheDocument();
  fireEvent.keyDown(window, { key: '`' });
  expect(screen.queryByTestId('shell')).toBeNull();
});
it('backtick inside an input types instead of opening', async () => {
  renderP(<input aria-label="field" />);
  const input = screen.getByLabelText('field');
  input.focus();
  fireEvent.keyDown(input, { key: '`' });
  await new Promise((r) => setTimeout(r, 20));
  expect(screen.queryByTestId('shell')).toBeNull();
});
it('ignores backtick with Alt/Meta or when already handled', async () => {
  renderP();
  fireEvent.keyDown(window, { key: '`', altKey: true });
  fireEvent.keyDown(window, { key: '`', metaKey: true });
  const ev = new KeyboardEvent('keydown', { key: '`', cancelable: true });
  ev.preventDefault();
  window.dispatchEvent(ev);
  await new Promise((r) => setTimeout(r, 20));
  expect(screen.queryByTestId('shell')).toBeNull();
});
it('returns focus to the opener on close', async () => {
  renderP();
  const btn = screen.getByText('opener');
  fireEvent.click(btn);
  await screen.findByTestId('shell');
  btn.blur();
  fireEvent.keyDown(window, { key: 'Escape' });
  await waitFor(() => expect(document.activeElement).toBe(btn));
});
it('ignores auto-repeated backtick keydowns', async () => {
  renderP();
  fireEvent.keyDown(window, { key: '`' });
  await screen.findByTestId('shell');
  fireEvent.keyDown(window, { key: '`', repeat: true });
  expect(screen.getByTestId('shell')).toBeInTheDocument();
});
