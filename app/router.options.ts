import type { RouterConfig } from 'nuxt/schema'
import type { RouteLocationNormalized } from 'vue-router'
import { START_LOCATION } from 'vue-router'

// `--header-offset` in main.css, for when the stylesheet has not set scroll-padding.
const FALLBACK_HEADER_OFFSET = 96
// Longest wait for a refetching list before a saved position is restored anyway.
const BUSY_TIMEOUT = 2000
// Long enough that a reader flicking through a page stays well inside Safari's budget of
// 100 history.replaceState calls per 30 seconds, which the router's own navigations share.
const SAVE_DELAY = 500

const TOP = { left: 0, top: 0, behavior: 'instant' } as const

/** Keeps an anchor target clear of the sticky header: `scroll-padding-top` on <html>. */
const headerOffset = () => {
  const offset = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)
  return Number.isFinite(offset) ? offset : FALLBACK_HEADER_OFFSET
}

/**
 * Scrolls a heading to just below the header. vue-router's `{ el }` — and the browser's
 * own fragment scroll — measure it with getBoundingClientRect, which includes transforms:
 * on a page that has just opened, the article's rise-in animation still holds the heading
 * ~30px low, so it came to rest under the header. offsetTop is layout only.
 */
const scrollToHash = (hash: string, behavior: ScrollBehavior) => {
  const target = document.getElementById(hash.slice(1))
  if (!target) return false
  let top = 0
  for (let node: HTMLElement | null = target; node; node = node.offsetParent as HTMLElement | null) {
    top += node.offsetTop
  }
  return { top: Math.max(0, top - headerOffset()), behavior }
}

const isBusy = () => document.querySelector('[aria-busy="true"]') !== null

/** Resolves once no region is marked aria-busy (PostArchive's list while it refetches). */
const untilIdle = () =>
  new Promise<void>((resolve) => {
    if (!isBusy()) return resolve()
    const done = () => {
      observer.disconnect()
      clearTimeout(timeout)
      resolve()
    }
    const observer = new MutationObserver(() => {
      if (!isBusy()) done()
    })
    observer.observe(document.body, { subtree: true, childList: true, attributeFilter: ['aria-busy'] })
    const timeout = setTimeout(done, BUSY_TIMEOUT)
  })

const trimSlash = (path: string) => path.replace(/\/$/, '')
const withoutHash = (route: RouteLocationNormalized) => route.fullPath.split('#')[0]

/**
 * Keeps the current history entry's saved position up to date, so a reload hands it
 * back as `savedPosition`. vue-router records it only when an entry is left (its
 * pagehide write does not reach the reloaded document), and after the first client-side
 * navigation Nuxt sets `history.scrollRestoration` to 'manual', so the browser no longer
 * restores it either.
 */
if (import.meta.client) {
  let timer: ReturnType<typeof setTimeout> | undefined
  window.addEventListener(
    'scroll',
    () => {
      clearTimeout(timer)
      const entry = history.state?.position
      if (typeof entry !== 'number') return
      timer = setTimeout(() => {
        // Back/Forward has moved to another entry, whose saved position must survive.
        if (history.state?.position !== entry) return
        history.replaceState({ ...history.state, scroll: { left: window.scrollX, top: window.scrollY } }, '')
      }, SAVE_DELAY)
    },
    { passive: true }
  )
}

/**
 * The position hydration restored. A prerendered page is hydrated on its bare path, and
 * Nuxt then replays the real URL (with its #hash) as a forced navigation to the same
 * location, which carries no saved position of its own.
 */
let hydrationPosition: ScrollToOptions | undefined

/**
 * Nuxt's default scrollBehavior (nuxt/dist/pages/runtime/router.options.js), changed so
 * that every route scroll is instant — a smooth scroll on a page change starts from the
 * old page's offset and drags the view-transition snapshot with it — and only in-page
 * hash jumps animate. A saved position (Back/Forward, a reload) always wins, so Back
 * after a TOC jump returns to where the reader was rather than to the top.
 */
export default {
  scrollBehavior(to, from, savedPosition) {
    const saved = savedPosition ? { ...savedPosition, behavior: 'instant' as const } : undefined

    // Hydration. The server-rendered page is already laid out: restore a reload's saved
    // position, or keep the fragment the browser found on a deep link. Nuxt's scroll to
    // (0, 0) here threw both away.
    if (from === START_LOCATION) {
      hydrationPosition = saved
      return saved ?? false
    }
    const restored = hydrationPosition
    hydrationPosition = undefined

    if (trimSlash(to.path) === trimSlash(from.path)) {
      // Back/Forward within the page, even between two entries with the same URL. Between
      // ?tag= / ?page= states it refetches the archive list; restored against the list
      // still on screen, the position was clamped to its height.
      if (saved) return untilIdle().then(() => saved)
      // Nuxt's replay of the initial URL: a forced replace, so nothing saved, to where the
      // reader already is (a second click on the current TOC entry arrives with `to === from`
      // instead). After a reload it keeps the restored position rather than jumping back to
      // the #hash; on a deep link it corrects the browser's fragment scroll, which measured
      // the heading mid-animation.
      if (to !== from && to.fullPath === from.fullPath) {
        return restored ?? (to.hash ? scrollToHash(to.hash, 'instant') : false)
      }
      if (to.hash) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        return scrollToHash(to.hash, reduceMotion ? 'instant' : 'smooth')
      }
      // ?page= / ?tag= swapped the archive list; it starts at the top.
      if (withoutHash(to) !== withoutHash(from)) return TOP
      // Only the hash went away and nothing was saved for this entry (a link to this page
      // without its hash). Nothing is restored: the reader stays where they are.
      return false
    }

    // A new page: scroll once it has rendered, as Nuxt does. vue-router drops the result
    // if the reader has navigated on in the meantime.
    const nuxtApp = useNuxtApp()
    return new Promise((resolve) => {
      nuxtApp.hooks.hookOnce('page:loading:end', () => {
        const scroll = () =>
          requestAnimationFrame(() => resolve(saved ?? ((to.hash && scrollToHash(to.hash, 'instant')) || TOP)))
        const transition = nuxtApp['~transitionPromise']
        if (transition) transition.then(scroll)
        else scroll()
      })
    })
  }
} satisfies RouterConfig
