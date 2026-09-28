<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

// Markdown attributes belong on the table, as with the default component.
defineOptions({ inheritAttrs: false })

/**
 * A table wider than the column scrolls inside its own box instead of making
 * the whole page pan sideways. Only while it actually overflows is the box a
 * labelled, focusable region, so keyboard users can scroll it too (Safari does
 * not make scroll containers focusable) without every narrow table adding a
 * tab stop.
 */
const wrapperRef = useTemplateRef<HTMLDivElement>('wrapperRef')
const scrollable = ref(false)

let observer: ResizeObserver | undefined

const measure = () => {
  const wrapper = wrapperRef.value
  scrollable.value = !!wrapper && wrapper.scrollWidth > wrapper.clientWidth + 1
}

onMounted(() => {
  const wrapper = wrapperRef.value
  if (!wrapper) return
  measure()
  observer = new ResizeObserver(measure)
  observer.observe(wrapper)
  if (wrapper.firstElementChild) observer.observe(wrapper.firstElementChild)
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <div
    ref="wrapperRef"
    class="prose-table-wrapper"
    :role="scrollable ? 'region' : undefined"
    :aria-label="scrollable ? 'Table, scrolls horizontally' : undefined"
    :tabindex="scrollable ? 0 : undefined"
  >
    <table v-bind="$attrs"><slot /></table>
  </div>
</template>
