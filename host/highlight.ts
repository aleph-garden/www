// A `?highlight` import answers a source file as highlighted HTML, rendered at
// build time, so the page ships coloured markup and loads no highlighter. Each
// token carries its colour for both grounds as `--shiki-light` and
// `--shiki-dark`; landing.css picks one the way it picks the tokens.
//
// The themes are Night Owl, the family the documentation's code blocks use.
// The design language has no code palette of its own yet.

import { readFile } from 'node:fs/promises'
import { codeToHtml } from 'shiki'
import type { Plugin } from 'vite'

const QUERY = '?highlight'

export function highlight(): Plugin {
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
      const code = (await readFile(file, 'utf8')).trim()
      const html = await codeToHtml(code, {
        lang: 'ts',
        themes: { light: 'night-owl-light', dark: 'night-owl' },
        defaultColor: false
      })
      this.addWatchFile(file)
      return `export default ${JSON.stringify(html)}`
    }
  }
}
