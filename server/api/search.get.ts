import { getQuery } from 'h3'
import { serverQueryContent } from '#content/server'

interface SearchItem {
  title: string
  description?: string
  tags?: string[]
  section?: string
  date?: string
  path: string
  cover?: string
}

export default defineEventHandler(async (event) => {
  const { q = '', section, tag, year, limit = '10', page = '1' } = getQuery(event)

  const keyword = String(q || '').trim()
  const safeLimit = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 10))
  const safePage = Math.max(1, parseInt(String(page), 10) || 1)

  const filters: any[] = [{ draft: { $ne: true } }]

  if (section) filters.push({ section })
  if (tag) filters.push({ tags: { $contains: tag } })
  if (year) {
    filters.push({ date: { $gte: `${year}-01-01` } })
    filters.push({ date: { $lte: `${year}-12-31` } })
  }

  let builder = serverQueryContent(event)
  filters.forEach((f) => {
    builder = builder.where(f)
  })

  if (keyword) {
    const regex = new RegExp(keyword, 'i')
    builder = builder.where({
      $or: [{ title: regex }, { description: regex }, { tags: { $contains: keyword } }]
    })
  }

  const all = await builder.sort({ date: -1 }).find()
  const start = (safePage - 1) * safeLimit
  const items = (all || []).slice(start, start + safeLimit)

  const payload: SearchItem[] = items.map((item: any) => ({
    title: item.title,
    description: item.description,
    tags: item.tags || [],
    section: item.section || 'blog',
    date: item.date,
    path: item._path,
    cover: item.cover
  }))

  return {
    total: all.length,
    items: payload
  }
})
