import { describe, expect, test } from 'bun:test'
import type { Context, Quad, Resource } from '@aleph-garden/vitrine'
import { claimView } from '../src/claim.ts'

const CLAIM = 'https://pod.example/fixtures/claim.ttl'
const SCHEME = 'https://pod.example/fixtures/scheme.ttl'

const iri = (value: string) => ({ termType: 'NamedNode' as const, value })
const text = (value: string, datatype?: string) => ({
  termType: 'Literal' as const,
  value,
  ...(datatype ? { datatype } : {})
})
const quad = (s: string, p: string, o: ReturnType<typeof iri> | ReturnType<typeof text>): Quad => ({
  subject: iri(s),
  predicate: iri(p),
  object: o
})

const schema = 'https://schema.org/'
const skos = 'http://www.w3.org/2004/02/skos/core#'

const resource = (target: string, graph: Quad[]): Resource => ({
  iri: target,
  contentType: 'text/turtle',
  body: '',
  graph,
  meta: [],
  allow: ['read']
})

const claim = resource(CLAIM, [
  quad(CLAIM, `${schema}name`, text('Why a store needs no client')),
  quad(CLAIM, `${schema}text`, text('A store that answers at every IRI needs no client.')),
  quad(CLAIM, `${schema}dateCreated`, text('2026-09-22T14:02:00Z', `${schema}DateTime`)),
  quad(CLAIM, `${schema}about`, iri(`${SCHEME}#one`)),
  quad(CLAIM, `${schema}about`, iri(`${SCHEME}#two`))
])

const scheme = resource(SCHEME, [
  quad(`${SCHEME}#one`, `${skos}prefLabel`, text('Resolvable identifier')),
  quad(`${SCHEME}#one`, `${skos}scopeNote`, text('A name that answers when it is fetched.')),
  quad(`${SCHEME}#two`, `${skos}prefLabel`, text('Rule table'))
])

/** A context that answers only for the second document, and records what the
 *  view asked for, since crossing the boundary is the behaviour under test. */
const context = () => {
  const asked: string[] = []
  const ctx = {
    async resolve(target: string) {
      asked.push(target)
      return scheme
    },
    emit() {},
    events: (async function* () {})(),
    async transclude() {
      return ''
    }
  } as unknown as Context
  return { ctx, asked }
}

describe('claimView', () => {
  test('applies to a claim and to nothing else', () => {
    expect(claimView.when).toEqual([{ type: 'https://schema.org/Claim' }])
  })

  test('reads its own subject out of the graph it was handed', async () => {
    const { ctx } = context()
    const rendered = await claimView.render(claim, ctx)
    expect(rendered.html).toContain('Why a store needs no client')
    expect(rendered.html).toContain('A store that answers at every IRI needs no client.')
    expect(rendered.html).toContain('<time datetime="2026-09-22T14:02:00Z">2026-09-22</time>')
  })

  test('crosses to the other document for every subject it is about', async () => {
    const { ctx, asked } = context()
    const rendered = await claimView.render(claim, ctx)
    expect(asked).toEqual([`${SCHEME}#one`, `${SCHEME}#two`])
    expect(rendered.html).toContain('<dt>Resolvable identifier</dt>')
    expect(rendered.html).toContain('A name that answers when it is fetched.')
    expect(rendered.html).toContain('<dt>Rule table</dt>')
  })

  test('draws a claim that is about nothing at all', async () => {
    const { ctx, asked } = context()
    const bare = resource(CLAIM, [quad(CLAIM, `${schema}name`, text('Alone'))])
    const rendered = await claimView.render(bare, ctx)
    expect(asked).toEqual([])
    expect(rendered.html).toContain('Alone')
    expect(rendered.html).not.toContain('<time')
  })
})
