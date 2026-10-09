export default function Cursor({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`animate-blink-cursor text-ansi-bright-green ${className}`}>
      █
    </span>
  );
}
