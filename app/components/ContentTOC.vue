<script lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { isNavigationFailure, NavigationFailureType, type RouterHistory } from 'vue-router'

interface TraversalFlag { traversing: boolean }

/*
 * Back and Forward reach the router through its history listeners, ahead of
 * its guards; a native fragment jump does too, but moves no distance. The
 * history holds on to every listener until the router is destroyed, even after
 * the listener's teardown runs, so each router gets one listener, built out
 * here where it captures no component: one per mount kept every unmounted TOC,
 * and the article it measured, in memory.
 */
const traversalFlags = new WeakMap<RouterHistory, Set<TraversalFlag>>()

const listenForTraversals = (history: RouterHistory) => {
  const flags = new Set<TraversalFlag>()
  history.listen((_to, _from, info) => {
    for (const flag of flags) flag.traversing = info.delta !== 0
  })
  traversalFlags.set(history, flags)
  return flags
}
</script>

<script setup lang="ts">
interface TocLink {
  id: string
  text: string
  children?: TocLink[]
}

/*
 * `movesFocus: false` leaves the focus handling below to another TOC on the
 * page. PostArticle renders two (the sidebar, and the one folded in on narrow
 * screens); with both handling it, the second recorded the heading the first
 * had just focused as the element to return to, and Back restored that
 * instead of the link.
 */
const props = withDefaults(defineProps<{ links?: TocLink[]; movesFocus?: boolean }>(), {
  links: () => [],
  movesFocus: true
})
const route = useRoute()
const router = useRouter()
const activeId = ref('')

/*
 * The current entry's mark is one bar that glides along the track from entry to
 * entry, with the track lit above it (the part already read). It is placed on
 * the active link's box within the list; `animated` stays off until its first
 * place is set, so it does not slide down from the top when the page opens.
 */
const container = ref<HTMLElement | null>(null)
const marker = ref({ top: 0, height: 0, shown: false })
const animated = ref(false)

const placeMarker = () => {
  const link = container.value?.querySelector<HTMLElement>('.toc-link.is-active')
  // A closed <details> (the folded-in copy) lays out nothing: no box to mark.
  if (!link?.offsetParent) {
    marker.value = { ...marker.value, shown: false }
    return
  }
  marker.value = { top: link.offsetTop, height: link.offsetHeight, shown: true }
  if (!animated.value) requestAnimationFrame(() => requestAnimationFrame(() => (animated.value = true)))
}

let resizeObserver: ResizeObserver | undefined

// Entries are router links, as the heading permalinks are (see ProseHeading),
// and keep the query as a plain `href="#…"` would.
const anchor = (id: string) => ({ path: route.path, query: route.query, hash: `#${id}` })

// Only headings that have an entry take part: an h4 below the TOC depth used to
// become "active" and clear the highlight.
const ids = computed(() =>
  props.links.flatMap(link => [link.id, ...(link.children ?? []).map(child => child.id)])
)

let headings: HTMLElement[] = []
let landing = 0
let frame = 0
let removeAfterEach: (() => void) | undefined

/**
 * How far below the viewport top a jump leaves a heading: html's
 * scroll-padding-top (the sticky header band), which the router's hash scroll
 * and a native fragment jump both keep clear. The slack absorbs sub-pixel
 * scroll positions.
 */
const measureLanding = () => {
  landing = (Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) + 8
}

const update = () => {
  frame = 0
  if (!headings.length) return

  const rows = headings.map((heading) => {
    const top = heading.getBoundingClientRect().top
    return { top, reached: top <= landing, onScreen: top >= 0 && top < window.innerHeight }
  })
  // The current section is the last one whose heading has scrolled up to its landing line.
  let index = Math.max(0, rows.findLastIndex(row => row.reached))

  // While the linked heading sits at its landing line it stays current, even
  // if the next heading (after a short section) has reached the line too.
  const target = headings.findIndex(heading => `#${heading.id}` === route.hash)
  const targetRow = rows[target]
  if (targetRow?.reached && targetRow.top >= 0) index = target

  // Headings in the last screenful can never scroll up to the line. At the
  // bottom of the page, the jump target or else the last heading on screen is
  // current, so every entry can still become active.
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  if (maxScroll > 0 && window.scrollY >= maxScroll - 2) {
    index = targetRow?.onScreen ? target : Math.max(index, rows.findLastIndex(row => row.onScreen))
  }

  activeId.value = headings[index]?.id ?? ''
}

const scheduleUpdate = () => {
  if (!frame) frame = requestAnimationFrame(update)
}

const onResize = () => {
  measureLanding()
  scheduleUpdate()
}

const collectHeadings = () => {
  headings = ids.value
    .map(id => document.getElementById(id))
    .filter((heading): heading is HTMLElement => heading !== null)
  measureLanding()
  update()
}

/*
 * Keyboard focus follows in-page jumps. Following an entry or a heading
 * permalink moves focus to the heading, or focus and a screen reader's reading
 * position would stay behind on the link. Back and Forward restore the scroll
 * position of the history entry they return to, so they also restore the
 * focus that entry was left with (usually the link that made the jump): a
 * heading left focused off-screen would pull the page back on the next Tab.
 */
const focusByEntry = new Map<number, HTMLElement>()
let entry: number | undefined
const flag: TraversalFlag = { traversing: false }
let flags: Set<TraversalFlag> | undefined

// vue-router numbers its history entries.
const historyEntry = (): number | undefined => window.history.state?.position

const focusInPlace = (element: HTMLElement) => {
  // A heading is not focusable; tabindex="-1" makes it so just for this.
  if (!element.hasAttribute('tabindex') && element.tabIndex < 0) {
    element.setAttribute('tabindex', '-1')
    element.addEventListener('blur', () => element.removeAttribute('tabindex'), { once: true })
  }
  element.focus({ preventScroll: true })
}

const focusHeading = (id: string) => {
  const heading = document.getElementById(id)
  if (heading && !heading.contains(document.activeElement)) focusInPlace(heading)
}

const onNavigated = (hash: string, traversal: boolean) => {
  const focused = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
    ? document.activeElement
    : undefined
  const left = entry
  entry = historyEntry()
  if (focused && left !== undefined && left !== entry) focusByEntry.set(left, focused)

  if (!traversal) {
    if (hash) focusHeading(hash.slice(1))
    return
  }
  const restored = entry === undefined ? undefined : focusByEntry.get(entry)
  if (restored?.isConnected) {
    focusInPlace(restored)
    return
  }
  // Nothing recorded for that entry: at least take focus off the section being
  // left, to the start of the content (the skip link's target).
  const main = focused?.closest('main')
  if (main) focusInPlace(main)
}

watch(ids, collectHeadings, { flush: 'post' })
watch(activeId, () => nextTick(placeMarker))

onMounted(() => {
  collectHeadings()
  // Opening the folded-in copy, a font arriving or a new width all move the entries.
  resizeObserver = new ResizeObserver(placeMarker)
  if (container.value) resizeObserver.observe(container.value)
  placeMarker()
  window.addEventListener('scroll', scheduleUpdate, { passive: true })
  window.addEventListener('resize', onResize)
  if (!props.movesFocus) return

  entry = historyEntry()
  const { history } = router.options
  flags = traversalFlags.get(history) ?? listenForTraversals(history)
  flags.add(flag)
  // afterEach also runs for a repeated click on the current entry (a
  // "duplicated" navigation, which the router still scrolls for).
  removeAfterEach = router.afterEach((to, from, failure) => {
    const traversal = flag.traversing
    flag.traversing = false
    if (to.path !== from.path) return
    if (failure && !isNavigationFailure(failure, NavigationFailureType.duplicated)) return
    onNavigated(to.hash, traversal)
  })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  cancelAnimationFrame(frame)
  window.removeEventListener('scroll', scheduleUpdate)
  window.removeEventListener('resize', onResize)
  removeAfterEach?.()
  flags?.delete(flag)
  headings = []
  focusByEntry.clear()
})
</script>

<template>
  <nav
    v-if="props.links.length"
    ref="container"
    class="toc-container"
    :class="{ 'is-animated': animated }"
    aria-label="Table of contents"
  >
    <div class="toc-track" aria-hidden="true" />
    <div class="toc-fill" aria-hidden="true" :style="{ height: `${marker.shown ? marker.top + marker.height : 0}px` }" />
    <div
      class="toc-marker"
      :class="{ 'is-shown': marker.shown }"
      aria-hidden="true"
      :style="{ transform: `translateY(${marker.top}px)`, height: `${marker.height}px` }"
    />
    <ul class="toc-list">
      <li v-for="link in props.links" :key="link.id" class="toc-item">
        <RouterLink v-slot="{ navigate }" :to="anchor(link.id)" custom>
          <a :href="`#${link.id}`" class="toc-link" :class="{ 'is-active': activeId === link.id }" @click="navigate">{{ link.text }}</a>
        </RouterLink>
        <ul v-if="link.children?.length" class="toc-children">
          <li v-for="child in link.children" :key="child.id">
            <RouterLink v-slot="{ navigate }" :to="anchor(child.id)" custom>
              <a :href="`#${child.id}`" class="toc-link toc-link--child" :class="{ 'is-active': activeId === child.id }" @click="navigate">{{ child.text }}</a>
            </RouterLink>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>
