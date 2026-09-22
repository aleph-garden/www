export const THEME_STATES: readonly ['system', 'light', 'dark']
export type ThemeMode = (typeof THEME_STATES)[number]
export const THEME_LABEL: Record<ThemeMode, string>
export function themeToggle(): string
export function installTheme(root: ParentNode): () => void
