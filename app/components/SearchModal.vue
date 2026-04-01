<script setup lang="ts">
import { useDebounceFn, useEventListener } from '@vueuse/core'
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

if (import.meta.client) {
  useEventListener(window, 'keydown', (event) => {
    if (props.open && event.key === 'Escape') {
      close()
    }
  })
}
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <div v-if="open" class="search-backdrop" @click.self="close">
        <div class="search-modal" role="dialog" aria-modal="true" aria-label="站内搜索">
          <div class="search-head">
            <h2>Search Nodes</h2>
            <button class="icon-btn" type="button" @click="close" aria-label="关闭搜索">
              <AppIcon name="chevron-right" style="transform: rotate(90deg)" />
            </button>
          </div>

          <label class="search-field">
            <AppIcon name="search" />
            <input
              ref="inputRef"
              v-model="searchTerm"
              type="search"
              placeholder="Search by title, description or tags..."
            />
          </label>

          <div class="search-results">
            <p v-if="!searchTerm" class="search-empty">输入关键词开始搜索</p>
            <p v-else-if="pending" class="search-empty">正在搜索...</p>
            <p v-else-if="searchTerm && data?.items?.length === 0" class="search-empty">没有结果</p>
            <div v-else class="search-grid">
              <button
                v-for="item in data?.items || []"
                :key="item.path"
                class="search-result"
                type="button"
                @click="goTo(item.path)"
              >
                <div class="result-topline">
                  <span>{{ item.section }}</span>
                  <span v-if="item.date">{{ item.date }}</span>
                </div>
                <h3>{{ item.title }}</h3>
                <p v-if="item.description">{{ item.description }}</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>
