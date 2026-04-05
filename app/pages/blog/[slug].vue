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
  <div class="reading-container">
    <div class="reading-layout" :class="{ 'has-sidebar': hasToc }">
      <main class="reading-main animate-rise">
        <article class="reading-deck">
          <header class="reading-header">
            <div class="reading-header-copy">
              <h1 class="reading-title">{{ post?.title }}</h1>
              <p v-if="post?.description" class="reading-lead">{{ post.description }}</p>
            </div>

            <div v-if="formattedDate || post?.readingTime" class="reading-header-meta">
              <div v-if="formattedDate" class="reading-header-fact">
                <span class="reading-header-fact-label">Published</span>
                <time class="reading-header-fact-value">{{ formattedDate }}</time>
              </div>
              <div v-if="post?.readingTime" class="reading-header-fact">
                <span class="reading-header-fact-label">Reading time</span>
                <span class="reading-header-fact-value">{{ post.readingTime }} min</span>
              </div>
            </div>
          </header>

          <section class="reading-article-shell surface-card animate-rise delay-1">
            <div v-if="post?.cover" class="reading-cover">
              <img :src="post.cover" :alt="post.title" />
            </div>

            <div id="reading-article-content" class="reading-article-body">
              <div class="prose">
                <ContentRenderer :value="post" />
              </div>
            </div>
          </section>
        </article>
        
        <section class="reading-comments surface-card animate-rise delay-2">
          <div class="reading-comments-head">
            <p class="reading-comments-title">Comments</p>
          </div>
          <WalineWidget :path="post?._path" />
        </section>
      </main>

      <aside v-if="hasToc" class="reading-sidebar animate-rise delay-1">
        <section class="reading-side-panel surface-card">
          <div class="toc-wrapper">
            <ContentTOC :links="tocLinks" />
          </div>
        </section>
      </aside>
    </div>

    <ReadingProgress target-selector="#reading-article-content" />
  </div>
</template>
