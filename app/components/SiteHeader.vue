<script setup lang="ts">
const emit = defineEmits<{
  (e: 'open-search'): void
}>()

const route = useRoute()
const { theme, toggle } = useTheme()

const links = [
  { to: '/', label: 'Home', match: '/' },
  { to: '/blog', label: 'Blog', match: '/blog' },
  { to: '/life', label: 'Life', match: '/life' },
  { to: '/about', label: 'About', match: '/about' }
]

const isActive = (match: string) => {
  if (match === '/') return route.path === '/'
  return route.path.startsWith(match)
}
</script>

<template>
  <header class="site-header">
    <div class="container navbar">
      <NuxtLink to="/" class="brand" aria-label="Go home">
        <span class="brand-dot" />
        <span>LiH Blog</span>
      </NuxtLink>

      <nav class="nav-links" aria-label="Main navigation">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :class="{ active: isActive(link.match) }"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="actions">
        <button class="btn" type="button" @click="emit('open-search')">
          🔎
          <span>搜索</span>
        </button>
        <button class="btn primary" type="button" @click="toggle">
          <span v-if="theme === 'light'">🌙</span>
          <span v-else>☀️</span>
          <span>{{ theme === 'light' ? '暗色' : '亮色' }}</span>
        </button>
      </div>
    </div>
  </header>
</template>
