<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const pageSize = 6

const { data: posts } = await useAsyncData('life-list', () =>
  queryContent('/life')
    .where({ draft: { $ne: true } })
    .sort({ date: -1 })
    .find()
)

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
</script>

<template>
  <section class="page-header animate-rise">
    <div>
      <p class="page-kicker">Life Layer</p>
      <h1 class="page-title">生活与创作</h1>
    </div>
    <div class="page-header-side">
      <p class="page-description">记录旅行、摄影、随笔和技术之外的感受，让站点的另一半更柔软，也更完整。</p>
      <div class="inline-links">
        <span>{{ filtered.total }} 篇文章</span>
        <NuxtLink to="/blog" class="text-link">查看博客</NuxtLink>
      </div>
    </div>
  </section>

  <div class="list-toolbar">
    <span>{{ currentTag ? `标签：${currentTag}` : '全部文章' }}</span>
    <span>第 {{ page }} 页</span>
  </div>

  <div class="post-grid animate-rise delay-1">
    <PostCard v-for="post in filtered.items" :key="post._path" :post="post" />
  </div>

  <PaginationBar :page="page" :page-size="pageSize" :total="filtered.total" @update:page="updatePage" />
</template>
