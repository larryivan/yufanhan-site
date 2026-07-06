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
  { to: '/', label: 'Home', match: '/' },
  { to: '/blog', label: 'Blog', match: '/blog' },
  { to: '/life', label: 'Life', match: '/life' },
  { to: '/about', label: 'About', match: '/about' }
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
        <span class="brand-name">LiH Blog</span>
      </NuxtLink>

      <nav class="nav-links" aria-label="Main navigation">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          :class="{ active: isActive(link.match) }"
        >
          <span class="nav-link-text">{{ link.label }}</span>
        </NuxtLink>
      </nav>

      <div class="header-actions">
        <button class="icon-btn hide-mobile" type="button" @click="emit('open-search')" aria-label="Search">
          <AppIcon name="search" :size="18" />
        </button>

        <button class="icon-btn" type="button" @click="toggle" aria-label="Toggle theme">
          <AppIcon :name="theme === 'light' ? 'moon' : 'sun'" :size="18" />
        </button>

        <button
          class="icon-btn mobile-toggle"
          type="button"
          @click="toggleMobileMenu"
          aria-label="Toggle menu"
        >
          <AppIcon :name="isMobileMenuOpen ? 'x' : 'menu'" :size="18" />
        </button>
      </div>
    </div>

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
            <button class="mobile-search-trigger" type="button" @click="emit('open-search'); toggleMobileMenu()">
              <AppIcon name="search" />
              <span>Search</span>
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
  transition: all 0.4s var(--ease-out);
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
</style>
