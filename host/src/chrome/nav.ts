// The site's own navigation bar: the wordmark and the Sub-projects menu.
//
// Site chrome, not view chrome. It belongs to aleph.garden rather than to any
// one resource, and a second page on this deployment is expected to carry it,
// so it stays a module of its own with no import from the view that uses it.
// The shell's corner pill in host-core is a different control: that one names
// the resource on show and holds the session, and neither knows about the
// other.
//
// Two halves, because a view returns a string and hydrates afterwards:
// `navHtml` is what the view inlines, `installNav` is the behaviour. The CSP
// on the deployment is `script-src 'self'` with Trusted Types, so there is no
// inline handler anywhere here; every listener is attached in `installNav`.

import { escapeHtml } from '@aleph-garden/vitrine'

/** One entry in the Sub-projects menu: what it is and where its own pages
 *  are. A sub-project with nothing a reader can open is not listed, which is
 *  why five of the nine repositories are absent. */
type SubProject = {
  name: string
  what: string
  href: string
  /** What the link promises, so the reader knows whether it is worth a click
   *  before following it. */
  entry: string
}

const SUB_PROJECTS: SubProject[] = [
  {
    name: 'Vitrine',
    what: 'One IRI in, HTML out. A rule table picks the view and the view returns the markup.',
    href: '/vitrine/docs/',
    entry: 'Documentation and contracts'
  },
  {
    name: 'Vocab',
    what: 'The terms the rest of the lab names, published as Turtle with SHACL shapes.',
    href: 'https://github.com/aleph-garden/vocab',
    entry: 'Term reference'
  },
  {
    name: 'Quadpod',
    what: 'A Solid pod in Rust. Every resource is a named graph in one quad store, so a question that spans resources is one query.',
    href: 'https://github.com/aleph-garden/quadpod',
    entry: 'Repository and README'
  },
  {
    name: 'Wiki',
    what: 'RDF knowledge graphs in a Solid pod, drawn as a graph. Parked since 2026-05-29.',
    href: 'https://github.com/aleph-garden/wiki',
    entry: 'Repository and README'
  }
]

const PANEL_ID = 'site-nav-subprojects'

function card(project: SubProject): string {
  return `<div class="site-nav-card">
          <h3>${escapeHtml(project.name)}</h3>
          <p>${escapeHtml(project.what)}</p>
          <a href="${escapeHtml(project.href)}" target="_top">${escapeHtml(project.entry)} &rarr;</a>
        </div>`
}

/** The bar, and the menu closed. A view inlines this verbatim and calls
 *  `installNav` on the region it rendered into. Every link carries
 *  `target="_top"`: these are pages, and the runtime would otherwise treat a
 *  click as a request to draw the link's IRI in the region. */
export function navHtml(): string {
  return `<div class="site-nav">
      <nav class="site-nav-bar" aria-label="Site">
        <a class="site-nav-wordmark" href="/">Aleph Garden</a>
        <button class="site-nav-toggle" type="button" aria-expanded="false" aria-controls="${PANEL_ID}">Sub-projects <svg class="site-nav-caret" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true"><path d="M1 1 5 5 9 1" /></svg></button>
      </nav>
      <div class="site-nav-panel" id="${PANEL_ID}" hidden>
        <div class="site-nav-panel-inner">
          <p class="site-nav-eyebrow">The sub-projects that have a page today. The other five are private and have none.</p>
          <div class="site-nav-cards">
            ${SUB_PROJECTS.map(card).join('\n            ')}
          </div>
        </div>
      </div>
    </div>`
}

/** Wires the menu inside `root` and answers the teardown. Click on the button
 *  toggles, Escape closes and puts focus back on the button, a click outside
 *  the bar closes. `hidden` on the panel is the open state: it keeps the menu
 *  out of the accessibility tree and out of the tab order while it is shut,
 *  which a CSS-only `display: none` would not guarantee to a reader whose
 *  stylesheet failed to load. */
export function installNav(root: ParentNode): () => void {
  const nav = root.querySelector<HTMLElement>('.site-nav')
  const toggle = nav?.querySelector<HTMLButtonElement>('.site-nav-toggle')
  const panel = nav?.querySelector<HTMLElement>('.site-nav-panel')
  if (!nav || !toggle || !panel) return () => {}

  // `hidden` also takes the string "until-found", so the open state is read
  // back as the one value that means shown.
  const isOpen = () => panel.hidden === false

  const setOpen = (open: boolean) => {
    panel.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
  }

  const onToggle = () => setOpen(!isOpen())

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !isOpen()) return
    setOpen(false)
    toggle.focus()
  }

  const onOutside = (event: MouseEvent) => {
    const target = event.target
    if (!isOpen() || (target instanceof Node && nav.contains(target))) return
    setOpen(false)
  }

  toggle.addEventListener('click', onToggle)
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('click', onOutside)

  return () => {
    toggle.removeEventListener('click', onToggle)
    document.removeEventListener('keydown', onKeydown)
    document.removeEventListener('click', onOutside)
  }
}
