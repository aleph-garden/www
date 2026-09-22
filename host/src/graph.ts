import { ns } from '@aleph-garden/terms'
import { escapeHtml, type Quad, type View } from '@aleph-garden/vitrine'

// An RDF document as a node-link drawing rather than a table of rows, built to
// section 4 of the design language.
//
// Three of its rules shape everything here. Term type is carried by shape and
// stroke and never by hue (4.2). Colour carries one meaning at a time and the
// reader picks it, so the drawing starts neutral and a control offers rdf:type
// and namespace (4.1). An rdf:type edge is dashed and unarrowed, because it
// says what a thing is rather than pointing at another thing (4.3).
//
// The layout is computed rather than simulated: one document draws one picture,
// and nothing settles while the reader watches.

const rdf = ns('http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'type')

export const BOX = { w: 960, h: 620 }
const RING = { x: 340, y: 230 }
const CHAR = 6.4
const NODE = { h: 26, pad: 24, min: 70 }

type Node = {
  iri: string
  label: string
  type: string | undefined
  space: string
  x: number
  y: number
  w: number
}

type Edge = { from: number; to: number; kind: 'link' | 'type' }

/** The last segment of an IRI, which is what a reader recognises. */
function localName(iri: string): string {
  const cut = Math.max(iri.lastIndexOf('#'), iri.lastIndexOf('/'))
  return cut === -1 ? iri : iri.slice(cut + 1) || iri
}

/** Everything up to and including the separator, which is what a reader means
 *  when they say two terms come from the same vocabulary. */
function namespace(iri: string): string {
  const cut = Math.max(iri.lastIndexOf('#'), iri.lastIndexOf('/'))
  return cut === -1 ? iri : iri.slice(0, cut + 1)
}

export function collect(graph: Quad[]): { nodes: Node[]; edges: Edge[]; literals: number } {
  const subjects: string[] = []
  const typeOf = new Map<string, string>()
  let literals = 0

  for (const quad of graph) {
    const subject = quad.subject.value
    if (!subjects.includes(subject)) subjects.push(subject)
    if (quad.predicate.value === rdf.type && quad.object.termType === 'NamedNode') {
      if (!typeOf.has(subject)) typeOf.set(subject, quad.object.value)
    }
    if (quad.object.termType === 'Literal') literals += 1
  }

  const nodes: Node[] = subjects.map((iri, i) => {
    const label = localName(iri)
    const angle = (i / subjects.length) * Math.PI * 2 - Math.PI / 2
    return {
      iri,
      label,
      type: typeOf.get(iri),
      space: namespace(iri),
      w: Math.max(NODE.min, label.length * CHAR + NODE.pad),
      x: BOX.w / 2 + Math.cos(angle) * RING.x,
      y: BOX.h / 2 + Math.sin(angle) * RING.y
    }
  })

  const at = new Map(nodes.map((node, i) => [node.iri, i]))
  const edges: Edge[] = []
  for (const quad of graph) {
    if (quad.object.termType !== 'NamedNode') continue
    const from = at.get(quad.subject.value)
    const to = at.get(quad.object.value)
    if (from === undefined || to === undefined || from === to) continue
    edges.push({ from, to, kind: quad.predicate.value === rdf.type ? 'type' : 'link' })
  }
  return { nodes, edges, literals }
}

/** Six categorical slots per channel, in the order the values are met, so a
 *  colour says "the same as that one" and carries nothing else. */
export function slotsFor(nodes: Node[], of: (node: Node) => string | undefined): Map<string, number> {
  const slots = new Map<string, number>()
  for (const node of nodes) {
    const value = of(node)
    if (value && !slots.has(value)) slots.set(value, (slots.size % 6) + 1)
  }
  return slots
}

/** Where a line from `from` meets `to`'s box, so an edge stops at the border
 *  instead of running under the label. */
function edgeEnd(from: Node, to: Node): { x: number; y: number } {
  const dx = from.x - to.x
  const dy = from.y - to.y
  const half = { x: to.w / 2 + 4, y: NODE.h / 2 + 4 }
  const scale = Math.max(Math.abs(dx) / half.x, Math.abs(dy) / half.y) || 1
  return { x: to.x + dx / scale, y: to.y + dy / scale }
}

/** The colour-by control, wired by the view that drew it. Flipping one
 *  attribute on the figure is the whole mechanism: the stylesheet decides what
 *  a channel looks like, and the key for the inactive channels is hidden the
 *  same way. */
function hydrate(root: Element): { dispose(): void } {
  const figure = root.querySelector<HTMLElement>('.graph')
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('.graph-swap')]
  if (!figure) return { dispose() {} }

  const show = (channel: string) => {
    figure.dataset.colour = channel
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.colour === channel))
    }
  }
  const off = buttons.map((button) => {
    const pick = () => show(button.dataset.colour ?? 'none')
    button.addEventListener('click', pick)
    return () => button.removeEventListener('click', pick)
  })
  return {
    dispose() {
      for (const stop of off) stop()
    }
  }
}

export const GRAPH_VIEW = 'https://aleph.garden/views/graph'

export const graphView: View = {
  id: GRAPH_VIEW,
  when: [{ contentType: 'text/turtle' }],

  async render(resource) {
    const graph = resource.graph ?? []
    if (graph.length === 0) {
      return { html: '<p class="graph-empty">This document carries no statements.</p>' }
    }

    const { nodes, edges, literals } = collect(graph)
    const byType = slotsFor(nodes, (node) => node.type)
    const bySpace = slotsFor(nodes, (node) => node.space)

    const lines = edges
      .map((edge) => {
        const a = nodes[edge.from]
        const b = nodes[edge.to]
        const start = edgeEnd(b, a)
        const end = edgeEnd(a, b)
        const arrow = edge.kind === 'link' ? ' marker-end="url(#graph-arrow)"' : ''
        return `<line class="edge edge-${edge.kind}" x1="${start.x.toFixed(1)}" y1="${start.y.toFixed(1)}" x2="${end.x.toFixed(1)}" y2="${end.y.toFixed(1)}"${arrow} />`
      })
      .join('\n        ')

    const marks = nodes
      .map((node) => {
        const type = node.type ? byType.get(node.type) : undefined
        const space = bySpace.get(node.space)
        return `<g class="node" data-type="${type ?? 0}" data-space="${space ?? 0}">
          <rect x="${(node.x - node.w / 2).toFixed(1)}" y="${(node.y - NODE.h / 2).toFixed(1)}" width="${node.w.toFixed(1)}" height="${NODE.h}" rx="4" />
          <text x="${node.x.toFixed(1)}" y="${(node.y + 4).toFixed(1)}" text-anchor="middle">${escapeHtml(node.label)}</text>
        </g>`
      })
      .join('\n        ')

    const key = (slots: Map<string, number>, channel: string) =>
      [...slots.entries()]
        .map(
          ([value, slot]) =>
            `<li data-slot="${slot}"><span class="swatch"></span>${escapeHtml(localName(value) || value)}</li>`
        )
        .join('\n          ') || `<li class="none">nothing to group by ${channel}</li>`

    return {
      hydrate,
      html: `<figure class="graph" data-colour="none">
      <div class="graph-control" role="group" aria-label="Colour by">
        <span class="graph-control-label">Colour by</span>
        <button class="graph-swap" type="button" data-colour="none" aria-pressed="true">nothing</button>
        <button class="graph-swap" type="button" data-colour="type" aria-pressed="false">type</button>
        <button class="graph-swap" type="button" data-colour="space" aria-pressed="false">namespace</button>
      </div>
      <svg viewBox="0 0 ${BOX.w} ${BOX.h}" role="img" aria-label="${escapeHtml(`${nodes.length} subjects, ${edges.length} links between them, ${literals} literal values`)}">
        <defs>
          <marker id="graph-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L6 3 L0 6 z" />
          </marker>
        </defs>
        <g class="edges">
        ${lines}
        </g>
        ${marks}
      </svg>
      <ul class="graph-key" data-channel="type">
          ${key(byType, 'type')}
      </ul>
      <ul class="graph-key" data-channel="space">
          ${key(bySpace, 'namespace')}
      </ul>
      <figcaption>${nodes.length} subjects and ${edges.length} links between them. The ${literals} literal values they carry are left out, because at this size they would bury the shape.</figcaption>
    </figure>`
    }
  }
}
