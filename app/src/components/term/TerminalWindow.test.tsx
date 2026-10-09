import { render, screen } from '@testing-library/react';
import TerminalWindow from './TerminalWindow';

function titleBar(container: HTMLElement) {
  const bar = container.querySelector('.term-window-bar');
  if (!bar) throw new Error('title bar missing');
  return bar as HTMLElement;
}

describe('TerminalWindow chrome', () => {
  it('prefixes path titles with user@host like a GNOME terminal', () => {
    const { container } = render(<TerminalWindow title="~/projects"><p>hi</p></TerminalWindow>);
    const bar = titleBar(container);
    expect(bar.querySelector('.term-window-title')).toHaveTextContent(/^guest@prommin: ~\/projects$/);
    expect(bar.querySelector('.term-window-title')).toHaveAttribute('title', 'guest@prommin: ~/projects');
    expect(screen.getByText('~/projects')).toBeInTheDocument();
    expect(screen.getByText('hi')).toBeInTheDocument();
  });

  it('prefixes absolute paths too', () => {
    const { container } = render(<TerminalWindow title="/etc/motd" />);
    expect(titleBar(container).querySelector('.term-window-title')).toHaveTextContent(/^guest@prommin: \/etc\/motd$/);
  });

  it('renders non-path titles as-is', () => {
    const { container } = render(<TerminalWindow title="ping --realtime" />);
    const title = titleBar(container).querySelector('.term-window-title');
    expect(title).toHaveTextContent(/^ping --realtime$/);
    expect(title).toHaveAttribute('title', 'ping --realtime');
  });

  it('honours user and host overrides', () => {
    const { container } = render(<TerminalWindow title="~/admin/login" user="admin" host="box" />);
    expect(titleBar(container).querySelector('.term-window-title')).toHaveTextContent(/^admin@box: ~\/admin\/login$/);
  });

  it('shows the home directory when there is no title', () => {
    const { container } = render(<TerminalWindow><p>body</p></TerminalWindow>);
    expect(titleBar(container).querySelector('.term-window-title')).toHaveTextContent(/^guest@prommin: ~$/);
  });

  it('renders decorative, non-focusable window buttons and no heading', () => {
    const { container } = render(<TerminalWindow title="~/x" />);
    const buttons = titleBar(container).querySelector('.term-window-buttons');
    expect(buttons).toHaveAttribute('aria-hidden', 'true');
    expect(buttons?.querySelectorAll('.term-window-btn')).toHaveLength(3);
    expect(container.querySelectorAll('button, [tabindex]')).toHaveLength(0);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(container.textContent).not.toContain('+--[');
  });

  it('keeps pointer events on the box', () => {
    const { container } = render(<TerminalWindow title="~/x" as="article" />);
    expect(container.firstElementChild?.tagName).toBe('ARTICLE');
    expect(container.firstElementChild).toHaveClass('term-window', 'pointer-events-auto');
  });
});

describe('TerminalWindow close button', () => {
  it('makes × a labelled button that calls onClose when provided', () => {
    const onClose = vi.fn();
    const { container } = render(<TerminalWindow title="~" onClose={onClose} closeLabel="Close shell" />);
    const btn = screen.getByRole('button', { name: 'Close shell' });
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn).toHaveTextContent('×');
    btn.click();
    expect(onClose).toHaveBeenCalledTimes(1);
    // min/max stay decorative
    expect(container.querySelectorAll('button')).toHaveLength(1);
    expect(container.querySelector('.term-window-btn-min')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
