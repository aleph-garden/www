import { describe, expect, test } from 'bun:test'
import { createRenderer } from '@aleph-garden/vitrine'
import { contentOf } from '../src/graph.ts'
import { gardenHost } from '../src/host.ts'

describe('gardenHost', () => {
  test('parses a JSON-LD resource into a graph', async () => {
    const renderer = createRenderer({ parsers: gardenHost({ ambient: '' }).parsers({}), views: [] })
    const parsed = await renderer.parse({
      iri: 'https://pod.example/x.jsonld',
      contentType: 'application/ld+json',
      body: '{"@id":"#me","@type":"https://schema.org/Person"}',
      quads: [],
      allow: ['read']
    })
    expect(contentOf(parsed).map((q) => q.object.value)).toContain('https://schema.org/Person')
  })
})
