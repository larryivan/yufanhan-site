<script setup lang="ts">
const { data: about } = await useAsyncData('about:page', () =>
  queryCollection('pages').path('/about').first()
)

if (!about.value) {
  // Fatal only in the browser, where it swaps in the full-screen error page. The
  // server renders that page anyway, and would log a fatal error with a stack.
  throw createError({ statusCode: 404, statusMessage: 'About page missing', fatal: import.meta.client })
}

useSeo(() => ({
  title: about.value?.title,
  description: about.value?.description,
  path: '/about'
}))
</script>

<!-- A greeting and a few paragraphs from content/about.md; nothing else. -->
<template>
  <div class="about-page animate-rise">
    <h1 class="about-title">Hi, I'm Yufan.</h1>

    <article class="about-content prose">
      <ContentRenderer v-if="about" :value="about" />
    </article>
  </div>
</template>

<style scoped>
.about-title {
  max-width: var(--measure);
  font-family: var(--font-display);
  font-size: var(--text-display-2);
  font-weight: 400;
  line-height: 1.04;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

.about-content {
  margin-top: var(--stack-group);
}

/* At phone sizes the display face turns thin at 400. */
@media (max-width: 640px) {
  .about-title {
    font-weight: 500;
  }
}
</style>
