// The field behind the landing page, rendered at build time. An `?ambient`
// import answers a Turtle document as the ambient view draws it, through
// Vitrine's own server-side renderer, so the page carries finished markup and
// computes nothing when it loads.

import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { createRenderer, type Resource } from '@aleph-garden/vitrine'
import { renderInline } from '@aleph-garden/vitrine/ssr'
import { turtleParser } from '@aleph-garden/vitrine-turtle'
import type { Plugin } from 'vite'
import { AMBIENT_VIEW, ambientView } from './src/field.ts'

const QUERY = '?ambient'

export function ambient(): Plugin {
  const renderer = createRenderer({ parsers: [turtleParser()], views: [ambientView] })

  return {
    name: 'aleph-ambient',
    enforce: 'pre',

    resolveId(source, importer) {
      if (!source.endsWith(QUERY) || !importer) return
      const file = new URL(source.slice(0, -QUERY.length), `file://${importer}`).pathname
      return file + QUERY
    },

    async load(id) {
      if (!id.endsWith(QUERY)) return
      const file = id.slice(0, -QUERY.length)
      const iri = pathToFileURL(file).href
      const body = await readFile(file, 'utf8')
      const resolve = async (): Promise<Resource> => ({ iri, contentType: 'text/turtle', body, quads: [], allow: ['read'] })
      const html = await renderInline(renderer, resolve, iri, { view: AMBIENT_VIEW })
      // The file is watched, so editing the vocabulary redraws the field in dev.
      this.addWatchFile(file)
      return `export default ${JSON.stringify(html)}`
    }
  }
}
