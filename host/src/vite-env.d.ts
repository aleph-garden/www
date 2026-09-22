/// <reference types="vite/client" />

/** A `?highlight` import answers the file as finished, coloured markup. The
 *  plugin that produces it lives in ../highlight.ts. */
declare module '*?highlight' {
  const html: string
  export default html
}

/** An `?ambient` import answers a Turtle document as the ambient view draws
 *  it, rendered at build time. The plugin lives in ../ambient.ts. */
declare module '*?ambient' {
  const html: string
  export default html
}
