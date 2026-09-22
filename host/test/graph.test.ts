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
  graph,
  meta: [],
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
    // Three subjects here, plus the two type targets, which are subjects of
    // nothing and so are not drawn.
    expect(html.match(/<g class="node"/g)).toHaveLength(3)
  })

  test('dashes an rdf:type edge and arrows the rest', async () => {
    const { html } = await graphView.render(scheme, {} as never)
    // broader points at another subject in the document, so it is a link.
    expect(html).toContain('class="edge edge-link"')
    expect(html).toContain('marker-end="url(#graph-arrow)"')
    // Both type targets sit outside the document, so no type edge is drawn.
    expect(html).not.toContain('edge-type')
  })

  test('starts with colour off, and offers the two channels', async () => {
    const { html } = await graphView.render(scheme, {} as never)
    expect(html).toContain('data-colour="none"')
    expect(html).toContain('<button class="graph-swap" type="button" data-colour="type"')
    expect(html).toContain('data-colour="space"')
    expect(html).toContain('aria-pressed="true"')
  })

  test('assigns a categorical slot per distinct value, not per node', async () => {
    const { html } = await graphView.render(scheme, {} as never)
    // Two Concepts share a slot; the scheme gets the next one.
    expect(html.match(/data-type="1"/g)).toHaveLength(2)
    expect(html.match(/data-type="2"/g)).toHaveLength(1)
    // One namespace across all three subjects.
    expect(html.match(/data-space="1"/g)).toHaveLength(3)
  })

  test('the control switches the channel and says so on the buttons', async () => {
    const rendered = await graphView.render(scheme, {} as never)
    const root = document.createElement('div')
    root.innerHTML = rendered.html
    document.body.append(root)
    const handle = rendered.hydrate?.(root, {} as never)
    const figure = root.querySelector('.graph') as HTMLElement

    root.querySelector<HTMLButtonElement>('.graph-swap[data-colour="space"]')?.click()
    expect(figure.dataset.colour).toBe('space')
    expect(
      root.querySelector('.graph-swap[data-colour="space"]')?.getAttribute('aria-pressed')
    ).toBe('true')
    expect(
      root.querySelector('.graph-swap[data-colour="none"]')?.getAttribute('aria-pressed')
    ).toBe('false')

    handle?.dispose?.()
    root.querySelector<HTMLButtonElement>('.graph-swap[data-colour="type"]')?.click()
    expect(figure.dataset.colour).toBe('space')
  })

  test('says so when a document carries no statements', async () => {
    const { html } = await graphView.render(turtle([]), {} as never)
    expect(html).toContain('carries no statements')
  })
})
