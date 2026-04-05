<script setup lang="ts">
const { data: latestPosts } = await useAsyncData('home-latest', () =>
  queryContent()
    .where({ draft: { $ne: true }, section: { $in: ['blog', 'life'] } })
    .sort({ date: -1 })
    .limit(12)
    .find()
)

const posts = computed(() => latestPosts.value || [])
const latestGridPosts = computed(() => posts.value.slice(0, 6))
</script>

<template>
  <div class="home-page">
    <section class="home-hero">
      <div class="home-copy">
        <p class="eyebrow">LIH BLOG</p>
        <h1 class="home-title">Writing about craft and everyday life.</h1>
        <p class="home-description">A simple, editorial space for notes on engineering, design, and routine.</p>
        <div class="home-actions">
          <NuxtLink to="/blog" class="home-cta-button">
            Read the blog
            <AppIcon name="arrow-right" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="section-block">
      <div class="section-head">
        <h2>Latest posts</h2>
        <NuxtLink to="/blog" class="text-link">
          View all
          <AppIcon name="arrow-right" />
        </NuxtLink>
      </div>

      <main class="post-grid">
        <PostCard
          v-for="(post, index) in latestGridPosts"
          :key="post._path"
          :post="post"
          :show-section="true"
          :style="{ '--delay': `${index * 0.05}s` }"
        />
      </main>
    </section>
  </div>
</template>
