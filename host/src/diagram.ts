// The pipeline drawn by hand. Five stages and the arrows between them, as
// inline SVG: every colour and stroke comes from a `--ag-` token through a
// class in landing.css, so the drawing follows the reader's colour scheme the
// way the rest of the page does, and no diagramming library is loaded.
//
// The three rows in the rule table are the rows this deployment actually
// holds, in the order the renderer tests them: the first view whose
// conditions all hold wins, and the fallback view carries no condition, so it
// holds for everything that reached it.

/** The mechanism as a picture, at 420 by 422 user units. The container in
 *  landing.css scrolls it rather than letting it widen the page. */
export function pipelineDiagram(): string {
  return `<svg class="diagram" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 422" role="img" aria-labelledby="diagram-title diagram-desc">
      <title id="diagram-title">From an address to HTML</title>
      <desc id="diagram-desc">An address resolves to a resource. A rule table of three rows is tested against the resource in order and names a view. The view returns HTML, which is sanitised into the region.</desc>
      <defs>
        <marker class="diagram-head" id="diagram-arrow" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 0 8 4 0 8Z" />
        </marker>
      </defs>

      <rect class="diagram-box" x="10" y="8" width="400" height="52" rx="6" />
      <text class="diagram-stage" x="24" y="30">address</text>
      <text class="diagram-detail" x="24" y="48">aleph.garden/-/&lt;iri&gt;</text>

      <line class="diagram-arrow" x1="48" y1="60" x2="48" y2="86" marker-end="url(#diagram-arrow)" />
      <text class="diagram-step" x="60" y="77">resolve</text>

      <rect class="diagram-box" x="10" y="86" width="400" height="52" rx="6" />
      <text class="diagram-stage" x="24" y="108">resource</text>
      <text class="diagram-detail" x="24" y="126">IRI &#183; content type &#183; body</text>

      <line class="diagram-arrow" x1="48" y1="138" x2="48" y2="164" marker-end="url(#diagram-arrow)" />
      <text class="diagram-step" x="60" y="155">tested in order</text>

      <rect class="diagram-box diagram-box-key" x="10" y="164" width="400" height="94" rx="6" />
      <text class="diagram-stage" x="24" y="186">rule table</text>
      <text class="diagram-detail" x="24" y="206">iri = the host&#8217;s own</text>
      <text class="diagram-detail" x="250" y="206">&#8594; landing</text>
      <text class="diagram-detail" x="24" y="224">container</text>
      <text class="diagram-detail" x="250" y="224">&#8594; container</text>
      <text class="diagram-detail" x="24" y="242">no condition</text>
      <text class="diagram-detail" x="250" y="242">&#8594; fallback</text>

      <line class="diagram-arrow" x1="48" y1="258" x2="48" y2="284" marker-end="url(#diagram-arrow)" />
      <text class="diagram-step" x="60" y="275">first row that holds</text>

      <rect class="diagram-box" x="10" y="284" width="400" height="52" rx="6" />
      <text class="diagram-stage" x="24" y="306">view</text>
      <text class="diagram-detail" x="24" y="324">render(resource, context)</text>

      <line class="diagram-arrow" x1="48" y1="336" x2="48" y2="362" marker-end="url(#diagram-arrow)" />
      <text class="diagram-step" x="60" y="353">returns</text>

      <rect class="diagram-box" x="10" y="362" width="400" height="52" rx="6" />
      <text class="diagram-stage" x="24" y="384">HTML</text>
      <text class="diagram-detail" x="24" y="402">sanitised into the region</text>
    </svg>`
}
