import type { ReactNode } from 'react';

interface AsciiBoxProps {
  title?: string;
  as?: 'section' | 'div' | 'article';
  className?: string;
  children?: ReactNode;
}

export default function AsciiBox({ title, as: Tag = 'div', className = '', children }: AsciiBoxProps) {
  return (
    <Tag className={`term-box pointer-events-auto ${className}`}>
      {title !== undefined && (
        <div className="term-box-head" aria-hidden={false}>
          <span className="text-text-dim">+--[ </span>
          <span className="term-box-title text-ansi-bright-cyan">{title}</span>
          <span className="text-text-dim"> ]</span>
        </div>
      )}
      <div className="term-box-body">{children}</div>
    </Tag>
  );
}
