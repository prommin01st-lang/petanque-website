import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TerminalWindow, ErrorLine, LoadingBar } from '@/components/term';
import Markdown from '@/components/Markdown';
import { api, ApiError } from '@/lib/api';
import type { AdminPost, PostInput, PostStatus } from '@/lib/types';
import { useI18n } from '@/i18n/I18nContext';
import Field from '../components/Field';
import LangTabs, { type EditLang } from '../components/LangTabs';
import TagsInput from '../components/TagsInput';
import ConfirmDelete from '../components/ConfirmDelete';
import { applyServerErrors, errorText, toAdminError } from '../errors';
import { slugify } from '../slugify';
import { useUpload } from '../media/useUpload';
import { useDirtyGuard } from '../dirtyGuard';
import { fmtLocal } from '../time';
import { useAutosave, writeDraft } from './useAutosave';
import { imageMarkdown, indentLines, insertAtCursor } from './insertAtCursor';

/* ------------------------------------------------------------------ */
/*  Form value helpers                                                */
/* ------------------------------------------------------------------ */

const EMPTY: PostInput = {
  slug: '', titleEn: '', titleTh: '', excerptEn: '', excerptTh: '', bodyEn: '', bodyTh: '',
  tags: [], coverMediaId: null, status: 'draft',
};

function toInput(p: AdminPost): PostInput {
  return {
    slug: p.slug, titleEn: p.titleEn, titleTh: p.titleTh, excerptEn: p.excerptEn, excerptTh: p.excerptTh,
    bodyEn: p.bodyEn, bodyTh: p.bodyTh, tags: p.tags, coverMediaId: p.coverMediaId, status: p.status,
  };
}

/** Coerces an autosaved (untrusted, possibly stale-shaped) draft into a PostInput. */
function fromDraft(v: unknown): PostInput | null {
  if (!v || typeof v !== 'object') return null;
  const d = v as Record<string, unknown>;
  const str = (k: keyof PostInput) => (typeof d[k] === 'string' ? (d[k] as string) : '');
  return {
    slug: str('slug'), titleEn: str('titleEn'), titleTh: str('titleTh'), excerptEn: str('excerptEn'),
    excerptTh: str('excerptTh'), bodyEn: str('bodyEn'), bodyTh: str('bodyTh'),
    tags: Array.isArray(d.tags) ? d.tags.filter((x): x is string => typeof x === 'string') : [],
    coverMediaId: typeof d.coverMediaId === 'number' ? d.coverMediaId : null,
    status: d.status === 'published' ? 'published' : 'draft',
  };
}

/** Key-order-independent fingerprint for dirty / restore comparisons. */
function canon(p: PostInput): string {
  return JSON.stringify([
    p.slug, p.titleEn, p.titleTh, p.excerptEn, p.excerptTh, p.bodyEn, p.bodyTh, p.tags, p.coverMediaId, p.status,
  ]);
}

const LANG_FIELD = /^(title|excerpt|body)(En|Th)$/;

/* ------------------------------------------------------------------ */
/*  Viewport: side-by-side panes at ≥ 1024px                          */
/* ------------------------------------------------------------------ */

const WIDE = '(min-width: 1024px)';
function subscribeWide(cb: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const m = window.matchMedia(WIDE);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
}
// No matchMedia (jsdom) → render both panes.
const getWide = () => typeof window.matchMedia !== 'function' || window.matchMedia(WIDE).matches;

function imageFiles(list: ArrayLike<File> | null | undefined): File[] {
  return Array.from(list ?? []).filter((f) => f.type.startsWith('image/'));
}

/* ------------------------------------------------------------------ */
/*  Route component                                                   */
/* ------------------------------------------------------------------ */

export default function PostEditor() {
  const { id } = useParams();
  const { t } = useI18n();
  const postId = id === undefined ? undefined : Number(id);
  const valid = postId !== undefined && Number.isInteger(postId) && postId > 0;
  const q = useQuery({
    queryKey: ['admin', 'post', postId],
    queryFn: () => api.admin.getPost(postId!),
    enabled: valid,
  });

  if (postId === undefined) return <EditorForm key="new" />;
  const notFound = <p className="font-mono text-sm text-danger">{t.admin.posts.notFound}</p>;
  if (!valid) return notFound;
  if (q.isPending) return <LoadingBar label={t.common.loading} />;
  if (q.isError) {
    if (q.error instanceof ApiError && q.error.status === 404) return notFound;
    return <ErrorLine error={q.error} onRetry={() => q.refetch()} retryLabel={t.common.retry} fallbackMessage={t.common.error} />;
  }
  return <EditorForm key={q.data.id} post={q.data} />;
}

/* ------------------------------------------------------------------ */
/*  Editor                                                            */
/* ------------------------------------------------------------------ */

function EditorForm({ post }: { post?: AdminPost }) {
  const { t, lang: uiLang } = useI18n();
  const p = t.admin.posts;
  const f = p.fields;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { uploadFiles, uploading } = useUpload();
  const media = useQuery({ queryKey: ['admin', 'media'], queryFn: api.admin.media });

  const [baseline, setBaseline] = useState<PostInput>(() => (post ? toInput(post) : EMPTY));
  const [form, setForm] = useState<PostInput>(baseline);
  const [slugTouched, setSlugTouched] = useState(post !== undefined);
  const [lang, setLang] = useState<EditLang>('en');
  const [pane, setPane] = useState<'write' | 'preview'>('write');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [restoreHandled, setRestoreHandled] = useState(false);
  const wide = useSyncExternalStore(subscribeWide, getWide);

  const dirty = canon(form) !== canon(baseline);
  const autosave = useAutosave<PostInput>(`draft:post:${post?.id ?? 'new'}`, form, dirty);
  const draft = fromDraft(autosave.restore);
  const showRestore = !restoreHandled && draft !== null && canon(draft) !== canon(baseline);
  const leave = useDirtyGuard(dirty, t.admin.leave.confirm);

  const formRef = useRef<HTMLFormElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const selection = useRef<[number, number] | null>(null);
  const langRef = useRef(lang);
  const latestForm = useRef(form);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);
  useEffect(() => {
    latestForm.current = form;
  }, [form]);

  // Restore the caret/selection after a programmatic edit of the body.
  useLayoutEffect(() => {
    const ta = bodyRef.current;
    if (selection.current !== null && ta) {
      ta.setSelectionRange(selection.current[0], selection.current[1]);
      selection.current = null;
    }
  }, [form]);

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const set = <K extends keyof PostInput>(k: K, v: PostInput[K]) => setForm((s) => ({ ...s, [k]: v }));
  const sfx = lang === 'en' ? 'En' : 'Th';
  const titleKey = `title${sfx}` as const;
  const excerptKey = `excerpt${sfx}` as const;
  const bodyKey = `body${sfx}` as const;

  function onTitle(v: string) {
    setForm((s) => ({ ...s, [titleKey]: v, ...(lang === 'en' && !slugTouched ? { slug: slugify(v) } : {}) }));
  }

  /** Inserts at the body textarea's selection, or appends when the user switched language meanwhile. */
  function insertBody(text: string, key = bodyKey, forLang = lang) {
    const ta = bodyRef.current;
    if (ta && langRef.current === forLang) {
      const at = ta.selectionStart + text.length;
      selection.current = [at, at];
      set(key, insertAtCursor(ta, text));
    } else {
      setForm((s) => ({ ...s, [key]: s[key] && !s[key].endsWith('\n') ? `${s[key]}\n${text}` : s[key] + text }));
    }
  }

  async function uploadAndInsert(files: File[]) {
    const key = bodyKey;
    const forLang = lang;
    const snippets: string[] = [];
    for (const file of files) {
      const [item] = await uploadFiles([file]);
      if (item) snippets.push(imageMarkdown(file.name, item.url));
    }
    if (snippets.length > 0) insertBody(snippets.join('\n'), key, forLang);
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const files = imageFiles(e.clipboardData?.files);
    // Rich copies (e.g. from a web page) carry text alongside an image: let the text paste normally.
    const hasText = Array.from(e.clipboardData?.types ?? []).includes('text/plain');
    if (files.length === 0 || hasText) return;
    e.preventDefault();
    void uploadAndInsert(files);
  }

  function onDrop(e: DragEvent<HTMLTextAreaElement>) {
    const files = imageFiles(e.dataTransfer?.files);
    if (files.length === 0) return;
    e.preventDefault();
    void uploadAndInsert(files);
  }

  function onBodyKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      const ta = e.currentTarget;
      if (ta.selectionStart !== ta.selectionEnd) {
        // Indent the selected lines instead of replacing the selection.
        const r = indentLines(ta.value, ta.selectionStart, ta.selectionEnd);
        selection.current = [r.start, r.end];
        set(bodyKey, r.value);
      } else {
        insertBody('  ');
      }
    }
  }

  function restoreDraft() {
    if (!draft) return;
    setForm(draft);
    setSlugTouched(post !== undefined || draft.slug !== slugify(draft.titleEn));
    setRestoreHandled(true);
  }

  function invalidate(slugs: string[]) {
    void qc.invalidateQueries({ queryKey: ['admin', 'posts'] });
    void qc.invalidateQueries({ queryKey: ['posts'] });
    for (const s of new Set(slugs.filter(Boolean))) void qc.invalidateQueries({ queryKey: ['post', s] });
  }

  const save = useMutation({
    mutationFn: (input: PostInput) => (post ? api.admin.updatePost(post.id, input) : api.admin.createPost(input)),
    onSuccess: (saved, input) => {
      autosave.clear();
      qc.setQueryData(['admin', 'post', saved.id], saved);
      if (!post) {
        // Edits typed while the create request was in flight would be lost by the remount:
        // hand them to the new editor as an autosaved draft so its restore banner offers them.
        if (canon(latestForm.current) !== canon(input)) writeDraft(`draft:post:${saved.id}`, latestForm.current);
        navigate(`/admin/posts/${saved.id}`, { replace: true });
      } else {
        const next = toInput(saved);
        // Adopt the server's normalized value unless the user kept typing during the save.
        setForm((cur) => (canon(cur) === canon(input) ? next : cur));
        setBaseline(next);
      }
      toast.success(t.admin.saved);
      invalidate([saved.slug, baseline.slug]);
    },
    onError: (err) => {
      if (err instanceof ApiError && (err.status === 413 || err.code === 'too_large')) {
        setFormError(p.tooLarge);
        return;
      }
      const handled = applyServerErrors(
        err,
        (fields) => {
          setErrors(fields);
          const first = Object.keys(fields).find((k) => LANG_FIELD.test(k));
          if (first) setLang(first.endsWith('Th') ? 'th' : 'en');
        },
        t,
      );
      if (!handled) toast.error(errorText(toAdminError(err), t));
    },
  });

  const del = useMutation({
    mutationFn: () => api.admin.deletePost(post!.id),
    onSuccess: () => {
      autosave.clear();
      navigate('/admin/posts');
      toast.success(t.admin.deleted);
      qc.removeQueries({ queryKey: ['admin', 'post', post!.id] });
      invalidate([post!.slug, baseline.slug]);
    },
    onError: (err) => toast.error(errorText(toAdminError(err), t)),
  });

  const rendered = new Set<string>([titleKey, excerptKey, bodyKey, 'slug', 'tags', 'coverMediaId', 'status']);
  const hiddenErrors = Object.keys(errors).some((k) => !rendered.has(k));
  const errorLangs = (['en', 'th'] as const).filter((l) =>
    Object.keys(errors).some((k) => LANG_FIELD.test(k) && k.endsWith(l === 'en' ? 'En' : 'Th')),
  );
  const thEmpty = !form.titleTh.trim() && !form.excerptTh.trim() && !form.bodyTh.trim();
  const showWrite = wide || pane === 'write';
  const showPreview = wide || pane === 'preview';

  return (
    <TerminalWindow title={post ? p.editTitle : p.newTitle} user="admin">
      {showRestore && draft && autosave.savedAt !== null && (
        <div role="status" className="mb-4 flex flex-wrap items-center gap-3 border border-warn/60 px-3 py-2 font-mono text-sm text-warn">
          <span>{p.draftFound.replace('{time}', new Date(autosave.savedAt).toLocaleString())}</span>
          <button type="button" className="link-neon" onClick={restoreDraft}>{p.restore}</button>
          <button
            type="button"
            className="text-text-dim hover:text-text"
            onClick={() => {
              autosave.discard();
              setRestoreHandled(true);
            }}
          >
            {p.discard}
          </button>
        </div>
      )}
      <form
        ref={formRef}
        noValidate
        className="flex flex-col gap-4 font-mono"
        onSubmit={(e) => {
          e.preventDefault();
          if (save.isPending) return;
          setErrors({});
          setFormError(null);
          save.mutate(form);
        }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <LangTabs value={lang} onChange={setLang} thEmpty={thEmpty} errorLangs={errorLangs} />
          {dirty && <span className="text-xs text-warn">* {p.unsaved}</span>}
        </div>
        {hiddenErrors && (
          <p role="alert" className="m-0 text-xs text-danger">
            ERR: {t.admin.fieldErrors}
          </p>
        )}
        <Field label={f.title} error={errors[titleKey]}>
          <input className="input-hud" value={form[titleKey]} onChange={(e) => onTitle(e.target.value)} />
        </Field>
        <Field label={f.excerpt} error={errors[excerptKey]}>
          <textarea className="textarea-hud" rows={2} value={form[excerptKey]} onChange={(e) => set(excerptKey, e.target.value)} />
        </Field>

        {!wide && (
          <div role="tablist" aria-label={p.previewLabel} className="flex gap-2 text-sm">
            {(['write', 'preview'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={pane === k}
                onClick={() => setPane(k)}
                className={pane === k ? 'text-ansi-bright-cyan' : 'text-text-dim hover:text-text'}
              >
                {p[k]}
              </button>
            ))}
          </div>
        )}
        <div className={wide ? 'grid grid-cols-2 gap-4' : 'flex flex-col'}>
          {showWrite && (
            <div className="flex min-w-0 flex-col gap-1">
              <Field label={f.body} error={errors[bodyKey]}>
                <textarea
                  ref={bodyRef}
                  className="textarea-hud min-h-[24rem] font-mono text-sm"
                  rows={20}
                  spellCheck={false}
                  value={form[bodyKey]}
                  onChange={(e) => set(bodyKey, e.target.value)}
                  onKeyDown={onBodyKeyDown}
                  onPaste={onPaste}
                  onDrop={onDrop}
                  onDragOver={(e) => {
                    if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
                  }}
                />
              </Field>
              <p className="m-0 text-xs text-text-dim">{uploading ? p.uploading : p.bodyHint}</p>
            </div>
          )}
          {showPreview && (
            <section aria-label={p.previewLabel} className="min-w-0 overflow-auto border border-hud-border p-3">
              {form[bodyKey].trim() ? (
                <Markdown source={form[bodyKey]} />
              ) : (
                <p className="m-0 text-sm text-text-dim">{p.previewEmpty}</p>
              )}
            </section>
          )}
        </div>

        <Field label={f.slug} error={errors.slug}>
          <input
            className="input-hud"
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set('slug', e.target.value);
            }}
          />
        </Field>
        <Field label={f.tags} error={errors.tags}>
          <TagsInput value={form.tags} onChange={(v) => set('tags', v)} />
        </Field>

        <fieldset className="flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-xs text-text-dim before:mr-1 before:text-ansi-bright-green before:content-['>']">{f.cover}</legend>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={form.coverMediaId === null}
              onClick={() => set('coverMediaId', null)}
              className={`h-16 px-3 text-sm border ${form.coverMediaId === null ? 'border-ansi-bright-cyan text-ansi-bright-cyan' : 'border-hud-border text-text-dim'}`}
            >
              {p.coverNone}
            </button>
            {media.data?.items.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={form.coverMediaId === m.id}
                aria-label={m.originalName || m.filename}
                title={m.originalName || m.filename}
                onClick={() => set('coverMediaId', m.id)}
                className={`h-16 w-16 overflow-hidden border-2 ${form.coverMediaId === m.id ? 'border-ansi-bright-cyan' : 'border-hud-border'}`}
              >
                <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
            {media.data && media.data.items.length === 0 && <span className="text-xs text-text-dim">{p.coverEmpty}</span>}
          </div>
          {errors.coverMediaId && <p role="alert" className="m-0 text-xs text-danger">ERR: {errors.coverMediaId}</p>}
        </fieldset>

        <fieldset className="flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-xs text-text-dim before:mr-1 before:text-ansi-bright-green before:content-['>']">{f.status}</legend>
          <div className="flex gap-3 text-sm">
            {(['draft', 'published'] as PostStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={form.status === s}
                onClick={() => set('status', s)}
                className={form.status === s ? (s === 'published' ? 'text-ansi-bright-green' : 'text-ansi-bright-cyan') : 'text-text-dim hover:text-text'}
              >
                {p.status[s]}
              </button>
            ))}
          </div>
          <p className="m-0 text-xs text-text-dim">
            {post?.publishedAt ? `${p.publishedAt} ${fmtLocal(post.publishedAt, uiLang)}` : p.neverPublished}
          </p>
          {errors.status && <p role="alert" className="m-0 text-xs text-danger">ERR: {errors.status}</p>}
        </fieldset>

        {formError && (
          <p role="alert" className="m-0 text-sm text-danger">
            ERR: {formError}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-neon" disabled={save.isPending}>
            {save.isPending ? p.saving : p.save}
          </button>
          <button type="button" className="btn-neon-outline" onClick={() => leave('/admin/posts')}>
            {p.cancel}
          </button>
          {post && (
            <span className="ml-auto">
              <ConfirmDelete slug={post.slug} onConfirm={() => del.mutate()} />
            </span>
          )}
        </div>
      </form>
    </TerminalWindow>
  );
}
