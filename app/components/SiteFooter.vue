<script setup lang="ts">
const year = new Date().getFullYear()

const links = [
  { to: '/', label: 'Home' },
  { to: '/blog', label: 'Blog' },
  { to: '/life', label: 'Life' },
  { to: '/about', label: 'About' }
]

const socials = [
  { label: 'GitHub', href: 'https://github.com/larryivanhan', icon: 'github' as const },
  { label: 'X', href: 'https://x.com/larryivanhan', icon: 'twitter' as const },
  { label: 'Email', href: 'mailto:larryivanhan@gmail.com', icon: 'mail' as const }
]
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <p class="footer-kicker">LiH Blog</p>
        <p class="footer-copy">© {{ year }} LiH Blog. Notes on engineering, design, and everyday life.</p>

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

      <nav class="footer-nav" aria-label="Footer navigation">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="footer-link"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </div>
  </footer>
</template>
