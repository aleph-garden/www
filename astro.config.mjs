// @ts-check
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import mermaid from 'astro-mermaid'

// Loads the annot client in `astro dev` only, so pages can be annotated in the
// browser. The daemon takes the project root from the query and writes there.
const annot = {
  name: 'annot',
  hooks: {
    'astro:config:setup'({ command, injectScript }) {
      if (command !== 'dev') return
      const src = `http://localhost:26668/annot.js?root=${process.cwd()}`
      injectScript('page', `import(${JSON.stringify(src)})`)
    }
  }
}

export default defineConfig({
  site: 'https://aleph.garden',
  integrations: [
    annot,
    // Before Starlight, so the ```mermaid fences are claimed before
    // Expressive Code sees them.
    mermaid({ theme: 'neutral', autoTheme: true }),
    starlight({
      title: 'Aleph Garden',
      description: 'Your data as RDF in a store you own, rendered through views you choose.',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/aleph-garden' }],
      sidebar: [
        {
          label: 'view',
          items: [
            { label: 'Overview', link: '/docs/view/' },
            { label: 'Contracts', link: '/docs/view/contracts/' },
            { label: 'Selection', link: '/docs/view/selection/' },
            { label: 'Rendering and re-render', link: '/docs/view/rendering/' },
            { label: 'Hosts', link: '/docs/view/hosts/' },
            { label: 'The Markdown view', link: '/docs/view/markdown/' }
          ]
        }
      ]
    })
  ]
})
