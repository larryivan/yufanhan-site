<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ page: number; pageSize: number; total: number }>()
const emit = defineEmits<{
  (e: 'update:page', value: number): void
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const go = (target: number) => {
  if (target < 1 || target > totalPages.value) return
  emit('update:page', target)
}
</script>

<template>
  <div class="pagination">
    <button class="pagination-btn" :disabled="page <= 1" @click="go(page - 1)">
      <AppIcon name="chevron-left" />
      Previous
    </button>
    <span class="pagination-status">Page {{ page }} / {{ totalPages }}</span>
    <button class="pagination-btn" :disabled="page >= totalPages" @click="go(page + 1)">
      Next
      <AppIcon name="chevron-right" />
    </button>
  </div>
</template>
