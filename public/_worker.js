// Serves the host for `/` and for viewer paths, and the static files for
// everything else. A `_redirects` rule cannot name the reserved segment's
// path shape, so the routing lives here; `_headers` does not reach a
// response a worker returns, so the policy on the host lives here too.

// `'self'` sits beside `https:` in both lists because the two say different
// things. `https:` admits other origins; `'self'` admits this one whatever its
// scheme. Without it a deployment served over plain http, which is what a
// preview on a local network is, cannot fetch its own resources, and the page
// fails on its first request. On the deployed origin `'self'` is already https,
// so nothing there changes, and a plaintext fetch to a third party stays
// forbidden.
const POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https: 'unsafe-inline'",
  "img-src 'self' https: data:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "require-trusted-types-for 'script'",
  'trusted-types aleph dompurify'
].join('; ')

const IRI_PATH = /^\/-\//

// The vocabulary document and the view descriptors. Pages guesses a content
// type from the extension and these paths have none, so the type is set here.
const VOCABULARY = '/ns/vitrine'
const DESCRIPTOR = /^\/views\/[a-z-]+$/

// The files the landing page's hero draws. The folder has no file of its own,
// so its listing is served from index.ttl, and each file gets the type its
// extension names, which the rules on the page select by.
const FIXTURE_FOLDER = /^\/fixtures\/trip\/$/
const FIXTURE = /^\/fixtures\/trip\/[a-z-]+\.(txt|csv|geojson|md|ttl)$/
const FIXTURE_TYPES = {
  txt: 'text/plain',
  csv: 'text/csv',
  geojson: 'application/geo+json',
  md: 'text/markdown',
  ttl: 'text/turtle'
}

// Each document has one representation and no HTML one, so a browser gets it
// as text/plain and reads it rather than downloading it.
function typed(doc, request, contentType) {
  const accept = request.headers.get('accept') ?? ''
  const html = accept.includes('text/html') && !accept.includes(contentType)
  const response = new Response(doc.body, doc)
  response.headers.set(
    'content-type',
    html ? 'text/plain; charset=utf-8' : `${contentType}; charset=utf-8`
  )
  return response
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/' || url.pathname === '/index.html' || IRI_PATH.test(url.pathname)) {
      const host = await env.ASSETS.fetch(new Request(new URL('/', url.origin), request))
      const response = new Response(host.body, host)
      response.headers.set('content-security-policy', POLICY)
      return response
    }
    if (url.pathname === VOCABULARY) {
      return typed(await env.ASSETS.fetch(request), request, 'text/turtle')
    }
    if (FIXTURE_FOLDER.test(url.pathname)) {
      const listing = await env.ASSETS.fetch(new Request(new URL('/fixtures/trip/index.ttl', url.origin), request))
      return typed(listing, request, 'text/turtle')
    }
    const fixture = FIXTURE.exec(url.pathname)
    if (fixture) {
      const doc = await env.ASSETS.fetch(request)
      return doc.ok ? typed(doc, request, FIXTURE_TYPES[fixture[1]]) : doc
    }
    if (DESCRIPTOR.test(url.pathname)) {
      const doc = await env.ASSETS.fetch(request)
      return doc.ok ? typed(doc, request, 'application/ld+json') : doc
    }
    return env.ASSETS.fetch(request)
  }
}
