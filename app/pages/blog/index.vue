<script setup lang="ts">
useHead({
  title: 'Blog',
  meta: [
    { name: 'description', content: 'Technical notes and frontend engineering write-ups.' }
  ]
})
</script>

<template>
  <PostArchive
    section="blog"
    title="Blog"
    subtitle="Technical notes & frontend engineering."
  />
</template>
