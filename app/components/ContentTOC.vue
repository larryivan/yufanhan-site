<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface TocLink {
  id: string
  text: string
  children?: TocLink[]
}

const props = defineProps<{ links?: TocLink[] }>()
const activeId = ref('')

let observer: IntersectionObserver | null = null

onMounted(() => {
  const headings = Array.from(document.querySelectorAll('.prose h2, .prose h3, .prose h4'))
  
  if (headings.length === 0) return

  observer = new IntersectionObserver((entries) => {
    const visibleEntries = entries.filter(e => e.isIntersecting)
    if (visibleEntries.length > 0) {
      visibleEntries.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      const firstEntry = visibleEntries[0]
      if (firstEntry) {
        activeId.value = firstEntry.target.id
      }
    }
  }, {
    rootMargin: '-80px 0px -60% 0px',
    threshold: 0
  })

  headings.forEach(heading => {
    observer?.observe(heading)
  })
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <nav v-if="props.links?.length" class="toc-container" aria-label="Table of contents">
    <div class="toc-track"></div>
    <ul class="toc-list">
      <li v-for="link in props.links" :key="link.id" class="toc-item">
        <NuxtLink class="toc-link" :class="{ 'is-active': activeId === link.id }" :to="`#${link.id}`">{{ link.text }}</NuxtLink>
        <ul v-if="link.children?.length" class="toc-children">
          <li v-for="child in link.children" :key="child.id">
            <NuxtLink class="toc-link toc-link--child" :class="{ 'is-active': activeId === child.id }" :to="`#${child.id}`">{{ child.text }}</NuxtLink>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>
