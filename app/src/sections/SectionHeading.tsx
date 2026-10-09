import { Prompt } from '@/components/term';

/* ------------------------------------------------------------------ */
/*  Section heading — the shell command that "printed" the section,    */
/*  followed by a markdown-style `# TITLE`.                            */
/* ------------------------------------------------------------------ */

export default function SectionHeading({ command, title }: { command: string; title: string }) {
  return (
    <div className="mb-10 min-w-0">
      <Prompt command={command} />
      <h2 className="mt-3 font-mono font-bold text-[24px] md:text-[32px] leading-tight text-text break-words">
        <span aria-hidden="true" className="text-ansi-bright-green"># </span>
        {title}
      </h2>
    </div>
  );
}
