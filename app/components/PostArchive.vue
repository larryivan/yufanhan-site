<script setup lang="ts">
const props = defineProps<{
  section: 'blog' | 'life'
  title: string
  subtitle: string
}>()

const route = useRoute()
const router = useRouter()
const pageSize = 12

const { data: posts } = await useAsyncData(`${props.section}-list`, () =>
  queryContent(`/${props.section}`)
    .where({ draft: { $ne: true } })
    .sort({ date: -1 })
    .find()
)

const allTags = computed(() => {
  const tags = new Set<string>()
  const postList = posts.value as Array<{ tags?: string[] }> | undefined
  postList?.forEach((p) => p.tags?.forEach((t) => tags.add(t)))
  return Array.from(tags).sort()
})

const currentTag = computed(() => route.query.tag as string | undefined)
const page = computed(() => Math.max(1, parseInt((route.query.page as string) || '1', 10)))

const filtered = computed(() => {
  const tag = currentTag.value
  const all = posts.value || []
  const list = tag ? all.filter((item) => (item.tags || []).includes(tag)) : all
  const total = list.length
  const start = (page.value - 1) * pageSize
  return { total, items: list.slice(start, start + pageSize) }
})

const updatePage = (value: number) => {
  router.push({ query: { ...route.query, page: value } })
}

const toggleTag = (tag?: string) => {
  if (currentTag.value === tag) {
    router.push({ query: { ...route.query, tag: undefined, page: 1 } })
  } else {
    router.push({ query: { ...route.query, tag, page: 1 } })
  }
}
</script>

<template>
  <div class="post-archive">
    <header v-reveal class="archive-header reveal">
      <div class="archive-heading">
        <h1 class="archive-title">{{ title }}</h1>
        <p class="archive-subtitle">{{ subtitle }}</p>
      </div>

      <div class="tag-filter">
        <button
          class="tag-pill"
          :class="{ active: !currentTag }"
          @click="toggleTag(undefined)"
        >
          All
        </button>
        <button
          v-for="tag in allTags"
          :key="tag"
          class="tag-pill"
          :class="{ active: currentTag === tag }"
          @click="toggleTag(tag)"
        >
          #{{ tag }}
        </button>
      </div>
    </header>

    <div v-if="filtered.items.length > 0" class="archive-grid">
      <PostCard
        v-for="(post, index) in filtered.items"
        :key="post._path"
        :post="post"
        :style="{ '--delay': `${index * 0.05}s` }"
      />
    </div>

    <div v-else class="archive-empty">
      <p>No posts found in this category.</p>
    </div>

    <div class="archive-footer">
      <PaginationBar
        v-if="filtered.total > pageSize"
        :page="page"
        :page-size="pageSize"
        :total="filtered.total"
        @update:page="updatePage"
      />
    </div>
  </div>
</template>

<style scoped>
.post-archive {
  display: flex;
  flex-direction: column;
  gap: 40px;
  padding-bottom: 60px;
}

.archive-header {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.archive-title {
  font-family: var(--font-display);
  font-size: clamp(2.6rem, 5.4vw, 3.6rem);
  font-weight: 500;
  letter-spacing: -0.025em;
  line-height: 1;
  color: var(--heading);
  margin-bottom: 8px;
}

.archive-subtitle {
  font-size: 1.15rem;
  color: var(--muted);
}

.tag-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
}

.tag-pill {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--muted);
  background: var(--bg-subtle);
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    color var(--dur-fast) var(--ease-standard),
    background-color var(--dur-fast) var(--ease-standard),
    border-color var(--dur-fast) var(--ease-standard);
}

.tag-pill:hover {
  color: var(--heading);
  background: var(--bg-elevated);
  border-color: var(--line);
}

.tag-pill:active {
  transform: scale(0.96);
}

.tag-pill.active {
  color: #f8fafc;
  background: var(--accent);
  border-color: var(--accent);
}

:root[data-theme='dark'] .tag-pill.active {
  color: var(--bg);
  background: var(--accent);
}

.archive-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.archive-empty {
  padding: 80px 0;
  text-align: center;
  color: var(--muted);
  font-style: italic;
}

@media (max-width: 1024px) {
  .archive-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .archive-grid {
    grid-template-columns: 1fr;
  }
}
</style>
