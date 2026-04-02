<script setup lang="ts">
import dayjs from 'dayjs'

const route = useRoute()

const { data: post } = await useAsyncData(`blog-${route.params.slug}`, () =>
  queryContent(`/blog/${route.params.slug}`).findOne()
)

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在' })
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
const formattedDate = computed(() =>
  post.value?.date ? dayjs(post.value.date).format('YYYY.MM.DD') : ''
)
</script>

<template>
  <div class="reading-container">
    <div class="reading-layout">
      <!-- Main Content -->
      <main class="reading-main animate-rise">
        <article>
          <header class="reading-header">
            <h1 class="reading-title">{{ post?.title }}</h1>
            <div class="reading-meta">
              <time v-if="formattedDate">{{ formattedDate }}</time>
              <span v-if="post?.readingTime" class="sep">/</span>
              <span v-if="post?.readingTime">{{ post.readingTime }} min read</span>
              <span v-if="post?.tags?.length" class="sep">/</span>
              <span class="reading-tags" v-if="post?.tags?.length">
                <span v-for="tag in post.tags" :key="tag">#{{ tag }}</span>
              </span>
            </div>
            <p v-if="post?.description" class="reading-lead">{{ post.description }}</p>
          </header>

          <div v-if="post?.cover" class="reading-cover animate-rise delay-1">
            <img :src="post.cover" :alt="post.title" />
          </div>

          <div class="prose animate-rise delay-1">
            <ContentRenderer :value="post" />
          </div>
        </article>
        
        <section class="reading-comments animate-rise delay-2">
          <WalineWidget :path="post?._path" />
        </section>
      </main>

      <!-- Minimal TOC Sidebar -->
      <aside class="reading-sidebar animate-rise delay-1" v-if="tocLinks.length">
        <div class="toc-wrapper">
          <span class="toc-label">On this page</span>
          <ContentTOC :links="tocLinks" />
        </div>
      </aside>
    </div>
  </div>
</template>
