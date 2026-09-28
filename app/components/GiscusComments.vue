<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * Comments on this repository's GitHub Discussions, through giscus.
 *
 * The widget is giscus's own iframe, built here rather than by its client.js:
 * that script runs on the site's origin, adds its stylesheet to the page and,
 * after a sign-in, wipes history.state with replaceState, which breaks the
 * router's scroll restoration. The iframe URL takes the same parameters.
 */
const props = defineProps<{
  /** The post's content path: the discussion is found by it, not by the URL. */
  path: string
  title: string
  description?: string
}>()

const GISCUS_ORIGIN = 'https://giscus.app'
const SESSION_KEY = 'giscus-session'
const SECTION_ID = 'article-comments'
/** Without a word from the widget by then, giscus is out of reach (a network that blocks GitHub, say). */
const LOAD_TIMEOUT = 12_000

const { giscus } = useRuntimeConfig().public
const route = useRoute()
const router = useRouter()
const theme = useState<'light' | 'dark' | null>('theme')

const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Re: ${props.title}`)}`

type State = 'idle' | 'loading' | 'ready' | 'failed'
const state = ref<State>('idle')
const src = ref('')
const height = ref<number | null>(null)
const section = useTemplateRef<HTMLElement>('section')
const frame = useTemplateRef<HTMLIFrameElement>('frame')

const currentTheme = () =>
  theme.value ?? (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

/**
 * The site's own theme files (public/giscus/) on a public https origin, which
 * giscus.app fetches them from. Anywhere else, localhost included, it cannot
 * reach them, and the nearest built-in theme stands in.
 */
const themeFor = (value: 'light' | 'dark') => {
  const { protocol, hostname, origin } = window.location
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(hostname) || /\.(localhost|test)$/.test(hostname)
  if (protocol === 'https:' && !isLocal) return `${origin}/giscus/${value}.css`
  return value === 'dark' ? 'noborder_dark' : 'noborder_light'
}

const readSession = () => {
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    return stored ? String(JSON.parse(stored)) : ''
  } catch {
    return ''
  }
}

const storeSession = (value: string | null) => {
  try {
    if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // Blocked storage: the reader signs in again next time.
  }
}

const buildSrc = () => {
  const page = `${window.location.origin}${window.location.pathname}`
  const params = new URLSearchParams({
    // Where a sign-in returns to: this section of this page.
    origin: `${page}#${SECTION_ID}`,
    theme: themeFor(currentTheme()),
    // No reaction bar above the box: on a quiet post it was a lone "0 reactions"
    // and an emoji button. Each comment keeps its own reactions.
    reactionsEnabled: '0',
    emitMetadata: '0',
    inputPosition: 'top',
    repo: giscus.repo,
    repoId: giscus.repoId,
    category: giscus.category,
    categoryId: giscus.categoryId,
    term: props.path,
    // Match the discussion by an exact hash of the path, not a fuzzy title search.
    strict: '1',
    description: props.description ?? '',
    backLink: new URL(props.path, window.location.origin).href
  })
  const session = readSession()
  if (session) params.set('session', session)
  return `${GISCUS_ORIGIN}/en/widget?${params}`
}

let timer: ReturnType<typeof setTimeout> | undefined
let observer: IntersectionObserver | undefined

const load = () => {
  observer?.disconnect()
  state.value = 'loading'
  src.value = buildSrc()
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (state.value === 'loading') state.value = 'failed'
  }, LOAD_TIMEOUT)
}

const onMessage = (event: MessageEvent) => {
  if (event.origin !== GISCUS_ORIGIN || event.source !== frame.value?.contentWindow) return
  const message = (event.data as { giscus?: Record<string, unknown> } | null)?.giscus
  if (!message || typeof message !== 'object') return

  if (typeof message.resizeHeight === 'number') {
    height.value = message.resizeHeight
    if (state.value !== 'ready') {
      state.value = 'ready'
      clearTimeout(timer)
    }
  }

  // A stale or revoked session: forget it and show the widget signed out.
  const error = typeof message.error === 'string' ? message.error : ''
  if (message.signOut || /Bad credentials|Invalid state value|State has expired/.test(error)) {
    if (message.signOut || readSession()) {
      storeSession(null)
      load()
    }
  }
}

onMounted(async () => {
  window.addEventListener('message', onMessage)

  // Back from signing in with GitHub: giscus appends the session to this page's
  // URL. Keep it for the widget, and take it out of the address bar and the
  // history entry through the router, which keeps its own state intact.
  const returned = route.query.giscus
  if (typeof returned === 'string' && returned) {
    storeSession(returned)
    const query = { ...route.query }
    delete query.giscus
    await router.replace({ query, hash: `#${SECTION_ID}` })
    load()
    return
  }

  // Loaded as the reader nears the end of the post, not with the page.
  if (!('IntersectionObserver' in window)) {
    load()
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) load()
    },
    { rootMargin: '0px 0px 800px 0px' }
  )
  if (section.value) observer.observe(section.value)
})

// The theme toggle. Before the widget has answered, a new URL is simplest.
watch(theme, (value) => {
  if (!value || state.value === 'idle' || state.value === 'failed') return
  if (state.value === 'loading') {
    load()
    return
  }
  frame.value?.contentWindow?.postMessage({ giscus: { setConfig: { theme: themeFor(value) } } }, GISCUS_ORIGIN)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  observer?.disconnect()
  clearTimeout(timer)
})
</script>

<template>
  <section :id="SECTION_ID" ref="section" class="article-comments" aria-labelledby="comments-title">
    <div class="comments-head">
      <h2 id="comments-title" class="comments-title">Comments</h2>
      <a :href="mailto" class="text-link">
        Reply by email
        <AppIcon name="arrow-right" />
      </a>
    </div>

    <div class="comments-panel comments-body" :class="`is-${state}`">
      <iframe
        v-if="src && state !== 'failed'"
        ref="frame"
        :src="src"
        class="comments-frame"
        title="Comments"
        scrolling="no"
        allow="clipboard-write"
        :style="height ? { height: `${height}px` } : undefined"
      />
      <p v-if="state === 'failed'" class="comments-note">
        The comments could not be loaded here. You can still
        <a :href="mailto">reply by email</a>.
      </p>
    </div>
  </section>
</template>
