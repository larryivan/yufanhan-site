<script setup lang="ts">
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { computed, nextTick, onUnmounted } from 'vue'

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
      if (import.meta.client) {
        document.body.style.overflow = 'hidden'
      }
      nextTick(() => inputRef.value?.focus())
      if (searchTerm.value.trim()) {
        debouncedSearch()
      }
    } else {
      if (import.meta.client) {
        document.body.style.overflow = ''
      }
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

onUnmounted(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <div v-if="open" class="search-backdrop" @click.self="close">
        <div class="search-modal" role="dialog" aria-modal="true" aria-label="Site search">
          <div class="search-head">
            <div class="search-title-block">
              <h2>Search</h2>
            </div>

            <button class="icon-btn" type="button" @click="close" aria-label="Close search">
              <AppIcon name="chevron-right" style="transform: rotate(90deg)" />
            </button>
          </div>

          <label class="search-field">
            <AppIcon name="search" />
            <input
              ref="inputRef"
              v-model="searchTerm"
              type="search"
              placeholder="Search titles or tags"
            />
          </label>

          <div class="search-results">
            <p v-if="!searchTerm" class="search-empty">Start typing to search.</p>
            <p v-else-if="pending" class="search-empty">Searching...</p>
            <p v-else-if="searchTerm && data?.items?.length === 0" class="search-empty">No results.</p>
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
                <span class="result-arrow">
                  <AppIcon name="arrow-right" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>
