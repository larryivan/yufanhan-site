<script setup lang="ts">
const { data: latest } = await useAsyncData('home-latest', () =>
  queryContent()
    .where({ draft: { $ne: true }, section: { $in: ['blog', 'life'] } })
    .sort({ date: -1 })
    .limit(8)
    .find()
)

const blogPosts = computed(() => (latest.value || []).filter((p) => p.section === 'blog'))
const lifePosts = computed(() => (latest.value || []).filter((p) => p.section === 'life'))
</script>

<template>
  <section class="hero">
    <div>
      <p class="badge">Markdown · Waline · Nuxt</p>
      <h1>构建一个兼顾技术与生活的博客。</h1>
      <p>
        内容以 Markdown 驱动，评论/浏览/点赞由 Waline 提供。四个栏目：Home、Blog、Life、About，适合长期运营与拓展。
      </p>
      <div class="actions">
        <NuxtLink to="/blog" class="btn primary">开始阅读</NuxtLink>
        <NuxtLink to="/about" class="btn">关于作者</NuxtLink>
      </div>
    </div>
    <div class="hero-card">
      <div class="section-heading" style="margin: 0 0 10px;">
        <h2>最新发布</h2>
        <NuxtLink to="/blog">全部文章 →</NuxtLink>
      </div>
      <div class="grid">
        <PostCard v-for="post in latest?.slice(0, 3)" :key="post._path" :post="post" />
      </div>
    </div>
  </section>

  <section>
    <div class="section-heading">
      <h2>技术 Blog</h2>
      <NuxtLink to="/blog" class="btn">浏览全部</NuxtLink>
    </div>
    <div class="grid three">
      <PostCard v-for="post in blogPosts.slice(0, 3)" :key="post._path" :post="post" />
    </div>
  </section>

  <section>
    <div class="section-heading">
      <h2>生活 Life</h2>
      <NuxtLink to="/life" class="btn">更多生活</NuxtLink>
    </div>
    <div class="grid three">
      <PostCard v-for="post in lifePosts.slice(0, 3)" :key="post._path" :post="post" />
    </div>
  </section>
</template>
