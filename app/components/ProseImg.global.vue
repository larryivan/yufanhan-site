<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ src?: string; alt?: string; width?: string | number; height?: string | number }>(),
  { src: '', alt: '', width: undefined, height: undefined }
)

/**
 * @nuxtjs/mdc's image, loaded lazily and decoded off the main thread: content
 * images sit below the cover, and fetching them eagerly competed with it on
 * every visit. width/height (from `{width=… height=…}` or an <img> tag) pass
 * through to reserve the space; `.prose img` keeps `height: auto`, so they set
 * the aspect ratio rather than a fixed height.
 */
const baseURL = useRuntimeConfig().app.baseURL.replace(/\/?$/, '/')

// Root-relative sources get the app base prepended, as the default component does.
const resolvedSrc = computed(() => {
  const { src } = props
  if (baseURL === '/' || !src.startsWith('/') || src.startsWith('//') || src.startsWith(baseURL)) return src
  return baseURL + src.slice(1)
})
</script>

<template>
  <img :src="resolvedSrc" :alt="alt" :width="width" :height="height" loading="lazy" decoding="async">
</template>
