<script setup lang="ts">
import { ref } from 'vue'

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

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy code:', err)
  }
}
</script>

<template>
  <div class="prose-pre-wrapper">
    <div class="prose-pre-header">
      <span class="prose-pre-lang">{{ filename || language || 'CODE' }}</span>
      <button 
        class="prose-pre-copy" 
        :class="{ 'is-copied': copied }" 
        @click="copyCode" 
        :aria-label="copied ? 'Copied' : 'Copy code'"
        :title="copied ? 'Copied!' : 'Copy code'"
      >
        <AppIcon :name="copied ? 'check' : 'copy'" />
      </button>
    </div>
    <pre :class="$props.class" :style="style"><slot /></pre>
  </div>
</template>

<style scoped>
.prose-pre-wrapper {
  position: relative;
  margin: 1.5em 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--line);
  background: var(--bg-elevated);
  overflow: hidden;
  box-shadow: inset 0 1px 0 var(--surface-highlight), 0 8px 24px -12px var(--surface-glow);
}

.prose-pre-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--line);
}

.prose-pre-lang {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  user-select: none;
}

.prose-pre-copy {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.prose-pre-copy:hover {
  background: var(--bg-elevated);
  color: var(--heading);
  border-color: var(--line);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.prose-pre-copy:active {
  transform: translateY(0);
}

.prose-pre-copy.is-copied {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
}

:root[data-theme='dark'] .prose-pre-copy.is-copied {
  color: #34d399;
}

pre {
  margin: 0;
  border: none;
  background: transparent;
  padding: 1.25rem 1.5rem;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.9em;
  line-height: 1.6;
}

.app-icon {
  width: 14px;
  height: 14px;
}
</style>