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
      <p class="page-kicker">System File</p>
      <h1 class="page-title">关于本站</h1>
    </div>
    <div class="page-header-side">
      <p class="page-description">创作理念、联系方式与技术栈。</p>
    </div>
  </section>

  <article class="prose prose--article animate-rise delay-1">
    <ContentRenderer :value="about" />
  </article>
</template>
