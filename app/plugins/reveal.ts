export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('reveal', {
    mounted(el: HTMLElement & { _revealIO?: IntersectionObserver }) {
      if (!import.meta.client) return

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) {
        el.classList.add('reveal-in')
        return
      }

      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              el.classList.add('reveal-in')
              obs.unobserve(el)
            }
          })
        },
        { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }
      )

      io.observe(el)
      el._revealIO = io
    },
    unmounted(el: HTMLElement & { _revealIO?: IntersectionObserver }) {
      el._revealIO?.disconnect()
    }
  })
})
