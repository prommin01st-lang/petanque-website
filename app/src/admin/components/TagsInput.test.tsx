import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@/i18n/I18nContext';
import TagsInput from './TagsInput';

function Harness({ initial = [] as string[] }) {
  const [v, setV] = useState(initial);
  return (
    <I18nProvider>
      <TagsInput value={v} onChange={setV} />
      <output data-testid="out">{JSON.stringify(v)}</output>
    </I18nProvider>
  );
}
const out = () => JSON.parse(screen.getByTestId('out').textContent!);

it('splits pasted comma lists and dedupes case-insensitively', async () => {
  render(<Harness initial={['Go']} />);
  await userEvent.click(screen.getByRole('textbox'));
  await userEvent.paste('react, go, ts,react');
  await userEvent.keyboard('{Enter}');
  expect(out()).toEqual(['Go', 'react', 'ts']);
});

it('rejects tags over 32 chars with a hint instead of truncating', async () => {
  render(<Harness />);
  await userEvent.type(screen.getByRole('textbox'), 'x'.repeat(33) + '{Enter}');
  expect(out()).toEqual([]);
  expect(screen.getByRole('alert')).toHaveTextContent(/32/);
});

it('is read-only at the max but Backspace still removes the last tag', async () => {
  const tags = Array.from({ length: 12 }, (_, i) => `t${i}`);
  render(<Harness initial={tags} />);
  const input = screen.getByRole('textbox');
  expect(input).toHaveAttribute('readonly');
  await userEvent.click(input);
  await userEvent.keyboard('{Backspace}');
  expect(out()).toHaveLength(11);
});
