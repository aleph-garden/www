// Everything the hero's folder registers, in the order the host lists it:
// the listing and the frames first, then the rows before the host's general
// views, which would otherwise take a Turtle or a text file first. The person
// row sits before the graph row: a person inside people.ttl is read from a
// graph too, and its type is the more specific thing to say about it.

import { schema } from '@aleph-garden/terms'
import { subjectsGridView, subjectsListView, type View } from '@aleph-garden/vitrine'
import { fileFrame, folderFrame, listingView, personFrame } from './listing.ts'
import { defineRows, IN_FOLDER, inFolder } from './rules.ts'
import {
  barsView,
  cardView,
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

export { FILE_FRAME, FOLDER_FRAME, LISTING_VIEW, PERSON_FRAME } from './listing.ts'

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
      kind: 'person',
      label: 'type schema:Person',
      when: [{ type: schema.Person }, IN_FOLDER],
      views: [cardView, statementsView]
    },
    {
      kind: 'graph',
      label: 'graph',
      when: inFolder({ graph: true }),
      views: [subjectsGridView, subjectsListView]
    }
  ])
  return [listingView(tripFolder(origin)), folderFrame, fileFrame, personFrame, ...rows]
}
