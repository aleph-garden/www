import { describe, expect, test } from 'bun:test'
import { type Context, createRenderer, type Resource, type View } from '@aleph-garden/vitrine'
import { turtleParser } from '@aleph-garden/vitrine-turtle'
import { FILE_FRAME, FOLDER_FRAME, LISTING_VIEW, PERSON_FRAME, tripFolder, tripViews } from '../src/trip/index.ts'
import { flip, isFlipped, onFlip, rowFor } from '../src/trip/rules.ts'
import { budgetOf, cardView, lineOf, project, tasksOf } from '../src/trip/views.ts'

const ORIGIN = 'https://pod.example'
const FOLDER = tripFolder(ORIGIN)

const file = (name: string, contentType: string, body: string): Resource => ({
  iri: `${FOLDER}${name}`,
  contentType,
  body,
  quads: [],
  allow: ['read']
})

const PACKING = file('packing.txt', 'text/plain', '- [ ] passport\n- [x] charger\n')
const BUDGET = file('budget.csv', 'text/csv', 'item,eur\nflights,240\nrooms,390\n')
const ROUTE = file(
  'route.geojson',
  'application/geo+json',
  JSON.stringify({ type: 'LineString', coordinates: [[-9.14, 38.71], [-9.13, 38.72]] })
)
const PEOPLE = file(
  'people.ttl',
  'text/turtle',
  '@prefix schema: <https://schema.org/> .\n<#a> a schema:Person ; schema:name "Mara Lind" ; schema:email <mailto:mara@example.org> .\n<#b> a schema:Person ; schema:name "Jonas Berg" .\n'
)
const LISTING: Resource = {
  iri: FOLDER,
  contentType: 'text/turtle',
  body: '@prefix ldp: <http://www.w3.org/ns/ldp#> .\n<> a ldp:Container ; ldp:contains <packing.txt>, <people.ttl>, <budget.csv> .\n',
  quads: [],
  allow: ['read']
}

/** A context that records nothing and keeps no state, for views drawn
 *  without a runtime. */
function context(resolve: Context['resolve'] = () => Promise.reject(new Error('no resolve'))): Context {
  const ctx: Context = {
    resolve,
    emit: () => {},
    events: (async function* () {})(),
    transclude: async (iri, show) =>
      `<div data-aleph-transclude="${iri}" data-view="${show?.view ?? ''}" data-fragment="${show?.fragment ?? ''}"></div>`,
    about: () => {
      throw new Error('no about')
    },
    render: () => Promise.reject(new Error('no render')),
    state: ((_key: string, initial?: unknown) => ({
      get: () => initial,
      set() {}
    })) as Context['state']
  }
  return ctx
}

const views: View[] = tripViews(ORIGIN)
const renderer = createRenderer({ parsers: [turtleParser()], views })

/** Answers the fixtures above, parsed the way the runtime answers them. */
const resolveFiles: Context['resolve'] = async (iri) => {
  const found = [PACKING, BUDGET, ROUTE, PEOPLE].find((r) => r.iri === iri)
  if (!found) throw new Error(`no ${iri}`)
  return renderer.parse(found)
}

describe('the files in the folder', () => {
  test('reads a task list, a budget and a line', () => {
    expect(tasksOf('- [ ] passport\n- [x] charger\nnot a task')).toEqual([
      { text: 'passport', done: false },
      { text: 'charger', done: true }
    ])
    expect(budgetOf('item,eur\nflights,240\nrooms,390')).toEqual([
      { item: 'flights', eur: 240 },
      { item: 'rooms', eur: 390 }
    ])
    expect(lineOf(ROUTE.body as string)).toHaveLength(2)
  })

  test('projects a line into the box without leaving it, over the tiles that cover the box', () => {
    const { points, tiles } = project([
      [-9.14, 38.71],
      [-9.13, 38.72],
      [-9.12, 38.7]
    ])
    expect(tiles.length).toBeGreaterThan(0)
    expect(tiles.every((t) => t.left <= 0 || t.left < 280)).toBe(true)
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(280)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(150)
    }
  })

  test('the rules pick the first view of each row', async () => {
    for (const [resource, expected] of [
      [PACKING, 'checklist'],
      [BUDGET, 'table'],
      [ROUTE, 'map'],
      [PEOPLE, 'subjects-grid']
    ] as const) {
      const parsed = await renderer.parse(resource)
      expect(renderer.select(parsed)?.id).toEndWith(expected)
    }
  })

  test('takes the graph apart, embedding each person under its fragment', async () => {
    const parsed = await renderer.parse(PEOPLE)
    const drawn = await renderer.render(parsed, context())
    const embedded = [...drawn.html.matchAll(/data-aleph-transclude="([^"]+)" data-view="" data-fragment="([^"]+)"/g)].map(
      (m) => `${m[1]}#${m[2]}`
    )
    expect(embedded).toEqual([`${FOLDER}people.ttl#a`, `${FOLDER}people.ttl#b`])
  })

  test('picks every person by its type, framed, whatever file holds it', async () => {
    const parsed = await renderer.parse(PEOPLE)
    for (const fragment of ['a', 'b']) {
      expect(renderer.select(parsed, { fragment })?.id).toBe(PERSON_FRAME)
    }
    const mara = await renderer.render(parsed, context(), { fragment: 'a' })
    expect(mara.view.id).toBe(PERSON_FRAME)
    expect(mara.html).toContain('Mara Lind')
    expect(mara.html).toContain('mara@example.org')
    expect(mara.html).toContain('#a')
    expect(mara.html).toContain('schema:Person')
    const statements = await renderer.render(parsed, context(), {
      fragment: 'b',
      view: 'https://aleph.garden/views/statements'
    })
    expect(statements.html).toContain('<td>a</td><td>schema:Person</td>')
    expect(statements.html).toContain('&lt;#b&gt;')
  })

  test('adds the total under the budget', async () => {
    const drawn = await renderer.render(BUDGET, context())
    expect(drawn.html).toContain('<td>total</td><td>630</td>')
  })
})

describe('the rule table', () => {
  test('a switched row changes the pick for every file it matches, and tells listeners', async () => {
    let heard = 0
    const stop = onFlip(() => heard++)
    flip('csv')
    expect(isFlipped('csv')).toBe(true)
    expect(renderer.select(BUDGET)?.id).toEndWith('bars')
    expect(renderer.select({ ...BUDGET, iri: `${FOLDER}other.csv` })?.id).toEndWith('bars')
    flip('csv')
    expect(renderer.select(BUDGET)?.id).toEndWith('table')
    expect(heard).toBe(2)
    stop()
  })

  test('a row with one view does not switch', () => {
    flip('md')
    expect(isFlipped('md')).toBe(false)
  })

  test('applies only inside the folder', async () => {
    const elsewhere = { ...BUDGET, iri: `${ORIGIN}/budget.csv` }
    expect(renderer.select(elsewhere)).toBeUndefined()
    const people = await renderer.parse({ ...PEOPLE, iri: `${ORIGIN}/people.ttl` })
    expect(renderer.select(people, { fragment: 'a' })).toBeUndefined()
  })

  test('the type row switches both people, and tells the frames of that row', async () => {
    const parsed = await renderer.parse(PEOPLE)
    expect(rowFor({ ...parsed, subject: `${parsed.iri}#a` })?.kind).toBe('person')
    expect(rowFor({ ...parsed, subject: `${parsed.iri}#b` })?.kind).toBe('person')
    expect(rowFor(parsed)?.kind).toBe('graph')
    const heard: string[] = []
    const stop = onFlip((kind) => heard.push(kind))
    flip('person')
    for (const fragment of ['a', 'b']) {
      const drawn = await renderer.render(parsed, context(), { fragment })
      expect(drawn.view.id).toBe(PERSON_FRAME)
      expect(drawn.html).toContain('trip-statements')
      expect(drawn.html).not.toContain('trip-card')
    }
    expect(heard).toEqual(['person'])
    flip('person')
    const back = await renderer.render(parsed, context(), { fragment: 'a' })
    expect(back.html).toContain('trip-card')
    stop()
  })
})

describe('the listing', () => {
  test('frames each file, the graph last and drawn in place, and draws the rules that switch', async () => {
    const parsed = await renderer.parse(LISTING)
    expect(renderer.select(parsed)?.id).toBe(LISTING_VIEW)
    const drawn = await renderer.render(parsed, context(resolveFiles))
    const order = [...drawn.html.matchAll(/data-aleph-transclude="([^"]+)"/g)].map((m) => m[1])
    expect(order).toEqual([
      `${FOLDER}packing.txt`,
      `${FOLDER}budget.csv`,
      `${FOLDER}people.ttl`,
      `${FOLDER}people.ttl`
    ])
    expect(drawn.html).toMatch(/data-aleph-transclude="[^"]+people\.ttl" data-view="" data-fragment="a"/)
    expect(drawn.html).toContain('class="trip-inline"')
    expect(drawn.html).toContain(`data-view="${FILE_FRAME}"`)
    expect(drawn.html).toContain('class="trip-rule" data-kind="csv"')
    expect(drawn.html).not.toContain('class="trip-rule" data-kind="md"')
    expect(drawn.html).toContain('class="trip-rule" data-kind="person"')
  })
})

describe('folding the folder', () => {
  const folder = views.find((v) => v.id === FOLDER_FRAME)!
  const listing = views.find((v) => v.id === LISTING_VIEW)!

  /** A context whose render draws the listing and whose `folded` state
   *  reads `folded`. */
  function framing(folded: boolean): Context {
    const base = context()
    return {
      ...base,
      render: async () => ({ html: '<div class="trip" id="trip-body"></div>', view: listing }),
      state: ((key: string, initial?: unknown) => ({
        get: () => (key === 'folded' ? folded : initial),
        set() {}
      })) as Context['state']
    }
  }

  test('puts a hidden fold button beside the view name, open by default', async () => {
    const drawn = await folder.render(LISTING, framing(false))
    expect(drawn.html).toContain('trip-listing')
    expect(drawn.html).toContain('aria-controls="trip-body" aria-expanded="true"')
    expect(drawn.html).toContain('aria-label="Collapse folder" hidden')
  })

  test('offers to expand once folded', async () => {
    const drawn = await folder.render(LISTING, framing(true))
    expect(drawn.html).toContain('aria-expanded="false" aria-label="Expand folder"')
  })

  test('the listing carries the one-line summary a folded folder shows', async () => {
    const parsed = await renderer.parse(LISTING)
    const drawn = await renderer.render(parsed, context(resolveFiles))
    expect(drawn.html).toContain(
      '<p class="trip-summary">3 files: packing.txt, budget.csv, people.ttl</p>'
    )
  })
})

describe('the person card', () => {
  const card = createRenderer({ parsers: [turtleParser()], views: [cardView] })

  test('reads a WebID profile written in FOAF and vCard', async () => {
    const profile = await card.parse({
      iri: 'https://pod.example/profile/card',
      contentType: 'text/turtle',
      body: '@prefix foaf: <http://xmlns.com/foaf/0.1/> .\n@prefix vcard: <http://www.w3.org/2006/vcard/ns#> .\n<#me> a foaf:Person ; foaf:name "Ada Lovelace" ; vcard:role "Analyst" ; vcard:organization-name "Engine" ; vcard:hasPhoto <ada.png> .\n',
      quads: [],
      allow: ['read']
    })
    const drawn = await cardView.render({ ...profile, subject: `${profile.iri}#me` }, context())
    expect(drawn.html).toContain('<span class="trip-name">Ada Lovelace</span>')
    expect(drawn.html).toContain('Analyst, Engine')
    expect(drawn.html).toContain('<img class="trip-initials" src="https://pod.example/profile/ada.png"')
  })

  test('draws initials for a photo that is not https', async () => {
    const profile = await card.parse({
      iri: 'http://pod.example/card',
      contentType: 'text/turtle',
      body: '@prefix foaf: <http://xmlns.com/foaf/0.1/> .\n<#me> foaf:name "Ada Lovelace" ; foaf:img <ada.png> .\n',
      quads: [],
      allow: ['read']
    })
    const drawn = await cardView.render({ ...profile, subject: `${profile.iri}#me` }, context())
    expect(drawn.html).not.toContain('<img')
    expect(drawn.html).toContain('>AL</span>')
  })
})

describe('the folder fixture', () => {
  test('states the size each member really has', async () => {
    const dir = new URL('../../public/fixtures/trip/', import.meta.url)
    const listing = await Bun.file(new URL('index.ttl', dir)).text()
    const stated = [...listing.matchAll(/<([^>]+)> dcterms:modified [^;]+; stat:size (\d+) \./g)]
    expect(stated).toHaveLength(5)
    for (const [, name, size] of stated) {
      expect(Bun.file(new URL(name!, dir)).size).toBe(Number(size))
    }
  })
})
