// The page at the host's own IRI, as a view. A rule matched the address, the
// table named this view, and what it returns is the page: there is no template
// and no document behind it. The copy says so because it is true, and the two
// live slots on the page are drawn by the same pipeline rather than pasted in:
// each is a transcluded child with a life of its own.
//
// The navigation bar is site chrome and lives in ./chrome/nav.ts, so a second
// page on this deployment can carry it. The pipeline drawing lives in
// Everything else, including the styling in ./landing.css, is
// this page.

import { escapeHtml, fallbackView, type View } from '@aleph-garden/vitrine'
import { installPanels } from './panels.ts'
import { installTheme, THEME_LABEL } from './theme.ts'

export const LANDING_VIEW = 'https://aleph.garden/views/landing'

/** The three-line checklist the hero draws. A file in public/, resolved and
 *  rendered like any other resource, so the claim the caption makes about it
 *  is one a reader can check by opening the address. */
export const CHECKLIST_PATH = '/fixtures/packing.txt'

/** The claim the view beside its own source draws. */
export const CLAIM_PATH = '/fixtures/claim.ttl'

/** The same claim, coloured at build time in each representation the picker
 *  offers, and the view's own source. */
export type Sources = { turtle: string; jsonld: string; view: string }

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
  evidence: Evidence
}

const LAB: Repository[] = [
  {
    name: 'vitrine',
    what: 'Turns an address into HTML. It draws this page.',
    label: 'Buildable',
    evidence: [
      { href: 'https://github.com/aleph-garden/vitrine', text: 'repository' },
      ', README commands, docs site. Not run from a clean checkout.'
    ]
  },
  {
    name: 'quadpod',
    what: 'A Solid pod in Rust over Oxigraph. Every resource is a named graph in one quad store.',
    label: 'Prototype',
    evidence: [
      { href: 'https://github.com/aleph-garden/quadpod', text: 'repository' },
      '. Well before a release: it verifies credentials and issues none.'
    ]
  },
  {
    name: 'marginalia',
    what: 'Deferred semantics for CommonMark. SPARQL CONSTRUCT rules give a document meaning.',
    label: 'Prototype',
    evidence: ['Private. Its README calls it an experiment at 0.1.0.']
  },
  {
    name: 'vocab',
    what: 'The vocabularies the rest of the lab names, in Turtle.',
    label: 'Specified',
    evidence: [
      'Published ',
      { href: 'https://github.com/aleph-garden/vocab', text: 'Turtle and SHACL shapes' },
      '. Nothing to build.'
    ]
  },
  {
    name: 'garden',
    what: 'SKOS concepts placed as rooms in a generated garden, to see a scheme by walking it.',
    label: 'Parked',
    evidence: ['Private. Last commit 2026-08-25.']
  },
  {
    name: 'wiki',
    what: 'RDF knowledge graphs in a Solid pod, drawn as a graph.',
    label: 'Parked',
    evidence: [
      { href: 'https://github.com/aleph-garden/wiki', text: 'repository' },
      '. Last commit 2026-05-29.'
    ]
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
          <td class="label"><span class="badge badge-${repo.label.toLowerCase()}">${escapeHtml(repo.label)}</span></td>
          <td class="closed">${evidenceHtml(repo.evidence)}</td>
        </tr>`
}

/** Held back until a second view exists. The deployment registers three views
 *  and the Markdown view waits on the region becoming a sandboxed iframe, so
 *  there is no second way to draw one resource here yet. The markup stays so
 *  that the section returns rather than being written a second time. */
const SHOW_DISPATCH = false

function dispatchSection(origin: string): string {
  if (!SHOW_DISPATCH) return ''
  return `      <section class="band split reversed">
        <figure class="artefact">
          <div class="plate">${dispatchTable(origin)}</div>
          <figcaption>Both slots above reached the same view. The parser that ran before the table was tested made them draw differently.</figcaption>
        </figure>
        <div class="prose">
          <h2>Two resources, one table</h2>
          <p>The two slots above hold a plain text file and a Turtle document. Neither view was chosen by hand: the table was tested against each resource in turn, and both times the row that held was the last one, which carries no condition at all. What differs sits upstream of the table. A parser is registered for <code>text/turtle</code> and none for <code>text/plain</code>, so one resource arrived carrying a graph and the other arrived as bytes, and the one view drew a table of statements for the first and the file's own text for the second.</p>
          <p>A view that meets something it does not understand hands it back to the table instead of branching on it, so a child can live on a server neither of us runs.</p>
          <p>The addresses are IRIs and the data underneath is RDF, so a rule can say &ldquo;anything of this type&rdquo; and have the type mean the same thing in my store and in yours.</p>
          <p class="caveat">This section was drawn to show one note rendered by two different views side by side. The deployment registers three views and the Markdown view is not among them: it waits on the region becoming a sandboxed iframe. Until it lands there is no second view here to draw one resource a second way, so the section shows two resources through one table instead.</p>
        </div>
      </section>`
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

/** The three controls the page carries, at the top of its own column rather
 *  than at the edge of the window. `target="_top"` on the links, so the
 *  browser follows them instead of the runtime opening them as resources.
 *  All three appearance glyphs are here and the stylesheet shows the one the
 *  button's state names. */
function topControls(): string {
  return `<div class="controls">
      <a class="docs" href="/vitrine/docs/" target="_top">Docs</a>
      <a class="icon" href="https://github.com/aleph-garden" target="_top" aria-label="Aleph Garden on GitHub">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.07-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A7.995 7.995 0 0 0 16 8c0-4.42-3.58-8-8-8Z" fill="currentColor"/></svg>
      </a>
      <button class="icon theme-toggle" type="button" data-mode="system" aria-label="${escapeHtml(THEME_LABEL.system)}">
        <svg data-mode="system" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.75a6.25 6.25 0 0 0 0 12.5z" fill="currentColor"/></svg>
        <svg data-mode="light" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="3.25" fill="currentColor"/><path d="M8 .75v2M8 13.25v2M.75 8h2M13.25 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <svg data-mode="dark" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M13.2 10.4A5.6 5.6 0 0 1 5.6 2.8a5.75 5.75 0 1 0 7.6 7.6z" fill="currentColor"/></svg>
      </button>
    </div>`
}

function page(
  origin: string,
  sources: Sources,
  checklist: string,
  vocabulary: string,
  claim: string,
  statements: string
): string {
  const here = escapeHtml(`${origin}/`)
  const checklistIri = escapeHtml(`${origin}${CHECKLIST_PATH}`)
  const claimPath = CLAIM_PATH
  return `<div class="landing">
    <div class="page">
      ${topControls()}

      <section class="band split hero">
        <div class="prose">
          <h1 class="wordmark"><img class="on-light" src="/brand/lockup-horizontal-full-light.svg" alt="Aleph Garden" /><img class="on-dark" src="/brand/lockup-horizontal-full-dark.svg" alt="Aleph Garden" /></h1>
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
        <figure class="artefact bleed">
          <div class="panels" data-showing="resource">
            <div class="tabs" role="tablist" aria-label="What to look at">
              <button class="tab" type="button" role="tab" data-panel="resource" aria-selected="true">Resource</button>
              <button class="tab" type="button" role="tab" data-panel="viewer" aria-selected="false">Viewer</button>
            </div>
            <div class="panel" data-panel="resource">
              <div class="panels picker" data-showing="turtle">
                <div class="tabs" role="tablist" aria-label="Representation">
                  <button class="tab" type="button" role="tab" data-panel="turtle" aria-selected="true">Turtle</button>
                  <button class="tab" type="button" role="tab" data-panel="jsonld" aria-selected="false">JSON-LD</button>
                  <button class="tab" type="button" role="tab" data-panel="table" aria-selected="false">Statements</button>
                </div>
                <div class="panel" data-panel="turtle">${sources.turtle}</div>
                <div class="panel" data-panel="jsonld" hidden>${sources.jsonld}</div>
                <div class="panel" data-panel="table" hidden>${statements}</div>
              </div>
            </div>
            <div class="panel" data-panel="viewer" hidden>
              ${claim}
              <details class="source">
                <summary>Show source</summary>
                ${sources.view}
              </details>
            </div>
          </div>
          <figcaption><code>${escapeHtml(claimPath)}</code> in three representations, and the view the rules picked for it. The statements are drawn by the fallback view, which is what any RDF resource gets when nothing more specific applies.</figcaption>
        </figure>
        <div class="prose">
          <h2>A view is a rule and a function</h2>
          <p>A view is an object with an id, the conditions under which it applies, and <code>render</code>. It is handed the resource, which carries its content type, its bytes, and, where the bytes are RDF, its quads as a flat array of plain objects. It returns HTML.</p>
          <p>Under <em>Show source</em>, that file fetches nothing, keeps no state, and carries no router and no build of its own. Those jobs still exist. They sit in the host: the program that fetches, holds the session, owns the rule table, and hands a view its <code>resolve</code>. One host serves every view on a deployment, so the work is done once and each view stays this size.</p>
          <p>The lines that reach <code>schema:about</code> are where it leaves the resource. Those subjects live in a second document, getting them is one call, and what comes back is read exactly like what was already there.</p>
        </div>
      </section>

      <section class="band split">
        <div class="prose">
          <h2>Where this is heading</h2>
          <p>The direction underneath is a platform for personal data whose storage is RDF and whose surface is ordinary reading and writing. I built the renderer first, because every other piece needs one.</p>
          <p>Writing is <strong>specified and unbuilt</strong>: one more call on the context, the change shaped as an ActivityStreams activity, the host doing the transport (<a href="https://github.com/aleph-garden/vitrine/blob/main/docs/drafts/write.md" target="_top">write.md</a>). Transclusion is <strong>built</strong>: the two live slots on this page are children the runtime mounted, each with a life of its own (<a href="/vitrine/docs/reference/transclusion/" target="_top">the reference</a>).</p>
          <p>Syncing is <strong>designed and unbuilt</strong>: convergence in the client with Automerge, the synced bytes landing in a Solid container. I found no Automerge adapter over a Solid pod anywhere, so it is an experiment rather than a plan. Today Vitrine reads and never writes.</p>
        </div>
        <figure class="artefact">
          <div class="plate">${vocabulary}</div>
          <figcaption><code>${escapeHtml(VOCABULARY)}</code>, fetched from this origin as Turtle, parsed into quads, and drawn by the view the rules picked for it. Colour is off until you ask for it, because a graph has one colour channel and the reader decides what it means.</figcaption>
        </figure>
      </section>

      ${dispatchSection(origin)}

      <section class="band">
        <h2>What is in the lab</h2>
        <p class="caveat">Six repositories, ordered by label. Dates were measured on 2026-09-22 from each repository's own history.</p>
        <p class="caveat">Every label is provisional: the test behind Buildable has not been run this quarter.</p>
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
export function landingView(origin: string, sources: Sources): View {
  return {
    id: LANDING_VIEW,
    when: [{ iri: `${origin}/` }],
    async render(_resource, ctx) {
      // Both slots are asked for before the HTML is assembled, because what
      // `transclude` answers goes into the string verbatim: a placeholder the
      // runtime mounts a child into, or the child itself on a host that
      // renders ahead of time.
      const claimIri = `${origin}${CLAIM_PATH}`
      const [checklist, vocabulary, claim, statements] = await Promise.all([
        ctx.transclude(`${origin}${CHECKLIST_PATH}`),
        ctx.transclude(VOCABULARY),
        ctx.transclude(claimIri),
        // The same resource, with the view named rather than chosen, so the
        // picker's third face is the table any RDF resource falls back to.
        ctx.transclude(claimIri, { view: fallbackView.id })
      ])
      return {
        html: page(origin, sources, checklist, vocabulary, claim, statements),
        hydrate: (root) => {
          const stops = [installTheme(root), installPanels(root)]
          return {
            dispose: () => {
              for (const stop of stops) stop()
            }
          }
        }
      }
    }
  }
}
