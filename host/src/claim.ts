import { ns } from '@aleph-garden/terms'
import { about, escapeHtml, type View } from '@aleph-garden/vitrine'

const schema = ns('https://schema.org/', 'Claim', 'name', 'text', 'dateCreated', 'about')
const skos = ns('http://www.w3.org/2004/02/skos/core#', 'prefLabel', 'scopeNote')

export const CLAIM_VIEW = 'https://aleph.garden/views/claim'

export const claimView: View = {
  id: CLAIM_VIEW,
  when: [{ type: schema.Claim }],
  async render(resource, ctx) {
    const it = about(resource)

    const title = it.one(schema.name) ?? resource.iri
    const text = it.one(schema.text) ?? ''
    const when = it.terms(schema.dateCreated)[0]?.value

    // Each subject the claim is about lives in another resource. `resolve` is
    // the only way a view reaches one, and the reader then reads that subject
    // out of the graph it came back with.
    const topics = await Promise.all(
      it.all(schema.about).map(async (iri) => {
        const there = about(await ctx.resolve(iri), iri)
        return { label: there.one(skos.prefLabel), note: there.one(skos.scopeNote) }
      })
    )

    return {
      html: `<article class="claim">
        <h3>${escapeHtml(title)}</h3>
        <p class="said">${escapeHtml(text)}</p>
        ${when ? `<p class="when"><time datetime="${escapeHtml(when)}">${escapeHtml(when.slice(0, 10))}</time></p>` : ''}
        <dl class="topics">${topics
          .map(
            (topic) => `<dt>${escapeHtml(topic.label ?? '')}</dt>
          <dd>${escapeHtml(topic.note ?? '')}</dd>`
          )
          .join('\n          ')}</dl>
      </article>`
    }
  }
}
