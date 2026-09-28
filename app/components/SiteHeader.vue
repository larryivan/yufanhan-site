<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { computed, ref, onMounted, onUnmounted } from 'vue'
// The logo (scripts/brand/logo.py).
import logo from '~/assets/brand/logo.svg?raw'

const emit = defineEmits<{
  (e: 'open-search'): void
}>()

const siteName = String(useRuntimeConfig().public.siteName)
const route = useRoute()
const error = useError()
const { theme, toggle: toggleTheme } = useTheme()
const { set: setScrollLock } = useScrollLock()

const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)
// Set when focus moves out of the open menu, which then goes at once instead of
// fading out over the control that has just taken focus.
const skipMenuTransition = ref(false)
const menuToggleRef = ref<HTMLButtonElement | null>(null)
const mobileMenuRef = ref<HTMLElement | null>(null)

// The `max-width: 860px` block in main.css, which swaps the nav links for the menu toggle.
const isMobileNav = useMediaQuery('(max-width: 860px)')

// '/blog/' is the same page as '/blog'.
const currentPath = computed(() => route.path.replace(/(.)\/$/, '$1'))

// The error page is shown at the address that failed, but a missing post under
// /blog/ is not a place in the Blog section: no link is current there.
const isActive = (to: string) => {
  if (error.value) return false
  if (to === '/') return currentPath.value === '/'
  return currentPath.value === to || currentPath.value.startsWith(`${to}/`)
}

// RouterLink only marks an exact match. A post is inside its section rather than
// on the section's page, so that link is current as a location, not as the page.
const ariaCurrent = (to: string) => {
  if (!isActive(to)) return undefined
  return currentPath.value === to ? 'page' : 'true'
}

// Two thresholds, not one: in past 24px, out again only above 8px. With one,
// a page resting on it (or a scroll that nudged across it) flipped the header
// back and forth.
const handleScroll = () => {
  const y = window.scrollY
  if (!isScrolled.value && y > 24) isScrolled.value = true
  else if (isScrolled.value && y < 8) isScrolled.value = false
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

const toggleMobileMenu = () => {
  skipMenuTransition.value = false
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const openSearch = () => {
  closeMobileMenu()
  emit('open-search')
}

// A focused menu link goes away with the menu, so focus returns to the toggle.
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !isMobileMenuOpen.value) return
  const hadFocus = mobileMenuRef.value?.contains(document.activeElement) ?? false
  closeMobileMenu()
  if (hadFocus) menuToggleRef.value?.focus()
}

// The menu also goes away with the link that was used. A link to another page
// hands over to that page; the current page's own link does not navigate, so
// focus returns to the toggle, as on Escape, instead of dropping to the document.
// RouterLink handles the click before this runs and leaves a modified one
// (Shift, Cmd, Ctrl, Alt) to the browser, which opens it elsewhere: this tab
// stays put, and so do the menu and the focused link.
const handleMenuLinkClick = (event: MouseEvent, to: string) => {
  if (!event.defaultPrevented) return
  const isCurrentPage = currentPath.value === to
  closeMobileMenu()
  if (isCurrentPage) menuToggleRef.value?.focus()
}

// The open menu hangs from the sticky header over the top of the page. Once focus
// moves on to the page, close it, or the focused control sits underneath it.
const handleFocusOut = (event: FocusEvent) => {
  if (!isMobileMenuOpen.value) return
  const next = event.relatedTarget
  if (next instanceof Node && !(event.currentTarget as HTMLElement).contains(next)) {
    skipMenuTransition.value = true
    closeMobileMenu()
  }
}

watch(isMobileMenuOpen, (open) => setScrollLock(open))

watch(() => route.path, closeMobileMenu)

// Past the breakpoint the toggle is hidden: a menu left open there could not be
// closed, and would keep the page locked.
watch(isMobileNav, (isMobile) => {
  if (!isMobile) closeMobileMenu()
})

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('keydown', handleKeydown)
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <header
    class="site-header"
    :class="{ 'is-scrolled': isScrolled, 'is-mobile-open': isMobileMenuOpen }"
    @focusout="handleFocusOut"
  >
    <div class="header-inner">
      <!-- Named by its visible text, so speech input can target what it shows. -->
      <NuxtLink to="/" class="brand">
        <!-- A trusted, build-time asset, so v-html is safe here. -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span class="brand-mark" aria-hidden="true" v-html="logo" />
        <span class="brand-name">{{ siteName }}</span>
      </NuxtLink>

      <nav class="nav-links" aria-label="Main navigation">
        <NuxtLink
          v-for="link in SITE_NAV"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          :class="{ active: isActive(link.to) }"
          :aria-current="ariaCurrent(link.to)"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="header-actions">
        <button class="icon-btn" type="button" aria-label="Search" @click="openSearch">
          <AppIcon name="search" :size="18" />
        </button>

        <!-- Both glyphs are rendered and CSS picks one from `data-theme`, which the
             inline head script sets before first paint. Choosing in Vue instead
             would hydrate a light-theme icon over a dark-theme page. For the same
             reason the pressed state is left out until mounted. -->
        <button
          class="icon-btn"
          type="button"
          aria-label="Dark theme"
          :aria-pressed="theme ? theme === 'dark' : undefined"
          @click="toggleTheme"
        >
          <AppIcon name="moon" :size="18" class="theme-icon theme-icon--light" />
          <AppIcon name="sun" :size="18" class="theme-icon theme-icon--dark" />
        </button>

        <button
          ref="menuToggleRef"
          class="icon-btn mobile-toggle"
          type="button"
          :aria-expanded="isMobileMenuOpen"
          aria-label="Toggle menu"
          @click="toggleMobileMenu"
        >
          <AppIcon :name="isMobileMenuOpen ? 'x' : 'menu'" :size="18" />
        </button>
      </div>
    </div>

    <div class="mobile-nav-anchor">
      <Transition name="mobile-menu" :css="!skipMenuTransition">
        <div v-if="isMobileMenuOpen" ref="mobileMenuRef" class="mobile-nav-overlay">
          <nav class="mobile-nav-content" aria-label="Main navigation">
            <NuxtLink
              v-for="link in SITE_NAV"
              :key="link.to"
              :to="link.to"
              class="mobile-nav-link"
              :class="{ active: isActive(link.to) }"
              :aria-current="ariaCurrent(link.to)"
              @click="handleMenuLinkClick($event, link.to)"
            >
              {{ link.label }}
            </NuxtLink>
          </nav>
        </div>
      </Transition>
    </div>
  </header>
</template>

<style>
/* Over the page, out of its flow. In flow, the open menu pushed the page down,
   and closing it pulled back up the control the browser had just scrolled into
   view for focus: off screen, or under the header. */
.mobile-nav-anchor {
  position: relative;
}

.mobile-nav-overlay {
  position: absolute;
  inset-inline: 0;
  /* The page is locked while the menu is open, so a menu taller than the rest
     of the viewport (a short phone, 200% zoom) scrolls by itself. */
  max-height: calc(100dvh - var(--header-offset) - 16px);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
