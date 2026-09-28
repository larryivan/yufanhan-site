<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const siteName = String(useRuntimeConfig().public.siteName)

const status = computed(() => props.error.status ?? 500)
const isNotFound = computed(() => status.value === 404)
const title = computed(() => (isNotFound.value ? 'Page not found' : 'Something went wrong'))
const message = computed(() =>
  isNotFound.value
    ? 'The address may be mistyped, or the post may have moved. Try one of these, or search from the header.'
    : 'This page could not be loaded. Try again in a moment, or head somewhere else.'
)

// The error page replaces app.vue, and with it app.vue's title template.
useHead({
  titleTemplate: (value?: string) => siteTitle(value, siteName)
})
useSeo(() => ({ title: title.value, noindex: true }))
</script>

<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <section class="error-page">
      <p class="eyebrow">Error {{ status }}</p>
      <h1 class="error-title">{{ title }}</h1>
      <p class="error-message">{{ message }}</p>
      <!-- Plain NuxtLinks, like the header's: Nuxt's router clears the error after any navigation. -->
      <nav class="error-links" aria-label="Suggested pages">
        <NuxtLink v-for="link in SITE_NAV" :key="link.to" :to="link.to" class="text-link">
          {{ link.label }}
          <AppIcon name="arrow-right" />
        </NuxtLink>
      </nav>
    </section>
  </NuxtLayout>
</template>

<style scoped>
.error-page {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--stack-tight);
  max-width: var(--measure);
}

.error-title {
  font-family: var(--font-display);
  font-size: var(--text-display-2);
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.04;
  color: var(--heading);
  text-wrap: balance;
}

.error-message {
  font-size: var(--text-md);
  line-height: 1.55;
  color: var(--muted);
}

.error-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;
  /* An onward step, not more copy: the group break, less the tight gap already given. */
  margin-top: calc(var(--stack-group) - var(--stack-tight));
}

/* At phone sizes the display face turns thin at 400. */
@media (max-width: 640px) {
  .error-title {
    font-weight: 500;
  }
}
</style>
