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
  <section class="section-heading" style="margin-bottom: 14px; margin-top: 10px;">
    <div>
      <p class="badge">Life</p>
      <h1 style="margin: 6px 0 6px;">生活与创作</h1>
      <p style="margin: 0; color: var(--muted);">旅行、思考、摄影与日常随笔。</p>
    </div>
    <NuxtLink to="/blog" class="btn">回到 Blog</NuxtLink>
  </section>

  <div class="meta" style="margin-bottom: 12px;">
    <span v-if="currentTag">标签：{{ currentTag }}</span>
    <span v-else>全部标签</span>
  </div>

  <div class="grid three" style="margin-bottom: 10px;">
    <PostCard v-for="post in filtered.items" :key="post._path" :post="post" />
  </div>

  <PaginationBar :page="page" :page-size="pageSize" :total="filtered.total" @update:page="updatePage" />
</template>
