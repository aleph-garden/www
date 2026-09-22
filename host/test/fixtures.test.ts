import { describe, expect, test } from 'bun:test'

// The claim ships twice, as Turtle and as JSON-LD, because the page offers
// both. Nothing keeps them in step, so this does: every value that carries
// meaning has to appear in both files. Comparing quads would be stronger and
// needs a Turtle parser, which does not resolve under bun in this package.

const read = (name: string) => Bun.file(`public/fixtures/${name}`).text()

const VALUES = [
  'Why a store needs no client',
  '2026-09-22T14:02:00Z',
  'https://github.com/tophcodes',
  // Relative in both files, so each resolves against its own document.
  'scheme.ttl#resolvable-identifier',
  'scheme.ttl#content-negotiation',
  'scheme.ttl#rule-table',
  'needs no client of its own'
]

describe('the claim fixtures', () => {
  test('say the same things in both representations', async () => {
    const turtle = await read('claim.ttl')
    const jsonld = await read('claim.jsonld')
    for (const value of VALUES) {
      expect(turtle).toContain(value)
      expect(jsonld).toContain(value)
    }
  })

  test('both name the claim as the same type', async () => {
    expect(await read('claim.ttl')).toContain('a schema:Claim')
    expect(await read('claim.jsonld')).toContain('"@type": "schema:Claim"')
  })

  test('the scheme holds a label for every subject the claim is about', async () => {
    const scheme = await read('scheme.ttl')
    for (const value of VALUES.filter((v) => v.includes('scheme.ttl#'))) {
      expect(scheme).toContain(`<#${value.split('#')[1]}>`)
    }
    expect(scheme.match(/skos:prefLabel/g)).toHaveLength(3)
  })
})
