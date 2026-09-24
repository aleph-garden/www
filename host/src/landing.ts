// The page at the host's own IRI, as a view. A rule matched the address, the
// table named this view, and what it returns is the page: there is no template
// and no document behind it. The copy says so because it is true, and the
// two people on the page are drawn by the same pipeline rather than pasted in:
// each is a transcluded child with a life of its own.
//
// Everything else, including the styling in ./landing.css, is this page.

import { escapeHtml, type View } from '@aleph-garden/vitrine'
import projects from '../../public/projects.json'
import { WEBID_FRAME } from './people.ts'
import { FOLDER_FRAME, tripFolder } from './trip/index.ts'
import { footer } from '@aleph-garden/starlight-theme/footer'
import { installTheme } from '@aleph-garden/starlight-theme/theme'
import fullDark from '@aleph-garden/brand/lockups/lockup-horizontal-full-dark.svg?url'
import fullLight from '@aleph-garden/brand/lockups/lockup-horizontal-full-light.svg?url'
import shortDark from '@aleph-garden/brand/lockups/lockup-horizontal-short-dark.svg?url'
import shortLight from '@aleph-garden/brand/lockups/lockup-horizontal-short-light.svg?url'

export const LANDING_VIEW = 'https://aleph.garden/views/landing'

/** What the build prepares for the page: the field behind the opening, which
 *  the ambient view drew from the vocabulary. */
export type Sources = { ambient: string }

/** One entry of `public/projects.json`, the list the landing and the docs
 *  header's project switcher both read. `docs` is absent for a project
 *  without documentation. */
export type Project = { name: string; line: string; docs?: string; source: string }

/** Two WebID profiles on two servers this deployment does not run: a static
 *  file and a Solid pod. Each is fetched when the page loads and drawn by
 *  whichever view the rules pick for the person it describes. */
export const PEOPLE = [
  { document: 'https://toph.so/profile', fragment: 'me' },
  { document: 'https://timbl.solidcommunity.net/profile/card', fragment: 'me' }
] as const

/** One of the six labels in planning/research/narrative-and-voice.md section
 *  5. Each carries a test a stranger can apply without asking, and the badge's
 *  colour carries no meaning the word does not. */
type Label = 'Running' | 'Buildable' | 'Prototype' | 'Specified' | 'Note' | 'Parked'

/** The label each project has earned, with the evidence behind it, keyed by
 *  its source repository. A project without an entry shows no badge. */
const STATUS: Record<string, { label: Label; evidence: string }> = {
  'https://github.com/aleph-garden/vitrine': {
    label: 'Buildable',
    evidence: 'README commands and a docs site. Not yet run from a clean checkout.'
  },
  'https://github.com/aleph-garden/quadpod': {
    label: 'Prototype',
    evidence: 'Well before a release: it verifies credentials and issues none.'
  }
}

const link = (href: string, text: string) =>
  `<a href="${escapeHtml(href)}" target="_top">${escapeHtml(text)}</a>`

function projectEntry(project: Project): string {
  const home = project.docs ?? project.source
  const ways = [project.docs && link(project.docs, 'Docs'), link(project.source, 'Source')].filter(Boolean)
  const status = STATUS[project.source]
  const badge = status
    ? `<span class="badge badge-${status.label.toLowerCase()}" title="${escapeHtml(status.evidence)}">${escapeHtml(status.label)}</span>`
    : ''
  return `<li class="project">
            <span class="project-head"><a class="project-name" href="${escapeHtml(home)}" target="_top">${escapeHtml(project.name)} &rarr;</a>${badge}</span>
            <span class="project-line">${escapeHtml(project.line)}</span>
            <span class="project-ways">${ways.join('')}</span>
          </li>`
}

/** Both lockups sit in the markup and the stylesheet shows the one for the
 *  current ground. */
const LOCKUPS = {
  full: { light: fullLight, dark: fullDark },
  short: { light: shortLight, dark: shortDark }
}
const lockup = (variant: 'full' | 'short', alt: string) =>
  `<img class="on-light" src="${LOCKUPS[variant].light}" alt="${alt}" /><img class="on-dark" src="${LOCKUPS[variant].dark}" alt="${alt}" />`

/** The site footer every page on aleph.garden draws, with the link to the
 *  view that drew this one. */
const siteFooter = footer({
  lockup: LOCKUPS.short,
  source: {
    href: 'https://github.com/aleph-garden/www/blob/main/host/src/landing.ts',
    text: 'The view drawing this page'
  }
})

function page(sources: Sources, hero: string, people: string[]): string {
  return `<div class="landing">
    <div class="page">
      <div class="opening">
        ${sources.ambient}
        <div class="layout">
          <header class="intro">
            <h1 class="wordmark">${lockup('full', 'Aleph Garden')}</h1>
            <p class="statement">Aleph Garden is my lab for personal data. The mechanism it keeps coming back to: a resource has an address, a table of rules picks the code that draws it, and you replace that code without building an application around it.</p>
            <p class="byline">by ${link('https://github.com/tophcodes', 'Christopher Mühl')}</p>
            <nav class="projects" aria-labelledby="projects-heading">
              <h2 id="projects-heading">Projects</h2>
              <ul>
          ${(projects as Project[]).map(projectEntry).join('\n          ')}
              </ul>
            </nav>
          </header>

          <div class="content">
            <section class="hero">
              <p class="hero-note">A demo: the folder of a trip to Lisbon, five files of different kinds. Each one is drawn by the view a rule below picked for it. Click a rule and everything it matches redraws.</p>
              <figure class="artefact folder">${hero}</figure>
            </section>

            <section>
              <h2>The case it started from</h2>
              <p>A historical event is a time, a place and a set of people at once. Showing it well means a timeline, a map and a card per person, drawn from the data rather than from a page someone wrote by hand. The event is in a graph, the people are in a graph, and the vocabularies are standard and a decade old. Nothing<button type="button" class="footnote-ref" popovertarget="footnote-nothing" aria-label="Footnote 1">1</button> renders that today.</p>
              <p class="footnote" id="footnote-nothing" popover>Nothing that I know of.</p>
            </section>

            <section>
              <h2>Why there are so few renderers</h2>
              <p>To show one kind of thing on the web you build an application: fetching, authentication, routing, layout, state, a deployment. The renderer is the small part and the frame around it is the work. So a few applications exist per domain, each shaped by the requirements of whoever built it, and each one is a silo of a second kind. The data may be yours; the way you see it belongs to them.</p>
            </section>

            <section>
              <h2>The mechanism</h2>
              <p>A resource has an address. A table of rules maps that address to a view, and a view is a function that takes the resource and returns HTML. Rules match on the content type, on the type, on the address itself, or on whether the resource is a container. A text file, a spreadsheet and a note go through the same table.</p>
              <p>With that in place the frame stops being the work. An application keeps its shell, its session and its navigation, and you replace the one part that bothers you. Your replacement then applies everywhere a resource of that kind is opened, because the rule table decides.</p>
              <p>A view that meets something it does not understand hands it back to the table. An event view shows a person without ever learning what a person view is, and the person keeps its own region, its own updates and its own links. Over addresses this crosses machines too, so a child can live on a server neither of us runs.</p>
            </section>

            <section>
              <h2>The substrate</h2>
              <p>The addresses are IRIs, and where the data has structure it is RDF. That lets a rule say &ldquo;anything of this type&rdquo; and have the type mean the same thing in my store and in yours, and it lets a view someone else published apply to my data with no schema negotiated between us.</p>
              <p>Which store holds it stays open: a Solid pod, a directory of files, or a CRDT-backed graph. The renderer knows no server, no protocol and no RDF library of its own. A host fetches, the renderer draws.</p>
              <figure class="artefact">
                <div class="people">
                  ${people.join('')}
                </div>
                <figcaption>Two WebID profiles, fetched from their own servers when this page loads: a static file on <code>toph.so</code> and a Solid pod on <code>solidcommunity.net</code>. They describe their person with different properties, and both declare the type <code>foaf:Person</code>. One rule sends that type to <code>person-card</code>, which draws both.</figcaption>
              </figure>
            </section>

            <section>
              <h2>Where this is heading</h2>
              <p>Personal data is what the lab is about. I built the renderer first, because every other piece needs one to show anything.</p>
              <p>Transclusion is <strong>built</strong>: each card above is a child the runtime mounted, with its own region (${link('/vitrine/docs/reference/transclusion/', 'the reference')}). Writing is <strong>specified and unbuilt</strong>: one more call on the context, the change shaped as an ActivityStreams activity, the host doing the transport (${link('https://github.com/aleph-garden/vitrine/blob/main/docs/drafts/write.md', 'write.md')}).</p>
              <p>Syncing is <strong>designed and unbuilt</strong>: convergence in the client with Automerge, the synced bytes landing in a Solid container. I found no Automerge adapter over a Solid pod anywhere, so I treat it as an experiment. Today Vitrine reads and never writes.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
    ${siteFooter}
  </div>`
}

/** Applies to the one IRI the deployment answers with this document, which it
 *  takes from the location rather than from the build, so that a preview
 *  deployment and a local run greet as well. Links to pages carry
 *  `target="_top"`, so the browser follows them instead of the runtime drawing
 *  the link's IRI in the region. */
export function landingView(origin: string, sources: Sources): View {
  return {
    id: LANDING_VIEW,
    when: [{ iri: `${origin}/` }],
    async render(_resource, ctx) {
      // What `transclude` answers goes into the string verbatim: a placeholder
      // the runtime mounts a child into, or the child itself on a host that
      // renders ahead of time.
      const [hero, ...people] = await Promise.all([
        ctx.transclude(tripFolder(origin), { view: FOLDER_FRAME }),
        ...PEOPLE.map(({ document, fragment }) => ctx.transclude(document, { fragment, view: WEBID_FRAME }))
      ])
      return {
        html: page(sources, hero, people),
        hydrate: (root) => {
          const stop = installTheme(root)
          return { dispose: stop }
        }
      }
    }
  }
}
