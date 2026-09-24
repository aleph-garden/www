import { ns } from '@aleph-garden/terms'
import { escapeHtml, type Quad, type Resource, type View } from '@aleph-garden/vitrine'

// An RDF document as a node-link drawing rather than a table of rows, built to
// section 4 of the design language.
//
// Two of its rules shape everything here. Term type is carried by shape and
// stroke and never by hue (4.2), and the drawing carries no hue at all. An
// rdf:type edge is dashed and unarrowed, because it says what a thing is
// rather than pointing at another thing (4.3). Every edge is labelled with its
// predicate's local name.
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
  /** Only ever an object here: described somewhere else, if anywhere. */
  outside: boolean
}

type Edge = { from: number; to: number; kind: 'link' | 'type'; label: string }

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
  const described = new Set<string>()
  const typeOf = new Map<string, string>()
  let literals = 0

  for (const quad of graph) {
    const subject = quad.subject.value
    described.add(subject)
    if (!subjects.includes(subject)) subjects.push(subject)
    if (quad.predicate.value === rdf.type && quad.object.termType === 'NamedNode') {
      if (!typeOf.has(subject)) typeOf.set(subject, quad.object.value)
    }
    if (quad.object.termType === 'Literal') literals += 1
  }
  // An IRI that is only ever an object, a class or a mailbox, is a node too,
  // so the edge to it is drawn, marked as described elsewhere. Each sits on
  // the ring right after the first subject that points at it, which keeps
  // its edge short.
  const order: string[] = []
  for (const subject of subjects) {
    order.push(subject)
    for (const quad of graph) {
      const object = quad.object.value
      if (quad.subject.value !== subject || quad.object.termType !== 'NamedNode') continue
      if (!described.has(object) && !order.includes(object)) order.push(object)
    }
  }

  const nodes: Node[] = order.map((iri, i) => {
    const label = localName(iri)
    const angle = (i / order.length) * Math.PI * 2 - Math.PI / 2
    return {
      iri,
      label,
      type: typeOf.get(iri),
      space: namespace(iri),
      w: Math.max(NODE.min, label.length * CHAR + NODE.pad),
      outside: !described.has(iri),
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
    const type = quad.predicate.value === rdf.type
    edges.push({ from, to, kind: type ? 'type' : 'link', label: type ? 'type' : localName(quad.predicate.value) })
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

export const GRAPH_VIEW = 'https://aleph.garden/views/graph'

export const graphView: View = {
  id: GRAPH_VIEW,
  when: [{ contentType: 'text/turtle' }],

  async render(resource) {
    const graph = contentOf(resource)
    if (graph.length === 0) {
      return { html: '<p class="graph-empty">This document carries no statements.</p>' }
    }

    const { nodes, edges, literals } = collect(graph)
    const subjects = nodes.filter((node) => !node.outside).length
    const outside = nodes.length - subjects
    const pointedAt = outside ? `, ${outside} ${outside === 1 ? 'resource' : 'resources'} described elsewhere` : ''

    const lines = edges
      .map((edge) => {
        const a = nodes[edge.from]
        const b = nodes[edge.to]
        const start = edgeEnd(b, a)
        const end = edgeEnd(a, b)
        const arrow = edge.kind === 'link' ? ' marker-end="url(#graph-arrow)"' : ''
        const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
        return `<line class="edge edge-${edge.kind}" x1="${start.x.toFixed(1)}" y1="${start.y.toFixed(1)}" x2="${end.x.toFixed(1)}" y2="${end.y.toFixed(1)}"${arrow} />
        <text class="edge-label" x="${mid.x.toFixed(1)}" y="${(mid.y - 4).toFixed(1)}" text-anchor="middle">${escapeHtml(edge.label)}</text>`
      })
      .join('\n        ')

    const marks = nodes
      .map((node) => {
        return `<g class="node${node.outside ? ' node-outside' : ''}">
          <rect x="${(node.x - node.w / 2).toFixed(1)}" y="${(node.y - NODE.h / 2).toFixed(1)}" width="${node.w.toFixed(1)}" height="${NODE.h}" rx="4" />
          <text x="${node.x.toFixed(1)}" y="${(node.y + 4).toFixed(1)}" text-anchor="middle">${escapeHtml(node.label)}</text>
        </g>`
      })
      .join('\n        ')

    return {
      html: `<figure class="graph">
      <svg viewBox="0 0 ${BOX.w} ${BOX.h}" role="img" aria-label="${escapeHtml(`${subjects} subjects${pointedAt}, ${edges.length} links, ${literals} literal values`)}">
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
    </figure>`
    }
  }
}

/** What the resource's own body says: the quads in the graph named by its
 *  IRI, where the renderer puts what a parser read. What is known about it
 *  from outside, and any further document, sit in other graphs. */
export function contentOf(resource: Resource): Quad[] {
  return resource.quads.filter((q) => q.graph?.value === resource.iri)
}
