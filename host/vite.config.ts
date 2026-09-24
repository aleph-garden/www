import { documentNote, hostDocument } from '@aleph-garden/host-core/vite'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import { ambient } from './ambient.ts'
import { highlight } from './highlight.ts'

// Assets must be addressed from the origin root: the document is served
// under a location the host does not choose.
//
// publicDir is the site's own public/, so the host document and the Astro
// build draw the icons and the manifest from one place. ALEPH_HOST and
// ALEPH_NOTE come from the environment of whoever runs the build; unset,
// the document carries an empty Host node and no note.
/** The worker serves the hero's folder from its index.ttl; the dev server
 *  does the same, so a local run resolves the folder like the deployment. */
function tripFolder(): Plugin {
  return {
    name: 'trip-folder',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/fixtures/trip/') return next()
        response.setHeader('content-type', 'text/turtle; charset=utf-8')
        response.end(readFileSync(new URL('../public/fixtures/trip/index.ttl', import.meta.url)))
      })
    }
  }
}

export default defineConfig({
  base: '/',
  publicDir: '../public',
  build: { outDir: 'dist', emptyOutDir: true },
  plugins: [ambient(), highlight(), hostDocument(), documentNote(), tripFolder()]
})
