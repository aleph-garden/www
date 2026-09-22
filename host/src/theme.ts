// The reader's choice of appearance. host-core's stylesheet resolves an
// explicit `data-ag-theme` on an ancestor first and the reader's own
// preference second, so the three states are dark, light, and no attribute at
// all, which hands the decision back to the browser.

export const THEME_STATES = ['system', 'light', 'dark'] as const
export type ThemeMode = (typeof THEME_STATES)[number]

const KEY = 'aleph-theme'

export const THEME_LABEL: Record<ThemeMode, string> = {
  system: 'Appearance: following the browser. Switch to light.',
  light: 'Appearance: light. Switch to dark.',
  dark: 'Appearance: dark. Follow the browser instead.'
}

function stored(): ThemeMode {
  try {
    const value = localStorage.getItem(KEY)
    return THEME_STATES.includes(value as ThemeMode) ? (value as ThemeMode) : 'system'
  } catch {
    // A browser that refuses storage still gets a working toggle for this load.
    return 'system'
  }
}

function apply(mode: ThemeMode): void {
  const root = document.documentElement
  if (mode === 'system') root.removeAttribute('data-ag-theme')
  else root.setAttribute('data-ag-theme', mode)
  try {
    if (mode === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, mode)
  } catch {
    // The choice holds for this load and is not remembered.
  }
}

/** Wires the one button in `root`, if it is there, and answers the teardown.
 *  All three glyphs sit in the markup and the stylesheet shows the one the
 *  button's own state names, so nothing here writes markup into the document:
 *  the deployment requires trusted types for script. */
export function installTheme(root: ParentNode): () => void {
  const button = root.querySelector<HTMLButtonElement>('.theme-toggle')
  if (!button) return () => {}

  let mode = stored()

  const paint = () => {
    button.dataset.mode = mode
    button.setAttribute('aria-label', THEME_LABEL[mode])
  }
  apply(mode)
  paint()

  const advance = () => {
    mode = THEME_STATES[(THEME_STATES.indexOf(mode) + 1) % THEME_STATES.length]
    apply(mode)
    paint()
  }
  button.addEventListener('click', advance)
  return () => button.removeEventListener('click', advance)
}
