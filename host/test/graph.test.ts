import { describe, expect, test } from 'bun:test'
import type { Quad, Resource } from '@aleph-garden/vitrine'
import { graphView } from '../src/graph.ts'

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
const SKOS = 'http://www.w3.org/2004/02/skos/core#'
const DOC = 'https://pod.example/scheme.ttl'

const iri = (value: string) => ({ termType: 'NamedNode' as const, value })
const text = (value: string) => ({ termType: 'Literal' as const, value })
const quad = (s: string, p: string, o: { termType: string; value: string }): Quad =>
  ({ subject: iri(s), predicate: iri(p), object: o }) as Quad

const turtle = (graph: Quad[]): Resource => ({
  iri: DOC,
  contentType: 'text/turtle',
  body: '',
  quads: graph.map((q) => ({ ...q, graph: iri(DOC) })),
  allow: ['read']
})

const scheme = turtle([
  quad(`${DOC}#one`, RDF_TYPE, iri(`${SKOS}Concept`)),
  quad(`${DOC}#one`, `${SKOS}prefLabel`, text('One')),
  quad(`${DOC}#two`, RDF_TYPE, iri(`${SKOS}Concept`)),
  quad(`${DOC}#two`, `${SKOS}broader`, iri(`${DOC}#one`)),
  quad(`${DOC}#scheme`, RDF_TYPE, iri(`${SKOS}ConceptScheme`))
])

describe('graphView', () => {
  test('draws every subject as a node with its local name inside', async () => {
    const { html } = await graphView.render(scheme, {} as never)
    for (const name of ['one', 'two', 'scheme']) {
      expect(html).toContain(`>${name}</text>`)
    }
    // Three subjects here, and the two type targets, which are subjects of
    // nothing and so are drawn as pointed at from here.
    expect(html.match(/<g class="node"/g)).toHaveLength(3)
    expect(html.match(/<g class="node node-outside"/g)).toHaveLength(2)
  })

  test('dashes an rdf:type edge and arrows the rest', async () => {
    const { html } = await graphView.render(scheme, {} as never)
    // broader points at another subject in the document, so it is a link.
    expect(html).toContain('class="edge edge-link"')
    expect(html).toContain('marker-end="url(#graph-arrow)"')
    // The type targets are nodes too, so each type statement is a dashed edge.
    expect(html.match(/class="edge edge-type"/g)).toHaveLength(3)
  })

  test('labels each edge with its predicate', async () => {
    const { html } = await graphView.render(scheme, {} as never)
    expect(html).toContain('>broader</text>')
    expect(html.match(/class="edge-label"[^>]*>type</g)).toHaveLength(3)
  })

  test('says so when a document carries no statements', async () => {
    const { html } = await graphView.render(turtle([]), {} as never)
    expect(html).toContain('carries no statements')
  })
})
