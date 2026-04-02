<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const pageSize = 9

const { data: posts } = await useAsyncData('blog-list', () =>
  queryContent('/blog')
    .where({ draft: { $ne: true } })
    .sort({ date: -1 })
    .find()
)

const allTags = computed(() => {
  const tags = new Set<string>()
  posts.value?.forEach(p => p.tags?.forEach(t => tags.add(t)))
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
  <section class="page-header animate-rise">
    <div>
      <p class="page-kicker">Tech Layer</p>
      <h1 class="page-title">Engineering Logs.</h1>
    </div>
    <div class="page-header-side">
      <p class="page-description">记录工程实践、框架系统、工具链和解决复杂问题时真正有效的方法。</p>
      <div class="inline-links">
        <span class="meta-count">{{ posts?.length || 0 }} Articles</span>
        <NuxtLink to="/life" class="text-link">Switch to Life</NuxtLink>
      </div>
    </div>
  </section>

  <div class="filter-section animate-rise delay-1">
    <div class="tag-cloud">
      <button 
        class="filter-chip" 
        :class="{ active: !currentTag }" 
        @click="toggleTag(undefined)"
      >
        All
      </button>
      <button 
        v-for="tag in allTags" 
        :key="tag" 
        class="filter-chip"
        :class="{ active: currentTag === tag }"
        @click="toggleTag(tag)"
      >
        #{{ tag }}
      </button>
    </div>
  </div>

  <div class="post-grid enhanced-grid animate-rise delay-2">
    <PostCard 
      v-for="(post, index) in filtered.items" 
      :key="post._path" 
      :post="post" 
      :class="{ 'featured-card': index === 0 && page === 1 && !currentTag }"
    />
  </div>

  <div v-if="filtered.items.length === 0" class="empty-state">
    <p>没有找到相关文章。</p>
  </div>

  <PaginationBar v-if="filtered.total > pageSize" :page="page" :page-size="pageSize" :total="filtered.total" @update:page="updatePage" />
</template>
