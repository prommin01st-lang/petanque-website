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
    expect(bar.querySelector('.term-window-title')).toHaveTextContent(/^guest@petanque21st: ~\/projects$/);
    expect(bar.querySelector('.term-window-title')).toHaveAttribute('title', 'guest@petanque21st: ~/projects');
    expect(screen.getByText('~/projects')).toBeInTheDocument();
    expect(screen.getByText('hi')).toBeInTheDocument();
  });

  it('prefixes absolute paths too', () => {
    const { container } = render(<TerminalWindow title="/etc/motd" />);
    expect(titleBar(container).querySelector('.term-window-title')).toHaveTextContent(/^guest@petanque21st: \/etc\/motd$/);
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
    expect(titleBar(container).querySelector('.term-window-title')).toHaveTextContent(/^guest@petanque21st: ~$/);
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

describe('TerminalWindow window controls', () => {
  it('makes _ and □ real buttons when handlers are given', () => {
    const onMinimize = vi.fn();
    const onMaximize = vi.fn();
    render(
      <TerminalWindow title="~" onClose={vi.fn()} onMinimize={onMinimize} onMaximize={onMaximize}
        labels={{ close: 'Close shell', minimize: 'Minimize', maximize: 'Maximize', restore: 'Restore' }} />,
    );
    screen.getByRole('button', { name: 'Minimize' }).click();
    screen.getByRole('button', { name: 'Maximize' }).click();
    expect(onMinimize).toHaveBeenCalledTimes(1);
    expect(onMaximize).toHaveBeenCalledTimes(1);
  });

  it('labels the maximize button Restore and marks state while maximized', () => {
    render(
      <TerminalWindow title="~" onMaximize={vi.fn()} maximized
        labels={{ close: 'Close', minimize: 'Minimize', maximize: 'Maximize', restore: 'Restore' }} />,
    );
    expect(screen.getByRole('button', { name: 'Restore' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('double-clicking the title bar toggles maximize', () => {
    const onMaximize = vi.fn();
    const { container } = render(<TerminalWindow title="~" onMaximize={onMaximize} />);
    container.querySelector('.term-window-bar')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(onMaximize).toHaveBeenCalledTimes(1);
  });

  it('hides the body while minimized', () => {
    render(<TerminalWindow title="~" onMinimize={vi.fn()} minimized><p>body</p></TerminalWindow>);
    expect(screen.getByText('body').closest('.term-window-body')).toHaveAttribute('hidden');
  });

  it('interactive buttons are not inside an aria-hidden or pointer-events:none wrapper', () => {
    const { container } = render(<TerminalWindow title="~" onClose={vi.fn()} />);
    const wrap = container.querySelector('.term-window-buttons')!;
    expect(wrap).not.toHaveAttribute('aria-hidden');
    expect(wrap).toHaveClass('term-window-buttons-live');
  });
});
