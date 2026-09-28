<script setup lang="ts">
/** The site's theme switch; the editor and its preview follow it. */
const { theme, toggle } = useTheme()
</script>

<template>
  <!-- Both glyphs render and CSS picks one from `data-theme`, as in the site header. -->
  <button
    class="icon-btn"
    type="button"
    aria-label="Dark theme"
    :aria-pressed="theme ? theme === 'dark' : undefined"
    @click="toggle"
  >
    <AppIcon name="moon" :size="18" class="theme-icon theme-icon--light" />
    <AppIcon name="sun" :size="18" class="theme-icon theme-icon--dark" />
  </button>
</template>
