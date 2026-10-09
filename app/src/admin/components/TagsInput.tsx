import { useState, type KeyboardEvent } from 'react';
import { useI18n } from '@/i18n/I18nContext';

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  max?: number;
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

const MAX_LEN = 32;

export default function TagsInput({ value, onChange, max = 12, ...rest }: TagsInputProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState<string | null>(null);

  function commit(text = draft) {
    const next = [...value];
    const rejected: string[] = [];
    let tooLong = false;
    for (const raw of text.split(',')) {
      const tag = raw.trim();
      if (!tag) continue;
      if (tag.length > MAX_LEN) {
        tooLong = true;
        rejected.push(tag);
        continue;
      }
      if (next.length >= max || next.some((x) => x.toLowerCase() === tag.toLowerCase())) continue;
      next.push(tag);
    }
    setDraft(rejected.join(','));
    setHint(tooLong ? t.admin.tags.tooLong : null);
    if (next.length !== value.length) onChange(next);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  const full = value.length >= max;

  return (
    <div className="flex flex-wrap items-center gap-2 input-hud">
      {value.map((tag) => (
        <span key={tag} className="chip">
          {tag}{' '}
          <button
            type="button"
            aria-label={`${t.admin.tags.remove} ${tag}`}
            onClick={() => onChange(value.filter((x) => x !== tag))}
          >
            [x]
          </button>
        </span>
      ))}
      <input
        {...rest}
        value={draft}
        onChange={(e) => (e.target.value.includes(',') ? commit(e.target.value) : setDraft(e.target.value))}
        onKeyDown={onKeyDown}
        onBlur={() => commit()}
        placeholder={full ? t.admin.tags.full : t.admin.tags.hint}
        readOnly={full}
        className="min-w-[8ch] flex-1 bg-transparent font-mono text-sm outline-none"
      />
      {hint && (
        <span role="alert" className="basis-full text-xs text-danger">
          {hint}
        </span>
      )}
    </div>
  );
}
