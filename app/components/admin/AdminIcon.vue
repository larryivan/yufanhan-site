<script setup lang="ts">
/** The editor's icons, drawn like AppIcon's: 24px grid, round 1.75 strokes. */

export type AdminIconName =
  | 'bold'
  | 'italic'
  | 'link'
  | 'heading'
  | 'quote'
  | 'list'
  | 'code'
  | 'math'
  | 'table'
  | 'callout'
  | 'footnote'
  | 'image'
  | 'attach'
  | 'undo'
  | 'redo'
  | 'eye'
  | 'pencil'
  | 'desktop'
  | 'phone'
  | 'external'
  | 'more'
  | 'trash'
  | 'plus'
  | 'alert'
  | 'logout'
  | 'chevron-down'
  | 'draft'
  | 'globe'
  | 'columns'

const props = withDefaults(defineProps<{ name: AdminIconName, size?: number | string }>(), { size: 18 })

const paths: Record<AdminIconName, string[]> = {
  bold: ['M7 5h5.5a3.5 3.5 0 0 1 0 7H7z', 'M7 12h6.5a3.5 3.5 0 0 1 0 7H7z'],
  italic: ['M11 5h7', 'M6 19h7', 'M14.5 5l-5 14'],
  link: [
    'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1',
    'M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1'
  ],
  heading: ['M6 5v14', 'M16 5v14', 'M6 12h10', 'M19.5 12.5l1.5-1v7.5'],
  quote: ['M5 6v12', 'M9.5 8H19', 'M9.5 12H19', 'M9.5 16H15'],
  list: ['M9.5 7H20', 'M9.5 12H20', 'M9.5 17H20', 'M4.75 7h.01', 'M4.75 12h.01', 'M4.75 17h.01'],
  code: ['M9 7.5 4.5 12 9 16.5', 'M15 7.5l4.5 4.5-4.5 4.5'],
  math: ['M17.5 6.5V5h-11l6 7-6 7h11v-1.5'],
  table: ['M4 5h16v14H4z', 'M4 10h16', 'M4 14.5h16', 'M10 5v14'],
  callout: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 8v5', 'M12 16.25h.01'],
  footnote: ['M4.5 9 10 17', 'M10 9l-5.5 8', 'M15.5 6.25 17.5 5v6', 'M15.5 11h4'],
  image: ['M4 5h16v14H4z', 'M4 16l5-5 4 4 2.5-2.5L20 17', 'M15.5 9h.01'],
  attach: [
    'M19.5 11.5l-7.8 7.8a4.95 4.95 0 0 1-7-7l8.1-8.1a3.3 3.3 0 0 1 4.67 4.67l-8.13 8.13a1.65 1.65 0 0 1-2.33-2.34L14.5 7'
  ],
  undo: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
  redo: ['M15 14l5-5-5-5', 'M20 9H9.5a5.5 5.5 0 0 0 0 11H13'],
  eye: ['M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  pencil: ['M4 20h4.5L19.25 9.25a2.12 2.12 0 0 0-3-3L5.5 17v3', 'M14.5 8l3 3'],
  desktop: ['M3.5 5h17v11h-17z', 'M8.5 20h7', 'M12 16v4'],
  phone: ['M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M11 18h2'],
  external: ['M14 4h6v6', 'M20 4l-8.5 8.5', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
  more: ['M5.5 12h.01', 'M12 12h.01', 'M18.5 12h.01'],
  trash: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12', 'M9 7V4h6v3'],
  plus: ['M12 5v14', 'M5 12h14'],
  alert: ['M12 4 21 20H3z', 'M12 10v4', 'M12 17h.01'],
  logout: ['M9.5 4H5v16h4.5', 'M14.5 8l4 4-4 4', 'M18.5 12H9'],
  'chevron-down': ['m6 9.5 6 6 6-6'],
  draft: ['M6 3.5h8l4 4v13H6z', 'M14 3.5v4h4', 'M9 12.5h6', 'M9 16h4'],
  columns: ['M3.5 5h17v14h-17z', 'M12 5v14'],
  globe: [
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    'M3.5 9h17',
    'M3.5 15h17',
    'M12 3a14 14 0 0 1 0 18',
    'M12 3a14 14 0 0 0 0 18'
  ]
}

/** Dots drawn as zero-length strokes need a heavier pen to show. */
const heavy = new Set<AdminIconName>(['more', 'list', 'callout', 'alert', 'image'])
</script>

<template>
  <svg
    class="admin-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="props.name === 'bold' ? 2.25 : 1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path
      v-for="(d, index) in paths[props.name]"
      :key="index"
      :d="d"
      :stroke-width="heavy.has(props.name) && d.endsWith('h.01') ? 2.75 : undefined"
    />
  </svg>
</template>
