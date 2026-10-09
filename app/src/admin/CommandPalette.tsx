import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/I18nContext';

/* ------------------------------------------------------------------ */
/*  Command parsing                                                    */
/* ------------------------------------------------------------------ */

const SECTIONS = ['projects', 'posts', 'media', 'settings', 'audit'] as const;

export interface CommandContext {
  projects: { id: number; slug: string }[];
  posts: { id: number; slug: string }[];
}

export type CommandResult = { to: string } | { action: 'logout' } | null;

// parseCommand is part of this module's contract (brief/tests import it from here).
// eslint-disable-next-line react-refresh/only-export-components
export function parseCommand(input: string, ctx: CommandContext): CommandResult {
  const text = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (text === 'new post') return { to: '/admin/posts/new' };
  if (text === 'new project') return { to: '/admin/projects/new' };
  if (text === 'logout') return { action: 'logout' };
  if (text.startsWith('edit ')) {
    const slug = text.slice(5);
    const project = ctx.projects.find((p) => p.slug === slug);
    if (project) return { to: `/admin/projects/${project.id}` };
    const post = ctx.posts.find((p) => p.slug === slug);
    if (post) return { to: `/admin/posts/${post.id}` };
    return null;
  }
  const section = text.startsWith('goto ') ? text.slice(5) : text;
  if ((SECTIONS as readonly string[]).includes(section)) return { to: `/admin/${section}` };
  return null;
}

/* ------------------------------------------------------------------ */
/*  Palette                                                            */
/* ------------------------------------------------------------------ */

interface CommandPaletteProps {
  /** Guarded navigation (honours the editor's unsaved-changes confirmation). */
  onNavigate: (to: string) => void;
  onLogout: () => void;
}

interface Suggestion {
  text: string;
  hint: string;
}

export default function CommandPalette({ onNavigate, onLogout }: CommandPaletteProps) {
  const { t } = useI18n();
  const p = t.admin.palette;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [active, setActive] = useState(-1);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Fetched lazily: only once the palette has been opened (reuses the list pages' cache keys).
  const projects = useQuery({ queryKey: ['admin', 'projects'], queryFn: () => api.admin.projects(), enabled: open });
  const posts = useQuery({ queryKey: ['admin', 'posts', undefined], queryFn: () => api.admin.posts(), enabled: open });
  const ctx = useMemo<CommandContext>(
    () => ({ projects: projects.data?.items ?? [], posts: posts.data?.items ?? [] }),
    [projects.data, posts.data],
  );

  const suggestions = useMemo<Suggestion[]>(() => {
    const all: Suggestion[] = [
      { text: 'new post', hint: p.cmd.newPost },
      { text: 'new project', hint: p.cmd.newProject },
      ...SECTIONS.map((s) => ({ text: `goto ${s}`, hint: p.cmd.goto })),
      ...ctx.projects.map((x) => ({ text: `edit ${x.slug}`, hint: p.cmd.edit })),
      ...ctx.posts.filter((x) => !ctx.projects.some((pr) => pr.slug === x.slug)).map((x) => ({ text: `edit ${x.slug}`, hint: p.cmd.edit })),
      { text: 'logout', hint: p.cmd.logout },
    ];
    const q = input.trim().toLowerCase();
    return q ? all.filter((s) => s.text.startsWith(q)) : all;
  }, [ctx, input, p]);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) return;
    setInput('');
    setActive(-1);
    setFailed(null);
  }

  function run(text: string) {
    const result = parseCommand(text, ctx);
    if (!result) {
      setFailed(text.trim());
      return;
    }
    changeOpen(false);
    if ('to' in result) onNavigate(result.to);
    else onLogout();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length === 0) return;
      const n = suggestions.length;
      const down = e.key === 'ArrowDown';
      // From no selection, Down picks the first item and Up the last.
      setActive((a) => (a < 0 ? (down ? 0 : n - 1) : (a + (down ? 1 : -1) + n) % n));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && suggestions[active]) run(suggestions[active].text);
      else if (input.trim()) run(input);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="bg-surface border-hud-border font-mono top-[20%] translate-y-0 gap-3">
        <DialogTitle className="text-ansi-bright-cyan text-sm">{p.title}</DialogTitle>
        <DialogDescription className="sr-only">{p.description}</DialogDescription>
        <div className="flex items-center gap-2 border border-hud-border px-2 py-1">
          <span className="text-ansi-bright-green" aria-hidden="true">&gt;</span>
          <input
            autoFocus
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls="palette-list"
            aria-activedescendant={active >= 0 ? `palette-opt-${active}` : undefined}
            aria-label={p.title}
            value={input}
            placeholder={p.placeholder}
            onChange={(e) => {
              setInput(e.target.value);
              setActive(-1);
              setFailed(null);
            }}
            onKeyDown={onKeyDown}
            className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-dim"
          />
        </div>
        {failed !== null && (
          <p role="alert" className="m-0 text-xs text-danger">
            ERR: {p.notFound}: {failed}
          </p>
        )}
        <ul id="palette-list" role="listbox" aria-label={p.listLabel} className="m-0 max-h-60 list-none overflow-y-auto p-0 text-sm">
          {suggestions.map((s, i) => (
            <li
              key={s.text}
              id={`palette-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => run(s.text)}
              className={`flex cursor-pointer justify-between gap-3 px-2 py-1 ${i === active ? 'bg-ansi-bright-cyan text-bg' : 'text-text'}`}
            >
              <span>{s.text}</span>
              <span className={i === active ? 'text-bg' : 'text-text-dim'}>{s.hint}</span>
            </li>
          ))}
        </ul>
        <p className="m-0 text-xs text-text-dim">{p.hint}</p>
      </DialogContent>
    </Dialog>
  );
}
