/**
 * The Aleph Garden site footer as an HTML string, so the Starlight theme and
 * the landing page, which is not an Astro page, draw the same markup.
 *
 * The lockups are passed in because each consumer serves them from its own
 * URL: Starlight through the asset pipeline, the landing from `/brand/`.
 * `editUrl` adds an "Edit this page" link when the page has a source file.
 * Every value is escaped; none is trusted to be markup.
 *
 * @param {{ lockup: { light: string, dark: string }, editUrl?: string }} options
 * @returns {string}
 */
export function footer({ lockup, editUrl }) {
  const edit = editUrl ? `\n      <a href="${escape(editUrl)}">Edit this page</a>` : ''
  return `<footer class="ag-footer">
    <div class="ag-footer-lab">
      <a href="https://aleph.garden/" aria-label="Aleph Garden, home"><img class="ag-on-light" src="${escape(lockup.light)}" alt="" /><img class="ag-on-dark" src="${escape(lockup.dark)}" alt="" /></a>
      <span>A lab by <a href="https://github.com/tophcodes">Christopher M&uuml;hl</a>, worked on in the open.</span>
    </div>
    <div class="ag-footer-col">
      <span class="ag-footer-head">Source</span>
      <a href="https://github.com/aleph-garden">github.com/aleph-garden</a>${edit}
    </div>
    <div class="ag-footer-col">
      <span class="ag-footer-head">Contact</span>
      <a href="https://github.com/tophcodes">GitHub</a>
      <span class="ag-placeholder">[Impressum]</span>
    </div>
  </footer>`
}

/** @param {string} value */
function escape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
