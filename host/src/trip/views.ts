// The views that draw the files in the hero's folder, two per kind of file
// where the rule table offers a switch. They belong to this page, so they
// read only the fixtures it serves and nothing here is a general parser: the
// CSV reader splits on commas and knows no quoting, the note view reads the
// three kinds of line its one note uses.

import { about, escapeHtml, type Resource, type View } from '@aleph-garden/vitrine'
import { rdf, schema } from '@aleph-garden/terms'
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

/** The points in the box, longitude scaled by the cosine of the mean
 *  latitude so a short walk keeps its shape. Good for a city; a route that
 *  crosses a continent would need a real projection. */
export function project(points: Point[]): [number, number][] {
  if (!points.length) return []
  const lats = points.map((p) => p[1])
  const cos = Math.cos((((Math.min(...lats) + Math.max(...lats)) / 2) * Math.PI) / 180)
  const xs = points.map((p) => p[0] * cos)
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
  const [y0, y1] = [Math.min(...lats), Math.max(...lats)]
  const scale = Math.min((WIDTH - 2 * PAD) / (x1 - x0 || 1), (HEIGHT - 2 * PAD) / (y1 - y0 || 1))
  const dx = (WIDTH - (x1 - x0) * scale) / 2
  const dy = (HEIGHT - (y1 - y0) * scale) / 2
  return points.map((p, i) => [
    Math.round((dx + (xs[i]! - x0) * scale) * 10) / 10,
    Math.round((dy + (y1 - p[1]) * scale) * 10) / 10
  ])
}

export const mapView: View = {
  id: `${VIEWS}map`,
  async render(resource) {
    const points = project(lineOf(text(resource)))
    if (!points.length) return { html: '<p class="trip-empty">No line in this file.</p>' }
    const [sx, sy] = points[0]!
    const [ex, ey] = points.at(-1)!
    return {
      html: `<svg class="trip-map" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="A walking route of ${points.length} points"><polyline points="${points.map((p) => p.join(',')).join(' ')}"></polyline><circle class="trip-start" cx="${sx}" cy="${sy}" r="3.5"></circle><circle class="trip-end" cx="${ex}" cy="${ey}" r="3.5"></circle></svg>`
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

type Person = { iri: string; name: string; email?: string }

export function peopleOf(resource: Resource): Person[] {
  const graph = contentOf(resource)
  const subjects = [
    ...new Set(
      graph
        .filter((q) => q.predicate.value === rdf.type && q.object.value === schema.Person)
        .map((q) => q.subject.value)
    )
  ]
  return subjects.map((iri) => {
    const person = about(graph, iri)
    const email = person.one('https://schema.org/email')
    return { iri, name: person.one(schema.name) ?? iri, email: email?.replace(/^mailto:/, '') }
  })
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

export const cardsView: View = {
  id: `${VIEWS}person-cards`,
  async render(resource) {
    const cards = peopleOf(resource)
      .map(
        (p) =>
          `<article class="trip-card"><span class="trip-initials" aria-hidden="true">${escapeHtml(initials(p.name))}</span><span class="trip-who"><span class="trip-name">${escapeHtml(p.name)}</span>${p.email ? `<span class="trip-email">${escapeHtml(p.email)}</span>` : ''}</span></article>`
      )
      .join('')
    return { html: `<div class="trip-people">${cards}</div>` }
  }
}

const SCHEMA = 'https://schema.org/'
const short = (iri: string) => (iri.startsWith(SCHEMA) ? `schema:${iri.slice(SCHEMA.length)}` : iri)

/** Each person's statements, with `a` for the type as Turtle writes it. */
export const statementsView: View = {
  id: `${VIEWS}statements`,
  async render(resource) {
    const graph = contentOf(resource)
    const tables = peopleOf(resource)
      .map((p) => {
        const rows = graph
          .filter((q) => q.subject.value === p.iri)
          .map((q) => {
            const predicate = q.predicate.value === rdf.type ? 'a' : short(q.predicate.value)
            const object =
              q.object.termType === 'Literal' ? `"${q.object.value}"` : short(q.object.value)
            return `<tr><td>${escapeHtml(predicate)}</td><td>${escapeHtml(object)}</td></tr>`
          })
          .join('')
        const subject = `<${new URL(p.iri).hash || p.iri}>`
        return `<table class="trip-statements"><thead><tr><th colspan="2">${escapeHtml(subject)}</th></tr></thead><tbody>${rows}</tbody></table>`
      })
      .join('')
    return { html: `<div class="trip-people">${tables}</div>` }
  }
}
