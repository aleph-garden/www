// The hero's folder: a frame around the listing, a frame around each file,
// and under the files the rule table that picked their views.
//
// The page transcludes the folder with the folder frame named; the frame's
// inner view is the listing, which the rules pick by the folder's address.
// The listing embeds each file with the file frame named, and what the file
// frame draws inside is again the rules' choice, which the table below
// switches. A file whose own corner was switched keeps its choice. The one
// graph among the files, people.ttl, is taken apart by vitrine's subjects
// view, and each person in it gets a frame of its own, picked by its type.

import { ldp, schema } from '@aleph-garden/terms'
import { about, escapeHtml, folderView, type Rendered, type Resource, typesOf, type View } from '@aleph-garden/vitrine'
import {
  type Field,
  type FieldOf,
  frameView,
  name,
  viewName,
  viewSwitch
} from '@aleph-garden/vitrine/frame'
import { flip, IN_FOLDER, isFlipped, type Kind, onFlip, picked, rowFor, rowsOf } from './rules.ts'

export const FOLDER_FRAME = 'https://aleph.garden/views/folder-frame'
export const FILE_FRAME = 'https://aleph.garden/views/file-frame'
export const LISTING_VIEW = 'https://aleph.garden/views/trip-listing'
export const PERSON_FRAME = 'https://aleph.garden/views/person-frame'

/** Whether the rendering is about one subject inside the resource rather
 *  than the resource as a whole. */
const onSubject = (resource: Resource) =>
  resource.subject !== undefined && resource.subject !== resource.iri

/** The name field with a dot in front of it, coloured by the kind of file,
 *  or in the border's ink for the folder itself. It is also the one hook the
 *  frame needs on the table: when the row for this frame switches, the frame
 *  draws again, so the rules pick for it anew. Frames of other rows keep what
 *  they show. The counter is only there to change. */
const dotted: FieldOf = async (resource, view, ctx, show) => {
  const redraw = ctx.state('table', 0)
  const kind = rowFor(resource)?.kind
  const dot = `<span class="trip-dot" data-kind="${kind ?? 'folder'}" aria-hidden="true"></span>`
  let html: string
  if (onSubject(resource)) {
    const subject = resource.subject ?? resource.iri
    const hash = new URL(subject).hash
    html = `${dot}<span class="aleph-frame-name" title="${escapeHtml(subject)}">${escapeHtml(hash)}</span>`
  } else {
    const label = await name(resource, view, ctx, show)
    html = `${dot}${typeof label === 'string' ? label : (label?.html ?? '')}`
  }
  const field: Field = {
    html,
    hydrate: () => {
      const stop = onFlip((flipped) => {
        if (flipped === kind) redraw.set(redraw.get() + 1)
      })
      return { dispose: () => void stop() }
    }
  }
  return field
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

/** The rdf:type a subject inside a file was picked by. A file's frame leaves
 *  the corner empty: the rule table under the files names the content types. */
const pickedBy: FieldOf = (resource) =>
  onSubject(resource) ? typesOf(resource).map((type) => escapeHtml(prefixed(type))).join(', ') : undefined

const SCHEMA = 'https://schema.org/'
const prefixed = (iri: string) => (iri.startsWith(SCHEMA) ? `schema:${iri.slice(SCHEMA.length)}` : iri)

const corners = {
  'top-start': dotted,
  'top-end': switcher,
  'bottom-start': pickedBy
}

export const fileFrame = frameView(FILE_FRAME, corners)

/** The same frame around a person inside a file. The file's subjects view
 *  embeds each person without naming a view, so this frame is picked by the
 *  same conditions as the person row, and draws what the row picks inside:
 *  it is registered first, and the renderer passes it over when the frame
 *  asks for the view below. */
export const personFrame: View = {
  ...frameView(PERSON_FRAME, corners),
  when: [{ type: schema.Person }, IN_FOLDER]
}

/** The id of the listing's body, which the fold button controls. */
const BODY_ID = 'trip-body'

/** Set when the fold button was pressed, so the button drawn after the
 *  re-render takes the focus back. */
let refocus = false

/** The folder's own corner: a switch between the listing and vitrine's
 *  folder view, the same container drawn as a row per file, then a button
 *  that folds the listing to one line. The folder view has nothing to fold,
 *  so the button stays hidden there. Whether it is folded is the folder frame's
 *  state, so a row switch, which draws the frame again, keeps it. Folding
 *  hides the files rather than dropping them, so what a reader ticked or
 *  switched in them is still there when the folder opens. Without
 *  hydration the button stays hidden and the folder open. */
const folderCorner: FieldOf = async (resource, view, ctx, show) => {
  const folded = ctx.state('folded', false)
  const open = !folded.get()
  const picker = (await viewSwitch([
    [LISTING_VIEW, 'trip-listing'],
    [folderView.id, 'folder']
  ])(resource, view, ctx, show)) as Field
  return {
    html: `${picker.html}<button type="button" class="trip-fold" aria-controls="${BODY_ID}" aria-expanded="${open}" aria-label="${open ? 'Collapse folder' : 'Expand folder'}" hidden><span aria-hidden="true">${open ? '−' : '+'}</span></button>`,
    hydrate(corner, hydrating) {
      const switching = picker.hydrate?.(corner, hydrating)
      const button = corner.querySelector<HTMLButtonElement>('.trip-fold')
      const body = corner.closest('.aleph-frame')?.querySelector(`#${BODY_ID}`)
      if (!button || !body) return switching
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
      return {
        dispose: () => {
          button.removeEventListener('click', click)
          switching?.dispose?.()
        }
      }
    }
  }
}

export const folderFrame = frameView(FOLDER_FRAME, {
  'top-start': address,
  'top-end': folderCorner
})

const shortName = (id: string) => id.split(/[#/]/).filter(Boolean).pop() ?? id

/** The order the design lays the files out in, the graph last and full width. */
const FILES: Kind[] = ['txt', 'csv', 'geo', 'md', 'graph']

/** The order of the rule table: the files' rows, then the row that picks
 *  for the people inside the graph. */
const TABLE: Kind[] = [...FILES, 'person']

function ruleRow(kind: Kind): string {
  const row = rowsOf().find((r) => r.kind === kind)
  const [first, second] = row?.views ?? []
  // A row with one view has nothing to switch, so the demo leaves it out.
  if (!row || !first || !second) return ''
  const flipped = isFlipped(kind)
  const on = (view: View) => (picked(row).id === view.id ? ' data-on' : '')
  const alt = `<span class="trip-swap" aria-hidden="true">⇄</span><span class="trip-view"${on(second)}>${escapeHtml(shortName(second.id))}</span>`
  const state = flipped ? 'switched' : ''
  return `<li><button type="button" class="trip-rule" data-kind="${kind}" aria-pressed="${flipped}"><span class="trip-cond">${escapeHtml(row.label)}</span><span class="trip-views"><span aria-hidden="true">→</span><span class="trip-view"${on(first)}>${escapeHtml(shortName(first.id))}</span>${alt}</span><span class="trip-state">${state}</span></button></li>`
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
      const members = about(resource).all(ldp.contains)
      const rank = (iri: string) => {
        const kind = kindByName(iri)
        return kind ? FILES.indexOf(kind) : FILES.length
      }
      const files = [...members].sort((a, b) => rank(a) - rank(b))
      // The graph is drawn here rather than transcluded, so the people inside
      // it are embedded from this instance. The runtime mounts three levels
      // below the page on its own, the page, this folder and a file, and
      // host-core offers a host no way to set that depth; a person inside a
      // transcluded file would be a fourth and stay a placeholder. Once
      // host-core takes a runtime depth, this becomes a transclusion like
      // every other file.
      const inline: Rendered[] = []
      const cells = await Promise.all(
        files.map(async (iri) => {
          if (kindByName(iri) !== 'graph')
            return `<div class="trip-cell">${await ctx.transclude(iri, { view: FILE_FRAME })}</div>`
          const drawn = await ctx.render(await ctx.resolve(iri), { view: FILE_FRAME })
          inline.push(drawn)
          return `<div class="trip-cell" data-wide><div class="trip-inline" data-inline="${inline.length - 1}">${drawn.html}</div></div>`
        })
      )
      const table = TABLE.map(ruleRow).join('')
      const version = ctx.state('table', 0)
      return {
        html: `<div class="trip" id="${BODY_ID}"><p class="trip-summary">${summary(files)}</p><div class="trip-files">${cells.join('')}</div><div class="trip-rules"><p class="trip-rules-head"><span>Rules</span></p><ul>${table}</ul></div></div>`,
        hydrate(root, hydrating) {
          const handles = inline.map((drawn, i) => {
            const at = root.querySelector(`.trip-inline[data-inline="${i}"]`)
            return at ? drawn.hydrate?.(at, hydrating) : undefined
          })
          const click = (event: Event) => {
            const button = (event.target as Element | null)?.closest<HTMLElement>('.trip-rule')
            const kind = button?.dataset.kind as Kind | undefined
            if (!kind) return
            flip(kind)
            version.set(version.get() + 1)
          }
          const rules = root.querySelector('.trip-rules')
          rules?.addEventListener('click', click)
          return {
            dispose: () => {
              rules?.removeEventListener('click', click)
              for (const handle of handles) handle?.dispose?.()
            }
          }
        }
      }
    }
  }
}

/** The row a member will fall under, from its name, for ordering the files
 *  and naming their views before any of them is fetched. */
function kindByName(iri: string): Kind | undefined {
  if (iri.endsWith('.txt')) return 'txt'
  if (iri.endsWith('.csv')) return 'csv'
  if (iri.endsWith('.geojson')) return 'geo'
  if (iri.endsWith('.md')) return 'md'
  if (iri.endsWith('.ttl')) return 'graph'
  return undefined
}
