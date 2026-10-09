import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { I18nProvider } from '@/i18n/I18nContext';
import ShellProvider from './ShellProvider';

const gate = vi.hoisted(() => ({ failures: 1 }));
vi.mock('./QuakeShell', () => {
  if (gate.failures-- > 0) throw new Error('chunk load failed');
  return { default: ({ open }: { open: boolean }) => (open ? <div data-testid="shell" /> : null) };
});

it('a failed shell chunk shows a retryable alert and leaves the page intact', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider><MemoryRouter><ShellProvider><main>page content</main></ShellProvider></MemoryRouter></I18nProvider>
    </QueryClientProvider>,
  );
  fireEvent.keyDown(window, { key: '`' });
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('failed to load the terminal');
  expect(screen.getByText('page content')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /retry/i }));
  expect(await screen.findByTestId('shell')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByText('page content')).toBeInTheDocument();
});
