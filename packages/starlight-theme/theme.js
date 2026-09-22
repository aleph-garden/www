/**
 * The reader's choice of appearance, shared by the landing page and every
 * project's documentation on aleph.garden, so a choice made on one page holds
 * on the next.
 *
 * The choice is stored under Starlight's own key with Starlight's own values
 * (`light`, `dark`, or empty for the browser's preference), so Starlight's
 * header select and this toggle read and write one setting. Both root
 * attributes are kept in step: `data-theme` always carries the resolved mode,
 * which Starlight's styles read, and `data-ag-theme` carries an explicit
 * choice only, which host-core's stylesheet reads before falling back to the
 * browser.
 */

export const THEME_STATES = /** @type {const} */ (['system', 'light', 'dark'])

/** @typedef {(typeof THEME_STATES)[number]} ThemeMode */

/** @type {Record<ThemeMode, string>} */
export const THEME_LABEL = {
  system: 'Appearance: following the browser. Switch to light.',
  light: 'Appearance: light. Switch to dark.',
  dark: 'Appearance: dark. Follow the browser instead.'
}

const KEY = 'starlight-theme'

/** @returns {ThemeMode} */
function stored() {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    // A browser that refuses storage still gets a working toggle for this load.
    return 'system'
  }
}

/** @param {ThemeMode} mode */
function apply(mode) {
  const root = document.documentElement
  const prefersLight = matchMedia('(prefers-color-scheme: light)').matches
  root.dataset.theme = mode === 'system' ? (prefersLight ? 'light' : 'dark') : mode
  if (mode === 'system') root.removeAttribute('data-ag-theme')
  else root.setAttribute('data-ag-theme', mode)
  // Starlight's header select, where the page has one.
  const provider = /** @type {any} */ (window).StarlightThemeProvider
  provider?.updatePickers(mode === 'system' ? 'auto' : mode)
}

/** @param {ThemeMode} mode */
function store(mode) {
  try {
    localStorage.setItem(KEY, mode === 'system' ? '' : mode)
  } catch {
    // The choice holds for this load and is not remembered.
  }
}

/**
 * The toggle's markup. All three glyphs are in it and the stylesheet shows
 * the one the button's state names, so the script never writes markup: the
 * landing's deployment requires trusted types for script.
 *
 * @returns {string}
 */
export function themeToggle() {
  return `<button class="ag-theme-toggle" type="button" data-mode="system" aria-label="${THEME_LABEL.system}">
        <svg data-mode="system" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.75a6.25 6.25 0 0 0 0 12.5z" fill="currentColor"/></svg>
        <svg data-mode="light" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="3.25" fill="currentColor"/><path d="M8 .75v2M8 13.25v2M.75 8h2M13.25 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <svg data-mode="dark" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M13.2 10.4A5.6 5.6 0 0 1 5.6 2.8a5.75 5.75 0 1 0 7.6 7.6z" fill="currentColor"/></svg>
      </button>`
}

/**
 * Wires the toggle in `root`, if there is one, and answers the teardown. It
 * follows a change made in Starlight's header select, and a change of the
 * browser's preference while the choice is left to the browser.
 *
 * @param {ParentNode} root
 * @returns {() => void}
 */
export function installTheme(root) {
  /** @type {HTMLButtonElement | null} */
  const button = root.querySelector('.ag-theme-toggle')
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
    store(mode)
    apply(mode)
    paint()
  }
  /** @param {Event} event */
  const fromSelect = (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('starlight-theme-select')) return
    mode = stored()
    apply(mode)
    paint()
  }
  const media = matchMedia('(prefers-color-scheme: light)')
  const fromBrowser = () => {
    if (mode === 'system') apply(mode)
  }

  button.addEventListener('click', advance)
  document.addEventListener('change', fromSelect)
  media.addEventListener('change', fromBrowser)
  return () => {
    button.removeEventListener('click', advance)
    document.removeEventListener('change', fromSelect)
    media.removeEventListener('change', fromBrowser)
  }
}
