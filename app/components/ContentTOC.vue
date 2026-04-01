<script setup lang="ts">
interface TocLink {
  id: string
  text: string
  children?: TocLink[]
}

const props = defineProps<{ links?: TocLink[] }>()
</script>

<template>
  <nav v-if="props.links?.length" class="toc-card" aria-label="文章目录">
    <div class="toc-header">
      <p class="toc-kicker">Protocol Map</p>
      <h3>目录导航</h3>
    </div>
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
