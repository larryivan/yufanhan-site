<script setup lang="ts">
import type { PostSection } from '#shared/utils/sections'

const props = defineProps<{ section: PostSection }>()

const route = useRoute()
const path = computed(() => `/${props.section}/${String(route.params.slug)}`)

// `npm run dev` opens drafts too, so a post can be read at its own URL before it
// is published. Production builds leave drafts out of the content altogether.
const { data: post } = await useAsyncData(`post:${path.value}`, () => {
  const query = queryCollection('posts').path(path.value)
  return (import.meta.dev ? query : query.where('draft', '=', false)).first()
})

if (!post.value) {
  // Fatal only in the browser, where it swaps in the full-screen error page. On
  // the server it renders that page anyway, and a fatal error is logged with a
  // stack trace, for every scanner probe and stale link.
  throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: import.meta.client })
}

// `queryCollectionItemSurroundings` cannot be scoped to a section, and posts
// share one collection — so the neighbours are derived from the section's own
// ordered list instead.
const { data: siblings } = await useAsyncData(`post-siblings:${props.section}`, () =>
  queryCollection('posts')
    .where('section', '=', props.section)
    .where('draft', '=', false)
    .order('date', 'DESC')
    .select('path', 'title')
    .all()
)

useSeo(() => ({
  title: post.value?.title,
  description: post.value?.description,
  // The content path, not the requested URL: /BLOG/x and /blog/x/ render too.
  path: post.value?.path,
  type: 'article',
  // Link previews use a 1.91:1 landscape crop; a portrait original would be
  // letterboxed or cut arbitrarily by each platform.
  image: post.value?.cover
    ? coverSources(post.value.cover, { aspect: 1200 / 630, fallback: 1200 }).src
    : undefined,
  publishedTime: isoDate(post.value?.date) || undefined,
  modifiedTime: isoDate(post.value?.updatedAt) || undefined,
  tags: post.value?.tags
}))

/*
 * The cover takes its view-transition name only when the post is opened from
 * its card, which PostCard names for that click alone (the page's middleware
 * notes it in the route meta). Any other way in or out, nothing pairs with it,
 * and a lone named cover faded on its own timing over the rest of the
 * transition, so the name is also dropped before the next navigation.
 */
const coverMorph = ref(route.meta.coverMorph === true)
const dropCoverName = () => {
  coverMorph.value = false
}
onBeforeRouteLeave(dropCoverName)
onBeforeRouteUpdate(dropCoverName)

const coverStyle = computed(() =>
  coverMorph.value
    ? { viewTransitionName: coverTransitionName(post.value?.path), viewTransitionClass: 'post-cover' }
    : undefined
)

const currentIndex = computed(() =>
  (siblings.value || []).findIndex((item) => item.path === path.value)
)
const previous = computed(() => {
  const i = currentIndex.value
  return i > 0 ? siblings.value?.[i - 1] ?? null : null
})
const next = computed(() => {
  const i = currentIndex.value
  return i >= 0 ? siblings.value?.[i + 1] ?? null : null
})

// Comments render only once the giscus ids are configured (see nuxt.config).
const { giscus } = useRuntimeConfig().public
const hasComments = Boolean(giscus.repo && giscus.repoId && giscus.categoryId)
</script>

<template>
  <div v-if="post" class="article-page">
    <PostArticleView
      :post="post"
      :previous="previous"
      :next="next"
      :cover-style="coverStyle"
      :comments="hasComments"
    />
    <ReadingProgress target-selector="#reading-article-content" />
    <ReadToEnd target-selector="#reading-article-content" :reading-minutes="post.readingTime" />
  </div>
</template>
