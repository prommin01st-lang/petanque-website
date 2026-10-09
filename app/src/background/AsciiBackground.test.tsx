import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AsciiBackground from './AsciiBackground';

describe('AsciiBackground', () => {
  it('falls back to the static backdrop when WebGL is unavailable', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<AsciiBackground />);
    expect(await screen.findByTestId('static-ascii-backdrop')).toBeInTheDocument();
    expect(screen.queryByTestId('ascii-background')).not.toBeInTheDocument();
  });
});
