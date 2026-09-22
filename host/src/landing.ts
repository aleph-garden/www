// The page at the host's own IRI, as a view. A rule matched the address, the
// table named this view, and what it returns is the page: there is no template
// and no document behind it. The copy says so because it is true, and the two
// live slots on the page are drawn by the same pipeline rather than pasted in:
// each is a transcluded child with a life of its own.
//
// The navigation bar is site chrome and lives in ./chrome/nav.ts, so a second
// page on this deployment can carry it. The pipeline drawing lives in
// ./diagram.ts. Everything else, including the styling in ./landing.css, is
// this page.

import { escapeHtml, type View } from '@aleph-garden/vitrine'
import { installNav, navHtml } from './chrome/nav.ts'
import { pipelineDiagram } from './diagram.ts'

export const LANDING_VIEW = 'https://aleph.garden/views/landing'

/** The three-line checklist the hero draws. A file in public/, resolved and
 *  rendered like any other resource, so the claim the caption makes about it
 *  is one a reader can check by opening the address. */
export const CHECKLIST_PATH = '/fixtures/packing.txt'

/** The Vitrine vocabulary, which the worker serves as `text/turtle` from this
 *  origin. Absolute rather than built from `origin`: the document lives at one
 *  IRI, and a local run has no worker to set the content type on it. */
export const VOCABULARY = 'https://aleph.garden/ns/vitrine'

/** One of the six labels in planning/research/narrative-and-voice.md section
 *  5. Each carries a test a stranger can apply without asking, and the badge's
 *  colour carries no meaning the word does not. */
type Label = 'Running' | 'Buildable' | 'Prototype' | 'Specified' | 'Note' | 'Parked'

/** What a reader can check, as text with the links spelled out, so that every
 *  segment is escaped and no row carries markup. */
type Evidence = (string | { href: string; text: string })[]

type Repository = {
  name: string
  what: string
  label: Label
  /** The date the label's test was last run, or `untested` where nobody has
   *  run it. A label without a date is a claim without evidence. */
  checked: string
  evidence: Evidence
}

const LAB: Repository[] = [
  {
    name: 'memex',
    what: 'Search over the hub that collects what the other pieces write.',
    label: 'Running',
    checked: 'untested',
    evidence: ['In use against the live hub. Private; the machine is not named yet.']
  },
  {
    name: 'www',
    what: 'The deployment. This page is what it serves at the root of the domain.',
    label: 'Running',
    checked: 'untested',
    evidence: [
      'Its own workflow deploys ',
      { href: 'https://aleph.garden/', text: 'aleph.garden' },
      ' from main to Cloudflare Pages.'
    ]
  },
  {
    name: 'vitrine',
    what: 'Turns an address into HTML. It draws this page.',
    label: 'Buildable',
    checked: 'untested',
    evidence: [
      { href: 'https://github.com/aleph-garden/vitrine', text: 'repository' },
      ', README commands, docs site. Not run from a clean checkout.'
    ]
  },
  {
    name: 'quadpod',
    what: 'A Solid pod in Rust over Oxigraph. Every resource is a named graph in one quad store.',
    label: 'Prototype',
    checked: 'untested',
    evidence: [
      { href: 'https://github.com/aleph-garden/quadpod', text: 'repository' },
      '. Well before a release: it verifies credentials and issues none.'
    ]
  },
  {
    name: 'marginalia',
    what: 'Deferred semantics for CommonMark. SPARQL CONSTRUCT rules give a document meaning.',
    label: 'Prototype',
    checked: 'untested',
    evidence: ['Private. Its README calls it an experiment at 0.1.0.']
  },
  {
    name: 'garden',
    what: 'SKOS concepts placed as rooms in a generated garden, to see a scheme by walking it.',
    label: 'Prototype',
    checked: 'untested',
    evidence: ['Private. Runs for one person.']
  },
  {
    name: 'vocab',
    what: 'The vocabularies the rest of the lab names, in Turtle.',
    label: 'Specified',
    checked: 'untested',
    evidence: [
      'Published ',
      { href: 'https://github.com/aleph-garden/vocab', text: 'Turtle and SHACL shapes' },
      '. Nothing to build.'
    ]
  },
  {
    name: 'wiki',
    what: 'RDF knowledge graphs in a Solid pod, drawn as a graph.',
    label: 'Parked',
    checked: 'untested',
    evidence: [
      { href: 'https://github.com/aleph-garden/wiki', text: 'repository' },
      '. Last commit 2026-05-29.'
    ]
  },
  {
    name: 'aleph',
    what: 'The umbrella repository and its VitePress site.',
    label: 'Parked',
    checked: 'untested',
    evidence: ['Its site was replaced by this deployment and its deploy job was retired.']
  }
]

function evidenceHtml(evidence: Evidence): string {
  return evidence
    .map((part) =>
      typeof part === 'string'
        ? escapeHtml(part)
        : `<a href="${escapeHtml(part.href)}" target="_top">${escapeHtml(part.text)}</a>`
    )
    .join('')
}

function row(repo: Repository): string {
  return `<tr>
          <td class="name">${escapeHtml(repo.name)}</td>
          <td>${escapeHtml(repo.what)}</td>
          <td class="label"><span class="badge badge-${repo.label.toLowerCase()}">${escapeHtml(repo.label)}</span> <span class="checked">${escapeHtml(repo.checked)}</span></td>
          <td class="closed">${evidenceHtml(repo.evidence)}</td>
        </tr>`
}

/** The rule table the page's own two live slots came out of. Both rows end at
 *  the same view; what differs between the two resources is the parser that
 *  ran before the table was tested. */
function dispatchTable(origin: string): string {
  const rows = [
    { iri: `${origin}${CHECKLIST_PATH}`, type: 'text/plain', parser: 'none, so bytes' },
    { iri: VOCABULARY, type: 'text/turtle', parser: 'Turtle, so a graph' }
  ]
  return `<table class="dispatch">
          <thead>
            <tr><th>Resource</th><th>Content type</th><th>Parsed</th><th>View</th></tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `<tr>
              <td class="name">${escapeHtml(new URL(r.iri).pathname)}</td>
              <td class="name">${escapeHtml(r.type)}</td>
              <td>${escapeHtml(r.parser)}</td>
              <td class="name">views#fallback</td>
            </tr>`
              )
              .join('\n            ')}
          </tbody>
        </table>`
}

function page(origin: string, checklist: string, vocabulary: string): string {
  const here = escapeHtml(`${origin}/`)
  const checklistIri = escapeHtml(`${origin}${CHECKLIST_PATH}`)
  return `<div class="landing">
    ${navHtml()}
    <div class="page">

      <section class="band split hero">
        <div class="prose">
          <h1 class="wordmark"><picture><source srcset="/brand/lockup-horizontal-full-dark.svg" media="(prefers-color-scheme: dark)" /><img src="/brand/lockup-horizontal-full-light.svg" alt="Aleph Garden" /></picture></h1>
          <p class="statement">A resource has an address, a table of rules picks the code that draws it, and you replace that code without building an application around it.</p>
          <p class="byline">My workshop for that one mechanism. I am <a href="https://github.com/tophcodes" target="_top">Christopher M&uuml;hl</a> and I work on it in the open, in pieces.</p>
        </div>
        <figure class="artefact">
          <div class="field">
            <span class="field-name">IRI</span>
            <code>${checklistIri}</code>
          </div>
          <div class="field">
            <span class="field-name">Rule</span>
            <code class="muted">no condition &rarr; views#fallback</code>
          </div>
          <div class="slot">${checklist}</div>
          <figcaption>Drawn here by the same pipeline that drew the page around it. A rule matched <code>${here}</code> and named the view that returned this markup; the file above arrived at the last row of the same table, and its view returned the three lines in this slot.</figcaption>
        </figure>
      </section>

      <section class="band split reversed">
        <figure class="artefact">
          <div class="plate">${pipelineDiagram()}</div>
          <figcaption>The three rows are the ones this deployment holds, in the order the renderer tests them.</figcaption>
        </figure>
        <div class="prose">
          <h2>The frame comes out of drawing</h2>
          <p>To show one kind of thing on the web you build an application: fetching, authentication, routing, layout, state, a deployment. The drawing is the small part and the frame around it is the work.</p>
          <p>A table of rules maps an address, its content type or its type to a view: a function that takes the resource and returns HTML. Change one row and every resource of that kind draws differently, everywhere it is opened.</p>
        </div>
      </section>

      <section class="band split">
        <div class="prose">
          <h2>Where this is heading</h2>
          <p>The direction underneath is a platform for personal data with RDF first class rather than RDF-first, and Vitrine is the artifact that falls out of it.</p>
          <p>Writing is <strong>specified and unbuilt</strong>: one more call on the context, the change shaped as an ActivityStreams activity, the host doing the transport (<a href="https://github.com/aleph-garden/vitrine/blob/main/docs/drafts/write.md" target="_top">write.md</a>). Transclusion is <strong>built</strong>: the two live slots on this page are children the runtime mounted, each with a life of its own (<a href="https://github.com/aleph-garden/vitrine/blob/main/docs/drafts/transclusion.md" target="_top">transclusion.md</a>).</p>
          <p>Syncing is <strong>designed and unbuilt</strong>: convergence in the client with Automerge, the synced bytes landing in a Solid container. I found no Automerge adapter over a Solid pod anywhere, so it is an experiment rather than a plan. Today Vitrine reads and never writes.</p>
        </div>
        <figure class="artefact">
          <div class="plate">${vocabulary}</div>
          <figcaption><code>${escapeHtml(VOCABULARY)}</code>, fetched from this origin as Turtle, parsed into quads, and drawn as a table of statements by the view the rules picked for it.</figcaption>
        </figure>
      </section>

      <section class="band split reversed">
        <figure class="artefact">
          <div class="plate">${dispatchTable(origin)}</div>
          <figcaption>Both slots above reached the same view. The parser that ran before the table was tested is what made them draw differently.</figcaption>
        </figure>
        <div class="prose">
          <h2>Two resources, one table</h2>
          <p>The two slots above hold a plain text file and a Turtle document. Neither view was chosen by hand: the table was tested against each resource in turn, and both times the row that held was the last one, which carries no condition at all. What differs sits upstream of the table. A parser is registered for <code>text/turtle</code> and none for <code>text/plain</code>, so one resource arrived carrying a graph and the other arrived as bytes, and the one view drew a table of statements for the first and the file's own text for the second.</p>
          <p>A view that meets something it does not understand hands it back to the table instead of branching on it, so a child can live on a server neither of us runs.</p>
          <p>The addresses are IRIs and the data underneath is RDF, so a rule can say &ldquo;anything of this type&rdquo; and have the type mean the same thing in my store and in yours.</p>
          <p class="caveat">This section was drawn to show one note rendered by two different views side by side. The deployment registers three views and the Markdown view is not among them: it waits on the region becoming a sandboxed iframe. Until it lands there is no second view here to draw one resource a second way, so the section shows two resources through one table instead.</p>
        </div>
      </section>

      <section class="band">
        <h2>What is in the lab</h2>
        <p class="caveat">Nine repositories, ordered by label. Dates were measured on 2026-09-22 from each repository's own history.</p>
        <p class="caveat">Every label is provisional: the tests behind Running and Buildable have not been run this quarter, so each badge shows <code>untested</code> where its date belongs.</p>
        <table class="lab">
          <thead>
            <tr><th>Repository</th><th>What it does</th><th>Label</th><th>Evidence</th></tr>
          </thead>
          <tbody>
            ${LAB.map(row).join('\n            ')}
          </tbody>
        </table>
      </section>

    </div>
  </div>`
}

/** Applies to the one IRI the deployment answers with this document, which it
 *  takes from the location rather than from the build, so that a preview
 *  deployment and a local run greet as well. Links to pages carry
 *  `target="_top"`, so the browser follows them instead of the runtime drawing
 *  the link's IRI in the region. */
export function landingView(origin: string): View {
  return {
    id: LANDING_VIEW,
    when: [{ iri: `${origin}/` }],
    async render(_resource, ctx) {
      // Both slots are asked for before the HTML is assembled, because what
      // `transclude` answers goes into the string verbatim: a placeholder the
      // runtime mounts a child into, or the child itself on a host that
      // renders ahead of time.
      const [checklist, vocabulary] = await Promise.all([
        ctx.transclude(`${origin}${CHECKLIST_PATH}`),
        ctx.transclude(VOCABULARY)
      ])
      return {
        html: page(origin, checklist, vocabulary),
        hydrate: (root) => ({ dispose: installNav(root) })
      }
    }
  }
}
