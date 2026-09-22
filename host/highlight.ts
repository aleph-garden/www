// Syntax colouring at build time. A `?highlight` import answers the file as
// finished markup, so the browser loads no highlighter: the CSP forbids a
// script from another origin, and a highlighter that writes into the document
// at runtime would hit the Trusted Types sink the view protocol avoids.
//
// Shiki is already in the tree, brought in by Astro and by Starlight's code
// blocks, so this adds no dependency. Both themes are emitted as custom
// properties (`defaultColor: false`) and the stylesheet picks one, because the
// page resolves its appearance from `data-ag-theme` rather than from the
// browser alone.

import { readFile } from 'node:fs/promises'
import type { Plugin } from 'vite'

const QUERY = '?highlight'
const LANGS = { '.ts': 'ts', '.ttl': 'turtle', '.jsonld': 'json' } as const

const LIGHT = 'vitesse-light'
const DARK = 'vitesse-dark'

/** One highlighter for the whole build; creating it loads the grammar. */
const create = () =>
  import('shiki').then((shiki) =>
    shiki.createHighlighter({ themes: [LIGHT, DARK], langs: [...new Set(Object.values(LANGS))] })
  )

export function highlight(): Plugin {
  let load: ReturnType<typeof create> | undefined

  return {
    name: 'aleph-highlight',
    enforce: 'pre',

    resolveId(source, importer) {
      if (!source.endsWith(QUERY) || !importer) return
      const file = new URL(source.slice(0, -QUERY.length), `file://${importer}`).pathname
      return file + QUERY
    },

    async load(id) {
      if (!id.endsWith(QUERY)) return
      const file = id.slice(0, -QUERY.length)
      const code = await readFile(file, 'utf8')

      const extension = file.slice(file.lastIndexOf('.')) as keyof typeof LANGS
      const lang = LANGS[extension]
      if (!lang) {
        this.error(`no grammar for ${extension}; add one to LANGS`)
      }

      const shiki = await (load ??= create())

      const html = shiki.codeToHtml(code.trim(), {
        lang,
        themes: { light: LIGHT, dark: DARK },
        defaultColor: false
      })
      // The file is watched, so editing the view re-colours it in dev.
      this.addWatchFile(file)
      return `export default ${JSON.stringify(html)}`
    }
  }
}
