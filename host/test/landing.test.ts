import { beforeEach, describe, expect, test } from 'bun:test'
import { type Context, createRenderer, fallbackView, type Resource } from '@aleph-garden/vitrine'
import { CHECKLIST_PATH, CLAIM_PATH, LANDING_VIEW, landingView, VOCABULARY } from '../src/landing.ts'

const SOURCES = {
  turtle: '<pre class="shiki"><code>&lt;&gt; a schema:Claim</code></pre>',
  jsonld: '<pre class="shiki"><code>{"@type":"schema:Claim"}</code></pre>',
  view: '<pre class="shiki"><code>const claimView = {}</code></pre>'
}
const landing = landingView('https://pod.example', SOURCES)

/** A context that records what the view asked to transclude and hands back a
 *  placeholder shaped like the runtime's own. */
function recording(): { ctx: Context; asked: string[] } {
  const asked: string[] = []
  return {
    asked,
    ctx: {
      resolve: () => Promise.reject(new Error('no resolve')),
      emit: () => {},
      events: (async function* () {})(),
      transclude: async (iri) => {
        asked.push(iri)
        return `<div data-aleph-transclude="${iri}"></div>`
      }
    }
  }
}

const noop = recording().ctx

const resource = (iri: string): Resource => ({
  iri,
  contentType: 'text/html',
  body: '',
  meta: [],
  allow: ['read']
})

describe('landingView', () => {
  test('renders the page from nothing but the address', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    // The heading is the lockup, whose alternative text is the page's name.
    expect(rendered.html).toContain('<h1 class="wordmark">')
    expect(rendered.html).toContain('alt="Aleph Garden"')
    expect(rendered.html).toContain('A view is a rule and a function')
    expect(rendered.html).toContain('What is in the lab')
  })

  test('shows the address it was matched on, which is the claim it makes', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    expect(rendered.html).toContain('<code>https://pod.example/</code>')
  })

  test('asks for every live slot and inlines what it is handed', async () => {
    const { ctx, asked } = recording()
    const rendered = await landing.render(resource('https://pod.example/'), ctx)
    // The claim is asked for twice: once for the rules to pick a view, and
    // once with the fallback view named, which is the picker's table.
    expect(asked).toEqual([
      `https://pod.example${CHECKLIST_PATH}`,
      VOCABULARY,
      `https://pod.example${CLAIM_PATH}`,
      `https://pod.example${CLAIM_PATH}`
    ])
    expect(rendered.html).toContain(
      `<div data-aleph-transclude="https://pod.example${CHECKLIST_PATH}"></div>`
    )
    expect(rendered.html).toContain(`<div data-aleph-transclude="${VOCABULARY}"></div>`)
  })

  test('offers the resource in three representations and the viewer beside it', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    for (const source of Object.values(SOURCES)) {
      // Coloured at build time and inserted whole, so nothing escapes it.
      expect(rendered.html).toContain(source)
    }
    for (const panel of ['turtle', 'jsonld', 'table', 'resource', 'viewer']) {
      expect(rendered.html).toContain(`data-panel="${panel}"`)
    }
    expect(rendered.html).toContain('<summary>Show source</summary>')
    expect(rendered.html).not.toContain('&lt;pre class=&quot;shiki&quot;')
  })

  test('carries three controls and no inline handler', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    expect(rendered.html).toContain('<a class="docs" href="/vitrine/docs/" target="_top">Docs</a>')
    expect(rendered.html).toContain('href="https://github.com/aleph-garden"')
    expect(rendered.html).toContain('class="icon theme-toggle"')
    expect(rendered.html).not.toContain('onclick')
    expect(rendered.html).not.toContain('onClick')
  })

  test('ships one glyph per appearance, so the toggle writes no markup', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    for (const mode of ['system', 'light', 'dark']) {
      expect(rendered.html).toContain(`<svg data-mode="${mode}"`)
    }
  })

  test('links a repository only where the source is public', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    expect(rendered.html).toContain('href="https://github.com/aleph-garden/vocab"')
    expect(rendered.html).not.toContain('<td class="name">memex</td>')
  })

  test("leaves this project's own plumbing out of the lab", async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    expect(rendered.html).toContain('Six repositories')
    expect(rendered.html).not.toContain('<td class="name">www</td>')
    expect(rendered.html).not.toContain('<td class="name">aleph</td>')
  })

  test('holds the dispatch section back until a second view exists', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    expect(rendered.html).not.toContain('Two resources, one table')
    expect(rendered.html).not.toContain('class="dispatch"')
  })

  test("applies to the host's own IRI and nowhere else", () => {
    const renderer = createRenderer({ parsers: [], views: [landing, fallbackView] })
    expect(renderer.select(resource('https://pod.example/'))?.id).toBe(LANDING_VIEW)
    expect(renderer.select(resource('https://pod.example/other'))?.id).toBe(fallbackView.id)
    expect(renderer.select(resource('https://other.example/'))?.id).toBe(fallbackView.id)
  })

  test('takes its IRI from the origin it is built with, so a preview greets too', () => {
    const preview = landingView('https://deadbeef.pages.dev', SOURCES)
    const renderer = createRenderer({ parsers: [], views: [preview, fallbackView] })
    expect(renderer.select(resource('https://deadbeef.pages.dev/'))?.id).toBe(LANDING_VIEW)
  })
})

describe('the appearance toggle', () => {
  const mount = async () => {
    const rendered = await landingView('https://pod.example', SOURCES).render(
      resource('https://pod.example/'),
      noop
    )
    const root = document.createElement('div')
    // The view's own markup, which is what the toggle is written against.
    root.innerHTML = rendered.html
    document.body.append(root)
    const dispose = rendered.hydrate?.(root, noop)?.dispose
    const button = root.querySelector('.theme-toggle') as HTMLButtonElement
    return { button, dispose, root }
  }

  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-ag-theme')
    document.body.replaceChildren()
  })

  test('follows the browser until it is asked not to', async () => {
    const { button } = await mount()
    expect(document.documentElement.hasAttribute('data-ag-theme')).toBe(false)
    expect(button.dataset.mode).toBe('system')
  })

  test('cycles through light and dark and back to the browser', async () => {
    const { button } = await mount()
    button.click()
    expect(document.documentElement.getAttribute('data-ag-theme')).toBe('light')
    button.click()
    expect(document.documentElement.getAttribute('data-ag-theme')).toBe('dark')
    button.click()
    expect(document.documentElement.hasAttribute('data-ag-theme')).toBe(false)
    expect(button.dataset.mode).toBe('system')
  })

  test('remembers an explicit choice and forgets the browser one', async () => {
    const first = await mount()
    first.button.click()
    expect(localStorage.getItem('aleph-theme')).toBe('light')
    first.dispose?.()

    const second = await mount()
    expect(second.button.dataset.mode).toBe('light')
    expect(document.documentElement.getAttribute('data-ag-theme')).toBe('light')

    second.button.click()
    second.button.click()
    expect(localStorage.getItem('aleph-theme')).toBeNull()
  })

  test('stops listening once disposed', async () => {
    const { button, dispose } = await mount()
    dispose?.()
    button.click()
    expect(document.documentElement.hasAttribute('data-ag-theme')).toBe(false)
  })
})

describe('the lockup', () => {
  test('ships one file per ground, chosen by the stylesheet', async () => {
    const rendered = await landingView('https://pod.example', SOURCES).render(
      resource('https://pod.example/'),
      noop
    )
    expect(rendered.html).toContain(
      '<img class="on-light" src="/brand/lockup-horizontal-full-light.svg" alt="Aleph Garden" />'
    )
    expect(rendered.html).toContain(
      '<img class="on-dark" src="/brand/lockup-horizontal-full-dark.svg" alt="Aleph Garden" />'
    )
    // A media query answers the browser; this page answers `data-ag-theme`.
    expect(rendered.html).not.toContain('prefers-color-scheme')
  })
})

describe('the artefact panels', () => {
  const mount = async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    const root = document.createElement('div')
    root.innerHTML = rendered.html
    document.body.append(root)
    const dispose = rendered.hydrate?.(root, noop)?.dispose
    const shown = (group: Element) =>
      [...group.querySelectorAll(':scope > .panel')]
        .filter((p) => !(p as HTMLElement).hidden)
        .map((p) => (p as HTMLElement).dataset.panel)
    return { root, dispose, shown }
  }

  test('starts with one panel visible in each group, before any script runs', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    const root = document.createElement('div')
    root.innerHTML = rendered.html
    for (const group of root.querySelectorAll('.panels')) {
      const visible = [...group.querySelectorAll(':scope > .panel')].filter(
        (p) => !(p as HTMLElement).hidden
      )
      expect(visible).toHaveLength(1)
    }
  })

  test('shows exactly one panel per group after a switch', async () => {
    const { root, shown, dispose } = await mount()
    const outer = root.querySelector('.panels') as HTMLElement
    const picker = root.querySelector('.picker') as HTMLElement
    expect(shown(outer)).toEqual(['resource'])
    expect(shown(picker)).toEqual(['turtle'])

    picker.querySelector<HTMLButtonElement>('.tab[data-panel="table"]')?.click()
    expect(shown(picker)).toEqual(['table'])
    // The outer group is untouched by a click inside its own panel.
    expect(shown(outer)).toEqual(['resource'])

    outer.querySelector<HTMLButtonElement>('.tab[data-panel="viewer"]')?.click()
    expect(shown(outer)).toEqual(['viewer'])
    dispose?.()
  })
})
