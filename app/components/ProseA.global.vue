<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ href?: string; target?: string | null }>(), {
  href: '',
  target: null
})

/**
 * Markdown links to files under `public/` (`/files/notes.txt`) are not app
 * routes, but NuxtLink hands them to vue-router anyway — which logs
 * "No match found for location" and swallows the navigation. Anything that
 * isn't an in-app route renders as a plain anchor instead.
 */
const isExternal = computed(() => /^(https?:)?\/\/|^(mailto|tel):/.test(props.href))
const isAsset = computed(() => /^\/[^?#]*\.[a-z0-9]{2,8}($|[?#])/i.test(props.href))
const isPlainAnchor = computed(() => isExternal.value || isAsset.value)

const rel = computed(() => (isExternal.value ? 'noopener noreferrer' : undefined))
const resolvedTarget = computed(() => props.target ?? (isExternal.value ? '_blank' : undefined))
</script>

<template>
  <a v-if="isPlainAnchor" :href="href" :target="resolvedTarget" :rel="rel">
    <slot />
  </a>
  <NuxtLink v-else :to="href" :target="target || undefined">
    <slot />
  </NuxtLink>
</template>
