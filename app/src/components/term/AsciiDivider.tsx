import type { CSSProperties } from 'react';

interface AsciiDividerProps {
  char?: string;
  label?: string;
}

export default function AsciiDivider({ char = '-', label }: AsciiDividerProps) {
  const style = { '--fill': JSON.stringify(char.repeat(200)) } as CSSProperties;
  return (
    <div className="ascii-divider" data-char={char} style={style} role="separator" aria-label={label}>
      <span className="ascii-divider-line" aria-hidden="true" />
      {label && <span className="ascii-divider-label">{label}</span>}
      {label && <span className="ascii-divider-line" aria-hidden="true" />}
    </div>
  );
}
