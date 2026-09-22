import { afterEach, describe, expect, test } from 'bun:test'
import { installDock } from '../src/dock.ts'

type Callback = (entries: { isIntersecting: boolean }[]) => void

/** Stands in for the browser's observer and lets the test say when the
 *  wordmark is in view. */
function fakeObserver() {
  const state: { callback?: Callback; observed?: Element; disconnected: boolean } = { disconnected: false }
  const original = globalThis.IntersectionObserver
  globalThis.IntersectionObserver = class {
    constructor(callback: Callback) {
      state.callback = callback
    }
    observe(target: Element) {
      state.observed = target
    }
    disconnect() {
      state.disconnected = true
    }
  } as never
  return { state, restore: () => (globalThis.IntersectionObserver = original) }
}

const page = () => {
  const root = document.createElement('div')
  root.innerHTML = `<header class="controls" data-docked="false"></header>
    <div class="opening"><h1 class="wordmark"></h1></div>`
  return root
}

let restore = () => {}
afterEach(() => restore())

describe('installDock', () => {
  test('docks the bar once the wordmark has left, and undocks when it returns', () => {
    const fake = fakeObserver()
    restore = fake.restore
    const root = page()
    installDock(root)
    const bar = root.querySelector<HTMLElement>('.controls')!
    expect(fake.state.observed).toBe(root.querySelector('.wordmark')!)

    fake.state.callback?.([{ isIntersecting: false }])
    expect(bar.dataset.docked).toBe('true')
    fake.state.callback?.([{ isIntersecting: true }])
    expect(bar.dataset.docked).toBe('false')
  })

  test('stops watching on teardown', () => {
    const fake = fakeObserver()
    restore = fake.restore
    installDock(page())()
    expect(fake.state.disconnected).toBe(true)
  })
})
