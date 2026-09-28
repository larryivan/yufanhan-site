<script setup lang="ts">
import type { LocationQueryValue } from 'vue-router'
import type { PostSection } from '#shared/utils/sections'

const props = defineProps<{
  section: PostSection
  title: string
}>()

const route = useRoute()

/** A repeated key (`?tag=a&tag=b`) parses to an array; only the first counts. */
const firstValue = (value: LocationQueryValue | LocationQueryValue[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? undefined

const currentTag = computed(() => firstValue(route.query.tag) || undefined)
/** Anything but a positive integer is page 1; the server clamps the upper bound. */
const requestedPage = computed(() => {
  const page = Number.parseInt(firstValue(route.query.page) ?? '', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
})

// Served by server/api/archive.get.ts rather than queried here: the archives have
// no prerendered payload, and a client-side @nuxt/content query downloads the
// SQLite engine and the whole content dump before the list can render.
const { data: archive, status } = await useFetch('/api/archive', {
  key: () => `archive:${props.section}:${requestedPage.value}:${currentTag.value ?? ''}`,
  query: computed(() => ({
    section: props.section,
    ...(currentTag.value ? { tag: currentTag.value } : {}),
    ...(requestedPage.value > 1 ? { page: requestedPage.value } : {})
  }))
})

const tags = computed(() => archive.value?.tags ?? [])
const items = computed(() => archive.value?.items ?? [])
const page = computed(() => archive.value?.page ?? 1)
const totalPages = computed(() => archive.value?.pageCount ?? 1)

const sectionPath = computed(() => SECTION_META[props.section].path)
const tagLink = (tag?: string) => ({ path: sectionPath.value, query: tag ? { tag } : {} })
const pageLink = (target: number) => ({
  path: sectionPath.value,
  query: {
    ...(currentTag.value ? { tag: currentTag.value } : {}),
    ...(target > 1 ? { page: String(target) } : {})
  }
})

// Filtering and paging swap the list in place and keep the document title, so
// the route announcer stays silent: this live region says what changed.
const resultStatus = computed(() => {
  const data = archive.value
  if (!data) return ''
  const count = `${data.total} ${data.total === 1 ? 'post' : 'posts'}${data.tag ? ` tagged ${data.tag}` : ''}`
  return totalPages.value > 1 ? `${count}, page ${data.page} of ${totalPages.value}` : count
})

const headingRef = ref<HTMLElement | null>(null)
const paginationRef = ref<HTMLElement | null>(null)

// A page link replaces the whole list above it, and the Previous/Next link that
// was used disappears on the first and last page, dropping focus to <body>.
// Start the next Tab from the top of the archive instead.
watch(
  () => archive.value?.page,
  (current, previous) => {
    if (previous === undefined || current === previous) return
    const active = document.activeElement
    if (active === document.body || paginationRef.value?.contains(active)) {
      headingRef.value?.focus({ preventScroll: true })
    }
  },
  { flush: 'post' }
)

const filterRef = ref<HTMLElement | null>(null)

// On phones the chips are one scrolling row, where a deep-linked or
// back-navigated filter can start off-screen. Only the row scrolls (a
// scrollIntoView could move the page too), and only as far as needed, so a
// tapped chip stays under the finger.
const revealCurrentTag = () => {
  const row = filterRef.value
  const chip = row?.querySelector<HTMLElement>('[aria-current]')
  if (!row || !chip) return
  const inset = Number.parseFloat(getComputedStyle(row).paddingInlineStart) || 0
  const box = row.getBoundingClientRect()
  const { left, right } = chip.getBoundingClientRect()
  if (left < box.left + inset) row.scrollLeft -= box.left + inset - left
  else if (right > box.right - inset) row.scrollLeft += right - box.right + inset
}

onMounted(revealCurrentTag)
watch(currentTag, revealCurrentTag, { flush: 'post' })
</script>

<template>
  <div class="post-archive">
    <!-- Always in the first viewport: it rises with the first cards from first
         paint rather than fading in after hydration. -->
    <header class="archive-header animate-rise">
      <h1 ref="headingRef" class="archive-title" tabindex="-1">{{ title }}</h1>

      <!-- Links, so a filtered view has its own URL. RouterLink ignores the query
           when it decides a link is current, so aria-current is set here. Left
           out while no post has a tag, where "All" would be the only chip. -->
      <nav v-if="tags.length" ref="filterRef" class="tag-filter" aria-label="Filter by tag">
        <NuxtLink
          :to="tagLink()"
          class="tag-pill"
          :aria-current="currentTag ? undefined : 'true'"
        >
          All
        </NuxtLink>
        <NuxtLink
          v-for="tag in tags"
          :key="tag"
          :to="tagLink(tag)"
          class="tag-pill"
          :aria-current="tag === currentTag ? 'true' : undefined"
        >
          {{ tag }}
        </NuxtLink>
      </nav>
    </header>

    <p class="archive-status" role="status">{{ resultStatus }}</p>

    <div
      v-if="items.length > 0"
      class="post-grid"
      :aria-busy="status === 'pending' ? 'true' : undefined"
    >
      <!-- The first card's cover is the page's LCP at every width; the rest of a
           three-up first row may be in view too. All three load eagerly and
           rise with the header instead of waiting for the scroll reveal. -->
      <PostCard
        v-for="(post, index) in items"
        :key="post.path"
        :post="post"
        :grid-count="items.length"
        :cover-loading="index === 0 ? 'priority' : index < 3 ? 'eager' : 'lazy'"
        :in-first-view="index < 3"
        :style="{ '--delay': `${index * 0.05}s` }"
      />
    </div>

    <div v-else class="archive-empty">
      <template v-if="archive?.tag">
        <p>No posts tagged “{{ archive.tag }}”.</p>
        <NuxtLink :to="tagLink()" class="text-link" :aria-current="undefined">
          Show all posts
          <AppIcon name="arrow-right" />
        </NuxtLink>
      </template>
      <p v-else>No posts yet.</p>
    </div>

    <div v-if="totalPages > 1" ref="paginationRef" class="archive-footer">
      <PaginationBar :page="page" :total-pages="totalPages" :page-link="pageLink" />
    </div>
  </div>
</template>

<style scoped>
/* No bottom padding of its own: `.site-main` already owns the space before the
   footer, and stacking both left a 260px void under a two-post archive. */
.post-archive {
  display: flex;
  flex-direction: column;
  gap: var(--stack-block);
}

.archive-header {
  display: flex;
  flex-direction: column;
  gap: var(--stack-group);
}

.archive-title {
  font-family: var(--font-display);
  font-size: var(--text-display-2);
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.04;
  color: var(--heading);
}

/* At phone sizes the display face turns thin at 400. */
@media (max-width: 640px) {
  .archive-title {
    font-weight: 500;
  }
}

/* Focus only lands here from script, after paging; it is not a control. */
.archive-title:focus {
  outline: none;
}

.tag-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* PaginationBar's chips share this look. */
.tag-pill {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--muted);
  /* A clear capsule: lit along the top, a little shade at the base. */
  background: linear-gradient(180deg, var(--surface-highlight), transparent 70%), var(--glass-card);
  border: 1px solid var(--line-strong);
  box-shadow:
    inset 0 1px 0 var(--surface-highlight),
    inset 0 -3px 6px -4px var(--line-strong);
  transition:
    color var(--dur-fast) var(--ease-standard),
    background-color var(--dur-fast) var(--ease-standard),
    border-color var(--dur-fast) var(--ease-standard),
    box-shadow var(--dur-base) var(--ease-standard);
}

@media (hover: hover) {
  .tag-pill:hover {
    color: var(--heading);
    background: var(--glass-strong);
    box-shadow:
      inset 0 1px 0 var(--surface-highlight),
      0 0 0 1px var(--line),
      0 8px 20px -12px var(--surface-glow-strong);
  }
}

/* The current filter: a violet pill with a glow under it. */
.tag-pill[aria-current='true'] {
  color: var(--on-accent);
  background: var(--accent);
  border-color: var(--accent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 8px 22px -10px var(--surface-glow-strong);
}

/* One swipeable row on phones instead of three rows of chips above the first
   card. It runs to the screen edges, which is what shows that it scrolls. The
   block padding keeps focus rings (2px, offset 3px) clear of the scroller's
   clip, and the negative margin takes that padding back out of the layout. */
@media (max-width: 640px) {
  .tag-filter {
    flex-wrap: nowrap;
    overflow-x: auto;
    margin: -5px calc(-1 * var(--gutter));
    padding: 5px var(--gutter);
    scroll-padding-inline: var(--gutter);
    scrollbar-width: none;
  }

  .tag-filter::-webkit-scrollbar {
    display: none;
  }

  .tag-pill {
    flex: none;
  }
}

/* The 32px above outranks main.css's touch-target rule, so it is restated. */
@media (pointer: coarse) {
  .tag-pill {
    min-height: 44px;
  }
}

/* Forced colours replace the fill that marks the active filter. Opting out of
   forcing also keeps the author focus ring, in an accent picked for the site
   theme rather than the system one, so it takes the system text colour. */
@media (forced-colors: active) {
  .tag-pill[aria-current='true'] {
    forced-color-adjust: none;
    color: HighlightText;
    background: Highlight;
    border-color: Highlight;
  }

  .tag-pill[aria-current='true']:focus-visible {
    outline-color: CanvasText;
  }
}

.archive-status {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* The previous list stays up, under the newly selected filter or page, until
   the response lands; dim it if that takes long. The delay keeps a quick swap
   from flickering, and reduced motion drops it with the transition. */
@media (prefers-reduced-motion: no-preference) {
  .post-grid[aria-busy='true'] {
    opacity: 0.5;
    transition: opacity var(--dur-base) var(--ease-standard) 300ms;
  }
}

/* Left-aligned and unpadded: the message takes the list's place, like the
   first card would. */
.archive-empty {
  display: grid;
  justify-items: start;
  gap: var(--stack-tight);
  color: var(--muted);
}
</style>
