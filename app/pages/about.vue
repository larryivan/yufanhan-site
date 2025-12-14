<script setup lang="ts">
const { data: about } = await useAsyncData('about', () => queryContent('/about').findOne())

if (!about.value) {
  throw createError({ statusCode: 404, statusMessage: 'About page missing' })
}

useHead({ title: 'About' })
</script>

<template>
  <section class="hero-card" style="margin: 10px 0 18px;">
    <p class="badge">About</p>
    <h1 style="margin: 6px 0 6px;">关于本站</h1>
    <p style="margin: 0; color: var(--muted);">创作理念、联系方式与技术栈。</p>
  </section>

  <article class="prose">
    <ContentRenderer :value="about" />
  </article>
</template>
