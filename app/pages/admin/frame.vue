<script setup lang="ts">
import type { PreviewPost } from '#shared/admin'

/**
 * The editor's preview, inside an iframe: the article as the site renders it,
 * with the site's own stylesheet, at the width of the frame (so the phone view
 * is the real phone layout), and a theme of its own. The editor posts the
 * rendered post in; nothing here navigates away.
 */

definePageMeta({ layout: false })
useHead({ title: 'Preview', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const post = shallowRef<PreviewPost | null>(null)
let media: Record<string, string> = {}

/** Where the preview loads a post's file from: uploads not saved yet, or the repository. */
const resolve = (url: string) => {
  const bare = url.split(/[?#]/)[0]!
  if (media[bare]) return media[bare]
  if (/^\/(?:images|files)\//.test(bare)) return `/api/admin/file?path=${encodeURIComponent(`public${decodeURI(bare)}`)}`
  return url
}

const withMedia = (node: unknown): unknown => {
  if (!Array.isArray(node)) return node
  const [tag, props, ...children] = node as [string, Record<string, unknown> | undefined, ...unknown[]]
  const next = props && typeof props.src === 'string' ? { ...props, src: resolve(props.src) } : props
  return [tag, next, ...children.map(withMedia)]
}

const onMessage = (event: MessageEvent) => {
  if (event.origin !== location.origin || event.source !== window.parent) return
  const data = event.data as { type?: string, post?: PreviewPost, media?: Record<string, string>, theme?: string }
  if (data.type === 'render' && data.post) {
    media = data.media ?? {}
    const doc = data.post
    post.value = {
      ...doc,
      cover: doc.cover ? resolve(doc.cover) : undefined,
      body: { ...doc.body, value: doc.body.value.map(withMedia) }
    }
  } else if (data.type === 'theme' && (data.theme === 'light' || data.theme === 'dark')) {
    document.documentElement.dataset.theme = data.theme
    document.documentElement.classList.toggle('dark', data.theme === 'dark')
  }
}

/** Links go nowhere inside the frame: pages of the site would replace the preview. */
const onClick = (event: MouseEvent) => {
  const link = (event.target as Element | null)?.closest?.('a')
  if (!link) return
  const href = link.getAttribute('href') ?? ''
  // Headings and footnotes, on this page.
  if (href.startsWith('#')) return
  event.preventDefault()
  if (/^https?:\/\//.test(href)) window.open(href, '_blank', 'noopener')
  else if (/^\/(?:images|files)\//.test(href)) window.open(resolve(href), '_blank', 'noopener')
}

onMounted(() => {
  // No entrance motion: the preview re-renders as the post is typed.
  document.documentElement.classList.remove('is-first-load')
  window.addEventListener('message', onMessage)
  document.addEventListener('click', onClick, true)
  window.parent.postMessage({ type: 'frame-ready' }, location.origin)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  document.removeEventListener('click', onClick, true)
})
</script>

<template>
  <main class="preview-main">
    <div class="container">
      <PostArticleView v-if="post" :post="post" />
    </div>
  </main>
</template>

<style scoped>
.preview-main {
  padding: 40px 0 var(--stack-section);
}

@media (max-width: 640px) {
  .preview-main {
    padding-top: 24px;
  }
}
</style>
