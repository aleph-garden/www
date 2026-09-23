import type { Quad, View } from '@aleph-garden/vitrine'
import { collect, contentOf, BOX as LAYOUT, slotsFor } from './graph.ts'

// A still flow field behind the page's opening, drawn from a real document.
//
// Still, because section 5.2 of the design language budgets looping animation,
// autoplaying motion above the fold, parallax and scroll-driven motion at zero
// each. The only motion it permits on a surface like this is a recording of the
// tool working, which is a different asset.
//
// The document is laid out exactly as the graph view lays it out, and every
// link in that drawing sets the direction of the field around it, nearer links
// weighing more. Streamlines follow that direction and keep a fixed distance
// from each other, so the texture is as dense as the box allows however few
// statements the document has. A line takes the categorical colour of the
// rdf:type the graph view gives the subject of its nearest link, so the
// colours here are the ones its "Colour by type" control shows.
//
// Position comes from a hash of the document, so one document always draws
// the same field.

const BOX = { w: 2000, h: 760 }
/** Distance kept between lines, and the length of one integration step. */
const SEPARATION = 8
const STEP = 4
/** Steps in each direction from a seed, and the fewest points a line keeps. */
const REACH = 90
const SHORTEST = 6
/** Softens the pull of a link at close range, so the field bends instead of
 *  snapping to whichever link is nearest. */
const SOFT = 28 ** 2
/** Stroke width and opacity a line can take, and the distance from a link
 *  over which its pull on both fades. */
const WIDTH = { min: 0.5, max: 1.9 }
const OPACITY = { min: 0.08, max: 0.32 }
const NEAR = 60
/** Height of the band along the bottom where the field turns downward and
 *  each line stops at a depth of its own, so the field runs out in strands
 *  rather than ending on a straight edge. */
const TAIL = 240

type Segment = { ax: number; ay: number; bx: number; by: number; c: number; s: number; slot: number }

/** A small deterministic hash. The field has to be the same on every load, so
 *  nothing here may reach for a random number. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

function distanceSquared(x: number, y: number, seg: Segment): number {
  const dx = seg.bx - seg.ax
  const dy = seg.by - seg.ay
  const t = Math.max(0, Math.min(1, ((x - seg.ax) * dx + (y - seg.ay) * dy) / (dx * dx + dy * dy || 1)))
  const px = seg.ax + t * dx - x
  const py = seg.ay + t * dy - y
  return px * px + py * py
}

/** The field's direction at a point, and the slot of and distance to the
 *  nearest link. A link
 *  has no preferred end, so directions are averaged on the doubled angle and
 *  halved afterwards. */
function sample(
  segments: Segment[],
  x: number,
  y: number
): { angle: number; slot: number; distance: number } {
  let c = 0
  let s = 0
  let nearest = Infinity
  let slot = 0
  for (const seg of segments) {
    const d = distanceSquared(x, y, seg)
    const w = 1 / (d + SOFT)
    c += seg.c * w
    s += seg.s * w
    if (d < nearest) {
      nearest = d
      slot = seg.slot
    }
  }
  // In the tail the field turns towards straight down, whose doubled angle
  // is pi, so the lines leave the drawing as a fringe.
  const t = Math.min(1, Math.max(0, (y - (BOX.h - TAIL)) / TAIL)) ** 1.5
  const length = Math.hypot(c, s) || 1
  const cx = (c / length) * (1 - t) - t
  const sx = (s / length) * (1 - t)
  return { angle: Math.atan2(sx, cx) / 2, slot, distance: Math.sqrt(nearest) }
}

/** Lines for `graph`, or nothing when its drawing has no links to follow. */
export function fieldHtml(graph: Quad[]): string {
  const { nodes, edges } = collect(graph)
  if (edges.length === 0) return ''

  const byType = slotsFor(nodes, (node) => node.type)
  const scale = { x: BOX.w / LAYOUT.w, y: BOX.h / LAYOUT.h }
  const segments: Segment[] = edges.map((edge) => {
    const a = nodes[edge.from]
    const b = nodes[edge.to]
    const theta = 2 * Math.atan2((b.y - a.y) * scale.y, (b.x - a.x) * scale.x)
    return {
      ax: a.x * scale.x,
      ay: a.y * scale.y,
      bx: b.x * scale.x,
      by: b.y * scale.y,
      c: Math.cos(theta),
      s: Math.sin(theta),
      slot: (a.type && byType.get(a.type)) || 0
    }
  })

  // Occupancy on a grid one separation wide: a line stops where it would come
  // closer than that to a line already drawn. The ceiling is a coarse test,
  // cell against cell rather than point against point, which is invisible at
  // this contrast.
  const columns = Math.ceil(BOX.w / SEPARATION)
  const rows = Math.ceil(BOX.h / SEPARATION)
  const taken = new Int32Array(columns * rows).fill(-1)
  const cell = (x: number, y: number) => Math.floor(y / SEPARATION) * columns + Math.floor(x / SEPARATION)
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < BOX.w && y < BOX.h
  const free = (x: number, y: number, line: number) => {
    const at = taken[cell(x, y)]
    return at === -1 || at === line
  }

  const trace = (
    x: number,
    y: number,
    sign: 1 | -1,
    line: number,
    floor: number
  ): Array<[number, number]> => {
    const points: Array<[number, number]> = []
    let previous = { x: 0, y: 0 }
    for (let i = 0; i < REACH; i++) {
      const { angle } = sample(segments, x, y)
      let dx = Math.cos(angle) * sign
      let dy = Math.sin(angle) * sign
      // Keep heading the way the line was going: the field says which axis,
      // not which end of it.
      if (i > 0 && dx * previous.x + dy * previous.y < 0) {
        dx = -dx
        dy = -dy
      }
      previous = { x: dx, y: dy }
      x += dx * STEP
      y += dy * STEP
      if (!inside(x, y) || y > floor || !free(x, y, line)) break
      points.push([x, y])
    }
    return points
  }

  const salt = `${graph.length} ${edges.length}`
  const seeds: Array<[number, number]> = []
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      seeds.push([
        (column + hash(`x${salt}${row}.${column}`)) * SEPARATION,
        (row + hash(`y${salt}${row}.${column}`)) * SEPARATION
      ])
    }
  }
  seeds.sort((a, b) => hash(`${salt}${a}`) - hash(`${salt}${b}`))

  const lines: string[] = []
  for (const [x, y] of seeds) {
    // How deep into the tail this line may reach. Squared, so few lines go
    // all the way down and the fringe thins out towards its end.
    const floor = BOX.h - TAIL + TAIL * hash(`f${salt}${x},${y}`) ** 2
    if (y > floor || !free(x, y, -2)) continue
    const line = lines.length
    const points = [
      ...trace(x, y, -1, line, floor).reverse(),
      [x, y] as [number, number],
      ...trace(x, y, 1, line, floor)
    ]
    if (points.length < SHORTEST) continue
    for (const [px, py] of points) taken[cell(px, py)] = line
    // Relative steps after the first point: small numbers, which keeps the
    // markup of a thousand lines small enough to ship inside the bundle.
    const rounded = points.map(([px, py]) => [Math.round(px), Math.round(py)])
    const d = rounded
      .map(([px, py], i) => (i === 0 ? `M${px} ${py}` : `l${px - rounded[i - 1][0]} ${py - rounded[i - 1][1]}`))
      .join('')
    // Weight falls off with distance from the nearest link, so the drawing's
    // edges show through as the stronger strands, and the hash keeps two
    // neighbouring lines from matching.
    const { slot, distance } = sample(segments, x, y)
    const near = Math.exp(-distance / NEAR)
    const jitter = hash(`w${salt}${x},${y}`)
    const width = WIDTH.min + (WIDTH.max - WIDTH.min) * (0.6 * near + 0.4 * jitter ** 2)
    const opacity = OPACITY.min + (OPACITY.max - OPACITY.min) * (0.5 * near + 0.5 * jitter)
    lines.push(
      `<path data-slot="${slot}" stroke-width="${width.toFixed(2)}" stroke-opacity="${opacity.toFixed(2)}" d="${d}" />`
    )
  }

  return `<svg class="ambient" viewBox="0 0 ${BOX.w} ${BOX.h}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">${lines.join('')}</svg>`
}

export const AMBIENT_VIEW = 'https://aleph.garden/views/ambient'

/** The field as a view. It states no conditions, so the rules never pick it:
 *  it draws a document only where it is named, which the build does once for
 *  the vocabulary behind the landing page. */
export const ambientView: View = {
  id: AMBIENT_VIEW,
  async render(resource) {
    return { html: fieldHtml(contentOf(resource)) }
  }
}
