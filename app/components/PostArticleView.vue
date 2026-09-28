<script setup lang="ts">
import type { PostSection } from '#shared/utils/sections'
// Formulas are rendered to HTML at build time; this is all they need on the page.
// Its fonts are fetched only when a formula on screen uses them.
import 'katex/dist/katex.min.css'

/**
 * An article as the reader sees it: shared by the article page (PostArticle),
 * which fetches the post, and the editor's preview (pages/admin/frame.vue), which
 * renders a post that isn't saved yet — so the preview is the page.
 */

export interface ArticlePost {
  path: string
  section: PostSection
  title: string
  description?: string
  date?: string | Date
  updatedAt?: string | Date
  readingTime?: number
  draft?: boolean
  cover?: string
  tags?: string[]
  body?: unknown
}

interface Neighbour {
  path: string
  title: string
}

const props = withDefaults(
  defineProps<{
    post: ArticlePost
    previous?: Neighbour | null
    next?: Neighbour | null
    /** The cover's view-transition name, while it morphs from its card. */
    coverStyle?: Record<string, string | undefined>
    comments?: boolean
  }>(),
  { previous: null, next: null, coverStyle: undefined, comments: false }
)

const sectionMeta = computed(() => SECTION_META[props.post.section])
const tocLinks = computed(() => (props.post.body as { toc?: { links?: [] } } | undefined)?.toc?.links || [])
const hasToc = computed(() => tocLinks.value.length > 0)
const tags = computed<string[]>(() => props.post.tags || [])

const publishedDay = computed(() => isoDate(props.post.date))
const updatedDay = computed(() => {
  const day = isoDate(props.post.updatedAt)
  // Only worth showing when it actually differs from the publish date.
  return day !== publishedDay.value ? day : ''
})

// No width/height attributes: the stylesheet sizes the cover with aspect-ratio,
// and a height attribute would pin it at 525px tall on every screen width. The
// alt is empty because the image is decorative; the title sits right above it.
const cover = computed(() =>
  props.post.cover
    ? coverSources(props.post.cover, { aspect: 5 / 2, widths: [480, 800, 1200, 1600], fallback: 1200 })
    : null
)
</script>

<template>
  <div class="article-container">
    <div class="article-layout" :class="{ 'has-sidebar': hasToc }">
      <article class="article-main">
        <header class="article-hero animate-rise delay-1">
          <NuxtLink :to="sectionMeta.path" class="article-kicker">
            <AppIcon name="arrow-left" :size="14" />
            {{ sectionMeta.label }}
          </NuxtLink>

          <h1 class="article-title">{{ post.title }}</h1>
          <p v-if="post.description" class="article-lead">{{ post.description }}</p>

          <!-- The stylesheet draws the separators inside the items, so a
               wrapped line never starts or ends with one. -->
          <div class="article-meta">
            <span v-if="publishedDay" class="meta-item"><time :datetime="publishedDay">{{ formatDate(publishedDay, 'short') }}</time></span>
            <span v-if="post.readingTime" class="meta-item">{{ post.readingTime }} min read</span>
            <span v-if="post.draft" class="meta-item meta-draft">Draft</span>
            <span v-if="updatedDay" class="meta-item">Updated <time :datetime="updatedDay">{{ formatDate(updatedDay, 'short') }}</time></span>
          </div>
        </header>

        <!-- Shown below 1100px in place of the sidebar. It never moves focus
             itself: the sidebar's copy, hidden but mounted, does that for both. -->
        <details v-if="hasToc" class="article-toc-inline animate-rise delay-1">
          <summary>On this page</summary>
          <ContentTOC :links="tocLinks" :moves-focus="false" />
        </details>

        <div v-if="cover" class="article-cover-wrapper animate-rise delay-1">
          <img
            :src="cover.src"
            :srcset="cover.srcset"
            :sizes="cover.srcset ? '(max-width: 1220px) 100vw, 1164px' : undefined"
            alt=""
            class="article-cover-img"
            fetchpriority="high"
            :style="coverStyle"
          >
        </div>

        <div id="reading-article-content" class="prose animate-rise delay-2">
          <ContentRenderer :value="post" />
        </div>

        <!-- The flex gap spaces the tags on screen; the space before each keeps
             them apart where the stylesheet doesn't apply (reader view, text
             extraction). -->
        <p v-if="tags.length" class="article-tags">
          Tagged
          <template v-for="tag in tags" :key="tag">
            {{ ' ' }}<NuxtLink :to="{ path: sectionMeta.path, query: { tag } }" class="article-tag">{{ tag }}</NuxtLink>
          </template>
        </p>

        <nav v-if="previous || next" class="article-nav" aria-label="More posts">
          <NuxtLink v-if="previous" :to="previous.path" class="article-nav-link is-prev">
            <span class="article-nav-label">
              <AppIcon name="arrow-left" :size="14" />
              Previous
            </span>
            <span class="article-nav-title">{{ previous.title }}</span>
          </NuxtLink>
          <span v-else />

          <NuxtLink v-if="next" :to="next.path" class="article-nav-link is-next">
            <span class="article-nav-label">
              Next
              <AppIcon name="arrow-right" :size="14" />
            </span>
            <span class="article-nav-title">{{ next.title }}</span>
          </NuxtLink>
        </nav>

        <GiscusComments
          v-if="comments"
          :path="post.path"
          :title="post.title"
          :description="post.description"
        />
      </article>

      <aside v-if="hasToc" class="article-sidebar animate-rise delay-1">
        <div class="toc-wrapper">
          <div class="toc-title">On this page</div>
          <ContentTOC :links="tocLinks" />
        </div>
      </aside>
    </div>
  </div>
</template>
