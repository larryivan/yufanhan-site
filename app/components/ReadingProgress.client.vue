<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'

const props = withDefaults(defineProps<{ targetSelector?: string }>(), {
  targetSelector: '#reading-article-content'
})

const rootRef = useTemplateRef<HTMLElement>('rootRef')
const progress = ref(0)
// Hidden, the button is also inert: out of the tab order and the accessibility tree.
const isVisible = ref(false)

let frame = 0

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const updateProgress = () => {
  if (!import.meta.client) return

  const target = document.querySelector<HTMLElement>(props.targetSelector)
  const scrollY = window.scrollY || window.pageYOffset

  isVisible.value = scrollY > 200

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

// An explicit behavior overrides any CSS scroll-behavior, so reduced motion
// has to be honoured here.
const scrollToTop = () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' })
  // The button fades out at the top. Focus left on it would be invisible, and
  // the next Tab would scroll back down to the footer, so the start of the
  // content (the skip link's target) takes it.
  rootRef.value?.closest('main')?.focus({ preventScroll: true })
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

// The track runs along the edge of the 44px button (the touch-target minimum),
// so button and ring read as one circle.
const radius = 21
const circumference = 2 * Math.PI * radius
</script>

<template>
  <div ref="rootRef" class="reading-progress" :class="{ 'is-visible': isVisible }" :inert="!isVisible">
    <button
      class="progress-ring-btn"
      type="button"
      :aria-label="`Back to top. ${progress}% read.`"
      :title="`${progress}% read · Back to top`"
      @click="scrollToTop"
    >
      <svg class="progress-ring-svg" width="44" height="44" viewBox="0 0 44 44">
        <circle
          class="progress-ring-bg"
          stroke="currentColor"
          stroke-width="2"
          fill="transparent"
          :r="radius"
          cx="22"
          cy="22"
        />
        <circle
          class="progress-ring-fill"
          stroke="currentColor"
          stroke-width="2"
          fill="transparent"
          :r="radius"
          cx="22"
          cy="22"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="circumference - (progress / 100) * circumference"
        />
      </svg>
      <AppIcon name="arrow-up" class="progress-ring-icon" />
    </button>
  </div>
</template>