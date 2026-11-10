import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TermSkeleton from './TermSkeleton';

describe('TermSkeleton', () => {
  it('exposes the label as a status and hides the glyphs from screen readers', async () => {
    render(<TermSkeleton label="loading..." />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('loading...');
    const glyphs = await waitFor(() => {
      const found = status.querySelectorAll('.ars');
      expect(found.length).toBeGreaterThan(0);
      return found;
    });
    glyphs.forEach((g) => expect(g).toHaveAttribute('aria-hidden', 'true'));
  });

  it.each(['list', 'article', 'cards'] as const)('renders the %s layout', async (layout) => {
    render(<TermSkeleton layout={layout} count={2} />);
    await waitFor(() => expect(screen.getByTestId('term-skeleton').querySelectorAll('.ars').length).toBeGreaterThan(1));
  });
});
