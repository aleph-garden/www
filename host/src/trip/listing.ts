// The hero's folder: a frame around the listing, a frame around each file,
// and under the files the rule table that picked their views.
//
// The page transcludes the folder with the folder frame named; the frame's
// inner view is the listing, which the rules pick by the folder's address.
// The listing transcludes each file with the file frame named, and what the
// file frame draws inside is again the rules' choice, which the table below
// switches. A file whose own corner was switched keeps its choice.

import { ldp, rdf, schema } from '@aleph-garden/terms'
import { about, escapeHtml, type Resource, type View } from '@aleph-garden/vitrine'
import {
  contentType,
  type Field,
  type FieldOf,
  frameView,
  name,
  viewName,
  viewSwitch
} from '@aleph-garden/vitrine/frame'
import { flip, isFlipped, type Kind, onFlip, picked, rowFor, rowsOf } from './rules.ts'

export const FOLDER_FRAME = 'https://aleph.garden/views/folder-frame'
export const FILE_FRAME = 'https://aleph.garden/views/file-frame'
export const LISTING_VIEW = 'https://aleph.garden/views/trip-listing'

/** The name field with a dot in front of it, coloured by the kind of file,
 *  or in the border's ink for the folder itself. */
const dotted: FieldOf = async (resource, view, ctx, show) => {
  const kind = rowFor(resource)?.kind ?? 'folder'
  const label = await name(resource, view, ctx, show)
  const html = typeof label === 'string' ? label : (label?.html ?? '')
  return `<span class="trip-dot" data-kind="${kind}" aria-hidden="true"></span>${html}`
}

/** The folder's full address, since the folder is the page's example. */
const address: FieldOf = (resource) =>
  `<span class="trip-dot" data-kind="folder" aria-hidden="true"></span><code class="trip-address">${escapeHtml(resource.iri)}</code>`

/** A switch over the row's two views, or the view's name for a row with one. */
const switcher: FieldOf = (resource, view, ctx, show) => {
  const row = rowFor(resource)
  const [first, second] = row?.views ?? []
  if (!first || !second) return viewName(resource, view, ctx, show)
  return viewSwitch([
    [first.id, shortName(first.id)],
    [second.id, shortName(second.id)]
  ])(resource, view, ctx, show)
}

/** The content type, and the one hook the frame needs on the table: when the
 *  row for this file switches, the frame draws again, so the rules pick for
 *  it anew. Frames of other rows keep what they show. The counter is only
 *  there to change. */
const typeAndRedraw: FieldOf = async (resource, view, ctx, show) => {
  const redraw = ctx.state('table', 0)
  const mine = rowFor(resource)?.kind
  const html = String(await contentType(resource, view, ctx, show))
  const field: Field = {
    html,
    hydrate: () => {
      const stop = onFlip((kind) => {
        if (kind === mine) redraw.set(redraw.get() + 1)
      })
      return { dispose: () => void stop() }
    }
  }
  return field
}

/** How many people the file describes, for the people row only. */
const count: FieldOf = (resource) => {
  if (rowFor(resource)?.kind !== 'people') return undefined
  const people = (resource.graph ?? []).filter(
    (q) => q.predicate.value === rdf.type && q.object.value === schema.Person
  ).length
  return `${people} × schema:Person`
}

export const fileFrame = frameView(FILE_FRAME, {
  'top-start': dotted,
  'top-end': switcher,
  'bottom-start': typeAndRedraw,
  'bottom-end': count
})

/** The id of the listing's body, which the fold button controls. */
const BODY_ID = 'trip-body'

/** Set when the fold button was pressed, so the button drawn after the
 *  re-render takes the focus back. */
let refocus = false

/** The folder's own corner: the name of the view inside, then a button that
 *  folds the folder to one line. Whether it is folded is the folder frame's
 *  state, so a row switch, which draws the frame again, keeps it. Folding
 *  hides the files rather than dropping them, so what a reader ticked or
 *  switched in them is still there when the folder opens. Without
 *  hydration the button stays hidden and the folder open. */
const folderCorner: FieldOf = async (resource, view, ctx, show) => {
  const folded = ctx.state('folded', false)
  const open = !folded.get()
  const label = String(await viewName(resource, view, ctx, show))
  return {
    html: `<span>${label}</span><button type="button" class="trip-fold" aria-controls="${BODY_ID}" aria-expanded="${open}" aria-label="${open ? 'Collapse folder' : 'Expand folder'}" hidden><span aria-hidden="true">${open ? '▴' : '▾'}</span></button>`,
    hydrate(corner) {
      const button = corner.querySelector<HTMLButtonElement>('.trip-fold')
      const body = corner.closest('.aleph-frame')?.querySelector(`#${BODY_ID}`)
      if (!button || !body) return
      button.hidden = false
      body.toggleAttribute('data-folded', !open)
      if (refocus) {
        refocus = false
        button.focus()
      }
      const click = () => {
        refocus = true
        folded.set(open)
      }
      button.addEventListener('click', click)
      return { dispose: () => button.removeEventListener('click', click) }
    }
  }
}

export const folderFrame = frameView(FOLDER_FRAME, {
  'top-start': address,
  'top-end': folderCorner
})

const shortName = (id: string) => id.split(/[#/]/).filter(Boolean).pop() ?? id

/** The order the design lays the files out in, people last and full width. */
const ORDER: Kind[] = ['txt', 'csv', 'geo', 'md', 'people']

function ruleRow(kind: Kind): string {
  const row = rowsOf().find((r) => r.kind === kind)
  if (!row) return ''
  const [first, second] = row.views
  const flipped = isFlipped(kind)
  const on = (view: View) => (picked(row).id === view.id ? ' data-on' : '')
  const alt = second
    ? `<span class="trip-swap" aria-hidden="true">⇄</span><span class="trip-view"${on(second)}>${escapeHtml(shortName(second.id))}</span>`
    : ''
  const state = second ? (flipped ? 'switched' : '') : 'fixed'
  return `<li><button type="button" class="trip-rule" data-kind="${kind}"${second ? '' : ' disabled'} aria-pressed="${flipped}"><span class="trip-cond">${escapeHtml(row.label)}</span><span class="trip-views"><span aria-hidden="true">→</span><span class="trip-view"${on(first)}>${escapeHtml(shortName(first.id))}</span>${alt}</span><span class="trip-state">${state}</span></button></li>`
}

/** One sentence naming the view the rules picked for each file. A file
 *  switched in its own corner is drawn by its own choice, which this does
 *  not know: the listing sees its files, never what they became. */
function caption(files: { iri: string; kind?: Kind }[]): string {
  const parts = files.flatMap(({ iri, kind }) => {
    const row = rowsOf().find((r) => r.kind === kind)
    const file = iri.split('/').pop() ?? iri
    return row ? [`<code>${escapeHtml(shortName(picked(row).id))}</code> for ${escapeHtml(file)}`] : []
  })
  if (!parts.length) return ''
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]
  return `The rules picked ${list}.`
}

/** The one line a folded folder shows: how many files, and their names. */
function summary(files: string[]): string {
  const names = files.map((iri) => escapeHtml(iri.split('/').pop() ?? iri))
  return `${files.length} ${files.length === 1 ? 'file' : 'files'}: ${names.join(', ')}`
}

/** The folder's files, each framed, in the design's order. */
export function listingView(folder: string): View {
  return {
    id: LISTING_VIEW,
    when: [{ iri: folder }],
    async render(resource: Resource, ctx) {
      const stated = [...resource.meta, ...(resource.graph ?? [])]
      const members = about(stated, resource.iri).all(ldp.contains)
      const kindOf = (iri: string) => rowFor({ ...resource, iri, contentType: typeByName(iri) })?.kind
      const rank = (iri: string) => {
        const kind = kindOf(iri)
        return kind ? ORDER.indexOf(kind) : ORDER.length
      }
      const files = [...members].sort((a, b) => rank(a) - rank(b))
      const cells = await Promise.all(
        files.map(async (iri) => {
          const wide = /\.ttl$/.test(iri) ? ' data-wide' : ''
          return `<div class="trip-cell"${wide}>${await ctx.transclude(iri, { view: FILE_FRAME })}</div>`
        })
      )
      const table = ORDER.map(ruleRow).join('')
      const version = ctx.state('table', 0)
      return {
        html: `<div class="trip" id="${BODY_ID}"><p class="trip-summary">${summary(files)}</p><div class="trip-files">${cells.join('')}</div><div class="trip-rules"><p class="trip-rules-head"><span>Rules</span><span>These apply inside this folder. A row with ⇄ is a switch: when I click it, every file it matches redraws.</span></p><ul>${table}</ul></div><p class="trip-caption">${caption(files.map((iri) => ({ iri, kind: kindOf(iri) })))}</p></div>`,
        hydrate(root) {
          const click = (event: Event) => {
            const button = (event.target as Element | null)?.closest<HTMLElement>('.trip-rule')
            const kind = button?.dataset.kind as Kind | undefined
            if (!kind || button?.hasAttribute('disabled')) return
            flip(kind)
            version.set(version.get() + 1)
          }
          const rules = root.querySelector('.trip-rules')
          rules?.addEventListener('click', click)
          return { dispose: () => rules?.removeEventListener('click', click) }
        }
      }
    }
  }
}

/** A content type from a file name, for ordering members before they are
 *  fetched. */
function typeByName(iri: string): string {
  if (iri.endsWith('.txt')) return 'text/plain'
  if (iri.endsWith('.csv')) return 'text/csv'
  if (iri.endsWith('.geojson')) return 'application/geo+json'
  if (iri.endsWith('.md')) return 'text/markdown'
  if (iri.endsWith('.ttl')) return 'text/turtle'
  return 'application/octet-stream'
}
