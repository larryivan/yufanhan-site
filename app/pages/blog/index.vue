<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const pageSize = 15

const { data: posts } = await useAsyncData('blog-list', () =>
  queryContent('/blog')
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
const archiveStatus = computed(() =>
  currentTag.value ? `${filtered.value.total} posts in #${currentTag.value}` : `${filtered.value.total} posts`
)

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
  <div class="archive-container">
    <header class="archive-header">
      <p class="eyebrow">Blog</p>
      <h1 class="archive-title">Technical notes and frontend writing.</h1>
      <p class="archive-desc">A running archive of engineering notes, frontend experiments, and practical writing on building for the web.</p>
    </header>

    <div class="archive-toolbar">
      <div class="archive-filters">
        <button
          class="filter-btn"
          :class="{ active: !currentTag }"
          @click="toggleTag(undefined)"
        >
          All
        </button>
        <button
          v-for="tag in allTags"
          :key="tag"
          class="filter-btn"
          :class="{ active: currentTag === tag }"
          @click="toggleTag(tag)"
        >
          #{{ tag }}
        </button>
      </div>

      <p class="archive-status">{{ archiveStatus }}</p>
    </div>

    <main class="archive-feed">
      <ArchivePostItem
        v-for="post in filtered.items"
        :key="post._path"
        :post="post"
      />
    </main>

    <div v-if="filtered.items.length === 0" class="empty-state">
      <p>No posts found.</p>
    </div>

    <PaginationBar v-if="filtered.total > pageSize" :page="page" :page-size="pageSize" :total="filtered.total" @update:page="updatePage" />
  </div>
</template>
