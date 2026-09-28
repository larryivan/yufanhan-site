<script setup lang="ts">
definePageMeta({
  // Runs before the navigation, while the card being opened still holds its
  // name (PostCard drops it once the route has changed), so PostArticle knows
  // whether its cover has a card cover to morph from.
  middleware: (to) => {
    to.meta.coverMorph = useState<string | null>('post-card:opening').value === to.path
  }
})
</script>

<template>
  <PostArticle section="blog" />
</template>
