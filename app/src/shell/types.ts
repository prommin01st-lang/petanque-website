import type { Project, PostSummary, Post } from '@/lib/types';
import type { Language, Translations } from '@/i18n/translations';
import type { SectionId } from '@/hooks/useActiveSection';

export type ShellOutput = string[]; // lines, may contain ANSI SGR + OSC-8

export interface ShellData {
  projects(signal?: AbortSignal): Promise<Project[]>;
  posts(signal?: AbortSignal): Promise<PostSummary[]>; // all published posts (paged through)
  post(slug: string, signal?: AbortSignal): Promise<Post | null>; // null on 404
}

export interface ShellContext {
  t: Translations;
  lang: Language;
  cwd: string;
  history: readonly string[];
  data: ShellData;
  signal: AbortSignal;
  setCwd(path: string): void;
  setLang(l: Language): void;
  goSection(id: SectionId): void;
  navigate(path: string): void;
  openExternal(url: string): void;
  clear(): void;
  close(): void;
}

export interface Command {
  name: string;
  /** Hidden commands run normally but are left out of help, Tab completion and suggestions. */
  hidden?: boolean;
  summary: (t: Translations) => string;
  run(args: string[], ctx: ShellContext): Promise<ShellOutput> | ShellOutput;
}
