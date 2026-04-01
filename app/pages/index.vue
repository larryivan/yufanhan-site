<script setup lang="ts">
const { data: latest } = await useAsyncData('home-latest', () =>
  queryContent()
    .where({ draft: { $ne: true }, section: { $in: ['blog', 'life'] } })
    .sort({ date: -1 })
    .limit(10)
    .find()
)

const latestPosts = computed(() => latest.value || [])
const featuredPost = computed(() => latestPosts.value[0])
const feedPosts = computed(() => latestPosts.value.slice(1, 5))
const blogPosts = computed(() => latestPosts.value.filter((post) => post.section === 'blog').slice(0, 3))
const lifePosts = computed(() => latestPosts.value.filter((post) => post.section === 'life').slice(0, 3))
</script>

<template>
  <div class="home-container">
    <!-- Hero Section -->
    <section class="home-hero animate-rise">
      <div class="hero-glow" />
      <div class="hero-content">
        <p class="hero-kicker">Digital Architecture & Philosophy</p>
        <h1 class="hero-title">
          Crafting <span class="text-accent">Simplicity</span><br />
          in a Complex World.
        </h1>
        <p class="hero-desc">
          探索极简美学与现代技术的交汇点。这里记录关于软件工程、系统设计以及对生活本质的深度思考。
        </p>
        <div class="hero-actions">
          <NuxtLink to="/blog" class="primary-btn">
            Explore Articles
            <AppIcon name="arrow-right" />
          </NuxtLink>
          <NuxtLink to="/about" class="secondary-btn">About Me</NuxtLink>
        </div>
      </div>

      <div class="hero-stats">
        <div class="stat-item">
          <span class="stat-label">System</span>
          <span class="stat-value">Nuxt 4.2.2</span>
        </div>
        <div class="stat-sep" />
        <div class="stat-item">
          <span class="stat-label">Core</span>
          <span class="stat-value">Markdown</span>
        </div>
        <div class="stat-sep" />
        <div class="stat-item">
          <span class="stat-label">Uptime</span>
          <span class="stat-value">99.9%</span>
        </div>
      </div>
    </section>

    <!-- Content Board -->
    <div class="home-grid">
      <!-- Main Feed -->
      <section class="grid-panel main-feed animate-rise delay-1">
        <div class="panel-header">
          <div class="panel-title">
            <div class="indicator" />
            <h2>Signal Feed</h2>
          </div>
          <NuxtLink to="/blog" class="more-link">All Posts</NuxtLink>
        </div>
        
        <div v-if="featuredPost" class="featured-card-wrapper">
          <NuxtLink :to="featuredPost._path" class="featured-card">
            <div class="featured-content">
              <span class="card-section">{{ featuredPost.section }}</span>
              <h3>{{ featuredPost.title }}</h3>
              <p>{{ featuredPost.description }}</p>
            </div>
            <div class="featured-image" v-if="featuredPost.cover">
              <img :src="featuredPost.cover" :alt="featuredPost.title" />
            </div>
            <div class="featured-footer">
              <span class="read-more">Reading Now</span>
              <AppIcon name="arrow-right" />
            </div>
          </NuxtLink>
        </div>

        <div class="feed-list">
          <NuxtLink
            v-for="post in feedPosts"
            :key="post._path"
            :to="post._path"
            class="feed-item"
          >
            <span class="feed-date">{{ post.date ? new Date(post.date).getFullYear() : '' }}</span>
            <span class="feed-title">{{ post.title }}</span>
            <AppIcon name="chevron-right" />
          </NuxtLink>
        </div>
      </section>

      <!-- Side Panels -->
      <div class="side-panels">
        <section class="grid-panel animate-rise delay-2">
          <div class="panel-header">
            <div class="panel-title">
              <div class="indicator" />
              <h2>Tech Layer</h2>
            </div>
          </div>
          <div class="mini-stack">
            <PostCard v-for="post in blogPosts" :key="post._path" :post="post" />
          </div>
        </section>

        <section class="grid-panel animate-rise delay-3">
          <div class="panel-header">
            <div class="panel-title">
              <div class="indicator" />
              <h2>Life Layer</h2>
            </div>
          </div>
          <div class="mini-stack">
            <PostCard v-for="post in lifePosts" :key="post._path" :post="post" />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
