/// <reference types="vite/client" />

/** An `?ambient` import answers a Turtle document as the ambient view draws
 *  it, rendered at build time. The plugin lives in ../ambient.ts. */
declare module '*?ambient' {
  const html: string
  export default html
}

/** A `?highlight` import answers a source file as highlighted HTML, rendered
 *  at build time. The plugin lives in ../highlight.ts. */
declare module '*?highlight' {
  const html: string
  export default html
}
