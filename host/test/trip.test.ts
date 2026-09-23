import { describe, expect, test } from 'bun:test'
import { type Context, createRenderer, type Resource, type View } from '@aleph-garden/vitrine'
import { turtleParser } from '@aleph-garden/vitrine-turtle'
import { FILE_FRAME, FOLDER_FRAME, LISTING_VIEW, tripFolder, tripViews } from '../src/trip/index.ts'
import { flip, isFlipped, onFlip } from '../src/trip/rules.ts'
import { budgetOf, lineOf, project, tasksOf } from '../src/trip/views.ts'

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
function context(): Context {
  const ctx: Context = {
    resolve: () => Promise.reject(new Error('no resolve')),
    emit: () => {},
    events: (async function* () {})(),
    transclude: async (iri, show) =>
      `<div data-aleph-transclude="${iri}" data-view="${show?.view ?? ''}"></div>`,
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

  test('projects a line into the box without leaving it', () => {
    const points = project([
      [-9.14, 38.71],
      [-9.13, 38.72],
      [-9.12, 38.7]
    ])
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
      [PEOPLE, 'person-cards']
    ] as const) {
      const parsed = await renderer.parse(resource)
      expect(renderer.select(parsed)?.id).toEndWith(expected)
    }
  })

  test('draws two people as cards, and their statements with `a` for the type', async () => {
    const parsed = await renderer.parse(PEOPLE)
    const cards = await renderer.render(parsed, context())
    expect(cards.html).toContain('Mara Lind')
    expect(cards.html).toContain('mara@example.org')
    const statements = await renderer.render(parsed, context(), {
      view: 'https://aleph.garden/views/statements'
    })
    expect(statements.html).toContain('<td>a</td><td>schema:Person</td>')
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

  test('applies only inside the folder', () => {
    const elsewhere = { ...BUDGET, iri: `${ORIGIN}/budget.csv` }
    expect(renderer.select(elsewhere)).toBeUndefined()
  })
})

describe('the listing', () => {
  test('frames each file, people last, and draws the table and the caption', async () => {
    const parsed = await renderer.parse(LISTING)
    expect(renderer.select(parsed)?.id).toBe(LISTING_VIEW)
    const drawn = await renderer.render(parsed, context())
    const order = [...drawn.html.matchAll(/data-aleph-transclude="([^"]+)"/g)].map((m) => m[1])
    expect(order).toEqual([`${FOLDER}packing.txt`, `${FOLDER}budget.csv`, `${FOLDER}people.ttl`])
    expect(drawn.html).toContain(`data-view="${FILE_FRAME}"`)
    expect(drawn.html).toContain('class="trip-rule" data-kind="csv"')
    expect(drawn.html).toContain('The rules picked <code>checklist</code> for packing.txt')
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
    const drawn = await renderer.render(parsed, context())
    expect(drawn.html).toContain(
      '<p class="trip-summary">3 files: packing.txt, budget.csv, people.ttl</p>'
    )
  })
})
