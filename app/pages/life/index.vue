<script setup lang="ts">
// The canonical is the unfiltered archive: ?tag= and ?page= views are not separate pages.
useSeo({
  title: 'Life',
  description: 'Observations, travel notes, and daily routine.',
  path: '/life'
})
</script>

<template>
  <PostArchive
    section="life"
    title="Life"
    subtitle="Observations, travel & daily routine."
  />
</template>
