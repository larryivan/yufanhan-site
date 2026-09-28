/**
 * Nuxt starts a view transition in a `beforeResolve` guard and finishes its DOM update
 * only on `page:finish`. A navigation cancelled or superseded after that guard — say its
 * payload arrived after the reader had already clicked elsewhere — never reaches
 * `page:finish`, and the browser keeps rendering frozen and input queued until its 4 s
 * timeout, then throws a TimeoutError. Skipping the transition hands rendering back.
 */
import { START_LOCATION } from 'vue-router'

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()

  // The page a visit opens on plays its entrance motion (`is-first-load`, set by
  // the inline head script). From the first client navigation on, the page
  // transition is the only entrance: a second one inside it read as a stutter.
  const stopFirstLoad = router.beforeEach((_to, from) => {
    if (from === START_LOCATION) return
    document.documentElement.classList.remove('is-first-load')
    stopFirstLoad()
  })
  // The transition whose DOM update is still outstanding; only that phase blocks rendering.
  let pending: ViewTransition | undefined

  const skipPending = () => {
    pending?.skipTransition()
    pending = undefined
  }

  nuxtApp.hook('page:view-transition:start', (transition) => {
    pending = transition
    const settle = () => {
      if (pending === transition) pending = undefined
    }
    transition.updateCallbackDone.then(settle, settle)
    // A skip rejects `ready` with an AbortError. Nuxt already catches `finished`, not this.
    transition.ready.catch(() => {})
  })

  // A navigation starting while a transition is pending supersedes it.
  router.beforeEach(() => {
    skipPending()
  })

  router.afterEach((_to, _from, failure) => {
    if (failure) skipPending()
  })
})
