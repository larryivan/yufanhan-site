<script setup lang="ts">
import { computed } from 'vue'

type IconName =
  | 'search'
  | 'moon'
  | 'sun'
  | 'arrow-right'
  | 'arrow-left'
  | 'arrow-up'
  | 'chevron-left'
  | 'chevron-right'
  | 'menu'
  | 'x'
  | 'copy'
  | 'check'
  | 'github'
  | 'twitter'
  | 'mail'

const props = withDefaults(
  defineProps<{
    name: IconName
    size?: number | string
    strokeWidth?: number
  }>(),
  {
    size: 16,
    strokeWidth: 1.75
  }
)

const paths: Record<IconName, string[]> = {
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
  // Each entry renders as its own <path>, so every subpath must be absolute —
  // a relative `m` here starts from (0,0), not from the end of the shaft.
  'arrow-right': ['M5 12h14', 'M12 5l7 7-7 7'],
  'arrow-left': ['M19 12H5', 'M12 5l-7 7 7 7'],
  'arrow-up': ['M12 19V5', 'M5 12l7-7 7 7'],
  'chevron-left': ['m14.25 18-6-6 6-6'],
  'chevron-right': ['m9.75 6 6 6-6 6'],
  menu: ['M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5'],
  x: ['M6 18 18 6M6 6l12 12'],
  copy: [
    'M8 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z',
    'M16 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2'
  ],
  check: ['M20 6 9 17l-5-5'],
  github: ['M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z'],
  twitter: ['M18.244 2.25h3.308l-7.227 7.689 8.502 11.25H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.235L1.248 2.25h6.834l4.66 6.132 5.503-6.132zm-1.16 17.52h1.833L7.084 4.126H5.117L17.084 19.77z'],
  mail: ['M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75']
}

const filledIcons = new Set<IconName>(['github', 'twitter'])
const isFilled = computed(() => filledIcons.has(props.name))
</script>

<template>
  <svg
    class="app-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="isFilled ? 'currentColor' : 'none'"
    :stroke="isFilled ? 'none' : 'currentColor'"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="path in paths[name]" :key="path" :d="path" />
  </svg>
</template>
