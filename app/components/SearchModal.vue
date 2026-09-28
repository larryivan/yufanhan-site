<script setup lang="ts">
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { computed, nextTick, onUnmounted } from 'vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const route = useRoute()
const { set: setScrollLock } = useScrollLock()
const searchTerm = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const backdropRef = ref<HTMLElement | null>(null)
const statusId = useId()

const MIN_QUERY_LENGTH = 2
/** server/api/search.get.ts rejects anything longer. */
const MAX_QUERY_LENGTH = 100
const RESULT_LIMIT = 12
/**
 * The placeholder is the field's only visible label, so it is also its name:
 * Chrome would otherwise take the wrapping <label>, which holds just an icon,
 * and leave the field unnamed.
 */
const FIELD_LABEL = 'Search titles or tags'

const fetchResults = (q: string, signal: AbortSignal) =>
  $fetch('/api/search', { query: { q, limit: RESULT_LIMIT }, signal })

type SearchResponse = Awaited<ReturnType<typeof fetchResults>>

// The API rejects control characters, and a pasted tab or newline is one.
const query = computed(() => searchTerm.value.replace(/[\s\p{Cc}]+/gu, ' ').trim())
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const response = shallowRef<SearchResponse | null>(null)
const results = computed(() => response.value?.items ?? [])

let controller: AbortController | null = null

const abortSearch = () => {
  controller?.abort()
  controller = null
}

const search = async () => {
  abortSearch()
  if (!props.open || query.value.length < MIN_QUERY_LENGTH) return

  const current = new AbortController()
  controller = current
  status.value = 'pending'

  let data: SearchResponse | null = null
  try {
    data = await fetchResults(query.value, current.signal)
  } catch {
    // Reported through `status` below.
  }
  // Superseded by a newer term, or the dialog closed: never show stale results.
  if (current.signal.aborted) return

  controller = null
  response.value = data
  status.value = data ? 'success' : 'error'
}

const debouncedSearch = useDebounceFn(search, 240)

watch(query, (value) => {
  abortSearch()
  if (value.length < MIN_QUERY_LENGTH) {
    status.value = 'idle'
    response.value = null
    return
  }
  // The previous results stay on screen until the new ones arrive.
  status.value = 'pending'
  debouncedSearch()
})

const statusMessage = computed(() => {
  if (!query.value) return 'Start typing to search.'
  if (query.value.length < MIN_QUERY_LENGTH) {
    return `Keep typing — at least ${MIN_QUERY_LENGTH} characters.`
  }
  if (status.value === 'error') return 'Search is unavailable right now.'
  if (status.value !== 'success') return 'Searching…'

  const total = response.value?.total ?? 0
  const shown = results.value.length
  if (!total) return 'No results.'
  if (shown < total) return `Showing ${shown} of ${total} results`
  return total === 1 ? '1 result' : `${total} results`
})

const close = () => emit('close')

// The retry button disappears as the search starts; keep focus in the dialog.
const retry = () => {
  inputRef.value?.focus()
  search()
}

// Modified and middle clicks open the result elsewhere (RouterLink leaves them
// to the browser), so the dialog and its search stay put for the next one.
const onResultClick = (event: MouseEvent) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  close()
}

// Back/Forward, or any other navigation, must not leave the dialog and its
// scroll lock over the next page.
watch(
  () => route.fullPath,
  () => {
    if (props.open) close()
  }
)

/**
 * The dialog is teleported to <body>, so everything else there — the app root
 * included — is made inert while it is open: Tab cannot reach links hidden
 * behind the backdrop, and screen readers stay inside the dialog.
 */
let inertElements: HTMLElement[] = []

const setBackgroundInert = (inert: boolean) => {
  for (const element of inertElements) element.inert = false
  inertElements = []

  const backdrop = backdropRef.value
  if (!inert || !backdrop?.parentElement) return
  inertElements = [...backdrop.parentElement.children].filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement && element !== backdrop && !element.inert
  )
  for (const element of inertElements) element.inert = true
}

/**
 * Chromium's CloseWatcher (not in lib.dom yet) turns Android's Back gesture into
 * a close request, so Back dismisses the dialog instead of navigating the page
 * underneath it. Elsewhere Back navigates and the route watcher closes it.
 */
interface CloseWatcherLike {
  onclose: (() => void) | null
  destroy: () => void
}

const CloseWatcherImpl = import.meta.client
  ? (globalThis as typeof globalThis & { CloseWatcher?: new () => CloseWatcherLike }).CloseWatcher
  : undefined

let closeWatcher: CloseWatcherLike | null = null
let returnFocusTo: HTMLElement | null = null

/** Undoes everything opening the dialog set up. */
const release = () => {
  setScrollLock(false)
  setBackgroundInert(false)
  closeWatcher?.destroy()
  closeWatcher = null
  abortSearch()
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) {
      release()
      searchTerm.value = ''
      returnFocusTo?.focus({ preventScroll: true })
      returnFocusTo = null
      return
    }

    setScrollLock(true)
    returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (CloseWatcherImpl) {
      closeWatcher = new CloseWatcherImpl()
      closeWatcher.onclose = close
    }

    await nextTick()
    // Closed again before the dialog rendered.
    if (!props.open) return
    setBackgroundInert(true)
    inputRef.value?.focus()
  }
)

if (import.meta.client) {
  useEventListener(window, 'keydown', (event) => {
    if (props.open && event.key === 'Escape') {
      close()
    }
  })
}

onUnmounted(release)
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition name="search">
        <div v-if="open" ref="backdropRef" class="search-backdrop" @click.self="close">
          <div class="search-modal" role="dialog" aria-modal="true" aria-label="Site search">
            <div class="search-head">
              <h2>Search</h2>

              <button class="icon-btn" type="button" aria-label="Close search" @click="close">
                <AppIcon name="x" :size="18" />
              </button>
            </div>

            <label class="search-field">
              <AppIcon name="search" />
              <input
                ref="inputRef"
                v-model="searchTerm"
                type="search"
                :placeholder="FIELD_LABEL"
                :aria-label="FIELD_LABEL"
                autocomplete="off"
                enterkeyhint="search"
                :maxlength="MAX_QUERY_LENGTH"
                :aria-describedby="statusId"
              >
            </label>

            <div class="search-results">
              <p
                :id="statusId"
                role="status"
                :class="results.length ? 'search-count' : 'search-empty'"
              >
                {{ statusMessage }}
              </p>

              <button
                v-if="status === 'error'"
                class="text-link search-retry"
                type="button"
                @click="retry"
              >
                Try again
              </button>

              <ul
                v-if="results.length"
                class="search-grid"
                role="list"
                :aria-busy="status === 'pending'"
              >
                <li v-for="item in results" :key="item.path">
                  <NuxtLink :to="item.path" class="search-result" @click="onResultClick">
                    <span class="result-title">{{ item.title }}</span>
                    <span class="result-meta">
                      <time v-if="item.date" :datetime="isoDate(item.date)">{{ formatDate(item.date, 'short') }}</time>
                      <span>{{ sectionLabel(item.section) }}</span>
                    </span>
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<style scoped>
.search-enter-active,
.search-leave-active {
  transition: opacity 0.28s var(--ease-standard);
}

.search-enter-active .search-modal {
  transition:
    opacity 0.32s var(--ease-out),
    transform 0.32s var(--ease-out);
}

.search-leave-active .search-modal {
  transition:
    opacity 0.18s var(--ease-standard),
    transform 0.18s var(--ease-standard);
}

.search-enter-from,
.search-leave-to {
  opacity: 0;
}

.search-enter-from .search-modal {
  transform: translateY(16px) scale(0.97);
}

.search-leave-to .search-modal {
  transform: translateY(8px) scale(0.98);
}

.search-count {
  margin-bottom: 10px;
  font-size: var(--text-sm);
  color: var(--muted);
}

/* Padded to a comfortable tap target and centred like the empty-state message;
   the negative margin eats most of that message's padding so the button reads
   as part of it. */
.search-retry {
  display: flex;
  width: fit-content;
  margin: -12px auto 0;
  padding: 10px 12px;
}

.search-grid {
  list-style: none;
}

/* Fraunces like the post-card titles, at the size they take on phones so a
   list of results stays compact. */
.result-title {
  font-family: var(--font-display);
  font-size: var(--text-md);
  font-weight: 500;
  line-height: 1.3;
  color: var(--heading);
}

/* Styled like a post card's meta line. Flex items are blocks, which keeps the
   date and the section separate words in the link's accessible name. */
.result-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--muted);
}

/* Date · section. The empty alt text keeps the dot out of the link's
   accessible name; the plain `content` is for browsers without alt text. */
.result-meta > * + *::before {
  content: "·";
  content: "·" / "";
  margin: 0 8px;
}
</style>
