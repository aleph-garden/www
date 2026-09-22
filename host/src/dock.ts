// The bar at the top of the landing page takes its ground, its rule and the
// small wordmark once the large wordmark in the opening has passed under it.
// The switch is an attribute flip with no transition: section 5.4 of the
// design language forbids any animation triggered by scroll position.

/** Watches the opening's wordmark in `root`, if both it and the bar are there,
 *  and answers the teardown. */
export function installDock(root: ParentNode): () => void {
  const bar = root.querySelector<HTMLElement>('.controls')
  const mark = root.querySelector('.opening .wordmark')
  if (!bar || !mark || typeof IntersectionObserver === 'undefined') return () => {}

  const observer = new IntersectionObserver(
    ([entry]) => {
      bar.dataset.docked = String(!entry.isIntersecting)
    },
    // The bar covers the top of the viewport, so the wordmark counts as gone
    // once it is behind the bar.
    { rootMargin: `-${bar.offsetHeight}px 0px 0px 0px` }
  )
  observer.observe(mark)
  return () => observer.disconnect()
}
