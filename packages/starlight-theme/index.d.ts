import type { StarlightPlugin } from '@astrojs/starlight/types'

export default function aleph(options: { project: string }): StarlightPlugin

export { footer } from './footer'
