// The page at the host's own IRI, as a view. A rule matched the address, the
// table named this view, and what it returns is the page: there is no template
// and no document behind it. The copy says so because it is true, and the
// vocabulary drawing on the page is drawn by the same pipeline rather than
// pasted in: it is a transcluded child with a life of its own.
//
// Everything else, including the styling in ./landing.css, is this page.

import { escapeHtml, type View } from '@aleph-garden/vitrine'
import projects from '../../public/projects.json'
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

/** The Vitrine vocabulary, which the worker serves as `text/turtle` from this
 *  origin. Absolute rather than built from `origin`: the document lives at one
 *  IRI, and a local run has no worker to set the content type on it. */
export const VOCABULARY = 'https://aleph.garden/ns/vitrine'

/** One of the six labels in planning/research/narrative-and-voice.md section
 *  5. Each carries a test a stranger can apply without asking, and the badge's
 *  colour carries no meaning the word does not. */
type Label = 'Running' | 'Buildable' | 'Prototype' | 'Specified' | 'Note' | 'Parked'

type Repository = {
  name: string
  href: string
  what: string
  label: Label
  evidence: string
}

/** The public repositories only: a private one is a claim a reader cannot
 *  check. */
const LAB: Repository[] = [
  {
    name: 'vitrine',
    href: 'https://github.com/aleph-garden/vitrine',
    what: 'Turns an address into HTML. It draws this page.',
    label: 'Buildable',
    evidence: 'README commands and a docs site. Not yet run from a clean checkout.'
  },
  {
    name: 'quadpod',
    href: 'https://github.com/aleph-garden/quadpod',
    what: 'A Solid pod in Rust over Oxigraph. Every resource is a named graph in one quad store.',
    label: 'Prototype',
    evidence: 'Well before a release: it verifies credentials and issues none.'
  },
  {
    name: 'vocab',
    href: 'https://github.com/aleph-garden/vocab',
    what: 'The vocabularies the rest of the lab names, in Turtle.',
    label: 'Specified',
    evidence: 'Turtle and SHACL shapes. Nothing to build.'
  },
  {
    name: 'wiki',
    href: 'https://github.com/aleph-garden/wiki',
    what: 'RDF knowledge graphs in a Solid pod, drawn as a graph.',
    label: 'Parked',
    evidence: 'Last commit 2026-05-29.'
  }
]

const link = (href: string, text: string) =>
  `<a href="${escapeHtml(href)}" target="_top">${escapeHtml(text)}</a>`

function projectEntry(project: Project): string {
  const home = project.docs ?? project.source
  const ways = [project.docs && link(project.docs, 'Docs'), link(project.source, 'Source')].filter(Boolean)
  return `<li class="project">
            <a class="project-name" href="${escapeHtml(home)}" target="_top">${escapeHtml(project.name)} &rarr;</a>
            <span class="project-line">${escapeHtml(project.line)}</span>
            <span class="project-ways">${ways.join('')}</span>
          </li>`
}

function labEntry(repo: Repository): string {
  return `<li class="entry">
            <div class="entry-head">
              ${link(repo.href, repo.name)}
              <span class="leader" aria-hidden="true"></span>
              <span class="badge badge-${repo.label.toLowerCase()}">${escapeHtml(repo.label)}</span>
            </div>
            <p class="entry-what">${escapeHtml(repo.what)}</p>
            <p class="entry-evidence">${escapeHtml(repo.evidence)}</p>
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

function page(origin: string, sources: Sources, hero: string, vocabulary: string): string {
  const here = escapeHtml(`${origin}/`)
  return `<div class="landing">
    <div class="page">
      <div class="opening">
        ${sources.ambient}
        <div class="layout">
          <header class="intro">
            <h1 class="wordmark">${lockup('full', 'Aleph Garden')}</h1>
            <p class="statement">Aleph Garden is my lab for personal data. The mechanism it keeps coming back to: a resource has an address, a table of rules picks the code that draws it, and you replace that code without building an application around it.</p>
            <p class="byline">I am ${link('https://github.com/tophcodes', 'Christopher Mühl')} and I work on it in the open, in pieces. Some experiments stay private; these are published.</p>
            <nav class="projects" aria-labelledby="projects-heading">
              <h2 id="projects-heading">Projects</h2>
              <ul>
          ${(projects as Project[]).map(projectEntry).join('\n          ')}
              </ul>
            </nav>
          </header>

          <div class="content">
            <section class="hero">
              <figure class="artefact folder">${hero}</figure>
              <p>This page is drawn the same way. A rule matched the address <code>${here}</code>, named a view, and that view returned the markup you are reading. Change the row and the page draws differently.</p>
            </section>

            <section>
              <h2>The case it started from</h2>
              <p>A historical event is a time, a place and a set of people at once. Showing it well means a timeline, a map and a card per person, drawn from the data rather than from a page someone wrote by hand. The event is in a graph, the people are in a graph, and the vocabularies are standard and a decade old. Nothing renders that today.</p>
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
                <div class="plate">${vocabulary}</div>
                <figcaption><code>${escapeHtml(VOCABULARY)}</code>, fetched from this origin as Turtle, parsed into quads, and drawn by the view the rules picked for it. Colour is off until you ask for it, because a graph has one colour channel and the reader decides what it means.</figcaption>
              </figure>
            </section>

            <section>
              <h2>Where this is heading</h2>
              <p>Personal data is what the lab is about. I built the renderer first, because every other piece needs one to show anything.</p>
              <p>Transclusion is <strong>built</strong>: the vocabulary drawing above is a child the runtime mounted, with its own region (${link('/vitrine/docs/reference/transclusion/', 'the reference')}). Writing is <strong>specified and unbuilt</strong>: one more call on the context, the change shaped as an ActivityStreams activity, the host doing the transport (${link('https://github.com/aleph-garden/vitrine/blob/main/docs/drafts/write.md', 'write.md')}).</p>
              <p>Syncing is <strong>designed and unbuilt</strong>: convergence in the client with Automerge, the synced bytes landing in a Solid container. I found no Automerge adapter over a Solid pod anywhere, so I treat it as an experiment. Today Vitrine reads and never writes.</p>
            </section>

            <section>
              <h2>What is in the lab</h2>
              <p class="caveat">The public repositories, each with the label it has earned. Dates were measured on 2026-09-22 from each repository's own history. Every label is provisional: the test behind Buildable has not been run this quarter.</p>
              <ul class="lab-list">
          ${LAB.map(labEntry).join('\n          ')}
              </ul>
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
      const [hero, vocabulary] = await Promise.all([
        ctx.transclude(tripFolder(origin), { view: FOLDER_FRAME }),
        ctx.transclude(VOCABULARY)
      ])
      return {
        html: page(origin, sources, hero, vocabulary),
        hydrate: (root) => {
          const stop = installTheme(root)
          return { dispose: stop }
        }
      }
    }
  }
}
