/**
 * Page views and events for Umami, sent to the site's own ANALYTICS_ENDPOINT
 * (see shared/utils/analytics.ts).
 *
 * Umami's own tracker learns of navigations by wrapping `history.pushState`.
 * In this app that missed Back and Forward, counted the page after them twice,
 * read the title before Nuxt had set it, turned every jump to a heading into a
 * page view, and waited for every image before counting the first one. Here
 * the router says when a page is shown: a view is counted once the page has
 * rendered, with its own title, and only when its path or kept query changed.
 *
 * Not counted: the editor, hosts other than the public one (local development,
 * preview deployments), automated browsers, a page a browser prerendered but
 * never showed, and any browser that has signed in to the editor.
 */
import { START_LOCATION } from 'vue-router'

/** A page that neither finishes rendering nor raises an error is still counted, after this long. */
const RENDER_FALLBACK = 10_000
/** Umami's token for the visit so far. Per tab, so a reload stays in the same visit. */
const TOKEN_KEY = 'umami.cache'

type Payload = Record<string, unknown>

const isPrerendering = () => Boolean((document as Document & { prerendering?: boolean }).prerendering)

export default defineNuxtPlugin((nuxtApp) => {
  const { websiteId, domains } = useRuntimeConfig().public.analytics
  const enabled =
    Boolean(websiteId) && analyticsDomains(domains).includes(location.hostname) && !navigator.webdriver

  let token = ''
  let stopped = !enabled
  try {
    token = sessionStorage.getItem(TOKEN_KEY) || ''
  } catch {
    // Storage blocked: the visit is carried in memory only.
  }

  const optedOut = () => {
    try {
      return Boolean(localStorage.getItem(ANALYTICS_OPT_OUT_KEY))
    } catch {
      return false
    }
  }

  const send = async (payload: Payload) => {
    if (stopped || optedOut() || !isCountedPath(location.pathname)) return
    try {
      const response = await fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        // Delivered even when the reader is leaving the page.
        keepalive: true,
        credentials: 'omit',
        headers: { 'content-type': 'application/json', ...(token ? { 'x-umami-cache': token } : {}) },
        body: JSON.stringify({
          type: 'event',
          payload: {
            screen: `${screen.width}x${screen.height}`,
            language: navigator.language,
            ...payload
          }
        })
      })
      const data = (await response.json()) as { cache?: unknown, disabled?: unknown }
      if (data.disabled === true) stopped = true
      if (typeof data.cache === 'string' && data.cache) {
        token = data.cache
        try {
          sessionStorage.setItem(TOKEN_KEY, token)
        } catch {
          // Kept in memory.
        }
      }
    } catch {
      // Offline or blocked: this one is not counted, and the page is unaffected.
    }
  }

  /** The page shown last, as recorded without campaign tags: what later views compare with and name as their referrer. */
  let shown: string | undefined
  /** Back from signing in to comment: this view, and its "Read to end", were recorded before the reader left. */
  let resumed = false
  let fallback: ReturnType<typeof setTimeout> | undefined

  const currentPath = (campaign = false) => analyticsPath(new URL(location.href), { campaign })

  const pageView = () => {
    clearTimeout(fallback)
    // Counted when the reader opens it (see firstView).
    if (isPrerendering()) return
    // The editor is not counted, and does not use up the reader's landing.
    if (shown === undefined && !isCountedPath(location.pathname)) return
    const path = currentPath()
    if (path === shown) return
    resumed = false
    const first = shown === undefined
    // The first view names the site the reader came from, and keeps the
    // campaign tags that brought them; later ones name the page before.
    const referrer = first ? analyticsReferrer(document.referrer, location.origin) : shown
    shown = path
    void send({ url: first ? currentPath(true) : path, referrer, title: document.title })
  }

  const track = (name: AnalyticsEvent, data?: Payload) => {
    if (resumed && name === ANALYTICS_EVENTS.readToEnd) return
    void send({ url: shown ?? currentPath(), title: document.title, name, ...(data ? { data } : {}) })
  }

  if (enabled) {
    const router = useRouter()

    const firstView = () => {
      // Back from signing in to comment: the page was counted before the reader
      // left for GitHub, and the component strips the session from the URL.
      if (new URL(location.href).searchParams.has('giscus')) {
        shown = currentPath()
        resumed = true
      } else {
        pageView()
      }
    }
    // A page the browser prerendered is counted when the reader opens it.
    if (isPrerendering()) document.addEventListener('prerenderingchange', firstView, { once: true })
    else firstView()

    // A new page: counted once it has rendered, when Nuxt has also set its
    // title. The same page with another query (an archive's tag or page): at
    // once. Not while Nuxt hydrates the page the reader landed on, which
    // firstView has counted: a prerendered page opened with a query is
    // hydrated on its bare path, and Nuxt puts the query back afterwards.
    router.afterEach((to, from, failure) => {
      if (failure || from === START_LOCATION) return
      clearTimeout(fallback)
      if (to.path !== from.path) fallback = setTimeout(pageView, RENDER_FALLBACK)
      else if (!nuxtApp.isHydrating) setTimeout(pageView, 0)
    })
    // After Nuxt's own handler, which writes the new title to the document.
    nuxtApp.hook('page:finish', () => {
      if (!nuxtApp.isHydrating) setTimeout(pageView, 0)
    })
    // A navigation that ends on the error page: its title is written in a
    // timeout of unhead's own, queued after this hook, hence the second one.
    nuxtApp.hook('app:error', () => {
      setTimeout(() => setTimeout(pageView, 0), 0)
    })

    // Links out: which site, and mail links. Middle clicks open them too.
    const onClick = (event: MouseEvent) => {
      if (event.type === 'auxclick' && event.button !== 1) return
      const target = event.target
      const link = target instanceof Element ? target.closest<HTMLAnchorElement>('a[href]') : null
      if (!link) return
      let url: URL
      try {
        url = new URL(link.href)
      } catch {
        return
      }
      if (url.protocol === 'mailto:') track(ANALYTICS_EVENTS.emailLink)
      else if ((url.protocol === 'https:' || url.protocol === 'http:') && url.origin !== location.origin) {
        track(ANALYTICS_EVENTS.outboundLink, { url: `${url.origin}${url.pathname}` })
      }
    }
    document.addEventListener('click', onClick, { capture: true, passive: true })
    document.addEventListener('auxclick', onClick, { capture: true, passive: true })
  }

  return {
    provide: {
      /** Records one of the site's events on the current page. A no-op wherever nothing is counted. */
      track
    }
  }
})
