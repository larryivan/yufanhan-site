<script setup lang="ts">
/**
 * Tags as chips. Enter or a comma adds what was typed; Backspace in the empty
 * field takes the last one off. The site's existing tags are offered as you type,
 * so the same tag is not spelled two ways.
 */
const props = defineProps<{ modelValue: string[], suggestions?: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [tags: string[]] }>()

const draft = ref('')
const listId = useId()

const add = (value: string) => {
  const tag = value.replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
  draft.value = ''
  if (!tag || props.modelValue.some((existing) => existing.toLowerCase() === tag.toLowerCase())) return
  emit('update:modelValue', [...props.modelValue, tag])
}

const remove = (index: number) => emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))

const onKeydown = (event: KeyboardEvent) => {
  if (event.isComposing) return
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    add(draft.value)
  } else if (event.key === 'Backspace' && !draft.value && props.modelValue.length) {
    remove(props.modelValue.length - 1)
  }
}

// A phone keyboard sends the comma as input, not as a key.
const onInput = () => {
  if (draft.value.includes(',')) add(draft.value)
}

const offered = computed(() => (props.suggestions ?? []).filter((tag) => !props.modelValue.includes(tag)))
</script>

<template>
  <div class="tag-input">
    <span v-for="(tag, index) in modelValue" :key="tag" class="tag-chip">
      {{ tag }}
      <button type="button" :aria-label="`Remove ${tag}`" @click="remove(index)"><AppIcon name="x" :size="12" /></button>
    </span>
    <input
      v-model="draft"
      type="text"
      :list="listId"
      placeholder="+ tag"
      aria-label="Add a tag"
      enterkeyhint="done"
      @keydown="onKeydown"
      @input="onInput"
      @blur="add(draft)"
    >
    <datalist :id="listId">
      <option v-for="tag in offered" :key="tag" :value="tag" />
    </datalist>
  </div>
</template>
