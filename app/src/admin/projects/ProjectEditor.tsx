import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AsciiBox, ErrorLine, LoadingBar } from '@/components/term';
import { api } from '@/lib/api';
import type { AdminProject, ProjectInput } from '@/lib/types';
import { useI18n } from '@/i18n/I18nContext';
import Field from '../components/Field';
import LangTabs, { type EditLang } from '../components/LangTabs';
import TagsInput from '../components/TagsInput';
import ConfirmDelete from '../components/ConfirmDelete';
import { applyServerErrors, errorText, toAdminError } from '../errors';
import { slugify } from '../slugify';

const EMPTY: ProjectInput = {
  slug: '', nameEn: '', nameTh: '', descEn: '', descTh: '', tags: [], metric: '',
  repoUrl: '', demoUrl: '', flagship: false, published: true,
};

function toInput(p: AdminProject): ProjectInput {
  return {
    slug: p.slug, nameEn: p.nameEn, nameTh: p.nameTh, descEn: p.descEn, descTh: p.descTh, tags: p.tags,
    metric: p.metric, repoUrl: p.repoUrl, demoUrl: p.demoUrl, flagship: p.flagship, published: p.published,
  };
}

export default function ProjectEditor() {
  const { id } = useParams();
  const { t } = useI18n();
  const list = useQuery({ queryKey: ['admin', 'projects'], queryFn: api.admin.projects, enabled: id !== undefined });

  if (id === undefined) return <EditorForm key="new" />;
  if (list.isPending) return <LoadingBar label={t.common.loading} />;
  if (list.isError)
    return <ErrorLine error={list.error} onRetry={() => list.refetch()} retryLabel={t.common.retry} fallbackMessage={t.common.error} />;
  const project = list.data.items.find((p) => String(p.id) === id);
  if (!project) return <p className="font-mono text-sm text-danger">{t.admin.projects.notFound}</p>;
  return <EditorForm key={project.id} project={project} />;
}

function EditorForm({ project }: { project?: AdminProject }) {
  const { t } = useI18n();
  const f = t.admin.projects.fields;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProjectInput>(project ? toInput(project) : EMPTY);
  const [slugTouched, setSlugTouched] = useState(project !== undefined);
  const [lang, setLang] = useState<EditLang>('en');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) => setForm((s) => ({ ...s, [k]: v }));
  const nameKey = lang === 'en' ? 'nameEn' : 'nameTh';
  const descKey = lang === 'en' ? 'descEn' : 'descTh';

  function onName(v: string) {
    setForm((s) => ({
      ...s,
      [nameKey]: v,
      ...(lang === 'en' && !slugTouched ? { slug: slugify(v) } : {}),
    }));
  }

  function afterChange(message: string) {
    navigate('/admin/projects');
    toast.success(message);
    void qc.invalidateQueries({ queryKey: ['admin', 'projects'] });
    void qc.invalidateQueries({ queryKey: ['projects'] });
  }

  const save = useMutation({
    mutationFn: () => (project ? api.admin.updateProject(project.id, form) : api.admin.createProject(form)),
    onSuccess: () => afterChange(t.admin.saved),
    onError: (err) => {
      const handled = applyServerErrors(
        err,
        (f) => {
          setErrors(f);
          const first = Object.keys(f).find((k) => /^(name|desc)(En|Th)$/.test(k));
          if (first) setLang(first.endsWith('Th') ? 'th' : 'en');
        },
        t,
      );
      if (!handled) toast.error(errorText(toAdminError(err), t));
    },
  });

  const del = useMutation({
    mutationFn: () => api.admin.deleteProject(project!.id),
    onSuccess: () => {
      qc.setQueryData<{ items: AdminProject[] }>(['admin', 'projects'], (old) =>
        old ? { items: old.items.filter((p) => p.id !== project!.id) } : old,
      );
      afterChange(t.admin.deleted);
    },
    onError: (err) => toast.error(errorText(toAdminError(err), t)),
  });

  const rendered = new Set([nameKey, descKey, 'slug', 'tags', 'metric', 'repoUrl', 'demoUrl']);
  const hiddenErrors = Object.keys(errors).some((k) => !rendered.has(k));
  const errorLangs = (['en', 'th'] as const).filter((l) =>
    Object.keys(errors).some((k) => /^(name|desc)(En|Th)$/.test(k) && k.endsWith(l === 'en' ? 'En' : 'Th')),
  );

  return (
    <AsciiBox title={project ? t.admin.projects.editTitle : t.admin.projects.newTitle}>
      <form
        noValidate
        className="flex flex-col gap-4 font-mono"
        onSubmit={(e) => {
          e.preventDefault();
          setErrors({});
          save.mutate();
        }}
      >
        <LangTabs value={lang} onChange={setLang} thEmpty={!form.nameTh.trim() && !form.descTh.trim()} errorLangs={errorLangs} />
        {hiddenErrors && (
          <p role="alert" className="m-0 text-xs text-danger">
            ERR: {t.admin.fieldErrors}
          </p>
        )}
        <Field label={f.name} error={errors[nameKey]}>
          <input className="input-hud" value={form[nameKey]} onChange={(e) => onName(e.target.value)} />
        </Field>
        <Field label={f.description} error={errors[descKey]}>
          <textarea className="textarea-hud" rows={5} value={form[descKey]} onChange={(e) => set(descKey, e.target.value)} />
        </Field>
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
        <Field label={f.metric} error={errors.metric}>
          <input className="input-hud" value={form.metric} onChange={(e) => set('metric', e.target.value)} />
        </Field>
        <Field label={f.repoUrl} error={errors.repoUrl}>
          <input className="input-hud" value={form.repoUrl} onChange={(e) => set('repoUrl', e.target.value)} />
        </Field>
        <Field label={f.demoUrl} error={errors.demoUrl}>
          <input className="input-hud" value={form.demoUrl} onChange={(e) => set('demoUrl', e.target.value)} />
        </Field>
        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.flagship} onChange={(e) => set('flagship', e.target.checked)} />
            {f.flagship}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.published} onChange={(e) => set('published', e.target.checked)} />
            {f.published}
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-neon" disabled={save.isPending}>
            {save.isPending ? t.admin.projects.saving : t.admin.projects.save}
          </button>
          <button type="button" className="btn-neon-outline" onClick={() => navigate('/admin/projects')}>
            {t.admin.projects.cancel}
          </button>
          {project && (
            <span className="ml-auto">
              <ConfirmDelete slug={project.slug} onConfirm={() => del.mutate()} />
            </span>
          )}
        </div>
      </form>
    </AsciiBox>
  );
}
