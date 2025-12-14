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
  props.post.date ? dayjs(props.post.date).format('YYYY/MM/DD') : ''
)
</script>

<template>
  <NuxtLink :to="post._path" class="card" aria-label="Read post">
    <div class="meta" style="justify-content: space-between;">
      <span class="badge">{{ post.section ?? 'Blog' }}</span>
      <span v-if="formattedDate">📅 {{ formattedDate }}</span>
      <span v-if="post.readingTime">⏱️ {{ post.readingTime }} min</span>
    </div>
    <h3>{{ post.title }}</h3>
    <p>{{ post.description }}</p>
    <div class="meta">
      <span
        v-for="tag in post.tags || []"
        :key="tag"
        class="tag"
      >
        # {{ tag }}
      </span>
    </div>
  </NuxtLink>
</template>
