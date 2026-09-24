// The page at the host's own IRI, as a view. A rule matched the address, the
// table named this view, and what it returns is the page: there is no template
// and no document behind it. The copy says so because it is true, and the
// folder in the hero is drawn by the same pipeline rather than pasted in: it is
// a transcluded child with a life of its own.
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
 *  the ambient view drew from the vocabulary, and the example views as
 *  highlighted HTML, from a module the type check compiles like any other. */
export type Sources = { ambient: string; views: string }

/** One entry of `public/projects.json`, the list the landing and the docs
 *  header's project switcher both read. `docs` is absent for a project
 *  without documentation. */
export type Project = { name: string; line: string; docs?: string; source: string }

/** The lab's private projects. The page names them under a fold and gives
 *  them neither a link nor a label, since a stranger can check neither. */
const BENCH: { name: string; line: string }[] = [
  { name: 'Ingest', line: 'scheduled flows that bring my messages, documents, places, coding and screen time into my pod' },
  { name: 'Marginalia', line: 'a Markdown note becomes a graph of its structure, and a query you can swap decides what it means' },
  { name: 'Memory Garden', line: 'spaced review over any concept hierarchy stored in a pod' },
  { name: 'Memex', line: 'search and a daily dashboard over what the ingest brings in' }
]

/** One of the six labels in planning/research/narrative-and-voice.md section
 *  5. Each carries a test a stranger can apply without asking, and the badge's
 *  colour carries no meaning the word does not. */
type Label = 'Running' | 'Buildable' | 'Prototype' | 'Specified' | 'Note' | 'Parked'

/** The label each project has earned, with the evidence behind it, keyed by
 *  its source repository. A project without an entry shows no badge. */
const STATUS: Record<string, { label: Label; evidence: string }> = {
  'https://github.com/aleph-garden/vitrine': {
    label: 'Running',
    evidence: 'Draws this page on aleph.garden, 2026-09-24. On npm at 0.3.2-dev. Not yet run from a clean checkout.'
  },
  'https://github.com/aleph-garden/quadpod': {
    label: 'Prototype',
    evidence: 'Well before a release: it verifies credentials and issues none.'
  }
}

const link = (href: string, text: string) =>
  `<a href="${escapeHtml(href)}" target="_top">${escapeHtml(text)}</a>`

const badge = (label: Label, evidence?: string) =>
  `<span class="badge badge-${label.toLowerCase()}"${evidence ? ` title="${escapeHtml(evidence)}"` : ''}>${escapeHtml(label)}</span>`

function projectEntry(project: Project): string {
  const home = project.docs ?? project.source
  const ways = [project.docs && link(project.docs, 'Docs'), link(project.source, 'Source')].filter(Boolean)
  const status = STATUS[project.source]
  return `<li class="project">
            <span class="project-head"><a class="project-name" href="${escapeHtml(home)}" target="_top">${escapeHtml(project.name)} &rarr;</a>${status ? badge(status.label, status.evidence) : ''}</span>
            <span class="project-line">${escapeHtml(project.line)}</span>
            <span class="project-ways">${ways.join('')}</span>
          </li>`
}

const bench = () => `<details class="bench">
              <summary>Also in the lab, private until mature enough</summary>
              <ul>
                ${BENCH.map((p) => `<li><span class="bench-name">${escapeHtml(p.name)}</span>: ${escapeHtml(p.line)}</li>`).join('\n                ')}
              </ul>
            </details>`

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

function page(sources: Sources, hero: string): string {
  return `<div class="landing">
    <div class="page">
      <div class="opening">
        ${sources.ambient}
        <div class="layout">
          <header class="intro">
            <h1 class="wordmark">${lockup('full', 'Aleph Garden')}</h1>
            <p class="statement">Aleph Garden is my lab for code written for a kind of data instead of for one app&rsquo;s copy of it. Its main piece is Vitrine, a TypeScript library that takes an address and picks the view that draws it, by the file&rsquo;s type or by what its data says it is. It draws this page.</p>
            <p class="limits">Today it reads public files and writes nothing. It is before 1.0, and one person works on it.</p>
            <nav class="projects" aria-labelledby="projects-heading">
              <h2 id="projects-heading">Projects</h2>
              <ul>
          ${(projects as Project[]).map(projectEntry).join('\n          ')}
              </ul>
            ${bench()}
            </nav>
          </header>

          <div class="content">
            <section class="hero">
              <p class="hero-note">A demo: the folder of a trip to Lisbon, five files of different kinds. Each one is drawn by the view a rule below picked for it. Click a rule and everything it matches redraws.</p>
              <figure class="artefact folder">${hero}</figure>
            </section>

            <section>
              <h2>A view, in full</h2>
              <p>The first view is picked for every CSV file and uses no RDF. The second is picked for anything that says it is a person.</p>
              <div class="example">${sources.views}</div>
              <p><code>render</code> returns HTML. The page that embeds Vitrine can set rules of its own over a view&rsquo;s <code>when</code>, and ${link('/vitrine/docs/', 'the docs')} have the rest.</p>
            </section>

            <section>
              <h2>What I am working toward</h2>
              <p>Knowledge drawn the way each reader prefers. The same concepts can be a map to walk, a timeline or cards to review, and which of them helps depends on the reader. The rules pick the view, so a reader&rsquo;s preferences can be rules too: one reader gets the map, another the cards, from the same data.</p>
              <p>For that, everything that is code today becomes data. A view gets its own address, and what is published there names the view&rsquo;s code, what it can draw and the rules it answers to. A reader keeps a list of the views they accept and their preferences among them, and any page that draws for them reads both. The same rules then reach past drawing: they can decide how a mail or a chat message becomes records when it comes in, and what a server keeps from a scanned letter it stores. Running a view from someone else&rsquo;s address means running their code on my data, and ${link('/vitrine/docs/design/sandboxing/', 'the sandboxing notes')} are where that stands.</p>
              <p class="status">Views that adapt to a reader, views and rules as data: to build.</p>
              <p>Along the way the same rules make smaller things possible:</p>
              <ul class="next">
                <li><strong>Spaced review over any hierarchy of concepts.</strong> Memory Garden schedules it. ${badge('Prototype')}, private.</li>
                <li><strong>A timeline across tools that never heard of each other.</strong> One query finds everything with a <code>schema:startDate</code>, and each result goes to whatever view the rules pick for it. Coding time, screen time and places would share one timeline with no code in the timeline for any of them, because each source&rsquo;s mapping writes the <code>schema:startDate</code> when its data comes in.</li>
              </ul>
            </section>

            <section>
              <h2>The substrate</h2>
              <p>The addresses are IRIs, and where the data has structure it is RDF. That lets a rule say &ldquo;anything of this type&rdquo;. Two sources still have to pick the same vocabulary, and one like schema.org or FOAF is public and older than either of them, so that agreement costs less than agreeing on one app's format. A view still has to cope with how differently two sources fill it in. The rule <code>type schema:Person</code> in the folder above is one of those rules: it switches both people at once, whatever file they sit in.</p>
              <p>Which store holds the data stays open: a Solid pod, a directory of files, or a CRDT-backed graph. Vitrine parses nothing itself. The page it runs in does the fetching and plugs in a parser for Turtle or JSON-LD.</p>
            </section>

            <section>
              <h2>Where this sits</h2>
              <p>${link('https://github.com/SolidOS/solidos', 'SolidOS')}, ${link('https://github.com/ali1k/ld-r', 'LD-R')}, ${link('https://github.com/TopQuadrant/shacl/blob/master/src/main/resources/rdf/dash.ttl', 'DASH')} and ${link('https://www.w3.org/2005/04/fresnel-info/', 'Fresnel')} choose views from data too, and they are further along. Each does it inside its own stack and for RDF: the Solid data browser, a React app over a SPARQL endpoint, SHACL forms. The lab tries it with no stack assumed and for any file, and wants the choice to end with the reader. Outside RDF the nearest is ${link('https://www.inkandswitch.com/patchwork/notebook/', 'Patchwork')}, which picks a tool for each kind of document inside one environment, and ${link('https://www.inkandswitch.com/cambria/', 'Cambria')}&rsquo;s small lenses between schemas are the model for how data comes in.</p>
            </section>

            <section>
              <h2>What you could build next week</h2>
              <ul class="next">
                <li><strong>Open your own file through this site.</strong> Put a Markdown, Turtle or JSON-LD file at a public address that allows cross-origin reads and sends the right content type, then open it behind <code>https://aleph.garden/-/</code>, as in ${link('https://aleph.garden/-/https://toph.so/profile#me', 'aleph.garden/-/https://toph.so/profile#me')}. Raw GitHub sends every file as plain text, so a Markdown file from there draws as plain text. A folder on a Solid pod opens as a list of its files. Addresses with a query string do not open yet, and only public files open here.</li>
                <li><strong>Write a view for your own kind of document.</strong> Start from the example above. The library is on npm as <code>@aleph-garden/vitrine</code>, and until 1.0 you follow its breaking changes by hand.</li>
              </ul>
              <p>What is missing: Vitrine reads and never writes. Writing is specified and unbuilt (${link('https://github.com/aleph-garden/vitrine/blob/main/docs/drafts/write.md', 'write.md')}). Logging in to a pod works against my own development pod and has no written contract yet. If one of these looks like yours, write to me at ${link('mailto:toph@aleph.garden', 'toph@aleph.garden')}.</p>
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
      const hero = await ctx.transclude(tripFolder(origin), { view: FOLDER_FRAME })
      return {
        html: page(sources, hero),
        hydrate: (root) => {
          const stop = installTheme(root)
          return { dispose: stop }
        }
      }
    }
  }
}
