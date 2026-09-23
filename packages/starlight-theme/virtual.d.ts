declare module 'virtual:aleph-garden/starlight-theme' {
  /** `project` and `prerelease` as the plugin was given them; `root` is the Astro project root, as an absolute path. */
  const options: { project: string; prerelease: boolean; root: string }
  export default options
}
