<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'

type Post = {
  _path?: string
  title?: string
  description?: string
  date?: string
  section?: string
  cover?: string
}

const props = withDefaults(defineProps<{ post: Post; showSection?: boolean }>(), {
  showSection: false
})

const formattedDate = computed(() =>
  props.post.date ? dayjs(props.post.date).format('YYYY.MM.DD') : ''
)

const sectionLabel = computed(() => (props.post.section === 'life' ? 'Life' : 'Tech'))
const shouldShowSection = computed(() => props.showSection && !!props.post.section)
</script>

<template>
  <NuxtLink :to="post._path || '/'" class="post-card surface-card" :aria-label="`Read ${post.title || 'post'}`">
    <div v-if="post.cover" class="post-card-media">
      <img :src="post.cover" :alt="post.title || 'Post cover'" loading="lazy" />
    </div>

    <div class="post-card-body">
      <div class="post-card-meta">
        <span v-if="shouldShowSection" class="post-card-section">{{ sectionLabel }}</span>
        <time v-if="formattedDate">{{ formattedDate }}</time>
      </div>
      <h3 class="post-card-title">{{ post.title || 'Untitled' }}</h3>
      <p v-if="post.description" class="post-card-description">{{ post.description }}</p>

      <div class="post-card-footer">
        <span class="post-card-arrow">
          <AppIcon name="arrow-right" />
        </span>
      </div>
    </div>
  </NuxtLink>
</template>
