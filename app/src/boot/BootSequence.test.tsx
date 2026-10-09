import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/i18n/I18nContext';
import BootSequence from './BootSequence';
import { shouldBoot } from './shouldBoot';

const mm = (reduce: boolean) => vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({ matches: reduce && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {}, onchange: null, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList);
const ui = (path = '/') => render(<I18nProvider><MemoryRouter initialEntries={[path]}><BootSequence /></MemoryRouter></I18nProvider>);
// jsdom lacks matchMedia (and admin code relies on that), so stub it only for this file.
beforeAll(() => { Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: () => ({ matches: false }) }); });
afterAll(() => { Reflect.deleteProperty(window, 'matchMedia'); });
beforeEach(() => { vi.useFakeTimers(); sessionStorage.clear(); mm(false); Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true }); });
afterEach(() => vi.useRealTimers());

it('shows once per session then disappears', () => {
  ui();
  expect(screen.getByTestId('boot')).toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(3000); });
  expect(screen.queryByTestId('boot')).toBeNull();
  expect(shouldBoot('/')).toBe(false);
});
it('reveals lines progressively', () => {
  ui();
  expect(screen.queryByText(/Reached target/)).toBeNull();
  act(() => { vi.advanceTimersByTime(800); });
  expect(screen.getByText(/Reached target/)).toBeInTheDocument();
});
it('skips on any key', () => {
  ui(); fireEvent.keyDown(window, { key: 'a' });
  expect(screen.queryByTestId('boot')).toBeNull();
});
it('does not show on deep links', () => { ui('/blog/x'); expect(screen.queryByTestId('boot')).toBeNull(); });
it('does not show under reduced motion', () => { mm(true); ui(); expect(screen.queryByTestId('boot')).toBeNull(); });
it('does not show to automation', () => {
  Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true });
  ui(); expect(screen.queryByTestId('boot')).toBeNull();
});
it('survives storage errors', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  expect(shouldBoot('/')).toBe(false);
});
it('is hidden from assistive tech and does not take focus', () => {
  const before = document.activeElement; ui();
  expect(screen.getByTestId('boot')).toHaveAttribute('aria-hidden', 'true');
  expect(document.activeElement).toBe(before);
});

it('keeps the padding spaces inside [  OK  ]', () => {
  ui();
  act(() => { vi.advanceTimersByTime(300); });
  const line = screen.getByText(/Mounted/);
  expect(line.textContent).toContain('[  OK  ]');
  expect(line).toHaveClass('whitespace-pre');
});
