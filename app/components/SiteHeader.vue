<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits<{
  (e: 'open-search'): void
}>()

const route = useRoute()
const { theme, toggle } = useTheme()

const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

const links = [
  { to: '/', label: '首页', match: '/' },
  { to: '/blog', label: '博客', match: '/blog' },
  { to: '/life', label: '生活', match: '/life' },
  { to: '/about', label: '关于', match: '/about' }
]

const isActive = (match: string) => {
  if (match === '/') return route.path === '/'
  return route.path.startsWith(match)
}

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
  if (isMobileMenuOpen.value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

watch(() => route.path, () => {
  isMobileMenuOpen.value = false
  document.body.style.overflow = ''
})

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <header 
    class="site-header" 
    :class="{ 'is-scrolled': isScrolled, 'is-mobile-open': isMobileMenuOpen }"
  >
    <div class="header-inner">
      <NuxtLink to="/" class="brand" aria-label="Go home">
        <div class="brand-mark" aria-hidden="true">
          <div class="brand-mark-core" />
        </div>
        <span class="brand-copy">
          <span class="brand-name">LiH Blog</span>
        </span>
      </NuxtLink>

      <!-- Desktop Nav -->
      <nav class="nav-links" aria-label="Main navigation">
        <NuxtLink
          v-for="(link, index) in links"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          :class="{ active: isActive(link.match) }"
          :style="{ '--index': index }"
        >
          <span class="nav-link-text">{{ link.label }}</span>
        </NuxtLink>
      </nav>

      <div class="header-actions">
        <button class="icon-btn hide-mobile" type="button" @click="emit('open-search')" aria-label="Search">
          <AppIcon name="search" />
        </button>
        
        <a 
          href="https://github.com" 
          target="_blank" 
          class="icon-btn hide-mobile" 
          aria-label="GitHub"
        >
          <AppIcon name="github" />
        </a>

        <button class="icon-btn icon-btn--accent" type="button" @click="toggle" aria-label="Toggle theme">
          <AppIcon :name="theme === 'light' ? 'moon' : 'sun'" />
        </button>

        <!-- Mobile Menu Toggle -->
        <button 
          class="icon-btn mobile-toggle" 
          type="button" 
          @click="toggleMobileMenu" 
          aria-label="Toggle menu"
        >
          <AppIcon :name="isMobileMenuOpen ? 'x' : 'menu'" />
        </button>
      </div>
    </div>

    <!-- Mobile Navigation Overlay -->
    <Transition name="mobile-menu">
      <div v-if="isMobileMenuOpen" class="mobile-nav-overlay">
        <nav class="mobile-nav-content">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="mobile-nav-link"
            :class="{ active: isActive(link.match) }"
          >
            {{ link.label }}
            <AppIcon name="arrow-right" />
          </NuxtLink>
          
          <div class="mobile-nav-footer">
            <button class="mobile-search-trigger" @click="emit('open-search'); toggleMobileMenu()">
              <AppIcon name="search" />
              <span>搜索文章...</span>
            </button>
          </div>
        </nav>
      </div>
    </Transition>
  </header>
</template>

<style>
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
</style>
