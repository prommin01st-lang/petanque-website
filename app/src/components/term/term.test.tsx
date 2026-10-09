import { render, screen } from '@testing-library/react';
import { ApiError } from '@/lib/api';
import { AsciiBox, ErrorLine, FigletTitle, FIGLET_NAME } from './index';

it('AsciiBox shows its title and children', () => {
  render(<AsciiBox title="~/projects"><p>hi</p></AsciiBox>);
  expect(screen.getByText('~/projects')).toBeInTheDocument();
  expect(screen.getByText('hi')).toBeInTheDocument();
});

it('ErrorLine formats ApiError and retries', async () => {
  const retry = vi.fn();
  render(<ErrorLine error={new ApiError(404, 'not_found', 'Resource not found.')} onRetry={retry} />);
  expect(screen.getByText(/ERR: not_found: Resource not found\./)).toBeInTheDocument();
  screen.getByRole('button').click();
  expect(retry).toHaveBeenCalled();
});

it('FigletTitle keeps an accessible name', () => {
  render(<FigletTitle text="PROMMIN.L" art={FIGLET_NAME} />);
  expect(screen.getByRole('heading', { name: 'PROMMIN.L' })).toBeInTheDocument();
});
