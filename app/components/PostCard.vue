<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'

type Post = {
  _path: string
  title: string
  description?: string
  date?: string
  tags?: string[]
  section?: string
  readingTime?: number
  cover?: string
}

const props = defineProps<{ post: Post }>()

const formattedDate = computed(() =>
  props.post.date ? dayjs(props.post.date).format('YYYY.MM.DD') : ''
)

const sectionLabel = computed(() => (props.post.section === 'life' ? 'Life' : 'Blog'))
</script>

<template>
  <NuxtLink :to="post._path" class="post-card" :aria-label="`阅读 ${post.title}`">
    <div class="post-card-head">
      <span class="post-card-section">{{ sectionLabel }}</span>
      <div class="post-card-meta">
        <span v-if="formattedDate">{{ formattedDate }}</span>
        <span v-if="post.readingTime" style="opacity: 0.5">·</span>
        <span v-if="post.readingTime">{{ post.readingTime }}m read</span>
      </div>
    </div>
    <h3 class="post-card-title">{{ post.title }}</h3>
    <p v-if="post.description" class="post-card-description">{{ post.description }}</p>
    <div class="post-card-footer">
      <p class="post-card-tags">{{ post.tags?.length ? post.tags.join(' / ') : 'General' }}</p>
      <span class="post-card-arrow" aria-hidden="true">
        <AppIcon name="arrow-right" />
      </span>
    </div>
  </NuxtLink>
</template>
