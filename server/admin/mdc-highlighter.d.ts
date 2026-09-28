// The Shiki highlighter @nuxtjs/mdc generates from the `highlight` options
// (.nuxt/mdc-highlighter.mjs): the languages and themes @nuxt/content builds with.
declare module '#mdc-highlighter' {
  import type { Highlighter } from '@nuxtjs/mdc'

  const highlighter: Highlighter
  export default highlighter
}
