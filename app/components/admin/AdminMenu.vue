<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

/**
 * A button that opens a small menu. The menu is placed on the page itself, next
 * to the button: the bar and the toolbar clip what overflows them. It closes on
 * a choice, a click outside, scrolling, or Escape (which hands focus back).
 */
const props = withDefaults(defineProps<{ label: string, align?: 'left' | 'right', buttonClass?: string }>(), {
  align: 'right',
  buttonClass: 'icon-btn'
})

const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const position = ref({ top: 0, left: 0 })

const close = () => {
  open.value = false
}

const place = () => {
  const button = trigger.value?.getBoundingClientRect()
  if (!button) return
  const width = panel.value?.offsetWidth ?? 220
  const height = panel.value?.offsetHeight ?? 0
  const margin = 8
  let left = props.align === 'left' ? button.left : button.right - width
  left = Math.min(Math.max(margin, left), window.innerWidth - width - margin)
  let top = button.bottom + margin
  // Up when there is no room below.
  if (top + height > window.innerHeight - margin && button.top - margin - height > margin) top = button.top - margin - height
  position.value = { top, left }
}

const onPointer = (event: PointerEvent) => {
  const target = event.target as Node
  if (!trigger.value?.contains(target) && !panel.value?.contains(target)) close()
}

const onKey = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  close()
  trigger.value?.focus()
}

const listen = (on: boolean) => {
  if (on) {
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
  } else {
    document.removeEventListener('pointerdown', onPointer)
    document.removeEventListener('keydown', onKey)
    window.removeEventListener('resize', close)
    window.removeEventListener('scroll', close, true)
  }
}

watch(open, async (value) => {
  listen(value)
  if (!value) return
  await nextTick()
  place()
  panel.value?.querySelector<HTMLElement>('button, a')?.focus({ preventScroll: true })
})

onBeforeUnmount(() => listen(false))

defineExpose({
  show: () => {
    open.value = true
  },
  hide: close
})
</script>

<template>
  <div class="admin-menu-wrap">
    <button
      ref="trigger"
      type="button"
      :class="buttonClass"
      :aria-label="label"
      :title="label"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="open = !open"
    >
      <slot name="button" />
    </button>
    <Teleport to="body">
      <Transition name="admin-pop">
        <div
          v-if="open"
          ref="panel"
          class="admin-menu"
          role="menu"
          :aria-label="label"
          :style="{ top: `${position.top}px`, left: `${position.left}px` }"
          @click="close"
        >
          <slot />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
