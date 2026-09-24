import { themeToggle } from './theme.js'

/**
 * The Aleph Garden site footer as an HTML string, so the landing page, which
 * is not an Astro page, and every project's documentation draw the same
 * markup. `footer.css` styles it.
 *
 * The lockups are passed in because each consumer serves them from its own
 * URL: Starlight through the asset pipeline, the landing from `/brand/`.
 * `source` adds one link under Source that points at what drew the page: the
 * documentation's "Edit this page", the landing's own view. `lastEdited`, the
 * date of the source's newest commit, is printed under it as a day in UTC.
 * The bottom row carries the appearance toggle, which `installTheme` wires.
 *
 * Every link opens at the top level: on the landing the footer sits inside a
 * rendered region, whose runtime would otherwise open a followed link as a
 * resource in place. Every value is escaped; none is trusted to be markup.
 *
 * @param {{ lockup: { light: string, dark: string }, source?: { href: string, text: string }, lastEdited?: Date }} options
 * @returns {string}
 */
export function footer({ lockup, source, lastEdited }) {
  const own = source ? `\n        ${link(source.href, source.text)}` : ''
  const edited = lastEdited ? `\n        ${editedOn(lastEdited)}` : ''
  return `<footer class="ag-footer">
    <div class="ag-footer-grid">
      <div class="ag-footer-lab">
        <a class="ag-footer-mark" href="https://aleph.garden/" target="_top" aria-label="Aleph Garden, home"><img class="ag-on-light" src="${escape(lockup.light)}" alt="" /><img class="ag-on-dark" src="${escape(lockup.dark)}" alt="" /></a>
        <p>A one-person lab by ${link('https://toph.so/', 'Christopher Mühl')}.</p>
      </div>
      <div class="ag-footer-col">
        <span class="ag-footer-head">Source</span>
        ${link('https://github.com/aleph-garden', 'github.com/aleph-garden')}${own}${edited}
      </div>
      <div class="ag-footer-col">
        <span class="ag-footer-head">Contact</span>
        ${link('mailto:toph@aleph.garden', 'toph@aleph.garden')}
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

/** @param {Date} date */
function editedOn(date) {
  const day = date.toISOString().slice(0, 10)
  return `<span class="ag-footer-meta">Last edited <time datetime="${day}">${day}</time></span>`
}
