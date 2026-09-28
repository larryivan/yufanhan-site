<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

/** A modal over the editor. Escape and a click outside dismiss it, unless it is busy. */
const props = withDefaults(defineProps<{ open: boolean, title: string, wide?: boolean, busy?: boolean }>(), {
  wide: false,
  busy: false
})
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
let returnFocus: HTMLElement | null = null

const dismiss = () => {
  if (!props.busy) emit('close')
}

const onKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') dismiss()
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      returnFocus = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', onKey)
      await nextTick()
      // The first field, or else the last button (the dialog's main action).
      const field = panel.value?.querySelector<HTMLElement>('input, textarea, select')
      const buttons = panel.value?.querySelectorAll<HTMLElement>('.admin-dialog-actions button')
      ;(field ?? buttons?.[buttons.length - 1])?.focus()
    } else {
      document.removeEventListener('keydown', onKey)
      returnFocus?.focus?.()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="admin-fade">
      <div v-if="open" class="admin-dialog-backdrop" @pointerdown.self="dismiss">
        <div ref="panel" class="admin-dialog" :class="{ 'is-wide': wide }" role="dialog" aria-modal="true" :aria-label="title">
          <h2>{{ title }}</h2>
          <slot />
          <div class="admin-dialog-actions">
            <slot name="actions" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
