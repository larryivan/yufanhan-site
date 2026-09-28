<script setup lang="ts">
import type { PreviewPost } from '#shared/admin'

/**
 * Hosts the preview frame (pages/admin/frame.vue) and keeps it up to date: the
 * rendered post, where its unsaved files are, and the theme. Phone width renders
 * the frame 390px wide, so the article takes its real phone layout.
 */
const props = defineProps<{
  post: PreviewPost | null
  media: Record<string, string>
  device: 'wide' | 'phone'
  theme: 'light' | 'dark' | null
}>()

const frame = ref<HTMLIFrameElement | null>(null)
const ready = ref(false)

const send = (message: Record<string, unknown>) => frame.value?.contentWindow?.postMessage(message, location.origin)

// Plain copies: the post and file map may be reactive proxies, which can't be posted.
const render = () => {
  if (!ready.value || !props.post) return
  send({ type: 'render', post: JSON.parse(JSON.stringify(toRaw(props.post))), media: { ...toRaw(props.media) } })
}

const sendTheme = () => {
  if (ready.value && props.theme) send({ type: 'theme', theme: props.theme })
}

const onMessage = (event: MessageEvent) => {
  if (event.origin !== location.origin || event.source !== frame.value?.contentWindow) return
  if ((event.data as { type?: string })?.type !== 'frame-ready') return
  ready.value = true
  sendTheme()
  render()
}

watch(() => [props.post, props.media], render)
watch(() => props.theme, sendTheme)

onMounted(() => window.addEventListener('message', onMessage))
onBeforeUnmount(() => window.removeEventListener('message', onMessage))
</script>

<template>
  <div class="preview-stage" :class="`is-${device}`">
    <div class="preview-device">
      <iframe ref="frame" src="/admin/frame" title="Preview" class="preview-frame" />
      <div v-if="!ready || !post" class="preview-loading"><span class="admin-spinner" /></div>
    </div>
  </div>
</template>
