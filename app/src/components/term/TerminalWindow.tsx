import type { ReactNode } from 'react';

interface TerminalWindowProps {
  /** Window title. Paths (`~…` or `/…`) render as `user@host: path`; anything else as-is. */
  title?: string;
  user?: string;
  host?: string;
  as?: 'section' | 'div' | 'article';
  className?: string;
  children?: ReactNode;
  /** When set, the `×` becomes a real button that calls this. */
  onClose?: () => void;
  /** Accessible label for the close button (only used with `onClose`). */
  closeLabel?: string;
}

/* -------------------------------------------------------------------------- */
/* Terminal-window card: GNOME/Ubuntu Terminal title bar + content body.       */
/* -------------------------------------------------------------------------- */

export default function TerminalWindow({
  title,
  user = 'guest',
  host = 'prommin',
  as: Tag = 'div',
  className = '',
  children,
  onClose,
  closeLabel = 'Close',
}: TerminalWindowProps) {
  const path = title === undefined ? '~' : title;
  const isPath = path.startsWith('~') || path.startsWith('/');
  const prefix = `${user}@${host}: `;
  const full = isPath ? `${prefix}${path}` : path;

  return (
    <Tag className={`term-window pointer-events-auto ${className}`}>
      <div className="term-window-bar">
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
        {onClose ? (
          <span className="term-window-buttons">
            <span className="term-window-btn term-window-btn-min" aria-hidden="true">_</span>
            <span className="term-window-btn term-window-btn-max" aria-hidden="true">□</span>
            <button
              type="button"
              className="term-window-btn term-window-btn-close cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ansi-bright-cyan"
              aria-label={closeLabel}
              title={closeLabel}
              onClick={onClose}
            >
              ×
            </button>
          </span>
        ) : (
          <span className="term-window-buttons" aria-hidden="true">
            <span className="term-window-btn term-window-btn-min">_</span>
            <span className="term-window-btn term-window-btn-max">□</span>
            <span className="term-window-btn term-window-btn-close">×</span>
          </span>
        )}
      </div>
      <div className="term-window-body">{children}</div>
    </Tag>
  );
}
