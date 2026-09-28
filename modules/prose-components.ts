import { addPluginTemplate, defineNuxtModule } from 'nuxt/kit'

/**
 * Registers every Prose component (ours and @nuxtjs/mdc's defaults) synchronously.
 *
 * Nuxt gives each global component its own lazy chunk, and <ContentRenderer> asks
 * for the Prose ones only while rendering a post — so opening a post from an archive
 * fetched ~10 tiny chunks after the click and the page swapped in late enough to
 * count as layout shift. Bundled, they cost a few KB.
 *
 * Nuxt's own `global: 'sync'` option would do this, but in 4.5.2 its plugin template
 * emits `[ , ["ProseA", ProseA], ... ]` when no *lazy* global component remains, and
 * the leading hole crashes every page with "undefined is not iterable". So the Prose
 * components are taken out of Nuxt's global registration and registered here instead.
 */
export default defineNuxtModule({
  meta: { name: 'prose-components' },
  setup(_options, nuxt) {
    const names = new Set<string>()

    nuxt.hook('components:extend', (components) => {
      // Runs again on every dev rescan: start over, or a deleted Prose component
      // would still be imported by the generated plugin.
      names.clear()
      for (const component of components) {
        if (component.global && component.pascalName.startsWith('Prose')) {
          component.global = false
          names.add(component.pascalName)
        }
      }
    })

    addPluginTemplate({
      filename: 'prose-components.plugin.mjs',
      getContents: () => {
        const list = [...names].sort()
        return `import { defineNuxtPlugin } from '#app/nuxt'
${list.length ? `import { ${list.join(', ')} } from '#components'` : ''}

export default defineNuxtPlugin({
  name: 'prose-components',
  setup(nuxtApp) {
${list.map(name => `    nuxtApp.vueApp.component('${name}', ${name})\n    nuxtApp.vueApp.component('Lazy${name}', ${name})`).join('\n')}
  }
})
`
      }
    })
  }
})
