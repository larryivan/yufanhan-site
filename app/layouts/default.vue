<script setup lang="ts">
const showSearch = ref(false)
</script>

<template>
  <div class="site-shell">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <SiteHeader @open-search="showSearch = true" />
    <SearchModal :open="showSearch" @close="showSearch = false" />
    <!-- Focusable so the skip link moves focus here, not just the scroll
         position: the next Tab then starts inside the content. -->
    <main id="main-content" class="site-main" tabindex="-1">
      <div class="container">
        <slot />
      </div>
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
/* The first Tab stop on every page, out of sight until it has focus. Fixed, so
   focusing it from further down never scrolls the page. */
.skip-link {
  position: fixed;
  top: 12px;
  left: 16px;
  z-index: calc(var(--z-header) + 1);
  padding: 10px 18px;
  border-radius: 999px;
  background: var(--heading);
  color: var(--bg);
  font-size: var(--text-sm);
  font-weight: 600;
  transform: translateY(calc(-100% - 24px));
}

/* The shadow only while shown: off screen it still reached into the top of the
   page, and printed there as a grey smudge. */
.skip-link:focus {
  transform: none;
  box-shadow: var(--elev-1);
}

/* A skip-link target, not a control: no focus ring around the whole page. */
.site-main:focus {
  outline: none;
}
</style>
