import { beforeEach, describe, expect, test } from 'bun:test'
import { type Context, createRenderer, fallbackView, type Resource } from '@aleph-garden/vitrine'
import projects from '../../public/projects.json'
import { HERO_FOLDER, LANDING_VIEW, landingView, VOCABULARY } from '../src/landing.ts'

const SOURCES = { ambient: '<svg class="ambient" aria-hidden="true"></svg>' }
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
      },
      inner: () => Promise.reject(new Error('no inner view')),
      state: ((_key: string, initial?: unknown) => ({
        get: () => initial,
        set() {}
      })) as Context['state']
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
    for (const heading of ['The case it started from', 'Why there are so few renderers', 'The mechanism', 'The substrate', 'Where this is heading', 'What is in the lab']) {
      expect(rendered.html).toContain(`<h2>${heading}</h2>`)
    }
  })

  test('shows the address it was matched on, which is the claim it makes', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    expect(rendered.html).toContain('<code>https://pod.example/</code>')
  })

  test('names the folder the hero will draw and asks for nothing from it yet', async () => {
    const { ctx, asked } = recording()
    const rendered = await landing.render(resource('https://pod.example/'), ctx)
    expect(rendered.html).toContain(`<code>${HERO_FOLDER}</code>`)
    expect(asked).toEqual([VOCABULARY])
    expect(rendered.html).toContain(`<div data-aleph-transclude="${VOCABULARY}"></div>`)
  })

  test('lists every project from the shared file, with docs where there are any', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    for (const project of projects as { name: string; docs?: string; source: string }[]) {
      expect(rendered.html).toContain(`${project.name} &rarr;</a>`)
      expect(rendered.html).toContain(`href="${project.source}"`)
      if (project.docs) expect(rendered.html).toContain(`href="${project.docs}"`)
    }
  })

  test('lists only public repositories, each linked', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    expect(rendered.html.match(/<li class="entry">/g)).toHaveLength(4)
    for (const name of ['vitrine', 'quadpod', 'vocab', 'wiki']) {
      expect(rendered.html).toContain(`href="https://github.com/aleph-garden/${name}" target="_top">${name}</a>`)
    }
    for (const name of ['memex', 'marginalia', 'garden', 'www', 'aleph']) {
      expect(rendered.html).not.toContain(`>${name}</a>`)
    }
  })

  test('keeps projects out of the footer', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    const footer = rendered.html.slice(rendered.html.indexOf('<footer'))
    expect(footer).toContain('<span class="ag-footer-head">Source</span>')
    expect(footer).toContain('<span class="ag-footer-head">Contact</span>')
    expect(footer).not.toContain('Projects')
  })

  test('carries the appearance toggle and no inline handler', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    expect(rendered.html).toContain('class="ag-theme-toggle"')
    expect(rendered.html).not.toContain('onclick')
    expect(rendered.html).not.toContain('onClick')
  })

  test('ships one glyph per appearance, so the toggle writes no markup', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    for (const mode of ['system', 'light', 'dark']) {
      expect(rendered.html).toContain(`<svg data-mode="${mode}"`)
    }
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
    const button = root.querySelector('.ag-theme-toggle') as HTMLButtonElement
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
    expect(localStorage.getItem('starlight-theme')).toBe('light')
    first.dispose?.()

    const second = await mount()
    expect(second.button.dataset.mode).toBe('light')
    expect(document.documentElement.getAttribute('data-ag-theme')).toBe('light')

    second.button.click()
    second.button.click()
    expect(localStorage.getItem('starlight-theme')).toBe('')
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
    expect(rendered.html).toMatch(
      /<img class="on-light" src="[^"]*lockup-horizontal-full-light\.svg" alt="Aleph Garden" \/>/
    )
    expect(rendered.html).toMatch(
      /<img class="on-dark" src="[^"]*lockup-horizontal-full-dark\.svg" alt="Aleph Garden" \/>/
    )
    // A media query answers the browser; this page answers `data-ag-theme`.
    expect(rendered.html).not.toContain('prefers-color-scheme')
  })
})

describe('the field behind the opening', () => {
  test('puts the field the build prepared at the start of the opening, before the intro', async () => {
    const rendered = await landing.render(resource('https://pod.example/'), noop)
    const opening = rendered.html.indexOf('<div class="opening">')
    expect(rendered.html.indexOf(SOURCES.ambient)).toBeGreaterThan(opening)
    expect(rendered.html.indexOf(SOURCES.ambient)).toBeLessThan(rendered.html.indexOf('<header class="intro">'))
  })
})
