import { useId, type ReactElement } from 'react';
import { cloneElement } from 'react';

interface FieldProps {
  label: string;
  error?: string | null;
  /** A single form control; it receives the generated `id` (unless it already has one) so the label targets it. */
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
}

export default function Field({ label, error, children }: FieldProps) {
  const autoId = useId();
  const id = children.props.id ?? autoId;
  const errId = `${id}-err`;
  const control = cloneElement(children, {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errId : undefined,
  });
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-mono text-xs text-text-dim before:content-['>'] before:text-ansi-bright-green before:mr-1">
        {label}
      </label>
      {control}
      {error && (
        <p id={errId} role="alert" className="font-mono text-xs text-danger m-0">
          ERR: {error}
        </p>
      )}
    </div>
  );
}
