import type { StarlightPlugin } from '@astrojs/starlight/types'

export default function aleph(options: { project: string }): StarlightPlugin

export function footer(options: { lockup: { light: string; dark: string }; editUrl?: string }): string
