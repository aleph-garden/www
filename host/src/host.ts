// The host at aleph.garden: any IRI, no session, and the three views that
// escape everything they show. The Markdown view joins once the region is a
// sandboxed iframe, which the host design defers.

import type { Host } from '@aleph-garden/host-core'
import { anonymousSession } from '@aleph-garden/host-core'
import { containerView, fallbackView } from '@aleph-garden/vitrine'
import { jsonLdParser } from '@aleph-garden/vitrine-jsonld'
import { parseTurtle, turtleParser } from '@aleph-garden/vitrine-turtle'
import { gardenAddress } from './address.ts'
import { claimView } from './claim.ts'
import { graphView } from './graph.ts'
import { landingView, type Sources } from './landing.ts'

/** `sources` holds the claim in each representation the page offers, and the
 *  view's own source, all coloured at build time. They arrive from the entry
 *  rather than being imported here, so nothing in this module needs the build
 *  to run. */
export const gardenHost = (sources: Sources): Host => ({
  address: gardenAddress,
  parseTurtle,
  parsers: () => [turtleParser(), jsonLdParser()],
  session: async () => anonymousSession(),
  views: () => [
    landingView(location.origin, sources),
    claimView,
    graphView,
    containerView,
    fallbackView
  ]
})
