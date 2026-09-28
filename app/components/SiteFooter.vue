<script setup lang="ts">
import { onMounted } from 'vue'

// The server's year travels in the payload, so hydration matches the HTML even
// on a page prerendered last year; the current year replaces it once mounted.
const year = useState('footer-year', () => new Date().getFullYear())
const siteName = String(useRuntimeConfig().public.siteName)

onMounted(() => {
  year.value = new Date().getFullYear()
})

const socials = [
  { label: 'GitHub', href: 'https://github.com/larryivan', icon: 'github' as const },
  { label: 'X', href: 'https://x.com/larryivanhan', icon: 'twitter' as const },
  { label: 'Email', href: `mailto:${CONTACT_EMAIL}`, icon: 'mail' as const }
]
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-inner">
      <p class="footer-copy">© {{ year }} {{ siteName }}</p>

      <div class="footer-social">
        <a
          v-for="s in socials"
          :key="s.label"
          :href="s.href"
          class="footer-social-link"
          :aria-label="s.label"
          :target="s.href.startsWith('http') ? '_blank' : undefined"
          :rel="s.href.startsWith('http') ? 'noopener noreferrer' : undefined"
        >
          <AppIcon :name="s.icon" :size="18" />
        </a>
      </div>
    </div>
  </footer>
</template>
