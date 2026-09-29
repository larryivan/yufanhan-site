<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

/**
 * Records "Read to end" once per view of a post (not again when the reader
 * comes back from signing in to comment, which continues the same view; see
 * app/plugins/analytics.client.ts): when the end of the text has
 * been on screen and the reader has spent a quarter of the post's reading time
 * on the page (15 to 90 s, counting only while the tab is visible). A reader
 * who scrolls straight to the bottom, or a short post that fits on one screen
 * and is left at once, does not count.
 */
const props = withDefaults(defineProps<{ targetSelector?: string, readingMinutes?: number }>(), {
  targetSelector: '#reading-article-content',
  readingMinutes: 1
})

const { $track } = useNuxtApp()

const needed = Math.min(90, Math.max(15, props.readingMinutes * 60 * 0.25)) * 1000

let visibleMs = 0
let visibleSince: number | null = null
let endSeen = false
let done = false
let frame = 0
let timer: ReturnType<typeof setTimeout> | undefined

const engaged = () => visibleMs + (visibleSince === null ? 0 : performance.now() - visibleSince)

const stop = () => {
  done = true
  cancelAnimationFrame(frame)
  clearTimeout(timer)
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  document.removeEventListener('visibilitychange', onVisibility)
}

const check = () => {
  if (done) return
  const target = document.querySelector<HTMLElement>(props.targetSelector)
  if (target && target.getBoundingClientRect().bottom <= window.innerHeight) endSeen = true
  if (!endSeen || visibleSince === null) return
  const remaining = needed - engaged()
  if (remaining > 0) {
    clearTimeout(timer)
    timer = setTimeout(check, remaining + 50)
    return
  }
  stop()
  $track?.(ANALYTICS_EVENTS.readToEnd)
}

function schedule() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(check)
}

function onVisibility() {
  if (document.visibilityState === 'visible') {
    visibleSince ??= performance.now()
    check()
  } else if (visibleSince !== null) {
    visibleMs += performance.now() - visibleSince
    visibleSince = null
    clearTimeout(timer)
  }
}

onMounted(() => {
  if (document.visibilityState === 'visible') visibleSince = performance.now()
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  schedule()
})

onUnmounted(stop)
</script>

<template>
  <span hidden />
</template>
