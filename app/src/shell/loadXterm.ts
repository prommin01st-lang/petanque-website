// loadXterm.ts — the only static entry to xterm; everything else imports types only.
export interface XtermModules {
  Terminal: typeof import('@xterm/xterm').Terminal;
  FitAddon: typeof import('@xterm/addon-fit').FitAddon;
  WebLinksAddon: typeof import('@xterm/addon-web-links').WebLinksAddon;
  UnicodeGraphemesAddon: typeof import('@xterm/addon-unicode-graphemes').UnicodeGraphemesAddon;
}

let cached: Promise<XtermModules> | null = null;

export function loadXterm(): Promise<XtermModules> {
  cached ??= Promise.all([
    import('@xterm/xterm'),
    import('@xterm/addon-fit'),
    import('@xterm/addon-web-links'),
    import('@xterm/addon-unicode-graphemes'),
    import('@xterm/xterm/css/xterm.css'),
  ]).then(([x, fit, links, graphemes]) => ({
    Terminal: x.Terminal,
    FitAddon: fit.FitAddon,
    WebLinksAddon: links.WebLinksAddon,
    UnicodeGraphemesAddon: graphemes.UnicodeGraphemesAddon,
  })).catch((err) => {
    cached = null;
    throw err;
  });
  return cached;
}
