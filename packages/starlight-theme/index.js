/**
 * The Aleph Garden theme for Starlight. It brings the design tokens, the
 * self-hosted faces, the header's site title with the project switcher, and
 * the site footer. The project keeps its own title, sidebar and content.
 *
 * `project` is the path segment the project's documentation lives under on
 * aleph.garden (`vitrine` for `/vitrine/docs/`). The switcher uses it to mark
 * the current entry in the list it fetches from `/projects.json`.
 *
 * @param {{ project: string }} options
 * @returns {import('@astrojs/starlight/types').StarlightPlugin}
 */
export default function aleph({ project }) {
  return {
    name: '@aleph-garden/starlight-theme',
    hooks: {
      'config:setup'({ config, updateConfig, addIntegration }) {
        updateConfig({
          customCss: [
            ...(config.customCss ?? []),
            '@aleph-garden/starlight-theme/fonts.css',
            '@aleph-garden/starlight-theme/tokens.css',
            '@aleph-garden/starlight-theme/starlight.css',
            '@aleph-garden/starlight-theme/footer.css'
          ],
          components: {
            ...config.components,
            SiteTitle: '@aleph-garden/starlight-theme/components/SiteTitle.astro',
            Footer: '@aleph-garden/starlight-theme/components/Footer.astro',
            PageFrame: '@aleph-garden/starlight-theme/components/PageFrame.astro'
          }
        })
        addIntegration({
          name: '@aleph-garden/starlight-theme/options',
          hooks: {
            'astro:config:setup'({ updateConfig: updateAstroConfig }) {
              updateAstroConfig({ vite: { plugins: [optionsModule({ project })] } })
            }
          }
        })
      }
    }
  }
}

const OPTIONS_ID = 'virtual:aleph-garden/starlight-theme'

/** Hands the plugin's options to the components as a virtual module. */
function optionsModule(options) {
  const resolved = `\0${OPTIONS_ID}`
  return {
    name: OPTIONS_ID,
    resolveId: (id) => (id === OPTIONS_ID ? resolved : undefined),
    load: (id) => (id === resolved ? `export default ${JSON.stringify(options)}` : undefined)
  }
}

export { footer } from './footer.js'
