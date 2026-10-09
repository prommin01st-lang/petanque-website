import type { CSSProperties } from 'react';
import Cursor from './Cursor';

interface PromptProps {
  user?: string;
  host?: string;
  path?: string;
  command?: string;
  typing?: boolean;
}

export default function Prompt({ user = 'guest', host = 'petanque21st', path = '~', command, typing = false }: PromptProps) {
  const style = command ? ({ '--chars': command.length } as CSSProperties) : undefined;
  return (
    <p className="font-mono text-sm m-0">
      <span className="font-bold text-prompt-user">{user}@{host}</span>
      <span className="text-text">:</span>
      <span className="font-bold text-prompt-path">{path}</span>
      <span className="text-text">$ </span>
      {command !== undefined && (
        <span className={typing ? 'term-typing' : undefined} style={typing ? style : undefined}>
          {command}
        </span>
      )}
      {typing && <Cursor />}
    </p>
  );
}
