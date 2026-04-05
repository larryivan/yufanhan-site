<script setup lang="ts">
const year = new Date().getFullYear()

const links = [
  { to: '/', label: 'Home' },
  { to: '/blog', label: 'Blog' },
  { to: '/life', label: 'Life' },
  { to: '/about', label: 'About' }
]
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <p class="footer-kicker">LiH Blog</p>
        <p class="footer-copy">© {{ year }} LiH Blog. Notes on engineering, design, and everyday life.</p>
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
