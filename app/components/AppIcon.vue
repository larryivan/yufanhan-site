<script setup lang="ts">
const props = defineProps<{
  name:
    | 'search'
    | 'moon'
    | 'sun'
    | 'arrow-right'
    | 'chevron-left'
    | 'chevron-right'
    | 'menu'
    | 'x'
}>()

const paths: Record<typeof props.name, string[]> = {
  search: ['M21 21l-4.35-4.35', 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z'],
  moon: ['M21 12.79A9 9 0 1 1 11.21 3c0 4.97 4.03 9 9 9.79Z'],
  sun: [
    'M12 3v2.25',
    'M12 18.75V21',
    'M4.22 4.22l1.59 1.59',
    'M18.19 18.19l1.59 1.59',
    'M3 12h2.25',
    'M18.75 12H21',
    'M4.22 19.78l1.59-1.59',
    'M18.19 5.81l1.59-1.59',
    'M12 16.5A4.5 4.5 0 1 0 12 7.5a4.5 4.5 0 0 0 0 9Z'
  ],
  'arrow-right': ['M5 12h14', 'm13-5 5 5-5 5'],
  'chevron-left': ['m14.25 18-6-6 6-6'],
  'chevron-right': ['m9.75 6 6 6-6 6'],
  menu: ['M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5'],
  x: ['M6 18 18 6M6 6l12 12']
}
</script>

<template>
  <svg
    class="app-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="path in paths[props.name]" :key="path" :d="path" />
  </svg>
</template>
