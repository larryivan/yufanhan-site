<script setup lang="ts">
const showSearch = ref(false)
</script>

<template>
  <div>
    <SiteHeader @open-search="showSearch = true" />
    <SearchModal :open="showSearch" @close="showSearch = false" />
    <main>
      <div class="container">
        <slot />
      </div>
    </main>
    <SiteFooter />
  </div>
</template>
