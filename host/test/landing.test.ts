import { describe, expect, test } from 'bun:test'
import { type Context, createRenderer, fallbackView, type Resource } from '@aleph-garden/vitrine'
import { CHECKLIST_PATH, LANDING_VIEW, landingView, VOCABULARY } from '../src/landing.ts'

const landing = landingView('https://pod.example')

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
    expect(rendered.html).toContain('The frame comes out of drawing')
    expect(rendered.html).toContain('What is in the lab')
  })

  test('shows the address it was matched on, which is the claim it makes', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    expect(rendered.html).toContain('<code>https://pod.example/</code>')
  })

  test('asks for both live slots and inlines what it is handed', async () => {
    const { ctx, asked } = recording()
    const rendered = await landing.render(resource('https://pod.example/'), ctx)
    expect(asked).toEqual([`https://pod.example${CHECKLIST_PATH}`, VOCABULARY])
    expect(rendered.html).toContain(
      `<div data-aleph-transclude="https://pod.example${CHECKLIST_PATH}"></div>`
    )
    expect(rendered.html).toContain(`<div data-aleph-transclude="${VOCABULARY}"></div>`)
  })

  test('carries the navigation, closed, with no inline handler', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    expect(rendered.html).toContain('aria-expanded="false"')
    expect(rendered.html).toContain('class="site-nav-panel" id="site-nav-subprojects" hidden')
    expect(rendered.html).not.toContain('onclick')
    expect(rendered.html).not.toContain('onClick')
  })

  test('links the Vitrine card at the documentation this origin serves', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    expect(rendered.html).toContain(
      '<a href="/vitrine/docs/" target="_top">Documentation and contracts'
    )
  })

  test('links a repository only where the source is public', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    expect(rendered.html).toContain('href="https://github.com/aleph-garden/vocab"')
    expect(rendered.html).not.toContain('github.com/aleph-garden/memex')
  })

  test('says of the www row that this deployment is it', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    expect(rendered.html).toContain('The deployment. This page is what it serves')
    expect(rendered.html).not.toContain('The deployment still comes out of vitrine')
  })

  test("applies to the host's own IRI and nowhere else", () => {
    const renderer = createRenderer({ parsers: [], views: [landing, fallbackView] })
    expect(renderer.select(resource('https://pod.example/'))?.id).toBe(LANDING_VIEW)
    expect(renderer.select(resource('https://pod.example/other'))?.id).toBe(fallbackView.id)
    expect(renderer.select(resource('https://other.example/'))?.id).toBe(fallbackView.id)
  })

  test('takes its IRI from the origin it is built with, so a preview greets too', () => {
    const preview = landingView('https://deadbeef.pages.dev')
    const renderer = createRenderer({ parsers: [], views: [preview, fallbackView] })
    expect(renderer.select(resource('https://deadbeef.pages.dev/'))?.id).toBe(LANDING_VIEW)
  })
})

describe('the Sub-projects menu', () => {
  /** The page in a region, hydrated the way the runtime hydrates it. */
  async function mounted() {
    const region = document.createElement('div')
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    region.innerHTML = rendered.html
    document.body.append(region)
    const dispose = rendered.hydrate?.(region, noop)
    const toggle = region.querySelector('.site-nav-toggle') as HTMLButtonElement
    const panel = region.querySelector('.site-nav-panel') as HTMLElement
    return {
      toggle,
      panel,
      done() {
        dispose?.dispose?.()
        region.remove()
      }
    }
  }

  test('opens and closes on a click, and says so on the button', async () => {
    const { toggle, panel, done } = await mounted()
    expect(panel.hidden).toBe(true)

    toggle.click()
    expect(panel.hidden).toBe(false)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    toggle.click()
    expect(panel.hidden).toBe(true)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    done()
  })

  test('closes on Escape', async () => {
    const { toggle, panel, done } = await mounted()
    toggle.click()
    expect(panel.hidden).toBe(false)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(panel.hidden).toBe(true)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    done()
  })

  test('stops listening once disposed', async () => {
    const { toggle, panel, done } = await mounted()
    done()
    toggle.click()
    expect(panel.hidden).toBe(true)
  })
})
