<script setup lang="ts">
interface TocLink {
  id: string
  text: string
  children?: TocLink[]
}

const props = defineProps<{ links?: TocLink[] }>()
</script>

<template>
  <div v-if="props.links?.length" class="toc">
    <strong>目录</strong>
    <ul>
      <li v-for="link in props.links" :key="link.id">
        <NuxtLink :to="`#${link.id}`">{{ link.text }}</NuxtLink>
        <ul v-if="link.children?.length">
          <li v-for="child in link.children" :key="child.id">
            <NuxtLink :to="`#${child.id}`">{{ child.text }}</NuxtLink>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>
