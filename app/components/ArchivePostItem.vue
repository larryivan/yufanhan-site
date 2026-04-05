<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'

type Post = {
  _path?: string
  title?: string
  description?: string
  date?: string
  cover?: string
}

const props = defineProps<{ post: Post }>()

const formattedDate = computed(() =>
  props.post.date ? dayjs(props.post.date).format('YYYY.MM.DD') : ''
)
</script>

<template>
  <NuxtLink :to="post._path || '/'" class="archive-post-item" :aria-label="`Read ${post.title || 'post'}`">
    <div class="archive-post-main">
      <div class="archive-post-topline">
        <time v-if="formattedDate">{{ formattedDate }}</time>
      </div>

      <h2 class="archive-post-title">{{ post.title || 'Untitled' }}</h2>

      <p v-if="post.description" class="archive-post-description">
        {{ post.description }}
      </p>
    </div>

    <div class="archive-post-side">
      <div v-if="post.cover" class="archive-post-thumb">
        <img :src="post.cover" :alt="post.title || 'Post cover'" loading="lazy" />
      </div>

      <span class="archive-post-arrow" aria-hidden="true">
        <AppIcon name="arrow-right" />
      </span>
    </div>
  </NuxtLink>
</template>
