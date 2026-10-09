/** Pre-generated with figlet (Standard font): PETANQUE21ST */
export const FIGLET_NAME = `
  ____  _____ _____  _    _   _  ___  _   _ _____ ____  _ ____ _____
 |  _ \\| ____|_   _|/ \\  | \\ | |/ _ \\| | | | ____|___ \\/ / ___|_   _|
 | |_) |  _|   | | / _ \\ |  \\| | | | | | | |  _|   __) | \\___ \\ | |
 |  __/| |___  | |/ ___ \\| |\\  | |_| | |_| | |___ / __/| |___) || |
 |_|   |_____| |_/_/   \\_\\_| \\_|\\__\\_\\\\___/|_____|_____|_|____/ |_|
`.replace(/^\n|\n$/g, "");

export default function FigletTitle({ text, art }: { text: string; art: string }) {
  return (
    <h1 aria-label={text} className="font-mono text-ansi-bright-cyan text-glow-cyan">
      <pre aria-hidden="true" className="hidden sm:block m-0 overflow-x-auto text-[clamp(6px,1.05vw,14px)] leading-tight">
        {art}
      </pre>
      <span aria-hidden="true" className="block sm:hidden text-3xl font-bold tracking-tight">
        {text}
      </span>
    </h1>
  );
}
