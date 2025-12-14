<script setup lang="ts">
const route = useRoute()

const { data: post } = await useAsyncData(`life-${route.params.slug}`, () =>
  queryContent(`/life/${route.params.slug}`).findOne()
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
</script>

<template>
  <article class="prose">
    <p class="badge">Life</p>
    <h1>{{ post?.title }}</h1>
    <div class="meta" style="margin-bottom: 12px;">
      <span v-if="post?.date">📅 {{ post?.date }}</span>
      <span v-if="post?.readingTime">⏱️ {{ post?.readingTime }} min</span>
      <span v-for="tag in post?.tags || []" :key="tag" class="tag"># {{ tag }}</span>
    </div>

    <PageInteractions :path="post?._path" />

    <ContentRenderer :value="post" />

    <ContentTOC :links="tocLinks" style="margin-top: 20px;" />

    <WalineWidget :path="post?._path" />
  </article>
</template>
