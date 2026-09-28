import { createError, getQuery } from 'h3'
import { queryCollection } from '@nuxt/content/server'

/** What a result row in SearchModal shows. */
interface SearchItem {
  title: string
  path: string
  section: string
  date?: string
}

const MIN_KEYWORD_LENGTH = 2
/** Longer than any real title or tag. SearchModal's input has the same maxlength. */
const MAX_TEXT_LENGTH = 100
const MAX_LIMIT = 50
/** Far beyond any real archive; keeps the offset a small, exact integer. */
const MAX_PAGE = 1000

const CONTROL_CHARACTER = /\p{Cc}/u

const badRequest = (name: string) =>
  createError({ statusCode: 400, statusMessage: `Invalid ${name}` })

/**
 * A text parameter, trimmed. A repeated parameter (`?q=a&q=b`) arrives as an
 * array; that, a control character or an oversized value is never a real search
 * and gets a 400 instead of being silently rewritten.
 */
const textParam = (value: unknown, name: string) => {
  if (value === undefined) return ''
  if (typeof value !== 'string' || value.length > MAX_TEXT_LENGTH || CONTROL_CHARACTER.test(value)) {
    throw badRequest(name)
  }
  return value.trim()
}

/** Lenient on purpose: a missing or malformed number falls back to the default. */
const countParam = (value: unknown, fallback: number, max: number) =>
  Math.min(max, Math.max(1, Number.parseInt(String(value), 10) || fallback))

export default defineEventHandler(async (event) => {
  const params = getQuery(event)
  const keyword = textParam(params.q, 'q').toLowerCase()
  const tag = textParam(params.tag, 'tag').toLowerCase()
  const section = textParam(params.section, 'section')
  const year = textParam(params.year, 'year')
  const limit = countParam(params.limit, 10, MAX_LIMIT)
  const page = countParam(params.page, 1, MAX_PAGE)

  if (section && !isPostSection(section)) throw badRequest('section')
  if (year && !/^\d{4}$/.test(year)) throw badRequest('year')

  // An empty `q` is a plain listing; a single character would match nearly everything.
  if (keyword && keyword.length < MIN_KEYWORD_LENGTH) {
    return { total: 0, items: [] as SearchItem[] }
  }

  let builder = queryCollection(event, 'posts')
    .where('draft', '=', false)
    .where('section', 'IN', section ? [section] : [...POST_SECTIONS])

  if (year) {
    builder = builder.where('date', '>=', `${year}-01-01`).where('date', '<=', `${year}-12-31`)
  }

  // Keyword and tag matching happen here rather than in SQL. `tags` is stored as
  // JSON text, so LIKE matched its punctuation (`",` hit every post), and the
  // query builder cannot escape LIKE's `%` and `_`, so a title containing `_`
  // could not be found. The collection is small and only the columns matched or
  // shown are read.
  const posts = await builder
    .order('date', 'DESC')
    .select('title', 'description', 'tags', 'section', 'date', 'path')
    .all()

  const matches = posts.filter((post) => {
    const tags = (post.tags || []).map(value => value.toLowerCase())
    if (tag && !tags.includes(tag)) return false
    return !keyword
      || post.title.toLowerCase().includes(keyword)
      || post.description?.toLowerCase().includes(keyword)
      || tags.some(value => value.includes(keyword))
  })

  const start = (page - 1) * limit
  const items: SearchItem[] = matches.slice(start, start + limit).map(post => ({
    title: post.title,
    path: post.path,
    section: post.section || 'blog',
    date: dayOf(post.date) || undefined
  }))

  return { total: matches.length, items }
})
