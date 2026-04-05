<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{ targetSelector?: string }>(), {
  targetSelector: '#reading-article-content'
})

const progress = ref(0)
const isVisible = ref(false)

let frame = 0

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const updateProgress = () => {
  if (!import.meta.client) return

  const target = document.querySelector<HTMLElement>(props.targetSelector)
  const scrollY = window.scrollY || window.pageYOffset

  isVisible.value = scrollY > 120

  if (!target) {
    progress.value = 0
    return
  }

  const rect = target.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const articleTop = scrollY + rect.top
  const articleHeight = Math.max(target.scrollHeight, rect.height)
  const start = articleTop - 120
  const end = Math.max(start + 1, articleTop + articleHeight - viewportHeight * 0.45)
  const nextProgress = ((scrollY - start) / (end - start)) * 100

  progress.value = Math.round(clamp(nextProgress, 0, 100))
}

const scheduleUpdate = () => {
  cancelAnimationFrame(frame)
  frame = window.requestAnimationFrame(updateProgress)
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

watch(() => props.targetSelector, scheduleUpdate)

onMounted(() => {
  updateProgress()
  window.addEventListener('scroll', scheduleUpdate, { passive: true })
  window.addEventListener('resize', scheduleUpdate)
})

onUnmounted(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('scroll', scheduleUpdate)
  window.removeEventListener('resize', scheduleUpdate)
})
</script>

<template>
  <div class="reading-progress" :class="{ 'is-visible': isVisible }">
    <button
      class="reading-progress-orb"
      type="button"
      :style="{ '--progress': progress }"
      :aria-label="`Back to top. ${progress}% read.`"
      :title="`${progress}% read · Back to top`"
      @click="scrollToTop"
    >
      <span class="reading-progress-value">{{ progress }}%</span>
      <span class="reading-progress-top" aria-hidden="true">
        <AppIcon name="chevron-right" style="transform: rotate(-90deg)" />
      </span>
    </button>
  </div>
</template>
