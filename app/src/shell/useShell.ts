import { createContext, useContext } from 'react';

export interface ShellApi {
  open: boolean;
  toggle(): void;
  openShell(opener?: HTMLElement | null): void;
  close(): void;
}

export const ShellCtx = createContext<ShellApi | null>(null);

export function useShell(): ShellApi {
  const ctx = useContext(ShellCtx);
  if (!ctx) throw new Error('useShell must be used within ShellProvider');
  return ctx;
}
