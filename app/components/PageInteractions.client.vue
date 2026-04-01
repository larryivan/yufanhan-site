<script setup lang="ts">
import { commentCount, pageviewCount } from '@waline/client'
import { computed, onMounted } from 'vue'

const props = defineProps<{ path?: string }>()
const runtime = useRuntimeConfig()
const route = useRoute()
const targetPath = computed(() => props.path || route.path)

onMounted(() => {
  if (!runtime.public.walineServerURL) return
  const path = targetPath.value
  pageviewCount({ serverURL: runtime.public.walineServerURL, path, selector: '.waline-pageview-count' })
  commentCount({ serverURL: runtime.public.walineServerURL, path, selector: '.waline-comment-count' })
})
</script>

<template>
  <div class="article-stats">
    <span class="stat-pill">
      <AppIcon name="eye" />
      <span class="waline-pageview-count" :data-path="targetPath">--</span>
      浏览
    </span>
    <span class="stat-pill">
      <AppIcon name="message" />
      <span class="waline-comment-count" :data-path="targetPath">--</span>
      评论
    </span>
  </div>
</template>
