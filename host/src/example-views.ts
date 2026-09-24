import { about, escapeHtml, type View } from '@aleph-garden/vitrine'

// Picked for every CSV file. No RDF involved.
export const listView: View = {
  id: 'https://example.org/views/list',
  when: [{ contentType: 'text/csv' }],
  async render(resource) {
    const rows = String(resource.body).trim().split('\n').slice(1)
    const items = rows.map((row) => `<li>${escapeHtml(row)}</li>`).join('')
    return { html: `<ul>${items}</ul>` }
  }
}

// Picked for anything that says it is a person. `about` reads what the
// file's data states about the thing being drawn.
export const personView: View = {
  id: 'https://example.org/views/person',
  when: [{ type: 'https://schema.org/Person' }],
  async render(resource) {
    const name = about(resource).one('https://schema.org/name') ?? 'Someone'
    return { html: `<p class="person">${escapeHtml(name)}</p>` }
  }
}
