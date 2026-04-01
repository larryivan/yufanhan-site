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
  <section class="article-layout">
    <aside class="article-sidebar animate-rise">
      <div class="article-sidebar-card">
        <p class="article-section">Tech Layer</p>
        <div class="article-sidebar-meta">
          <span v-if="formattedDate">更新于 {{ formattedDate }}</span>
          <span v-if="post?.readingTime">{{ post?.readingTime }} min read</span>
          <span v-for="tag in post?.tags || []" :key="tag">{{ tag }}</span>
        </div>
      </div>
      <ContentTOC :links="tocLinks" />
    </aside>

    <div class="article-main">
      <header class="article-header animate-rise delay-1">
        <p class="page-kicker">Article Node</p>
        <h1 class="article-title">{{ post?.title }}</h1>
        <p v-if="post?.description" class="article-description">{{ post.description }}</p>
      </header>
      <img
        v-if="post?.cover"
        :src="post.cover"
        :alt="post.title"
        class="article-cover animate-rise delay-2"
      />

      <article class="prose prose--article animate-rise delay-3">
        <ContentRenderer :value="post" />
      </article>

      <section class="comment-shell animate-rise delay-4">
        <WalineWidget :path="post?._path" />
      </section>
    </div>
  </section>
</template>
