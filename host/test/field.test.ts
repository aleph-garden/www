import { describe, expect, test } from 'bun:test'
import { createRenderer, type Resource } from '@aleph-garden/vitrine'
import { renderInline } from '@aleph-garden/vitrine/ssr'
import { turtleParser } from '@aleph-garden/vitrine-turtle'
import { AMBIENT_VIEW, ambientView, fieldHtml } from '../src/field.ts'

// Six subjects in a ring, typed alternately, each linking to the next.
const RING = Array.from(
  { length: 6 },
  (_, i) => `<https://e.org/s${i}> a <https://e.org/T${i % 2}> ; <https://e.org/p> <https://e.org/s${(i + 1) % 6}> .`
).join('\n')

const IRI = 'https://e.org/doc'
const renderer = createRenderer({ parsers: [turtleParser()], views: [ambientView] })
const resolve = async (): Promise<Resource> => ({ iri: IRI, contentType: 'text/turtle', body: RING, quads: [], allow: ['read'] })

describe('ambientView', () => {
  test('draws a document it is named for, the way the build renders it', async () => {
    const html = await renderInline(renderer, resolve, IRI, { view: AMBIENT_VIEW })
    const svg = html.slice(html.indexOf('<svg class="ambient"'), html.indexOf('</svg>'))
    expect(svg.match(/<path /g)?.length).toBeGreaterThan(50)
    expect(new Set(svg.match(/data-slot="\d"/g))).toEqual(new Set(['data-slot="1"', 'data-slot="2"']))
    expect(svg).toContain('aria-hidden="true"')
  })

  test('draws one document the same way every time', async () => {
    const first = await renderInline(renderer, resolve, IRI, { view: AMBIENT_VIEW })
    expect(await renderInline(renderer, resolve, IRI, { view: AMBIENT_VIEW })).toBe(first)
  })

  test('is never picked by the rules', () => {
    expect(renderer.select({ iri: IRI, contentType: 'text/turtle', body: RING, quads: [], allow: [] })).toBeUndefined()
  })
})

describe('fieldHtml', () => {
  test('draws nothing for a document whose drawing has no links', () => {
    const literal = {
      subject: { termType: 'NamedNode' as const, value: 'https://e.org/s' },
      predicate: { termType: 'NamedNode' as const, value: 'https://e.org/p' },
      object: { termType: 'Literal' as const, value: 'v' }
    }
    expect(fieldHtml([literal])).toBe('')
  })
})
