<script setup lang="ts">
const props = defineProps<{
  name:
    | 'search'
    | 'moon'
    | 'sun'
    | 'calendar'
    | 'clock'
    | 'eye'
    | 'message'
    | 'arrow-right'
    | 'chevron-left'
    | 'chevron-right'
    | 'github'
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
  calendar: [
    'M8.25 2.25v3',
    'M15.75 2.25v3',
    'M3 8.25h18',
    'M4.5 4.5h15A1.5 1.5 0 0 1 21 6v12.75a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.75V6A1.5 1.5 0 0 1 4.5 4.5Z'
  ],
  clock: [
    'M12 6.75v5.25l3.75 2.25',
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'
  ],
  eye: [
    'M2.46 12C3.73 7.94 7.52 5.25 12 5.25S20.27 7.94 21.54 12C20.27 16.06 16.48 18.75 12 18.75S3.73 16.06 2.46 12Z',
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'
  ],
  message: [
    'M7.5 8.25h9',
    'M7.5 12h6',
    'M5.25 4.5h13.5A2.25 2.25 0 0 1 21 6.75v8.14a2.25 2.25 0 0 1-2.25 2.25H9l-4.5 3.36v-3.36H5.25A2.25 2.25 0 0 1 3 14.89V6.75A2.25 2.25 0 0 1 5.25 4.5Z'
  ],
  'arrow-right': ['M5 12h14', 'm13-5 5 5-5 5'],
  'chevron-left': ['m14.25 18-6-6 6-6'],
  'chevron-right': ['m9.75 6 6 6-6 6'],
  github: ['M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22'],
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
