// The two faces of one artefact: the file, and the file running. Both are in
// the markup and the stylesheet shows the one the container's state names, so
// nothing here writes markup into the document.

/** Wires every panel group in `root` and answers the teardown. */
export function installPanels(root: ParentNode): () => void {
  const groups = [...root.querySelectorAll<HTMLElement>('.panels')]
  const off: (() => void)[] = []

  for (const group of groups) {
    // Scoped, because a group can hold another group inside a panel.
    const tabs = [...group.querySelectorAll<HTMLButtonElement>(':scope > .tabs > .tab')]
    const panels = [...group.querySelectorAll<HTMLElement>(':scope > .panel')]
    const show = (name: string) => {
      group.dataset.showing = name
      for (const panel of panels) panel.hidden = panel.dataset.panel !== name
      for (const tab of tabs) tab.setAttribute('aria-selected', String(tab.dataset.panel === name))
    }
    for (const tab of tabs) {
      const pick = () => show(tab.dataset.panel ?? 'source')
      tab.addEventListener('click', pick)
      off.push(() => tab.removeEventListener('click', pick))
    }
    show(group.dataset.showing ?? 'source')
  }

  return () => {
    for (const stop of off) stop()
  }
}
