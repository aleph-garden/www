import { documentNote, hostDocument } from '@aleph-garden/host-core/vite'
import { defineConfig } from 'vite'
import { highlight } from './highlight.ts'

// Assets must be addressed from the origin root: the document is served
// under a location the host does not choose.
//
// publicDir is the site's own public/, so the host document and the Astro
// build draw the icons and the manifest from one place. ALEPH_HOST and
// ALEPH_NOTE come from the environment of whoever runs the build; unset,
// the document carries an empty Host node and no note.
export default defineConfig({
  base: '/',
  publicDir: '../public',
  build: { outDir: 'dist', emptyOutDir: true },
  plugins: [highlight(), hostDocument(), documentNote()]
})
