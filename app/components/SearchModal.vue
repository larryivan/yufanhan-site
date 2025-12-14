<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { computed, nextTick } from 'vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const router = useRouter()
const searchTerm = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const { data, pending, execute } = useLazyFetch('/api/search', {
  method: 'get',
  server: false,
  immediate: false,
  default: () => ({ items: [], total: 0 }),
  query: computed(() => ({ q: searchTerm.value.trim(), limit: 12 }))
})

const debouncedSearch = useDebounceFn(() => {
  if (!searchTerm.value.trim()) {
    data.value = { items: [], total: 0 }
    return
  }
  execute()
}, 240)

watch(searchTerm, () => {
  if (!props.open) return
  debouncedSearch()
})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      nextTick(() => inputRef.value?.focus())
      if (searchTerm.value.trim()) {
        debouncedSearch()
      }
    } else {
      searchTerm.value = ''
      data.value = { items: [], total: 0 }
    }
  }
)

const close = () => emit('close')
const goTo = (path: string) => {
  close()
  router.push(path)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="search-backdrop" @click.self="close">
      <div class="search-modal" role="dialog" aria-modal="true">
        <div class="search-header">
          <input
            ref="inputRef"
            v-model="searchTerm"
            type="search"
            placeholder="搜索文章标题、描述或标签"
          />
          <button class="btn" type="button" @click="close">关闭</button>
        </div>

        <div class="search-results">
          <p v-if="!searchTerm">输入关键词开始搜索</p>
          <p v-else-if="pending">正在搜索...</p>
          <p v-else-if="searchTerm && data?.items?.length === 0">没有结果</p>
          <div v-else class="grid">
            <button
              v-for="item in data?.items || []"
              :key="item.path"
              class="card"
              style="text-align: left;"
              type="button"
              @click="goTo(item.path)"
            >
              <div class="meta" style="justify-content: space-between;">
                <span class="badge">{{ item.section }}</span>
                <span v-if="item.date">📅 {{ item.date }}</span>
              </div>
              <h3 style="margin: 6px 0 6px;">{{ item.title }}</h3>
              <p style="margin: 0 0 8px;">{{ item.description }}</p>
              <div class="meta">
                <span v-for="tag in item.tags || []" :key="tag" class="tag"># {{ tag }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
