export default function LoadingBar({ label = 'loading...' }: { label?: string }) {
  return (
    <div role="status" className="font-mono text-sm text-text-dim">
      <span>{label}</span> <span aria-hidden="true">[</span>
      <span aria-hidden="true" className="term-loading-bar text-ansi-bright-green" />
      <span aria-hidden="true">]</span>
    </div>
  );
}
