import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/i18n/I18nContext';
import Layout from './Layout';

function stubMatchMedia(reduce = false) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

function renderLayout() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<p>page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Layout background', () => {
  it('renders the static backdrop when fx is off', () => {
    stubMatchMedia();
    localStorage.setItem('fx-enabled', 'false');
    renderLayout();
    expect(screen.getByTestId('static-ascii-backdrop')).toBeInTheDocument();
    expect(screen.queryByTestId('ascii-background')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /toggle animated background/i })[0]).toHaveTextContent('[fx:off]');
  });

  it('renders the animated canvas when fx is on', () => {
    stubMatchMedia();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    renderLayout();
    expect(screen.getByTestId('ascii-background')).toBeInTheDocument();
  });

  it('disables the fx toggle with an explanation under reduced motion', () => {
    stubMatchMedia(true);
    renderLayout();
    expect(screen.getByTestId('static-ascii-backdrop')).toBeInTheDocument();
    const toggle = screen.getAllByRole('button', { name: /toggle animated background/i })[0];
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute('title', expect.stringMatching(/reduced motion/i));
  });
});

describe('Layout status bar', () => {
  it('mounts the window list and reserves bottom padding', () => {
    stubMatchMedia();
    const { container } = renderLayout();
    expect(screen.getByRole('navigation', { name: 'Window list' })).toBeInTheDocument();
    expect((container.firstChild as HTMLElement).style.paddingBottom).toBe('24px');
  });
});
