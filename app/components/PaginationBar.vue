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
    <button :disabled="page <= 1" @click="go(page - 1)">上一页</button>
    <span>第 {{ page }} / {{ totalPages }} 页</span>
    <button :disabled="page >= totalPages" @click="go(page + 1)">下一页</button>
  </div>
</template>
