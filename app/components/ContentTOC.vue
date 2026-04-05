<script setup lang="ts">
interface TocLink {
  id: string
  text: string
  children?: TocLink[]
}

const props = defineProps<{ links?: TocLink[] }>()
</script>

<template>
  <nav v-if="props.links?.length" class="toc-card" aria-label="Table of contents">
    <p class="toc-title">Contents</p>
    <ul class="toc-list">
      <li v-for="link in props.links" :key="link.id" class="toc-item">
        <NuxtLink class="toc-link" :to="`#${link.id}`">{{ link.text }}</NuxtLink>
        <ul v-if="link.children?.length" class="toc-children">
          <li v-for="child in link.children" :key="child.id">
            <NuxtLink class="toc-link toc-link--child" :to="`#${child.id}`">{{ child.text }}</NuxtLink>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>
