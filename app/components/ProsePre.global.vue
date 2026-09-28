<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  code: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: null
  },
  filename: {
    type: String,
    default: null
  },
  highlights: {
    type: Array as () => number[],
    default: () => []
  },
  meta: {
    type: String,
    default: null
  },
  class: {
    type: String,
    default: null
  },
  style: {
    type: [String, Object],
    default: null
  }
})

const copied = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    // A second click restarts the 2s window instead of cutting it short.
    clearTimeout(resetTimer)
    resetTimer = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy code:', err)
  }
}

onBeforeUnmount(() => clearTimeout(resetTimer))
</script>

<template>
  <div class="prose-pre-wrapper">
    <div class="prose-pre-header">
      <span class="prose-pre-lang" :class="{ 'is-file': filename }">{{ filename || language || 'CODE' }}</span>
      <button
        type="button"
        class="prose-pre-copy"
        :class="{ 'is-copied': copied }"
        aria-label="Copy code"
        :title="copied ? 'Copied!' : 'Copy code'"
        @click="copyCode"
      >
        <AppIcon :name="copied ? 'check' : 'copy'" />
      </button>
      <!-- A changed aria-label on the focused button is not reliably announced. -->
      <span class="prose-pre-status" role="status">{{ copied ? 'Copied to clipboard' : '' }}</span>
    </div>
    <pre :class="$props.class" :style="style"><slot /></pre>
  </div>
</template>

<style scoped>
/* No overflow clip: the header is transparent and the pre rounds its own
   corners, so nothing needs clipping, and the copy button's focus ring and
   touch-size box reach past the header's edge. */
.prose-pre-wrapper {
  position: relative;
  margin: 1.3em 0;
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  background:
    linear-gradient(180deg, var(--surface-sheen) 0, transparent 40%),
    var(--glass-strong);
  box-shadow:
    inset 0 1px 0 var(--surface-highlight),
    0 0 0 1px var(--line-soft),
    var(--elev-1);
}

/* The label starts on the code's left edge (the pre's inline padding). */
.prose-pre-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 34px;
  padding: 0 5px 0 var(--code-pad);
  border-bottom: 1px solid var(--line-soft);
}

.prose-pre-lang {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--muted);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  /* A long file name wraps instead of pushing the button out of the block. */
  overflow-wrap: anywhere;
  user-select: none;
}

.prose-pre-copy {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  color: var(--muted);
  cursor: pointer;
}

@media (hover: hover) {
  .prose-pre-copy:hover {
    color: var(--heading);
    background: var(--wash);
  }
}

/* A file name keeps its case: SIMULATE.PY is not the file. */
.prose-pre-lang.is-file {
  letter-spacing: 0;
  text-transform: none;
}

/* The check is the only visual confirmation: #10b981 measured 2.5:1 on the
   block, under the 3:1 non-text minimum. This is 5.4:1. */
.prose-pre-copy.is-copied {
  color: #047857;
}

:root[data-theme='dark'] .prose-pre-copy.is-copied {
  color: #34d399;
}

.prose-pre-status {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* The bottom corners follow the wrapper's, so the focus ring below does too. */
pre {
  margin: 0;
  border: none;
  border-radius: 0 0 calc(var(--radius-sm) - 1px) calc(var(--radius-sm) - 1px);
  background: transparent;
  padding: 10px var(--code-pad) 12px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: var(--code-size);
  line-height: var(--code-leading);
}

/* A block wider than the column is a focusable scroller. Its ring is drawn
   inside, along those corners, rather than over the header and the border. */
pre:focus-visible {
  outline-offset: -2px;
}

.app-icon {
  width: 14px;
  height: 14px;
}

/* A 44px target without a taller header: the extra size spills evenly over
   the header's padding and hairlines. */
@media (pointer: coarse) {
  .prose-pre-copy {
    width: 44px;
    height: 44px;
    margin: -5px -4px;
  }
}
</style>
