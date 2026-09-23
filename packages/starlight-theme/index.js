import { fileURLToPath } from 'node:url'

/**
 * The Aleph Garden theme for Starlight. It brings the design tokens, the
 * faces from aleph.garden with their preloads, the header's site title with the project switcher, and
 * the site footer. The project keeps its own title, sidebar and content.
 *
 * `project` is the path segment the project's documentation lives under on
 * aleph.garden (`vitrine` for `/vitrine/docs/`). The switcher uses it to mark
 * the current entry in the list it fetches from `/projects.json`. With
 * `prerelease` set, every page carries a notice that nothing before 1.0 is
 * stable.
 *
 * @param {{ project: string, prerelease?: boolean }} options
 * @returns {import('@astrojs/starlight/types').StarlightPlugin}
 */
export default function aleph({ project, prerelease = false }) {
  return {
    name: '@aleph-garden/starlight-theme',
    hooks: {
      'config:setup'({ config, updateConfig, addIntegration }) {
        updateConfig({
          head: [...(config.head ?? []), ...PRELOAD],
          customCss: [
            ...(config.customCss ?? []),
            '@aleph-garden/starlight-theme/starlight.css',
            '@aleph-garden/starlight-theme/footer.css'
          ],
          components: {
            ...config.components,
            Banner: '@aleph-garden/starlight-theme/components/Banner.astro',
            SiteTitle: '@aleph-garden/starlight-theme/components/SiteTitle.astro',
            Footer: '@aleph-garden/starlight-theme/components/Footer.astro',
            PageFrame: '@aleph-garden/starlight-theme/components/PageFrame.astro'
          }
        })
        addIntegration({
          name: '@aleph-garden/starlight-theme/options',
          hooks: {
            'astro:config:setup'({ config: astroConfig, updateConfig: updateAstroConfig }) {
              const root = fileURLToPath(astroConfig.root)
              updateAstroConfig({ vite: { plugins: [optionsModule({ project, prerelease, root })] } })
            }
          }
        })
      }
    }
  }
}

/** The two faces a page sets above the fold, fetched before the stylesheet
 *  asks for them. Their URLs are the ones fonts-aleph-garden.css names. */
const PRELOAD = [
  'https://aleph.garden/fonts/ibm-plex-sans-latin.woff2',
  'https://aleph.garden/fonts/sora-semibold-latin.woff2'
].map((href) => ({
  tag: 'link',
  attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: 'anonymous', href }
}))

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
