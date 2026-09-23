// Everything the hero's folder registers, in the order the host lists it:
// the listing before the rows, and the rows before the host's general views,
// which would otherwise take a Turtle or a text file first.

import type { View } from '@aleph-garden/vitrine'
import { fileFrame, folderFrame, listingView } from './listing.ts'
import { defineRows, inFolder } from './rules.ts'
import {
  barsView,
  cardsView,
  checklistView,
  coordinatesView,
  mapView,
  noteView,
  plainTextView,
  statementsView,
  tableView
} from './views.ts'

/** The folder the hero draws, on this deployment's own origin, so a local run
 *  draws its own copy. */
export const tripFolder = (origin: string) => `${origin}/fixtures/trip/`

export { FILE_FRAME, FOLDER_FRAME, LISTING_VIEW } from './listing.ts'

export function tripViews(origin: string): View[] {
  const rows = defineRows([
    {
      kind: 'txt',
      label: 'text/plain',
      when: inFolder({ contentType: 'text/plain' }),
      views: [checklistView, plainTextView]
    },
    {
      kind: 'csv',
      label: 'text/csv',
      when: inFolder({ contentType: 'text/csv' }),
      views: [tableView, barsView]
    },
    {
      kind: 'geo',
      label: 'application/geo+json',
      when: inFolder({ contentType: 'application/geo+json' }),
      views: [mapView, coordinatesView]
    },
    {
      kind: 'md',
      label: 'text/markdown',
      when: inFolder({ contentType: 'text/markdown' }),
      views: [noteView]
    },
    {
      kind: 'people',
      label: 'text/turtle',
      when: inFolder({ contentType: 'text/turtle' }),
      views: [cardsView, statementsView]
    }
  ])
  return [listingView(tripFolder(origin)), folderFrame, fileFrame, ...rows]
}
