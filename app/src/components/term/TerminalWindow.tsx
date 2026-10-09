import type { ReactNode } from 'react';

export interface WindowLabels {
  close: string;
  minimize: string;
  maximize: string;
  restore: string;
}

interface TerminalWindowProps {
  /** Window title. Paths (`~…` or `/…`) render as `user@host: path`; anything else as-is. */
  title?: string;
  user?: string;
  host?: string;
  as?: 'section' | 'div' | 'article';
  className?: string;
  children?: ReactNode;
  /** Each handler turns its title-bar button into a real button; without handlers the buttons are decorative. */
  onClose?: () => void;
  onMinimize?: () => void;
  /** Also bound to double-clicking the title bar (GNOME behaviour). */
  onMaximize?: () => void;
  minimized?: boolean;
  maximized?: boolean;
  /** Accessible labels for the live buttons. */
  labels?: Partial<WindowLabels>;
  /** @deprecated use labels.close */
  closeLabel?: string;
}

const DEFAULT_LABELS: WindowLabels = { close: 'Close', minimize: 'Minimize', maximize: 'Maximize', restore: 'Restore' };
const LIVE_BTN =
  'term-window-btn cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ansi-bright-cyan';

/* -------------------------------------------------------------------------- */
/* Terminal-window card: GNOME/Ubuntu Terminal title bar + content body.       */
/* -------------------------------------------------------------------------- */

export default function TerminalWindow({
  title,
  user = 'guest',
  host = 'petanque21st',
  as: Tag = 'div',
  className = '',
  children,
  onClose,
  onMinimize,
  onMaximize,
  minimized = false,
  maximized = false,
  labels,
  closeLabel,
}: TerminalWindowProps) {
  const path = title === undefined ? '~' : title;
  const isPath = path.startsWith('~') || path.startsWith('/');
  const prefix = `${user}@${host}: `;
  const full = isPath ? `${prefix}${path}` : path;
  const l: WindowLabels = { ...DEFAULT_LABELS, ...(closeLabel ? { close: closeLabel } : {}), ...labels };
  const live = Boolean(onClose || onMinimize || onMaximize);
  const maxLabel = maximized ? l.restore : l.maximize;

  return (
    <Tag className={`term-window pointer-events-auto ${className}`}>
      <div className="term-window-bar" onDoubleClick={onMaximize}>
        <span className="term-window-title" title={full}>
          {isPath ? (
            <>
              <span className="term-window-userhost">{prefix}</span>
              <span className="term-window-path">{path}</span>
            </>
          ) : (
            path
          )}
        </span>
        {live ? (
          <span className="term-window-buttons term-window-buttons-live">
            {onMinimize ? (
              <button type="button" className={`${LIVE_BTN} term-window-btn-min`} aria-label={l.minimize} title={l.minimize}
                aria-pressed={minimized} onClick={onMinimize} onDoubleClick={(e) => e.stopPropagation()}>_</button>
            ) : (
              <span className="term-window-btn term-window-btn-min" aria-hidden="true">_</span>
            )}
            {onMaximize ? (
              <button type="button" className={`${LIVE_BTN} term-window-btn-max`} aria-label={maxLabel} title={maxLabel}
                aria-pressed={maximized} onClick={onMaximize} onDoubleClick={(e) => e.stopPropagation()}>□</button>
            ) : (
              <span className="term-window-btn term-window-btn-max" aria-hidden="true">□</span>
            )}
            {onClose ? (
              <button type="button" className={`${LIVE_BTN} term-window-btn-close`} aria-label={l.close} title={l.close}
                onClick={onClose} onDoubleClick={(e) => e.stopPropagation()}>×</button>
            ) : (
              <span className="term-window-btn term-window-btn-close" aria-hidden="true">×</span>
            )}
          </span>
        ) : (
          <span className="term-window-buttons" aria-hidden="true">
            <span className="term-window-btn term-window-btn-min">_</span>
            <span className="term-window-btn term-window-btn-max">□</span>
            <span className="term-window-btn term-window-btn-close">×</span>
          </span>
        )}
      </div>
      <div className="term-window-body" hidden={minimized}>{children}</div>
    </Tag>
  );
}
