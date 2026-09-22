/// <reference types="vite/client" />

/** A `?highlight` import answers the file as finished, coloured markup. The
 *  plugin that produces it lives in ../highlight.ts. */
declare module '*?highlight' {
  const html: string
  export default html
}
