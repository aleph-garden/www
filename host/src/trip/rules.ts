// The rule table the landing page's hero draws under its folder: one row per
// kind of file, each naming the view that draws that kind, and for four of
// them a second view the row switches to.
//
// host-core builds the renderer's registry itself and hands a host no way to
// change its rules, so this table reaches selection through the views' own
// `when`: of a row's two views, only the one the row currently names reports
// a condition, and the renderer reads `when` each time it selects. The
// ceiling: the table lives in this module, one per page, and nothing outside
// the page can read or change it. Once host-core lets a host edit
// `registry.rules`, the rows become rules there and the `when` getters go.

import { type Condition, holds, type Resource, type View } from '@aleph-garden/vitrine'

export type Kind = 'txt' | 'csv' | 'geo' | 'md' | 'people'

/** The folder the rows apply to. Every row's conditions include it, so the
 *  table cannot change how a resource elsewhere on this deployment draws. */
const IN_FOLDER: Condition = { iri: /\/fixtures\/trip\/[^/]+$/ }

export type Row = {
  kind: Kind
  /** The condition a reader sees in the row. */
  label: string
  when: Condition[]
  /** The view the row names first, and the one it switches to. */
  views: [View, View?]
}

let rows: Row[] = []
const flipped = new Set<Kind>()
const listeners = new Set<(kind: Kind) => void>()

/** Sets the table's rows. The views passed here are the plain ones; `ruled`
 *  gives each the `when` this table answers for it. */
export function defineRows(defined: Row[]): View[] {
  rows = defined
  flipped.clear()
  return rows.flatMap((row) => row.views.filter((v): v is View => v !== undefined).map((v) => ruled(v, row)))
}

export function rowsOf(): readonly Row[] {
  return rows
}

/** The view the row for `kind` names now. */
export function picked(row: Row): View {
  return (flipped.has(row.kind) && row.views[1]) || row.views[0]
}

export function isFlipped(kind: Kind): boolean {
  return flipped.has(kind)
}

/** Switches the row for `kind` to its other view and tells every listener. A
 *  row with one view does not switch. */
export function flip(kind: Kind): void {
  const row = rows.find((r) => r.kind === kind)
  if (!row?.views[1]) return
  if (flipped.has(kind)) flipped.delete(kind)
  else flipped.add(kind)
  for (const listener of [...listeners]) listener(kind)
}

/** Runs `listener` with the switched row's kind after every switch; answers
 *  the function that stops it. */
export function onFlip(listener: (kind: Kind) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The row whose conditions hold for `resource`, if any. */
export function rowFor(resource: Resource): Row | undefined {
  return rows.find((row) => row.when.every((c) => holds(c, resource)))
}

/** The conditions a row applies, the folder included. */
export const inFolder = (condition: Condition): Condition[] => [condition, IN_FOLDER]

function ruled(view: View, row: Row): View {
  return {
    id: view.id,
    render: view.render,
    get when() {
      return picked(row).id === view.id ? row.when : undefined
    }
  }
}
