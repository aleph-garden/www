// The frame around each WebID on the landing page: the same frame as the
// hero's people, with one corner that fits a profile on another server: the
// host it came from, linking to the profile document.

import { escapeHtml, type Resource, type View } from '@aleph-garden/vitrine'
import { type FieldOf, frameView } from '@aleph-garden/vitrine/frame'

export const WEBID_FRAME = 'https://aleph.garden/views/webid-frame'

/** The document the profile lives in, named by its host, as a link out of the
 *  page. `target="_top"` so the browser follows it instead of the runtime
 *  drawing the document in the region. */
const source: FieldOf = (resource: Resource) =>
  `<a class="people-source" href="${escapeHtml(resource.iri)}" target="_top" title="${escapeHtml(resource.iri)}">${escapeHtml(new URL(resource.iri).host)}<span aria-hidden="true"> ↗</span></a>`

export const webIdFrame: View = frameView(WEBID_FRAME, {
  'top-start': source
})
