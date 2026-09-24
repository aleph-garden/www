// The views that draw the files in the hero's folder, two per kind of file
// where the rule table offers a switch. They belong to this page, so they
// read only the fixtures it serves and nothing here is a general parser: the
// CSV reader splits on commas and knows no quoting, the note view reads the
// three kinds of line its one note uses.

import { about, escapeHtml, type Resource, type View } from '@aleph-garden/vitrine'
import { ns, rdf, schema } from '@aleph-garden/terms'
import { contentOf } from '../graph.ts'

const VIEWS = 'https://aleph.garden/views/'

const text = (resource: Resource): string =>
  typeof resource.body === 'string' ? resource.body : new TextDecoder().decode(resource.body)

// ------------------------------------------------------------------ text

type Task = { text: string; done: boolean }

/** The `- [ ]` and `- [x]` lines of a Markdown task list. */
export function tasksOf(body: string): Task[] {
  return body
    .split('\n')
    .map((line) => /^\s*[-*] \[( |x|X)\] (.*)$/.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ done: m[1] !== ' ', text: m[2]!.trim() }))
}

const tally = (done: number, all: number) => `${done} of ${all} packed`

/** The file as a list of boxes. Ticking one is the reader's own: the file is
 *  not written, and the tally follows the boxes on the page. */
export const checklistView: View = {
  id: `${VIEWS}checklist`,
  async render(resource) {
    const tasks = tasksOf(text(resource))
    const items = tasks
      .map(
        (t, i) =>
          `<li><label><input type="checkbox" data-task="${i}"${t.done ? ' checked' : ''} />${escapeHtml(t.text)}</label></li>`
      )
      .join('')
    const done = tasks.filter((t) => t.done).length
    return {
      html: `<div class="trip-checklist"><ul>${items}</ul><p class="trip-tally" data-slot="tally">${tally(done, tasks.length)}</p></div>`,
      hydrate(root) {
        const count = () => {
          const boxes = [...root.querySelectorAll<HTMLInputElement>('input[data-task]')]
          const slot = root.querySelector('[data-slot="tally"]')
          if (slot) slot.textContent = tally(boxes.filter((b) => b.checked).length, boxes.length)
        }
        root.addEventListener('change', count)
        return { dispose: () => root.removeEventListener('change', count) }
      }
    }
  }
}

/** The file's own bytes. */
export const plainTextView: View = {
  id: `${VIEWS}plain-text`,
  async render(resource) {
    return { html: `<pre class="trip-plain">${escapeHtml(text(resource))}</pre>` }
  }
}

// ------------------------------------------------------------------- csv

type Line = { item: string; eur: number }

/** The rows under an `item,eur` header. */
export function budgetOf(body: string): Line[] {
  const [, ...lines] = body.trim().split('\n')
  return lines
    .map((line) => line.split(','))
    .filter((cells) => cells.length >= 2)
    .map(([item, eur]) => ({ item: item!.trim(), eur: Number(eur) }))
    .filter((line) => Number.isFinite(line.eur))
}

const euros = (value: number) => value.toLocaleString('en-GB')

export const tableView: View = {
  id: `${VIEWS}table`,
  async render(resource) {
    const lines = budgetOf(text(resource))
    const total = lines.reduce((sum, l) => sum + l.eur, 0)
    const rows = lines
      .map((l) => `<tr><td>${escapeHtml(l.item)}</td><td>${euros(l.eur)}</td></tr>`)
      .join('')
    return {
      html: `<table class="trip-table"><thead><tr><th>item</th><th>eur</th></tr></thead><tbody>${rows}<tr class="trip-total"><td>total</td><td>${euros(total)}</td></tr></tbody></table>`
    }
  }
}

export const barsView: View = {
  id: `${VIEWS}bars`,
  async render(resource) {
    const lines = budgetOf(text(resource))
    const most = Math.max(...lines.map((l) => l.eur), 1)
    const bars = lines
      .map((l) => {
        const share = Math.round((l.eur / most) * 100)
        return `<li><span class="trip-bar-label"><span>${escapeHtml(l.item)}</span><span>${euros(l.eur)}</span></span><svg class="trip-bar" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="2" class="trip-bar-track"></rect><rect width="${share}" height="2" class="trip-bar-fill"></rect></svg></li>`
      })
      .join('')
    return { html: `<ul class="trip-bars">${bars}</ul>` }
  }
}

// --------------------------------------------------------------- geojson

type Point = [lon: number, lat: number]

/** The coordinates of the first LineString in a GeoJSON document, whether it
 *  is the document itself, a Feature, or the first of a FeatureCollection. */
export function lineOf(body: string): Point[] {
  const doc = JSON.parse(body) as {
    type: string
    coordinates?: Point[]
    geometry?: { type: string; coordinates: Point[] }
    features?: { geometry: { type: string; coordinates: Point[] } }[]
  }
  const geometry =
    doc.type === 'LineString'
      ? doc
      : doc.type === 'Feature'
        ? doc.geometry
        : doc.features?.find((f) => f.geometry.type === 'LineString')?.geometry
  return geometry?.coordinates ?? []
}

const WIDTH = 280
const HEIGHT = 150
const PAD = 12
const TILE = 256
const MAX_ZOOM = 18

/** A point in Web Mercator pixels at zoom `z`, the space OpenStreetMap's tiles
 *  are cut in. */
function mercator([lon, lat]: Point, z: number): [number, number] {
  const size = TILE * 2 ** z
  const sin = Math.sin((lat * Math.PI) / 180)
  return [((lon + 180) / 360) * size, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size]
}

type Tile = { z: number; x: number; y: number; left: number; top: number }

/** The line in the box at the deepest zoom it fits, centred, and the tiles
 *  that cover the box at that zoom, each placed in box units. */
export function project(points: Point[]): { points: [number, number][]; tiles: Tile[] } {
  if (!points.length) return { points: [], tiles: [] }
  let z = MAX_ZOOM
  let world = points.map((p) => mercator(p, z))
  const extent = () => {
    const xs = world.map((p) => p[0])
    const ys = world.map((p) => p[1])
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
  }
  let box = extent()
  while (z > 0 && (box.x1 - box.x0 > WIDTH - 2 * PAD || box.y1 - box.y0 > HEIGHT - 2 * PAD)) {
    z -= 1
    world = points.map((p) => mercator(p, z))
    box = extent()
  }
  const ox = (box.x0 + box.x1) / 2 - WIDTH / 2
  const oy = (box.y0 + box.y1) / 2 - HEIGHT / 2
  const tiles: Tile[] = []
  for (let x = Math.floor(ox / TILE); x <= Math.floor((ox + WIDTH) / TILE); x++)
    for (let y = Math.floor(oy / TILE); y <= Math.floor((oy + HEIGHT) / TILE); y++)
      tiles.push({ z, x, y, left: Math.round((x * TILE - ox) * 10) / 10, top: Math.round((y * TILE - oy) * 10) / 10 })
  return {
    points: world.map(([x, y]) => [Math.round((x - ox) * 10) / 10, Math.round((y - oy) * 10) / 10]),
    tiles
  }
}

const OSM_TILES = 'https://tile.openstreetmap.org'

/** The route over OpenStreetMap's tiles, which the reader's browser fetches
 *  from OpenStreetMap. The tile server's usage policy asks for the
 *  attribution drawn under the map and allows light use like this; a page
 *  with real traffic would need its own tile source. */
export const mapView: View = {
  id: `${VIEWS}map`,
  async render(resource) {
    const { points, tiles } = project(lineOf(text(resource)))
    if (!points.length) return { html: '<p class="trip-empty">No line in this file.</p>' }
    const [sx, sy] = points[0]!
    const [ex, ey] = points.at(-1)!
    const images = tiles
      .map((t) => `<image class="trip-tile" href="${OSM_TILES}/${t.z}/${t.x}/${t.y}.png" x="${t.left}" y="${t.top}" width="${TILE}" height="${TILE}"></image>`)
      .join('')
    return {
      html: `<div class="trip-mapbox"><svg class="trip-map" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="A walking route of ${points.length} points"><g class="trip-tiles">${images}</g><polyline points="${points.map((p) => p.join(',')).join(' ')}"></polyline><circle class="trip-start" cx="${sx}" cy="${sy}" r="3.5"></circle><circle class="trip-end" cx="${ex}" cy="${ey}" r="3.5"></circle></svg><a class="trip-osm" href="https://www.openstreetmap.org/copyright" target="_top">© OpenStreetMap contributors</a></div>`
    }
  }
}

export const coordinatesView: View = {
  id: `${VIEWS}coordinates`,
  async render(resource) {
    const items = lineOf(text(resource))
      .map(([lon, lat]) => `<li>${lon.toFixed(4)}, ${lat.toFixed(4)}</li>`)
      .join('')
    return { html: `<ol class="trip-coordinates">${items}</ol>` }
  }
}

// ------------------------------------------------------------------ note

/** A note of headings, paragraphs with inline code, and one line of places
 *  joined by arrows, which draws as a row of stops. */
export const noteView: View = {
  id: `${VIEWS}note`,
  async render(resource) {
    const inline = (line: string) =>
      escapeHtml(line).replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`)
    const blocks = text(resource)
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => {
        const heading = /^#{1,6} (.*)$/.exec(block)
        if (heading) return `<h3>${inline(heading[1]!)}</h3>`
        if (/ → /.test(block) && !block.includes('\n')) {
          const stops = block.split(' → ').map((s) => `<span>${escapeHtml(s.trim())}</span>`)
          return `<p class="trip-stops">${stops.join('<span class="trip-arrow" aria-label="then">→</span>')}</p>`
        }
        return `<p>${inline(block.replace(/\n/g, ' '))}</p>`
      })
    return { html: `<div class="trip-note">${blocks.join('')}</div>` }
  }
}

// ---------------------------------------------------------------- people
//
// Each draws one person: the subject the rendering is about. The file that
// holds them is a graph, which vitrine's subjects view takes apart, embedding
// every person under its own fragment, where the rule on the type picks one
// of these. The card also draws a WebID profile, which says the same things
// in FOAF and vCard, so each field reads the vocabularies in turn.

const SCHEMA = 'https://schema.org/'
const short = (iri: string) => (iri.startsWith(SCHEMA) ? `schema:${iri.slice(SCHEMA.length)}` : iri)

export const foaf = ns('http://xmlns.com/foaf/0.1/', 'Person', 'name', 'img')
const vcard = ns('http://www.w3.org/2006/vcard/ns#', 'fn', 'hasPhoto', 'role', 'organization-name')

type Person = { iri: string; name: string; line?: string; photo?: string }

export function personOf(resource: Resource): Person {
  const person = about(resource)
  const email = person.one(`${SCHEMA}email`)?.replace(/^mailto:/, '')
  const role = [person.one(vcard.role), person.one(vcard['organization-name'])].filter(Boolean).join(', ')
  const photo = person.one(vcard.hasPhoto) ?? person.one(foaf.img) ?? person.one(schema.image)
  return {
    iri: person.iri,
    name: person.one(schema.name) ?? person.one(foaf.name) ?? person.one(vcard.fn) ?? person.iri,
    line: email ?? (role || undefined),
    // An image from a document on another server: only an https URL is drawn.
    photo: photo?.startsWith('https://') ? photo : undefined
  }
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

export const cardView: View = {
  id: `${VIEWS}person-card`,
  async render(resource) {
    const p = personOf(resource)
    const face = p.photo
      ? `<img class="trip-initials" src="${escapeHtml(p.photo)}" alt="" loading="lazy" />`
      : `<span class="trip-initials" aria-hidden="true">${escapeHtml(initials(p.name))}</span>`
    return {
      html: `<article class="trip-card">${face}<span class="trip-who"><span class="trip-name">${escapeHtml(p.name)}</span>${p.line ? `<span class="trip-email">${escapeHtml(p.line)}</span>` : ''}</span></article>`
    }
  }
}

/** The person's statements, with `a` for the type as Turtle writes it. */
export const statementsView: View = {
  id: `${VIEWS}statements`,
  async render(resource) {
    const subject = resource.subject ?? resource.iri
    const rows = contentOf(resource)
      .filter((q) => q.subject.value === subject)
      .map((q) => {
        const predicate = q.predicate.value === rdf.type ? 'a' : short(q.predicate.value)
        const object = q.object.termType === 'Literal' ? `"${q.object.value}"` : short(q.object.value)
        return `<tr><td>${escapeHtml(predicate)}</td><td>${escapeHtml(object)}</td></tr>`
      })
      .join('')
    const head = `<${new URL(subject).hash || subject}>`
    return {
      html: `<table class="trip-statements"><thead><tr><th colspan="2">${escapeHtml(head)}</th></tr></thead><tbody>${rows}</tbody></table>`
    }
  }
}
