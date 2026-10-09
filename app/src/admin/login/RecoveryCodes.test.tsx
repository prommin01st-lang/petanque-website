import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@/i18n/I18nContext';
import RecoveryCodes from './RecoveryCodes';

function setup() {
  render(
    <I18nProvider>
      <RecoveryCodes codes={['abcd-efgh']} onContinue={() => {}} />
    </I18nProvider>,
  );
}

it('confirms a successful copy', async () => {
  const user = userEvent.setup();
  setup();
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  await user.click(screen.getByRole('button', { name: /copy/i }));
  expect(await screen.findByRole('status')).toHaveTextContent(/^copied$/i);
  expect(write).toHaveBeenCalledWith('abcd-efgh\n');
});

it('tells the user to download when copying fails', async () => {
  const user = userEvent.setup();
  setup();
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
  await user.click(screen.getByRole('button', { name: /copy/i }));
  expect(await screen.findByRole('status')).toHaveTextContent(/copy failed — use download/i);
});
