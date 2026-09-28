<script setup lang="ts">
import type { AdminIconName } from './AdminIcon.vue'
import { CALLOUTS } from '~/utils/admin/editing'

/**
 * The writing tools: the five used all the time, and an Insert menu for the
 * rest. Undo and redo only show on touch screens; a keyboard has them.
 */

export type ToolbarCommand =
  | 'bold'
  | 'italic'
  | 'link'
  | 'heading'
  | 'quote'
  | 'list'
  | 'code'
  | 'math-inline'
  | 'math-display'
  | 'table'
  | 'footnote'
  | 'image'
  | 'attach'
  | 'undo'
  | 'redo'
  | `callout-${(typeof CALLOUTS)[number]}`

const emit = defineEmits<{ command: [command: ToolbarCommand] }>()

const mod = import.meta.client && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+'

const main: { command: ToolbarCommand, icon: AdminIconName, label: string }[] = [
  { command: 'heading', icon: 'heading', label: 'Heading' },
  { command: 'bold', icon: 'bold', label: `Bold (${mod}B)` },
  { command: 'italic', icon: 'italic', label: `Italic (${mod}I)` },
  { command: 'link', icon: 'link', label: `Link (${mod}K)` },
  { command: 'image', icon: 'image', label: 'Image' }
]

const inserts: { command: ToolbarCommand, icon: AdminIconName, label: string, hint?: string }[] = [
  { command: 'math-inline', icon: 'math', label: 'Formula', hint: '$x$' },
  { command: 'math-display', icon: 'math', label: 'Display formula', hint: '$$' },
  { command: 'footnote', icon: 'footnote', label: 'Footnote', hint: '[^1]' },
  { command: 'table', icon: 'table', label: 'Table' },
  { command: 'code', icon: 'code', label: 'Code', hint: '```' },
  { command: 'quote', icon: 'quote', label: 'Quote', hint: '>' },
  { command: 'list', icon: 'list', label: 'List', hint: '-' },
  { command: 'attach', icon: 'attach', label: 'File' }
]

const CALLOUT_LABELS: Record<(typeof CALLOUTS)[number], string> = {
  NOTE: 'Note',
  TIP: 'Tip',
  IMPORTANT: 'Important',
  WARNING: 'Warning',
  CAUTION: 'Caution'
}
</script>

<template>
  <div class="editor-toolbar" role="toolbar" aria-label="Formatting">
    <button
      v-for="item in main"
      :key="item.command"
      type="button"
      class="toolbar-btn"
      :aria-label="item.label"
      :title="item.label"
      @mousedown.prevent
      @click="emit('command', item.command)"
    >
      <AdminIcon :name="item.icon" />
    </button>

    <AdminMenu label="Insert" align="left" button-class="toolbar-btn toolbar-insert">
      <template #button><AdminIcon name="plus" /></template>
      <button v-for="item in inserts" :key="item.command" type="button" role="menuitem" @click="emit('command', item.command)">
        <AdminIcon :name="item.icon" :size="16" />
        {{ item.label }}
        <kbd v-if="item.hint">{{ item.hint }}</kbd>
      </button>
      <hr>
      <div class="admin-menu-label">Callout</div>
      <div class="menu-callouts">
        <button
          v-for="type in CALLOUTS"
          :key="type"
          type="button"
          role="menuitem"
          :class="`menu-callout menu-callout--${type.toLowerCase()}`"
          @click="emit('command', `callout-${type}`)"
        >
          {{ CALLOUT_LABELS[type] }}
        </button>
      </div>
    </AdminMenu>

    <span class="toolbar-grow" />
    <span class="toolbar-touch">
      <button type="button" class="toolbar-btn" aria-label="Undo" title="Undo" @mousedown.prevent @click="emit('command', 'undo')">
        <AdminIcon name="undo" />
      </button>
      <button type="button" class="toolbar-btn" aria-label="Redo" title="Redo" @mousedown.prevent @click="emit('command', 'redo')">
        <AdminIcon name="redo" />
      </button>
    </span>
  </div>
</template>
