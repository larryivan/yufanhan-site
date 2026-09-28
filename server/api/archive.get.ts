import { createError, getQuery } from 'h3'
import { queryCollection } from '@nuxt/content/server'

/**
 * One page of a section archive, for PostArchive.
 *
 * The archives are rendered per request (their output depends on ?tag= and
 * ?page=), so they have no prerendered payload. Querying @nuxt/content from the
 * component made every client-side visit to /blog or /life download the SQLite
 * WASM engine and the full SQL dump — every post body included — and stall the
 * view transition for seconds. Here the query runs on the server and the client
 * only ever receives the cards on the requested page.
 */

const ARCHIVE_PAGE_SIZE = 12
const MAX_TAG_LENGTH = 100

const single = (value: unknown) => (Array.isArray(value) ? value[0] : value)

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const section = single(query.section)
  if (!isPostSection(section)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid section' })
  }

  const rawTag = single(query.tag)
  const tag = typeof rawTag === 'string' && rawTag ? rawTag : undefined
  if (tag && (tag.length > MAX_TAG_LENGTH || /\p{Cc}/u.test(tag))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid tag' })
  }

  const requested = Number.parseInt(String(single(query.page) ?? ''), 10)
  const requestedPage = Number.isFinite(requested) && requested > 0 ? requested : 1

  // One small query: card fields only, never a body. Tags are a JSON array in
  // SQL, which LIKE cannot match exactly (ASCII case-folding, `_`/`%` as
  // wildcards), so tag filtering and paging happen here.
  const posts = await queryCollection(event, 'posts')
    .where('section', '=', section)
    .where('draft', '=', false)
    .order('date', 'DESC')
    .select(...POST_CARD_FIELDS)
    .all()

  const tags = [...new Set(posts.flatMap(post => post.tags ?? []))].sort()
  const matches = tag ? posts.filter(post => post.tags?.includes(tag)) : posts
  const pageCount = Math.max(1, Math.ceil(matches.length / ARCHIVE_PAGE_SIZE))
  const page = Math.min(requestedPage, pageCount)

  return {
    items: matches.slice((page - 1) * ARCHIVE_PAGE_SIZE, page * ARCHIVE_PAGE_SIZE),
    total: matches.length,
    page,
    pageCount,
    tag: tag ?? null,
    tags
  }
})
