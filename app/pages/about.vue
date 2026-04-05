<script setup lang="ts">
const { data: about } = await useAsyncData('about', () => queryContent('/about').findOne())

if (!about.value) {
  throw createError({ statusCode: 404, statusMessage: 'About page missing' })
}

useHead({ title: 'About' })
</script>

<template>
  <section class="page-header animate-rise">
    <div>
      <p class="eyebrow">About</p>
      <h1 class="page-title">About</h1>
      <p class="page-description">A short note about the site and what it is for.</p>
    </div>
  </section>

  <article class="prose article-sheet surface-card animate-rise delay-1">
    <ContentRenderer :value="about" />
  </article>
</template>
