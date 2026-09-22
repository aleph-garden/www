import { themeToggle } from './theme.js'

/**
 * The Aleph Garden site footer as an HTML string, so the landing page, which
 * is not an Astro page, and every project's documentation draw the same
 * markup. `footer.css` styles it.
 *
 * The lockups are passed in because each consumer serves them from its own
 * URL: Starlight through the asset pipeline, the landing from `/brand/`.
 * `source` adds one link under Source that points at what drew the page: the
 * documentation's "Edit this page", the landing's own view. The bottom row
 * carries the appearance toggle, which `installTheme` wires.
 *
 * Every link opens at the top level: on the landing the footer sits inside a
 * rendered region, whose runtime would otherwise open a followed link as a
 * resource in place. Every value is escaped; none is trusted to be markup.
 *
 * @param {{ lockup: { light: string, dark: string }, source?: { href: string, text: string } }} options
 * @returns {string}
 */
export function footer({ lockup, source }) {
  const own = source ? `\n        ${link(source.href, source.text)}` : ''
  return `<footer class="ag-footer">
    <div class="ag-footer-grid">
      <div class="ag-footer-lab">
        <a class="ag-footer-mark" href="https://aleph.garden/" target="_top" aria-label="Aleph Garden, home"><img class="ag-on-light" src="${escape(lockup.light)}" alt="" /><img class="ag-on-dark" src="${escape(lockup.dark)}" alt="" /></a>
        <p>A lab by ${link('https://github.com/tophcodes', 'Christopher Mühl')}, worked on in the open.</p>
      </div>
      <div class="ag-footer-col">
        <span class="ag-footer-head">Source</span>
        ${link('https://github.com/aleph-garden', 'github.com/aleph-garden')}${own}
      </div>
      <div class="ag-footer-col">
        <span class="ag-footer-head">Contact</span>
        ${link('https://github.com/tophcodes', 'GitHub')}
        <span class="ag-placeholder">[Impressum]</span>
      </div>
    </div>
    <div class="ag-footer-base">
      ${themeToggle()}
    </div>
  </footer>`
}

/** @param {string} href @param {string} text */
function link(href, text) {
  return `<a href="${escape(href)}" target="_top">${escape(text)}</a>`
}

/** @param {string} value */
function escape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
