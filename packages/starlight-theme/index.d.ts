import type { StarlightPlugin } from '@astrojs/starlight/types'

export default function aleph(options: { project: string; prerelease?: boolean }): StarlightPlugin

export { footer } from './footer'
