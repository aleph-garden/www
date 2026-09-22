/// <reference types="vite/client" />

/** An `?ambient` import answers a Turtle document as the ambient view draws
 *  it, rendered at build time. The plugin lives in ../ambient.ts. */
declare module '*?ambient' {
  const html: string
  export default html
}
