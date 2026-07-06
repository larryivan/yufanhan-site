<script setup lang="ts">
import dayjs from 'dayjs'

const route = useRoute()

const { data: post } = await useAsyncData(`blog-${route.params.slug}`, () =>
  queryContent(`/blog/${route.params.slug}`).findOne()
)

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found' })
}

useHead({
  title: post.value.title,
  meta: [
    { name: 'description', content: post.value.description },
    { property: 'og:title', content: post.value.title },
    { property: 'og:description', content: post.value.description }
  ]
})

const tocLinks = computed(() => post.value?.body?.toc?.links || [])
const hasToc = computed(() => tocLinks.value.length > 0)
const formattedDate = computed(() =>
  post.value?.date ? dayjs(post.value.date).format('YYYY.MM.DD') : ''
)
</script>

<template>
  <div class="article-page">
    <div class="article-container animate-rise">
      <div class="article-layout" :class="{ 'has-sidebar': hasToc }">
        <main class="article-main">
          <header class="article-hero animate-rise delay-1">
            <h1 class="article-title">{{ post?.title }}</h1>
            <p v-if="post?.description" class="article-lead">{{ post.description }}</p>

            <div v-if="formattedDate || post?.readingTime" class="article-meta">
              <time v-if="formattedDate">{{ formattedDate }}</time>
              <span v-if="formattedDate && post?.readingTime" class="meta-divider">·</span>
              <span v-if="post?.readingTime">{{ post.readingTime }} min read</span>
            </div>
          </header>

          <div v-if="post?.cover" class="article-cover-wrapper animate-rise delay-1">
            <img :src="post.cover" :alt="post.title" class="article-cover-img" />
          </div>

          <div id="reading-article-content" class="prose animate-rise delay-2">
            <ContentRenderer :value="post" />
          </div>
          
          <section class="article-comments animate-rise delay-2">
            <h2 class="comments-title">Comments</h2>
            <WalineWidget :path="post?._path" />
          </section>
        </main>

        <aside v-if="hasToc" class="article-sidebar animate-rise delay-1">
          <div class="toc-wrapper">
            <div class="toc-title">On this page</div>
            <ContentTOC :links="tocLinks" />
          </div>
        </aside>
      </div>
    </div>

    <ReadingProgress target-selector="#reading-article-content" />
  </div>
</template>
