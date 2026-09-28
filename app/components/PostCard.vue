<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { isNavigationFailure, NavigationFailureType } from 'vue-router'

type Post = {
  path?: string
  title?: string
  description?: string
  date?: string
  section?: string
  cover?: string
}

const props = withDefaults(
  defineProps<{
    post: Post
    /** How many cards share the grid, which decides how wide the cover renders. */
    gridCount: number
    showSection?: boolean
    /** 3 under a section's own h2 (home), 2 directly under the page h1 (archives). */
    headingLevel?: 2 | 3
    /**
     * 'eager' for covers that may be in the first viewport, so the request starts
     * from the HTML instead of after layout (the browser boosts the visible ones);
     * 'priority' also marks the likely LCP image fetchpriority=high.
     */
    coverLoading?: 'lazy' | 'eager' | 'priority'
    /**
     * For cards that may start in the first viewport: rise in from first paint
     * instead of using the scroll reveal, whose fade waits for hydration and
     * held the archive's LCP cover back over a second after the image had
     * loaded. Without `.reveal`, the class v-reveal adds changes nothing.
     */
    inFirstView?: boolean
  }>(),
  {
    showSection: false,
    headingLevel: 2,
    coverLoading: 'lazy',
    inFirstView: false
  }
)

// Rendered cover width, mirroring `.post-grid` in main.css, the one grid the
// home page and both archives share. Up to 760px every card has a row to
// itself: full width on phones, then the landscape card's 38% cover, capped at
// 260px. Wider, a lone card is capped at 36rem, about a two-up card; two or four
// cards sit two-up, and more go three-up once three 300px tracks fit (1004px,
// plus any classic scrollbar).
const NARROW_SIZES = '(max-width: 480px) calc(100vw - 32px), (max-width: 760px) 260px'

const gridSizes = (count: number) => {
  if (count === 1) return '36rem'
  if (count === 2 || count === 4) return '(max-width: 1220px) calc(50vw - 32px), 570px'
  return '(max-width: 1024px) calc(50vw - 32px), (max-width: 1220px) calc(33.4vw - 34px), 372px'
}

const coverSizes = computed(() => `${NARROW_SIZES}, ${gridSizes(props.gridCount)}`)
const cover = computed(() => (props.post.cover ? coverSources(props.post.cover, { aspect: 2 }) : null))
const formattedDate = computed(() => formatDate(props.post.date, 'short'))
const shouldShowSection = computed(() => props.showSection && !!sectionLabel(props.post.section))

// Only the cover being opened carries the view-transition name. Naming every
// card made each unclicked cover an exit-only group that lingered over the
// incoming article. Shared by all cards, so a second click moves the name.
const openingPath = useState<string | null>('post-card:opening', () => null)
const router = useRouter()
let stopOpening: (() => void) | undefined

const coverStyle = computed(() =>
  props.post.path && openingPath.value === props.post.path
    ? { viewTransitionName: coverTransitionName(props.post.path), viewTransitionClass: 'post-cover' }
    : undefined
)

const onOpen = (event: MouseEvent) => {
  // Modified and non-primary clicks open another tab or window: nothing morphs.
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  if (!props.post.path) return

  openingPath.value = props.post.path
  stopOpening?.()
  // Nuxt completes the navigation from inside the transition's update callback,
  // after the old page has been captured, so afterEach is the first safe moment
  // to drop the name, and the moment an aborted navigation must drop it. A
  // cancelled one was superseded (possibly by a second click on this card); the
  // newer navigation settles it instead.
  stopOpening = router.afterEach((_to, _from, failure) => {
    if (isNavigationFailure(failure, NavigationFailureType.cancelled)) return
    stopOpening?.()
    stopOpening = undefined
    openingPath.value = null
  })
}

onBeforeUnmount(() => stopOpening?.())

const coverLoaded = ref(false)
const coverRef = ref<HTMLImageElement | null>(null)

onMounted(() => {
  // A cached image can finish decoding before the listener is attached.
  if (coverRef.value?.complete) coverLoaded.value = true
})
</script>

<template>
  <NuxtLink
    v-reveal
    :to="post.path || '/'"
    class="post-card-item"
    :class="inFirstView ? 'is-rising' : 'reveal'"
    @click="onOpen"
  >
    <!-- The link is the hover target and never moves; the surface inside it
         lifts. Lifting the link itself moved its edge off a pointer resting near
         the bottom, which ended the hover, dropped the card back under the
         pointer and started it again: a flicker. -->
    <div class="post-card-surface">
    <div v-if="cover" class="post-card-cover" :class="{ 'is-loaded': coverLoaded }">
      <!-- Decorative: the title is right below. `loading`, `sizes` and `srcset`
           come before `src` because a client-rendered <img> sets its attributes
           in this order, and some engines start the fetch when `src` lands. -->
      <img
        ref="coverRef"
        :loading="coverLoading === 'lazy' ? 'lazy' : 'eager'"
        :fetchpriority="coverLoading === 'priority' ? 'high' : undefined"
        decoding="async"
        :width="cover.width"
        :height="cover.height"
        :sizes="cover.srcset ? coverSizes : undefined"
        :srcset="cover.srcset"
        :src="cover.src"
        alt=""
        :style="coverStyle"
        @load="coverLoaded = true"
        @error="coverLoaded = true"
      >
    </div>

    <div class="post-card-content">
      <component :is="`h${headingLevel}`" class="post-card-title">
        {{ post.title || 'Untitled' }}
      </component>

      <div class="post-card-meta">
        <time v-if="formattedDate" :datetime="isoDate(post.date)">{{ formattedDate }}</time>
        <span v-if="shouldShowSection">{{ sectionLabel(post.section) }}</span>
      </div>

      <p v-if="post.description" class="post-card-description">
        {{ post.description }}
      </p>
    </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
/* The link: the grid item and the hover target. It keeps its box still. */
.post-card-item {
  display: flex;
  height: 100%;
  border-radius: var(--radius-md);
  /* This shorthand beats the global `.has-js .reveal` one (same specificity,
     loaded later), so it has to carry the reveal fade and its stagger too. */
  transition:
    opacity var(--dur-slow) var(--ease-out) var(--delay, 0s),
    translate var(--dur-slow) var(--ease-out) var(--delay, 0s);
}

/* The card itself: a frosted sheet over the page glow, with a sheen down from
   its lit top edge. The page glow stays fixed while the card scrolls over it. */
.post-card-surface {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background:
    linear-gradient(180deg, var(--surface-sheen) 0, transparent 34%),
    var(--glass-card);
  box-shadow:
    inset 0 1px 0 var(--surface-highlight),
    0 0 0 1px var(--line-soft),
    var(--elev-1);
  transition:
    transform var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
}

/* Movement only, from first paint (see `inFirstView`), and only on the page the
   visit opened on: after a client navigation the page transition is the one
   entrance, and a second rise inside it read as a stutter. */
:global(html.is-first-load) .post-card-item.is-rising {
  animation: card-rise var(--dur-slow) var(--ease-out) var(--delay, 0s) backwards;
}

@keyframes card-rise {
  from { translate: 0 18px; }
}

/* Touch screens keep :hover on a tapped card, so only hovering pointers get it. */
/* Hovered, the card lifts into the light: a deeper shadow and a glow under it,
   and the cover eases in. */
@media (hover: hover) {
  .post-card-item:hover .post-card-surface {
    box-shadow:
      inset 0 1px 0 var(--surface-highlight),
      0 0 0 1px var(--line),
      var(--elev-3),
      0 28px 60px -32px var(--surface-glow-strong);
  }

  .post-card-item:hover .post-card-title {
    color: var(--accent);
  }
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .post-card-item:hover .post-card-surface {
    transform: translateY(-4px);
  }

  .post-card-item:active .post-card-surface {
    transform: translateY(-2px) scale(0.995);
  }

  .post-card-item:hover .post-card-cover img {
    transform: scale(1.04);
  }
}

.post-card-cover {
  width: 100%;
  aspect-ratio: 2 / 1;
  /* The cap is what keeps a full-width card from turning into a full-screen
     photo: past ~430px of card width the cover letterboxes instead of growing.
     `object-fit: cover` on the image handles the crop. */
  max-height: var(--cover-max-h);
  overflow: hidden;
  background-color: var(--bg-subtle);
}

.post-card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform 0.6s var(--ease-out);
}

/* No shimmer while a cover loads: a sweeping highlight across every pending
   cover read as flashing. The plain --bg-subtle field holds its place. */
@media screen and (prefers-reduced-motion: no-preference) {
  /* Lazy covers fade in once loaded instead of painting in piecemeal. Only JS
     marks them loaded, so the hidden state needs JS and still lifts on its own
     if hydration never comes. Eager covers are never hidden: they may be the
     LCP, and waiting for hydration would hold back that paint. */
  .has-js .post-card-cover:not(.is-loaded) img[loading='lazy'] {
    opacity: 0;
    animation: cover-fallback 0s linear 2.5s forwards;
  }
}

@keyframes cover-fallback {
  to { opacity: 1; }
}

/* min-width: 0 lets the text column shrink below its longest word in the
   landscape layout instead of overflowing the card. */
.post-card-content {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex: 1;
  min-width: 0;
}

/* Visually above the title, but after it in the DOM: the card link has no
   aria-label, its name is its content, and that name should lead with the
   title. */
.post-card-meta {
  order: -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--muted);
}

/* Date, a quiet dot, the section. The dot sits after the date rather than
   before the section, which wears a plate and would carry it inside. */
.post-card-meta > time:not(:last-child)::after {
  content: "";
  display: inline-block;
  width: 3px;
  height: 3px;
  margin: 0 10px 1px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.6;
  vertical-align: middle;
}

/* The section as a small black plate in both themes: a raised off-white rule
   just inside its edge, bold off-white capitals (16:1). */
.post-card-meta > span {
  display: inline-flex;
  align-items: center;
  padding: 3px 6px 3px 7px;
  border-radius: 2.5px;
  background: linear-gradient(180deg, #221b16 0, #16110d 60%);
  color: #eee9de;
  font-family: var(--font-sans);
  font-size: 10.5px;
  font-weight: 700;
  line-height: 12px;
  letter-spacing: 0.1em;
  box-shadow:
    inset 0 0 0 1.75px #16110d,
    inset 0 0 0 2.5px rgba(238, 233, 222, 0.82),
    0 0.5px 1px rgba(30, 24, 20, 0.25);
}

/* On the dark card the plate is lifted a step and ringed in black, so it
   still reads as a black object, not as an outlined chip. */
:global(:root[data-theme='dark']) .post-card-meta > span {
  background: linear-gradient(180deg, #2e2823, #1c1714);
  color: #e2dcd0;
  box-shadow:
    inset 0 0 0 1.75px #1c1714,
    inset 0 0 0 2.5px rgba(226, 220, 208, 0.72),
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 0 0 0.5px rgba(0, 0, 0, 0.7);
}

@media (forced-colors: active) {
  .post-card-meta > span {
    border: 1px solid CanvasText;
  }
}

/* Both clamped blocks wrap long identifiers and URLs: the clamp adds an
   ellipsis only on the last line, so a word cut at the box edge lost text
   silently. */
.post-card-title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  line-height: 1.25;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--heading);
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  transition: color var(--dur-fast) var(--ease-standard);
}

.post-card-description {
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--muted);
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* Tablet / small-laptop widths get a single full-width column, where a 16:9
   cover would be ~370px tall and swallow half the fold. A landscape card uses
   the width for text instead of for a bigger picture. */
@media (min-width: 481px) and (max-width: 760px) {
  .post-card-surface {
    flex-direction: row;
    align-items: stretch;
  }

  .post-card-cover {
    flex: 0 0 38%;
    max-width: 260px;
    aspect-ratio: 4 / 3;
  }

  .post-card-content {
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .post-card-content {
    padding: 12px 14px 14px;
  }
}
</style>
