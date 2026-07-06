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
  tags?: string[]
}

const props = withDefaults(defineProps<{ post: Post; showSection?: boolean }>(), {
  showSection: false
})

const formattedDate = computed(() =>
  props.post.date ? dayjs(props.post.date).format('MMM D, YYYY') : ''
)

const sectionLabel = computed(() => {
  if (!props.post.section) return ''
  return props.post.section === 'life' ? 'Life' : 'Tech'
})

const shouldShowSection = computed(() => props.showSection && !!props.post.section)
</script>

<template>
  <NuxtLink v-reveal :to="post._path || '/'" class="post-card-item reveal" :aria-label="`Read ${post.title || 'post'}`">
    <div v-if="post.cover" class="post-card-cover">
      <img :src="post.cover" :alt="post.title || 'Post cover'" loading="lazy" />
    </div>
    
    <div class="post-card-content">
      <div class="post-card-meta">
        <time v-if="formattedDate">{{ formattedDate }}</time>
        <span v-if="shouldShowSection" class="post-card-tag">{{ sectionLabel }}</span>
        <span v-else-if="post.tags?.length" class="post-card-tag">#{{ post.tags[0] }}</span>
      </div>

      <h2 class="post-card-title">{{ post.title || 'Untitled' }}</h2>

      <p v-if="post.description" class="post-card-description">
        {{ post.description }}
      </p>
    </div>
  </NuxtLink>
</template>

<style scoped>
.post-card-item {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--radius-md);
  border: 1px solid var(--line);
  background:
    linear-gradient(180deg, var(--surface-sheen) 0, transparent 30%),
    var(--bg-elevated);
  box-shadow:
    inset 0 1px 0 var(--surface-highlight),
    var(--elev-1);
  transition:
    transform var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
  height: 100%;
}

.post-card-item:hover {
  transform: translateY(-4px);
  border-color: var(--line-strong);
  box-shadow:
    inset 0 1px 0 var(--surface-highlight),
    var(--elev-3);
}

.post-card-item:active {
  transform: translateY(-2px) scale(0.995);
}

.post-card-cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-bottom: 1px solid var(--line);
}

.post-card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.post-card-item:hover .post-card-cover img {
  transform: scale(1.05);
}

.post-card-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.post-card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.post-card-tag {
  color: var(--accent);
  font-weight: 500;
}

.post-card-title {
  font-family: var(--font-display);
  font-size: 1.32rem;
  line-height: 1.24;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--heading);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.post-card-description {
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--muted);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

@media (max-width: 640px) {
  .post-card-content {
    padding: 16px;
  }
  .post-card-title {
    font-size: 1.2rem;
  }
}
</style>