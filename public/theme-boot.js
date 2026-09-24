// Applies the reader's stored appearance before the first paint. It runs as a
// classic, blocking script in the head, because the landing view installs the
// theme only once it hydrates, and a page drawn before that follows the
// browser's scheme and then jumps. The CSP allows no inline script, hence a
// file of its own.
//
// It mirrors `stored` and `apply` in packages/starlight-theme/theme.js, which
// cannot be loaded here since it is a module: the key, its values and the two
// root attributes must stay the same as there.
;(() => {
  let mode = ''
  try {
    mode = localStorage.getItem('starlight-theme') ?? ''
  } catch {
    // Storage refused: the page follows the browser, as it would anyway.
  }
  if (mode !== 'light' && mode !== 'dark') return
  const root = document.documentElement
  root.dataset.theme = mode
  root.setAttribute('data-ag-theme', mode)
})()
