<script setup lang="ts">
const { data: latestPosts } = await useAsyncData('home-latest', () =>
  queryContent()
    .where({ draft: { $ne: true }, section: { $in: ['blog', 'life'] } })
    .sort({ date: -1 })
    .limit(12)
    .find()
)

const posts = computed(() => latestPosts.value || [])

const formatDate = (dateString?: string) => {
  if (!dateString) return ''
  const d = new Date(dateString)
  return d.toISOString().split('T')[0].replace(/-/g, '.')
}
</script>

<template>
  <div class="vertical-container">
    <!-- Centered Stacked Hero -->
    <header class="vertical-hero animate-rise">
      <h1 class="vertical-title">
        Engineering. Aesthetics. Life.
      </h1>
      <p class="vertical-desc">
        探索极简美学与现代技术的交汇点。将复杂的工程与设计提炼为最纯粹的形式，记录代码实践与生活切片。
      </p>
      <div class="vertical-actions">
        <NuxtLink to="/blog" class="primary-btn">
          View All Posts
          <AppIcon name="arrow-right" />
        </NuxtLink>
      </div>
      
      <div class="vertical-metrics">
        <div class="metric-item">
          <span>Framework</span>
          <strong>Nuxt 4.2</strong>
        </div>
        <div class="metric-sep"></div>
        <div class="metric-item">
          <span>Records</span>
          <strong>{{ posts.length }}+ Logs</strong>
        </div>
      </div>
    </header>

    <!-- Dense Vertical Grid -->
    <main class="vertical-main animate-rise delay-1">
      <div class="vertical-grid">
        <NuxtLink 
          v-for="(post, index) in posts" 
          :key="post._path" 
          :to="post._path"
          class="dense-card"
          :style="{ '--delay': `${index * 0.04}s` }"
        >
          <div class="dense-card-meta">
            <span class="dense-card-section">{{ post.section === 'life' ? 'Life' : 'Tech' }}</span>
            <span class="dense-card-date">{{ formatDate(post.date) }}</span>
          </div>
          <h3 class="dense-card-title">{{ post.title }}</h3>
          <p v-if="post.description" class="dense-card-desc">{{ post.description }}</p>
          <div class="dense-card-hover-bg"></div>
        </NuxtLink>
      </div>
    </main>
  </div>
</template>
