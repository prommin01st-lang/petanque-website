/** Pre-generated with figlet (Standard font): PROMMIN.L */
export const FIGLET_NAME = `
  ____  ____   ___  __  __ __  __ ___ _   _   _
 |  _ \\|  _ \\ / _ \\|  \\/  |  \\/  |_ _| \\ | | | |
 | |_) | |_) | | | | |\\/| | |\\/| || ||  \\| | | |
 |  __/|  _ <| |_| | |  | | |  | || || |\\  |_| |___
 |_|   |_| \\_\\\\___/|_|  |_|_|  |_|___|_| \\_(_)_____|
`.replace(/^\n|\n$/g, "");

export default function FigletTitle({ text, art }: { text: string; art: string }) {
  return (
    <h1 aria-label={text} className="font-mono text-ansi-bright-cyan text-glow-cyan">
      <pre aria-hidden="true" className="hidden sm:block m-0 overflow-x-auto text-[clamp(8px,1.6vw,14px)] leading-tight">
        {art}
      </pre>
      <span aria-hidden="true" className="block sm:hidden text-3xl font-bold tracking-tight">
        {text}
      </span>
    </h1>
  );
}
