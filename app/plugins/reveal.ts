type RevealElement = HTMLElement & {
  _revealIO?: IntersectionObserver
  _revealFallback?: number
  _revealed?: boolean
}

const reveal = (el: RevealElement) => {
  el._revealed = true
  el.classList.add('reveal-in')
  el._revealIO?.disconnect()
  window.clearTimeout(el._revealFallback)
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive<RevealElement>('reveal', {
    mounted(el) {
      if (!import.meta.client) return

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce || !('IntersectionObserver' in window)) {
        reveal(el)
        return
      }

      el._revealIO = new IntersectionObserver(
        (entries) => {
          if (entries.some(entry => entry.isIntersecting)) reveal(el)
        },
        { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }
      )
      el._revealIO.observe(el)

      // Safety net: never leave content hidden if the observer never fires
      el._revealFallback = window.setTimeout(() => reveal(el), 1600)
    },
    // Vue rewrites `className` whenever a bound class changes (a NuxtLink turning
    // active, say), which drops `reveal-in` and would hide the element again.
    updated(el) {
      if (el._revealed) el.classList.add('reveal-in')
    },
    unmounted(el) {
      el._revealIO?.disconnect()
      window.clearTimeout(el._revealFallback)
    }
  })
})
