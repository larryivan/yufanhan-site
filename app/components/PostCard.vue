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
    <div v-if="post.cover" class="post-card-cover">
      <img :src="post.cover" :alt="post.title" loading="lazy" />
    </div>
    <div class="post-card-content">
      <div class="post-card-head">
        <span class="post-card-section">{{ sectionLabel }}</span>
        <div class="post-card-meta">
          <span v-if="formattedDate">{{ formattedDate }}</span>
          <span v-if="post.readingTime" class="meta-dot">·</span>
          <span v-if="post.readingTime">{{ post.readingTime }}m read</span>
        </div>
      </div>
      <h3 class="post-card-title">{{ post.title }}</h3>
      <p v-if="post.description" class="post-card-description">{{ post.description }}</p>
      
      <div class="post-card-footer">
        <div class="post-card-tags" v-if="post.tags?.length">
          <span v-for="tag in post.tags" :key="tag" class="post-card-tag">{{ tag }}</span>
        </div>
        <span v-else class="post-card-tags"><span class="post-card-tag">General</span></span>
        
        <span class="post-card-arrow" aria-hidden="true">
          <AppIcon name="arrow-right" />
        </span>
      </div>
    </div>
    <div class="post-card-glow"></div>
  </NuxtLink>
</template>
