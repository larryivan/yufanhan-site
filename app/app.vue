<script setup lang="ts">
const siteName = String(useRuntimeConfig().public.siteName)

// A function, not a '%s · Site' string: the home page has no title of its own
// and rendered as "Yufan Han · Yufan Han".
useHead({
  titleTemplate: (title?: string) => siteTitle(title, siteName)
})
</script>

<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </NuxtLayout>
</template>
