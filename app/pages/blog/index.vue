<script setup lang="ts">
// The canonical is the unfiltered archive: ?tag= and ?page= views are not separate pages.
useSeo({
  title: 'Blog',
  description: 'Notes on code, methods, and genomes.',
  path: '/blog'
})
</script>

<template>
  <PostArchive
    section="blog"
    title="Blog"
    subtitle="Notes on code, methods, and genomes."
  />
</template>
