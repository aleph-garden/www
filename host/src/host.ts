// The host at aleph.garden: any IRI, no session, and views that escape
// everything they show. The hero's folder brings its own, which apply only
// inside that folder. The Markdown view joins once the region is a sandboxed
// iframe, which the host design defers.

import type { Host } from '@aleph-garden/host-core'
import { anonymousSession } from '@aleph-garden/host-core'
import { containerView, fallbackView } from '@aleph-garden/vitrine'
import { jsonLdParser } from '@aleph-garden/vitrine-jsonld'
import { parseTurtle, turtleParser } from '@aleph-garden/vitrine-turtle'
import { gardenAddress } from './address.ts'
import { graphView } from './graph.ts'
import { landingView, type Sources } from './landing.ts'
import { tripViews } from './trip/index.ts'

/** `sources` holds what the build prepared for the landing page: the field
 *  behind the opening. It arrives from the entry rather than being imported
 *  here, so nothing in this module needs the build to run. */
export const gardenHost = (sources: Sources): Host => ({
  address: gardenAddress,
  parseTurtle,
  parsers: () => [turtleParser(), jsonLdParser()],
  session: async () => anonymousSession(),
  views: () => [
    landingView(location.origin, sources),
    ...tripViews(location.origin),
    graphView,
    containerView,
    fallbackView
  ]
})
